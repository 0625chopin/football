import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { formatKickoff } from "@/i18n/format";
import type { CronGap } from "@/types";
import { Badge } from "@/components/ui/badge";

export interface CronGapListProps {
  readonly locale: SupportedLocale;
  readonly gaps: readonly CronGap[];
}

/**
 * J4 중단 구간(`docs/wireframe/08-어드민-공통코드-스케줄러.md` J4, FR-AD-020). **조건부
 * 섹션** — 중단 이력이 없으면 렌더하지 않는다(호출부 `page.tsx`가 `gaps.length`로 분기하지만,
 * 이 컴포넌트도 방어적으로 한 번 더 확인한다).
 *
 * "밀린 라운드 수" 라벨은 team-schedule 원문 표현을 그대로 쓰되(W-47 미확정 — 팀장 판정
 * 대기), 실제 값은 `missedFixtureCount`(Fixture 단위)라 `title` 툴팁으로 단위를 명시해
 * 오해를 줄인다.
 */
export function CronGapList({ locale, gaps }: CronGapListProps) {
  if (gaps.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.scheduler.gap.title")}</h2>
      <ul className="flex flex-col gap-2">
        {gaps.map((gap) => {
          const isRecovered = gap.recoveredAt !== null;
          return (
            <li key={gap.id} className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span aria-hidden>⚠</span>
                <span className="scoreboard">
                  {t(locale, "admin.scheduler.gap.rangeFormat", {
                    start: formatKickoff(gap.gapStartedAt, locale, "dateTime"),
                    end: gap.gapEndedAt
                      ? formatKickoff(gap.gapEndedAt, locale, "dateTime")
                      : t(locale, "admin.scheduler.gap.ongoing"),
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(locale, "admin.scheduler.gap.durationFormat", { minutes: gap.gapMinutes })}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span title={t(locale, "admin.scheduler.gap.missedUnitHint")}>
                  {t(locale, "admin.scheduler.gap.missedLabel")}{" "}
                  {t(locale, "admin.scheduler.gap.missedFormat", { count: gap.missedFixtureCount })}
                </span>
                <Badge variant={isRecovered ? "outline" : "destructive"}>
                  {t(locale, isRecovered ? "admin.scheduler.gap.statusRecovered" : "admin.scheduler.gap.statusOngoing")}
                </Badge>
                {isRecovered && gap.recoveredAt && (
                  <span>
                    {t(locale, "admin.scheduler.gap.recoveredAtFormat", {
                      time: formatKickoff(gap.recoveredAt, locale, "dateTime"),
                    })}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
