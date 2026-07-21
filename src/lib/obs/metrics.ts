/**
 * 핵심 메트릭 수집 — 40일차(2026-09-14), Task 043
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 40일차 행 "6개 핵심 메트릭 수집
 * (`/admin` 대시보드 노출용 데이터 계약)" / 수락 기준 "6종 메트릭 산출". 요구사항
 * 원문은 `docs/require/04-non-functional-requirements.md` NFR-OB-002 "핵심 메트릭
 * 수집: 시뮬 소요, 라운드 지연, 크론 성공률, 배당 산출 시간, 정산 시간·실패율, API
 * 지연" — `/admin`에서 6개 메트릭 전부 조회 가능해야 한다. 소유: 3팀
 * `src/lib/obs/**`.
 *
 * ## 오늘 스코프 — "데이터 계약"이지 "전 팀 배선"이 아니다
 * 이 파일은 6종 메트릭의 **타입 계약 + 수집기(collector) + 집계 스냅샷**만 만든다.
 * 실제 계측 호출부(시뮬 소요는 2팀 `src/lib/sim/**`, 크론 성공률·정산은 6팀 크론,
 * API 지연은 라우트 핸들러)는 각 팀 소유 경로라 오늘 건드리지 않는다 — 그 배선은
 * 각 팀이 이 모듈의 `recordX` 함수만 호출하면 되도록 계약을 안정된 형태로 고정해
 * 두는 것이 오늘의 목표다. 3팀 소유 범위(`src/lib/odds/**`)의 배당 산출 시간만
 * 예외적으로 이 파일 자체에서 배선 가능하지만, 그마저도 39~40일차 스코프 밖(러너
 * 코드 수정)이라 오늘은 계약만 만든다 — 배선은 별도 후속 커밋으로 남긴다(연쇄
 * 배선을 오늘 한 파일 리뷰에 몰아넣지 않기 위함).
 *
 * ## 41·42일차와의 경계 (혼동 방지)
 * - 41일차 `balance-report.ts`: **도메인/밸런스** 지표(승점 분포·부상률·이적률·부도율·
 *   OVR 분포·재정 건전성·평균 득점, KPI-8 4지표 포함) — 시즌 1회성 스냅샷.
 * - 42일차 `alert.ts`: 이 파일이 만드는 스냅샷을 **소비**해 이상 탐지(크론 성공률
 *   급락, 시뮬 지연 초과 등)를 판단하는 상위 레이어.
 * - 오늘 이 파일은 **시스템 관측성**(NFR-OB) 지표만 다룬다 — 위 두 파일과 값이
 *   겹치지 않는다.
 *
 * ## 왜 원시 샘플이 아니라 집계 스냅샷을 계약으로 노출하나
 * `/admin`(5팀)과 42일차 `alert.ts`(3팀 자신)가 필요한 것은 "최근 N건 평균/p95/
 * 비율"이지 원시 로그 스트림이 아니다. 원시 배열을 계약에 그대로 노출하면 소비측이
 * 각자 다른 방식으로 재집계하게 되어 "6개 메트릭"의 정의가 소비처마다 흩어진다
 * (예: 어떤 화면은 평균, 어떤 화면은 최근값만 봐서 같은 이름의 수치가 다르게
 * 보이는 사고). 그래서 집계 함수(평균·p95·비율)를 이 모듈이 **한 곳에서만** 계산해
 * `MetricsSnapshot`이라는 고정 타입으로 반환한다.
 *
 * ## 메모리 상한 — 링버퍼
 * 크론·API 호출처럼 장기 실행 프로세스에서 무한히 쌓이는 이벤트를 무제한 배열로
 * 들고 있으면 메모리가 선형으로 늘어난다. 종류별로 `maxSamplesPerKind`(기본 500)
 * 개까지만 보관하고 초과분은 가장 오래된 샘플부터 버린다 — "최근 추세"를 보는
 * 관측성 지표 목적에는 전체 이력이 필요 없다는 판단(41일차 `balance-report.ts`가
 * 시즌 단위 영구 기록을 담당하므로 이 모듈이 이력 보관까지 떠맡을 필요가 없다).
 *
 * ## `Clock` 주입 — logger.ts(39일차)와 동일 패턴
 * `src/lib/obs/`는 sim 밖이라 NFR-DT-001(`Date.now()` 금지) 대상이 아니지만, sim이
 * 실수로 이 모듈을 끌어다 쓸 경우의 피해 반경을 줄이고 테스트 결정론을 확보하기
 * 위해 `logger.ts`와 동일하게 `Clock`을 주입 가능하게 했다. 기본값은 실제 벽시계.
 *
 * ## 상관 컨텍스트는 강제하지 않는다 (logger.ts와의 차이)
 * `logger.ts`는 "전 로그가 상관 ID 보유"가 수락 기준이라 빈 컨텍스트를 생성 시점에
 * throw했다. 이 파일의 수락 기준은 "6종 메트릭 산출"일 뿐 상관 ID 강제가 아니므로,
 * `correlation`은 선택 인자로만 받아 원시 샘플에 실어 둔다(추후 로그와 교차 조회할
 * 여지만 남김) — 없어도 기록 자체는 항상 성공해야 계측 호출부가 실패하지 않는다.
 *
 * ## 서버/클라이언트 경계
 * `"use client"`를 붙이지 않는다 — 이유는 `logger.ts` 상단 주석과 동일(RSC 경계에서
 * `"use client"` 모듈의 값을 서버 컴포넌트가 import하면 조용히 빈 값으로 치환되는
 * 38일차 함정, I-192 계열). `/admin`이 서버 컴포넌트에서 스냅샷을 읽는 경로를
 * 막지 않기 위함이다.
 */

import type { LogCorrelation, Clock } from "./logger";

export type { Clock } from "./logger";

/** NFR-OB-002 6종 메트릭의 식별자. `/admin` 계약과 `alert.ts`(42일차)가 이 이름을 그대로 참조한다. */
export type MetricKind =
  | "simDuration"
  | "roundDelay"
  | "cronRun"
  | "oddsComputeDuration"
  | "settlement"
  | "apiLatency";

/** 6종 고정 — 배열 순서는 NFR-OB-002 원문 나열 순서와 동일하게 유지한다. */
export const METRIC_KINDS: readonly MetricKind[] = [
  "simDuration",
  "roundDelay",
  "cronRun",
  "oddsComputeDuration",
  "settlement",
  "apiLatency",
] as const;

/** 시뮬 소요 · 라운드 지연 · 배당 산출 시간 · API 지연 — 전부 "1건당 소요시간(ms)"이라 동일 형태다. */
export interface DurationEvent {
  readonly kind: "simDuration" | "roundDelay" | "oddsComputeDuration" | "apiLatency";
  readonly durationMs: number;
}

/** 크론 성공률 — 1회 실행의 성공/실패만 기록하고 비율은 스냅샷 집계 시점에 계산한다. */
export interface CronRunEvent {
  readonly kind: "cronRun";
  readonly success: boolean;
}

/** 정산 시간·실패율 — 수락 기준 원문이 두 값을 한 항목으로 묶어 놓았으므로 한 이벤트로 함께 기록한다. */
export interface SettlementEvent {
  readonly kind: "settlement";
  readonly durationMs: number;
  readonly failed: boolean;
}

export type MetricEvent = DurationEvent | CronRunEvent | SettlementEvent;

/** 소요시간 계열 메트릭의 집계 결과. `count === 0`이면 나머지 필드는 전부 `null`이다. */
export interface DurationStats {
  readonly count: number;
  readonly latestMs: number | null;
  readonly avgMs: number | null;
  readonly p95Ms: number | null;
}

/** 크론 성공률 집계 결과. */
export interface RateStats {
  readonly count: number;
  readonly successCount: number;
  readonly successRate: number | null;
}

/** 정산 — 소요시간 통계 + 실패율을 함께 담는다. */
export interface SettlementStats {
  readonly count: number;
  readonly failedCount: number;
  readonly failureRate: number | null;
  readonly avgDurationMs: number | null;
  readonly p95DurationMs: number | null;
}

/**
 * `/admin` 대시보드가 그대로 렌더링할 수 있는 고정 계약. 필드 6개 = NFR-OB-002 6종.
 * 필드 이름과 개수를 바꾸면 5팀 소비 코드가 깨지므로, 늘어날 메트릭은 여기 필드를
 * 고치지 말고 별도 후속 계약(버전)으로 추가한다.
 */
export interface MetricsSnapshot {
  readonly simDuration: DurationStats;
  readonly roundDelay: DurationStats;
  readonly cronSuccessRate: RateStats;
  readonly oddsComputeDuration: DurationStats;
  readonly settlement: SettlementStats;
  readonly apiLatency: DurationStats;
  /** 스냅샷 산출 시각(ISO). 주입된 `Clock` 기준. */
  readonly generatedAt: string;
}

export interface MetricsRecorder {
  /** 이벤트 1건을 기록한다. `correlation`은 선택 — 로그와 교차 조회하고 싶을 때만 넘긴다. */
  record(event: MetricEvent, correlation?: LogCorrelation): void;
  /** 현재까지 누적된 샘플로 6종 메트릭 스냅샷을 계산해 반환한다. */
  snapshot(): MetricsSnapshot;
  /** 누적 샘플을 전부 비운다(테스트·시즌 경계 리셋용). */
  reset(): void;
}

export interface CreateMetricsRecorderOptions {
  readonly clock?: Clock;
  /** 종류별 최대 보관 샘플 수. 초과분은 가장 오래된 것부터 버린다. 기본 500. */
  readonly maxSamplesPerKind?: number;
}

interface StoredSample<E extends MetricEvent> {
  readonly event: E;
  readonly timestamp: string;
  readonly correlation?: LogCorrelation;
}

const defaultClock: Clock = () => new Date().toISOString();
const DEFAULT_MAX_SAMPLES = 500;

/** 최근 순위(nearest-rank) 방식 p95. 정렬된 배열을 변형하지 않도록 복사본을 쓴다. */
function computeP95(durationsMs: readonly number[]): number | null {
  if (durationsMs.length === 0) return null;
  const sorted = [...durationsMs].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[Math.max(0, rank)];
}

function average(durationsMs: readonly number[]): number | null {
  if (durationsMs.length === 0) return null;
  return durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
}

function summarizeDurations(samples: readonly StoredSample<DurationEvent>[]): DurationStats {
  if (samples.length === 0) {
    return { count: 0, latestMs: null, avgMs: null, p95Ms: null };
  }
  const durations = samples.map((s) => s.event.durationMs);
  return {
    count: samples.length,
    latestMs: samples[samples.length - 1].event.durationMs,
    avgMs: average(durations),
    p95Ms: computeP95(durations),
  };
}

/**
 * 6종 메트릭 수집기를 만든다. 종류별 링버퍼를 내부에 들고 있으며, `record`/`snapshot`
 * 모두 동기 호출이다(비동기 I/O 없음 — 순수 인메모리 집계).
 */
export function createMetricsRecorder(
  options: CreateMetricsRecorderOptions = {},
): MetricsRecorder {
  const clock = options.clock ?? defaultClock;
  const maxSamplesPerKind = options.maxSamplesPerKind ?? DEFAULT_MAX_SAMPLES;

  const buffers: {
    simDuration: StoredSample<DurationEvent>[];
    roundDelay: StoredSample<DurationEvent>[];
    cronRun: StoredSample<CronRunEvent>[];
    oddsComputeDuration: StoredSample<DurationEvent>[];
    settlement: StoredSample<SettlementEvent>[];
    apiLatency: StoredSample<DurationEvent>[];
  } = {
    simDuration: [],
    roundDelay: [],
    cronRun: [],
    oddsComputeDuration: [],
    settlement: [],
    apiLatency: [],
  };

  function push<E extends MetricEvent>(
    buffer: StoredSample<E>[],
    sample: StoredSample<E>,
  ): void {
    buffer.push(sample);
    if (buffer.length > maxSamplesPerKind) {
      buffer.splice(0, buffer.length - maxSamplesPerKind);
    }
  }

  function record(event: MetricEvent, correlation?: LogCorrelation): void {
    const timestamp = clock();
    switch (event.kind) {
      case "simDuration":
      case "roundDelay":
      case "oddsComputeDuration":
      case "apiLatency":
        push(buffers[event.kind], { event, timestamp, correlation });
        return;
      case "cronRun":
        push(buffers.cronRun, { event, timestamp, correlation });
        return;
      case "settlement":
        push(buffers.settlement, { event, timestamp, correlation });
        return;
    }
  }

  function snapshot(): MetricsSnapshot {
    const cronCount = buffers.cronRun.length;
    const cronSuccessCount = buffers.cronRun.filter((s) => s.event.success).length;

    const settlementCount = buffers.settlement.length;
    const settlementFailedCount = buffers.settlement.filter((s) => s.event.failed).length;
    const settlementDurations = buffers.settlement.map((s) => s.event.durationMs);

    return {
      simDuration: summarizeDurations(buffers.simDuration),
      roundDelay: summarizeDurations(buffers.roundDelay),
      cronSuccessRate: {
        count: cronCount,
        successCount: cronSuccessCount,
        successRate: cronCount === 0 ? null : cronSuccessCount / cronCount,
      },
      oddsComputeDuration: summarizeDurations(buffers.oddsComputeDuration),
      settlement: {
        count: settlementCount,
        failedCount: settlementFailedCount,
        failureRate: settlementCount === 0 ? null : settlementFailedCount / settlementCount,
        avgDurationMs: average(settlementDurations),
        p95DurationMs: computeP95(settlementDurations),
      },
      apiLatency: summarizeDurations(buffers.apiLatency),
      generatedAt: clock(),
    };
  }

  function reset(): void {
    buffers.simDuration = [];
    buffers.roundDelay = [];
    buffers.cronRun = [];
    buffers.oddsComputeDuration = [];
    buffers.settlement = [];
    buffers.apiLatency = [];
  }

  return { record, snapshot, reset };
}
