import { describe, expect, it } from "vitest"

import type { FixtureId, Injury, InjuryId, PlayerId, SeasonId } from "@/types"
import {
  buildInjuryTimelineDomain,
  buildInjuryTimelineRows,
  computeInjuryBarX,
  sortInjuriesByOccurredRound,
} from "./InjuryTimeline"

// Task 013B(31일차, 5팀) — `sortInjuriesByOccurredRound`/`buildInjuryTimelineRows`/
// `buildInjuryTimelineDomain`/`computeInjuryBarX` 순수 함수 검증. `.tsx` 렌더 테스트는
// PitchLineup·BracketTree·GrowthChart 선례와 동일한 이유(jsdom 미설치)로 하지 않는다.

function injury(overrides: Partial<Injury> = {}): Injury {
  return {
    id: "injury-1" as InjuryId,
    playerId: "player-1" as PlayerId,
    matchId: null as FixtureId | null,
    seasonId: "season-1" as SeasonId,
    severity: "MINOR",
    typeLabel: "햄스트링 염좌",
    occurredRound: 5,
    roundsOut: 3,
    returnRound: 8,
    status: "RECOVERED",
    ...overrides,
  }
}

describe("InjuryTimeline / sortInjuriesByOccurredRound", () => {
  it("발생 라운드 오름차순으로 정렬한다", () => {
    const sorted = sortInjuriesByOccurredRound([
      injury({ id: "b" as InjuryId, occurredRound: 10 }),
      injury({ id: "a" as InjuryId, occurredRound: 2 }),
    ])
    expect(sorted.map((i) => i.id)).toEqual(["a", "b"])
  })

  it("원본 배열을 변경하지 않는다", () => {
    const input = [injury({ occurredRound: 10 }), injury({ occurredRound: 2 })]
    const original = [...input]
    sortInjuriesByOccurredRound(input)
    expect(input).toEqual(original)
  })
})

describe("InjuryTimeline / buildInjuryTimelineRows", () => {
  it("부상 기록이 없으면 null(empty 상태)", () => {
    expect(buildInjuryTimelineRows({ injuries: [] })).toBeNull()
  })

  it("startRound/endRound를 occurredRound/returnRound로 채운다", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 5, returnRound: 8 })],
    })
    expect(rows).toEqual([expect.objectContaining({ startRound: 5, endRound: 8 })])
  })

  it("returnRound가 occurredRound보다 앞서는 이상 데이터는 occurredRound로 clamp한다", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 5, returnRound: 3 })],
    })
    expect(rows![0].endRound).toBe(5)
  })
})

describe("InjuryTimeline / buildInjuryTimelineDomain", () => {
  it("totalRounds가 없으면 데이터 최대 라운드를 상한으로 쓴다", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 5, returnRound: 8 })],
    })!
    expect(buildInjuryTimelineDomain(rows)).toEqual({ minRound: 1, maxRound: 8 })
  })

  it("totalRounds가 데이터 최대 라운드보다 크면 그것을 상한으로 쓴다", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 5, returnRound: 8 })],
    })!
    expect(buildInjuryTimelineDomain(rows, 38).maxRound).toBe(38)
  })

  it("totalRounds가 데이터 최대 라운드보다 작아도 데이터 쪽을 상한으로 쓴다(라운드 누락 방지)", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 30, returnRound: 40 })],
    })!
    expect(buildInjuryTimelineDomain(rows, 38).maxRound).toBe(40)
  })

  it("최솟값은 1과 데이터 중 더 작은 쪽을 취한다", () => {
    const rows = buildInjuryTimelineRows({
      injuries: [injury({ occurredRound: 0, returnRound: 2 })],
    })!
    expect(buildInjuryTimelineDomain(rows).minRound).toBe(0)
  })
})

describe("InjuryTimeline / computeInjuryBarX", () => {
  it("최솟값 라운드는 x=0", () => {
    const domain = { minRound: 1, maxRound: 38 }
    expect(computeInjuryBarX(1, domain, 400)).toBe(0)
  })

  it("최댓값 라운드는 x=trackWidth", () => {
    const domain = { minRound: 1, maxRound: 38 }
    expect(computeInjuryBarX(38, domain, 400)).toBe(400)
  })

  it("중간 라운드는 비례한 위치를 반환한다", () => {
    const domain = { minRound: 0, maxRound: 10 }
    expect(computeInjuryBarX(5, domain, 100)).toBe(50)
  })
})
