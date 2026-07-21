-- 48일차(2026-09-24) — Task 033, 6팀 DB·인프라팀
-- 크론 주기(CRON_PARAM.INTERVAL_MIN)가 최소 라운드 간격(ROUND_INTERVAL_MIN 최솟값, 기본
-- 75분/LEAGUE_1)의 약수인지 저장 전 검증. 그룹 간(행 간) 관계라 단일 CHECK로 못 해
-- `check_common_code_json_required`와 동일 패턴의 BEFORE INSERT/UPDATE 트리거로 구현한다.
-- world_id 스코프별(전역 NULL vs 월드 오버라이드)로 값이 갈릴 수 있어(common_code_override_uq)
-- 같은 스코프끼리만 비교한다.
CREATE OR REPLACE FUNCTION public.check_cron_interval_divisor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  cron_interval numeric;
  min_round_interval numeric;
BEGIN
  IF NEW.group_code = 'CRON_PARAM' AND NEW.code = 'INTERVAL_MIN' THEN
    cron_interval := NEW.value_num;
    SELECT MIN(value_num) INTO min_round_interval
      FROM common_code
      WHERE group_code = 'ROUND_INTERVAL_MIN'
        AND world_id IS NOT DISTINCT FROM NEW.world_id;
  ELSIF NEW.group_code = 'ROUND_INTERVAL_MIN' THEN
    SELECT value_num INTO cron_interval
      FROM common_code
      WHERE group_code = 'CRON_PARAM' AND code = 'INTERVAL_MIN'
        AND world_id IS NOT DISTINCT FROM NEW.world_id;
    -- LEAST(x, NULL) = x in Postgres (NULL만 무시), 다른 리그 행이 없어도 NEW.value_num으로 귀결
    SELECT LEAST(NEW.value_num, MIN(value_num)) INTO min_round_interval
      FROM common_code
      WHERE group_code = 'ROUND_INTERVAL_MIN'
        AND world_id IS NOT DISTINCT FROM NEW.world_id
        AND code <> NEW.code;
  ELSE
    RETURN NEW;
  END IF;

  IF cron_interval IS NOT NULL AND min_round_interval IS NOT NULL
     AND MOD(min_round_interval, cron_interval) <> 0 THEN
    RAISE EXCEPTION
      'cron interval %(CRON_PARAM.INTERVAL_MIN) is not a divisor of minimum round interval %(ROUND_INTERVAL_MIN)',
      cron_interval, min_round_interval;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_common_code_cron_interval_divisor
BEFORE INSERT OR UPDATE ON common_code
FOR EACH ROW EXECUTE FUNCTION check_cron_interval_divisor();
