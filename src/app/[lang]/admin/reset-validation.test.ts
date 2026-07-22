import { describe, expect, it } from "vitest";

import { WORLD_RESET_CONFIRMATION_WORD, isWorldResetConfirmValid } from "./reset-validation";

describe("isWorldResetConfirmValid (G5 RS-2)", () => {
  it("사유와 정확한 확인 문구가 모두 있어야 통과한다", () => {
    expect(isWorldResetConfirmValid("사유", WORLD_RESET_CONFIRMATION_WORD)).toBe(true);
  });

  it("사유가 공백뿐이면 거부한다", () => {
    expect(isWorldResetConfirmValid("   ", WORLD_RESET_CONFIRMATION_WORD)).toBe(false);
    expect(isWorldResetConfirmValid("", WORLD_RESET_CONFIRMATION_WORD)).toBe(false);
  });

  it("확인 문구가 대소문자·부분 일치라도 정확히 같지 않으면 거부한다(오타 방지, RS-1)", () => {
    expect(isWorldResetConfirmValid("사유", "reset")).toBe(false);
    expect(isWorldResetConfirmValid("사유", "RESET ")).toBe(false);
    expect(isWorldResetConfirmValid("사유", "RESETS")).toBe(false);
  });
});
