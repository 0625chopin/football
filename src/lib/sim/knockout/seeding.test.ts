/**
 * seeding.ts 테스트 — Task 027(42일차) 산출물.
 *
 * 수락 기준 "동일 시드 재실행 시 대진 동일"을 값으로 증명한다: 같은 `pools`로
 * `seedCupRound1()`을 여러 번 호출해도 항상 같은 시드 쌍이 나온다(순수 함수 결정론).
 * D-24 우선순위(티어 교차 우선 → 동일 티어만 남으면 시드 순 상하위 교차)와 "동일 리그
 * 대진 허용"도 값으로 검증한다. `cup.ts`가 이 모듈을 그대로 재사용하는지(중복 구현
 * 없음)는 `cup.test.ts`가 계속 통과하는 것으로 교차 검증된다 — `generateCupRound1()`이
 * 내부적으로 `seedCupRound1()`을 호출하도록 42일차에 리팩터링했다.
 */

import { describe, expect, it } from 'vitest';
import type { TeamId } from '@/types';
import {
  CUP_SEED_POOL_SIZE,
  assertCupSeedPools,
  crossPair,
  seedCupRound1,
  teamOfGlobalSeed,
  type CupSeedPools,
} from './seeding';

function seedTeams(prefix: string, count: number): readonly TeamId[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}` as TeamId);
}

const pools: CupSeedPools = {
  league1: seedTeams('l1', 24),
  league2: seedTeams('l2', 20),
  league3: seedTeams('l3', 16),
};

describe('seedCupRound1 — 동일 시드(pools) 재실행 시 대진 동일', () => {
  it('같은 pools로 여러 번 호출해도 항상 같은 결과(byeSeeds·pairs)', () => {
    const a = seedCupRound1(pools);
    const b = seedCupRound1(pools);
    const c = seedCupRound1({
      league1: [...pools.league1],
      league2: [...pools.league2],
      league3: [...pools.league3],
    }); // 새 배열 인스턴스(같은 값)로도 동일해야 한다 — 참조가 아니라 값 결정론
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });

  it('bye는 리그1 1~4위(시드 1~4)', () => {
    expect(seedCupRound1(pools).byeSeeds).toEqual([1, 2, 3, 4]);
  });

  it('정확히 28쌍, 총 56개 시드가 중복 없이 등장(부전승 4 + 56 = 전역 시드 1~60)', () => {
    const { byeSeeds, pairs } = seedCupRound1(pools);
    expect(pairs).toHaveLength(CUP_SEED_POOL_SIZE.ROUND1_MATCH_COUNT);
    const seen = new Set<number>(byeSeeds);
    for (const [x, y] of pairs) {
      expect(seen.has(x)).toBe(false);
      expect(seen.has(y)).toBe(false);
      seen.add(x);
      seen.add(y);
    }
    expect(seen.size).toBe(CUP_SEED_POOL_SIZE.TOTAL);
    for (let s = 1; s <= CUP_SEED_POOL_SIZE.TOTAL; s += 1) expect(seen.has(s)).toBe(true);
  });

  it('D-24 ① — 리그1↔리그3 교차가 먼저 소진된다(시드 5 vs 45가 한 쌍)', () => {
    const { pairs } = seedCupRound1(pools);
    expect(pairs.some(([x, y]) => (x === 5 && y === 45) || (x === 45 && y === 5))).toBe(true);
  });

  it('D-24 ④ — 동일 티어(리그2) 잔여 16팀은 시드 순 상하위 교차 8쌍(동일 리그 대진 허용)', () => {
    const { pairs } = seedCupRound1(pools);
    const sameLeague2Pairs = pairs.filter(([x, y]) => x >= 25 && x <= 44 && y >= 25 && y <= 44);
    expect(sameLeague2Pairs).toHaveLength(8);
    expect(sameLeague2Pairs.some(([x, y]) => (x === 29 && y === 44) || (x === 44 && y === 29))).toBe(true);
  });

  it('pools 크기가 어긋나면 오류', () => {
    expect(() => seedCupRound1({ ...pools, league1: pools.league1.slice(1) })).toThrow(RangeError);
  });

  it('pools에 중복 teamId가 있으면 오류', () => {
    const dup: CupSeedPools = { ...pools, league2: [pools.league1[0], ...pools.league2.slice(1)] };
    expect(() => seedCupRound1(dup)).toThrow(RangeError);
  });
});

describe('crossPair — 재사용 가능한 순수 맞짝짓기', () => {
  it('짧은 쪽 길이만큼 맞짝짓고 남는 뒷부분을 leftover로 돌려준다', () => {
    const result = crossPair([1, 2, 3], [10, 20]);
    expect(result.pairs).toEqual([
      [1, 10],
      [2, 20],
    ]);
    expect(result.leftoverA).toEqual([3]);
    expect(result.leftoverB).toEqual([]);
  });

  it('한쪽이 빈 배열이면 쌍이 0개', () => {
    const result = crossPair([], [1, 2]);
    expect(result.pairs).toEqual([]);
    expect(result.leftoverB).toEqual([1, 2]);
  });
});

describe('teamOfGlobalSeed / assertCupSeedPools', () => {
  it('전역 시드 1·24·25·44·45·60 경계가 올바른 리그로 매핑된다', () => {
    expect(teamOfGlobalSeed(pools, 1, 'test')).toBe(pools.league1[0]);
    expect(teamOfGlobalSeed(pools, 24, 'test')).toBe(pools.league1[23]);
    expect(teamOfGlobalSeed(pools, 25, 'test')).toBe(pools.league2[0]);
    expect(teamOfGlobalSeed(pools, 44, 'test')).toBe(pools.league2[19]);
    expect(teamOfGlobalSeed(pools, 45, 'test')).toBe(pools.league3[0]);
    expect(teamOfGlobalSeed(pools, 60, 'test')).toBe(pools.league3[15]);
  });

  it('범위 밖 시드는 오류', () => {
    expect(() => teamOfGlobalSeed(pools, 0, 'test')).toThrow(RangeError);
    expect(() => teamOfGlobalSeed(pools, 61, 'test')).toThrow(RangeError);
  });

  it('assertCupSeedPools는 정상 pools를 통과시킨다', () => {
    expect(() => assertCupSeedPools(pools, 'test')).not.toThrow();
  });
});
