// Task 033 — tick 크론 골격 + 어드바이저리 락(41일차, 6팀 DB·인프라팀)
//
// 40일차 팀 일정표 행("supabase/functions/tick/ 골격 배포 성공")은 실제로는 6팀이
// 40일차에 소환되지 않아 미착수 상태였다(40Day.md: "미참여: 1팀·6팀" / git 이력에
// supabase/functions 커밋 0건 / list_edge_functions에 tick 없음, v01-cpu-bench-37d만
// 존재 — 41일차 착수 전 확인). 이 파일은 41일차에 골격과 어드바이저리 락을 함께 만든다.
//
// 락 획득 → 5분 타임아웃 → (골격 단계: 킥오프 도래 Fixture 탐지만) → 해제는 전부
// DB 함수 tick_run() 하나의 트랜잭션 안에서 일어난다(자세한 이유는
// supabase/migrations/20260721100204_tick_advisory_lock.sql 상단 주석 참조 — 요약:
// PostgREST RPC 한 번 = 트랜잭션 한 번이므로 pg_try_advisory_xact_lock을 그 안에서
// 쓰면 락 획득·해제가 두 개의 별도 요청으로 쪼개지지 않아 커넥션 재사용 환경에서도
// 안전하다). 이 index.ts는 그 RPC를 호출하는 얇은 HTTP 래퍼일 뿐이다.
//
// 락 실패(동시 실행 중인 다른 tick 존재)는 에러가 아니라 no-op이다 — tick_run()이
// { locked: false, status: 'NOOP' }를 반환하며, 이 핸들러는 이를 HTTP 200으로
// 그대로 응답한다(호출자인 pg_cron 등 입장에서 "실패"가 아니라 "이번 틱 건너뜀").
//
// 실제 경기 시뮬레이션·후처리(2팀 sim 엔진 연동)는 이 골격에 아직 없다 — tick_run()
// 안의 TODO 주석 참조.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      // 인프라 설정 누락 — 락 실패(no-op)와는 다른 오류이므로 500으로 구분한다.
      console.error("tick: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      return new Response(
        JSON.stringify({ ok: false, error: "missing_env" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc("tick_run");

    if (error) {
      console.error("tick: tick_run rpc error", error);
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // data.locked === false → 락 실패, no-op. 에러가 아니므로 200으로 정상 종료.
    return new Response(
      JSON.stringify({ ok: true, ...data }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("tick: unexpected error", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
