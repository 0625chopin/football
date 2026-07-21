import { describe, expect, it } from "vitest";
import {
  computeSystemHealth,
  createAlertHistory,
  createFallbackWarnRecorder,
  detectBankruptcyExceeded,
  detectRoundMissed,
  detectSettlementFailure,
  detectSimDelay,
  evaluateAlerts,
  isCronStalled,
  type AlertEvent,
  type CronHeartbeat,
} from "./alert";
import type { Kpi8Report } from "./balance-report";
import type { MetricsSnapshot } from "./metrics";

const FIXED_CLOCK = () => "T-FIXED";

function heartbeat(overrides: Partial<CronHeartbeat> = {}): CronHeartbeat {
  return {
    lastSuccessAt: "2026-09-16T00:00:00.000Z",
    now: "2026-09-16T00:05:00.000Z",
    expectedIntervalMin: 1,
    gapMultiplier: 3,
    ...overrides,
  };
}

function metricsSnapshot(overrides: Partial<MetricsSnapshot> = {}): MetricsSnapshot {
  return {
    simDuration: { count: 0, latestMs: null, avgMs: null, p95Ms: null },
    roundDelay: { count: 0, latestMs: null, avgMs: null, p95Ms: null },
    cronSuccessRate: { count: 0, successCount: 0, successRate: null },
    oddsComputeDuration: { count: 0, latestMs: null, avgMs: null, p95Ms: null },
    settlement: { count: 0, failedCount: 0, failureRate: null, avgDurationMs: null, p95DurationMs: null },
    apiLatency: { count: 0, latestMs: null, avgMs: null, p95Ms: null },
    generatedAt: "T0",
    ...overrides,
  };
}

function kpi8Report(overrides: Partial<Kpi8Report> = {}): Kpi8Report {
  return {
    sponsorBankruptcyRate: { value: 0.1, status: "in-band" },
    promotedTeamRelegationRate: { value: 0.5, status: "in-band" },
    avgGoalsPerMatch: { value: 2.7, status: "in-band" },
    homeWinRate: { value: 0.45, status: "in-band" },
    ...overrides,
  };
}

describe("isCronStalled / detectRoundMissed", () => {
  it("마지막 성공 기록이 없으면 항상 중단으로 본다", () => {
    expect(isCronStalled(heartbeat({ lastSuccessAt: null }))).toBe(true);
  });

  it("경과 시간이 주기×배수 이내면 중단이 아니다", () => {
    const hb = heartbeat({
      lastSuccessAt: "2026-09-16T00:00:00.000Z",
      now: "2026-09-16T00:02:00.000Z",
      expectedIntervalMin: 1,
      gapMultiplier: 3,
    });
    expect(isCronStalled(hb)).toBe(false);
    expect(detectRoundMissed(hb)).toBeNull();
  });

  it("경과 시간이 주기×배수를 초과하면 roundMissed 경보를 낸다", () => {
    const hb = heartbeat({
      lastSuccessAt: "2026-09-16T00:00:00.000Z",
      now: "2026-09-16T00:05:00.000Z",
      expectedIntervalMin: 1,
      gapMultiplier: 3,
    });
    const event = detectRoundMissed(hb, FIXED_CLOCK);
    expect(event?.kind).toBe("roundMissed");
    expect(event?.severity).toBe("critical");
    expect(event?.detectedAt).toBe("T-FIXED");
  });
});

describe("detectSimDelay", () => {
  it("표본이 없으면(p95Ms null) 검사하지 않는다", () => {
    expect(
      detectSimDelay(metricsSnapshot(), { warnMs: 100, criticalMs: 500 }),
    ).toBeNull();
  });

  it("p95가 warn 미만이면 경보가 없다", () => {
    const metrics = metricsSnapshot({
      simDuration: { count: 1, latestMs: 50, avgMs: 50, p95Ms: 50 },
    });
    expect(detectSimDelay(metrics, { warnMs: 100, criticalMs: 500 })).toBeNull();
  });

  it("p95가 warn 이상 critical 미만이면 warning 경보다", () => {
    const metrics = metricsSnapshot({
      simDuration: { count: 1, latestMs: 200, avgMs: 200, p95Ms: 200 },
    });
    const event = detectSimDelay(metrics, { warnMs: 100, criticalMs: 500 }, FIXED_CLOCK);
    expect(event?.kind).toBe("simDelay");
    expect(event?.severity).toBe("warning");
  });

  it("p95가 critical 이상이면 critical 경보다", () => {
    const metrics = metricsSnapshot({
      simDuration: { count: 1, latestMs: 600, avgMs: 600, p95Ms: 600 },
    });
    const event = detectSimDelay(metrics, { warnMs: 100, criticalMs: 500 }, FIXED_CLOCK);
    expect(event?.severity).toBe("critical");
  });
});

describe("detectBankruptcyExceeded", () => {
  it("밴드 내면 경보가 없다", () => {
    expect(detectBankruptcyExceeded(kpi8Report())).toBeNull();
  });

  it("balance-report의 out-of-band 판정을 그대로 재사용해 경보를 낸다", () => {
    const report = kpi8Report({
      sponsorBankruptcyRate: { value: 0.3, status: "out-of-band" },
    });
    const event = detectBankruptcyExceeded(report, FIXED_CLOCK);
    expect(event?.kind).toBe("bankruptcyExceeded");
    expect(event?.severity).toBe("critical");
    expect(event?.context.value).toBe(0.3);
  });

  it("표본 부족(insufficient-data)이면 경보를 내지 않는다", () => {
    const report = kpi8Report({
      sponsorBankruptcyRate: { value: null, status: "insufficient-data" },
    });
    expect(detectBankruptcyExceeded(report)).toBeNull();
  });
});

describe("detectSettlementFailure", () => {
  it("표본이 minSamples 미만이면 경보를 내지 않는다(작은 표본 오탐 방지)", () => {
    const metrics = metricsSnapshot({
      settlement: { count: 1, failedCount: 1, failureRate: 1, avgDurationMs: 10, p95DurationMs: 10 },
    });
    expect(
      detectSettlementFailure(metrics, { warnRate: 0.1, criticalRate: 0.3, minSamples: 5 }),
    ).toBeNull();
  });

  it("실패율이 critical 이상이면 critical 경보다", () => {
    const metrics = metricsSnapshot({
      settlement: { count: 10, failedCount: 5, failureRate: 0.5, avgDurationMs: 10, p95DurationMs: 10 },
    });
    const event = detectSettlementFailure(
      metrics,
      { warnRate: 0.1, criticalRate: 0.3 },
      FIXED_CLOCK,
    );
    expect(event?.kind).toBe("settlementFailure");
    expect(event?.severity).toBe("critical");
  });
});

describe("evaluateAlerts", () => {
  it("입력을 아무것도 안 주면 빈 배열이다", () => {
    expect(evaluateAlerts({})).toEqual([]);
  });

  it("제공된 섹션만 검사하고 트리거된 것만 담는다", () => {
    const events = evaluateAlerts({
      cronHeartbeat: heartbeat({ lastSuccessAt: null }),
      kpi8: kpi8Report({ sponsorBankruptcyRate: { value: 0.3, status: "out-of-band" } }),
      // metrics/simDelayThreshold/settlementFailureThreshold 미지정 → 그 두 검사는 건너뜀
    }, FIXED_CLOCK);

    const kinds = events.map((e) => e.kind).sort();
    expect(kinds).toEqual(["bankruptcyExceeded", "roundMissed"]);
  });
});

describe("createAlertHistory", () => {
  function snapshot(seasonNumber: number, kinds: AlertEvent["kind"][]) {
    return {
      seasonId: `season-${seasonNumber}` as never,
      seasonNumber,
      alerts: kinds.map((kind) => ({
        kind,
        severity: "warning" as const,
        message: kind,
        detectedAt: "T",
        context: {},
      })),
      recordedAt: "T",
    };
  }

  it("기록되지 않은 시즌은 undefined다", () => {
    const history = createAlertHistory();
    expect(history.getSeason(1)).toBeUndefined();
  });

  it("listSeasons는 seasonNumber 오름차순이다", () => {
    const history = createAlertHistory();
    history.record(snapshot(3, []));
    history.record(snapshot(1, []));
    history.record(snapshot(2, []));
    expect(history.listSeasons().map((s) => s.seasonNumber)).toEqual([1, 2, 3]);
  });

  it("compare가 신규·해소·지속 경보 종류를 구분한다", () => {
    const history = createAlertHistory();
    history.record(snapshot(1, ["roundMissed", "settlementFailure"]));
    history.record(snapshot(2, ["settlementFailure", "simDelay"]));

    const cmp = history.compare(1, 2);
    expect(cmp.newlyTriggered).toEqual(["simDelay"]);
    expect(cmp.resolved).toEqual(["roundMissed"]);
    expect(cmp.persisting).toEqual(["settlementFailure"]);
  });

  it("기록 없는 시즌은 경보 0건으로 취급해 비교할 수 있다", () => {
    const history = createAlertHistory();
    history.record(snapshot(1, ["roundMissed"]));

    const cmp = history.compare(1, 2);
    expect(cmp.resolved).toEqual(["roundMissed"]);
    expect(cmp.newlyTriggered).toEqual([]);
  });
});

describe("computeSystemHealth", () => {
  it("크론이 정상이면 ok다", () => {
    const report = computeSystemHealth(
      { cronHeartbeat: heartbeat({ now: "2026-09-16T00:02:00.000Z" }) },
      FIXED_CLOCK,
    );
    expect(report.status).toBe("ok");
    expect(report.reasons).toEqual([]);
  });

  it("크론이 중단됐으면 degraded와 사유를 담는다", () => {
    const report = computeSystemHealth(
      { cronHeartbeat: heartbeat({ lastSuccessAt: null }) },
      FIXED_CLOCK,
    );
    expect(report.status).toBe("degraded");
    expect(report.reasons.length).toBeGreaterThan(0);
    expect(report.checkedAt).toBe("T-FIXED");
  });
});

describe("createFallbackWarnRecorder", () => {
  it("그룹별 최초 1회만 isFirstOccurrence: true다", () => {
    const recorder = createFallbackWarnRecorder({ clock: FIXED_CLOCK });

    expect(recorder.record("MATCH_POINTS")).toEqual({ isFirstOccurrence: true, count: 1 });
    expect(recorder.record("MATCH_POINTS")).toEqual({ isFirstOccurrence: false, count: 2 });
    expect(recorder.record("MATCH_POINTS")).toEqual({ isFirstOccurrence: false, count: 3 });
    expect(recorder.record("SQUAD_PARAM")).toEqual({ isFirstOccurrence: true, count: 1 });
  });

  it("snapshot은 그룹별 누적 카운트를 group 오름차순으로 돌려준다", () => {
    const recorder = createFallbackWarnRecorder({ clock: FIXED_CLOCK });
    recorder.record("SQUAD_PARAM");
    recorder.record("MATCH_POINTS");
    recorder.record("MATCH_POINTS");

    const snap = recorder.snapshot();
    expect(snap.totalLookups).toBe(3);
    expect(snap.distinctGroupCount).toBe(2);
    expect(snap.groups.map((g) => g.group)).toEqual(["MATCH_POINTS", "SQUAD_PARAM"]);
    expect(snap.groups.find((g) => g.group === "MATCH_POINTS")?.count).toBe(2);
  });

  it("reset 이후에는 다시 최초 1회 취급된다", () => {
    const recorder = createFallbackWarnRecorder({ clock: FIXED_CLOCK });
    recorder.record("MATCH_POINTS");
    recorder.reset();
    expect(recorder.record("MATCH_POINTS")).toEqual({ isFirstOccurrence: true, count: 1 });
  });
});
