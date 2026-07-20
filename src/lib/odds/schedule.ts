/**
 * 배당 산출 스케줄링 정책 — "언제" (재)산출을 실행할지 결정한다.
 *
 * Task 035 / 32일차(2026-09-02) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 32일차 행: "킥오프 T-30분 산출, 라인업 확정·부상 발생 시 재산출(킥오프 이후 미수행)".
 * 수락 기준: "킥오프 후 재산출 0건".
 *
 * ## 이 파일의 책임 범위 — "언제"만, "무엇을"은 아님
 * 실제 배당/확률 계산(`match-market.ts`/`season-market.ts`/`tournament-market.ts`/
 * `overround.ts`)은 이 파일 책임이 아니다. 이 파일은 (재)산출 실행 여부만 판정하는 순수
 * 함수 집합이며, 판정 결과를 받아 실제 산출 함수를 호출하는 오케스트레이션(워커/큐)은
 * 33일차 `worker.ts` 소관이다(27일차 `runner.ts`·28일차 `match-market.ts` 주석과 동일한
 * 책임 분리 원칙).
 *
 * ## 순수 함수 — `Date.now()` 미사용 (NFR-DT-001)
 * 모든 함수가 "현재 시각"을 `now: Timestamp` 인자로 받는다. 리드타임(T-30분 등)도 이
 * 파일에 리터럴로 두지 않고 호출자가 분 단위 숫자로 주입한다 —
 * `src/lib/sim/schedule/kickoff.ts`(2팀, 27일차)의 "값을 함수 파라미터로 주입받는다"
 * 규약과 동일하다(NFR-CFG-001). 리드타임 30은 오늘 ROADMAP 행의 정책값이지 이 파일이
 * 정하는 숫자가 아니므로, 실제 30이라는 값은 호출자(`worker.ts` 또는 `ODDS_PARAM` 확장)가
 * 공급한다.
 *
 * ## 핵심 불변식 — 킥오프 이후 재산출 금지
 * `now >= kickoffAt`이면 최초 산출·재산출·트리거 종류를 불문하고 항상
 * `shouldCompute: false`를 반환한다(`hasKickoffPassed`). 이 한 줄이 오늘 수락 기준
 * ("킥오프 후 재산출 0건")의 전체 근거다. 등호를 포함하는 이유: 킥오프 순간부터는 더 이상
 * "경기 전" 배당의 전제(라인업·부상 등 사전 정보로 확률을 조정)가 성립하지 않기 때문이다.
 *
 * ## 재산출 트리거의 시점 가정 (판단 지점 — 후속 검토 대상)
 * `decideRecompute`는 "트리거가 킥오프 이전에 발생했다"는 사실만으로 재산출을 허용한다 —
 * 최초 산출 윈도(T-30분) 도달 여부는 확인하지 않는다. 라인업 확정·부상 발생이 T-30분보다
 * 이른 시점(예: T-45분)에 일어날 수 있고, 그 경우에도 "그 시점 기준 최선 정보로 즉시
 * 갱신"이 "T-30분까지 기다렸다가 갱신"보다 사용자에게 유리하다고 판단했다. 최초 산출 자체가
 * 아직 없었던 상태에서 재산출 트리거만 먼저 온 케이스(최초 산출을 재산출이 대신 여는 경우)의
 * 구분은 `worker.ts`가 "이미 산출된 적 있는지" 상태를 갖고 처리할 몫으로 남긴다 — 이 파일은
 * 상태를 갖지 않는 순수 함수이므로 "직전 산출 여부"를 알 수 없다.
 */

import type { Timestamp } from '@/types';

/** 배당 (재)산출을 유발하는 사유. */
export type OddsComputeTrigger = 'INITIAL_WINDOW' | 'LINEUP_CONFIRMED' | 'INJURY_OCCURRED';

/** 재산출 트리거(최초 산출 제외) — `decideRecompute`가 받는 트리거 부분집합. */
export type OddsRecomputeTrigger = Extract<OddsComputeTrigger, 'LINEUP_CONFIRMED' | 'INJURY_OCCURRED'>;

/** `shouldCompute: false`일 때만 값을 갖는 스킵 사유. */
export type OddsComputeSkipReason = 'BEFORE_INITIAL_WINDOW' | 'KICKOFF_PASSED';

export interface OddsComputeDecision {
  readonly shouldCompute: boolean;
  readonly trigger: OddsComputeTrigger;
  /** `shouldCompute === true`이면 항상 `null`. */
  readonly skipReason: OddsComputeSkipReason | null;
}

function toEpochMs(label: string, field: string, timestamp: Timestamp): number {
  const ms = new Date(timestamp).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`${label}: ${field}가 유효한 ISO 타임스탬프가 아닙니다 (받은 값: "${timestamp}").`);
  }
  return ms;
}

/**
 * 킥오프가 이미 지났는지(또는 정확히 킥오프 순간인지) 판정한다. 이 파일 전체가 지키는
 * 핵심 불변식("킥오프 후 재산출 0건")의 단일 근거 — `decideInitialCompute`/`decideRecompute`
 * 둘 다 이 함수를 거쳐 킥오프 이후를 차단한다.
 */
export function hasKickoffPassed(now: Timestamp, kickoffAt: Timestamp): boolean {
  const nowMs = toEpochMs('hasKickoffPassed', 'now', now);
  const kickoffMs = toEpochMs('hasKickoffPassed', 'kickoffAt', kickoffAt);
  return nowMs >= kickoffMs;
}

/**
 * 최초 배당 산출 시각(킥오프 T-`leadMinutes`분)을 계산한다. `leadMinutes`는 호출자가
 * 정책값(오늘 기준 30)을 그대로 주입한다 — 이 함수는 리드타임 숫자를 정하지 않는다.
 */
export function computeInitialComputeAt(kickoffAt: Timestamp, leadMinutes: number): Timestamp {
  if (!(leadMinutes > 0)) {
    throw new Error(
      `computeInitialComputeAt: leadMinutes는 0보다 커야 합니다 (받은 값: ${leadMinutes}).`,
    );
  }
  const kickoffMs = toEpochMs('computeInitialComputeAt', 'kickoffAt', kickoffAt);
  return new Date(kickoffMs - leadMinutes * 60_000).toISOString();
}

/**
 * 최초 산출(킥오프 T-`leadMinutes`분) 실행 여부를 결정한다.
 *
 * - `now`가 킥오프 이상이면 항상 스킵(`KICKOFF_PASSED`) — 최초 산출을 놓친 경기를 뒤늦게
 *   "최초 산출"로 처리하지 않는다(그 경우는 애초에 배당을 노출하지 않는 편이 낫다는 정책
 *   판단이며, 재산출 트리거로도 되살아나지 않는다는 점이 이 함수와 `decideRecompute`가
 *   공유하는 불변식이다).
 * - 산출 윈도(T-`leadMinutes`분) 도달 전이면 스킵(`BEFORE_INITIAL_WINDOW`).
 * - 그 사이(윈도 도달 이후 ~ 킥오프 이전)면 실행.
 */
export function decideInitialCompute(
  now: Timestamp,
  kickoffAt: Timestamp,
  leadMinutes: number,
): OddsComputeDecision {
  if (hasKickoffPassed(now, kickoffAt)) {
    return { shouldCompute: false, trigger: 'INITIAL_WINDOW', skipReason: 'KICKOFF_PASSED' };
  }

  const nowMs = toEpochMs('decideInitialCompute', 'now', now);
  const initialComputeAtMs = toEpochMs(
    'decideInitialCompute',
    'initialComputeAt',
    computeInitialComputeAt(kickoffAt, leadMinutes),
  );

  if (nowMs < initialComputeAtMs) {
    return { shouldCompute: false, trigger: 'INITIAL_WINDOW', skipReason: 'BEFORE_INITIAL_WINDOW' };
  }

  return { shouldCompute: true, trigger: 'INITIAL_WINDOW', skipReason: null };
}

/**
 * 라인업 확정(`LINEUP_CONFIRMED`)·부상 발생(`INJURY_OCCURRED`) 트리거에 의한 재산출 여부를
 * 결정한다. 유일한 차단 조건은 "킥오프 이후"뿐이다 — 그 전이면 트리거 발생 자체가 재산출
 * 사유다(파일 상단 "재산출 트리거의 시점 가정" 참조).
 */
export function decideRecompute(
  now: Timestamp,
  kickoffAt: Timestamp,
  trigger: OddsRecomputeTrigger,
): OddsComputeDecision {
  if (hasKickoffPassed(now, kickoffAt)) {
    return { shouldCompute: false, trigger, skipReason: 'KICKOFF_PASSED' };
  }

  return { shouldCompute: true, trigger, skipReason: null };
}
