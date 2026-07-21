# `src/types/` 타입 ↔ 엔티티 매핑표

> 작성: 1팀 코어·품질팀 / 8일차(2026-07-30) — **SP-1 (H-01) 타입 동결** 산출물
> 정본: `docs/require/05-data-requirements.md` 5.1절(엔티티 개요) — 총 **47개 엔티티(E-01~E-47)**
> 이 표는 정본의 각 엔티티가 **어느 파일의 어느 TypeScript 타입**에 대응하는지 추적하기 위한 것이며,
> 필드 단위 상세 설명은 담지 않는다(필드 설명은 각 파일의 헤더/인라인 주석 참조).
>
> **48일차(2026-09-24) 추가**: D-35(`docs/ISSUES.md` I-239)로 `ClubOwner`(E-48)가 신설됐다 —
> `05-data-requirements.md` 정본에는 없는 **신규 엔티티**다(사용자 요청 발 도메인 모델 변경,
> E-45~47과 달리 원문 47종에 포함돼 있던 잔여분이 아니라 동결 이후 최초의 순수 신규 엔티티).
> 이 표는 이제 총 **48개**를 추적한다.

## 사용법

- **엔티티 ID(E-NN) 또는 파일명으로 찾을 때**: 아래 §1(도메인순, 정본 5.1절과 동일 순서)을 본다.
- **이미 아는 파일 안에서 무엇이 있는지 확인할 때**: 아래 §2(파일순)을 본다.
- **enum성 값·브랜드 ID를 찾을 때**: §3·§4.
- 전 팀은 이 타입을 **`@/types` 배럴에서만** import 한다. `@/types/match` 같은 서브경로 직접
  import는 쓰지 않는다(체크리스트 C-5). 이 표에 적힌 "파일"은 추적용 정보일 뿐 import 경로가 아니다.

---

## 1. 엔티티 → 타입 매핑 (정본 5.1절 도메인 순)

### 1.1 월드/리그 (5)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-01 | World | `world.ts` | `World` | ✅ |
| E-02 | League | `world.ts` | `League` | ✅ |
| E-03 | Season | `world.ts` | `Season` | ✅ |
| E-04 | Team | `world.ts` | `Team` | ✅ |
| E-05 | TeamSeason | `world.ts` | `TeamSeason` | ✅ |

### 1.2 인물 (7)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-06 | Manager | `person.ts` | `Manager` | ✅ (`isActing` 필드 8일차 추가, D-23/I-49) |
| E-07 | Player | `person.ts` | `Player` | ✅ |
| E-08 | PlayerAttribute | `person.ts` | `PlayerAttribute` (34속성 값은 `PlayerAttributeValues` 공유 블록) | ✅ |
| E-09 | PlayerAttributeHistory | `person.ts` | `PlayerAttributeHistory` (`PlayerAttributeValues` 재사용, C-6) | ✅ |
| E-10 | PlayerPosition | `person.ts` | `PlayerPosition` | ✅ |
| E-11 | PlayerState | `person.ts` | `PlayerState` | ✅ |
| E-48 | ClubOwner | `person.ts` | `ClubOwner` | ✅ **48일차 신규**(D-35/I-239, Manager 대칭 — `teamId: null` 공석 허용) |

### 1.3 계약/이동 (3)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-12 | Contract | `economy.ts` | `Contract` | ✅ |
| E-13 | Transfer | `economy.ts` | `Transfer` | ✅ |
| E-14 | Loan | `economy.ts` | `Loan` | ✅ |

> **배치 근거**: Contract/Transfer/Loan은 "인물"이 아니라 "경제"(금액 축 공유, 소비자 기준)에
> 배치했다 — 4일차 팀장 승인 사항, `economy.ts` 파일 헤더 참조.

### 1.4 경기 (4)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-15 | Fixture | `match.ts` | `Fixture` | ✅ |
| E-16 | MatchEvent | `match.ts` | `MatchEvent` | ✅ |
| E-17 | MatchLineup | `match.ts` | `MatchLineup` | ✅ |
| E-18 | Weather | `match.ts` | `Weather` | ✅ |

### 1.5 통계 (5)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-19 | PlayerMatchStat | `stat.ts` | `PlayerMatchStat` (`PlayerStatCoreValues` 공유 블록) | ✅ |
| E-20 | PlayerSeasonStat | `stat.ts` | `PlayerSeasonStat` (`PlayerStatCoreValues` 재사용) | ✅ (`avgRating` 필드 48일차 추가, D-34/I-238 — `PlayerStatCoreValues`에는 없음) |
| E-21 | PlayerCareerStat | `stat.ts` | `PlayerCareerStat` (`PlayerStatCoreValues` 재사용) | ✅ (`avgRating` 필드 48일차 추가, D-34/I-238) |
| E-22 | TeamSeasonStat | `stat.ts` | `TeamSeasonStat` (+ `TeamSplitRecord`/`TeamMarginResult` 보조 블록) | ✅ |
| E-23 | Standing | `stat.ts` | `Standing` | ✅ |

### 1.6 사건 (4)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-24 | Injury | `ops.ts` | `Injury` | ✅ |
| E-25 | YouthProspect | `ops.ts` | `YouthProspect` | ✅ |
| E-26 | NewsFeedItem | `ops.ts` | `NewsFeedItem` | ✅ |
| E-27 | Sanction | `ops.ts` | `Sanction` | ✅ |

### 1.7 경제 (3)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-28 | Sponsor | `economy.ts` | `Sponsor` | ✅ |
| E-29 | SponsorContract | `economy.ts` | `SponsorContract` | ✅ (`signedByOwnerId` 필드 48일차 추가, D-35/I-239 — `teamId` 수입 귀속은 유지) |
| E-30 | PointTransaction | `economy.ts` | `PointTransaction` | ✅ |

### 1.8 명예 (2)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-31 | Award | `stat.ts` | `Award` | ✅ |
| E-32 | Trophy | `stat.ts` | `Trophy` | ✅ |

> **배치 근거**: Award/Trophy는 금액 축이 없는 순수 기록이라 `economy.ts`가 아니라 통계·기록
> 성격이 같은 `stat.ts`에 둔다(5일차, `stat.ts` 파일 헤더 참조).

### 1.9 배팅 (5) — **2차 릴리스, 선정의만**

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-33 | BetMarket | `betting.ts` | `BetMarket` | 🔜 선정의 |
| E-34 | BetSelection | `betting.ts` | `BetSelection` | 🔜 선정의 |
| E-35 | Odds | `betting.ts` | `Odds` | 🔜 선정의 |
| E-36 | Bet | `betting.ts` | `Bet` | 🔜 선정의 |
| E-37 | BetLeg | `betting.ts` | `BetLeg` | 🔜 선정의 |

### 1.10 사용자 (3) — **2차/3차 릴리스, 선정의만**

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-38 | User | `betting.ts` | `User` | 🔜 선정의 |
| E-39 | Wallet | `betting.ts` | `Wallet` | 🔜 선정의 |
| E-40 | WalletTransaction | `betting.ts` | `WalletTransaction` | 🔜 선정의(`TOPUP` 흐름은 3차) |

> **"선정의"의 의미**: 타입은 존재하지만 1차 릴리스에서 `src/lib/data/**` 등 **어떤 어댑터도
> 아직 이 파일을 소비하지 않는다**(`betting.ts` 파일 헤더 참조). 2차 착수 시 타입을 그대로 쓰거나
> 이슈 배치 반영으로 조정한다.

### 1.11 설정/운영 (7)

| ID | 엔티티 | 파일 | TS 타입 | 상태 |
|---|---|---|---|---|
| E-41 | CommonCodeGroup | `config.ts` | `CommonCodeGroup` | ✅ |
| E-42 | CommonCode | `config.ts` | `CommonCode` | ✅ |
| E-43 | CommonCodeHistory | `config.ts` | `CommonCodeHistory` | ✅ |
| E-44 | SimConstantSnapshot | `config.ts` | `SimConstantSnapshot` | ✅ |
| E-45 | CronRun | `ops.ts` | `CronRun` | ✅ **8일차 신규** |
| E-46 | CronGap | `ops.ts` | `CronGap` | ✅ **8일차 신규** |
| E-47 | AuditLog | `ops.ts` | `AuditLog` | ✅ **8일차 신규** |

> **E-45~47이 8일차에 추가된 경위**: 6·7일차 작업표 어느 항목에도 명시적으로 배정되지
> 않아 남아 있던 1차 범위 잔여분이다. E-33~E-40(배팅/사용자)과 달리 "2차 대비 선정의만"
> 대상으로 지정된 적이 없어(정본 5.1절 표가 이 7종을 "설정/운영" 묶음으로 함께 셈), 이
> 매핑표 작성 중 발견해 오늘 `ops.ts`에 반영했다. 상세 경위는 `docs/ISSUES.md` I-45,
> 필드 근거는 `docs/require/05-data-requirements.md` 5.13절.

---

## 2. 파일 → 담긴 타입 (역인덱스)

| 파일 | 담긴 엔티티/타입 |
|---|---|
| `brand.ts` | 브랜드 유틸(`Brand<T,TName>`) + ID 33종(E-01~E-47 PK 다수 + 48일차 `ClubOwnerId` E-48) + 시드 계층(`Seed`/`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`) + `Points` + `Timestamp` |
| `enums.ts` | enum성 문자열 유니온 전량 (§3 참조) — 다른 파일에 재선언 금지(C-6) |
| `world.ts` | E-01~E-05 (`World`/`League`/`Season`/`Team`/`TeamSeason`) |
| `person.ts` | E-06~E-11, E-48 (`Manager`/`Player`/`PlayerAttributeValues`/`PlayerAttribute`/`PlayerAttributeHistory`/`PlayerPosition`/`PlayerState`/`ClubOwner`, 48일차) |
| `match.ts` | E-15~E-18 (`Fixture`/`MatchEvent`/`MatchLineup`/`Weather`) |
| `stat.ts` | E-19~E-23, E-31, E-32 (`PlayerStatCoreValues`/`PlayerMatchStat`/`PlayerSeasonStat`/`PlayerCareerStat`/`TeamSplitRecord`/`TeamMarginResult`/`TeamSeasonStat`/`Standing`/`Award`/`Trophy`) |
| `economy.ts` | E-12~E-14, E-28~E-30 (`Contract`/`Transfer`/`Loan`/`Sponsor`/`SponsorContract`/`PointTransaction`) |
| `betting.ts` | E-33~E-40 (2차 선정의 — `BetMarket`/`BetSelection`/`Odds`/`Bet`/`BetLeg`/`User`/`Wallet`/`WalletTransaction`) |
| `config.ts` | E-41~E-44 (`CommonCodeGroup`/`CommonCode`/`CommonCodeHistory`/`SimConstantSnapshot`) + T12 `EnumTranslationCatalog<T>` 규약 + 번역 대상 경계 절 |
| `ops.ts` | E-24~E-27 (`Injury`/`YouthProspect`/`NewsFeedItem`/`Sanction`) + E-45~E-47 (`CronRun`/`CronGap`/`AuditLog`, 8일차 신규) |
| `index.ts` | 공개 배럴(`export * from './xxx'`) + Task 002 진행 상태표 |

**엔티티 개수 검산**: 5+7+3+4+5+4+3+2+5+3+7 = **48** (정본 5.1절의 47 + 48일차 D-35 신규 E-48
`ClubOwner` 1종. 8일차 E-45~47 반영 후 완결됐던 47에서, 동결 이후 최초로 순수 엔티티 수가 늘었다).

---

## 3. enum성 값 (`enums.ts`) — 대응 엔티티/필드

단일 선언 원칙(C-6)에 따라 전량 `enums.ts` 1곳에만 있다. 아래는 어느 엔티티 필드가 이 값을
쓰는지의 역참조다(정의 상세는 `enums.ts` 인라인 주석).

| 타입 | 확정 일차 | 대응 필드 |
|---|---|---|
| `SeasonPhase` | 6일차 | E-01 `currentPhase`, E-03 `phase` |
| `ManagerStyle` | 3일차 | E-06 `style` |
| `Formation` | — (값 목록 미확정, `string`) | E-06 `preferredFormation`, E-17 `formation` |
| `Position` | 6일차 | E-07 `preferredPosition`, E-10 `position`, E-17 `positionSlot` |
| `PreferredFoot` | 4일차 | E-07 `preferredFoot` |
| `NationalityCode` | 6일차(코드 체계만, 값 목록은 공통코드) | E-07 `nationality` |
| `TasteTag` | — (값 목록 미확정, `string`) | E-07 `tasteTags` |
| `CompetitionType` | 4일차 | E-15 `competitionType`, E-20/E-22 `competitionType` |
| `FixtureStatus` | 4일차 | E-15 `status` |
| `MatchEventType` | 6일차 | E-16 `type` |
| `WeatherType` | 4일차 | E-18 `type` |
| `ContractStatus` | 4일차 | E-12 `status` |
| `TransferType` | 4일차 | E-13 `type` |
| `LoanStatus` | 4일차 | E-14 `status` |
| `InjuryStatus` | 5일차 | E-24 `status` |
| `InjurySeverity` | 6일차 | E-24 `severity` |
| `NewsFeedItemType` | 5일차 | E-26 `type` |
| `SanctionType` | 5일차 | E-27 `sanctionType` |
| `SponsorContractStatus` | 5일차 | E-29 `status` |
| `PointTransactionOwnerType` | 5일차 | E-30 `ownerType` |
| `PointTransactionReasonCode` | 5일차 | E-30 `reasonCode` |
| `AwardType` | 5일차 | E-31 `type` |
| `AwardScope` | 5일차 | E-31 `scope` |
| `TrophyType` | 5일차 | E-32 `type` |
| `BetMarketScope` | 5일차 | E-33 `scope` |
| `BetMarketStatus` | 6일차 | E-33 `status` |
| `BetSelectionResult` | 5일차 | E-34 `result`, E-37 `result` |
| `BetType` | 5일차 | E-36 `type` |
| `BetStatus` | 5일차 | E-36 `status` |
| `UserRole` | 5일차 | E-38 `role` |
| `WalletCurrency` | 5일차 | E-39 `currency` |
| `WalletTransactionReason` | 5일차 | E-40 `reason` |
| `CommonCodeValueType` | 7일차 | E-41 `valueType` |
| `CommonCodeApplyPolicy` | 7일차 | E-41 `applyPolicy` |
| `CommonCodeHistoryAction` | 7일차 | E-43 `action` |
| `CronRunStatus` | **8일차** | E-45 `status` |
| `AuditActorType` | **8일차** | E-47 `actorType` |

---

## 4. 브랜드 ID (`brand.ts`) — 대응 PK

33종 전량이 `Brand<string, 'Xxx'>`. 명칭 규칙은 `{Entity}Id` 1:1 대응이라 별도 표를 두지
않는다 — 예: `E-45 CronRun` → `CronRunId`, `E-48 ClubOwner` → `ClubOwnerId`(48일차, D-35).
예외 없음(uuid PK 엔티티는 전부 이 규칙을 따른다).
자연키를 쓰는 예외 1건: **E-41 CommonCodeGroup**은 PK가 `groupCode: string`(UPPER_SNAKE)이라
브랜드 ID가 없다(`config.ts` 주석 참조).

시드 계층(`Seed`/`WorldSeed`/`SeasonSeed`/`MatchSeed`/`EventSeed`)과 `Points`는 엔티티 PK가
아닌 값 브랜드이므로 이 표에 포함하지 않는다 — `brand.ts` 해당 절 참조.

---

## 5. 동결 상태 (H-01)

**8일차(2026-07-30) 동결 선언.** 이후 `src/types/**`의 변경은 **이슈 등록(`docs/ISSUES.md`)
→ 배치 반영**만 허용된다(C-7) — 단, 아래 5.1의 구분에 따라 **주석 정정은 예외**다.

**SP-1 동결 리뷰 (전 6팀) 결과**: 2·3·4·5·6팀이 각자 담당 Task를 역산해 타입 갭을 검토.
"동결 전 반영 필요"로 판정한 것은 1팀 자체 발견 E-45~47(I-45)·3팀 제기 `Manager.isActing`
(I-49)·팀장 확정 이벤트 생성 규칙 3건(I-53~55)뿐이며 전부 오늘 반영했다. 그 외 지적(브래킷
슬롯·H-15 반환구조·DC-08 퍼센트 범주·stale 주석 등)은 파생 가능/타입 대상 아님/비차단
후속 반영으로 판정해 `docs/ISSUES.md` I-46·I-48·I-50~52에 근거와 함께 기록했다. T5(능력치
브랜드화, I-47)는 미도입으로 최종 결정. 상세는 `docs/ISSUES.md` I-45~I-56.

### 5.1 C-7 배치 반영 절차 (8일차 2차 검증에서 구체화)

**구분 기준 — "타입 구조" vs "주석/문서"**

| 구분 | 예 | 절차 |
|---|---|---|
| **타입 구조** (필드 추가/삭제, 타입 변경, enum 멤버 증감, 시그니처 변경) | `Manager.isActing` 추가(I-49) | 이슈 등록 → **배치 반영**(아래 일정) |
| **주석/문서** (오타 정정, stale 설명 갱신, 번역 대상 여부 명시 등) | `PointTransactionReasonCode` 주석 정정(I-48), `CronRun.errorCode` 번역 비대상 명시(I-56) | **구조 변경이 아니므로 배치를 기다리지 않고 발견 즉시 처리** |

주석 정정을 예외로 둔 이유: 8일차 하루에만 stale 주석이 3건 나왔고, 그중 하나(`PointTransactionReasonCode`)는 방치됐다면 32일차 DB `CHECK` 제약 위반으로 실제 장애가 났을 사안이었다(I-48). 구조 변경과 달리 주석 오류는 **다음 배치까지 방치하는 리스크가 더 크다.**

**타입 구조 변경 배치 일정**

- **11일차부터 5영업일 주기로 개최** — 11·16·21·26·31일차…
- **제출**: 그날 마감 시각까지 `docs/ISSUES.md`에 **OPEN 상태로 등록**된 것만 대상. 등록되지 않은 구두 요청은 접수하지 않으며, 마감 후 등록분은 다음 창구로 자동 이월
- **처리**: 1팀이 일괄 검토 → 반영 또는 기각. **기각 시 사유를 이슈 본문에 기록**해 같은 요청이 재등장하지 않게 한다
- **긴급 예외**: "있으면 좋겠다"가 아니라 **담당 Task 구현이 실제로 막힌 경우에만**, 팀장 승인으로 다음 창구를 기다리지 않고 즉시 판정. 판정 기준은 오늘과 동일 — **파생 계산으로 대체 불가 + 요구사항 근거 확정**이 함께 성립해야 한다(오늘 `Manager.isActing`이 이 기준으로 동결 전 반영까지 격상된 선례, I-49). "있으면 좋겠다"는 예외가 아니다

**⚠️ 창구 일정 변경 이력(근거 명시)**: 1팀 8일차 초안은 11일차 기점을 제안했다. **팀장이 1차로 "4·9·14·19·24·29일차(9일차 첫 창구)"로 승인**했으나, **재검토 후 최종적으로 11일차 기점을 확정**했다 — ① 동결 직후(9일차) 창구가 열리면 "동결이 사실상 마지막 반영 기회"라는 SP-1 메시지가 하루 만에 희석됨(최소 간격 확보) ② 9일차는 Task 004(1팀)·003(3팀)·005(4팀)·009(6팀)이 동시 착수되는 날이라 1팀에 배치 심사까지 얹는 것은 부하 설계상 부적절함. 9일차 첫 창구 안은 폐기됐다.

**11일차 첫 창구 사전 점검(8일차 시점 판정)**: 현재 OPEN 이슈(I-29·I-30·I-34·I-36·I-38·I-40·I-41·I-46·I-51) 중 `src/types/**` 구조 변경이 필요한 것은 **0건**이다. 전부 ① 물리 스키마/툴체인/ESLint 등 이 파일들 밖 작업(I-29·I-30·I-36) ② 값 taxonomy가 아직 없어 판정 불가(I-41) ③ 다른 팀 소유 문서화 책임(I-51) ④ Task 004(9일차, `src/lib/data/**`) 설계 산출물로 직접 나오는 판정이라 C-7 큐를 거치지 않고 9일차 작업 중 자연히 결정됨(I-34·I-38) 중 하나로 분류된다. 9~10일차 사이 새로 등록되는 이슈가 있으면 11일차 창구 전 재확인한다.

상세 근거·전체 룰은 `index.ts` 파일 헤더의 H-01 절 참조(양쪽 동일 내용 유지).
