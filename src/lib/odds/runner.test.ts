/**
 * runner.ts 테스트 — Task 035 / 27일차(2026-08-26) 산출물.
 *
 * 핵심 수락 기준(팀 일정 27일차 행): "프리시뮬 시드 ≠ 본경기 시드"(NFR-DT-006). 아래
 * `SEED_NAMESPACE.ODDS_PRESIM` 스위트가 이를 직접 증명한다 — `namespaceOf`로 러너가 파생한
 * 시드 전량이 `MAIN` 네임스페이스와 겹치지 않는 서로소 집합에 속함을 확인한다.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { MatchEventType, PlayerId, TeamId } from '@/types';
import { SEED_NAMESPACE, deriveMatchSeed, deriveSeasonSeed, namespaceOf } from '@/lib/sim/rng/derive';
import { MATCH_EVENT_TYPES, type GenerateMatchEventsOptions } from '@/lib/sim/match/events';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource } from '@/lib/config/loader';
import { runOddsPresimMatch, tallyMatchScore, type RunOddsPresimOptions } from './runner';

const TEAM_HOME = 'runner-team-home' as TeamId;
const TEAM_AWAY = 'runner-team-away' as TeamId;

/** 23종 전량에 동일 가중치를 주는 결정론적 픽스처(`events.test.ts` 관례와 동일). */
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
    worldSeed: 20_260_826,
    seasonNumber: 27,
    matchKey: 1,
    homeTeamId: TEAM_HOME,
    awayTeamId: TEAM_AWAY,
    eventOptions: baseEventOptions(),
    runCount: 5,
    ...overrides,
  };
}

describe('runOddsPresimMatch — 시드 네임스페이스 독립성 (NFR-DT-006)', () => {
  it('seasonSeed와 모든 runs[].matchSeed가 ODDS_PRESIM 네임스페이스에 속한다', () => {
    const result = runOddsPresimMatch(baseOptions());

    expect(namespaceOf(result.seasonSeed)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    for (const run of result.runs) {
      expect(namespaceOf(run.matchSeed)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    }
  });

  it('같은 worldSeed/seasonNumber/matchKey라도 본경기(MAIN) 시드와 값이 절대 겹치지 않는다', () => {
    const { worldSeed, seasonNumber, matchKey } = baseOptions();
    const result = runOddsPresimMatch(baseOptions());

    const mainSeasonSeed = deriveSeasonSeed(worldSeed, seasonNumber, SEED_NAMESPACE.MAIN);
    expect(mainSeasonSeed).not.toBe(result.seasonSeed);
    expect(namespaceOf(mainSeasonSeed)).toBe(SEED_NAMESPACE.MAIN);

    const presimMatchSeeds = new Set(result.runs.map((run) => run.matchSeed as number));

    for (let runIndex = 0; runIndex < 5; runIndex += 1) {
      const mainMatchSeed = deriveMatchSeed(mainSeasonSeed, matchKey, runIndex);
      expect(namespaceOf(mainMatchSeed)).toBe(SEED_NAMESPACE.MAIN);
      expect(presimMatchSeeds.has(mainMatchSeed)).toBe(false);
    }
  });

  it('반복(runIndex)마다 서로 다른 matchSeed를 파생한다(동일 대진 재추첨)', () => {
    const result = runOddsPresimMatch(baseOptions());
    const seeds = result.runs.map((run) => run.matchSeed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});

describe('runOddsPresimMatch — 재현성·기본 동작', () => {
  it('같은 입력을 두 번 실행하면 완전히 같은 결과가 나온다(RNG는 시드 결정론만 사용)', () => {
    const a = runOddsPresimMatch(baseOptions());
    const b = runOddsPresimMatch(baseOptions());

    expect(a.seasonSeed).toBe(b.seasonSeed);
    expect(a.runs.map((r) => [r.matchSeed, r.homeGoals, r.awayGoals, r.events.length])).toEqual(
      b.runs.map((r) => [r.matchSeed, r.homeGoals, r.awayGoals, r.events.length]),
    );
  });

  it('runCount 만큼 결과를 생성한다', () => {
    const result = runOddsPresimMatch(baseOptions({ runCount: 3 }));
    expect(result.runs).toHaveLength(3);
    expect(result.runs.map((r) => r.runIndex)).toEqual([0, 1, 2]);
  });

  it('runCount 미지정 시 ODDS_PARAM.MC_N_MATCH(공통코드 폴백)를 기본값으로 쓴다', () => {
    installHardcodedFallback();
    try {
      const { runCount: _omit, ...rest } = baseOptions();
      const result = runOddsPresimMatch(rest);
      expect(result.runs).toHaveLength(3000);
    } finally {
      setFallbackSource(null);
    }
  });
});

describe('tallyMatchScore', () => {
  beforeEach(() => {
    invalidateConstants();
  });

  it('GOAL/OWN_GOAL/PENALTY_SCORED만 teamId 기준으로 집계하고 다른 이벤트는 무시한다', () => {
    const events = [
      { type: 'GOAL', teamId: TEAM_HOME } as never,
      { type: 'OWN_GOAL', teamId: TEAM_AWAY } as never,
      { type: 'PENALTY_SCORED', teamId: TEAM_HOME } as never,
      { type: 'SHOT_ON', teamId: TEAM_AWAY } as never,
      { type: 'FOUL', teamId: TEAM_HOME } as never,
    ];

    const tally = tallyMatchScore(events, TEAM_HOME, TEAM_AWAY);
    expect(tally).toEqual({ homeGoals: 2, awayGoals: 1 });
  });

  it('실제 러너 산출 이벤트로도 팀별 합계가 0 이상의 정수로 나온다', () => {
    const result = runOddsPresimMatch(baseOptions({ runCount: 1 }));
    const run = result.runs[0];
    const recomputed = tallyMatchScore(run.events, TEAM_HOME, TEAM_AWAY);
    expect(recomputed).toEqual({ homeGoals: run.homeGoals, awayGoals: run.awayGoals });
    expect(Number.isInteger(run.homeGoals)).toBe(true);
    expect(Number.isInteger(run.awayGoals)).toBe(true);
  });
});
