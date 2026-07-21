import { describe, expect, it } from "vitest"

import type { FixtureId, MatchEvent, MatchEventId, MatchEventType, TeamId } from "@/types"
import { compareEventChronologically, deriveMatchPhase, foldMatchScore } from "./match-scoreboard"

const HOME = "team-home" as TeamId
const AWAY = "team-away" as TeamId
const MATCH = "match-1" as FixtureId

let sequenceCounter = 0

function event(type: MatchEventType, overrides: Partial<MatchEvent> = {}): MatchEvent {
  sequenceCounter += 1
  return {
    id: `event-${sequenceCounter}` as MatchEventId,
    matchId: MATCH,
    sequence: sequenceCounter,
    minute: 0,
    addedTime: 0,
    type,
    teamId: null,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: {},
    ...overrides,
  }
}

describe("foldMatchScore", () => {
  it("GOAL·PENALTY_SCORED·OWN_GOAL만 팀별로 접는다", () => {
    const events = [
      event("KICKOFF"),
      event("GOAL", { teamId: HOME }),
      event("SHOT_ON", { teamId: AWAY }),
      event("PENALTY_SCORED", { teamId: HOME }),
      event("OWN_GOAL", { teamId: AWAY }),
      event("GOAL", { teamId: AWAY }),
    ]
    expect(foldMatchScore(HOME, AWAY, events)).toEqual({ homeScore: 2, awayScore: 2 })
  })

  it("득점 이벤트가 없으면 0-0이다", () => {
    expect(foldMatchScore(HOME, AWAY, [event("KICKOFF")])).toEqual({ homeScore: 0, awayScore: 0 })
  })

  it("OWN_GOAL.teamId는 이미 수혜팀이라 반전 없이 그대로 접는다(8일차 판정)", () => {
    const events = [event("OWN_GOAL", { teamId: HOME })]
    expect(foldMatchScore(HOME, AWAY, events)).toEqual({ homeScore: 1, awayScore: 0 })
  })
})

describe("deriveMatchPhase", () => {
  it("SCHEDULED는 PRE_MATCH, FINISHED는 FULL_TIME, VOID는 VOID다 — 이벤트와 무관", () => {
    expect(deriveMatchPhase("SCHEDULED", [])).toBe("PRE_MATCH")
    expect(deriveMatchPhase("FINISHED", [event("KICKOFF")])).toBe("FULL_TIME")
    expect(deriveMatchPhase("VOID", [])).toBe("VOID")
  })

  it("LIVE 첫 이벤트가 KICKOFF면 FIRST_HALF다", () => {
    expect(deriveMatchPhase("LIVE", [event("KICKOFF")])).toBe("FIRST_HALF")
  })

  it("HALF_TIME 마커 이후엔 HALF_TIME이다", () => {
    const events = [event("KICKOFF"), event("GOAL", { teamId: "x" as TeamId }), event("HALF_TIME")]
    expect(deriveMatchPhase("LIVE", events)).toBe("HALF_TIME")
  })

  it("HALF_TIME 이후 비-마커 이벤트가 등장하면 SECOND_HALF로 전이한다(전용 마커 부재)", () => {
    const events = [event("KICKOFF"), event("HALF_TIME"), event("GOAL", { teamId: HOME })]
    expect(deriveMatchPhase("LIVE", events)).toBe("SECOND_HALF")
  })

  it("EXTRA_TIME_START·PENALTY_SHOOTOUT 마커를 순서대로 반영한다", () => {
    const events = [
      event("KICKOFF"),
      event("HALF_TIME"),
      event("GOAL", { teamId: HOME }),
      event("EXTRA_TIME_START"),
    ]
    expect(deriveMatchPhase("LIVE", events)).toBe("EXTRA_TIME")

    const withPso = [...events, event("PENALTY_SHOOTOUT")]
    expect(deriveMatchPhase("LIVE", withPso)).toBe("PENALTY_SHOOTOUT")
  })

  it("입력 배열의 순서가 뒤섞여 있어도 sequence 기준으로 재정렬해 판정한다", () => {
    const kickoff = event("KICKOFF")
    const halfTime = event("HALF_TIME")
    const resumeGoal = event("GOAL", { teamId: HOME })
    expect(deriveMatchPhase("LIVE", [resumeGoal, kickoff, halfTime])).toBe("SECOND_HALF")
  })

  it("LIVE인데 마커 이벤트가 아직 하나도 없으면 PRE_MATCH다(컷오프 직후 첫 틱)", () => {
    expect(deriveMatchPhase("LIVE", [])).toBe("PRE_MATCH")
  })
})

describe("compareEventChronologically", () => {
  it("E-3: 45+2는 46'보다 앞이다(추가시간을 정규 분에 더해서 접지 않음)", () => {
    const stoppage = event("SHOT_ON", { minute: 45, addedTime: 2 })
    const nextMinute = event("SHOT_ON", { minute: 46, addedTime: 0 })
    expect(compareEventChronologically(stoppage, nextMinute)).toBeLessThan(0)
    expect(compareEventChronologically(nextMinute, stoppage)).toBeGreaterThan(0)
  })

  it("같은 (minute, addedTime)이면 sequence로 타이브레이크한다", () => {
    const first = event("KICKOFF", { minute: 10, addedTime: 0 })
    const second = event("GOAL", { minute: 10, addedTime: 0 })
    expect(compareEventChronologically(first, second)).toBeLessThan(0)
  })

  it("뒤섞인 배열을 정렬하면 (minute, addedTime) 오름차순이 된다", () => {
    const events = [
      event("SHOT_ON", { minute: 46, addedTime: 0 }),
      event("SHOT_ON", { minute: 45, addedTime: 2 }),
      event("KICKOFF", { minute: 0, addedTime: 0 }),
    ]
    const sorted = [...events].sort(compareEventChronologically)
    expect(sorted.map((e) => [e.minute, e.addedTime])).toEqual([
      [0, 0],
      [45, 2],
      [46, 0],
    ])
  })
})
