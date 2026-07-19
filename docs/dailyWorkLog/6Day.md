# 6일차 작업 로그 — 2026-07-28(화)

> 작성: 팀장 / 대상 일차: **6일차 (2026-07-28 화)**
> 이전: [`5Day.md`](./5Day.md)
> 사이클: **작업 → 개별 보고 → 상호 공유·충돌 체크 → 조율 해소 → 마감 검증**

---

## 1. 참여 현황

| 팀 | 배정 | 상태 |
|---|---|---|
| **1팀 코어·품질** | Task 002 — enum성 값 단일 선언(이벤트 23종·포지션 11군·부상 4등급·전술 6종·페이즈 6종·마켓 상태·국적 코드) + I-33 · I-37 | ✅ 완료 |
| **2팀 시뮬엔진** | **I-39 최우선 수정** → Task 006 동일 시드 100만 회 바이트 동일성 벤치 | ✅ 완료 |
| 3·4·5·6팀 | 없음 (3·4·6팀 H-01 대기 / 5팀 유휴 구간) | ⏸ 미호출 |

**이 일차의 성격**: **5일차 교차 점검이 만든 부채를 같은 주에 갚은 날**입니다. I-39는 어제 발견됐고 오늘 코드 레벨에서 닫혔습니다. 8일차 타입 동결까지 2일 남은 시점에서, 동결 대상인 `enums.ts`의 placeholder가 전부 실제 값으로 교체된 것도 오늘의 핵심 성과입니다.

---

## 2. 산출물

| 팀 | 파일 | 비고 |
|---|---|---|
| 1팀 | `src/types/enums.ts` | **핵심** — `SeasonPhase`에 `TIEBREAK` 추가(6종) / `Position` 11군 / `MatchEventType` 23종 / `BetMarketStatus` 4종 / `NationalityCode` 브랜드화 / `InjurySeverity` 신설 / `ManagerStyle` 재확인 |
| 1팀 | `src/types/match.ts` | **I-37** — `MatchEvent.relatedEventSequence: number \| null` + `secondaryPlayerId`와의 역할 경계 확정 |
| 1팀 | `src/types/ops.ts` | `Injury.severity`를 `number` → `InjurySeverity`로 교체 |
| 1팀 | `src/types/person.ts`·`betting.ts`·`index.ts` | stale 주석 갱신(인터페이스 변경 없음) |
| 1팀 | `docs/ISSUES.md` | **I-33·I-37 반영 완료**, **I-39 해소**, **I-40 신규 등재** |
| 2팀 | `src/lib/sim/rng/prng.ts` | `createState`가 53비트 시드 전량 소비 |
| 2팀 | `src/lib/sim/rng/derive.ts` | payload 30 → **51비트** 재설계, `assertUint32` → `assertSafeSeed` |
| 2팀 | `src/lib/sim/rng/bench.test.ts` | **신규** — 100만 회 바이트 동일성 벤치 |
| 2팀 | `prng.test.ts`·`derive.test.ts` | 53비트 경계 회귀 12건 신설, 32비트 상한 검증 1건 교체 |
| 팀장 | `ROADMAP.md` | Task 025 상태머신 문구에 `TIEBREAK` 반영 |

### 2.1 I-39를 BigInt 없이 푼 방법

D-28이 `bigint`를 **명시적으로 기각**했으므로(PRNG가 32비트 워드 연산으로만 구성 / JSON 직렬화 불가 / 틱 핫패스 성능), 2팀은 다른 경로를 택했습니다.

| 문제 | 해법 |
|---|---|
| `createState(seed)`가 `seed \| 0`로 상위 21비트 절단 | `lo = seed >>> 0` / `hi = Math.floor(seed / 2**32) >>> 0`로 분리 → hi를 `splitmix32`로 아발란치 → lo와 XOR |
| payload가 30비트 고정 | hi/lo **두 32비트 레인을 parentSeed·layerTag·indices 전체에 대해 각각 독립적으로 끝까지 믹싱**한 뒤, 마지막에 딱 한 번 `payload = (hi & 0x7FFFF) * 2**32 + lo`(19+32=51비트)로 안전정수 곱셈 결합 |
| `stamp`/`namespaceOf`가 비트시프트(32비트 한계) | `namespace * 2**51 + payload` / `Math.floor(seed / 2**51)` 안전정수 연산으로 전환. `PAYLOAD_SPAN = 2**51`이 정확히 2의 거듭제곱이라 "상위 2비트 = 네임스페이스" 문서 설명은 그대로 유효 |
| parentSeed(최대 53비트)가 파생 체인 내부에서 재절단 | `splitWide(seed)`로 lo/hi 모두 초기 믹싱에 포함 |

**핵심은 "마지막에 한 번만 결합"입니다.** 32비트 해시 결과를 51비트 자리에 끼워 넣기만 하면 입력 충돌 도메인이 여전히 32비트에 머물러 D-28의 근거("payload 51비트로 생일 충돌 소멸")가 성립하지 않습니다.

### 2.2 `NationalityCode` — 하드코딩 유니온을 피한 이유

D-17(국적 코드)을 리터럴 유니온으로 나열하지 않고 `string & { readonly __nationalityCode: true }` 브랜드 타입으로 두었습니다. T9(국가 목록 하드코딩 유니온 금지) 원칙에 따른 것으로, ISO 3166-1 alpha-2라는 **형식 계약만 타입으로 강제**하고 실제 국가 목록은 데이터(3팀 공통코드)에 둡니다.

### 2.3 `GOAL.secondaryPlayerId` vs `relatedEventSequence` — 역할 경계 확정

2팀이 10일차 Task 023에서 곧바로 부딪힐 지점이라 오늘 확정했습니다.

**결정: `GOAL` 이벤트는 `secondaryPlayerId`를 쓰지 않는다.** 어시스트 제공자의 유일한 출처는 `ASSIST` 이벤트 자신의 `primaryPlayerId`이고, 연결은 `relatedEventSequence`(ASSIST→GOAL)로만 이루어집니다.

근거: ① `assists` 집계가 `ASSIST.primaryPlayerId` 단일 출처라는 I-37 판정 전제와 정합 — 중복 기입 시 두 값이 어긋날 위험(SSOT 위반) ② `ASSIST`가 이미 FR-MT-002 23종의 독립 이벤트라 자기 레코드를 가짐 ③ `secondaryPlayerId`만으로 충분했다면 애초에 I-37이 제기될 이유가 없었음. `secondaryPlayerId`는 이벤트 타입별로 뜻이 달라지는 범용 보조 참조(예: `SUBSTITUTION`의 교체 아웃 선수)로 남깁니다.

---

## 3. 교차 점검

### 3.1 1차 — 팀원 간

**1팀 → 2팀: I-39 해소 검증 통과, I-40 신규 1건**

| 근거 | 확인 방법 |
|---|---|
| A. RangeError 소멸 | `createState`가 `assertUint32`를 더 이상 사용 안 함. `prng.test.ts:82`에서 `createState(Number.MAX_SAFE_INTEGER)` 정상 |
| B. payload 실제 51비트 | `PAYLOAD_BITS=51`, `combineLanesToPayload`(19+32). **`foldLanes`가 두 레인을 처음부터 끝까지 독립 믹싱**함을 코드로 확인 — 얕은 끼워넣기가 아님. `derive.test.ts:184`(2⁵¹·2⁵² 부근 대량 무충돌), `:178` |
| C. `createState(x) !== createState(x+2³²)` | `foldSeed`가 hi를 0 vs 1로 다르게 계산. `prng.test.ts:88` 회귀 고정 |

→ **`docs/ISSUES.md`에서 I-39 해소 처리**(근거·테스트 라인 명시).

**2팀 → 1팀: 블로커 없음, 팀장 확인 2건 + 1팀 답변 1건**

| 항목 | 결과 |
|---|---|
| `SeasonPhase.TIEBREAK` vs Task 025 | 타입은 충분. 단 **동률 판정은 Task 026(31~37일차) 소관인데 025는 25~30일차라 먼저 끝남** → 025는 동률 여부를 인자로 주입받는 순수 함수 인터페이스로 먼저 확정해야 함 |
| `MatchEventType` 23종 vs Task 023 | FR-MT-002 원문과 순서·값 완전 일치, 누락·중복 0건. 그대로 소비 가능 |
| `relatedEventSequence` 충전 가능성 | 가능. 단 **선(先)계산·후(後)push** 규칙 필요 — GOAL에 부여될 `sequence`를 먼저 계산해 ASSIST에 채운 뒤 ASSIST→GOAL 순으로 push (lookahead 1칸) |
| rng 회귀 | 없음 — rng는 `@/types` 무의존이라 구조적으로 닿지 않음 |

### 3.2 2차 — 팀장 검증

- 임시 테스트(`__leadcheck.test.ts`, 검증 후 삭제)로 **I-39 근거 A/B/C를 독립 재현** — 3건 전부 통과.
  - A: `deriveSeasonSeed(MAX_SAFE_INTEGER, 1)` 정상 / `+1`은 `RangeError` → 상한이 정확히 53비트
  - B: 2만 회 파생 payload 최댓값이 **2⁴⁰ 초과**(구 구현은 2³⁰ 한계) + 네임스페이스 태그 전건 보존(NFR-DT-006 유지)
  - C: `createState(x) !== createState(x + 2³²)`
- 수락 기준 독립 grep: 이벤트 **23종** / 포지션 **11군** / `SeasonPhase` 6종 / 중복 enum 선언 **0건** / placeholder(`__unconfirmed*`) 잔존 **0건**.
- 통합 상태 게이트 직접 재실행: `tsc` 0 / `lint` 0 / **118 tests passed**.
- **회귀 판정 검토**: 2팀이 수정 직후 보고한 "1 failed"는 32비트 상한 자체를 검증하던 테스트로, I-39가 요구한 **의도된 계약 변경**입니다. 회귀가 아니며 53비트 상한 검증으로 교체된 것을 diff로 확인했습니다.

---

## 4. 조율 결과 (팀장 판단)

| 안건 | 결론 |
|---|---|
| **(a) ROADMAP Task 025 문구의 TIEBREAK 누락** | **반영함.** `REGULAR ⇄ CUP_SLOT → PLAYOFF → (TIEBREAK) → SETTLEMENT → PRESEASON → REGULAR`로 갱신하고, 025가 026보다 먼저 끝나는 순서 문제를 "동률 여부를 인자로 주입받는 순수 함수 인터페이스로 먼저 확정"으로 명시 |
| **(b) 3팀 `PHASE_DURATION_MIN` TIEBREAK 예산** | **미진행 — 3팀 Task 003 착수가 9일차.** 9일차 3팀 소환 시 지시문에 포함. D-27 파급 3건 중 마지막 미처리 항목 |
| **(c) `GOAL.secondaryPlayerId` 역할** | 1팀이 확정 — GOAL은 이 필드를 쓰지 않음(§2.3) |
| I-40 처리 시점 | 차단성 아님(도메인상 시즌 번호·틱이 2³²에 근접할 일 없음). 2팀 여유 시 상한 검증 추가 |

---

## 5. 이슈

### 신규

| ID | 상태 | 요지 | 담당 |
|---|---|---|---|
| **I-40** | OPEN | `derive.ts`의 `assertIndex`(seasonNumber/tick/eventIndex/extraIndices)에 2³² 상한 검증이 없어, 호출부 버그로 큰 값이 들어오면 `mix32` 내부에서 조용히 mod 2³² → 서로 다른 인덱스가 같은 파생 시드 산출. **차단성 아님**(방어 계층 공백) | 2팀 — 여유 시 |

### 해소

| ID | 처리 |
|---|---|
| **I-39** | D-28 53비트가 rng 구현에 미반영 → **코드 레벨 해소**(§2.1). 근거 A/B/C 전건 검증, 1팀 점검 + 팀장 독립 재현 이중 확인 |
| **I-33** | `SeasonPhase.TIEBREAK` 타입 반영 완료. 파급 3건 중 2팀 025는 ROADMAP 갱신으로 전달, 3팀 예산은 9일차 이월 |
| **I-37** | `MatchEvent.relatedEventSequence` 추가 + `secondaryPlayerId` 역할 경계 확정 |

### 구현 노트 (이슈 아님, 10일차 Task 023 대비)

- 어시스트 이벤트는 **선(先)계산·후(後)push** — GOAL에 부여될 `sequence`를 먼저 계산해 ASSIST의 `relatedEventSequence`에 채운 뒤 ASSIST→GOAL 순으로 push. "동일 스텝에서 발생하는 연관 이벤트는 배치로 구성"하는 규칙이 필요합니다.

---

## 6. 마감 검증

| 게이트 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 오류 0 |
| `npm run lint` | ✅ 경고·오류 0 |
| `npm run test` | ✅ 6파일 / **118 테스트** 통과 (5일차 107 − 1교체 + 12신설) |
| 1팀 수락 기준 (중복 enum 선언 0건) | ✅ 7종 전수 grep, placeholder 잔존 0 |
| 2팀 수락 기준 (재실행 시 바이트 동일) | ✅ 100만 회 추출 1회차 49.33ms / 2회차 43.95ms, value·최종 state `toEqual` 완전 일치 |
| 2팀 부가 (단일 경기 재현) | ✅ 5만 회 3.02ms — 기준 ≤100ms 대비 **30배 여유** |

---

## 7. 다음 일차 예고

### 7일차 (2026-07-29 수)

| 팀 | 배정 |
|---|---|
| **1팀** | Task 002 — 브랜드 타입(`TeamId`·`PlayerId`), **`Seed` 53비트 브랜드 승격**, 포인트 정수 고정(DC-08), 시드 계층 타입, 상수 스냅샷 타입(E-44), **enum→번역 키 매핑 타입 규약**(Task 011 정합). 수락: ID 혼용이 `tsc`에서 오류로 검출. 겸: I-15 |
| 2~6팀 | 없음 |

> **7일차는 1팀 단독**입니다. 팀원 간 1차 교차 점검이 불가능하므로 팀장 검증 비중이 올라갑니다. 특히 시드 계층 브랜드 승격은 2팀 `derive.ts`(어제 51비트로 재설계됨)를 감싸기만 해야 하며 계산을 복제하면 안 됩니다(T2-b·팀장 확정 ②).

### 동결 카운트다운 — 8일차(07-30)까지 2일

| 반영 일차 | 항목 |
|---|---|
| **7일차** | `brand.ts` 53비트 승격 · 시드 계층 서브브랜드 4종(mint는 2팀 한정) · DC-08 · E-44 · enum→번역 키 규약 · I-15 |
| **8일차** | **SP-1 타입 동결 리뷰 (전 6팀, 2h)** — H-01 인계 |

### 미결 이월

| 항목 | 처리 시점 |
|---|---|
| I-40 `assertIndex` 상한 | 2팀 여유 시 (차단성 아님) |
| 3팀 `PHASE_DURATION_MIN` TIEBREAK 예산 | **9일차 3팀 소환 시 지시** (D-27 파급 마지막 항목) |
| Task 023 이벤트 배치 구성 규칙 | 10일차 2팀 구현 시 |
