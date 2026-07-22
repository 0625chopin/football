import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { CommonCodeHistory } from "@/types";
import { EmptyState } from "@/components/state/EmptyState";

export interface ConfigHistoryDiffProps {
  readonly locale: SupportedLocale;
  readonly entries: readonly CommonCodeHistory[];
}

function formatDiffValue(value: string | null): string {
  return value ?? "—";
}

/**
 * H4 변경 이력 diff(`docs/wireframe/08-어드민-공통코드-스케줄러.md` H4) — Task 021(57일차,
 * 신규 화면 로컬 컴포넌트). `page.tsx`가 `DataSource.getCommonCodeHistory()`(1팀 계약, 기저)와
 * `config-history-store.ts`(이 화면의 저장 오버레이)를 `mergeConfigHistory()`로 합쳐 최신순
 * 배열을 내려준다 — 이 컴포넌트는 순수 렌더만 담당한다(컴포넌트 내 fetch 없음, C-5).
 *
 * append-only(NFR-SEC-010)라 이력 수정·삭제 UI는 두지 않는다. `이전값 → 신규값`을
 * 강조 표기(와이어프레임 H4 비고)한다.
 */
export function ConfigHistoryDiff({ locale, entries }: ConfigHistoryDiffProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <EmptyState locale={locale} titleKey="admin.config.history.empty" />
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.config.history.title")}</h2>
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-1 border-b border-border pb-3 text-sm last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-muted-foreground line-through">
                <span className="sr-only">{t(locale, "admin.config.history.oldValueLabel")} </span>
                {formatDiffValue(entry.oldValue)}
              </span>
              <span aria-hidden>→</span>
              <span className="scoreboard font-medium">
                <span className="sr-only">{t(locale, "admin.config.history.newValueLabel")} </span>
                {formatDiffValue(entry.newValue)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(locale, "admin.config.history.metaFormat", {
                changedBy: entry.changedBy,
                changedAt: entry.changedAt,
              })}
            </p>
            <p className="text-xs">{entry.reason}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
