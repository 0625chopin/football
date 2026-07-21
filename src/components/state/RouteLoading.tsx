import { cookies } from "next/headers";

import { SkeletonBlock } from "@/components/state/SkeletonBlock";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isSupportedLocale } from "@/i18n/locales";

/**
 * Task 013C(36일차, 4팀) — 라우트 로딩 폴백의 공용 껍데기.
 *
 * ## 왜 만들었나
 * 13일차 Task 005가 만든 `loading.tsx` 20개는 주석 한 줄(라우트 경로)만 다른 완전 동일
 * 파일이었다. 디자인을 손보려면 20곳을 똑같이 고쳐야 했고, 실제로 35일차 I-170 수정
 * (아래 로케일 근사)이 루트 1개에만 적용되고 나머지 19개는 그대로 남는 일이 벌어졌다.
 * 공용 껍데기 하나로 모으면 그 종류의 표류가 구조적으로 불가능해진다.
 *
 * ## 로케일 — 쿠키 근사(I-170을 20개 라우트 전체로 확장)
 * `loading.tsx`는 `lang` 파라미터를 받지 못하는 특수 파일이다(Next.js 16.2.10 기준
 * `unstable_rootParams`도 제거되어 대안 없음). `locales.ts`가 22일차부터 예고해 둔 대로
 * `cookies()`로 `f4_locale`(로케일 스위처가 쓰는 쿠키)을 읽어 요청별 로케일을 근사한다.
 *
 * ⚠️ 완전한 해결책이 아니다 — 로케일 스위처를 한 번도 쓰지 않은 최초 방문자는 쿠키가
 * 없어 여전히 `DEFAULT_LOCALE`(ko)로 표시된다(I-170, 팀장 34일차 검증에서 근사의 한계로
 * 명시). 종전에는 이 근사가 루트 `[lang]/loading.tsx` 한 곳에만 있었고 나머지 19개는
 * `DEFAULT_LOCALE` 고정이라 `/en/*` 로딩이 항상 한국어였다 — 36일차에 여기로 통합하며
 * 20개 전부가 같은 근사를 쓰게 됐다.
 *
 * ## 표시 — 문구 한 줄에서 골격(skeleton)으로
 * 종전에는 "불러오는 중…" 텍스트 한 줄이 전부라, 로딩 중에 화면이 **비어 보였다가**
 * 내용이 통째로 나타나 레이아웃이 튀었다. 들어올 내용의 형태를 미리 잡아 두면 그 점프가
 * 줄고, 무엇이 오는 중인지도 읽힌다. 텍스트 문구는 지우지 않고 `sr-only`로 남겨
 * 스크린 리더에는 그대로 전달한다(`aria-busy`와 함께).
 */
export async function RouteLoading() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const locale = rawLocale && isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <div aria-busy="true" className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6">
      <span className="sr-only">{t(locale, "common.action.loading")}</span>
      {/* 섹션 머리 자리 */}
      <SkeletonBlock rows={1} rowClassName="h-3 w-32" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <SkeletonBlock key={index} rows={3} className="rounded-lg border border-border p-4" />
        ))}
      </div>
    </div>
  );
}
