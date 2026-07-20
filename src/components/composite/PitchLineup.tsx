import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { t } from "@/i18n/t"
import type { SupportedLocale } from "@/i18n/locales"
import type { Formation, PlayerId, Position } from "@/types"
import type { CompositeViewState } from "./types"

// Task 013B(29일차, 5팀) — 피치 뷰 라인업. FR-MT-002 7종 포메이션 대응.
//
// `Formation`(src/types/enums.ts)은 "값 목록은 추후 확정" 상태의 `string`이라(6일차
// 주석), 도메인 타입에는 7종 리터럴이 없다 — 그 값을 여기서 다시 선언하면 C-5/C-6
// 위반이므로, `Formation`은 그대로 prop 타입에 쓰고 **로컬 UI 상수**로만 7종 좌표
// 배치표(`FORMATION_LAYOUTS`)를 둔다. 도메인 enum이 확정되면 이 상수의 키만 맞춰주면
// 되고 타입 자체는 바뀌지 않는다.
//
// `Position`(11종: GK/CB/LB/RB/DM/CM/AM/LW/RW/ST/SS)에는 전용 "측면 미드필더" 코드가
// 없다 — 4-4-2·4-5-1의 측면 미드필더, 3-5-2·5-3-2의 윙백은 부득이 `LW`/`RW`·`LB`/`RB`를
// 재사용해 좌표만 그 라인에 맞게 조정했다(이슈 후보로 보고, ISSUES.md 반영은 1팀 몫).
//
// 좌표계: x=0(자기 골라인)~100(상대 골라인), y=0(터치라인 상단)~100(터치라인 하단).
// `resolvePitchSlots`는 React/DOM에 의존하지 않는 순수 함수로 분리했다 — 이 프로젝트엔
// `@testing-library/react` + jsdom이 아직 설치돼 있지 않아(vitest.config.ts 15일차
// 주석 ⓑ) `.tsx` 렌더 테스트가 불가능하다. 7종 포메이션 렌더 커버리지는 이 함수를
// `.test.ts`(런타임 include 대상)로 검증한다.

export type PitchFormationCode =
  | "4-4-2"
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "3-4-3"
  | "4-5-1"
  | "5-3-2"

interface PitchSlotLayout {
  readonly position: Position
  readonly x: number
  readonly y: number
}

const FORMATION_LAYOUTS: Readonly<Record<PitchFormationCode, readonly PitchSlotLayout[]>> = {
  "4-4-2": [
    { position: "GK", x: 6, y: 50 },
    { position: "LB", x: 20, y: 14 },
    { position: "CB", x: 20, y: 38 },
    { position: "CB", x: 20, y: 62 },
    { position: "RB", x: 20, y: 86 },
    { position: "LW", x: 46, y: 14 },
    { position: "CM", x: 46, y: 38 },
    { position: "CM", x: 46, y: 62 },
    { position: "RW", x: 46, y: 86 },
    { position: "ST", x: 76, y: 38 },
    { position: "ST", x: 76, y: 62 },
  ],
  "4-3-3": [
    { position: "GK", x: 6, y: 50 },
    { position: "LB", x: 20, y: 14 },
    { position: "CB", x: 20, y: 38 },
    { position: "CB", x: 20, y: 62 },
    { position: "RB", x: 20, y: 86 },
    { position: "DM", x: 40, y: 50 },
    { position: "CM", x: 52, y: 30 },
    { position: "CM", x: 52, y: 70 },
    { position: "LW", x: 78, y: 14 },
    { position: "ST", x: 84, y: 50 },
    { position: "RW", x: 78, y: 86 },
  ],
  "4-2-3-1": [
    { position: "GK", x: 6, y: 50 },
    { position: "LB", x: 20, y: 14 },
    { position: "CB", x: 20, y: 38 },
    { position: "CB", x: 20, y: 62 },
    { position: "RB", x: 20, y: 86 },
    { position: "DM", x: 36, y: 38 },
    { position: "DM", x: 36, y: 62 },
    { position: "LW", x: 58, y: 16 },
    { position: "AM", x: 58, y: 50 },
    { position: "RW", x: 58, y: 84 },
    { position: "ST", x: 84, y: 50 },
  ],
  "3-5-2": [
    { position: "GK", x: 6, y: 50 },
    { position: "CB", x: 20, y: 26 },
    { position: "CB", x: 20, y: 50 },
    { position: "CB", x: 20, y: 74 },
    { position: "LB", x: 40, y: 10 },
    { position: "DM", x: 40, y: 50 },
    { position: "CM", x: 50, y: 32 },
    { position: "CM", x: 50, y: 68 },
    { position: "RB", x: 40, y: 90 },
    { position: "ST", x: 78, y: 38 },
    { position: "ST", x: 78, y: 62 },
  ],
  "3-4-3": [
    { position: "GK", x: 6, y: 50 },
    { position: "CB", x: 20, y: 26 },
    { position: "CB", x: 20, y: 50 },
    { position: "CB", x: 20, y: 74 },
    { position: "LB", x: 42, y: 12 },
    { position: "CM", x: 48, y: 38 },
    { position: "CM", x: 48, y: 62 },
    { position: "RB", x: 42, y: 88 },
    { position: "LW", x: 78, y: 14 },
    { position: "ST", x: 86, y: 50 },
    { position: "RW", x: 78, y: 86 },
  ],
  "4-5-1": [
    { position: "GK", x: 6, y: 50 },
    { position: "LB", x: 20, y: 14 },
    { position: "CB", x: 20, y: 38 },
    { position: "CB", x: 20, y: 62 },
    { position: "RB", x: 20, y: 86 },
    { position: "LW", x: 52, y: 10 },
    { position: "DM", x: 38, y: 30 },
    { position: "CM", x: 44, y: 50 },
    { position: "AM", x: 38, y: 70 },
    { position: "RW", x: 52, y: 90 },
    { position: "ST", x: 84, y: 50 },
  ],
  "5-3-2": [
    { position: "GK", x: 6, y: 50 },
    { position: "CB", x: 20, y: 26 },
    { position: "CB", x: 20, y: 50 },
    { position: "CB", x: 20, y: 74 },
    { position: "LB", x: 28, y: 10 },
    { position: "RB", x: 28, y: 90 },
    { position: "DM", x: 44, y: 50 },
    { position: "CM", x: 52, y: 30 },
    { position: "CM", x: 52, y: 70 },
    { position: "ST", x: 80, y: 38 },
    { position: "ST", x: 80, y: 62 },
  ],
} as const

/** UI가 대응하는 포메이션 코드 7종 (좌표표 키 = 단일 소스). */
export const PITCH_FORMATION_CODES = Object.keys(FORMATION_LAYOUTS) as readonly PitchFormationCode[]

function isPitchFormationCode(formation: string): formation is PitchFormationCode {
  return Object.prototype.hasOwnProperty.call(FORMATION_LAYOUTS, formation)
}

export interface PitchLineupPlayer {
  readonly playerId: PlayerId
  readonly name: string
  readonly isCaptain?: boolean
}

export interface PitchLineupData {
  readonly formation: Formation
  readonly teamName?: string | null
  /** 선발 11명. `FORMATION_LAYOUTS[formation]`의 슬롯 순서(GK→수비→미드필더→공격,
   * 각 라인 내 좌→우)와 같은 순서로 전달돼야 인덱스로 짝지어진다. */
  readonly players: readonly PitchLineupPlayer[]
}

export interface PitchLineupSlotView extends PitchSlotLayout {
  readonly player: PitchLineupPlayer | null
}

/**
 * 포메이션 코드 → 좌표 슬롯에 선수를 짝짓는 순수 함수. 알 수 없는 포메이션 코드(7종
 * 밖)면 `null`을 반환해 호출부가 방어 상태를 렌더링하게 한다.
 */
export function resolvePitchSlots(data: PitchLineupData): readonly PitchLineupSlotView[] | null {
  if (!isPitchFormationCode(data.formation)) return null
  return FORMATION_LAYOUTS[data.formation].map((slot, index) => ({
    ...slot,
    player: data.players[index] ?? null,
  }))
}

export interface PitchLineupProps {
  locale: SupportedLocale
  state: CompositeViewState<PitchLineupData>
  className?: string
}

export function PitchLineup({ locale, state, className }: PitchLineupProps) {
  if (state.status === "loading") {
    return (
      <div
        data-slot="pitch-lineup"
        data-status="loading"
        className={cn("flex flex-col gap-2", className)}
      >
        <Skeleton className="h-4 w-32" />
        <Skeleton className="aspect-[3/2] w-full rounded-xl" />
      </div>
    )
  }

  if (state.status === "empty") {
    return (
      <p
        data-slot="pitch-lineup"
        data-status="empty"
        className={cn("py-2 text-sm text-muted-foreground", className)}
      >
        {t(locale, "match.lineup.empty")}
      </p>
    )
  }

  if (state.status === "error") {
    return (
      <p
        data-slot="pitch-lineup"
        data-status="error"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {state.message ?? t(locale, "match.lineup.error")}
      </p>
    )
  }

  const { data } = state
  const slots = resolvePitchSlots(data)

  if (!slots) {
    return (
      <p
        data-slot="pitch-lineup"
        data-status="unsupported"
        className={cn("py-2 text-sm text-destructive", className)}
      >
        {t(locale, "match.lineup.unsupportedFormation")}
      </p>
    )
  }

  return (
    <div data-slot="pitch-lineup" data-status="ready" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        {data.teamName ? <span className="font-medium">{data.teamName}</span> : null}
        <span className="text-muted-foreground">{data.formation}</span>
      </div>
      <div
        data-slot="pitch-lineup-field"
        className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-border bg-emerald-800/90 dark:bg-emerald-950"
      >
        <div className="pointer-events-none absolute inset-0 border-2 border-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
        {slots.map((slot, index) => (
          <div
            key={slot.player?.playerId ?? `${slot.position}-${index}`}
            data-slot="pitch-lineup-player"
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span
              title={t(locale, `enums.position.${slot.position}`)}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-foreground shadow"
            >
              {slot.position}
            </span>
            <span className="max-w-[10ch] truncate text-[10px] font-medium text-white" title={slot.player?.name}>
              {slot.player?.name ?? "—"}
              {slot.player?.isCaptain ? (
                <span title={t(locale, "match.lineup.captainLabel")}> {t(locale, "match.lineup.captainAbbr")}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
