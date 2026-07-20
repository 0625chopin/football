/**
 * 시즌 페이즈 상태머신 — Task 025 (28일차).
 *
 * `REGULAR ⇄ CUP_SLOT → PLAYOFF → (TIEBREAK?) → SETTLEMENT → PRESEASON → REGULAR`.
 * `TIEBREAK`는 승강 경계 동률이 발생했을 때만 거치는 조건부 페이즈다(`src/types/enums.ts`
 * `SeasonPhase` 주석 / D-27). 동률 유무 판정은 이 모듈의 책임이 아니며, 호출자가
 * `ENTER_TIEBREAK` 또는 `COMPLETE_PLAYOFF` 중 맞는 이벤트를 선택해 호출한다.
 *
 * **멱등 전이**: 이미 목표 페이즈에 도달해 있는 상태에서 같은 이벤트를 다시 호출하면
 * 아무 효과 없이 현재 페이즈를 그대로 반환한다(no-op) — 동일 전이 2회 호출 시 1회 효과.
 * 시작 페이즈도 목표 페이즈도 아닌 상태에서 호출하면 잘못된 전이로 예외를 던진다.
 *
 * NFR-DT-001: 순수 함수만 두며 `Math.random()` / `Date.now()`를 쓰지 않는다.
 */

import type { SeasonPhase } from '@/types';

export type SeasonPhaseEvent =
  | 'ENTER_CUP_SLOT'
  | 'EXIT_CUP_SLOT'
  | 'END_REGULAR_SEASON'
  | 'ENTER_TIEBREAK'
  | 'RESOLVE_TIEBREAK'
  | 'COMPLETE_PLAYOFF'
  | 'COMPLETE_SETTLEMENT'
  | 'START_NEW_SEASON';

interface PhaseTransition {
  readonly from: SeasonPhase;
  readonly to: SeasonPhase;
}

const TRANSITIONS: Readonly<Record<SeasonPhaseEvent, PhaseTransition>> = {
  ENTER_CUP_SLOT: { from: 'REGULAR', to: 'CUP_SLOT' },
  EXIT_CUP_SLOT: { from: 'CUP_SLOT', to: 'REGULAR' },
  END_REGULAR_SEASON: { from: 'REGULAR', to: 'PLAYOFF' },
  ENTER_TIEBREAK: { from: 'PLAYOFF', to: 'TIEBREAK' },
  RESOLVE_TIEBREAK: { from: 'TIEBREAK', to: 'SETTLEMENT' },
  COMPLETE_PLAYOFF: { from: 'PLAYOFF', to: 'SETTLEMENT' },
  COMPLETE_SETTLEMENT: { from: 'SETTLEMENT', to: 'PRESEASON' },
  START_NEW_SEASON: { from: 'PRESEASON', to: 'REGULAR' },
};

/**
 * `phase`에 `event`를 적용한 다음 페이즈를 반환한다(순수 함수, 부작용 없음).
 *
 * - `phase`가 이미 `event`의 목표 페이즈면 그대로 반환한다(멱등 no-op).
 * - `phase`가 `event`의 시작 페이즈면 목표 페이즈로 전이한다.
 * - 그 외에는 잘못된 전이이므로 예외를 던진다.
 */
export function transitionSeasonPhase(
  phase: SeasonPhase,
  event: SeasonPhaseEvent,
): SeasonPhase {
  const { from, to } = TRANSITIONS[event];

  if (phase === to) {
    return phase;
  }

  if (phase !== from) {
    throw new Error(
      `transitionSeasonPhase: '${event}'는 '${from}' 단계에서만 가능한데 현재 단계는 '${phase}'입니다.`,
    );
  }

  return to;
}
