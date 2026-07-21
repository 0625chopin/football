-- ============================================================================
-- 41일차 (2026-09-15) — Task 033: tick 크론 어드바이저리 락 + 타임아웃 5분
-- 담당: 6팀 DB·인프라팀
--
-- ## 배경
-- 40일차 팀 일정표 행은 "supabase/functions/tick/ 골격 배포 성공"을 완료 판정으로
-- 적어 두었으나, 실제로는 6팀이 40일차에 소환되지 않아(40Day.md: "미참여: 1팀·6팀
-- (팀 일정표에 40일차 배정 행 없음)") 그 골격 자체가 만들어진 적이 없다(git 이력에
-- supabase/functions 커밋 0건, 원격 Edge Function 목록에 tick 없음 — list_edge_functions로
-- 확인, v01-cpu-bench-37d만 존재). 이 파일은 41일차 작업(어드바이저리 락)과 함께
-- 그 골격을 처음으로 만든다 — 팀장 보고 대상(아래 이슈 후보 참조).
--
-- ## 설계 — 락 스코프를 트랜잭션 하나로 고정한 이유
-- Edge Function은 supabase-js로 PostgREST RPC 한 번(`select tick_run()`)만 호출한다.
-- PostgREST의 RPC 호출은 각각 독립된 트랜잭션으로 실행되며, 커넥션 풀링(PgBouncer 등)
-- 환경에서는 물리 커넥션이 요청마다 재사용될 수 있다. 만약 락 획득(pg_try_advisory_lock)과
-- 해제(pg_advisory_unlock)를 별도의 두 RPC 호출로 나누면, 두 호출이 같은 세션에서
-- 실행된다는 보장이 없어 "다른 세션에서 언락 시도" 또는 "세션이 다음 요청에 재사용되며
-- 락이 새 요청 소유로 누수"되는 위험이 생긴다. 이를 피하기 위해 **락 획득 → 크론
-- 본작업 → (COMMIT 시 자동 해제)를 전부 tick_run() 함수 하나의 트랜잭션 안에 둔다**
-- (`pg_try_advisory_xact_lock` — 트랜잭션 종료 시 자동 해제, 명시적 unlock 불필요).
--
-- ## 타임아웃 5분
-- CRON_PARAM.LOCK_TIMEOUT_MIN(공통코드, 031a 시드 — 이 마이그레이션과 별도로 6팀이
-- 오늘 적재)을 조회해 `SET LOCAL statement_timeout`으로 반영한다. 아직 미적재/조회
-- 실패 시 하드코딩 5분(300000ms)으로 폴백한다(config/fallback.ts와 동일한 "공통코드
-- 우선, 없으면 안전한 하드코딩 폴백" 원칙 — NFR-CFG-006 계열).
--
-- ## 락 실패 = no-op (에러 아님)
-- pg_try_advisory_xact_lock이 false를 반환하면(동시 실행 중인 다른 tick 존재)
-- cron_run에 status='NOOP', lock_acquired=false 행만 남기고 정상 종료한다.
-- Edge Function(index.ts)도 이 경우 HTTP 200으로 응답한다 — 호출자(pg_cron 등)
-- 입장에서 "실패"가 아니라 "이번 틱은 건너뜀"으로 취급되어야 하기 때문이다.
--
-- ## 골격 범위 — 아직 하지 않는 것
-- 킥오프 도래 Fixture "탐지"까지만 이 함수가 하고, 실제 경기 시뮬레이션·후처리는
-- 2팀 시뮬 엔진(src/lib/sim/**) 연동이 아직 없어 TODO로 남긴다(fixtures_processed는
-- 탐지된 건수만 반영, 상태 전이는 없음). 캐치업(cron_gap) 로직도 이 골격의 범위 밖이다.
-- ============================================================================

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
  v_fixtures     int := 0;
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

  BEGIN
    -- TODO(Task 033 후속·2팀 연동 대기): 실제 경기 시뮬레이션·후처리.
    -- 골격 단계에서는 킥오프 도래 Fixture "탐지"만 수행한다.
    SELECT count(*) INTO v_fixtures
    FROM fixture
    WHERE status = 'SCHEDULED' AND kickoff_at <= now();

    v_status := 'SUCCESS';
    v_error_code := NULL;
    v_error_message := NULL;
  EXCEPTION WHEN OTHERS THEN
    v_status := 'FAILED';
    v_error_code := SQLSTATE;
    v_error_message := SQLERRM;
    v_fixtures := 0;
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
    'fixtures_processed', v_fixtures
  );
END;
$$;

COMMENT ON FUNCTION public.tick_run() IS
  'Task 033 골격(41일차) — 어드바이저리 락(트랜잭션 스코프) + 5분 타임아웃. 락 실패는 NOOP(no-op)로 정상 종료. 시뮬레이션·후처리는 2팀 엔진 연동 대기(TODO).';
