/**
 * tiebreak.ts 테스트 — Task 026 / 35일차 산출물.
 *
 * 완료 판정 "7단계 각각이 단독으로 순위를 가름"을 단계별로 하나씩 증명한다: 이전 단계까지는
 * 전부 동률이고 딱 해당 단계 기준값만 다른 두 팀을 만들어, 그 기준으로만 순위가 갈리고
 * `tiebreakApplied`가 그 단계 번호로 찍히는지 확인한다.
 */

import { describe, expect, it } from 'vitest';
import type { LeagueId, SeasonId, TeamId } from '@/types';
import { deriveStandingDrawSeed, hashKey, stateForSeed } from '../rng/derive';
import { nextIntBelow } from '../rng/prng';
import {
  MATCH_POINTS_DEFAULT,
  resolveStandings,
  type HeadToHeadFixtureInput,
  type StandingBasis,
} from './tiebreak';

const SEASON_ID = 'season-1' as SeasonId;
const LEAGUE_ID = 'league-1' as LeagueId;
const ROUND = 10;
const SEASON_SEED = 123456789;

function team(id: string, overrides: Partial<StandingBasis> = {}): StandingBasis {
  return {
    seasonId: SEASON_ID,
    leagueId: LEAGUE_ID,
    round: ROUND,
    teamId: id as TeamId,
    played: 10,
    won: 3,
    drawn: 1,
    lost: 6,
    gf: 10,
    ga: 10,
    gd: 0,
    points: 10,
    form: 'WLDWL',
    fairPlayScore: 5,
    ...overrides,
  };
}

function rankOf(standings: ReturnType<typeof resolveStandings>, teamId: string) {
  const found = standings.find((s) => s.teamId === teamId);
  if (!found) throw new Error(`teamId=${teamId} not found`);
  return found;
}

describe('resolveStandings — 1단계 승점(단독 결정)', () => {
  it('승점이 서로 다르면 승점만으로 순위가 갈리고 tiebreakApplied는 null이다', () => {
    const teams = [team('A', { points: 20 }), team('B', { points: 25 }), team('C', { points: 15 })];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['B', 'A', 'C']);
    expect(result.every((s) => s.tiebreakApplied === null)).toBe(true);
    expect(result.map((s) => s.rank)).toEqual([1, 2, 3]);
  });
});

describe('resolveStandings — 2단계 골득실(단독 결정)', () => {
  it('승점이 같고 골득실만 다르면 골득실로 갈리고 tiebreakApplied=2다', () => {
    const teams = [
      team('A', { points: 20, gd: 5 }),
      team('B', { points: 20, gd: 10 }),
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['B', 'A']);
    expect(result.every((s) => s.tiebreakApplied === 2)).toBe(true);
  });
});

describe('resolveStandings — 3단계 다득점(단독 결정)', () => {
  it('승점·골득실이 같고 다득점만 다르면 다득점으로 갈리고 tiebreakApplied=3이다', () => {
    const teams = [
      team('A', { points: 20, gd: 5, gf: 15 }),
      team('B', { points: 20, gd: 5, gf: 20 }),
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['B', 'A']);
    expect(result.every((s) => s.tiebreakApplied === 3)).toBe(true);
  });
});

describe('resolveStandings — 4단계 승자승 미니리그(단독 결정)', () => {
  const tiedBasis = { points: 20, gd: 5, gf: 15 };

  it('상호 승점(맞대결 승패)만으로 갈리면 tiebreakApplied=4다', () => {
    const teams = [team('A', tiedBasis), team('B', tiedBasis)];
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'B' as TeamId, homeScore: 2, awayScore: 0, status: 'FINISHED' },
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures });

    expect(result.map((s) => s.teamId)).toEqual(['A', 'B']);
    expect(result.every((s) => s.tiebreakApplied === 4)).toBe(true);
  });

  it('상호 승점·골득실까지 같고 상호 원정 다득점만 다르면 그것으로 갈린다(2경기 홈/원정 교환)', () => {
    const teams = [team('A', tiedBasis), team('B', tiedBasis)];
    // A는 원정에서 2골(B 홈 2-2), B는 원정에서 0골(A 홈 1-1) — 상호 승점(1+1)·상호 골득실(0)은
    // 같지만 원정 다득점은 A=2, B=0으로 갈린다.
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'B' as TeamId, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { homeTeamId: 'B' as TeamId, awayTeamId: 'A' as TeamId, homeScore: 2, awayScore: 2, status: 'FINISHED' },
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures });

    expect(result.map((s) => s.teamId)).toEqual(['A', 'B']);
    expect(result.every((s) => s.tiebreakApplied === 4)).toBe(true);
  });

  it('SCHEDULED(미종료) 경기는 미니리그 계산에서 무시된다', () => {
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'B' as TeamId, homeScore: null, awayScore: null, status: 'SCHEDULED' },
    ];
    // 반영되는 경기가 없으므로 미니리그는 완전 동률 → 5단계(다승)로 넘어간다.
    const withWins = [team('A', { ...tiedBasis, won: 5 }), team('B', { ...tiedBasis, won: 2 })];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams: withWins, headToHeadFixtures });

    expect(result.map((s) => s.teamId)).toEqual(['A', 'B']);
    expect(result.every((s) => s.tiebreakApplied === 5)).toBe(true);
  });

  it('3팀 이상 동률 — 동률 팀들끼리의 경기만 추려 미니리그를 재계산한다', () => {
    // A/B/C 3팀 동률. 라운드로빈: A-B 무, A-C 무, B가 C에 승 → 미니 승점 B(4)>A(2)>C(1)로
    // 3팀 전원이 이 미니리그 하나로 완전히 갈린다(전부 tiebreakApplied=4).
    const teams = [team('A', tiedBasis), team('B', tiedBasis), team('C', tiedBasis)];
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'B' as TeamId, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { homeTeamId: 'A' as TeamId, awayTeamId: 'C' as TeamId, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { homeTeamId: 'B' as TeamId, awayTeamId: 'C' as TeamId, homeScore: 2, awayScore: 0, status: 'FINISHED' },
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures });

    expect(result.map((s) => s.teamId)).toEqual(['B', 'A', 'C']);
    expect(result.every((s) => s.tiebreakApplied === 4)).toBe(true);
  });

  it('동률 그룹 밖 팀과의 경기는 미니리그 계산에서 제외된다(필터링 검증)', () => {
    // A/B만 동률. D는 동률 그룹 밖이라 D 개입 경기(A vs D)는 미니리그에 반영되면 안 된다.
    // 반영되면 A가 그 경기로 미니 승점을 얻어 B와 갈리지만, 올바르게 걸러지면 여전히
    // 동률이라 5단계(다승)로 넘어간다.
    const teams = [
      team('A', { ...tiedBasis, won: 6 }),
      team('B', { ...tiedBasis, won: 3 }),
      team('D', { points: 999 }), // 동률 그룹 밖(승점으로 이미 분리됨)
    ];
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'D' as TeamId, homeScore: 3, awayScore: 0, status: 'FINISHED' },
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures });

    expect(result.map((s) => s.teamId)).toEqual(['D', 'A', 'B']);
    expect(rankOf(result, 'A').tiebreakApplied).toBe(5);
    expect(rankOf(result, 'B').tiebreakApplied).toBe(5);
  });
});

describe('resolveStandings — 5단계 다승(단독 결정)', () => {
  it('1~4단계가 전부 동률(맞대결 데이터 없음)이고 다승만 다르면 tiebreakApplied=5다', () => {
    const tiedBasis = { points: 20, gd: 5, gf: 15 };
    const teams = [team('A', { ...tiedBasis, won: 6 }), team('B', { ...tiedBasis, won: 5 })];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['A', 'B']);
    expect(result.every((s) => s.tiebreakApplied === 5)).toBe(true);
  });
});

describe('resolveStandings — 6단계 페어플레이(단독 결정)', () => {
  it('1~5단계가 전부 동률이고 페어플레이 점수만 다르면 낮은 쪽이 상위이고 tiebreakApplied=6이다', () => {
    const tiedBasis = { points: 20, gd: 5, gf: 15, won: 6 };
    const teams = [team('A', { ...tiedBasis, fairPlayScore: 8 }), team('B', { ...tiedBasis, fairPlayScore: 3 })];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['B', 'A']);
    expect(result.every((s) => s.tiebreakApplied === 6)).toBe(true);
  });
});

describe('resolveStandings — 7단계 시드 추첨(단독 결정)', () => {
  const fullyTied = { points: 20, gd: 5, gf: 15, won: 6, fairPlayScore: 4 };

  it('1~6단계가 전부 동률이면 시드 추첨으로 완전히 갈리고 tiebreakApplied=7이다', () => {
    const teams = [team('A', fullyTied), team('B', fullyTied), team('C', fullyTied)];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.every((s) => s.tiebreakApplied === 7)).toBe(true);
    expect(result.map((s) => s.rank).sort()).toEqual([1, 2, 3]);
    expect(new Set(result.map((s) => s.teamId)).size).toBe(3);
  });

  it('동일 입력(같은 seasonSeed·round·팀 구성)이면 항상 같은 추첨 순서를 낸다', () => {
    const teams = [team('A', fullyTied), team('B', fullyTied), team('C', fullyTied)];
    const first = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });
    const second = resolveStandings({ seasonSeed: SEASON_SEED, teams: [...teams].reverse(), headToHeadFixtures: [] });

    expect(second.map((s) => s.teamId)).toEqual(first.map((s) => s.teamId));
  });

  it('seasonSeed가 다르면 추첨 순서가 달라질 수 있다(결정론적이되 시드에 종속)', () => {
    const teams = [team('A', fullyTied), team('B', fullyTied), team('C', fullyTied)];
    const first = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });
    const second = resolveStandings({ seasonSeed: SEASON_SEED + 999, teams, headToHeadFixtures: [] });

    const firstOrder = first.map((s) => s.teamId).join(',');
    const secondOrder = second.map((s) => s.teamId).join(',');
    expect(firstOrder).not.toBe(secondOrder);
  });

  it('PRNG state를 매 추첨마다 이어받는다 — 독립 재구현한 Fisher–Yates와 정확히 일치해야 한다', () => {
    // resolveStandings 내부와 별개로, 같은 1차 원시(rng/derive·rng/prng)만으로 Fisher–Yates를
    // 직접 재구현해 비교한다. state를 이어받지 않고 매번 초기 state로 되돌아가는 결함이
    // 있었다면(예: `nextIntBelow(state, i+1)`을 매 회 원본 state로 호출) 여기서 결과가
    // 어긋난다 — 5개 이상으로 뽑아야 앞 1~2회의 우연한 일치로 결함이 가려지지 않는다.
    const teams = [
      team('A', fullyTied),
      team('B', fullyTied),
      team('C', fullyTied),
      team('D', fullyTied),
      team('E', fullyTied),
    ];
    const actual = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    const canonicalIds = teams.map((t) => String(t.teamId)).sort();
    const groupKey = hashKey(canonicalIds.join('|'));
    const seed = deriveStandingDrawSeed(SEASON_SEED, ROUND, groupKey);
    const expectedIds = [...canonicalIds];
    let state = stateForSeed(seed);
    for (let i = expectedIds.length - 1; i > 0; i -= 1) {
      const step = nextIntBelow(state, i + 1);
      state = step.state; // state를 이어받지 않으면(예: 이 줄 누락) 아래 expect가 실패한다.
      const j = step.value;
      [expectedIds[i], expectedIds[j]] = [expectedIds[j], expectedIds[i]];
    }

    expect(actual.map((s) => s.teamId)).toEqual(expectedIds);
  });
});

describe('resolveStandings — 입력 검증', () => {
  it('teams가 비어 있으면 빈 배열을 반환한다', () => {
    expect(resolveStandings({ seasonSeed: SEASON_SEED, teams: [], headToHeadFixtures: [] })).toEqual([]);
  });

  it('seasonId/leagueId/round가 섞이면 오류를 던진다', () => {
    const teams = [team('A'), team('B', { round: ROUND + 1 })];
    expect(() =>
      resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] }),
    ).toThrow(RangeError);
  });

  it('teamId가 중복되면 오류를 던진다', () => {
    const teams = [team('A', { points: 20 }), team('A', { points: 10 })];
    expect(() =>
      resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] }),
    ).toThrow(RangeError);
  });
});

describe('resolveStandings — matchPoints 주입(I-83 패턴)', () => {
  it('matchPoints 배점을 바꾸면 4단계 미니리그 승점 계산 결과(순서)가 실제로 달라진다', () => {
    const tiedBasis = { points: 20, gd: 5, gf: 15 };
    const teams = [team('A', tiedBasis), team('B', tiedBasis), team('C', tiedBasis)];
    // 3팀 단일 라운드로빈: A-B 무, A-C 무, B가 C에 승. 기본 배점(WIN=3/DRAW=1/LOSS=0)이면
    // B(무1+승3=4) > A(무1+무1=2) > C(무1+패0=1) 순. DRAW를 WIN보다 크게(10) 주입하면
    // A(10+10=20) > B(10+3=13) > C(10+0=10)로 순서 자체가 뒤바뀐다 — 주입값이 실제로
    // 계산에 반영된다는 증거다.
    const headToHeadFixtures: HeadToHeadFixtureInput[] = [
      { homeTeamId: 'A' as TeamId, awayTeamId: 'B' as TeamId, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { homeTeamId: 'A' as TeamId, awayTeamId: 'C' as TeamId, homeScore: 1, awayScore: 1, status: 'FINISHED' },
      { homeTeamId: 'B' as TeamId, awayTeamId: 'C' as TeamId, homeScore: 2, awayScore: 0, status: 'FINISHED' },
    ];

    const withDefault = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures });
    expect(withDefault.map((s) => s.teamId)).toEqual(['B', 'A', 'C']);

    const withDrawHeavy = resolveStandings({
      seasonSeed: SEASON_SEED,
      teams,
      headToHeadFixtures,
      matchPoints: { WIN: 3, DRAW: 10, LOSS: 0 },
    });
    expect(withDrawHeavy.map((s) => s.teamId)).toEqual(['A', 'B', 'C']);

    expect(MATCH_POINTS_DEFAULT).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
  });
});

describe('resolveStandings — 복합 시나리오', () => {
  it('일부는 승점으로, 일부는 골득실로 갈리는 4팀 혼합 케이스', () => {
    const teams = [
      team('TOP', { points: 30 }),
      team('A', { points: 20, gd: 5 }),
      team('B', { points: 20, gd: 8 }),
      team('BOTTOM', { points: 10 }),
    ];
    const result = resolveStandings({ seasonSeed: SEASON_SEED, teams, headToHeadFixtures: [] });

    expect(result.map((s) => s.teamId)).toEqual(['TOP', 'B', 'A', 'BOTTOM']);
    expect(rankOf(result, 'TOP').tiebreakApplied).toBeNull();
    expect(rankOf(result, 'BOTTOM').tiebreakApplied).toBeNull();
    expect(rankOf(result, 'A').tiebreakApplied).toBe(2);
    expect(rankOf(result, 'B').tiebreakApplied).toBe(2);
  });
});
