/**
 * 6일차 벤치 — Task 006 수락 기준.
 *
 * team-schedule 6일차 산출물("벤치 결과 로그")과 수락 기준("동일 시드 100만 회
 * 추출이 재실행 시 바이트 단위 동일. 단일 경기 재현 ≤100ms를 가능케 하는
 * 시드 파생 구조")을 검증한다.
 *
 * `performance.now()`는 벤치 측정 목적의 시간 측정이며 시뮬레이션 로직(난수·
 * 확률 판정)에는 전혀 쓰이지 않으므로 NFR-DT-001(`Date.now()` 금지)과 무관하다.
 * 이 파일도 src/lib/sim/** 제약을 그대로 따른다 — Math.random() 0건, 모든
 * 난수는 prng.ts 자체 API로만 뽑는다.
 *
 * **7일차(07-29) 확장** — team-schedule §4 "7~8일차 대기구간" ①: 023이
 * 도메인 타입(H-01, 8일차)을 기다리는 동안, 6일차 100만 회 검증을 1,000만
 * 회로 확장해 재현성이 규모가 커져도 깨지지 않음을 추가로 확인한다. 6일차
 * 원본 테스트는 수정하지 않고 아래에 새 describe만 덧붙인다.
 */

import { describe, expect, it } from 'vitest';
import { createState, nextUint32Sequence } from './prng';

describe('bench — 동일 시드 100만 회 추출 바이트 단위 동일성', () => {
  it('동일 시드로 100만 회를 두 번 뽑으면 값·최종 state가 완전히 동일하다', () => {
    const seed = 20260728;

    const t0 = performance.now();
    const first = nextUint32Sequence(createState(seed), 1_000_000);
    const t1 = performance.now();
    const second = nextUint32Sequence(createState(seed), 1_000_000);
    const t2 = performance.now();

    expect(first.value).toEqual(second.value);
    expect(first.state).toEqual(second.state);

    console.log(
      `[6일차 벤치] 100만 회 추출: 1회차=${(t1 - t0).toFixed(2)}ms, 2회차=${(t2 - t1).toFixed(2)}ms, ` +
        `바이트 단위 동일=${JSON.stringify(first.value) === JSON.stringify(second.value)}`,
    );
  });

  it('53비트 안전 정수 상한 부근 시드로도 100만 회 추출이 바이트 단위 동일하다', () => {
    const seed = Number.MAX_SAFE_INTEGER - 12345;

    const first = nextUint32Sequence(createState(seed), 1_000_000);
    const second = nextUint32Sequence(createState(seed), 1_000_000);

    expect(first.value).toEqual(second.value);
    expect(first.state).toEqual(second.state);
  });
});

describe('bench — 동일 시드 1,000만 회 추출 바이트 단위 동일성 (7일차 확장)', () => {
  // 6일차 100만 회 검증의 10배 규모 확장. 100만 회에서만 성립하고 1,000만
  // 회에서 깨지는 재현성 결함(예: 상태 워드의 암묵적 32비트 랩어라운드
  // 누적 오차)이 없는지 확인한다. 엄격한 ms 상한은 6일차 몫(단일 경기
  // 재현 ≤100ms, 아래 별도 describe)이므로 여기서는 걸지 않고 로그만 남긴다.
  it(
    '동일 시드로 1,000만 회를 두 번 뽑으면 값·최종 state가 완전히 동일하다',
    () => {
      const seed = 20260729;
      const DRAW_COUNT = 10_000_000;

      const t0 = performance.now();
      const first = nextUint32Sequence(createState(seed), DRAW_COUNT);
      const t1 = performance.now();
      const second = nextUint32Sequence(createState(seed), DRAW_COUNT);
      const t2 = performance.now();

      expect(first.value).toHaveLength(DRAW_COUNT);
      expect(first.value).toEqual(second.value);
      expect(first.state).toEqual(second.state);

      console.log(
        `[7일차 벤치 확장] 1,000만 회 추출: 1회차=${(t1 - t0).toFixed(2)}ms, ` +
          `2회차=${(t2 - t1).toFixed(2)}ms, 바이트 단위 동일=${JSON.stringify(first.value) === JSON.stringify(second.value)}`,
      );
    },
    30_000,
  );

  it(
    '53비트 안전 정수 상한 부근 시드로도 1,000만 회 추출이 바이트 단위 동일하다',
    () => {
      const seed = Number.MAX_SAFE_INTEGER - 987654;
      const DRAW_COUNT = 10_000_000;

      const first = nextUint32Sequence(createState(seed), DRAW_COUNT);
      const second = nextUint32Sequence(createState(seed), DRAW_COUNT);

      expect(first.value).toEqual(second.value);
      expect(first.state).toEqual(second.state);
    },
    30_000,
  );
});

describe('bench — 단일 경기 재현 ≤100ms 가능 구조', () => {
  it('경기 1건 분량(수만 회 추출)을 100ms 이내에 뽑을 수 있다', () => {
    // 90~120틱 × 틱당 다중 판정을 넉넉히 상회하는 50,000회로 여유 있게 측정한다.
    const DRAW_COUNT = 50_000;
    const seed = 42;

    const t0 = performance.now();
    const result = nextUint32Sequence(createState(seed), DRAW_COUNT);
    const elapsedMs = performance.now() - t0;

    expect(result.value).toHaveLength(DRAW_COUNT);
    console.log(`[6일차 벤치] 경기 1건 분량(${DRAW_COUNT}회) 추출: ${elapsedMs.toFixed(2)}ms`);

    expect(elapsedMs).toBeLessThan(100);
  });
});
