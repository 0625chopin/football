"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";

import { lookupMatchSeed } from "./actions";

export interface SeedInspectorPanelProps {
  readonly locale: SupportedLocale;
  readonly worldSeed: number;
  readonly seasonSeed: number | null;
  readonly seasonNumber: number | null;
}

type LookupState =
  | { readonly status: "idle" }
  | { readonly status: "found"; readonly matchId: string; readonly matchSeed: number }
  | { readonly status: "notFound" };

/**
 * G4 시드 조회(`docs/wireframe/07-어드민-운영콘솔.md` G4, FR-AD-003, **읽기 전용**).
 * `world_seed`/`season_seed`는 부모(`page.tsx`)가 이미 조회한 값을 그대로 받고,
 * `match_seed`만 `lookupMatchSeed` 서버 액션(`getFixture` 위임, 오버레이 없음)으로
 * 인터랙티브하게 조회한다.
 *
 * 시드는 **고정폭 폰트(`scoreboard`)로 원시 정수 그대로** 표시하고 천단위 콤마를 넣지
 * 않는다(값 오독 방지, D-28 53비트 완화 반영 — 최대 16자리까지 나올 수 있어 좁은 화면에서
 * 넘칠 수 있으므로 `overflow-x-auto`로 감싼다, NFR-RS-002).
 */
export function SeedInspectorPanel({ locale, worldSeed, seasonSeed, seasonNumber }: SeedInspectorPanelProps) {
  const [matchId, setMatchId] = useState("");
  const [result, setResult] = useState<LookupState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleLookup() {
    const trimmed = matchId.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const outcome = await lookupMatchSeed(trimmed);
      setResult(
        outcome.found && outcome.matchSeed !== undefined
          ? { status: "found", matchId: trimmed, matchSeed: outcome.matchSeed }
          : { status: "notFound" },
      );
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.seed.title")}</h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t(locale, "admin.seed.worldSeedLabel")}</dt>
          <dd className="scoreboard max-w-full overflow-x-auto text-right whitespace-nowrap">{worldSeed}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">
            {t(locale, "admin.seed.seasonSeedLabel")}
            {seasonNumber !== null && (
              <span className="ml-1">
                {t(locale, "admin.seed.seasonSeedContextFormat", { season: seasonNumber })}
              </span>
            )}
          </dt>
          <dd className="scoreboard max-w-full overflow-x-auto text-right whitespace-nowrap">
            {seasonSeed ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <label className="text-sm text-muted-foreground" htmlFor="admin-match-seed-input">
          {t(locale, "admin.seed.matchSeedLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="admin-match-seed-input"
            type="text"
            value={matchId}
            onChange={(event) => setMatchId(event.target.value)}
            placeholder={t(locale, "admin.seed.matchIdPlaceholder")}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"
          />
          <Button type="button" size="sm" onClick={handleLookup} disabled={isPending || !matchId.trim()}>
            {t(locale, "admin.seed.lookupButton")}
          </Button>
        </div>
        {result.status === "found" && (
          <p className="scoreboard overflow-x-auto text-sm" role="status">
            {t(locale, "admin.seed.lookupResultFormat", { matchId: result.matchId, value: result.matchSeed })}
          </p>
        )}
        {result.status === "notFound" && (
          <p className="text-sm text-muted-foreground" role="status">
            {t(locale, "admin.seed.notFound")}
          </p>
        )}
      </div>
    </section>
  );
}
