-- ============================================================================
-- 42일차 (2026-09-16) — Task 033: tick_run() 멱등성 — 원자적 Fixture 클레임
-- 담당: 6팀 DB·인프라팀
--
-- ## 배경 — SP-3 계약서(RETURN_CONTRACT.md) 검토 후 설계
-- `src/lib/sim/postmatch/RETURN_CONTRACT.md`(2팀 H-15 산출, 39일차)를 오늘 처음
-- 6팀 관점으로 검토했다(39일차부터 3일 연속 미이행이던 항목). §3 "멱등성 보장 요약"의
-- 핵심 경고: `runPostMatchPipeline`/`advanceStandingRound` 등은 전부 순수 함수라 "동일
-- 입력 → 동일 출력"은 엔진 자체가 보장하지만, **"같은 라운드/경기를 실수로 두 번
-- 진행시키지 않는 것"은 호출자(6팀 크론) 책임**이라고 명시한다("previousStandings"를
-- 잘못 추적하면 이중 집계된다는 경고, 문서 142행). 즉 엔진은 재호출에 안전하지만,
-- "재호출해도 되는지"를 판단하는 게이트는 이 함수(tick_run)가 만들어야 한다.
--
-- ## 41일차까지의 상태와 이 변경의 범위
-- 41일차 골격은 킥오프 도래 Fixture를 SELECT count(*)로 "탐지"만 하고 상태를 바꾸지
-- 않았다. 어드바이저리 락(41일차)이 tick_run() 동시 실행 자체를 막아 주지만, "탐지"와
-- "상태 전이"가 분리돼 있으면 그 사이 어느 시점에 재시도·재배포·향후 43일차 이후의
-- 분할 처리 경로가 끼어들 때 같은 Fixture를 두 번 처리할 여지가 생긴다. 이번 변경은
-- **탐지와 클레임(상태 전이)을 조건부 UPDATE 하나로 합쳐**, "이미 처리된 Fixture는
-- 애초에 다시 대상 집합에 잡히지 않는다"를 SQL 문장 자체의 원자성으로 보장한다.
--
-- ## 왜 어드바이저리 락만으로 충분하지 않다고 보는가 (방어적 이중화)
-- 락은 "tick_run() 함수 호출 자체"의 동시 실행을 막을 뿐이다. 이번 변경의
-- `UPDATE ... WHERE status = 'SCHEDULED' ... RETURNING`은 그와 별개로 **행 단위
-- 멱등성**을 SQL 표준 동작(같은 행을 향한 동시 UPDATE는 첫 트랜잭션 커밋까지 후행
-- 트랜잭션이 블록되고, 커밋 후 WHERE 재평가에서 더 이상 매치되지 않음)만으로 보장한다.
-- 락 타임아웃 경계의 극단적 겹침이나, 43일차 이후 "1회 처리 상한"으로 호출 경로가
-- 늘어날 가능성에 대비해 두 계층을 모두 두었다 — 락이 실패해도(예: 향후 리팩터로
-- 락 스코프가 바뀌는 경우) 이 UPDATE 자체가 이중 클레임을 막는다.
--
-- ## FINISHED 재처리 시 스탯 이중 누적 0 — 오늘 증명하는 범위
-- 실제 도메인 스탯 테이블(player_match_stat/team_season_stat, 각 40~70개 NOT NULL
-- 비즈니스 컬럼)은 2팀 후처리 파이프라인(`runPostMatchPipeline`)의 실제 산출값을
-- 받아야 의미가 있는데, 그 연동은 아직 Edge Function 레이어에 배선되지 않았고(2팀
-- 의존, TODO 유지) 참조 데이터(팀·시즌 등록)도 아직 없다. 이 계층에 손으로 지어낸
-- 숫자를 채우는 것은 `pipeline.ts` 자신의 원칙("동작하는 척 하는 스텁을 만들지
-- 않는다", CONDITION_FATIGUE 등 3종 계약 처리 참조)과 어긋난다. 대신 오늘은 **그
-- 스탯 반영이 나중에 반드시 타야 할 게이트**(아래 UPDATE의 WHERE status='SCHEDULED')를
-- 만들고, 이 게이트가 FINISHED 재호출에 대해 0건을 반환함을 실측으로 증명한다
-- (검증: 동일 Fixture로 tick_run() 재호출 시 `fixtures_processed = 0`,
-- `fixture.simulated_at` 불변). 향후 스탯 반영 코드는 반드시 이 UPDATE의 RETURNING
-- 결과 집합 위에서만 동작해야 하며, FINISHED 상태를 다시 조회해 "처리 대상"을
-- 별도로 재구성하면 안 된다(그러면 이 게이트가 무력화된다) — 다음 소비자를 위한
-- 계약으로 남긴다.
--
-- ## home_score/away_score — 명시적 STUB (실제 스코어 아님)
-- `match_seed`에서 결정론적으로 파생한 placeholder(`match_seed % 4`,
-- `(match_seed / 4) % 4`)일 뿐, 2팀 엔진의 실제 시뮬레이션 결과가 아니다. 오늘의
-- 목적은 "클레임이 정확히 1회만 값을 쓴다"는 메커니즘 검증이지 스코어의 정확성이
-- 아니다. 이 이유로 **H-15(pg_cron 배선)는 이번 일차에 보류한다** — 아래 이슈 후보 참조.
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
    -- 42일차: 탐지 + 클레임을 조건부 UPDATE 하나로 통합(멱등성 게이트, 상단 주석 참조).
    -- WHERE status = 'SCHEDULED'가 유일한 대상 선정 기준이며, 이미 FINISHED인 행은
    -- 구조적으로 다시 잡히지 않는다.
    WITH claimed AS (
      UPDATE fixture
      SET status = 'FINISHED',
          simulated_at = clock_timestamp(),
          -- STUB: 2팀 엔진 연동 전 결정론적 placeholder (상단 주석 참조, 실제 스코어 아님)
          home_score = COALESCE(home_score, (match_seed % 4)::int),
          away_score = COALESCE(away_score, ((match_seed / 4) % 4)::int)
      WHERE status = 'SCHEDULED' AND kickoff_at <= now()
      RETURNING id
    )
    SELECT count(*) INTO v_fixtures FROM claimed;

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
  'Task 033(42일차) — 어드바이저리 락(트랜잭션 스코프) + 5분 타임아웃 + 원자적 Fixture 클레임(SCHEDULED→FINISHED 조건부 UPDATE, 멱등성 게이트). 락 실패는 NOOP. 스코어는 2팀 엔진 미연동 STUB. 실 스탯 반영은 이 클레임 결과 집합 위에서만 수행해야 함(TODO).';
