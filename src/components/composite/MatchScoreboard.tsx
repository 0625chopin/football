import { Skeleton } from "@/components/ui/skeleton"
import { TeamBadge } from "@/components/domain/TeamBadge"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import { formatKickoff } from "@/i18n/format"
import type { SupportedLocale } from "@/i18n/locales"
import type { TranslationKey } from "@/i18n/keys"
import type { FixtureStatus, Team, Timestamp } from "@/types"
import type { CompositeViewState } from "./types"
import type { MatchPhase } from "./match-scoreboard"

// Task 017(43일차, 5팀) — D1 스코어보드(`docs/wireframe/04-경기상세라이브중계.md` §4 D1).
//
// 이 컴포넌트는 스코어·페이즈를 스스로 계산하지 않는다. `MatchCard.computeElapsedMinutes`와
// 동일한 책임 경계 — 호출부(`/[lang]/matches/[matchId]/page.tsx`)가 `./match-scoreboard.ts`의
// `foldMatchScore`/`deriveMatchPhase`(둘 다 순수 함수)로 미리 계산해 `MatchScoreboardData`에
// 값만 채워 넣는다.
//
// **스코어는 `Fixture.homeScore`/`awayScore`를 직접 쓰지 않는다** — 와이어프레임 E-1 "스코어
// 스냅샷은 이벤트에 저장되지 않는다"에 따라 호출부가 `getMatchEvents`(이미 R-11 컷오프
// 이내로 좁혀진 배열)를 접어(fold) 산출한 값만 받는다. `homeScore`/`awayScore`가 둘 다
// `null`이면(SCHEDULED/VOID) 스코어 자리 대신 킥오프 시각 또는 상태 배지만 보여준다.
//
// PSO(승부차기)는 R-13 ①에 따라 정규+연장 스코어와 **분리 표기**한다 — 절대 합산하지 않는다.

export interface MatchScoreboardData {
  readonly leagueName: string | null
  readonly roundLabel: string
  readonly isNeutral: boolean
  readonly status: FixtureStatus
  /** LIVE 구간 내부(전반/하프타임/후반/연장/승부차기) 구분. `./match-scoreboard.ts` 참조 */
  readonly phase: MatchPhase
  readonly kickoffAt: Timestamp
  /** LIVE일 때만 값 존재. 그 외엔 null(R-14 ①, 엔진 제공값 표시만) */
  readonly minute: number | null
  readonly addedTime: number
  readonly homeTeamName: string
  readonly awayTeamName: string
  readonly homeTeam?: Pick<Team, "name" | "shortName" | "crestSeed">
  readonly awayTeam?: Pick<Team, "name" | "shortName" | "crestSeed">
  /** 둘 다 null이면 스코어를 그리지 않는다(SCHEDULED/VOID) */
  readonly homeScore: number | null
  readonly awayScore: number | null
  /** 승부차기로 결판난 경우만 둘 다 non-null(R-13) */
  readonly pkHome: number | null
  readonly pkAway: number | null
}

export interface MatchScoreboardProps {
  locale: SupportedLocale
  state: CompositeViewState<MatchScoreboardData>
  className?: string
}

const CONTAINER_CLASS = "flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6"

const LIVE_PHASE_LABEL_KEY: Partial<Record<MatchPhase, TranslationKey>> = {
  FIRST_HALF: "match.score.phase.firstHalf",
  HALF_TIME: "match.score.phase.halfTime",
  SECOND_HALF: "match.score.phase.secondHalf",
  EXTRA_TIME: "match.score.phase.extraTime",
  PENALTY_SHOOTOUT: "match.score.phase.penaltyShootout",
}

/** LIVE 외 3개 상태의 아이콘+라벨 배지(NFR-A11Y-002) — `MatchCard`의 `ROW_STATUS_BADGE`와
 * 동일 아이콘·라벨키를 쓴다(문구 중복 선언 금지, 41일차 판단과 동일 원칙). */
const NON_LIVE_STATUS: Record<Exclude<FixtureStatus, "LIVE">, { icon: string; labelKey: TranslationKey }> = {
  SCHEDULED: { icon: "⏱", labelKey: "match.card.scheduledLabel" },
  FINISHED: { icon: "✓", labelKey: "match.card.finishedLabel" },
  VOID: { icon: "⚠", labelKey: "match.card.voidLabel" },
}

export function MatchScoreboard({ locale, state, className }: MatchScoreboardProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="match-scoreboard"
        data-status="loading"
        aria-hidden="true"
        className={cn(CONTAINER_CLASS, className)}
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="match-scoreboard"
        data-status="empty"
        className={cn("p-4 text-center text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.error.loadFailed")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        data-slot="match-scoreboard"
        data-status="error"
        className={cn("p-4 text-center text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.score.error")}
      </p>
    )
  }

  const { data } = state
  const isLive = data.status === "LIVE"
  const hasPso = data.pkHome !== null && data.pkAway !== null
  const showScore = data.homeScore !== null && data.awayScore !== null

  const metaParts = [
    data.leagueName,
    data.roundLabel,
    t(locale, data.isNeutral ? "match.score.neutralVenueLabel" : "match.score.notNeutralVenueLabel"),
  ].filter((part): part is string => Boolean(part))

  const elapsedLabel =
    isLive && data.minute !== null
      ? data.addedTime > 0
        ? t(locale, "match.timeline.addedTimeFormat", { minute: data.minute, added: data.addedTime })
        : t(locale, "match.timeline.minuteFormat", { minute: data.minute })
      : null

  const phaseLabelKey = isLive ? LIVE_PHASE_LABEL_KEY[data.phase] : undefined

  const statusBadge = isLive ? (
    // LIVE는 색(빨강) 단독이 아니라 점멸 점 + 라벨 텍스트를 함께 낸다(NFR-A11Y-002).
    <span className="inline-flex shrink-0 items-center gap-1.5 text-live">
      <span aria-hidden className="live-dot" />
      <span className="eyebrow">{t(locale, "match.live.label")}</span>
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground">
      <span aria-hidden>{NON_LIVE_STATUS[data.status].icon}</span>
      <span className="eyebrow">{t(locale, NON_LIVE_STATUS[data.status].labelKey)}</span>
    </span>
  )

  return (
    <div data-slot="match-scoreboard" data-status="ready" className={cn(CONTAINER_CLASS, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow min-w-0 truncate text-muted-foreground" title={metaParts.join(" · ")}>
          {metaParts.join(" · ")}
        </span>
        <div className="flex shrink-0 items-center gap-2.5">
          {statusBadge}
          {phaseLabelKey && <span className="eyebrow text-muted-foreground">{t(locale, phaseLabelKey)}</span>}
          {elapsedLabel && <span className="scoreboard text-sm">{elapsedLabel}</span>}
        </div>
      </div>

      {/* 320px에서도 2열을 유지하고 팀명만 2줄까지 허용한다(NFR-RS-001) — 이 2열은
          뷰포트에 따라 재배치되는 열이 아니라 이 스코어보드 자체의 고정 구조라 `md:` 열
          전환 규칙(CLAUDE.md 브레이크포인트 경고)과 무관하다. */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        <TeamColumn
          locale={locale}
          name={data.homeTeamName}
          team={data.homeTeam}
          score={showScore ? data.homeScore : null}
          align="start"
        />
        <TeamColumn
          locale={locale}
          name={data.awayTeamName}
          team={data.awayTeam}
          score={showScore ? data.awayScore : null}
          align="end"
        />
      </div>

      {!showScore && data.status === "SCHEDULED" && (
        <p className="scoreboard text-center text-sm text-muted-foreground">
          {formatKickoff(data.kickoffAt, locale, "dateTime")}
        </p>
      )}

      {hasPso && (
        <p className="scoreboard text-center text-sm text-muted-foreground">
          {t(locale, "match.score.psoFormat", {
            home: data.homeScore ?? 0,
            away: data.awayScore ?? 0,
            pkHome: data.pkHome,
            pkAway: data.pkAway,
          })}
        </p>
      )}
    </div>
  )
}

function TeamColumn({
  locale,
  name,
  team,
  score,
  align,
}: {
  readonly locale: SupportedLocale
  readonly name: string
  readonly team?: Pick<Team, "name" | "shortName" | "crestSeed">
  readonly score: number | null
  readonly align: "start" | "end"
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", align === "end" ? "items-end text-right" : "items-start text-left")}>
      <span className={cn("flex min-w-0 items-center gap-1.5", align === "end" && "flex-row-reverse")}>
        {team && <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: team }} />}
        <span className="min-w-0 text-sm font-medium break-words" title={name}>
          {name}
        </span>
      </span>
      <span className="scoreboard text-3xl leading-none">{score ?? "–"}</span>
    </div>
  )
}
