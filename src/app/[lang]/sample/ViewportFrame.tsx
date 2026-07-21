"use client";

import { useState, type ReactNode } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/**
 * Task 014(35일차, 4팀) — 뷰포트 프리뷰(모바일/태블릿/데스크톱) 전환.
 *
 * `children`은 서버(`page.tsx`)가 이미 렌더한 섹션 트리를 그대로 넘겨받는다(Server→Client
 * 컴포넌트 표준 합성 패턴 — children은 이미 렌더된 요소라 함수 prop 직렬화 문제가 없다).
 * 폭 값은 `globals.css`의 기존 `--breakpoint-sm`(375px)/`--breakpoint-md`(768px)/
 * `--breakpoint-xl`(1440px) 리터럴을 그대로 미러링한다 — 새 토큰을 추가하지 않는다
 * (I-144 여유 0.56 보호, 토큰 파일 자체는 미수정).
 */

const VIEWPORTS = [
  { id: "mobile", maxWidth: "23.4375rem" /* 375px */, labelKey: "sample.viewport.mobile" as const },
  { id: "tablet", maxWidth: "48rem" /* 768px */, labelKey: "sample.viewport.tablet" as const },
  { id: "desktop", maxWidth: "none", labelKey: "sample.viewport.desktop" as const },
] satisfies readonly { id: string; maxWidth: string; labelKey: TranslationKey }[];

type ViewportId = (typeof VIEWPORTS)[number]["id"];

export interface ViewportFrameProps {
  readonly locale: SupportedLocale;
  readonly children: ReactNode;
}

export function ViewportFrame({ locale, children }: ViewportFrameProps) {
  const [viewportId, setViewportId] = useState<ViewportId>("desktop");
  const current = VIEWPORTS.find((v) => v.id === viewportId) ?? VIEWPORTS[2];

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label={t(locale, "sample.viewport.toggleLabel")}
        className="flex flex-wrap gap-2"
      >
        {VIEWPORTS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={viewportId === v.id}
            onClick={() => setViewportId(v.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              viewportId === v.id
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border text-foreground/80 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(locale, v.labelKey)}
          </button>
        ))}
      </div>
      <div
        className="@container mx-auto w-full overflow-x-auto rounded-xl border border-dashed border-border p-4 transition-[max-width]"
        style={{ maxWidth: current.maxWidth }}
      >
        {children}
      </div>
    </div>
  );
}
