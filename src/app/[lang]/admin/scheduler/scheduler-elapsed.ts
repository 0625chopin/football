import type { CronRun } from "@/types";

/**
 * J1 "N초 전" 계산(`docs/wireframe/08-어드민-공통코드-스케줄러.md` J1). `elapsed.ts`(G3)와
 * 동일 이유로 `src/i18n/format.ts`(4팀 소유)에 두지 않고 화면 로컬에 둔다.
 */
export function computeSecondsAgo(fromIso: string, nowMs: number): number {
  const fromMs = new Date(fromIso).getTime();
  return Math.max(0, Math.floor((nowMs - fromMs) / 1000));
}

/** J1 "다음 예정" 추정 — 마지막 실행 시작 시각 + 크론 주기(분). 마지막 실행이 없으면 null */
export function estimateNextRunAt(lastRunStartedAt: string | null, intervalMin: number): string | null {
  if (!lastRunStartedAt) return null;
  const nextMs = new Date(lastRunStartedAt).getTime() + intervalMin * 60_000;
  return new Date(nextMs).toISOString();
}

/**
 * J1 "연속 실패 횟수" — `runs`는 최신순(내림차순)이 전제다(`getCronRuns` 계약, J2와 동일
 * 정렬). 최신 실행부터 FAILED가 아닌 첫 항목 직전까지만 센다.
 */
export function countConsecutiveFailures(runs: readonly CronRun[]): number {
  let count = 0;
  for (const run of runs) {
    if (run.status !== "FAILED") break;
    count++;
  }
  return count;
}
