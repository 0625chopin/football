/**
 * retire.ts 테스트 — Task 028 / 52일차 산출물.
 *
 * 완료 판정 "40세 이상 0명"을 증명한다: 강제 은퇴가 확률과 무관하게 항상 발동하는지,
 * 34세 미만은 은퇴하지 않는지, 34~39세 확률이 나이·OVR 하락·저출전에 단조 반응하는지,
 * 명성 갱신이 0~100 범위를 벗어나지 않는지, 동일 시드 재현성을 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { PlayerId, TeamId } from '@/types';
import { createState } from '../rng/prng';
import {
  RETIREMENT_PARAM_DEFAULT,
  applyRetirementDecision,
  computeRetirementProbability,
  resolvePlayerReputation,
  resolveSeasonReputations,
  resolveSeasonRetirements,
  resolveTeamReputation,
  type PlayerReputationSeasonInput,
  type RetirementCandidate,
  type TeamReputationSeasonInput,
} from './retire';

function candidate(overrides: {
  age: number;
  ovrDelta?: number;
  playingTimeRatio?: number;
  id?: string;
}): RetirementCandidate {
  return {
    player: { id: (overrides.id ?? 'p1') as PlayerId, age: overrides.age },
    ovrDelta: overrides.ovrDelta ?? 0,
    playingTimeRatio: overrides.playingTimeRatio ?? 0.8,
  };
}

describe('computeRetirementProbability', () => {
  it('RISK_START_AGE 미만은 항상 0이다', () => {
    expect(computeRetirementProbability(20, -5, 0)).toBe(0);
    expect(computeRetirementProbability(33, -20, 0)).toBe(0);
  });

  it('나이가 많을수록 확률이 커진다', () => {
    const p34 = computeRetirementProbability(34, 0, 1);
    const p37 = computeRetirementProbability(37, 0, 1);
    const p39 = computeRetirementProbability(39, 0, 1);
    expect(p37).toBeGreaterThan(p34);
    expect(p39).toBeGreaterThan(p37);
  });

  it('OVR 하락폭이 클수록 확률이 커지고, 상승은 가산하지 않는다', () => {
    const decline = computeRetirementProbability(35, -8, 1);
    const flat = computeRetirementProbability(35, 0, 1);
    const grown = computeRetirementProbability(35, 6, 1);
    expect(decline).toBeGreaterThan(flat);
    expect(grown).toBe(flat);
  });

  it('저출전 시 확률이 가산된다', () => {
    const low = computeRetirementProbability(35, 0, 0.1);
    const high = computeRetirementProbability(35, 0, 0.9);
    expect(low).toBeGreaterThan(high);
  });
});

describe('applyRetirementDecision', () => {
  it('40세 이상은 확률과 무관하게 항상 은퇴한다(무조건 분기, PRNG 미소비)', () => {
    const state = createState(1);
    for (const age of [40, 41, 55]) {
      const result = applyRetirementDecision(state, candidate({ age, ovrDelta: 10, playingTimeRatio: 1 }));
      expect(result.value.willRetire).toBe(true);
      expect(result.value.reason).toBe('FORCE_AGE');
      expect(result.value.retirementProbability).toBe(1);
      expect(result.state).toBe(state);
    }
  });

  it('34세 미만은 은퇴하지 않는다', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      const result = applyRetirementDecision(
        createState(seed),
        candidate({ age: 25, ovrDelta: -10, playingTimeRatio: 0 }),
      );
      expect(result.value.willRetire).toBe(false);
      expect(result.value.reason).toBeNull();
    }
  });

  it('극단적인 하락·저출전 조합에도 예외 없이 처리된다(확률 클램프)', () => {
    const state = createState(3);
    expect(() =>
      applyRetirementDecision(state, candidate({ age: 39, ovrDelta: -30, playingTimeRatio: 0 })),
    ).not.toThrow();
  });

  it('동일 시드는 동일 결과를 재현한다(결정론)', () => {
    const c = candidate({ age: 36, ovrDelta: -4, playingTimeRatio: 0.2 });
    const a = applyRetirementDecision(createState(42), c);
    const b = applyRetirementDecision(createState(42), c);
    expect(a.value).toEqual(b.value);
  });
});

describe('resolveSeasonRetirements', () => {
  it('40세 이상 현역 0명 — 다양한 연령 스쿼드에서 강제 은퇴 대상 전원이 은퇴 처리된다', () => {
    const squad: RetirementCandidate[] = [
      candidate({ id: 'a', age: 19 }),
      candidate({ id: 'b', age: 28 }),
      candidate({ id: 'c', age: 34, ovrDelta: -3 }),
      candidate({ id: 'd', age: 38, ovrDelta: -5, playingTimeRatio: 0.1 }),
      candidate({ id: 'e', age: 40 }),
      candidate({ id: 'f', age: 44 }),
    ];

    const result = resolveSeasonRetirements(createState(7), squad);
    const stillActive = result.value.filter(
      (decision) => !decision.willRetire && decision.age >= RETIREMENT_PARAM_DEFAULT.FORCE_AGE,
    );
    expect(stillActive).toHaveLength(0);

    const forced = result.value.filter((decision) => decision.age >= RETIREMENT_PARAM_DEFAULT.FORCE_AGE);
    expect(forced.every((decision) => decision.willRetire)).toBe(true);
  });

  it('입력과 같은 길이·순서로 반환하고 상태를 이어받는다', () => {
    const squad: RetirementCandidate[] = [candidate({ id: 'x', age: 20 }), candidate({ id: 'y', age: 41 })];
    const result = resolveSeasonRetirements(createState(11), squad);

    expect(result.value).toHaveLength(2);
    expect(result.value[0].playerId).toBe('x');
    expect(result.value[1].playerId).toBe('y');
  });
});

describe('resolvePlayerReputation', () => {
  function playerInput(overrides: Partial<PlayerReputationSeasonInput> & { reputation?: number }) {
    const base: PlayerReputationSeasonInput = {
      player: { id: 'p1' as PlayerId, reputation: overrides.reputation ?? 50 },
      leagueTier: 1,
      awardsWon: 0,
      playingTimeRatio: 0.8,
      averageRating: 6.5,
      teamFinalRank: 10,
      leagueTeamCount: 20,
    };
    return { ...base, ...overrides };
  }

  it('결과는 0~100 범위를 벗어나지 않는다(상한·하한 양쪽)', () => {
    const high = resolvePlayerReputation(
      playerInput({ reputation: 99, awardsWon: 5, averageRating: 10, teamFinalRank: 1, leagueTeamCount: 20 }),
    );
    const low = resolvePlayerReputation(
      playerInput({
        reputation: 1,
        leagueTier: 3,
        averageRating: 0,
        teamFinalRank: 20,
        leagueTeamCount: 20,
        playingTimeRatio: 1,
      }),
    );
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('수상·상위 리그·좋은 평점·팀 성적이 명성을 끌어올린다', () => {
    const baseline = resolvePlayerReputation(playerInput({}));
    const withAward = resolvePlayerReputation(playerInput({ awardsWon: 2 }));
    const topTier = resolvePlayerReputation(playerInput({ leagueTier: 1 }));
    const bottomTier = resolvePlayerReputation(playerInput({ leagueTier: 3 }));

    expect(withAward).toBeGreaterThan(baseline);
    expect(topTier).toBeGreaterThanOrEqual(bottomTier);
  });

  it('출전 시간이 낮으면 평점·팀 성적 기여가 줄어든다', () => {
    const highPlaytime = resolvePlayerReputation(
      playerInput({ averageRating: 8, teamFinalRank: 1, playingTimeRatio: 1 }),
    );
    const lowPlaytime = resolvePlayerReputation(
      playerInput({ averageRating: 8, teamFinalRank: 1, playingTimeRatio: 0.05 }),
    );
    expect(highPlaytime).toBeGreaterThanOrEqual(lowPlaytime);
  });
});

describe('resolveTeamReputation', () => {
  function teamInput(overrides: Partial<TeamReputationSeasonInput> & { reputation?: number }) {
    const base: TeamReputationSeasonInput = {
      team: { id: 't1' as TeamId, reputation: overrides.reputation ?? 50 },
      leagueTier: 1,
      finalRank: 10,
      leagueTeamCount: 20,
      trophiesWon: 0,
    };
    return { ...base, ...overrides };
  }

  it('결과는 0~100 범위를 벗어나지 않는다', () => {
    const high = resolveTeamReputation(teamInput({ reputation: 99, trophiesWon: 3, finalRank: 1 }));
    const low = resolveTeamReputation(teamInput({ reputation: 1, leagueTier: 3, finalRank: 20 }));
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
  });

  it('트로피와 상위 순위가 명성을 끌어올린다', () => {
    const baseline = resolveTeamReputation(teamInput({}));
    const champion = resolveTeamReputation(teamInput({ finalRank: 1, trophiesWon: 1 }));
    expect(champion).toBeGreaterThan(baseline);
  });
});

describe('resolveSeasonReputations', () => {
  it('선수·팀 명성을 함께 갱신하고 입력과 같은 길이로 반환한다', () => {
    const players: PlayerReputationSeasonInput[] = [
      {
        player: { id: 'p1' as PlayerId, reputation: 50 },
        leagueTier: 1,
        awardsWon: 1,
        playingTimeRatio: 0.9,
        averageRating: 7,
        teamFinalRank: 3,
        leagueTeamCount: 20,
      },
    ];
    const teams: TeamReputationSeasonInput[] = [
      { team: { id: 't1' as TeamId, reputation: 50 }, leagueTier: 1, finalRank: 3, leagueTeamCount: 20, trophiesWon: 0 },
    ];

    const result = resolveSeasonReputations(players, teams);
    expect(result.players).toHaveLength(1);
    expect(result.teams).toHaveLength(1);
    expect(result.players[0].playerId).toBe('p1');
    expect(result.teams[0].teamId).toBe('t1');
  });
});
