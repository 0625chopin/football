-- 41일차 — tick_run() get_advisors(security) 경고 해소
--
-- SECURITY DEFINER 함수는 기본적으로 PUBLIC(anon·authenticated 포함)에 EXECUTE 권한이
-- 열려 있어, get_advisors(security)가 "anon/authenticated가 PostgREST RPC
-- (/rest/v1/rpc/tick_run)로 직접 호출 가능"이라고 경고했다. tick_run()은 크론 전용
-- 내부 함수라 일반 클라이언트가 임의로 틱을 강제 실행할 수 있으면 안 된다.
-- service_role(Edge Function이 사용하는 역할)만 허용한다.
--
-- 검증: 적용 후 get_advisors(security) 재조회 — tick_run 관련 두 경고(anon/authenticated)
-- 모두 해소 확인. 이후 curl로 Edge Function(tick, service_role 키)이 여전히
-- 정상 동작함을 재확인.

REVOKE EXECUTE ON FUNCTION public.tick_run() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tick_run() TO service_role;
