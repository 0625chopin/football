import { describe, expect, it } from "vitest";
import { listApplicableZones, resolveStandingZone } from "./standings-zone";

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
