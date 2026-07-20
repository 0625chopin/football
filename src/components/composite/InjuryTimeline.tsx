import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { Injury, InjurySeverity } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(31일차, 5팀) — 부상 타임라인(InjuryTimeline). GrowthChart와 같은 1차
// 방침(I-152 — 자체 SVG, 라이브러리 0)을 재사용한다. 라운드 축을 공유하는 막대(구간)
// 여러 개를 그리는 요구라 GrowthChart의 좌표 계산 방식(뷰박스 고정 + 순수 함수 스케일)을
// 그대로 재적용했다 — 새 렌더 기법을 도입하지 않는다.
//
// **`InjuryStatus`(ACTIVE/RECOVERED) 표시명** — 31일차 구현 당시 `enums.ts`(3팀 콘텐츠
// 소유)에 `injurySeverity`는 있었으나(19일차 H-10 7그룹) `injuryStatus`는 없어 컴포넌트
// 전용 로컬 키(`player.injuryTimeline.status*`)로 임시 처리했다(I-165). 같은 날 3팀이
// `enums.injuryStatus` 카탈로그를 신설해 이중화가 됐고, 32일차에 그 카탈로그를 직접
// 경유하도록 정리했다 — 로컬 키는 제거됨.
//
// **severity → Badge variant 매핑**은 `EventTimelineItem`의 `EVENT_BADGE_VARIANT` 선례와
// 동일한 관례(색만으로 구분하지 않고 항상 텍스트 라벨과 함께)를 따른다. 막대 자체는 단일
// 톤(`fill-primary`)만 쓰고 중증도 구분은 배지 텍스트가 담당한다 — 막대 색을 severity별로
// 나누면 `--warning` 등 저대비 토큰을 텍스트 없이 단독 채움으로 쓰게 될 위험이 있어
// (globals.css 27일차 주석 — `--warning`은 반드시 `--warning-foreground`와 병기) 피했다.
//
// 좌표 계산은 순수 함수로 분리(`buildInjuryTimelineRows`/`buildInjuryTimelineDomain`/
// `computeInjuryBarX`) — PitchLineup·BracketTree·GrowthChart 선례와 동일하게 `.test.ts`로
// 검증한다(jsdom 미설치로 `.tsx` 렌더 테스트 불가).

const INJURY_SEVERITY_BADGE_VARIANT = {
  KNOCK: "outline",
  MINOR: "secondary",
  MODERATE: "default",
  SEVERE: "destructive",
} satisfies Record<InjurySeverity, "default" | "secondary" | "destructive" | "outline">

export interface InjuryTimelineData {
  readonly injuries: readonly Injury[]
  /** 축 전체 길이(리그 시즌 총 라운드 수). 없으면 데이터 자체 최대 라운드로 폴백한다. */
  readonly totalRounds?: number
}

/** 발생 라운드 오름차순으로 정렬하는 순수 함수. 원본 배열은 변경하지 않는다. */
export function sortInjuriesByOccurredRound(injuries: readonly Injury[]): readonly Injury[] {
  return [...injuries].sort((a, b) => a.occurredRound - b.occurredRound)
}

export interface InjuryTimelineRow {
  readonly injury: Injury
  readonly startRound: number
  readonly endRound: number
}

/**
 * 표시용 행으로 정규화하는 순수 함수. `returnRound`가 `occurredRound`보다 앞서는
 * 이상 데이터가 들어와도(방어) `endRound`를 `occurredRound`로 clamp해 음수 폭을 만들지
 * 않는다. 부상 기록이 없으면 `null`(호출부가 empty 상태를 그리게 한다).
 */
export function buildInjuryTimelineRows(
  data: InjuryTimelineData,
): readonly InjuryTimelineRow[] | null {
  if (data.injuries.length === 0) return null
  return sortInjuriesByOccurredRound(data.injuries).map((injury) => ({
    injury,
    startRound: injury.occurredRound,
    endRound: Math.max(injury.returnRound, injury.occurredRound),
  }))
}

export interface InjuryTimelineDomain {
  readonly minRound: number
  readonly maxRound: number
}

/**
 * 공유 라운드 축의 범위를 정하는 순수 함수. 최솟값은 1과 데이터 중 더 작은 쪽,
 * 최댓값은 `totalRounds`(있으면)와 데이터 중 더 큰 쪽을 취한다 — 시즌 도중까지만
 * 부상 기록이 있어도 축이 시즌 전체 길이를 반영하게 한다. 축 폭이 0이 되는 것을
 * 막기 위해 최솟값+1 이상을 보장한다.
 */
export function buildInjuryTimelineDomain(
  rows: readonly InjuryTimelineRow[],
  totalRounds?: number,
): InjuryTimelineDomain {
  const minRound = Math.min(1, ...rows.map((row) => row.startRound))
  const dataMaxRound = Math.max(...rows.map((row) => row.endRound))
  const maxRound = Math.max(totalRounds ?? dataMaxRound, dataMaxRound, minRound + 1)
  return { minRound, maxRound }
}

/** 라운드 값을 0~`trackWidth` 범위의 x좌표로 투영하는 순수 함수. */
export function computeInjuryBarX(
  round: number,
  domain: InjuryTimelineDomain,
  trackWidth: number,
): number {
  const ratio = (round - domain.minRound) / (domain.maxRound - domain.minRound)
  return ratio * trackWidth
}

const INJURY_BAR_TRACK_WIDTH = 400
const INJURY_BAR_TRACK_HEIGHT = 10
const INJURY_BAR_MIN_WIDTH = 6

export interface InjuryTimelineProps {
  locale: SupportedLocale
  state: CompositeViewState<InjuryTimelineData>
  className?: string
}

export function InjuryTimeline({ locale, state, className }: InjuryTimelineProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="injury-timeline"
        data-status="loading"
        className={cn("flex flex-col gap-3", className)}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="injury-timeline"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "player.injuryTimeline.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="injury-timeline"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "player.injuryTimeline.error")}
      </p>
    )
  }

  const rows = buildInjuryTimelineRows(state.data)

  if (!rows) {
    return (
      <p
        data-slot="injury-timeline"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "player.injuryTimeline.empty")}
      </p>
    )
  }

  const domain = buildInjuryTimelineDomain(rows, state.data.totalRounds)

  return (
    <div data-slot="injury-timeline" data-status="ready" className={cn("flex flex-col gap-3", className)}>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{t(locale, "player.injuryTimeline.roundLabel", { round: domain.minRound })}</span>
        <span>{t(locale, "player.injuryTimeline.roundLabel", { round: domain.maxRound })}</span>
      </div>

      {rows.map((row) => {
        const startX = computeInjuryBarX(row.startRound, domain, INJURY_BAR_TRACK_WIDTH)
        const endX = computeInjuryBarX(row.endRound, domain, INJURY_BAR_TRACK_WIDTH)
        const barWidth = Math.max(endX - startX, INJURY_BAR_MIN_WIDTH)

        return (
          <div key={row.injury.id} data-slot="injury-timeline-row" className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={INJURY_SEVERITY_BADGE_VARIANT[row.injury.severity]}>
                {t(locale, `enums.injurySeverity.${row.injury.severity}`)}
              </Badge>
              <span className="min-w-0 truncate font-medium" title={row.injury.typeLabel}>
                {row.injury.typeLabel}
              </span>
              <Badge variant={row.injury.status === "ACTIVE" ? "default" : "outline"}>
                {t(locale, `enums.injuryStatus.${row.injury.status}`)}
              </Badge>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
                {t(locale, "player.injuryTimeline.roundRangeFormat", {
                  start: row.startRound,
                  end: row.endRound,
                })}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${INJURY_BAR_TRACK_WIDTH} ${INJURY_BAR_TRACK_HEIGHT}`}
              className="h-2.5 w-full"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x={0}
                y={0}
                width={INJURY_BAR_TRACK_WIDTH}
                height={INJURY_BAR_TRACK_HEIGHT}
                rx={INJURY_BAR_TRACK_HEIGHT / 2}
                className="fill-muted"
              />
              <rect
                x={startX}
                y={0}
                width={barWidth}
                height={INJURY_BAR_TRACK_HEIGHT}
                rx={INJURY_BAR_TRACK_HEIGHT / 2}
                className="fill-primary"
              />
            </svg>
          </div>
        )
      })}
    </div>
  )
}
