import { describe, expect, it } from "vitest";
import { clampFitness } from "./fitness";

describe("clampFitness", () => {
  it("범위 내 값은 그대로 반환한다", () => {
    expect(clampFitness(42)).toBe(42);
  });

  it("0 미만은 0으로 clamp한다", () => {
    expect(clampFitness(-10)).toBe(0);
  });

  it("100 초과는 100으로 clamp한다", () => {
    expect(clampFitness(150)).toBe(100);
  });

  it("경계값 0/100은 그대로 반환한다", () => {
    expect(clampFitness(0)).toBe(0);
    expect(clampFitness(100)).toBe(100);
  });
});
