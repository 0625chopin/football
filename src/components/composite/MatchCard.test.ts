import { describe, expect, it } from "vitest"

import type { Timestamp } from "@/types"
import type { WorldClockSnapshot } from "@/lib/sim/schedule/worldclock"
import { computeElapsedMinutes } from "./MatchCard"

// Task 015(34일차, 5팀) — `computeElapsedMinutes`(H-24 `worldclock.ts` 순수 함수 조합)
// 검증. `.tsx` 렌더 테스트는 NewsItem·EventTimelineItem 선례와 동일 이유(jsdom 미설치)로
// 하지 않는다 — 이 컴포넌트가 스스로 계산하지 않는다는 계약을 지키는 이 어댑터 함수만
// 단위 검증한다(`worldclock.ts` 자체의 산출식 검증은 `worldclock.test.ts`가 이미 담당).

const T0: Timestamp = "2026-08-12T12:00:00.000Z"

function addMinutes(ts: Timestamp, minutes: number): Timestamp {
  return new Date(new Date(ts).getTime() + minutes * 60_000).toISOString()
}

function baseClock(overrides?: Partial<WorldClockSnapshot>): WorldClockSnapshot {
  return {
    speedMultiplier: 1,
    isPaused: false,
    pausedTotalMinutes: 0,
    speedChangedAt: T0,
    worldMinutesAtSpeedChange: 0,
    pausedAt: null,
    clockRevision: 0,
    ...overrides,
  }
}

describe("MatchCard / computeElapsedMinutes", () => {
  it("배속 1에서는 킥오프~조회 시각 사이의 분(分) 차이를 그대로 반환한다", () => {
    const clock = baseClock()
    const kickoffAt = addMinutes(T0, 10)
    const now = addMinutes(T0, 55)
    expect(computeElapsedMinutes(kickoffAt, clock, now)).toBe(45)
  })

  it("배속 4에서는 실시간 경과분의 4배를 반환한다(H-24 비례식)", () => {
    const clock = baseClock({ speedMultiplier: 4 })
    const kickoffAt = T0
    const now = addMinutes(T0, 10)
    expect(computeElapsedMinutes(kickoffAt, clock, now)).toBe(40)
  })

  it("소수점 결과는 반올림한다(표시용 정수 분)", () => {
    const clock = baseClock({ speedMultiplier: 3 })
    const kickoffAt = T0
    const now = addMinutes(T0, 1)
    expect(computeElapsedMinutes(kickoffAt, clock, now)).toBe(3)
  })
})
