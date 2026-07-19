/**
 * 상태 해시 — 정렬 직렬화 + SHA-256
 *
 * Task 006 / 4일차 산출물. NFR-DT-003("동일 `world_seed` → 5시즌 진행 후 전
 * 엔티티 상태 해시 동일")의 검증 도구입니다. 엔진 결과를 비교해야 하는
 * 모든 곳(시드 스냅샷 회귀, 재현성 벤치)은 이 파일의 `hashState()`를
 * 경유해야 값 비교가 아니라 **단일 해시 문자열 비교**로 끝낼 수 있습니다.
 *
 * ## SHA-256 구현 선택 — 순수 TypeScript (외부 의존 0)
 *
 * 이 프로젝트의 런타임 의존성은 `next`/`react`/`react-dom` 3개뿐이고,
 * 신규 의존성 추가는 1팀 소유(`package.json`)라 2팀이 임의로 추가할 수
 * 없습니다. 그래서 표준 해시 API 후보 두 가지를 검토하고 모두 배제했습니다.
 *
 * 1. **`node:crypto` — 배제.** Node 전용 API입니다. 6팀이 33일차에 만드는
 *    Edge Function이 "엔진 코어를 그대로 호출한다"는 H-09 규약을 지키려면
 *    `src/lib/sim/**`은 Node 전용 API에 의존할 수 없습니다(Vercel/Cloudflare
 *    Edge 런타임은 `node:*` 모듈을 지원하지 않거나 부분 폴리필만 제공).
 * 2. **`crypto.subtle`(WebCrypto) — 배제.** Edge·브라우저·최신 Node 어디서나
 *    쓸 수 있는 표준이지만, `subtle.digest()`는 **항상 `Promise`를
 *    반환합니다.** 이 엔진의 나머지 전부(`prng.ts`/`derive.ts`/`precision.ts`)
 *    는 상태를 인자로 받고 값을 즉시 돌려주는 **동기 순수 함수**로 설계되어
 *    있습니다. 상태 해시만 비동기가 되면 "시즌 종료 후 해시를 찍고 다음
 *    시즌으로 넘어간다"같은 순차 파이프라인 전체에 `await`가 침투하거나,
 *    콜백 경계가 생겨 순수 함수 체인이 깨집니다.
 * 3. **순수 TypeScript 직접 구현 — 채택.** 외부 의존 0, **완전 동기**,
 *    Node/Edge/브라우저 어디서나 동일 바이트 연산(32비트 정수 XOR/시프트/
 *    덧셈만 사용)이라 실행 환경이 달라도 동일 입력 → 동일 해시가 보장됩니다.
 *    `prng.ts`가 이미 동일한 논리(32비트 정수 연산만으로 구현해 이식성을
 *    확보)로 xoshiro128**를 자체 구현한 선례가 있어, 이 파일도 같은 패턴을
 *    따릅니다. 표준은 FIPS 180-4(SHA-256)입니다.
 *
 * 트레이드오프: `node:crypto`보다 느립니다(순수 JS 루프). 그러나 상태
 * 해시는 시즌·경기 종료 등 **저빈도 지점**에서만 호출되도록 설계되어
 * 있고(NFR-DT-003 수락 기준 자체가 "5시즌 진행 후" 단위), 틱 단위 핫패스에
 * 들어오지 않습니다. 성능 영향은 없습니다.
 *
 * > 이 파일의 K[64]·H[8] 숫자 리터럴은 전부 **FIPS 180-4 SHA-256 표준이
 * > 정의한 상수**(처음 64개 소수의 세제곱근/8개 소수의 제곱근 소수부)이며,
 * > 공통코드(NFR-CFG-001) 대상인 도메인 밸런싱 상수가 아닙니다. `prng.ts`의
 * > 알고리즘 정의 상수와 동일한 근거로 리터럴 예외입니다.
 *
 * ## 직렬화 규약 — `canonicalize()`
 *
 * 상태 해시는 "같은 논리적 상태 → 같은 문자열"이 성립해야만 의미가
 * 있습니다. `JSON.stringify()`를 직접 쓰지 않는 이유는 **객체 키 순서가
 * 삽입 순서에 의존**하기 때문입니다(같은 값이라도 키를 다른 순서로
 * 만들면 다른 문자열이 됩니다). `canonicalize()`는 다음 규약으로 이
 * 의존성을 제거합니다.
 *
 * - **객체 키 정렬** — `Object.keys()`를 **UTF-16 코드유닛 순**(JS 기본
 *   `Array.prototype.sort()`, 로케일 비의존)으로 정렬한 뒤 직렬화합니다.
 *   `sort.ts`의 문자열 비교 규약과 동일한 근거(로케일 데이터에 의존하지
 *   않는 결정론)를 씁니다.
 * - **배열은 순서를 보존합니다** — 재정렬하지 않습니다. "정렬된 엔티티
 *   직렬화"(NFR-DT-003 문구)의 정렬은 **호출자가 `sort.ts`의
 *   `stableSortBy()`로 미리 수행**해서 넘기는 것을 전제합니다. 이 파일이
 *   배열을 임의로 재정렬하면 어떤 기준으로 정렬했는지가 이 파일에 숨어
 *   버려, tiebreak 키를 명시하는 `sort.ts`의 설계 의도(NFR-DT-008)와
 *   충돌합니다. 즉 **정렬 책임과 해시 책임을 분리**합니다.
 * - **숫자** — `Number.isFinite()`가 거짓이면(`NaN`/`Infinity`) 오류를
 *   던집니다. 그런 값이 상태에 섞여 있다는 것 자체가 엔진 로직 오류이고,
 *   조용히 직렬화하면 해시 불일치의 원인을 숨기게 됩니다. 유한수는
 *   `String(number)`로 표기합니다 — ECMA-262가 `Number::toString`의
 *   결과를 완전히 규정하므로(최단 왕복 표현) 플랫폼 간 결과가 동일하고,
 *   `-0`도 `String(-0) === "0"`이라 부호 없는 0과 자동으로 통일됩니다.
 * - **`undefined`** — 객체 속성 값이 `undefined`이면 그 키 자체를
 *   생략합니다(`JSON.stringify`와 동일 관례). 배열 원소가 `undefined`이면
 *   `null`로 직렬화합니다(자리는 보존해야 하므로 생략할 수 없습니다 —
 *   이 역시 `JSON.stringify`와 동일 관례).
 * - **`null`** — 그대로 유지합니다(`undefined`와 구분됩니다).
 * - **문자열** — `JSON.stringify()`에 위임합니다. 이스케이프 규칙은
 *   ECMA-262 `JSON.stringify` 명세로 완전히 규정되어 있어 재구현할
 *   이유가 없습니다(문자열 값 자체의 이스케이프만 위임하는 것이고,
 *   객체 키 순서 문제와는 무관합니다).
 * - **지원하지 않는 타입**(`bigint`/`function`/`symbol`)은 결정론적
 *   직렬화가 불가능하므로 명시적으로 오류를 던집니다. 조용히 무시하면
 *   상태 손실을 알아챌 수 없습니다.
 *
 * ## 실행 제약
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import
 * 0건. 모듈 스코프 가변 상태 0건(전부 순수 함수). `TextEncoder` 등 런타임
 * 전역에도 의존하지 않습니다 — UTF-8 인코딩을 코드유닛 단위로 직접
 * 구현해 Node/Edge/브라우저 전역 차이에서 완전히 독립적입니다.
 *
 * ## 범위 밖 (후속 일차)
 * SHA-256 테스트 벡터 회귀 + 100만 회 바이트 동일성 벤치(5~6일차).
 */

// ── SHA-256 표준 상수 (FIPS 180-4) ─────────────────────────────────────────

/** 초기 해시값 H0..H7 — 처음 8개 소수 제곱근의 소수부(고정 소수점 32비트). */
const INITIAL_HASH: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/** 라운드 상수 K0..K63 — 처음 64개 소수 세제곱근의 소수부(고정 소수점 32비트). */
const ROUND_CONSTANTS: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** SHA-256이 64바이트(512비트) 청크 단위로 메시지를 처리한다는 블록 크기 정의. */
const BLOCK_BYTES = 64;

// ── 32비트 정수 연산 헬퍼 ───────────────────────────────────────────────────

function toUint32(value: number): number {
  return value >>> 0;
}

/** 32비트 우회전. */
function rotr32(value: number, shift: number): number {
  return ((value >>> shift) | (value << (32 - shift))) >>> 0;
}

// ── UTF-8 인코딩 (전역 TextEncoder 미사용, 코드유닛 직접 변환) ──────────────

/**
 * JS 문자열을 UTF-8 바이트 배열로 변환합니다.
 *
 * `String.prototype.codePointAt()`로 서로게이트 페어를 하나의 코드포인트로
 * 합쳐 처리하므로, BMP 밖 문자(예: 이모지)도 정확히 4바이트로 인코딩됩니다.
 */
function utf8Encode(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) continue;
    if (codePoint > 0xffff) {
      // 서로게이트 페어 2코드유닛을 한 번에 소비했으므로 다음 루프에서 건너뜁니다.
      i += 1;
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

/** 32비트 워드를 8자리 hex로(빅엔디안 바이트 순서). */
function wordToHex(word: number): string {
  return toUint32(word).toString(16).padStart(8, '0');
}

// ── SHA-256 압축 함수 (FIPS 180-4 §6.2) ────────────────────────────────────

function choice(x: number, y: number, z: number): number {
  return (x & y) ^ (~x & z);
}

function majority(x: number, y: number, z: number): number {
  return (x & y) ^ (x & z) ^ (y & z);
}

function bigSigma0(x: number): number {
  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}

function bigSigma1(x: number): number {
  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}

function smallSigma0(x: number): number {
  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
}

function smallSigma1(x: number): number {
  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
}

/**
 * 메시지 바이트 배열을 FIPS 180-4 규격대로 패딩합니다.
 *
 * 1) `0x80` 바이트 하나를 붙이고
 * 2) 길이가 `56 (mod 64)`가 될 때까지 `0x00`을 채운 뒤
 * 3) 원본 길이(비트, 빅엔디안 64비트)를 마지막에 붙입니다.
 */
function padMessage(bytes: readonly number[]): number[] {
  const byteLength = bytes.length;
  const totalBits = byteLength * 8;

  const padded = bytes.slice();
  padded.push(0x80);
  while (padded.length % BLOCK_BYTES !== 56) {
    padded.push(0x00);
  }

  // 64비트 길이를 상위 32비트/하위 32비트로 나눕니다.
  // 이 엔진이 다루는 상태 직렬화 문자열은 2^53 비트에 한참 못 미치므로
  // 부동소수 정밀도 손실 없이 정확히 계산됩니다.
  const highBits = toUint32(Math.floor(totalBits / 0x100000000));
  const lowBits = toUint32(totalBits % 0x100000000);

  for (const word of [highBits, lowBits]) {
    padded.push((word >>> 24) & 0xff, (word >>> 16) & 0xff, (word >>> 8) & 0xff, word & 0xff);
  }

  return padded;
}

/**
 * 바이트 배열의 SHA-256 다이제스트를 계산합니다. 내부 함수이며,
 * 공개 API는 문자열을 받는 `sha256Hex()`입니다.
 */
function sha256Bytes(bytes: readonly number[]): readonly number[] {
  const padded = padMessage(bytes);
  const hash = INITIAL_HASH.slice();
  const w = new Array<number>(64).fill(0);

  for (let chunkStart = 0; chunkStart < padded.length; chunkStart += BLOCK_BYTES) {
    for (let t = 0; t < 16; t += 1) {
      const base = chunkStart + t * 4;
      w[t] = toUint32(
        (padded[base] << 24) | (padded[base + 1] << 16) | (padded[base + 2] << 8) | padded[base + 3],
      );
    }
    for (let t = 16; t < 64; t += 1) {
      w[t] = toUint32(smallSigma1(w[t - 2]) + w[t - 7] + smallSigma0(w[t - 15]) + w[t - 16]);
    }

    let [a, b, c, d, e, f, g, h] = hash;

    for (let t = 0; t < 64; t += 1) {
      const temp1 = toUint32(h + bigSigma1(e) + choice(e, f, g) + ROUND_CONSTANTS[t] + w[t]);
      const temp2 = toUint32(bigSigma0(a) + majority(a, b, c));
      h = g;
      g = f;
      f = e;
      e = toUint32(d + temp1);
      d = c;
      c = b;
      b = a;
      a = toUint32(temp1 + temp2);
    }

    hash[0] = toUint32(hash[0] + a);
    hash[1] = toUint32(hash[1] + b);
    hash[2] = toUint32(hash[2] + c);
    hash[3] = toUint32(hash[3] + d);
    hash[4] = toUint32(hash[4] + e);
    hash[5] = toUint32(hash[5] + f);
    hash[6] = toUint32(hash[6] + g);
    hash[7] = toUint32(hash[7] + h);
  }

  return hash;
}

/**
 * 문자열의 SHA-256 다이제스트를 64자리 소문자 hex로 반환합니다.
 *
 * 입력은 UTF-8로 인코딩됩니다. 순수 함수이며 완전 동기입니다.
 *
 * @example
 * ```ts
 * sha256Hex('abc');
 * // 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
 * ```
 */
export function sha256Hex(input: string): string {
  const bytes = utf8Encode(input);
  const digestWords = sha256Bytes(bytes);
  return digestWords.map(wordToHex).join('');
}

// ── 정렬 직렬화 ──────────────────────────────────────────────────────────

/** `canonicalize()`가 다룰 수 있는 값의 범위. 재귀적으로 이 형태만 허용합니다. */
export type Canonicalizable =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly Canonicalizable[]
  | { readonly [key: string]: Canonicalizable };

function canonicalizeValue(value: Canonicalizable): string {
  if (value === null) return 'null';
  if (value === undefined) return 'null'; // 배열 원소 자리 보존용. 객체 키는 호출부에서 먼저 걸러냅니다.

  const kind = typeof value;

  if (kind === 'boolean') return value ? 'true' : 'false';

  if (kind === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new RangeError(`canonicalize: 유한하지 않은 숫자는 직렬화할 수 없습니다 (받은 값: ${value})`);
    }
    // String(-0) === '0' 이므로 부호 있는 0도 자동으로 통일됩니다.
    return String(value);
  }

  if (kind === 'string') return JSON.stringify(value);

  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalizeValue(item));
    return `[${items.join(',')}]`;
  }

  if (kind === 'object') {
    const record = value as { readonly [key: string]: Canonicalizable };
    // undefined 값을 가진 키는 생략합니다(JSON.stringify와 동일 관례).
    // 정렬은 UTF-16 코드유닛 순 — sort.ts의 문자열 비교 규약과 동일한 근거로
    // 로케일 데이터에 의존하지 않습니다.
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    const parts = keys.map((key) => `${JSON.stringify(key)}:${canonicalizeValue(record[key])}`);
    return `{${parts.join(',')}}`;
  }

  throw new RangeError(`canonicalize: 지원하지 않는 값 타입입니다 (typeof ${kind})`);
}

/**
 * 임의의 값을 키 순서가 결정적인 문자열로 직렬화합니다.
 *
 * **정렬은 배열을 대상으로 하지 않습니다.** 엔티티 목록처럼 순서가 결과에
 * 영향을 주는 배열은 호출자가 `sort.ts`의 `stableSortBy()`로 미리 정렬해서
 * 넘겨야 합니다. 이 함수는 그 배열의 순서를 그대로 보존합니다.
 *
 * @throws `NaN`/`Infinity`, `bigint`/`function`/`symbol` 등 결정론적으로
 *   직렬화할 수 없는 값이 포함되어 있으면 오류.
 */
export function canonicalize(value: Canonicalizable): string {
  return canonicalizeValue(value);
}

/**
 * 상태 값을 정렬 직렬화한 뒤 SHA-256으로 해시합니다(NFR-DT-003).
 *
 * 배열 순서가 의미 있는 데이터(순위표·이벤트 로그 등)는 호출부에서
 * `stableSortBy()`로 먼저 정렬해서 넘기십시오.
 *
 * @example
 * ```ts
 * const digest = hashState({ season: 3, standings: stableSortBy(rows, keys) });
 * // 동일 world_seed로 재실행해도 동일 digest가 나와야 NFR-DT-003 통과.
 * ```
 */
export function hashState(value: Canonicalizable): string {
  return sha256Hex(canonicalize(value));
}
