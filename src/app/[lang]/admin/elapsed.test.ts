import { describe, expect, it } from "vitest";

import { formatElapsedClock } from "./elapsed";

describe("formatElapsedClock", () => {
  it("HH:MM:SS 형태로 경과를 표기한다", () => {
    const from = "2026-07-22T00:00:00.000Z";
    const now = new Date(from).getTime() + (3 * 3600 + 14 * 60 + 2) * 1000;
    expect(formatElapsedClock(from, now)).toBe("03:14:02");
  });

  it("음수 경과(시계 역행 등)는 0으로 바닥 처리한다", () => {
    const from = "2026-07-22T00:10:00.000Z";
    const now = new Date(from).getTime() - 5000;
    expect(formatElapsedClock(from, now)).toBe("00:00:00");
  });
});
