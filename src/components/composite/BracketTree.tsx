import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { FixtureId, TeamId } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(30일차, 5팀) — 넉아웃 트리(BracketTree). 플레이오프·컵 공용(4팀 020 소비).
//
// 도메인 타입에 브래킷 전용 타입이 없다(8일차 동결 리뷰에서 "브래킷 슬롯"은 파생
// 가능/타입 대상 아님으로 판정 — `src/types/index.ts` H-01 주석, I-46). `PitchLineup`이
// `FORMATION_LAYOUTS`를 로컬 UI 상수로 둔 선례와 같은 이유로, 팀/경기 식별자만
// `@/types`의 동결된 브랜드 타입(`TeamId`/`FixtureId`)을 재사용하고 트리 구조 자체는
// 이 파일의 로컬 타입으로 둔다.
//
// **가변 라운드 수 대응**: 라운드 개수를 상수로 고정하지 않고 `data.rounds` 배열
// 길이를 그대로 컬럼 수로 쓴다 — 2라운드짜리 소규모 플레이오프와 4라운드 이상의
// 컵대회를 같은 컴포넌트로 렌더한다.
//
// **커넥터 라인**: I-152(차트류 SVG 1차 방침)는 31일차 판정 대기라, 라운드 간 정확한
// 페어링 좌표 계산 없이도 그릴 수 있는 순수 CSS 방식(각 매치 카드에 다음 라운드로
// 이어지는 절반 높이 보더 + 컬럼 `justify-around`)으로 1차 구현한다. 데이터가 완전한
// 이분(binary) 대진표가 아니어도(예: 부전승으로 라운드 간 매치 수가 정확히 절반이
// 아닌 경우) 레이아웃이 깨지지 않는다 — 커넥터는 시각적 근사치이지 좌표 계산 결과가
// 아니다.
//
// D-19(승부차기 득점 개인 통산 미포함, 경기 승패에는 정상 반영)에 따라 정규시간
// 스코어와 승부차기 스코어를 별도 필드로 받아 화면에서도 구분 표시한다(합산 금지).

export interface BracketParticipant {
  readonly teamId: TeamId
  readonly name: string
  readonly shortName?: string
}

export interface BracketMatchSlot {
  readonly matchId?: FixtureId
  /** `null` = 아직 배정되지 않은 자리(TBD, 상위 라운드 승자 대기). */
  readonly home: BracketParticipant | null
  readonly away: BracketParticipant | null
  readonly homeScore?: number | null
  readonly awayScore?: number | null
  readonly wentToPenalties?: boolean
  readonly homePenaltyScore?: number | null
  readonly awayPenaltyScore?: number | null
  /** 스코어만으로 승자를 가릴 수 없는 경우(예: 2차전 합산) 명시적으로 지정. */
  readonly winnerTeamId?: TeamId | null
}

export interface BracketRoundData {
  /** 라운드 표시 라벨(예: "16강", "준결승"). 번역·명명은 소비 화면(4팀) 책임. */
  readonly label: string
  readonly matches: readonly BracketMatchSlot[]
}

export interface BracketTreeData {
  readonly rounds: readonly BracketRoundData[]
}

export type BracketMatchWinnerSide = "home" | "away" | null

/**
 * 매치 슬롯의 승자 쪽(home/away)을 판정하는 순수 함수. 우선순위: 명시적
 * `winnerTeamId` → 정규 스코어 비교 → 동점이고 승부차기를 치렀다면 승부차기 스코어
 * 비교. 어느 것으로도 가릴 수 없으면(TBD, 진행 전, 데이터 없음) `null`.
 */
export function resolveBracketWinnerSide(slot: BracketMatchSlot): BracketMatchWinnerSide {
  if (slot.winnerTeamId != null) {
    if (slot.home?.teamId === slot.winnerTeamId) return "home"
    if (slot.away?.teamId === slot.winnerTeamId) return "away"
    return null
  }

  if (slot.homeScore == null || slot.awayScore == null) return null

  if (slot.homeScore > slot.awayScore) return "home"
  if (slot.awayScore > slot.homeScore) return "away"

  if (slot.wentToPenalties && slot.homePenaltyScore != null && slot.awayPenaltyScore != null) {
    if (slot.homePenaltyScore > slot.awayPenaltyScore) return "home"
    if (slot.awayPenaltyScore > slot.homePenaltyScore) return "away"
  }

  return null
}

export interface BracketColumnView {
  readonly label: string
  readonly matches: readonly BracketMatchSlot[]
}

/**
 * 표시용 컬럼 뷰로 정규화하는 순수 함수. 라운드가 하나도 없으면(빈 대진표) `null`을
 * 반환해 호출부가 empty 상태를 렌더링하게 한다.
 */
export function buildBracketColumns(data: BracketTreeData): readonly BracketColumnView[] | null {
  if (data.rounds.length === 0) return null
  return data.rounds.map((round) => ({ label: round.label, matches: round.matches }))
}

function ParticipantRow({
  locale,
  participant,
  score,
  penaltyScore,
  isWinner,
}: {
  locale: SupportedLocale
  participant: BracketParticipant | null
  score?: number | null
  penaltyScore?: number | null
  isWinner: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-2 py-1 text-sm",
        isWinner && "font-semibold text-foreground",
        !isWinner && participant && "text-muted-foreground",
      )}
    >
      <span className="min-w-0 truncate" title={participant?.name}>
        {participant ? (participant.shortName ?? participant.name) : t(locale, "match.bracket.tbd")}
      </span>
      {score != null ? (
        <span className="shrink-0 tabular-nums">
          {score}
          {penaltyScore != null ? (
            <span className="ml-1 text-xs text-muted-foreground">({penaltyScore})</span>
          ) : null}
        </span>
      ) : null}
    </div>
  )
}

export interface BracketTreeProps {
  locale: SupportedLocale
  state: CompositeViewState<BracketTreeData>
  className?: string
}

export function BracketTree({ locale, state, className }: BracketTreeProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="bracket-tree"
        data-status="loading"
        className={cn("flex gap-4 overflow-x-auto", className)}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex w-40 shrink-0 flex-col justify-around gap-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="bracket-tree"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.bracket.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="bracket-tree"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.bracket.error")}
      </p>
    )
  }

  const columns = buildBracketColumns(state.data)

  if (!columns) {
    return (
      <p
        data-slot="bracket-tree"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.bracket.empty")}
      </p>
    )
  }

  return (
    <div
      data-slot="bracket-tree"
      data-status="ready"
      className={cn("flex gap-6 overflow-x-auto pb-2", className)}
    >
      {columns.map((column, columnIndex) => (
        <div key={column.label} className="flex w-44 shrink-0 flex-col justify-around gap-4">
          <h3 className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {column.label}
          </h3>
          {column.matches.map((slot, matchIndex) => {
            const winnerSide = resolveBracketWinnerSide(slot)
            return (
              <div
                key={slot.matchId ?? `${column.label}-${matchIndex}`}
                data-slot="bracket-match"
                className={cn(
                  "divide-y divide-border rounded-lg border border-border bg-card",
                  columnIndex < columns.length - 1 && "border-r-2 border-r-primary/30",
                )}
              >
                <ParticipantRow
                  locale={locale}
                  participant={slot.home}
                  score={slot.homeScore}
                  penaltyScore={slot.homePenaltyScore}
                  isWinner={winnerSide === "home"}
                />
                <ParticipantRow
                  locale={locale}
                  participant={slot.away}
                  score={slot.awayScore}
                  penaltyScore={slot.awayPenaltyScore}
                  isWinner={winnerSide === "away"}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
