"use client";

import { useState } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { formatKickoff } from "@/i18n/format";
import type { CronRun } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CronRunTableProps {
  readonly locale: SupportedLocale;
  /** 최근 100건(서버가 이미 `limit` 기본값으로 잘라 온 값) — I-3: 필터는 재요청 없이 클라이언트에서만 */
  readonly runs: readonly CronRun[];
}

type RunFilter = "ALL" | "FAILED" | "CATCH_UP";

const FILTERS: ReadonlyArray<{ readonly value: RunFilter; readonly labelKey: TranslationKey }> = [
  { value: "ALL", labelKey: "admin.scheduler.run.filterAll" },
  { value: "FAILED", labelKey: "admin.scheduler.run.filterFailed" },
  { value: "CATCH_UP", labelKey: "admin.scheduler.run.filterCatchUp" },
];

const STATUS_BADGE: Readonly<
  Record<CronRun["status"], { readonly icon: string; readonly labelKey: TranslationKey; readonly variant: "outline" | "secondary" | "destructive" } & { readonly warning?: true }>
> = {
  SUCCESS: { icon: "✓", labelKey: "admin.scheduler.run.statusSuccess", variant: "outline" },
  PARTIAL: { icon: "⚠", labelKey: "admin.scheduler.run.statusPartial", variant: "outline", warning: true },
  FAILED: { icon: "✕", labelKey: "admin.scheduler.run.statusFailed", variant: "destructive" },
  NOOP: { icon: "─", labelKey: "admin.scheduler.run.statusNoop", variant: "secondary" },
};

function RunStatusBadge({ locale, status }: { readonly locale: SupportedLocale; readonly status: CronRun["status"] }) {
  const spec = STATUS_BADGE[status];
  return (
    <Badge
      variant={spec.warning ? "outline" : spec.variant}
      className={spec.warning ? "border-warning bg-warning text-warning-foreground" : undefined}
    >
      <span aria-hidden>{spec.icon}</span>
      {t(locale, spec.labelKey)}
    </Badge>
  );
}

/**
 * J2 실행 이력 테이블(`docs/wireframe/08-어드민-공통코드-스케줄러.md` J2, FR-AD-018).
 * `AuditLogViewer`(G6)와 표 구조는 유사하나 컬럼·데이터 모델이 달라 화면 로컬로 분리했다
 * (같은 문서 §8). J2는 이미 최근 100건을 한 번에 다 받으므로(I-3) 필터가 서버 재요청 없이
 * 클라이언트 배열 필터로만 동작한다는 점이 G6(검색 시 서버 액션 재조회)와의 차이다.
 */
export function CronRunTable({ locale, runs }: CronRunTableProps) {
  const [filter, setFilter] = useState<RunFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = runs.filter((run) => {
    if (filter === "FAILED") return run.status === "FAILED";
    if (filter === "CATCH_UP") return run.isCatchUp;
    return true;
  });

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.scheduler.run.title")}</h2>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t(locale, "admin.scheduler.run.title")}>
        {FILTERS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            aria-pressed={filter === entry.value}
            onClick={() => setFilter(entry.value)}
            className={cn(
              "eyebrow inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1",
              filter === entry.value && "border-primary bg-primary/10 text-primary",
            )}
          >
            {t(locale, entry.labelKey)}
          </button>
        ))}
      </div>

      {runs.length === 0 && <p className="text-sm text-muted-foreground">{t(locale, "admin.scheduler.run.empty")}</p>}

      {runs.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">{t(locale, "admin.scheduler.run.emptyFilter")}</p>
      )}

      {filtered.length > 0 && (
        <>
          {/* 데스크톱(md+) — 표, 자체 가로 스크롤(NFR-RS-002) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t(locale, "admin.scheduler.run.caption")}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.scheduler.run.columnStarted")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.scheduler.run.columnDuration")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.scheduler.run.columnFixtures")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.scheduler.run.columnStatus")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.scheduler.run.columnLock")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((run) => (
                  <CronRunRows
                    key={run.id}
                    run={run}
                    locale={locale}
                    expanded={expandedId === run.id}
                    onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일(md 미만) — 카드 리스트 */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filtered.map((run) => (
              <li key={run.id} className="rounded-md border border-border p-3 text-sm">
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 text-left"
                  aria-expanded={expandedId === run.id}
                  onClick={() => setExpandedId(expandedId === run.id ? null : run.id)}
                >
                  <span className="scoreboard text-xs text-muted-foreground">
                    {formatKickoff(run.startedAt, locale, "time")}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <RunStatusBadge locale={locale} status={run.status} />
                    {run.isCatchUp && <Badge variant="secondary">{t(locale, "admin.scheduler.run.catchUpBadge")}</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(locale, "admin.scheduler.run.durationFormat", { value: run.durationMs })} ·{" "}
                    {t(locale, "admin.scheduler.run.fixturesFormat", { count: run.fixturesProcessed })} ·{" "}
                    <span aria-hidden>{run.lockAcquired ? "●" : "○"}</span>
                  </span>
                </button>
                {expandedId === run.id && <RunErrorDetail locale={locale} run={run} />}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function RunErrorDetail({ locale, run }: { readonly locale: SupportedLocale; readonly run: CronRun }) {
  if (!run.errorCode && !run.errorMessage) {
    return <p className="mt-2 text-xs text-muted-foreground">{t(locale, "admin.scheduler.run.error.none")}</p>;
  }

  return (
    <dl className="mt-2 flex flex-col gap-1 rounded-md bg-muted p-2 text-xs">
      {run.errorCode && (
        <div className="flex gap-2">
          <dt className="text-muted-foreground">{t(locale, "admin.scheduler.run.error.codeLabel")}</dt>
          <dd className="scoreboard">{run.errorCode}</dd>
        </div>
      )}
      {run.errorMessage && (
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted-foreground">{t(locale, "admin.scheduler.run.error.messageLabel")}</dt>
          <dd className="overflow-x-auto whitespace-pre-wrap">{run.errorMessage}</dd>
        </div>
      )}
    </dl>
  );
}

function CronRunRows({
  run,
  locale,
  expanded,
  onToggle,
}: {
  readonly run: CronRun;
  readonly locale: SupportedLocale;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border last:border-0">
        <td className="py-2 pr-3">
          <button
            type="button"
            className="scoreboard text-left underline-offset-2 hover:underline"
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {formatKickoff(run.startedAt, locale, "time")}
          </button>
        </td>
        <td className="scoreboard py-2 pr-3">
          {t(locale, "admin.scheduler.run.durationFormat", { value: run.durationMs })}
        </td>
        <td className="scoreboard py-2 pr-3">
          {t(locale, "admin.scheduler.run.fixturesFormat", { count: run.fixturesProcessed })}
        </td>
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1.5">
            <RunStatusBadge locale={locale} status={run.status} />
            {run.isCatchUp && <Badge variant="secondary">{t(locale, "admin.scheduler.run.catchUpBadge")}</Badge>}
          </div>
        </td>
        <td className="py-2 pr-3" aria-label={t(locale, run.lockAcquired ? "admin.scheduler.status.lockAcquired" : "admin.scheduler.status.lockNone")}>
          <span aria-hidden>{run.lockAcquired ? "●" : "○"}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={5} className="pb-3">
            <RunErrorDetail locale={locale} run={run} />
          </td>
        </tr>
      )}
    </>
  );
}
