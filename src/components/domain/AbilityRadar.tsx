import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { PlayerAttributeValues } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DomainViewState } from "./types";
import {
  RADAR_CATEGORY_ORDER,
  computeAxisEndpoints,
  computeCategoryAverages,
  computeRadarPoints,
  pointsToSvgPolygon,
} from "./radar";

/** 능력치 상한(person.ts PlayerAttributeValues — 34속성 전부 1~30 정수). */
const MAX_ATTRIBUTE_VALUE = 30;
const LAYOUT = { cx: 70, cy: 70, maxRadius: 50, maxValue: MAX_ATTRIBUTE_VALUE };
const LABEL_RADIUS = LAYOUT.maxRadius + 16;

export interface AbilityRadarProps {
  readonly locale: SupportedLocale;
  readonly state: DomainViewState<PlayerAttributeValues>;
  readonly className?: string;
}

/** 34속성을 기술/정신/신체/GK 4축 평균으로 축약해 보여주는 순수 SVG 방사형 차트. */
export function AbilityRadar({ locale, state, className }: AbilityRadarProps) {
  if (state.status === "loading") {
    return <Skeleton className={cn("size-[140px]", className)} />;
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

  const averages = computeCategoryAverages(state.data);
  const values = RADAR_CATEGORY_ORDER.map((key) => averages[key]);
  const dataPoints = computeRadarPoints(values, LAYOUT);
  const axisEndpoints = computeAxisEndpoints(RADAR_CATEGORY_ORDER.length, LAYOUT);
  const labelPoints = computeAxisEndpoints(RADAR_CATEGORY_ORDER.length, {
    ...LAYOUT,
    maxRadius: LABEL_RADIUS,
  });

  return (
    <svg
      viewBox="0 0 140 140"
      role="img"
      aria-label={t(locale, "player.ability.title")}
      className={cn("size-[140px] text-muted-foreground", className)}
    >
      {axisEndpoints.map((endpoint, i) => (
        <line
          key={RADAR_CATEGORY_ORDER[i]}
          x1={LAYOUT.cx}
          y1={LAYOUT.cy}
          x2={endpoint.x}
          y2={endpoint.y}
          stroke="currentColor"
          strokeOpacity={0.3}
        />
      ))}
      <polygon
        points={pointsToSvgPolygon(dataPoints)}
        fill="var(--color-primary)"
        fillOpacity={0.35}
        stroke="var(--color-primary)"
        strokeWidth={1.5}
      />
      {labelPoints.map((label, i) => (
        <text
          key={RADAR_CATEGORY_ORDER[i]}
          x={label.x}
          y={label.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill="currentColor"
        >
          {t(locale, `player.ability.${RADAR_CATEGORY_ORDER[i]}`)}
        </text>
      ))}
    </svg>
  );
}
