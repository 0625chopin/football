/**
 * apply.ts 테스트 — Task 031a / 38일차 산출물.
 *
 * team-schedule 38일차 행의 완료 판정 "NEXT_SEASON 즉시 반영 0건"과, NFR-CFG-006 ②③
 * (시즌당 스냅샷 ≤ 20건, ≤ 1MB) + ①(해시 중복 제거)이 `resolveSnapshotRecording`에서 실제로
 * 성립하는지 검증한다.
 *
 * 이 디렉터리 테스트 관례(loader.test.ts·policy.test.ts·schema.test.ts)를 따라 상대경로
 * import만 사용한다.
 */

import { describe, expect, it } from 'vitest';
import {
  MismatchedCommonCodeChangeError,
  SNAPSHOT_SEASON_BUDGET,
  UnknownCommonCodeGroupError,
  computeConstantsByteSize,
  resolveEffectiveCommonCode,
  resolveSnapshotRecording,
  type CommonCodeChangeCandidate,
} from './apply';
import { computeSnapshotHash } from './snapshot';
import type { CommonCode, SimConstantSnapshot } from '../../types';

function makeCommonCode(overrides: Partial<CommonCode> = {}): CommonCode {
  return {
    id: 'code-1' as CommonCode['id'],
    groupCode: 'MATCH_POINTS',
    code: 'WIN',
    worldId: null,
    value: '3',
    valueNum: 3,
    valueJson: null,
    minValue: null,
    maxValue: null,
    jsonSchema: null,
    defaultValue: '3',
    description: '승리 승점',
    unit: null,
    sortOrder: 1,
    isActive: true,
    effectiveFromSeason: null,
    createdAt: '2026-08-01T00:00:00.000Z' as CommonCode['createdAt'],
    updatedAt: '2026-08-01T00:00:00.000Z' as CommonCode['updatedAt'],
    updatedBy: null,
    ...overrides,
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

describe('resolveEffectiveCommonCode — NEXT_SEASON 그룹의 진행 중 시즌 영향 0', () => {
  it('MATCH_POINTS(NEXT_SEASON)는 effectiveFromSeason이 현재 시즌보다 미래면 current를 반환한다(즉시 반영 0건)', () => {
    const current = makeCommonCode({ value: '3', valueNum: 3 });
    const pending = makeCommonCode({ value: '5', valueNum: 5, effectiveFromSeason: 4 });
    const candidate: CommonCodeChangeCandidate = { current, pending };

    const result = resolveEffectiveCommonCode(candidate, {
      currentSeason: 3,
      isMarketAlreadyOpened: false,
    });

    expect(result).toBe(current);
    expect(result.valueNum).toBe(3);
  });

  it('effectiveFromSeason이 null이면(아직 지정 안 됨) 역시 current를 반환한다', () => {
    const current = makeCommonCode({ value: '3', valueNum: 3 });
    const pending = makeCommonCode({ value: '5', valueNum: 5, effectiveFromSeason: null });

    const result = resolveEffectiveCommonCode(
      { current, pending },
      { currentSeason: 3, isMarketAlreadyOpened: false },
    );

    expect(result).toBe(current);
  });

  it('effectiveFromSeason이 현재 시즌에 도달하면 pending을 반환한다(다음 시즌부터 적용)', () => {
    const current = makeCommonCode({ value: '3', valueNum: 3 });
    const pending = makeCommonCode({ value: '5', valueNum: 5, effectiveFromSeason: 4 });

    const result = resolveEffectiveCommonCode(
      { current, pending },
      { currentSeason: 4, isMarketAlreadyOpened: false },
    );

    expect(result).toBe(pending);
  });

  it('임의의 시즌 값 전 구간에서 NEXT_SEASON 그룹은 effectiveFromSeason 미도달 시 단 한 번도 pending을 반환하지 않는다', () => {
    const current = makeCommonCode({ value: '3', valueNum: 3 });
    const pending = makeCommonCode({ value: '5', valueNum: 5, effectiveFromSeason: 10 });

    let immediateApplicationCount = 0;
    for (let season = 1; season < 10; season += 1) {
      const result = resolveEffectiveCommonCode(
        { current, pending },
        { currentSeason: season, isMarketAlreadyOpened: false },
      );
      if (result === pending) {
        immediateApplicationCount += 1;
      }
    }

    expect(immediateApplicationCount).toBe(0);
  });

  it('UI_PARAM(IMMEDIATE)은 시즌·마켓 상태와 무관하게 항상 pending을 반환한다', () => {
    const current = makeCommonCode({
      groupCode: 'UI_PARAM',
      code: 'POLL_INTERVAL_MS',
      value: '5000',
      valueNum: 5000,
    });
    const pending = makeCommonCode({
      groupCode: 'UI_PARAM',
      code: 'POLL_INTERVAL_MS',
      value: '3000',
      valueNum: 3000,
      effectiveFromSeason: null,
    });

    const result = resolveEffectiveCommonCode(
      { current, pending },
      { currentSeason: 1, isMarketAlreadyOpened: false },
    );

    expect(result).toBe(pending);
  });

  it('ODDS_PARAM(NEXT_MARKET)은 이미 개설된 마켓이 있으면 current를, 없으면 pending을 반환한다', () => {
    const current = makeCommonCode({
      groupCode: 'ODDS_PARAM',
      code: 'OVERROUND',
      value: '1.06',
      valueNum: 1.06,
    });
    const pending = makeCommonCode({
      groupCode: 'ODDS_PARAM',
      code: 'OVERROUND',
      value: '1.08',
      valueNum: 1.08,
    });

    const opened = resolveEffectiveCommonCode(
      { current, pending },
      { currentSeason: 1, isMarketAlreadyOpened: true },
    );
    const notOpened = resolveEffectiveCommonCode(
      { current, pending },
      { currentSeason: 1, isMarketAlreadyOpened: false },
    );

    expect(opened).toBe(current);
    expect(notOpened).toBe(pending);
  });

  it('current/pending이 서로 다른 공통코드를 가리키면 MismatchedCommonCodeChangeError를 던진다', () => {
    const current = makeCommonCode({ code: 'WIN' });
    const pending = makeCommonCode({ code: 'DRAW' });

    expect(() =>
      resolveEffectiveCommonCode(
        { current, pending },
        { currentSeason: 1, isMarketAlreadyOpened: false },
      ),
    ).toThrow(MismatchedCommonCodeChangeError);
  });

  it('카탈로그에 없는 그룹코드면 UnknownCommonCodeGroupError를 던진다', () => {
    const current = makeCommonCode({ groupCode: 'NOT_A_REAL_GROUP' });
    const pending = makeCommonCode({ groupCode: 'NOT_A_REAL_GROUP' });

    expect(() =>
      resolveEffectiveCommonCode(
        { current, pending },
        { currentSeason: 1, isMarketAlreadyOpened: false },
      ),
    ).toThrow(UnknownCommonCodeGroupError);
  });
});

describe('resolveSnapshotRecording — NFR-CFG-006 ①②③', () => {
  it('① 동일 값 집합은 REUSE로 판정되며 예산을 소비하지 않는다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };
    const hash = computeSnapshotHash(constants);
    const existing = makeSnapshot({ snapshotHash: hash, firstUsedSeason: 1 });

    const result = resolveSnapshotRecording(constants, 1, [existing]);

    expect(result).toEqual({ kind: 'REUSE', snapshot: existing });
  });

  it('신규 값 집합이고 시즌 예산 안이면 CREATE와 바이트 크기를 반환한다', () => {
    const constants = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };

    const result = resolveSnapshotRecording(constants, 1, []);

    expect(result.kind).toBe('CREATE');
    if (result.kind === 'CREATE') {
      expect(result.snapshotHash).toBe(computeSnapshotHash(constants));
      expect(result.byteSize).toBeGreaterThan(0);
    }
  });

  it('② 같은 시즌에 이미 20건이 있으면(모두 해시가 다름) 신규 값 집합은 BUDGET_EXCEEDED(COUNT)다', () => {
    const constants = { MATCH_POINTS: { WIN: 999, DRAW: 999, LOSS: 999 } };
    const existingSnapshots: SimConstantSnapshot[] = Array.from(
      { length: SNAPSHOT_SEASON_BUDGET.maxCount },
      (_, i) =>
        makeSnapshot({
          id: `snapshot-${i}` as SimConstantSnapshot['id'],
          snapshotHash: `hash-${i}`,
          constants: { MATCH_POINTS: { WIN: i, DRAW: 0, LOSS: 0 } },
          firstUsedSeason: 1,
        }),
    );

    const result = resolveSnapshotRecording(constants, 1, existingSnapshots);

    expect(result).toEqual({
      kind: 'BUDGET_EXCEEDED',
      reason: 'COUNT',
      snapshotHash: computeSnapshotHash(constants),
    });
  });

  it('② 20건 상한은 시즌 단위로만 적용된다(다른 시즌 레코드는 카운트에 섞이지 않는다)', () => {
    const constants = { MATCH_POINTS: { WIN: 42, DRAW: 0, LOSS: 0 } };
    const otherSeasonSnapshots: SimConstantSnapshot[] = Array.from(
      { length: SNAPSHOT_SEASON_BUDGET.maxCount },
      (_, i) =>
        makeSnapshot({
          id: `season1-snapshot-${i}` as SimConstantSnapshot['id'],
          snapshotHash: `season1-hash-${i}`,
          constants: { MATCH_POINTS: { WIN: i, DRAW: 0, LOSS: 0 } },
          firstUsedSeason: 1,
        }),
    );

    const result = resolveSnapshotRecording(constants, 2, otherSeasonSnapshots);

    expect(result.kind).toBe('CREATE');
  });

  it('③ 시즌 누적 바이트가 1MB를 넘기면 BUDGET_EXCEEDED(BYTES)다', () => {
    const bigValue = 'x'.repeat(SNAPSHOT_SEASON_BUDGET.maxBytes);
    const bigConstants = { RATING_WEIGHT: { PAYLOAD: bigValue } };
    const existing = makeSnapshot({
      snapshotHash: 'big-hash',
      constants: bigConstants,
      firstUsedSeason: 1,
    });
    expect(computeConstantsByteSize(bigConstants)).toBeGreaterThan(
      SNAPSHOT_SEASON_BUDGET.maxBytes / 2,
    );

    const newConstants = { RATING_WEIGHT: { PAYLOAD: bigValue.slice(0, -1) + 'y' } };

    const result = resolveSnapshotRecording(newConstants, 1, [existing]);

    expect(result).toEqual({
      kind: 'BUDGET_EXCEEDED',
      reason: 'BYTES',
      snapshotHash: computeSnapshotHash(newConstants),
    });
  });

  it('computeConstantsByteSize는 결정론적이며 값이 다르면 크기도 반영해 달라질 수 있다', () => {
    const small = { MATCH_POINTS: { WIN: 3, DRAW: 1, LOSS: 0 } };
    const large = { MATCH_POINTS: { WIN: 300000, DRAW: 100000, LOSS: 0 } };

    expect(computeConstantsByteSize(small)).toBe(computeConstantsByteSize(small));
    expect(computeConstantsByteSize(large)).toBeGreaterThan(computeConstantsByteSize(small));
  });
});
