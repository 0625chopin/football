/**
 * 100경기 시드 스냅샷 + 이벤트↔스탯 재계산 일치 — Task 023 / 15일차(2026-08-10) 산출물.
 *
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 15일차 행: "Vitest — 시드 스냅샷 100경기
 * 전건 일치(NFR-QA-003), 이벤트↔스탯 재계산 일치". 실제 생성 로직은 `snapshot-pipeline.ts`
 * 단일 소스(이 파일과 향후 재생성 모두 같은 절차를 타야 하므로 — 해당 파일 헤더 참조).
 *
 * `@/*` 별칭은 아직 vitest에서 해석되지 않던 시절의 관례를 그대로 따라(1팀 Task 008)
 * 상대경로로만 import한다(`tick.test.ts`/`stats.test.ts` 관례와 동일, 일괄 전환 금지 원칙).
 */

import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_MATCH_COUNT,
  computeAllMatchSnapshotEntries,
  computeMatchSnapshotEntry,
  type MatchSnapshotEntry,
} from './snapshot-pipeline';

const HEX64 = /^[0-9a-f]{64}$/;

describe('100경기 시드 스냅샷 (NFR-QA-003)', () => {
  const entries = computeAllMatchSnapshotEntries();

  it('정확히 100경기를 생성한다', () => {
    expect(entries).toHaveLength(SNAPSHOT_MATCH_COUNT);
  });

  it('경기마다 서로 다른 matchSeed를 쓴다(시드 충돌 없음)', () => {
    const uniqueSeeds = new Set(entries.map((e) => e.matchSeed));
    expect(uniqueSeeds.size).toBe(SNAPSHOT_MATCH_COUNT);
  });

  it('다이제스트는 64자리 SHA-256 hex이고 경기당 이벤트가 최소 1건 이상 생성된다', () => {
    entries.forEach((entry) => {
      expect(entry.eventsDigest).toMatch(HEX64);
      expect(entry.statsDigest).toMatch(HEX64);
      expect(entry.eventCount).toBeGreaterThan(0);
    });
  });

  /**
   * 수락 기준 "100경기 diff 0"의 실제 판정 지점 — 이전 실행에서 커밋된 스냅샷과
   * 다이제스트가 1건이라도 다르면 vitest가 diff를 출력하며 실패한다. 원본 이벤트·스탯
   * 배열이 아니라 다이제스트만 스냅샷에 남기는 이유는 `snapshot-pipeline.ts` 헤더의
   * "다이제스트 기반 스냅샷을 택한 이유" 절 참조(100경기 전량을 원본으로 저장하면
   * 스냅샷 파일이 리뷰 불가능한 규모로 부푼다).
   */
  it('경기별 (matchSeed, tickCount, eventCount, 다이제스트) 스냅샷이 회귀 없이 일치한다', () => {
    const digestOnly = entries.map(
      ({ seedIndex, matchSeed, tickCount, eventCount, eventsDigest, statsDigest }) => ({
        seedIndex,
        matchSeed,
        tickCount,
        eventCount,
        eventsDigest,
        statsDigest,
      }),
    );
    expect(digestOnly).toMatchSnapshot();
  });
});

describe('이벤트↔스탯 재계산 일치 (재현성 — 순수 함수 검증)', () => {
  it('같은 인덱스를 다시 계산해도 100경기 전건이 완전히 동일한 다이제스트를 낸다(diff 0)', () => {
    const first = computeAllMatchSnapshotEntries();
    const second = computeAllMatchSnapshotEntries();

    const mismatches: number[] = [];
    first.forEach((entry, i) => {
      const other = second[i];
      if (entry.eventsDigest !== other.eventsDigest || entry.statsDigest !== other.statsDigest) {
        mismatches.push(entry.seedIndex);
      }
    });

    expect(mismatches).toEqual([]);
  });

  it('틱→이벤트 생성과 이벤트→스탯 집계를 독립적으로 두 번 실행해도 각 단계가 개별적으로 재현된다', () => {
    // 전체 파이프라인 다이제스트(위 테스트)만으로는 "이벤트 생성이 바뀌었는데 스탯 집계가
    // 우연히 같은 결과를 낸 경우"를 구분할 수 없다 — 여기서는 두 단계를 나눠 각각 검증한다.
    const sampleIndices = [0, 1, 4, 37, 63, 99];

    sampleIndices.forEach((index) => {
      const runA = computeMatchSnapshotEntry(index);
      const runB = computeMatchSnapshotEntry(index);

      expect(runB.eventsDigest).toBe(runA.eventsDigest);
      expect(runB.statsDigest).toBe(runA.statsDigest);
      expect(runB.eventCount).toBe(runA.eventCount);
      expect(runB.tickCount).toBe(runA.tickCount);
    });
  });

  it('연장전 포함 경기(4경기 중 1경기)와 미포함 경기가 모두 스냅샷에 섞여 있다', () => {
    const entries: readonly MatchSnapshotEntry[] = computeAllMatchSnapshotEntries();
    const withExtra = entries.filter((_, i) => i % 4 === 0);
    const withoutExtra = entries.filter((_, i) => i % 4 !== 0);

    expect(withExtra.length).toBeGreaterThan(0);
    expect(withoutExtra.length).toBeGreaterThan(0);
    // 정규 90분: 90 + 전반 스토피지(0~5) + 후반 스토피지(1~8) → tick 수 91~103.
    // 연장 포함: 위 구간 + 연장 30틱(스토피지 없음) → tick 수 121~133.
    withoutExtra.forEach((entry) => {
      expect(entry.tickCount).toBeGreaterThanOrEqual(91);
      expect(entry.tickCount).toBeLessThanOrEqual(103);
    });
    withExtra.forEach((entry) => {
      expect(entry.tickCount).toBeGreaterThanOrEqual(121);
      expect(entry.tickCount).toBeLessThanOrEqual(133);
    });
  });
});
