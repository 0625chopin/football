import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { ADMIN_SESSION_COOKIE, isAuthorizedAdminToken } from "@/app/api/admin/auth";
import { isAdminConsoleEnabled } from "@/app/[lang]/admin/console-flag";

// 소유: 4팀 단독(35일차 명시, I-272 60일차 재확인). 54일차에 6팀 Task 037 산출물("미들웨어")이
// 이 파일에 인가 가드로 들어왔으나(아래 블록), 판정 로직 본체는 6팀 소유 `api/admin/auth.ts`로
// 뽑아냈고 여기 남은 건 "언제 그 판정을 요구하는가"뿐이다 — 파일 자체를 공동 소유로 바꾸지
// 않는다. 이유: 이 파일은 앱 전체의 단일 진입점(Next.js Proxy)이라 여러 팀이 동시에 손대면
// 9~22일차에 005/011을 합쳐 피했던 것과 같은 종류의 충돌이 재발한다(`docs/team-schedule/
// 04-UI기반i18n팀.md` §1 "005를 이 팀에 이관한 근거" 참조). 다른 팀이 이 파일에 로직을
// 추가해야 하면(이번처럼) 4팀과 조율해 반영하고, 판정 로직 본체는 각 팀 소유 파일에 두고
// 여기서는 import해서 쓰는 패턴을 유지한다(이 파일의 `admin/auth.ts`·`admin/console-flag.ts`
// import 두 건이 그 패턴의 실례).

// 54일차(Task 037, NFR-SEC-007) — `/admin/**` 인증+역할 확인 가드.
//
// ⚠️ 전제 정정: 팀 일정표는 "1차의 환경 플래그 보호를 대체"라고 지시했으나, 실제 코드에는
// 그런 플래그 보호가 **존재한 적이 없다**(`docs/wireframe/07-어드민-운영콘솔.md` W-45가
// "변수명·검증 위치 확정 필요"로 미결 남긴 채 방치 — NFR-SEC-007 문서상 설계일 뿐 구현되지
// 않았다). 즉 이 커밋 이전 `/admin/**`은 완전 무방비였다("대체"가 아니라 "신규 도입").
//
// 인증 스택은 2차 릴리스 항목이라 `@supabase/ssr` 등 세션 SDK는 설치하지 않는다(CLAUDE.md
// "아직 도입되지 않은 것"). 판정 로직 자체(쿠키 토큰 → `public.profile.role` PostgREST
// 조회, fail-closed)는 `src/app/api/admin/auth.ts`(같은 팀 소유)로 뽑아냈다 — 54일차 재수정,
// 팀장 지시. Next.js 16 공식 문서(`node_modules/next/dist/docs/01-app/02-guides/
// data-security.md` L291·L339·L368)가 "Server Action은 페이지/미들웨어 가드를 우회해 직접
// POST로 도달 가능하니 액션 안에서 자체 재검증하라"고 명시하는데, 처음 구현은 이 판정 로직을
// `proxy.ts`에만 가둬 둬서 `src/app/[lang]/admin/actions.ts`(5팀)의 Server Action이 가드
// 없이 노출돼 있었다. 이제 `proxy.ts`와 `actions.ts` 양쪽이 `admin/auth.ts`의 같은 함수를
// 불러 쓴다 — 판정 로직은 그 파일 한 곳만 남았고, 여기서는 "언제(admin 경로) 그 판정을
// 요구하는가"만 담당한다.
//
// 세션 쿠키를 **발급하는** 경로가 이 프로젝트에 전혀 없었다(로그인 UI·API 0건 실측 —
// 완료 보고 참조)는 것도 이번에 처음 확인됐다. 그 발급 경로를 `src/app/api/admin/session/
// route.ts`(이 팀 소유 `src/app/api/admin/**`)에 최소 구현으로 함께 추가했다 — 발급 경로
// 없이 검증 로직만 넣으면 "전환"이 아니라 "영구 차단"이 되어 이 Task의 취지(인가된 관리자는
// 통과)를 충족하지 못한다.

/** `/admin` 세그먼트가 로케일 유무와 무관하게 첫/둘째 세그먼트에 정확히 오는 경우만 관리자
 * 라우트로 판정한다(`/administrator` 같은 우연한 접두 일치를 피하기 위해 `startsWith`가
 * 아니라 세그먼트 단위 등가 비교를 쓴다). */
function isAdminRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) return false;
  if (segments[0] === "admin") return true;
  return segments.length >= 2 && isSupportedLocale(segments[0]) && segments[1] === "admin";
}

// 세그먼트 배치(`app/[lang]/**`)는 9일차 §7.4에서 이미 확정됐다. 여기서는 로케일 프리픽스가
// 없는 요청을 기본 로케일로 리다이렉트하는 로직만 담당한다 — `[lang]/layout.tsx`는 URL
// 세그먼트를 그대로 읽을 뿐 감지하지 않으므로, 프리픽스가 없으면 이 리다이렉트 없이는
// 어떤 라우트에도 도달할 수 없다.
//
// `matcher`는 설계상 일부 경로(`_next`·`api`·확장자 있는 파일)를 의도적으로 매치하지
// 않는다 — 그런 경로는 이 정규화를 거치지 않고 라우터에 직접 도달한다(`/admin` 배제
// 시도, 이어서 확장자 경로에서 재발한 결함 — 팀장 검증에서 2회 발견). 그래서 무효
// `lang` 렌더 차단은 여기서 끝내지 않고 `[lang]/layout.tsx`에서 `notFound()`로
// 2중 방어한다 — 이 프록시가 어떤 경로를 매치하든/안 하든 무효 렌더가 없어야 한다.
//
// Next.js 16부터 Proxy는 기본 Node.js 런타임이라(파일 하단 참조 없이도 `runtime` 설정이
// 필요 없다) `fetch` 기반 관리자 인증 검사를 이 함수 안에서 그대로 `await`할 수 있다.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminRoute(pathname)) {
    // I-287(60일차) — NFR-SEC-007 1차(환경 플래그)를 여기서도 봐야 한다. 이전엔 인증(2차)만
    // 검사해 플래그가 꺼져 있어도 미인증 요청에 403을 돌려줘, 그 자체로 "경로가 존재한다"는
    // 정보를 공격자에게 흘렸다. `isAdminConsoleEnabled()`(5팀 `console-flag.ts`, 59일차 도입 —
    // 여기서 재구현하지 않고 그대로 import)로 먼저 걸러 비활성이면 404로 응답한다(페이지/
    // Server Action의 `notFound()`/`assertAdminConsoleEnabled()`와 동일한 "비공개 경로" 취급).
    if (!isAdminConsoleEnabled()) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await isAuthorizedAdminToken(token))) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const [, firstSegment] = pathname.split("/");

  if (isSupportedLocale(firstSegment)) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: [
    {
      // `/admin`은 특별 취급하지 않는다 — `src/app/[lang]/admin`으로 이미 로케일 세그먼트
      // 하위에 있으므로 다른 라우트와 동일하게 리다이렉트 대상이어야 한다. `_next`·`api`·
      // 확장자 있는 정적 파일만 제외한다(`matcher.locale: false`는 App Router 구성에
      // 효과가 없어 사용하지 않음 — 14일차 §8.3(b) 확인 근거). 이 제외 목록에 걸리는
      // 경로의 무효 lang 렌더는 matcher가 아니라 layout의 `notFound()`가 막는다.
      source: "/((?!api|_next|.*\\..*).*)",
    },
  ],
};
