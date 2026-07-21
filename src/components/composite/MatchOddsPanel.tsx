import { t } from "@/i18n/t"
import type { TranslationKey } from "@/i18n/keys"
import type { SupportedLocale } from "@/i18n/locales"
import type { OddsDisplayPanel, OddsSelectionDisplay } from "@/lib/odds/display"
import { OddsButton } from "@/components/state/OddsButton"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { CompositeViewState } from "./types"

// Task 017(46일차, 5팀) — D7 배당 패널(`docs/wireframe/04-경기상세-라이브중계.md` §4 D7).
//
// ## 3팀 H-19 소비 — `OddsDisplayPanel`을 재선언하지 않고 그대로 받는다
// "배당 산출 엔진 반환 타입"(H-19, `src/lib/odds/display.ts` 34일차 산출물)이 이미
// `format`/`bettingEnabled: false`/`selections`을 갖춘 표시 전용 계약이다. 이 컴포넌트의
// ready 데이터 타입을 그 타입 그대로 재사용해(로컬 `XxxData` 재발명 없음) 엔진 쪽 계약이
// 바뀌면 이 파일도 타입 오류로 즉시 드러나게 한다.
//
// ## 실제 배당 산출은 아직 이 화면에 연결되지 않았다 (안내 — 재구현 아님)
// `src/lib/data/DataSource.ts`에 대진별 배당을 조회하는 메서드가 아직 없다(3팀 배당 엔진은
// 몬테카를로 프리시뮬 호출기까지만 34일차 완료했고, 결과의 영속·서빙 배선은 039/62일차
// 소관). 그래서 호출부(`matches/[matchId]/page.tsx`)는 오늘 항상 `empty` 상태를 내려보낸다
// — `getMatchTeamStats`가 항상 빈 배열을 반환해 D5가 `empty`로 떨어지는 것과 동일한
// "데이터 계층 미구현" 패턴이다(45일차 주석 참조). 실제 배당이 연결되면 이 컴포넌트 자체는
// 수정할 필요가 없다 — 호출부가 `status: "ready"`로 데이터만 채워 넣으면 된다.
//
// ## 버튼은 새로 만들지 않는다 — `OddsButton`(4팀 013A, `state/`) 그대로 조합
// "배팅 버튼은 반드시 비활성"(FR-BT-014)을 물리적으로 강제하는 컴포넌트가 이미 있다 —
// `onClick`류 prop 자체가 없어 소비처가 실수로도 인터랙션을 붙일 수 없다(그 파일 주석).
// 이 패널은 셀렉션 3건을 그 버튼으로 나열하고, I-9(보조텍스트 `match.odds.disabledHint`)가
// 요구하는 안내 문구를 버튼 아래 별도 텍스트로 추가하는 조립만 담당한다.

const CONTAINER_CLASS = "flex flex-col gap-3 rounded-lg border border-border bg-card p-4"

/** 1X2 셀렉션 키(`MatchOutcomeKey` — HOME/DRAW/AWAY) → 라벨 번역키. `OddsSelectionDisplay.key`는
 * `SelectionKey`(string)로 넓혀져 있어(2차 이후 다른 마켓 재사용 대비), 알려진 키만 라벨을
 * 매핑하고 미지 키는 원시 값을 그대로 보여준다(값을 지어내지 않는다). */
const MATCH_SELECTION_LABEL_KEY: Readonly<Record<string, TranslationKey>> = {
  HOME: "match.odds.homeWinLabel",
  DRAW: "match.odds.drawLabel",
  AWAY: "match.odds.awayWinLabel",
}

export type MatchOddsPanelData = OddsDisplayPanel

export interface MatchOddsPanelProps {
  readonly locale: SupportedLocale
  readonly state: CompositeViewState<MatchOddsPanelData>
  readonly className?: string
}

export function MatchOddsPanel({ locale, state, className }: MatchOddsPanelProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="match-odds-panel"
        data-status="loading"
        aria-hidden="true"
        className={cn(CONTAINER_CLASS, className)}
      >
        <div className="flex gap-2">
          <Skeleton className="h-16 w-20" />
          <Skeleton className="h-16 w-20" />
          <Skeleton className="h-16 w-20" />
        </div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <p
        role="alert"
        data-slot="match-odds-panel"
        data-status="error"
        className={cn("p-4 text-center text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.odds.error")}
      </p>
    )
  }

  if (state.status === "empty" || state.data.selections.length === 0) {
    return (
      <p
        data-slot="match-odds-panel"
        data-status="empty"
        className={cn("p-4 text-center text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.odds.empty")}
      </p>
    )
  }

  const { data } = state

  return (
    <div data-slot="match-odds-panel" data-status="ready" className={cn(CONTAINER_CLASS, className)}>
      <div className="flex flex-wrap gap-2">
        {data.selections.map((selection: OddsSelectionDisplay) => (
          <OddsButton
            key={selection.key}
            locale={locale}
            selection={{ label: t(locale, MATCH_SELECTION_LABEL_KEY[selection.key] ?? "match.odds.otherLabel") }}
            odds={{ decimalOdds: selection.decimalOdds }}
          />
        ))}
      </div>

      {/* I-9 — 배당 버튼은 비활성·반응 없음이라 별도 보조텍스트로 사유를 알린다. */}
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden>ⓘ</span>
        {t(locale, "match.odds.disabledHint")}
      </p>
    </div>
  )
}
