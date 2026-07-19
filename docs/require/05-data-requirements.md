# 05. 데이터 요구사항 및 제약사항

> 상위 문서: `00-requirements-summary.md`
> 문서 버전: v1.1 / 2026-07-20
> 본 문서는 **논리 설계**이며 물리 스키마(DDL)는 구현 단계에서 작성한다. 마이그레이션은 실행하지 않았다.

---

## 5.1 엔티티 개요

총 **47개 엔티티** (E-01 ~ E-47). 도메인별 분류:

| 도메인 | 엔티티 | 개수 |
|---|---|---|
| 월드/리그 | World, League, Season, Team, TeamSeason | 5 |
| 인물 | Manager, Player, PlayerAttribute, PlayerAttributeHistory, PlayerPosition, PlayerState | 6 |
| 계약/이동 | Contract, Transfer, Loan | 3 |
| 경기 | Fixture, MatchEvent, MatchLineup, Weather | 4 |
| 통계 | PlayerMatchStat, PlayerSeasonStat, PlayerCareerStat, TeamSeasonStat, Standing | 5 |
| 사건 | Injury, YouthProspect, NewsFeedItem, Sanction | 4 |
| 경제 | Sponsor, SponsorContract, PointTransaction | 3 |
| 명예 | Award, Trophy | 2 |
| 배팅 | BetMarket, BetSelection, Odds, Bet, BetLeg | 5 |
| 사용자 | User, Wallet, WalletTransaction | 3 |
| **설정/운영** | **CommonCodeGroup, CommonCode, CommonCodeHistory, SimConstantSnapshot, CronRun, CronGap, AuditLog** | **7** |

> 배팅(5) + 사용자(3)는 2차 릴리스, WalletTransaction 충전 관련은 3차.

---

## 5.2 엔티티 정의 — 월드 / 리그

### E-01 World

> **D-15 (2026-07-20) — 단일 월드 확정.** 이 테이블은 **레코드 1건만 존재**하는 전제로 설계한다.
> - 애플리케이션 쿼리에 `world_id` 스코핑 필터를 강제하지 않는다. 조회 계층에서 현재 월드를 1회 해석해 사용한다.
> - 월드 선택/스위처 UI는 요구사항 범위 밖이다.
> - 단, 하위 엔티티의 `world_id` FK는 **스키마에 그대로 유지**한다. 향후 다중 월드로 확장할 때 마이그레이션 없이 스코핑 로직만 추가하면 되도록 확장 여지를 보존한다.
> - 단일 레코드 보장은 DB 제약으로 강제한다 (예: 부분 유니크 인덱스).

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_seed` | bigint | 최상위 시드 (전 파생의 뿌리) |
| `current_season_number` | int | 현재 시즌 |
| `current_phase` | enum | `REGULAR / CUP_SLOT / PLAYOFF / SETTLEMENT / PRESEASON` |
| `speed_multiplier` | numeric(5,2) | 0.25 ~ 20.00 |
| `is_paused` | boolean | |
| `paused_total_minutes` | int | 누적 정지 시간(스케줄 오프셋) |
| `created_at` | timestamptz | |

**관계**: 1:N League, Season, Team, Player, Sponsor, CommonCode(월드 스코프)

### E-02 League

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` | uuid FK → World | |
| `name` | text | |
| `tier` | int | 1 / 2 / 3 |
| `team_count` | int | 24 / 20 / 16 (공통코드 시드값) |
| `round_interval_min` | int | 75 / 90 / 115 (공통코드 시드값) |
| `promotion_slots` / `relegation_slots` | int | 기본 3 / 3 |
| `playoff_team_count` | int | 10 / 4 / 2 |

**관계**: 1:N TeamSeason, Fixture, Standing

### E-03 Season

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` | uuid FK | |
| `season_number` | int | 1부터 무한 누적 |
| `season_seed` | bigint | `hash(world_seed, season_number)` |
| `phase` | enum | 현재 페이즈 |
| `regular_started_at` / `regular_ends_at` | timestamptz | |
| `started_at` / `ended_at` | timestamptz | |
| `snapshot_id` | uuid FK → SimConstantSnapshot | 시즌 처리에 적용된 상수 |

**관계**: 1:N Fixture, Standing, Award, Transfer, PointTransaction

### E-04 Team

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` | uuid FK | |
| `name` / `short_name` | text | short_name 3자 |
| `founded_season` | int | |
| `stadium_name` | text | |
| `stadium_capacity` | int | |
| `color_primary` / `color_secondary` | text | hex |
| `crest_seed` | bigint | 절차적 SVG 엠블럼 시드 |
| `reputation` | int | 0~100 |
| `fan_base` | int | |
| `academy_level` | int | 1~5 |
| `balance` | bigint | 포인트 잔고 (원장의 파생 캐시) |
| `financial_crisis` | boolean | |
| `crisis_consecutive_seasons` | int | |

**관계**: 1:1 Manager / 1:N Contract, SponsorContract, TeamSeasonStat, Trophy, PointTransaction

### E-05 TeamSeason

| 필드 | 타입 | 설명 |
|---|---|---|
| `team_id` / `season_id` | uuid FK (복합 PK) | |
| `league_id` | uuid FK | 해당 시즌 소속 리그 |
| `final_rank` | int nullable | 정규시즌 최종 순위 |
| `promoted` / `relegated` | boolean | |
| `tiebreak_applied` | int nullable | 적용된 타이브레이커 단계 (1~7) |

> **설계 근거**: 팀의 리그 소속은 승강으로 매 시즌 바뀌므로 `Team.league_id`를 두지 않는다. `TeamSeason`이 승강 히스토리와 "티어별 재적 시즌" 지표의 단일 근거가 된다.

---

## 5.3 엔티티 정의 — 인물

### E-06 Manager

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` / `team_id` | uuid FK | team_id nullable (공석) |
| `name` / `age` | text / int | |
| `style` | enum | `ATTACKING / BALANCED / DEFENSIVE / COUNTER / POSSESSION / HIGH_PRESS` |
| `tactical_skill` | int | 1~30 |
| `preferred_formation` | enum | 7종 |
| `reputation` | int | 0~100 |
| `contract_until_season` | int | |
| `tenure_seasons` | int | |

### E-07 Player

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` | uuid FK | |
| `name` / `nationality` | text | |
| `birth_season` / `age` | int | |
| `preferred_foot` | enum | `LEFT / RIGHT / BOTH` |
| `preferred_position` | enum | 11군 중 1 |
| `pa` | int | 잠재 능력치 1~30 (**공개 API 미노출**) |
| `reputation` | int | 0~100 |
| `market_value` | bigint | 포인트 |
| `taste_tags` | enum[] | 1~2개 |
| `retired_at_season` | int nullable | |

### E-08 PlayerAttribute

| 필드 | 타입 | 설명 |
|---|---|---|
| `player_id` | uuid PK FK | 1:1 |
| 기술 10 / 정신 10 / 신체 8 / GK 6 | int (각 1~30) | FR-PL-002 전 34종 |
| `ovr_cached` | int | 선호 포지션 기준 파생 캐시 |
| `updated_at_season` | int | |

### E-09 PlayerAttributeHistory

| 필드 | 타입 | 설명 |
|---|---|---|
| `player_id` / `season_number` | 복합 PK | |
| 34종 능력치 + `ovr` | int | 시즌 종료 시점 스냅샷 (성장 곡선용) |

### E-10 PlayerPosition

| 필드 | 타입 | 설명 |
|---|---|---|
| `player_id` / `position` | 복합 PK | |
| `proficiency` | int | 1~5 (5 = Natural) |

### E-11 PlayerState

| 필드 | 타입 | 설명 |
|---|---|---|
| `player_id` | uuid PK FK | 1:1, 가변 상태 |
| `team_id` | uuid FK nullable | 계약 팀 (FA면 null) |
| `on_loan_team_id` | uuid FK nullable | 임대 중 실제 출전 팀 |
| `squad_number` | int | 팀 내 유일 |
| `condition` | numeric(3,1) | 1.0 ~ 10.0 |
| `fitness` | int | 0 ~ 100 |
| `familiarity_seasons` | int | 연속 재직 시즌 |
| `yellow_accumulated_league` / `_cup` | int | 대회별 분리 |
| `suspension_remaining_league` / `_cup` | int | |
| `active_injury_id` | uuid FK nullable | |

---

## 5.4 엔티티 정의 — 계약 / 이동

### E-12 Contract

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `player_id` / `team_id` uuid FK |
| `start_season` / `end_season` int (기간 1~5시즌) |
| `wage_per_season` bigint |
| `transfer_fee_paid` bigint |
| `status` enum `ACTIVE / EXPIRED / TERMINATED` |

### E-13 Transfer

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` / `player_id` uuid FK |
| `from_team_id` uuid FK nullable (FA면 null) |
| `to_team_id` uuid FK |
| `fee` bigint |
| `type` enum `TRANSFER / FREE / TRADE / RELEASE` |
| `trade_counterpart_player_id` uuid FK nullable |
| `negotiation_log` jsonb (시도 횟수, 성공 확률, 몸값 조정 이력) |

### E-14 Loan

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` / `player_id` uuid FK |
| `owner_team_id` / `loan_team_id` uuid FK |
| `wage_share_pct` int (기본 50) |
| `status` enum `ACTIVE / RETURNED` |

---

## 5.5 엔티티 정의 — 경기

### E-15 Fixture (Match)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `season_id` | uuid FK | |
| `competition_type` | enum | `LEAGUE / PLAYOFF / CUP / TIEBREAK` |
| `league_id` | uuid FK nullable | 컵은 null |
| `round` | int | 리그 라운드 또는 대회 라운드 |
| `round_label` | text | "8강", "결승" 등 |
| `home_team_id` / `away_team_id` | uuid FK | |
| `is_neutral` | boolean | 중립지 여부 |
| `kickoff_at` | timestamptz | |
| `status` | enum | `SCHEDULED / LIVE / FINISHED / VOID` |
| `home_score` / `away_score` | int nullable | 종료 전 null |
| `ht_home_score` / `ht_away_score` | int nullable | 전반 |
| `et_home_score` / `et_away_score` | int nullable | 연장 |
| `pk_home` / `pk_away` | int nullable | 승부차기 |
| `attendance` | int nullable | |
| `match_seed` | bigint | `hash(season_seed, fixture_id)` |
| **`snapshot_id`** | **uuid FK → SimConstantSnapshot NOT NULL** | **결정론 보장 (FR-AD-014)** |
| `simulated_at` | timestamptz | 실제 계산 시각 |

### E-16 MatchEvent

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `match_id` uuid FK |
| `sequence` int (경기 내 순번) |
| `minute` int / `added_time` int |
| `type` enum (FR-MT-002 전 23종) |
| `team_id` uuid FK nullable |
| `primary_player_id` / `secondary_player_id` uuid FK nullable |
| `detail` jsonb (xG, 슛 위치, 부상 등급, 카드 사유 등) |

**인덱스**: `(match_id, sequence)`, `(match_id, minute)`

### E-17 MatchLineup

| 필드 | 타입 |
|---|---|
| `match_id` / `team_id` / `player_id` 복합 PK |
| `formation` enum |
| `position_slot` enum (11군) |
| `is_starter` boolean |
| `minute_on` / `minute_off` int nullable |
| `position_multiplier` numeric(4,3) (적용된 `M_position`) |

### E-18 Weather

| 필드 | 타입 |
|---|---|
| `match_id` uuid PK FK (1:1) |
| `type` enum (9종) |
| `temperature` int / `wind_speed` int |
| `effect_modifiers` jsonb (적용된 계수 사본) |

---

## 5.6 엔티티 정의 — 통계

### E-19 PlayerMatchStat

| 필드 | 타입 |
|---|---|
| `match_id` / `player_id` 복합 PK |
| `team_id` uuid FK |
| FR-ST-001 지표 전량 (합산형만 저장, 파생 비율은 계산) |
| `match_rating` numeric(3,1) |
| `is_motm` boolean |

### E-20 PlayerSeasonStat

| 필드 | 타입 |
|---|---|
| `player_id` / `season_id` / `competition_type` 복합 PK |
| `team_id` / `league_id` uuid FK |
| FR-ST-001 집계 지표 전량 |
| `contribution_score` numeric |
| `avg_condition` numeric(3,1) |

**인덱스**: `(season_id, league_id, goals DESC)` 등 리더보드용 커버링 인덱스

### E-21 PlayerCareerStat

| 필드 | 타입 |
|---|---|
| `player_id` uuid PK FK (1:1) |
| 통산 집계 지표 |
| `total_seasons` / `total_awards` / `total_injuries` int |

### E-22 TeamSeasonStat

| 필드 | 타입 |
|---|---|
| `team_id` / `season_id` / `competition_type` 복합 PK |
| `league_id` uuid FK |
| FR-ST-002 지표 전량 |

### E-23 Standing

| 필드 | 타입 |
|---|---|
| `season_id` / `league_id` / `round` / `team_id` 복합 PK |
| `rank` int |
| `played` / `won` / `drawn` / `lost` int |
| `gf` / `ga` / `gd` / `points` int |
| `form` text (최근 5경기 "WWDLW") |
| `fair_play_score` int |
| `tiebreak_applied` int nullable |

> **설계 근거**: 라운드별 스냅샷을 남겨 "N라운드 시점 순위" 조회와 시즌 마켓 배당 산출 입력으로 사용한다. 최신 순위는 `round = MAX(round)` 로 조회하거나 별도 `is_current` 플래그를 둔다.

---

## 5.7 엔티티 정의 — 사건

### E-24 Injury

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `player_id` uuid FK |
| `match_id` uuid FK nullable / `season_id` uuid FK |
| `severity` int (1~4) |
| `type_label` text ("햄스트링 염좌" 등) |
| `occurred_round` / `rounds_out` / `return_round` int |
| `status` enum `ACTIVE / RECOVERED` |

### E-25 YouthProspect

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` / `team_id` / `player_id` uuid FK |
| `academy_level_at_generation` int |
| `bonus_applied` boolean (FR-LG-007 구제 보정 여부) |

### E-26 NewsFeedItem

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` uuid FK |
| `type` enum (`TRANSFER / LOAN / RETIREMENT / YOUTH_DEBUT / MANAGER_CHANGE / SPONSOR_BANKRUPT / AWARD / INJURY / MILESTONE / SANCTION`) |
| `headline` / `body` text |
| `ref_type` / `ref_id` |
| `occurred_at` timestamptz |

### E-27 Sanction

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` / `team_id` uuid FK |
| `sanction_type` enum (`REBUILD_SANCTION`, 향후 `RELEGATION` 확장 여지) |
| `effects` jsonb (적용된 페널티·구제 항목) |
| `grant_amount` bigint (리빌드 보조금) |

---

## 5.8 엔티티 정의 — 경제

### E-28 Sponsor

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `world_id` uuid FK |
| `name` / `industry` text |
| `scale` int (1~5) |
| `balance` bigint (음수 시 부도) |
| `reputation` int |
| `bankrupt_at_season` int nullable |

### E-29 SponsorContract

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `sponsor_id` / `team_id` uuid FK |
| `start_season` / `end_season` int (기간 1~10) |
| `income_per_season` bigint |
| `share_pct` numeric(5,2) (≤ 30.00) |
| `status` enum `ACTIVE / EXPIRED / VOIDED` |

**제약**: 팀당 `status = ACTIVE` 인 레코드 ≤ 3 (부분 유니크 인덱스 또는 트리거)

### E-30 PointTransaction

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` uuid FK |
| `owner_type` enum `TEAM / SPONSOR` |
| `owner_id` uuid |
| `amount` bigint (부호 있음) |
| `reason_code` enum (FR-EC-001의 12종) |
| `ref_type` / `ref_id` |
| `balance_after` bigint |
| `created_at` timestamptz |

**인덱스**: `(owner_type, owner_id, created_at)`

> **회계 항등식** (NFR-QA-005): 임의 시점 `owner.balance = Σ amount`. 이적료와 스폰서 분배는 zero-sum.

---

## 5.9 엔티티 정의 — 명예

### E-31 Award

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` uuid FK |
| `type` enum (`LEAGUE_MVP / GOLDEN_BOOT / GOLDEN_PLAYMAKER / GOLDEN_GLOVE / BEST_YOUNG_PLAYER / MANAGER_OF_SEASON / TEAM_OF_SEASON / BALLON_DOR / WORLD_XI / CUP_MVP / PLAYOFF_MVP / PLAYER_OF_THE_ROUND`) |
| `scope` enum `LEAGUE / WORLD / CUP / PLAYOFF` |
| `league_id` uuid FK nullable |
| `player_id` / `manager_id` / `team_id` uuid FK nullable |
| `criteria` jsonb (선정 근거 수치) |

### E-32 Trophy

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `season_id` / `team_id` uuid FK |
| `type` enum `LEAGUE_TITLE / PLAYOFF_TITLE / CUP_TITLE / PROMOTION` |
| `league_id` uuid FK nullable |

---

## 5.10 엔티티 정의 — 배팅 (2차)

### E-33 BetMarket

| 필드 | 타입 |
|---|---|
| `id` uuid PK |
| `scope` enum `MATCH / SEASON / TOURNAMENT` |
| `market_type` enum (FR-BT-002~004의 전 마켓) |
| `ref_type` / `ref_id` (fixture / season+league / competition) |
| `opens_at` / `closes_at` timestamptz |
| `status` enum `OPEN / CLOSED / SETTLED / VOIDED` |
| `overround` numeric(5,4) (기본 1.0600) |
| `sim_count` int (산출에 쓴 N) |
| `snapshot_id` uuid FK (산출 시점 상수) |

### E-34 BetSelection

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `market_id` uuid FK |
| `label` text / `outcome_key` text |
| `probability` numeric(9,8) |
| `result` enum `PENDING / WIN / LOSE / VOID / HALF_WIN / HALF_LOSE` |

### E-35 Odds

| 필드 | 타입 |
|---|---|
| `id` uuid PK / `selection_id` uuid FK |
| `decimal_odds` numeric(8,2) (1.01 ~ 500.00) |
| `computed_at` timestamptz |
| `is_current` boolean |

### E-36 Bet / E-37 BetLeg

| Bet 필드 | 타입 |
|---|---|
| `id` uuid PK / `user_id` uuid FK |
| `stake` bigint / `total_odds` numeric(10,2) / `potential_return` bigint |
| `type` enum `SINGLE / MULTI` |
| `status` enum `PENDING / WON / LOST / VOID / HALF_WON / HALF_LOST` |
| `placed_at` / `settled_at` timestamptz |
| `odds_snapshot` jsonb (**제출 시점 배당 동결**) |
| `server_received_at` timestamptz / `ip_hash` text |

| BetLeg 필드 | 타입 |
|---|---|
| `bet_id` / `selection_id` 복합 PK |
| `odds_at_placement` numeric(8,2) |
| `result` enum |

---

## 5.11 엔티티 정의 — 사용자 (2차/3차)

### E-38 User / E-39 Wallet / E-40 WalletTransaction

| User | 타입 |
|---|---|
| `id` uuid PK (auth.users 참조) |
| `display_name` text / `role` enum `USER / ADMIN` |

| Wallet | 타입 |
|---|---|
| `user_id` uuid PK FK (1:1) |
| `balance` bigint / `currency` enum `POINT` |

| WalletTransaction | 타입 |
|---|---|
| `id` uuid PK / `user_id` uuid FK |
| `amount` bigint / `reason` enum `BET_PLACE / BET_WIN / BET_VOID / TOPUP` |
| `ref_bet_id` uuid FK nullable / `balance_after` bigint |

---

## 5.12 【핵심】 공통코드 테이블 설계 — D-01 반영

> **목적**: 시뮬레이션·경제·UI의 튜닝 상수를 코드 밖으로 완전히 분리해, **배포 없이 밸런싱**하고 **변경 이력을 추적**하며, **결정론을 깨지 않는다**.
> 관련 요구사항: FR-AD-011 ~ FR-AD-016, FR-UI-025, NFR-CFG-001 ~ 007, NFR-DT-007

### E-41 CommonCodeGroup — 공통코드 그룹

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `group_code` | text PK | UPPER_SNAKE | 그룹 식별자 (예: `ROUND_INTERVAL_MIN`) |
| `group_name` | text NOT NULL | | 표시명 (예: "리그별 라운드 간격") |
| `description` | text NOT NULL | | 용도·영향 범위 설명 |
| `value_type` | enum NOT NULL | `INT / DECIMAL / STRING / BOOL / JSON` | 이 그룹 코드들의 값 타입 |
| `apply_policy` | enum NOT NULL | `NEXT_SEASON / IMMEDIATE / NEXT_MARKET` | **발효 정책 (FR-AD-013)** |
| `related_fr` | text[] | | 관련 FR ID 목록 (문서 추적성) |
| `min_value` / `max_value` | numeric nullable | | 숫자형 허용 범위 (NFR-CFG-004) |
| `json_schema` | jsonb nullable | | JSON형 스키마 검증용 |
| `is_active` | boolean DEFAULT true | | |
| `sort_order` | int | | 콘솔 표시 순서 |
| `created_at` / `updated_at` | timestamptz | | |

### E-42 CommonCode — 공통코드 값

| 필드 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | uuid PK | | |
| `group_code` | text FK → CommonCodeGroup | NOT NULL | |
| `code` | text | NOT NULL | 그룹 내 키 (예: `LEAGUE_1`, `SEVERITY_3`) |
| `world_id` | uuid FK → World nullable | | null = 전역 기본값, 값 있으면 해당 월드 오버라이드 |
| `value` | text | NOT NULL | 원시 문자열 값 |
| `value_num` | numeric nullable | | 숫자형일 때 인덱싱·검증용 파생 컬럼 |
| `value_json` | jsonb nullable | | JSON형일 때 |
| `default_value` | text NOT NULL | | 초기 시드값 (되돌리기 기준) |
| `description` | text NOT NULL | | 이 코드의 의미 |
| `unit` | text nullable | | 단위 ("분", "%", "pt") |
| `sort_order` | int | | |
| `is_active` | boolean DEFAULT true | | |
| `effective_from_season` | int nullable | | 발효 시즌 (`NEXT_SEASON` 정책용) |
| `created_at` / `updated_at` | timestamptz | | |
| `updated_by` | uuid FK → User nullable | | |

**제약**
- UNIQUE `(group_code, code, world_id)`
- CHECK: `value_type` 이 숫자형이면 `value_num` NOT NULL 이고 `min_value ≤ value_num ≤ max_value`
- CHECK: `value_type = JSON` 이면 `value_json` NOT NULL

**인덱스**: `(group_code, world_id, is_active)` — 그룹 단위 일괄 로딩용

### E-43 CommonCodeHistory — 변경 이력

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `common_code_id` | uuid FK → CommonCode | |
| `group_code` / `code` | text | 코드 삭제 후에도 추적 가능하도록 비정규화 |
| `action` | enum | `CREATE / UPDATE / DEACTIVATE / REACTIVATE` |
| `old_value` / `new_value` | text nullable | |
| `old_effective_from_season` / `new_effective_from_season` | int nullable | |
| `changed_by` | uuid FK → User | |
| `changed_at` | timestamptz | |
| `reason` | text NOT NULL | **사유 필수** (NFR-CFG-002) |

**제약**: append-only — UPDATE / DELETE 권한 없음 (NFR-SEC-010)

### E-44 SimConstantSnapshot — 상수 스냅샷 (결정론 보장)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `world_id` | uuid FK | |
| `snapshot_hash` | text UNIQUE NOT NULL | 값 집합의 SHA-256 (중복 제거 키) |
| `constants` | jsonb NOT NULL | `{ "GROUP_CODE": { "CODE": value, ... }, ... }` 전체 값 집합 |
| `created_at` | timestamptz | 최초 생성 시각 |
| `first_used_season` | int | |
| `ref_count` | int | 참조 Fixture/Season 수 (관측용) |

**사용 규칙 (FR-AD-014)**
1. 경기 시뮬 직전, 현재 유효 상수 집합을 직렬화하고 해시를 계산한다.
2. 동일 해시 레코드가 있으면 그 `id`를 재사용하고, 없으면 새로 생성한다.
3. `fixture.snapshot_id` (NOT NULL)에 기록한다.
4. 재현(FR-AD-004) 시 반드시 `snapshot_id`의 `constants`를 로드해 사용한다.

> **NFR-CFG-006**: 해시 중복 제거로 1시즌(≈1,244경기) 처리 후 스냅샷 레코드 ≤ 20건, 테이블 크기 ≤ 1MB.

---

### 5.12.1 공통코드 그룹 카탈로그 (초기 시드)

> FR-AD-011의 30개 필수 대상. `apply_policy` 열이 발효 시점(FR-AD-013)을 결정한다.

| # | group_code | 설명 | 타입 | 코드 예시 (기본값) | apply_policy | 관련 FR |
|---|---|---|---|---|---|---|
| 1 | `ROUND_INTERVAL_MIN` | 리그별 라운드 간격(분) | INT | `LEAGUE_1`=**75**, `LEAGUE_2`=**90**, `LEAGUE_3`=**115** | NEXT_SEASON | FR-LG-009 |
| 2 | `LEAGUE_TEAM_COUNT` | 리그별 팀 수 | INT | `LEAGUE_1`=24, `LEAGUE_2`=20, `LEAGUE_3`=16 | NEXT_SEASON | FR-LG-001 |
| 3 | `PROMOTION_RELEGATION_SLOTS` | 승격·강등 슬롯 | INT | `PROMOTION`=3, `RELEGATION`=3 | NEXT_SEASON | FR-LG-006 |
| 4 | `MATCH_POINTS` | 승/무/패 승점 | INT | `WIN`=3, `DRAW`=1, `LOSS`=0 | NEXT_SEASON | FR-LG-004 |
| 5 | `PHASE_DURATION_MIN` | 페이즈 길이(분) | INT | `REGULAR`=3450, `CUP_SLOT`=75, `PLAYOFF`=300, `SETTLEMENT`=50, `PRESEASON`=150 | NEXT_SEASON | FR-LG-010 |
| 6 | `CONDITION_MULT` | 컨디션 배율 계수 | DECIMAL | `BASE`=0.70, `RANGE`=0.30, `MIN_C`=1, `MAX_C`=10 | NEXT_SEASON | FR-MT-008 |
| 7 | `FITNESS_PARAM` | 피로 계수 | DECIMAL/INT | `MULT_BASE`=0.75, `MULT_RANGE`=0.25, `DRAIN_FULL`=18, `RECOVER`=12, `STREAK_FACTOR`=0.7 | NEXT_SEASON | FR-MT-007 |
| 8 | `POSITION_PROFICIENCY_MULT` | 포지션 숙련도 배율 | DECIMAL | `P5`=1.00, `P4`=0.95, `P3`=0.88, `P2`=0.75, `P1`=0.60, `UNFAMILIAR_BASE`=0.88, `UNFAMILIAR_STEP`=0.11, `UNFAMILIAR_FLOOR`=0.45, `GK_CROSS`=0.35 | NEXT_SEASON | FR-PL-006 |
| 9 | `HOME_ADVANTAGE` | 홈 어드밴티지 | DECIMAL | `MULT`=1.05, `CONDITION_BONUS`=0.5 | NEXT_SEASON | FR-MT-005 |
| 10 | `WEATHER_EFFECT` | 날씨 효과 계수 | JSON | `CLEAR`, `RAIN`, `HEAVY_RAIN`, `SNOW`, `WINDY`, `HOT`, `COLD`, `FOG`, `CLOUDY` 각 계수 객체 | NEXT_SEASON | FR-MT-006 |
| 11 | `WEATHER_PROBABILITY` | 날씨 발생 확률 | DECIMAL | 9종 각 확률 (합 1.0) | NEXT_SEASON | FR-MT-006 |
| 12 | `INJURY_PARAM` | 부상 확률·결장 | DECIMAL/INT | `BASE_TICK_PROB`, `SEVERITY_1_MULT`=0.93, `SEVERITY_4_RETURN_MULT`=0.90, `S2_MIN/MAX`=1/3, `S3_MIN/MAX`=4/10, `S4_MIN/MAX`=11/40 | NEXT_SEASON | FR-PL-009 |
| 13 | `GROWTH_AGE_FACTOR` | 성장 나이대 계수 | DECIMAL | `ROOKIE_UP`=1.6, `ROOKIE_DOWN`=0.4, `PRIME_UP`=1.0, `PRIME_DOWN`=1.0, `VETERAN_UP`=0.5, `VETERAN_DOWN`=1.4, `OLD_UP`=0.2, `OLD_DOWN`=2.0, `MAX_DELTA`=6 | NEXT_SEASON | FR-PL-011 |
| 14 | `FAMILIARITY` | 팀 캐미 계수 | DECIMAL | `STEP`=0.015, `CAP`=0.06 | NEXT_SEASON | FR-PL-010 |
| 15 | `LEAGUE_FINISH_POINT` | 순위 포인트 곡선 | DECIMAL | `L1_BASE`=**1500**, `L1_RANGE`=**1500**, `L2_BASE`=**850**, `L2_RANGE`=**950**, `L3_BASE`=**400**, `L3_RANGE`=**600**, `EXP`=1.8 | NEXT_SEASON | FR-EC-002 |
| 16 | `PLAYOFF_PRIZE` | 플레이오프 상금 | INT | `L1_WIN`=1500 … `L3_RUNNERUP`=200 | NEXT_SEASON | FR-EC-003 |
| 17 | `CUP_PRIZE` | 컵 상금 | INT | `WIN`=2000, `RUNNERUP`=1000, `SF`=500, `QF`=250, `R16`=120, `R32`=60, `R1`=30, `GIANT_KILLING`=100 | NEXT_SEASON | FR-EC-004 |
| 18 | `MARKET_VALUE_PARAM` | 몸값 공식 계수 | DECIMAL | `OVR_DIVISOR`=15, `OVR_EXP`=2.6, `AGE_*`, `POT_STEP`=0.05, `REP_BASE`=0.8, `REP_STEP`=0.004, `CONTRACT_*`, `TIER_*`, `FLOOR`=100 | NEXT_SEASON | FR-EC-005 |
| 19 | `WAGE_RATIO` | 급여 비율 | DECIMAL | `RATIO`=0.18 | NEXT_SEASON | FR-EC-006 |
| 20 | `SPONSOR_PARAM` | 스폰서 규칙 | INT/DECIMAL | `MAX_PER_TEAM`=**3**, `CONTRACT_MIN`=**1**, `CONTRACT_MAX`=**10**, `SHARE_PCT_CAP`=30, `POOL_MIN`=40 | NEXT_SEASON | FR-EC-008, 010, 011 |
| 21 | `CONTRACT_PARAM` | 선수 계약 | INT | `YEARS_MIN`=**1**, `YEARS_MAX`=**5** | NEXT_SEASON | FR-TR-005 |
| 22 | `SQUAD_PARAM` | 스쿼드 규칙 | INT | `MIN`=22, `MAX`=30, `HARD_MIN`=18, `GK_MIN`=2, `CB_MIN`=3 | NEXT_SEASON | FR-TM-007 |
| 23 | `YOUTH_PARAM` | 유소년 배출 | DECIMAL | `BASE`=0.5, `LEVEL_STEP`=0.4, `SANCTION_BONUS_PP`=0.10, `ROOKIE_AGE_MIN/MAX`=16/18, `ROOKIE_OVR_MIN/MAX`=6/14 | NEXT_SEASON | FR-YT-001, 002 |
| 24 | `RETIREMENT_PARAM` | 은퇴 임계 | INT/DECIMAL | `RISK_START_AGE`=34, `FORCE_AGE`=40, `BASE_PROB` | NEXT_SEASON | FR-PL-015 |
| 25 | `ODDS_PARAM` | 배당 산출 | INT/DECIMAL | `MC_N_MATCH`=**3000**, `MC_N_SEASON`=**300**, `OVERROUND`=**1.06**, `MIN_ODDS`=1.01, `MAX_ODDS`=500 | NEXT_MARKET | FR-BT-005 |
| 26 | `BET_LIMIT` | 베팅 한계 | INT | `STAKE_MIN`=100, `SINGLE_MAX`=100000, `MULTI_RETURN_MAX`=1000000, `LEGS_MAX`=10 | NEXT_MARKET | FR-BT-010 |
| 27 | `RATING_WEIGHT` | 평점 가중치 | JSON | 필드플레이어·GK 이벤트별 가중치 객체 | NEXT_SEASON | FR-ST-003 |
| 28 | `OVR_WEIGHT` | 포지션별 OVR 가중치 | JSON | 11군 각 34속성 가중치 객체 | NEXT_SEASON | FR-PL-003 |
| 29 | `UI_PARAM` | UI 동작 | INT | `POLL_INTERVAL_MS`=5000, `POLL_LIVE_MS`=3000, `LEADERBOARD_MIN_APPEARANCE_PCT`=30 | IMMEDIATE | FR-UI-022, FR-ST-004 |
| 30 | `MANAGER_MATCHUP` | 감독 상성 매트릭스 | JSON | 6×6 성향 상성 계수 | NEXT_SEASON | FR-MT-009 |
| 31 | `CRON_PARAM` | 크론 설정 | INT | `INTERVAL_MIN`=**1**, `LOCK_TIMEOUT_MIN`=5, `CATCHUP_MAX_PER_RUN`=50, `RETRY_MAX`=3, `GAP_DETECT_MULTIPLIER`=3 | IMMEDIATE | FR-AD-017~020 |
| 32 | `SANCTION_PARAM` | 리그3 리빌드 제재 | DECIMAL/INT | `REP_PENALTY_PERMANENT`=3, `REP_PENALTY_NEGOTIATION`=5, `GRANT_PCT`=0.40, `YOUTH_BONUS_PP`=0.10 | NEXT_SEASON | FR-LG-007 |
| 33 | `CUP_PARAM` | 컵대회 설정 | INT/JSON | `BYE_COUNT`=4, `INSERT_ROUNDS`=[6,12,18,24,32,40] | NEXT_SEASON | FR-LG-015 |
| 34 | `CARD_PARAM` | 카드·정지 | INT | `SUSPENSION_THRESHOLD`=5, `RED_MIN/MAX`=1/3 | NEXT_SEASON | FR-MT-011 |
| 35 | `EFFECTIVE_MULT_CLAMP` | 보정 체인 클램프 | DECIMAL | `MIN`=0.35, `MAX`=1.35 | NEXT_SEASON | FR-MT-004 |
| 36 | `TRANSFER_PARAM` | 이적 빈도·협상 | DECIMAL/INT | `RATE_MIN_PCT`=8, `RATE_MAX_PCT`=15, `PER_TEAM_MAX`=4, `SUCCESS_MIN`=0.05, `SUCCESS_MAX`=0.95, `TRADE_VALUE_GAP_PCT`=15, `LOAN_WAGE_SHARE_PCT`=50 | NEXT_SEASON | FR-TR-003, 006, 009, 010 |

> 카탈로그는 36개 그룹으로 FR-AD-011의 30개 필수 항목을 모두 포함하고 크론·제재·컵 설정을 추가로 커버한다.

### 5.12.2 공통코드 로딩 규칙

1. **해석 우선순위**: `world_id` 일치 레코드 → `world_id IS NULL` 전역 기본값 → 하드코딩 폴백(NFR-CFG-005).
2. **발효 필터**: `apply_policy = NEXT_SEASON` 인 그룹은 `effective_from_season ≤ 현재 시즌` 인 값 중 최신을 사용한다.
3. **캐시**: 프로세스 내 그룹 단위 캐시. 변경 시 무효화. 경기 1건 시뮬 중에는 값이 변하지 않는다(FR-AD-016).
4. **스냅샷**: 경기·시즌 처리 시작 시 해석 결과 전체를 직렬화 → 해시 → `SimConstantSnapshot` 참조(FR-AD-014).

---

## 5.13 엔티티 정의 — 운영 / 감사

### E-45 CronRun

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `started_at` / `finished_at` | timestamptz | |
| `duration_ms` | int | |
| `lock_acquired` | boolean | 실패 시 no-op |
| `fixtures_processed` | int | |
| `is_catch_up` | boolean | 폴백 경로 여부 (FR-AD-019) |
| `status` | enum | `SUCCESS / PARTIAL / FAILED / NOOP` |
| `retry_count` | int | |
| `error_code` / `error_message` | text nullable | |
| `snapshot_hash` | text nullable | 사용한 상수 스냅샷 |

### E-46 CronGap

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | uuid PK | |
| `gap_started_at` / `gap_ended_at` | timestamptz | |
| `gap_minutes` | int | |
| `missed_fixture_count` | int | |
| `recovered_at` | timestamptz nullable | catch-up 완료 시각 |
| `detected_at` | timestamptz | |

### E-47 AuditLog

| 필드 | 타입 |
|---|---|
| `id` uuid PK |
| `actor_type` enum `HUMAN / ENGINE / ODDS / SETTLEMENT` |
| `actor_id` uuid nullable |
| `action` text |
| `target_type` / `target_id` |
| `payload` jsonb |
| `created_at` timestamptz |

**제약**: append-only (NFR-SEC-010)

---

## 5.14 관계 서술 (핵심)

| # | 관계 | 설명 |
|---|---|---|
| R-01 | World → League(3) → TeamSeason → Team | 팀의 리그 소속은 시즌마다 바뀌므로 `Team.league_id`를 두지 않고 `TeamSeason`으로 관리한다. 승강 히스토리·티어별 재적 시즌의 단일 근거. |
| R-02 | Player ↔ Team | 직접 FK가 아니라 **활성 `Contract`** 로 결정된다. 임대 중인 선수는 `Loan`이 실제 출전 팀을 결정한다. **출전 가능 팀 = `Loan.active ? loan_team : contract.team`** |
| R-03 | Fixture → MatchEvent (1:N) | 이벤트 로그가 **SSOT**. `PlayerMatchStat`·`TeamSeasonStat`은 이벤트에서 파생되며 언제든 재계산 가능해야 한다(FR-ST-005). |
| R-04 | Fixture → SimConstantSnapshot (N:1) | **NOT NULL**. 결정론의 필수 축. 다수 Fixture가 동일 스냅샷을 공유한다(해시 중복 제거). |
| R-05 | Standing (season × league × round × team) | 라운드별 순위 스냅샷. "N라운드 시점 순위" 조회와 시즌 마켓 배당 입력으로 사용. |
| R-06 | Sponsor ↔ Team (N:M via SponsorContract) | 팀당 활성 계약 ≤ 3 제약. 스폰서 부도 시 관련 계약 전건 `VOIDED`. |
| R-07 | PointTransaction | `owner_type`으로 Team과 Sponsor의 원장을 통합 관리한다. `balance` 필드는 원장의 파생 캐시이며 정합성 배치를 둔다. |
| R-08 | BetMarket → BetSelection → Odds | 배당은 갱신되므로 이력 테이블로 두고 `is_current`로 현재값을 지정한다. `Bet.odds_snapshot`이 제출 시점 배당을 **동결**해 사후 배당 변경이 정산에 영향을 주지 않게 한다. |
| R-09 | Award (인물) vs Trophy (클럽) | 조회 경로를 단순화하기 위해 분리. 선수 상세는 Award만, 클럽 상세는 Trophy만 조회한다. |
| R-10 | CommonCodeGroup → CommonCode → CommonCodeHistory | 그룹이 타입·범위·발효 정책을 정의하고, 코드가 값을 담고, 이력이 변경을 추적한다. |
| R-11 | CommonCode → SimConstantSnapshot | 직접 FK가 아니라 **값 집합의 직렬화 결과**로 연결된다. 코드가 이후 변경되어도 스냅샷은 불변이다. |
| R-12 | PlayerAttribute vs PlayerAttributeHistory | 전자는 현재값(1:1), 후자는 시즌별 스냅샷(1:N). 성장 곡선 UI는 후자를 조회한다. |
| R-13 | Player → PlayerState | 1:1이지만 갱신 빈도가 매우 높아(라운드마다) `Player`에서 분리한다. 쓰기 경합과 캐시 무효화 범위를 줄이기 위함. |

---

## 5.15 제약사항 (DC)

| ID | 제약 | 근거 / 대응 | 관련 요구사항 |
|---|---|---|---|
| **DC-01** | **Mock ↔ Supabase 동일 TS 타입** | `src/types/`를 단일 소스로 하고, DB 생성 타입은 별도 파일에 두되 도메인 타입으로 매핑하는 어댑터 레이어를 둔다. 컴포넌트는 도메인 타입만 사용한다 | FR-UI-023, NFR-MT-002 |
| **DC-02** | **Next.js 16 API가 학습 데이터와 다를 수 있음** | 코드 작성 전 `node_modules/next/dist/docs/` 의 해당 가이드를 필독한다. 특히 라우트 핸들러, 서버 액션, 캐싱/revalidate, `params` 비동기화 여부 | NFR-MT-006, AGENTS.md |
| **DC-03** | **테스트 러너 — Vitest 도입 확정** | 구 "러너 부재" 제약은 D-03으로 해소. 단 본 단계에서 설치하지 않으며 구현 단계에서 도입 | NFR-QA-001, D-03 |
| **DC-04** | **의존성 최소 상태** (next / react / react-dom 3개) | 신규 의존성은 대체 불가성과 번들 영향을 검토한 뒤 최소로 도입. 1차 릴리스 추가는 5개 이내 목표 (Supabase 클라이언트, zod, Vitest 등) | NFR-MT-008 |
| **DC-05** | **RLS 필수 고려** | 공개 읽기 테이블(리그·경기·선수·스탯)은 SELECT 공개 + 쓰기 차단. 베팅·지갑은 `user_id = auth.uid()` 제한. 엔진 쓰기는 service role 전용. **`match_event`는 경과 시간 필터를 뷰 또는 보안 함수로 강제** | NFR-SEC-003, NFR-SEC-004 |
| **DC-06** | **데이터 볼륨** | 시즌당 이벤트 ≈75,000건. `match_event(match_id, sequence)` 및 `(match_id, minute)` 인덱스 필수. `player_season_stat(season_id, league_id, <지표>)` 리더보드 커버링 인덱스. 3시즌 초과분 아카이브 정책 | NFR-SC-001, NFR-SC-002 |
| **DC-07** | **타임존** | 모든 시각은 UTC(`timestamptz`)로 저장하고 클라이언트에서 로컬 변환한다 | — |
| **DC-08** | **수치 정밀도** | 포인트는 정수(`bigint`), 배당은 `numeric(8,2)`, 확률은 `numeric(9,8)`, 컨디션은 `numeric(3,1)`. 부동소수 누적 오차를 방지한다 | NFR-QA-005 |
| **DC-09** | **초기 Mock 규모** | 60팀 × 26명 ≈ 1,560명. Mock 단계에서 정적 JSON 하드코딩을 피하고 **시드 기반 결정론적 팩토리**로 런타임 생성한다 | FR-UI-023 |
| **DC-10** | **경로 별칭** | `@/*` → `./src/*`. 신규 코드는 `src/types/`, `src/lib/`, `src/components/` 하위에 배치 | CLAUDE.md |
| **DC-11** | **이미지 에셋** | 엠블럼·아바타는 외부 이미지 의존 없이 시드 기반 절차적 SVG로 생성한다(라이선스·용량·오프라인 문제 회피) | FR-TM-001 |
| **DC-12** | **FM 실데이터 사용 금지** | 원본 기획의 "FM 마케팅" 표현은 **능력치 체계(1~30 스케일, 카테고리 구성) 참고**로 해석한다. 실제 FM 데이터·실명 선수·실존 클럽은 저작권 리스크가 있어 사용하지 않으며, 전부 절차적 생성한다 | FR-PL-002, FR-PL-014, AS-02 |
| **DC-13** | **공통코드 없이는 엔진이 동작하지 않아야 하는가** | 아니다. 미등록 시 하드코딩 기본값으로 폴백하되 WARN 로그를 남긴다. 초기 부트스트랩·장애 상황에서 시스템이 정지하지 않게 한다 | NFR-CFG-005 |
| **DC-14** | **상수 스냅샷은 필수** | `fixture.snapshot_id`는 NOT NULL이다. 스냅샷 없이 생성된 경기는 재현 불가이므로 허용하지 않는다 | FR-AD-014, NFR-DT-007 |
| **DC-15** | **Edge Function 실행 제약** | Supabase Edge Function은 실행 시간 제한이 있으므로 1회 실행 처리량에 상한(기본 50경기)을 둔다. 초과분은 다음 틱으로 이월한다 | FR-AD-019, NFR-CR-004 |
| **DC-16** | **서비스 롤 키 격리** | Edge Function 환경 시크릿에서만 로드한다. 클라이언트 번들·소스·로그 어디에도 나타나지 않아야 한다 | FR-AD-021, NFR-SEC-001, NFR-CR-008 |

---

## 5.16 인덱스 / 성능 설계 요약

| 테이블 | 인덱스 | 목적 |
|---|---|---|
| `fixture` | `(season_id, league_id, round)` | 라운드별 일정 조회 |
| `fixture` | `(status, kickoff_at)` | **크론의 킥오프 도래 탐지** (부분 인덱스: `status = 'SCHEDULED'`) |
| `match_event` | `(match_id, sequence)` | 타임라인 조회 |
| `match_event` | `(match_id, minute)` | 경과 시간 필터 (NFR-SEC-004) |
| `player_match_stat` | `(player_id, match_id)` | 선수별 경기 스탯 |
| `player_season_stat` | `(season_id, league_id, goals DESC)` 외 지표별 | 리더보드 |
| `standing` | `(season_id, league_id, round, rank)` | 순위표 |
| `point_transaction` | `(owner_type, owner_id, created_at)` | 원장 조회·잔고 검증 |
| `common_code` | `(group_code, world_id, is_active)` | 그룹 단위 일괄 로딩 |
| `sim_constant_snapshot` | `snapshot_hash` UNIQUE | 중복 제거 |
| `cron_run` | `(started_at DESC)` | 최근 실행 조회 |
| `bet` | `(user_id, placed_at DESC)` | 내 베팅 |
| `bet_market` | `(status, closes_at)` | 마감 처리 |

---

## 5.17 데이터 생명주기

| 데이터 | 온라인 보존 | 아카이브 | 근거 |
|---|---|---|---|
| `match_event` | 3시즌 | 이후 콜드 스토리지 | NFR-SC-002 — 볼륨 최대 |
| `player_match_stat` | 3시즌 | 이후 시즌 집계만 유지 | 동상 |
| `player_season_stat` / `team_season_stat` | 영구 | — | 히스토리 가치 |
| `standing` | 영구 (최종 라운드만 영구, 중간 라운드는 3시즌) | | 조회 빈도 |
| `point_transaction` | 영구 | — | 회계 감사 |
| `common_code_history` | 영구 | — | 감사 |
| `sim_constant_snapshot` | 영구 | — | 재현성 (용량 작음) |
| `cron_run` | 90일 | 이후 집계만 | 운영 관측 |
| `audit_log` / 베팅 감사 | 영구 | — | 규제·분쟁 대응 |
