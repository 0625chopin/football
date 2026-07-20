"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { t, type TranslationParams } from "./t";
import type { TranslationKey } from "./keys";
import type { SupportedLocale } from "./locales";

// Task 011(18일차) — 로케일 컨텍스트/Provider.
//
// 서버 컴포넌트는 라우트 세그먼트에서 받은 `params.lang`으로 `t(lang, key)`를 직접
// 호출하면 되므로 이 Provider가 필요 없다(`t.ts` 상단 주석 참고). 이 Provider는
// **클라이언트 컴포넌트 트리** 전용이다 — 트리 깊숙한 곳의 클라이언트 리프 컴포넌트
// (예: 013A 도메인 표현 컴포넌트, 013B 복합 컴포넌트)까지 매 계층 `lang` prop을
// 드릴링하지 않도록 최상위 클라이언트 경계 한 번만 로케일을 Context로 흘려보낸다.
//
// 실제 트리 배선(루트 레이아웃에서 이 Provider로 감싸는 지점)은 로케일 스위처
// 배선과 함께 22일차(LocaleSwitcher.tsx)에서 한다 — 오늘은 API 확정까지가 스코프다
// (`docs/team-schedule/04-UI기반i18n팀.md` 18일차 표).

const LocaleContext = createContext<SupportedLocale | null>(null);

export function TranslationProvider({
  locale,
  children,
}: {
  locale: SupportedLocale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** 현재 로케일. `TranslationProvider` 하위가 아니면 배선 누락을 조용히 넘기지 않고 던진다. */
export function useLocale(): SupportedLocale {
  const locale = useContext(LocaleContext);
  if (locale === null) {
    throw new Error("useLocale()은 TranslationProvider 하위에서만 호출할 수 있습니다.");
  }
  return locale;
}

/** `t()`를 현재 컨텍스트 로케일에 바인딩한 번역 함수를 반환한다. */
export function useTranslation(): (key: TranslationKey, params?: TranslationParams) => string {
  const locale = useLocale();
  return useMemo(
    () => (key: TranslationKey, params?: TranslationParams) => t(locale, key, params),
    [locale],
  );
}
