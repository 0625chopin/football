/**
 * 관리자 인가 판정 — **단일 소스**, 54일차 재수정(팀장 지시). 6팀 DB·인프라팀 소유
 * (`src/app/api/admin/**`, `docs/team-schedule/06-DB인프라팀.md` §1).
 *
 * ## 왜 이 파일이 새로 생겼는가
 * 처음 구현(같은 날 1차분)은 "쿠키 토큰 → `public.profile.role` 조회" 로직을 `src/proxy.ts`와
 * `src/app/api/admin/session/route.ts` 두 곳에 각각 복제해 뒀다. 팀장이 Next.js 16 공식
 * 문서(`node_modules/next/dist/docs/01-app/02-guides/data-security.md` L291·L339·L368)를
 * 근거로 지적한 결함은 이렇다 — **Server Action은 페이지/미들웨어 가드를 우회해 직접 POST로
 * 도달 가능**하고, "페이지 레벨 인증 체크는 그 안의 Server Action에 이어지지 않는다. 액션
 * 안에서 항상 재검증하라"가 원문이다. `src/app/[lang]/admin/actions.ts`(5팀 소유)의
 * `applySpeedMultiplier`/`toggleWorldPause`가 인가 검사 없는 쓰기 진입점이었으므로, 인가
 * 판정을 여기 한 곳으로 뽑아 5팀이 액션 안에서 그대로 재사용하게 한다.
 *
 * **이 파일의 export 시그니처는 5팀과 고정된 계약이다 — 바꾸지 말 것**(병렬 작업 중, 5팀이
 * `actions.ts`에서 `assertAdminSession()`을 그대로 import한다).
 *
 * ## `isAuthorizedAdminToken` — 순수 함수, `proxy.ts`(Node 런타임 Proxy)도 그대로 쓴다
 * 토큰만 받아 PostgREST(`public.profile`, RLS `profile_select_own` — `auth.uid() = id`인
 * 본인 행만 SELECT 허용, 52일차 기존 정책)에 1회 조회해 role을 확인한다. 토큰 서명·만료
 * 검증은 PostgREST/GoTrue가 대신 하므로 이 함수가 JWT 시크릿을 다루지 않는다(`.env.local`에
 * 애초에 없음 — anon publishable key만 있다). 판정 불가(토큰 없음·PostgREST 비정상·네트워크
 * 에러·env 미설정)는 전부 **fail-closed**(false)다.
 *
 * ## `assertAdminSession` — Server Action/Route Handler 전용, `next/headers` 동적 import
 * `next/headers`의 `cookies()`는 Server Component·Server Action·Route Handler의 요청
 * 스코프에서만 유효하다. 이 파일을 `proxy.ts`(Proxy/미들웨어 파일)도 import하므로, 최상단
 * 정적 `import`로 `next/headers`를 끌어들이면 실행되지도 않을 코드가 미들웨어 번들에까지
 * 섞여 들어간다 — 함수 본문 안에서 동적 `import()`로 지연시켜 `proxy.ts`가 이 심볼을 쓰지
 * 않는 한 그 모듈이 해석되지 않게 한다.
 */

export const ADMIN_SESSION_COOKIE = "admin_session_token";

interface ProfileRoleRow {
  readonly role?: string;
}

function resolveSupabaseConfig(): { readonly baseUrl: string; readonly apiKey: string } | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !apiKey) return null;
  return { baseUrl: supabaseUrl.replace(/\/$/, ""), apiKey };
}

/** 주어진 Supabase access token 소유자의 `profile.role`이 `ADMIN`인지 판정한다. 판정 불가한
 * 모든 경우(토큰 없음/PostgREST 비정상/네트워크 에러/env 미설정)는 false로 fail-closed. */
export async function isAuthorizedAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const config = resolveSupabaseConfig();
  if (!config) return false;

  try {
    const response = await fetch(`${config.baseUrl}/rest/v1/profile?select=role`, {
      headers: { apikey: config.apiKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const rows = (await response.json()) as readonly ProfileRoleRow[];
    // RLS `profile_select_own`이 `auth.uid() = id`만 반환하므로 행이 있으면 곧 "이 토큰의
    // 소유자"의 role이다 — 별도로 uid를 클라이언트에서 뽑아 비교할 필요가 없다.
    return rows.length === 1 && rows[0]?.role === "ADMIN";
  } catch {
    return false;
  }
}

/**
 * Server Action/Route Handler 안에서 현재 요청의 관리자 세션을 재검증한다. 비인가면 throw —
 * 페이지 레벨 가드(프록시)를 신뢰하지 않고 액션 스스로 다시 확인한다는 것이 이 함수의
 * 존재 이유다(파일 헤더 참조). 호출부(5팀 `actions.ts`)는 이 예외를 잡아 사용자에게 보여줄
 * 오류로 변환하거나 그대로 던져 Next.js 에러 바운더리에 맡길 수 있다 — 어느 쪽이든 실제
 * 쓰기(배속 변경·정지 토글)는 이 함수가 정상 반환한 뒤에만 실행돼야 한다.
 */
export async function assertAdminSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const token = store.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = await isAuthorizedAdminToken(token);
  if (!authorized) {
    throw new Error("[admin/auth] unauthorized: admin session required");
  }
}
