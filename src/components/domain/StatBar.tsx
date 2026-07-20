import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";

const DEFAULT_MAX = 100;

/** value/max를 0~100 Progress 값으로 정규화한다. max<=0이면(방어) 0으로 취급한다. */
function toPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max((value / max) * 100, 0), 100);
}

export interface StatBarProps {
  readonly locale: SupportedLocale;
  /**
   * 다양한 스탯 필드(슈팅·xG·점유율 등)를 전부 번역 키로 선언하지 않기 위해, 라벨은 호출부가
   * 이미 번역해 넘긴 문자열을 그대로 받는다(이 컴포넌트는 그 문자열의 accessible name 역할만
   * 한다). `locale`은 loading/empty/error 상태 문구 조회에만 쓰인다.
   */
  readonly label: string;
  readonly state: DomainViewState<{ readonly value: number; readonly max?: number }>;
  readonly className?: string;
}

/** 라벨 + 값(선택적 상한 max)을 수평 바로 보여주는 범용 스탯 표시 컴포넌트. */
export function StatBar({ locale, label, state, className }: StatBarProps) {
  if (state.status === "loading") {
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-1 w-full" />
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {t(locale, "stat.empty.message")}
      </span>
    );
  }

  if (state.status === "error") {
    return (
      <span className={cn("text-sm text-destructive", className)}>
        {state.message ?? t(locale, "stat.error.loadFailed")}
      </span>
    );
  }

  const { value, max = DEFAULT_MAX } = state.data;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <Progress value={toPercent(value, max)} aria-label={label} />
    </div>
  );
}
