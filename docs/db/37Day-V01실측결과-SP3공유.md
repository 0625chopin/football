# 37일차 — V-01 실측 결과 (SP-3 공유용)

**작성**: 6팀(DB인프라) · **일차**: 37일차(2026-09-09) · **성격**: SP-3 공유 산출물(V-01 차단성 검증 결과)

## 0. 결론 (先 요약)

**V-01 통과.** Supabase Edge 런타임에서 30경기 처리(2팀 엔진 실코드 이식본, 16일차
`perf-bench.test.ts`와 동일 파라미터)를 **실측**한 결과, 핸들러 동기 실행 구간이
**약 9~13ms**(웜 인보크 기준, 2초 한도 대비 마진 **약 1,990ms / 99.5% 여유**)로
Edge Function CPU 2초 한도에 전혀 근접하지 않는다. **Task 033 착수 가부: 가(可).**

19일차 사전 준비 문서(`docs/db/19Day-V01사전준비-034a체크리스트.md`)와 26~36일차
`dailyWorkLog`의 반복 기재("Task 033 착수 전")를 확인한 결과, **V-01은 오늘 이전까지
실측된 적이 없었다** — 사전 준비(설계)만 있었고 실측 하네스 자체가 존재하지 않았다.
35일차 로그의 "self-consistency 추정치"는 **KPI-4(Brier 스코어, 3팀 소관)**에 대한
것이며 V-01과는 무관한 별개 항목이다(같은 표 행에 병기되어 혼동 소지가 있어 확인 후
분리 기록한다).

## 1. 측정 방법

- **원안대로 실측**: 2팀 엔진 벤치 기준(25일차 수신, `src/lib/sim/match/perf-bench.test.ts`
  16일차 산출물)이 실제로 사용하는 파이프라인 — `buildTickSequence` → `generateMatchEvents`
  → `linkPenaltyOutcomes` → `accumulatePlayerMatchStats` — 을 그대로 이식했다.
  - 의존 그래프(`tick.ts`/`events.ts`/`stats.ts`/`derive.ts`/`prng.ts`/`precision.ts`/`sort.ts`)를
    확인한 결과 전부 `@/types`를 **`import type`(타입 전용)만** 참조하고 있어, 런타임 값
    의존성 없이 하나의 Deno 파일로 이식 가능함을 먼저 확인했다.
  - 파라미터는 `perf-bench.test.ts`와 동일: `occursProbability=0.35`, 23종 `BENCH_WEIGHTS`,
    동일한 참가자/xG 벤치 콜백. 경기당 시드는 `deriveSeasonSeed(20260909, 37)` →
    `deriveMatchSeed(seasonSeed, index)`로 30개 독립 시드를 생성했다(5경기당 1회 연장전 포함,
    16일차 벤치와 동일 비율).
- **배포**: 신규 Edge Function `v01-cpu-bench-37d`(project ref `damruradpliktkrlkakl`)를
  **별도 이름으로만** 배포했다. 기존 리소스(마이그레이션·다른 함수)는 건드리지 않았다.
  이 함수는 Task 033의 실제 `supabase/functions/tick/`과 무관한 **임시 측정용 산출물**이다.
- **측정 지표 2종**:
  1. 핸들러 내부 `performance.now()` 동기 실행 구간(`handlerElapsedMs`) — I/O·await 없는
     순수 CPU 바운드 구간이라 플랫폼 CPU 과금 시간의 근사치.
  2. 플랫폼 게이트웨이가 기록한 `execution_time_ms`(`get_logs(edge-function)`) — 네트워크
     홉·콜드 스타트를 포함한 종단 시간. 두 지표를 함께 봐야 "핸들러 내부 계산"과
     "실제 호출 1건의 총비용" 차이를 놓치지 않는다.

## 2. 실측 결과 (실제 수치 — 추정 아님)

| 호출 | matches | `handlerElapsedMs`(핸들러 동기 구간) | 게이트웨이 `execution_time_ms` |
|---|---|---|---|
| 1회차(콜드) | 30 | 9.53 | **1116**(콜드 스타트 1회성 비용 포함) |
| 2회차(웜) | 30 | 12.74 | 121 |
| 3회차(웜) | 30 | 13.20 | 162 |
| 4회차(웜) | 30 | 9.53 | 111 |
| 스트레스 | 300(10배) | 42.17 | 157 |

- 경기당 p50/p95/p99(30경기 표본, 4회차): **0.15 / 0.95 / 1.95ms**. 300경기로 늘려도
  핸들러 구간 총합이 42ms에 그쳐 선형 확장에도 여유가 크다.
- **2초 한도 대비 마진**: 웜 인보크 기준 `handlerElapsedMs`(최댓값 13.2ms)로도
  **약 1,987ms(99.3%) 여유**. 게이트웨이 종단 시간(최댓값, 콜드 제외 162ms)으로 봐도
  **약 1,838ms(91.9%) 여유**.
- **콜드 스타트 1건(1,116ms)**: 2초 한도 안에는 들어오지만 웜 대비 훨씬 크다. 크론이
  드물게(예: 유휴 후 재기동) 콜드로 걸리면 이 비용이 전체 예산의 절반 이상을 먹을 수
  있다는 뜻 — §4 권고에 반영.

## 3. 이 측정이 대표하지 않는 것 (범위 한계 — 정직하게 명시)

- **DB I/O 없음**: 이 벤치는 순수 인메모리 계산만 측정했다. Task 033의 실제 `tick/`
  Edge Function은 여기에 더해 (a) 잠금 획득, (b) 킥오프 도래 Fixture 조회, (c) 결과
  Supabase 쓰기(경기 결과·이벤트 로그·스탯)를 추가로 수행한다 — 이 I/O 비용은 이번
  실측에 포함되지 않았다.
- **024 계수 체인 미적용**: 실제 확률은 9개 계수 체인(024, 17~24일차)에서 나오며,
  이번 벤치는 16일차 벤치와 동일하게 고정 확률/가중치를 썼다. 계수 체인이 이 순수
  계산 경로보다 유의미하게 느려질 이유는 없어(둘 다 O(틱수) 산술 연산) 여기서 본
  마진을 뒤집을 정도는 아니라고 판단하지만, 확정 판단은 아니다.
- **56필드 전량 미집계**: `accumulatePlayerMatchStats`는 Tier A(16필드)만 집계한다
  (11일차 `stats.ts` 설계 그대로). Tier B는 이 파일 스코프 밖이라 이번 벤치에도 없다 —
  실측 대상(순회·집계 비용)에는 Tier A 폴드 로직이 이미 대표성 있게 포함되어 있다.

**결론**: 순수 시뮬레이션 CPU 비용은 2초 한도의 8~9% 수준에 불과해 압도적으로 통과다.
남은 예산(약 1.8초 이상)은 Task 033이 실제로 추가할 DB I/O·잠금·계수 체인 비용을
흡수하기에 충분히 넉넉하다고 판단한다 — 다만 "I/O 포함 종단 실측"은 032/033 골격이
나온 뒤(40일차 이후) 재확인이 필요하다(§4).

## 4. SP-3 결론 요약 (전 팀 공유용)

- **판정**: **통과(PASS)**. D-04(Edge Function 크론) 결정과 AS-14 가정은 **무효화되지
  않는다.** Task 033(8.5인일) 재설계 불필요.
- **근거 수치**: 웜 인보크 `handlerElapsedMs` 최대 13.2ms, 게이트웨이 종단 최대 162ms
  (콜드 제외) — 모두 2,000ms 한도 대비 90% 이상 여유.
- **Task 033 착수 가부**: **가(可)**. `docs/team-schedule/06-DB인프라팀.md` 행 71의
  "V-01 통과 확인 후 착수" 조건을 충족한다.
- **실패 시 대안 경로(참고용, 이번에는 불필요)**: 외부 크론(GitHub Actions) 전환,
  상주 프로세스 전환(AS-14 무효화), 처리 상한 하향(I-09 기존 30경기 권고 유지).
  이번 실측이 압도적 통과이므로 **현재는 발동 조건 없음.**
- **후속 권고(이슈 후보)**: ① Task 033 골격(40일차) 완성 후 **I/O 포함 종단 시간**으로
  재실측 필요(이번 실측은 순수 CPU만 대상). ② 콜드 스타트(1,116ms) 빈도가 실제 운영
  크론 주기에서 얼마나 발생하는지는 이번 실측 범위 밖 — 40일차 골격에서 함께 확인 권고.

## 5. 산출물

- `docs/db/37Day-V01실측결과-SP3공유.md` (본 문서, 신규)
- Supabase Edge Function `v01-cpu-bench-37d`(project `damruradpliktkrlkakl`) — **임시
  측정용, Task 033 실제 함수와 무관**. 마이그레이션·스키마 변경 없음, 기존 함수
  덮어쓰기 없음.
- **⚠️ 현재 이 슬러그는 `410 Gone`만 반환하는 빈 껍데기(스텁)다.** 무인증 CPU 소모
  벡터(anon/publishable key는 공개값이라 사실상 누구나 호출 가능 + `matches`
  쿼리파라미터 무제한)가 확인되어 측정 직후 계산 로직을 전부 제거하고 무효화했다
  (실제 slug 삭제 수단은 MCP/CLI/토큰 부재로 없었음 — §6 참조). **재실측하려면
  §7의 원본 소스를 다시 배포해야 한다.**

## 6. 배포 후 무효화(neutralize) 처리 — 왜, 어떻게

측정 직후 팀장 검토에서 이 함수의 보안 노출이 지적됐다:

- `verify_jwt: true`로 배포했으나, 이는 "완전 무인증 호출"만 막을 뿐이다.
  publishable/anon key는 애초에 공개 배포용 값이라, 그 키만 있으면 사실상 누구나
  외부에서 이 함수를 호출할 수 있다.
- 핸들러의 `matches` 쿼리파라미터에 **상한이 없어** `?matches=999999` 같은 호출로
  CPU를 반복 소모시키는 비용 증폭 벡터가 될 수 있음을 실제로 확인했다.

**MCP 툴셋에 `delete_edge_function`이 없고, 로컬에 `supabase` CLI 미설치, Management
API용 Personal Access Token도 `.env.local`에 없어(서비스롤 키는 data-plane 전용) 실제
슬러그 삭제를 실행할 수단이 없었다.** 대신 같은 슬러그(`v01-cpu-bench-37d`)에 계산
로직을 전부 제거하고 즉시 `410 Gone`만 반환하는 스텁을 재배포해 CPU 소모 리스크를
해소했다(`?matches=999999`로 재확인, 연산 없이 즉시 410 응답 확인됨). **슬러그 자체는
여전히 프로젝트에 남아 있으며**, 완전 삭제는 Supabase 대시보드(Project Settings >
Edge Functions) 또는 CLI/Management API 토큰 권한이 있는 쪽에서 처리해야 한다(팀장이
사용자 잔여 항목으로 등재 예정).

## 7. 재배포용 원본 소스 (40일차 I/O 포함 재실측 시 그대로 사용)

**재배포 절차**:

1. 아래 코드 전문을 `index.ts` 하나로 `mcp__supabase__deploy_edge_function`에
   `name: "v01-cpu-bench-37d"`(또는 새 슬러그), `entrypoint_path: "index.ts"`,
   `verify_jwt: true`로 배포한다.
2. **40일차 이후 재사용 시 주의**: `matches` 파라미터에 여전히 상한이 없다 — 재배포
   전에 상한(예: 30~300 고정 또는 클램프)을 추가하거나, 배포 직후 §6과 같은 노출이
   재발하지 않도록 호출 즉시 스텁으로 되돌리는 운영 절차를 지킬 것.
3. **호출**: `POST https://damruradpliktkrlkakl.supabase.co/functions/v1/<슬러그>?matches=30`,
   헤더 `Authorization: Bearer <anon/publishable key>`(`mcp__supabase__get_publishable_keys`로
   조회). 응답 JSON의 `v01.handlerElapsedMs`(핸들러 동기 구간)를 1차 지표로, §1에서
   설명한 `mcp__supabase__get_logs(service: "edge-function")`의 `execution_time_ms`
   (게이트웨이 종단 시간, 콜드 스타트 포함)를 2차 지표로 함께 본다.
4. **측정 방법 요약**(§1과 동일): 2팀 엔진(`src/lib/sim/match/{tick,events,stats}.ts` +
   `src/lib/sim/rng/{prng,derive,precision,sort}.ts`)의 런타임 로직을 타입 주석만 제거해
   그대로 이식. 파라미터는 16일차 `perf-bench.test.ts`와 동일(`occursProbability=0.35`,
   23종 `BENCH_WEIGHTS`, 벤치 전용 참가자/xG 콜백). 40일차 이후에는 이 함수에 실제
   Fixture 조회·잠금·결과 쓰기(032/033 골격)를 추가해야 "I/O 포함 종단 실측"이 된다 —
   이 소스는 그 출발점(순수 CPU 부분)이다.

```ts
// V-01 실측 — Edge 런타임에서 30경기 처리 시간 측정 (37일차, 6팀 DB인프라)
// 2팀 엔진(src/lib/sim/{rng,match}/*)의 실제 런타임 로직을 타입 주석만 제거한 채
// 그대로 이식한 벤치 하네스입니다. 알고리즘은 perf-bench.test.ts(16일차)와 동일한
// 파라미터(occursProbability=0.35, BENCH_WEIGHTS, 참가자 배정기)를 씁니다.
// 임시 측정용 배포이며 Task 033의 실제 supabase/functions/tick/과 무관합니다.

// ---------------------------------------------------------------------------
// rng/prng.ts 이식 (xoshiro128**)
// ---------------------------------------------------------------------------
const WORD_BITS = 32;

function toUint32(value) {
  return value >>> 0;
}

function rotl32(value, shift) {
  return ((value << shift) | (value >>> (WORD_BITS - shift))) >>> 0;
}

function splitmix32(counter) {
  const nextCounter = (counter + 0x9e3779b9) | 0;
  let z = nextCounter;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  z = z ^ (z >>> 15);
  return { counter: nextCounter, value: toUint32(z) };
}

function foldSeed(seed) {
  const lo = seed >>> 0;
  const hi = Math.floor(seed / 0x100000000) >>> 0;
  const hiMixed = splitmix32(hi).value;
  return (lo ^ hiMixed) >>> 0;
}

function createState(seed) {
  let counter = foldSeed(seed);

  const a = splitmix32(counter);
  counter = a.counter;
  const b = splitmix32(counter);
  counter = b.counter;
  const c = splitmix32(counter);
  counter = c.counter;
  const d = splitmix32(counter);

  const state = [a.value, b.value, c.value, d.value];
  const isDegenerate = state.every((word) => word === 0);

  return isDegenerate ? [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x85ebca6b] : state;
}

function nextUint32(state) {
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

function nextFloat(state) {
  const step = nextUint32(state);
  return { state: step.state, value: (step.value >>> 8) / 0x1000000 };
}

function nextIntBelow(state, bound) {
  if (!Number.isInteger(bound) || bound < 1 || bound > 0x100000000) {
    throw new RangeError(`nextIntBelow: bound는 1 이상 2^32 이하의 정수여야 합니다 (받은 값: ${bound})`);
  }
  if (bound === 1) {
    return { state, value: 0 };
  }

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

function nextIntBetween(state, min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new RangeError(`nextIntBetween: min/max는 정수여야 합니다 (받은 값: ${min}, ${max})`);
  }
  if (min > max) {
    throw new RangeError(`nextIntBetween: min은 max 이하여야 합니다 (받은 값: ${min} > ${max})`);
  }

  const step = nextIntBelow(state, max - min + 1);
  return { state: step.state, value: min + step.value };
}

// ---------------------------------------------------------------------------
// rng/derive.ts 이식
// ---------------------------------------------------------------------------
const PAYLOAD_BITS = 51;
const PAYLOAD_SPAN = 2 ** PAYLOAD_BITS;
const HI_PAYLOAD_BITS = PAYLOAD_BITS - 32;
const HI_PAYLOAD_MASK = (1 << HI_PAYLOAD_BITS) - 1;
const TWO_POW_32 = 0x100000000;
const LANE_SALT_HI = 0xc2b2ae3d;

const SEED_NAMESPACE = { MAIN: 0, ODDS_PRESIM: 1, RESERVED_2: 2, RESERVED_3: 3 };

const LAYER_TAG = {
  SEASON: 0x5ea50401,
  MATCH: 0x4d415401,
  EVENT: 0x45564e01,
  STANDING: 0x53544401,
};

function avalanche(input) {
  let z = input | 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
  z = z ^ (z >>> 15);
  return toUint32(z);
}

function mix32(accumulator, value) {
  const combined =
    (accumulator ^ (toUint32(value) + 0x9e3779b9 + (accumulator << 6) + (accumulator >>> 2))) >>> 0;
  return avalanche(combined);
}

function assertSafeSeed(value, label) {
  if (!Number.isInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`${label}: 0 이상 ${Number.MAX_SAFE_INTEGER} 이하의 정수여야 합니다 (받은 값: ${value})`);
  }
}

function assertIndex(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label}: 0 이상의 정수여야 합니다 (받은 값: ${value})`);
  }
}

function splitWide(value) {
  return { lo: value % TWO_POW_32, hi: Math.floor(value / TWO_POW_32) };
}

function combineLanesToPayload(hi, lo) {
  return (hi & HI_PAYLOAD_MASK) * TWO_POW_32 + (lo >>> 0);
}

function stamp(namespace, payload) {
  return namespace * PAYLOAD_SPAN + payload;
}

function namespaceOf(seed) {
  assertSafeSeed(seed, 'seed');
  return Math.floor(seed / PAYLOAD_SPAN);
}

function foldLanes(seed, layerTag, indices) {
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

function derive(parentSeed, layerTag, indices) {
  const namespace = namespaceOf(parentSeed);
  const { hi, lo } = foldLanes(parentSeed, layerTag, indices);
  return stamp(namespace, combineLanesToPayload(hi, lo));
}

function deriveSeasonSeed(worldSeed, seasonNumber, namespace = SEED_NAMESPACE.MAIN) {
  assertSafeSeed(worldSeed, 'worldSeed');
  assertIndex(seasonNumber, 'seasonNumber');
  const { hi, lo } = foldLanes(worldSeed, LAYER_TAG.SEASON, [seasonNumber, namespace]);
  return stamp(namespace, combineLanesToPayload(hi, lo));
}

function deriveMatchSeed(seasonSeed, matchKey, ...extraIndices) {
  assertSafeSeed(seasonSeed, 'seasonSeed');
  return derive(seasonSeed, LAYER_TAG.MATCH, [matchKey, ...extraIndices]);
}

function deriveEventSeed(matchSeed, tick, eventIndex = 0) {
  assertSafeSeed(matchSeed, 'matchSeed');
  assertIndex(tick, 'tick');
  assertIndex(eventIndex, 'eventIndex');
  return derive(matchSeed, LAYER_TAG.EVENT, [tick, eventIndex]);
}

function stateForSeed(seed) {
  assertSafeSeed(seed, 'seed');
  return createState(seed);
}

// ---------------------------------------------------------------------------
// rng/precision.ts 이식
// ---------------------------------------------------------------------------
const PROBABILITY_DECIMALS = 6;
const PROBABILITY_SCALE = 1_000_000;
const PROBABILITY_UNIT_MIN = 0;
const PROBABILITY_UNIT_MAX = PROBABILITY_SCALE;
const TIE_GUARD = 1e-9;

function assertFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${label}: 유한한 수여야 합니다 (받은 값: ${value})`);
  }
}

function roundToUnits(value) {
  assertFinite(value, 'value');

  const sign = value < 0 ? -1 : 1;
  const magnitude = Math.abs(value);
  const scaled = magnitude * PROBABILITY_SCALE;
  const floor = Math.floor(scaled);
  const fraction = scaled - floor;

  if (Math.abs(fraction - 0.5) > TIE_GUARD) {
    const rounded = fraction < 0.5 ? floor : floor + 1;
    return rounded === 0 ? 0 : sign * rounded;
  }

  const exact = Number(magnitude.toFixed(PROBABILITY_DECIMALS));
  const rounded = Math.round(exact * PROBABILITY_SCALE);
  return rounded === 0 ? 0 : sign * rounded;
}

function toUnits(probability) {
  const units = roundToUnits(probability);
  if (units < PROBABILITY_UNIT_MIN || units > PROBABILITY_UNIT_MAX) {
    throw new RangeError(`probability: 0 이상 1 이하여야 합니다 (받은 값: ${probability}, units=${units})`);
  }
  return units;
}

function succeedsWithUnits(rollUnits, probabilityUnits) {
  return rollUnits < probabilityUnits;
}

function succeeds(roll, probability) {
  const raw = roundToUnits(roll);
  if (raw < PROBABILITY_UNIT_MIN) {
    throw new RangeError(`roll: 0 이상 1 미만이어야 합니다 (받은 값: ${roll})`);
  }
  const rollUnits = Math.min(raw, PROBABILITY_UNIT_MAX - 1);
  return succeedsWithUnits(rollUnits, toUnits(probability));
}

function rollSucceeds(state, probability) {
  const step = nextFloat(state);
  return { state: step.state, value: succeeds(step.value, probability) };
}

function normalizeWeights(weights) {
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

function pickWeightedIndex(state, normalizedUnits) {
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

  return { state: step.state, value: normalizedUnits.length - 1 };
}

// ---------------------------------------------------------------------------
// rng/sort.ts 이식
// ---------------------------------------------------------------------------
function compareComparable(a, b) {
  if (typeof a === 'number' || typeof b === 'number') {
    const na = typeof a === 'number' ? a : Number.NaN;
    const nb = typeof b === 'number' ? b : Number.NaN;
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      throw new RangeError(`stableSortBy: 정렬 키 값이 NaN이거나 숫자·문자열이 혼재합니다 (a=${String(a)}, b=${String(b)})`);
    }
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  }
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareByKey(a, b, key) {
  const result = compareComparable(key.get(a), key.get(b));
  return key.dir === 'desc' ? -result : result;
}

function stableSortBy(items, keys) {
  if (keys.length === 0) {
    throw new RangeError('stableSortBy: keys는 최소 1개 이상이어야 합니다 (받은 값: 빈 배열)');
  }
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const result = compareByKey(a, b, key);
      if (result !== 0) return result;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// match/tick.ts 이식
// ---------------------------------------------------------------------------
const FIRST_HALF_END_MINUTE = 45;
const SECOND_HALF_END_MINUTE = 90;
const EXTRA_FIRST_HALF_END_MINUTE = 105;
const EXTRA_SECOND_HALF_END_MINUTE = 120;

const FIRST_HALF_STOPPAGE_RANGE = { min: 0, max: 5 };
const SECOND_HALF_STOPPAGE_RANGE = { min: 1, max: 8 };

function rollStoppageMinutes(matchSeed, boundaryMinute, range) {
  const seed = deriveEventSeed(matchSeed, boundaryMinute, 0);
  const state = stateForSeed(seed);
  const step = nextIntBetween(state, range.min, range.max);
  return step.value;
}

function buildTickSequence(options) {
  const { matchSeed, includeExtraTime } = options;

  const ticks = [];
  let tickIndex = 1;

  const pushRegular = (phase, startMinute, endMinute) => {
    for (let minute = startMinute; minute <= endMinute; minute += 1) {
      ticks.push({ tick: tickIndex, phase, minute, addedTime: 0 });
      tickIndex += 1;
    }
  };

  const pushStoppage = (phase, minute, stoppageMinutes) => {
    for (let addedTime = 1; addedTime <= stoppageMinutes; addedTime += 1) {
      ticks.push({ tick: tickIndex, phase, minute, addedTime });
      tickIndex += 1;
    }
  };

  pushRegular('FIRST_HALF', 1, FIRST_HALF_END_MINUTE);
  pushStoppage(
    'FIRST_HALF_STOPPAGE',
    FIRST_HALF_END_MINUTE,
    rollStoppageMinutes(matchSeed, FIRST_HALF_END_MINUTE, FIRST_HALF_STOPPAGE_RANGE),
  );

  pushRegular('SECOND_HALF', FIRST_HALF_END_MINUTE + 1, SECOND_HALF_END_MINUTE);
  pushStoppage(
    'SECOND_HALF_STOPPAGE',
    SECOND_HALF_END_MINUTE,
    rollStoppageMinutes(matchSeed, SECOND_HALF_END_MINUTE, SECOND_HALF_STOPPAGE_RANGE),
  );

  if (includeExtraTime) {
    pushRegular('EXTRA_FIRST', SECOND_HALF_END_MINUTE + 1, EXTRA_FIRST_HALF_END_MINUTE);
    pushRegular('EXTRA_SECOND', EXTRA_FIRST_HALF_END_MINUTE + 1, EXTRA_SECOND_HALF_END_MINUTE);
  }

  return { ticks };
}

// ---------------------------------------------------------------------------
// match/events.ts 이식 (23종 이벤트 카탈로그 + 생성 + 정렬 + PK 연결)
// ---------------------------------------------------------------------------
const MATCH_EVENT_TYPES = [
  'KICKOFF', 'SHOT_ON', 'SHOT_OFF', 'SHOT_BLOCKED', 'GOAL', 'ASSIST', 'OWN_GOAL',
  'PENALTY_AWARDED', 'PENALTY_SCORED', 'PENALTY_MISSED', 'YELLOW_CARD', 'SECOND_YELLOW',
  'RED_CARD', 'FOUL', 'OFFSIDE', 'CORNER', 'SAVE', 'INJURY', 'SUBSTITUTION',
  'HALF_TIME', 'FULL_TIME', 'EXTRA_TIME_START', 'PENALTY_SHOOTOUT',
];

const XG_ELIGIBLE_TYPES = new Set(['SHOT_ON', 'SHOT_OFF', 'SHOT_BLOCKED', 'GOAL', 'PENALTY_SCORED', 'PENALTY_MISSED']);

const NO_PARTICIPANTS = { teamId: null, primaryPlayerId: null, secondaryPlayerId: null };
const EMPTY_DETAIL = {};

function generateMatchEvents(ticks, matchSeed, options) {
  const { occursProbability, weights, resolveParticipants, estimateXg } = options;
  const normalizedWeights = normalizeWeights(MATCH_EVENT_TYPES.map((type) => weights[type]));

  const drafts = [];
  let sequence = 1;

  for (const tick of ticks) {
    const occursState = stateForSeed(deriveEventSeed(matchSeed, tick.tick, 1));
    const occursRoll = rollSucceeds(occursState, occursProbability);
    if (!occursRoll.value) {
      continue;
    }

    const typeState = stateForSeed(deriveEventSeed(matchSeed, tick.tick, 2));
    const picked = pickWeightedIndex(typeState, normalizedWeights);
    const type = MATCH_EVENT_TYPES[picked.value];

    const context = { tick, type };
    const participants = resolveParticipants ? resolveParticipants(context) : NO_PARTICIPANTS;
    const xg = XG_ELIGIBLE_TYPES.has(type) && estimateXg ? estimateXg(context) : null;
    const detail = EMPTY_DETAIL;

    drafts.push({
      sequence,
      minute: tick.minute,
      addedTime: tick.addedTime,
      type,
      teamId: participants.teamId,
      primaryPlayerId: participants.primaryPlayerId,
      secondaryPlayerId: participants.secondaryPlayerId,
      xg,
      relatedEventSequence: null,
      detail,
    });
    sequence += 1;
  }

  return sortMatchEventsChronologically(drafts);
}

function sortMatchEventsChronologically(events) {
  return stableSortBy(events, [
    { get: (e) => e.minute },
    { get: (e) => e.addedTime },
    { get: (e) => e.sequence },
  ]);
}

function linkPenaltyOutcomes(events) {
  let pendingAwardSequence = null;

  return events.map((event) => {
    if (event.type === 'PENALTY_AWARDED') {
      pendingAwardSequence = event.sequence;
      return event;
    }
    if ((event.type === 'PENALTY_SCORED' || event.type === 'PENALTY_MISSED') && pendingAwardSequence !== null) {
      const linked = { ...event, relatedEventSequence: pendingAwardSequence };
      pendingAwardSequence = null;
      return linked;
    }
    return event;
  });
}

// ---------------------------------------------------------------------------
// match/stats.ts 이식 (Tier A 폴드만 — Tier B는 상위 계층 매핑표 소비 없이도
// 이 벤치의 관심사인 "이벤트 순회 집계 비용"에는 영향 없음)
// ---------------------------------------------------------------------------
const TIER_A_FIELD_NAMES = [
  'goals', 'assists', 'shots', 'shotsOnTarget', 'xg', 'penaltiesTaken', 'penaltiesScored',
  'ownGoals', 'foulsCommitted', 'foulsDrawn', 'yellowCards', 'secondYellows', 'redCards',
  'offsides', 'saves', 'penaltiesSaved',
];

function zeroTierARow() {
  const row = {};
  for (const field of TIER_A_FIELD_NAMES) {
    row[field] = 0;
  }
  return row;
}

function accumulatePlayerMatchStats(events) {
  const rows = new Map();

  const ensure = (playerId) => {
    const existing = rows.get(playerId);
    if (existing) return existing;
    const created = zeroTierARow();
    rows.set(playerId, created);
    return created;
  };

  for (const event of events) {
    const { type, primaryPlayerId, secondaryPlayerId, xg } = event;

    switch (type) {
      case 'GOAL': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.goals += 1; row.shots += 1; row.shotsOnTarget += 1; row.xg += xg ?? 0;
        }
        break;
      }
      case 'PENALTY_SCORED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.goals += 1; row.penaltiesScored += 1; row.penaltiesTaken += 1; row.xg += xg ?? 0;
        }
        break;
      }
      case 'PENALTY_MISSED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.penaltiesTaken += 1; row.xg += xg ?? 0;
        }
        if (secondaryPlayerId) {
          ensure(secondaryPlayerId).penaltiesSaved += 1;
        }
        break;
      }
      case 'SHOT_ON': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.shots += 1; row.shotsOnTarget += 1; row.xg += xg ?? 0;
        }
        break;
      }
      case 'SHOT_OFF':
      case 'SHOT_BLOCKED': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.shots += 1; row.xg += xg ?? 0;
        }
        break;
      }
      case 'ASSIST': {
        if (primaryPlayerId) ensure(primaryPlayerId).assists += 1;
        break;
      }
      case 'OWN_GOAL': {
        if (primaryPlayerId) ensure(primaryPlayerId).ownGoals += 1;
        break;
      }
      case 'FOUL':
      case 'PENALTY_AWARDED': {
        if (primaryPlayerId) ensure(primaryPlayerId).foulsCommitted += 1;
        if (secondaryPlayerId) ensure(secondaryPlayerId).foulsDrawn += 1;
        break;
      }
      case 'YELLOW_CARD': {
        if (primaryPlayerId) ensure(primaryPlayerId).yellowCards += 1;
        break;
      }
      case 'SECOND_YELLOW': {
        if (primaryPlayerId) {
          const row = ensure(primaryPlayerId);
          row.yellowCards += 1; row.secondYellows += 1;
        }
        break;
      }
      case 'RED_CARD': {
        if (primaryPlayerId) ensure(primaryPlayerId).redCards += 1;
        break;
      }
      case 'OFFSIDE': {
        if (primaryPlayerId) ensure(primaryPlayerId).offsides += 1;
        break;
      }
      case 'SAVE': {
        if (primaryPlayerId) ensure(primaryPlayerId).saves += 1;
        break;
      }
      default:
        break;
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// perf-bench.test.ts(16일차, 2팀) 동일 파라미터 — 벤치 전용 참가자/xG/가중치
// ---------------------------------------------------------------------------
const TEAM_HOME = 'bench-team-home';
const TEAM_AWAY = 'bench-team-away';
const HOME_PLAYERS = Array.from({ length: 11 }, (_, i) => `bench-home-p${i + 1}`);
const AWAY_PLAYERS = Array.from({ length: 11 }, (_, i) => `bench-away-p${i + 1}`);

function opponentOf(team) {
  return team === TEAM_HOME ? TEAM_AWAY : TEAM_HOME;
}

const BENCH_WEIGHTS = {
  KICKOFF: 1, SHOT_ON: 10, SHOT_OFF: 10, SHOT_BLOCKED: 6, GOAL: 4, ASSIST: 3, OWN_GOAL: 1,
  PENALTY_AWARDED: 2, PENALTY_SCORED: 1, PENALTY_MISSED: 1, YELLOW_CARD: 5, SECOND_YELLOW: 1,
  RED_CARD: 1, FOUL: 8, OFFSIDE: 4, CORNER: 6, SAVE: 6, INJURY: 1, SUBSTITUTION: 3,
  HALF_TIME: 1, FULL_TIME: 1, EXTRA_TIME_START: 1, PENALTY_SHOOTOUT: 1,
};

function resolveParticipants(ctx) {
  const { tick, type } = ctx;
  const actingTeam = tick.tick % 2 === 0 ? TEAM_HOME : TEAM_AWAY;
  const actingRoster = actingTeam === TEAM_HOME ? HOME_PLAYERS : AWAY_PLAYERS;
  const primaryPlayerId = actingRoster[tick.tick % actingRoster.length];

  if (type === 'OWN_GOAL') {
    return { teamId: opponentOf(actingTeam), primaryPlayerId, secondaryPlayerId: null };
  }
  return { teamId: actingTeam, primaryPlayerId, secondaryPlayerId: null };
}

function estimateXg(ctx) {
  return ((ctx.tick.minute % 20) + 1) / 40;
}

function buildBenchOptions() {
  return { occursProbability: 0.35, weights: BENCH_WEIGHTS, resolveParticipants, estimateXg };
}

const BENCH_WORLD_SEED = 20_260_909; // 37일차 날짜 리터럴(시드 계층 관례)
const BENCH_SEASON_NUMBER = 37;

function buildMatchSeedForIndex(index) {
  const seasonSeed = deriveSeasonSeed(BENCH_WORLD_SEED, BENCH_SEASON_NUMBER);
  return deriveMatchSeed(seasonSeed, index);
}

function runOneMatch(index) {
  const matchSeed = buildMatchSeedForIndex(index);

  const t0 = performance.now();
  const { ticks } = buildTickSequence({ matchSeed, includeExtraTime: index % 5 === 0 });
  const events = generateMatchEvents(ticks, matchSeed, buildBenchOptions());
  const linked = linkPenaltyOutcomes(events);
  accumulatePlayerMatchStats(linked);
  const elapsedMs = performance.now() - t0;

  return { elapsedMs, eventCount: linked.length, tickCount: ticks.length };
}

function percentile(sortedAsc, p) {
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

// ---------------------------------------------------------------------------
// V-01 실측 핸들러 — 30경기(기본) 처리를 단일 호출(단일 Edge Function invocation)
// 내에서 동기적으로 실행하고, 그 실행 구간의 wall-clock을 잰다.
//
// 주의(보고서에도 명시): 이 값은 "핸들러 동기 실행 구간의 벽시계 시간"이며, I/O나
// await가 전혀 없는 순수 CPU 바운드 연산이라 Supabase가 실제로 과금·강제하는
// "CPU 시간"과 사실상 같아야 하나, 플랫폼 내부 CPU 어카운팅 값 자체를 직접
// 조회하는 API는 없어 이 수치가 "근사"임을 명시한다.
//
// ⚠️ 재배포 전 확인: matches 파라미터에 상한이 없다(§6 노출 사유). 재사용 시
// 상한 추가를 권장한다.
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  const url = new URL(req.url);
  const matchCount = Number(url.searchParams.get('matches') ?? '30') || 30;

  const handlerStart = performance.now();

  const timings = [];
  const details = [];
  for (let i = 0; i < matchCount; i += 1) {
    const result = runOneMatch(i);
    timings.push(result.elapsedMs);
    details.push({ index: i, elapsedMs: result.elapsedMs, eventCount: result.eventCount, tickCount: result.tickCount });
  }

  const handlerElapsedMs = performance.now() - handlerStart;

  const sorted = [...timings].sort((a, b) => a - b);
  const sumMs = timings.reduce((acc, v) => acc + v, 0);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const max = sorted[sorted.length - 1];

  const EDGE_CPU_LIMIT_MS = 2000;
  const NFR_PF_003_LIMIT_MS = 1500;

  const body = {
    v01: {
      matchCount,
      handlerElapsedMs,
      sumOfPerMatchMs: sumMs,
      perMatch: { p50, p95, p99, max },
      edgeCpuLimitMs: EDGE_CPU_LIMIT_MS,
      nfrPf003LimitMs: NFR_PF_003_LIMIT_MS,
      passedEdgeLimit: handlerElapsedMs < EDGE_CPU_LIMIT_MS,
      marginMs: EDGE_CPU_LIMIT_MS - handlerElapsedMs,
      note: 'handlerElapsedMs는 핸들러 동기 실행 구간의 performance.now() 벽시계 차이(I/O 없음, 순수 CPU 바운드) — 플랫폼 CPU 어카운팅 값 자체가 아니라 그 근사치.',
    },
    details,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```
