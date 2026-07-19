/**
 * precision.ts 테스트 — Task 006 / 5일차 산출물.
 *
 * 고정 정밀도(소수 6자리) 확률 비교의 결정론과 경계값을 검증한다(NFR-DT-005).
 * "부동소수 비교 오차 0"이 이 파일의 핵심 수락 기준이다.
 */

import { describe, expect, it } from 'vitest';
import { createState, nextFloat, type PrngState } from './prng';
import {
  PROBABILITY_UNIT_MAX,
  PROBABILITY_UNIT_MIN,
  clampToUnits,
  compareProbability,
  fromUnits,
  normalizeWeights,
  pickWeightedIndex,
  probabilityEquals,
  roundProbability,
  roundToUnits,
  rollSucceeds,
  succeeds,
  succeedsWithUnits,
  toUnits,
} from './precision';

describe('precision — 반올림 경계값(0.5 근방 false-tie)', () => {
  // 파일 주석이 명시한 값들: naive `Math.round(v*1e6)`은 표현 오차로 방향이
  // 뒤집히지만(예: 0.0000035 → 4), 실제 십진 반올림(half-away-from-zero)
  // 결과는 각각 3/5/6/8/10/13이어야 한다(Number.prototype.toFixed(6) 기준,
  // ECMA-262로 완전히 규정되어 플랫폼 독립적).
  const cases: ReadonlyArray<readonly [number, number]> = [
    [0.0000035, 3],
    [0.0000055, 5],
    [0.0000065, 6],
    [0.0000085, 8],
    [0.0000105, 10],
    [0.0000135, 13],
  ];

  it.each(cases)('roundToUnits(%f) === %i (naive round는 오답을 낸다)', (value, expected) => {
    expect(roundToUnits(value)).toBe(expected);
    // naive 경로가 실제로 오답임을 함께 증명해, 이 테스트가 왜 필요한지 드러낸다.
    expect(Math.round(value * 1_000_000)).not.toBe(expected);
  });

  it('half-away-from-zero는 양수·음수 대칭이다', () => {
    expect(roundToUnits(0.0000035)).toBe(3);
    expect(roundToUnits(-0.0000035)).toBe(-3);
  });

  it('명확한(0.5 경계가 아닌) 값은 통상적인 반올림과 일치한다', () => {
    expect(roundToUnits(0.123456)).toBe(123456);
    expect(roundToUnits(0.1234564)).toBe(123456);
    expect(roundToUnits(0.1234567)).toBe(123457);
  });

  it('-0을 만들지 않는다', () => {
    expect(Object.is(roundToUnits(0), -0)).toBe(false);
    expect(Object.is(roundToUnits(-0.0000001), -0)).toBe(false);
  });

  it('roundToUnits/roundProbability는 재현성이 있다(동일 입력 → 동일 출력)', () => {
    for (const [value] of cases) {
      expect(roundToUnits(value)).toBe(roundToUnits(value));
      expect(roundProbability(value)).toBe(roundProbability(value));
    }
  });
});

describe('precision — toUnits/fromUnits/clampToUnits', () => {
  it('toUnits는 [0,1] 범위를 정수 단위로 정규화한다', () => {
    expect(toUnits(0)).toBe(PROBABILITY_UNIT_MIN);
    expect(toUnits(1)).toBe(PROBABILITY_UNIT_MAX);
    expect(toUnits(0.5)).toBe(500_000);
  });

  it('toUnits는 범위를 벗어나면(반올림 후 [0,1] 밖) RangeError를 던진다', () => {
    expect(() => toUnits(-0.0001)).toThrow(RangeError);
    expect(() => toUnits(1.0001)).toThrow(RangeError);
  });

  it('fromUnits는 정수 단위를 실수로 되돌린다(왕복 일관성)', () => {
    expect(fromUnits(toUnits(0.375))).toBeCloseTo(0.375, 6);
    expect(() => fromUnits(1.5)).toThrow(RangeError);
  });

  it('clampToUnits는 범위를 벗어나도 예외 없이 clamp한다', () => {
    expect(clampToUnits(-1)).toBe(PROBABILITY_UNIT_MIN);
    expect(clampToUnits(2)).toBe(PROBABILITY_UNIT_MAX);
    expect(clampToUnits(0.5)).toBe(500_000);
  });
});

describe('precision — 비교 함수의 이행성(transitivity)', () => {
  it('compareProbability는 결정론적 샘플 트리플에서 이행성을 만족한다', () => {
    // 고정 seed로 뽑은 결정론적 샘플 — Math.random 미사용.
    let cursor: PrngState = createState(2026);
    const samples: number[] = [];
    for (let i = 0; i < 300; i += 1) {
      const step = nextFloat(cursor);
      samples.push(step.value);
      cursor = step.state;
    }

    for (let i = 0; i < samples.length - 2; i += 1) {
      const [a, b, c] = [samples[i], samples[i + 1], samples[i + 2]];
      const ab = compareProbability(a, b);
      const bc = compareProbability(b, c);
      const ac = compareProbability(a, c);
      if (ab < 0 && bc < 0) expect(ac).toBeLessThan(0);
      if (ab > 0 && bc > 0) expect(ac).toBeGreaterThan(0);
      if (ab === 0 && bc === 0) expect(ac).toBe(0);
    }
  });

  it('probabilityEquals는 6자리 정밀도에서 동일하면 true다', () => {
    expect(probabilityEquals(0.1 + 0.2, 0.3)).toBe(true);
  });
});

describe('precision — succeeds/rollSucceeds 결정론 및 상한 규약', () => {
  it('동일 (roll, probability)는 항상 동일 판정을 낸다', () => {
    expect(succeeds(0.1, 0.2)).toBe(succeeds(0.1, 0.2));
    expect(succeeds(0.3, 0.2)).toBe(succeeds(0.3, 0.2));
  });

  it('probability=1이면 항상 성공, probability=0이면 항상 실패한다', () => {
    expect(succeedsWithUnits(0, PROBABILITY_UNIT_MAX)).toBe(true);
    expect(succeedsWithUnits(PROBABILITY_UNIT_MAX - 1, PROBABILITY_UNIT_MAX)).toBe(true);
    expect(succeedsWithUnits(0, PROBABILITY_UNIT_MIN)).toBe(false);
  });

  it('rollSucceeds는 동일 state에서 항상 동일 {state, value}를 낸다', () => {
    const state = createState(42);
    const a = rollSucceeds(state, 0.5);
    const b = rollSucceeds(state, 0.5);
    expect(a).toEqual(b);
  });

  it('roll이 음수이면 RangeError를 던진다', () => {
    expect(() => succeeds(-0.1, 0.5)).toThrow(RangeError);
  });
});

describe('precision — normalizeWeights/pickWeightedIndex', () => {
  it('정규화된 가중치의 합은 정확히 1,000,000이다', () => {
    const cases = [
      [1, 1, 1],
      [1, 2, 3, 4],
      [0.1, 0.2, 0.7],
      [7],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    for (const weights of cases) {
      const units = normalizeWeights(weights);
      expect(units.reduce((a, b) => a + b, 0)).toBe(PROBABILITY_UNIT_MAX);
    }
  });

  it('빈 배열/음수/합0에는 RangeError를 던진다', () => {
    expect(() => normalizeWeights([])).toThrow(RangeError);
    expect(() => normalizeWeights([1, -1])).toThrow(RangeError);
    expect(() => normalizeWeights([0, 0])).toThrow(RangeError);
  });

  it('반올림 잔차는 가장 큰 항에 흡수되고, 동률이면 낮은 인덱스가 우선한다', () => {
    // 3등분(1/3씩)은 딱 떨어지지 않아 잔차가 발생한다.
    const units = normalizeWeights([1, 1, 1]);
    const base = Math.floor(PROBABILITY_UNIT_MAX / 3);
    const residual = PROBABILITY_UNIT_MAX - base * 3;
    expect(units[0]).toBe(base + residual); // 동률 시 인덱스 0(가장 낮은 인덱스)이 흡수
    expect(units[1]).toBe(base);
    expect(units[2]).toBe(base);
  });

  it('pickWeightedIndex는 결정론적이며 항상 유효 인덱스를 낸다', () => {
    const units = normalizeWeights([1, 2, 3, 4]);
    const state = createState(2024);
    const a = pickWeightedIndex(state, units);
    const b = pickWeightedIndex(state, units);
    expect(a).toEqual(b);
    expect(a.value).toBeGreaterThanOrEqual(0);
    expect(a.value).toBeLessThan(units.length);
  });

  it('pickWeightedIndex는 빈 배열에 RangeError를 던진다', () => {
    expect(() => pickWeightedIndex(createState(1), [])).toThrow(RangeError);
  });

  it('가중치 선택 분포가 정규화 비율에 근접한다(대량 표본)', () => {
    const units = normalizeWeights([1, 3]); // 25% / 75%
    const N = 60_000;
    const counts = [0, 0];
    let cursor: PrngState = createState(11);
    for (let i = 0; i < N; i += 1) {
      const step = pickWeightedIndex(cursor, units);
      counts[step.value] += 1;
      cursor = step.state;
    }
    const expected0 = N * (units[0] / PROBABILITY_UNIT_MAX);
    const sigma = Math.sqrt(N * (units[0] / PROBABILITY_UNIT_MAX) * (1 - units[0] / PROBABILITY_UNIT_MAX));
    expect(Math.abs(counts[0] - expected0)).toBeLessThanOrEqual(5 * sigma);
  });
});
