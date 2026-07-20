-- ============================================================================
-- 13일차 (2026-08-06) — Task 032 (1/4): 1차 범위 핵심 테이블 생성
-- 담당: 6팀 DB·인프라팀 / 근거: docs/db/schema-design.md (12일차 산출물, src/types/** 단일 소스)
-- ============================================================================
-- ⚠️ 파일명 버전 표기 규칙 (13일차 1차 교차 점검, 팀장 판정): 이 파일명의 앞자리
-- (20260720035624)는 인게임 날짜가 아니라 `apply_migration` 실행 시 Supabase 원격
-- 마이그레이션 히스토리(`supabase_migrations.schema_migrations`)가 **자동 채번한 버전**이다.
-- `list_migrations`로 확인한 값을 그대로 파일명에 써야 한다 — 버전 프리픽스는 툴링이
-- 읽는 식별자이지 사람이 읽는 날짜가 아니다(인게임 일차는 위 주석 "13일차 (2026-08-06)"로
-- 이미 기록돼 있으므로 파일명에 인게임 날짜를 넣어도 정보 손실은 없지만, 원격 히스토리와
-- 어긋나면 이후 Supabase CLI(`supabase migration list`/`db push`) 연동 시 이 마이그레이션을
-- "미적용"으로 오판해 재실행을 시도할 위험이 있다). **앞으로 모든 마이그레이션은
-- `apply_migration` 적용 직후 `list_migrations`로 원격 채번 버전을 확인하고 그 값으로
-- 파일명을 짓는다** — 14일차 공통코드 7테이블부터 이 규칙을 적용한다.
-- ============================================================================
--
-- ⚠️ 순서 의존 금지선 (13일차 1차 교차 점검): fixture.snapshot_id는 NOT NULL이지만
-- sim_constant_snapshot(E-44)이 14일차 테이블이라 이번 마이그레이션은 FK를 걸지 않았다
-- (season.snapshot_id는 nullable이라 상대적으로 안전). 지금 상태에서 fixture INSERT는
-- FK가 없어 임의의 UUID로도 조용히 성공하지만, 14일차 `ALTER TABLE fixture ADD FOREIGN KEY`는
-- 기존 행 전체를 검증하므로 그 사이 들어온 무효 snapshot_id가 하나라도 있으면 ALTER가
-- 그 자리에서 실패한다. **13~14일차 사이 fixture·season에 행을 INSERT하지 않는다**
-- (현재 노출은 낮음 — `@supabase/*` 미설치로 앱 코드에는 쓰기 경로가 없고 유일한 쓰기
-- 수단은 MCP 직접 호출뿐이나, 2·3팀이 이 구간에 DB 쓰기를 시작하면 곧바로 리스크가 된다).
-- **14일차 FK 추가 착수 직전 반드시 `SELECT count(*) FROM fixture;`로 0건을 확인**한다 —
-- 0이 아니면 즉시 팀장에게 보고하고 FK 추가를 중단한다.
-- ============================================================================
-- 범위: E-01~E-32 (32개 엔티티) — docs/db/schema-design.md §7 커버리지표 기준.
--   제외 1) E-33~E-40 (배팅/유저) — 문서가 "2차 릴리스 선정의, 1차 마이그레이션
--          적용 대상 아님"이라 명시(§3.9·§3.10 헤더). 2차 착수 시점에 별도 마이그레이션.
--   제외 2) E-41~E-44(공통코드) + E-45~E-47(운영) — docs/team-schedule/06-DB인프라팀.md
--          14일차 행에 별도 배정.
--
-- 이번 마이그레이션에 포함하는 것:
--   - 컬럼/물리 타입/NULL 여부 (schema-design.md §3.1~§3.8 그대로)
--   - PK, FK(REFERENCES만 — ON DELETE 절 없음, 기본 NO ACTION)
--   - enum CHECK (§2.1, 34종 닫힌 유니온 중 1차 테이블에서 실제 쓰이는 21종)
--   - 수치 정밀도 규약 중 시드/포인트 CHECK (§1.2) — bigint 안전정수 범위 방어
--   - world_singleton_uq (§3.1 192행이 "테이블 제약"으로 명시한 예외 항목,
--     §6.2 인덱스 설계 목록 21개와는 별개)
--
-- 이번 마이그레이션에 포함하지 않고 이월하는 것 (그대로 손대지 않음):
--   - 일반/UNIQUE 인덱스 §6.2 전체(world_singleton_uq 제외) → 15일차
--   - 범위 CHECK(1~30 능력치, 0~100 평판 등) → 16일차(§1.2 "오늘 반영하지 않는다" 원문)
--   - ON DELETE 삭제정책 확정, sponsor_contract 팀당 ACTIVE≤3 트리거 → 16일차
--   - fixture.snapshot_id / season.snapshot_id → sim_constant_snapshot FK
--     (E-44, 14일차 테이블이라 오늘은 대상 테이블이 없음. NOT NULL/NULL 여부만 반영하고
--      FK는 14일차 이후 별도 ALTER TABLE로 추가 예정 — 6팀 인계 사항)
--   - award의 player_id/manager_id/team_id 배타적 nullable CHECK
--     (문서 §6.1 R-09 서술에서 "CHECK 후보"로만 언급, 확정 결정 아님 — 오늘 추가하지 않음)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §3.1 월드/리그 (E-01~E-05)
-- ----------------------------------------------------------------------------

CREATE TABLE world (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_seed bigint NOT NULL CHECK (world_seed BETWEEN 0 AND 9007199254740991),
  current_season_number int NOT NULL,
  current_phase text NOT NULL CHECK (current_phase IN
    ('REGULAR','CUP_SLOT','PLAYOFF','TIEBREAK','SETTLEMENT','PRESEASON')),
  speed_multiplier numeric(5,2) NOT NULL, -- [범위 CHECK: 16일차 예정] 0.25~20.00
  is_paused boolean NOT NULL,
  paused_total_minutes int NOT NULL,
  speed_changed_at timestamptz NOT NULL,
  world_minutes_at_speed_change numeric(14,4) NOT NULL,
  paused_at timestamptz,
  clock_revision bigint NOT NULL,
  created_at timestamptz NOT NULL
);

-- D-15 단일 월드: world 레코드는 1건만 허용 (§3.1 192행 "테이블 제약"으로 명시된 예외 —
-- §6.2 인덱스 설계 21개와는 별도 항목이라 테이블 생성과 함께 반영한다)
CREATE UNIQUE INDEX world_singleton_uq ON world ((true));

CREATE TABLE league (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  name text NOT NULL,
  tier int NOT NULL,
  team_count int NOT NULL,
  round_interval_min int NOT NULL,
  promotion_slots int NOT NULL,
  relegation_slots int NOT NULL,
  playoff_team_count int NOT NULL
);

CREATE TABLE season (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  season_number int NOT NULL,
  season_seed bigint NOT NULL CHECK (season_seed BETWEEN 0 AND 9007199254740991),
  phase text NOT NULL CHECK (phase IN
    ('REGULAR','CUP_SLOT','PLAYOFF','TIEBREAK','SETTLEMENT','PRESEASON')),
  regular_started_at timestamptz,
  regular_ends_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  snapshot_id uuid -- FK → sim_constant_snapshot(E-44): 14일차 이후 ALTER TABLE로 추가 예정
);

CREATE TABLE team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  name text NOT NULL,
  short_name text NOT NULL,
  founded_season int NOT NULL,
  stadium_name text NOT NULL,
  stadium_capacity int NOT NULL,
  color_primary text NOT NULL,
  color_secondary text NOT NULL,
  crest_seed bigint NOT NULL CHECK (crest_seed BETWEEN 0 AND 9007199254740991),
  reputation int NOT NULL, -- [범위 CHECK: 16일차 예정] 0~100
  fan_base int NOT NULL,
  academy_level int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~5
  balance bigint NOT NULL CHECK (balance BETWEEN -9007199254740991 AND 9007199254740991),
  financial_crisis boolean NOT NULL,
  crisis_consecutive_seasons int NOT NULL
);

CREATE TABLE team_season (
  team_id uuid NOT NULL REFERENCES team(id),
  season_id uuid NOT NULL REFERENCES season(id),
  league_id uuid NOT NULL REFERENCES league(id),
  final_rank int,
  promoted boolean NOT NULL,
  relegated boolean NOT NULL,
  tiebreak_applied int, -- [범위 CHECK: 16일차 예정] 1~7
  PRIMARY KEY (team_id, season_id)
);

-- ----------------------------------------------------------------------------
-- §3.2 인물 (E-06~E-11)
-- ----------------------------------------------------------------------------

CREATE TABLE manager (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  team_id uuid REFERENCES team(id),
  name text NOT NULL,
  age int NOT NULL,
  style text NOT NULL CHECK (style IN
    ('ATTACKING','BALANCED','DEFENSIVE','COUNTER','POSSESSION','HIGH_PRESS')),
  tactical_skill int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~30
  preferred_formation text NOT NULL, -- 열린 값(Formation), CHECK 없음
  is_acting boolean NOT NULL,
  reputation int NOT NULL, -- [범위 CHECK: 16일차 예정] 0~100
  contract_until_season int NOT NULL,
  tenure_seasons int NOT NULL
);

CREATE TABLE player (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  name text NOT NULL,
  nationality text NOT NULL CHECK (nationality ~ '^[A-Z]{2}$'), -- 형식 검증(ISO 3166-1 alpha-2)
  birth_season int NOT NULL,
  age int NOT NULL,
  preferred_foot text NOT NULL CHECK (preferred_foot IN ('LEFT','RIGHT','BOTH')),
  preferred_position text NOT NULL CHECK (preferred_position IN
    ('GK','CB','LB','RB','DM','CM','AM','LW','RW','ST','SS')),
  pa int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~30
  reputation int NOT NULL, -- [범위 CHECK: 16일차 예정] 0~100
  market_value bigint NOT NULL CHECK (market_value BETWEEN -9007199254740991 AND 9007199254740991),
  taste_tags text[] NOT NULL, -- [범위 CHECK: 16일차 예정] 1~2개
  retired_at_season int
);

CREATE TABLE player_attribute (
  player_id uuid PRIMARY KEY REFERENCES player(id),
  finishing int NOT NULL, passing int NOT NULL, crossing int NOT NULL, dribbling int NOT NULL,
  first_touch int NOT NULL, tackling int NOT NULL, marking int NOT NULL, heading int NOT NULL,
  long_shots int NOT NULL, set_pieces int NOT NULL,
  composure int NOT NULL, decisions int NOT NULL, vision int NOT NULL, positioning int NOT NULL,
  work_rate int NOT NULL, aggression int NOT NULL, leadership int NOT NULL, teamwork int NOT NULL,
  anticipation int NOT NULL, determination int NOT NULL,
  pace int NOT NULL, acceleration int NOT NULL, stamina int NOT NULL, strength int NOT NULL,
  agility int NOT NULL, balance int NOT NULL, jumping int NOT NULL, natural_fitness int NOT NULL,
  reflexes int NOT NULL, handling int NOT NULL, one_on_ones int NOT NULL, aerial_reach int NOT NULL,
  kicking int NOT NULL, command_of_area int NOT NULL,
  ovr_cached int NOT NULL,
  updated_at_season int NOT NULL
  -- 34속성 컬럼 전부 [범위 CHECK: 16일차 예정] 1~30
);

CREATE TABLE player_attribute_history (
  player_id uuid NOT NULL REFERENCES player(id),
  season_number int NOT NULL,
  finishing int NOT NULL, passing int NOT NULL, crossing int NOT NULL, dribbling int NOT NULL,
  first_touch int NOT NULL, tackling int NOT NULL, marking int NOT NULL, heading int NOT NULL,
  long_shots int NOT NULL, set_pieces int NOT NULL,
  composure int NOT NULL, decisions int NOT NULL, vision int NOT NULL, positioning int NOT NULL,
  work_rate int NOT NULL, aggression int NOT NULL, leadership int NOT NULL, teamwork int NOT NULL,
  anticipation int NOT NULL, determination int NOT NULL,
  pace int NOT NULL, acceleration int NOT NULL, stamina int NOT NULL, strength int NOT NULL,
  agility int NOT NULL, balance int NOT NULL, jumping int NOT NULL, natural_fitness int NOT NULL,
  reflexes int NOT NULL, handling int NOT NULL, one_on_ones int NOT NULL, aerial_reach int NOT NULL,
  kicking int NOT NULL, command_of_area int NOT NULL,
  ovr int NOT NULL,
  PRIMARY KEY (player_id, season_number)
);

CREATE TABLE player_position (
  player_id uuid NOT NULL REFERENCES player(id),
  position text NOT NULL CHECK (position IN
    ('GK','CB','LB','RB','DM','CM','AM','LW','RW','ST','SS')),
  proficiency int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~5
  PRIMARY KEY (player_id, position)
);

CREATE TABLE player_state (
  player_id uuid PRIMARY KEY REFERENCES player(id),
  team_id uuid REFERENCES team(id),
  on_loan_team_id uuid REFERENCES team(id),
  squad_number int NOT NULL, -- UNIQUE(team_id, squad_number)는 15일차 부분 유니크 인덱스
  condition numeric(3,1) NOT NULL, -- 1.0~10.0
  fitness int NOT NULL, -- [범위 CHECK: 16일차 예정] 0~100
  familiarity_seasons int NOT NULL,
  yellow_accumulated_league int NOT NULL,
  yellow_accumulated_cup int NOT NULL,
  suspension_remaining_league int NOT NULL,
  suspension_remaining_cup int NOT NULL,
  active_injury_id uuid -- FK → injury(id): 이 마이그레이션 하단에서 ALTER TABLE로 추가(injury가 뒤에 생성됨)
);

-- ----------------------------------------------------------------------------
-- §3.3 계약/이동 (E-12~E-14)
-- ----------------------------------------------------------------------------

CREATE TABLE contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES player(id),
  team_id uuid NOT NULL REFERENCES team(id),
  start_season int NOT NULL,
  end_season int NOT NULL,
  wage_per_season bigint NOT NULL CHECK (wage_per_season BETWEEN -9007199254740991 AND 9007199254740991),
  transfer_fee_paid bigint NOT NULL CHECK (transfer_fee_paid BETWEEN -9007199254740991 AND 9007199254740991),
  status text NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','TERMINATED'))
);

CREATE TABLE transfer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  player_id uuid NOT NULL REFERENCES player(id),
  from_team_id uuid REFERENCES team(id),
  to_team_id uuid NOT NULL REFERENCES team(id),
  fee bigint NOT NULL CHECK (fee BETWEEN -9007199254740991 AND 9007199254740991),
  type text NOT NULL CHECK (type IN ('TRANSFER','FREE','TRADE','RELEASE')),
  trade_counterpart_player_id uuid REFERENCES player(id),
  negotiation_log jsonb NOT NULL
);

CREATE TABLE loan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  player_id uuid NOT NULL REFERENCES player(id),
  owner_team_id uuid NOT NULL REFERENCES team(id),
  loan_team_id uuid NOT NULL REFERENCES team(id),
  wage_share_pct numeric(5,2) NOT NULL, -- 기본 50
  status text NOT NULL CHECK (status IN ('ACTIVE','RETURNED'))
);

-- ----------------------------------------------------------------------------
-- §3.4 경기 (E-15~E-18)
-- ----------------------------------------------------------------------------

CREATE TABLE fixture (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  competition_type text NOT NULL CHECK (competition_type IN ('LEAGUE','PLAYOFF','CUP','TIEBREAK')),
  league_id uuid REFERENCES league(id),
  round int NOT NULL,
  round_label text NOT NULL,
  home_team_id uuid NOT NULL REFERENCES team(id),
  away_team_id uuid NOT NULL REFERENCES team(id),
  is_neutral boolean NOT NULL,
  kickoff_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('SCHEDULED','LIVE','FINISHED','VOID')),
  home_score int,
  away_score int,
  ht_home_score int,
  ht_away_score int,
  et_home_score int,
  et_away_score int,
  pk_home int,
  pk_away int,
  attendance int,
  match_seed bigint NOT NULL CHECK (match_seed BETWEEN 0 AND 9007199254740991),
  snapshot_id uuid NOT NULL, -- FK → sim_constant_snapshot(E-44): 14일차 이후 ALTER TABLE로 추가 예정(R-04)
  simulated_at timestamptz
);

CREATE TABLE match_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES fixture(id),
  sequence int NOT NULL,
  minute int NOT NULL,
  added_time int NOT NULL,
  type text NOT NULL CHECK (type IN (
    'KICKOFF','SHOT_ON','SHOT_OFF','SHOT_BLOCKED','GOAL','ASSIST','OWN_GOAL',
    'PENALTY_AWARDED','PENALTY_SCORED','PENALTY_MISSED','YELLOW_CARD','SECOND_YELLOW',
    'RED_CARD','FOUL','OFFSIDE','CORNER','SAVE','INJURY','SUBSTITUTION','HALF_TIME',
    'FULL_TIME','EXTRA_TIME_START','PENALTY_SHOOTOUT')),
  team_id uuid REFERENCES team(id),
  primary_player_id uuid REFERENCES player(id),
  secondary_player_id uuid REFERENCES player(id),
  xg numeric(6,4),
  related_event_sequence int,
  detail jsonb NOT NULL
  -- 인덱스 (match_id,sequence)/(match_id,minute)는 15일차
);

CREATE TABLE match_lineup (
  match_id uuid NOT NULL REFERENCES fixture(id),
  team_id uuid NOT NULL REFERENCES team(id),
  player_id uuid NOT NULL REFERENCES player(id),
  formation text NOT NULL, -- 열린 값(Formation)
  position_slot text NOT NULL CHECK (position_slot IN
    ('GK','CB','LB','RB','DM','CM','AM','LW','RW','ST','SS')),
  is_starter boolean NOT NULL,
  minute_on int,
  minute_off int,
  position_multiplier numeric(4,3) NOT NULL, -- 감사·표시 전용, 재계산 입력 금지
  PRIMARY KEY (match_id, team_id, player_id)
);

CREATE TABLE weather (
  match_id uuid PRIMARY KEY REFERENCES fixture(id),
  type text NOT NULL CHECK (type IN
    ('CLEAR','CLOUDY','RAIN','HEAVY_RAIN','SNOW','WINDY','HOT','COLD','FOG')),
  temperature int NOT NULL,
  wind_speed int NOT NULL,
  effect_modifiers jsonb NOT NULL
);

-- ----------------------------------------------------------------------------
-- §3.5 통계 (E-19~E-23) — PlayerStatCoreValues 56공유컬럼은 3개 테이블에 반복 전개
-- (schema-design.md §3.5 "공유 블록" 원칙과 동형 — 문서가 1곳에만 정의를 전개하듯,
--  이 SQL도 컬럼명을 그대로 반복 사용해 3개 테이블 간 스키마 일치를 보장한다)
-- ----------------------------------------------------------------------------

CREATE TABLE player_match_stat (
  match_id uuid NOT NULL REFERENCES fixture(id),
  player_id uuid NOT NULL REFERENCES player(id),
  team_id uuid NOT NULL REFERENCES team(id),
  appearances int NOT NULL, starts int NOT NULL, sub_appearances int NOT NULL, minutes_played int NOT NULL,
  goals int NOT NULL, assists int NOT NULL, shots int NOT NULL, shots_on_target int NOT NULL,
  xg numeric(6,4) NOT NULL, xa numeric(6,4) NOT NULL,
  big_chances_created int NOT NULL, big_chances_missed int NOT NULL,
  penalties_taken int NOT NULL, penalties_scored int NOT NULL,
  free_kick_goals int NOT NULL, headed_goals int NOT NULL, own_goals int NOT NULL,
  passes_attempted int NOT NULL, passes_completed int NOT NULL, key_passes int NOT NULL,
  long_balls_attempted int NOT NULL, long_balls_completed int NOT NULL,
  crosses_attempted int NOT NULL, crosses_completed int NOT NULL, through_balls int NOT NULL,
  dribbles_attempted int NOT NULL, dribbles_completed int NOT NULL, dispossessed int NOT NULL, touches int NOT NULL,
  tackles_attempted int NOT NULL, tackles_won int NOT NULL, interceptions int NOT NULL,
  clearances int NOT NULL, blocks int NOT NULL,
  aerial_duels_attempted int NOT NULL, aerial_duels_won int NOT NULL,
  ground_duels_attempted int NOT NULL, ground_duels_won int NOT NULL,
  errors_leading_to_shot int NOT NULL, errors_leading_to_goal int NOT NULL,
  fouls_committed int NOT NULL, fouls_drawn int NOT NULL,
  yellow_cards int NOT NULL, second_yellows int NOT NULL, red_cards int NOT NULL, offsides int NOT NULL,
  saves int NOT NULL, shots_faced int NOT NULL, goals_conceded int NOT NULL, clean_sheets int NOT NULL,
  penalties_faced int NOT NULL, penalties_saved int NOT NULL,
  punches int NOT NULL, catches int NOT NULL, sweeper_actions int NOT NULL, xg_prevented numeric(6,4) NOT NULL,
  match_rating numeric(3,1) NOT NULL, -- 1.0~10.0
  is_motm boolean NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE player_season_stat (
  player_id uuid NOT NULL REFERENCES player(id),
  season_id uuid NOT NULL REFERENCES season(id),
  competition_type text NOT NULL CHECK (competition_type IN ('LEAGUE','PLAYOFF','CUP','TIEBREAK')),
  team_id uuid NOT NULL REFERENCES team(id),
  league_id uuid NOT NULL REFERENCES league(id),
  appearances int NOT NULL, starts int NOT NULL, sub_appearances int NOT NULL, minutes_played int NOT NULL,
  goals int NOT NULL, assists int NOT NULL, shots int NOT NULL, shots_on_target int NOT NULL,
  xg numeric(6,4) NOT NULL, xa numeric(6,4) NOT NULL,
  big_chances_created int NOT NULL, big_chances_missed int NOT NULL,
  penalties_taken int NOT NULL, penalties_scored int NOT NULL,
  free_kick_goals int NOT NULL, headed_goals int NOT NULL, own_goals int NOT NULL,
  passes_attempted int NOT NULL, passes_completed int NOT NULL, key_passes int NOT NULL,
  long_balls_attempted int NOT NULL, long_balls_completed int NOT NULL,
  crosses_attempted int NOT NULL, crosses_completed int NOT NULL, through_balls int NOT NULL,
  dribbles_attempted int NOT NULL, dribbles_completed int NOT NULL, dispossessed int NOT NULL, touches int NOT NULL,
  tackles_attempted int NOT NULL, tackles_won int NOT NULL, interceptions int NOT NULL,
  clearances int NOT NULL, blocks int NOT NULL,
  aerial_duels_attempted int NOT NULL, aerial_duels_won int NOT NULL,
  ground_duels_attempted int NOT NULL, ground_duels_won int NOT NULL,
  errors_leading_to_shot int NOT NULL, errors_leading_to_goal int NOT NULL,
  fouls_committed int NOT NULL, fouls_drawn int NOT NULL,
  yellow_cards int NOT NULL, second_yellows int NOT NULL, red_cards int NOT NULL, offsides int NOT NULL,
  saves int NOT NULL, shots_faced int NOT NULL, goals_conceded int NOT NULL, clean_sheets int NOT NULL,
  penalties_faced int NOT NULL, penalties_saved int NOT NULL,
  punches int NOT NULL, catches int NOT NULL, sweeper_actions int NOT NULL, xg_prevented numeric(6,4) NOT NULL,
  contribution_score numeric(10,4) NOT NULL,
  avg_condition numeric(3,1) NOT NULL, -- 평균 반올림 허용(SP1 §4)
  motm_awards int NOT NULL,
  injuries_count int NOT NULL,
  rounds_injured int NOT NULL,
  matches_suspended int NOT NULL,
  PRIMARY KEY (player_id, season_id, competition_type)
);

CREATE TABLE player_career_stat (
  player_id uuid PRIMARY KEY REFERENCES player(id),
  appearances int NOT NULL, starts int NOT NULL, sub_appearances int NOT NULL, minutes_played int NOT NULL,
  goals int NOT NULL, assists int NOT NULL, shots int NOT NULL, shots_on_target int NOT NULL,
  xg numeric(6,4) NOT NULL, xa numeric(6,4) NOT NULL,
  big_chances_created int NOT NULL, big_chances_missed int NOT NULL,
  penalties_taken int NOT NULL, penalties_scored int NOT NULL,
  free_kick_goals int NOT NULL, headed_goals int NOT NULL, own_goals int NOT NULL,
  passes_attempted int NOT NULL, passes_completed int NOT NULL, key_passes int NOT NULL,
  long_balls_attempted int NOT NULL, long_balls_completed int NOT NULL,
  crosses_attempted int NOT NULL, crosses_completed int NOT NULL, through_balls int NOT NULL,
  dribbles_attempted int NOT NULL, dribbles_completed int NOT NULL, dispossessed int NOT NULL, touches int NOT NULL,
  tackles_attempted int NOT NULL, tackles_won int NOT NULL, interceptions int NOT NULL,
  clearances int NOT NULL, blocks int NOT NULL,
  aerial_duels_attempted int NOT NULL, aerial_duels_won int NOT NULL,
  ground_duels_attempted int NOT NULL, ground_duels_won int NOT NULL,
  errors_leading_to_shot int NOT NULL, errors_leading_to_goal int NOT NULL,
  fouls_committed int NOT NULL, fouls_drawn int NOT NULL,
  yellow_cards int NOT NULL, second_yellows int NOT NULL, red_cards int NOT NULL, offsides int NOT NULL,
  saves int NOT NULL, shots_faced int NOT NULL, goals_conceded int NOT NULL, clean_sheets int NOT NULL,
  penalties_faced int NOT NULL, penalties_saved int NOT NULL,
  punches int NOT NULL, catches int NOT NULL, sweeper_actions int NOT NULL, xg_prevented numeric(6,4) NOT NULL,
  total_seasons int NOT NULL,
  total_awards int NOT NULL,
  total_injuries int NOT NULL
);

CREATE TABLE team_season_stat (
  team_id uuid NOT NULL REFERENCES team(id),
  season_id uuid NOT NULL REFERENCES season(id),
  competition_type text NOT NULL CHECK (competition_type IN ('LEAGUE','PLAYOFF','CUP','TIEBREAK')),
  league_id uuid NOT NULL REFERENCES league(id),
  played int NOT NULL, wins int NOT NULL, draws int NOT NULL, losses int NOT NULL,
  points int NOT NULL, goals_for int NOT NULL, goals_against int NOT NULL,
  home_played int NOT NULL, home_wins int NOT NULL, home_draws int NOT NULL, home_losses int NOT NULL,
  home_goals_for int NOT NULL, home_goals_against int NOT NULL,
  away_played int NOT NULL, away_wins int NOT NULL, away_draws int NOT NULL, away_losses int NOT NULL,
  away_goals_for int NOT NULL, away_goals_against int NOT NULL,
  clean_sheets int NOT NULL, failed_to_score int NOT NULL,
  biggest_win_opponent_team_id uuid REFERENCES team(id),
  biggest_win_fixture_id uuid REFERENCES fixture(id),
  biggest_win_goals_for int,
  biggest_win_goals_against int,
  biggest_loss_opponent_team_id uuid REFERENCES team(id),
  biggest_loss_fixture_id uuid REFERENCES fixture(id),
  biggest_loss_goals_for int,
  biggest_loss_goals_against int,
  current_form text NOT NULL,
  longest_win_streak int NOT NULL, longest_unbeaten int NOT NULL,
  shots int NOT NULL, shots_on_target int NOT NULL,
  xg_for numeric(6,4) NOT NULL, xg_against numeric(6,4) NOT NULL,
  scoring_by_period jsonb NOT NULL,
  conceding_by_period jsonb NOT NULL,
  set_piece_goals int NOT NULL, open_play_goals int NOT NULL, penalty_goals int NOT NULL,
  possession_avg numeric(5,2) NOT NULL,
  fouls int NOT NULL, yellow_cards int NOT NULL, red_cards int NOT NULL, fair_play_score int NOT NULL,
  squad_size int NOT NULL,
  avg_age numeric(4,1) NOT NULL,
  avg_ovr numeric(5,2) NOT NULL,
  avg_condition numeric(3,1) NOT NULL,
  squad_market_value bigint NOT NULL CHECK (squad_market_value BETWEEN -9007199254740991 AND 9007199254740991),
  injuries_active int NOT NULL, suspensions_active int NOT NULL,
  minutes_distribution jsonb NOT NULL,
  balance bigint NOT NULL CHECK (balance BETWEEN -9007199254740991 AND 9007199254740991),
  season_income bigint NOT NULL CHECK (season_income BETWEEN -9007199254740991 AND 9007199254740991),
  season_expense bigint NOT NULL CHECK (season_expense BETWEEN -9007199254740991 AND 9007199254740991),
  wage_bill bigint NOT NULL CHECK (wage_bill BETWEEN -9007199254740991 AND 9007199254740991),
  transfer_spend bigint NOT NULL CHECK (transfer_spend BETWEEN -9007199254740991 AND 9007199254740991),
  transfer_income bigint NOT NULL CHECK (transfer_income BETWEEN -9007199254740991 AND 9007199254740991),
  sponsor_income bigint NOT NULL CHECK (sponsor_income BETWEEN -9007199254740991 AND 9007199254740991),
  sponsor_payout bigint NOT NULL CHECK (sponsor_payout BETWEEN -9007199254740991 AND 9007199254740991),
  reputation int NOT NULL, fan_base int NOT NULL, academy_level int NOT NULL,
  trophies_league int NOT NULL, trophies_playoff int NOT NULL, trophies_cup int NOT NULL,
  seasons_in_tier1 int NOT NULL, seasons_in_tier2 int NOT NULL, seasons_in_tier3 int NOT NULL,
  PRIMARY KEY (team_id, season_id, competition_type)
);

CREATE TABLE standing (
  season_id uuid NOT NULL REFERENCES season(id),
  league_id uuid NOT NULL REFERENCES league(id),
  round int NOT NULL,
  team_id uuid NOT NULL REFERENCES team(id),
  rank int NOT NULL,
  played int NOT NULL, won int NOT NULL, drawn int NOT NULL, lost int NOT NULL,
  gf int NOT NULL, ga int NOT NULL, gd int NOT NULL, points int NOT NULL,
  form text NOT NULL,
  fair_play_score int NOT NULL,
  tiebreak_applied int, -- [범위 CHECK: 16일차 예정] 1~7
  PRIMARY KEY (season_id, league_id, round, team_id)
);

-- ----------------------------------------------------------------------------
-- §3.6 사건 (E-24~E-27)
-- ----------------------------------------------------------------------------

CREATE TABLE injury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES player(id),
  match_id uuid REFERENCES fixture(id),
  season_id uuid NOT NULL REFERENCES season(id),
  severity text NOT NULL CHECK (severity IN ('KNOCK','MINOR','MODERATE','SEVERE')),
  type_label text NOT NULL,
  occurred_round int NOT NULL,
  rounds_out int NOT NULL,
  return_round int NOT NULL,
  status text NOT NULL CHECK (status IN ('ACTIVE','RECOVERED'))
);

-- player_state.active_injury_id는 injury가 이제 존재하므로 여기서 FK 연결
ALTER TABLE player_state
  ADD CONSTRAINT player_state_active_injury_id_fkey
  FOREIGN KEY (active_injury_id) REFERENCES injury(id);

CREATE TABLE youth_prospect (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  team_id uuid NOT NULL REFERENCES team(id),
  player_id uuid NOT NULL REFERENCES player(id),
  academy_level_at_generation int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~5
  bonus_applied boolean NOT NULL
);

CREATE TABLE news_feed_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  type text NOT NULL CHECK (type IN (
    'TRANSFER','LOAN','RETIREMENT','YOUTH_DEBUT','MANAGER_CHANGE','SPONSOR_BANKRUPT',
    'AWARD','INJURY','MILESTONE','SANCTION')),
  headline text NOT NULL,
  body text NOT NULL,
  ref_type text NOT NULL, -- 다형 참조, FK 없음
  ref_id text NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE TABLE sanction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  team_id uuid NOT NULL REFERENCES team(id),
  sanction_type text NOT NULL CHECK (sanction_type IN ('REBUILD_SANCTION')),
  effects jsonb NOT NULL,
  grant_amount bigint NOT NULL CHECK (grant_amount BETWEEN -9007199254740991 AND 9007199254740991)
);

-- ----------------------------------------------------------------------------
-- §3.7 경제 (E-28~E-30)
-- ----------------------------------------------------------------------------

CREATE TABLE sponsor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id), -- [물리 전용]
  name text NOT NULL,
  industry text NOT NULL,
  scale int NOT NULL, -- [범위 CHECK: 16일차 예정] 1~5
  balance bigint NOT NULL CHECK (balance BETWEEN -9007199254740991 AND 9007199254740991),
  reputation int NOT NULL,
  bankrupt_at_season int
);

CREATE TABLE sponsor_contract (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsor(id),
  team_id uuid NOT NULL REFERENCES team(id),
  start_season int NOT NULL,
  end_season int NOT NULL,
  income_per_season bigint NOT NULL CHECK (income_per_season BETWEEN -9007199254740991 AND 9007199254740991),
  share_pct numeric(5,2) NOT NULL, -- ≤30.00, 팀당 ACTIVE≤3 트리거는 16일차
  status text NOT NULL CHECK (status IN ('ACTIVE','EXPIRED','VOIDED'))
);

CREATE TABLE point_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  owner_type text NOT NULL CHECK (owner_type IN ('TEAM','SPONSOR')),
  owner_id uuid NOT NULL, -- 다형 참조(owner_type에 따라 team.id 또는 sponsor.id), FK 없음
  amount bigint NOT NULL CHECK (amount BETWEEN -9007199254740991 AND 9007199254740991),
  reason_code text NOT NULL CHECK (reason_code IN (
    'LEAGUE_FINISH','PLAYOFF_PRIZE','CUP_PRIZE','GIANT_KILLING_BONUS','SPONSOR_INCOME',
    'SPONSOR_SHARE','TRANSFER_IN','TRANSFER_OUT','WAGE','REBUILD_GRANT','YOUTH_COST','ACADEMY_INVEST')),
  ref_type text NOT NULL, -- 다형 참조, FK 없음
  ref_id text NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after BETWEEN -9007199254740991 AND 9007199254740991),
  created_at timestamptz NOT NULL
);

-- ----------------------------------------------------------------------------
-- §3.8 명예 (E-31~E-32)
-- ----------------------------------------------------------------------------

CREATE TABLE award (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  type text NOT NULL CHECK (type IN (
    'LEAGUE_MVP','GOLDEN_BOOT','GOLDEN_PLAYMAKER','GOLDEN_GLOVE','BEST_YOUNG_PLAYER',
    'MANAGER_OF_SEASON','TEAM_OF_SEASON','BALLON_DOR','WORLD_XI','CUP_MVP',
    'PLAYOFF_MVP','PLAYER_OF_THE_ROUND')),
  scope text NOT NULL CHECK (scope IN ('LEAGUE','WORLD','CUP','PLAYOFF')),
  league_id uuid REFERENCES league(id),
  player_id uuid REFERENCES player(id),
  manager_id uuid REFERENCES manager(id),
  team_id uuid REFERENCES team(id),
  criteria jsonb NOT NULL
  -- player_id/manager_id/team_id 배타적 nullable CHECK는 문서상 "CHECK 후보"로만 언급된
  -- 미확정 사항이라 오늘 추가하지 않음(§6.1 R-09)
);

CREATE TABLE trophy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES season(id),
  team_id uuid NOT NULL REFERENCES team(id),
  type text NOT NULL CHECK (type IN ('LEAGUE_TITLE','PLAYOFF_TITLE','CUP_TITLE','PROMOTION')),
  league_id uuid REFERENCES league(id)
  -- (season_id, team_id, type) UNIQUE는 15일차
);
