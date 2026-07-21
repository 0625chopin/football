import Link from "next/link";
import { cookies } from "next/headers";

import { Button } from "@/components/ui/button";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from "@/i18n/locales";

/**
 * Task 013C(36일차, 4팀) — 라우트 not-found 폴백의 공용 껍데기.
 *
 * 생성 배경과 로케일 쿠키 근사의 한계는 `RouteLoading`의 파일 주석이 단일 소스다(같은
 * 이유·같은 방식).
 *
 * ## 홈으로 가는 길을 준다
 * 종전에는 제목 + 설명 두 줄이 전부라 **막다른 길**이었다 — 모바일에서는 사이드바도
 * 없어(36일차부터는 가로 레일이 있지만) 사용자가 되돌아갈 수단이 화면에 없었다. 빈 화면은
 * 상태 보고가 아니라 다음 행동의 초대여야 하므로, 홈으로 가는 버튼을 함께 낸다.
 * 링크 경로에 필요한 로케일은 위 쿠키 근사로 얻는다(틀려도 `proxy.ts`가 정규화하므로
 * 최악의 경우에도 기본 로케일 홈으로 간다).
 */
export async function RouteNotFound() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = rawLocale && isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-start gap-3 px-4 py-16 md:px-6">
      {/* 상태 코드는 라벨이지 문장이 아니다 — 눈썹 크기로 두고 제목에 무게를 준다. */}
      <span className="eyebrow text-muted-foreground">404</span>
      <h1 className="text-2xl">{t(locale, "error.notFound.title")}</h1>
      <p className="text-sm text-muted-foreground">{t(locale, "error.notFound.description")}</p>
      <Button asChild size="lg" className="mt-2">
        <Link href={`/${locale}`}>{t(locale, "common.nav.home")}</Link>
      </Button>
    </div>
  );
}
