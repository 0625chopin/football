import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { CronRunMetrics } from "@/lib/data/DataSource";

export interface CronMetricCardsProps {
  readonly locale: SupportedLocale;
  readonly metrics: CronRunMetrics;
}

/**
 * J3 지표 카드(`docs/wireframe/08-어드민-공통코드-스케줄러.md` J3, FR-AD-022 수용 기준 ③).
 * `CronRunMetrics`는 이미 서버 파생값이라(R-10) 클라이언트가 다시 계산하지 않고 그대로
 * 표시만 한다 — hooks가 필요 없어 서버 컴포넌트로 둔다.
 */
export function CronMetricCards({ locale, metrics }: CronMetricCardsProps) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.scheduler.metric.title")}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t(locale, "admin.scheduler.metric.successRateLabel")}</span>
          <span className="scoreboard text-lg">
            {t(locale, "admin.scheduler.metric.percentFormat", { value: metrics.successRatePct })}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t(locale, "admin.scheduler.metric.avgDurationLabel")}</span>
          <span className="scoreboard text-lg">
            {t(locale, "admin.scheduler.metric.msFormat", { value: metrics.avgDurationMs })}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t(locale, "admin.scheduler.metric.maxDurationLabel")}</span>
          <span className="scoreboard text-lg">
            {t(locale, "admin.scheduler.metric.msFormat", { value: metrics.maxDurationMs })}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(locale, "admin.scheduler.metric.sampleFormat", { count: metrics.sampleSize })}
      </p>
    </section>
  );
}
