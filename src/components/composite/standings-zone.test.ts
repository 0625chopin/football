import { describe, expect, it } from "vitest";
import { isZoneBoundaryAdjacent, listApplicableZones, resolveStandingZone } from "./standings-zone";

const LEAGUE_1 = { tier: 1, teamCount: 24, promotionSlots: 3, relegationSlots: 3, playoffTeamCount: 10 };
const LEAGUE_2 = { tier: 2, teamCount: 20, promotionSlots: 3, relegationSlots: 3, playoffTeamCount: 4 };
const LEAGUE_3 = { tier: 3, teamCount: 16, promotionSlots: 3, relegationSlots: 3, playoffTeamCount: 2 };

describe("resolveStandingZone", () => {
  it("리그1(최상위)은 1~3위도 플레이오프일 뿐 승격 없음", () => {
    expect(resolveStandingZone(1, LEAGUE_1)).toBe("PLAYOFF");
    expect(resolveStandingZone(10, LEAGUE_1)).toBe("PLAYOFF");
    expect(resolveStandingZone(11, LEAGUE_1)).toBe("NEUTRAL");
  });

  it("리그1 하위 3팀은 강등", () => {
    expect(resolveStandingZone(22, LEAGUE_1)).toBe("RELEGATION");
    expect(resolveStandingZone(24, LEAGUE_1)).toBe("RELEGATION");
  });

  it("리그2는 1~3위가 승격+플레이오프 중첩, 4위는 플레이오프만", () => {
    expect(resolveStandingZone(1, LEAGUE_2)).toBe("PROMOTION_PLAYOFF");
    expect(resolveStandingZone(3, LEAGUE_2)).toBe("PROMOTION_PLAYOFF");
    expect(resolveStandingZone(4, LEAGUE_2)).toBe("PLAYOFF");
    expect(resolveStandingZone(5, LEAGUE_2)).toBe("NEUTRAL");
  });

  it("리그2 하위 3팀은 강등", () => {
    expect(resolveStandingZone(18, LEAGUE_2)).toBe("RELEGATION");
    expect(resolveStandingZone(20, LEAGUE_2)).toBe("RELEGATION");
  });

  it("리그3(최하위)은 1~2위 승격+플레이오프 중첩, 3위는 승격만, 강등 없음", () => {
    expect(resolveStandingZone(1, LEAGUE_3)).toBe("PROMOTION_PLAYOFF");
    expect(resolveStandingZone(2, LEAGUE_3)).toBe("PROMOTION_PLAYOFF");
    expect(resolveStandingZone(3, LEAGUE_3)).toBe("PROMOTION");
    expect(resolveStandingZone(16, LEAGUE_3)).toBe("NEUTRAL");
  });
});

describe("listApplicableZones", () => {
  it("리그1은 승격 없이 플레이오프+강등만", () => {
    expect(listApplicableZones(LEAGUE_1)).toEqual(["PLAYOFF", "RELEGATION"]);
  });

  it("리그2는 승격+플레이오프+강등 전부", () => {
    expect(listApplicableZones(LEAGUE_2)).toEqual(["PROMOTION", "PLAYOFF", "RELEGATION"]);
  });

  it("리그3은 강등 없이 승격+플레이오프만", () => {
    expect(listApplicableZones(LEAGUE_3)).toEqual(["PROMOTION", "PLAYOFF"]);
  });
});

// 41일차(Task 016, 5팀) — B4 노이즈 스코프 판단(40일차 인계). `standings-zone.ts` 상단
// 주석 참조: "전량 나열" 대신 "블록이 존 경계를 걸치거나 인접할 때만" 노출한다.
describe("isZoneBoundaryAdjacent", () => {
  it("순수 중위권 동률(어느 경계에도 안 닿음)은 노이즈로 제외한다", () => {
    // 리그1: PLAYOFF 1~10 / NEUTRAL 11~21 / RELEGATION 22~24 — 15·16위는 양쪽 다 NEUTRAL.
    expect(isZoneBoundaryAdjacent([15, 16], LEAGUE_1)).toBe(false);
  });

  it("존 내부 동률(같은 존 안, 경계와 무관)도 제외한다 — 플레이오프 3·4위", () => {
    expect(isZoneBoundaryAdjacent([3, 4], LEAGUE_1)).toBe(false);
  });

  it("블록이 존 경계를 내부에 걸치면(예: 10·11위) 노출한다", () => {
    expect(isZoneBoundaryAdjacent([10, 11], LEAGUE_1)).toBe(true);
  });

  it("블록이 존 경계 바로 아래에 붙으면(플레이오프 컷 직후 11위) 노출한다", () => {
    expect(isZoneBoundaryAdjacent([11, 12], LEAGUE_1)).toBe(true);
  });

  it("블록이 강등권 경계 바로 위에 붙으면(21·22위) 노출한다", () => {
    expect(isZoneBoundaryAdjacent([21, 22], LEAGUE_1)).toBe(true);
  });

  it("리그 최상위(1위, 위쪽 이웃 없음)는 아래쪽만으로 판정한다", () => {
    expect(isZoneBoundaryAdjacent([1, 2], LEAGUE_1)).toBe(false);
  });

  it("빈 배열은 false", () => {
    expect(isZoneBoundaryAdjacent([], LEAGUE_1)).toBe(false);
  });
});
