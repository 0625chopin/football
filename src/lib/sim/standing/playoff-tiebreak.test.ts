/**
 * playoff-tiebreak.ts 테스트 — Task 026 / 36일차 산출물.
 *
 * 완료 판정 "동률 시 Fixture 1건 생성"을 증명한다: 승격 경계(3위/4위)·강등 경계에 6단계까지
 * 동률인 팀 쌍이 걸치면 `TIEBREAK` Fixture 초안이 정확히 1건 나오고, 경계 밖 동률(안전권
 * 안에서만 동률)은 아무것도 생성되지 않는지 확인한다. 3팀 이상 동시 동률·잘못된 경계
 * 정의는 파일 헤더가 예고한 대로 명시적 오류가 되는지도 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { LeagueId, SeasonId, TeamId } from '@/types';
import {
  detectBoundaryTiebreaks,
  type StandingBoundary,
} from './playoff-tiebreak';
import type { HeadToHeadFixtureInput, StandingBasis } from './tiebreak';

const SEASON_ID = 'season-1' as SeasonId;
const LEAGUE_ID = 'league-1' as LeagueId;
const ROUND = 38;

function team(id: string, overrides: Partial<StandingBasis> = {}): StandingBasis {
  return {
    seasonId: SEASON_ID,
    leagueId: LEAGUE_ID,
    round: ROUND,
    teamId: id as TeamId,
    played: 38,
    won: 10,
    drawn: 5,
    lost: 23,
    gf: 30,
    ga: 40,
    gd: -10,
    points: 35,
    form: 'WLDWL',
    fairPlayScore: 20,
    ...overrides,
  };
}

const PROMOTION_BOUNDARY: StandingBoundary = { kind: 'PROMOTION', upperRank: 3, lowerRank: 4 };
const RELEGATION_BOUNDARY: StandingBoundary = { kind: 'RELEGATION', upperRank: 5, lowerRank: 6 };

describe('detectBoundaryTiebreaks — 승격 경계(3위/4위) 동률', () => {
  const tied = { points: 26, gd: 0, gf: 20, won: 7, fairPlayScore: 15 };
  const teams = [
    team('A', { points: 30 }), // 1위
    team('B', { points: 28 }), // 2위
    team('C', tied), // 3위/4위 동률
    team('D', tied),
    team('E', { points: 20 }), // 5위
    team('F', { points: 15 }), // 6위
  ];

  it('6단계까지 동률인 두 팀이 경계에 걸치면 Fixture 초안 1건을 생성한다', () => {
    const drafts = detectBoundaryTiebreaks({
      teams,
      headToHeadFixtures: [],
      boundaries: [PROMOTION_BOUNDARY],
    });

    expect(drafts).toHaveLength(1);
    const draft = drafts[0];
    expect(draft.competitionType).toBe('TIEBREAK');
    expect(draft.isNeutral).toBe(true);
    expect(draft.boundaryKind).toBe('PROMOTION');
    expect(draft.tiedRankStart).toBe(3);
    expect(draft.tiedRankEnd).toBe(4);
    expect(draft.seasonId).toBe(SEASON_ID);
    expect(draft.leagueId).toBe(LEAGUE_ID);
    expect([draft.homeTeamId, draft.awayTeamId].sort()).toEqual(['C', 'D']);
  });

  it('homeTeamId/awayTeamId는 teamId 오름차순으로 결정론적이다(입력 순서 무관)', () => {
    const forward = detectBoundaryTiebreaks({
      teams,
      headToHeadFixtures: [],
      boundaries: [PROMOTION_BOUNDARY],
    })[0];
    const reversed = detectBoundaryTiebreaks({
      teams: [...teams].reverse(),
      headToHeadFixtures: [],
      boundaries: [PROMOTION_BOUNDARY],
    })[0];

    expect(forward.homeTeamId).toBe('C');
    expect(forward.awayTeamId).toBe('D');
    expect(reversed.homeTeamId).toBe(forward.homeTeamId);
    expect(reversed.awayTeamId).toBe(forward.awayTeamId);
  });

  it('동일 입력으로 재호출해도 항상 동일한 결과다(결정론)', () => {
    const first = detectBoundaryTiebreaks({ teams, headToHeadFixtures: [], boundaries: [PROMOTION_BOUNDARY] });
    const second = detectBoundaryTiebreaks({ teams, headToHeadFixtures: [], boundaries: [PROMOTION_BOUNDARY] });
    expect(second).toEqual(first);
  });
});

describe('detectBoundaryTiebreaks — 경계 밖 동률은 생성하지 않는다', () => {
  it('안전권 안에서만 동률(1위/2위)이면 Fixture를 만들지 않는다', () => {
    const tied = { points: 30, gd: 5, gf: 20, won: 9, fairPlayScore: 10 };
    const teams = [
      team('A', tied), // 1위/2위 동률 — 3위/4위 경계와 무관
      team('B', tied),
      team('C', { points: 20 }),
      team('D', { points: 15 }),
    ];

    const drafts = detectBoundaryTiebreaks({
      teams,
      headToHeadFixtures: [],
      boundaries: [PROMOTION_BOUNDARY],
    });

    expect(drafts).toEqual([]);
  });

  it('boundaries가 비어 있으면 항상 빈 배열이다', () => {
    const tied = { points: 26, gd: 0, gf: 20, won: 7, fairPlayScore: 15 };
    const teams = [team('A', tied), team('B', tied)];

    expect(detectBoundaryTiebreaks({ teams, headToHeadFixtures: [], boundaries: [] })).toEqual([]);
  });
});

describe('detectBoundaryTiebreaks — 강등 경계도 같은 호출에서 함께 탐지된다', () => {
  it('승격 경계 동률 + 강등 경계 동률이 한 순위표에 동시에 있으면 각각 1건씩 생성한다', () => {
    const promoTied = { points: 26, gd: 0, gf: 20, won: 7, fairPlayScore: 15 };
    const relegTied = { points: 12, gd: -8, gf: 10, won: 3, fairPlayScore: 25 };
    const teams = [
      team('A', { points: 30 }), // 1위
      team('B', { points: 28 }), // 2위
      team('C', promoTied), // 3위/4위 동률
      team('D', promoTied),
      team('E', relegTied), // 5위/6위 강등 경계 동률
      team('F', relegTied),
    ];

    const drafts = detectBoundaryTiebreaks({
      teams,
      headToHeadFixtures: [],
      boundaries: [PROMOTION_BOUNDARY, RELEGATION_BOUNDARY],
    });

    expect(drafts).toHaveLength(2);
    const promoDraft = drafts.find((d) => d.boundaryKind === 'PROMOTION');
    const relegDraft = drafts.find((d) => d.boundaryKind === 'RELEGATION');
    expect(promoDraft && [promoDraft.homeTeamId, promoDraft.awayTeamId].sort()).toEqual(['C', 'D']);
    expect(relegDraft && [relegDraft.homeTeamId, relegDraft.awayTeamId].sort()).toEqual(['E', 'F']);
  });
});

describe('detectBoundaryTiebreaks — 4단계 승자승까지 반영한다', () => {
  it('점수·골득실·다득점이 같아도 맞대결 결과로 동률이 풀리면 Fixture를 만들지 않는다', () => {
    const tied = { points: 26, gd: 0, gf: 20, won: 7, fairPlayScore: 15 };
    const teams = [
      team('A', { points: 30 }),
      team('B', { points: 28 }),
      team('C', tied),
      team('D', tied),
      team('E', { points: 20 }),
    ];
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'C' as TeamId, awayTeamId: 'D' as TeamId, homeScore: 2, awayScore: 0, status: 'FINISHED' },
    ];

    const drafts = detectBoundaryTiebreaks({
      teams,
      headToHeadFixtures,
      boundaries: [PROMOTION_BOUNDARY],
    });

    expect(drafts).toEqual([]);
  });
});

describe('detectBoundaryTiebreaks — 범위 밖 입력은 명시적 오류다', () => {
  it('3팀 이상이 동시에 경계에 걸쳐 동률이면 오류를 던진다', () => {
    const tied = { points: 26, gd: 0, gf: 20, won: 7, fairPlayScore: 15 };
    const teams = [
      team('A', { points: 30 }),
      team('B', tied),
      team('C', tied),
      team('D', tied),
    ];

    expect(() =>
      detectBoundaryTiebreaks({ teams, headToHeadFixtures: [], boundaries: [PROMOTION_BOUNDARY] }),
    ).toThrow(/3팀 이상/);
  });

  it('경계 두 순위가 인접하지 않으면 오류를 던진다', () => {
    const teams = [team('A'), team('B')];
    const invalidBoundary: StandingBoundary = { kind: 'PROMOTION', upperRank: 3, lowerRank: 5 };

    expect(() =>
      detectBoundaryTiebreaks({ teams, headToHeadFixtures: [], boundaries: [invalidBoundary] }),
    ).toThrow(/인접한 두 순위/);
  });
});
