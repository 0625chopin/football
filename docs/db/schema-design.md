# DB 물리 스키마 설계서

> 작성: 6팀 DB·인프라팀 / Task 009 / 9일차(2026-07-31) 착수, 10일차(2026-08-03)·11일차(2026-08-04) 갱신 중.
> **9일차**: 0~3장(테이블·컬럼·타입·제약) 작성 완료. **10일차**: §6.1 관계 서술(R-01~13, 13개 전부) 추가 완료. **11일차(오늘)**: §6.2 인덱스 설계(14개 공식 인덱스 + 9~10일차 예고 이월분 6곳) 완료. RLS·생명주기는 12일차에 이 파일에 이어서 채운다(§6 참조).
> **수락 기준(9일차, `docs/team-schedule/06-DB인프라팀.md`)**: E-01~E-47 **47개 엔티티 전량**의 테이블·컬럼·타입·제약 매핑. **10일차 수락 기준**: 관계 R-01~R-13(**13개 관계**) 반영 — `TeamSeason` 소속 관리, `Contract`/`Loan` 기반 선수-팀, `fixture.snapshot_id` NOT NULL 포함. **11일차 수락 기준**: 05문서 5.16절 13개 인덱스 + `fixture(status, kickoff_at)` 부분 인덱스(총 14개 인덱스 정의).
> **마이그레이션 미실행** — 이 문서는 설계서일 뿐이며 아직 `apply_migration`을 호출하지 않았다(Supabase 프로젝트 `damruradpliktkrlkakl`는 8일차 대기구간 확인 시점 기준 테이블 0개, `docs/db/SP1-타입정밀도검토-8일차.md` §8). 10일차도 문서 작업만 수행하며 마이그레이션은 13일차(Task 032) 이후다.

---

## 0. 개요

### 0.1 목적과 범위

3팀 이후 실제 마이그레이션(Task 032, 13~18일차)이 그대로 옮겨 쓸 수 있는 수준까지 물리 스키마를 구체화한다. **9일차 범위**는:

- 47개 엔티티 → 테이블 매핑
- 테이블별 컬럼명·물리 타입·NULL 허용 여부
- PK/FK/UNIQUE·enum CHECK 등 **타입 자체에서 바로 도출되는 제약**

**10일차 범위**는 위 9일차 산출물에 이어 다음을 추가했다(§6.1):

- 관계 서술(R-01~R-13, 13개) — FK 방향·카디널리티는 그날 확정하고, 삭제 정책(ON DELETE) 상세는 제안값만 남기고 16일차(Task 032)로 이월

**11일차(오늘) 범위**는 다음을 추가한다(§6.2):

- 인덱스 설계 — 05문서 5.16절 13개 + `fixture(status, kickoff_at)` 부분 인덱스(총 14개), 이 문서가 9~10일차에 남긴 "확정 예고" 6건 처리

**12일차(2026-08-05) 범위**는 다음을 추가했다(§6.3, §8) — 이 절 작성 시점(9일차) 기준으로는 "아직 다루지 않는 것"이었으나 12일차에 전부 완료됨:

- RLS 정책 초안, `match_event` 경과 시간 뷰
- 데이터 생명주기·아카이브 전략
- 도메인 타입 필드 대응표(H-08 인계물, §8)

### 0.2 단일 소스

**`src/types/**`(1팀 코어·품질팀 소유, 8일차 2026-07-30 H-01 동결)가 유일한 단일 소스다.** 이 문서의 모든 필드는 아래 10개 파일을 직접 읽어 도출했다 — 값을 지어내지 않는다(I-41 원칙과 동형).

```
src/types/brand.ts    — 브랜드 ID 32종·시드 계층·Points·Timestamp
src/types/enums.ts    — enum성 값 34종(닫힌) + 3종(열린)
src/types/world.ts    — E-01~05
src/types/person.ts   — E-06~11
src/types/match.ts    — E-15~18
src/types/stat.ts     — E-19~23, E-31, E-32
src/types/economy.ts  — E-12~14, E-28~30
src/types/betting.ts  — E-33~40 (2차 선정의)
src/types/config.ts   — E-41~44
src/types/ops.ts      — E-24~27, E-45~47
```

`docs/require/05-data-requirements.md`(v1.1, 2026-07-20 작성 — **Task 002 착수 이전 초안**)는 참고용 논리 설계 초안으로만 쓴다. 8일차 동결까지 추가된 필드 일부가 이 문서에는 없다 — 확인된 stale 지점:

| 엔티티 | 05문서에 없는 필드(TS엔 있음) | 추가 근거 |
|---|---|---|
| E-01 World | `speedChangedAt`/`worldMinutesAtSpeedChange`/`pausedAt`/`clockRevision` | I-31(5일차), 월드시간↔실시간 환산 앵커 |
| E-06 Manager | `isActing` | I-49(8일차, D-23 대행 판정) |
| E-16 MatchEvent | `xg`(jsonb `detail`에서 정규 필드로 승격), `relatedEventSequence` | 3일차 변경요청 F, I-37/43/44/53~55 |

반대로 **E-45~47(CronRun/CronGap/AuditLog)은 05문서 5.13절과 TS 타입을 전 필드 대조한 결과 불일치 0건**이다(`SP1-타입정밀도검토-8일차.md` §12 확인 완료) — 8일차에 `ops.ts`로 새로 반영됐을 뿐 요구사항 자체는 이전부터 정본에 있었다.

충돌 시 원칙: **`src/types/**` 우선.** 05문서는 스키마 설계 착수 시점의 출발 초안일 뿐 동결 이후 갱신되지 않는다.

`docs/db/SP1-타입정밀도검토-8일차.md`(우리 팀이 8일차 대기구간에 작성)는 정밀도·제약 판정이 이미 끝난 사전검토이며, §10 "매퍼/스키마에서 흡수 가능한 항목" 8건 중 오늘 스키마 설계 단계 소관 5건(시드 CHECK, 퍼센트 정밀도, enum CHECK 산출 규칙, `ownerId` FK 패턴, `avgCondition` 정밀도)을 이 문서에 반영한다 — 나머지 3건(매퍼 단일 캐스트, `generate_typescript_types` 재확인, `audit_log`/`cron_gap` 인덱스)은 각각 17일차·11일차 소관이라 오늘은 언급만 한다(§5).

### 0.3 D-15 단일 월드 — 적용 규칙

`docs/devStep/02.타입스키마설계원칙.md` P-15 그대로 적용한다.

| 계층 | 원칙 | 이 문서에서 |
|---|---|---|
| 도메인 타입(`src/types/**`) | 하위 엔티티에 `worldId` 없음. `World`만 `WorldId` 보유 | 그대로 반영 — 하위 테이블 컬럼표에 도메인 타입에 없는 `world_id`를 **물리 전용**으로 추가할 때는 매번 "물리 전용" 표기 |
| 조회 계층(`src/lib/data/**`) | 현재 월드 1회 해석, 메서드에 월드 인자 없음 | 이 문서 범위 밖(Task 004, 1팀) |
| 물리 스키마(이 팀) | 하위 테이블 `world_id` FK **컬럼은 유지**. 단일 레코드 보장은 DB 제약(부분 유니크 인덱스 등) | §4에 물리 전용 `world_id` 컬럼을 갖는 7개 테이블을 별도 정리. `world` 테이블 자체는 §3.1에서 단일 레코드 제약을 명시 |
| 쿼리 | **전 쿼리 `world_id` 필터 미도입** — 컬럼은 있지만 애플리케이션이 이걸로 스코핑하지 않는다 | 조회 계층(Task 004) 구현 시점 규칙이라 이 문서엔 강제 로직 없음, 컬럼 존재만 보장 |

---

## 1. 물리 표현 공통 규약

### 1.1 명명 규칙

- 테이블명: `snake_case` 단수형(예: `player`, `team_season`). 05문서 관례를 그대로 계승.
- PK: 대다수 `id uuid PRIMARY KEY`. 자연키 예외 2건 — `common_code_group.group_code`(UPPER_SNAKE text), 복합 PK(예: `team_season(team_id, season_id)`).
- FK 컬럼명: `{참조 엔티티 단수}_id` (예: `team_id`, `season_id`). 다형 참조(`ref_type`/`ref_id`, `owner_type`/`owner_id`)는 FK 제약을 걸지 않는다(타입 쪽도 원시 `string`으로 열어둠, 아래 §5.4).
- 시각: 전부 `timestamptz`(DC-07, UTC 저장). 도메인 타입 `Timestamp = string`(ISO-8601)과 대응.
- 개방형 구조: `Readonly<Record<string, unknown>>` 필드는 `jsonb`.
- boolean/int/text: TS `boolean`/정수 의미의 `number`/`string` 그대로.

### 1.2 수치 정밀도 규약

DC-08(포인트/배당/확률/컨디션 4종) + `SP1-타입정밀도검토-8일차.md`가 "9~11일차 스키마 설계에서 반드시 반영"으로 명시한 신규 규약 2종(시드 CHECK, 퍼센트)을 합쳐 이 문서의 확정 규약으로 삼는다.

| 범주 | 물리 타입 | 대응 TS 브랜드/필드 | 제약 | 근거 |
|---|---|---|---|---|
| 포인트 | `bigint` | `Points` | `CHECK (col BETWEEN -9007199254740991 AND 9007199254740991)` | DC-08 + SP1 §2(53비트 CHECK 방어적 적용 무해) |
| 시드 | `bigint` | `Seed`/`WorldSeed`/`SeasonSeed`/`MatchSeed` | **`CHECK (col BETWEEN 0 AND 9007199254740991)`** | SP1 §1 — `bigint` 자체는 63비트까지 허용해 53비트 안전정수 상한(`Number.MAX_SAFE_INTEGER`, D-28)을 보장 못 함. **오늘 반영 필수 항목** |
| 배당 | `numeric(8,2)` | `Odds.decimalOdds` (1.01~500.00) | — | DC-08 |
| 확률 | `numeric(9,8)` | `BetSelection.probability` (0~1) | — | DC-08. 엔진 비교 정밀도(`precision.ts` 6자리)보다 촘촘해 정보 손실 없음(SP1 §3) |
| 컨디션·평점 | `numeric(3,1)` | `PlayerState.condition`, `PlayerMatchStat.matchRating`, `*avgCondition` (1.0~10.0) | — | DC-08. `avgCondition`은 평균 계산 시 반올림 발생 가능하나 표시용이라 허용(SP1 §4, 예외 미적용 유지) |
| 퍼센트 | **`numeric(5,2)`** | `SponsorContract.sharePct`(≤30.00), `Loan.wageSharePct`(기본 50) | — | **SP1 §5 신규 규약** — DC-08 4종 규약 밖의 공백을 오늘 메운다 |
| 배율(감사 전용) | `numeric(4,3)` | `MatchLineup.positionMultiplier` | 재계산 입력 금지(주석 명시) | match.ts 주석 "G" |
| 오버라운드 | `numeric(5,4)` | `BetMarket.overround`(기본 1.0600) | — | 05문서 원안 유지(1차 범위 영향 없음, SP1 §3) |
| 총배당 | `numeric(10,2)` | `Bet.totalOdds` | — | 05문서 원안 |

**범위 CHECK(1~30 능력치, 0~100 평판 등)는 오늘 반영하지 않는다** — `docs/team-schedule/06-DB인프라팀.md` 16일차(Task 032) 항목에 "범위 CHECK 제약"이 명시적으로 배정돼 있어, 오늘 앞당기면 3팀 Task 007(Mock 팩토리) 런타임 검증 설계와 겹쳐 경계가 흐려진다. 이 문서의 컬럼 설명 칸에는 범위를 **주석으로만** 남기고 `[범위 CHECK: 16일차 예정]`으로 표시한다.

---

## 2. 부록 — enum 물리 표현 (단일 정의)

`enums.ts`의 "단일 선언 원칙(C-6)"을 물리 스키마에도 동형 적용한다. **아래 표 1곳에만 CHECK 값 목록을 정의**하고, 3장의 각 테이블 컬럼에서는 `text, CHECK — §2 {TS 타입명}` 형태로 참조만 한다. 여러 곳에 목록을 복사하면 `PointTransactionReasonCode`가 실제로 겪은 사고(SP1 §6 — 근처 한글 주석이 "11개"라고 잘못 적었는데 그대로 신뢰해 정정 전까지 위험했던 사례, I-48)가 반복된다. **아래 개수는 `enums.ts` 리터럴 유니온 본문을 직접 세어 산출했다** — 개수를 언급하는 주석은 참고만 하고 검증 근거로 삼지 않는다(SP1 §6 규칙 재확인).

### 2.1 닫힌 유니온 — `text` + `CHECK (col IN (...))` (34종)

| TS 타입 | 개수 | 리터럴 값 | 대응 필드 예 |
|---|---|---|---|
| `SeasonPhase` | 6 | `REGULAR, CUP_SLOT, PLAYOFF, TIEBREAK, SETTLEMENT, PRESEASON` | `world.current_phase`, `season.phase` |
| `ManagerStyle` | 6 | `ATTACKING, BALANCED, DEFENSIVE, COUNTER, POSSESSION, HIGH_PRESS` | `manager.style` |
| `Position` | 11 | `GK, CB, LB, RB, DM, CM, AM, LW, RW, ST, SS` | `player.preferred_position`, `player_position.position`, `match_lineup.position_slot` |
| `PreferredFoot` | 3 | `LEFT, RIGHT, BOTH` | `player.preferred_foot` |
| `CompetitionType` | 4 | `LEAGUE, PLAYOFF, CUP, TIEBREAK` | `fixture.competition_type`, `player_season_stat.competition_type`, `team_season_stat.competition_type` |
| `FixtureStatus` | 4 | `SCHEDULED, LIVE, FINISHED, VOID` | `fixture.status` |
| `MatchEventType` | 23 | `KICKOFF, SHOT_ON, SHOT_OFF, SHOT_BLOCKED, GOAL, ASSIST, OWN_GOAL, PENALTY_AWARDED, PENALTY_SCORED, PENALTY_MISSED, YELLOW_CARD, SECOND_YELLOW, RED_CARD, FOUL, OFFSIDE, CORNER, SAVE, INJURY, SUBSTITUTION, HALF_TIME, FULL_TIME, EXTRA_TIME_START, PENALTY_SHOOTOUT` | `match_event.type` |
| `WeatherType` | 9 | `CLEAR, CLOUDY, RAIN, HEAVY_RAIN, SNOW, WINDY, HOT, COLD, FOG` | `weather.type` |
| `ContractStatus` | 3 | `ACTIVE, EXPIRED, TERMINATED` | `contract.status` |
| `TransferType` | 4 | `TRANSFER, FREE, TRADE, RELEASE` | `transfer.type` |
| `LoanStatus` | 2 | `ACTIVE, RETURNED` | `loan.status` |
| `InjuryStatus` | 2 | `ACTIVE, RECOVERED` | `injury.status` |
| `InjurySeverity` | 4 | `KNOCK, MINOR, MODERATE, SEVERE` | `injury.severity` |
| `NewsFeedItemType` | 10 | `TRANSFER, LOAN, RETIREMENT, YOUTH_DEBUT, MANAGER_CHANGE, SPONSOR_BANKRUPT, AWARD, INJURY, MILESTONE, SANCTION` | `news_feed_item.type` |
| `SanctionType` | 1 | `REBUILD_SANCTION` | `sanction.sanction_type` |
| `SponsorContractStatus` | 3 | `ACTIVE, EXPIRED, VOIDED` | `sponsor_contract.status` |
| `PointTransactionOwnerType` | 2 | `TEAM, SPONSOR` | `point_transaction.owner_type` |
| `PointTransactionReasonCode` | **12** | `LEAGUE_FINISH, PLAYOFF_PRIZE, CUP_PRIZE, GIANT_KILLING_BONUS, SPONSOR_INCOME, SPONSOR_SHARE, TRANSFER_IN, TRANSFER_OUT, WAGE, REBUILD_GRANT, YOUTH_COST, ACADEMY_INVEST` | `point_transaction.reason_code` — **11이 아니라 12개(SP1 §6 정정 사례, `enums.ts:207-210` 주변 주석은 신뢰 금지)** |
| `AwardType` | 12 | `LEAGUE_MVP, GOLDEN_BOOT, GOLDEN_PLAYMAKER, GOLDEN_GLOVE, BEST_YOUNG_PLAYER, MANAGER_OF_SEASON, TEAM_OF_SEASON, BALLON_DOR, WORLD_XI, CUP_MVP, PLAYOFF_MVP, PLAYER_OF_THE_ROUND` | `award.type` |
| `AwardScope` | 4 | `LEAGUE, WORLD, CUP, PLAYOFF` | `award.scope` |
| `TrophyType` | 4 | `LEAGUE_TITLE, PLAYOFF_TITLE, CUP_TITLE, PROMOTION` | `trophy.type` |
| `BetMarketScope` | 3 | `MATCH, SEASON, TOURNAMENT` | `bet_market.scope` |
| `BetMarketStatus` | 4 | `OPEN, CLOSED, SETTLED, VOIDED` | `bet_market.status` |
| `BetSelectionResult` | 6 | `PENDING, WIN, LOSE, VOID, HALF_WIN, HALF_LOSE` | `bet_selection.result`, `bet_leg.result` |
| `BetType` | 2 | `SINGLE, MULTI` | `bet.type` |
| `BetStatus` | 6 | `PENDING, WON, LOST, VOID, HALF_WON, HALF_LOST` | `bet.status` |
| `UserRole` | 2 | `USER, ADMIN` | `user_profile.role` |
| `WalletCurrency` | 1 | `POINT` | `wallet.currency` |
| `WalletTransactionReason` | 4 | `BET_PLACE, BET_WIN, BET_VOID, TOPUP` | `wallet_transaction.reason` |
| `CommonCodeValueType` | 5 | `INT, DECIMAL, STRING, BOOL, JSON` | `common_code_group.value_type` |
| `CommonCodeApplyPolicy` | 3 | `NEXT_SEASON, IMMEDIATE, NEXT_MARKET` | `common_code_group.apply_policy` |
| `CommonCodeHistoryAction` | 4 | `CREATE, UPDATE, DEACTIVATE, REACTIVATE` | `common_code_history.action` |
| `CronRunStatus` | 4 | `SUCCESS, PARTIAL, FAILED, NOOP` | `cron_run.status` |
| `AuditActorType` | 4 | `HUMAN, ENGINE, ODDS, SETTLEMENT` | `audit_log.actor_type` |

**검산**: 6+6+11+3+4+4+23+9+3+4+2+2+4+10+1+3+2+12+12+4+4+3+4+6+2+6+2+1+4+5+3+4+4+4 = **177개 리터럴, 34개 타입.** (자기검증용 — 표 행 수 34와 일치)

### 2.2 열린 값 — `text` (값 목록이 공통코드 또는 미확정, CHECK 없음)

| TS 타입 | 물리 타입 | 비고 |
|---|---|---|
| `Formation` | `text` | 7종 값 목록 미확정(`enums.ts` 자체가 `string`). CHECK 없이 자유 텍스트, 값 검증은 애플리케이션/공통코드 책임 |
| `TasteTag` | `text[]` | `Player.tasteTags: readonly TasteTag[]` — 값 목록 미확정, 배열 컬럼 |
| `NationalityCode` | `text` | **포맷만 확정** — ISO 3166-1 alpha-2(대문자 2글자). `CHECK (col ~ '^[A-Z]{2}$')`는 형식 검증이며 열거형 CHECK가 아니다. 실제 국가 목록·이름 풀은 공통코드(3팀) 런타임 조회 |

---

## 3. 47 엔티티 테이블 정의

`src/types/README.md` §1의 11개 도메인 그룹 순서를 그대로 따른다(정본 5.1절과 동일 순서). 표기 규칙:
- **컬럼**: TS 필드명을 `snake_case`로 변환.
- **타입**: §1.1/§1.2/§2 규약을 적용한 물리 타입.
- **NULL**: TS 필드가 `| null`이면 nullable, 아니면 `NOT NULL`.
- **제약/설명**: PK·FK·UNIQUE와 TS 주석의 범위 설명(범위 CHECK 자체는 16일차 이월, §1.2).
- **[물리 전용]**: 도메인 타입엔 없지만 D-15 원칙에 따라 물리 스키마에만 추가하는 컬럼.

### 3.1 월드/리그 (E-01~E-05, `world.ts`)

#### `world` (E-01 World) — **단일 레코드 테이블**

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_seed` | bigint | NOT NULL | §1.2 시드 CHECK 적용. 전 파생의 뿌리(D-28, 53비트) |
| `current_season_number` | int | NOT NULL | 1부터 무한 누적 |
| `current_phase` | text | NOT NULL | §2 `SeasonPhase` |
| `speed_multiplier` | numeric(5,2) | NOT NULL | 0.25~20.00 `[범위 CHECK: 16일차 예정]` |
| `is_paused` | boolean | NOT NULL | |
| `paused_total_minutes` | int | NOT NULL | 누적 정지 시간(분), 스케줄 오프셋 |
| `speed_changed_at` | timestamptz | NOT NULL | **I-31(5일차) 앵커** — 월드시간↔실시간 환산 기준 시각. 05문서 stale(누락분) |
| `world_minutes_at_speed_change` | numeric(14,4) | NOT NULL | **I-31 앵커 쌍** — 해당 시각의 누적 월드 분. 배속 곱셈 누적이라 소수 가능 |
| `paused_at` | timestamptz | NULL | **I-31** — 진행 중인 정지 구간 시작 시각. `is_paused=false`면 null |
| `clock_revision` | bigint | NOT NULL | **I-31** — 배속·정지 변경 감지용 단조 증가 값 |
| `created_at` | timestamptz | NOT NULL | |

**테이블 제약**: `world_singleton_uq UNIQUE INDEX ON world ((true))` — D-15 "레코드 1건만 존재"를 부분/표현식 유니크 인덱스로 강제(02문서 원칙, 05문서 39행).

#### `league` (E-02 League)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id` (D-15, 도메인 타입엔 없음) |
| `name` | text | NOT NULL | |
| `tier` | int | NOT NULL | 1/2/3 |
| `team_count` | int | NOT NULL | 24/20/16(공통코드 시드값) |
| `round_interval_min` | int | NOT NULL | 75/90/115(공통코드 시드값) |
| `promotion_slots` | int | NOT NULL | 기본 3 |
| `relegation_slots` | int | NOT NULL | 기본 3 |
| `playoff_team_count` | int | NOT NULL | 10/4/2 |

#### `season` (E-03 Season)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id`(05문서 관례, TS `Season`엔 없음) |
| `season_number` | int | NOT NULL | 1부터 무한 누적 |
| `season_seed` | bigint | NOT NULL | §1.2 시드 CHECK. `hash(world_seed, season_number)`(파생은 2팀 소유, 여기 재구현 안 함) |
| `phase` | text | NOT NULL | §2 `SeasonPhase` |
| `regular_started_at` | timestamptz | NULL | |
| `regular_ends_at` | timestamptz | NULL | |
| `started_at` | timestamptz | NULL | |
| `ended_at` | timestamptz | NULL | |
| `snapshot_id` | uuid | NULL | FK → `sim_constant_snapshot.id`(E-44). 시즌 처리 적용 상수 |

#### `team` (E-04 Team)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id` |
| `name` | text | NOT NULL | |
| `short_name` | text | NOT NULL | 3자 약칭 |
| `founded_season` | int | NOT NULL | |
| `stadium_name` | text | NOT NULL | 번역 비대상(T13, config.ts I-15) |
| `stadium_capacity` | int | NOT NULL | |
| `color_primary` | text | NOT NULL | hex |
| `color_secondary` | text | NOT NULL | hex |
| `crest_seed` | bigint | NOT NULL | §1.2 시드 CHECK. 절차적 SVG 엠블럼 시드(D-16, 외부 자산 미사용) |
| `reputation` | int | NOT NULL | 0~100 `[범위 CHECK: 16일차 예정]` |
| `fan_base` | int | NOT NULL | |
| `academy_level` | int | NOT NULL | 1~5 `[범위 CHECK: 16일차 예정]` |
| `balance` | bigint | NOT NULL | §1.2 포인트. `point_transaction` 원장의 파생 캐시(R-07, 10일차 상세) |
| `financial_crisis` | boolean | NOT NULL | |
| `crisis_consecutive_seasons` | int | NOT NULL | |

> 리그 소속(`league_id`)을 여기 두지 않는다 — 승강으로 매 시즌 바뀌므로 `team_season`이 단일 근거(R-01, 10일차 상세).

#### `team_season` (E-05 TeamSeason) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `team_id` | uuid | NOT NULL | PK(복합) / FK → `team.id` |
| `season_id` | uuid | NOT NULL | PK(복합) / FK → `season.id` |
| `league_id` | uuid | NOT NULL | FK → `league.id`. 해당 시즌 소속 리그 |
| `final_rank` | int | NULL | 시즌 종료 전 null |
| `promoted` | boolean | NOT NULL | |
| `relegated` | boolean | NOT NULL | |
| `tiebreak_applied` | int | NULL | 적용된 타이브레이커 단계(1~7) `[범위 CHECK: 16일차 예정]` |

### 3.2 인물 (E-06~E-11, `person.ts`)

#### `manager` (E-06 Manager)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id` |
| `team_id` | uuid | NULL | FK → `team.id`. null = 공석(T21, 폴백 `BALANCED`) |
| `name` | text | NOT NULL | 고유명사, 번역 비대상(T14) |
| `age` | int | NOT NULL | |
| `style` | text | NOT NULL | §2 `ManagerStyle` |
| `tactical_skill` | int | NOT NULL | 1~30 `[범위 CHECK: 16일차 예정]` |
| `preferred_formation` | text | NOT NULL | §2.2 `Formation`(열린 값) |
| `is_acting` | boolean | NOT NULL | **8일차 신규(I-49, D-23)** — 대행 여부. 05문서 stale(누락분) |
| `reputation` | int | NOT NULL | 0~100 `[범위 CHECK: 16일차 예정]` |
| `contract_until_season` | int | NOT NULL | |
| `tenure_seasons` | int | NOT NULL | |

#### `player` (E-07 Player)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id` |
| `name` | text | NOT NULL | 고유명사, 번역 비대상(T14) |
| `nationality` | text | NOT NULL | §2.2 `NationalityCode`(ISO 3166-1 alpha-2 포맷) |
| `birth_season` | int | NOT NULL | |
| `age` | int | NOT NULL | |
| `preferred_foot` | text | NOT NULL | §2 `PreferredFoot` |
| `preferred_position` | text | NOT NULL | §2 `Position` |
| `pa` | int | NOT NULL | 잠재능력 1~30 `[범위 CHECK: 16일차 예정]`. **공개 API 미노출**(조회 계층 책임, Task 004) |
| `reputation` | int | NOT NULL | 0~100 `[범위 CHECK: 16일차 예정]` |
| `market_value` | bigint | NOT NULL | §1.2 포인트 |
| `taste_tags` | text[] | NOT NULL | §2.2 `TasteTag[]`(열린 값), 1~2개 `[범위 CHECK: 16일차 예정]` |
| `retired_at_season` | int | NULL | 현역이면 null |

#### `player_attribute` (E-08 PlayerAttribute) — `player_id` 1:1

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK / FK → `player.id` |
| `finishing`~`set_pieces`(기술 10) | int ×10 | NOT NULL | 각 1~30 `[범위 CHECK: 16일차 예정]`. 컬럼: `finishing, passing, crossing, dribbling, first_touch, tackling, marking, heading, long_shots, set_pieces` |
| `composure`~`determination`(정신 10) | int ×10 | NOT NULL | 컬럼: `composure, decisions, vision, positioning, work_rate, aggression, leadership, teamwork, anticipation, determination` |
| `pace`~`natural_fitness`(신체 8) | int ×8 | NOT NULL | 컬럼: `pace, acceleration, stamina, strength, agility, balance, jumping, natural_fitness` |
| `reflexes`~`command_of_area`(GK 6) | int ×6 | NOT NULL | 컬럼: `reflexes, handling, one_on_ones, aerial_reach, kicking, command_of_area` |
| `ovr_cached` | int | NOT NULL | 선호 포지션 기준 파생 캐시 |
| `updated_at_season` | int | NOT NULL | |

> 34속성 컬럼은 `PlayerAttributeValues`(person.ts) 공유 블록을 그대로 전개한 것 — `player_attribute_history`가 동일 34컬럼을 반복하므로 아래 표는 여기서 1회만 전개하고 그쪽은 "동일" 표기로 참조한다(단일 선언 원칙, C-6과 동형).

#### `player_attribute_history` (E-09 PlayerAttributeHistory) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK(복합) / FK → `player.id` |
| `season_number` | int | NOT NULL | PK(복합) |
| 34속성 34컬럼 | int ×34 | NOT NULL | `player_attribute`와 동일 컬럼명(성장 곡선용 스냅샷) |
| `ovr` | int | NOT NULL | 시즌 종료 시점 OVR |

#### `player_position` (E-10 PlayerPosition) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK(복합) / FK → `player.id` |
| `position` | text | NOT NULL | PK(복합) / §2 `Position` |
| `proficiency` | int | NOT NULL | 1~5(5=Natural) `[범위 CHECK: 16일차 예정]` |

#### `player_state` (E-11 PlayerState) — `player_id` 1:1

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK / FK → `player.id`. 갱신 빈도 높아 `player`에서 분리(R-13, 10일차 상세) |
| `team_id` | uuid | NULL | FK → `team.id`. FA면 null |
| `on_loan_team_id` | uuid | NULL | FK → `team.id`. 임대 아니면 null |
| `squad_number` | int | NOT NULL | 팀 내 유일(UNIQUE는 10~11일차 인덱스/제약에서 `(team_id, squad_number)` 부분 유니크로 검토) |
| `condition` | numeric(3,1) | NOT NULL | §1.2. 1.0~10.0 |
| `fitness` | int | NOT NULL | 0~100 `[범위 CHECK: 16일차 예정]` |
| `familiarity_seasons` | int | NOT NULL | 연속 재직 시즌 |
| `yellow_accumulated_league` | int | NOT NULL | 리그 누적 경고 — 컵과 독립 판정 |
| `yellow_accumulated_cup` | int | NOT NULL | 컵 누적 경고 |
| `suspension_remaining_league` | int | NOT NULL | |
| `suspension_remaining_cup` | int | NOT NULL | |
| `active_injury_id` | uuid | NULL | FK → `injury.id`. 진행 중 부상 없으면 null |

### 3.3 계약/이동 (E-12~E-14, `economy.ts` 중)

#### `contract` (E-12 Contract)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `player_id` | uuid | NOT NULL | FK → `player.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `start_season` | int | NOT NULL | 기간 1~5시즌(공통코드 `CONTRACT_PARAM`) |
| `end_season` | int | NOT NULL | |
| `wage_per_season` | bigint | NOT NULL | §1.2 포인트 |
| `transfer_fee_paid` | bigint | NOT NULL | §1.2 포인트 |
| `status` | text | NOT NULL | §2 `ContractStatus` |

#### `transfer` (E-13 Transfer)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `player_id` | uuid | NOT NULL | FK → `player.id` |
| `from_team_id` | uuid | NULL | FK → `team.id`. FA 영입이면 null |
| `to_team_id` | uuid | NOT NULL | FK → `team.id` |
| `fee` | bigint | NOT NULL | §1.2 포인트 |
| `type` | text | NOT NULL | §2 `TransferType` |
| `trade_counterpart_player_id` | uuid | NULL | FK → `player.id`. `TRADE`가 아니면 null |
| `negotiation_log` | jsonb | NOT NULL | 시도 횟수·성공 확률·몸값 조정 이력(구체 스키마는 3팀 Task 030 소비 시점 확정) |

#### `loan` (E-14 Loan)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `player_id` | uuid | NOT NULL | FK → `player.id` |
| `owner_team_id` | uuid | NOT NULL | FK → `team.id` |
| `loan_team_id` | uuid | NOT NULL | FK → `team.id` |
| `wage_share_pct` | numeric(5,2) | NOT NULL | §1.2 **퍼센트 신규 규약**. 기본 50 |
| `status` | text | NOT NULL | §2 `LoanStatus` |

### 3.4 경기 (E-15~E-18, `match.ts`)

#### `fixture` (E-15 Fixture)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `competition_type` | text | NOT NULL | §2 `CompetitionType` |
| `league_id` | uuid | NULL | FK → `league.id`. 컵은 null |
| `round` | int | NOT NULL | |
| `round_label` | text | NOT NULL | "8강"·"결승" 등, 번역 비대상(T13) |
| `home_team_id` | uuid | NOT NULL | FK → `team.id` |
| `away_team_id` | uuid | NOT NULL | FK → `team.id` |
| `is_neutral` | boolean | NOT NULL | |
| `kickoff_at` | timestamptz | NOT NULL | |
| `status` | text | NOT NULL | §2 `FixtureStatus` |
| `home_score` | int | NULL | 종료 전 null(C-23, NFR-SEC-004) |
| `away_score` | int | NULL | |
| `ht_home_score` | int | NULL | |
| `ht_away_score` | int | NULL | |
| `et_home_score` | int | NULL | 연장 없었으면 null |
| `et_away_score` | int | NULL | |
| `pk_home` | int | NULL | 승부차기 — 승패 판정 전용, 통산 집계 합산 금지(T18, D-19) |
| `pk_away` | int | NULL | |
| `attendance` | int | NULL | |
| `match_seed` | bigint | NOT NULL | §1.2 시드 CHECK. `hash(season_seed, fixture_id)` |
| `snapshot_id` | uuid | **NOT NULL** | FK → `sim_constant_snapshot.id`. **결정론 필수 축(FR-AD-014, DC-14)** — NOT NULL 자체는 9일차(컬럼 정의) 반영, FK 방향 서술은 **R-04**(10일차 §6.1 — 9일차본의 "R-06" 표기는 오기, 10일차 정정) |
| `simulated_at` | timestamptz | NULL | 미계산이면 null |

#### `match_event` (E-16 MatchEvent)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `match_id` | uuid | NOT NULL | FK → `fixture.id` |
| `sequence` | int | NOT NULL | 경기 내 순번 |
| `minute` | int | NOT NULL | |
| `added_time` | int | NOT NULL | |
| `type` | text | NOT NULL | §2 `MatchEventType`(23종) |
| `team_id` | uuid | NULL | FK → `team.id`. `OWN_GOAL`은 수혜팀 귀속(I-53) |
| `primary_player_id` | uuid | NULL | FK → `player.id` |
| `secondary_player_id` | uuid | NULL | FK → `player.id`. 이벤트별 의미 상이(`SUBSTITUTION` 교체 아웃, `PENALTY_MISSED` 선방 GK 등, I-55) |
| `xg` | numeric(6,4) | NULL | **정규 필드 승격(3일차 변경요청 F)** — 슛 이벤트 아니면 null. 05문서 stale(누락분), `detail` jsonb 파싱 의존 제거가 승격 사유. 정밀도는 026(2팀) 재계산 입력 요구치에 맞춰 소수 4자리로 잡음(운영 중 조정 가능) |
| `related_event_sequence` | int | NULL | **8일차 신규 확정(I-37/43/44/53~55)** — 같은 `match_id` 내 다른 이벤트의 `sequence` 참조(`ASSIST→GOAL`, `PENALTY_SCORED/MISSED→PENALTY_AWARDED`). 05문서 stale(누락분). 재계산 입력 아님(중계 타임라인 표시 전용) |
| `detail` | jsonb | NOT NULL | xG 제외 나머지 상세(슛 위치, 부상 등급, 카드 사유 등) |

**인덱스 예고(11일차 확정, 05문서 5.16절)**: `(match_id, sequence)`, `(match_id, minute)`.

#### `match_lineup` (E-17 MatchLineup) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `match_id` | uuid | NOT NULL | PK(복합) / FK → `fixture.id` |
| `team_id` | uuid | NOT NULL | PK(복합) / FK → `team.id` |
| `player_id` | uuid | NOT NULL | PK(복합) / FK → `player.id` |
| `formation` | text | NOT NULL | §2.2 `Formation`(열린 값) |
| `position_slot` | text | NOT NULL | §2 `Position` |
| `is_starter` | boolean | NOT NULL | |
| `minute_on` | int | NULL | 교체 없으면 null |
| `minute_off` | int | NULL | |
| `position_multiplier` | numeric(4,3) | NOT NULL | §1.2. **감사·표시 전용, 재계산 입력 금지**(match.ts 주석 G) |

#### `weather` (E-18 Weather) — `match_id` 1:1

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `match_id` | uuid | NOT NULL | PK / FK → `fixture.id` |
| `type` | text | NOT NULL | §2 `WeatherType`(9종) |
| `temperature` | int | NOT NULL | |
| `wind_speed` | int | NOT NULL | |
| `effect_modifiers` | jsonb | NOT NULL | 적용된 계수 사본 |

---

### 3.5 통계 (E-19~E-23, E-31, E-32, `stat.ts`)

#### 공유 블록 — `PlayerStatCoreValues` (56컬럼, 단일 정의)

`player_match_stat`(E-19)·`player_season_stat`(E-20)·`player_career_stat`(E-21) **3개 테이블이 아래 56개 컬럼을 공통으로 갖는다.** `stat.ts`가 TS 인터페이스 상속으로 중복 선언을 피한 것과 동형으로, 이 문서도 여기 1곳에만 전개하고 각 테이블 절에서는 "+ 공유 56컬럼"으로 참조한다. 전부 `int NOT NULL`(합산형만 저장, 비율형 파생 지표는 조회 시점 계산 — `shot_accuracy`/`pass_accuracy`/`conversion_rate`/`duel_win_rate`/`save_percentage`는 컬럼으로 두지 않음), 단 `xg`/`xa`/`xg_prevented`는 소수이므로 `numeric(6,4)`.

| 그룹 | 컬럼(snake_case) | 개수 |
|---|---|---|
| 출전 | `appearances, starts, sub_appearances, minutes_played` | 4 |
| 공격 | `goals, assists, shots, shots_on_target, xg`†, `xa`†, `big_chances_created, big_chances_missed, penalties_taken, penalties_scored, free_kick_goals, headed_goals, own_goals` | 13 |
| 패스 | `passes_attempted, passes_completed, key_passes, long_balls_attempted, long_balls_completed, crosses_attempted, crosses_completed, through_balls` | 8 |
| 드리블 | `dribbles_attempted, dribbles_completed, dispossessed, touches` | 4 |
| 수비 | `tackles_attempted, tackles_won, interceptions, clearances, blocks, aerial_duels_attempted, aerial_duels_won, ground_duels_attempted, ground_duels_won, errors_leading_to_shot, errors_leading_to_goal` | 11 |
| 규율 | `fouls_committed, fouls_drawn, yellow_cards, second_yellows, red_cards, offsides` | 6 |
| GK | `saves, shots_faced, goals_conceded, clean_sheets, penalties_faced, penalties_saved, punches, catches, sweeper_actions, xg_prevented`† | 10 |

† = `numeric(6,4)`(소수 지표), 나머지는 `int`. **검산**: 4+13+8+4+11+6+10 = **56** (`stat.ts` `PlayerStatCoreValues` 인터페이스 필드 수와 일치).

> **결정 메모(11일차, 1차 교차 점검 → 팀장 확정)**: 2팀 `src/lib/sim/match/stats.ts`(11일차 Task 023)가 56필드를 Tier A(이벤트 폴드 가능, 16개)/Tier B(불가능, 40개)로 분류했다. `accumulatePlayerMatchStats()`의 반환 타입은 Tier A 16필드만 구조적으로 가질 수 있어(`Pick<PlayerStatCoreValues, TierAStatField>`), 이 함수 결과만으로는 위 56컬럼 전량 `NOT NULL` 제약을 만족하는 `player_match_stat` 행을 만들 수 없다 — 6팀이 1차 교차 점검에서 이 충돌을 지적했다.
> **팀장 판정**: 이 56컬럼의 `NOT NULL`은 **오늘 완화하지 않는다**(0 자리표시자로 채우는 것도 AS-10이 이미 기각한 "사후 임의 배분"과 동종이라 배제). 대신 Tier B 40필드를 채우는 컴포넌트의 **소유를 2팀에 배정**했다. 이 컴포넌트와 그 산출물(56필드 전량 채워진 최종 행)의 계약이 **Task 032(13~18일차, 마이그레이션 실행) 착수 전에 확정**되어야 하며, 6팀이 그 계약을 다시 검수한다. 계약이 032 착수 시점까지 나오지 않으면 6팀은 이 56컬럼의 `NOT NULL` 완화(nullable 전환) 여부를 다시 논의해야 한다 — 그 전까지는 이 문서의 스키마를 오늘 수정하지 않는다.
>
> **후속(11일차, 2팀 `TIER_B_RESIM_DESIGN.md`/`tier-b-resim-contract.ts`)**: Tier B 40필드는 실제로는 채워지는 경로가 **3갈래**로 나뉜다 — 32일차 매퍼 작업 시 이 구분을 기준으로 삼는다.
> 1. **Tier A, 16필드** — `stats.ts` `accumulatePlayerMatchStats()`가 오늘 이미 이벤트 폴드로 산출.
> 2. **`NEEDS_ROSTER_CONTEXT`, 9필드**(출전 4종 + GK 5종: `shotsFaced`/`goalsConceded`/`cleanSheets`/`penaltiesFaced`/`xgPrevented`) — 12일차 `substitution.ts`·14일차 `gk-fallback.ts`·21일차 라인업 선정 인계 후 **이벤트+로스터 컨텍스트 폴드**로 계산(재시뮬레이션 아님, "관측된 사실의 집계"). 이 시점에 Tier A로 재분류될 예정.
> 3. **`DETAIL_SCHEMA_UNDEFINED`, 5필드**(`xa`/`bigChancesCreated`/`bigChancesMissed`/`freeKickGoals`/`headedGoals`) — `MatchEvent.detail` 스키마 확정만 필요(로스터 불필요), Task 024(17~24일차) 시점 곁들여질 예정.
> 4. **`NO_EVENT_TYPE`, 26필드만 진짜 "재시뮬레이션" 대상**(패스 8·드리블 4·수비 11·GK 3) — `MatchEventType`(23종, 폐쇄 집합)에 대응 이벤트가 구조적으로 없어 이벤트 폴드로는 영원히 못 채움. `matchSeed` 기반 별도 통계 모델(이벤트 재실행이 아니라 능력치+시드 기반 기댓값 산출)로 채워 **Tier A 폴드 결과와 병합한 후 저장**한다. 타입 계약(`TierBResimStatField`, 26개 유니온)은 오늘 `src/lib/sim/match/tier-b-resim-contract.ts`로 이미 고정됐고 실 구현은 아직 없다(2팀 일정 제안 — 30~31일차 사이 2일 신설, 팀장 승인 대기, `TIER_B_RESIM_DESIGN.md` §4). **6팀 재검수 대상은 이 26필드 컴포넌트**이며, 나머지 14필드(2·3번 경로)는 각 인계 일차에 자연히 Tier A로 흡수되므로 별도 재검수가 필요 없다.

#### `player_match_stat` (E-19) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `match_id` | uuid | NOT NULL | PK(복합) / FK → `fixture.id` |
| `player_id` | uuid | NOT NULL | PK(복합) / FK → `player.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| + 공유 56컬럼 | — | NOT NULL | 위 표 참조 |
| `match_rating` | numeric(3,1) | NOT NULL | §1.2. 1.0~10.0 |
| `is_motm` | boolean | NOT NULL | |

#### `player_season_stat` (E-20) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK(복합) / FK → `player.id` |
| `season_id` | uuid | NOT NULL | PK(복합) / FK → `season.id` |
| `competition_type` | text | NOT NULL | PK(복합) / §2 `CompetitionType` — **H: 대회 구분 축**, 024 카드 누적 정지가 이 축 전제 |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `league_id` | uuid | NOT NULL | FK → `league.id` |
| + 공유 56컬럼 | — | NOT NULL | 위 표 참조 |
| `contribution_score` | numeric(10,4) | NOT NULL | 성장 보정(FR-PL-011) 입력. 파생값이나 저장 컬럼(TS 주석 명시) |
| `avg_condition` | numeric(3,1) | NOT NULL | §1.2. 평균 계산 반올림 허용(SP1 §4) |
| `motm_awards` | int | NOT NULL | |
| `injuries_count` | int | NOT NULL | |
| `rounds_injured` | int | NOT NULL | |
| `matches_suspended` | int | NOT NULL | |

**인덱스 예고(11일차, 05문서 5.16절)**: `(season_id, league_id, goals DESC)` 등 리더보드 커버링 인덱스.

#### `player_career_stat` (E-21) — `player_id` 1:1

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `player_id` | uuid | NOT NULL | PK / FK → `player.id` |
| + 공유 56컬럼 | — | NOT NULL | 위 표 참조 |
| `total_seasons` | int | NOT NULL | |
| `total_awards` | int | NOT NULL | |
| `total_injuries` | int | NOT NULL | |

#### `team_season_stat` (E-22) — 복합 PK

**설계 결정 — 중첩 구조 평탄화**: TS의 `homeRecord`/`awayRecord`(`TeamSplitRecord` 6필드)와 `biggestWin`/`biggestLoss`(`TeamMarginResult` 4필드, nullable)는 고정 shape의 하위 객체다. `scoringByPeriod` 같은 개방형 `Record`와 달리 필드 집합이 확정돼 있으므로 `jsonb`로 두지 않고 **접두사 컬럼으로 평탄화**한다 — "합산형은 컬럼으로 저장"(E-19 원칙)을 팀 스탯에도 동일 적용하고, 조회 시 JSON 파싱 없이 바로 집계·정렬(`ORDER BY home_wins`)할 수 있게 하기 위함.

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `team_id` | uuid | NOT NULL | PK(복합) / FK → `team.id` |
| `season_id` | uuid | NOT NULL | PK(복합) / FK → `season.id` |
| `competition_type` | text | NOT NULL | PK(복합) / §2 `CompetitionType` |
| `league_id` | uuid | NOT NULL | FK → `league.id` |
| `played, wins, draws, losses, points, goals_for, goals_against` | int ×7 | NOT NULL | 성적 |
| `home_played, home_wins, home_draws, home_losses, home_goals_for, home_goals_against` | int ×6 | NOT NULL | **평탄화**(`TeamSplitRecord`) |
| `away_played, away_wins, away_draws, away_losses, away_goals_for, away_goals_against` | int ×6 | NOT NULL | **평탄화**(`TeamSplitRecord`) |
| `clean_sheets, failed_to_score` | int ×2 | NOT NULL | |
| `biggest_win_opponent_team_id` | uuid | NULL | **평탄화**(`TeamMarginResult`). FK → `team.id`. 무승이면 4컬럼 전부 null |
| `biggest_win_fixture_id` | uuid | NULL | FK → `fixture.id` |
| `biggest_win_goals_for` / `biggest_win_goals_against` | int / int | NULL | |
| `biggest_loss_opponent_team_id` | uuid | NULL | **평탄화**. FK → `team.id`. 무패면 4컬럼 전부 null |
| `biggest_loss_fixture_id` | uuid | NULL | FK → `fixture.id` |
| `biggest_loss_goals_for` / `biggest_loss_goals_against` | int / int | NULL | |
| `current_form` | text | NOT NULL | "WWDLW" 등 |
| `longest_win_streak, longest_unbeaten` | int ×2 | NOT NULL | |
| `shots, shots_on_target` | int ×2 | NOT NULL | |
| `xg_for, xg_against` | numeric(6,4) ×2 | NOT NULL | |
| `scoring_by_period` | jsonb | NOT NULL | 개방형(구간 키 미확정) — 평탄화 대상 아님 |
| `conceding_by_period` | jsonb | NOT NULL | 개방형 |
| `set_piece_goals, open_play_goals, penalty_goals` | int ×3 | NOT NULL | |
| `possession_avg` | numeric(5,2) | NOT NULL | 대체 원시 소스 없어 원본 저장(팀 헤더 주석 근거) |
| `fouls, yellow_cards, red_cards, fair_play_score` | int ×4 | NOT NULL | |
| `squad_size` | int | NOT NULL | |
| `avg_age` | numeric(4,1) | NOT NULL | |
| `avg_ovr` | numeric(5,2) | NOT NULL | |
| `avg_condition` | numeric(3,1) | NOT NULL | §1.2 |
| `squad_market_value` | bigint | NOT NULL | §1.2 포인트 |
| `injuries_active, suspensions_active` | int ×2 | NOT NULL | |
| `minutes_distribution` | jsonb | NOT NULL | 개방형(로테이션 지표) |
| `balance, season_income, season_expense, wage_bill, transfer_spend, transfer_income, sponsor_income, sponsor_payout` | bigint ×8 | NOT NULL | §1.2 포인트 8종 |
| `reputation, fan_base, academy_level` | int ×3 | NOT NULL | |
| `trophies_league, trophies_playoff, trophies_cup` | int ×3 | NOT NULL | |
| `seasons_in_tier1, seasons_in_tier2, seasons_in_tier3` | int ×3 | NOT NULL | |

#### `standing` (E-23 Standing) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `season_id` | uuid | NOT NULL | PK(복합) / FK → `season.id` |
| `league_id` | uuid | NOT NULL | PK(복합) / FK → `league.id` |
| `round` | int | NOT NULL | PK(복합) |
| `team_id` | uuid | NOT NULL | PK(복합) / FK → `team.id` |
| `rank` | int | NOT NULL | |
| `played, won, drawn, lost` | int ×4 | NOT NULL | |
| `gf, ga, gd, points` | int ×4 | NOT NULL | |
| `form` | text | NOT NULL | "WWDLW" 등 |
| `fair_play_score` | int | NOT NULL | |
| `tiebreak_applied` | int | NULL | 1~7 `[범위 CHECK: 16일차 예정]`, 미적용 시 null |

**인덱스 예고(11일차)**: `(season_id, league_id, round, rank)`. 최신 순위는 `round = MAX(round)` 조회(05문서 339행).

### 3.6 사건 (E-24~E-27, `ops.ts` 중)

#### `injury` (E-24 Injury)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `player_id` | uuid | NOT NULL | FK → `player.id` |
| `match_id` | uuid | NULL | FK → `fixture.id`. 훈련 중 등 경기 외 발생이면 null |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `severity` | text | NOT NULL | §2 `InjurySeverity`(4등급) |
| `type_label` | text | NOT NULL | "햄스트링 염좌" 등, 번역 비대상(T13) |
| `occurred_round` | int | NOT NULL | |
| `rounds_out` | int | NOT NULL | |
| `return_round` | int | NOT NULL | |
| `status` | text | NOT NULL | §2 `InjuryStatus` |

#### `youth_prospect` (E-25 YouthProspect)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `player_id` | uuid | NOT NULL | FK → `player.id` |
| `academy_level_at_generation` | int | NOT NULL | 1~5 `[범위 CHECK: 16일차 예정]` |
| `bonus_applied` | boolean | NOT NULL | FR-LG-007 구제 보정 적용 여부 |

#### `news_feed_item` (E-26 NewsFeedItem)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `type` | text | NOT NULL | §2 `NewsFeedItemType`(10종) |
| `headline` | text | NOT NULL | 번역 비대상(T14) |
| `body` | text | NOT NULL | |
| `ref_type` | text | NOT NULL | 다형 참조(FK 없음) |
| `ref_id` | text | NOT NULL | |
| `occurred_at` | timestamptz | NOT NULL | |

#### `sanction` (E-27 Sanction)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `sanction_type` | text | NOT NULL | §2 `SanctionType`(현재 1종, `RELEGATION` 확장 여지) |
| `effects` | jsonb | NOT NULL | 적용된 페널티·구제 항목 |
| `grant_amount` | bigint | NOT NULL | §1.2 포인트. 리빌드 보조금 |

### 3.7 경제 (E-28~E-30, `economy.ts` 중)

#### `sponsor` (E-28 Sponsor)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | **[물리 전용]** FK → `world.id`(TS 주석이 명시적으로 "worldId 필드를 두지 않는다"고 밝힌 지점 — D-15 원칙의 대표 사례) |
| `name` | text | NOT NULL | |
| `industry` | text | NOT NULL | |
| `scale` | int | NOT NULL | 1~5 `[범위 CHECK: 16일차 예정]` |
| `balance` | bigint | NOT NULL | §1.2 포인트. 음수면 부도 |
| `reputation` | int | NOT NULL | |
| `bankrupt_at_season` | int | NULL | 정상이면 null |

#### `sponsor_contract` (E-29 SponsorContract)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `sponsor_id` | uuid | NOT NULL | FK → `sponsor.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `start_season` | int | NOT NULL | 기간 1~10시즌 |
| `end_season` | int | NOT NULL | |
| `income_per_season` | bigint | NOT NULL | §1.2 포인트 |
| `share_pct` | numeric(5,2) | NOT NULL | §1.2 **퍼센트 신규 규약**. ≤30.00 |
| `status` | text | NOT NULL | §2 `SponsorContractStatus` |

**제약 예고(11일차 인덱스/16일차 CHECK)**: 팀당 `status='ACTIVE'` 레코드 ≤ 3(부분 유니크 인덱스 또는 트리거, 05문서 408행 — 이 문서 6장 범위 밖).

#### `point_transaction` (E-30 PointTransaction)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `owner_type` | text | NOT NULL | §2 `PointTransactionOwnerType` |
| `owner_id` | uuid | NOT NULL | **다형 참조, FK 없음** — `owner_type`에 따라 `team.id` 또는 `sponsor.id`(§5.4 결정 참조) |
| `amount` | bigint | NOT NULL | §1.2 포인트. 부호 있음 |
| `reason_code` | text | NOT NULL | §2 `PointTransactionReasonCode`(**12종**, SP1 §6 정정) |
| `ref_type` | text | NOT NULL | 다형 참조(FK 없음) |
| `ref_id` | text | NOT NULL | |
| `balance_after` | bigint | NOT NULL | §1.2 포인트. 이 거래 반영 직후 잔고 스냅샷 |
| `created_at` | timestamptz | NOT NULL | |

**인덱스 예고(11일차)**: `(owner_type, owner_id, created_at)`. **회계 항등식(NFR-QA-005)**: 임의 시점 `owner.balance = Σ amount` — 정합성 배치는 10일차(R-07) 이후 서술.

### 3.8 명예 (E-31~E-32, `stat.ts` 중)

#### `award` (E-31 Award)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `type` | text | NOT NULL | §2 `AwardType`(12종) |
| `scope` | text | NOT NULL | §2 `AwardScope` |
| `league_id` | uuid | NULL | FK → `league.id`. `LEAGUE` 범위가 아니면 null |
| `player_id` | uuid | NULL | FK → `player.id`. 수상 유형별 배타(개인/감독/팀 중 하나만 non-null) |
| `manager_id` | uuid | NULL | FK → `manager.id` |
| `team_id` | uuid | NULL | FK → `team.id` |
| `criteria` | jsonb | NOT NULL | 선정 근거 수치 |

#### `trophy` (E-32 Trophy) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK(단일, TS 주석상 `seasonId`+`teamId` 복합 개념이나 `id` PK도 별도 보유 — 아래 참고) |
| `season_id` | uuid | NOT NULL | FK → `season.id` |
| `team_id` | uuid | NOT NULL | FK → `team.id` |
| `type` | text | NOT NULL | §2 `TrophyType` |
| `league_id` | uuid | NULL | FK → `league.id`. `CUP_TITLE` 등 리그 계열이 아니면 null |

> TS `Trophy`는 `id: TrophyId` 필드를 보유하면서 주석은 "복합 키(`seasonId`+`teamId`)"라 서술한다 — 물리 PK는 TS가 명시적으로 가진 `id`(uuid)로 채택하고, `(season_id, team_id, type)` UNIQUE는 11일차 제약 설계에서 확정한다(오늘은 PK 결정만, 부가 UNIQUE는 범위 밖).

---

### 3.9 배팅 (E-33~E-37, `betting.ts` 중) — **2차 릴리스 선정의**

> `betting.ts` 헤더 주석: "1차에서는 타입만 선정의하고 화면·엔진이 소비하지 않는다." 아래 5개 테이블은 오늘 컬럼·타입·제약을 매핑하되, **1차 마이그레이션(Task 032, 13~18일차) 적용 대상이 아니다** — 2차 착수 시점에 실제 `CREATE TABLE`을 낸다. 표에 `릴리스` 열을 추가해 이 구분을 명시한다.

#### `bet_market` (E-33 BetMarket)

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK | 2차 |
| `scope` | text | NOT NULL | §2 `BetMarketScope` | 2차 |
| `market_type` | text | NOT NULL | FR-BT-002~004 전 마켓(17종 이상) — 선정의 단계라 CHECK 없는 열린 `text`(betting.ts 주석, §2 대상 아님) | 2차 |
| `ref_type` / `ref_id` | text / text | NOT NULL | 다형 참조(FK 없음) — fixture/season+league/competition | 2차 |
| `opens_at` / `closes_at` | timestamptz | NOT NULL | | 2차 |
| `status` | text | NOT NULL | §2 `BetMarketStatus` | 2차 |
| `overround` | numeric(5,4) | NOT NULL | §1.2. 기본 1.0600 | 2차 |
| `sim_count` | int | NOT NULL | 몬테카를로 반복 횟수(N) | 2차 |
| `snapshot_id` | uuid | NOT NULL | FK → `sim_constant_snapshot.id` | 2차 |

#### `bet_selection` (E-34 BetSelection)

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK | 2차 |
| `market_id` | uuid | NOT NULL | FK → `bet_market.id` | 2차 |
| `label` | text | NOT NULL | 표시용(번역 대상 여부 소비 시점 확정) | 2차 |
| `outcome_key` | text | NOT NULL | | 2차 |
| `probability` | numeric(9,8) | NOT NULL | §1.2. 0~1 | 2차 |
| `result` | text | NOT NULL | §2 `BetSelectionResult` | 2차 |

#### `odds` (E-35 Odds)

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK | 2차 |
| `selection_id` | uuid | NOT NULL | FK → `bet_selection.id` | 2차 |
| `decimal_odds` | numeric(8,2) | NOT NULL | §1.2. 1.01~500.00 | 2차 |
| `computed_at` | timestamptz | NOT NULL | | 2차 |
| `is_current` | boolean | NOT NULL | | 2차 |

#### `bet` (E-36 Bet)

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK | 2차 |
| `user_id` | uuid | NOT NULL | FK → `user_profile.id`(§3.10) | 2차 |
| `stake` | bigint | NOT NULL | §1.2 포인트 | 2차 |
| `total_odds` | numeric(10,2) | NOT NULL | | 2차 |
| `potential_return` | bigint | NOT NULL | §1.2 포인트 | 2차 |
| `type` | text | NOT NULL | §2 `BetType` | 2차 |
| `status` | text | NOT NULL | §2 `BetStatus` | 2차 |
| `placed_at` | timestamptz | NOT NULL | | 2차 |
| `settled_at` | timestamptz | NULL | 정산 전 null | 2차 |
| `odds_snapshot` | jsonb | NOT NULL | 제출 시점 배당 동결 | 2차 |
| `server_received_at` | timestamptz | NOT NULL | 클라이언트 시계 미신뢰(C-23) | 2차 |
| `ip_hash` | text | NOT NULL | 사후 배팅 차단 증거(041) | 2차 |

#### `bet_leg` (E-37 BetLeg) — 복합 PK

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `bet_id` | uuid | NOT NULL | PK(복합) / FK → `bet.id` | 2차 |
| `selection_id` | uuid | NOT NULL | PK(복합) / FK → `bet_selection.id` | 2차 |
| `odds_at_placement` | numeric(8,2) | NOT NULL | §1.2. 베팅 시점 동결값 | 2차 |
| `result` | text | NOT NULL | §2 `BetSelectionResult` | 2차 |

### 3.10 사용자 (E-38~E-40, `betting.ts` 중) — **2차/3차 릴리스 선정의**

#### `user_profile` (E-38 User) — **테이블명 설계 결정**

> TS 주석: "`id`는 `auth.users` 참조(Supabase 도입 후, 3차)". 테이블명을 `user`가 아니라 **`user_profile`**로 정한다 — 근거 ① `user`는 Postgres 예약어라 매 쿼리에 식별자 이스케이프가 필요해진다 ② Supabase가 인증 도입 시 `auth.users`를 이미 쓰므로 `public.user`를 만들면 이름이 겹쳐 혼동 위험이 크다(Supabase 프로젝트에서 프로필 테이블을 별도 이름으로 두는 것은 흔한 관례). `id`는 오늘 FK 제약을 걸지 않는다 — `auth.users`는 037/049일차(Task 037 Auth 도입) 이전에는 존재하지 않으므로, 그 전까지 이 테이블 자체가 생성되지 않는다(2차/3차 릴리스 선정의).

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK. **037일차부터** `auth.users(id)` FK(오늘은 미생성 테이블이라 FK 대상 없음, 설계만 문서화) | 2·3차 |
| `display_name` | text | NOT NULL | | 2·3차 |
| `role` | text | NOT NULL | §2 `UserRole` | 2·3차 |

#### `wallet` (E-39 Wallet) — `user_id` 1:1

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `user_id` | uuid | NOT NULL | PK / FK → `user_profile.id` | 2·3차 |
| `balance` | bigint | NOT NULL | §1.2 포인트 | 2·3차 |
| `currency` | text | NOT NULL | §2 `WalletCurrency`(1종, `POINT`) | 2·3차 |

#### `wallet_transaction` (E-40 WalletTransaction)

| 컬럼 | 타입 | NULL | 제약/설명 | 릴리스 |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | PK | 2·3차(`TOPUP` 흐름은 3차) |
| `user_id` | uuid | NOT NULL | FK → `user_profile.id` | 2·3차 |
| `amount` | bigint | NOT NULL | §1.2 포인트 | 2·3차 |
| `reason` | text | NOT NULL | §2 `WalletTransactionReason` | 2·3차 |
| `ref_bet_id` | uuid | NULL | FK → `bet.id`. `BET_*` 사유가 아니면 null | 2·3차 |
| `balance_after` | bigint | NOT NULL | §1.2 포인트 | 2·3차 |

### 3.11 설정/운영 (E-41~E-47, `config.ts` + `ops.ts` 중)

#### `common_code_group` (E-41 CommonCodeGroup) — 자연키 PK

> **13일차 이슈 배치 반영(I-93)**: `min_value`/`max_value`/`json_schema` 3컬럼을 이 테이블에서
> **`common_code`(E-42)로 이동**했다(1차 교차 점검 → 팀장 확정, 3팀 `catalog.ts` 실측 반례와
> 1팀 동결 타입 배치 반영 병행 승인). 근거: 그룹당 한 쌍뿐인 범위/스키마로는 같은 그룹 안에서
> 코드마다 유효 도메인이 다른 경우(`SQUAD_PARAM.MIN`=22 vs `GK_MIN`=2,
> `ROUND_INTERVAL_MIN.LEAGUE_1`=75 vs `LEAGUE_3`=115, `CUP_PARAM.BYE_COUNT`=스칼라 vs
> `INSERT_ROUNDS`=배열)를 표현할 수 없다 — `unit`이 이미 코드 레벨(E-42)에 있는 것과 같은 이유
> (값의 스토리지 계약이 아니라 파라미터별 도메인 지식이라 그룹이 아니라 코드에 속한다).
> `value_type`/`apply_policy`는 "그룹의 코드들이 공유하는 스토리지 계약"이라 그룹 레벨 그대로
> 유지한다 — 이동 대상은 범위/스키마 3컬럼뿐이다. 상세 근거는 §9.3.

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `group_code` | text | NOT NULL | **PK(자연키, uuid 아님)**. UPPER_SNAKE(예: `ROUND_INTERVAL_MIN`) |
| `group_name` | text | NOT NULL | |
| `description` | text | NOT NULL | |
| `value_type` | text | NOT NULL | §2 `CommonCodeValueType` |
| `apply_policy` | text | NOT NULL | §2 `CommonCodeApplyPolicy`(FR-AD-013) |
| `related_fr` | text[] | NOT NULL | 관련 FR ID 목록 |
| `is_active` | boolean | NOT NULL | 기본 true |
| `sort_order` | int | NOT NULL | |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |

#### `common_code` (E-42 CommonCode)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `group_code` | text | NOT NULL | FK → `common_code_group.group_code` |
| `code` | text | NOT NULL | 그룹 내 키 |
| `world_id` | uuid | NULL | FK → `world.id`. **null = 전역 기본값**, 값 있으면 월드 오버라이드(D-15 단일 월드에서도 필드는 유지 — TS 도메인 타입 자체에 이미 있는 필드, §0.3 "물리 전용"과 구분) |
| `value` | text | NOT NULL | |
| `value_num` | numeric | NULL | 숫자형 아니면 null |
| `value_json` | jsonb | NULL | JSON형 아니면 null |
| `min_value` | numeric | NULL | **13일차 이동(I-93, §8.3)** — 숫자형 허용 하한. 코드가 숫자형이 아니거나 하한이 아직 정해지지 않았으면 null(§9.3 "과도기" 참조) |
| `max_value` | numeric | NULL | **13일차 이동(I-93)** — 숫자형 허용 상한. null 의미는 `min_value`와 동일 |
| `json_schema` | jsonb | NULL | **13일차 이동(I-93)** — JSON형 값 검증 스키마. JSON형이 아니거나 스키마가 아직 정해지지 않았으면 null |
| `default_value` | text | NOT NULL | **D-26: 갱신 경로는 초기 시드 적재뿐** — UPDATE 시 페이로드 제외는 런타임 규약(C-14 코드 리뷰 체크리스트) |
| `description` | text | NOT NULL | |
| `unit` | text | NULL | "분"·"%"·"pt" 등 |
| `sort_order` | int | NOT NULL | |
| `is_active` | boolean | NOT NULL | 기본 true |
| `effective_from_season` | int | NULL | `NEXT_SEASON` 정책용 |
| `created_at` / `updated_at` | timestamptz | NOT NULL | |
| `updated_by` | uuid | NULL | FK → `user_profile.id` |

**제약 예고(16일차)**: `UNIQUE (group_code, code, world_id)`(15일차 인덱스로 별도 처리), 숫자형 CHECK — **13일차 이동으로 `min_value`/`max_value`/`value_num`이 전부 같은 테이블(`common_code`)의 같은 행에 있게 되어, 애초 예고했던 것과 달리 트리거가 아니라 plain CHECK로 충분하다**:
```sql
CHECK (min_value IS NULL OR max_value IS NULL OR value_num IS NULL
       OR value_num BETWEEN min_value AND max_value)
```
NULL 통과 조건은 의도적이다 — 3팀 공통코드 카탈로그(36그룹)의 범위 값은 37일차 이후 그룹별 점진 채움 예정(§9.3)이라, 아직 범위가 안 정해진 코드는 이 CHECK를 무조건 통과해야 한다. JSON형 CHECK(`value_json NOT NULL WHEN value_type='JSON'`)는 05문서 570~574행 원안 유지, 오늘(13일차)은 컬럼 정의까지만.

> **시드 데이터 반영 메모(11일차, 1차 교차 점검 → 팀장 확정)**: 1팀 `src/lib/data/polling.ts`·3팀 `src/lib/config/fallback.ts`가 오늘 `UI_PARAM` 그룹의 폴링 주기 안전망 폴백값(원래 `POLL_INTERVAL_MS=5000`/`POLL_LIVE_MS=3000`)이 `docs/business/03-budget-plan.md` §2.5(대역폭 최대 비용 항목, 현실적 케이스 5초=월 $133.7 vs 30초=월 $1.6)와 충돌함을 6팀이 지적했다. **팀장 판정**: 정상 경로 값(공통코드 실제 값)은 ROADMAP 원문대로 5초/라이브 3초를 유지하고, **안전망 폴백값만 30초/15초로 완화**한다(1팀·3팀에 각각 지시 완료, 6팀 조치 불필요). 다만 이 "정상값 5초/3초"는 **이 `common_code` 테이블에 `UI_PARAM` 그룹 실데이터가 적재돼야 실제로 공급**된다 — 6팀이 공통코드 시드 SQL(3팀 031a 산출물, H-17 인계)을 적용하는 시점(현재 team-schedule 기준 39일차, `docs/team-schedule/06-DB인프라팀.md`)에 `UI_PARAM` 그룹의 `POLL_INTERVAL_MS`/`POLL_LIVE_MS`/`LEADERBOARD_MIN_APPEARANCE_PCT`(코드 이름은 `polling.ts` 11일차 헤더 "폴링 주기 값" 절이 C-03a 1차 가정으로 채택한 UPPER_SNAKE 이름 — 3팀이 다른 이름으로 확정하면 함께 갱신) 3개 코드가 반드시 포함되어 있는지 그때 확인한다. 042(58~62일차 성능 최적화)에서 실사용 데이터로 폴링 주기 재검토 예정이므로, 그 시점 참고용으로 예산 문서 인용을 여기 남겨 둔다.

#### `common_code_history` (E-43 CommonCodeHistory) — **append-only**

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `common_code_id` | uuid | NOT NULL | FK → `common_code.id` |
| `group_code` | text | NOT NULL | 비정규화(코드 삭제 후 추적용) |
| `code` | text | NOT NULL | 비정규화 |
| `action` | text | NOT NULL | §2 `CommonCodeHistoryAction` |
| `old_value` / `new_value` | text | NULL | |
| `old_effective_from_season` / `new_effective_from_season` | int | NULL | |
| `changed_by` | uuid | NOT NULL | FK → `user_profile.id` |
| `changed_at` | timestamptz | NOT NULL | |
| `reason` | text | NOT NULL | **필수**(NFR-CFG-002), 빈 문자열 금지는 런타임 검증 |

**제약**: UPDATE/DELETE 미허용(NFR-SEC-010) — RLS로 강제(12일차 범위).

#### `sim_constant_snapshot` (E-44 SimConstantSnapshot)

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `world_id` | uuid | NOT NULL | FK → `world.id`. **TS 도메인 타입에 이미 있는 필드** — §0.3 "물리 전용" 목록(§4)에 포함하지 않는다(구분 근거) |
| `snapshot_hash` | text | NOT NULL | **UNIQUE**. 값 집합 SHA-256(중복 제거 키) |
| `constants` | jsonb | NOT NULL | `{ "GROUP_CODE": { "CODE": value, ... } }` 전체 값 집합 |
| `created_at` | timestamptz | NOT NULL | |
| `first_used_season` | int | NOT NULL | |
| `ref_count` | int | NOT NULL | 참조 Fixture/Season 수(관측용, NFR-CFG-006 ≤20건 목표) |

#### `cron_run` (E-45 CronRun) — **8일차 신규**

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `started_at` | timestamptz | NOT NULL | |
| `finished_at` | timestamptz | NULL | 실행 중이면 null |
| `duration_ms` | int | NOT NULL | |
| `lock_acquired` | boolean | NOT NULL | false면 no-op |
| `fixtures_processed` | int | NOT NULL | |
| `is_catch_up` | boolean | NOT NULL | FR-AD-019 |
| `status` | text | NOT NULL | §2 `CronRunStatus` |
| `retry_count` | int | NOT NULL | |
| `error_code` | text | NULL | 실패 시에만. 번역 비대상(T13) |
| `error_message` | text | NULL | 번역 비대상(T13) |
| `snapshot_hash` | text | NULL | 사용한 상수 스냅샷 해시(uuid FK 아님 — `sim_constant_snapshot.snapshot_hash` 문자열 참조). NOOP이면 null |

#### `cron_gap` (E-46 CronGap) — **8일차 신규**

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `gap_started_at` | timestamptz | NOT NULL | |
| `gap_ended_at` | timestamptz | NULL | 진행 중 중단이면 null |
| `gap_minutes` | int | NOT NULL | |
| `missed_fixture_count` | int | NOT NULL | Fixture 단위(라운드 아님, 05문서 원문 — 어드민 콘솔 라벨 주의) |
| `recovered_at` | timestamptz | NULL | catch-up 완료 시각, 미회복이면 null |
| `detected_at` | timestamptz | NOT NULL | |

#### `audit_log` (E-47 AuditLog) — **append-only, 8일차 신규**

| 컬럼 | 타입 | NULL | 제약/설명 |
|---|---|---|---|
| `id` | uuid | NOT NULL | PK |
| `actor_type` | text | NOT NULL | §2 `AuditActorType` |
| `actor_id` | text | NULL | `actor_type='HUMAN'`일 때만 값(다형 — `user_profile.id` 등, FK 없음) |
| `action` | text | NOT NULL | 다형(예: `WORLD_RESET`) |
| `target_type` / `target_id` | text | NOT NULL | 다형 참조(FK 없음) |
| `payload` | jsonb | NOT NULL | |
| `created_at` | timestamptz | NOT NULL | |

**제약**: UPDATE/DELETE 미허용(NFR-SEC-010) — RLS로 강제(12일차 범위). **인덱스는 05문서 5.16절 공백 — 11일차에 `audit_log(target_type, target_id)`·`audit_log(actor_type, created_at)`·`cron_gap(gap_started_at DESC)` 신규 정의 예정**(SP1 §12 이월 사항).

---

## 4. D-15 물리 전용 `world_id` 컬럼 목록

도메인 타입(`src/types/**`)엔 없지만 D-15 물리 스키마 원칙("하위 테이블 `world_id` FK 컬럼은 그대로 유지")에 따라 이 문서가 오늘 추가한 컬럼이다. 05문서가 이미 이 7개 테이블에 `world_id`를 명시해 둔 관례를 그대로 따랐다(§0.2).

| 테이블 | 엔티티 | 근거 |
|---|---|---|
| `league` | E-02 | 05문서 59행 |
| `season` | E-03 | 05문서 74행 |
| `team` | E-04 | 05문서 89행 |
| `manager` | E-06 | 05문서 126행 |
| `player` | E-07 | 05문서 140행 |
| `sponsor` | E-28 | 05문서 391행, `economy.ts` 주석("Sponsor는 `worldId` 필드를 두지 않는다"는 도메인 타입 설명과 물리 컬럼은 별개) |
| `common_code` | E-42 | **TS 도메인 타입 자체에 이미 `worldId: WorldId \| null` 있음** — 물리 전용이 아니라 도메인 타입이 명시적으로 요구하는 필드(§3.11 각주로 구분 완료) |

> `common_code`는 엄밀히는 "물리 전용 추가"가 아니라 TS 타입에 이미 있는 필드다. 이 표에 함께 실은 이유는 "월드 스코프를 갖는 테이블"이라는 D-15 관점에서 7개를 한 번에 조망하기 위함이며, §3.11에서 이미 이 구분을 각주로 명시했다. `sim_constant_snapshot.world_id`도 TS 원본 필드라 이 표에서 제외한다(§3.11 각주 참조).

그 외 엔티티(`contract`/`fixture`/`player_attribute` 등)는 `player_id`/`team_id`/`season_id` FK 체인을 통해 간접적으로 월드에 소속되므로 직접 `world_id`를 두지 않는다 — 이 설계는 05문서가 명시적으로 `world_id`를 부여한 테이블만 따르고 나머지는 확장하지 않는 보수적 선택이다(불필요한 컬럼 증식 방지).

---

## 5. 오늘 반영한 SP1 사전판정 요약

`docs/db/SP1-타입정밀도검토-8일차.md` §10 "매퍼/스키마에서 흡수 가능한 항목" 8건 중 스키마 설계(9~11일차) 소관 5건을 오늘 확정했다.

| # | 항목 | 오늘 반영 위치 | 상태 |
|---|---|---|---|
| 1 | 시드 4계열 `CHECK (0 ≤ col ≤ 9007199254740991)` | §1.2 수치 정밀도 규약 | ✅ 반영 |
| 2 | 퍼센트 필드(`sharePct`/`wageSharePct`) `numeric(5,2)` 신규 정의 | §1.2, §3.3 `loan.wage_share_pct`, §3.7 `sponsor_contract.share_pct` | ✅ 반영 |
| 3 | enum CHECK 목록은 `enums.ts` 리터럴 본문을 직접 세어 산출 | §2 부록(177개 리터럴/34종 검산, `PointTransactionReasonCode`=12개 재확인) | ✅ 반영 |
| 4 | `PointTransaction.ownerId` 다형참조 FK 패턴 | §3.7 `point_transaction.owner_id` — FK 없는 단일 `uuid` 컬럼으로 결정(이중 nullable FK 방식은 기각 — 다형 참조 컬럼이 이미 `ref_type`/`ref_id` 패턴과 일관되게 설계돼 있어 `owner_type`이 이미 분기값을 제공하므로 추가 FK 없이도 매퍼가 흡수 가능, SP1 §7 "둘 다 매퍼 흡수 가능" 판단에서 단순성 우선으로 선택) | ✅ 반영 |
| 5 | `avgCondition` 등 파생 평균 필드 정밀도 예외 여부 | §3.5 `player_season_stat.avg_condition`/§3.5 `team_season_stat.avg_condition` — `numeric(3,1)` **유지**(예외 미적용, SP1 §4 "허용 가능한 손실" 판단 그대로 채택) | ✅ 반영(현상 유지 결정) |
| 6 | 매퍼(`src/lib/data/supabase/mapper.ts`) 단일 캐스트 지점 | — | ⏭ 17일차(Task 032) 소관, 오늘 미착수 |
| 7 | `generate_typescript_types` bigint→TS 타입 재확인 | — | ⏭ 17일차 소관, 오늘 미착수(테이블이 아직 없어 확인 불가) |
| 8 | `audit_log`/`cron_gap` 인덱스 신규 정의 | §3.11 `audit_log` 절 각주로 이월 명시 | ⏭ 11일차 소관, 오늘은 언급만 |

추가로 오늘 새로 내린 설계 결정(SP1 문서엔 없던 사항):
- **`user` → `user_profile` 명명**: Postgres 예약어 회피 + `auth.users` 이름 충돌 회피(§3.10).
- **`world` 단일 레코드 제약**: 표현식 유니크 인덱스 `((true))`로 명시(§3.1, D-15/02문서 원칙의 구체화).
- **`TeamSeasonStat` 중첩 구조 평탄화**: `home_record`/`away_record`/`biggest_win`/`biggest_loss`를 접두사 컬럼으로 전개(§3.5).
- **`MatchEvent.xg`/`relatedEventSequence` 컬럼 반영**: 05문서 stale 지점을 TS 우선 원칙으로 보완(§3.4).

---

## 6. 관계 서술 및 범위 밖 절

### 6.1 관계 서술 (R-01~R-13) — **10일차(2026-08-03) 작성 완료**

> **정본**: `docs/require/05-data-requirements.md` §5.14 "관계 서술 (핵심)"(712~728행) — 13개 관계(R-01~R-13)의 존재·카디널리티에 대한 단일 정본이다(`ROADMAP.md` Task 009 근거란이 "05문서 5.14~5.17"을 명시). 다만 각 관계에 관여하는 **필드명·NULL 허용·물리 타입은 05문서가 아니라 이 문서 §3(9일차, `src/types/**` TS를 직접 읽어 도출)을 그대로 인용**한다 — CLAUDE.md 단일 소스 표(I-58, 9일차 결정) 원칙대로 05문서는 필드 갱신 대상이 아니며 관계의 "왜 이렇게 엮이는가" 서술만 참조 가치가 있다.
>
> **정정 로그(9일차→10일차)**: 9일차본이 §3.4 `fixture.snapshot_id` 설명과 이 절 플레이스홀더에서 "R-06"이라 지칭한 관계는 05문서 정본 대조 결과 **R-04**(Fixture → SimConstantSnapshot, NOT NULL)였다. R-06은 별개로 **Sponsor ↔ Team(N:M via SponsorContract)** 관계다. 오늘 §3.4와 아래 표를 정본 번호로 정정했다.
>
> **서술 비대칭 안내**: R-01·R-07·R-13은 9일차에 이미 §3 컬럼 정의 단계에서 관계 근거까지 함께 서술됐다(중복 서술을 피하는 단일 선언 원칙, §2 서두 C-6과 동형). 아래 표에서 이 3건은 "정의 + TS 근거 + §3 참조"로 짧게만 적는다. 나머지 10건(R-02~R-06, R-08~R-12)은 이 절이 최초 서술처이므로 "05문서 정의 → TS 재확인 근거 → 물리 표현(FK·카디널리티) → 삭제정책" 4단으로 전개한다. 삭제정책(ON DELETE)은 이 팀의 16일차(Task 032 "제약" 항목, `docs/team-schedule/06-DB인프라팀.md`)에서 최종 확정 대상이라 오늘은 설계 제안만 남기고 **`[삭제정책 확정: 16일차 예정]`**로 이월 표시한다(§1.2가 이미 쓰는 `[범위 CHECK: 16일차 예정]` 각주 패턴 재사용).

#### 이미 §3에서 서술된 관계 (참조만)

| # | 관계 | 05문서 정의 | TS 근거 | §3 반영 위치 |
|---|---|---|---|---|
| R-01 | World → League(3) → TeamSeason → Team | 팀의 리그 소속은 시즌마다 바뀌므로 `Team.league_id`를 두지 않고 `TeamSeason`으로 관리. 승강 히스토리·티어별 재적 시즌의 단일 근거 | `world.ts:117` `Team` 주석 "리그 소속은 승강으로 매 시즌 바뀌므로 `leagueId`를 두지 않는다. 소속의 단일 근거는 `TeamSeason`"; `world.ts:146` `TeamSeason` 주석 "승강 히스토리와 티어별 재적 시즌의 단일 근거" | §3.1 `team`(222행, `league_id` 컬럼 없음) + `team_season`(245행, `league_id` FK 보유) + 243행 각주 |
| R-07 | PointTransaction | `owner_type`으로 Team/Sponsor 원장을 통합 관리. `balance`는 원장의 파생 캐시이며 정합성 배치를 둔다 | `economy.ts:132` `PointTransaction` 주석 "`Team.balance`/`Sponsor.balance`는 이 원장의 파생 캐시다(회계 항등식, NFR-QA-005)" | §3.1 `team.balance`(239행), §3.7 `point_transaction`(665행) + 680행 회계 항등식 각주 |
| R-13 | Player → PlayerState | 1:1이지만 갱신 빈도가 매우 높아(라운드마다) `Player`에서 분리 — 쓰기 경합·캐시 무효화 범위 축소 | `person.ts:203` PlayerState 주석 "갱신 빈도가 매우 높아 분리했다(**R-13**, 쓰기 경합·캐시 무효화 범위 축소)" — TS 원문에 R-13 태그 명시 | §3.2 `player_state.player_id`(329행, 인라인 주석에 R-13 태그 명시) |

#### 오늘 신규 서술 (10건)

| # | 관계 | 05문서 정의 | TS 재확인 근거 | 물리 표현(FK·카디널리티) | 삭제정책 |
|---|---|---|---|---|---|
| R-02 | Player ↔ Team | 직접 FK가 아니라 **활성 `Contract`**로 결정. 임대 중이면 `Loan`이 실제 출전 팀을 결정 — **출전 가능 팀 = `Loan.active ? loan_team : contract.team`** | `person.ts:213` `PlayerState.teamId` 주석 "R-02: 실제 출전 팀 결정은 Contract/Loan이 담당"; `person.ts:216` `onLoanTeamId` "임대 중 실제 출전 팀. 임대 아니면 null"; `economy.ts:49-58` `Contract`, `economy.ts:80-95` `Loan` | `player`(§3.2)엔 `team_id` 컬럼이 없다(의도적 설계). `player_state.team_id`(§3.2 330행, FK→`team.id`, null=FA)와 `player_state.on_loan_team_id`(331행, FK→`team.id`, null=임대 아님)가 "현재 유효 팀" 캐시이고, `contract(player_id, team_id, status)`(§3.3)·`loan(player_id, owner_team_id, loan_team_id, status)`(§3.3)가 원장. 카디널리티 Player 1:N Contract(시계열)·1:N Loan(시계열), 임의 시점 활성 건은 각 ≤1(부분 유니크 인덱스 후보) | `contract`/`loan` → `player`/`team` RESTRICT 제안(계약사 유실 방지) `[삭제정책 확정: 16일차 예정]` |
| R-03 | Fixture → MatchEvent (1:N) | 이벤트 로그가 **SSOT**. `PlayerMatchStat`·`TeamSeasonStat`은 이벤트에서 파생되며 언제든 재계산 가능해야 한다(FR-ST-005) | `match.ts:88` MatchEvent 주석 "스탯의 SSOT(**R-03**)"; `stat.ts:30` 헤더 "`TeamSeasonStat`에도 동일 원칙을 적용한다(**R-03**)"; `stat.ts:199` "중복 저장 시 **R-03** 회귀 추적이 두 곳으로 갈라짐" | `match_event.match_id`(§3.4 418행) FK→`fixture.id`, 1:N. `player_match_stat`/`player_season_stat`/`team_season_stat`은 별도 저장 테이블이지만 값은 `match_event` 집계로 언제든 재생성 가능해야 한다는 **불변식**이지 스키마 FK로 강제되는 관계는 아니다(운영/테스트 책임, NFR-QA 계열). 인덱스는 §3.4 430행에 이미 예고 | `fixture` 삭제 시 `match_event` CASCADE 제안 `[삭제정책 확정: 16일차 예정]` |
| R-04 | Fixture → SimConstantSnapshot (N:1) | **NOT NULL**. 결정론의 필수 축. 다수 Fixture가 동일 스냅샷을 공유한다(해시 중복 제거) | `match.ts:42,81-82` Fixture "`snapshotId`는 NOT NULL — 결정론 보장(FR-AD-014, DC-14)"; `config.ts:136` `SimConstantSnapshot.snapshotHash` "값 집합의 SHA-256(중복 제거 키). UNIQUE" | §3.4 `fixture.snapshot_id`(410행, 이미 NOT NULL 반영) FK→`sim_constant_snapshot.id`. N:1 — `snapshot_hash` UNIQUE가 동일 값 집합의 중복 스냅샷 생성을 막아 다수 Fixture의 공유·재사용을 유도 | `sim_constant_snapshot`은 참조 중 삭제 금지 — RESTRICT 제안 `[삭제정책 확정: 16일차 예정]` |
| R-05 | Standing (season × league × round × team) | 라운드별 순위 스냅샷. "N라운드 시점 순위" 조회와 시즌 마켓 배당 입력으로 사용 | `stat.ts:291-296` `Standing` 필드(`seasonId, leagueId, round, teamId, rank, ...`) — TS에 명시적 R-ID 태그는 없음, 구조로 확인 | §3.5 `standing`(566행) 복합 PK `(season_id, league_id, round, team_id)`, 최신 순위는 `round = MAX(round)`(581행 이미 명시). `season_id`/`league_id`/`team_id` 전부 N:1 FK | `season`/`league`/`team` 삭제 시 CASCADE 제안(스냅샷성 데이터) `[삭제정책 확정: 16일차 예정]` |
| R-06 | Sponsor ↔ Team (N:M via SponsorContract) | 팀당 활성 계약 ≤ 3 제약. 스폰서 부도 시 관련 계약 전건 `VOIDED` | `economy.ts:118-129` `SponsorContract(sponsorId, teamId, status)` — 팀당 ACTIVE≤3은 TS 레벨에서 강제하지 않음(§3.7 663행 "제약 예고(11일차 인덱스/16일차 CHECK)" 이미 명시) | `sponsor_contract.sponsor_id`(§3.7) FK→`sponsor.id`, `sponsor_contract.team_id` FK→`team.id` — N:M 조인 테이블. "부도 시 전건 VOIDED"는 애플리케이션/트리거 책임(3팀 소비), 스키마는 FK·상태 컬럼만 제공 | 물리 DELETE 대신 상태 전환(`VOIDED`)이 원칙 — `sponsor`→`sponsor_contract` RESTRICT 제안 `[삭제정책 확정: 16일차 예정]` |
| R-08 | BetMarket → BetSelection → Odds | 배당은 갱신되므로 이력 테이블로 두고 `is_current`로 현재값을 지정. `Bet.odds_snapshot`이 제출 시점 배당을 **동결**해 사후 배당 변경이 정산에 영향을 주지 않게 한다 | `betting.type-test.ts:32` "Odds.isCurrent로 최신값을 구분한다(이력 테이블 설계, **R-08**)" — TS 테스트 코드에 R-08 태그 명시 | §3.9 `bet_market.id`(720행) ← `bet_selection.market_id`(735행) ← `odds.selection_id`(746행), `odds.is_current` boolean(749행). `bet.odds_snapshot` jsonb(764행) + `bet_leg.odds_at_placement`(774행) 이중 동결. **전 테이블 2차 릴리스**(1차 마이그레이션 대상 아님, §3.9 헤더 명시) | 2차 릴리스 대상이라 오늘 확정 불필요 `[삭제정책 확정: 032 2차 착수 시점]` |
| R-09 | Award(인물) vs Trophy(클럽) | 조회 경로를 단순화하기 위해 분리. 선수 상세는 Award만, 클럽 상세는 Trophy만 조회 | `stat.ts:316-328` `Award`(`playerId`/`managerId`/`teamId` 배타적 nullable), `stat.ts:331-338` `Trophy`(`teamId`만, player/manager 필드 없음) — 구조로 확인, TS에 R-ID 태그 없음 | §3.8 `award`(684행)와 `trophy`(698행) — 독립 테이블, 서로 FK 참조 없음. Award의 "player/manager/team 중 하나만 non-null" 배타 규칙은 CHECK 후보 | `season` 삭제 시 CASCADE 제안 `[삭제정책 확정: 16일차 예정]` |
| R-10 | CommonCodeGroup → CommonCode → CommonCodeHistory | 그룹이 타입·범위·발효 정책을 정의하고, 코드가 값을 담고, 이력이 변경을 추적 | `config.ts:70` `CommonCode.groupCode` 주석 "FK → `CommonCodeGroup.groupCode`"; `config.ts:107-108` `CommonCodeHistory.commonCodeId` | §3.11 `common_code.group_code` FK→`common_code_group.group_code`(자연키, 814행), `common_code_history.common_code_id` FK→`common_code.id`(856행). 1:N:N 체인, history는 append-only(851행 이미 명시) | `common_code_group`은 구조상 삭제 없음 원칙(RESTRICT), `common_code_history`는 원본 삭제와 무관 보존(비정규화 `group_code`/`code` 컬럼이 근거, 857~858행) `[삭제정책 확정: 16일차 예정]` |
| R-11 | CommonCode → SimConstantSnapshot | 직접 FK가 아니라 **값 집합의 직렬화 결과**로 연결. 코드가 이후 변경되어도 스냅샷은 불변 | `config.ts:138` `SimConstantSnapshot.constants` "`{ "GROUP_CODE": { "CODE": value, ... }, ... }` 전체 값 집합"; `config.ts:136` `snapshotHash` "값 집합의 SHA-256" | §3.11 `sim_constant_snapshot`(868행)에 `common_code`로의 FK 컬럼은 **존재하지 않음**(의도적) — `constants` jsonb가 생성 시점 `common_code` 값 전체를 복사 저장하는 스냅샷이라 원본이 바뀌어도 과거 스냅샷은 불변 | 해당 없음(FK 자체가 없어 삭제 전파 대상 아님) |
| R-12 | PlayerAttribute vs PlayerAttributeHistory | 전자는 현재값(1:1), 후자는 시즌별 스냅샷(1:N). 성장 곡선 UI는 후자를 조회 | `person.ts:169` `PlayerAttribute` "Player와 1:1"; `person.ts:179-181` `PlayerAttributeHistory` "복합 키(`playerId`+`seasonNumber`). `PlayerAttributeValues`를 그대로 재사용해 `PlayerAttribute`와 필드 중복 선언을 만들지 않는다(C-6)" | §3.2 `player_attribute.player_id`(298행, PK/FK 1:1) vs `player_attribute_history(player_id, season_number)`(308행, 복합PK, 1:N) — 34속성 공유 블록은 이미 1회만 전개(306행 각주) | `player` 삭제 시 둘 다 CASCADE 제안(현재값·이력 모두 선수 종속) `[삭제정책 확정: 16일차 예정]` |

#### 13개 관계 반영 자기검증

`docs/team-schedule/06-DB인프라팀.md` 10일차 수락 기준 — "13개 관계 반영" 충족 여부를 자체 확인한다.

| # | 관계 | 상태 |
|---|---|---|
| R-01 | World → League(3) → TeamSeason → Team | ✅ (§3 선반영 참조) |
| R-02 | Player ↔ Team (Contract/Loan) | ✅ |
| R-03 | Fixture → MatchEvent (SSOT) | ✅ |
| R-04 | Fixture → SimConstantSnapshot | ✅ (9일차 "R-06" 오기 정정 완료) |
| R-05 | Standing 복합키 | ✅ |
| R-06 | Sponsor ↔ Team (SponsorContract) | ✅ |
| R-07 | PointTransaction 원장 | ✅ (§3 선반영 참조) |
| R-08 | BetMarket → BetSelection → Odds | ✅ |
| R-09 | Award vs Trophy | ✅ |
| R-10 | CommonCodeGroup → CommonCode → CommonCodeHistory | ✅ |
| R-11 | CommonCode → SimConstantSnapshot(간접) | ✅ |
| R-12 | PlayerAttribute vs PlayerAttributeHistory | ✅ |
| R-13 | Player → PlayerState | ✅ (§3 선반영 참조) |

**검산: 13/13 ✅.**

---

### 나머지 절 — 11~12일차에 순차 완료 (작성 당시 플레이스홀더)

> 이 소제목은 10일차 작성 시점의 상태를 남긴 기록이다. 아래 §6.2는 11일차, §6.3은 12일차에 각각 완료됐다(`docs/team-schedule/06-DB인프라팀.md` 일차별 작업표대로 이 파일에 순차적으로 이어 씀) — 더 이상 플레이스홀더가 아니다.

### 6.2 인덱스 설계 — **11일차(2026-08-04) 완료**

#### 6.2.0 오늘 범위

| 오늘(11일차) 다루는 것 | 오늘 다루지 않는 것(별도 일차) |
|---|---|
| `docs/require/05-data-requirements.md` 5.16절 13개 인덱스 + `fixture(status, kickoff_at)` 부분 인덱스(총 **14개**, §6.2.1) | 수치 정밀도 규약(포인트/배당/확률/컨디션) — **§1.2로 9일차에 이미 반영 완료**(§5 항목 1~2 참조), 오늘 재작업 없음 |
| 이 문서가 §3(9일차)·§6.1(10일차)에 남긴 "10~11일차 확정" 예고 6건 처리(§6.2.2) — `player_state.squad_number`(332행), `trophy` UNIQUE(708행), `common_code` UNIQUE(847행), `sponsor_contract` 활성 계약 ≤3 판정(663행), `audit_log`/`cron_gap` 신규 인덱스(921행, SP1 §12 이월) | RLS 정책, `match_event` 경과 시간 뷰, 데이터 생명주기·아카이브 전략 — **12일차(§6.3~6.4)** |
| — | 범위 CHECK 제약(1~30 능력치 등), `sponsor_contract` 활성 계약 ≤3의 실제 구현(트리거/EXCLUDE), `common_code` 숫자형·JSON형 CHECK — **16일차(Task 032 "제약")** |

**명명 규칙(오늘 신규 선언)**: UNIQUE 인덱스는 9일차 선례(`world_singleton_uq`, §3.1 188행)를 따라 `<table>_<의미>_uq`. 일반 btree 인덱스는 지금까지 이 문서에 선례가 없어 오늘 `idx_<table>__<col1>_<col2>...` 패턴을 신규 도입한다(테이블-컬럼 경계를 이중 언더스코어로 시각적으로 구분).

#### 6.2.1 05문서 5.16절 대응 — 공식 14개 인덱스

05문서 2번째 행(`fixture (status, kickoff_at)`)은 "목적" 칸에 이미 "부분 인덱스: status='SCHEDULED'"라고 적어 뒀지만, 실제 소비처를 보면 **일반 조회용**(Task 016 일정/결과 화면 — SCHEDULED가 아닌 LIVE·FINISHED 상태도 킥오프 시각순으로 봐야 함)과 **크론 탐지용**(Task 033 — SCHEDULED만 스캔해 인덱스 크기를 최소화해야 함)이 서로 다른 물리 인덱스를 요구한다. 그래서 이 한 행을 **일반 복합 인덱스 + 부분 인덱스 2개**로 분리한다 — `docs/team-schedule/06-DB인프라팀.md`·`ROADMAP.md` Task 009가 "13개 인덱스 + `fixture(status, kickoff_at)` 부분 인덱스"라고 별도로 강조하고 완료 판정을 "14개 인덱스 정의"로 못박은 것과 정확히 대응한다(13행 + 이 분리로 생긴 1행 = 14).

| # | 테이블 | 인덱스 컬럼 | 타입 | 목적 | 근거 | 릴리스 |
|---|---|---|---|---|---|---|
| 1 | `fixture` | `(season_id, league_id, round)` | 일반 | 라운드별 일정 조회 | 05문서 759행 | 1차 |
| 2 | `fixture` | `(status, kickoff_at)` | 일반 | 상태별 경기 목록 조회 — 일정/결과 화면(Task 016), LIVE·FINISHED 포함 전 상태 대상 | 05문서 760행(컬럼 조합), Task 016(FR-UI-004 일정/결과) 소비 근거로 오늘 용도 구분 | 1차 |
| 3 | `fixture` | `(status, kickoff_at) WHERE status = 'SCHEDULED'` | **부분** | **크론의 킥오프 도래 탐지**(Task 033) — SCHEDULED 행만 담아 인덱스 크기 최소화 | 05문서 760행 "부분 인덱스: status='SCHEDULED'" 원문, ROADMAP Task 009·team-schedule 11일차 행이 "+ 부분 인덱스"로 별도 요구 | 1차 |
| 4 | `match_event` | `(match_id, sequence)` | 일반 | 타임라인 조회 | 05문서 761행, 이 문서 §3.4 430행 "인덱스 예고" | 1차 |
| 5 | `match_event` | `(match_id, minute)` | 일반 | 경과 시간 필터(NFR-SEC-004, 클라이언트 시계 미신뢰) | 05문서 762행 | 1차 |
| 6 | `player_match_stat` | `(player_id, match_id)` | 일반 | 선수별 경기 스탯 조회 | 05문서 763행 | 1차 |
| 7 | `player_season_stat` | `(season_id, league_id, competition_type, goals DESC)` | 일반(리더보드 커버링 후보) | 통계 랭킹 — 득점왕 등(Task 019) | 05문서 764행("goals DESC 외 지표별") + **`competition_type` 추가는 오늘 판단**: §3.5(500~502행) 복합 PK가 `(player_id, season_id, competition_type)`이라 LEAGUE/CUP 스탯이 별도 행으로 존재함 — 이 컬럼 없이 정렬하면 컵대회 득점이 리그 득점왕 리더보드에 섞인다. 다른 지표(assists 등) 인덱스는 실사용 쿼리 패턴 확인 후 26~37일차 대기구간 과제("④ 인덱스 튜닝 — `EXPLAIN` 기반 사전 검토", `docs/team-schedule/06-DB인프라팀.md` §4)에서 추가 여부를 판단한다 — 오늘은 05문서가 명시한 대표 지표(goals) 1건만 정의 | 1차 |
| 8 | `standing` | `(season_id, league_id, round, rank)` | 일반 | 순위표, 최신 라운드는 `round = MAX(round)` 조회 | 05문서 765행, 이 문서 §3.5 581행 "인덱스 예고" | 1차 |
| 9 | `point_transaction` | `(owner_type, owner_id, created_at)` | 일반 | 원장 조회·잔고 검증(회계 항등식, NFR-QA-005) | 05문서 766행, 이 문서 §3.7 680행 "인덱스 예고" | 1차 |
| 10 | `common_code` | `(group_code, world_id, is_active)` | 일반 | 그룹 단위 일괄 로딩(3팀 `src/lib/config/loader.ts`) | 05문서 767행 | 1차 |
| 11 | `sim_constant_snapshot` | `(snapshot_hash)` | **UNIQUE** | 값 집합 중복 제거 | 05문서 768행. §3.11 874행이 이미 "**UNIQUE**"로 명시해 둔 컬럼 제약을 오늘 물리 인덱스로 확정 | 1차 |
| 12 | `cron_run` | `(started_at DESC)` | 일반 | 최근 실행 조회(`/admin/scheduler`) | 05문서 769행 | 1차 |
| 13 | `bet` | `(user_id, placed_at DESC)` | 일반 | 내 베팅 목록 | 05문서 770행 | **2차**(§3.9 헤더 714행 — 1차 마이그레이션 대상 아님) |
| 14 | `bet_market` | `(status, closes_at)` | 일반 | 마감 처리 배치 | 05문서 771행 | **2차** |

#### 6.2.2 이 문서가 남긴 "확정 예고" 이월분 처리 (6건)

9~10일차 작업 중 즉시 결론 내지 않고 "11일차 확정"으로 미뤄 둔 지점을 오늘 전부 처리한다. 05문서 5.16절에는 없는 이 문서 자체의 약속이므로 §6.2.1의 14개와 별도로 센다.

| # | 예고 위치 | 항목 | 처리 유형 | 결정 | 근거 |
|---|---|---|---|---|---|
| 1 | §3.2 332행 | `player_state.squad_number` 팀 내 유일성 | **정의** | `player_state_squad_number_uq UNIQUE (team_id, squad_number) WHERE team_id IS NOT NULL` — FA(`team_id IS NULL`)는 등번호 개념이 없어 제외 | 332행 "팀 내 유일(UNIQUE는 10~11일차 인덱스/제약에서 부분 유니크로 검토)", §3.2 330행 `team_id` nullable(FA) |
| 2 | §3.8 708행 | `trophy` 중복 방지 | **정의** | `trophy_season_team_type_uq UNIQUE (season_id, team_id, type)` | 708행 "11일차 제약 설계에서 확정" |
| 3 | §3.11 847행 | `common_code` 제약 3종 | **부분 정의 + 정정** | UNIQUE만 오늘 정의하되, 847행이 제안한 단일 `UNIQUE (group_code, code, world_id)`을 **2개의 부분 유니크 인덱스로 조정**한다 — Postgres UNIQUE 인덱스는 NULL을 서로 다른 값으로 취급해 `world_id IS NULL`(전역 기본값) 행끼리는 `(group_code, code)`가 같아도 유일성 위반으로 잡히지 않는다(표준 UNIQUE 인덱스의 NULL 처리 특성). `common_code_global_uq UNIQUE (group_code, code) WHERE world_id IS NULL` + `common_code_override_uq UNIQUE (group_code, code, world_id) WHERE world_id IS NOT NULL`으로 분리해 전역 기본값 쪽도 실제로 유일성이 강제되게 한다. 숫자형/JSON형 CHECK 2종은 **16일차로 재이월**(아래 정정 로그) | 847행 + NULL 유일성 처리에 관한 Postgres 표준 동작(추론) |
| 4 | §3.7 663행 | `sponsor_contract` 팀당 ACTIVE ≤ 3 | **이월 판정**(정의 불가) | 부분 유니크 인덱스는 "해당 조건을 만족하는 행이 유일함"(N=1)만 표현할 수 있다 — "최대 3건까지 허용"(N>1 카운트 상한)은 인덱스로 표현되는 제약이 아니라 **트리거 또는 애플리케이션 검증**이 필요하다. 05문서 자신도 408행에서 "이 문서 6장 범위 밖"이라 명시했으므로, 16일차(Task 032 "제약") 트리거 설계로 **전량 이월**한다 | 663행, RDBMS 일반 원리(부분 유니크 인덱스의 표현 범위) |
| 5 | §3.11 921행 | `audit_log` 조회 패턴 2종 | **정의** | `idx_audit_log__target (target_type, target_id)`(대상별 조회) + `idx_audit_log__actor_created (actor_type, created_at)`(행위자별·기간별 조회) | `SP1-타입정밀도검토-8일차.md` §12(174~179행) 후보안 그대로 채택 — "조회는 항상 조건절(행위자별/대상별/기간별)이 붙는다" |
| 6 | §3.11 921행 | `cron_gap` 최근 중단 조회 | **정의** | `idx_cron_gap__gap_started (gap_started_at DESC)` | SP1 §12 후보안, `/admin/scheduler`(5팀 Task 021) 소비 대상 |

**정정 로그(9일차→11일차, 항목 3)**: §3.11 847행이 9일차에 "제약 예고(11일차): UNIQUE + 숫자형 CHECK + JSON형 CHECK"를 한 문장으로 뭉뚱그려 전부 "(11일차)"로 표기했다. 오늘 재검토 결과 UNIQUE는 인덱스 범주라 이번 절 소관이 맞지만, 나머지 두 CHECK(`value_num NOT NULL AND min_value ≤ value_num ≤ max_value`, `value_json NOT NULL`)는 §1.2 말미가 정의한 "범위 CHECK 제약"과 같은 종류(컬럼 값 유효성 CHECK)이며 `docs/team-schedule/06-DB인프라팀.md` 16일차 행이 "범위 CHECK 제약"을 명시적으로 그날 소관으로 두고 있다. 따라서 이 두 CHECK는 16일차로 재이월하며, §3.11 847행 원문은 이 문서의 다른 "확정 로그" 사례(§6.1 974행)와 동일한 방식으로 지금 여기서 바로잡는다.

#### 6.2.3 자기검증

**공식 14개 인덱스(§6.2.1)**

| # | 테이블·인덱스 | 상태 |
|---|---|---|
| 1~3 | `fixture` ×3(일반 2 + 부분 1) | ✅ |
| 4~5 | `match_event` ×2 | ✅ |
| 6 | `player_match_stat` ×1 | ✅ |
| 7 | `player_season_stat` ×1 | ✅ |
| 8 | `standing` ×1 | ✅ |
| 9 | `point_transaction` ×1 | ✅ |
| 10 | `common_code` ×1 | ✅ |
| 11 | `sim_constant_snapshot` ×1(UNIQUE) | ✅ |
| 12 | `cron_run` ×1 | ✅ |
| 13 | `bet` ×1(2차) | ✅ |
| 14 | `bet_market` ×1(2차) | ✅ |

**검산: 14/14 ✅.**

**이월분 처리(§6.2.2)**

| # | 항목 | 상태 |
|---|---|---|
| 1 | `player_state.squad_number` UNIQUE | ✅ 정의 완료 |
| 2 | `trophy` UNIQUE | ✅ 정의 완료 |
| 3 | `common_code` UNIQUE(+ CHECK 2종 재이월 정정) | ✅ 처리 완료 |
| 4 | `sponsor_contract` ≤3 | ✅ 이월 판정 완료(16일차) |
| 5 | `audit_log` 인덱스 2종 | ✅ 정의 완료 |
| 6 | `cron_gap` 인덱스 1종 | ✅ 정의 완료 |

**검산: 6/6 ✅**(전건 "처리 완료" — 4번은 정의가 아니라 이월 판정이 결론이며, 이 역시 확정된 처리로 카운트).

#### 6.2.4 부록 — SQL 정의(참고용, `apply_migration` 미실행)

마이그레이션은 13일차(Task 032) 이후에 실제 적용한다. 아래는 §6.2.1(14개) + §6.2.2(`common_code`가 NULL 유일성 처리를 위해 2개로 분리되어 7개 — §6.2.2 자체는 여전히 "6건 처리"로 카운트, 물리 인덱스 수와 처리 항목 수는 별개) = **총 21개 물리 인덱스**를 Task 032가 그대로 옮겨 쓸 수 있도록 정리한 것이며, 오늘은 어떤 DDL도 실행하지 않는다.

```sql
-- §6.2.1 공식 14개 (05문서 5.16절 + fixture 부분 인덱스)
CREATE INDEX idx_fixture__season_league_round ON fixture (season_id, league_id, round);
CREATE INDEX idx_fixture__status_kickoff_at ON fixture (status, kickoff_at);
CREATE INDEX idx_fixture__status_kickoff_at_scheduled ON fixture (status, kickoff_at)
  WHERE status = 'SCHEDULED';
CREATE INDEX idx_match_event__match_sequence ON match_event (match_id, sequence);
CREATE INDEX idx_match_event__match_minute ON match_event (match_id, minute);
CREATE INDEX idx_player_match_stat__player_match ON player_match_stat (player_id, match_id);
CREATE INDEX idx_player_season_stat__season_league_competition_goals
  ON player_season_stat (season_id, league_id, competition_type, goals DESC);
CREATE INDEX idx_standing__season_league_round_rank ON standing (season_id, league_id, round, rank);
CREATE INDEX idx_point_transaction__owner_created ON point_transaction (owner_type, owner_id, created_at);
CREATE INDEX idx_common_code__group_world_active ON common_code (group_code, world_id, is_active);
CREATE UNIQUE INDEX sim_constant_snapshot_hash_uq ON sim_constant_snapshot (snapshot_hash);
CREATE INDEX idx_cron_run__started_at ON cron_run (started_at DESC);
CREATE INDEX idx_bet__user_placed ON bet (user_id, placed_at DESC);              -- 2차
CREATE INDEX idx_bet_market__status_closes ON bet_market (status, closes_at);    -- 2차

-- §6.2.2 이월분 6건
CREATE UNIQUE INDEX player_state_squad_number_uq ON player_state (team_id, squad_number)
  WHERE team_id IS NOT NULL;
CREATE UNIQUE INDEX trophy_season_team_type_uq ON trophy (season_id, team_id, type);
CREATE UNIQUE INDEX common_code_global_uq ON common_code (group_code, code) WHERE world_id IS NULL;
CREATE UNIQUE INDEX common_code_override_uq ON common_code (group_code, code, world_id) WHERE world_id IS NOT NULL;
-- sponsor_contract 팀당 ACTIVE ≤ 3: 인덱스로 표현 불가 — 16일차 트리거 설계로 이월(정의 없음)
CREATE INDEX idx_audit_log__target ON audit_log (target_type, target_id);
CREATE INDEX idx_audit_log__actor_created ON audit_log (actor_type, created_at);
CREATE INDEX idx_cron_gap__gap_started ON cron_gap (gap_started_at DESC);
```

### 6.3 RLS 정책 초안 + 데이터 생명주기 — **12일차(2026-08-05) 완료**

> 도메인 타입 필드 대응표(H-08 핵심 산출물)는 별도 절로 분리했다 — §8 참조.

#### 6.3.0 오늘 범위

| 오늘(12일차) 다루는 것 | 오늘 다루지 않는 것(별도 일차) |
|---|---|
| 공개 읽기/엔진 서비스롤 쓰기 2분법 RLS 초안(§6.3.1), `match_event` 경과 시간 뷰·함수 설계(DC-05, NFR-SEC-004), append-only 강제(`common_code_history`/`audit_log`, NFR-SEC-010), 데이터 생명주기·아카이브 정책 수치 확정(§6.3.2, I-07 반영) | 액터 6종(게스트/배터/운영자/엔진/배당산출기/정산기) 세분화 정책 — `[RLS 액터 세분화: 56~59일차 Task 038 예정]`. 베팅·지갑 테이블(E-33~40) RLS(`user_id = auth.uid()`) — 테이블 자체가 2차 릴리스(§3.9·§3.10 헤더 명시)라 오늘 `CREATE POLICY` 대상 아님. 레이트 리밋(NFR-SEC-009) — 애플리케이션/인프라 계층, DB 스키마 범위 밖 |
| — | RLS **실제 적용**(`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `CREATE POLICY` 실행) — `[RLS 적용: 18일차 Task 032 예정]`. 오늘은 SQL을 §6.2.4와 동일하게 **참고용으로만** 제시하고 `apply_migration`을 호출하지 않는다(수락 기준). 아카이브 실구현(파티셔닝/콜드 스토리지 이관) — `[아카이브 구현: 61일차 Task 042 예정]` |

#### 6.3.1 RLS 정책 초안

**테이블 4분류**: DC-05(05문서 740행) 원문 3원칙 중 오늘 범위는 "공개 읽기 테이블은 SELECT 공개+쓰기 차단"·"엔진 쓰기는 service role 전용"·`match_event` 특칙이다. "베팅·지갑은 `user_id=auth.uid()` 제한"은 대상 테이블 전부가 2차 릴리스라 D그룹으로 분리해 오늘 대상 밖임을 명시한다.

| 분류 | 대상(개수) | SELECT | 쓰기 | 근거 |
|---|---|---|---|---|
| **A. 공개 읽기** | 34개(아래 목록) | `anon`/`authenticated` 공개 | `service_role`만 | DC-05 "공개 읽기 테이블은 SELECT 공개+쓰기 차단" |
| **B. 운영 전용** | `cron_run`, `cron_gap`, `audit_log`, `common_code_history`(4개) | `service_role`만(공개 차단) | `service_role`만 — 뒤 2종은 INSERT만 | 05문서 5.13절 운영 성격 + NFR-SEC-010. **1차는 인증(Task 037, 51일차)이 아직 없어 "운영자" 축(`auth.uid()`) 자체가 없다** — 오늘은 공개 차단까지만, 액터 세분화는 038(56~59일차) |
| **C. `match_event`** | 1개(원시 테이블) | **전 롤 직접 SELECT 차단**(`service_role` 제외) — 공개 접근은 뷰 경유만 | `service_role`만 | DC-05 특칙 + NFR-SEC-004(사후 배팅 차단) + R-11(06-prioritization 412행 "원시 테이블 RLS로 차단") |
| **D. 2차 릴리스** | `bet_market`~`bet_leg`(E-33~37), `user_profile`~`wallet_transaction`(E-38~40) — 8개 | — | — | 테이블 자체가 1차 마이그레이션 대상 아님(§3.9·§3.10 헤더). RLS는 2차 착수 시점으로 이월, 오늘 정책 없음 |

**A그룹 34개**: `world`,`league`,`season`,`team`,`team_season`,`manager`,`player`,`player_attribute`,`player_attribute_history`,`player_position`,`player_state`,`contract`,`transfer`,`loan`,`fixture`,`match_lineup`,`weather`,`player_match_stat`,`player_season_stat`,`player_career_stat`,`team_season_stat`,`standing`,`injury`,`youth_prospect`,`news_feed_item`,`sanction`,`sponsor`,`sponsor_contract`,`point_transaction`,`award`,`trophy`,`common_code_group`,`common_code`,`sim_constant_snapshot`.

**검산**: 34(A) + 4(B) + 1(C) + 8(D) = **47/47 ✅**(§7 커버리지와 정합).

##### 부록 — SQL 정의(참고용, `apply_migration` 미실행)

§6.2.4와 동일 원칙 — 아래는 Task 032(18일차)가 그대로 옮겨 쓸 수 있도록 정리한 것이며, 오늘은 어떤 DDL도 실행하지 않는다. A그룹은 34개 테이블에 동일 패턴이 반복되므로 대표 1건만 전개한다.

```sql
-- A그룹: 공개 읽기 (대표 예시 — 나머지 33개 테이블에 동일 패턴 반복, 18일차 Task 032에서 전개)
ALTER TABLE world ENABLE ROW LEVEL SECURITY;
CREATE POLICY world_public_select ON world FOR SELECT USING (true);
CREATE POLICY world_service_role_write ON world FOR ALL USING (auth.role() = 'service_role');

-- B그룹: 운영 전용 (공개 차단, cron_run/cron_gap은 CRUD 전권 service_role)
ALTER TABLE cron_run ENABLE ROW LEVEL SECURITY;
CREATE POLICY cron_run_service_role_all ON cron_run FOR ALL USING (auth.role() = 'service_role');
-- cron_gap 동일 패턴

-- B그룹 중 append-only 2종: SELECT/INSERT만 정책 부여, UPDATE/DELETE 정책은 아예 만들지 않는다
-- (RLS는 "허용 정책이 없으면 기본 거부"이므로 정책 부재 자체가 1차 차단선)
ALTER TABLE common_code_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY common_code_history_service_role_select ON common_code_history
  FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY common_code_history_service_role_insert ON common_code_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
-- audit_log 동일 패턴(SELECT/INSERT만)

-- ⚠ service_role RLS 우회 주의(12일차 신규 발견) — Supabase service_role 키는 PostgREST 계층의 RLS를
-- 우회한다. 따라서 "append-only는 RLS로 강제"(NFR-SEC-010 원문, §3.11 851·921행 예고)라는 표현은 엄밀하지
-- 않다 — service_role이 REST가 아니라 direct SQL(Edge Function 등) 경로로 접근하면 위 정책과 무관하게
-- UPDATE/DELETE가 가능하다. 진짜 강제 수단은 역할과 무관하게 동작하는 트리거다:
CREATE OR REPLACE FUNCTION reject_update_delete() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: UPDATE/DELETE not allowed (NFR-SEC-010)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER common_code_history_append_only
  BEFORE UPDATE OR DELETE ON common_code_history
  FOR EACH ROW EXECUTE FUNCTION reject_update_delete();
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_update_delete();
-- 트리거 실제 적용은 `[append-only 트리거 적용: 16~18일차 Task 032 예정]` — 오늘은 설계만

-- C그룹: match_event 원시 테이블 직접 접근 전면 차단(공개 SELECT 정책을 만들지 않는다)
ALTER TABLE match_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_event_service_role_all ON match_event FOR ALL USING (auth.role() = 'service_role');

-- match_event 경과 시간 뷰(NFR-SEC-004, DC-05 특칙) — 공개 접근은 이 뷰로만 허용
CREATE OR REPLACE FUNCTION current_world_minute() RETURNS numeric AS $$
  SELECT CASE WHEN w.is_paused THEN w.world_minutes_at_speed_change
    ELSE w.world_minutes_at_speed_change
      + EXTRACT(EPOCH FROM (now() - w.speed_changed_at)) / 60 * w.speed_multiplier
    END
  FROM world w LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
-- I-31 앵커(world.speed_changed_at + world_minutes_at_speed_change, §3.1)를 그대로 적분한 것
-- (world.ts 56~60행 주석의 공식과 동일). 일시정지 구간은 앵커가 멈춰 있어 그대로 반환.

CREATE OR REPLACE FUNCTION is_event_elapsed(p_match_id uuid, p_minute int, p_added_time int)
RETURNS boolean AS $$
  -- ⚠ 킥오프 시점의 "월드 분" 기준값과, 연장전·휴식시간 등 월드시계 정지 예외를 반영한
  -- 최종 경과 판정식은 `[경과 판정 최종식: 2팀 H-24 인계 후 확정, 30일차 예정]`
  -- (world.ts 56~61행 "파생식 자체의 단일 소유는 2팀 H-24"). 오늘은 함수 골격과
  -- "뷰를 반드시 경유해야 한다"는 RLS 경계만 확정한다.
  SELECT true; -- placeholder — 30일차 확정 후 교체
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE VIEW match_event_visible AS
SELECT me.*
FROM match_event me
JOIN fixture f ON f.id = me.match_id
WHERE f.status = 'FINISHED'
   OR (f.status = 'LIVE' AND is_event_elapsed(me.match_id, me.minute, me.added_time));

GRANT SELECT ON match_event_visible TO anon, authenticated;
-- match_event 원시 테이블 자체의 SELECT 권한은 부여하지 않는다(위 C그룹 정책)
```

**NFR-SEC-004 수용기준 대조**: ①"T+1분 응답에 T+2분 이후 이벤트 0건" — `is_event_elapsed` 최종식 확정(30일차) 후 실측 대상. ②"원시 테이블 직접 조회가 RLS로 차단" — 오늘 C그룹 정책으로 **구조적으로 이미 충족**(뷰를 거치지 않으면 `anon`/`authenticated`는 `match_event`에서 0행). ③"침투 테스트 시나리오 5종" — 18일차(Task 032) 이후 실제 적용 시점 실행.

#### 6.3.2 데이터 생명주기·아카이브 전략

05문서 §5.17 원안(779행 부근)을 재인용하되, **I-07**(`docs/ISSUES.md` 82행 — "월 10시즌 속도에서 3시즌은 9일치에 불과해 UX 훼손, 온라인 30시즌(≈3개월) 권고")을 반영해 `match_event`·`player_match_stat` 온라인 보존 기간을 **3시즌 → 30시즌**으로 교체한다. team-schedule §6(173행)도 "I-07 반영 필수"를 재확인한다. `standing`의 중간 라운드 보존도 동일 사유로 함께 30시즌으로 맞춘다(05문서 원안은 3시즌).

| 데이터 | 온라인 보존 | 아카이브 | 근거 |
|---|---|---|---|
| `match_event` | **30시즌**(≈3개월, I-07 반영) | 이후 콜드 스토리지 | NFR-SC-002 — 볼륨 최대(시즌당 ≈7.5만 건, DC-06) |
| `player_match_stat` | **30시즌**(I-07 반영) | 이후 시즌 집계(`player_season_stat`)만 유지 | 동상 |
| `player_season_stat` / `team_season_stat` | 영구 | — | 히스토리 가치(성장 곡선, 통산 랭킹) |
| `standing` | 최종 라운드 영구, 중간 라운드 **30시즌**(I-07과 동일 사유로 확장) | — | 조회 빈도 |
| `point_transaction` | 영구 | — | 회계 감사(NFR-QA-005 항등식 검증에 전 기간 필요) |
| `common_code_history` | 영구 | — | 감사(NFR-SEC-010 append-only) |
| `sim_constant_snapshot` | 영구 | — | 재현성 — `ref_count`로 관측(NFR-CFG-006 ≤20건/시즌 목표), 용량 작음(jsonb 1건/스냅샷) |
| `cron_run` | 90일 | 이후 집계만 | 운영 관측 — 05문서 원안 유지(I-07은 시뮬레이션 볼륨 대상이라 미적용) |
| `audit_log` / 베팅 감사 | 영구 | — | 규제·분쟁 대응(NFR-SEC-010) |

**오늘 다루는 것**: 위 표(보존 정책과 수치 근거)만 확정한다. **오늘 다루지 않는 것**: 실제 파티셔닝/아카이브 구현(파티션 전략, 콜드 스토리지 이관 배치, "아카이브된 경기 조회 시 폴백" 동작)은 `[아카이브 구현: 61일차 Task 042 예정]`으로 이월한다 — NFR-SC-002 자체가 `[제안]` 등급(`[확정]` 아님, 04-non-functional-requirements.md 162행)이라 오늘은 정책 수치만 확정하고 구현 설계는 열어 둔다.

**정정 로그**: 05문서 5.17절 원안이 여전히 "3시즌"으로 표기돼 있으나, 이 문서(단일 소스, CLAUDE.md 표)는 오늘부로 30시즌을 채택한다 — 05문서 자체는 갱신 대상이 아니므로(I-58 정책) 그대로 두고 이 문서에서만 정정을 반영한다.

#### 6.3.3 자기검증

| 항목 | 결과 |
|---|---|
| RLS 테이블 분류(A+B+C+D) | 34+4+1+8 = **47/47 ✅** |
| append-only 강제 대상(정책+트리거 이중 설계) | `common_code_history`, `audit_log` **2/2 ✅** |
| `match_event` 경과 시간 접근 경로 | 뷰 1개(`match_event_visible`) + 함수 2개(`current_world_minute`, `is_event_elapsed`) **정의 완료**, NFR-SEC-004 수용기준 ②(원시 테이블 차단) 구조적 충족 — ①·③은 18일차 이후 실측 |
| 데이터 생명주기 대상 | 9개 데이터군 — I-07 반영 3건(`match_event`/`player_match_stat`/`standing` 중간라운드) + 05원안 유지 6건, **9/9 처리 완료 ✅** |

---

## 7. 47 엔티티 커버리지 자기검증

`docs/team-schedule/06-DB인프라팀.md` 9일차 수락 기준 — "47 엔티티 매핑" 충족 여부를 아래 표로 자체 확인한다.

| 엔티티 | 테이블명 | 절 | 상태 |
|---|---|---|---|
| E-01 World | `world` | §3.1 | ✅ |
| E-02 League | `league` | §3.1 | ✅ |
| E-03 Season | `season` | §3.1 | ✅ |
| E-04 Team | `team` | §3.1 | ✅ |
| E-05 TeamSeason | `team_season` | §3.1 | ✅ |
| E-06 Manager | `manager` | §3.2 | ✅ |
| E-07 Player | `player` | §3.2 | ✅ |
| E-08 PlayerAttribute | `player_attribute` | §3.2 | ✅ |
| E-09 PlayerAttributeHistory | `player_attribute_history` | §3.2 | ✅ |
| E-10 PlayerPosition | `player_position` | §3.2 | ✅ |
| E-11 PlayerState | `player_state` | §3.2 | ✅ |
| E-12 Contract | `contract` | §3.3 | ✅ |
| E-13 Transfer | `transfer` | §3.3 | ✅ |
| E-14 Loan | `loan` | §3.3 | ✅ |
| E-15 Fixture | `fixture` | §3.4 | ✅ |
| E-16 MatchEvent | `match_event` | §3.4 | ✅ |
| E-17 MatchLineup | `match_lineup` | §3.4 | ✅ |
| E-18 Weather | `weather` | §3.4 | ✅ |
| E-19 PlayerMatchStat | `player_match_stat` | §3.5 | ✅ |
| E-20 PlayerSeasonStat | `player_season_stat` | §3.5 | ✅ |
| E-21 PlayerCareerStat | `player_career_stat` | §3.5 | ✅ |
| E-22 TeamSeasonStat | `team_season_stat` | §3.5 | ✅ |
| E-23 Standing | `standing` | §3.5 | ✅ |
| E-24 Injury | `injury` | §3.6 | ✅ |
| E-25 YouthProspect | `youth_prospect` | §3.6 | ✅ |
| E-26 NewsFeedItem | `news_feed_item` | §3.6 | ✅ |
| E-27 Sanction | `sanction` | §3.6 | ✅ |
| E-28 Sponsor | `sponsor` | §3.7 | ✅ |
| E-29 SponsorContract | `sponsor_contract` | §3.7 | ✅ |
| E-30 PointTransaction | `point_transaction` | §3.7 | ✅ |
| E-31 Award | `award` | §3.8 | ✅ |
| E-32 Trophy | `trophy` | §3.8 | ✅ |
| E-33 BetMarket | `bet_market` | §3.9 | ✅ |
| E-34 BetSelection | `bet_selection` | §3.9 | ✅ |
| E-35 Odds | `odds` | §3.9 | ✅ |
| E-36 Bet | `bet` | §3.9 | ✅ |
| E-37 BetLeg | `bet_leg` | §3.9 | ✅ |
| E-38 User | `user_profile` | §3.10 | ✅ |
| E-39 Wallet | `wallet` | §3.10 | ✅ |
| E-40 WalletTransaction | `wallet_transaction` | §3.10 | ✅ |
| E-41 CommonCodeGroup | `common_code_group` | §3.11 | ✅ |
| E-42 CommonCode | `common_code` | §3.11 | ✅ |
| E-43 CommonCodeHistory | `common_code_history` | §3.11 | ✅ |
| E-44 SimConstantSnapshot | `sim_constant_snapshot` | §3.11 | ✅ |
| E-45 CronRun | `cron_run` | §3.11 | ✅ |
| E-46 CronGap | `cron_gap` | §3.11 | ✅ |
| E-47 AuditLog | `audit_log` | §3.11 | ✅ |

**검산: 47/47 ✅.** 도메인별 그룹 개수(README.md §1 기준)와도 일치 — 5+6+3+4+5+4+3+2+5+3+7 = 47.

---

## 8. 도메인 타입 필드 대응표 — **12일차(2026-08-05) 완료, H-08 인계물**

> `docs/team-schedule/06-DB인프라팀.md` 12일차 수락 기준 "도메인 타입(Task 002)과의 필드 대응표 작성 — 불일치 0건 확인"의 산출물이며, **H-08**(→1팀 코어·품질팀, 13일차 소비 시작)의 핵심 내용이다. §7이 "엔티티가 빠짐없이 테이블로 존재하는가"를 검증했다면, 이 절은 "각 테이블의 컬럼이 TS 필드와 1:1로 맞는가"를 필드 단위로 검증한다.

### 8.1 검증 방법 (1팀 재현용)

1. `src/types/{world,person,economy,match,stat,ops,config,betting}.ts` 8개 파일에서 정규식(`readonly fieldName` 패턴, `extends` 절 인식)으로 51개 interface(엔티티 47종 + 공유 블록 4종 — `PlayerAttributeValues`/`PlayerStatCoreValues`/`TeamSplitRecord`/`TeamMarginResult`)의 필드 목록을 전량 추출했다.
2. `extends` 관계는 상속 필드를 합산했다 — `PlayerAttribute`/`PlayerAttributeHistory`(각 자체 3필드 + `PlayerAttributeValues` 34필드 = 37), `PlayerMatchStat`/`PlayerSeasonStat`/`PlayerCareerStat`(자체 필드 + `PlayerStatCoreValues` 56필드)를 각각 합산했다 — §3.2/§3.5가 이미 "공유 블록은 1회만 전개해 서술한다"고 밝힌 것과 동일 대상을 집계 관점에서 재적용한 것이다.
3. `TeamSeasonStat`의 `homeRecord`/`awayRecord`(`TeamSplitRecord`, 6필드 구조체)·`biggestWin`/`biggestLoss`(`TeamMarginResult`, 4필드 구조체)는 TS 원본엔 필드 4개지만 §3.5가 접두사 컬럼으로 평탄화했으므로, 대조 시에도 20개(6×2 + 4×2)로 전개해 계산했다 — 그렇지 않으면 "59 vs 75"처럼 가짜 불일치가 생긴다.
4. `scoringByPeriod`/`concedingByPeriod`/`minutesDistribution`처럼 형태가 열린 `Record<string, T>` 필드는 전개하지 않았다 — TS도 필드 1개, DB도 `jsonb` 컬럼 1개로 1:1 대응하기 때문이다.
5. 위 정규화를 적용한 TS 필드 수를 §3의 실제 DB 컬럼 수(PK/FK 포함, `[물리 전용]` 컬럼도 포함)와 엔티티별로 대조했다. 다형 참조(`ref_type`/`ref_id`, `owner_type`/`owner_id`)와 브랜드 타입(`Points`/`Seed` 등)은 TS 필드 1개 = DB 컬럼 1개로 그대로 대응하므로(§1.1·§1.2가 이미 물리 타입 매핑을 확정) 별도 조정이 필요 없었다.

### 8.2 엔티티별 대조 결과

| ID | 엔티티 | TS 필드 | DB 컬럼 | 차이 | 비고 |
|---|---|---|---|---|---|
| E-01 | World | 12 | 12 | 0 | |
| E-02 | League | 8 | 9 | +1 | `world_id`(물리 전용, §4-1) |
| E-03 | Season | 9 | 10 | +1 | `world_id`(물리 전용, §4-2) |
| E-04 | Team | 15 | 16 | +1 | `world_id`(물리 전용, §4-3) |
| E-05 | TeamSeason | 7 | 7 | 0 | |
| E-06 | Manager | 11 | 12 | +1 | `world_id`(물리 전용, §4-4) |
| E-07 | Player | 12 | 13 | +1 | `world_id`(물리 전용, §4-5) |
| E-08 | PlayerAttribute | 37(3+34) | 37 | 0 | `PlayerAttributeValues` 34 상속분 합산 |
| E-09 | PlayerAttributeHistory | 37(3+34) | 37 | 0 | 상동 |
| E-10 | PlayerPosition | 3 | 3 | 0 | |
| E-11 | PlayerState | 12 | 12 | 0 | |
| E-12 | Contract | 8 | 8 | 0 | |
| E-13 | Transfer | 9 | 9 | 0 | |
| E-14 | Loan | 7 | 7 | 0 | |
| E-15 | Fixture | 23 | 23 | 0 | |
| E-16 | MatchEvent | 12 | 12 | 0 | |
| E-17 | MatchLineup | 9 | 9 | 0 | |
| E-18 | Weather | 5 | 5 | 0 | |
| E-19 | PlayerMatchStat | 61(5+56) | 61 | 0 | `PlayerStatCoreValues` 56 상속분 합산 |
| E-20 | PlayerSeasonStat | 67(11+56) | 67 | 0 | 상동 |
| E-21 | PlayerCareerStat | 60(4+56) | 60 | 0 | 상동 |
| E-22 | TeamSeasonStat | 75(59, 중첩 4필드→20컬럼 전개) | 75 | 0 | 평탄화(§8.4 상세) — 구조 재배열, 순필드 0 |
| E-23 | Standing | 16 | 16 | 0 | |
| E-24 | Injury | 10 | 10 | 0 | |
| E-25 | YouthProspect | 6 | 6 | 0 | |
| E-26 | NewsFeedItem | 8 | 8 | 0 | |
| E-27 | Sanction | 6 | 6 | 0 | |
| E-28 | Sponsor | 7 | 8 | +1 | `world_id`(물리 전용, §4-6) |
| E-29 | SponsorContract | 8 | 8 | 0 | |
| E-30 | PointTransaction | 10 | 10 | 0 | |
| E-31 | Award | 9 | 9 | 0 | |
| E-32 | Trophy | 5 | 5 | 0 | |
| E-33 | BetMarket | 11 | 11 | 0 | 2차 릴리스(§3.9), 정의만 대조 |
| E-34 | BetSelection | 6 | 6 | 0 | 2차 릴리스 |
| E-35 | Odds | 5 | 5 | 0 | 2차 릴리스 |
| E-36 | Bet | 12 | 12 | 0 | 2차 릴리스 |
| E-37 | BetLeg | 4 | 4 | 0 | 2차 릴리스 |
| E-38 | User | 3 | 3 | 0 | 2·3차 릴리스(§3.10) |
| E-39 | Wallet | 3 | 3 | 0 | 2·3차 릴리스 |
| E-40 | WalletTransaction | 6 | 6 | 0 | 2·3차 릴리스 |
| E-41 | CommonCodeGroup | 10 | 10 | 0 | **13일차 갱신(I-93)**: `minValue`/`maxValue`/`jsonSchema` 3필드가 E-42로 이동해 13→10 (§3.11, §9.3) |
| E-42 | CommonCode | 19 | 19 | 0 | `world_id`는 TS 원본 필드(물리 전용 아님, §3.11 각주). **13일차 갱신(I-93)**: E-41에서 이동해 온 `minValue`/`maxValue`/`jsonSchema` 3필드 포함해 16→19 |
| E-43 | CommonCodeHistory | 12 | 12 | 0 | |
| E-44 | SimConstantSnapshot | 7 | 7 | 0 | `world_id`는 TS 원본 필드 |
| E-45 | CronRun | 12 | 12 | 0 | |
| E-46 | CronGap | 7 | 7 | 0 | |
| E-47 | AuditLog | 8 | 8 | 0 | |

### 8.3 차이 6건의 사유 — 전부 §4가 이미 정의한 물리 전용 컬럼

| 엔티티 | 차이 | 사유 |
|---|---|---|
| E-02 League | +1 | `world_id`(물리 전용, §4 목록 1번) |
| E-03 Season | +1 | `world_id`(물리 전용, §4 목록 2번) |
| E-04 Team | +1 | `world_id`(물리 전용, §4 목록 3번) |
| E-06 Manager | +1 | `world_id`(물리 전용, §4 목록 4번) |
| E-07 Player | +1 | `world_id`(물리 전용, §4 목록 5번) |
| E-28 Sponsor | +1 | `world_id`(물리 전용, §4 목록 6번) |

§4가 목록화한 7개 중 나머지 1개(`common_code`)는 `CommonCode.worldId`가 TS 타입 자체에 이미 있는 필드라(§3.11 각주) 물리 전용이 아니며, 그래서 8.2 표에서 diff 0으로 이미 반영돼 이 표에는 등장하지 않는다 — §4 본문 939행이 명시한 구분과 정합.

### 8.4 구조적 차이지만 순필드수는 0인 사례 — TeamSeasonStat

TS `TeamSeasonStat`은 59개 필드를 갖지만 그중 4개(`homeRecord`/`awayRecord`/`biggestWin`/`biggestLoss`)가 중첩 구조체다. §3.5는 "합산형은 컬럼으로 저장한다"는 원칙(E-19 공유블록 설계와 동일 원칙, 527행)에 따라 이를 접두사 컬럼으로 평탄화하기로 결정했다 — `homeRecord`(6필드)+`awayRecord`(6필드)+`biggestWin`(4필드)+`biggestLoss`(4필드) = 20개 컬럼으로 전개되고, 나머지 55개 TS 필드는 1:1 컬럼 대응이다. 전개 후 정규화 TS 필드 수(75) = DB 컬럼 수(75) — **순수 필드 손실·추가가 없는 구조 재배열**이며, §8.2에서도 차이 0으로 집계했다.

### 8.5 자기검증

- 47개 엔티티 전량 대조 완료.
- **순수 필드 불일치(설명 불가능한 차이) 0건.**
- 차이가 있는 6개 엔티티(§8.3)는 전부 §4 "D-15 물리 전용 `world_id` 컬럼 목록"이 9일차에 이미 설계 결정으로 문서화해 둔 항목이다 — 오늘 새로 발견한 사항이 아니라 기존 설계에 대한 사후 검증이다.
- **검산: 47/47 대조, 불일치 0건 ✅.**
- **H-08 인계 메모**: 1팀 코어·품질팀은 §8.1의 검증 방법(정규식 추출 + `extends` 상속 합산 + 평탄화/개방형 필드 정규화 규칙)을 그대로 재실행해 이 결과를 재현할 수 있다. `src/types/**`는 8일차(2026-07-30) 동결 이후 이 문서 작성 시점(12일차)까지 구조 변경이 없었다 — SP-1 동결 선언(§0.2) 및 C-7 배치 반영 절차 11일차 첫 창구 판정("`src/types/**` 구조 변경 필요 0건", `src/types/README.md` 251행)이 이를 뒷받침한다.

---

## 9. 13일차(2026-08-06) 마이그레이션 실행 인계 메모 — 1차 교차 점검 반영

Task 032(1/4) `apply_migration` 실행 후 1차 교차 점검(팀장 판정)에서 확정된 순서 의존 리스크다. 설계 문서 자체는 변경하지 않고(§3.4 `fixture`/`season` 컬럼 정의는 9일차 그대로), 실행 단계의 인계 사항만 기록한다.

### 9.1 `snapshot_id` FK 이월 — 명시적 금지선

§3.4 `fixture.snapshot_id`(NOT NULL, 410행)와 `season.snapshot_id`(NULL, 221행)는 `sim_constant_snapshot`(E-44)이 14일차 테이블이라 13일차 마이그레이션에서 FK를 걸지 못했다(`supabase/migrations/20260720035624_core_tables_phase1.sql` 헤더 주석 참조). 라이브 DB(`pg_catalog`) 확인 결과 `fixture`는 FK 4개(`away_team_id`/`home_team_id`/`league_id`/`season_id`)만 있고 `snapshot_id` FK는 없다.

- **지금**: `fixture` INSERT는 FK가 없어 임의의 UUID를 `snapshot_id`에 넣어도 성공한다(참조 무결성 검사 없음).
- **14일차**: `ALTER TABLE fixture ADD FOREIGN KEY (snapshot_id) REFERENCES sim_constant_snapshot(id)`는 기존 행 전체를 검증하므로, 그 사이 무효 `snapshot_id`가 들어온 행이 하나라도 있으면 ALTER가 실패한다.
- **금지선**: **13~14일차 사이 `fixture`·`season`에 행을 INSERT하지 않는다.** 14일차 FK 추가 착수 직전 `SELECT count(*) FROM fixture;`로 0건을 확인하고, 0이 아니면 팀장에게 즉시 보고한다.

### 9.2 마이그레이션 파일 버전 명명 규칙 (팀 컨벤션 확정)

`apply_migration` 적용 후 **`list_migrations`로 원격이 자동 채번한 버전을 확인하고, 그 값으로 파일명을 짓는다**(인게임 날짜가 아니다 — 파일명 버전 프리픽스는 Supabase 툴링이 읽는 식별자다). 인게임 일차 정보는 파일 헤더 주석에 남긴다. 13일차 산출물은 최초 인게임 날짜(`20260806000000`)로 저장했다가 원격 버전(`20260720035624`)과 불일치가 발견되어 리네임했다 — **14일차(공통코드 7테이블)부터 이 규칙을 적용**한다.

### 9.3 `min_value`/`max_value`/`json_schema` — E-41 → E-42 이동 (I-93, 팀장 확정)

**배경**: 1차 교차 점검 중 3팀이 `catalog.ts` 실측으로 발견한 반례(`SQUAD_PARAM.MIN`=22 vs `GK_MIN`=2, `ROUND_INTERVAL_MIN.LEAGUE_1`=75 vs `LEAGUE_3`=115, `CUP_PARAM.BYE_COUNT`=스칼라 vs `INSERT_ROUNDS`=배열)와 6팀이 독립적으로 도달한 "cross-table CHECK는 plain CHECK로 표현 불가능"이라는 구조 지적이 같은 날 같은 결론(그룹 레벨 메타데이터가 코드별 실제 특성을 표현 못 함)으로 수렴했다. 1팀이 `src/types/config.ts`(동결 타입, 8일차 이후 변경은 이슈 배치 반영만 가능)에 이미 반영했다 — `CommonCodeGroup`에서 3필드 제거, `CommonCode`에 3필드 추가(`config.ts:78-95` 주석 참조).

**이 문서 반영(13일차, §3.11)**: `common_code_group`에서 `min_value`/`max_value`/`json_schema` 3컬럼 제거, `common_code`에 동일 3컬럼 추가. `value_type`/`apply_policy`는 "그룹이 공유하는 스토리지 계약"이라 그룹 레벨 유지 — 이동한 것은 "코드별 도메인 지식"인 범위/스키마뿐이다.

**부수 효과**: 이동 전에는 `min_value`/`max_value`(E-41)와 `value_num`(E-42)이 서로 다른 테이블에 있어 plain `CHECK` 제약으로 표현이 **불가능**했다(Postgres `CHECK`는 같은 행의 컬럼만 참조 가능) — 애초에 §3.11이 예고했던 "16일차 CHECK"(1팀이 지적한 `schema-design.md:848` 원문)는 구현 불가능한 계획이었다. 이동 후에는 세 컬럼이 전부 `common_code`의 같은 행에 있어 트리거 없이 plain `CHECK`로 되돌아간다(§3.11 새 "제약 예고(16일차)" 참조).

**"과도기 NULL" 규약**: `min_value`/`max_value`가 `NULL`인 코드는 CHECK를 무조건 통과한다(하한/상한 없음, 또는 아직 값이 안 정해짐 — 두 의미를 구분하지 않고 동일하게 처리). 3팀 공통코드 카탈로그(36그룹)의 실제 범위 값은 **37일차 이후 그룹별 점진적으로 채워질 예정**(3팀 판단, `ODDS_PARAM`/`RATING_WEIGHT` 등 엔진 튜닝 그룹은 031b 밸런싱 루프(66~68일차)에서야 올바른 범위가 밝혀짐)이며, 16일차에 값을 미리 채우는 안은 억측이라 기각됐다. 채워지는 즉시 자동으로 CHECK가 걸리므로 별도 배포는 필요 없다.

**§8.2 H-08 대응표 갱신**: E-41 13→10, E-42 16→19(위 표 반영 완료). 1팀 재확인 시 이 문서 §3.11·§8.2를 기준으로 대조하면 된다.

---

*이 문서는 12일차 작업으로 최종본이 되었다(§6.3 RLS·생명주기, §8 필드 대응표 추가). 누적 반영 — 9일차(§0~§3 개요·47엔티티 테이블) + 10일차(§6.1 관계 서술 R-01~R-13) + 11일차(§6.2 인덱스 설계, 14개 공식 인덱스 + 이월분 6건) + 12일차(§6.3 RLS 정책 초안·데이터 생명주기, §8 도메인 타입 필드 대응표 — H-08 인계) + **13일차(§9, 마이그레이션 실행 인계 메모 — snapshot_id FK 이월 금지선·파일 버전 명명 규칙·§9.3 `min_value`/`max_value`/`json_schema` E-41→E-42 이동)**. Task 009(ROADMAP.md) 전 구현 사항 완료, 마이그레이션은 13일차(Task 032)부터 순차 진행 중.*
