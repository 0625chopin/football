import { describe, expect, it } from "vitest";
import { createMetricsRecorder, METRIC_KINDS, type MetricsSnapshot } from "./metrics";

describe("createMetricsRecorder", () => {
  it("METRIC_KINDS는 NFR-OB-002가 요구하는 6종이다", () => {
    expect(METRIC_KINDS).toEqual([
      "simDuration",
      "roundDelay",
      "cronRun",
      "oddsComputeDuration",
      "settlement",
      "apiLatency",
    ]);
  });

  it("샘플이 없으면 6종 전부 count 0 · 나머지 필드 null(비율 필드는 null)이다", () => {
    const recorder = createMetricsRecorder({ clock: () => "T0" });
    const snapshot = recorder.snapshot();

    expect(snapshot.simDuration).toEqual({ count: 0, latestMs: null, avgMs: null, p95Ms: null });
    expect(snapshot.roundDelay).toEqual({ count: 0, latestMs: null, avgMs: null, p95Ms: null });
    expect(snapshot.oddsComputeDuration).toEqual({
      count: 0,
      latestMs: null,
      avgMs: null,
      p95Ms: null,
    });
    expect(snapshot.apiLatency).toEqual({ count: 0, latestMs: null, avgMs: null, p95Ms: null });
    expect(snapshot.cronSuccessRate).toEqual({ count: 0, successCount: 0, successRate: null });
    expect(snapshot.settlement).toEqual({
      count: 0,
      failedCount: 0,
      failureRate: null,
      avgDurationMs: null,
      p95DurationMs: null,
    });
    expect(snapshot.generatedAt).toBe("T0");
  });

  it("소요시간 계열 4종(sim/round/odds/api)은 count·최근값·평균·p95를 계산한다", () => {
    const recorder = createMetricsRecorder({ clock: () => "T" });
    for (const durationMs of [100, 200, 300, 400, 500]) {
      recorder.record({ kind: "simDuration", durationMs });
    }
    const { simDuration } = recorder.snapshot();

    expect(simDuration.count).toBe(5);
    expect(simDuration.latestMs).toBe(500);
    expect(simDuration.avgMs).toBe(300);
    // nearest-rank p95 of [100,200,300,400,500] (n=5) -> ceil(0.95*5)=5 -> index4 -> 500
    expect(simDuration.p95Ms).toBe(500);
  });

  it("크론 성공률은 성공/실패 기록 비율로 계산되고, 실패 케이스도 count에 포함된다", () => {
    const recorder = createMetricsRecorder();
    recorder.record({ kind: "cronRun", success: true });
    recorder.record({ kind: "cronRun", success: true });
    recorder.record({ kind: "cronRun", success: false });
    recorder.record({ kind: "cronRun", success: true });

    const { cronSuccessRate } = recorder.snapshot();
    expect(cronSuccessRate).toEqual({ count: 4, successCount: 3, successRate: 0.75 });
  });

  it("정산은 소요시간 통계와 실패율을 하나의 이벤트에서 함께 집계한다", () => {
    const recorder = createMetricsRecorder();
    recorder.record({ kind: "settlement", durationMs: 1000, failed: false });
    recorder.record({ kind: "settlement", durationMs: 2000, failed: true });
    recorder.record({ kind: "settlement", durationMs: 3000, failed: false });

    const { settlement } = recorder.snapshot();
    expect(settlement.count).toBe(3);
    expect(settlement.failedCount).toBe(1);
    expect(settlement.failureRate).toBeCloseTo(1 / 3);
    expect(settlement.avgDurationMs).toBe(2000);
    expect(settlement.p95DurationMs).toBe(3000);
  });

  it("종류별 최대 보관 샘플 수를 넘기면 오래된 샘플부터 버린다(링버퍼)", () => {
    const recorder = createMetricsRecorder({ maxSamplesPerKind: 3 });
    for (const durationMs of [10, 20, 30, 40]) {
      recorder.record({ kind: "apiLatency", durationMs });
    }
    const { apiLatency } = recorder.snapshot();

    // 10이 버려지고 [20,30,40]만 남는다.
    expect(apiLatency.count).toBe(3);
    expect(apiLatency.latestMs).toBe(40);
    expect(apiLatency.avgMs).toBe(30);
  });

  it("reset()은 6종 전부를 비운다", () => {
    const recorder = createMetricsRecorder();
    recorder.record({ kind: "simDuration", durationMs: 100 });
    recorder.record({ kind: "cronRun", success: true });
    recorder.record({ kind: "settlement", durationMs: 500, failed: true });

    recorder.reset();
    const snapshot = recorder.snapshot();

    expect(snapshot.simDuration.count).toBe(0);
    expect(snapshot.cronSuccessRate.count).toBe(0);
    expect(snapshot.settlement.count).toBe(0);
  });

  it("주입된 clock을 스냅샷 생성 시각(generatedAt)에 그대로 사용한다(결정론 친화적)", () => {
    let tick = 0;
    const recorder = createMetricsRecorder({ clock: () => `T${tick++}` });
    recorder.record({ kind: "roundDelay", durationMs: 50 });
    const snapshot: MetricsSnapshot = recorder.snapshot();
    expect(snapshot.generatedAt.startsWith("T")).toBe(true);
  });

  it("correlation은 선택 인자이며 넘기지 않아도 기록에 실패하지 않는다", () => {
    const recorder = createMetricsRecorder();
    expect(() =>
      recorder.record({ kind: "oddsComputeDuration", durationMs: 42 }),
    ).not.toThrow();
    expect(() =>
      recorder.record(
        { kind: "oddsComputeDuration", durationMs: 43 },
        { season: "2026" },
      ),
    ).not.toThrow();
  });
});
