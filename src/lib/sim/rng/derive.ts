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
 * ## 실행 제약 (1일차 확정, 6일차 D-28로 시드 폭 개정)
 * - 도메인 명칭(`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`)을 **export하지 않습니다.**
 *   전부 원시 `number`로 다루고, 7일차 `brand.ts` 확정 후 import로 교체합니다.
 * - `World.worldSeed`는 **53비트 안전 정수**(`Number.MAX_SAFE_INTEGER`, D-28 / 구 I-32,
 *   3일차 승인·6일차 구현 반영)로 확정되었습니다. 이 파일이 파생 시드 전체의
 *   유일한 소유자이므로 변환 계층 없이 이 폭을 그대로 씁니다.
 * - 도메인 타입(H-01, 8일차) 무의존. `Math.random()`/`Date.now()`/`react`/
 *   `@supabase/*` 사용 0건. **`BigInt`도 사용하지 않습니다** — D-28이 PRNG의
 *   32비트 워드 연산 유지·JSON 직렬화·틱 핫패스 성능을 근거로 `bigint` 도입을
 *   명시적으로 기각했습니다. 대신 32비트 레인 2개(hi/lo)를 각각 `Math.imul`
 *   기반 32비트 연산으로 독립 믹싱한 뒤, 안전 정수 곱셈(`hi * 2**32 + lo` 꼴)
 *   으로만 51비트로 결합합니다. 비트시프트(`<<`/`>>>`)는 32비트를 넘는 값에는
 *   쓸 수 없으므로(피연산자가 ToInt32/ToUint32로 32비트로 잘림), 51비트 폭
 *   경계를 다루는 자리(`stamp`/`namespaceOf`/레인 결합)는 전부 안전 정수
 *   곱셈·나눗셈으로 구현합니다.
 *
 * ## 계층 구조
 * ```
 *   worldSeed (입력, 53비트 안전 정수)
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
 *    해시 결과(payload)는 하위 51비트에만 들어갑니다(`PAYLOAD_SPAN = 2**51`이
 *    정확히 2의 거듭제곱이므로, `namespace * PAYLOAD_SPAN + payload`는
 *    이진수로도 "상위 2비트 = 네임스페이스, 하위 51비트 = payload"와 정확히
 *    일치합니다 — 구현만 비트시프트 대신 안전 정수 곱셈을 씁니다).
 *    → 두 네임스페이스의 시드 **값 집합이 서로소(disjoint)** 입니다.
 *      `namespaceOf(seed)`만 봐도 어느 쪽 시드인지 판별됩니다.
 * 2. 자식 시드는 **부모의 네임스페이스 태그를 그대로 상속**합니다.
 *    → 한번 프리시뮬 네임스페이스로 들어간 스트림은 어떤 깊이에서도
 *      본경기 네임스페이스로 넘어올 수 없습니다.
 * 3. 시드가 다르면 PRNG 초기 상태도 반드시 다릅니다(`createState`가 53비트
 *    시드 전량을 소비하도록 6일차에 개정됨 — `prng.ts` 참조).
 *    → 값 집합이 서로소이므로 **초기 상태 집합도 서로소**입니다.
 *
 * 결론: 35일차 3팀 배당 산출(035)의 수락 기준 "프리시뮬 시드 ≠ 본경기 시드"는
 * 확률이 아니라 **비트 레이아웃으로 보장**됩니다.
 *
 * ## 51비트 payload — 생일 충돌 완화 (D-28 근거)
 * 32비트 시절에는 실효 payload가 30비트뿐이라 시즌당 이벤트 시드 ~6×10⁵
 * 기준으로 생일 충돌이 수백 건 발생했습니다(재현성 영향은 없었으나 통계적
 * 상관이 미세하게 남았습니다). payload를 51비트로 넓히면 생일 한계가
 * 2^25.5 안팎이 되어 이 규모의 충돌이 사실상 소멸합니다. 다만 이 이득은
 * **레인 내부 믹싱 자체가 51비트만큼 넓어야** 성립합니다 — 단순히 32비트
 * 해시 결과를 51비트 자리에 끼워 넣기만 하면 입력 충돌 도메인이 여전히
 * 32비트에 머무릅니다. 그래서 hi/lo 두 레인을 parentSeed·layerTag·indices
 * 전체에 대해 **각각 독립적으로** 처음부터 끝까지 믹싱한 뒤에만 51비트로
 * 결합합니다(레인 결합은 마지막 한 번만).
 *
 * ## 범위 밖 (후속 일차)
 * 고정 정밀도 비교(3일차 `precision.ts`), 안정 정렬·상태 해시(4일차),
 * 테스트·벤치(5~6일차).
 *
 * > 이 파일의 숫자 리터럴은 전부 해시·비트 레이아웃 정의 상수이며,
 * > 공통코드(NFR-CFG-001) 대상 도메인 상수가 아닙니다.
 */

import { createState, type PrngState } from './prng';

/** 네임스페이스 값의 최대 개수(2비트 → 4개)와 무관하게, payload 폭은 51비트로 고정합니다(D-28). */
const PAYLOAD_BITS = 51;
/**
 * payload 슬롯의 폭(2**51). `namespace * PAYLOAD_SPAN + payload`로 시드를
 * 조립·분해합니다 — 32비트를 넘는 폭이라 `<<`/`>>>` 대신 안전 정수 곱셈·
 * 나눗셈을 씁니다(연산자 피연산자가 32비트로 잘리는 문제 회피).
 */
const PAYLOAD_SPAN = 2 ** PAYLOAD_BITS;
/** hi 레인에서 payload에 반영하는 상위 비트 폭(51 − 32 = 19비트). */
const HI_PAYLOAD_BITS = PAYLOAD_BITS - 32;
/** hi 레인 값에서 하위 19비트만 남기는 마스크. hi 레인 자체는 32비트 값이라 안전. */
const HI_PAYLOAD_MASK = (1 << HI_PAYLOAD_BITS) - 1;
/** 32비트 폭(2**32). lo/hi 레인 분리와 결합에 공통으로 쓰는 안전 정수 상수. */
const TWO_POW_32 = 0x100000000;
/**
 * hi 레인만 도는 별도 소금(salt). lo 레인과 완전히 같은 절차를 타면 두 레인이
 * 상관관계를 가지므로, hi 레인의 모든 입력에 이 상수를 XOR해 전개 경로를
 * 갈라놓습니다. 소금 자체는 임의의 홀수 32비트 상수입니다.
 */
const LANE_SALT_HI = 0xc2b2ae3d;

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
  /** 026(35일차) 순위표 7단계 타이브레이커 — 마지막 단계(시드 추첨) 전용. */
  STANDING: 0x53544401,
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

/**
 * 시드가 0 이상 `Number.MAX_SAFE_INTEGER`(2^53−1, D-28) 이하의 안전 정수인지
 * 검증합니다. 이 파일이 조립·상속하는 "시드"(`worldSeed`/`seasonSeed`/
 * `matchSeed`/파생 결과) 전용이며, `matchKey`처럼 32비트 폭을 유지하는
 * 합성 인덱스에는 기존 `assertUint32`를 그대로 씁니다.
 */
function assertSafeSeed(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(
      `${label}: 0 이상 ${Number.MAX_SAFE_INTEGER} 이하의 정수여야 합니다 (받은 값: ${value})`,
    );
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

/**
 * 안전 정수(최대 53비트)를 32비트 lo/hi 두 워드로 정확히 쪼갭니다.
 *
 * 음이 아닌 안전 정수에 대해 `value % 2**32`는 하위 32비트와,
 * `Math.floor(value / 2**32)`는 상위 나머지 비트(최대 21비트,
 * `Number.MAX_SAFE_INTEGER` 기준)와 수학적으로 정확히 일치합니다 — 비트
 * 연산이 아니라 정수 나눗셈·나머지이므로 32비트 한계에 걸리지 않습니다.
 */
function splitWide(value: number): { readonly lo: number; readonly hi: number } {
  return { lo: value % TWO_POW_32, hi: Math.floor(value / TWO_POW_32) };
}

/**
 * hi/lo 두 32비트 레인을 안전 정수 곱셈으로 결합해 51비트 payload를 만듭니다.
 * hi 레인은 하위 19비트만, lo 레인은 32비트 전부를 씁니다(19 + 32 = 51).
 */
function combineLanesToPayload(hi: number, lo: number): number {
  return (hi & HI_PAYLOAD_MASK) * TWO_POW_32 + (lo >>> 0);
}

/** 시드에 네임스페이스 태그를 찍습니다. 상위 2비트 = 태그, 하위 51비트 = payload. */
function stamp(namespace: SeedNamespace, payload: number): number {
  return namespace * PAYLOAD_SPAN + payload;
}

/**
 * 시드가 어느 네임스페이스에 속하는지 판별합니다.
 * 상위 2비트(= `PAYLOAD_SPAN` 몫)만 읽으므로 오분류가 불가능합니다.
 */
export function namespaceOf(seed: number): SeedNamespace {
  assertSafeSeed(seed, 'seed');
  return Math.floor(seed / PAYLOAD_SPAN) as SeedNamespace;
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
 * parentSeed(최대 53비트)·layerTag·indices 전체를 hi/lo 두 레인에서 각각
 * 독립적으로 처음부터 끝까지 믹싱합니다 — 레인 결합(`combineLanesToPayload`)은
 * 맨 마지막에 한 번만 일어납니다("51비트 payload — 생일 충돌 완화" 절 참조).
 * parentSeed는 `splitWide`로 lo/hi를 모두 뽑아 둘 다 초기 믹싱에 넣으므로,
 * 상위 비트가 조용히 버려지는 문제(I-39 근거 B)가 재발하지 않습니다.
 */
function foldLanes(
  seed: number,
  layerTag: number,
  indices: readonly number[],
): { readonly hi: number; readonly lo: number } {
  const { lo: seedLo, hi: seedHi } = splitWide(seed);

  let lo = mix32(mix32(avalanche(seedLo), seedHi), layerTag);
  let hi = mix32(
    mix32(avalanche(seedLo ^ LANE_SALT_HI), seedHi ^ LANE_SALT_HI),
    layerTag ^ LANE_SALT_HI,
  );

  for (const index of indices) {
    lo = mix32(lo, index);
    hi = mix32(hi, index ^ LANE_SALT_HI);
  }

  return { hi, lo };
}

/**
 * 임의 개수의 인덱스를 계층 태그와 함께 부모 시드에 섞어 자식 시드를 만듭니다.
 * 네임스페이스는 **부모에서 상속**합니다.
 */
function derive(parentSeed: number, layerTag: number, indices: readonly number[]): number {
  const namespace = namespaceOf(parentSeed);
  const { hi, lo } = foldLanes(parentSeed, layerTag, indices);
  return stamp(namespace, combineLanesToPayload(hi, lo));
}

/**
 * 1단계 — 월드 시드에서 시즌 시드를 만듭니다.
 *
 * 계층 진입점이므로 네임스페이스를 **여기서 지정**합니다. 이후 단계는 상속만 합니다.
 * 같은 `worldSeed`·`seasonNumber`라도 네임스페이스가 다르면 값 집합이 서로소입니다.
 *
 * @param worldSeed `World.worldSeed` (53비트 안전 정수, D-28)
 * @param seasonNumber 시즌 번호(0 이상 정수)
 * @param namespace 기본 `MAIN`. 배당 프리시뮬은 `ODDS_PRESIM`을 명시
 */
export function deriveSeasonSeed(
  worldSeed: number,
  seasonNumber: number,
  namespace: SeedNamespace = SEED_NAMESPACE.MAIN,
): number {
  assertSafeSeed(worldSeed, 'worldSeed');
  assertIndex(seasonNumber, 'seasonNumber');
  assertNamespaceValue(namespace);

  // 네임스페이스를 해시 입력에도 넣어, 상위 비트뿐 아니라 payload도 갈라지게 합니다.
  const { hi, lo } = foldLanes(worldSeed, LAYER_TAG.SEASON, [seasonNumber, namespace]);
  return stamp(namespace, combineLanesToPayload(hi, lo));
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
  assertSafeSeed(seasonSeed, 'seasonSeed');
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
  assertSafeSeed(matchSeed, 'matchSeed');
  assertIndex(tick, 'tick');
  assertIndex(eventIndex, 'eventIndex');

  return derive(matchSeed, LAYER_TAG.EVENT, [tick, eventIndex]);
}

/**
 * 순위표 타이브레이커 7단계(승점→골득실→다득점→승자승→다승→페어플레이→시드 추첨)의
 * 마지막 단계 전용 — 6단계까지 전부 동률인 팀들만의 결정론적 추첨 시드를 만듭니다
 * (`standing/tiebreak.ts`, 026/35일차 산출물).
 *
 * `matchKey`를 재사용하지 않고 별도 `LAYER_TAG.STANDING`을 둔 이유: `deriveMatchSeed`의
 * `matchKey`는 실제 경기 식별자 도메인이라, 추첨용으로 임의 상수 키를 얹으면 그 상수와
 * 우연히 같은 값을 가진 실제 경기 시드와 값 집합이 섞일 여지가(무시할 수준이라도) 생깁니다.
 * 별도 계층 태그를 두면 이 파일의 "계층 태그가 다르면 같은 인덱스라도 값이 겹치지 않는다"
 * 보장이 그대로 적용되어 그 여지 자체가 구조적으로 사라집니다.
 *
 * @param seasonSeed `deriveSeasonSeed()` 결과
 * @param round 라운드 번호(`Standing.round`) — 라운드가 바뀌면 동률 팀 구성도 바뀌므로
 *   같은 팀 조합이라도 다른 라운드에서는 독립된 추첨이 되어야 합니다.
 * @param tiedGroupKey 동률 그룹을 식별하는 32비트 정수. 호출부는 동률 팀들의 `teamId`를
 *   정렬 후 `hashKey()`로 접어 넘기십시오(입력 배열 순서에 무관하게 같은 그룹은 같은
 *   키가 되도록 하기 위함). 한 라운드에 동률 그룹이 여러 개면 이 키로 서로 다른 스트림이
 *   됩니다.
 */
export function deriveStandingDrawSeed(
  seasonSeed: number,
  round: number,
  tiedGroupKey: number,
): number {
  assertSafeSeed(seasonSeed, 'seasonSeed');
  assertIndex(round, 'round');
  assertUint32(tiedGroupKey, 'tiedGroupKey');

  return derive(seasonSeed, LAYER_TAG.STANDING, [round, tiedGroupKey]);
}

/**
 * 파생 시드를 곧바로 PRNG 상태로 바꿉니다.
 *
 * **이 함수는 `prng.ts`가 아니라 이 파일(`derive.ts`)에 있습니다**(35일차 I-178 —
 * `createState`와 이름이 비슷해 어느 파일 소속인지 혼동된 전례가 있어 명시합니다).
 * `prng.ts`의 `createState()`를 감싸면서 `assertSafeSeed()`로 53비트 안전 정수
 * 범위를 강제하는 상위 래퍼입니다 — 파생 시드(`deriveSeasonSeed` 등 이 파일이 만든
 * 값)는 언제나 이 함수로 상태를 만들고, `createState()`를 직접 호출하지 마십시오.
 *
 * `createState`가 6일차 개정으로 53비트 시드 전 구간을 소비하도록
 * 확장되었으므로(`prng.ts`의 `foldSeed` 참조), 서로 다른 시드는 (해시
 * 충돌이 없는 한) 서로 다른 초기 상태를 만듭니다. 네임스페이스별 시드
 * 값 집합이 서로소이므로, 초기 상태 집합도 실질적으로 서로소입니다.
 */
export function stateForSeed(seed: number): PrngState {
  assertSafeSeed(seed, 'seed');
  return createState(seed);
}
