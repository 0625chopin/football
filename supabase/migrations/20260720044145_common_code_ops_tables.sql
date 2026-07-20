-- ============================================================================
-- 14일차 (2026-08-07) — Task 032 (2/4): 공통코드 4테이블(E-41~E-44)
-- + 운영 3테이블(E-45~E-47) 생성, snapshot_id FK 인계 이행
-- 담당: 6팀 DB·인프라팀 / 근거: docs/db/schema-design.md §3.11(809~937행), §9.1/§9.3
-- ============================================================================
-- ⚠️ 파일명 버전 표기 규칙(13일차 팀장 확정, schema-design.md §9.2): 이 파일명의
-- 앞자리는 인게임 날짜가 아니라 apply_migration 실행 후 list_migrations로 확인한
-- 원격 채번 버전이다. 인게임 일차 정보는 이 헤더 주석에만 남긴다.
-- ============================================================================
--
-- 이번 마이그레이션에 포함하는 것:
--   - common_code_group(E-41) / common_code(E-42) / common_code_history(E-43) /
--     sim_constant_snapshot(E-44) / cron_run(E-45) / cron_gap(E-46) / audit_log(E-47)
--     7개 테이블 — 컬럼/물리 타입/NULL 여부(§3.11 그대로), PK, enum CHECK(§2.1)
--   - common_code.min_value/max_value/json_schema — 13일차 이슈 배치(I-93)로
--     common_code_group(E-41)에서 이동해 온 컬럼(§9.3)
--   - §9.1 인계 이행: fixture.snapshot_id(NOT NULL)/season.snapshot_id(NULL)에
--     ALTER TABLE로 sim_constant_snapshot(id) FK 추가 — 13일차엔 이 테이블이
--     없어 걸지 못했던 FK를, 오늘 sim_constant_snapshot이 생기는 시점에 이행한다.
--     착수 직전 `SELECT count(*) FROM fixture;` 재확인(0건) 완료 후 진행.
--
-- 이번 마이그레이션에 포함하지 않고 이월하는 것 (그대로 손대지 않음):
--   - 범위 CHECK(1~30, 0~100 등), common_code 숫자형/JSON형 CHECK,
--     sponsor_contract류 트리거 → 16일차(Task 032 "제약")
--   - 일반/UNIQUE 인덱스(sim_constant_snapshot.snapshot_hash UNIQUE 포함,
--     §6.2.1 #11) → 15일차
--   - common_code.updated_by / common_code_history.changed_by →
--     user_profile(id) FK: user_profile은 037(51~55일차, 인증·지갑) 테이블이라
--     오늘은 아직 없다. 13일차가 snapshot_id에 썼던 것과 동일한 패턴대로
--     컬럼만 생성하고 FK는 037 이후 ALTER TABLE로 추가 예정(6팀 인계 사항).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- §3.11 설정/운영 (E-41~E-44) — 공통코드
-- ----------------------------------------------------------------------------

CREATE TABLE common_code_group (
  group_code text PRIMARY KEY, -- 자연키, UPPER_SNAKE(예: ROUND_INTERVAL_MIN)
  group_name text NOT NULL,
  description text NOT NULL,
  value_type text NOT NULL CHECK (value_type IN ('INT','DECIMAL','STRING','BOOL','JSON')),
  apply_policy text NOT NULL CHECK (apply_policy IN ('NEXT_SEASON','IMMEDIATE','NEXT_MARKET')),
  related_fr text[] NOT NULL,
  is_active boolean NOT NULL,
  sort_order int NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE common_code (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text NOT NULL REFERENCES common_code_group(group_code),
  code text NOT NULL,
  world_id uuid REFERENCES world(id), -- null=전역 기본값, 값 있으면 월드 오버라이드
  value text NOT NULL,
  value_num numeric,
  value_json jsonb,
  min_value numeric, -- 13일차 이동(I-93, §9.3) — 숫자형 CHECK는 16일차
  max_value numeric, -- 13일차 이동(I-93, §9.3)
  json_schema jsonb, -- 13일차 이동(I-93, §9.3)
  default_value text NOT NULL, -- D-26: 갱신 경로는 초기 시드 적재뿐(런타임 규약)
  description text NOT NULL,
  unit text,
  sort_order int NOT NULL,
  is_active boolean NOT NULL,
  effective_from_season int,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  updated_by uuid -- FK → user_profile(id): 037(51~55일차) 이후 ALTER TABLE로 추가 예정
  -- UNIQUE(group_code, code, world_id) 계열(2개 부분 유니크) 및
  -- 숫자형/JSON형 CHECK는 각각 15일차/16일차로 이월(§6.2.2, §9.3)
);

CREATE TABLE common_code_history ( -- append-only(NFR-SEC-010) — RLS 강제는 18일차
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  common_code_id uuid NOT NULL REFERENCES common_code(id),
  group_code text NOT NULL, -- 비정규화(코드 삭제 후 추적용)
  code text NOT NULL, -- 비정규화
  action text NOT NULL CHECK (action IN ('CREATE','UPDATE','DEACTIVATE','REACTIVATE')),
  old_value text,
  new_value text,
  old_effective_from_season int,
  new_effective_from_season int,
  changed_by uuid NOT NULL, -- FK → user_profile(id): 037 이후 ALTER TABLE로 추가 예정
  changed_at timestamptz NOT NULL,
  reason text NOT NULL -- 필수(NFR-CFG-002), 빈 문자열 금지는 런타임 검증
);

CREATE TABLE sim_constant_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id uuid NOT NULL REFERENCES world(id),
  snapshot_hash text NOT NULL, -- UNIQUE 인덱스는 15일차(§6.2.1 #11)
  constants jsonb NOT NULL, -- { "GROUP_CODE": { "CODE": value, ... } }
  created_at timestamptz NOT NULL,
  first_used_season int NOT NULL,
  ref_count int NOT NULL -- 관측용(NFR-CFG-006 ≤20건 목표)
);

-- ----------------------------------------------------------------------------
-- §3.11 설정/운영 (E-45~E-47) — 운영/감사
-- ----------------------------------------------------------------------------

CREATE TABLE cron_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  duration_ms int NOT NULL,
  lock_acquired boolean NOT NULL, -- false면 no-op
  fixtures_processed int NOT NULL,
  is_catch_up boolean NOT NULL,
  status text NOT NULL CHECK (status IN ('SUCCESS','PARTIAL','FAILED','NOOP')),
  retry_count int NOT NULL,
  error_code text, -- 실패 시에만, 번역 비대상(T13)
  error_message text, -- 번역 비대상(T13)
  snapshot_hash text -- sim_constant_snapshot.snapshot_hash 문자열 참조(uuid FK 아님), NOOP이면 null
);

CREATE TABLE cron_gap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_started_at timestamptz NOT NULL,
  gap_ended_at timestamptz,
  gap_minutes int NOT NULL,
  missed_fixture_count int NOT NULL, -- Fixture 단위(라운드 아님)
  recovered_at timestamptz,
  detected_at timestamptz NOT NULL
);

CREATE TABLE audit_log ( -- append-only(NFR-SEC-010) — RLS 강제는 18일차
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('HUMAN','ENGINE','ODDS','SETTLEMENT')),
  actor_id text, -- actor_type='HUMAN'일 때만 값(다형, FK 없음)
  action text NOT NULL, -- 다형(예: WORLD_RESET)
  target_type text NOT NULL, -- 다형 참조(FK 없음)
  target_id text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL
  -- idx_audit_log__target, idx_audit_log__actor_created는 15일차(§6.2.2 #5)
);

-- ----------------------------------------------------------------------------
-- §9.1 인계 이행 — fixture/season.snapshot_id FK (13일차엔 대상 테이블이 없어 보류됨)
-- 착수 직전 SELECT count(*) FROM fixture 로 0건 재확인 완료(2026-08-07 기준).
-- ----------------------------------------------------------------------------

ALTER TABLE fixture
  ADD CONSTRAINT fixture_snapshot_id_fkey
  FOREIGN KEY (snapshot_id) REFERENCES sim_constant_snapshot(id);

ALTER TABLE season
  ADD CONSTRAINT season_snapshot_id_fkey
  FOREIGN KEY (snapshot_id) REFERENCES sim_constant_snapshot(id);
