-- 51일차 (2026-09-29) — Task 037 (+032 소급): Supabase Auth 도입 — 프로필·지갑 자동 생성
-- 담당: 6팀 DB·인프라팀
--
-- 배경: E-38 User / E-39 Wallet(src/types/betting.ts, 5일차 선정의)은 2차 릴리스 범위로
-- 테이블이 없었다(core_tables_phase1.sql 헤더 "제외 1) E-33~E-40" 참조). 51일차부터 2차
-- 착수 — auth.users(Supabase 관리)를 두고, 회원가입 트리거로 public.profile(E-38 User
-- 대응 — 테이블명은 `user`가 예약어라 회피)·public.wallet(E-39 Wallet 대응)을 자동 생성한다.
--
-- ⚠️ 이메일 인증(Confirm email) 활성화는 Auth 프로젝트 설정(Dashboard 또는 Management
-- API)이며 이 SQL 마이그레이션 범위 밖이다 — 현재 연결된 supabase MCP 툴셋에 해당 설정을
-- 변경하는 도구가 없어 이 자리에서 수행하지 못했다(수동 조치 필요, 완료 보고에 명시).
--
-- WalletTransaction(E-40, 원장)은 이번 스코프에 포함하지 않는다 — 타입 헤더가 "TOPUP
-- 관련 실제 흐름은 3차"라 명시하고, 이번 지시(51일차 팀 일정표)도 "프로필+지갑 자동
-- 생성"까지만 요구한다. 원장 테이블은 배팅 엔진 착수 시점에 별도로 연다.

CREATE TABLE public.profile (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet (
  user_id uuid PRIMARY KEY REFERENCES public.profile (id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'POINT' CHECK (currency = 'POINT'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_select_own ON public.profile
  FOR SELECT USING ((SELECT auth.uid()) = id);
CREATE POLICY profile_service_role_insert ON public.profile
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY profile_service_role_update ON public.profile
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY profile_service_role_delete ON public.profile
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY wallet_select_own ON public.wallet
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wallet_service_role_insert ON public.wallet
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY wallet_service_role_update ON public.wallet
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY wallet_service_role_delete ON public.wallet
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- 회원가입 자동 프로비저닝 — auth.users INSERT 트리거. SECURITY DEFINER로 실행돼
-- 위 서비스롤 전용 INSERT 정책을 우회한다(트리거 정의자가 관리자 권한이므로 RLS이
-- 적용되지 않음 — tick_run() 패턴과 동일한 이유).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profile (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.wallet (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
