"use client";

import { usePathname, useRouter } from "next/navigation";
import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/locales";
import { useLocale, useTranslation } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/keys";

/**
 * Task 011(22일차) — 로케일 스위처. `src/components/` 아래 첫 파일이다(4팀 소유 경로는
 * 23일차 이후 본격 사용 예정이었으나, 이 컴포넌트는 ROADMAP Task 011 산출물로 오늘
 * 앞당겨 생성됐다 — `docs/team-schedule/04-UI기반i18n팀.md` 소유 경로 절 확인, 남은
 * `domain/`·`state/`·13종 프리미티브는 여전히 23일차 이후).
 *
 * 라우팅은 경로 세그먼트가 단일 소스(`/ko/...`, `/en/...`)이므로 전환은 곧 내비게이션이다
 * — 현재 경로의 첫 세그먼트만 교체해 같은 화면의 다른 로케일로 이동한다. `router.replace`를
 * 쓰는 이유: 로케일 전환은 설정 토글에 가까워 뒤로가기 스택에 별도 항목을 남기지 않는다.
 *
 * 쿠키(`LOCALE_COOKIE_NAME`, `src/i18n/locales.ts`)는 이 전환의 부수효과로만 쓰인다 —
 * 오늘은 어떤 서버 코드도 이 쿠키를 읽지 않는다(`loading.tsx`/`not-found.tsx`는
 * DEFAULT_LOCALE 고정, `src/i18n/README.md` §4 참고). 향후 그 파일들이 쿠키를 읽게 될
 * 때를 대비한 선행 배선이다.
 */

const LOCALE_OPTION_LABEL_KEY: Record<SupportedLocale, TranslationKey> = {
  ko: "common.header.localeSwitcherOptionKo",
  en: "common.header.localeSwitcherOptionEn",
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

// 컴포넌트 바깥의 최상위 함수로 뺀 이유: react-compiler eslint 플러그인의
// `react-hooks/immutability`가 렌더 함수 안에 중첩된 함수에서 `document.cookie` 같은
// 외부 전역 mutation을 보면 "렌더 스코프 밖 변수를 수정"으로 오탐한다(이벤트 핸들러
// 안에서만 실행되는 부수효과라는 걸 정적 분석이 못 본다) — 클로저 자체를 없애 회피.
function persistLocaleCookie(nextLocale: SupportedLocale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
}

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  function handleSelect(nextLocale: SupportedLocale) {
    if (nextLocale === locale) return;

    persistLocaleCookie(nextLocale);

    const segments = pathname.split("/");
    // segments[0]은 선행 "/"로 인한 빈 문자열, segments[1]이 현재 lang 세그먼트다
    // (`[lang]/layout.tsx`의 `LocaleGate`가 이미 유효한 세그먼트만 여기까지 통과시킨다).
    segments[1] = nextLocale;
    router.replace(segments.join("/"));
  }

  return (
    // 36일차 — 두 개의 낱개 버튼에서 세그먼티드 컨트롤로. 색은 `currentColor` 파생
    // (`border-current/25` 등)만 쓴다 — 이 스위처는 어두운 헤더(`board`)와 밝은 본문
    // 양쪽에 놓일 수 있어 `foreground` 토큰을 직접 참조하면 한쪽에서 보이지 않는다.
    // 선택 상태는 색(브랜드 호박색) 외에 `aria-pressed`와 굵기로도 함께 전달한다.
    <div
      role="group"
      aria-label={t("common.header.localeSwitcherLabel")}
      className="inline-flex items-center gap-0.5 rounded-md border border-current/20 p-0.5"
    >
      {SUPPORTED_LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === locale}
          onClick={() => handleSelect(option)}
          className={`rounded-sm px-2 py-0.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-current/40 focus-visible:outline-none ${
            option === locale
              ? "bg-primary font-semibold text-primary-foreground"
              : "opacity-60 hover:opacity-100"
          }`}
        >
          {t(LOCALE_OPTION_LABEL_KEY[option])}
        </button>
      ))}
    </div>
  );
}
