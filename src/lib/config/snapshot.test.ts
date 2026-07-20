/**
 * snapshot.ts 테스트 — Task 003 / 12일차 산출물.
 *
 * NFR-CFG-006 ①("동일 값 집합은 해시 기준으로 1건만 저장")과 FR-AD-014(스냅샷 직렬화·해시)의
 * 핵심 규칙 — 결정론(같은 입력 → 같은 해시), 순서 무관(canonicalize의 키 정렬 보장 간접
 * 검증), REUSE/CREATE 판정, refCount 불변 증가 — 를 검증한다.
 *
 * vitest.config.ts가 아직 없어 `@/*` 별칭이 테스트에서 해석되지 않으므로(CLAUDE.md),
 * 이 파일은 상대경로 import만 사용한다(loader.test.ts 관례). 모듈 스코프 전역 상태(loader.ts의
 * 캐시·소스)를 공유하므로 각 테스트 뒤 반드시 리셋한다(loader.test.ts와 동일 관례).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildConstantsSnapshotInput,
  computeSnapshotHash,
  resolveSnapshotDedup,
  withIncrementedRefCount,
} from './snapshot';
import { invalidateConstants, setFallbackSource, type ConstantSource } from './loader';
import type { SimConstantSnapshot } from '../../types';

function makeSource(name: string, values: Record<string, unknown>): ConstantSource {
  return {
    name,
    getGroupConstants: vi.fn(() => values as never),
  };
}

function makeSnapshot(overrides: Partial<SimConstantSnapshot> = {}): SimConstantSnapshot {
  return {
    id: 'snapshot-1' as SimConstantSnapshot['id'],
    worldId: 'world-1' as SimConstantSnapshot['worldId'],
    snapshotHash: 'placeholder-hash',
    constants: { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } },
    createdAt: '2026-08-05T00:00:00.000Z' as SimConstantSnapshot['createdAt'],
    firstUsedSeason: 1,
    refCount: 1,
    ...overrides,
  };
}

afterEach(() => {
  setFallbackSource(null);
  invalidateConstants();
});

describe('buildConstantsSnapshotInput', () => {
  it('지정한 그룹들의 loadConstants 결과를 그룹코드 키로 모은다', () => {
    setFallbackSource(makeSource('fallback', { WIN: 3, DRAW: 1, LOSS: 0 }));

    const input = buildConstantsSnapshotInput(['MATCH_POINTS']);

    expect(input).toEqual({ MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } });
  });
});

describe('computeSnapshotHash — 결정론·순서 무관', () => {
  it('같은 값 집합은 항상 같은 해시를 낸다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };

    expect(computeSnapshotHash(constants)).toBe(computeSnapshotHash(constants));
  });

  it('값이 다른 두 집합은 다른 해시를 낸다', () => {
    const a = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };
    const b = { MATCH_POINTS: { WIN: 5, DRAW: 2, LOSS: 0 } };

    expect(computeSnapshotHash(a)).not.toBe(computeSnapshotHash(b));
  });

  it('그룹 조회 순서가 달라도(키 순서 무관) 동일한 값 집합이면 같은 해시를 낸다', () => {
    setFallbackSource(
      makeSource('fallback', { WIN: 3, DRAW: 1, LOSS: 0 }),
    );
    // MATCH_POINTS/PROMOTION_RELEGATION_SLOTS 둘 다 같은 fallback 소스가 응답하므로
    // 값 자체는 그룹별로 동일하지만, 여기서 검증하려는 것은 "조립 순서가 달라도 canonicalize가
    // 키를 정렬해 같은 문자열을 만든다"는 것이다.
    const forward = buildConstantsSnapshotInput(['MATCH_POINTS', 'PROMOTION_RELEGATION_SLOTS']);
    const reversed = buildConstantsSnapshotInput(['PROMOTION_RELEGATION_SLOTS', 'MATCH_POINTS']);

    expect(computeSnapshotHash(forward)).toBe(computeSnapshotHash(reversed));
  });
});

describe('resolveSnapshotDedup', () => {
  it('기존 스냅샷 목록에 동일 해시가 있으면 REUSE와 그 레코드를 반환한다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };
    const hash = computeSnapshotHash(constants);
    const existing = makeSnapshot({ snapshotHash: hash });

    const result = resolveSnapshotDedup(constants, [existing]);

    expect(result).toEqual({ kind: 'REUSE', snapshot: existing });
  });

  it('기존 스냅샷 목록에 동일 해시가 없으면 CREATE와 새 해시를 반환한다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };
    const differentHash = computeSnapshotHash({ MATCH_POINTS: { WIN: 5, DRAW: 2, LOSS: 0 } });
    const existing = makeSnapshot({ snapshotHash: differentHash });

    const result = resolveSnapshotDedup(constants, [existing]);

    expect(result).toEqual({ kind: 'CREATE', snapshotHash: computeSnapshotHash(constants) });
  });

  it('기존 스냅샷 목록이 비어 있으면 항상 CREATE다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };

    const result = resolveSnapshotDedup(constants, []);

    expect(result.kind).toBe('CREATE');
  });
});

describe('withIncrementedRefCount', () => {
  it('원본을 변형하지 않고 refCount만 1 증가한 새 객체를 반환한다', () => {
    const original = makeSnapshot({ refCount: 4 });

    const updated = withIncrementedRefCount(original);

    expect(updated).not.toBe(original);
    expect(updated).toEqual({ ...original, refCount: 5 });
    expect(original.refCount).toBe(4);
  });
});
