import { describe, expect, it } from "vitest";

import { computeSecondsAgo, countConsecutiveFailures, estimateNextRunAt } from "./scheduler-elapsed";
import type { CronRun } from "@/types";

function makeRun(overrides: Partial<CronRun>): CronRun {
  return {
    id: "run-1" as CronRun["id"],
    startedAt: "2026-07-22T00:00:00.000Z",
    finishedAt: "2026-07-22T00:00:00.340Z",
    durationMs: 340,
    lockAcquired: true,
    fixturesProcessed: 0,
    isCatchUp: false,
    status: "SUCCESS",
    retryCount: 0,
    errorCode: null,
    errorMessage: null,
    snapshotHash: null,
    ...overrides,
  } as CronRun;
}

describe("computeSecondsAgo", () => {
  it("초 단위 경과를 계산한다", () => {
    const from = "2026-07-22T00:00:00.000Z";
    const now = new Date(from).getTime() + 38 * 1000;
    expect(computeSecondsAgo(from, now)).toBe(38);
  });

  it("음수 경과(시계 역행 등)는 0으로 바닥 처리한다", () => {
    const from = "2026-07-22T00:10:00.000Z";
    const now = new Date(from).getTime() - 5000;
    expect(computeSecondsAgo(from, now)).toBe(0);
  });
});

describe("estimateNextRunAt", () => {
  it("마지막 실행 시작 시각 + 주기(분)를 반환한다", () => {
    const result = estimateNextRunAt("2026-07-22T00:00:00.000Z", 1);
    expect(result).toBe("2026-07-22T00:01:00.000Z");
  });

  it("마지막 실행이 없으면 null이다", () => {
    expect(estimateNextRunAt(null, 1)).toBeNull();
  });
});

describe("countConsecutiveFailures", () => {
  it("최신순 배열에서 FAILED가 끊기는 지점까지만 센다", () => {
    const runs = [
      makeRun({ status: "FAILED" }),
      makeRun({ status: "FAILED" }),
      makeRun({ status: "SUCCESS" }),
      makeRun({ status: "FAILED" }),
    ];
    expect(countConsecutiveFailures(runs)).toBe(2);
  });

  it("최신 실행이 실패가 아니면 0이다", () => {
    expect(countConsecutiveFailures([makeRun({ status: "SUCCESS" })])).toBe(0);
  });

  it("빈 배열은 0이다", () => {
    expect(countConsecutiveFailures([])).toBe(0);
  });
});
