"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuditActorType, AuditLog } from "@/types";

import { fetchAuditLogs } from "./actions";

export interface AuditLogViewerProps {
  readonly locale: SupportedLocale;
  readonly initialLogs: readonly AuditLog[];
}

type ActorFilter = AuditActorType | "ALL";

const ACTOR_FILTERS: ReadonlyArray<{
  readonly value: ActorFilter;
  readonly labelKey: TranslationKey;
  readonly icon: string;
}> = [
  { value: "ALL", labelKey: "admin.log.filterAll", icon: "🗂" },
  { value: "HUMAN", labelKey: "admin.log.filterHuman", icon: "🧑" },
  { value: "ENGINE", labelKey: "admin.log.filterEngine", icon: "⚙" },
  { value: "ODDS", labelKey: "admin.log.filterOdds", icon: "🎲" },
  { value: "SETTLEMENT", labelKey: "admin.log.filterSettlement", icon: "💰" },
];

/**
 * G6 로그 뷰어(`docs/wireframe/07-어드민-운영콘솔.md` G6, FR-AD-007). `actor_type` 필터 +
 * 검색(I-7, 서버 파라미터로 재요청) + 행 클릭 시 `payload` JSON 아코디언(I-8, 가공 없이
 * 원시 JSON — "운영자용 화면이므로 가공 없음").
 *
 * 초기 데이터는 `page.tsx`(서버 컴포넌트)가 `fetchAuditLogs()`로 무필터 조회해 prop으로
 * 내려준다. 필터·검색 변경 시에는 같은 서버 액션을 클라이언트에서 직접 호출해 재조회한다
 * (`SeedInspectorPanel`이 `lookupMatchSeed`를 호출하는 것과 동일 패턴).
 *
 * 데스크톱은 자체 `overflow-x:auto` 테이블(R-6/NFR-RS-002), 모바일(md 미만)은 카드 리스트로
 * 완전히 다른 마크업을 쓴다(§3-1/§3-2 레이아웃 명세) — `sm`이 아니라 `md`가 전환점이다(I-184).
 */
export function AuditLogViewer({ locale, initialLogs }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<readonly AuditLog[]>(initialLogs);
  const [actorFilter, setActorFilter] = useState<ActorFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refetch(nextActorFilter: ActorFilter, nextSearch: string) {
    startTransition(async () => {
      try {
        const result = await fetchAuditLogs({
          actorType: nextActorFilter === "ALL" ? undefined : nextActorFilter,
          search: nextSearch.trim() || undefined,
        });
        setLogs(result);
        setHasError(false);
      } catch {
        setHasError(true);
      }
    });
  }

  function handleFilterClick(value: ActorFilter) {
    setActorFilter(value);
    refetch(value, searchInput);
  }

  function handleSearchSubmit() {
    refetch(actorFilter, searchInput);
  }

  function handleRetry() {
    setHasError(false);
    refetch(actorFilter, searchInput);
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.log.title")}</h2>

      <div className="flex flex-wrap gap-2" role="group" aria-label={t(locale, "admin.log.title")}>
        {ACTOR_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={actorFilter === filter.value}
            onClick={() => handleFilterClick(filter.value)}
            className={cn(
              "eyebrow inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1",
              actorFilter === filter.value && "border-primary bg-primary/10 text-primary",
            )}
          >
            <span aria-hidden>{filter.icon}</span>
            {t(locale, filter.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSearchSubmit();
          }}
          placeholder={t(locale, "admin.log.searchPlaceholder")}
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={handleSearchSubmit} disabled={isPending}>
          <span aria-hidden>🔍</span>
          {t(locale, "admin.log.searchButton")}
        </Button>
      </div>

      {hasError && (
        <div className="flex flex-col items-start gap-2 text-sm text-destructive" role="alert">
          <p>{t(locale, "admin.log.error")}</p>
          <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
            {t(locale, "admin.log.retryButton")}
          </Button>
        </div>
      )}

      {!hasError && logs.length === 0 && (
        <p className="text-sm text-muted-foreground">{t(locale, "admin.log.empty")}</p>
      )}

      {!hasError && logs.length > 0 && (
        <>
          {/* 데스크톱(md+) — 표 마크업, 자체 가로 스크롤 */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{t(locale, "admin.log.caption")}</caption>
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.log.columnTime")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.log.columnActor")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.log.columnAction")}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {t(locale, "admin.log.columnTarget")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <AuditLogRows
                    key={entry.id}
                    entry={entry}
                    locale={locale}
                    expanded={expandedId === entry.id}
                    onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일(md 미만) — 카드 리스트 */}
          <ul className="flex flex-col gap-2 md:hidden">
            {logs.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border p-3 text-sm">
                <button
                  type="button"
                  className="flex w-full flex-col gap-1 text-left"
                  aria-expanded={expandedId === entry.id}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <span className="scoreboard text-xs text-muted-foreground">{entry.createdAt}</span>
                  <span className="font-medium">{entry.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.actorType} · {entry.targetType}#{entry.targetId}
                  </span>
                </button>
                {expandedId === entry.id && (
                  <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function AuditLogRows({
  entry,
  locale,
  expanded,
  onToggle,
}: {
  readonly entry: AuditLog;
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
            {entry.createdAt}
          </button>
        </td>
        <td className="py-2 pr-3">{entry.actorType}</td>
        <td className="py-2 pr-3">{entry.action}</td>
        <td className="py-2 pr-3">
          {entry.targetType}#{entry.targetId}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={4} className="pb-3">
            <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
              {JSON.stringify(entry.payload, null, 2)}
            </pre>
            <span className="sr-only">{t(locale, "admin.log.payloadToggle")}</span>
          </td>
        </tr>
      )}
    </>
  );
}
