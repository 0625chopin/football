import { cookies } from "next/headers";

import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from "@/i18n/locales";

/**
 * `/[lang]` 로딩 폴백 — Task 005(13일차) 골격, I-170(35일차, 4팀) 쿠키 근사 적용.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 * lang 파라미터를 받지 못하는 특수 파일이라(Next.js 16.2.10 기준 `unstable_rootParams`도
 * 제거되어 대안 없음) `locales.ts`가 22일차부터 예고해 둔 대로 `cookies()`로
 * `f4_locale`(로케일 스위처가 쓰는 쿠키)을 읽어 요청별 로케일을 근사한다.
 *
 * ⚠️ 완전한 해결책이 아니다 — 로케일 스위처를 한 번도 쓰지 않은 최초 방문자는 쿠키가
 * 없어 여전히 `DEFAULT_LOCALE`(ko)로 표시된다(I-170, 팀장 34일차 검증에서 근사의
 * 한계로 명시).
 */
export default async function Loading() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = rawLocale && isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <main aria-busy="true" className="p-4 text-sm text-foreground/60">
      {t(locale, "common.action.loading")}
    </main>
  );
}
