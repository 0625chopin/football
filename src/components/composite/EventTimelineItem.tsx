import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { MatchEvent, MatchEventType } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(28일차, 5팀) — 경기 이벤트 타임라인 한 줄. FR-MT-002 전 23종 대응.
//
// `MatchEvent`는 팀·선수를 ID로만 들고 있어(브랜드 타입) 이름 해석은 이 컴포넌트의
// 책임이 아니다 — 화면 우선 개발 원칙상 Mock/실제 데이터 조회는 소비처(리스트 컨테이너)
// 몫이라 이미 해석된 표시명을 prop으로 받는다. 같은 이유로 `relatedEventSequence`
// (예: ASSIST → GOAL 연결) 같은 형제 이벤트 참조도 여러 이벤트를 함께 보는 리스트
// 컨테이너에서만 풀 수 있어 단일 아이템 컴포넌트 범위 밖에 둔다.
const EVENT_BADGE_VARIANT = {
  KICKOFF: "outline",
  HALF_TIME: "outline",
  FULL_TIME: "outline",
  EXTRA_TIME_START: "outline",
  PENALTY_SHOOTOUT: "outline",
  GOAL: "default",
  PENALTY_SCORED: "default",
  ASSIST: "default",
  OWN_GOAL: "destructive",
  YELLOW_CARD: "destructive",
  SECOND_YELLOW: "destructive",
  RED_CARD: "destructive",
  PENALTY_MISSED: "destructive",
  SHOT_ON: "secondary",
  SHOT_OFF: "secondary",
  SHOT_BLOCKED: "secondary",
  PENALTY_AWARDED: "secondary",
  FOUL: "secondary",
  OFFSIDE: "secondary",
  CORNER: "secondary",
  SAVE: "secondary",
  INJURY: "secondary",
  SUBSTITUTION: "secondary",
} satisfies Record<MatchEventType, "default" | "secondary" | "destructive" | "outline">

export interface EventTimelineItemData {
  event: MatchEvent
  teamName?: string | null
  primaryPlayerName?: string | null
  secondaryPlayerName?: string | null
}

export interface EventTimelineItemProps {
  locale: SupportedLocale
  state: CompositeViewState<EventTimelineItemData>
  className?: string
}

export function EventTimelineItem({ locale, state, className }: EventTimelineItemProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="event-timeline-item"
        data-status="loading"
        className={cn("flex items-center gap-3 py-2", className)}
      >
        <Skeleton className="h-4 w-10 shrink-0" />
        <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
        <Skeleton className="h-4 flex-1" />
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="event-timeline-item"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.timeline.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="event-timeline-item"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.timeline.error")}
      </p>
    )
  }

  const { event, teamName, primaryPlayerName, secondaryPlayerName } = state.data
  const minuteLabel =
    event.addedTime > 0
      ? t(locale, "match.timeline.addedTimeFormat", { minute: event.minute, added: event.addedTime })
      : t(locale, "match.timeline.minuteFormat", { minute: event.minute })

  return (
    <div
      data-slot="event-timeline-item"
      data-status="ready"
      className={cn("flex items-center gap-3 py-2", className)}
    >
      <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
        {minuteLabel}
      </span>
      <Badge variant={EVENT_BADGE_VARIANT[event.type]}>
        {t(locale, `enums.matchEvent.${event.type}`)}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-sm">
        {[primaryPlayerName, teamName].filter(Boolean).join(" · ")}
        {secondaryPlayerName ? ` (${secondaryPlayerName})` : null}
      </span>
    </div>
  )
}
