// Task 037 — 지갑 차감·증액 (53일차, 6팀 DB·인프라팀)
//
// tick(41일차, supabase/functions/tick/index.ts) 선례와 동일한 얇은 HTTP 래퍼다 —
// 트랜잭션·낙관적 잠금·재시도 루프는 전부 DB 함수 wallet_apply_transaction() 하나의
// 트랜잭션 안에서 일어난다(supabase/migrations/20260722064200_wallet_apply_transaction.sql
// 상단 주석 참조). 이 파일은 요청을 검증하고 그 RPC를 호출해 응답을 돌려줄 뿐이다.
//
// 요청 바디: { userId: string, amount: number, reason: 'BET_PLACE'|'BET_WIN'|'BET_VOID'|'TOPUP', refBetId?: string }
// amount는 차감이면 음수, 증액이면 양수(원장 wallet_transaction.amount와 동일 부호 규약).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const REASONS = new Set(["BET_PLACE", "BET_WIN", "BET_VOID", "TOPUP"]);

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("wallet: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      return new Response(
        JSON.stringify({ ok: false, error: "missing_env" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    let body: { userId?: string; amount?: number; reason?: string; refBetId?: string | null };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_json" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { userId, amount, reason, refBetId } = body;

    if (
      typeof userId !== "string" ||
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount === 0 ||
      typeof reason !== "string" ||
      !REASONS.has(reason)
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "invalid_request" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc("wallet_apply_transaction", {
      p_user_id: userId,
      p_amount: amount,
      p_reason: reason,
      p_ref_bet_id: refBetId ?? null,
    });

    if (error) {
      const status = error.code === "P0001" ? 409 : error.code === "P0002" ? 404 : error.code === "P0003" ? 503 : 500;
      console.error("wallet: wallet_apply_transaction rpc error", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status, headers: { "Content-Type": "application/json" } },
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    return new Response(
      JSON.stringify({ ok: true, balance: row.balance, transactionId: row.transaction_id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("wallet: unexpected error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
