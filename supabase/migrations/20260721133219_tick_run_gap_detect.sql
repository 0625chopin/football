-- ============================================================================
-- 45일차 (2026-09-21) — Task 033: tick_run() 크론 중단 구간 감지 (R-08, FR-AD-020)
-- 담당: 6팀 DB·인프라팀
--
-- ## 배경
-- 44일차까지 tick_run()은 "이번 틱 안에서" 밀린 Fixture를 따라잡는 catch-up만
-- 갖췄다(`is_catch_up`, `cron_run` 기준 fixture 킥오프 지연 여부). FR-AD-020은 그와
-- 별개로 "크론 자체가 호출되지 않는 중단"을 다룬다 — 예: Supabase Cron 스케줄러가
-- 멈추면 tick_run()이 아예 실행되지 않으므로 fixture 기준 판정으로는 잡히지 않는다.
-- 유일한 관측 지점은 "다음에 tick_run()이 실행됐을 때, 그 사이에 얼마나 비어
-- 있었는가"뿐이다 — 즉 판정은 항상 중단이 끝난 시점(=이번 호출)에 뒤늦게 이뤄진다.
--
-- ## 판정 기준 (수용 기준 ①)
-- 05문서(§CRON_PARAM) `GAP_DETECT_MULTIPLIER`(시드값 3, 41일차부터 이미 시드됨,
-- 미적재 시 폴백 3)를 사용해, "마지막 성공(SUCCESS/PARTIAL) 실행의 종료 시각"과
-- "이번 호출 시각(v_started_at)" 사이 간격이 `CRON_PARAM.INTERVAL_MIN 분 × 배수`를
-- 초과하면 중단 구간으로 판정한다. NOOP(락 경합)·FAILED는 "성공"이 아니므로 기준
-- 시각 갱신에서 제외한다 — 그래야 재시도 소진 후 FAILED가 반복되는 동안에도 매
-- 틱 경고가 계속 발생해(의도된 동작) 실제 중단이 이어지고 있음을 알린다.
--
-- 최초 실행(과거 성공 기록 없음)은 비교 기준이 없으므로 판정을 건너뛴다.
--
-- ## `cron_gap` 기록 (수용 기준 ①)
-- `gap_started_at`=마지막 성공 종료 시각, `gap_ended_at`=이번 호출 시각(크론이
-- 다시 응답한 시점), `missed_fixture_count`=그 구간 내 킥오프였던 SCHEDULED
-- Fixture 수(재시도 루프 진입 전 안정적 스냅샷 — 44일차 `is_catch_up` 판정과 동일
-- 패턴), `recovered_at`=이번 틱에서 밀린 Fixture까지 전량 처리 완료(v_remaining=0)
-- 했을 때만 채우고, 상한에 걸려 다음 틱으로 더 이월되면 NULL로 남긴다(수용 기준③의
-- "catch-up 완료 기록"은 이번 틱 내 완주한 경우만 다루며, 여러 틱에 걸친 완주 시점
-- 갱신은 이번 일차 범위 밖 — 이슈 후보로 별도 보고).
--
-- ## 경고 발생
-- 이 함수는 알림 채널을 갖지 않으므로(운영 콘솔은 5팀/DB인프라팀 후속 일정),
-- `RAISE WARNING`으로 중단 감지를 기록한다 — Supabase Edge Function 로그/
-- `get_logs`에 노출되어 관측 가능하다. RPC 응답에도 `gap_detected`/`gap_minutes`/
-- `cron_gap_id`를 추가해 호출자(Edge Function, 향후 어드민 API)가 즉시 알 수 있다.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tick_run()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at            timestamptz := clock_timestamp();
  v_lock_classid          int := hashtext('football4');
  v_lock_objid            int := hashtext('tick');
  v_locked                boolean;
  v_timeout_ms            int;
  v_interval_min          int;
  v_cap                   int;
  v_retry_max             int;
  v_attempt               int := 0;
  v_is_catch_up           boolean := false;
  v_fixtures              int := 0;
  v_remaining             int := 0;
  v_status                text;
  v_error_code            text;
  v_error_message         text;
  v_run_id                uuid;
  v_duration_ms           int;
  v_gap_multiplier        int;
  v_last_success_finished timestamptz;
  v_gap_detected          boolean := false;
  v_gap_minutes           int;
  v_missed_fixtures       int := 0;
  v_gap_id                uuid;
  v_recovered_at          timestamptz;
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

  -- 최대 재시도 횟수(CRON_PARAM.RETRY_MAX, 미적재 시 폴백 3)
  SELECT value_num::int INTO v_retry_max
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'RETRY_MAX'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_retry_max := COALESCE(v_retry_max, 3);

  -- 정상 크론 주기(CRON_PARAM.INTERVAL_MIN, 미적재 시 폴백 1분)
  SELECT value_num INTO v_interval_min
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'INTERVAL_MIN'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_interval_min := COALESCE(v_interval_min, 1);

  -- 45일차: 중단 감지 배수(CRON_PARAM.GAP_DETECT_MULTIPLIER, 미적재 시 폴백 3)
  SELECT value_num::int INTO v_gap_multiplier
  FROM common_code
  WHERE group_code = 'CRON_PARAM' AND code = 'GAP_DETECT_MULTIPLIER'
    AND world_id IS NULL AND is_active
  LIMIT 1;

  v_gap_multiplier := COALESCE(v_gap_multiplier, 3);

  -- catch-up 판정 — 클레임 전 안정적 스냅샷(재시도 성공/실패와 무관)
  SELECT EXISTS (
    SELECT 1 FROM fixture
    WHERE status = 'SCHEDULED'
      AND kickoff_at <= v_started_at - make_interval(mins => v_interval_min)
  ) INTO v_is_catch_up;

  -- 45일차: 크론 중단 구간 감지 — 마지막 성공(SUCCESS/PARTIAL) 실행 종료 이후
  -- 경과가 "정상 주기 × 배수"를 초과하면 중단으로 판정한다. FAILED/NOOP은
  -- 성공이 아니므로 기준 갱신에서 제외(재시도 소진이 반복되는 동안 매 틱 재경고).
  SELECT finished_at INTO v_last_success_finished
  FROM cron_run
  WHERE status IN ('SUCCESS', 'PARTIAL')
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_last_success_finished IS NOT NULL
     AND v_started_at - v_last_success_finished
         > make_interval(mins => v_interval_min * v_gap_multiplier)
  THEN
    v_gap_detected := true;
    v_gap_minutes := round(extract(epoch FROM (v_started_at - v_last_success_finished)) / 60)::int;

    -- 중단 구간 동안 킥오프였던(=놓친) SCHEDULED Fixture 수 — 클레임 전 스냅샷
    SELECT count(*) INTO v_missed_fixtures
    FROM fixture
    WHERE status = 'SCHEDULED'
      AND kickoff_at BETWEEN v_last_success_finished AND v_started_at;
  END IF;

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
        -- 재시도 소진 — 폴백 경로. retry_count = v_retry_max로 기록되어
        -- 즉시 실패(retry_count=0)와 재시도 후 실패가 구분된다.
        v_status := 'FAILED';
        EXIT;
      END IF;

      v_attempt := v_attempt + 1;
      PERFORM pg_sleep(least(2.0, 0.1 * power(2, v_attempt - 1)));
      -- 루프 재진입 — 클레임 재시도
    END;
  END LOOP;

  -- 45일차: 이번 틱에서 밀린 Fixture까지 전량 처리 완료했을 때만 recovered_at을
  -- 채운다(여러 틱에 걸친 완주 시점 소급 갱신은 이번 일차 범위 밖).
  IF v_gap_detected AND v_remaining = 0 AND v_status = 'SUCCESS' THEN
    v_recovered_at := clock_timestamp();
  ELSE
    v_recovered_at := NULL;
  END IF;

  IF v_gap_detected THEN
    INSERT INTO cron_gap (
      gap_started_at, gap_ended_at, gap_minutes,
      missed_fixture_count, recovered_at, detected_at
    ) VALUES (
      v_last_success_finished, v_started_at, v_gap_minutes,
      v_missed_fixtures, v_recovered_at, v_started_at
    ) RETURNING id INTO v_gap_id;

    RAISE WARNING 'tick_run: cron gap detected — % min since last success (missed % fixtures, cron_gap=%)',
      v_gap_minutes, v_missed_fixtures, v_gap_id;
  END IF;

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
    'is_catch_up', v_is_catch_up, 'retry_count', v_attempt,
    'gap_detected', v_gap_detected, 'gap_minutes', v_gap_minutes, 'cron_gap_id', v_gap_id
  );
END;
$$;

COMMENT ON FUNCTION public.tick_run() IS
  'Task 033(45일차) — 어드바이저리 락 + 5분 타임아웃 + 원자적 Fixture 클레임(멱등성 게이트) + 1회 처리 상한(CRON_PARAM.CATCHUP_MAX_PER_RUN: 30) + 지수 백오프 재시도(CRON_PARAM.RETRY_MAX: 3) + 밀린 라운드 catch-up 판정(cron_run.is_catch_up) + 크론 중단 구간 감지(CRON_PARAM.GAP_DETECT_MULTIPLIER: 3, 마지막 성공 실행 대비 초과 시 cron_gap 기록 + RAISE WARNING, R-08/FR-AD-020). 스코어는 2팀 엔진 미연동 STUB.';
