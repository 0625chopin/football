/**
 * aggregate.ts 테스트 — Task 026 / 37일차 산출물.
 *
 * 완료 판정 "순위표 조회가 실시간 계산 불필요"를 뒷받침하는 핵심 성질(라운드별 누적이
 * 정확하고, 직전 스냅샷 + 이번 라운드 경기만으로 다음 스냅샷을 재현 가능)을 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { LeagueId, SeasonId, Standing, TeamId } from '@/types';
import type { HeadToHeadFixtureInput } from './tiebreak';
import {
  advanceStandingRound,
  buildStandingHistory,
  type StandingHistoryFixtureInput,
  type StandingRoundFixtureInput,
} from './aggregate';

const SEASON_ID = 'season-1' as SeasonId;
const LEAGUE_ID = 'league-1' as LeagueId;
const SEASON_SEED = 987654321;

const A = 'A' as TeamId;
const B = 'B' as TeamId;
const C = 'C' as TeamId;
const D = 'D' as TeamId;

function standingOf(standings: readonly Standing[], teamId: TeamId): Standing {
  const found = standings.find((s) => s.teamId === teamId);
  if (!found) throw new Error(`teamId=${teamId} not found`);
  return found;
}

describe('advanceStandingRound — 라운드 1(신규 팀 초기화 + 누적)', () => {
  const round1Fixtures: StandingRoundFixtureInput[] = [
    { homeTeamId: A, awayTeamId: B, homeScore: 2, awayScore: 0, status: 'FINISHED' },
    { homeTeamId: C, awayTeamId: D, homeScore: 1, awayScore: 1, status: 'FINISHED' },
  ];
  const h2h: HeadToHeadFixtureInput[] = round1Fixtures.map((f) => ({
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    homeScore: f.homeScore,
    awayScore: f.awayScore,
    status: f.status,
  }));

  const result = advanceStandingRound({
    seasonSeed: SEASON_SEED,
    seasonId: SEASON_ID,
    leagueId: LEAGUE_ID,
    round: 1,
    previousStandings: [],
    newTeamIds: [A, B, C, D],
    roundFixtures: round1Fixtures,
    allFinishedFixtures: h2h,
  });

  it('승/무/패·득실·승점을 MATCH_POINTS_DEFAULT(승3/무1/패0) 기준으로 정확히 누적한다', () => {
    const a = standingOf(result, A);
    expect(a).toMatchObject({ played: 1, won: 1, drawn: 0, lost: 0, gf: 2, ga: 0, gd: 2, points: 3 });

    const b = standingOf(result, B);
    expect(b).toMatchObject({ played: 1, won: 0, drawn: 0, lost: 1, gf: 0, ga: 2, gd: -2, points: 0 });

    const c = standingOf(result, C);
    expect(c).toMatchObject({ played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1, gd: 0, points: 1 });
  });

  it('form에 이번 라운드 결과 1글자가 반영된다', () => {
    expect(standingOf(result, A).form).toBe('W');
    expect(standingOf(result, B).form).toBe('L');
    expect(standingOf(result, C).form).toBe('D');
  });

  it('4팀 전원이 스냅샷에 존재하고 승점 내림차순 랭크가 매겨진다', () => {
    expect(result).toHaveLength(4);
    expect(result[0].teamId).toBe(A);
    expect(result.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe('advanceStandingRound — 라운드 2(직전 스냅샷 기반 증분 갱신)', () => {
  it('played·form이 라운드 경계를 넘어 계속 누적된다(스냅샷만으로 재현 가능)', () => {
    const round1 = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 1,
      previousStandings: [],
      newTeamIds: [A, B],
      roundFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
      allFinishedFixtures: [
        { homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' },
      ],
    });

    const round2Fixture: StandingRoundFixtureInput = {
      homeTeamId: B,
      awayTeamId: A,
      homeScore: 2,
      awayScore: 2,
      status: 'FINISHED',
    };
    const round2 = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 2,
      previousStandings: round1,
      roundFixtures: [round2Fixture],
      allFinishedFixtures: [
        { homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' },
        { homeTeamId: B, awayTeamId: A, homeScore: 2, awayScore: 2, status: 'FINISHED' },
      ],
    });

    const a = standingOf(round2, A);
    expect(a).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, gf: 3, ga: 2, gd: 1, points: 4 });
    expect(a.form).toBe('WD');
    expect(a.round).toBe(2);
  });
});

describe('advanceStandingRound — 미종료·스코어 없는 경기는 무시한다', () => {
  it('status가 FINISHED가 아니면 반영하지 않는다', () => {
    const result = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 1,
      previousStandings: [],
      newTeamIds: [A, B],
      roundFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: null, awayScore: null, status: 'SCHEDULED' }],
      allFinishedFixtures: [],
    });

    expect(standingOf(result, A)).toMatchObject({ played: 0, points: 0, form: '' });
  });
});

describe('advanceStandingRound — 등록되지 않은 팀의 경기는 오류로 막는다', () => {
  it('previousStandings/newTeamIds 어디에도 없는 teamId면 RangeError', () => {
    expect(() =>
      advanceStandingRound({
        seasonSeed: SEASON_SEED,
        seasonId: SEASON_ID,
        leagueId: LEAGUE_ID,
        round: 1,
        previousStandings: [],
        newTeamIds: [A],
        roundFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
        allFinishedFixtures: [],
      }),
    ).toThrow(RangeError);
  });
});

describe('advanceStandingRound — 재호출 멱등성(6팀 크론 재시도 안전)', () => {
  it('동일한 previousStandings·roundFixtures로 여러 번 호출해도 항상 완전히 동일한 스냅샷을 반환한다', () => {
    const previousStandings = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 1,
      previousStandings: [],
      newTeamIds: [A, B],
      roundFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
      allFinishedFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
    });
    const roundFixtures: StandingRoundFixtureInput[] = [
      { homeTeamId: B, awayTeamId: A, homeScore: 2, awayScore: 2, status: 'FINISHED' },
    ];
    const allFinishedFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' },
      { homeTeamId: B, awayTeamId: A, homeScore: 2, awayScore: 2, status: 'FINISHED' },
    ];
    const input = {
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 2,
      previousStandings,
      roundFixtures,
      allFinishedFixtures,
    };

    const first = advanceStandingRound(input);
    const second = advanceStandingRound(input);
    const third = advanceStandingRound(input);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
    // 값 자체도 비어 있지 않음(항상-동일-빈값 위양성 방지).
    expect(standingOf(first, A).played).toBe(2);
  });

  it('호출 후에도 입력 previousStandings/roundFixtures가 변형되지 않는다(오케스트레이션 계층의 재시도가 이전 스냅샷을 훼손하지 않음)', () => {
    const previousStandings = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 1,
      previousStandings: [],
      newTeamIds: [A, B],
      roundFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
      allFinishedFixtures: [{ homeTeamId: A, awayTeamId: B, homeScore: 1, awayScore: 0, status: 'FINISHED' }],
    });
    const roundFixtures: StandingRoundFixtureInput[] = [
      { homeTeamId: B, awayTeamId: A, homeScore: 2, awayScore: 2, status: 'FINISHED' },
    ];
    const previousSnapshot = JSON.parse(JSON.stringify(previousStandings));
    const fixturesSnapshot = JSON.parse(JSON.stringify(roundFixtures));

    advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 2,
      previousStandings,
      roundFixtures,
      allFinishedFixtures: [],
    });

    expect(previousStandings).toEqual(previousSnapshot);
    expect(roundFixtures).toEqual(fixturesSnapshot);
  });
});

describe('buildStandingHistory — 재호출 멱등성', () => {
  it('동일 입력으로 여러 번 호출해도 라운드별 스냅샷 이력이 항상 완전히 동일하다', () => {
    const fixtures: StandingHistoryFixtureInput[] = [
      { round: 1, homeTeamId: A, awayTeamId: B, homeScore: 3, awayScore: 0, status: 'FINISHED' },
      { round: 2, homeTeamId: B, awayTeamId: A, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { round: 3, homeTeamId: A, awayTeamId: B, homeScore: 0, awayScore: 2, status: 'FINISHED' },
    ];
    const input = { seasonSeed: SEASON_SEED, seasonId: SEASON_ID, leagueId: LEAGUE_ID, teamIds: [A, B], fixtures };

    const first = buildStandingHistory(input);
    const second = buildStandingHistory(input);

    expect([...second.keys()]).toEqual([...first.keys()]);
    for (const round of first.keys()) {
      expect(second.get(round)).toEqual(first.get(round));
    }
  });
});

describe('buildStandingHistory — 시즌 전체 라운드 재생', () => {
  it('advanceStandingRound()를 라운드 순서대로 반복 호출한 결과와 동일한 최종 스냅샷을 만든다', () => {
    const fixtures: StandingHistoryFixtureInput[] = [
      { round: 1, homeTeamId: A, awayTeamId: B, homeScore: 3, awayScore: 0, status: 'FINISHED' },
      { round: 2, homeTeamId: B, awayTeamId: A, homeScore: 1, awayScore: 1, status: 'FINISHED' },
    ];

    const history = buildStandingHistory({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      teamIds: [A, B],
      fixtures,
    });

    expect([...history.keys()]).toEqual([1, 2]);

    const round1 = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 1,
      previousStandings: [],
      newTeamIds: [A, B],
      roundFixtures: [fixtures[0]],
      allFinishedFixtures: [fixtures[0]],
    });
    const round2Expected = advanceStandingRound({
      seasonSeed: SEASON_SEED,
      seasonId: SEASON_ID,
      leagueId: LEAGUE_ID,
      round: 2,
      previousStandings: round1,
      roundFixtures: [fixtures[1]],
      allFinishedFixtures: [fixtures[0], fixtures[1]],
    });

    expect(history.get(2)).toEqual(round2Expected);
  });
});
