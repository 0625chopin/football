import { describe, expect, it } from "vitest"

import type { TeamId } from "@/types"
import {
  buildBracketColumns,
  resolveBracketWinnerSide,
  type BracketMatchSlot,
  type BracketParticipant,
} from "./BracketTree"

// Task 013B(30일차, 5팀) — `resolveBracketWinnerSide`·`buildBracketColumns` 순수 함수
// 검증. `.tsx` 렌더 테스트는 PitchLineup 선례와 동일한 이유(jsdom 미설치)로 하지 않는다.

function team(id: string): BracketParticipant {
  return { teamId: id as TeamId, name: `Team ${id}` }
}

function baseSlot(overrides: Partial<BracketMatchSlot> = {}): BracketMatchSlot {
  return {
    home: team("A"),
    away: team("B"),
    ...overrides,
  }
}

describe("BracketTree / resolveBracketWinnerSide", () => {
  it("명시적 winnerTeamId가 있으면 그것을 우선한다", () => {
    const slot = baseSlot({ homeScore: 1, awayScore: 1, winnerTeamId: "B" as TeamId })
    expect(resolveBracketWinnerSide(slot)).toBe("away")
  })

  it("winnerTeamId가 홈/원정 어느 팀과도 매치되지 않으면 null", () => {
    const slot = baseSlot({ winnerTeamId: "C" as TeamId })
    expect(resolveBracketWinnerSide(slot)).toBeNull()
  })

  it("정규 스코어로 승자를 가린다", () => {
    expect(resolveBracketWinnerSide(baseSlot({ homeScore: 2, awayScore: 1 }))).toBe("home")
    expect(resolveBracketWinnerSide(baseSlot({ homeScore: 0, awayScore: 3 }))).toBe("away")
  })

  it("스코어가 없으면(TBD·미시작) null", () => {
    expect(resolveBracketWinnerSide(baseSlot())).toBeNull()
    expect(resolveBracketWinnerSide(baseSlot({ homeScore: 1 }))).toBeNull()
  })

  it("정규 스코어 동점 + 승부차기 미실시면 null(D-19: 합산 금지, 별도 판정)", () => {
    const slot = baseSlot({ homeScore: 1, awayScore: 1 })
    expect(resolveBracketWinnerSide(slot)).toBeNull()
  })

  it("정규 스코어 동점이고 승부차기를 치렀으면 승부차기 스코어로 가린다", () => {
    const slot = baseSlot({
      homeScore: 1,
      awayScore: 1,
      wentToPenalties: true,
      homePenaltyScore: 4,
      awayPenaltyScore: 3,
    })
    expect(resolveBracketWinnerSide(slot)).toBe("home")
  })
})

describe("BracketTree / buildBracketColumns", () => {
  it("라운드가 없으면 null(empty 상태)", () => {
    expect(buildBracketColumns({ rounds: [] })).toBeNull()
  })

  it("가변 라운드 수를 그대로 컬럼으로 반영한다(2라운드 소규모 대진표)", () => {
    const columns = buildBracketColumns({
      rounds: [
        { label: "준결승", matches: [baseSlot(), baseSlot()] },
        { label: "결승", matches: [baseSlot()] },
      ],
    })
    expect(columns).toHaveLength(2)
    expect(columns![0].matches).toHaveLength(2)
    expect(columns![1].matches).toHaveLength(1)
  })

  it("부전승 등으로 라운드 간 매치 수가 정확히 절반이 아니어도 그대로 통과시킨다", () => {
    const columns = buildBracketColumns({
      rounds: [
        { label: "1라운드", matches: [baseSlot(), baseSlot(), baseSlot()] },
        { label: "2라운드", matches: [baseSlot(), baseSlot()] },
      ],
    })
    expect(columns![0].matches).toHaveLength(3)
    expect(columns![1].matches).toHaveLength(2)
  })

  it("home/away가 null(TBD)인 슬롯도 그대로 유지한다", () => {
    const columns = buildBracketColumns({
      rounds: [{ label: "결승", matches: [{ home: null, away: null }] }],
    })
    expect(columns![0].matches[0].home).toBeNull()
    expect(columns![0].matches[0].away).toBeNull()
  })
})
