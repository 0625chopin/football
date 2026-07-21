/**
 * 배당 파이프라인 통합 회귀 · 성능 · KPI-4 — Task 035 / 35일차(2026-09-07) 산출물.
 *
 * 팀 일정 35일차 행: "Vitest — 프리시뮬 시드 ≠ 본경기 시드, 확률 합 = 1, 오버라운드 검증.
 * 성능 측정". 수락 기준: 경기당 산출 ≤10초·라운드 전체 ≤60초, KPI-4 1X2 Brier Score ≤0.21.
 *
 * ## 앞 세 가지 수락 기준과 기존 스위트의 관계
 * "프리시뮬 시드 ≠ 본경기 시드"(NFR-DT-006)는 27일차 `runner.test.ts`가, "확률 합 = 1"은
 * 28일차 `match-market.test.ts`가, 오버라운드(Σ(1/odds)=1.06±0.005)는 29일차
 * `overround.test.ts`가 각 모듈 단위로 이미 회귀 검증 중이다 — 오늘 그 검증을 모듈별로
 * 다시 베끼지 않는다. 대신 아래 첫 `describe`는 세 모듈을 하나의 연속 파이프라인
 * (프리시뮬 → 결과 분포 → 오버라운드 배당)으로 이어 붙였을 때도 세 성질이 동시에
 * 성립하는지 확인하는 통합 회귀다 — 개별 단위 테스트만으로는 잡지 못하는 "이어붙이기
 * 경계" 회귀(예: 한 모듈이 반환한 타입을 다음 모듈이 잘못 재해석하는 경우)를 잡기 위함.
 *
 * ## 성능·KPI-4는 오늘 신규
 * 27~33일차 스위트 어디에도 실측 시간(ms)이나 Brier Score 산출이 없다 — 오늘 처음
 * 추가한다.
 *
 * ## H-19 관련 — 일정 영향 없음
 * H-19(배당 산출 "엔진" 반환 타입 계약)의 5팀 소비 시작은 43일차다. 오늘은 그 계약을
 * 새로 만들지 않고, 이미 27~33일차에 완성된 `runner.ts`/`match-market.ts`/`overround.ts`
 * 파이프라인만 그대로 호출해 측정한다.
 *
 * ## KPI-4 Brier Score — I-160 미의존 (중요)
 * `MANAGER_STYLE_XG` 실값이 아직 미확정(I-160)이므로, 아래 `biasedEventOptions`는 그 값을
 * 전혀 참조하지 않는 이 테스트 전용 고정 픽스처다(홈팀에 이벤트 60%를 배정하는 tick 패리티
 * 규칙뿐 — 실제 매니저 스타일 배율표와 무관). 따라서 산출되는 Brier Score는 "실제 밸런싱
 * 데이터 기준 예측 정확도"가 아니라 "고정 시드·고정 픽스처에서 프리시뮬(N회) 확률 추정이
 * 같은 생성 모델의 실현치(본경기 1회, MAIN 네임스페이스)를 얼마나 잘 맞히는가"라는 자체
 * 일관성(self-consistency) 추정치다. 실제 밸런싱값이 확정되면 재산출이 필요하다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` 미사용. `performance.now()`는 벤치 목적의 시간 측정이며(rng `bench.test.ts`
 * 관례와 동일) 시뮬레이션 로직에 쓰이지 않으므로 `Date.now()` 금지와 무관하다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { MatchEventType, MatchSeed, PlayerId, TeamId } from '@/types';
import {
  SEED_NAMESPACE,
  deriveMatchSeed,
  deriveSeasonSeed,
  namespaceOf,
} from '@/lib/sim/rng/derive';
import { buildTickSequence } from '@/lib/sim/match/tick';
import {
  generateMatchEvents,
  linkPenaltyOutcomes,
  MATCH_EVENT_TYPES,
  type GenerateMatchEventsOptions,
} from '@/lib/sim/match/events';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, loadConstants, setFallbackSource } from '@/lib/config/loader';
import { PROBABILITY_UNIT_MAX, fromUnits } from '@/lib/sim/rng/precision';
import {
  runOddsPresimMatch,
  tallyMatchScore,
  type RunOddsPresimOptions,
} from './runner';
import {
  computeMatchOutcomeMarket,
  computeMatchOutcomeProbabilities,
  tallyMatchOutcomes,
  type MatchOutcomeKey,
} from './match-market';
import { computeMarketOdds } from './overround';

const TEAM_HOME = 'kpi35-team-home' as TeamId;
const TEAM_AWAY = 'kpi35-team-away' as TeamId;
const FIXED_OVERROUND = { overround: 1.06, minOdds: 1.01, maxOdds: 500 };

/** 23종 전량에 동일 가중치 — `runner.test.ts`/`match-market.test.ts` 관례와 동일. */
function symmetricEventOptions(): GenerateMatchEventsOptions {
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

/**
 * 홈 이벤트 배정 60%(tick 패리티 규칙)로 기운 픽스처 — KPI-4 Brier Score 측정 전용.
 * `MANAGER_STYLE_XG`(I-160, 미확정)를 전혀 참조하지 않는다.
 */
function biasedEventOptions(): GenerateMatchEventsOptions {
  const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 1])) as Record<
    MatchEventType,
    number
  >;
  return {
    occursProbability: 0.6,
    weights,
    resolveParticipants: ({ tick }) => ({
      teamId: tick.tick % 5 < 3 ? TEAM_HOME : TEAM_AWAY,
      primaryPlayerId: `p${tick.tick}` as PlayerId,
      secondaryPlayerId: null,
    }),
    estimateXg: ({ tick }) => ((tick.minute % 20) + 1) / 40,
  };
}

function baseOptions(overrides: Partial<RunOddsPresimOptions> = {}): RunOddsPresimOptions {
  return {
    worldSeed: 20_260_907,
    seasonNumber: 35,
    matchKey: 1,
    homeTeamId: TEAM_HOME,
    awayTeamId: TEAM_AWAY,
    eventOptions: symmetricEventOptions(),
    runCount: 200,
    ...overrides,
  };
}

describe('배당 파이프라인 통합 회귀 — 시드 분리 · 확률 합=1 · 오버라운드 (35일차)', () => {
  it('프리시뮬(runner) → 결과 분포(match-market) → 오버라운드(overround)를 잇는 한 흐름에서 세 성질이 모두 성립한다', () => {
    const options = baseOptions({ runCount: 300 });
    const result = runOddsPresimMatch(options);

    // ① 프리시뮬 시드 ≠ 본경기 시드 (NFR-DT-006)
    expect(namespaceOf(result.seasonSeed)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    const mainSeasonSeed = deriveSeasonSeed(options.worldSeed, options.seasonNumber, SEED_NAMESPACE.MAIN);
    expect(mainSeasonSeed).not.toBe(result.seasonSeed);
    const presimMatchSeeds = new Set(result.runs.map((r) => r.matchSeed as number));
    for (let runIndex = 0; runIndex < options.runCount!; runIndex += 1) {
      const mainMatchSeed = deriveMatchSeed(mainSeasonSeed, options.matchKey, runIndex);
      expect(namespaceOf(mainMatchSeed)).toBe(SEED_NAMESPACE.MAIN);
      expect(presimMatchSeeds.has(mainMatchSeed)).toBe(false);
    }

    // ② 확률 합 = 1 — precision.ts 정수 단위 비교 (부동소수 직접 비교 금지)
    const counts = tallyMatchOutcomes(result);
    expect(counts.HOME + counts.DRAW + counts.AWAY).toBe(result.runs.length);
    const probabilityUnits = computeMatchOutcomeProbabilities(counts);
    expect(probabilityUnits.HOME + probabilityUnits.DRAW + probabilityUnits.AWAY).toBe(
      PROBABILITY_UNIT_MAX,
    );

    // ③ 오버라운드 검증 — Σ(1/odds) = 1.06 ± 0.005 (FR-BT-005 수락 기준 ①)
    const odds = computeMarketOdds(probabilityUnits, FIXED_OVERROUND);
    const sumInverse = Object.values(odds).reduce((acc, v) => acc + 1 / v, 0);
    expect(Math.abs(sumInverse - 1.06)).toBeLessThanOrEqual(0.005);
    for (const value of Object.values(odds)) {
      expect(value).toBeGreaterThanOrEqual(FIXED_OVERROUND.minOdds);
      expect(value).toBeLessThanOrEqual(FIXED_OVERROUND.maxOdds);
    }
  });
});

describe('성능 측정 — 경기당 ≤10초, 라운드 전체 ≤60초', () => {
  afterEach(() => {
    setFallbackSource(null);
    invalidateConstants();
  });

  it(
    '경기 1건의 1X2 마켓 산출(MC_N_MATCH=3,000)이 10초 이내다',
    () => {
      installHardcodedFallback();
      const mcNMatch = loadConstants('ODDS_PARAM').MC_N_MATCH;
      expect(mcNMatch).toBe(3000);

      const t0 = performance.now();
      const market = computeMatchOutcomeMarket(
        baseOptions({ matchKey: 101, runCount: mcNMatch }),
      );
      const elapsedMs = performance.now() - t0;

      expect(market.simCount).toBe(mcNMatch);
      console.log(`[35일차 성능] 경기당 1X2 마켓 산출(N=${mcNMatch}): ${elapsedMs.toFixed(1)}ms`);
      expect(elapsedMs).toBeLessThan(10_000);
    },
    30_000,
  );

  it(
    '한 라운드(LEAGUE_2 20팀 → 10경기) 전체 산출이 60초 이내다 (WSL 환경 편차 감안 — 아래 로그 참조)',
    () => {
      installHardcodedFallback();
      const mcNMatch = loadConstants('ODDS_PARAM').MC_N_MATCH;
      const teamCount = loadConstants('LEAGUE_TEAM_COUNT').LEAGUE_2;
      const roundMatchCount = teamCount / 2;
      expect(roundMatchCount).toBe(10);

      const perMatchMs: number[] = [];
      const t0 = performance.now();
      for (let i = 0; i < roundMatchCount; i += 1) {
        const tMatch0 = performance.now();
        computeMatchOutcomeMarket(baseOptions({ matchKey: 200 + i, runCount: mcNMatch }));
        perMatchMs.push(performance.now() - tMatch0);
      }
      const totalMs = performance.now() - t0;

      console.log(
        `[35일차 성능] 라운드 전체(${roundMatchCount}경기, N=${mcNMatch}/경기): ` +
          `합계=${totalMs.toFixed(1)}ms, 경기당 평균=${(totalMs / roundMatchCount).toFixed(1)}ms, ` +
          `개별=${perMatchMs.map((v) => v.toFixed(0)).join(',')}ms`,
      );
      expect(totalMs).toBeLessThan(60_000);
    },
    120_000,
  );
});

describe('KPI-4 — 1X2 Brier Score (자체 일관성 추정, I-160 미의존 픽스처)', () => {
  it('프리시뮬 확률 추정과 본경기(MAIN) 실현 결과 간 Brier Score를 산출한다', () => {
    const MATCH_COUNT = 30;
    const FORECAST_RUN_COUNT = 800;
    const worldSeed = 20_260_907;
    const seasonNumber = 35;
    const eventOptions = biasedEventOptions();

    function classify(homeGoals: number, awayGoals: number): MatchOutcomeKey {
      if (homeGoals > awayGoals) return 'HOME';
      if (homeGoals < awayGoals) return 'AWAY';
      return 'DRAW';
    }

    let brierSum = 0;
    for (let i = 0; i < MATCH_COUNT; i += 1) {
      const matchKey = 300 + i;

      // 예측 — ODDS_PRESIM 네임스페이스, N=800회 프리시뮬
      const forecast = computeMatchOutcomeMarket({
        worldSeed,
        seasonNumber,
        matchKey,
        homeTeamId: TEAM_HOME,
        awayTeamId: TEAM_AWAY,
        eventOptions,
        runCount: FORECAST_RUN_COUNT,
      });
      const forecastProb: Record<MatchOutcomeKey, number> = {
        HOME: fromUnits(forecast.probabilityUnits.HOME),
        DRAW: fromUnits(forecast.probabilityUnits.DRAW),
        AWAY: fromUnits(forecast.probabilityUnits.AWAY),
      };

      // 실현 — MAIN 네임스페이스, 단일 본경기 시뮬레이션(runIndex=0)
      const mainSeasonSeed = deriveSeasonSeed(worldSeed, seasonNumber, SEED_NAMESPACE.MAIN);
      const mainMatchSeed = deriveMatchSeed(mainSeasonSeed, matchKey, 0) as MatchSeed;
      const { ticks } = buildTickSequence({ matchSeed: mainMatchSeed, includeExtraTime: false });
      const events = linkPenaltyOutcomes(generateMatchEvents(ticks, mainMatchSeed, eventOptions));
      const { homeGoals, awayGoals } = tallyMatchScore(events, TEAM_HOME, TEAM_AWAY);
      const outcome = classify(homeGoals, awayGoals);

      for (const key of ['HOME', 'DRAW', 'AWAY'] as const) {
        const indicator = key === outcome ? 1 : 0;
        brierSum += (forecastProb[key] - indicator) ** 2;
      }
    }

    // 정규화 — 카테고리 수(3)로 나눠 [0, 2/3] 범위로 맞춘다(문서 상단 KPI-4 산식 설명 참조).
    const brierScore = brierSum / (MATCH_COUNT * 3);
    console.log(
      `[35일차 KPI-4] Brier Score(경기 ${MATCH_COUNT}건, 예측 N=${FORECAST_RUN_COUNT}) = ${brierScore.toFixed(4)} ` +
        `(임계 0.21, ${brierScore <= 0.21 ? '충족' : '미충족'})`,
    );

    // 산식 자체의 구조적 상한(0 ~ 2/3)을 방어적으로 확인한다.
    expect(brierScore).toBeGreaterThanOrEqual(0);
    expect(brierScore).toBeLessThanOrEqual(2 / 3);

    // 완전 시드 고정이라 값이 결정론적으로 재현된다(측정 시점 실측 0.1701) — KPI-4(≤0.21)를
    // 회귀 고정한다. 픽스처(biasedEventOptions)나 프리시뮬 파라미터를 바꾸면 재산출이 필요하다.
    expect(brierScore).toBeLessThanOrEqual(0.21);
  });
});
