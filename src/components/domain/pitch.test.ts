import { describe, expect, it } from "vitest";
import type { Position } from "@/types";
import { coordinatesFor, POSITION_COORDINATES } from "./pitch";

const ALL_POSITIONS: readonly Position[] = [
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
];

describe("POSITION_COORDINATES", () => {
  it("11군 전부 좌표를 갖는다", () => {
    expect(Object.keys(POSITION_COORDINATES)).toHaveLength(11);
    for (const position of ALL_POSITIONS) {
      expect(POSITION_COORDINATES[position]).toBeDefined();
    }
  });

  it("모든 좌표가 0~100(x) / 0~150(y) 범위 안에 있다", () => {
    for (const position of ALL_POSITIONS) {
      const { x, y } = POSITION_COORDINATES[position];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(150);
    }
  });
});

describe("coordinatesFor", () => {
  it("주어진 포지션의 좌표를 그대로 반환한다", () => {
    expect(coordinatesFor("GK")).toEqual(POSITION_COORDINATES.GK);
    expect(coordinatesFor("ST")).toEqual(POSITION_COORDINATES.ST);
  });
});
