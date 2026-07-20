import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import { formatKickoff } from "@/i18n/format"
import type { SupportedLocale } from "@/i18n/locales"
import { matchElapsedMinutesAt, worldMinutesAt } from "@/lib/sim/schedule/worldclock"
import type { WorldClockSnapshot } from "@/lib/sim/schedule/worldclock"
import type { FixtureStatus, Timestamp } from "@/types"
import type { CompositeViewState } from "./types"

// Task 015(34일차, 5팀) — 홈/라이브센터 경기 카드(MatchCard), 013B 22종 중 마지막
// 잔여 1종(29~30일차 dailyWorkLog가 미리 남겨 둔 설계 메모 반영). 기존 013B 7종
// (NewsItem·EventTimelineItem 등)과 동일 규약을 따른다 — named export, 서버 컴포넌트 +
// `t(locale, …)` 직접 호출, 4상태 단일 prop `state: CompositeViewState<T>`(I-156, 28일차
// 통일 판정 재확인 — 이 컴포넌트도 그대로 따름, 별도 loading/error prop 분리 없음).
//
// `density`는 2팀·5팀이 29~30일차에 미리 합의해 둔 설계("density:'card'|'row' 단일 통합 +
// LIVE 배지·경과분 조건부 렌더", `docs/dailyWorkLog/29Day.md`·`30Day.md`)를 그대로 반영한다.
// 오늘(Task 015 첫날)은 `card`(그리드)만 실사용하고, `row`는 이후 일정/결과 목록 재사용을
// 위해 인터페이스만 미리 갖춰 둔다 — 나중에 다시 만들지 않기 위함이다.
//
// **경과분은 이 컴포넌트가 계산하지 않는다.** H-24 계약(2팀 `src/lib/sim/schedule/
// worldclock.ts`, 30일차 인계 — `docs/handoff/H-24-worldclock-realtime-contract.md`)상
// "엔진 제공값을 표시만" 하고 UI가 `(now - kickoff)`를 직접 계산하지 않는다. 호출부(리스트
// 컨테이너, 오늘은 `src/app/[lang]/page.tsx`)가 이 파일이 내보내는 `computeElapsedMinutes`
// (H-24의 `worldMinutesAt`/`matchElapsedMinutesAt` 순수 함수를 얇게 감싼 어댑터)로 미리
// 계산해 `MatchCardData.elapsedMinutes`에 값만 채워 넣는다 — `EventTimelineItem`이 이벤트
// 표시명을 컴포넌트 밖에서 해석해 받는 것과 동일한 책임 경계.

export interface MatchCardData {
  readonly id: string
  readonly leagueName: string
  readonly homeTeamName: string
  readonly awayTeamName: string
  /** 종료 전 null 가능(E-15 `Fixture` 계약, C-23). 오늘 그리드는 항상 LIVE라 값이 채워진다. */
  readonly homeScore: number | null
  readonly awayScore: number | null
  readonly status: FixtureStatus
  readonly kickoffAt: Timestamp
  /** LIVE일 때만 값 존재(위 파일 헤더 H-24 설명 참조). LIVE가 아니면 null. */
  readonly elapsedMinutes: number | null
}

/**
 * 진행 중 경기의 경과분을 H-24 계약(`worldclock.ts`)의 순수 함수 조합으로 산출하는 얇은
 * 어댑터. 이 함수 자신은 "지금"을 모른다 — `now`는 호출자가 주입한다(순수 함수 원칙,
 * NFR-DT-001과 동일 관례). Mock 소비처는 `@/lib/mock/progress`의 `MOCK_NOW`를 넘기면
 * 되고, 실 데이터로 전환되면 그 호출부의 `now` 값만 바뀐다 — 이 함수·컴포넌트는 수정하지
 * 않는다(CLAUDE.md "데이터 조회 부분만 교체" 원칙).
 */
export function computeElapsedMinutes(
  kickoffAt: Timestamp,
  clock: WorldClockSnapshot,
  now: Timestamp,
): number {
  const kickoffWorldMinutes = worldMinutesAt(clock, kickoffAt)
  return Math.round(matchElapsedMinutesAt(kickoffWorldMinutes, clock, now))
}

export interface MatchCardProps {
  locale: SupportedLocale
  state: CompositeViewState<MatchCardData>
  /** 기본값 `"card"`(그리드용). `"row"`는 목록/표 형태 재사용 대비. */
  density?: "card" | "row"
  className?: string
}

const CARD_CLASS_NAME = "flex flex-col gap-2 rounded-xl border border-border p-4"
const ROW_CLASS_NAME = "flex items-center gap-3 rounded-lg border border-border px-3 py-2"

export function MatchCard({ locale, state, density = "card", className }: MatchCardProps) {
  const containerClassName = density === "row" ? ROW_CLASS_NAME : CARD_CLASS_NAME

  if (state.status === "loading") {
    return (
      <div
        data-slot="match-card"
        data-status="loading"
        data-density={density}
        className={cn(containerClassName, className)}
      >
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="match-card"
        data-status="empty"
        className={cn("p-4 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.card.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="match-card"
        data-status="error"
        className={cn("p-4 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.card.error")}
      </p>
    )
  }

  const { data } = state
  const isLive = data.status === "LIVE"
  const scoreLabel =
    data.homeScore !== null && data.awayScore !== null
      ? t(locale, "match.card.scoreFormat", { home: data.homeScore, away: data.awayScore })
      : formatKickoff(data.kickoffAt, locale, "time")

  const liveBadge = isLive ? <Badge variant="destructive">{t(locale, "match.live.label")}</Badge> : null
  const elapsedLabel =
    isLive && data.elapsedMinutes !== null
      ? t(locale, "match.card.elapsedFormat", { minute: data.elapsedMinutes })
      : null

  if (density === "row") {
    return (
      <div
        data-slot="match-card"
        data-status="ready"
        data-density="row"
        className={cn(ROW_CLASS_NAME, className)}
      >
        <span className="w-20 shrink-0 truncate text-xs text-muted-foreground" title={data.leagueName}>
          {data.leagueName}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{data.homeTeamName}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{scoreLabel}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm">{data.awayTeamName}</span>
        {liveBadge}
        {elapsedLabel ? (
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {elapsedLabel}
          </span>
        ) : null}
      </div>
    )
  }

  return (
    <div
      data-slot="match-card"
      data-status="ready"
      data-density="card"
      className={cn(CARD_CLASS_NAME, className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-muted-foreground" title={data.leagueName}>
          {data.leagueName}
        </span>
        {liveBadge}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{data.homeTeamName}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{scoreLabel}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">{data.awayTeamName}</span>
      </div>
      {elapsedLabel ? (
        <span className="text-xs tabular-nums text-muted-foreground">{elapsedLabel}</span>
      ) : null}
    </div>
  )
}
