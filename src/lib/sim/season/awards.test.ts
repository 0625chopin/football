/**
 * awards.ts 테스트 — Task 028 / 53일차 산출물.
 *
 * 완료 판정 "득점왕 집계에 PK 0건"을 증명한다: `resolveLeagueGoldenBoot()`가
 * `PlayerSeasonStat.goals`만 근거로 순위를 매기며, 페널티킥 관련 필드(`penaltiesScored`
 * 등)가 아무리 커도 득점왕 산정에 가산되지 않는지 확인한다. 나머지 4개 카테고리(리그별
 * 개인 잔여상·베스트11·월드 통합·대회·클럽 트로피)의 선정 로직·동률 해소·예외 경로도
 * 함께 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type {
  LeagueId,
  ManagerId,
  Player,
  PlayerId,
  PlayerSeasonStat,
  Position,
  SeasonId,
  TeamId,
} from '@/types';
import {
  AWARD_PARAM_DEFAULT,
  resolveBallonDor,
  resolveCupMvp,
  resolveCupTitleTrophy,
  resolveLeagueBestYoungPlayer,
  resolveLeagueGoldenBoot,
  resolveLeagueGoldenGlove,
  resolveLeagueGoldenPlaymaker,
  resolveLeagueManagerOfSeason,
  resolveLeagueMvp,
  resolveLeagueTeamOfSeason,
  resolveLeagueTitleTrophies,
  resolvePlayoffMvp,
  resolvePlayoffTitleTrophies,
  resolvePromotionTrophies,
  resolveWorldXI,
  type CompetitionAwardCandidate,
  type ManagerAwardCandidate,
  type SeasonAwardCandidate,
  type WorldAwardCandidate,
} from './awards';
import type { PromotionSwap } from './promotion';

const SEASON_ID = 'season-1' as SeasonId;
const LEAGUE_ID = 'league-1' as LeagueId;
const LEAGUE_ID_2 = 'league-2' as LeagueId;

function statOverrides(overrides: Partial<PlayerSeasonStat>): PlayerSeasonStat {
  const zeroCoreValues = {
    appearances: 0,
    starts: 0,
    subAppearances: 0,
    minutesPlayed: 0,
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    xa: 0,
    bigChancesCreated: 0,
    bigChancesMissed: 0,
    penaltiesTaken: 0,
    penaltiesScored: 0,
    freeKickGoals: 0,
    headedGoals: 0,
    ownGoals: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    keyPasses: 0,
    longBallsAttempted: 0,
    longBallsCompleted: 0,
    crossesAttempted: 0,
    crossesCompleted: 0,
    throughBalls: 0,
    dribblesAttempted: 0,
    dribblesCompleted: 0,
    dispossessed: 0,
    touches: 0,
    tacklesAttempted: 0,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    blocks: 0,
    aerialDuelsAttempted: 0,
    aerialDuelsWon: 0,
    groundDuelsAttempted: 0,
    groundDuelsWon: 0,
    errorsLeadingToShot: 0,
    errorsLeadingToGoal: 0,
    foulsCommitted: 0,
    foulsDrawn: 0,
    yellowCards: 0,
    secondYellows: 0,
    redCards: 0,
    offsides: 0,
    saves: 0,
    shotsFaced: 0,
    goalsConceded: 0,
    cleanSheets: 0,
    penaltiesFaced: 0,
    penaltiesSaved: 0,
    punches: 0,
    catches: 0,
    sweeperActions: 0,
    xgPrevented: 0,
  };

  return {
    ...zeroCoreValues,
    playerId: 'player-x' as PlayerId,
    seasonId: SEASON_ID,
    competitionType: 'LEAGUE',
    teamId: 'team-x' as TeamId,
    leagueId: LEAGUE_ID,
    contributionScore: 0,
    avgCondition: 0,
    avgRating: 0,
    motmAwards: 0,
    injuriesCount: 0,
    roundsInjured: 0,
    matchesSuspended: 0,
    ...overrides,
  };
}

function player(
  id: string,
  overrides: Partial<Omit<Player, 'id'>> = {},
): Pick<Player, 'id' | 'age' | 'preferredPosition'> {
  return {
    age: 25,
    preferredPosition: 'CM' as Position,
    ...overrides,
    id: id as PlayerId,
  };
}

function candidate(
  playerId: string,
  statFields: Partial<PlayerSeasonStat>,
  playerFields: Partial<Omit<Player, 'id'>> = {},
): SeasonAwardCandidate {
  return {
    player: player(playerId, playerFields),
    stat: statOverrides({ playerId: playerId as PlayerId, teamId: `team-${playerId}` as TeamId, ...statFields }),
  };
}

// ── 리그별 개인 — 득점왕 (PK 0건 판정) ─────────────────────────────────

describe('resolveLeagueGoldenBoot — 완료 판정: 득점왕 집계에 PK 0건', () => {
  it('goals만 근거로 순위를 매기며, penaltiesScored/penaltiesTaken이 커도 가산되지 않는다', () => {
    const heavyPenaltyTaker = candidate('p1', { goals: 8, penaltiesScored: 20, penaltiesTaken: 25 });
    const trueGoalscorer = candidate('p2', { goals: 15, penaltiesScored: 0, penaltiesTaken: 0 });

    const award = resolveLeagueGoldenBoot(SEASON_ID, LEAGUE_ID, [heavyPenaltyTaker, trueGoalscorer]);

    expect(award.playerId).toBe('p2');
    expect(award.criteria).toEqual({ goals: 15, assists: 0 });
  });

  it('goals 동률이면 assists로 해소한다', () => {
    const a = candidate('p1', { goals: 10, assists: 3 });
    const b = candidate('p2', { goals: 10, assists: 7 });

    const award = resolveLeagueGoldenBoot(SEASON_ID, LEAGUE_ID, [a, b]);

    expect(award.playerId).toBe('p2');
    expect(award.type).toBe('GOLDEN_BOOT');
    expect(award.scope).toBe('LEAGUE');
    expect(award.leagueId).toBe(LEAGUE_ID);
  });

  it('candidates가 비어 있으면 예외', () => {
    expect(() => resolveLeagueGoldenBoot(SEASON_ID, LEAGUE_ID, [])).toThrow(RangeError);
  });

  it('leagueId가 다른 후보가 섞이면 예외', () => {
    const wrong = candidate('p1', { goals: 5, leagueId: LEAGUE_ID_2 });
    expect(() => resolveLeagueGoldenBoot(SEASON_ID, LEAGUE_ID, [wrong])).toThrow(/leagueId/);
  });

  it('competitionType이 LEAGUE가 아니면 예외', () => {
    const wrong = candidate('p1', { goals: 5, competitionType: 'CUP' });
    expect(() => resolveLeagueGoldenBoot(SEASON_ID, LEAGUE_ID, [wrong])).toThrow(/competitionType/);
  });
});

// ── 리그별 개인 — 잔여 상 ─────────────────────────────────────────────

describe('resolveLeagueGoldenPlaymaker', () => {
  it('assists 1차, goals 동률 해소', () => {
    const a = candidate('p1', { assists: 5, goals: 1 });
    const b = candidate('p2', { assists: 9, goals: 0 });

    const award = resolveLeagueGoldenPlaymaker(SEASON_ID, LEAGUE_ID, [a, b]);

    expect(award.playerId).toBe('p2');
    expect(award.type).toBe('GOLDEN_PLAYMAKER');
  });
});

describe('resolveLeagueGoldenGlove', () => {
  it('GK 그룹만 후보로 삼고 cleanSheets 상위를 뽑는다', () => {
    const gk1 = candidate('gk1', { cleanSheets: 10, goalsConceded: 20 }, { preferredPosition: 'GK' });
    const gk2 = candidate('gk2', { cleanSheets: 14, goalsConceded: 18 }, { preferredPosition: 'GK' });
    const striker = candidate('st1', { cleanSheets: 99 }, { preferredPosition: 'ST' });

    const award = resolveLeagueGoldenGlove(SEASON_ID, LEAGUE_ID, [gk1, gk2, striker]);

    expect(award?.playerId).toBe('gk2');
    expect(award?.type).toBe('GOLDEN_GLOVE');
  });

  it('GK 후보가 없으면 null', () => {
    const striker = candidate('st1', {}, { preferredPosition: 'ST' });
    expect(resolveLeagueGoldenGlove(SEASON_ID, LEAGUE_ID, [striker])).toBeNull();
  });
});

describe('resolveLeagueMvp', () => {
  it('contributionScore 1차, avgRating 동률 해소', () => {
    const a = candidate('p1', { contributionScore: 80, avgRating: 6.5 });
    const b = candidate('p2', { contributionScore: 95, avgRating: 6.0 });

    const award = resolveLeagueMvp(SEASON_ID, LEAGUE_ID, [a, b]);

    expect(award.playerId).toBe('p2');
    expect(award.type).toBe('LEAGUE_MVP');
  });
});

describe('resolveLeagueBestYoungPlayer', () => {
  it('BEST_YOUNG_MAX_AGE 이하만 후보로 삼는다', () => {
    const veteran = candidate('p1', { contributionScore: 99 }, { age: 30 });
    const young = candidate('p2', { contributionScore: 40 }, { age: 20 });

    const award = resolveLeagueBestYoungPlayer(SEASON_ID, LEAGUE_ID, [veteran, young]);

    expect(award?.playerId).toBe('p2');
  });

  it('어린 선수 후보가 없으면 null', () => {
    const veteran = candidate('p1', {}, { age: 35 });
    expect(resolveLeagueBestYoungPlayer(SEASON_ID, LEAGUE_ID, [veteran])).toBeNull();
  });

  it('경계값(BEST_YOUNG_MAX_AGE와 동일 나이)은 포함된다', () => {
    const boundary = candidate('p1', { contributionScore: 50 }, { age: AWARD_PARAM_DEFAULT.BEST_YOUNG_MAX_AGE });
    const award = resolveLeagueBestYoungPlayer(SEASON_ID, LEAGUE_ID, [boundary]);
    expect(award?.playerId).toBe('p1');
  });
});

describe('resolveLeagueManagerOfSeason', () => {
  const managerCandidate = (id: string, performanceScore: number, finalRank: number): ManagerAwardCandidate => ({
    manager: { id: id as ManagerId },
    teamId: `team-${id}` as TeamId,
    finalRank,
    performanceScore,
  });

  it('performanceScore가 가장 높은 감독을 선정한다', () => {
    const a = managerCandidate('m1', 10, 3);
    const b = managerCandidate('m2', 25, 8);

    const award = resolveLeagueManagerOfSeason(SEASON_ID, LEAGUE_ID, [a, b]);

    expect(award?.managerId).toBe('m2');
    expect(award?.playerId).toBeNull();
    expect(award?.type).toBe('MANAGER_OF_SEASON');
  });

  it('후보가 없으면 null', () => {
    expect(resolveLeagueManagerOfSeason(SEASON_ID, LEAGUE_ID, [])).toBeNull();
  });
});

// ── 베스트11 ──────────────────────────────────────────────────────────

describe('resolveLeagueTeamOfSeason', () => {
  it('포지션 그룹별 정원(GK1/DF4/MF3/FW3)만큼 avgRating 상위를 뽑는다', () => {
    const candidates: SeasonAwardCandidate[] = [
      candidate('gk1', { avgRating: 8 }, { preferredPosition: 'GK' }),
      candidate('gk2', { avgRating: 6 }, { preferredPosition: 'GK' }),
      ...['cb1', 'cb2', 'lb1', 'rb1', 'cb3'].map((id, i) =>
        candidate(id, { avgRating: 7 - i * 0.1 }, { preferredPosition: i % 2 === 0 ? 'CB' : 'LB' }),
      ),
      ...['cm1', 'cm2', 'cm3', 'cm4'].map((id, i) =>
        candidate(id, { avgRating: 7.5 - i * 0.1 }, { preferredPosition: 'CM' }),
      ),
      ...['st1', 'st2', 'st3', 'st4'].map((id, i) =>
        candidate(id, { avgRating: 8.5 - i * 0.1 }, { preferredPosition: 'ST' }),
      ),
    ];

    const entries = resolveLeagueTeamOfSeason(SEASON_ID, LEAGUE_ID, candidates);

    expect(entries).toHaveLength(11);
    expect(entries.every((e) => e.type === 'TEAM_OF_SEASON')).toBe(true);
    expect(entries.find((e) => e.playerId === 'gk1')).toBeDefined();
    expect(entries.find((e) => e.playerId === 'gk2')).toBeUndefined();
    // FW 정원 3명 중 4번째(st4)는 탈락해야 한다
    expect(entries.find((e) => e.playerId === 'st4')).toBeUndefined();
  });

  it('한 그룹에 정원보다 후보가 적으면 있는 만큼만 채운다', () => {
    const candidates: SeasonAwardCandidate[] = [
      candidate('gk1', { avgRating: 7 }, { preferredPosition: 'GK' }),
      candidate('cb1', { avgRating: 7 }, { preferredPosition: 'CB' }),
    ];

    const entries = resolveLeagueTeamOfSeason(SEASON_ID, LEAGUE_ID, candidates);

    expect(entries).toHaveLength(2);
  });
});

describe('resolveWorldXI', () => {
  it('리그 티어 가중치가 낮은 리그 선수를 밀어낼 수 있다', () => {
    const worldCandidate = (
      id: string,
      avgRating: number,
      leagueTier: 1 | 2 | 3,
    ): WorldAwardCandidate => ({
      ...candidate(id, { avgRating }, { preferredPosition: 'ST' }),
      leagueTier,
    });

    // tier3 선수가 원점수는 더 높지만, tier1 가중치(1.2) 적용 시 tier1 선수가 앞선다.
    const tier1Striker = worldCandidate('s1', 7.0, 1); // 7.0 * 1.2 = 8.4
    const tier3Striker = worldCandidate('s2', 8.0, 3); // 8.0 * 0.8 = 6.4

    const entries = resolveWorldXI(SEASON_ID, [tier1Striker, tier3Striker]);
    const forwardEntry = entries.find((e) => e.criteria.positionGroup === 'FW');

    expect(forwardEntry?.playerId).toBe('s1');
    expect(forwardEntry?.scope).toBe('WORLD');
    expect(forwardEntry?.leagueId).toBeNull();
  });
});

// ── 월드 통합 (개인) ──────────────────────────────────────────────────

describe('resolveBallonDor', () => {
  it('contributionScore × 리그 티어 가중치로 세계 최고 선수를 뽑는다', () => {
    const tier1 = { ...candidate('p1', { contributionScore: 80 }), leagueTier: 1 as const };
    const tier3 = { ...candidate('p2', { contributionScore: 95 }), leagueTier: 3 as const };
    // p1: 80*1.2=96, p2: 95*0.8=76 → p1 승리

    const award = resolveBallonDor(SEASON_ID, [tier1, tier3]);

    expect(award.playerId).toBe('p1');
    expect(award.scope).toBe('WORLD');
    expect(award.leagueId).toBeNull();
  });
});

// ── 대회 ──────────────────────────────────────────────────────────────

describe('resolveCupMvp / resolvePlayoffMvp', () => {
  function competitionCandidate(id: string, stat: Partial<PlayerSeasonStat>): CompetitionAwardCandidate {
    return { player: { id: id as PlayerId }, stat: statOverrides({ playerId: id as PlayerId, ...stat }) };
  }

  it('CUP_MVP는 leagueId가 항상 null이다', () => {
    const a = competitionCandidate('p1', { competitionType: 'CUP', contributionScore: 30 });
    const b = competitionCandidate('p2', { competitionType: 'CUP', contributionScore: 60 });

    const award = resolveCupMvp(SEASON_ID, [a, b]);

    expect(award.playerId).toBe('p2');
    expect(award.scope).toBe('CUP');
    expect(award.leagueId).toBeNull();
  });

  it('CUP_MVP는 competitionType이 CUP이 아니면 예외', () => {
    const wrong = competitionCandidate('p1', { competitionType: 'LEAGUE' });
    expect(() => resolveCupMvp(SEASON_ID, [wrong])).toThrow(/competitionType/);
  });

  it('PLAYOFF_MVP는 요청한 leagueId로 채워진다', () => {
    const a = competitionCandidate('p1', { competitionType: 'PLAYOFF', contributionScore: 10 });

    const award = resolvePlayoffMvp(SEASON_ID, LEAGUE_ID, [a]);

    expect(award.scope).toBe('PLAYOFF');
    expect(award.leagueId).toBe(LEAGUE_ID);
  });
});

// ── 클럽 트로피 ───────────────────────────────────────────────────────

describe('클럽 트로피 매핑', () => {
  it('resolveLeagueTitleTrophies — 리그별 우승팀을 그대로 매핑한다', () => {
    const trophies = resolveLeagueTitleTrophies(SEASON_ID, [
      { leagueId: LEAGUE_ID, teamId: 'team-a' as TeamId },
    ]);
    expect(trophies).toEqual([
      { seasonId: SEASON_ID, teamId: 'team-a', type: 'LEAGUE_TITLE', leagueId: LEAGUE_ID },
    ]);
  });

  it('resolvePlayoffTitleTrophies — 플레이오프 우승팀을 그대로 매핑한다', () => {
    const trophies = resolvePlayoffTitleTrophies(SEASON_ID, [
      { leagueId: LEAGUE_ID, teamId: 'team-b' as TeamId },
    ]);
    expect(trophies[0].type).toBe('PLAYOFF_TITLE');
    expect(trophies[0].leagueId).toBe(LEAGUE_ID);
  });

  it('resolveCupTitleTrophy — leagueId가 null이다', () => {
    const trophy = resolveCupTitleTrophy(SEASON_ID, { teamId: 'team-c' as TeamId });
    expect(trophy).toEqual({ seasonId: SEASON_ID, teamId: 'team-c', type: 'CUP_TITLE', leagueId: null });
  });

  it('resolvePromotionTrophies — PROMOTED만 남기고 RELEGATED는 제외한다', () => {
    const swaps: PromotionSwap[] = [
      {
        teamId: 'team-up' as TeamId,
        fromLeagueId: LEAGUE_ID_2,
        toLeagueId: LEAGUE_ID,
        direction: 'PROMOTED',
        finalRank: 1,
      },
      {
        teamId: 'team-down' as TeamId,
        fromLeagueId: LEAGUE_ID,
        toLeagueId: LEAGUE_ID_2,
        direction: 'RELEGATED',
        finalRank: 20,
      },
    ];

    const trophies = resolvePromotionTrophies(SEASON_ID, swaps);

    expect(trophies).toHaveLength(1);
    expect(trophies[0]).toEqual({
      seasonId: SEASON_ID,
      teamId: 'team-up',
      type: 'PROMOTION',
      leagueId: LEAGUE_ID,
    });
  });
});
