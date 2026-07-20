import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { Award, Trophy, TrophyType } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(32일차, 5팀) — 트로피 진열(TrophyCase). 013B 7종 중 마지막.
//
// **두 소비처, 한 컴포넌트.** wireframe `06-클럽상세.md` F7(클럽 상세)은 팀 트로피만
// 보여주고, `05-선수상세.md` E9(선수 상세)는 팀 트로피 + 개인 수상을 함께 보여준다
// (같은 이름 `TrophyCase`로 양쪽 문서에 명시됨). 이 차이를 컴포넌트 분기 없이
// `awards`(optional) 하나로 흡수한다 — 없으면 트로피 섹션만, 있으면 개인 수상 섹션도
// 그린다.
//
// **시즌 라벨 해석은 이 컴포넌트 책임 밖.** `Trophy.seasonId`/`Award.seasonId`는 불투명
// 브랜드 ID(`SeasonId`)라 "S3" 같은 표시 라벨로 바꾸려면 시즌 엔티티 조회가 필요하다.
// `EventTimelineItem`이 팀/선수명을 이미 해석된 문자열 prop으로 받는 선례와 동일한
// 이유로, `TrophyCaseTrophyRow`/`TrophyCaseAwardRow`는 원본 엔티티 + 이미 해석된
// `seasonLabel: string`을 함께 받는다(리스트 컨테이너/소비처가 시즌 조회 후 조립).
//
// **`TrophyType`(E-32, 4종) 카탈로그 부재.** `AwardType`(E-31, 12종)은 `enums.ts`에
// 이미 표시명 카탈로그가 있어 그대로 경유하지만, `TrophyType`은 카탈로그 자체가 없다
// (3팀 콘텐츠 소유 파일이라 이번 범위에서 신설하지 않음) — `InjuryTimeline`이
// `injuryStatus` 부재 시 로컬 키로 임시 처리했던 것과 동일한 패턴으로
// `team.trophy.type.*` 로컬 키를 쓰고 이슈 후보로 보고한다.
//
// 그룹핑(`buildTrophyCaseGroups`)은 React/DOM에 의존하지 않는 순수 함수로 분리했다 —
// PitchLineup·BracketTree·GrowthChart·InjuryTimeline 선례와 동일한 이유(jsdom 미설치)로
// `.test.ts`로 검증한다.

const TROPHY_TYPE_ORDER = [
  "LEAGUE_TITLE",
  "PLAYOFF_TITLE",
  "CUP_TITLE",
  "PROMOTION",
] as const satisfies readonly TrophyType[]

export interface TrophyCaseTrophyRow {
  readonly trophy: Trophy
  /** 시즌 표시 라벨(예: "S3"). `Trophy.seasonId` 해석은 소비처 책임(헤더 주석 참조). */
  readonly seasonLabel: string
}

export interface TrophyCaseAwardRow {
  readonly award: Award
  /** 시즌 표시 라벨(예: "S3"). `Award.seasonId` 해석은 소비처 책임(헤더 주석 참조). */
  readonly seasonLabel: string
}

export interface TrophyCaseData {
  readonly trophies: readonly TrophyCaseTrophyRow[]
  /** 없으면(undefined) 트로피 섹션만 그린다 — 클럽 상세(F7)는 트로피 전용,
   * 선수 상세(E9)는 트로피 + 개인 수상을 함께 그린다(와이어프레임 05·06 문서 근거). */
  readonly awards?: readonly TrophyCaseAwardRow[]
}

export interface TrophyCaseGroup {
  readonly type: TrophyType
  readonly count: number
  readonly seasonLabels: readonly string[]
}

/**
 * 트로피 행을 `TrophyType`별로 묶는 순수 함수. 표시 순서는 `TROPHY_TYPE_ORDER` 고정
 * 배열을 따르고(데이터 입력 순서에 좌우되지 않음), 데이터에 없는 타입은 결과에서
 * 생략한다(4종 전부를 항상 그리지 않는다 — "트로피 없음" 타입까지 빈 배지로 그리면
 * F7 empty 문구("트로피 없음")와 의미가 겹친다).
 */
export function buildTrophyCaseGroups(
  rows: readonly TrophyCaseTrophyRow[],
): readonly TrophyCaseGroup[] {
  const seasonLabelsByType = new Map<TrophyType, string[]>()
  for (const row of rows) {
    const seasonLabels = seasonLabelsByType.get(row.trophy.type) ?? []
    seasonLabels.push(row.seasonLabel)
    seasonLabelsByType.set(row.trophy.type, seasonLabels)
  }

  return TROPHY_TYPE_ORDER.filter((type) => seasonLabelsByType.has(type)).map((type) => {
    const seasonLabels = seasonLabelsByType.get(type)!
    return { type, count: seasonLabels.length, seasonLabels }
  })
}

export interface TrophyCaseProps {
  locale: SupportedLocale
  state: CompositeViewState<TrophyCaseData>
  className?: string
}

export function TrophyCase({ locale, state, className }: TrophyCaseProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="trophy-case"
        data-status="loading"
        className={cn("flex flex-wrap gap-2", className)}
      >
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-6 w-24 rounded-full" />
        ))}
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="trophy-case"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "team.trophy.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="trophy-case"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "team.trophy.error")}
      </p>
    )
  }

  const { data } = state
  const groups = buildTrophyCaseGroups(data.trophies)
  const awards = data.awards ?? []

  if (groups.length === 0 && awards.length === 0) {
    return (
      <p
        data-slot="trophy-case"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "team.trophy.empty")}
      </p>
    )
  }

  return (
    <div data-slot="trophy-case" data-status="ready" className={cn("flex flex-col gap-3", className)}>
      {groups.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <div
              key={group.type}
              data-slot="trophy-case-group"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
            >
              <span aria-hidden="true">🏆</span>
              <Badge variant="secondary">{t(locale, `team.trophy.type.${group.type}`)}</Badge>
              <span className="tabular-nums text-muted-foreground">
                {t(locale, "team.trophy.countFormat", { count: group.count })}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(locale, "team.trophy.seasonsFormat", { seasons: group.seasonLabels.join(", ") })}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {awards.length > 0 ? (
        <div data-slot="trophy-case-awards" className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t(locale, "team.trophy.awardsTitle")}
          </span>
          {awards.map((row) => (
            <div
              key={row.award.id}
              data-slot="trophy-case-award-row"
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <Badge variant="outline">{t(locale, `enums.awardType.${row.award.type}`)}</Badge>
              <span className="text-xs tabular-nums text-muted-foreground">{row.seasonLabel}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
