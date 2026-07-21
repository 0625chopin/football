"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { t } from "@/i18n/t";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/keys";
import { cn } from "@/lib/utils";

/**
 * Task 014(36일차, 4팀) — 쇼케이스 전용 "로케일 전환 컨트롤"(D-18, 수락 기준: 즉시 전환).
 *
 * ## 왜 헤더의 `LocaleSwitcher`로는 부족한가
 * 헤더 `LocaleSwitcher`(`src/components/ui/LocaleSwitcher.tsx`)는 라우트 세그먼트를 바꾸는
 * 내비게이션이다(`/ko/sample` ↔ `/en/sample`, `router.replace`). 이 페이지는 서버 컴포넌트가
 * `getDataSource()`로 여러 어댑터 호출을 수행한 뒤 렌더하므로, 라우트 전환마다 서버 재실행 +
 * 새 RSC 페이로드 왕복이 있다 — "다른 페이지로 이동"이지 "이 자리에서 즉시 비교"가 아니다.
 *
 * ## 설계: 서버가 두 로케일을 모두 미리 렌더 → 클라이언트는 조건부 마운트만
 * `page.tsx`가 이미 조회해 둔 동일 데이터로 `renderShowcaseBody("ko")`/`("en")`를 모두 호출해
 * 두 개의 완성된 `ReactNode` 트리를 이 컴포넌트에 prop으로 넘긴다. 여기서는 재조회도 라우트
 * 이동도 없이 `activeLocale` 클라이언트 상태만 바꿔 둘 중 하나를 마운트한다 — 동기적 상태
 * 갱신이라 체감 지연이 없다.
 *
 * **두 트리를 CSS(`hidden`)로만 숨기고 둘 다 항상 DOM에 두는 방식은 택하지 않았다.**
 * `ShowcaseSection`이 카테고리마다 고정 `id`(`#domain` 등)를 쓰는 앵커 내비 대상이라, 두
 * 로케일 트리를 동시에 마운트하면 `id`가 중복돼(무효 HTML) 브라우저가 앵커 이동 시 숨겨진
 * 사본을 가리킬 수 있다. 조건부 마운트는 항상 한쪽만 DOM에 존재해 이 문제가 없다 — 전환 시
 * 마운트가 바뀌어 `StateToggleSlot`/`ViewportFrame`의 내부 토글 상태가 초기화되지만, 애초에
 * 그 두 컴포넌트도 각자 독립적인 미리보기 도구라 로케일 전환이 그 선택을 보존해야 할 이유가
 * 없다(오히려 초기화가 "새로 시작하는 비교"에 더 맞다).
 */

export interface LocaleCompareToggleProps {
  /** URL 세그먼트가 가리키는 초기 로케일. 이 값 자체가 진실 소스는 아니고 첫 렌더의 시작점일 뿐이다. */
  readonly locale: SupportedLocale;
  readonly ko: ReactNode;
  readonly en: ReactNode;
}

const OPTION_LABEL_KEY: Record<SupportedLocale, TranslationKey> = {
  ko: "common.header.localeSwitcherOptionKo",
  en: "common.header.localeSwitcherOptionEn",
};

export function LocaleCompareToggle({ locale, ko, en }: LocaleCompareToggleProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(locale);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3">
        <div
          role="group"
          aria-label={t(activeLocale, "sample.locale.toggleLabel")}
          className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5"
        >
          {SUPPORTED_LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === activeLocale}
              onClick={() => setActiveLocale(option)}
              className={cn(
                "rounded-sm px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                option === activeLocale
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {t(activeLocale, OPTION_LABEL_KEY[option])}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t(activeLocale, "sample.locale.hint")}</p>
      </div>

      {activeLocale === "ko" ? ko : en}
    </div>
  );
}
