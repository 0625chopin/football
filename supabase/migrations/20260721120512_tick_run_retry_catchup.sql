-- ============================================================================
-- 44일차 (2026-09-18) — Task 033: tick_run() 지수 백오프 재시도 + 밀린 라운드 catch-up
-- 담당: 6팀 DB·인프라팀
--
-- ## 배경
-- 43일차까지 클레임 블록(BEGIN...EXCEPTION WHEN OTHERS)은 실패 시 즉시 `FAILED`로
-- 종료했다. 44일차 팀 일정표는 "지수 백오프 3회 재시도, 밀린 라운드 catch-up(폴백
-- 경로 구분 기록)"을 요구한다. `cron_run.retry_count`/`cron_run.is_catch_up`
-- 컬럼은 41일차 스키마부터 이미 존재했으나 지금까지 각각 상수 0/false만 기록해
-- 왔다(42·43일차 INSERT 참조) — 이번 변경이 두 컬럼을 실제 값으로 채우는 첫 변경이다.
--
-- ## 지수 백오프 3회 재시도
-- 클레임 블록(candidate 확정 + UPDATE)을 LOOP로 감싸 `CRON_PARAM.RETRY_MAX`(시드값 3,
-- 미적재 시 폴백 3)까지 재시도한다. 매 실패마다 `pg_sleep(0.1 * 2^(attempt-1))`
-- (0.1s → 0.2s → 0.4s, 2.0s 상한)로 대기 후 재시도하고, 재시도 소진 후에도
-- 실패하면 그 시점에만 `FAILED`로 확정한다. 재시도 횟수는 `cron_run.retry_count`에
-- 그대로 기록되어(0=최초 성공, 1~3=N회 재시도 후 성공 또는 소진) 폴백 경로를
-- 정상 경로와 관측 가능하게 구분한다(어드민 대시보드 등, I-218 계열 소비자 기준).
-- 중첩 BEGIN/EXCEPTION은 PL/pgSQL이 암묵적 서브트랜잭션(savepoint)으로 처리하므로
-- 재시도 시 이전 시도의 부분 UPDATE는 이미 롤백된 상태에서 깨끗하게 재실행된다.
--
-- ## 밀린 라운드 catch-up
-- "이번 틱이 정상 주기 처리가 아니라 밀린 라운드를 따라잡는 중"인지를
-- `cron_run.is_catch_up`에 기록한다. 판정 기준: 클레임 대상 중 킥오프 시각이
-- `now() - CRON_PARAM.INTERVAL_MIN`(정상 크론 주기, 미적재 시 1분 폴백)보다도
-- 이전인 SCHEDULED Fixture가 하나라도 있으면 그 라운드는 최소 한 번의 정상 주기를
-- 넘겨 밀린 것이므로 catch-up으로 표시한다. 이 판정은 클레임 UPDATE와 별개의
-- 안정적 SELECT로 재시도 루프 시작 전에 1회만 수행한다(재시도 여부와 무관하게
-- "이 틱이 애초에 밀린 라운드를 다루는지"는 재시도 성공/실패에 좌우될 값이 아니다).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tick_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at    timestamptz := clock_timestamp();
  v_lock_classid  int := hashtext('football4');
  v_lock_objid    int := hashtext('tick');
  v_locked        boolean;
  v_timeout_ms    int;
  v_interval_min  int;
  v_cap           int;
  v_retry_max     int;
  v_attempt       int := 0;
  v_is_catch_up   boolean := false;
  v_fixtures      int := 0;
  v_remaining     int := 0;
  v_status        text;
  v_error_code    text;
  v_error_message text;
  v_run_id        uuid;
  v_duration_ms   int;
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

  -- 1회 실행 처리 상한(CRON_PARAM.CATCHUP_MAX_PER_RUN, I-09: 30, 미적재 시 폴백)
  SELECT value_num::int INTO v_cap
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'CATCHUP_MAX_PER_RUN'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_cap := COALESCE(v_cap, 30);

  -- 44일차: 최대 재시도 횟수(CRON_PARAM.RETRY_MAX, 미적재 시 폴백 3)
  SELECT value_num::int INTO v_retry_max
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'RETRY_MAX'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_retry_max := COALESCE(v_retry_max, 3);

  -- 44일차: 정상 크론 주기(CRON_PARAM.INTERVAL_MIN, 미적재 시 폴백 1분)
  SELECT value_num INTO v_interval_min
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'INTERVAL_MIN'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_interval_min := COALESCE(v_interval_min, 1);

  -- 44일차: catch-up 판정 — 클레임 전 안정적 스냅샷(재시도 성공/실패와 무관)
  SELECT EXISTS (
    SELECT 1 FROM fixture
    WHERE status = 'SCHEDULED'
      AND kickoff_at <= v_started_at - make_interval(mins => v_interval_min)
  ) INTO v_is_catch_up;

  LOOP
    BEGIN
      -- 42일차 멱등성 게이트 + 43일차 상한을 유지한 원자적 클레임.
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
            -- STUB: 2팀 엔진 연동 전 결정론적 placeholder (43일차 주석 참조, 실제 스코어 아님)
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
      EXIT; -- 성공 — 재시도 루프 종료
    EXCEPTION WHEN OTHERS THEN
      v_error_code := SQLSTATE;
      v_error_message := SQLERRM;
      v_fixtures := 0;
      v_remaining := 0;

      IF v_attempt >= v_retry_max THEN
        -- 44일차: 재시도 소진 — 폴백 경로. retry_count = v_retry_max로 기록되어
        -- 즉시 실패(retry_count=0)와 재시도 후 실패가 구분된다.
        v_status := 'FAILED';
        EXIT;
      END IF;

      v_attempt := v_attempt + 1;
      PERFORM pg_sleep(least(2.0, 0.1 * power(2, v_attempt - 1)));
      -- 루프 재진입 — 클레임 재시도
    END;
  END LOOP;

  v_duration_ms := GREATEST(0, (extract(epoch FROM (clock_timestamp() - v_started_at)) * 1000)::int);

  INSERT INTO cron_run (
    started_at, finished_at, duration_ms, lock_acquired,
    fixtures_processed, is_catch_up, status, retry_count,
    error_code, error_message, snapshot_hash
  ) VALUES (
    v_started_at, clock_timestamp(), v_duration_ms, true,
    v_fixtures, v_is_catch_up, v_status, v_attempt,
    v_error_code, v_error_message, NULL
  ) RETURNING id INTO v_run_id;

  RETURN jsonb_build_object(
    'locked', true, 'run_id', v_run_id, 'status', v_status,
    'fixtures_processed', v_fixtures, 'fixtures_remaining', v_remaining,
    'is_catch_up', v_is_catch_up, 'retry_count', v_attempt
  );
END;
$$;

COMMENT ON FUNCTION public.tick_run() IS
  'Task 033(44일차) — 어드바이저리 락 + 5분 타임아웃 + 원자적 Fixture 클레임(멱등성 게이트) + 1회 처리 상한(CRON_PARAM.CATCHUP_MAX_PER_RUN, I-09: 30) + 지수 백오프 재시도(CRON_PARAM.RETRY_MAX: 3, cron_run.retry_count에 실측 기록) + 밀린 라운드 catch-up 판정(cron_run.is_catch_up). 상한/재시도 소진에도 남는 미처리분은 SCHEDULED로 남아 다음 tick에 자연 이월(status=PARTIAL). 스코어는 2팀 엔진 미연동 STUB.';
