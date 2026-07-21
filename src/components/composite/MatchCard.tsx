import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
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
// 37일차(Task 015, 5팀) — 4상태 완성(와이어프레임 01번 §5): 로딩 스켈레톤을 실제 카드
// 행 구조(헤더·팀 2행·푸터)와 맞춰 CLS를 줄였고, Empty에 `emptyNextKickoffAt`(A2가 넘기는
// "다음 킥오프" 시각, DC-07 로케일 변환은 이 컴포넌트가 `formatKickoff`로 한다)를, Error에
// `onRetry`를 추가했다. 둘 다 `CompositeViewState`(composite 8종 공유 계약, `./types`)의
// `empty`/`error` 변형에 필드를 얹지 않고 이 컴포넌트만의 곁가지 prop으로 뒀다 — 공유
// 타입에 필드를 추가하면 나머지 7종 composite 컴포넌트에도 영향이 번지기 때문이다.
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
  /**
   * Task 013C(36일차) — 놓이는 표면. 기본값 `"card"`는 밝은 본문 배경(쇼케이스·목록),
   * `"board"`는 홈 라이브 보드처럼 어두운 중계 표면 위를 뜻한다. 두 표면의 대비 방향이
   * 반대라 `border`/`muted-foreground` 같은 페이지 토큰을 그대로 쓸 수 없어, board에서는
   * `currentColor` 파생 값만 쓴다(부모가 `text-board-foreground`를 준다).
   */
  surface?: "card" | "board"
  /**
   * `state.status === "empty"`일 때만 쓰인다. 진행 중 경기가 0건일 때 "다음 킥오프" 시각을
   * 함께 보여주기 위함(A2 그리드 전용, 위 파일 헤더 "37일차" 절 참조). 없으면 기존처럼
   * 한 줄(`match.card.empty`)만 보여준다.
   */
  emptyNextKickoffAt?: Timestamp | null
  /** `state.status === "error"`일 때만 쓰인다. 넘기지 않으면 재시도 버튼을 렌더하지 않는다. */
  onRetry?: () => void
  className?: string
}

const CARD_CLASS_NAME = "flex flex-col gap-3 rounded-lg border p-4"
const ROW_CLASS_NAME = "flex items-center gap-3 rounded-md border px-3 py-2"

const SURFACE_CLASS_NAME: Record<NonNullable<MatchCardProps["surface"]>, string> = {
  card: "border-border bg-card",
  board: "border-board-line bg-white/[0.04]",
}
/** 보조 텍스트(리그명·경과분) 색 — 표면에 따라 참조 토큰이 달라진다. */
const MUTED_CLASS_NAME: Record<NonNullable<MatchCardProps["surface"]>, string> = {
  card: "text-muted-foreground",
  board: "text-board-muted",
}

export function MatchCard({
  locale,
  state,
  density = "card",
  surface = "card",
  emptyNextKickoffAt,
  onRetry,
  className,
}: MatchCardProps) {
  const containerClassName = cn(
    density === "row" ? ROW_CLASS_NAME : CARD_CLASS_NAME,
    SURFACE_CLASS_NAME[surface],
  )
  const mutedClassName = MUTED_CLASS_NAME[surface]

  if (state.status === "loading") {
    // board 표면은 `bg-muted`(페이지 토큰)가 다크 표면 위에서 거의 안 보이므로
    // `currentColor` 파생 톤(`--board-muted`)으로 덮어쓴다(SURFACE_CLASS_NAME과 동일 원칙).
    const skeletonToneClassName = surface === "board" ? "bg-board-muted/15" : undefined

    if (density === "row") {
      return (
        <div
          data-slot="match-card"
          data-status="loading"
          data-density="row"
          data-surface={surface}
          aria-hidden="true"
          className={cn(containerClassName, className)}
        >
          <Skeleton className={cn("h-3 w-16", skeletonToneClassName)} />
          <Skeleton className={cn("h-4 flex-1", skeletonToneClassName)} />
          <Skeleton className={cn("h-4 w-10", skeletonToneClassName)} />
        </div>
      )
    }

    // 실제 준비(ready) 카드와 같은 3블록(헤더 / 팀 2행 / 푸터)·같은 간격을 써서 CLS를
    // 낮춘다(와이어프레임 01번 §5 "카드 실제 높이와 동일 높이 고정") — 아래 준비 상태
    // JSX와 나란히 두고 비교하면 구조가 그대로 대응된다.
    return (
      <div
        data-slot="match-card"
        data-status="loading"
        data-density="card"
        data-surface={surface}
        aria-hidden="true"
        className={cn(containerClassName, className)}
      >
        <div className="flex items-center justify-between gap-2">
          <Skeleton className={cn("h-3 w-16", skeletonToneClassName)} />
          <Skeleton className={cn("h-3 w-10", skeletonToneClassName)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-3">
            <Skeleton className={cn("h-4 flex-1", skeletonToneClassName)} />
            <Skeleton className={cn("h-6 w-7", skeletonToneClassName)} />
          </div>
          <div className="flex items-baseline gap-3">
            <Skeleton className={cn("h-4 flex-1", skeletonToneClassName)} />
            <Skeleton className={cn("h-6 w-7", skeletonToneClassName)} />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t pt-2.5">
          <Skeleton className={cn("h-3 w-14", skeletonToneClassName)} />
        </div>
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <div
        data-slot="match-card"
        data-status="empty"
        className={cn("flex flex-col items-center gap-1 p-4 text-center text-sm", mutedClassName, className)}
      >
        <p className="font-medium">{t(locale, "match.card.empty")}</p>
        {emptyNextKickoffAt && (
          <p>
            {t(locale, "match.card.emptyNextKickoff", {
              time: formatKickoff(emptyNextKickoffAt, locale, "time"),
            })}
          </p>
        )}
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div
        role="alert"
        data-slot="match-card"
        data-status="error"
        className={cn("flex flex-col items-center gap-3 p-4 text-center text-sm", className)}
      >
        <p className="font-medium text-destructive">{state.message ?? t(locale, "match.card.error")}</p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            // board 표면은 outline 버튼 기본값(`border-border bg-background`, 페이지 토큰)이
            // 다크 표면과 대비가 반대라 `currentColor` 파생 톤으로 덮어쓴다(twMerge가 같은
            // 유틸리티 그룹을 뒤 클래스로 교체 — SURFACE_CLASS_NAME과 동일 원칙).
            className={cn(
              surface === "board" &&
                "border-board-line bg-transparent text-board-foreground hover:bg-white/10",
            )}
          >
            {t(locale, "error.generic.retryLabel")}
          </Button>
        )}
      </div>
    )
  }

  const { data } = state
  const isLive = data.status === "LIVE"
  const { homeScore, awayScore } = data
  const hasScore = homeScore !== null && awayScore !== null
  const homeIsLeading = hasScore && homeScore > awayScore
  const awayIsLeading = hasScore && awayScore > homeScore
  const scoreLabel = hasScore
    ? t(locale, "match.card.scoreFormat", { home: homeScore, away: awayScore })
    : formatKickoff(data.kickoffAt, locale, "time")

  // LIVE 표시는 색(빨강) 단독이 아니라 점멸 점 + 라벨 텍스트를 함께 낸다(NFR-A11Y-002).
  const liveBadge = isLive ? (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-live">
      <span aria-hidden className="live-dot" />
      <span className="eyebrow">{t(locale, "match.live.label")}</span>
    </span>
  ) : null
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
        data-surface={surface}
        className={cn(containerClassName, className)}
      >
        <span className={cn("w-20 shrink-0 truncate text-xs", mutedClassName)} title={data.leagueName}>
          {data.leagueName}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{data.homeTeamName}</span>
        <span className="scoreboard shrink-0 text-sm">{scoreLabel}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm">{data.awayTeamName}</span>
        {liveBadge}
        {elapsedLabel ? (
          <span className={cn("scoreboard w-10 shrink-0 text-right text-xs", mutedClassName)}>
            {elapsedLabel}
          </span>
        ) : null}
      </div>
    )
  }

  /**
   * 36일차 — 카드 밀도를 "한 줄에 A 0-1 B"에서 **세로 스코어보드**로 바꿨다.
   *
   * 근거: 종전 인라인 배치는 점수가 팀명 두 개 사이에 끼여 셋 다 같은 크기·무게로 보였고,
   * 정작 이 화면에서 가장 먼저 읽혀야 할 값(점수)이 가장 안 보였다. 실제 스코어 서비스와
   * 중계 자막이 쓰는 세로 2행 배치는 ① 팀명 길이가 서로 달라도 점수 열이 흔들리지 않고
   * ② 팀명이 길어져도 잘리지 않으며 ③ 점수를 크게 키울 자리가 생긴다.
   *
   * 점수가 아직 없는 경기(SCHEDULED 등)는 두 행 모두 숫자 자리를 비우고 킥오프 시각을
   * 메타 행에 낸다 — 미래 정보(예상 스코어)를 만들어 채우지 않는다.
   */
  return (
    <div
      data-slot="match-card"
      data-status="ready"
      data-density="card"
      data-surface={surface}
      className={cn(containerClassName, className)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("eyebrow min-w-0 truncate", mutedClassName)} title={data.leagueName}>
          {data.leagueName}
        </span>
        {liveBadge}
      </div>

      <div className="flex flex-col gap-1.5">
        <TeamRow name={data.homeTeamName} score={homeScore} isLeading={homeIsLeading} />
        <TeamRow name={data.awayTeamName} score={awayScore} isLeading={awayIsLeading} />
      </div>

      <div className={cn("flex items-center gap-2 border-t pt-2.5 text-xs", mutedClassName)}>
        {/* 경과분이 이 카드의 "지금" 신호다 — 있으면 그것을, 없으면 킥오프 시각을 낸다. */}
        <span className="scoreboard">{elapsedLabel ?? scoreLabel}</span>
      </div>
    </div>
  )
}

/**
 * 스코어보드 한 행 — 팀명(가변폭) + 점수(고정폭 우측 정렬).
 *
 * 앞서고 있는 쪽은 굵기로만 구분한다(색 단독 금지 원칙과 별개로, 리드 여부는 점수 숫자
 * 자체가 이미 말하고 있어 색까지 얹으면 LIVE 신호와 경쟁한다).
 */
function TeamRow({
  name,
  score,
  isLeading,
}: {
  readonly name: string
  readonly score: number | null
  readonly isLeading: boolean
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={cn("min-w-0 flex-1 truncate text-sm", isLeading ? "font-semibold" : "font-normal")} title={name}>
        {name}
      </span>
      <span
        className={cn(
          "scoreboard w-7 shrink-0 text-right text-2xl leading-none",
          score === null && "opacity-30",
          !isLeading && score !== null && "opacity-70",
        )}
      >
        {score ?? "–"}
      </span>
    </div>
  )
}
