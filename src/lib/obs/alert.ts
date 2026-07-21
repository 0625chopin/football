/**
 * 이상 탐지 알림 + 공통코드 폴백 WARN 카운터 — 42일차(2026-09-16), Task 043
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 42일차 행 "이상 탐지 알림(라운드
 * 누락·시뮬 지연·부도율 초과·정산 실패) + 공통코드 폴백 WARN 카운터" / 수락 기준
 * "시즌 간 비교 조회 가능" · "크론 중단 시 `degraded` 표시". 소유: 3팀 `src/lib/obs/**`.
 *
 * ## 이 파일이 담는 것 (두 가지, "+"로 분리된 독립 기능)
 * 1. **이상 탐지 4종** — 라운드 누락(`roundMissed`) · 시뮬 지연(`simDelay`) · 부도율
 *    초과(`bankruptcyExceeded`) · 정산 실패(`settlementFailure`). 각각 순수 함수
 *    `detectX(...)`로 독립 export하고, `evaluateAlerts(input)`가 이를 한데 묶어
 *    실행한다(전부/일부 입력만 주고 호출 가능 — 미지정 섹션은 그 검사만 건너뛴다).
 * 2. **공통코드 폴백 WARN 카운터**(`createFallbackWarnRecorder`) — 아래 "왜 최초 1회만
 *    WARN인가" 절 참조. `config/fallback.ts`가 이 팩토리로 만든 인스턴스를 실제로
 *    소비한다(42일차에 직접 배선 — 아래 "I-208 재발 방지" 절 참조).
 *
 * ## 왜 최초 1회만 WARN인가 (I-206 인수인계 대응)
 * 41일차 인계: `setGlobalDefaultSource()`(`loader.ts:124`) 호출처가 프로덕션 코드에
 * 0건이라(등록은 1팀 `bootstrapApp()` 소관, I-206) 전역 기본값 소스가 비어 있는 채로
 * 모든 조회가 하드코딩 폴백으로 떨어진다 — dev 로그에 45건/요청이 찍히는 상태다.
 * 즉 폴백이 "예외"가 아니라 "상시 상태"다. 매 조회마다 `console.warn`을 반복하면
 * ① 로그가 노이즈로 묻혀 진짜 이상(새 그룹이 갑자기 깨짐)을 못 알아채고 ② 개발자가
 * 경고를 습관적으로 무시하게 된다. 그래서 `FallbackWarnRecorder`는 **그룹별 최초
 * 1회만** `isFirstOccurrence: true`를 반환해 그 시점에만 `console.warn`을 내고,
 * 이후 같은 그룹 조회는 카운트만 누적한다(`snapshot()`으로 언제든 전체 조회 가능).
 * 이 설계는 I-206이 해소(1팀이 `bootstrapApp()`에서 `setGlobalDefaultSource` 호출)
 * 되어도 안전하다 — 전역 소스가 채워지면 애초에 폴백 경로 자체를 안 타므로 카운터가
 * 그냥 조용해질 뿐, 별도 해제 작업이 필요 없다.
 *
 * ## I-208 재발 방지 — 이번엔 실제로 배선한다
 * 39일차 `logger.ts`·40일차 `metrics.ts`·41일차 `balance-report.ts`가 계약만 만들고
 * 호출부 없이 쌓인 상태다(I-208). 이 파일의 "이상 탐지 4종"과 "시즌 비교"는 크론 상태
 * (6팀)·메트릭 실계측(2/6팀)·밸런스 리포트 실산출(3팀 자신, 66일차~) 등 **타 시점·타
 * 팀 데이터가 갖춰져야 실제로 호출**할 수 있어 오늘도 계약 우선일 수밖에 없다(아래
 * "소비처" 절 — 이슈 후보로 별도 보고). 그러나 "공통코드 폴백 WARN 카운터"는 다르다 —
 * 소비처(`config/fallback.ts`)가 **이 팀 자신의 소유 경로**라 오늘 바로 배선 가능하고,
 * 배선하지 않으면 정확히 I-208과 같은 모양(카운터는 만들었는데 아무도 안 씀)이 되므로
 * **이 파일과 같은 커밋에서 `config/fallback.ts`의 `warnFallbackUsed`를 이 카운터를
 * 쓰도록 교체했다.**
 *
 * ## 소비처 (배선은 각 소비처 책임 — I-188 준수, 이 파일이 직접 호출하지 않는다)
 * - **`config/fallback.ts`(3팀 자신, `src/lib/config/**`)**: 폴백 WARN 카운터를
 *   실제로 사용 — 위 절 참조. **오늘 이 팀이 직접 배선함.**
 * - **6팀 크론**: `evaluateAlerts`의 `cronHeartbeat` 입력(마지막 성공 실행 시각)과
 *   `computeSystemHealth`를 크론 상태로 채워 호출 — 아직 배선 없음, 이슈 후보로 보고.
 * - **6팀 `/api/health`**: `computeSystemHealth().status`를 그대로 노출 — 계약만
 *   정의하고 라우트 배선은 6팀 소관(팀장 지시, 오늘 배선하지 않음).
 * - **5팀 어드민 대시보드**: `AlertHistory.compare()`로 시즌 간 경보 추이 노출,
 *   `getFallbackWarnSnapshot()`(fallback.ts export)으로 폴백 카운터 노출 — 아직
 *   배선 없음, 이슈 후보로 보고.
 * - **2팀/3팀**: `metrics.ts` 스냅샷(시뮬 소요·정산)이 실계측되기 시작하면
 *   `evaluateAlerts`의 `metrics` 입력으로 그대로 흘려보낼 수 있다.
 *
 * ## 수락 기준 ① "시즌 간 비교 조회 가능" — `AlertHistory`
 * `createAlertHistory()`가 시즌번호를 키로 하는 `AlertSeasonSnapshot`을 저장하고,
 * `compare(a, b)`가 두 시즌 사이 새로 발생(`newlyTriggered`)·해소(`resolved`)·지속
 * (`persisting`) 경보 종류를 계산해 돌려준다. `metrics.ts`의 링버퍼(요청 단위 고빈도
 * 샘플, 500개 상한)와 달리 여기는 **시즌 단위 스냅샷**(시즌당 1건, 전체 시즌 수가
 * 많아야 수백 건)이라 상한을 두지 않는다 — 메모리 우려보다 "과거 시즌과 비교 조회"라는
 * 요구가 전체 이력 보존을 전제로 하기 때문이다(41일차 `balance-report.ts`가 이미
 * "시즌 단위 영구 기록"을 표방하는 것과 동일 결).
 *
 * ## 수락 기준 ② "크론 중단 시 `degraded` 표시" — `computeSystemHealth`
 * `CronHeartbeat`(마지막 성공 시각·현재 시각·예상 주기·격차 배수)를 받아 크론이
 * 정지했는지(`isCronStalled`) 판정하고, 정지 상태면 `SystemHealthReport.status`가
 * `'degraded'`가 된다. `degraded` 문자열 리터럴은 6팀 `/api/health` 응답 계약과
 * 맞물리므로 **이 계약(타입·값)만 확정하고 라우트 배선은 하지 않는다**(팀장 지시).
 * `expectedIntervalMin`/`gapMultiplier`는 이 모듈이 하드코딩하지 않는다 — 호출자가
 * `loadConstants('CRON_PARAM')`(6팀 크론 쪽 책임)에서 조회해 주입한다. 이 모듈이
 * `config/loader.ts`를 직접 import하면 "관측 전용 모듈"이라는 `logger.ts`/`metrics.ts`
 * 원칙과 어긋나고, 로더가 미등록 그룹에 대해 던지는 `ConstantSourceUnavailableError`가
 * 관측 모듈 안으로 새어 들어오는 부작용도 생긴다.
 *
 * ## 이상 탐지 임계값을 이 모듈이 기본값으로 정하지 않는 이유
 * `simDelay`(p95 소요시간)·`settlementFailure`(실패율) 임계값은 `catalog.ts`의
 * "억측 금지" 원칙과 같은 이유로 이 모듈이 숫자를 임의로 정하지 않는다 — 05문서·
 * ROADMAP 어디에도 "몇 ms부터 지연 경보인지" 구체 수치가 없다. 대신 `DurationAlertThreshold`/
 * `RateAlertThreshold`를 **필수 입력**으로 받아 호출자가 명시적으로 결정하게 한다
 * (미지정 시 `evaluateAlerts`는 해당 검사를 조용히 건너뛴다 — 잘못된 기본값으로 오탐
 * 내는 것보다 안전).
 *
 * ## `Clock` 주입 · 서버/클라이언트 경계
 * `logger.ts`/`metrics.ts`/`balance-report.ts`와 동일 패턴·동일 사유(테스트 결정론,
 * sim 오배선 시 피해 반경 축소, RSC 경계 "use client" 함정 회피, I-192 계열).
 *
 * ## import 규약
 * 도메인 타입(`SeasonId`)은 배럴(`@/types`)에서만 import한다(체크리스트 C-5·C-6).
 * 같은 소유 디렉터리의 `./logger`(`Clock`)·`./metrics`(`MetricsSnapshot`)·
 * `./balance-report`(`Kpi8Report`, `KPI8_BANDS`)를 상대경로로 가져온다.
 */

import type { SeasonId } from "@/types";
import type { Clock } from "./logger";
import type { DurationStats, MetricsSnapshot, SettlementStats } from "./metrics";
import { KPI8_BANDS, type Kpi8Report } from "./balance-report";

export type { Clock } from "./logger";

const defaultClock: Clock = () => new Date().toISOString();

/* ────────────────────────────────────────────────────────────────────────
 * 이상 탐지 4종 — 공통 타입
 * ──────────────────────────────────────────────────────────────────────── */

export type AlertKind = "roundMissed" | "simDelay" | "bankruptcyExceeded" | "settlementFailure";

export type AlertSeverity = "warning" | "critical";

export interface AlertEvent {
  readonly kind: AlertKind;
  readonly severity: AlertSeverity;
  readonly message: string;
  readonly detectedAt: string;
  /** 판정에 쓰인 원시 수치(값·임계값 등) — 대시보드 상세 표시·디버깅용. */
  readonly context: Readonly<Record<string, unknown>>;
}

/* ────────────────────────────────────────────────────────────────────────
 * ① 라운드 누락 — 크론 하트비트 기반
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 크론 실행 상태 요약. `expectedIntervalMin`/`gapMultiplier`는 이 모듈이 하드코딩하지
 * 않는다(위 파일 헤더 "수락 기준 ②" 절) — 호출자가 `CRON_PARAM`/`ROUND_INTERVAL_MIN`
 * 등 공통코드 값을 조회해 주입한다.
 */
export interface CronHeartbeat {
  /** 마지막으로 성공한 크론 실행 시각(ISO). 한 번도 성공 기록이 없으면 `null`. */
  readonly lastSuccessAt: string | null;
  /** 판정 기준 시각(ISO) — 보통 `clock()`과 동일 값을 호출자가 넘긴다. */
  readonly now: string;
  /** 정상 라운드 처리 주기(분). */
  readonly expectedIntervalMin: number;
  /** 이 배수를 넘는 공백을 "중단"으로 판정한다(`CRON_PARAM.GAP_DETECT_MULTIPLIER` 참조). */
  readonly gapMultiplier: number;
}

/** 크론이 예상 주기 × 배수를 넘겨 응답이 없는지 판정한다. `computeSystemHealth`와 공유한다. */
export function isCronStalled(heartbeat: CronHeartbeat): boolean {
  if (heartbeat.lastSuccessAt === null) return true;
  const elapsedMs = Date.parse(heartbeat.now) - Date.parse(heartbeat.lastSuccessAt);
  const thresholdMs = heartbeat.expectedIntervalMin * heartbeat.gapMultiplier * 60_000;
  return elapsedMs > thresholdMs;
}

/** 크론 중단 = 라운드가 예상 시각에 처리되지 않았을 가능성 → `roundMissed` 경보. */
export function detectRoundMissed(
  heartbeat: CronHeartbeat,
  clock: Clock = defaultClock,
): AlertEvent | null {
  if (!isCronStalled(heartbeat)) return null;
  return {
    kind: "roundMissed",
    severity: "critical",
    message:
      `크론이 예상 주기(${heartbeat.expectedIntervalMin}분 × ${heartbeat.gapMultiplier}) ` +
      "를 초과해 마지막 성공 실행 이후 응답이 없다 — 라운드가 누락됐을 수 있다.",
    detectedAt: clock(),
    context: { ...heartbeat },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * ② 시뮬 지연 — metrics.ts 소요시간 통계 기반
 * ──────────────────────────────────────────────────────────────────────── */

export interface DurationAlertThreshold {
  readonly warnMs: number;
  readonly criticalMs: number;
}

/** p95를 기준으로 삼는다 — 평균은 소수 스파이크를 가려 "지연 체감"을 놓칠 수 있다. */
export function detectSimDelay(
  metrics: { readonly simDuration: DurationStats },
  threshold: DurationAlertThreshold,
  clock: Clock = defaultClock,
): AlertEvent | null {
  const { p95Ms } = metrics.simDuration;
  if (p95Ms === null) return null;

  if (p95Ms >= threshold.criticalMs) {
    return {
      kind: "simDelay",
      severity: "critical",
      message: `시뮬레이션 소요 p95(${p95Ms}ms)가 위험 임계값(${threshold.criticalMs}ms)을 초과했다.`,
      detectedAt: clock(),
      context: { p95Ms, ...threshold },
    };
  }
  if (p95Ms >= threshold.warnMs) {
    return {
      kind: "simDelay",
      severity: "warning",
      message: `시뮬레이션 소요 p95(${p95Ms}ms)가 경고 임계값(${threshold.warnMs}ms)을 초과했다.`,
      detectedAt: clock(),
      context: { p95Ms, ...threshold },
    };
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────
 * ③ 부도율 초과 — balance-report.ts의 KPI-8 판정을 재사용
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `balance-report.ts`가 이미 밴드 판정(`Kpi8Indicator.status`)을 계산해 두므로 여기서
 * 임계값을 다시 정의하지 않는다 — 부도율 밴드는 [0, `KPI8_BANDS.sponsorBankruptcyRateMax`]라
 * `'out-of-band'`는 곧 "상한 초과"와 동치다(하한이 0이라 미달로 out-of-band가 될 수 없음).
 */
export function detectBankruptcyExceeded(
  kpi8: Pick<Kpi8Report, "sponsorBankruptcyRate">,
  clock: Clock = defaultClock,
): AlertEvent | null {
  const indicator = kpi8.sponsorBankruptcyRate;
  if (indicator.status !== "out-of-band" || indicator.value === null) return null;

  return {
    kind: "bankruptcyExceeded",
    severity: "critical",
    message:
      `스폰서 부도율(${indicator.value})이 KPI-8 밴드 상한` +
      `(${KPI8_BANDS.sponsorBankruptcyRateMax})을 초과했다.`,
    detectedAt: clock(),
    context: { value: indicator.value, max: KPI8_BANDS.sponsorBankruptcyRateMax },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * ④ 정산 실패 — metrics.ts 정산 통계 기반
 * ──────────────────────────────────────────────────────────────────────── */

export interface RateAlertThreshold {
  readonly warnRate: number;
  readonly criticalRate: number;
  /** 표본이 이 개수 미만이면 검사를 건너뛴다(작은 표본의 100% 실패율 오탐 방지). 기본 1. */
  readonly minSamples?: number;
}

export function detectSettlementFailure(
  metrics: { readonly settlement: SettlementStats },
  threshold: RateAlertThreshold,
  clock: Clock = defaultClock,
): AlertEvent | null {
  const { count, failureRate } = metrics.settlement;
  const minSamples = threshold.minSamples ?? 1;
  if (failureRate === null || count < minSamples) return null;

  if (failureRate >= threshold.criticalRate) {
    return {
      kind: "settlementFailure",
      severity: "critical",
      message: `정산 실패율(${failureRate})이 위험 임계값(${threshold.criticalRate})을 초과했다.`,
      detectedAt: clock(),
      context: { failureRate, count, ...threshold },
    };
  }
  if (failureRate >= threshold.warnRate) {
    return {
      kind: "settlementFailure",
      severity: "warning",
      message: `정산 실패율(${failureRate})이 경고 임계값(${threshold.warnRate})을 초과했다.`,
      detectedAt: clock(),
      context: { failureRate, count, ...threshold },
    };
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────
 * 통합 실행 — evaluateAlerts
 * ──────────────────────────────────────────────────────────────────────── */

export interface EvaluateAlertsInput {
  /** 미지정 시 라운드 누락 검사를 건너뛴다. */
  readonly cronHeartbeat?: CronHeartbeat;
  /** 미지정 시 시뮬 지연·정산 실패 검사를 건너뛴다(둘 다 metrics 스냅샷이 필요). */
  readonly metrics?: MetricsSnapshot;
  /** 미지정 시 부도율 초과 검사를 건너뛴다. */
  readonly kpi8?: Kpi8Report;
  /** 미지정 시 시뮬 지연 검사를 건너뛴다(임계값 없이 판정하지 않음 — 위 파일 헤더 참조). */
  readonly simDelayThreshold?: DurationAlertThreshold;
  /** 미지정 시 정산 실패 검사를 건너뛴다. */
  readonly settlementFailureThreshold?: RateAlertThreshold;
}

/**
 * 제공된 입력 조각만 검사해 트리거된 경보만 배열로 돌려준다(트리거 안 된 것은 담지
 * 않음 — 대시보드가 "현재 활성 경보 목록"으로 바로 렌더링할 수 있게).
 */
export function evaluateAlerts(
  input: EvaluateAlertsInput,
  clock: Clock = defaultClock,
): AlertEvent[] {
  const events: AlertEvent[] = [];

  if (input.cronHeartbeat) {
    const event = detectRoundMissed(input.cronHeartbeat, clock);
    if (event) events.push(event);
  }
  if (input.metrics && input.simDelayThreshold) {
    const event = detectSimDelay(input.metrics, input.simDelayThreshold, clock);
    if (event) events.push(event);
  }
  if (input.kpi8) {
    const event = detectBankruptcyExceeded(input.kpi8, clock);
    if (event) events.push(event);
  }
  if (input.metrics && input.settlementFailureThreshold) {
    const event = detectSettlementFailure(input.metrics, input.settlementFailureThreshold, clock);
    if (event) events.push(event);
  }

  return events;
}

/* ────────────────────────────────────────────────────────────────────────
 * 수락 기준 ① — 시즌 간 비교 조회
 * ──────────────────────────────────────────────────────────────────────── */

export interface AlertSeasonSnapshot {
  readonly seasonId: SeasonId;
  readonly seasonNumber: number;
  /** 그 시즌 점검 시점에 트리거된 경보만(비어 있으면 무이상). */
  readonly alerts: readonly AlertEvent[];
  readonly recordedAt: string;
}

export interface AlertSeasonComparison {
  readonly seasonNumberA: number;
  readonly seasonNumberB: number;
  /** B에는 있었지만 A에는 없던 경보 종류. */
  readonly newlyTriggered: readonly AlertKind[];
  /** A에는 있었지만 B에는 없는(해소된) 경보 종류. */
  readonly resolved: readonly AlertKind[];
  /** 두 시즌 모두에서 트리거된 경보 종류. */
  readonly persisting: readonly AlertKind[];
}

export interface AlertHistory {
  /** 시즌 스냅샷을 기록한다. 같은 `seasonNumber`로 다시 호출하면 덮어쓴다(재계산 반영). */
  record(snapshot: AlertSeasonSnapshot): void;
  getSeason(seasonNumber: number): AlertSeasonSnapshot | undefined;
  /** `seasonNumber` 오름차순 전체 목록. */
  listSeasons(): readonly AlertSeasonSnapshot[];
  /** 두 시즌 사이 경보 종류 변화를 비교한다. 기록 없는 시즌은 "경보 0건"으로 취급한다. */
  compare(seasonNumberA: number, seasonNumberB: number): AlertSeasonComparison;
}

/**
 * 시즌 단위 경보 이력을 관리한다. `metrics.ts`의 요청 단위 링버퍼(500건 상한)와 달리
 * 상한을 두지 않는다 — 위 파일 헤더 "수락 기준 ①" 절 참조(시즌당 1건, 전체 이력이
 * "시즌 간 비교"라는 요구 자체의 전제).
 */
export function createAlertHistory(): AlertHistory {
  const bySeasonNumber = new Map<number, AlertSeasonSnapshot>();

  function record(snapshot: AlertSeasonSnapshot): void {
    bySeasonNumber.set(snapshot.seasonNumber, snapshot);
  }

  function getSeason(seasonNumber: number): AlertSeasonSnapshot | undefined {
    return bySeasonNumber.get(seasonNumber);
  }

  function listSeasons(): readonly AlertSeasonSnapshot[] {
    return [...bySeasonNumber.values()].sort((a, b) => a.seasonNumber - b.seasonNumber);
  }

  function compare(seasonNumberA: number, seasonNumberB: number): AlertSeasonComparison {
    const kindsA = new Set(bySeasonNumber.get(seasonNumberA)?.alerts.map((e) => e.kind) ?? []);
    const kindsB = new Set(bySeasonNumber.get(seasonNumberB)?.alerts.map((e) => e.kind) ?? []);

    const newlyTriggered = [...kindsB].filter((kind) => !kindsA.has(kind));
    const resolved = [...kindsA].filter((kind) => !kindsB.has(kind));
    const persisting = [...kindsA].filter((kind) => kindsB.has(kind));

    return { seasonNumberA, seasonNumberB, newlyTriggered, resolved, persisting };
  }

  return { record, getSeason, listSeasons, compare };
}

/* ────────────────────────────────────────────────────────────────────────
 * 수락 기준 ② — 크론 중단 시 degraded 표시 (계약만, 라우트 배선은 6팀 소관)
 * ──────────────────────────────────────────────────────────────────────── */

export type SystemHealthStatus = "ok" | "degraded";

export interface SystemHealthReport {
  readonly status: SystemHealthStatus;
  /** `status === 'degraded'`인 이유 목록(비어 있으면 status는 항상 'ok'). */
  readonly reasons: readonly string[];
  readonly checkedAt: string;
}

export interface ComputeSystemHealthInput {
  readonly cronHeartbeat: CronHeartbeat;
}

/**
 * `/api/health`(6팀)가 그대로 응답 본문에 쓸 수 있는 계약. `status` 리터럴 값
 * (`'ok' | 'degraded'`)이 계약의 핵심이다 — 필드를 늘릴 땐 이 두 값을 유지한 채 새
 * 필드만 추가한다(다른 계약들과 동일한 "필드 고정" 원칙, `MetricsSnapshot` 주석 참조).
 */
export function computeSystemHealth(
  input: ComputeSystemHealthInput,
  clock: Clock = defaultClock,
): SystemHealthReport {
  const reasons: string[] = [];

  if (isCronStalled(input.cronHeartbeat)) {
    reasons.push(
      "크론이 예상 주기 내에 성공 실행을 기록하지 못했다 — 라운드/정산 파이프라인이 중단됐을 수 있다.",
    );
  }

  return {
    status: reasons.length === 0 ? "ok" : "degraded",
    reasons,
    checkedAt: clock(),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 공통코드 폴백 WARN 카운터 (`config/fallback.ts`가 소비 — 위 파일 헤더 "I-208 재발 방지" 절)
 * ──────────────────────────────────────────────────────────────────────── */

export interface FallbackWarnGroupStat {
  readonly group: string;
  /** 이 그룹이 폴백으로 조회된 누적 횟수. */
  readonly count: number;
  readonly firstWarnedAt: string;
  readonly lastSeenAt: string;
}

export interface FallbackWarnSnapshot {
  /** `group` 오름차순. */
  readonly groups: readonly FallbackWarnGroupStat[];
  readonly totalLookups: number;
  readonly distinctGroupCount: number;
  readonly generatedAt: string;
}

export interface FallbackWarnRecordResult {
  /** true면 이 그룹의 첫 폴백 발생 — 호출자는 이때만 `console.warn` 등 실제 경고를 낸다. */
  readonly isFirstOccurrence: boolean;
  readonly count: number;
}

export interface FallbackWarnRecorder {
  /** 폴백 조회 1건을 기록한다. 그룹별 최초 1회만 `isFirstOccurrence: true`. */
  record(group: string): FallbackWarnRecordResult;
  snapshot(): FallbackWarnSnapshot;
  /** 누적 상태를 전부 비운다(테스트·전역 기본값 소스 재등록 후 재시작용). */
  reset(): void;
}

export interface CreateFallbackWarnRecorderOptions {
  readonly clock?: Clock;
}

/**
 * 공통코드 폴백 WARN 카운터를 만든다. 위 파일 헤더 "왜 최초 1회만 WARN인가" 절 참조 —
 * 그룹별로 최초 발생만 `isFirstOccurrence: true`를 반환하고 이후는 카운트만 늘린다.
 */
export function createFallbackWarnRecorder(
  options: CreateFallbackWarnRecorderOptions = {},
): FallbackWarnRecorder {
  const clock = options.clock ?? defaultClock;
  const stats = new Map<string, { count: number; firstWarnedAt: string; lastSeenAt: string }>();

  function record(group: string): FallbackWarnRecordResult {
    const now = clock();
    const existing = stats.get(group);
    if (existing === undefined) {
      stats.set(group, { count: 1, firstWarnedAt: now, lastSeenAt: now });
      return { isFirstOccurrence: true, count: 1 };
    }
    const count = existing.count + 1;
    stats.set(group, { ...existing, count, lastSeenAt: now });
    return { isFirstOccurrence: false, count };
  }

  function snapshot(): FallbackWarnSnapshot {
    const groups = [...stats.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, s]) => ({ group, ...s }));

    return {
      groups,
      totalLookups: groups.reduce((sum, g) => sum + g.count, 0),
      distinctGroupCount: groups.length,
      generatedAt: clock(),
    };
  }

  function reset(): void {
    stats.clear();
  }

  return { record, snapshot, reset };
}
