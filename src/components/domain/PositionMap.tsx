import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Position } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";
import { coordinatesFor } from "./pitch";

const PITCH_WIDTH = 100;
const PITCH_HEIGHT = 150;

export interface PositionMapProps {
  readonly locale: SupportedLocale;
  readonly state: DomainViewState<{ readonly position: Position }>;
  readonly className?: string;
}

/** 포지션 11군 중 하나를 단순화된 피치 다이어그램 위 점으로 표시하는 순수 SVG. */
export function PositionMap({ locale, state, className }: PositionMapProps) {
  if (state.status === "loading") {
    return <Skeleton className={cn("aspect-[2/3] w-full", className)} />;
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

  const { position } = state.data;
  const point = coordinatesFor(position);
  const positionLabel = t(locale, `enums.position.${position}`);

  return (
    <svg
      viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
      role="img"
      aria-label={t(locale, "player.position.altText", { position: positionLabel })}
      className={cn("aspect-[2/3] w-full text-muted-foreground", className)}
    >
      <rect
        x={2}
        y={2}
        width={PITCH_WIDTH - 4}
        height={PITCH_HEIGHT - 4}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
      />
      <line
        x1={2}
        y1={PITCH_HEIGHT / 2}
        x2={PITCH_WIDTH - 2}
        y2={PITCH_HEIGHT / 2}
        stroke="currentColor"
        strokeOpacity={0.3}
      />
      <circle
        cx={PITCH_WIDTH / 2}
        cy={PITCH_HEIGHT / 2}
        r={14}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
      />
      <circle cx={point.x} cy={point.y} r={5} fill="var(--color-chart-2)" />
      <text
        x={point.x}
        y={point.y - 9}
        textAnchor="middle"
        fontSize={8}
        fill="currentColor"
      >
        {positionLabel}
      </text>
    </svg>
  );
}
