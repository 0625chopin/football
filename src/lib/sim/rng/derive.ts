/**
 * 시드 계층 파생 — world → season → match → event
 *
 * Task 006 / 2일차 산출물.
 *
 * ## 이 파일이 파생 규칙의 유일한 소유자입니다
 * 시드 파생 규칙은 **오직 여기에만** 존재합니다. 같은 규칙을 타입 계층이나
 * 호출부에서 재구현하면, 시드 스냅샷 회귀(R-03)가 터졌을 때 어느 구현이
 * 바뀌었는지 추적할 수 없게 됩니다. 1팀 7일차 시드 계층 타입(브랜드)은
 * 이 함수들의 시그니처를 **감싸기만** 하며 계산을 복제하지 않습니다(팀장 확정 ②).
 *
 * ## 실행 제약 (1일차 확정)
 * - 도메인 명칭(`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`)을 **export하지 않습니다.**
 *   전부 원시 `number`(부호 없는 32비트)로 다루고, 7일차 `brand.ts` 확정 후
 *   import로 교체합니다.
 * - `World.worldSeed`는 32비트 안전 정수로 확정되었으므로 변환 계층이 없습니다.
 * - 도메인 타입(H-01, 9일차) 무의존. `Math.random()`/`Date.now()`/`react`/
 *   `@supabase/*` 사용 0건.
 *
 * ## 계층 구조
 * ```
 *   worldSeed (입력, 32비트)
 *     └ deriveSeasonSeed(worldSeed, seasonNumber, namespace)
 *         └ deriveMatchSeed(seasonSeed, matchKey)
 *             └ deriveEventSeed(matchSeed, tick, eventIndex)
 * ```
 * 각 단계는 부모 시드 + 계층 태그 + 인덱스를 섞어 자식 시드를 만듭니다.
 * 계층 태그가 다르므로 같은 인덱스를 써도 계층 간 값이 겹치지 않습니다.
 *
 * ## 배당 프리시뮬 독립성 (NFR-DT-006) — 구조적 보장
 * "우연히 안 겹친다"가 아니라 **겹칠 수 없는 구조**입니다.
 *
 * 1. 파생 시드의 **상위 2비트는 네임스페이스 태그**로 예약합니다.
 *    `MAIN = 0b00`, `ODDS_PRESIM = 0b01` (나머지 2개는 예약).
 *    해시 결과는 하위 30비트에만 들어갑니다.
 *    → 두 네임스페이스의 시드 **값 집합이 서로소(disjoint)** 입니다.
 *      `namespaceOf(seed)`만 봐도 어느 쪽 시드인지 판별됩니다.
 * 2. 자식 시드는 **부모의 네임스페이스 태그를 그대로 상속**합니다.
 *    → 한번 프리시뮬 네임스페이스로 들어간 스트림은 어떤 깊이에서도
 *      본경기 네임스페이스로 넘어올 수 없습니다.
 * 3. 시드가 다르면 PRNG 초기 상태도 반드시 다릅니다.
 *    `createState(seed)`의 첫 워드는 `splitmix32(seed + φ)`이고,
 *    splitmix32는 XOR-shift와 홀수 상수 곱만으로 구성된 **32비트 전단사**입니다.
 *    따라서 `seed₁ ≠ seed₂ ⇒ state₁ ≠ state₂`.
 *    → 값 집합이 서로소이므로 **초기 상태 집합도 서로소**입니다.
 *
 * 결론: 35일차 3팀 배당 산출(035)의 수락 기준 "프리시뮬 시드 ≠ 본경기 시드"는
 * 확률이 아니라 **비트 레이아웃으로 보장**됩니다.
 *
 * ## 범위 밖 (후속 일차)
 * 고정 정밀도 비교(3일차 `precision.ts`), 안정 정렬·상태 해시(4일차),
 * 테스트·벤치(5~6일차).
 *
 * > 이 파일의 숫자 리터럴은 전부 해시·비트 레이아웃 정의 상수이며,
 * > 공통코드(NFR-CFG-001) 대상 도메인 상수가 아닙니다.
 */

import { createState, type PrngState } from './prng';

/** 시드 폭(32비트) 중 네임스페이스 태그가 차지하는 상위 비트 수. */
const NAMESPACE_BITS = 2;
/** 해시 결과가 들어가는 하위 비트 수. */
const PAYLOAD_BITS = 32 - NAMESPACE_BITS;
/** 하위 30비트 마스크. */
const PAYLOAD_MASK = (1 << PAYLOAD_BITS) - 1;

/**
 * 시드 네임스페이스. 상위 2비트에 그대로 기록됩니다.
 *
 * `MAIN`(본경기)과 `ODDS_PRESIM`(배당 프리시뮬)은 값 집합이 서로소이므로
 * 어떤 깊이의 파생에서도 충돌할 수 없습니다(NFR-DT-006).
 */
export const SEED_NAMESPACE = {
  /** 본경기·정규 시뮬레이션 스트림. */
  MAIN: 0,
  /** 배당 산출용 프리시뮬레이션 스트림 (3팀 035). */
  ODDS_PRESIM: 1,
  /** 예약 — 용도 확정 전까지 사용 금지. */
  RESERVED_2: 2,
  /** 예약 — 용도 확정 전까지 사용 금지. */
  RESERVED_3: 3,
} as const;

/** 네임스페이스 값(0~3). */
export type SeedNamespace = (typeof SEED_NAMESPACE)[keyof typeof SEED_NAMESPACE];

/**
 * 계층 태그. 같은 인덱스를 다른 계층에서 써도 값이 겹치지 않게 하는 구분자입니다.
 * (네임스페이스와 달리 비트로 예약하지 않고 해시 입력으로 섞습니다.)
 */
const LAYER_TAG = {
  SEASON: 0x5ea50401,
  MATCH: 0x4d415401,
  EVENT: 0x45564e01,
} as const;

/** 부호 없는 32비트로 정규화. */
function toUint32(value: number): number {
  return value >>> 0;
}

/** 32비트 아발란치(splitmix32 finalizer). 입력의 1비트 변화가 출력 전반에 퍼집니다. */
function avalanche(input: number): number {
  let z = input | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  z = z ^ (z >>> 15);
  return toUint32(z);
}

/** 누산기에 값 하나를 섞습니다(hash_combine 계열 + 아발란치). */
function mix32(accumulator: number, value: number): number {
  const combined =
    (accumulator ^ (toUint32(value) + 0x9e3779b9 + (accumulator << 6) + (accumulator >>> 2))) >>> 0;
  return avalanche(combined);
}

function assertUint32(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${label}: 0 이상 2^32 미만의 정수여야 합니다 (받은 값: ${value})`);
  }
}

function assertIndex(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label}: 0 이상의 정수여야 합니다 (받은 값: ${value})`);
  }
}

function assertNamespaceValue(value: number): void {
  if (value !== 0 && value !== 1 && value !== 2 && value !== 3) {
    throw new RangeError(`namespace: SEED_NAMESPACE 값이어야 합니다 (받은 값: ${value})`);
  }
}

/** 시드에 네임스페이스 태그를 찍습니다. 상위 2비트 = 태그, 하위 30비트 = 해시. */
function stamp(namespace: SeedNamespace, payload: number): number {
  return toUint32((namespace << PAYLOAD_BITS) | (payload & PAYLOAD_MASK));
}

/**
 * 시드가 어느 네임스페이스에 속하는지 판별합니다.
 * 상위 2비트를 읽기만 하므로 오분류가 불가능합니다.
 */
export function namespaceOf(seed: number): SeedNamespace {
  assertUint32(seed, 'seed');
  return ((seed >>> PAYLOAD_BITS) & 0b11) as SeedNamespace;
}

/** 두 시드가 같은 네임스페이스인지 확인합니다. */
export function isSameNamespace(seedA: number, seedB: number): boolean {
  return namespaceOf(seedA) === namespaceOf(seedB);
}

/**
 * 시드가 기대한 네임스페이스인지 강제합니다. 호출자(3팀 배당·엔진 본경기)가
 * 잘못된 스트림을 넘겼을 때 조용히 진행되지 않도록 방어합니다.
 */
export function assertNamespace(seed: number, expected: SeedNamespace): void {
  const actual = namespaceOf(seed);
  if (actual !== expected) {
    throw new Error(`시드 네임스페이스 불일치: 기대 ${expected}, 실제 ${actual} (seed=${seed})`);
  }
}

/**
 * 문자열 키를 결정론적으로 32비트로 접습니다(FNV-1a 32).
 *
 * 경기·대회 식별자가 문자열일 때 파생 인덱스로 쓰기 위한 보조 함수입니다.
 * 코드 유닛 단위라 플랫폼 간 결과가 동일합니다.
 */
export function hashKey(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  }
  return toUint32(hash);
}

/**
 * 임의 개수의 인덱스를 계층 태그와 함께 부모 시드에 섞어 자식 시드를 만듭니다.
 * 네임스페이스는 **부모에서 상속**합니다.
 */
function derive(parentSeed: number, layerTag: number, indices: readonly number[]): number {
  const namespace = namespaceOf(parentSeed);
  let accumulator = mix32(avalanche(parentSeed), layerTag);
  for (const index of indices) {
    accumulator = mix32(accumulator, index);
  }
  return stamp(namespace, accumulator);
}

/**
 * 1단계 — 월드 시드에서 시즌 시드를 만듭니다.
 *
 * 계층 진입점이므로 네임스페이스를 **여기서 지정**합니다. 이후 단계는 상속만 합니다.
 * 같은 `worldSeed`·`seasonNumber`라도 네임스페이스가 다르면 값 집합이 서로소입니다.
 *
 * @param worldSeed `World.worldSeed` (32비트 안전 정수)
 * @param seasonNumber 시즌 번호(0 이상 정수)
 * @param namespace 기본 `MAIN`. 배당 프리시뮬은 `ODDS_PRESIM`을 명시
 */
export function deriveSeasonSeed(
  worldSeed: number,
  seasonNumber: number,
  namespace: SeedNamespace = SEED_NAMESPACE.MAIN,
): number {
  assertUint32(worldSeed, 'worldSeed');
  assertIndex(seasonNumber, 'seasonNumber');
  assertNamespaceValue(namespace);

  let accumulator = mix32(avalanche(worldSeed), LAYER_TAG.SEASON);
  accumulator = mix32(accumulator, seasonNumber);
  // 네임스페이스를 해시 입력에도 넣어, 상위 비트뿐 아니라 하위 30비트도 갈라지게 합니다.
  accumulator = mix32(accumulator, namespace);
  return stamp(namespace, accumulator);
}

/**
 * 2단계 — 시즌 시드에서 경기 시드를 만듭니다.
 *
 * 문자열 식별자는 `hashKey()`로 접어서 넘기십시오.
 *
 * @param seasonSeed `deriveSeasonSeed()` 결과
 * @param matchKey 경기 식별 정수(대회·라운드·인덱스를 합성한 값 또는 `hashKey()` 결과)
 * @param extraIndices 필요 시 추가 구분자(예: 재경기 회차)
 */
export function deriveMatchSeed(
  seasonSeed: number,
  matchKey: number,
  ...extraIndices: readonly number[]
): number {
  assertUint32(seasonSeed, 'seasonSeed');
  assertUint32(matchKey, 'matchKey');
  extraIndices.forEach((value, i) => assertIndex(value, `extraIndices[${i}]`));

  return derive(seasonSeed, LAYER_TAG.MATCH, [matchKey, ...extraIndices]);
}

/**
 * 3단계 — 경기 시드에서 이벤트 시드를 만듭니다.
 *
 * 틱과 이벤트 인덱스를 모두 섞으므로, 같은 틱에서 여러 판정을 해도
 * 서로 다른 독립 스트림을 얻습니다.
 *
 * @param matchSeed `deriveMatchSeed()` 결과
 * @param tick 경기 틱(0 이상 정수, 연장 포함)
 * @param eventIndex 같은 틱 내 판정 순번(기본 0)
 */
export function deriveEventSeed(matchSeed: number, tick: number, eventIndex = 0): number {
  assertUint32(matchSeed, 'matchSeed');
  assertIndex(tick, 'tick');
  assertIndex(eventIndex, 'eventIndex');

  return derive(matchSeed, LAYER_TAG.EVENT, [tick, eventIndex]);
}

/**
 * 파생 시드를 곧바로 PRNG 상태로 바꿉니다.
 *
 * `createState`가 32비트 전단사(splitmix32)를 거치므로, 서로 다른 시드는
 * **반드시** 서로 다른 초기 상태를 만듭니다. 따라서 네임스페이스 간
 * 상태 충돌도 구조적으로 불가능합니다.
 */
export function stateForSeed(seed: number): PrngState {
  assertUint32(seed, 'seed');
  return createState(seed);
}
