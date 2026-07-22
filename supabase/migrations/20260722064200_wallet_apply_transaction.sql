-- 53일차 (2026-10-01) — Task 037: 지갑 차감·증액 DB 트랜잭션 + 낙관적 잠금 (이중 지출 방지)
--
-- wallet.lock_version은 DB 전용 CAS(compare-and-swap) 토큰이다 — 도메인 Wallet 타입
-- (src/types/betting.ts E-39)은 8일차 동결이라 필드 추가가 불가능하고, mapper.ts의
-- mapWalletRow()도 이 컬럼을 매핑하지 않는다(userId/balance/currency만 노출).
--
-- wallet_apply_transaction() 한 번의 RPC 호출 = 한 번의 Postgres 트랜잭션이다
-- (tick_run() 41일차 선례와 동일 근거 — supabase/migrations/20260721100204_tick_advisory_lock.sql
-- 상단 주석 참조: PostgREST RPC는 트랜잭션 경계와 1:1이라 별도 BEGIN/COMMIT이 불필요).
-- 그 트랜잭션 안에서 "현재 balance/lock_version 읽기 → UPDATE ... WHERE lock_version = 읽은 값"을
-- 반복하는 낙관적 잠금 루프를 돈다. 동시에 같은 지갑을 갱신하려는 다른 트랜잭션이 먼저
-- 커밋하면 UPDATE의 WHERE 절이 재평가되어 영향받은 행 0건 → 버전 충돌로 판단해 재시도한다
-- (Postgres 기본 READ COMMITTED에서 UPDATE는 실행 시점의 최신 커밋 상태를 재확인한다).
--
-- 잔액 부족(WALLET_INSUFFICIENT_BALANCE)과 락 경합 소진(WALLET_LOCK_CONTENTION)을
-- 별도 SQLSTATE로 구분해, 호출자(Edge Function)가 사용자 오류(400류)와 인프라 오류를
-- 다르게 처리할 수 있게 한다.
--
-- ⚠️ 이 버전은 RETURNS TABLE 출력 컬럼명(balance/lock_version)이 PL/pgSQL 변수로도
-- 존재해 "column reference is ambiguous" 오류로 배포 직후 실패했다 — 100건 동시 테스트
-- 전 발견했고, 수정은 바로 다음 마이그레이션(20260722064414_wallet_apply_transaction_fix_ambiguous_column.sql)에서
-- CREATE OR REPLACE로 이뤄진다. 이 파일은 원격에 실제 적용된 SQL을 그대로 보존한다
-- (list_migrations 원격 채번값 = 파일명, 13일차 규칙).

ALTER TABLE public.wallet ADD COLUMN lock_version bigint NOT NULL DEFAULT 0;

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

    SELECT balance, lock_version INTO v_balance, v_version
    FROM public.wallet
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_balance + p_amount < 0 THEN
      RAISE EXCEPTION 'WALLET_INSUFFICIENT_BALANCE' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.wallet
    SET balance = v_balance + p_amount,
        lock_version = v_version + 1,
        updated_at = now()
    WHERE user_id = p_user_id AND lock_version = v_version
    RETURNING balance, lock_version INTO v_new_balance, v_new_version;

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

-- tick_run() 41일차 선례(20260721100722_tick_run_restrict_execute.sql)와 동일 이유 —
-- SECURITY DEFINER 함수는 기본 PUBLIC(anon·authenticated 포함) EXECUTE가 열려 있어
-- 클라이언트가 PostgREST RPC로 임의 금액을 직접 조작할 수 있게 된다. service_role
-- (Edge Function 전용)만 허용한다.
REVOKE EXECUTE ON FUNCTION public.wallet_apply_transaction(uuid, bigint, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_apply_transaction(uuid, bigint, text, uuid) TO service_role;
