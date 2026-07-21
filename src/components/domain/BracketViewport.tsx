"use client"

import { useRef, useState } from "react"

import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import { cn } from "@/lib/utils"
import { BracketTree, type BracketTreeData } from "@/components/composite/BracketTree"
import type { DomainViewState } from "./types"

// Task 020(47일차, 4팀) — 브래킷 가로 스크롤 컨테이너에 확대/축소·모바일 라운드 페이징을
// 얹는 래퍼. `BracketTree`(5팀 013B, composite/) 자체는 손대지 않는다 — composite/**는
// 5팀 소유 경로라 여기서는 그 컴포넌트가 이미 공개한 확장점(`className` prop, `data-slot`
// 속성)만 조합한다.
//
// **왜 `BracketTree`를 감싸기만 하고 다시 구현하지 않는가**: `BracketTree`의
// `data.rounds` 가변 길이 렌더링·승부차기 분리 표기(D-19)·TBD 처리를 그대로 재사용해야
// 중복 구현이 안 생긴다. 이 파일은 순수하게 "보기 방식"(확대율·현재 라운드) 상태만 갖고,
// 승자 판정·데이터 변환 같은 도메인 로직은 전혀 갖지 않는다.
//
// **줌 구현 — `overflow-x-auto`를 두 겹으로 두지 않는다**: `BracketTree`의 루트 div는
// 이미 자체 `overflow-x-auto`를 갖는다(그 파일 R-6 준수). 여기서 또 `overflow-x-auto`
// 컨테이너로 감싸면 스크롤 컨테이너가 중첩돼 확대 시 바깥 컨테이너의 스크롤 가능 영역이
// 늘어나지 않는다. `className="w-max"`를 `BracketTree`에 내려 그 루트 박스를 콘텐츠
// 고유 너비로 맞추면(내부 스크롤이 항상 no-op) 실제 스크롤은 바깥 래퍼 한 곳에서만
// 일어난다 — CSS transform은 조상의 스크롤 가능 오버플로 계산에 포함되므로(스펙 동작),
// `scale()`을 그 사이 래퍼에 걸면 바깥 컨테이너가 확대율만큼 더/덜 스크롤된다.
//
// **모바일 라운드 페이징 — ref 없이 `data-slot` 계약으로 탐색**: `BracketTree`는 라운드
// 컬럼에 별도 ref를 노출하지 않지만, `data-slot="bracket-tree"`(루트)는 이미 그 파일이
// 선언한 공개 속성이다. 그 직계 자식(라운드 컬럼 div)을 인덱스로 골라
// `scrollIntoView()`하면 컬럼 너비 같은 내부 상수에 결합하지 않고도 라운드 단위 이동이
// 된다.
const ZOOM_LEVELS = [0.75, 0.875, 1, 1.125, 1.25, 1.5] as const
const DEFAULT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1)

export interface BracketViewportProps {
  readonly locale: SupportedLocale
  readonly state: DomainViewState<BracketTreeData>
  readonly className?: string
}

export function BracketViewport({ locale, state, className }: BracketViewportProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [roundIndex, setRoundIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (state.status !== "ready" || state.data.rounds.length === 0) {
    return <BracketTree locale={locale} state={state} className={className} />
  }

  const roundCount = state.data.rounds.length
  const zoom = ZOOM_LEVELS[zoomIndex]
  const zoomPercent = t(locale, "match.bracket.zoomLevelFormat", { percent: Math.round(zoom * 100) })

  function goToRound(nextIndex: number) {
    const clamped = Math.max(0, Math.min(roundCount - 1, nextIndex))
    setRoundIndex(clamped)
    const tree = scrollRef.current?.querySelector('[data-slot="bracket-tree"][data-status="ready"]')
    const column = tree?.children[clamped]
    if (column instanceof HTMLElement) {
      column.scrollIntoView({ inline: "start", block: "nearest", behavior: "smooth" })
    }
  }

  function zoomBy(step: number) {
    setZoomIndex((current) => Math.max(0, Math.min(ZOOM_LEVELS.length - 1, current + step)))
  }

  return (
    <div data-slot="bracket-viewport" className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label={t(locale, "match.bracket.zoomGroupLabel")}
          className="flex items-center gap-1"
        >
          <button
            type="button"
            onClick={() => zoomBy(-1)}
            disabled={zoomIndex === 0}
            aria-label={t(locale, "match.bracket.zoomOutLabel")}
            className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">{zoomPercent}</span>
          <button
            type="button"
            onClick={() => zoomBy(1)}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label={t(locale, "match.bracket.zoomInLabel")}
            className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
          {zoomIndex !== DEFAULT_ZOOM_INDEX ? (
            <button
              type="button"
              onClick={() => setZoomIndex(DEFAULT_ZOOM_INDEX)}
              className="ml-1 text-xs text-muted-foreground underline underline-offset-2"
            >
              {t(locale, "match.bracket.zoomResetLabel")}
            </button>
          ) : null}
        </div>

        {roundCount > 1 ? (
          <div
            role="group"
            aria-label={t(locale, "match.bracket.roundNavGroupLabel")}
            className="flex items-center gap-2 md:hidden"
          >
            <button
              type="button"
              onClick={() => goToRound(roundIndex - 1)}
              disabled={roundIndex === 0}
              aria-label={t(locale, "match.bracket.prevRoundLabel")}
              className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              ‹
            </button>
            <span className="eyebrow tabular-nums text-muted-foreground">
              {t(locale, "match.bracket.roundProgressFormat", { current: roundIndex + 1, total: roundCount })}
            </span>
            <button
              type="button"
              onClick={() => goToRound(roundIndex + 1)}
              disabled={roundIndex === roundCount - 1}
              aria-label={t(locale, "match.bracket.nextRoundLabel")}
              className="rounded-md border border-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>

      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <BracketTree locale={locale} state={state} className="w-max" />
        </div>
      </div>
    </div>
  )
}
