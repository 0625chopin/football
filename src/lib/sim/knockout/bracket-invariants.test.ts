/**
 * `src/lib/sim/knockout/bracket-invariants.test.ts` — Task 027 / 47일차 산출물.
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 47일차 행 "Vitest — 브래킷 구조 불변식,
 * 연장·승부차기 시드 스냅샷"의 전반부. 수락 기준 "브래킷 구조 불변식 전건 통과".
 *
 * ## 기존 테스트와 다른 지점 — "누가 이기든" 구조가 깨지지 않는가
 * `playoff.test.ts`/`cup.test.ts`는 각 라운드 함수를 **개별로** "경기 수 정확"·"대진
 * 규칙"만 검증하고, `cup.test.ts`의 전체 체인 테스트(160행)도 "홈이 항상 이긴다"는
 * 단일 시나리오 하나로만 59경기를 이어 붙인다. 이 파일은 세 가지를 새로 더한다.
 * 1. **전 라운드 전건** 시드 중복 검사(기존은 1·2라운드만) — 8강·4강·32강 이후 라운드도
 *    포함한다.
 * 2. **탈락 시드 재등장 금지** — 한 번 진 시드가 이후 어느 라운드에도 다시 나타나지
 *    않는다(대진 조합 함수가 이전 라운드 결과를 잘못 흘리는 회귀를 잡는 유일한 층위 —
 *    개별 라운드 함수 단위 테스트로는 발견되지 않는다).
 * 3. **승자 전략 3종 교차**(상위 시드 항상 승, 하위 시드 항상 승=이변, 경기 인덱스
 *    홀짝 교차) — "홈이 항상 이긴다" 한 시나리오에서만 우연히 성립하는 불변식이 아님을
 *    보인다.
 *
 * ## 왜 팀 ID가 아니라 시드로 불변식을 검사하는가
 * `playoff.ts`/`cup.ts` 둘 다 "승자는 시드 번호로 다음 라운드에 주입한다" 계약이므로
 * (각 파일 헤더 "왜 시드 번호인가" 절), 구조 불변식도 시드 공간에서 검사하는 것이
 * 대상 계약과 같은 층위다. `resolveKnockoutWinnerTeamId`/`resolveCupWinnerSeed`(스코어→
 * 팀 ID→시드 환산)의 값 정합은 이미 46일차 `knockout-resolution.test.ts`가 증명했으므로
 * 이 파일은 재검증하지 않는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()` 미사용. 승자 전략은 시드 쌍의 산술 비교(`Math.min`/`max`)와
 * 경기 인덱스 홀짝만으로 결정되는 순수 함수라 난수 경유가 필요 없다.
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
  type PlayoffAdvancement,
} from './playoff';
import {
  generateCupFinalRound,
  generateCupQuarterfinalRound,
  generateCupRound1,
  generateCupRoundOf16,
  generateCupRoundOf32,
  generateCupSemifinalRound,
  type CupFixtureDraft,
  type CupSeedPools,
} from './cup';

const SEASON_ID = 'season-inv' as SeasonId;
const LEAGUE_ID = 'league-inv' as LeagueId;
const CUP_SEASON_SEED = 90210;

function seedTeams(prefix: string, count: number): readonly TeamId[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}` as TeamId);
}

interface SeedPair {
  readonly homeSeed: number;
  readonly awaySeed: number;
}

/** 두 시드 중 어느 쪽이 이겼는지 결정하는 함수. 시드 쌍·경기 인덱스만으로 결정론적. */
type WinnerStrategy = (pair: SeedPair, matchIndex: number) => number;

const STRATEGIES: readonly { readonly label: string; readonly pick: WinnerStrategy }[] = [
  { label: '상위 시드(작은 번호) 항상 승리', pick: ({ homeSeed, awaySeed }) => Math.min(homeSeed, awaySeed) },
  { label: '하위 시드(큰 번호) 항상 승리 — 이변 전용', pick: ({ homeSeed, awaySeed }) => Math.max(homeSeed, awaySeed) },
  {
    label: '경기 인덱스 홀짝 교차 승리',
    pick: ({ homeSeed, awaySeed }, idx) => (idx % 2 === 0 ? Math.min(homeSeed, awaySeed) : Math.max(homeSeed, awaySeed)),
  },
];

/** 한 라운드 안에서 시드가 중복 등장하거나 자기 자신과 맞붙지 않는지 검사한다. */
function assertNoDuplicateSeeds(fixtures: readonly SeedPair[], label: string): void {
  const seen = new Set<number>();
  for (const f of fixtures) {
    expect(seen.has(f.homeSeed), `${label}: 시드 ${f.homeSeed}가 같은 라운드에 중복 등장`).toBe(false);
    expect(seen.has(f.awaySeed), `${label}: 시드 ${f.awaySeed}가 같은 라운드에 중복 등장`).toBe(false);
    expect(f.homeSeed, `${label}: 시드 ${f.homeSeed}가 자기 자신과 맞붙음`).not.toBe(f.awaySeed);
    seen.add(f.homeSeed);
    seen.add(f.awaySeed);
  }
}

/** 이미 탈락 처리된 시드가 이후 라운드 참가자로 다시 나타나지 않는지 검사한다. */
function assertNoEliminatedSeedReappears(
  eliminated: ReadonlySet<number>,
  entrantSeeds: readonly number[],
  label: string,
): void {
  for (const seed of entrantSeeds) {
    expect(eliminated.has(seed), `${label}: 이미 탈락한 시드 ${seed}가 재등장`).toBe(false);
  }
}

function winnerOf(pair: SeedPair, idx: number, pick: WinnerStrategy): PlayoffAdvancement {
  return { winnerSeed: pick(pair, idx) };
}

function loserOf(pair: SeedPair, winnerSeed: number): number {
  return winnerSeed === pair.homeSeed ? pair.awaySeed : pair.homeSeed;
}

describe.each(STRATEGIES)('리그1(10팀) 브래킷 구조 불변식 — $label', ({ pick }) => {
  const seeds = seedTeams('l1', 10);

  it('전 라운드 시드 중복 0건 · 탈락 시드 재등장 0건 · 탈락 9팀 + 우승 1팀 = 10팀', () => {
    const eliminated = new Set<number>();

    const wc = generateLeague1WildcardRound(SEASON_ID, LEAGUE_ID, seeds);
    assertNoDuplicateSeeds(wc, 'WC');
    const wcWinners = wc.map((f, i) => winnerOf(f, i, pick));
    wc.forEach((f, i) => eliminated.add(loserOf(f, wcWinners[i].winnerSeed)));
    expect(eliminated.size).toBe(2);

    const qf = generateLeague1QuarterfinalRound(SEASON_ID, LEAGUE_ID, seeds, wcWinners);
    assertNoDuplicateSeeds(qf, 'QF');
    assertNoEliminatedSeedReappears(eliminated, qf.flatMap((f) => [f.homeSeed, f.awaySeed]), 'QF');
    const qfWinners: readonly [PlayoffAdvancement, PlayoffAdvancement, PlayoffAdvancement, PlayoffAdvancement] = [
      winnerOf(qf[0], 0, pick),
      winnerOf(qf[1], 1, pick),
      winnerOf(qf[2], 2, pick),
      winnerOf(qf[3], 3, pick),
    ];
    qf.forEach((f, i) => eliminated.add(loserOf(f, qfWinners[i].winnerSeed)));
    expect(eliminated.size).toBe(6);

    const sf = generateLeague1SemifinalRound(SEASON_ID, LEAGUE_ID, seeds, qfWinners);
    assertNoDuplicateSeeds(sf, 'SF');
    assertNoEliminatedSeedReappears(eliminated, sf.flatMap((f) => [f.homeSeed, f.awaySeed]), 'SF');
    const sfWinners: readonly [PlayoffAdvancement, PlayoffAdvancement] = [winnerOf(sf[0], 0, pick), winnerOf(sf[1], 1, pick)];
    sf.forEach((f, i) => eliminated.add(loserOf(f, sfWinners[i].winnerSeed)));
    expect(eliminated.size).toBe(8);

    const final = generateLeague1FinalRound(SEASON_ID, LEAGUE_ID, seeds, sfWinners);
    expect(final).toHaveLength(1);
    assertNoEliminatedSeedReappears(eliminated, [final[0].homeSeed, final[0].awaySeed], 'FINAL');
    const championSeed = pick(final[0], 0);
    eliminated.add(loserOf(final[0], championSeed));

    expect(eliminated.size).toBe(9);
    expect(eliminated.has(championSeed)).toBe(false);
    expect(new Set([...eliminated, championSeed]).size).toBe(10);
  });
});

describe.each(STRATEGIES)('리그2(4팀) 브래킷 구조 불변식 — $label', ({ pick }) => {
  const seeds = seedTeams('l2', 4);

  it('탈락 3팀 + 우승 1팀 = 4팀, 탈락 시드 재등장 0건', () => {
    const eliminated = new Set<number>();
    const sf = generateLeague2SemifinalRound(SEASON_ID, LEAGUE_ID, seeds);
    assertNoDuplicateSeeds(sf, 'SF');
    const sfWinners: readonly [PlayoffAdvancement, PlayoffAdvancement] = [winnerOf(sf[0], 0, pick), winnerOf(sf[1], 1, pick)];
    sf.forEach((f, i) => eliminated.add(loserOf(f, sfWinners[i].winnerSeed)));

    const final = generateLeague2FinalRound(SEASON_ID, LEAGUE_ID, seeds, sfWinners);
    expect(final).toHaveLength(1);
    assertNoEliminatedSeedReappears(eliminated, [final[0].homeSeed, final[0].awaySeed], 'FINAL');
    const championSeed = pick(final[0], 0);
    eliminated.add(loserOf(final[0], championSeed));

    expect(eliminated.size).toBe(3);
    expect(new Set([...eliminated, championSeed]).size).toBe(4);
  });
});

describe.each(STRATEGIES)('리그3(2팀) 브래킷 구조 불변식 — $label', ({ pick }) => {
  it('결승 1경기뿐이라도 자기 자신과 맞붙지 않고 우승 1팀이 정확히 갈린다', () => {
    const seeds = seedTeams('l3', 2);
    const final = generateLeague3FinalRound(SEASON_ID, LEAGUE_ID, seeds);
    expect(final).toHaveLength(1);
    assertNoDuplicateSeeds(final, 'FINAL');
    const championSeed = pick(final[0], 0);
    expect(championSeed === final[0].homeSeed || championSeed === final[0].awaySeed).toBe(true);
  });
});

describe.each(STRATEGIES)('컵대회(60팀) 브래킷 구조 불변식 — $label', ({ pick }) => {
  const pools: CupSeedPools = {
    league1: seedTeams('c-l1', 24),
    league2: seedTeams('c-l2', 20),
    league3: seedTeams('c-l3', 16),
  };

  it('전 라운드(1~6) 시드 중복 0건 · 탈락 시드 재등장 0건 · 59경기 · 탈락 59팀 + 우승 1팀 = 60팀', () => {
    const eliminated = new Set<number>();

    function advanceRound(fixtures: readonly CupFixtureDraft[]): number[] {
      return fixtures.map((f, i) => {
        const winnerSeed = pick(f, i);
        eliminated.add(loserOf(f, winnerSeed));
        return winnerSeed;
      });
    }

    const round1 = generateCupRound1(SEASON_ID, pools);
    assertNoDuplicateSeeds(round1.fixtures, 'R1');
    const r1Winners = advanceRound(round1.fixtures);
    const r2Entrants = [...round1.byeSeeds, ...r1Winners];
    expect(new Set(r2Entrants).size).toBe(32);
    expect(eliminated.size).toBe(28);

    const round2 = generateCupRoundOf32(SEASON_ID, pools, r2Entrants, CUP_SEASON_SEED);
    assertNoDuplicateSeeds(round2, 'R32');
    assertNoEliminatedSeedReappears(eliminated, round2.flatMap((f) => [f.homeSeed, f.awaySeed]), 'R32');
    const r2Winners = advanceRound(round2);
    expect(eliminated.size).toBe(44);

    const round3 = generateCupRoundOf16(SEASON_ID, pools, r2Winners, CUP_SEASON_SEED);
    assertNoDuplicateSeeds(round3, 'R16');
    assertNoEliminatedSeedReappears(eliminated, round3.flatMap((f) => [f.homeSeed, f.awaySeed]), 'R16');
    const r3Winners = advanceRound(round3);
    expect(eliminated.size).toBe(52);

    const round4 = generateCupQuarterfinalRound(SEASON_ID, pools, r3Winners, CUP_SEASON_SEED);
    assertNoDuplicateSeeds(round4, 'QF');
    assertNoEliminatedSeedReappears(eliminated, round4.flatMap((f) => [f.homeSeed, f.awaySeed]), 'QF');
    const r4Winners = advanceRound(round4);
    expect(eliminated.size).toBe(56);

    const round5 = generateCupSemifinalRound(SEASON_ID, pools, r4Winners, CUP_SEASON_SEED);
    assertNoDuplicateSeeds(round5, 'SF');
    assertNoEliminatedSeedReappears(eliminated, round5.flatMap((f) => [f.homeSeed, f.awaySeed]), 'SF');
    const r5Winners = advanceRound(round5);
    expect(eliminated.size).toBe(58);

    const round6 = generateCupFinalRound(SEASON_ID, pools, r5Winners, CUP_SEASON_SEED);
    expect(round6).toHaveLength(1);
    assertNoEliminatedSeedReappears(eliminated, [round6[0].homeSeed, round6[0].awaySeed], 'FINAL');
    const championSeed = pick(round6[0], 0);
    eliminated.add(loserOf(round6[0], championSeed));

    expect(eliminated.size).toBe(59);
    expect(new Set([...eliminated, championSeed]).size).toBe(60);

    const totalMatches =
      round1.fixtures.length + round2.length + round3.length + round4.length + round5.length + round6.length;
    expect(totalMatches).toBe(59);
  });
});
