"use client";

import { useEffect, useState } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { formatKickoff } from "@/i18n/format";
import type { CronRun } from "@/types";

import { computeSecondsAgo, estimateNextRunAt } from "./scheduler-elapsed";

export interface CronStatusSummaryProps {
  readonly locale: SupportedLocale;
  /** J1 — `getLatestCronRun()` 결과. 실행 이력이 없으면 null */
  readonly latestRun: CronRun | null;
  /** `CRON_PARAM.INTERVAL_MIN`(분) — "다음 예정" 추정에 쓰인다 */
  readonly intervalMin: number;
  /** `getCronRuns()` 최신순 목록에서 미리 센 연속 실패 횟수 */
  readonly consecutiveFailures: number;
}

/**
 * J1 크론 상태 요약(`docs/wireframe/08-어드민-공통코드-스케줄러.md` J1, FR-AD-018/022).
 * "마지막 실행 …(N초 전)"만 실시간 tick이 필요해(`CountdownTimer`/`PauseResumeControl`과
 * 동일 이유로 `Date.now()`를 `useEffect` 안에서만 호출) 클라이언트 컴포넌트다 — "다음 예정"
 * 은 고정 추정 시각이라 서버에서 이미 계산해 문자열로 내려받는다.
 */
export function CronStatusSummary({ locale, latestRun, intervalMin, consecutiveFailures }: CronStatusSummaryProps) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    // 두 분기(실행 이력 없음/있음) 모두 이 지역 함수 안에서만 setState한다 —
    // 효과 본문 최상위에서 직접 호출하면 react-hooks/set-state-in-effect가 cascading
    // render 위험으로 잡는다(`CountdownTimer`/`PauseResumeControl`과 동일 회피 패턴).
    const sync = () => {
      if (!latestRun) {
        setSecondsAgo(null);
        return;
      }
      setSecondsAgo(computeSecondsAgo(latestRun.startedAt, Date.now()));
    };

    sync();
    if (!latestRun) return;

    const intervalId = setInterval(sync, 1000);
    return () => clearInterval(intervalId);
  }, [latestRun]);

  const nextEstimatedAt = estimateNextRunAt(latestRun?.startedAt ?? null, intervalMin);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.scheduler.status.title")}</h2>

      {!latestRun ? (
        <p className="text-sm text-muted-foreground">{t(locale, "admin.scheduler.status.noRunYet")}</p>
      ) : (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm text-muted-foreground">{t(locale, "admin.scheduler.status.lastRunLabel")}</span>
          <span className="scoreboard text-sm">{formatKickoff(latestRun.startedAt, locale, "time")}</span>
          <span className="text-xs text-muted-foreground">
            (
            {secondsAgo === null
              ? "--"
              : t(locale, "admin.scheduler.status.secondsAgoFormat", { seconds: secondsAgo })}
            )
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted-foreground">{t(locale, "admin.scheduler.status.lockLabel")}</span>
          <span aria-hidden>{latestRun?.lockAcquired ? "●" : "○"}</span>
          {t(locale, latestRun?.lockAcquired ? "admin.scheduler.status.lockAcquired" : "admin.scheduler.status.lockNone")}
        </span>

        <span className={consecutiveFailures > 0 ? "text-destructive" : "text-muted-foreground"}>
          {t(locale, "admin.scheduler.status.consecutiveFailuresFormat", { count: consecutiveFailures })}
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {nextEstimatedAt
          ? t(locale, "admin.scheduler.status.nextEstimatedFormat", {
              time: formatKickoff(nextEstimatedAt, locale, "time"),
              interval: intervalMin,
            })
          : t(locale, "admin.scheduler.status.nextEstimatedUnknown")}
      </p>
    </section>
  );
}
