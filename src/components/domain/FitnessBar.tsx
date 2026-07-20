import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { PlayerState } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";

/** `fitness`(0~100)를 Progress 표시 범위로 clamp한다(ConditionGauge.normalizeFitness와 동일 수식,
 * 각 컴포넌트가 독립적으로 유지하는 사소한 로컬 헬퍼라 공유 유틸 추출은 하지 않는다). */
function clampFitness(fitness: number): number {
  return Math.min(Math.max(fitness, 0), 100);
}

export interface FitnessBarProps {
  readonly locale: SupportedLocale;
  readonly state: DomainViewState<Pick<PlayerState, "fitness">>;
  readonly className?: string;
}

/**
 * 선수 피로도(0~100) 단일 지표 게이지 — 로스터 목록처럼 컨디션 없이 피로도만 컴팩트하게
 * 보여줘야 하는 자리용(ConditionGauge는 컨디션+피로도 2단 표시, 이 컴포넌트는 1단).
 */
export function FitnessBar({ locale, state, className }: FitnessBarProps) {
  if (state.status === "loading") {
    return <Skeleton className={cn("h-1 w-full", className)} />;
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

  const { fitness } = state.data;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t(locale, "player.state.fitness")}</span>
        <span>{Math.round(fitness)}</span>
      </div>
      <Progress value={clampFitness(fitness)} />
    </div>
  );
}
