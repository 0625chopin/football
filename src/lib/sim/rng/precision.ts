/**
 * 고정 정밀도 확률 비교 — 소수 6자리
 *
 * Task 006 / 3일차 산출물. 엔진의 **모든 확률 비교는 이 파일을 경유**합니다.
 *
 * ## 왜 필요한가 (NFR-DT-005)
 * 부동소수(IEEE-754 배정도)는 십진 소수를 정확히 표현하지 못합니다.
 * 대표적으로 `0.1 + 0.2 === 0.3`은 거짓이고, `0.07 * 3 !== 0.21`입니다.
 * 틱 엔진은 한 경기에서만 수천 번 "난수 < 확률"을 판정하므로, 이런 미세 오차가
 * **한 번이라도** 판정을 뒤집으면 이후 이벤트 시퀀스 전체가 갈라집니다
 * (시드 스냅샷 100경기 전건 일치, NFR-QA-003이 즉시 깨집니다).
 *
 * 해결책은 "오차를 허용하는 비교(epsilon 비교)"가 **아닙니다.** epsilon 비교는
 * 비이행적(a≈b, b≈c인데 a≉c)이라 정렬·누적 분포에서 또 다른 비결정성을 만듭니다.
 * 대신 확률을 **소수 6자리로 반올림한 정수(마이크로 단위)로 정규화**한 뒤,
 * 그 정수끼리 비교합니다. 정수 비교에는 오차가 존재할 수 없으므로
 * **부동소수 비교 오차 0**이 구조적으로 성립합니다.
 *
 * ```
 *   0.1 + 0.2          → 0.30000000000000004 (double)
 *   toUnits(...)       → 300000            (정수)
 *   toUnits(0.3)       → 300000            (정수)
 *   probabilityEquals  → true              ✅
 * ```
 *
 * ## 왜 6자리인가
 * NFR-DT-005가 명시한 값입니다. 백만분율은 (가) 엔진이 다루는 최소 확률
 * (희귀 이벤트 ~1e-5)보다 한 자리 더 촘촘하고, (나) 확률 1.0 전체를
 * `1_000_000` units로 표현해도 `Number.MAX_SAFE_INTEGER`에 한참 못 미쳐
 * 누적합에서 정수 정밀도가 깨지지 않습니다.
 * → 이 값은 **결정론 규약 상수**이지 밸런싱 파라미터가 아니므로 공통코드
 *   (NFR-CFG-001) 대상이 아닙니다. 튜닝 대상이 아니라 바꾸면 전 시즌 스냅샷이
 *   무효화되는 규약값입니다.
 *
 * ## 반올림 규칙 — 결정론과 정확성 모두
 * `Math.round(v * 1e6)`은 그 자체로 결정론적(ECMAScript 명세로 완전히 규정)이지만,
 * `v * 1e6`의 표현 오차 때문에 **경계값에서 부정확**할 수 있습니다.
 * 예: `0.0000035`의 실제 double 값은 `0.0000035`보다 **작으므로** 6자리 반올림 결과는
 * `0.000003`이어야 하지만, `0.0000035 * 1e6`은 정확히 `3.5`가 되어
 * `Math.round`가 `4`를 돌려줍니다(실측 확인: 0.0000035·0.0000055·0.0000065·
 * 0.0000085·0.0000105·0.0000135 … 다수 존재).
 *
 * 그래서 두 경로를 씁니다.
 * 1. **빠른 경로** — `v * SCALE`의 소수부가 0.5에서 충분히 떨어져 있으면
 *    `Math.round`가 **증명적으로** 정확한 결과와 일치합니다.
 *    근거: 확률 `v ∈ [0, 1]`에서 `|fl(v·10⁶) − v·10⁶| ≤ 10⁶ · 2⁻⁵³ ≈ 1.11e-10`.
 *    따라서 소수부가 0.5에서 `TIE_GUARD = 1e-9` 이상 떨어져 있으면
 *    표현 오차가 반올림 방향을 바꿀 수 없습니다.
 * 2. **정확 경로** — 0.5 근방(빠른 경로가 보장되지 않는 극소 구간)에서만
 *    `Number.prototype.toFixed`를 씁니다. `toFixed`는 double의 **정확한 값**을
 *    기준으로 "가장 가까운 십진수, 동점이면 큰 쪽"을 고르도록 ECMA-262에
 *    완전히 규정되어 있어 플랫폼 간 결과가 동일합니다.
 *
 * 결과적으로 반올림은 **round-half-up(양수 기준 올림)** 으로 통일되며,
 * 실행 환경이 달라도 동일 입력 → 동일 정수입니다.
 *
 * ## 실행 제약
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * 모듈 스코프 가변 상태 0건 (전부 순수 함수).
 *
 * ## 범위 밖 (후속 일차)
 * 안정 정렬·상태 해시(4일차 `sort.ts`/`hash.ts`), 테스트·벤치(5~6일차).
 */

import { nextFloat, type PrngResult, type PrngState } from './prng';

/**
 * 고정 정밀도 소수 자릿수. **NFR-DT-005 명시 상수**입니다.
 *
 * 밸런싱 값이 아니라 결정론 규약값이므로 공통코드(NFR-CFG-001) 대상이 아닙니다.
 * 변경 시 기존 시드 스냅샷이 전부 무효가 됩니다(R-03).
 */
export const PROBABILITY_DECIMALS = 6;

/** 확률 1.0에 해당하는 정수 단위 수 (= 10^PROBABILITY_DECIMALS). */
export const PROBABILITY_SCALE = 1_000_000;

/** 확률 0.0의 정수 표현. */
export const PROBABILITY_UNIT_MIN = 0;

/** 확률 1.0의 정수 표현. */
export const PROBABILITY_UNIT_MAX = PROBABILITY_SCALE;

/**
 * 빠른 경로가 정확함을 보장하는 여유폭.
 *
 * `[0,1]` 확률의 스케일 오차 상한 ≈ 1.11e-10보다 한 자리 크게 잡았습니다.
 * 이 폭 밖이면 `Math.round`가 정확 반올림과 반드시 일치합니다.
 */
const TIE_GUARD = 1e-9;

/**
 * 확률의 정수 표현(마이크로 단위, 0 ~ 1,000,000).
 *
 * 이 타입의 값끼리만 비교하십시오. 정수 비교이므로 오차가 발생할 수 없습니다.
 * (1팀 7일차 브랜드 타입이 확정되면 브랜딩으로 교체할 수 있습니다.)
 */
export type ProbabilityUnits = number;

/** 비교 결과. `Array.prototype.sort` 비교자와 부호 규약이 같습니다. */
export type ComparisonResult = -1 | 0 | 1;

/** 유한수인지 확인합니다. */
function assertFinite(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${label}: 유한한 수여야 합니다 (받은 값: ${value})`);
  }
}

/**
 * 임의의 유한 실수를 소수 `PROBABILITY_DECIMALS`자리로 **정확히** 반올림해
 * 정수 단위로 만듭니다.
 *
 * 규칙은 **half-away-from-zero**(0.5는 절댓값이 커지는 쪽)입니다.
 * 부호를 먼저 떼어내고 절댓값만 반올림하므로 빠른 경로와 정확 경로가
 * 항상 같은 규칙을 따르며, 양수·음수가 원점 대칭입니다.
 *
 * 확률 범위 검사는 하지 않습니다. 범위 검사가 필요하면 `toUnits()`를 쓰십시오.
 */
export function roundToUnits(value: number): number {
  assertFinite(value, 'value');

  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  const scaled = magnitude * PROBABILITY_SCALE;
  const floor = Math.floor(scaled);
  const fraction = scaled - floor;

  // 빠른 경로: 0.5 경계에서 충분히 떨어져 있으면 표현 오차가 방향을 바꿀 수 없습니다.
  if (Math.abs(fraction - 0.5) > TIE_GUARD) {
    const rounded = fraction < 0.5 ? floor : floor + 1;
    // `-0`을 만들지 않습니다. `-0`은 값 비교에서는 0과 같지만
    // `Object.is`/스냅샷 직렬화("−0")에서 갈라져 회귀 판정을 오염시킵니다.
    return rounded === 0 ? 0 : sign * rounded;
  }

  // 정확 경로: 0.5 근방에서만 명세로 규정된 십진 반올림을 사용합니다.
  // toFixed는 double의 정확한 값을 기준으로 "가장 가까운 십진수, 동점이면 큰 쪽"을
  // 고르도록 ECMA-262에 규정되어 있어 플랫폼 독립적입니다.
  const exact = Number(magnitude.toFixed(PROBABILITY_DECIMALS));
  // 여기서의 곱은 이미 6자리로 정규화된 값이라 경계 위험이 없습니다.
  const rounded = Math.round(exact * PROBABILITY_SCALE);
  return rounded === 0 ? 0 : sign * rounded;
}

/**
 * 소수 `PROBABILITY_DECIMALS`자리로 반올림한 실수를 돌려줍니다.
 *
 * 로그·표시용입니다. **비교에는 쓰지 마십시오.** 비교는 반드시 정수 단위로 합니다.
 */
export function roundProbability(value: number): number {
  return roundToUnits(value) / PROBABILITY_SCALE;
}

/**
 * 확률 `[0, 1]`을 정수 단위로 정규화합니다.
 *
 * @throws 유한수가 아니거나 반올림 후 `[0, 1]`을 벗어나면 오류.
 */
export function toUnits(probability: number): ProbabilityUnits {
  const units = roundToUnits(probability);
  if (units < PROBABILITY_UNIT_MIN || units > PROBABILITY_UNIT_MAX) {
    throw new RangeError(
      `probability: 0 이상 1 이하여야 합니다 (받은 값: ${probability}, units=${units})`,
    );
  }
  return units;
}

/** 정수 단위를 실수 확률로 되돌립니다(표시·직렬화용). */
export function fromUnits(units: ProbabilityUnits): number {
  if (!Number.isInteger(units)) {
    throw new RangeError(`units: 정수여야 합니다 (받은 값: ${units})`);
  }
  return units / PROBABILITY_SCALE;
}

/**
 * 확률을 `[0, 1]`로 clamp한 뒤 정수 단위로 정규화합니다.
 *
 * 계수 체인(024)에서 곱이 1을 살짝 넘거나 0 아래로 내려가는 경우를
 * 예외 없이 흡수해야 할 때만 사용하십시오. 논리 오류를 감출 수 있으므로
 * 기본은 `toUnits()`(예외)입니다.
 */
export function clampToUnits(probability: number): ProbabilityUnits {
  const units = roundToUnits(probability);
  if (units < PROBABILITY_UNIT_MIN) return PROBABILITY_UNIT_MIN;
  if (units > PROBABILITY_UNIT_MAX) return PROBABILITY_UNIT_MAX;
  return units;
}

/**
 * 두 확률을 고정 정밀도로 비교합니다. **엔진의 유일한 확률 비교 진입점입니다.**
 *
 * 반환: `a < b`이면 -1, 같으면 0, `a > b`이면 1.
 * 정수 비교이므로 이행성(transitivity)이 보장됩니다 — epsilon 비교와 달리
 * 정렬 비교자로 그대로 써도 안전합니다.
 */
export function compareProbability(a: number, b: number): ComparisonResult {
  const ua = roundToUnits(a);
  const ub = roundToUnits(b);
  if (ua < ub) return -1;
  if (ua > ub) return 1;
  return 0;
}

/** 6자리 정밀도에서 같은 확률인가. */
export function probabilityEquals(a: number, b: number): boolean {
  return roundToUnits(a) === roundToUnits(b);
}

/** 6자리 정밀도에서 `a < b`인가. */
export function probabilityLessThan(a: number, b: number): boolean {
  return roundToUnits(a) < roundToUnits(b);
}

/** 6자리 정밀도에서 `a ≤ b`인가. */
export function probabilityAtMost(a: number, b: number): boolean {
  return roundToUnits(a) <= roundToUnits(b);
}

/** 6자리 정밀도에서 `a > b`인가. */
export function probabilityGreaterThan(a: number, b: number): boolean {
  return roundToUnits(a) > roundToUnits(b);
}

/** 6자리 정밀도에서 `a ≥ b`인가. */
export function probabilityAtLeast(a: number, b: number): boolean {
  return roundToUnits(a) >= roundToUnits(b);
}

/**
 * 이미 정규화된 정수 단위끼리의 판정 — 성공 여부.
 *
 * 규약: **`roll < probability`이면 성공**(하한 포함·상한 미포함).
 * 따라서 `probability = 0`은 성공 0건, `probability = 1`은 실패 0건입니다
 * (`rollUnits`의 최대값은 999,999이므로 항상 `< 1,000,000`).
 */
export function succeedsWithUnits(
  rollUnits: ProbabilityUnits,
  probabilityUnits: ProbabilityUnits,
): boolean {
  return rollUnits < probabilityUnits;
}

/**
 * `[0,1)` 난수와 확률을 고정 정밀도로 비교해 판정합니다.
 *
 * 난수를 먼저 뽑아둔 호출부(예: 이벤트 시드 스트림에서 값만 받은 경우)를 위한
 * 형태입니다. 상태를 직접 다루는 경우에는 `rollSucceeds()`를 쓰십시오.
 *
 * @param roll `[0, 1)` 실수 (보통 `nextFloat().value`)
 * @param probability `[0, 1]` 확률
 */
export function succeeds(roll: number, probability: number): boolean {
  const raw = roundToUnits(roll);
  if (raw < PROBABILITY_UNIT_MIN) {
    throw new RangeError(`roll: 0 이상 1 미만이어야 합니다 (받은 값: ${roll})`);
  }
  // roll이 반올림으로 1.0에 닿으면 "확률 1.0인데도 실패"가 생겨 규약이 깨집니다.
  // 상한 미포함 규약을 지키기 위해 마지막 단위(999,999)로 고정합니다.
  const rollUnits = Math.min(raw, PROBABILITY_UNIT_MAX - 1);
  return succeedsWithUnits(rollUnits, toUnits(probability));
}

/**
 * PRNG 상태에서 난수 1개를 뽑아 확률 판정까지 수행합니다.
 *
 * 엔진 호출부의 표준 형태입니다. 상태를 그대로 이어받으십시오.
 *
 * ```ts
 * const shot = rollSucceeds(state, 0.137_5);
 * state = shot.state;
 * if (shot.value) {
 *   // 슛 성공
 * }
 * ```
 */
export function rollSucceeds(
  state: PrngState,
  probability: number,
): PrngResult<boolean> {
  const step = nextFloat(state);
  return { state: step.state, value: succeeds(step.value, probability) };
}

/**
 * 가중치 목록을 고정 정밀도 정수 단위로 정규화합니다(합 = 1,000,000).
 *
 * 이벤트 23종 선택처럼 "여러 후보 중 하나"를 뽑을 때, 부동소수 누적합이
 * 마지막에 0.9999999가 되어 선택이 누락되는 사고를 막습니다.
 * 반올림 잔차는 **마지막 항이 아니라 가장 큰 항**에 흡수시킵니다
 * (최대 잔차 비율이 가장 작아 분포 왜곡이 최소이고, 동률이면 인덱스가
 * 작은 쪽으로 결정론적으로 고정됩니다).
 *
 * @throws 가중치가 비었거나, 음수이거나, 합이 0이면 오류.
 */
export function normalizeWeights(weights: readonly number[]): ProbabilityUnits[] {
  if (weights.length === 0) {
    throw new RangeError('weights: 최소 1개 이상이어야 합니다');
  }

  let total = 0;
  weights.forEach((weight, i) => {
    assertFinite(weight, `weights[${i}]`);
    if (weight < 0) {
      throw new RangeError(`weights[${i}]: 음수일 수 없습니다 (받은 값: ${weight})`);
    }
    total += weight;
  });
  if (total <= 0) {
    throw new RangeError('weights: 합이 0보다 커야 합니다');
  }

  const units = weights.map((weight) => roundToUnits(weight / total));
  const sum = units.reduce((acc, unit) => acc + unit, 0);
  const residual = PROBABILITY_UNIT_MAX - sum;

  if (residual !== 0) {
    let target = 0;
    for (let i = 1; i < units.length; i += 1) {
      if (units[i] > units[target]) target = i;
    }
    units[target] += residual;
  }

  return units;
}

/**
 * 정규화된 가중치에서 하나를 결정론적으로 선택합니다(누적 분포).
 *
 * `normalizeWeights()`의 결과를 그대로 넘기십시오. 누적합이 전부 정수라
 * 마지막 구간이 새는(누락되는) 일이 없습니다.
 *
 * @returns 선택된 인덱스와 다음 상태.
 */
export function pickWeightedIndex(
  state: PrngState,
  normalizedUnits: readonly ProbabilityUnits[],
): PrngResult<number> {
  if (normalizedUnits.length === 0) {
    throw new RangeError('normalizedUnits: 최소 1개 이상이어야 합니다');
  }

  const step = nextFloat(state);
  const rollUnits = Math.min(roundToUnits(step.value), PROBABILITY_UNIT_MAX - 1);

  let cumulative = 0;
  for (let i = 0; i < normalizedUnits.length; i += 1) {
    cumulative += normalizedUnits[i];
    if (rollUnits < cumulative) {
      return { state: step.state, value: i };
    }
  }

  // 누적합이 1,000,000이면 도달할 수 없는 지점입니다.
  // (정규화되지 않은 입력에 대한 방어) 마지막 유효 인덱스로 고정합니다.
  return { state: step.state, value: normalizedUnits.length - 1 };
}
