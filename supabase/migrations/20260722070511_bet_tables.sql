-- 57일차 (2026-10-07) — Task 038 (56~59일차 RLS 액터 세분화 시리즈): 배팅 테이블
-- (E-33~E-37) 신규 생성 + RLS. docs/db/schema-design.md §6.3.1 D그룹("2차 릴리스,
-- 오늘 정책 없음"으로 12일차에 미뤄뒀던 8개) 중 나머지 5개(bet_market~bet_leg) —
-- E-38~E-40(profile/wallet/wallet_transaction)은 51~52일차(Task 037)에 이미 처리됐다.
--
-- RLS 방침(작업표 57일차 행 "베팅·지갑은 user_id = auth.uid() 제한, 엔진 쓰기는
-- 서비스롤 전용", 수락 기준 "타 사용자 베팅 조회 차단"):
--   - bet_market / bet_selection / odds — 마켓·배당 데이터는 사용자 소유가 아니라
--     "공개 읽기 + 엔진(배당산출기) 서비스롤 쓰기" A그룹 패턴(§6.3.1)을 그대로 따른다.
--     user_id 컬럼 자체가 없어 auth.uid() 제한 대상이 아니다.
--   - bet / bet_leg — 베팅 슬립 본체. `bet`은 wallet_transaction과 동일 패턴
--     ((SELECT auth.uid()) = user_id), `bet_leg`는 복합키(betId+selectionId)라
--     user_id 컬럼이 없어 EXISTS 서브쿼리로 소유 bet을 통해 간접 판정한다.
--   - 전 테이블 쓰기는 service_role 전용 3분리 정책(INSERT/UPDATE/DELETE)으로 둔다 —
--     FOR ALL 대신 분리하는 이유는 profile/wallet 선례와 동일(원격 히스토리의
--     `split_service_role_write_policies_no_select_overlap`이 다룬 multiple_permissive_
--     policies 경고 회피, SELECT 정책과 겹치지 않게).
--
-- ⚠️ I-269 준수: 이 마이그레이션은 `apply_migration`을 호출하지 않았다(원격 DDL 0건,
-- 로컬 파일만 작성). 적용은 절차 정비 후로 미룬다. 이번 커밋이 `database.types.ts`
-- 재생성이나 `mapper.ts` 추가를 포함하지 않는 것도 같은 이유다 — 원격에 테이블이
-- 실제로 없는 상태에서 타입을 생성하면 허위 타입이 된다(`mapper.ts` 19~22행 헤더가
-- 이미 "테이블이 생기는 시점에 이어서 추가"라 명시해 뒀다 — 그 시점은 이 마이그레이션의
-- apply_migration 실행 이후다). 적용 시점에 반드시 재확인할 것: 아래 FK 추가 직전
-- `SELECT count(*) FROM wallet_transaction WHERE ref_bet_id IS NOT NULL` — 0이 아니면
-- 기존 값이 신규 bet.id와 정합하는지 먼저 확인(13일차 fixture.snapshot_id 금지선과 동일 이유).
--
-- FK 이월 처리: wallet_transaction.ref_bet_id(52일차, Task 037)는 "bet 테이블 생성 시
-- FK 추가" 예고를 남겼었다(wallet_transaction_table.sql 5~7행) — 이 마이그레이션
-- 말미에 함께 정의한다.

CREATE TABLE public.bet_market (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('MATCH', 'SEASON', 'TOURNAMENT')),
  -- market_type(FR-BT-002~004, 17종+)은 2차 배팅 엔진 설계 시점 구체화 대상이라
  -- betting.ts E-33 주석과 동일하게 CHECK 없는 자유 text로 둔다.
  market_type text NOT NULL,
  -- ref_type/ref_id: scope에 따라 fixture / season+league / competition을 가리키는
  -- 다형 참조(point_transaction.ref_type/ref_id 선례와 동일) — FK 없음.
  ref_type text NOT NULL,
  ref_id text NOT NULL,
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('OPEN', 'CLOSED', 'SETTLED', 'VOIDED')),
  overround numeric(6, 4) NOT NULL DEFAULT 1.0600,
  sim_count int NOT NULL CHECK (sim_count > 0),
  snapshot_id uuid NOT NULL REFERENCES public.sim_constant_snapshot (id)
);

CREATE TABLE public.bet_selection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id uuid NOT NULL REFERENCES public.bet_market (id) ON DELETE CASCADE,
  label text NOT NULL,
  outcome_key text NOT NULL,
  probability numeric(9, 6) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  result text NOT NULL
    CHECK (result IN ('PENDING', 'WIN', 'LOSE', 'VOID', 'HALF_WIN', 'HALF_LOSE'))
);

CREATE INDEX bet_selection_market_id_idx ON public.bet_selection (market_id);

CREATE TABLE public.odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id uuid NOT NULL REFERENCES public.bet_selection (id) ON DELETE CASCADE,
  decimal_odds numeric(6, 2) NOT NULL CHECK (decimal_odds >= 1.01 AND decimal_odds <= 500.00),
  computed_at timestamptz NOT NULL,
  is_current boolean NOT NULL DEFAULT true
);

CREATE INDEX odds_selection_id_idx ON public.odds (selection_id);

CREATE TABLE public.bet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profile (id) ON DELETE CASCADE,
  stake bigint NOT NULL CHECK (stake > 0 AND stake <= 9007199254740991),
  total_odds numeric(10, 2) NOT NULL CHECK (total_odds >= 1.01),
  potential_return bigint NOT NULL
    CHECK (potential_return >= 0 AND potential_return <= 9007199254740991),
  type text NOT NULL CHECK (type IN ('SINGLE', 'MULTI')),
  status text NOT NULL
    CHECK (status IN ('PENDING', 'WON', 'LOST', 'VOID', 'HALF_WON', 'HALF_LOST')),
  placed_at timestamptz NOT NULL,
  -- 정산 전 null(betting.ts E-36 주석)
  settled_at timestamptz,
  -- 제출 시점 배당 동결(jsonb) — 구체 스키마는 소비 시점 확정
  odds_snapshot jsonb NOT NULL,
  -- 서버 수신 시각(클라이언트 시계 미신뢰, C-23) + 사후 배팅 차단 증거(041)
  server_received_at timestamptz NOT NULL,
  ip_hash text NOT NULL
);

CREATE INDEX bet_user_id_idx ON public.bet (user_id);

CREATE TABLE public.bet_leg (
  bet_id uuid NOT NULL REFERENCES public.bet (id) ON DELETE CASCADE,
  selection_id uuid NOT NULL REFERENCES public.bet_selection (id),
  odds_at_placement numeric(6, 2) NOT NULL
    CHECK (odds_at_placement >= 1.01 AND odds_at_placement <= 500.00),
  result text NOT NULL
    CHECK (result IN ('PENDING', 'WIN', 'LOSE', 'VOID', 'HALF_WIN', 'HALF_LOSE')),
  PRIMARY KEY (bet_id, selection_id)
);

CREATE INDEX bet_leg_selection_id_idx ON public.bet_leg (selection_id);

-- FK 이월: wallet_transaction.ref_bet_id → bet(id) (52일차 예고, 이번에 이행)
ALTER TABLE public.wallet_transaction
  ADD CONSTRAINT wallet_transaction_ref_bet_id_fkey
  FOREIGN KEY (ref_bet_id) REFERENCES public.bet (id);

-- ── RLS: bet_market / bet_selection / odds — 공개 읽기 + service_role 쓰기 ──────
ALTER TABLE public.bet_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;

CREATE POLICY bet_market_public_select ON public.bet_market
  FOR SELECT USING (true);
CREATE POLICY bet_market_service_role_insert ON public.bet_market
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_market_service_role_update ON public.bet_market
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_market_service_role_delete ON public.bet_market
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY bet_selection_public_select ON public.bet_selection
  FOR SELECT USING (true);
CREATE POLICY bet_selection_service_role_insert ON public.bet_selection
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_selection_service_role_update ON public.bet_selection
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_selection_service_role_delete ON public.bet_selection
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY odds_public_select ON public.odds
  FOR SELECT USING (true);
CREATE POLICY odds_service_role_insert ON public.odds
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY odds_service_role_update ON public.odds
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY odds_service_role_delete ON public.odds
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- ── RLS: bet / bet_leg — 본인 소유만 SELECT + service_role 쓰기 ────────────────
-- (수락 기준 "타 사용자 베팅 조회 차단"의 근거 정책)
ALTER TABLE public.bet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bet_leg ENABLE ROW LEVEL SECURITY;

CREATE POLICY bet_select_own ON public.bet
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY bet_service_role_insert ON public.bet
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_service_role_update ON public.bet
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_service_role_delete ON public.bet
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- bet_leg는 user_id가 없어(복합키 betId+selectionId) 소유 bet을 통해 간접 판정한다.
CREATE POLICY bet_leg_select_own ON public.bet_leg
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bet b
      WHERE b.id = bet_leg.bet_id AND b.user_id = (SELECT auth.uid())
    )
  );
CREATE POLICY bet_leg_service_role_insert ON public.bet_leg
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_leg_service_role_update ON public.bet_leg
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');
CREATE POLICY bet_leg_service_role_delete ON public.bet_leg
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');
