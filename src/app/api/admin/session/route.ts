/**
 * 관리자 세션 발급/해제 — **54일차(2026-10-02), Task 037**, 6팀 DB·인프라팀 소유
 * (`src/app/api/admin/**`, `docs/team-schedule/06-DB인프라팀.md` §1)
 *
 * ## 이 파일이 필요해진 이유
 * `src/proxy.ts`가 `/admin/**`을 "쿠키의 Supabase access token → `public.profile.role`
 * 조회"로 가드하도록 바뀌었는데(같은 커밋), 그 쿠키를 **발급하는** 경로가 이 프로젝트에
 * 전혀 없었다(로그인 UI·API 0건 — `signIn`/`signUp`/`gotrue`/`access_token` 전체 리포
 * 검색 실측, 54일차). 발급 경로 없이 검증만 넣으면 관리자도 영원히 못 들어오는
 * "영구 차단"이 되어 NFR-SEC-007의 "인증 + 역할 확인으로 **전환**"이 아니라 그냥
 * 새로운 형태의 잠금이 된다. 그래서 최소 로그인/로그아웃 API를 여기 함께 둔다.
 *
 * ## 왜 `@supabase/ssr`/`@supabase/supabase-js`를 쓰지 않는가
 * 두 패키지 모두 미설치이고(CLAUDE.md "아직 도입되지 않은 것"), 인증은 2차 릴리스라
 * 새 런타임 의존성을 들이는 결정은 이 Task의 범위를 넘는다. GoTrue(Supabase Auth)
 * 비밀번호 로그인과 PostgREST 조회는 전부 공개 REST 엔드포인트라 `fetch`만으로
 * 충분하다 — `src/lib/data/supabase/client.ts`가 이미 같은 패턴(PostgREST를 REST
 * 브리지로 직접 호출)을 22일차부터 써 왔다. 다만 그 파일의 `createSupabaseRestQueryClient`는
 * `Authorization` 헤더를 프로젝트 API 키로 고정해 두므로(익명 읽기 전용 계약) 로그인한
 * 사용자 본인의 access token을 `Authorization`으로 실어야 하는 이 라우트에는 그대로
 * 재사용할 수 없다 — 별도 최소 fetch 호출로 둔다.
 *
 * ## 신뢰 경계 — role을 클라이언트가 아니라 서버가 매 요청 재확인
 * 로그인 성공 시 role을 쿠키에 평문으로 박아두면 클라이언트가 위조할 수 있으므로,
 * 쿠키에는 Supabase가 서명한 access token만 담는다. role 판정은 `src/app/api/admin/
 * auth.ts`의 `isAuthorizedAdminToken`(단일 소스, 54일차 재수정)을 그대로 불러 쓴다 —
 * 이 라우트(로그인 시 1회)와 `src/proxy.ts`(라우트 진입마다)와
 * `src/app/[lang]/admin/actions.ts`(Server Action 호출마다, 5팀)가 전부 같은 함수를
 * 호출해 판정 로직이 세 곳에서 표류하지 않는다.
 *
 * ## 알려진 한계 (다음 작업으로 이월)
 * - refresh token 회전을 구현하지 않았다 — access token 만료(`expires_in`, 기본 1시간)
 *   후에는 재로그인이 필요하다. 55일차 로그인 검증 시 세션 유지 시간이 이 값에 묶인다.
 * - 이메일 인증(Confirm email) 활성화 여부에 따라 미인증 계정은 GoTrue가 로그인 자체를
 *   거부할 수 있다(51일차 마이그레이션 헤더에 이미 "Dashboard 수동 조치 필요"로 기록됨,
 *   이 라우트가 새로 만든 제약이 아니다).
 *
 * ## 레이트 리밋 — 59일차, 어드민 로그인 무차별 대입 방어(IP당)
 * 이 라우트는 NFR-SEC-009의 "공개 API" 버킷 대상이 아니다(팀장 재수정 지시, 59일차 —
 * 인증 엔드포인트이지 공개 조회 API가 아님). 실제 NFR-SEC-009 "공개 API IP당 분당
 * 300건" 버킷은 5팀 소유 `src/app/api/live/**`(`src/app/api/live/rate-limiter.ts`)가
 * 담당한다. 여기 리미터는 별도 목적(자격증명 무차별 대입 방어)이라 값은 같은
 * `PUBLIC_RATE_LIMIT` 프리셋(300/분)을 재사용하되 **키 공간은 분리된 인스턴스**로
 * 완전히 독립돼 있다(`./rate-limiter.ts`, `api/live`의 것과 서로의 카운트에 영향
 * 없음). `src/lib/data/supabase/rate-limit.ts`(6팀 공용 리미터)를 그대로 쓴다 — 새
 * 로직을 여기서 재구현하지 않는다. 리미터 싱글턴은 `./rate-limiter.ts`로 분리했다 —
 * Route Handler 파일은 `GET`/`POST`/`dynamic` 등 정해진 심볼만 export할 수 있어
 * (`.next/dev/types` 라우트 타입 검사, `TS2344`), 여기서 추가로 export하면 안 된다.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, isAuthorizedAdminToken } from "@/app/api/admin/auth";
import { getClientIp } from "@/lib/data/supabase/rate-limit";
import { adminSessionRateLimiter } from "./rate-limiter";

interface SupabaseTokenResponse {
  readonly access_token?: string;
  readonly expires_in?: number;
}

function resolveSupabaseConfig(): { readonly baseUrl: string; readonly apiKey: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !apiKey) return null;
  return { baseUrl: supabaseUrl.replace(/\/$/, ""), apiKey };
}

/** 이메일/비밀번호로 로그인하고, `profile.role === 'ADMIN'`일 때만 세션 쿠키를 발급한다. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rateLimit = adminSessionRateLimiter.check(getClientIp(request.headers), Date.now());
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
    );
  }

  const config = resolveSupabaseConfig();
  if (!config) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (typeof parsed !== "object" || parsed === null) {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const { email, password } = parsed as { readonly email?: unknown; readonly password?: unknown };
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const tokenResponse = await fetch(`${config.baseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }
  const tokenBody = (await tokenResponse.json()) as SupabaseTokenResponse;
  const accessToken = tokenBody.access_token;
  if (!accessToken) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  if (!(await isAuthorizedAdminToken(accessToken))) {
    return NextResponse.json({ error: "not_admin" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, accessToken, {
    httpOnly: true,
    // 로컬 http(WSL dev 서버, I-62 계열)에서도 쿠키가 붙어야 하므로 프로덕션에서만 Secure.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: typeof tokenBody.expires_in === "number" ? tokenBody.expires_in : 3600,
  });
  return response;
}

/** 관리자 세션 쿠키를 지운다(로그아웃). GoTrue 쪽 refresh token 폐기는 하지 않는다(발급하지
 * 않았으므로 폐기할 것도 없다 — 위 "알려진 한계" 참조). */
export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
