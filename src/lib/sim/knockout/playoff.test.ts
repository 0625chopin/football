/**
 * playoff.ts 테스트 — Task 027 / 40일차 산출물.
 *
 * 완료 판정 "경기 수 정확"을 증명한다: 리그1 = WC 2 + 8강 4 + 4강 2 + 결승 1 = 9경기,
 * 리그2 = 준결승 2 + 결승 1 = 3경기, 리그3 = 결승 1 = 1경기(FR-LG-011~013). 대진 규칙
 * (홈=상위 순위, 8강 저순위/고순위 승자 배정, 결승 중립지)과 잘못된 입력의 명시적 오류도
 * 함께 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { LeagueId, SeasonId, TeamId } from '@/types';
import {
  generateLeague1FinalRound,
  generateLeague1QuarterfinalRound,
  generateLeague1SemifinalRound,
  generateLeague1WildcardRound,
  generateLeague2FinalRound,
  generateLeague2SemifinalRound,
  generateLeague3FinalRound,
  resolveKnockoutWinnerTeamId,
  type PlayoffAdvancement,
} from './playoff';

const SEASON_ID = 'season-1' as SeasonId;
const LEAGUE_ID = 'league-1' as LeagueId;

/** seed N (1-based) → `team-N` teamId. */
function seedTeams(count: number): readonly TeamId[] {
  return Array.from({ length: count }, (_, i) => `team-${i + 1}` as TeamId);
}

const teamOf = (seed: number): TeamId => `team-${seed}` as TeamId;
const win = (seed: number): PlayoffAdvancement => ({ winnerSeed: seed });

describe('리그1 (10팀) 플레이오프', () => {
  const seeds = seedTeams(10);

  it('와일드카드 라운드는 정확히 2경기 — 7v10, 8v9, 홈=상위 순위', () => {
    const round = generateLeague1WildcardRound(SEASON_ID, LEAGUE_ID, seeds);
    expect(round).toHaveLength(2);
    expect(round[0]).toMatchObject({
      round: 1,
      stage: 'WILDCARD',
      homeSeed: 7,
      homeTeamId: teamOf(7),
      awaySeed: 10,
      awayTeamId: teamOf(10),
      isNeutral: false,
    });
    expect(round[1]).toMatchObject({
      homeSeed: 8,
      homeTeamId: teamOf(8),
      awaySeed: 9,
      awayTeamId: teamOf(9),
    });
  });

  it('8강은 정확히 4경기 — 이변 없을 때 1v8, 2v7, 3v6, 4v5', () => {
    // 시드대로면 7위·8위가 각각 WC를 통과한다.
    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(7), win(8)]);
    expect(qf).toHaveLength(4);
    // 1위 vs "WC 저순위 승자"(둘 중 시드 번호가 더 큰 8위)
    expect(qf[0]).toMatchObject({ homeSeed: 1, awaySeed: 8, stage: 'QUARTERFINAL' });
    // 2위 vs "WC 고순위 승자"(7위)
    expect(qf[1]).toMatchObject({ homeSeed: 2, awaySeed: 7 });
    expect(qf[2]).toMatchObject({ homeSeed: 3, awaySeed: 6 });
    expect(qf[3]).toMatchObject({ homeSeed: 4, awaySeed: 5 });
  });

  it('8강 — 이변 발생 시(10위·9위 승리) WC 저순위/고순위 승자가 뒤바뀐다', () => {
    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(10), win(9)]);
    expect(qf[0]).toMatchObject({ homeSeed: 1, awaySeed: 10 }); // 저순위 승자 = 10위
    expect(qf[1]).toMatchObject({ homeSeed: 2, awaySeed: 9 }); // 고순위 승자 = 9위
  });

  it('8강 — 같은 쌍에서 승자 2명을 받으면 오류', () => {
    expect(() =>
      generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(7), win(10)]),
    ).toThrow(RangeError);
  });

  it('8강 — 와일드카드 참가 시드(7~10) 밖의 승자면 오류', () => {
    expect(() =>
      generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(8)]),
    ).toThrow(RangeError);
  });

  it('4강은 정확히 2경기 — 표준 브래킷 반대편 배치(0v3, 1v2)로 짝짓는다', () => {
    // 8강 생성 순서: [1위쪽, 2위쪽, 3위쪽, 4위쪽] 경기에서 전부 상위 시드가 승리했다고 가정
    const sf = generateLeague1SemifinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(2), win(3), win(4)]);
    expect(sf).toHaveLength(2);
    expect(sf[0]).toMatchObject({ homeSeed: 1, awaySeed: 4, stage: 'SEMIFINAL' });
    expect(sf[1]).toMatchObject({ homeSeed: 2, awaySeed: 3 });
  });

  it('결승은 정확히 1경기 — 중립지(홈 어드밴티지 미적용)', () => {
    const final = generateLeague1FinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(2)]);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({
      round: 4,
      stage: 'FINAL',
      homeSeed: 1,
      awaySeed: 2,
      isNeutral: true,
    });
  });

  it('전체 경기 수 = WC 2 + 8강 4 + 4강 2 + 결승 1 = 9경기', () => {
    const wc = generateLeague1WildcardRound(SEASON_ID, LEAGUE_ID, seeds);
    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(7), win(8)]);
    const sf = generateLeague1SemifinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(2), win(3), win(4)]);
    const final = generateLeague1FinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(4)]);
    expect(wc.length + qf.length + sf.length + final.length).toBe(9);
  });

  it('seeds가 10개가 아니면 오류', () => {
    expect(() => generateLeague1WildcardRound(SEASON_ID, LEAGUE_ID, seedTeams(9))).toThrow(RangeError);
  });

  it('seeds에 중복 teamId가 있으면 오류', () => {
    const dup = [...seedTeams(9), seedTeams(9)[0]];
    expect(() => generateLeague1WildcardRound(SEASON_ID, LEAGUE_ID, dup)).toThrow(RangeError);
  });
});

describe('리그2 (4팀) 플레이오프', () => {
  const seeds = seedTeams(4);

  it('준결승은 정확히 2경기 — 1v4, 2v3', () => {
    const sf = generateLeague2SemifinalRound(SEASON_ID, LEAGUE_ID, seeds);
    expect(sf).toHaveLength(2);
    expect(sf[0]).toMatchObject({ round: 1, stage: 'SEMIFINAL', homeSeed: 1, awaySeed: 4 });
    expect(sf[1]).toMatchObject({ homeSeed: 2, awaySeed: 3 });
  });

  it('결승은 정확히 1경기 — 중립지', () => {
    const final = generateLeague2FinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(1), win(4)]);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({ round: 2, stage: 'FINAL', homeSeed: 1, awaySeed: 4, isNeutral: true });
  });

  it('전체 경기 수 = 준결승 2 + 결승 1 = 3경기', () => {
    const sf = generateLeague2SemifinalRound(SEASON_ID, LEAGUE_ID, seeds);
    const final = generateLeague2FinalRound(SEASON_ID, LEAGUE_ID, seeds, [win(2), win(3)]);
    expect(sf.length + final.length).toBe(3);
  });
});

describe('리그3 (2팀) 플레이오프', () => {
  it('결승 1경기, 중립지, 참가 2팀', () => {
    const seeds = seedTeams(2);
    const final = generateLeague3FinalRound(SEASON_ID, LEAGUE_ID, seeds);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({
      round: 1,
      stage: 'FINAL',
      homeSeed: 1,
      awaySeed: 2,
      isNeutral: true,
    });
  });

  it('seeds가 2개가 아니면 오류', () => {
    expect(() => generateLeague3FinalRound(SEASON_ID, LEAGUE_ID, seedTeams(3))).toThrow(RangeError);
  });
});

describe('resolveKnockoutWinnerTeamId — D-19 승자 판정', () => {
  const HOME = 'team-home' as TeamId;
  const AWAY = 'team-away' as TeamId;

  it('정규시간 스코어로 갈리면 그대로 판정', () => {
    const winner = resolveKnockoutWinnerTeamId({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      homeScore: 2,
      awayScore: 1,
      etHomeScore: null,
      etAwayScore: null,
      pkHome: null,
      pkAway: null,
    });
    expect(winner).toBe(HOME);
  });

  it('연장 득점을 합산해 판정한다(D-19: 연장 득점 포함)', () => {
    const winner = resolveKnockoutWinnerTeamId({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      homeScore: 1,
      awayScore: 1,
      etHomeScore: 0,
      etAwayScore: 1,
      pkHome: null,
      pkAway: null,
    });
    expect(winner).toBe(AWAY);
  });

  it('정규+연장 동률이면 승부차기로 판정하고, PK 골은 판정에만 쓰인다(D-19)', () => {
    const winner = resolveKnockoutWinnerTeamId({
      homeTeamId: HOME,
      awayTeamId: AWAY,
      homeScore: 1,
      awayScore: 1,
      etHomeScore: 1,
      etAwayScore: 1,
      pkHome: 5,
      pkAway: 4,
    });
    expect(winner).toBe(HOME);
  });

  it('정규+연장 동률인데 승부차기 스코어가 없으면 오류', () => {
    expect(() =>
      resolveKnockoutWinnerTeamId({
        homeTeamId: HOME,
        awayTeamId: AWAY,
        homeScore: 1,
        awayScore: 1,
        etHomeScore: null,
        etAwayScore: null,
        pkHome: null,
        pkAway: null,
      }),
    ).toThrow(RangeError);
  });

  it('승부차기 스코어까지 동률이면 오류(서든데스로 반드시 갈려야 함)', () => {
    expect(() =>
      resolveKnockoutWinnerTeamId({
        homeTeamId: HOME,
        awayTeamId: AWAY,
        homeScore: 0,
        awayScore: 0,
        etHomeScore: 0,
        etAwayScore: 0,
        pkHome: 5,
        pkAway: 5,
      }),
    ).toThrow(RangeError);
  });
});
