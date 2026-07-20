import { describe, expect, it } from "vitest"

import type { PlayerAttributeHistory, PlayerId } from "@/types"
import {
  buildGrowthChartLayout,
  buildGrowthChartSeries,
  pickGrowthChartTickIndices,
} from "./GrowthChart"

// Task 013B(31일차, 5팀) — `buildGrowthChartSeries`/`buildGrowthChartLayout`/
// `pickGrowthChartTickIndices` 순수 함수 검증. `.tsx` 렌더 테스트는 PitchLineup·
// BracketTree 선례와 동일한 이유(jsdom 미설치)로 하지 않는다.

const BASE_ATTRIBUTES = {
  finishing: 15,
  passing: 15,
  crossing: 15,
  dribbling: 15,
  firstTouch: 15,
  tackling: 15,
  marking: 15,
  heading: 15,
  longShots: 15,
  setPieces: 15,
  composure: 15,
  decisions: 15,
  vision: 15,
  positioning: 15,
  workRate: 15,
  aggression: 15,
  leadership: 15,
  teamwork: 15,
  anticipation: 15,
  determination: 15,
  pace: 15,
  acceleration: 15,
  stamina: 15,
  strength: 15,
  agility: 15,
  balance: 15,
  jumping: 15,
  naturalFitness: 15,
  reflexes: 15,
  handling: 15,
  oneOnOnes: 15,
  aerialReach: 15,
  kicking: 15,
  commandOfArea: 15,
} as const

function history(seasonNumber: number, ovr: number): PlayerAttributeHistory {
  return {
    ...BASE_ATTRIBUTES,
    playerId: "player-1" as PlayerId,
    seasonNumber,
    ovr,
  }
}

describe("GrowthChart / buildGrowthChartSeries", () => {
  it("이력이 없으면(신인) null", () => {
    expect(buildGrowthChartSeries([])).toBeNull()
  })

  it("시즌 오름차순으로 정렬한다(원본 순서가 뒤섞여 있어도)", () => {
    const series = buildGrowthChartSeries([history(3, 18), history(1, 12), history(2, 15)])
    expect(series).toEqual([
      { seasonNumber: 1, ovr: 12 },
      { seasonNumber: 2, ovr: 15 },
      { seasonNumber: 3, ovr: 18 },
    ])
  })

  it("원본 배열을 변경하지 않는다", () => {
    const input = [history(2, 15), history(1, 12)]
    const original = [...input]
    buildGrowthChartSeries(input)
    expect(input).toEqual(original)
  })
})

describe("GrowthChart / buildGrowthChartLayout", () => {
  it("OVR 값이 전 구간 동일하면 ±1 인위 여유를 둔다(평평한 선 방지)", () => {
    const layout = buildGrowthChartLayout([
      { seasonNumber: 1, ovr: 15 },
      { seasonNumber: 2, ovr: 15 },
    ])
    expect(layout.minOvr).toBe(14)
    expect(layout.maxOvr).toBe(16)
  })

  it("점이 하나뿐이면 x축 중앙에 배치한다", () => {
    const layout = buildGrowthChartLayout([{ seasonNumber: 1, ovr: 15 }])
    expect(layout.points).toHaveLength(1)
    expect(layout.points[0].x).toBeGreaterThan(0)
  })

  it("모든 점의 y좌표가 유효 범위(0~뷰박스 높이) 안에 있다", () => {
    const layout = buildGrowthChartLayout([
      { seasonNumber: 1, ovr: 5 },
      { seasonNumber: 2, ovr: 20 },
      { seasonNumber: 3, ovr: 12 },
    ])
    for (const point of layout.points) {
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(160)
    }
  })

  it("OVR이 클수록 y좌표가 작다(위로 그려진다)", () => {
    const layout = buildGrowthChartLayout([
      { seasonNumber: 1, ovr: 5 },
      { seasonNumber: 2, ovr: 20 },
    ])
    expect(layout.points[1].y).toBeLessThan(layout.points[0].y)
  })

  it("polylinePoints는 각 점의 좌표를 공백으로 이어붙인다", () => {
    const layout = buildGrowthChartLayout([
      { seasonNumber: 1, ovr: 10 },
      { seasonNumber: 2, ovr: 20 },
    ])
    const expected = layout.points.map((p) => `${p.x},${p.y}`).join(" ")
    expect(layout.polylinePoints).toBe(expected)
  })
})

describe("GrowthChart / pickGrowthChartTickIndices", () => {
  it("점 개수가 0이면 빈 배열", () => {
    expect(pickGrowthChartTickIndices(0)).toEqual([])
  })

  it("점 개수가 maxTicks 이하면 전부 반환한다", () => {
    expect(pickGrowthChartTickIndices(4, 6)).toEqual([0, 1, 2, 3])
  })

  it("점 개수가 많으면 최대 maxTicks개로 등간격 추출하고 첫/마지막을 포함한다", () => {
    const indices = pickGrowthChartTickIndices(20, 6)
    expect(indices.length).toBeLessThanOrEqual(6)
    expect(indices[0]).toBe(0)
    expect(indices[indices.length - 1]).toBe(19)
  })
})
