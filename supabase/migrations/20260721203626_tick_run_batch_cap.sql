-- ============================================================================
-- 43일차 (2026-09-17) — Task 033: tick_run() 1회 실행 처리 상한 — I-09 반영
-- 담당: 6팀 DB·인프라팀
--
-- ## 배경
-- ROADMAP 42일차까지의 클레임 UPDATE(`20260721104357_tick_run_idempotent_claim.sql`)는
-- 킥오프 도래 SCHEDULED Fixture 전량을 한 번에 클레임했다 — 상한이 없었다. 43일차
-- 팀 일정표는 "1회 실행 처리 상한 — I-09 반영: 50경기 → 30경기(팀원 3 권고, Edge
-- Function CPU 2초 한도 대응). 초과분 다음 틱 이월"을 요구한다.
--
-- I-09가 가리키는 상한 값은 이미 `CRON_PARAM.CATCHUP_MAX_PER_RUN`(41일차 시드,
-- `LOCK_TIMEOUT_MIN` 조회와 동일한 common_code 참조 패턴)로 존재했으나 값이 50이었다.
-- 이 마이그레이션이 그 값을 30으로 갱신하고(데이터), tick_run()이 실제로 그 값을
-- 읽어 클레임 개수를 제한하도록 만든다(로직) — 값만 바꾸고 로직이 안 읽으면
-- 상한이 이름뿐인 설정으로 남는다.
--
-- ## 초과분 "다음 틱 이월"의 구현 방식
-- 별도의 이월 큐나 상태를 두지 않는다. 클레임 UPDATE에 `LIMIT`을 걸어 상한을 넘는
-- 대상은 애초에 이번 트랜잭션에서 SCHEDULED → FINISHED로 전이시키지 않는다. 남은
-- Fixture는 여전히 `status = 'SCHEDULED'`이고 `kickoff_at <= now()`를 계속 만족하므로,
-- 다음 tick_run() 호출이 42일차 멱등성 게이트(조건부 UPDATE)에 의해 그대로 다시
-- 대상 집합에 들어온다 — 이월이 "아무 것도 하지 않음"으로 자연히 보장된다.
--
-- ## LIMIT을 UPDATE에 직접 걸지 않는 이유
-- PostgreSQL의 UPDATE는 LIMIT을 지원하지 않는다. 대신 대상 id를
-- `SELECT ... ORDER BY kickoff_at, id LIMIT v_cap FOR UPDATE`로 먼저 확정(결정론적
-- 순서 — 킥오프가 이른 경기부터 처리)한 뒤 그 id 집합에만 UPDATE를 건다. `FOR UPDATE`는
-- 42일차 주석이 말한 "행 단위 멱등성 방어적 이중화"를 이 SELECT 단계에도 유지하기
-- 위함이다(동시 실행 시 이미 잠긴 행은 걸러지고 커밋 후 재평가에서 상태가 바뀌어 있으면
-- WHERE에서 자연 제외).
--
-- ## PARTIAL 상태 — 이월 발생을 관측 가능하게 함
-- `cron_run.status`는 원래부터 `'SUCCESS','PARTIAL','FAILED','NOOP'`을 허용했다(41일차
-- 스키마, 이번 마이그레이션 이전엔 PARTIAL을 쓰는 코드 경로가 없었다). 클레임 이후에도
-- 여전히 킥오프 도래 SCHEDULED가 남아 있으면(=상한에 걸려 이월 발생) status를
-- 'PARTIAL'로 남겨 다음 소비자(어드민 대시보드 등, I-218)가 이월 발생 여부를
-- cron_run 조회만으로 판단할 수 있게 한다. 남은 게 없으면 기존과 동일하게 'SUCCESS'.
-- ============================================================================

-- 데이터: I-09 — CATCHUP_MAX_PER_RUN 50 → 30
UPDATE common_code
SET value = '30', value_num = 30, default_value = '30', updated_at = now()
WHERE group_code = 'CRON_PARAM' AND code = 'CATCHUP_MAX_PER_RUN' AND world_id IS NULL;

CREATE OR REPLACE FUNCTION public.tick_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at   timestamptz := clock_timestamp();
  v_lock_classid int := hashtext('football4');
  v_lock_objid   int := hashtext('tick');
  v_locked       boolean;
  v_timeout_ms   int;
  v_cap          int;
  v_fixtures     int := 0;
  v_remaining    int := 0;
  v_status       text;
  v_error_code   text;
  v_error_message text;
  v_run_id       uuid;
  v_duration_ms  int;
BEGIN
  v_locked := pg_try_advisory_xact_lock(v_lock_classid, v_lock_objid);

  IF NOT v_locked THEN
    INSERT INTO cron_run (
      started_at, finished_at, duration_ms, lock_acquired,
      fixtures_processed, is_catch_up, status, retry_count,
      error_code, error_message, snapshot_hash
    ) VALUES (
      v_started_at, clock_timestamp(), 0, false,
      0, false, 'NOOP', 0,
      NULL, NULL, NULL
    ) RETURNING id INTO v_run_id;

    RETURN jsonb_build_object(
      'locked', false, 'run_id', v_run_id, 'status', 'NOOP'
    );
  END IF;

  -- 타임아웃 5분(CRON_PARAM.LOCK_TIMEOUT_MIN, 미적재 시 폴백)
  SELECT (value_num * 60000)::int INTO v_timeout_ms
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'LOCK_TIMEOUT_MIN'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_timeout_ms := COALESCE(v_timeout_ms, 300000);
  EXECUTE format('SET LOCAL statement_timeout = %L', v_timeout_ms::text || 'ms');

  -- 43일차: 1회 실행 처리 상한(CRON_PARAM.CATCHUP_MAX_PER_RUN, I-09 반영 30, 미적재 시 폴백)
  SELECT value_num::int INTO v_cap
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'CATCHUP_MAX_PER_RUN'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_cap := COALESCE(v_cap, 30);

  BEGIN
    -- 42일차 멱등성 게이트(조건부 UPDATE)를 유지하되, 대상 집합을 상한만큼만
    -- 결정론적 순서(킥오프 이른 순)로 먼저 잠가 클레임한다. 상한을 넘는 나머지는
    -- SCHEDULED로 남아 다음 tick_run() 호출에서 자연히 재대상이 된다(이월).
    WITH candidate AS (
      SELECT id FROM fixture
      WHERE status = 'SCHEDULED' AND kickoff_at <= now()
      ORDER BY kickoff_at, id
      LIMIT v_cap
      FOR UPDATE
    ),
    claimed AS (
      UPDATE fixture
      SET status = 'FINISHED',
          simulated_at = clock_timestamp(),
          -- STUB: 2팀 엔진 연동 전 결정론적 placeholder (42일차 주석 참조, 실제 스코어 아님)
          home_score = COALESCE(home_score, (match_seed % 4)::int),
          away_score = COALESCE(away_score, ((match_seed / 4) % 4)::int)
      WHERE id IN (SELECT id FROM candidate)
      RETURNING id
    )
    SELECT count(*) INTO v_fixtures FROM claimed;

    -- 상한에 걸려 이번 틱에 처리하지 못하고 남은 킥오프 도래분(이월 대상)
    SELECT count(*) INTO v_remaining
    FROM fixture
    WHERE status = 'SCHEDULED' AND kickoff_at <= now();

    v_status := CASE WHEN v_remaining > 0 THEN 'PARTIAL' ELSE 'SUCCESS' END;
    v_error_code := NULL;
    v_error_message := NULL;
  EXCEPTION WHEN OTHERS THEN
    v_status := 'FAILED';
    v_error_code := SQLSTATE;
    v_error_message := SQLERRM;
    v_fixtures := 0;
    v_remaining := 0;
  END;

  v_duration_ms := GREATEST(0, (extract(epoch FROM (clock_timestamp() - v_started_at)) * 1000)::int);

  INSERT INTO cron_run (
    started_at, finished_at, duration_ms, lock_acquired,
    fixtures_processed, is_catch_up, status, retry_count,
    error_code, error_message, snapshot_hash
  ) VALUES (
    v_started_at, clock_timestamp(), v_duration_ms, true,
    v_fixtures, false, v_status, 0,
    v_error_code, v_error_message, NULL
  ) RETURNING id INTO v_run_id;

  RETURN jsonb_build_object(
    'locked', true, 'run_id', v_run_id, 'status', v_status,
    'fixtures_processed', v_fixtures, 'fixtures_remaining', v_remaining
  );
END;
$$;

COMMENT ON FUNCTION public.tick_run() IS
  'Task 033(43일차) — 어드바이저리 락 + 5분 타임아웃 + 원자적 Fixture 클레임(멱등성 게이트) + 1회 처리 상한(CRON_PARAM.CATCHUP_MAX_PER_RUN, I-09: 30) — 초과분은 SCHEDULED로 남아 다음 tick에 자연 이월. 상한에 걸려 미처리분이 남으면 status=PARTIAL. 스코어는 2팀 엔진 미연동 STUB.';
