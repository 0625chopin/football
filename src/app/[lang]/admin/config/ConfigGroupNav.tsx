"use client";

import { useState } from "react";
import Link from "next/link";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import type { CommonCodeApplyPolicy } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConfigGroupNavEntry {
  readonly groupCode: string;
  readonly groupName: string;
  readonly applyPolicy: CommonCodeApplyPolicy;
  readonly relatedFr: readonly string[];
  readonly codeCount: number;
}

export interface ConfigGroupNavProps {
  readonly locale: SupportedLocale;
  readonly lang: string;
  readonly groups: readonly ConfigGroupNavEntry[];
  readonly selectedGroupCode?: string;
  /** 모바일 2단계 네비게이션에서 그룹 선택 시 이 목록을 숨기는 데 쓰는 클래스 훅. */
  readonly className?: string;
}

const POLICY_KEY: Readonly<Record<CommonCodeApplyPolicy, TranslationKey>> = {
  NEXT_SEASON: "admin.config.edit.policyNextSeason",
  IMMEDIATE: "admin.config.edit.policyImmediate",
  NEXT_MARKET: "admin.config.edit.policyNextMarket",
};

/**
 * H1 그룹 목록(`docs/wireframe/08-어드민-공통코드-스케줄러.md` H1) — 와이어프레임 H5
 * "그룹명 검색"을 클라이언트 필터로 구현한다(36(38)개는 이미 전량 로드돼 있어 재요청이
 * 필요 없다, 같은 문서 H5 비고). 필터는 표시만 줄일 뿐 **로드된 목록 자체는 항상 전량**이라
 * "36(38)개 그룹 전량 표시" 수락 기준과 충돌하지 않는다(빈 검색어 = 전량 표시).
 */
export function ConfigGroupNav({ locale, lang, groups, selectedGroupCode, className }: ConfigGroupNavProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? groups.filter(
        (group) =>
          group.groupName.toLowerCase().includes(needle) ||
          group.groupCode.toLowerCase().includes(needle) ||
          group.relatedFr.some((fr) => fr.toLowerCase().includes(needle)),
      )
    : groups;

  return (
    <nav aria-label={t(locale, "admin.config.group.title")} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-2">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.config.group.title")}</h2>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(locale, "admin.config.group.searchPlaceholder")}
          aria-label={t(locale, "admin.config.group.searchPlaceholder")}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </div>

      <ul className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
        {filtered.map((group) => {
          const isSelected = group.groupCode === selectedGroupCode;
          return (
            <li key={group.groupCode}>
              <Link
                href={`/${lang}/admin/config?group=${group.groupCode}`}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-md border border-transparent px-3 py-2 text-sm hover:bg-accent",
                  isSelected && "touchline touchline-on border-border bg-accent",
                )}
              >
                <span className="font-medium">{group.groupCode}</span>
                <span className="text-xs text-muted-foreground">
                  {group.groupName} · {t(locale, "admin.config.group.countFormat", { count: group.codeCount })}
                </span>
                <span className="flex flex-wrap gap-1">
                  {group.relatedFr.map((fr) => (
                    <Badge key={fr} variant="outline" className="text-[10px]">
                      {fr}
                    </Badge>
                  ))}
                  <Badge variant="secondary" className="text-[10px]">
                    {t(locale, POLICY_KEY[group.applyPolicy])}
                  </Badge>
                </span>
              </Link>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-muted-foreground">
            {t(locale, "admin.config.group.emptyFilter")}
          </li>
        )}
      </ul>

      <p className="text-xs text-muted-foreground">
        {t(locale, "admin.config.group.totalFormat", { count: groups.length })}
      </p>
    </nav>
  );
}
