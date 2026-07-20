/**
 * season-market.ts 테스트 — Task 035 / 30일차(2026-08-31) 산출물.
 *
 * 핵심 수락 기준: 우승·득점왕(상호 배타 다항 마켓)은 "확률 합 = 1"
 * (`PROBABILITY_UNIT_MAX` 정수 합계로 검증, 부동소수 근사 비교 금지 — `precision.ts` 규약).
 * 승격·강등(독립 이진 마켓 묶음)은 반대로 "선택지 간 합이 1이 아닐 수 있음"이 정상이므로
 * 그 비정규화를 명시적으로 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { PlayerId, TeamId } from '@/types';
import { PROBABILITY_UNIT_MAX } from '@/lib/sim/rng/precision';
import { computeSeasonMarket, type SeasonMarketOutcome } from './season-market';

const TEAM_A = 'team-a' as TeamId;
const TEAM_B = 'team-b' as TeamId;
const TEAM_C = 'team-c' as TeamId;
const PLAYER_X = 'player-x' as PlayerId;
const PLAYER_Y = 'player-y' as PlayerId;

function outcome(overrides: Partial<SeasonMarketOutcome> = {}): SeasonMarketOutcome {
  return {
    championTeamId: TEAM_A,
    promotedTeamIds: [],
    relegatedTeamIds: [],
    topScorerPlayerId: PLAYER_X,
    ...overrides,
  };
}

describe('computeSeasonMarket — 입력 검증', () => {
  it('outcomes가 비어 있으면 오류를 던진다', () => {
    expect(() => computeSeasonMarket([])).toThrow(RangeError);
  });
});

describe('computeSeasonMarket — 우승/득점왕(상호 배타 다항 마켓), 확률 합 = 1', () => {
  it('고르지 않은 분포에서도 우승 확률 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const outcomes = [
      ...Array.from({ length: 7 }, () => outcome({ championTeamId: TEAM_A })),
      ...Array.from({ length: 2 }, () => outcome({ championTeamId: TEAM_B })),
      ...Array.from({ length: 1 }, () => outcome({ championTeamId: TEAM_C })),
    ];
    const market = computeSeasonMarket(outcomes);
    const sum = Object.values(market.champion).reduce((a, b) => a + b, 0);
    expect(sum).toBe(PROBABILITY_UNIT_MAX);
  });

  it('한 팀이 전 반복에서 우승하면 그 팀만 확률 1, 나머지는 키 자체가 없다(확률 0 셀렉션 제외)', () => {
    const outcomes = Array.from({ length: 10 }, () => outcome({ championTeamId: TEAM_A }));
    const market = computeSeasonMarket(outcomes);
    expect(market.champion).toEqual({ [TEAM_A]: PROBABILITY_UNIT_MAX });
    expect(Object.keys(market.champion)).not.toContain(TEAM_B);
  });

  it('큰 N(1,500)에서도 득점왕 확률 합은 정확히 PROBABILITY_UNIT_MAX다', () => {
    const outcomes = Array.from({ length: 1500 }, (_, i) =>
      outcome({ topScorerPlayerId: i % 3 === 0 ? PLAYER_X : PLAYER_Y }),
    );
    const market = computeSeasonMarket(outcomes);
    const sum = Object.values(market.topScorer).reduce((a, b) => a + b, 0);
    expect(sum).toBe(PROBABILITY_UNIT_MAX);
  });
});

describe('computeSeasonMarket — 승격/강등(독립 이진 마켓 묶음), 선택지 간 합이 1이 아닐 수 있다', () => {
  it('반복마다 2팀이 동시에 승격하면 팀별 확률의 합은 1이 아니라 슬롯 수(≈2)에 수렴한다', () => {
    // 1,000회 전부 A·B 동시 승격 — 각 팀 확률은 정확히 1.0(=PROBABILITY_UNIT_MAX), 합은 2배.
    const outcomes = Array.from({ length: 1000 }, () =>
      outcome({ promotedTeamIds: [TEAM_A, TEAM_B] }),
    );
    const market = computeSeasonMarket(outcomes);
    expect(market.promotion).toEqual({
      [TEAM_A]: PROBABILITY_UNIT_MAX,
      [TEAM_B]: PROBABILITY_UNIT_MAX,
    });
    const sum = Object.values(market.promotion).reduce((a, b) => a + b, 0);
    expect(sum).toBe(2 * PROBABILITY_UNIT_MAX);
  });

  it('팀별 강등 확률은 count/totalRuns를 6자리 고정 정밀도로 그대로 반영한다', () => {
    const outcomes = [
      ...Array.from({ length: 250 }, () => outcome({ relegatedTeamIds: [TEAM_A] })),
      ...Array.from({ length: 750 }, () => outcome({ relegatedTeamIds: [TEAM_B] })),
    ];
    const market = computeSeasonMarket(outcomes);
    expect(market.relegation[TEAM_A]).toBe(250_000);
    expect(market.relegation[TEAM_B]).toBe(750_000);
  });

  it('한 번도 강등되지 않은 팀은 결과 레코드에 키 자체가 없다', () => {
    const outcomes = Array.from({ length: 5 }, () => outcome({ relegatedTeamIds: [TEAM_A] }));
    const market = computeSeasonMarket(outcomes);
    expect(Object.keys(market.relegation)).toEqual([TEAM_A]);
  });
});

describe('computeSeasonMarket — simCount', () => {
  it('simCount는 호출부가 넘긴 outcomes.length와 같다', () => {
    const market = computeSeasonMarket(Array.from({ length: 42 }, () => outcome()));
    expect(market.simCount).toBe(42);
  });
});
