import Link from "next/link";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { CommonCode } from "@/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/EmptyState";

export interface ConfigCodeTableProps {
  readonly locale: SupportedLocale;
  readonly lang: string;
  readonly groupCode: string;
  readonly groupName: string;
  readonly codes: readonly CommonCode[];
  readonly selectedCode?: string;
}

function formatScalarValue(entry: CommonCode): string {
  return entry.valueJson === null ? entry.value : JSON.stringify(entry.valueJson);
}

/**
 * H2 코드 목록(`docs/wireframe/08-어드민-공통코드-스케줄러.md` H2) — 자체 `overflow-x:auto`
 * (R-6). JSON 타입 코드는 값 칸을 "JSON 보기" 링크로 축약한다(와이어프레임 H2 비고 — 전체
 * 펼치면 폭이 과도).
 */
export function ConfigCodeTable({
  locale,
  lang,
  groupCode,
  groupName,
  codes,
  selectedCode,
}: ConfigCodeTableProps) {
  if (codes.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 md:p-6">
        <EmptyState locale={locale} titleKey="admin.config.code.empty" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableCaption>{t(locale, "admin.config.code.captionFormat", { groupName })}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t(locale, "admin.config.code.columnCode")}</TableHead>
            <TableHead scope="col">{t(locale, "admin.config.code.columnValue")}</TableHead>
            <TableHead scope="col">{t(locale, "admin.config.code.columnDefault")}</TableHead>
            <TableHead scope="col">{t(locale, "admin.config.code.columnUnit")}</TableHead>
            <TableHead scope="col">{t(locale, "admin.config.code.columnActive")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((entry) => {
            const isSelected = entry.code === selectedCode;
            const isJson = entry.valueJson !== null;
            const href = `/${lang}/admin/config?group=${groupCode}&code=${entry.code}`;

            return (
              <TableRow key={entry.code} aria-current={isSelected ? "true" : undefined} className={cn(isSelected && "bg-accent")}>
                <TableCell>
                  <Link
                    href={href}
                    className={cn("font-medium underline-offset-2 hover:underline", isSelected && "touchline touchline-on")}
                  >
                    {entry.code}
                  </Link>
                </TableCell>
                <TableCell className="scoreboard">
                  {isJson ? (
                    <Link href={href} className="text-xs underline underline-offset-2">
                      {t(locale, "admin.config.code.jsonViewLink")}
                    </Link>
                  ) : (
                    formatScalarValue(entry)
                  )}
                </TableCell>
                <TableCell className="scoreboard text-muted-foreground">{entry.defaultValue}</TableCell>
                <TableCell className="text-muted-foreground">{entry.unit ?? "—"}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      entry.isActive ? "text-live" : "text-muted-foreground",
                    )}
                  >
                    <span aria-hidden>{entry.isActive ? "●" : "○"}</span>
                    {t(locale, entry.isActive ? "admin.config.code.activeTrue" : "admin.config.code.activeFalse")}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
