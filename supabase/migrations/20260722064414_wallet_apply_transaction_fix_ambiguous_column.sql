-- 53일차 (2026-10-01) — wallet_apply_transaction() "column reference is ambiguous" 수정
--
-- 직전 마이그레이션(20260722064200_wallet_apply_transaction.sql) 배포 직후 실행하자마자
-- 42702 오류로 실패했다: RETURNS TABLE (balance bigint, lock_version bigint, ...)의 출력
-- 컬럼명이 public.wallet의 실제 컬럼명(balance, lock_version)과 같아 PL/pgSQL이
-- "테이블 컬럼인지 출력 변수인지" 판단하지 못한다. wallet 테이블에 w 별칭을 붙여
-- w.balance / w.lock_version으로 전부 명시해 해소한다. 100건 동시 요청 테스트는
-- 이 수정 버전에 대해서만 실행했다(6팀 53일차 완료 보고 참조 — 잔액 불일치 0건).

CREATE OR REPLACE FUNCTION public.wallet_apply_transaction(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_ref_bet_id uuid DEFAULT NULL
)
RETURNS TABLE (balance bigint, lock_version bigint, transaction_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version bigint;
  v_balance bigint;
  v_new_balance bigint;
  v_new_version bigint;
  v_tx_id uuid;
  v_attempt int := 0;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;

    SELECT w.balance, w.lock_version INTO v_balance, v_version
    FROM public.wallet w
    WHERE w.user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_balance + p_amount < 0 THEN
      RAISE EXCEPTION 'WALLET_INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.wallet w
    SET balance = v_balance + p_amount,
        lock_version = v_version + 1,
        updated_at = now()
    WHERE w.user_id = p_user_id AND w.lock_version = v_version
    RETURNING w.balance, w.lock_version INTO v_new_balance, v_new_version;

    EXIT WHEN FOUND;

    IF v_attempt >= 200 THEN
      RAISE EXCEPTION 'WALLET_LOCK_CONTENTION' USING ERRCODE = 'P0003';
    END IF;

    PERFORM pg_sleep(least(0.001 * random(), 0.005));
  END LOOP;

  INSERT INTO public.wallet_transaction (user_id, amount, reason, ref_bet_id, balance_after)
  VALUES (p_user_id, p_amount, p_reason, p_ref_bet_id, v_new_balance)
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_new_balance, v_new_version, v_tx_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_apply_transaction(uuid, bigint, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply_transaction(uuid, bigint, text, uuid) TO service_role;
