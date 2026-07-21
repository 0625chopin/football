/**
 * cup.ts 테스트 — Task 027 / 41일차 산출물.
 *
 * 완료 판정 "참가 60팀·59경기·우승 1팀"을 값으로 증명한다: 1라운드 28 + 32강 16 +
 * 16강 8 + 8강 4 + 4강 2 + 결승 1 = 59경기, 전 시드(1~60)가 1라운드에서 정확히 한 번씩
 * 등장하고, 결승까지 시뮬레이션하면 우승자가 정확히 1팀으로 좁혀진다. 대진 규칙(홈=더 큰
 * 시드, D-24 1라운드 티어 교차 우선순위, 결승 중립지)과 2라운드 이후 추첨의 결정론
 * (같은 참가 구성 → 같은 대진)·비결정론(다른 seasonSeed → 다른 대진 가능)도 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { SeasonId, TeamId } from '@/types';
import {
  generateCupFinalRound,
  generateCupQuarterfinalRound,
  generateCupRound1,
  generateCupRoundOf16,
  generateCupRoundOf32,
  generateCupSemifinalRound,
  resolveCupWinnerSeed,
  type CupFixtureDraft,
  type CupSeedPools,
} from './cup';

const SEASON_ID = 'season-1' as SeasonId;
const SEASON_SEED = 424242;

function seedTeams(prefix: string, count: number): readonly TeamId[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}` as TeamId);
}

const pools: CupSeedPools = {
  league1: seedTeams('l1', 24),
  league2: seedTeams('l2', 20),
  league3: seedTeams('l3', 16),
};

/** 전역 시드 1~60 → teamId (테스트 전용 재구성; cup.ts 내부 teamOfGlobalSeed와 동일 규칙). */
function teamOfSeed(seed: number): TeamId {
  if (seed <= 24) return pools.league1[seed - 1];
  if (seed <= 44) return pools.league2[seed - 25];
  return pools.league3[seed - 45];
}

/** 각 경기에서 항상 홈(=더 큰 시드, 즉 이변)이 이기는 것으로 취급해 승자 시드를 뽑는다. */
function homeAlwaysWinsSeeds(fixtures: readonly CupFixtureDraft[]): number[] {
  return fixtures.map((f) => {
    const advancement = resolveCupWinnerSeed(f, f.homeTeamId);
    return advancement.winnerSeed;
  });
}

describe('generateCupRound1 — bye 4 + 28경기 (D-24 시딩)', () => {
  const round1 = generateCupRound1(SEASON_ID, pools);

  it('bye는 리그1 1~4위(시드 1~4)', () => {
    expect(round1.byeSeeds).toEqual([1, 2, 3, 4]);
  });

  it('정확히 28경기', () => {
    expect(round1.fixtures).toHaveLength(28);
  });

  it('bye 4팀 + 28경기 참가자(56팀) = 전역 시드 1~60이 정확히 한 번씩 등장', () => {
    const seen = new Set<number>(round1.byeSeeds);
    for (const f of round1.fixtures) {
      expect(seen.has(f.homeSeed)).toBe(false);
      expect(seen.has(f.awaySeed)).toBe(false);
      seen.add(f.homeSeed);
      seen.add(f.awaySeed);
    }
    expect(seen.size).toBe(60);
    for (let s = 1; s <= 60; s += 1) expect(seen.has(s)).toBe(true);
  });

  it('1라운드 우선순위 ① — 리그1↔리그3 교차가 먼저 소진된다(시드 5 vs 45)', () => {
    const first = round1.fixtures[0];
    // 리그3(45)가 리그1(5)보다 큰 시드이므로 홈.
    expect(first).toMatchObject({ homeSeed: 45, homeTeamId: teamOfSeed(45), awaySeed: 5, awayTeamId: teamOfSeed(5) });
  });

  it('홈 = 더 큰 시드(하위 티어/낮은 순위) 규칙이 전 경기에 적용된다', () => {
    for (const f of round1.fixtures) {
      expect(f.homeSeed).toBeGreaterThan(f.awaySeed);
      expect(f.isNeutral).toBe(false);
      expect(f.leagueId).toBeNull();
      expect(f.competitionType).toBe('CUP');
      expect(f.round).toBe(1);
      expect(f.stage).toBe('ROUND_1');
    }
  });

  it('동일 티어(리그2) 잔여 16팀은 시드 순 상하위 교차로 8경기가 나온다', () => {
    // 리그2 잔여는 29~44(①에서 리그1 5~20이 리그3 45~60 소진, ②에서 리그1 21~24가 리그2 25~28 소진).
    const sameTierMatches = round1.fixtures.filter((f) => f.awaySeed >= 29 && f.homeSeed <= 44);
    expect(sameTierMatches).toHaveLength(8);
    // 상하위 교차: 29 vs 44가 그 중 하나여야 한다.
    expect(sameTierMatches.some((f) => f.homeSeed === 44 && f.awaySeed === 29)).toBe(true);
  });

  it('pools 크기가 어긋나면 오류', () => {
    expect(() =>
      generateCupRound1(SEASON_ID, { ...pools, league1: pools.league1.slice(1) }),
    ).toThrow(RangeError);
  });

  it('pools에 중복 teamId가 있으면 오류', () => {
    const dup: CupSeedPools = { ...pools, league2: [pools.league1[0], ...pools.league2.slice(1)] };
    expect(() => generateCupRound1(SEASON_ID, dup)).toThrow(RangeError);
  });
});

describe('2라운드 이후 — 시드 기반 무작위 추첨', () => {
  const round1 = generateCupRound1(SEASON_ID, pools);
  const round1Winners = homeAlwaysWinsSeeds(round1.fixtures); // 28명
  const round2Entrants = [...round1.byeSeeds, ...round1Winners]; // 32명

  it('32강은 정확히 16경기, 참가자 32명이 중복 없이 전부 소진된다', () => {
    const round2 = generateCupRoundOf32(SEASON_ID, pools, round2Entrants, SEASON_SEED);
    expect(round2).toHaveLength(16);
    const used = new Set<number>();
    for (const f of round2) {
      expect(used.has(f.homeSeed)).toBe(false);
      expect(used.has(f.awaySeed)).toBe(false);
      used.add(f.homeSeed);
      used.add(f.awaySeed);
      expect(f.homeSeed).toBeGreaterThan(f.awaySeed); // 홈 = 더 큰 시드
      expect(f.round).toBe(2);
      expect(f.roundLabel).toBe('32강');
      expect(f.stage).toBe('ROUND_OF_32');
      expect(f.isNeutral).toBe(false);
    }
    expect(used.size).toBe(32);
  });

  it('같은 참가 구성 + 같은 seasonSeed → 항상 같은 대진(결정론)', () => {
    const a = generateCupRoundOf32(SEASON_ID, pools, round2Entrants, SEASON_SEED);
    const b = generateCupRoundOf32(SEASON_ID, pools, [...round2Entrants].reverse(), SEASON_SEED);
    expect(b).toEqual(a); // 입력 순서와 무관하게 같은 대진(participantsKey가 정렬 후 해시)
  });

  it('seasonSeed가 다르면 대진이 달라질 수 있다', () => {
    const a = generateCupRoundOf32(SEASON_ID, pools, round2Entrants, SEASON_SEED);
    const b = generateCupRoundOf32(SEASON_ID, pools, round2Entrants, SEASON_SEED + 1);
    const pairsOf = (fx: readonly CupFixtureDraft[]) => fx.map((f) => `${f.homeSeed}-${f.awaySeed}`).sort();
    expect(pairsOf(a)).not.toEqual(pairsOf(b));
  });

  it('entrantSeeds 개수가 안 맞으면 오류', () => {
    expect(() => generateCupRoundOf32(SEASON_ID, pools, round2Entrants.slice(1), SEASON_SEED)).toThrow(RangeError);
  });

  it('entrantSeeds에 중복이 있으면 오류', () => {
    // 31개(마지막 1개 누락) + 첫 번째 원소를 한 번 더 → 길이는 32 그대로지만 중복 발생.
    const dup = [...round2Entrants.slice(0, 31), round2Entrants[0]];
    expect(() => generateCupRoundOf32(SEASON_ID, pools, dup, SEASON_SEED)).toThrow(RangeError);
  });
});

describe('전체 6라운드 체인 — 59경기·우승 1팀', () => {
  it('1라운드부터 결승까지 이어가면 총 59경기, 최종 승자는 1명', () => {
    const round1 = generateCupRound1(SEASON_ID, pools);
    const round1Winners = homeAlwaysWinsSeeds(round1.fixtures);
    const round2Entrants = [...round1.byeSeeds, ...round1Winners];

    const round2 = generateCupRoundOf32(SEASON_ID, pools, round2Entrants, SEASON_SEED);
    const round3Entrants = homeAlwaysWinsSeeds(round2);

    const round3 = generateCupRoundOf16(SEASON_ID, pools, round3Entrants, SEASON_SEED);
    const round4Entrants = homeAlwaysWinsSeeds(round3);

    const round4 = generateCupQuarterfinalRound(SEASON_ID, pools, round4Entrants, SEASON_SEED);
    const round5Entrants = homeAlwaysWinsSeeds(round4);

    const round5 = generateCupSemifinalRound(SEASON_ID, pools, round5Entrants, SEASON_SEED);
    const round6Entrants = homeAlwaysWinsSeeds(round5);

    const round6 = generateCupFinalRound(SEASON_ID, pools, round6Entrants, SEASON_SEED);
    expect(round6).toHaveLength(1);
    expect(round6[0].isNeutral).toBe(true);
    expect(round6[0].stage).toBe('FINAL');

    const totalMatches =
      round1.fixtures.length + round2.length + round3.length + round4.length + round5.length + round6.length;
    expect(totalMatches).toBe(59);

    const champion = resolveCupWinnerSeed(round6[0], round6[0].homeTeamId);
    expect(typeof champion.winnerSeed).toBe('number');
  });
});

describe('resolveCupWinnerSeed', () => {
  const round1 = generateCupRound1(SEASON_ID, pools);
  const fixture = round1.fixtures[0];

  it('홈팀 승 → homeSeed 반환', () => {
    expect(resolveCupWinnerSeed(fixture, fixture.homeTeamId)).toEqual({ winnerSeed: fixture.homeSeed });
  });

  it('원정팀 승 → awaySeed 반환', () => {
    expect(resolveCupWinnerSeed(fixture, fixture.awayTeamId)).toEqual({ winnerSeed: fixture.awaySeed });
  });

  it('이 경기 소속이 아닌 teamId면 오류', () => {
    expect(() => resolveCupWinnerSeed(fixture, 'ghost-team' as TeamId)).toThrow(RangeError);
  });
});
