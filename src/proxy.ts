import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";

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
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
