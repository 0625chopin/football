/**
 * match-market.ts 테스트 — Task 035 / 28일차(2026-08-27) 산출물.
 *
 * 핵심 수락 기준(팀 일정 28일차 행): "확률 합 = 1". `PROBABILITY_UNIT_MAX` 정수 합계로
 * 검증한다(부동소수 근사 비교 금지, `precision.ts` 규약).
 */

import { describe, expect, it } from 'vitest';
import type { MatchEventType, PlayerId, TeamId } from '@/types';
import { MATCH_EVENT_TYPES, type GenerateMatchEventsOptions } from '@/lib/sim/match/events';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource } from '@/lib/config/loader';
import { PROBABILITY_UNIT_MAX } from '@/lib/sim/rng/precision';
import {
  runOddsPresimMatch,
  type OddsPresimMatchResult,
  type OddsPresimRunResult,
  type RunOddsPresimOptions,
} from './runner';
import {
  computeMatchOutcomeMarket,
  computeMatchOutcomeProbabilities,
  tallyMatchOutcomes,
} from './match-market';

const TEAM_HOME = 'market-team-home' as TeamId;
const TEAM_AWAY = 'market-team-away' as TeamId;

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
    worldSeed: 20_260_827,
    seasonNumber: 28,
    matchKey: 1,
    homeTeamId: TEAM_HOME,
    awayTeamId: TEAM_AWAY,
    eventOptions: baseEventOptions(),
    runCount: 50,
    ...overrides,
  };
}

function fakeResult(counts: readonly [number, number, number]): OddsPresimMatchResult {
  const [homeWins, draws, awayWins] = counts;
  const runs: OddsPresimRunResult[] = [];
  let runIndex = 0;

  for (let i = 0; i < homeWins; i += 1, runIndex += 1) {
    runs.push({ runIndex, matchSeed: 0 as never, homeGoals: 2, awayGoals: 0, events: [], playerStats: new Map() });
  }
  for (let i = 0; i < draws; i += 1, runIndex += 1) {
    runs.push({ runIndex, matchSeed: 0 as never, homeGoals: 1, awayGoals: 1, events: [], playerStats: new Map() });
  }
  for (let i = 0; i < awayWins; i += 1, runIndex += 1) {
    runs.push({ runIndex, matchSeed: 0 as never, homeGoals: 0, awayGoals: 3, events: [], playerStats: new Map() });
  }

  return { seasonSeed: 0, runs };
}

describe('tallyMatchOutcomes', () => {
  it('homeGoals/awayGoals 비교로 승/무/패를 분류하고 카운트 합은 runs.length와 같다', () => {
    const result = fakeResult([7, 2, 1]);
    expect(tallyMatchOutcomes(result)).toEqual({ HOME: 7, DRAW: 2, AWAY: 1 });
  });

  it('runs가 비어 있으면 전부 0이다', () => {
    expect(tallyMatchOutcomes(fakeResult([0, 0, 0]))).toEqual({ HOME: 0, DRAW: 0, AWAY: 0 });
  });
});

describe('computeMatchOutcomeProbabilities — 확률 합 = 1', () => {
  it('카운트가 고르게 3등분되지 않아도 정수 단위 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const units = computeMatchOutcomeProbabilities({ HOME: 1, DRAW: 1, AWAY: 1 });
    expect(units.HOME + units.DRAW + units.AWAY).toBe(PROBABILITY_UNIT_MAX);
  });

  it('한쪽으로 완전히 쏠린 분포에서도 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const units = computeMatchOutcomeProbabilities({ HOME: 3000, DRAW: 0, AWAY: 0 });
    expect(units).toEqual({ HOME: PROBABILITY_UNIT_MAX, DRAW: 0, AWAY: 0 });
  });

  it('큰 N(3,000)에서도 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const units = computeMatchOutcomeProbabilities({ HOME: 1287, DRAW: 764, AWAY: 949 });
    expect(units.HOME + units.DRAW + units.AWAY).toBe(PROBABILITY_UNIT_MAX);
  });
});

describe('computeMatchOutcomeMarket — 엔진 통합', () => {
  it('runOddsPresimMatch를 호출해 simCount·counts·probabilityUnits를 채우고 확률 합은 1이다', () => {
    const market = computeMatchOutcomeMarket(baseOptions());

    expect(market.simCount).toBe(50);
    expect(market.counts.HOME + market.counts.DRAW + market.counts.AWAY).toBe(50);
    expect(
      market.probabilityUnits.HOME + market.probabilityUnits.DRAW + market.probabilityUnits.AWAY,
    ).toBe(PROBABILITY_UNIT_MAX);
  });

  it('직접 조합한 tallyMatchOutcomes + computeMatchOutcomeProbabilities 결과와 일치한다(합성 함수 동치)', () => {
    const result = runOddsPresimMatch(baseOptions({ runCount: 20 }));
    const counts = tallyMatchOutcomes(result);
    const probabilityUnits = computeMatchOutcomeProbabilities(counts);

    const market = computeMatchOutcomeMarket(baseOptions({ runCount: 20 }));
    expect(market.counts).toEqual(counts);
    expect(market.probabilityUnits).toEqual(probabilityUnits);
  });

  it('runCount 미지정 시 ODDS_PARAM.MC_N_MATCH(3,000) 기본값으로 정확히 3,000회 집계한다', () => {
    installHardcodedFallback();
    try {
      const { runCount: _omit, ...rest } = baseOptions();
      const market = computeMatchOutcomeMarket(rest);
      expect(market.simCount).toBe(3000);
      expect(market.counts.HOME + market.counts.DRAW + market.counts.AWAY).toBe(3000);
      expect(
        market.probabilityUnits.HOME + market.probabilityUnits.DRAW + market.probabilityUnits.AWAY,
      ).toBe(PROBABILITY_UNIT_MAX);
    } finally {
      setFallbackSource(null);
      invalidateConstants();
    }
  });
});
