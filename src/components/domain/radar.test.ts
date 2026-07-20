import { describe, expect, it } from "vitest";
import type { PlayerAttributeValues } from "@/types";
import { computeAxisEndpoints, computeCategoryAverages, computeRadarPoints } from "./radar";

const ATTRS: PlayerAttributeValues = {
  // 기술 10 — 평균 10
  finishing: 10,
  passing: 10,
  crossing: 10,
  dribbling: 10,
  firstTouch: 10,
  tackling: 10,
  marking: 10,
  heading: 10,
  longShots: 10,
  setPieces: 10,
  // 정신 10 — 평균 20
  composure: 20,
  decisions: 20,
  vision: 20,
  positioning: 20,
  workRate: 20,
  aggression: 20,
  leadership: 20,
  teamwork: 20,
  anticipation: 20,
  determination: 20,
  // 신체 8 — 평균 30
  pace: 30,
  acceleration: 30,
  stamina: 30,
  strength: 30,
  agility: 30,
  balance: 30,
  jumping: 30,
  naturalFitness: 30,
  // GK 6 — 평균 15
  reflexes: 15,
  handling: 15,
  oneOnOnes: 15,
  aerialReach: 15,
  kicking: 15,
  commandOfArea: 15,
};

describe("computeCategoryAverages", () => {
  it("34개 필드를 누락·중복 없이 4개 대분류 평균으로 축약한다", () => {
    expect(computeCategoryAverages(ATTRS)).toEqual({
      technical: 10,
      mental: 20,
      physical: 30,
      goalkeeping: 15,
    });
  });
});

describe("computeAxisEndpoints", () => {
  it("4축을 12시 방향에서 시계방향 90도씩 배치한다", () => {
    const layout = { cx: 0, cy: 0, maxRadius: 10, maxValue: 30 };
    const endpoints = computeAxisEndpoints(4, layout);
    expect(endpoints).toHaveLength(4);
    expect(endpoints[0].x).toBeCloseTo(0);
    expect(endpoints[0].y).toBeCloseTo(-10);
    expect(endpoints[1].x).toBeCloseTo(10);
    expect(endpoints[1].y).toBeCloseTo(0);
    expect(endpoints[2].x).toBeCloseTo(0);
    expect(endpoints[2].y).toBeCloseTo(10);
    expect(endpoints[3].x).toBeCloseTo(-10);
    expect(endpoints[3].y).toBeCloseTo(0);
  });
});

describe("computeRadarPoints", () => {
  it("값이 상한(maxValue)이면 축 끝점과 일치한다", () => {
    const layout = { cx: 0, cy: 0, maxRadius: 10, maxValue: 30 };
    const points = computeRadarPoints([30, 30, 30, 30], layout);
    const endpoints = computeAxisEndpoints(4, layout);
    points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(endpoints[i].x);
      expect(p.y).toBeCloseTo(endpoints[i].y);
    });
  });

  it("값이 0이면 중심점과 일치한다", () => {
    const layout = { cx: 5, cy: 5, maxRadius: 10, maxValue: 30 };
    const points = computeRadarPoints([0, 0, 0, 0], layout);
    points.forEach((p) => {
      expect(p.x).toBeCloseTo(5);
      expect(p.y).toBeCloseTo(5);
    });
  });

  it("상한을 초과하는 값은 clamp된다", () => {
    const layout = { cx: 0, cy: 0, maxRadius: 10, maxValue: 30 };
    const [over] = computeRadarPoints([999], { ...layout, maxValue: 30 });
    const [atMax] = computeRadarPoints([30], layout);
    expect(over.x).toBeCloseTo(atMax.x);
    expect(over.y).toBeCloseTo(atMax.y);
  });
});
