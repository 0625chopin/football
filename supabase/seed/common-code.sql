-- ============================================================================
-- 36일차 (2026-09-08) — Task 031a: 36개 그룹 실제 기본값 시드 데이터 작성 (D-26)
-- 담당: 3팀 데이터·밸런싱·배당팀 / 근거: docs/require/05-data-requirements.md §5.12.1
-- (공통코드 그룹 카탈로그 초기 시드, #1~#36) + src/lib/config/catalog.ts(38종 전량,
-- 14일차 #37 NATIONALITY_WEIGHT·31일차 #38 MANAGER_STYLE_XG 추가분 포함)
-- ============================================================================
--
-- ✅ 41일차(2026-09-15) 6팀이 이 파일 내용 그대로 execute_sql로 원격 DB에 적재 완료
-- (파일 자체는 무수정 — apply_migration이 아니라 execute_sql을 쓴 이유는 이 파일이
-- DDL이 아니라 순수 DML/초기 데이터라서다). 적재 확인: common_code_group 38행,
-- common_code 155행(값 미시드 5개 그룹 제외), CRON_PARAM.LOCK_TIMEOUT_MIN=5 /
-- UI_PARAM.POLL_INTERVAL_MS=5000·POLL_LIVE_MS=3000 반영 확인.
-- world_id는 전량 NULL(전역 기본값)이다. 월드별 오버라이드는 이 파일의 대상이 아니다.
--
-- ## 그룹 수 표기 차이 (36 vs 38)
-- team-schedule 36일차 행과 05문서 5.12.1절 표는 "36개 그룹"을 말하지만, 그 이후
-- 두 차례 그룹이 추가되어 `catalog.ts`는 현재 38종을 카탈로그의 단일 소스로 확정하고
-- 있다(14일차 I-88 `NATIONALITY_WEIGHT`, 31일차 I-160 `MANAGER_STYLE_XG`). 이 파일은
-- `common_code_group` 메타데이터를 **38종 전량** 시드한다 — 36종만 시드하면
-- `common_code.group_code`가 FK로 참조할 그룹이 2개 없는 상태가 되어 이후 그
-- 2그룹에 값이 채워질 때(031b) 매번 그룹 메타데이터부터 다시 만들어야 하는 번거로움이
-- 생긴다. catalog.ts 자체가 38종을 단일 소스로 못박아 둔 이상 그와 어긋나는 부분
-- 시드는 오히려 새 불일치를 만든다고 판단했다(팀장 보고 대상 — 판단 근거만 남기고
-- 표 문구 자체는 고치지 않음, 표 정정은 1팀 소관).
--
-- ## default_value/value 값의 출처 (D-26)
-- 각 코드의 `value`/`default_value`는 05문서 5.12.1절 표의 "코드 예시(기본값)" 컬럼을
-- 그대로 옮긴 것이다 — `src/lib/config/fallback.ts`(11일차 SAFE_DEFAULT_VALUES)가 이미
-- 같은 원본에서 옮겨 둔 값을 그 파일 자신의 주석("36일차 시드 SQL 작성 시 이 파일을
-- 참고 출발점으로 재사용할 수 있다")대로 재사용했다. **단 하나의 예외가 있다**:
--
-- ### ⚠️ UI_PARAM은 fallback.ts 값을 그대로 쓰지 않는다
-- `fallback.ts`의 `UI_PARAM.POLL_INTERVAL_MS`/`POLL_LIVE_MS`(30000/15000)는 그 파일
-- 자신의 주석이 명시하듯 "하드코딩 폴백 발생(장애) 시에만 쓰이는 비용 안전망 전용 값"이지
-- 정상 운영값이 아니다. 그 주석은 "정상값 5000/3000은 이 값이 아니라, 6팀이 common_code
-- 실데이터를 적재(031a, 36일차)한 뒤 전역 기본값 소스가 공급한다"고 이 작업(031a)을
-- 직접 지목한다. 즉 이 시드가 바로 그 "정상값 공급원"이므로, 여기서는 05문서 원문값인
-- POLL_INTERVAL_MS=5000 / POLL_LIVE_MS=3000을 쓴다(폴백의 30000/15000이 아님).
-- `LEADERBOARD_MIN_APPEARANCE_PCT`=30은 비용과 무관해 양쪽 다 동일하다.
--
-- ### ODDS_PARAM은 fallback.ts 값을 그대로 쓴다 (05문서 원문이 아님)
-- `MC_N_SEASON`은 05문서 원문 300이 아니라 27일차 I-08 반영값 1500을 쓴다 — 이는
-- "장애 시에만 쓰는 안전망"이 아니라 배당오차 ±11.5% 문제를 해결한 **확정된 개선값**이라
-- UI_PARAM과는 성격이 다르다(그대로 재사용이 맞다). `REFRESH_ROUND_INTERVAL`=5,
-- `INITIAL_LEAD_MIN`=30(33일차 I-167), `PARTITION_COUNT`=8(NFR-SC-004)도 같은 이유로
-- fallback.ts 값을 그대로 쓴다.
--
-- ## 값을 채우지 않은 5개 그룹 (억측 금지 원칙)
-- `WEATHER_EFFECT`(#10)·`RATING_WEIGHT`(#27)·`OVR_WEIGHT`(#28)·`MANAGER_MATCHUP`(#30)·
-- `NATIONALITY_WEIGHT`(#37)는 05문서에 "각 계수 객체"/"가중치 객체"/"상성 계수"라는
-- 구조 설명만 있고 구체 숫자가 없다(fallback.ts가 이미 같은 이유로 빈 `{}`로 둔 5개
-- 그룹과 동일). 이 파일도 같은 원칙을 따라 이 5개 그룹은 `common_code_group` 메타데이터만
-- 시드하고 `common_code` 값 행은 만들지 않는다 — 근거 없는 숫자를 DB에 "확정 기본값"으로
-- 못박는 것이 오히려 더 큰 위험이다(031b 밸런싱 튜닝에서 실값 등재 예정).
--
-- ## 값 없이 스칼라만 있는 그룹의 처리 (이슈 후보 — 팀장 보고)
-- 아래 코드들은 05문서 표에 "=값" 예시가 없었는데도 fallback.ts(11일차)가 이미 구체
-- 숫자를 채워 두었다 — 이 시드도 같은 값을 그대로 물려받는다. 값 자체의 밸런싱 근거는
-- 없으므로 "정식 확정값"이 아니라 "동작 가능한 잠정값"으로 취급해야 한다:
--   - `INJURY_PARAM.BASE_TICK_PROB` = 0 (05문서에 값 예시 없음)
--   - `RETIREMENT_PARAM.BASE_PROB` = 0.05 (05문서에 값 예시 없음)
-- 또한 `PLAYOFF_PRIZE`는 05문서 표가 "L1_WIN=1500 … L3_RUNNERUP=200"로 중간 리그·순위
-- 조합을 생략 표기(…)했다 — 그 생략된 조합의 숫자를 억측으로 채우지 않고, 표에 실제로
-- 적힌 2개 코드(L1_WIN/L3_RUNNERUP)만 시드한다. 나머지 조합(L1_RUNNERUP,
-- L2_WIN/RUNNERUP, L3_WIN 등)은 이 파일에서 다루지 않는다 — 031b 소관.
--
-- ## effective_from_season 값 선택
-- `apply_policy = NEXT_SEASON` 그룹은 새 월드의 첫 시즌(시즌 1)부터 발효되도록
-- `effective_from_season = 1`을 채운다(policy.ts `resolveNextSeasonEffective`가
-- `effectiveFromSeason IS NULL`이면 항상 미발효로 판정하므로, NULL로 두면 시드
-- 자체가 절대 발효되지 않는 죽은 데이터가 된다). `IMMEDIATE`/`NEXT_MARKET` 그룹은 이
-- 컬럼을 쓰지 않으므로(policy.ts) NULL로 둔다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SECTION 1. common_code_group — 38개 그룹 메타데이터 전량
-- ----------------------------------------------------------------------------

INSERT INTO common_code_group
  (group_code, group_name, description, value_type, apply_policy, related_fr, is_active, sort_order, created_at, updated_at)
VALUES
  ('ROUND_INTERVAL_MIN', '리그별 라운드 간격(분)',
   '리그별 라운드 간격(분) — 코드 예시(기본값): LEAGUE_1=75, LEAGUE_2=90, LEAGUE_3=115',
   'INT', 'NEXT_SEASON', ARRAY['FR-LG-009'], true, 1, now(), now()),

  ('LEAGUE_TEAM_COUNT', '리그별 팀 수',
   '리그별 팀 수 — 코드 예시(기본값): LEAGUE_1=24, LEAGUE_2=20, LEAGUE_3=16',
   'INT', 'NEXT_SEASON', ARRAY['FR-LG-001'], true, 2, now(), now()),

  ('PROMOTION_RELEGATION_SLOTS', '승격·강등 슬롯',
   '승격·강등 슬롯 — 코드 예시(기본값): PROMOTION=3, RELEGATION=3',
   'INT', 'NEXT_SEASON', ARRAY['FR-LG-006'], true, 3, now(), now()),

  ('MATCH_POINTS', '승/무/패 승점',
   '승/무/패 승점 — 코드 예시(기본값): WIN=3, DRAW=1, LOSS=0',
   'INT', 'NEXT_SEASON', ARRAY['FR-LG-004'], true, 4, now(), now()),

  ('PHASE_DURATION_MIN', '페이즈 길이(분)',
   '페이즈 길이(분) — 코드 예시(기본값): REGULAR=3450, CUP_SLOT=75, PLAYOFF=300, SETTLEMENT=50, PRESEASON=150',
   'INT', 'NEXT_SEASON', ARRAY['FR-LG-010'], true, 5, now(), now()),

  ('CONDITION_MULT', '컨디션 배율 계수',
   '컨디션 배율 계수 — 코드 예시(기본값): BASE=0.70, RANGE=0.30, MIN_C=1, MAX_C=10',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-MT-008'], true, 6, now(), now()),

  ('FITNESS_PARAM', '피로 계수',
   '피로 계수(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MULT_BASE=0.75, MULT_RANGE=0.25, DRAIN_FULL=18, RECOVER=12, STREAK_FACTOR=0.7',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-MT-007'], true, 7, now(), now()),

  ('POSITION_PROFICIENCY_MULT', '포지션 숙련도 배율',
   '포지션 숙련도 배율 — 코드 예시(기본값): P5=1.00, P4=0.95, P3=0.88, P2=0.75, P1=0.60, UNFAMILIAR_BASE=0.88, UNFAMILIAR_STEP=0.11, UNFAMILIAR_FLOOR=0.45, GK_CROSS=0.35',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-006'], true, 8, now(), now()),

  ('HOME_ADVANTAGE', '홈 어드밴티지',
   '홈 어드밴티지 — 코드 예시(기본값): MULT=1.05, CONDITION_BONUS=0.5',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-MT-005'], true, 9, now(), now()),

  ('WEATHER_EFFECT', '날씨 효과 계수',
   '날씨 효과 계수 — 코드 예시(기본값): CLEAR/RAIN/HEAVY_RAIN/SNOW/WINDY/HOT/COLD/FOG/CLOUDY 각 계수 객체',
   'JSON', 'NEXT_SEASON', ARRAY['FR-MT-006'], true, 10, now(), now()),

  ('WEATHER_PROBABILITY', '날씨 발생 확률',
   '날씨 발생 확률 — 코드 예시(기본값): 9종 각 확률(합 1.0)',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-MT-006'], true, 11, now(), now()),

  ('INJURY_PARAM', '부상 확률·결장',
   '부상 확률·결장(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): BASE_TICK_PROB, SEVERITY_1_MULT=0.93, SEVERITY_4_RETURN_MULT=0.90, S2_MIN/MAX=1/3, S3_MIN/MAX=4/10, S4_MIN/MAX=11/40',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-009'], true, 12, now(), now()),

  ('GROWTH_AGE_FACTOR', '성장 나이대 계수',
   '성장 나이대 계수 — 코드 예시(기본값): ROOKIE_UP=1.6, ROOKIE_DOWN=0.4, PRIME_UP=1.0, PRIME_DOWN=1.0, VETERAN_UP=0.5, VETERAN_DOWN=1.4, OLD_UP=0.2, OLD_DOWN=2.0, MAX_DELTA=6',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-011'], true, 13, now(), now()),

  ('FAMILIARITY', '팀 캐미 계수',
   '팀 캐미 계수 — 코드 예시(기본값): STEP=0.015, CAP=0.06',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-010'], true, 14, now(), now()),

  ('LEAGUE_FINISH_POINT', '순위 포인트 곡선',
   '순위 포인트 곡선 — 코드 예시(기본값): L1_BASE=1500, L1_RANGE=1500, L2_BASE=850, L2_RANGE=950, L3_BASE=400, L3_RANGE=600, EXP=1.8',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-EC-002'], true, 15, now(), now()),

  ('PLAYOFF_PRIZE', '플레이오프 상금',
   '플레이오프 상금 — 코드 예시(기본값): L1_WIN=1500 … L3_RUNNERUP=200',
   'INT', 'NEXT_SEASON', ARRAY['FR-EC-003'], true, 16, now(), now()),

  ('CUP_PRIZE', '컵 상금',
   '컵 상금 — 코드 예시(기본값): WIN=2000, RUNNERUP=1000, SF=500, QF=250, R16=120, R32=60, R1=30, GIANT_KILLING=100',
   'INT', 'NEXT_SEASON', ARRAY['FR-EC-004'], true, 17, now(), now()),

  ('MARKET_VALUE_PARAM', '몸값 공식 계수',
   '몸값 공식 계수 — 코드 예시(기본값): OVR_DIVISOR=15, OVR_EXP=2.6, AGE_*, POT_STEP=0.05, REP_BASE=0.8, REP_STEP=0.004, CONTRACT_*, TIER_*, FLOOR=100',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-EC-005'], true, 18, now(), now()),

  ('WAGE_RATIO', '급여 비율',
   '급여 비율 — 코드 예시(기본값): RATIO=0.18',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-EC-006'], true, 19, now(), now()),

  ('SPONSOR_PARAM', '스폰서 규칙',
   '스폰서 규칙(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MAX_PER_TEAM=3, CONTRACT_MIN=1, CONTRACT_MAX=10, SHARE_PCT_CAP=30, POOL_MIN=40',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-EC-008', 'FR-EC-010', 'FR-EC-011'], true, 20, now(), now()),

  ('CONTRACT_PARAM', '선수 계약',
   '선수 계약 — 코드 예시(기본값): YEARS_MIN=1, YEARS_MAX=5',
   'INT', 'NEXT_SEASON', ARRAY['FR-TR-005'], true, 21, now(), now()),

  ('SQUAD_PARAM', '스쿼드 규칙',
   '스쿼드 규칙 — 코드 예시(기본값): MIN=22, MAX=30, HARD_MIN=18, GK_MIN=2, CB_MIN=3',
   'INT', 'NEXT_SEASON', ARRAY['FR-TM-007'], true, 22, now(), now()),

  ('YOUTH_PARAM', '유소년 배출',
   '유소년 배출 — 코드 예시(기본값): BASE=0.5, LEVEL_STEP=0.4, SANCTION_BONUS_PP=0.10, ROOKIE_AGE_MIN/MAX=16/18, ROOKIE_OVR_MIN/MAX=6/14',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-YT-001', 'FR-YT-002'], true, 23, now(), now()),

  ('RETIREMENT_PARAM', '은퇴 임계',
   '은퇴 임계(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): RISK_START_AGE=34, FORCE_AGE=40, BASE_PROB',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-015'], true, 24, now(), now()),

  ('ODDS_PARAM', '배당 산출',
   '배당 산출(그룹 내 INT·DECIMAL 혼재 — DECIMAL로 표현) — 코드 예시(기본값): MC_N_MATCH=3000, MC_N_SEASON=1500(27일차 I-08 반영), REFRESH_ROUND_INTERVAL=5, OVERROUND=1.06, MIN_ODDS=1.01, MAX_ODDS=500, INITIAL_LEAD_MIN=30(33일차 I-167), PARTITION_COUNT=8',
   'DECIMAL', 'NEXT_MARKET', ARRAY['FR-BT-005'], true, 25, now(), now()),

  ('BET_LIMIT', '베팅 한계',
   '베팅 한계 — 코드 예시(기본값): STAKE_MIN=100, SINGLE_MAX=100000, MULTI_RETURN_MAX=1000000, LEGS_MAX=10',
   'INT', 'NEXT_MARKET', ARRAY['FR-BT-010'], true, 26, now(), now()),

  ('RATING_WEIGHT', '평점 가중치',
   '평점 가중치 — 코드 예시(기본값): 필드플레이어·GK 이벤트별 가중치 객체',
   'JSON', 'NEXT_SEASON', ARRAY['FR-ST-003'], true, 27, now(), now()),

  ('OVR_WEIGHT', '포지션별 OVR 가중치',
   '포지션별 OVR 가중치 — 코드 예시(기본값): 11군 각 34속성 가중치 객체',
   'JSON', 'NEXT_SEASON', ARRAY['FR-PL-003'], true, 28, now(), now()),

  ('UI_PARAM', 'UI 동작',
   'UI 동작 — 코드 예시(기본값): POLL_INTERVAL_MS=5000, POLL_LIVE_MS=3000, LEADERBOARD_MIN_APPEARANCE_PCT=30',
   'INT', 'IMMEDIATE', ARRAY['FR-UI-022', 'FR-ST-004'], true, 29, now(), now()),

  ('MANAGER_MATCHUP', '감독 상성 매트릭스',
   '감독 상성 매트릭스 — 코드 예시(기본값): 6×6 성향 상성 계수',
   'JSON', 'NEXT_SEASON', ARRAY['FR-MT-009'], true, 30, now(), now()),

  ('CRON_PARAM', '크론 설정',
   '크론 설정 — 코드 예시(기본값): INTERVAL_MIN=1, LOCK_TIMEOUT_MIN=5, CATCHUP_MAX_PER_RUN=50, RETRY_MAX=3, GAP_DETECT_MULTIPLIER=3',
   'INT', 'IMMEDIATE', ARRAY['FR-AD-017', 'FR-AD-018', 'FR-AD-019', 'FR-AD-020'], true, 31, now(), now()),

  ('SANCTION_PARAM', '리그3 리빌드 제재',
   '리그3 리빌드 제재(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): REP_PENALTY_PERMANENT=3, REP_PENALTY_NEGOTIATION=5, GRANT_PCT=0.40, YOUTH_BONUS_PP=0.10',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-LG-007'], true, 32, now(), now()),

  ('CUP_PARAM', '컵대회 설정',
   '컵대회 설정(그룹 내 INT·JSON 혼재 — 배열을 담는 JSON으로 표현) — 코드 예시(기본값): BYE_COUNT=4, INSERT_ROUNDS=[6,12,18,24,32,40]',
   'JSON', 'NEXT_SEASON', ARRAY['FR-LG-015'], true, 33, now(), now()),

  ('CARD_PARAM', '카드·정지',
   '카드·정지 — 코드 예시(기본값): SUSPENSION_THRESHOLD=5, RED_MIN/MAX=1/3',
   'INT', 'NEXT_SEASON', ARRAY['FR-MT-011'], true, 34, now(), now()),

  ('EFFECTIVE_MULT_CLAMP', '보정 체인 클램프',
   '보정 체인 클램프 — 코드 예시(기본값): MIN=0.35, MAX=1.35',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-MT-004'], true, 35, now(), now()),

  ('TRANSFER_PARAM', '이적 빈도·협상',
   '이적 빈도·협상(그룹 내 DECIMAL·INT 혼재 — DECIMAL로 표현) — 코드 예시(기본값): RATE_MIN_PCT=8, RATE_MAX_PCT=15, PER_TEAM_MAX=4, SUCCESS_MIN=0.05, SUCCESS_MAX=0.95, TRADE_VALUE_GAP_PCT=15, LOAN_WAGE_SHARE_PCT=50',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-TR-003', 'FR-TR-006', 'FR-TR-009', 'FR-TR-010'], true, 36, now(), now()),

  ('NATIONALITY_WEIGHT', '국적 배정 비중',
   '국적 배정 비중(D-17 파급① "국가 목록과 각국 비중은 공통코드로 관리", I-88 반영, 05문서 표 밖 14일차 신규) — 코드 집합은 namePools.ts SUPPORTED_NATIONALITY_CODES 20개국과 동일. 실값 미정(억측 금지) — 031b에서 채움',
   'DECIMAL', 'NEXT_SEASON', ARRAY['FR-PL-014'], true, 37, now(), now()),

  ('MANAGER_STYLE_XG', '감독 성향 xG 배율',
   '감독 성향별 자팀(own)/피(conceded) xG 배율(FR-MT-009, I-119/I-160 반영, 05문서 표 밖 31일차 신규) — 코드 예시(기본값): ATTACKING={own:1.12,conceded:1.10}(FR-MT-009 명시값), BALANCED={1.00,1.00}, DEFENSIVE={0.88,0.90}, COUNTER={1.06,0.94}, POSSESSION={1.08,1.04}, HIGH_PRESS={1.10,1.12}(나머지 5종은 3팀 잠정 산정, 031b 대상)',
   'JSON', 'NEXT_SEASON', ARRAY['FR-MT-009'], true, 38, now(), now());

-- ----------------------------------------------------------------------------
-- SECTION 2. common_code — 전역 기본값(world_id IS NULL), 그룹당 코드별 시드
-- 값 없이 넘어간 5개 그룹(WEATHER_EFFECT/RATING_WEIGHT/OVR_WEIGHT/MANAGER_MATCHUP/
-- NATIONALITY_WEIGHT)은 위 "값을 채우지 않은 5개 그룹" 절 참조 — 이 섹션에 행 없음.
-- ----------------------------------------------------------------------------

-- 1. ROUND_INTERVAL_MIN (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('ROUND_INTERVAL_MIN', 'LEAGUE_1', NULL, '75', 75, '75', '1부 리그 라운드 간격(분)', 1, true, 1, now(), now()),
  ('ROUND_INTERVAL_MIN', 'LEAGUE_2', NULL, '90', 90, '90', '2부 리그 라운드 간격(분)', 2, true, 1, now(), now()),
  ('ROUND_INTERVAL_MIN', 'LEAGUE_3', NULL, '115', 115, '115', '3부 리그 라운드 간격(분)', 3, true, 1, now(), now());

-- 2. LEAGUE_TEAM_COUNT (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('LEAGUE_TEAM_COUNT', 'LEAGUE_1', NULL, '24', 24, '24', '1부 리그 소속 팀 수', 1, true, 1, now(), now()),
  ('LEAGUE_TEAM_COUNT', 'LEAGUE_2', NULL, '20', 20, '20', '2부 리그 소속 팀 수', 2, true, 1, now(), now()),
  ('LEAGUE_TEAM_COUNT', 'LEAGUE_3', NULL, '16', 16, '16', '3부 리그 소속 팀 수', 3, true, 1, now(), now());

-- 3. PROMOTION_RELEGATION_SLOTS (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('PROMOTION_RELEGATION_SLOTS', 'PROMOTION', NULL, '3', 3, '3', '승격 슬롯 수', 1, true, 1, now(), now()),
  ('PROMOTION_RELEGATION_SLOTS', 'RELEGATION', NULL, '3', 3, '3', '강등 슬롯 수', 2, true, 1, now(), now());

-- 4. MATCH_POINTS (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('MATCH_POINTS', 'WIN', NULL, '3', 3, '3', '승리 승점', 1, true, 1, now(), now()),
  ('MATCH_POINTS', 'DRAW', NULL, '1', 1, '1', '무승부 승점', 2, true, 1, now(), now()),
  ('MATCH_POINTS', 'LOSS', NULL, '0', 0, '0', '패배 승점', 3, true, 1, now(), now());

-- 5. PHASE_DURATION_MIN (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('PHASE_DURATION_MIN', 'REGULAR', NULL, '3450', 3450, '3450', '정규 시즌 페이즈 길이(분)', 1, true, 1, now(), now()),
  ('PHASE_DURATION_MIN', 'CUP_SLOT', NULL, '75', 75, '75', '컵대회 슬롯 페이즈 길이(분)', 2, true, 1, now(), now()),
  ('PHASE_DURATION_MIN', 'PLAYOFF', NULL, '300', 300, '300', '플레이오프 페이즈 길이(분)', 3, true, 1, now(), now()),
  ('PHASE_DURATION_MIN', 'SETTLEMENT', NULL, '50', 50, '50', '정산 페이즈 길이(분)', 4, true, 1, now(), now()),
  ('PHASE_DURATION_MIN', 'PRESEASON', NULL, '150', 150, '150', '프리시즌 페이즈 길이(분)', 5, true, 1, now(), now());

-- 6. CONDITION_MULT (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CONDITION_MULT', 'BASE', NULL, '0.70', 0.70, '0.70', '컨디션 배율 기저값', 1, true, 1, now(), now()),
  ('CONDITION_MULT', 'RANGE', NULL, '0.30', 0.30, '0.30', '컨디션 배율 변동폭', 2, true, 1, now(), now()),
  ('CONDITION_MULT', 'MIN_C', NULL, '1', 1, '1', '컨디션 값 최솟값', 3, true, 1, now(), now()),
  ('CONDITION_MULT', 'MAX_C', NULL, '10', 10, '10', '컨디션 값 최댓값', 4, true, 1, now(), now());

-- 7. FITNESS_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('FITNESS_PARAM', 'MULT_BASE', NULL, '0.75', 0.75, '0.75', '피로 배율 기저값', 1, true, 1, now(), now()),
  ('FITNESS_PARAM', 'MULT_RANGE', NULL, '0.25', 0.25, '0.25', '피로 배율 변동폭', 2, true, 1, now(), now()),
  ('FITNESS_PARAM', 'DRAIN_FULL', NULL, '18', 18, '18', '풀타임 출전 시 피로 소모량', 3, true, 1, now(), now()),
  ('FITNESS_PARAM', 'RECOVER', NULL, '12', 12, '12', '휴식 시 피로 회복량', 4, true, 1, now(), now()),
  ('FITNESS_PARAM', 'STREAK_FACTOR', NULL, '0.7', 0.7, '0.7', '연속 출전 가중 계수', 5, true, 1, now(), now());

-- 8. POSITION_PROFICIENCY_MULT (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('POSITION_PROFICIENCY_MULT', 'P5', NULL, '1.00', 1.00, '1.00', '숙련도 5단계(완전 숙련) 배율', 1, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'P4', NULL, '0.95', 0.95, '0.95', '숙련도 4단계 배율', 2, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'P3', NULL, '0.88', 0.88, '0.88', '숙련도 3단계 배율', 3, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'P2', NULL, '0.75', 0.75, '0.75', '숙련도 2단계 배율', 4, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'P1', NULL, '0.60', 0.60, '0.60', '숙련도 1단계 배율', 5, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'UNFAMILIAR_BASE', NULL, '0.88', 0.88, '0.88', '미숙련 포지션 기저 배율', 6, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'UNFAMILIAR_STEP', NULL, '0.11', 0.11, '0.11', '미숙련 포지션 단계별 감소폭', 7, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'UNFAMILIAR_FLOOR', NULL, '0.45', 0.45, '0.45', '미숙련 포지션 배율 하한', 8, true, 1, now(), now()),
  ('POSITION_PROFICIENCY_MULT', 'GK_CROSS', NULL, '0.35', 0.35, '0.35', '골키퍼 필드 포지션 교차 배율', 9, true, 1, now(), now());

-- 9. HOME_ADVANTAGE (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('HOME_ADVANTAGE', 'MULT', NULL, '1.05', 1.05, '1.05', '홈 팀 능력치 배율', 1, true, 1, now(), now()),
  ('HOME_ADVANTAGE', 'CONDITION_BONUS', NULL, '0.5', 0.5, '0.5', '홈 팀 컨디션 가산', 2, true, 1, now(), now());

-- 10. WEATHER_EFFECT — 값 없음(억측 금지, 위 헤더 참조). 행 없음.

-- 11. WEATHER_PROBABILITY (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('WEATHER_PROBABILITY', 'CLEAR', NULL, '0.40', 0.40, '0.40', '맑음 발생 확률', 1, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'RAIN', NULL, '0.15', 0.15, '0.15', '비 발생 확률', 2, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'HEAVY_RAIN', NULL, '0.05', 0.05, '0.05', '폭우 발생 확률', 3, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'SNOW', NULL, '0.05', 0.05, '0.05', '눈 발생 확률', 4, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'WINDY', NULL, '0.10', 0.10, '0.10', '강풍 발생 확률', 5, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'HOT', NULL, '0.05', 0.05, '0.05', '폭염 발생 확률', 6, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'COLD', NULL, '0.05', 0.05, '0.05', '혹한 발생 확률', 7, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'FOG', NULL, '0.05', 0.05, '0.05', '안개 발생 확률', 8, true, 1, now(), now()),
  ('WEATHER_PROBABILITY', 'CLOUDY', NULL, '0.10', 0.10, '0.10', '흐림 발생 확률', 9, true, 1, now(), now());

-- 12. INJURY_PARAM (NEXT_SEASON) — BASE_TICK_PROB는 05문서에 값 예시 없음(위 헤더 이슈 후보 참조)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('INJURY_PARAM', 'BASE_TICK_PROB', NULL, '0', 0, '0', '틱당 기저 부상 확률(05문서 값 예시 없음 — 이슈 후보)', 1, true, 1, now(), now()),
  ('INJURY_PARAM', 'SEVERITY_1_MULT', NULL, '0.93', 0.93, '0.93', '경도(1단계) 부상 배율', 2, true, 1, now(), now()),
  ('INJURY_PARAM', 'SEVERITY_4_RETURN_MULT', NULL, '0.90', 0.90, '0.90', '중증(4단계) 복귀 후 배율', 3, true, 1, now(), now()),
  ('INJURY_PARAM', 'S2_MIN', NULL, '1', 1, '1', '2단계 부상 결장 최소 일수', 4, true, 1, now(), now()),
  ('INJURY_PARAM', 'S2_MAX', NULL, '3', 3, '3', '2단계 부상 결장 최대 일수', 5, true, 1, now(), now()),
  ('INJURY_PARAM', 'S3_MIN', NULL, '4', 4, '4', '3단계 부상 결장 최소 일수', 6, true, 1, now(), now()),
  ('INJURY_PARAM', 'S3_MAX', NULL, '10', 10, '10', '3단계 부상 결장 최대 일수', 7, true, 1, now(), now()),
  ('INJURY_PARAM', 'S4_MIN', NULL, '11', 11, '11', '4단계 부상 결장 최소 일수', 8, true, 1, now(), now()),
  ('INJURY_PARAM', 'S4_MAX', NULL, '40', 40, '40', '4단계 부상 결장 최대 일수', 9, true, 1, now(), now());

-- 13. GROWTH_AGE_FACTOR (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('GROWTH_AGE_FACTOR', 'ROOKIE_UP', NULL, '1.6', 1.6, '1.6', '루키 나이대 성장 상승 계수', 1, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'ROOKIE_DOWN', NULL, '0.4', 0.4, '0.4', '루키 나이대 성장 하락 계수', 2, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'PRIME_UP', NULL, '1.0', 1.0, '1.0', '전성기 나이대 성장 상승 계수', 3, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'PRIME_DOWN', NULL, '1.0', 1.0, '1.0', '전성기 나이대 성장 하락 계수', 4, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'VETERAN_UP', NULL, '0.5', 0.5, '0.5', '베테랑 나이대 성장 상승 계수', 5, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'VETERAN_DOWN', NULL, '1.4', 1.4, '1.4', '베테랑 나이대 성장 하락 계수', 6, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'OLD_UP', NULL, '0.2', 0.2, '0.2', '노장 나이대 성장 상승 계수', 7, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'OLD_DOWN', NULL, '2.0', 2.0, '2.0', '노장 나이대 성장 하락 계수', 8, true, 1, now(), now()),
  ('GROWTH_AGE_FACTOR', 'MAX_DELTA', NULL, '6', 6, '6', '시즌당 능력치 변동 최대폭', 9, true, 1, now(), now());

-- 14. FAMILIARITY (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('FAMILIARITY', 'STEP', NULL, '0.015', 0.015, '0.015', '팀 캐미 증가 단위', 1, true, 1, now(), now()),
  ('FAMILIARITY', 'CAP', NULL, '0.06', 0.06, '0.06', '팀 캐미 상한', 2, true, 1, now(), now());

-- 15. LEAGUE_FINISH_POINT (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('LEAGUE_FINISH_POINT', 'L1_BASE', NULL, '1500', 1500, '1500', '1부 순위 포인트 기저값', 1, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'L1_RANGE', NULL, '1500', 1500, '1500', '1부 순위 포인트 변동폭', 2, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'L2_BASE', NULL, '850', 850, '850', '2부 순위 포인트 기저값', 3, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'L2_RANGE', NULL, '950', 950, '950', '2부 순위 포인트 변동폭', 4, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'L3_BASE', NULL, '400', 400, '400', '3부 순위 포인트 기저값', 5, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'L3_RANGE', NULL, '600', 600, '600', '3부 순위 포인트 변동폭', 6, true, 1, now(), now()),
  ('LEAGUE_FINISH_POINT', 'EXP', NULL, '1.8', 1.8, '1.8', '순위 포인트 곡선 지수', 7, true, 1, now(), now());

-- 16. PLAYOFF_PRIZE (NEXT_SEASON) — 05문서 표 생략(…) 구간은 시드하지 않음(위 헤더 참조)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('PLAYOFF_PRIZE', 'L1_WIN', NULL, '1500', 1500, '1500', '1부 플레이오프 우승 상금', 1, true, 1, now(), now()),
  ('PLAYOFF_PRIZE', 'L3_RUNNERUP', NULL, '200', 200, '200', '3부 플레이오프 준우승 상금', 2, true, 1, now(), now());

-- 17. CUP_PRIZE (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CUP_PRIZE', 'WIN', NULL, '2000', 2000, '2000', '컵대회 우승 상금', 1, true, 1, now(), now()),
  ('CUP_PRIZE', 'RUNNERUP', NULL, '1000', 1000, '1000', '컵대회 준우승 상금', 2, true, 1, now(), now()),
  ('CUP_PRIZE', 'SF', NULL, '500', 500, '500', '컵대회 4강 상금', 3, true, 1, now(), now()),
  ('CUP_PRIZE', 'QF', NULL, '250', 250, '250', '컵대회 8강 상금', 4, true, 1, now(), now()),
  ('CUP_PRIZE', 'R16', NULL, '120', 120, '120', '컵대회 16강 상금', 5, true, 1, now(), now()),
  ('CUP_PRIZE', 'R32', NULL, '60', 60, '60', '컵대회 32강 상금', 6, true, 1, now(), now()),
  ('CUP_PRIZE', 'R1', NULL, '30', 30, '30', '컵대회 1라운드 탈락 상금', 7, true, 1, now(), now()),
  ('CUP_PRIZE', 'GIANT_KILLING', NULL, '100', 100, '100', '이변(하위 리그 승리) 보너스', 8, true, 1, now(), now());

-- 18. MARKET_VALUE_PARAM (NEXT_SEASON) — AGE_*/CONTRACT_*/TIER_*는 05문서에 구체값 없어 미시드
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('MARKET_VALUE_PARAM', 'OVR_DIVISOR', NULL, '15', 15, '15', '몸값 공식 OVR 나눗값', 1, true, 1, now(), now()),
  ('MARKET_VALUE_PARAM', 'OVR_EXP', NULL, '2.6', 2.6, '2.6', '몸값 공식 OVR 지수', 2, true, 1, now(), now()),
  ('MARKET_VALUE_PARAM', 'POT_STEP', NULL, '0.05', 0.05, '0.05', '잠재력 단위당 가산 비율', 3, true, 1, now(), now()),
  ('MARKET_VALUE_PARAM', 'REP_BASE', NULL, '0.8', 0.8, '0.8', '평판 보정 기저값', 4, true, 1, now(), now()),
  ('MARKET_VALUE_PARAM', 'REP_STEP', NULL, '0.004', 0.004, '0.004', '평판 단위당 가산 비율', 5, true, 1, now(), now()),
  ('MARKET_VALUE_PARAM', 'FLOOR', NULL, '100', 100, '100', '몸값 최저 하한', 6, true, 1, now(), now());

-- 19. WAGE_RATIO (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('WAGE_RATIO', 'RATIO', NULL, '0.18', 0.18, '0.18', '몸값 대비 급여 비율', 1, true, 1, now(), now());

-- 20. SPONSOR_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('SPONSOR_PARAM', 'MAX_PER_TEAM', NULL, '3', 3, '3', '팀당 최대 스폰서 계약 수', 1, true, 1, now(), now()),
  ('SPONSOR_PARAM', 'CONTRACT_MIN', NULL, '1', 1, '1', '스폰서 계약 최소 기간(시즌)', 2, true, 1, now(), now()),
  ('SPONSOR_PARAM', 'CONTRACT_MAX', NULL, '10', 10, '10', '스폰서 계약 최대 기간(시즌)', 3, true, 1, now(), now()),
  ('SPONSOR_PARAM', 'SHARE_PCT_CAP', NULL, '30', 30, '30', '스폰서 수익 배분 비율 상한(%)', 4, true, 1, now(), now()),
  ('SPONSOR_PARAM', 'POOL_MIN', NULL, '40', 40, '40', '스폰서 풀 최소 규모', 5, true, 1, now(), now());

-- 21. CONTRACT_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CONTRACT_PARAM', 'YEARS_MIN', NULL, '1', 1, '1', '선수 계약 최소 기간(년)', 1, true, 1, now(), now()),
  ('CONTRACT_PARAM', 'YEARS_MAX', NULL, '5', 5, '5', '선수 계약 최대 기간(년)', 2, true, 1, now(), now());

-- 22. SQUAD_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('SQUAD_PARAM', 'MIN', NULL, '22', 22, '22', '스쿼드 권장 최소 인원', 1, true, 1, now(), now()),
  ('SQUAD_PARAM', 'MAX', NULL, '30', 30, '30', '스쿼드 최대 인원', 2, true, 1, now(), now()),
  ('SQUAD_PARAM', 'HARD_MIN', NULL, '18', 18, '18', '스쿼드 절대 최소 인원', 3, true, 1, now(), now()),
  ('SQUAD_PARAM', 'GK_MIN', NULL, '2', 2, '2', '스쿼드 골키퍼 최소 보유 수', 4, true, 1, now(), now()),
  ('SQUAD_PARAM', 'CB_MIN', NULL, '3', 3, '3', '스쿼드 센터백 최소 보유 수', 5, true, 1, now(), now());

-- 23. YOUTH_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('YOUTH_PARAM', 'BASE', NULL, '0.5', 0.5, '0.5', '유소년 배출 기저 확률', 1, true, 1, now(), now()),
  ('YOUTH_PARAM', 'LEVEL_STEP', NULL, '0.4', 0.4, '0.4', '유소년 시설 레벨당 배출 가산', 2, true, 1, now(), now()),
  ('YOUTH_PARAM', 'SANCTION_BONUS_PP', NULL, '0.10', 0.10, '0.10', '리빌드 제재 유소년 보너스(%p)', 3, true, 1, now(), now()),
  ('YOUTH_PARAM', 'ROOKIE_AGE_MIN', NULL, '16', 16, '16', '유소년 배출 최소 나이', 4, true, 1, now(), now()),
  ('YOUTH_PARAM', 'ROOKIE_AGE_MAX', NULL, '18', 18, '18', '유소년 배출 최대 나이', 5, true, 1, now(), now()),
  ('YOUTH_PARAM', 'ROOKIE_OVR_MIN', NULL, '6', 6, '6', '유소년 배출 최소 OVR', 6, true, 1, now(), now()),
  ('YOUTH_PARAM', 'ROOKIE_OVR_MAX', NULL, '14', 14, '14', '유소년 배출 최대 OVR', 7, true, 1, now(), now());

-- 24. RETIREMENT_PARAM (NEXT_SEASON) — BASE_PROB는 05문서에 값 예시 없음(위 헤더 이슈 후보 참조)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('RETIREMENT_PARAM', 'RISK_START_AGE', NULL, '34', 34, '34', '은퇴 위험 시작 나이', 1, true, 1, now(), now()),
  ('RETIREMENT_PARAM', 'FORCE_AGE', NULL, '40', 40, '40', '강제 은퇴 나이', 2, true, 1, now(), now()),
  ('RETIREMENT_PARAM', 'BASE_PROB', NULL, '0.05', 0.05, '0.05', '은퇴 기저 확률(05문서 값 예시 없음 — 이슈 후보)', 3, true, 1, now(), now());

-- 25. ODDS_PARAM (NEXT_MARKET) — MC_N_SEASON/REFRESH_ROUND_INTERVAL/INITIAL_LEAD_MIN/PARTITION_COUNT는
-- 05문서 원문이 아니라 이후 확정 개선값(I-08/I-167/NFR-SC-004) — 위 헤더 참조
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('ODDS_PARAM', 'MC_N_MATCH', NULL, '3000', 3000, '3000', '경기 단위 몬테카를로 반복 횟수', 1, true, NULL, now(), now()),
  ('ODDS_PARAM', 'MC_N_SEASON', NULL, '1500', 1500, '1500', '시즌 단위 몬테카를로 반복 횟수(27일차 I-08 300→1500)', 2, true, NULL, now(), now()),
  ('ODDS_PARAM', 'REFRESH_ROUND_INTERVAL', NULL, '5', 5, '5', '배당 재산출 주기(라운드)', 3, true, NULL, now(), now()),
  ('ODDS_PARAM', 'OVERROUND', NULL, '1.06', 1.06, '1.06', '오버라운드(하우스 마진) 배율', 4, true, NULL, now(), now()),
  ('ODDS_PARAM', 'MIN_ODDS', NULL, '1.01', 1.01, '1.01', '최소 배당률', 5, true, NULL, now(), now()),
  ('ODDS_PARAM', 'MAX_ODDS', NULL, '500', 500, '500', '최대 배당률', 6, true, NULL, now(), now()),
  ('ODDS_PARAM', 'INITIAL_LEAD_MIN', NULL, '30', 30, '30', '최초 배당 산출 리드타임(킥오프 T-분, 33일차 I-167)', 7, true, NULL, now(), now()),
  ('ODDS_PARAM', 'PARTITION_COUNT', NULL, '8', 8, '8', '몬테카를로 반복 파티션 분할 수(NFR-SC-004)', 8, true, NULL, now(), now());

-- 26. BET_LIMIT (NEXT_MARKET)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('BET_LIMIT', 'STAKE_MIN', NULL, '100', 100, '100', '최소 베팅 금액', 1, true, NULL, now(), now()),
  ('BET_LIMIT', 'SINGLE_MAX', NULL, '100000', 100000, '100000', '단일 베팅 최대 금액', 2, true, NULL, now(), now()),
  ('BET_LIMIT', 'MULTI_RETURN_MAX', NULL, '1000000', 1000000, '1000000', '복합 베팅 최대 환급액', 3, true, NULL, now(), now()),
  ('BET_LIMIT', 'LEGS_MAX', NULL, '10', 10, '10', '복합 베팅 최대 다리 수', 4, true, NULL, now(), now());

-- 27. RATING_WEIGHT — 값 없음(억측 금지). 행 없음.
-- 28. OVR_WEIGHT — 값 없음(억측 금지). 행 없음.

-- 29. UI_PARAM (IMMEDIATE) — ⚠️ fallback.ts의 30000/15000이 아니라 05문서 정상값 5000/3000 사용(위 헤더 참조)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('UI_PARAM', 'POLL_INTERVAL_MS', NULL, '5000', 5000, '5000', '기본 폴링 주기(ms) — 정상 운영값(fallback.ts 비용 안전망 30000과 다름)', 1, true, NULL, now(), now()),
  ('UI_PARAM', 'POLL_LIVE_MS', NULL, '3000', 3000, '3000', '라이브 경기 폴링 주기(ms) — 정상 운영값(fallback.ts 비용 안전망 15000과 다름)', 2, true, NULL, now(), now()),
  ('UI_PARAM', 'LEADERBOARD_MIN_APPEARANCE_PCT', NULL, '30', 30, '30', '리더보드 최소 출전 비율(%)', 3, true, NULL, now(), now());

-- 30. MANAGER_MATCHUP — 값 없음(억측 금지). 행 없음.

-- 31. CRON_PARAM (IMMEDIATE)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CRON_PARAM', 'INTERVAL_MIN', NULL, '1', 1, '1', '크론 실행 주기(분)', 1, true, NULL, now(), now()),
  ('CRON_PARAM', 'LOCK_TIMEOUT_MIN', NULL, '5', 5, '5', '크론 락 타임아웃(분)', 2, true, NULL, now(), now()),
  ('CRON_PARAM', 'CATCHUP_MAX_PER_RUN', NULL, '50', 50, '50', '1회 실행당 최대 캐치업 처리 건수', 3, true, NULL, now(), now()),
  ('CRON_PARAM', 'RETRY_MAX', NULL, '3', 3, '3', '크론 실패 시 최대 재시도 횟수', 4, true, NULL, now(), now()),
  ('CRON_PARAM', 'GAP_DETECT_MULTIPLIER', NULL, '3', 3, '3', '간격 이상(gap) 감지 배수', 5, true, NULL, now(), now());

-- 32. SANCTION_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('SANCTION_PARAM', 'REP_PENALTY_PERMANENT', NULL, '3', 3, '3', '영구 제재 평판 페널티', 1, true, 1, now(), now()),
  ('SANCTION_PARAM', 'REP_PENALTY_NEGOTIATION', NULL, '5', 5, '5', '협상 제재 평판 페널티', 2, true, 1, now(), now()),
  ('SANCTION_PARAM', 'GRANT_PCT', NULL, '0.40', 0.40, '0.40', '리빌드 지원금 비율', 3, true, 1, now(), now()),
  ('SANCTION_PARAM', 'YOUTH_BONUS_PP', NULL, '0.10', 0.10, '0.10', '리빌드 유소년 보너스(%p)', 4, true, 1, now(), now());

-- 33. CUP_PARAM (NEXT_SEASON) — JSON형: value_json에 원시 JSON, value/default_value는 JSON 텍스트 표현
INSERT INTO common_code
  (group_code, code, world_id, value, value_json, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CUP_PARAM', 'BYE_COUNT', NULL, '4', '4'::jsonb, '4', '컵대회 부전승 배정 수', 1, true, 1, now(), now()),
  ('CUP_PARAM', 'INSERT_ROUNDS', NULL, '[6,12,18,24,32,40]', '[6,12,18,24,32,40]'::jsonb, '[6,12,18,24,32,40]', '상위 리그 팀 삽입 라운드 목록', 2, true, 1, now(), now());

-- 34. CARD_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('CARD_PARAM', 'SUSPENSION_THRESHOLD', NULL, '5', 5, '5', '누적 경고 출전 정지 임계값', 1, true, 1, now(), now()),
  ('CARD_PARAM', 'RED_MIN', NULL, '1', 1, '1', '퇴장 최소 결장 경기 수', 2, true, 1, now(), now()),
  ('CARD_PARAM', 'RED_MAX', NULL, '3', 3, '3', '퇴장 최대 결장 경기 수', 3, true, 1, now(), now());

-- 35. EFFECTIVE_MULT_CLAMP (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('EFFECTIVE_MULT_CLAMP', 'MIN', NULL, '0.35', 0.35, '0.35', '보정 체인 최종 배율 하한', 1, true, 1, now(), now()),
  ('EFFECTIVE_MULT_CLAMP', 'MAX', NULL, '1.35', 1.35, '1.35', '보정 체인 최종 배율 상한', 2, true, 1, now(), now());

-- 36. TRANSFER_PARAM (NEXT_SEASON)
INSERT INTO common_code
  (group_code, code, world_id, value, value_num, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('TRANSFER_PARAM', 'RATE_MIN_PCT', NULL, '8', 8, '8', '시즌당 최소 이적 발생률(%)', 1, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'RATE_MAX_PCT', NULL, '15', 15, '15', '시즌당 최대 이적 발생률(%)', 2, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'PER_TEAM_MAX', NULL, '4', 4, '4', '팀당 시즌 최대 이적 건수', 3, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'SUCCESS_MIN', NULL, '0.05', 0.05, '0.05', '이적 협상 최소 성공 확률', 4, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'SUCCESS_MAX', NULL, '0.95', 0.95, '0.95', '이적 협상 최대 성공 확률', 5, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'TRADE_VALUE_GAP_PCT', NULL, '15', 15, '15', '이적 협상 허용 가치 격차(%)', 6, true, 1, now(), now()),
  ('TRANSFER_PARAM', 'LOAN_WAGE_SHARE_PCT', NULL, '50', 50, '50', '임대 시 급여 분담 비율(%)', 7, true, 1, now(), now());

-- 37. NATIONALITY_WEIGHT — 값 없음(억측 금지). 행 없음.

-- 38. MANAGER_STYLE_XG (NEXT_SEASON) — JSON형: 성향 코드 → {ownXgMultiplier, concededXgMultiplier}
INSERT INTO common_code
  (group_code, code, world_id, value, value_json, default_value, description, sort_order, is_active, effective_from_season, created_at, updated_at)
VALUES
  ('MANAGER_STYLE_XG', 'ATTACKING', NULL,
   '{"ownXgMultiplier":1.12,"concededXgMultiplier":1.10}',
   '{"ownXgMultiplier":1.12,"concededXgMultiplier":1.10}'::jsonb,
   '{"ownXgMultiplier":1.12,"concededXgMultiplier":1.10}',
   '공격적 성향 xG 배율(FR-MT-009 명시값)', 1, true, 1, now(), now()),
  ('MANAGER_STYLE_XG', 'BALANCED', NULL,
   '{"ownXgMultiplier":1.00,"concededXgMultiplier":1.00}',
   '{"ownXgMultiplier":1.00,"concededXgMultiplier":1.00}'::jsonb,
   '{"ownXgMultiplier":1.00,"concededXgMultiplier":1.00}',
   '균형 성향 xG 배율(대조군)', 2, true, 1, now(), now()),
  ('MANAGER_STYLE_XG', 'DEFENSIVE', NULL,
   '{"ownXgMultiplier":0.88,"concededXgMultiplier":0.90}',
   '{"ownXgMultiplier":0.88,"concededXgMultiplier":0.90}'::jsonb,
   '{"ownXgMultiplier":0.88,"concededXgMultiplier":0.90}',
   '수비적 성향 xG 배율(ATTACKING 대칭값, 3팀 잠정 산정)', 3, true, 1, now(), now()),
  ('MANAGER_STYLE_XG', 'COUNTER', NULL,
   '{"ownXgMultiplier":1.06,"concededXgMultiplier":0.94}',
   '{"ownXgMultiplier":1.06,"concededXgMultiplier":0.94}'::jsonb,
   '{"ownXgMultiplier":1.06,"concededXgMultiplier":0.94}',
   '역습 성향 xG 배율(3팀 잠정 산정)', 4, true, 1, now(), now()),
  ('MANAGER_STYLE_XG', 'POSSESSION', NULL,
   '{"ownXgMultiplier":1.08,"concededXgMultiplier":1.04}',
   '{"ownXgMultiplier":1.08,"concededXgMultiplier":1.04}'::jsonb,
   '{"ownXgMultiplier":1.08,"concededXgMultiplier":1.04}',
   '점유 성향 xG 배율(3팀 잠정 산정)', 5, true, 1, now(), now()),
  ('MANAGER_STYLE_XG', 'HIGH_PRESS', NULL,
   '{"ownXgMultiplier":1.10,"concededXgMultiplier":1.12}',
   '{"ownXgMultiplier":1.10,"concededXgMultiplier":1.12}'::jsonb,
   '{"ownXgMultiplier":1.10,"concededXgMultiplier":1.12}',
   '하이프레스 성향 xG 배율(6종 중 유일하게 conceded 편차 > own 편차, 3팀 잠정 산정)', 6, true, 1, now(), now());

-- ============================================================================
-- 끝. 38개 그룹 메타데이터 전량 + 33개 그룹 code-level 기본값(전역, world_id NULL).
-- 값 미시드 5개 그룹: WEATHER_EFFECT, RATING_WEIGHT, OVR_WEIGHT, MANAGER_MATCHUP,
-- NATIONALITY_WEIGHT — 031b(밸런싱 튜닝)에서 실값 등재 예정.
-- ============================================================================
