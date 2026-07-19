/**
 * 결정론적 의사난수 생성기 (PRNG) — xoshiro128**
 *
 * Task 006 / 1일차 산출물. 시뮬레이션 엔진 전 계층의 유일한 난수원입니다.
 *
 * ## 설계 원칙 (NFR-DT-001)
 * - **순수 함수.** 모듈 스코프에 가변 상태가 없습니다. 모든 함수는 상태를
 *   인자로 받아 `{ state, value }` 형태로 **새 상태**를 함께 반환합니다.
 *   호출자가 상태를 명시적으로 이어받아야 하므로, 호출 순서가 곧 재현성입니다.
 * - `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * - 상태는 동결된 readonly 튜플이며, 입력 상태를 절대 변형(mutate)하지 않습니다.
 *
 * ## 알고리즘 선택 근거 — xoshiro128** (vs mulberry32)
 * 1. **상태 공간**: 128비트(주기 2^128−1). mulberry32는 32비트 상태로 주기가
 *    2^32에 불과해, 시즌 단위로 수백만 회를 뽑는 이 엔진에서는 주기 내
 *    반복 구조가 관측될 위험이 있습니다.
 * 2. **통계 품질**: xoshiro128**는 BigCrush/PractRand 통과 이력이 있는
 *    표준 계열입니다. mulberry32는 빠르지만 검증 강도가 낮습니다.
 * 3. **이식성/바이트 동일성**: 연산이 전부 32비트 정수(XOR/shift/rotate/
 *    `Math.imul`)라 부동소수 오차가 개입하지 않습니다. 엔진·Edge Function 등
 *    실행 환경이 달라도 **동일 시드 → 바이트 단위 동일 출력**이 보장됩니다
 *    (6일차 수락 기준: 동일 시드 100만 회 추출 바이트 동일).
 * 4. **시드 계층 파생과의 궁합**: 2일차의 `world → season → match → event`
 *    시드 계층에서 네임스페이스별 독립 스트림이 필요합니다. 128비트 상태는
 *    스트림 분리 여지가 넓어 충돌 위험이 낮습니다.
 *
 * 단점(상태가 4워드라 직렬화 비용이 조금 큼)은 재현성 요구 대비 무시 가능합니다.
 *
 * ## 범위 밖 (후속 일차)
 * - 시드 계층 파생: 2일차 `derive.ts`
 * - 고정 정밀도 확률 비교: 3일차 `precision.ts`
 * - 안정 정렬/상태 해시: 4일차 `sort.ts` / `hash.ts`
 * - 테스트/벤치: 5~6일차
 *
 * > 이 파일의 숫자 리터럴은 전부 **알고리즘 정의 상수**(xoshiro128 star-star 및
 * > SplitMix32 명세값, 32비트 워드 폭)이며, 공통코드(NFR-CFG-001) 대상인 도메인 상수가
 * > 아닙니다. 도메인 값은 3팀의 `loadConstants(group)`로만 취득합니다.
 */

/** 32비트 워드 폭. 회전 연산에서만 사용합니다. */
const WORD_BITS = 32;

/**
 * PRNG 상태. 4개의 부호 없는 32비트 워드로 구성된 불변 튜플입니다.
 *
 * 직렬화/역직렬화가 필요하면 그대로 JSON 배열로 저장할 수 있습니다.
 */
export type PrngState = readonly [number, number, number, number];

/** 상태와 결과값을 함께 돌려주는 반환 형태. 호출자는 반드시 `state`를 이어받습니다. */
export interface PrngResult<T> {
  /** 다음 호출에 사용할 새 상태. 입력 상태는 변경되지 않습니다. */
  readonly state: PrngState;
  /** 이번 추출로 얻은 값. */
  readonly value: T;
}

/** 값을 부호 없는 32비트로 정규화합니다. */
function toUint32(value: number): number {
  return value >>> 0;
}

/** 32비트 좌회전. */
function rotl32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (WORD_BITS - shift))) >>> 0;
}

/**
 * SplitMix32 — 단일 32비트 시드를 서로 상관관계가 낮은 워드들로 흩뿌립니다.
 * xoshiro 계열은 초기 상태가 편향되면 초반 출력 품질이 떨어지므로,
 * 시드 확장에는 별도 믹서를 쓰는 것이 표준 관행입니다.
 */
function splitmix32(counter: number): { counter: number; value: number } {
  const nextCounter = (counter + 0x9e3779b9) | 0;
  let z = nextCounter;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  z = z ^ (z >>> 15);
  return { counter: nextCounter, value: toUint32(z) };
}

/**
 * 안전 정수 시드의 상위/하위 32비트를 분리해 초기 counter로 접습니다.
 *
 * D-28(구 I-39)로 `World.worldSeed`가 53비트 안전 정수로 완화되면서, 기존에
 * `seed | 0`(ToInt32)만 쓰던 방식은 상위 21비트를 조용히 버려
 * `createState(x) === createState(x + 2**32)`가 성립하는 결함이 있었습니다.
 *
 * `seed >>> 0`(ToUint32)은 음이 아닌 안전 정수에 대해 `seed mod 2^32`와
 * 수학적으로 동일해 하위 32비트를 정확히 뽑아내고, `Math.floor(seed / 2**32)`는
 * 나머지 상위 비트(최대 21비트, `Number.MAX_SAFE_INTEGER` 기준)를 뽑아냅니다.
 * 상위 워드는 `splitmix32`로 한 번 아발란치한 뒤 하위 워드와 XOR로 섞어
 * 두 절반 모두가 최종 counter에 반영되게 합니다.
 */
function foldSeed(seed: number): number {
  const lo = seed >>> 0;
  const hi = Math.floor(seed / 0x100000000) >>> 0;
  const hiMixed = splitmix32(hi).value;
  return (lo ^ hiMixed) >>> 0;
}

/**
 * 시드로부터 초기 상태를 만듭니다.
 *
 * 동일 시드는 언제나 동일 상태를 만듭니다(결정론). 전 워드가 0이 되는
 * 퇴화 상태는 xoshiro가 영구히 0만 출력하므로 명시적으로 배제합니다.
 *
 * @param seed 임의의 정수. **53비트 안전 정수 전 구간(D-28,
 *   `Number.MAX_SAFE_INTEGER`까지)을 전량 소비합니다** — 32비트로 절단하지
 *   않습니다. 이 함수는 범용 저수준 프리미티브이므로 값 범위를 강제하지
 *   않습니다(도메인 시드의 범위 검증은 `derive.ts`가 담당).
 */
export function createState(seed: number): PrngState {
  let counter = foldSeed(seed);

  const a = splitmix32(counter);
  counter = a.counter;
  const b = splitmix32(counter);
  counter = b.counter;
  const c = splitmix32(counter);
  counter = c.counter;
  const d = splitmix32(counter);

  const state: PrngState = [a.value, b.value, c.value, d.value];
  const isDegenerate = state.every((word) => word === 0);

  // 퇴화 방지용 고정 폴백. 상수이므로 결정론은 유지됩니다.
  return isDegenerate ? [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x85ebca6b] : state;
}

/**
 * 이미 확보한 4워드로 상태를 복원합니다(직렬화 왕복 / 파생 시드용).
 * 각 워드는 부호 없는 32비트로 정규화되며, 전 워드 0이면 폴백을 적용합니다.
 */
export function stateFromWords(w0: number, w1: number, w2: number, w3: number): PrngState {
  const state: PrngState = [toUint32(w0), toUint32(w1), toUint32(w2), toUint32(w3)];
  return state.every((word) => word === 0)
    ? [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x85ebca6b]
    : state;
}

/**
 * xoshiro128** 한 스텝. 부호 없는 32비트 난수 1개와 다음 상태를 반환합니다.
 *
 * 이 엔진의 **모든** 난수는 최종적으로 이 함수를 경유합니다.
 */
export function nextUint32(state: PrngState): PrngResult<number> {
  const [s0, s1, s2, s3] = state;

  const value = toUint32(Math.imul(rotl32(Math.imul(s1, 5), 7), 9));

  const t = (s1 << 9) >>> 0;
  let n2 = (s2 ^ s0) >>> 0;
  let n3 = (s3 ^ s1) >>> 0;
  const n1 = (s1 ^ n2) >>> 0;
  const n0 = (s0 ^ n3) >>> 0;
  n2 = (n2 ^ t) >>> 0;
  n3 = rotl32(n3, 11);

  return { state: [n0, n1, n2, n3], value };
}

/**
 * `[0, 1)` 구간의 실수 1개.
 *
 * 상위 24비트만 사용해 배정도 부동소수에서 정확히 표현 가능한 값만 만듭니다
 * (분모 2^24). 나눗셈이 항상 2의 거듭제곱이라 플랫폼 간 결과가 동일합니다.
 * 확률 비교의 고정 정밀도 처리는 3일차 `precision.ts`에서 별도로 다룹니다.
 */
export function nextFloat(state: PrngState): PrngResult<number> {
  const step = nextUint32(state);
  return { state: step.state, value: (step.value >>> 8) / 0x1000000 };
}

/**
 * `[0, bound)` 범위의 정수 1개. **거절 샘플링**으로 모듈로 편향을 제거합니다.
 *
 * 거절이 발생해도 소비되는 난수 개수만 늘어날 뿐, 동일 시드에서는 거절 횟수까지
 * 동일하므로 결정론이 유지됩니다.
 *
 * @param bound 1 이상 2^32 이하의 정수(상한 미포함).
 * @throws bound가 유효 범위를 벗어나면 오류.
 */
export function nextIntBelow(state: PrngState, bound: number): PrngResult<number> {
  if (!Number.isInteger(bound) || bound < 1 || bound > 0x100000000) {
    throw new RangeError(`nextIntBelow: bound는 1 이상 2^32 이하의 정수여야 합니다 (받은 값: ${bound})`);
  }
  if (bound === 1) {
    return { state, value: 0 };
  }

  // 균등 분포를 깨는 잉여 구간을 잘라내고, 그 위로 뽑히면 다시 뽑습니다.
  const limit = 0x100000000 - (0x100000000 % bound);

  let cursor = state;
  for (;;) {
    const step = nextUint32(cursor);
    cursor = step.state;
    if (step.value < limit) {
      return { state: cursor, value: step.value % bound };
    }
  }
}

/**
 * `[min, max]` 범위의 정수 1개(양끝 포함).
 *
 * @throws min/max가 정수가 아니거나 min > max이면 오류.
 */
export function nextIntBetween(
  state: PrngState,
  min: number,
  max: number,
): PrngResult<number> {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`nextIntBetween: min/max는 정수여야 합니다 (받은 값: ${min}, ${max})`);
  }
  if (min > max) {
    throw new RangeError(`nextIntBetween: min은 max 이하여야 합니다 (받은 값: ${min} > ${max})`);
  }

  const step = nextIntBelow(state, max - min + 1);
  return { state: step.state, value: min + step.value };
}

/**
 * 난수를 `count`개 연속 추출합니다. 반환 상태는 마지막 추출 이후 상태입니다.
 * (재현성 검증 벤치에서 대량 추출에 사용합니다.)
 *
 * @throws count가 음이 아닌 정수가 아니면 오류.
 */
export function nextUint32Sequence(
  state: PrngState,
  count: number,
): PrngResult<readonly number[]> {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`nextUint32Sequence: count는 0 이상의 정수여야 합니다 (받은 값: ${count})`);
  }

  const values: number[] = [];
  let cursor = state;
  for (let i = 0; i < count; i += 1) {
    const step = nextUint32(cursor);
    cursor = step.state;
    values.push(step.value);
  }
  return { state: cursor, value: values };
}
