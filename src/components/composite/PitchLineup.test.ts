import { describe, expect, it } from "vitest"

import type { PlayerId, Position } from "@/types"
import {
  PITCH_FORMATION_CODES,
  resolvePitchSlots,
  type PitchLineupPlayer,
} from "./PitchLineup"

// Task 013B(29일차, 5팀) — `@testing-library/react` + jsdom 미설치(vitest.config.ts
// 15일차 주석 ⓑ)라 `.tsx` 렌더 테스트 대신 순수 함수 `resolvePitchSlots`로 7종
// 포메이션 렌더(수락 기준)를 검증한다.

function makePlayers(count: number): PitchLineupPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `player-${i}` as PlayerId,
    name: `Player ${i}`,
  }))
}

describe("PitchLineup / resolvePitchSlots", () => {
  it("정확히 7종 포메이션 코드를 지원한다", () => {
    expect(PITCH_FORMATION_CODES).toHaveLength(7)
    expect(new Set(PITCH_FORMATION_CODES).size).toBe(7)
  })

  it.each(PITCH_FORMATION_CODES)("%s — GK 포함 11슬롯을 유효 좌표로 렌더한다", (formation) => {
    const slots = resolvePitchSlots({ formation, players: makePlayers(11) })

    expect(slots).not.toBeNull()
    expect(slots).toHaveLength(11)

    const goalkeepers = slots!.filter((s) => s.position === "GK")
    expect(goalkeepers).toHaveLength(1)

    for (const slot of slots!) {
      expect(slot.x).toBeGreaterThanOrEqual(0)
      expect(slot.x).toBeLessThanOrEqual(100)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      expect(slot.y).toBeLessThanOrEqual(100)
    }
  })

  it("선수 배열을 슬롯 순서(인덱스)로 짝짓는다", () => {
    const players = makePlayers(11)
    const slots = resolvePitchSlots({ formation: "4-4-2", players })

    expect(slots).not.toBeNull()
    slots!.forEach((slot, index) => {
      expect(slot.player).toBe(players[index])
    })
  })

  it("11명 미만이면 남은 슬롯은 빈 자리(null)로 둔다", () => {
    const slots = resolvePitchSlots({ formation: "3-4-3", players: makePlayers(9) })

    expect(slots).not.toBeNull()
    expect(slots!.slice(0, 9).every((s) => s.player !== null)).toBe(true)
    expect(slots!.slice(9).every((s) => s.player === null)).toBe(true)
  })

  it("7종 밖의 미확정 포메이션 문자열은 null을 반환한다(방어 상태)", () => {
    expect(resolvePitchSlots({ formation: "2-3-5", players: makePlayers(11) })).toBeNull()
    expect(resolvePitchSlots({ formation: "", players: [] })).toBeNull()
  })

  it("각 포메이션은 유효한 Position 코드만 사용한다", () => {
    const validPositions: Position[] = [
      "GK",
      "CB",
      "LB",
      "RB",
      "DM",
      "CM",
      "AM",
      "LW",
      "RW",
      "ST",
      "SS",
    ]
    for (const formation of PITCH_FORMATION_CODES) {
      const slots = resolvePitchSlots({ formation, players: [] })!
      for (const slot of slots) {
        expect(validPositions).toContain(slot.position)
      }
    }
  })
})
