import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { PlayerState } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";
import { clampFitness } from "./fitness";

/** `condition`(1.0~10.0, person.ts PlayerState 참고)을 Progress 표시용 0~100으로 정규화한다. */
function normalizeCondition(condition: number): number {
  return Math.min(Math.max(condition * 10, 0), 100);
}

export interface ConditionGaugeProps {
  readonly locale: SupportedLocale;
  readonly state: DomainViewState<Pick<PlayerState, "condition" | "fitness">>;
  readonly className?: string;
}

/** 선수 컨디션(1.0~10.0)·피로도(0~100) 게이지. 시각화는 정규화하되 라벨은 원본 척도값을 노출한다. */
export function ConditionGauge({ locale, state, className }: ConditionGaugeProps) {
  if (state.status === "loading") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Skeleton className="h-1 w-full" />
        <Skeleton className="h-1 w-full" />
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {t(locale, "player.empty.message")}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className={cn("text-sm text-destructive", className)}>
        {state.message ?? t(locale, "player.error.loadFailed")}
      </span>
    );
  }

  const { condition, fitness } = state.data;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t(locale, "player.state.condition")}</span>
          <span>{condition.toFixed(1)}</span>
        </div>
        <Progress value={normalizeCondition(condition)} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t(locale, "player.state.fitness")}</span>
          <span>{Math.round(fitness)}</span>
        </div>
        <Progress value={clampFitness(fitness)} />
      </div>
    </div>
  );
}
