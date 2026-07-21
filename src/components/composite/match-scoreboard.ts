import type { FixtureStatus, MatchEvent, MatchEventType, TeamId } from "@/types"

// Task 017(43일차, 5팀) — D1 스코어보드 파생값. 컴포넌트(`MatchScoreboard.tsx`)는 스스로
// 계산하지 않고 이 순수 함수들의 결과를 prop으로만 받는다(`MatchCard.computeElapsedMinutes`와
// 동일 책임 경계).

export type MatchPhase =
  | "PRE_MATCH"
  | "FIRST_HALF"
  | "HALF_TIME"
  | "SECOND_HALF"
  | "EXTRA_TIME"
  | "PENALTY_SHOOTOUT"
  | "FULL_TIME"
  | "VOID"

/** 득점으로 집계되는 이벤트 타입 — `src/lib/mock/progress.ts`의 동명 상수와 동일 규약. */
const GOAL_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set(["GOAL", "PENALTY_SCORED", "OWN_GOAL"])

/**
 * 페이즈를 직접 선언하는 마커 이벤트. `MatchEventType`(23종)에 "후반 시작" 전용 타입이
 * 없어(enums.ts), `HALF_TIME` 다음에 등장하는 비-마커 이벤트를 후반 재개 신호로 대신 쓴다
 * (아래 `deriveMatchPhase` 참조).
 */
const PHASE_MARKER_EVENT: Partial<Record<MatchEventType, MatchPhase>> = {
  KICKOFF: "FIRST_HALF",
  HALF_TIME: "HALF_TIME",
  EXTRA_TIME_START: "EXTRA_TIME",
  PENALTY_SHOOTOUT: "PENALTY_SHOOTOUT",
  FULL_TIME: "FULL_TIME",
}

export interface FoldedMatchScore {
  readonly homeScore: number
  readonly awayScore: number
}

/**
 * D1 스코어보드 표시 스코어 — 이벤트를 접어(fold) 산출한다(와이어프레임 04번 E-1: "스코어
 * 스냅샷은 이벤트에 저장되지 않는다"). `events`는 `DataSource.getMatchEvents`가 이미
 * 경과분 컷오프 이내로 좁혀 반환하므로(R-11), 이 함수는 별도 컷오프 판단 없이 넘겨받은
 * 배열 전부를 접는다 — 구조적으로 안전(별도 컷오프 처리 불필요, 위 문서 E-1 후단 참조).
 *
 * `OWN_GOAL.teamId`는 이미 수혜팀(득점 귀속팀)으로 확정돼 있어(8일차 판정, `match.ts`
 * `MatchEvent.teamId` 주석) 별도 반전 없이 다른 득점 타입과 동일하게 접는다.
 */
export function foldMatchScore(
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  events: readonly MatchEvent[],
): FoldedMatchScore {
  let homeScore = 0
  let awayScore = 0
  for (const event of events) {
    if (!GOAL_EVENT_TYPES.has(event.type)) continue
    if (event.teamId === homeTeamId) homeScore += 1
    else if (event.teamId === awayTeamId) awayScore += 1
  }
  return { homeScore, awayScore }
}

/**
 * 경기 페이즈 — `FixtureStatus`(4종)만으로는 `LIVE` 구간 내부(전반/하프타임/후반/연장/
 * 승부차기)를 구분할 수 없어 노출된 마커 이벤트를 시간순(`compareEventChronologically`)으로
 * 훑어 파생한다. 입력 배열의 정렬 여부를 신뢰하지 않고 이 함수 내부에서 다시 정렬한다
 * (순수 함수 원칙).
 */
export function deriveMatchPhase(status: FixtureStatus, events: readonly MatchEvent[]): MatchPhase {
  if (status === "VOID") return "VOID"
  if (status === "SCHEDULED") return "PRE_MATCH"
  if (status === "FINISHED") return "FULL_TIME"

  let phase: MatchPhase = "PRE_MATCH"
  for (const event of [...events].sort(compareEventChronologically)) {
    const marker = PHASE_MARKER_EVENT[event.type]
    if (marker) {
      phase = marker
    } else if (phase === "HALF_TIME") {
      phase = "SECOND_HALF"
    }
  }
  return phase
}

/**
 * 이벤트 표시 순서 — 와이어프레임 04번 E-3 복합 키 `(minute, addedTime, sequence)`.
 * `45+2'`(minute=45, addedTime=2)는 `46'`(minute=46, addedTime=0)보다 **앞선다** — 추가시간을
 * 정규 분에 더해서 접지 않는다는 규약(E-3)이 정렬에도 그대로 적용된다. 같은 `(minute,
 * addedTime)` 안에서만 `sequence`(엔진 생성 순번)로 최종 타이브레이크한다.
 */
export function compareEventChronologically(a: MatchEvent, b: MatchEvent): number {
  if (a.minute !== b.minute) return a.minute - b.minute
  if (a.addedTime !== b.addedTime) return a.addedTime - b.addedTime
  return a.sequence - b.sequence
}
