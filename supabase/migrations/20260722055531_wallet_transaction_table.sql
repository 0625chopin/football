-- 52일차 (2026-09-30) — Task 037: WalletTransaction(E-40) 테이블 생성
-- 지갑 거래 원장. profile/wallet과 동일한 RLS 패턴(본인 SELECT + service_role 전체 쓰기,
-- 51일차 auth_profile_wallet_provisioning.sql 선례)을 따른다.
--
-- ref_bet_id: 도메인 WalletTransaction.refBetId(BetId | null)에 대응하나, E-36 Bet
-- 테이블이 아직 없어(배팅 엔진 2차 착수 전) FK 제약을 걸지 않는다 — bet 테이블 생성 시
-- 후속 마이그레이션으로 FK를 추가한다.
CREATE TABLE public.wallet_transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profile (id) ON DELETE CASCADE,
  amount bigint NOT NULL
    CHECK (amount >= -9007199254740991 AND amount <= 9007199254740991),
  reason text NOT NULL
    CHECK (reason IN ('BET_PLACE', 'BET_WIN', 'BET_VOID', 'TOPUP')),
  ref_bet_id uuid,
  balance_after bigint NOT NULL
    CHECK (balance_after >= -9007199254740991 AND balance_after <= 9007199254740991),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wallet_transaction_user_id_idx ON public.wallet_transaction (user_id);

ALTER TABLE public.wallet_transaction ENABLE ROW LEVEL SECURITY;

CREATE POLICY wallet_transaction_select_own ON public.wallet_transaction
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY wallet_transaction_service_role_insert ON public.wallet_transaction
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY wallet_transaction_service_role_update ON public.wallet_transaction
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY wallet_transaction_service_role_delete ON public.wallet_transaction
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');
