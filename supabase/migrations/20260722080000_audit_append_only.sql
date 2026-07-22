-- 58일차 (2026-10-08) — Task 038 (56~59일차 RLS 액터 세분화 시리즈): 감사 테이블
-- (`audit_log`, `common_code_history`) append-only 강제.
-- 담당: 6팀 DB·인프라팀 / 근거: docs/db/schema-design.md §6.3.1(1195~1227행) —
-- 12일차에 이미 설계돼 있던 것을 오늘 처음 실제 마이그레이션으로 적용한다
-- (§6.3.3 자기검증 표가 "설계 완료" 2/2로 표시해 뒀을 뿐 `CREATE POLICY`/`CREATE
-- TRIGGER`는 두 테이블 다 지금까지 0건이었다 — 14일차 테이블 생성 마이그레이션에는
-- 포함되지 않았고, 18일차 공개 읽기 RLS 1차 범위(A/B그룹 33개)에도 이 2종은
-- "append-only 강제"라는 별도 처리라 빠져 있었다).
--
-- "베팅 감사"(오늘 작업표 문구)는 별도 테이블이 아니다 — schema-design.md §6.3.2
-- (1280행) "`audit_log` / 베팅 감사"가 명시하듯 배팅 관련 감사 항목도 `audit_log`
-- 한 테이블에 같이 쌓인다(`actor_type IN (..., 'ODDS','SETTLEMENT')`가 이미 그
-- 액터들을 포괄). 그래서 이 마이그레이션은 `audit_log` 1개 + `common_code_history`
-- 1개, 총 2개 테이블만 다룬다.
--
-- 이중 방어(schema-design.md 1210~1212행 근거 — service_role은 PostgREST RLS를
-- 우회하므로 정책만으로는 "RLS로 강제"라는 표현이 엄밀하지 않다):
--   1) RLS: SELECT/INSERT 정책만 부여, UPDATE/DELETE 정책은 아예 만들지 않는다
--      (정책 부재 자체가 PostgREST 경유 요청의 1차 차단선).
--   2) 트리거: BEFORE UPDATE OR DELETE에서 예외를 던져 역할과 무관하게
--      (service_role의 direct SQL 경로 포함) UPDATE/DELETE를 거부한다 — 진짜
--      강제 수단.
--
-- I-269 준수: apply_migration 호출 없음(원격 DDL 0건, 로컬 파일만 작성).

ALTER TABLE public.common_code_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY common_code_history_service_role_select ON public.common_code_history
  FOR SELECT USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY common_code_history_service_role_insert ON public.common_code_history
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_service_role_select ON public.audit_log
  FOR SELECT USING ((SELECT auth.role()) = 'service_role');
CREATE POLICY audit_log_service_role_insert ON public.audit_log
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE OR REPLACE FUNCTION public.reject_update_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only table: UPDATE/DELETE not allowed (NFR-SEC-010)';
END;
$$;

CREATE TRIGGER common_code_history_append_only
  BEFORE UPDATE OR DELETE ON public.common_code_history
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_delete();

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.reject_update_delete();
