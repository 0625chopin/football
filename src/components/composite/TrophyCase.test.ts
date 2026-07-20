import { describe, expect, it } from "vitest"

import type { LeagueId, SeasonId, TeamId, Trophy, TrophyId } from "@/types"
import { buildTrophyCaseGroups } from "./TrophyCase"
import type { TrophyCaseTrophyRow } from "./TrophyCase"

// Task 013B(32일차, 5팀) — `buildTrophyCaseGroups` 순수 함수 검증. `.tsx` 렌더 테스트는
// PitchLineup·BracketTree·GrowthChart·InjuryTimeline 선례와 동일한 이유(jsdom 미설치)로
// 하지 않는다.

function trophyRow(overrides: Partial<Trophy> = {}): TrophyCaseTrophyRow {
  return {
    trophy: {
      id: "trophy-1" as TrophyId,
      seasonId: "season-1" as SeasonId,
      teamId: "team-1" as TeamId,
      type: "LEAGUE_TITLE",
      leagueId: "league-1" as LeagueId,
      ...overrides,
    },
    seasonLabel: "S1",
  }
}

describe("TrophyCase / buildTrophyCaseGroups", () => {
  it("빈 배열이면 빈 그룹 목록을 반환한다(empty 상태는 호출부가 판단)", () => {
    expect(buildTrophyCaseGroups([])).toEqual([])
  })

  it("같은 타입 여러 시즌을 하나의 그룹으로 묶고 카운트한다", () => {
    const rows = [
      { ...trophyRow({ type: "LEAGUE_TITLE" }), seasonLabel: "S3" },
      { ...trophyRow({ type: "LEAGUE_TITLE" }), seasonLabel: "S5" },
    ]
    expect(buildTrophyCaseGroups(rows)).toEqual([
      { type: "LEAGUE_TITLE", count: 2, seasonLabels: ["S3", "S5"] },
    ])
  })

  it("서로 다른 타입은 별도 그룹으로 나뉜다", () => {
    const rows = [
      { ...trophyRow({ type: "CUP_TITLE" }), seasonLabel: "S4" },
      { ...trophyRow({ type: "LEAGUE_TITLE" }), seasonLabel: "S3" },
    ]
    const groups = buildTrophyCaseGroups(rows)
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.type)).toEqual(["LEAGUE_TITLE", "CUP_TITLE"])
  })

  it("표시 순서는 입력 순서와 무관하게 고정 배열(LEAGUE_TITLE→PLAYOFF_TITLE→CUP_TITLE→PROMOTION)을 따른다", () => {
    const rows = [
      { ...trophyRow({ type: "PROMOTION" }), seasonLabel: "S1" },
      { ...trophyRow({ type: "CUP_TITLE" }), seasonLabel: "S2" },
      { ...trophyRow({ type: "PLAYOFF_TITLE" }), seasonLabel: "S3" },
      { ...trophyRow({ type: "LEAGUE_TITLE" }), seasonLabel: "S4" },
    ]
    const groups = buildTrophyCaseGroups(rows)
    expect(groups.map((g) => g.type)).toEqual([
      "LEAGUE_TITLE",
      "PLAYOFF_TITLE",
      "CUP_TITLE",
      "PROMOTION",
    ])
  })

  it("데이터에 없는 타입은 그룹 결과에서 생략한다(4종을 항상 그리지 않는다)", () => {
    const rows = [{ ...trophyRow({ type: "PROMOTION" }), seasonLabel: "S1" }]
    expect(buildTrophyCaseGroups(rows)).toEqual([
      { type: "PROMOTION", count: 1, seasonLabels: ["S1"] },
    ])
  })
})
