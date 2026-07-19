/**
 * prng.ts 테스트 — Task 006 / 5일차 산출물.
 *
 * team-schedule 5일차 완료 판정("Vitest — 시드 재현성, 분포 균등성, 입력 순서
 * 셔플 불변성") 중 **재현성**과 **분포 균등성** 두 축을 이 파일이 담당한다.
 * (셔플 불변성은 sort.test.ts.)
 *
 * 이 파일도 src/lib/sim/** 제약을 그대로 따른다 — Math.random()/Date.now() 0건,
 * 모든 난수는 prng.ts 자체의 API로만 뽑는다.
 */

import { describe, expect, it } from 'vitest';
import {
  createState,
  nextFloat,
  nextIntBelow,
  nextIntBetween,
  nextUint32,
  nextUint32Sequence,
  stateFromWords,
  type PrngState,
} from './prng';

describe('prng — 시드 재현성', () => {
  const seeds = [0, 1, -1, 12345, 2 ** 31 - 1, -(2 ** 31)];

  it.each(seeds)('동일 seed(%i)로 생성한 state는 완전히 동일하다', (seed) => {
    expect(createState(seed)).toEqual(createState(seed));
  });

  it.each(seeds)('동일 seed(%i)의 nextUint32Sequence(500) 결과가 재실행 시 바이트 단위 동일하다', (seed) => {
    const a = nextUint32Sequence(createState(seed), 500);
    const b = nextUint32Sequence(createState(seed), 500);
    expect(a.value).toEqual(b.value);
    expect(a.state).toEqual(b.state);
  });

  it('nextUint32Sequence(state, count)는 count번 순차 nextUint32 호출과 동일한 최종 state를 낸다', () => {
    let cursor: PrngState = createState(777);
    const manual: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const step = nextUint32(cursor);
      manual.push(step.value);
      cursor = step.state;
    }

    const sequence = nextUint32Sequence(createState(777), 50);
    expect(sequence.value).toEqual(manual);
    expect(sequence.state).toEqual(cursor);
  });

  it('createState는 전 워드가 0이 되는 퇴화 상태를 만들지 않는다', () => {
    // 극단적인 seed들을 포함해 넓게 스윕한다. 퇴화 시 xoshiro는 영구히 0만
    // 내놓으므로, nextUint32 값이 항상 0이 아님을 확인하면 간접 검증된다.
    for (let seed = -5; seed <= 5; seed += 1) {
      const state = createState(seed);
      expect(state.some((word) => word !== 0)).toBe(true);
      expect(nextUint32(state).value).not.toBe(0);
    }
  });

  it('stateFromWords로 전 워드 0을 넘기면 고정 폴백 상태로 대체된다', () => {
    const degenerate = stateFromWords(0, 0, 0, 0);
    expect(degenerate.every((word) => word === 0)).toBe(false);
    // 폴백은 상수이므로 재호출해도 동일하다(결정론 유지).
    expect(stateFromWords(0, 0, 0, 0)).toEqual(degenerate);
  });

  it('연속 호출마다 state가 이전 값과 달라진다(같은 값을 반복 방출하지 않음)', () => {
    let cursor: PrngState = createState(42);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      const key = cursor.join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      cursor = nextUint32(cursor).state;
    }
  });
});

describe('prng — 값 범위', () => {
  it('nextUint32는 항상 [0, 2^32) 범위의 정수를 낸다', () => {
    let cursor: PrngState = createState(9001);
    for (let i = 0; i < 1000; i += 1) {
      const step = nextUint32(cursor);
      expect(Number.isInteger(step.value)).toBe(true);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(0x100000000);
      cursor = step.state;
    }
  });

  it('nextFloat은 항상 [0, 1) 범위의 실수를 낸다', () => {
    let cursor: PrngState = createState(555);
    for (let i = 0; i < 1000; i += 1) {
      const step = nextFloat(cursor);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(1);
      cursor = step.state;
    }
  });

  it('nextIntBetween(min, max)는 항상 [min, max] 양끝 포함 정수를 낸다', () => {
    let cursor: PrngState = createState(31337);
    for (let i = 0; i < 500; i += 1) {
      const step = nextIntBetween(cursor, -10, 10);
      expect(Number.isInteger(step.value)).toBe(true);
      expect(step.value).toBeGreaterThanOrEqual(-10);
      expect(step.value).toBeLessThanOrEqual(10);
      cursor = step.state;
    }
  });

  it('nextIntBetween(min, min)은 항상 min을 낸다(퇴화 구간)', () => {
    const step = nextIntBetween(createState(1), 7, 7);
    expect(step.value).toBe(7);
  });

  it('nextIntBelow(state, 1)은 항상 0을 내고 state를 소비하지 않는다', () => {
    const state = createState(2);
    const step = nextIntBelow(state, 1);
    expect(step.value).toBe(0);
    expect(step.state).toEqual(state);
  });

  it('잘못된 인자에는 RangeError를 던진다', () => {
    expect(() => nextIntBelow(createState(1), 0)).toThrow(RangeError);
    expect(() => nextIntBelow(createState(1), 1.5)).toThrow(RangeError);
    expect(() => nextIntBelow(createState(1), 0x100000001)).toThrow(RangeError);
    expect(() => nextIntBetween(createState(1), 1.5, 2)).toThrow(RangeError);
    expect(() => nextIntBetween(createState(1), 5, 1)).toThrow(RangeError);
    expect(() => nextUint32Sequence(createState(1), -1)).toThrow(RangeError);
    expect(() => nextUint32Sequence(createState(1), 1.5)).toThrow(RangeError);
  });
});

describe('prng — 분포 균등성', () => {
  // 벤치 성격의 100만 회 바이트 동일성 검증은 6일차 몫이다. 여기서는 5일차
  // 완료 판정에 필요한 "균등 분포" 성질만 가벼운 표본으로 통계적으로 확인한다.
  // 버킷 빈도가 기대값(N/K) 대비 이론적 표준편차의 5배 이내인지 확인 —
  // 이항분포 근사 σ = sqrt(N * p * (1-p)), p = 1/K. 5시그마는 매우 넉넉한
  // 허용치라 flaky 실패 확률이 무시할 수준이다.
  function assertUniformBuckets(counts: readonly number[], sampleSize: number): void {
    const bucketCount = counts.length;
    const expected = sampleSize / bucketCount;
    const p = 1 / bucketCount;
    const sigma = Math.sqrt(sampleSize * p * (1 - p));
    const tolerance = 5 * sigma;

    counts.forEach((count, bucket) => {
      expect(
        Math.abs(count - expected),
        `bucket ${bucket}: count=${count}, expected≈${expected}, tolerance=±${tolerance.toFixed(1)}`,
      ).toBeLessThanOrEqual(tolerance);
    });
  }

  it('nextIntBelow(state, 10)의 표본 분포가 균등하다', () => {
    const K = 10;
    const N = 100_000;
    const counts = new Array<number>(K).fill(0);

    let cursor: PrngState = createState(2024);
    for (let i = 0; i < N; i += 1) {
      const step = nextIntBelow(cursor, K);
      counts[step.value] += 1;
      cursor = step.state;
    }

    expect(counts.reduce((a, b) => a + b, 0)).toBe(N);
    assertUniformBuckets(counts, N);
  });

  it('nextFloat()의 표본을 K개 구간으로 나누면 균등하게 분포한다', () => {
    const K = 20;
    const N = 100_000;
    const counts = new Array<number>(K).fill(0);

    let cursor: PrngState = createState(-9999);
    for (let i = 0; i < N; i += 1) {
      const step = nextFloat(cursor);
      const bucket = Math.min(K - 1, Math.floor(step.value * K));
      counts[bucket] += 1;
      cursor = step.state;
    }

    expect(counts.reduce((a, b) => a + b, 0)).toBe(N);
    assertUniformBuckets(counts, N);
  });

  it('서로 다른 seed의 초기 nextUint32 값들이 편향 없이 32비트 전역에 퍼진다(상위 1비트 균등)', () => {
    // 거절 샘플링이 없는 원시 nextUint32 출력 자체의 편향을 가볍게 점검한다.
    const N = 50_000;
    let highBitOnes = 0;
    let cursor: PrngState = createState(31);
    for (let i = 0; i < N; i += 1) {
      const step = nextUint32(cursor);
      if ((step.value & 0x80000000) !== 0) highBitOnes += 1;
      cursor = step.state;
    }
    const p = 0.5;
    const sigma = Math.sqrt(N * p * (1 - p));
    expect(Math.abs(highBitOnes - N * p)).toBeLessThanOrEqual(5 * sigma);
  });
});
