/**
 * worker.ts 테스트 — Task 035 / 33일차(2026-09-03) 산출물.
 *
 * 수락 기준(팀 일정 33일차 행): "단일 호출 시간 한도 내". 이 스위트는 시간 자체를 재지 않고
 * (환경마다 편차가 커 플레이키해진다) 그 전제 조건 — ① 반복 횟수가 실제로 파티션으로
 * 쪼개지고 ② 파티션마다 `runIndex` 구간이 겹치지 않으며 ③ 병합 결과가 파티션 없이 한 번에
 * 돌린 것과 동일한 분포를 낸다 — 를 검증한다. 32일차 인계 ⓑ(최초 산출 이력 상태 구분)도
 * 별도 describe로 검증한다.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { MatchEventType, PlayerId, TeamId, Timestamp } from '@/types';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource } from '@/lib/config/loader';
import { MATCH_EVENT_TYPES, type GenerateMatchEventsOptions } from '@/lib/sim/match/events';
import { runOddsPresimMatch, type RunOddsPresimOptions } from './runner';
import { tallyMatchOutcomes } from './match-market';
import {
  buildOddsComputeJobs,
  createInMemoryOddsComputeStateStore,
  decideOddsComputeAction,
  mergeOddsPresimMatchResults,
  runOddsComputeJob,
  runOddsComputeMatchMarket,
  splitRunCount,
  type OddsComputeJob,
} from './worker';

const TEAM_HOME = 'worker-team-home' as TeamId;
const TEAM_AWAY = 'worker-team-away' as TeamId;

/** 23종 전량에 동일 가중치를 주는 결정론적 픽스처(`runner.test.ts` 관례와 동일). */
function baseEventOptions(): GenerateMatchEventsOptions {
  const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 1])) as Record<
    MatchEventType,
    number
  >;
  return {
    occursProbability: 0.6,
    weights,
    resolveParticipants: ({ tick }) => ({
      teamId: tick.tick % 2 === 0 ? TEAM_HOME : TEAM_AWAY,
      primaryPlayerId: `p${tick.tick}` as PlayerId,
      secondaryPlayerId: null,
    }),
    estimateXg: ({ tick }) => ((tick.minute % 20) + 1) / 40,
  };
}

function baseOptions(overrides: Partial<RunOddsPresimOptions> = {}): RunOddsPresimOptions {
  return {
    worldSeed: 20_260_903,
    seasonNumber: 33,
    matchKey: 7,
    homeTeamId: TEAM_HOME,
    awayTeamId: TEAM_AWAY,
    eventOptions: baseEventOptions(),
    runCount: 100,
    ...overrides,
  };
}

describe('splitRunCount', () => {
  it('나머지 없이 균등 분할한다', () => {
    expect(splitRunCount(100, 4)).toEqual([25, 25, 25, 25]);
  });

  it('나머지를 앞쪽 파티션부터 1씩 분배한다(합계는 항상 원래 총량과 같다)', () => {
    const sizes = splitRunCount(10, 3);
    expect(sizes).toEqual([4, 3, 3]);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('파티션 수가 총량보다 많으면 크기 0인 파티션은 결과에서 제외한다', () => {
    const sizes = splitRunCount(3, 8);
    expect(sizes).toEqual([1, 1, 1]);
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('totalRunCount가 1 미만이면 예외를 던진다', () => {
    expect(() => splitRunCount(0, 8)).toThrow(RangeError);
  });

  it('partitionCount가 1 미만이면 예외를 던진다', () => {
    expect(() => splitRunCount(100, 0)).toThrow(RangeError);
  });
});

describe('buildOddsComputeJobs', () => {
  it('runIndexOffset 구간이 파티션끼리 겹치지 않고 총합이 원래 runCount와 같다', () => {
    const jobs = buildOddsComputeJobs(baseOptions({ runCount: 100 }), 8);

    expect(jobs).toHaveLength(8);
    let expectedOffset = 0;
    for (const job of jobs) {
      expect(job.options.runIndexOffset).toBe(expectedOffset);
      expectedOffset += job.options.runCount!;
    }
    expect(expectedOffset).toBe(100);

    const totalFromJobs = jobs.reduce((sum, job) => sum + job.options.runCount!, 0);
    expect(totalFromJobs).toBe(100);
  });

  it('runCount 미지정 시 ODDS_PARAM.MC_N_MATCH(3,000)를 8분할한다', () => {
    installHardcodedFallback();
    try {
      const { runCount: _omit, ...rest } = baseOptions();
      const jobs = buildOddsComputeJobs(rest);
      const total = jobs.reduce((sum, job) => sum + job.options.runCount!, 0);
      expect(total).toBe(3000);
      expect(jobs).toHaveLength(8);
    } finally {
      setFallbackSource(null);
    }
  });

  it('partitionCount 생략 시 ODDS_PARAM.PARTITION_COUNT(8)를 기본값으로 쓴다', () => {
    installHardcodedFallback();
    try {
      const jobs = buildOddsComputeJobs(baseOptions({ runCount: 16 }));
      expect(jobs).toHaveLength(8);
    } finally {
      setFallbackSource(null);
    }
  });
});

describe('mergeOddsPresimMatchResults', () => {
  it('여러 파티션 결과를 runs 배열로 그대로 이어붙인다', () => {
    const jobs = buildOddsComputeJobs(baseOptions({ runCount: 12 }), 4);
    const partials = jobs.map((job) => runOddsComputeJob(job));

    const merged = mergeOddsPresimMatchResults(partials);
    expect(merged.runs).toHaveLength(12);
    expect(new Set(merged.runs.map((r) => r.runIndex)).size).toBe(12);
  });

  it('seasonSeed가 다른 파티션이 섞이면 예외를 던진다', () => {
    const a = runOddsPresimMatch(baseOptions({ runCount: 2 }));
    const b = runOddsPresimMatch(baseOptions({ runCount: 2, seasonNumber: 99 }));
    expect(() => mergeOddsPresimMatchResults([a, b])).toThrow(Error);
  });

  it('빈 배열이면 예외를 던진다', () => {
    expect(() => mergeOddsPresimMatchResults([])).toThrow(RangeError);
  });
});

describe('runOddsComputeMatchMarket — 파티션 병합 결과가 단일 호출과 동일한 분포를 낸다', () => {
  beforeEach(() => {
    invalidateConstants();
  });

  it('8분할 결과와 단일 호출(runIndexOffset 없이 runCount 그대로) 결과의 확률이 완전히 같다', async () => {
    const options = baseOptions({ runCount: 200 });

    const single = runOddsPresimMatch(options);
    const singleCounts = tallyMatchOutcomes(single);

    const partitioned = await runOddsComputeMatchMarket(options, { partitionCount: 8 });

    expect(partitioned.simCount).toBe(200);
    expect(partitioned.counts).toEqual(singleCounts);
  });

  it('확률 단위 합이 정확히 PROBABILITY_UNIT_MAX(1,000,000)다', async () => {
    const market = await runOddsComputeMatchMarket(baseOptions({ runCount: 50 }), {
      partitionCount: 8,
    });
    const total =
      market.probabilityUnits.HOME + market.probabilityUnits.DRAW + market.probabilityUnits.AWAY;
    expect(total).toBe(1_000_000);
  });

  it('커스텀 executeJob(비동기 큐 흉내)을 주입해도 동일하게 동작한다(NFR-SC-004)', async () => {
    const options = baseOptions({ runCount: 40 });
    const calls: number[] = [];
    const queueLikeExecutor = async (job: OddsComputeJob) => {
      calls.push(job.partitionIndex);
      await Promise.resolve(); // 비동기 경계를 실제로 넘긴다
      return runOddsComputeJob(job);
    };

    const market = await runOddsComputeMatchMarket(options, {
      partitionCount: 8,
      executeJob: queueLikeExecutor,
    });

    expect(market.simCount).toBe(40);
    expect(calls.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('decideOddsComputeAction — 32일차 인계 ⓑ (최초 산출 이력 상태 구분)', () => {
  const KICKOFF = '2026-09-03T18:00:00.000Z' as Timestamp;
  const BEFORE_WINDOW = '2026-09-03T17:00:00.000Z' as Timestamp; // T-60분
  const IN_WINDOW = '2026-09-03T17:45:00.000Z' as Timestamp; // T-15분
  const AFTER_KICKOFF = '2026-09-03T18:30:00.000Z' as Timestamp;

  it('최초 산출 윈도 도달 전이면 SKIPPED(BEFORE_INITIAL_WINDOW)', () => {
    const store = createInMemoryOddsComputeStateStore();
    const action = decideOddsComputeAction(store, 1, BEFORE_WINDOW, KICKOFF, 'INITIAL_WINDOW', 30);
    expect(action).toEqual({ kind: 'SKIPPED', trigger: 'INITIAL_WINDOW', skipReason: 'BEFORE_INITIAL_WINDOW' });
    expect(store.hasInitialComputeRun(1)).toBe(false);
  });

  it('윈도 도달 후 최초 산출이면 INITIAL이고 상태를 최초 산출 완료로 표시한다', () => {
    const store = createInMemoryOddsComputeStateStore();
    const action = decideOddsComputeAction(store, 1, IN_WINDOW, KICKOFF, 'INITIAL_WINDOW', 30);
    expect(action).toEqual({ kind: 'INITIAL', trigger: 'INITIAL_WINDOW', skipReason: null });
    expect(store.hasInitialComputeRun(1)).toBe(true);
  });

  it('최초 산출이 아직 없는 대진에 재산출 트리거가 먼저 오면 INITIAL_VIA_RECOMPUTE로 구분한다', () => {
    const store = createInMemoryOddsComputeStateStore();
    const action = decideOddsComputeAction(store, 2, IN_WINDOW, KICKOFF, 'LINEUP_CONFIRMED');
    expect(action).toEqual({ kind: 'INITIAL_VIA_RECOMPUTE', trigger: 'LINEUP_CONFIRMED', skipReason: null });
    expect(store.hasInitialComputeRun(2)).toBe(true);
  });

  it('최초 산출이 이미 끝난 대진의 재산출 트리거는 통상 RECOMPUTE다', () => {
    const store = createInMemoryOddsComputeStateStore();
    decideOddsComputeAction(store, 3, IN_WINDOW, KICKOFF, 'INITIAL_WINDOW', 30);

    const action = decideOddsComputeAction(store, 3, IN_WINDOW, KICKOFF, 'INJURY_OCCURRED');
    expect(action).toEqual({ kind: 'RECOMPUTE', trigger: 'INJURY_OCCURRED', skipReason: null });
  });

  it('킥오프 이후면 최초 산출 이력과 무관하게 항상 SKIPPED(KICKOFF_PASSED)다', () => {
    const store = createInMemoryOddsComputeStateStore();
    const action = decideOddsComputeAction(store, 4, AFTER_KICKOFF, KICKOFF, 'LINEUP_CONFIRMED');
    expect(action).toEqual({ kind: 'SKIPPED', trigger: 'LINEUP_CONFIRMED', skipReason: 'KICKOFF_PASSED' });
  });

  it('leadMinutes 생략 시 ODDS_PARAM.INITIAL_LEAD_MIN(30)을 공통코드에서 읽는다', () => {
    installHardcodedFallback();
    try {
      const store = createInMemoryOddsComputeStateStore();
      // T-30분 정확히 — INITIAL_LEAD_MIN=30을 그대로 읽었다면 산출 실행(BEFORE_INITIAL_WINDOW 아님)
      const at30 = '2026-09-03T17:30:00.000Z' as Timestamp;
      const action = decideOddsComputeAction(store, 5, at30, KICKOFF, 'INITIAL_WINDOW');
      expect(action.kind).toBe('INITIAL');
    } finally {
      setFallbackSource(null);
    }
  });
});

describe('createInMemoryOddsComputeStateStore', () => {
  it('markInitialComputeRun 이후에만 hasInitialComputeRun이 true다', () => {
    const store = createInMemoryOddsComputeStateStore();
    expect(store.hasInitialComputeRun(10)).toBe(false);
    store.markInitialComputeRun(10);
    expect(store.hasInitialComputeRun(10)).toBe(true);
    expect(store.hasInitialComputeRun(11)).toBe(false);
  });
});
