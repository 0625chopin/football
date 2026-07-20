import { describe, expect, it } from 'vitest';
import {
  ABILITY_MODIFIER_MAX_DEFAULT,
  ABILITY_MODIFIER_MIN_DEFAULT,
  clampAbilityModifier,
  combineAbilityModifiers,
  conditionModifier,
  familiarityModifier,
  fitnessModifier,
  homeModifier,
  injuryModifier,
  managerModifier,
  positionModifier,
  weatherModifier,
} from './modifiers';

describe('clampAbilityModifier — 클램프 경계 동작 (17일차 수락 기준)', () => {
  it('기본 하한(0.35) 미만 값을 하한으로 클램프한다', () => {
    expect(clampAbilityModifier(0)).toBe(ABILITY_MODIFIER_MIN_DEFAULT);
    expect(clampAbilityModifier(-10)).toBe(ABILITY_MODIFIER_MIN_DEFAULT);
    expect(clampAbilityModifier(0.349_999)).toBe(ABILITY_MODIFIER_MIN_DEFAULT);
  });

  it('기본 상한(1.35) 초과 값을 상한으로 클램프한다', () => {
    expect(clampAbilityModifier(10)).toBe(ABILITY_MODIFIER_MAX_DEFAULT);
    expect(clampAbilityModifier(1.350_001)).toBe(ABILITY_MODIFIER_MAX_DEFAULT);
  });

  it('경계값 자체(0.35, 1.35)는 그대로 통과한다(오프바이원 없음)', () => {
    expect(clampAbilityModifier(ABILITY_MODIFIER_MIN_DEFAULT)).toBe(ABILITY_MODIFIER_MIN_DEFAULT);
    expect(clampAbilityModifier(ABILITY_MODIFIER_MAX_DEFAULT)).toBe(ABILITY_MODIFIER_MAX_DEFAULT);
  });

  it('범위 내 값은 변형 없이 그대로 반환한다', () => {
    expect(clampAbilityModifier(1)).toBe(1);
    expect(clampAbilityModifier(0.7)).toBe(0.7);
  });

  it('options로 클램프 경계를 오버라이드할 수 있다(주입 값 우선, I-83 패턴)', () => {
    expect(clampAbilityModifier(0.5, { min: 0.6 })).toBe(0.6);
    expect(clampAbilityModifier(2, { max: 1.1 })).toBe(1.1);
    expect(clampAbilityModifier(0.9, { min: 0.6, max: 1.1 })).toBe(0.9);
  });

  it('min이 max보다 크면 오류를 던진다', () => {
    expect(() => clampAbilityModifier(1, { min: 1.4, max: 0.4 })).toThrow(RangeError);
  });

  it('유한하지 않은 값이면 오류를 던진다', () => {
    expect(() => clampAbilityModifier(Number.NaN)).toThrow(RangeError);
    expect(() => clampAbilityModifier(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('개별 계수 함수 5종 — 골격 단계 클램프 통과 및 override 배선 (부상·홈·날씨·감독·포지션, 미구현)', () => {
  const cases: Array<{ name: string; call: (opts?: { min?: number; max?: number }) => number }> = [
    { name: 'injuryModifier', call: (opts) => injuryModifier({ severity: 'MODERATE' }, opts) },
    { name: 'homeModifier', call: (opts) => homeModifier({ isHome: true }, opts) },
    {
      name: 'weatherModifier',
      call: (opts) => weatherModifier({ weather: 'HEAVY_RAIN', position: 'ST' }, opts),
    },
    { name: 'managerModifier', call: (opts) => managerModifier({ style: 'HIGH_PRESS' }, opts) },
    { name: 'positionModifier', call: (opts) => positionModifier({ proficiency: 3 }, opts) },
  ];

  it.each(cases)('$name — 기본 옵션이면 중립값(1.0)을 반환한다', ({ call }) => {
    expect(call()).toBe(1.0);
  });

  it.each(cases)('$name — max 오버라이드가 중립값보다 작으면 클램프된다', ({ call }) => {
    expect(call({ max: 0.9 })).toBe(0.9);
  });

  it.each(cases)('$name — min 오버라이드가 중립값보다 크면 클램프된다', ({ call }) => {
    expect(call({ min: 1.2 })).toBe(1.2);
  });
});

describe('conditionModifier — `M = 0.70 + 0.30×(C−1)/9` (18일차 실공식)', () => {
  it('경계값 C=1.0 → 0.70', () => {
    expect(conditionModifier({ condition: 1 })).toBeCloseTo(0.7, 10);
  });

  it('경계값 C=10.0 → 1.00', () => {
    expect(conditionModifier({ condition: 10 })).toBeCloseTo(1.0, 10);
  });

  it('중간값 C=5.5 → 0.85', () => {
    expect(conditionModifier({ condition: 5.5 })).toBeCloseTo(0.85, 10);
  });

  it('클램프 override가 실공식 결과에도 적용된다', () => {
    expect(conditionModifier({ condition: 10 }, { max: 0.9 })).toBe(0.9);
  });
});

describe('fitnessModifier — `M = 0.75 + 0.25×(fitness/100)` (18일차 실공식)', () => {
  it('경계값 fitness=0 → 0.75', () => {
    expect(fitnessModifier({ fitness: 0 })).toBeCloseTo(0.75, 10);
  });

  it('경계값 fitness=100 → 1.00', () => {
    expect(fitnessModifier({ fitness: 100 })).toBeCloseTo(1.0, 10);
  });

  it('중간값 fitness=50 → 0.875', () => {
    expect(fitnessModifier({ fitness: 50 })).toBeCloseTo(0.875, 10);
  });

  it('클램프 override가 실공식 결과에도 적용된다', () => {
    expect(fitnessModifier({ fitness: 100 }, { max: 0.9 })).toBe(0.9);
  });
});

describe('familiarityModifier — `M = min(1.0 + 0.01×familiaritySeasons, 1.06)` (18일차 실공식, 상한 +6%)', () => {
  it('familiaritySeasons=0 → 1.00 (보정 없음)', () => {
    expect(familiarityModifier({ familiaritySeasons: 0 })).toBeCloseTo(1.0, 10);
  });

  it('familiaritySeasons=3 → 1.03', () => {
    expect(familiarityModifier({ familiaritySeasons: 3 })).toBeCloseTo(1.03, 10);
  });

  it('familiaritySeasons=6에서 상한 1.06에 도달한다', () => {
    expect(familiarityModifier({ familiaritySeasons: 6 })).toBeCloseTo(1.06, 10);
  });

  it('familiaritySeasons=6 초과해도 상한 1.06을 넘지 않는다', () => {
    expect(familiarityModifier({ familiaritySeasons: 20 })).toBeCloseTo(1.06, 10);
  });
});

describe('combineAbilityModifiers — 9번째 함수, 계수 체인 합성', () => {
  it('전 계수가 1.0이면 합성 결과도 base(1.0)와 일치한다(24일차 수락 기준의 기반)', () => {
    const allOnes = Array.from({ length: 8 }, () => 1.0);
    expect(combineAbilityModifiers(allOnes)).toBe(1.0);
  });

  it('곱이 상한을 넘으면 상한으로 클램프한다', () => {
    expect(combineAbilityModifiers([1.3, 1.3, 1.3])).toBe(ABILITY_MODIFIER_MAX_DEFAULT);
  });

  it('곱이 하한 아래면 하한으로 클램프한다', () => {
    expect(combineAbilityModifiers([0.1, 0.1, 0.1])).toBe(ABILITY_MODIFIER_MIN_DEFAULT);
  });

  it('빈 배열이면 오류를 던진다', () => {
    expect(() => combineAbilityModifiers([])).toThrow(RangeError);
  });

  it('options 오버라이드가 합성 결과에도 적용된다', () => {
    expect(combineAbilityModifiers([1.2, 1.2], { max: 1.0 })).toBe(1.0);
  });
});
