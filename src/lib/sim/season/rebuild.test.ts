/**
 * rebuild.ts 테스트 — Task 028 / 49일차 산출물.
 *
 * 완료 판정 "최하위 강등 0건"을 증명한다: 반환된 모든 대상의 `leagueId`가 입력 리그와
 * 동일함(소속 변경 없음)을 확인하고, FR-LG-007 수용 기준 ①(5개 효과 전부 적용)·②
 * (대상 외 팀 수 불변)이 성립하는지, 전제(리그3 전용·순위 완전성·슬롯 범위)를 벗어난
 * 입력이 명시적 오류가 되는지도 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { League, LeagueId, SeasonId, Standing, TeamId } from '@/types';
import type { LeagueFinalStandings } from './promotion';
import {
  REBUILD_SANCTION_PARAM_DEFAULT,
  resolveRebuildSanctions,
  type RebuildSanctionParamTable,
} from './rebuild';

const SEASON_ID = 'season-1' as SeasonId;
const ROUND = 999;
const LEAGUE3_ID = 'L3' as LeagueId;

interface LeagueOverrides {
  readonly id?: string;
  readonly tier?: number;
  readonly teamCount?: number;
}

function league(overrides: LeagueOverrides = {}): League {
  return {
    name: 'League 3',
    tier: 3,
    teamCount: 16,
    roundIntervalMin: 115,
    promotionSlots: 3,
    relegationSlots: 3,
    playoffTeamCount: 2,
    ...overrides,
    id: (overrides.id ?? LEAGUE3_ID) as LeagueId,
  };
}

/** `points`는 순위 역순(1위가 가장 높음)으로 자동 채운다 — 그랜트 계산이 rank-1 포인트를 쓴다. */
function standing(teamId: string, rank: number, points?: number): Standing {
  return {
    seasonId: SEASON_ID,
    leagueId: LEAGUE3_ID,
    round: ROUND,
    teamId: teamId as TeamId,
    rank,
    played: 30,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: points ?? (17 - rank) * 10,
    form: '',
    fairPlayScore: 0,
    tiebreakApplied: null,
  };
}

function finalTable(l: League, teamCount: number): LeagueFinalStandings {
  const standings = Array.from({ length: teamCount }, (_, i) => standing(`T${i + 1}`, i + 1));
  return { league: l, standings };
}

describe('resolveRebuildSanctions — 대상 선정', () => {
  it('리그3 최하위 sanctionSlots팀(순위 15~16)만 대상으로 삼는다', () => {
    const table = finalTable(league(), 16);

    const outcomes = resolveRebuildSanctions(table, 2);

    expect(outcomes.map((o) => o.finalRank).sort()).toEqual([15, 16]);
    expect(outcomes.map((o) => o.teamId)).toEqual(
      expect.arrayContaining(['T15' as TeamId, 'T16' as TeamId]),
    );
  });

  it('입력 순서가 rank순이 아니어도 동일하게 최하위를 골라낸다(안정 정렬 경유)', () => {
    const ordered = finalTable(league(), 16);
    const shuffled: LeagueFinalStandings = {
      league: ordered.league,
      standings: [...ordered.standings].reverse(),
    };

    const outcomes = resolveRebuildSanctions(shuffled, 2);

    expect(outcomes.map((o) => o.finalRank).sort()).toEqual([15, 16]);
  });

  it('sanctionSlots=1이면 최하위 1팀만 대상이다', () => {
    const table = finalTable(league(), 16);

    const outcomes = resolveRebuildSanctions(table, 1);

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].finalRank).toBe(16);
  });

  it('대상 팀의 leagueId는 입력 리그와 동일하다 — 강등(소속 변경) 0건', () => {
    const table = finalTable(league(), 16);

    const outcomes = resolveRebuildSanctions(table, 2);

    for (const outcome of outcomes) {
      expect(outcome.leagueId).toBe(LEAGUE3_ID);
    }
  });
});

describe('resolveRebuildSanctions — 5개 효과 계산', () => {
  it('기본 공통코드 값으로 5개 효과를 전부 적용한다', () => {
    const table = finalTable(league(), 16);

    const [outcome] = resolveRebuildSanctions(table, 1);

    expect(outcome.effects).toEqual({
      lowestPrizeTierApplied: true,
      negotiationReputationPenalty: -5,
      permanentReputationPenalty: -3,
      rebuildGrantAmount: Math.round(160 * 0.4), // rank1(T1) points = (17-1)*10 = 160
      youthBonusPp: 0.1,
    });
  });

  it('주입된 SANCTION_PARAM 값으로 재계산한다(I-83 패턴)', () => {
    const table = finalTable(league(), 16);
    const custom: RebuildSanctionParamTable = {
      REP_PENALTY_PERMANENT: 4,
      REP_PENALTY_NEGOTIATION: 6,
      GRANT_PCT: 0.5,
      YOUTH_BONUS_PP: 0.15,
    };

    const [outcome] = resolveRebuildSanctions(table, 1, custom);

    expect(outcome.effects).toEqual({
      lowestPrizeTierApplied: true,
      negotiationReputationPenalty: -6,
      permanentReputationPenalty: -4,
      rebuildGrantAmount: Math.round(160 * 0.5),
      youthBonusPp: 0.15,
    });
  });

  it('보조금은 리그3 1위(rank=1) 최종 포인트를 기준으로 계산한다', () => {
    const l = league();
    const standings = Array.from({ length: 16 }, (_, i) => standing(`T${i + 1}`, i + 1));
    const champion = standings.find((s) => s.rank === 1);
    if (champion === undefined) throw new Error('setup error');
    const table: LeagueFinalStandings = {
      league: l,
      standings: standings.map((s) => (s.rank === 1 ? { ...s, points: 999 } : s)),
    };

    const [outcome] = resolveRebuildSanctions(table, 1);

    expect(outcome.effects.rebuildGrantAmount).toBe(
      Math.round(999 * REBUILD_SANCTION_PARAM_DEFAULT.GRANT_PCT),
    );
  });

  it('대상이 여러 팀이어도 동일한 효과(같은 rank1 기준 보조금)를 공유한다', () => {
    const table = finalTable(league(), 16);

    const outcomes = resolveRebuildSanctions(table, 2);

    expect(outcomes[0].effects).toEqual(outcomes[1].effects);
  });
});

describe('resolveRebuildSanctions — 전제 위반은 명시적 오류', () => {
  it('리그3이 아니면 RangeError', () => {
    const table = finalTable(league({ tier: 2 }), 16);

    expect(() => resolveRebuildSanctions(table, 2)).toThrow(RangeError);
  });

  it('sanctionSlots가 0이면 RangeError', () => {
    const table = finalTable(league(), 16);

    expect(() => resolveRebuildSanctions(table, 0)).toThrow(RangeError);
  });

  it('sanctionSlots가 teamCount를 초과하면 RangeError', () => {
    const table = finalTable(league(), 16);

    expect(() => resolveRebuildSanctions(table, 17)).toThrow(RangeError);
  });

  it('sanctionSlots가 정수가 아니면 RangeError', () => {
    const table = finalTable(league(), 16);

    expect(() => resolveRebuildSanctions(table, 1.5)).toThrow(RangeError);
  });

  it('standings 수가 teamCount와 다르면 오류', () => {
    const l = league({ teamCount: 16 });
    const table: LeagueFinalStandings = {
      league: l,
      standings: Array.from({ length: 15 }, (_, i) => standing(`T${i + 1}`, i + 1)),
    };

    expect(() => resolveRebuildSanctions(table, 2)).toThrow();
  });

  it('순위에 결측·중복이 있으면 오류', () => {
    const l = league();
    const standings = Array.from({ length: 16 }, (_, i) => standing(`T${i + 1}`, i + 1));
    const broken: LeagueFinalStandings = {
      league: l,
      standings: standings.map((s, i) => (i === 15 ? { ...s, rank: 15 } : s)),
    };

    expect(() => resolveRebuildSanctions(broken, 2)).toThrow();
  });
});
