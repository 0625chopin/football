import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";
import { parseForm, type FormResult } from "./form";

const RESULT_VARIANT: Record<FormResult, "default" | "secondary" | "destructive"> = {
  W: "default",
  D: "secondary",
  L: "destructive",
};

const RESULT_LABEL_KEY: Record<FormResult, "team.form.win" | "team.form.draw" | "team.form.loss"> = {
  W: "team.form.win",
  D: "team.form.draw",
  L: "team.form.loss",
};

export interface FormStripProps {
  readonly locale: SupportedLocale;
  /**
   * `Standing.form`/`TeamSeasonStat.currentForm`은 필드명이 달라 `Pick`으로 공유할 수 없어
   * 여기서만 쓰는 로컬 셰이프로 받는다 — 소비처가 원본 필드를 `{ form: standing.form }`처럼 매핑한다.
   */
  readonly state: DomainViewState<{ readonly form: string }>;
  readonly className?: string;
}

/** 최근 5경기 등 폼 문자열("WWDLW")을 W/D/L 배지 스트립으로 시각화한다. */
export function FormStrip({ locale, state, className }: FormStripProps) {
  if (state.status === "loading") {
    return <Skeleton className={cn("h-5 w-24", className)} />;
  }

  if (state.status === "empty") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {t(locale, "team.empty.message")}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className={cn("text-sm text-destructive", className)}>
        {state.message ?? t(locale, "team.error.loadFailed")}
      </span>
    );
  }

  const { form } = state.data;
  const results = parseForm(form);

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      aria-label={t(locale, "team.form.altText", { form })}
    >
      {results.map((result, index) => (
        <Badge
          // 같은 결과라도 회차별로 위치가 다르므로 index를 키에 포함한다(값만으로는 중복 가능).
          key={`${index}-${result}`}
          variant={RESULT_VARIANT[result]}
          className="size-5 justify-center rounded-full p-0"
          title={t(locale, RESULT_LABEL_KEY[result])}
        >
          {result}
        </Badge>
      ))}
    </span>
  );
}
