import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { PlayerAttributeHistory } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(31일차, 5팀) — 성장 곡선(GrowthChart). FR-PL-004/34속성 시계열 렌더.
//
// **I-152(차트 라이브러리) 1차 방침 검증 대상.** 27일차 결정: ⓐ 자체 SVG로 먼저 시도,
// 부족하면 ⓑ recharts 폴백. 이 컴포넌트가 그 1차 시도이며, 시즌별 OVR 단일 라인 + 점
// 마커 + 축 라벨 정도의 요구라 인터랙션(줌·범례 토글·다중 시리즈)이 전혀 없다 —
// 좌표 계산과 `<polyline>`/`<circle>`/`<text>` 조합만으로 충분해 라이브러리 도입 없이
// 종결한다(31일차 판정, 근거는 팀 보고 참조).
//
// **FR-PL-004(PA 원값 비노출)** — 입력은 `PlayerAttributeHistory`(E-09)를 그대로 받되
// 이 컴포넌트가 실제로 읽는 필드는 `seasonNumber`/`ovr`뿐이다. 그 타입에는 애초에 `pa`
// 필드 자체가 없어(person.ts 참조 — `PlayerAttributeValues` 34속성 + `playerId`/
// `seasonNumber`/`ovr`) 구조적으로 원값을 노출할 수 없다(BracketTree의 "구조적 분리"
// 선례와 동일한 방어 방식).
//
// **좌표 계산은 순수 함수로 분리**(`buildGrowthChartSeries`/`buildGrowthChartLayout`/
// `pickGrowthChartTickIndices`) — PitchLineup·BracketTree 선례와 동일하게 `.tsx` 렌더
// 테스트가 불가능한 환경(jsdom 미설치)이라 이 함수들을 `.test.ts`로 검증한다.

export interface GrowthChartSeriesPoint {
  readonly seasonNumber: number
  readonly ovr: number
}

/**
 * 이력을 시즌 오름차순 시계열로 정규화하는 순수 함수. 원본 배열은 변경하지 않는다.
 * 이력이 비어 있으면(신인/데이터 없음) `null`을 반환해 호출부가 empty 상태를 그리게 한다.
 */
export function buildGrowthChartSeries(
  history: readonly PlayerAttributeHistory[],
): readonly GrowthChartSeriesPoint[] | null {
  if (history.length === 0) return null
  return [...history]
    .map((entry) => ({ seasonNumber: entry.seasonNumber, ovr: entry.ovr }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
}

const GROWTH_CHART_VIEW_WIDTH = 400
const GROWTH_CHART_VIEW_HEIGHT = 160
const GROWTH_CHART_PADDING_X = 28
const GROWTH_CHART_PADDING_TOP = 12
const GROWTH_CHART_PADDING_BOTTOM = 24

export interface GrowthChartPlottedPoint extends GrowthChartSeriesPoint {
  readonly x: number
  readonly y: number
}

export interface GrowthChartLayout {
  readonly points: readonly GrowthChartPlottedPoint[]
  readonly minOvr: number
  readonly maxOvr: number
  readonly polylinePoints: string
  readonly baselineY: number
}

/**
 * 시계열 점을 고정 뷰박스(400×160) 좌표로 투영하는 순수 함수. OVR 값이 전 구간 동일하면
 * (성장 없음/1시즌만 존재) 상하 여백 없이 선이 축 경계에 붙지 않도록 ±1 인위 여유를 둔다.
 */
export function buildGrowthChartLayout(
  series: readonly GrowthChartSeriesPoint[],
): GrowthChartLayout {
  const ovrValues = series.map((point) => point.ovr)
  const rawMin = Math.min(...ovrValues)
  const rawMax = Math.max(...ovrValues)
  const minOvr = rawMin === rawMax ? rawMin - 1 : rawMin
  const maxOvr = rawMin === rawMax ? rawMax + 1 : rawMax

  const innerWidth = GROWTH_CHART_VIEW_WIDTH - GROWTH_CHART_PADDING_X * 2
  const innerHeight =
    GROWTH_CHART_VIEW_HEIGHT - GROWTH_CHART_PADDING_TOP - GROWTH_CHART_PADDING_BOTTOM
  const lastIndex = series.length - 1

  const points = series.map((point, index) => {
    const xRatio = lastIndex === 0 ? 0.5 : index / lastIndex
    const yRatio = (point.ovr - minOvr) / (maxOvr - minOvr)
    return {
      ...point,
      x: GROWTH_CHART_PADDING_X + xRatio * innerWidth,
      // SVG y좌표는 위가 0이라 값이 클수록 위로 가도록 반전한다.
      y: GROWTH_CHART_PADDING_TOP + (1 - yRatio) * innerHeight,
    }
  })

  return {
    points,
    minOvr,
    maxOvr,
    polylinePoints: points.map((point) => `${point.x},${point.y}`).join(" "),
    baselineY: GROWTH_CHART_PADDING_TOP + innerHeight,
  }
}

/**
 * x축 시즌 라벨을 그릴 인덱스를 고르는 순수 함수. 점이 많아지면(장기 커리어) 전부
 * 라벨링하지 않고 최대 `maxTicks`개로 등간격 추출한다 — 첫/마지막 시즌은 항상 포함된다.
 */
export function pickGrowthChartTickIndices(
  count: number,
  maxTicks = 6,
): readonly number[] {
  if (count <= 0) return []
  if (count <= maxTicks) return Array.from({ length: count }, (_, i) => i)

  const step = (count - 1) / (maxTicks - 1)
  const indices = new Set<number>()
  for (let i = 0; i < maxTicks; i++) {
    indices.add(Math.round(i * step))
  }
  return [...indices].sort((a, b) => a - b)
}

export interface GrowthChartProps {
  locale: SupportedLocale
  state: CompositeViewState<readonly PlayerAttributeHistory[]>
  className?: string
}

export function GrowthChart({ locale, state, className }: GrowthChartProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="growth-chart"
        data-status="loading"
        className={cn("w-full", className)}
      >
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="growth-chart"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "player.growthChart.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="growth-chart"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "player.growthChart.error")}
      </p>
    )
  }

  const series = buildGrowthChartSeries(state.data)

  if (!series) {
    return (
      <p
        data-slot="growth-chart"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "player.growthChart.empty")}
      </p>
    )
  }

  const layout = buildGrowthChartLayout(series)
  const tickIndices = pickGrowthChartTickIndices(series.length)
  const lastPointIndex = layout.points.length - 1

  return (
    <div data-slot="growth-chart" data-status="ready" className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${GROWTH_CHART_VIEW_WIDTH} ${GROWTH_CHART_VIEW_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={t(locale, "player.growthChart.ariaLabel", {
          min: layout.minOvr,
          max: layout.maxOvr,
        })}
      >
        <line
          x1={GROWTH_CHART_PADDING_X}
          y1={layout.baselineY}
          x2={GROWTH_CHART_VIEW_WIDTH - GROWTH_CHART_PADDING_X}
          y2={layout.baselineY}
          className="stroke-border"
          strokeWidth={1}
        />

        <text
          x={GROWTH_CHART_PADDING_X - 4}
          y={GROWTH_CHART_PADDING_TOP}
          textAnchor="end"
          dominantBaseline="hanging"
          className="fill-muted-foreground text-[9px]"
        >
          {layout.maxOvr}
        </text>
        <text
          x={GROWTH_CHART_PADDING_X - 4}
          y={layout.baselineY}
          textAnchor="end"
          dominantBaseline="text-after-edge"
          className="fill-muted-foreground text-[9px]"
        >
          {layout.minOvr}
        </text>

        <polyline
          points={layout.polylinePoints}
          fill="none"
          className="stroke-chart-1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {layout.points.map((point, index) => (
          <circle
            key={point.seasonNumber}
            cx={point.x}
            cy={point.y}
            r={index === lastPointIndex ? 4 : 3}
            className={index === lastPointIndex ? "fill-primary" : "fill-chart-1"}
          >
            <title>{`${point.seasonNumber}: ${point.ovr}`}</title>
          </circle>
        ))}

        {tickIndices.map((index) => {
          const point = layout.points[index]
          return (
            <text
              key={point.seasonNumber}
              x={point.x}
              y={GROWTH_CHART_VIEW_HEIGHT - GROWTH_CHART_PADDING_BOTTOM + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px] tabular-nums"
            >
              {point.seasonNumber}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
