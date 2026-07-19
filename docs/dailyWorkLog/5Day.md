# 5일차 작업 로그 — 2026-07-27(월)

> 작성: 팀장 / 대상 일차: **5일차 (2026-07-27 월)**
> 이전: [`4Day.md`](./4Day.md)
> 사이클: **작업 → 개별 보고 → 상호 공유·충돌 체크 → 조율 해소 → 마감 검증**

---

## 1. 참여 현황

| 팀 | 배정 | 상태 |
|---|---|---|
| **1팀 코어·품질** | Task 002 — E-21~E-32 정의 + E-33~E-40(2차 배팅·사용자) 선정의 | ✅ 완료 |
| **2팀 시뮬엔진** | Task 006 — Vitest 도입, 시드 재현성·분포 균등성·입력 순서 셔플 불변성 3종 | ✅ 완료 |
| 3·4·5·6팀 | 없음 (3·4·6팀 H-01 대기 / 5팀 1~27일차 유휴 구간) | ⏸ 미호출 |

**이 일차의 성격**: **테스트 러너가 처음 들어온 날**이자, **교차 점검이 런타임 경계 결함을 잡은 날**입니다. 두 팀 모두 배정 업무는 수락 기준대로 끝냈지만, 실질적으로 중요한 산출은 2팀→1팀 교차 점검에서 나온 **I-39**입니다. `npx tsc --noEmit`으로는 절대 검출되지 않는 결함이었고, vitest가 오늘 들어오지 않았다면 8일차 타입 동결 이후에나 드러났을 사안입니다.

---

## 2. 산출물

| 팀 | 파일 | 비고 |
|---|---|---|
| 1팀 | `src/types/stat.ts` | E-21 PlayerCareerStat / E-22 TeamSeasonStat / E-23 Standing / E-31 Award / E-32 Trophy |
| 1팀 | `src/types/ops.ts` | E-24 Injury / E-25 YouthProspect / E-26 NewsFeedItem / E-27 Sanction |
| 1팀 | `src/types/economy.ts` | E-28 Sponsor / E-29 SponsorContract / E-30 PointTransaction |
| 1팀 | `src/types/betting.ts` | **E-33~E-40 선정의** — BetMarket / BetSelection / Odds / Bet / BetLeg / User / Wallet / WalletTransaction |
| 1팀 | `src/types/enums.ts` | 신규 리터럴 유니온 14종 (InjuryStatus·NewsFeedItemType·SanctionType·SponsorContractStatus·PointTransaction Owner/Reason·Award Type/Scope·TrophyType·BetMarketScope·BetSelectionResult·BetType/Status·UserRole·WalletCurrency·WalletTransactionReason) |
| 1팀 | `src/types/brand.ts` | 신규 PK 별칭 13종 |
| 1팀 | `src/types/world.ts` | **I-31 반영** — `speedChangedAt` / `worldMinutesAtSpeedChange` / `pausedAt` / `clockRevision` 4필드 + `worldSeed` 주석 53비트 정정 |
| 1팀 | `docs/devStep/02.타입스키마설계원칙.md` | **I-32/D-28 반영** — T2-a 시드 폭 32→53비트 개정 |
| 1팀 | `docs/ISSUES.md` | I-19 해소, **I-39 신규 등재** |
| 2팀 | `package.json` / `package-lock.json` | **vitest 4.1.10 도입**, `npm run test` = `vitest run` |
| 2팀 | `src/lib/sim/rng/prng.test.ts` | 시드 재현성 / 값 범위 / **분포 균등성** |
| 2팀 | `src/lib/sim/rng/sort.test.ts` | **입력 순서 셔플 불변성**(핵심) / 안정 정렬 / 다중 키 |
| 2팀 | `src/lib/sim/rng/derive.test.ts` | 결정론 / 계층 간 비충돌 / 네임스페이스 분리(NFR-DT-006) |
| 2팀 | `src/lib/sim/rng/precision.test.ts` | 반올림 경계값 / 이행성 / 가중 추출 |
| 2팀 | `src/lib/sim/rng/hash.test.ts` | SHA-256 표준 벡터 / canonicalize 결정론 / hashState 재현성 |

### 2.1 vitest 도입 — 설정 파일 없이 시작한 이유

`vitest.config.ts`는 **의도적으로 만들지 않았습니다.** 이 파일은 1팀 Task 008(12일차) 소관이고, 현재 2팀 테스트는 전부 상대경로(`./prng`)만 import하므로 `@/*` 별칭 해석이 필요 없습니다. 지금 2팀이 설정 파일을 선점하면 12일차에 소유권 충돌이 납니다.

### 2.2 E-33~E-40 "선정의"의 의미

배팅·사용자 도메인은 2차 범위지만 **8일차 동결 대상에는 포함**됩니다. 동결 후 추가하려면 이슈 배치 반영 절차를 거쳐야 하므로, 구현이 한참 뒤(5팀 74일차~)여도 타입 골격만 지금 확정해 둡니다. `BetMarket.status`는 6일차 "마켓 상태" 확정 목록에 명시된 항목이라 `MatchEventType`과 동일하게 브랜드 placeholder로 남겨 6일차에 채웁니다.

---

## 3. 교차 점검

### 3.1 1차 — 팀원 간

**1팀 → 2팀 (이슈 없음)**

| 항목 | 결과 |
|---|---|
| `src/types` 사용 충돌 | 없음 — rng 5개 구현 + 5개 테스트 전체에서 `@/types`·`src/types` import **0건**. T2-d("2팀은 7일차까지 도메인 명칭 타입 무의존") 준수 |
| vitest가 tsc를 깨뜨리는지 | `npx tsc --noEmit` exit 0 / `npx vitest run` 5파일 107테스트 통과 / `npm run lint` 0건 |
| 배럴 규약 C-5·C-6 | 위반 없음(타입 import 자체가 없음) |
| NFR-DT-001 | `Math.random()`/`Date.now()` 실사용 0건 |

**2팀 → 1팀 (이슈 1건 — I-39)**

D-28로 타입 레벨은 53비트가 됐는데 **파생 구현은 32비트 그대로**라는 것을 vitest 실측으로 재현했습니다.

| 근거 | 내용 |
|---|---|
| **A. 즉시 크래시** | `derive.ts`의 `assertUint32(worldSeed)`가 `> 0xFFFFFFFF`를 거부 → `deriveSeasonSeed(Number.MAX_SAFE_INTEGER, 1)`이 `RangeError` |
| **B. 개정 근거 미성립** | `NAMESPACE_BITS=2` / `PAYLOAD_BITS=30` 고정, `mix32`·`avalanche`가 전부 `>>> 0` 32비트 연산. D-28이 내세운 "payload 51비트로 충돌 소멸"이 코드상 성립하지 않음 |
| **C. derive만 고쳐도 남는 문제** | `prng.ts`의 `createState(seed)`가 `seed \| 0`(ToInt32)로 상위 21비트 절단 → `createState(x) === createState(x + 2**32)` |

### 3.2 2차 — 팀장 검증

- `npx tsc --noEmit` exit 0, `npx vitest run` 5파일 **107테스트 전량 통과** 직접 재실행 확인.
- 수락 기준 대조: 1팀 "E-01~E-40 존재" → `src/types/*.ts` grep으로 E-01~E-40 **연속 전건** 확인(E-42·E-44~E-47은 선행 정의분). 2팀 "3종 테스트 통과" → `describe` 블록에서 시드 재현성·분포 균등성·입력 순서 셔플 불변성 3종 모두 확인.
- **I-39는 팀장 2차 검증에서 먼저 포착**한 뒤 2팀에 실측 확인을 요청한 건입니다. `derive.ts` 헤더 주석 16·22행이 "32비트로 확정되었으므로 변환 계층이 없습니다"라고 명시된 채 남아 있는데 T2-a만 53비트로 바뀐 것이 단서였습니다.
- **이슈 번호 충돌 정정**: 2팀이 제안한 `I-36`은 이미 "ESLint 가드레일(H-06) 미반영"에 배정된 번호여서, 1팀이 미사용 번호 **I-39**로 등재하도록 조정했습니다.

---

## 4. 조율 결과

| 안건 | 결론 |
|---|---|
| I-39를 5일차에 즉시 고칠 것인가 | **아니오.** 51비트 폭 재설계는 JS 32비트 비트연산 한계를 벗어나야 해(레인 결합 또는 안전정수 곱셈 기반 믹싱) 설계 검토가 필요. 이미 완료된 5일차 산출물에 끼워 넣는 것은 리스크 |
| 그럼 언제 | **6일차(07-28) 착수 시 최우선** — 팀장 승인 완료. ① H-04 인계일이 6일차이고 3팀이 13일차 Mock 팩토리에서 바로 소비 ② 8일차 동결 후에는 배치 반영 절차로 비용 증가 ③ Task 006 6일차 수락 기준 자체가 "시드 파생 구조 온전함"을 전제 |
| 수정 범위 | `derive.ts`(payload 51비트 확장 + `assertUint32` 상한을 `Number.MAX_SAFE_INTEGER` 기준으로 교체) → `prng.ts`(`createState`가 53비트 시드 전량 소비) 순. 그 위에서 100만 회 벤치 + 기존 107테스트 회귀 확인 |
| 소유권 | T2-a 말미 규정대로 **시드 변환·파생 구현 소유는 2팀 단독**. 1팀은 타입·문서만 |

---

## 5. 이슈

### 신규

| ID | 상태 | 요지 | 담당·기한 |
|---|---|---|---|
| **I-39** | OPEN | D-28(worldSeed 32→53비트)이 `src/lib/sim/rng/**` 구현에 미반영 (근거 A/B/C) | **2팀 — 6일차(07-28) H-04 인계 전** |

### 해소

| ID | 처리 |
|---|---|
| **I-19** | 승부차기 브랜드 생성 책임 — 별도 브랜드 미도입, 책임 소재를 `stat.ts` 헤더에 명시 |
| **I-31** | `World` 시간 환산 앵커 4필드 추가 (6팀 물리 스키마 반영은 12일차 대기) |
| **I-32** | T2-a 53비트 개정 완료 (`brand.ts` 브랜드 승격은 7일차 예정) |

### 관찰(등재 보류)

- `FR-EC-001` 원문은 "포인트 원장 사유 코드 12종"이나 실제 열거값은 11개. 문서 표기 오류로 추정되며 `enums.ts`의 `PointTransactionReasonCode` 주석에 기록해 둠. 정정 필요 판단 시 별도 등재.

---

## 6. 마감 검증

| 게이트 | 결과 |
|---|---|
| `npx tsc --noEmit` | ✅ 오류 0 |
| `npm run lint` | ✅ 경고·오류 0 |
| `npm run test` | ✅ 5파일 / 107테스트 통과 |
| 1팀 수락 기준 (E-01~E-40 존재) | ✅ |
| 2팀 수락 기준 (3종 테스트 통과) | ✅ |

---

## 7. 다음 일차 예고

### 6일차 (2026-07-28 화)

| 팀 | 배정 |
|---|---|
| **1팀** | Task 002 — **enum성 값 단일 선언**: 이벤트 23종, 포지션 11군, 부상 4등급, 전술 6종, 페이즈 6종, 마켓 상태, 국적 코드(D-17). 수락: 중복 enum 선언 **0건**. 겸: I-33 `TIEBREAK` · I-37 ASSIST→GOAL 참조 필드 |
| **2팀** | **① I-39 최우선 수정** (`derive.ts` → `prng.ts`) → ② Task 006 동일 시드 100만 회 추출 바이트 단위 동일 벤치. 수락: 재실행 시 바이트 동일 |
| 3·4·5·6팀 | 없음 |

### 동결 카운트다운 — 8일차(07-30)까지 3일

| 반영 일차 | 항목 |
|---|---|
| **6일차** | enums 전량 확정 · I-33 · I-37 · **I-39(2팀 구현)** |
| **7일차** | `brand.ts` 53비트 브랜드 승격 · 시드 계층 서브브랜드 4종(mint는 2팀 한정) · 포인트 정수 고정(DC-08) · enum→번역 키 매핑 규약 · I-15 |
| **8일차** | **SP-1 타입 동결 리뷰 (전 6팀, 2h)** — H-01 인계 |

> **I-39가 6일차에 닫히지 않으면 H-04 인계가 결함을 안은 채 3팀으로 넘어갑니다.** 6일차 최우선 항목입니다.
