/**
 * valuation.ts 테스트 — Task 029 / 21일차 산출물.
 *
 * 수락 기준("최저 몸값 ≥ 100pt")을 최우선으로 경계값 테스트한다 — 정상 입력뿐 아니라
 * 음수·0·극단값 등 "최악의 입력 조합"에서도 100 미만이 나오지 않는지 직접 고정한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource, setGlobalDefaultSource } from '@/lib/config/loader';
import { calculateMarketValue, type MarketValueInput } from './valuation';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
});

const BASE_TABLE = {
  OVR_DIVISOR: 15,
  OVR_EXP: 2.6,
  POT_STEP: 0.05,
  REP_BASE: 0.8,
  REP_STEP: 0.004,
  FLOOR: 100,
};

function input(overrides: Partial<MarketValueInput> = {}): MarketValueInput {
  return {
    ovr: 18,
    potentialAbility: 20,
    reputation: 50,
    age: 25,
    contractYearsRemaining: 2,
    leagueTier: 1,
    ...overrides,
  };
}

describe('calculateMarketValue — override 테이블 주입 (전역 로더 상태에 의존하지 않음)', () => {
  it('평균적인 선수는 FLOOR보다 큰 정수 몸값을 갖는다', () => {
    const value = calculateMarketValue(input(), { table: BASE_TABLE });
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThan(100);
  });

  it('OVR이 높을수록 몸값이 커진다(단조성)', () => {
    const low = calculateMarketValue(input({ ovr: 10, potentialAbility: 10 }), { table: BASE_TABLE });
    const high = calculateMarketValue(input({ ovr: 25, potentialAbility: 25 }), { table: BASE_TABLE });
    expect(high).toBeGreaterThan(low);
  });

  it('AGE_STEP_PCT/CONTRACT_STEP_PCT/TIER_n_MULT가 테이블에 없으면 중립값(배율 1)으로 취급한다', () => {
    const withoutOptionalKeys = calculateMarketValue(input({ age: 40, contractYearsRemaining: -3, leagueTier: 9 }), {
      table: BASE_TABLE,
    });
    const baseline = calculateMarketValue(input({ age: 25, contractYearsRemaining: 2, leagueTier: 1 }), {
      table: BASE_TABLE,
    });
    expect(withoutOptionalKeys).toBe(baseline);
  });

  it('TIER_n_MULT가 테이블에 있으면 그 배율을 반영한다', () => {
    const table = { ...BASE_TABLE, TIER_3_MULT: 0.5 };
    const tier1 = calculateMarketValue(input({ leagueTier: 1 }), { table });
    const tier3 = calculateMarketValue(input({ leagueTier: 3 }), { table });
    expect(tier3).toBeLessThan(tier1);
  });
});

describe('calculateMarketValue — 하한 보장(수락 기준 "최저 몸값 ≥ 100pt")', () => {
  it.each([
    ['모두 최솟값', input({ ovr: 1, potentialAbility: 1, reputation: 0, age: 40, contractYearsRemaining: 0, leagueTier: 3 })],
    ['OVR 0', input({ ovr: 0, potentialAbility: 0 })],
    ['음수 OVR(잘못된 호출)', input({ ovr: -5, potentialAbility: -5 })],
    ['음수 명성', input({ reputation: -100 })],
    ['음수 잔여 계약', input({ contractYearsRemaining: -10 })],
    ['정의되지 않은 티어', input({ leagueTier: 99 })],
    ['잠재가 OVR보다 낮음', input({ ovr: 20, potentialAbility: 5 })],
  ])('%s 조합에서도 100 이상의 정수다', (_label, playerInput) => {
    const value = calculateMarketValue(playerInput, { table: BASE_TABLE });
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(100);
  });

  it('FLOOR가 100보다 큰 값으로 설정되면 그 값을 하한으로 쓴다', () => {
    const value = calculateMarketValue(input({ ovr: 0, potentialAbility: 0 }), {
      table: { ...BASE_TABLE, FLOOR: 500 },
    });
    expect(value).toBe(500);
  });
});

describe('calculateMarketValue — 기본 경로(설치된 폴백 소스에서 직접 loadConstants)', () => {
  it('override 없이도 하드코딩 폴백 소스로 100 이상의 정수를 반환한다', () => {
    installHardcodedFallback();
    const value = calculateMarketValue(input());
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(100);
  });
});
