"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { DataSourceKind } from "@/lib/data/factory";
import { cn } from "@/lib/utils";

import { setDataSourceKindAction } from "./data-source-actions";

/**
 * Task 014(37일차, 4팀) — 어댑터 토글(UC-602). 설계 근거는 `data-source-actions.ts`
 * 파일 헤더 참조. `LocaleCompareToggle`과 달리 여기서는 서버가 두 가지 버전을 미리
 * 렌더해 두지 않는다 — 전환 자체가 서버 상태(env)를 바꾸는 뮤테이션이라 서버 액션 +
 * `revalidatePath`로 라우트를 다시 렌더해야 하기 때문이다(그 결과 컴포넌트 섹션 전체가
 * 새 어댑터의 데이터로 갱신된다).
 */

export interface DataSourceToggleProps {
  readonly locale: SupportedLocale;
  readonly initialKind: DataSourceKind;
}

const OPTIONS: readonly DataSourceKind[] = ["mock", "supabase"];

const OPTION_LABEL_KEY: Record<DataSourceKind, "sample.dataSource.optionMock" | "sample.dataSource.optionSupabase"> = {
  mock: "sample.dataSource.optionMock",
  supabase: "sample.dataSource.optionSupabase",
};

export function DataSourceToggle({ locale, initialKind }: DataSourceToggleProps) {
  const [activeKind, setActiveKind] = useState<DataSourceKind>(initialKind);
  const [reverted, setReverted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSelect(kind: DataSourceKind) {
    if (kind === activeKind || isPending) return;
    setReverted(false);
    startTransition(async () => {
      const result = await setDataSourceKindAction(kind);
      setActiveKind(result.kind);
      setReverted(!result.ok);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border p-3">
      <div
        role="group"
        aria-label={t(locale, "sample.dataSource.toggleLabel")}
        className="inline-flex items-center gap-0.5 rounded-md border border-border p-0.5"
      >
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={option === activeKind}
            disabled={isPending}
            onClick={() => handleSelect(option)}
            className={cn(
              "rounded-sm px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60",
              option === activeKind
                ? "bg-primary font-semibold text-primary-foreground"
                : "text-foreground/70 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {t(locale, OPTION_LABEL_KEY[option])}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending ? t(locale, "sample.dataSource.switching") : t(locale, "sample.dataSource.hint")}
      </p>
      {reverted && !isPending && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {t(locale, "sample.dataSource.revertedToMock")}
        </p>
      )}
    </div>
  );
}
