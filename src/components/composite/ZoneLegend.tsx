import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { League } from "@/types";
import { cn } from "@/lib/utils";
import { listApplicableZones, type ZoneKind } from "./standings-zone";

/**
 * `/leagues/[leagueId]` B2 존 범례 — Task 016(39일차, 5팀), 화면 로컬(리그별 동적).
 *
 * NFR-A11Y-002 대응의 핵심 영역이다(와이어프레임 §4 B2 비고) — `StandingsTable`의 행
 * 마커가 아이콘만으로는 뜻이 불충분할 수 있어, 이 범례가 항상 노출돼 아이콘·색·라벨
 * 3중 대응의 "사전"을 제공한다. 리그마다 승격/강등 존이 있는지 다르므로(리그1엔 승격
 * 없음, 리그3엔 강등 없음) `listApplicableZones`로 해당 리그에 실제 존재하는 존만 그린다.
 */

type LegendZoneKind = Exclude<ZoneKind, "NEUTRAL" | "PROMOTION_PLAYOFF">;

const ZONE_ICON: Record<LegendZoneKind, string> = {
  PROMOTION: "▲",
  PLAYOFF: "◆",
  RELEGATION: "▼",
};

const ZONE_COLOR_CLASS: Record<LegendZoneKind, string> = {
  PROMOTION: "text-promotion",
  PLAYOFF: "text-playoff",
  RELEGATION: "text-relegation",
};

const ZONE_LABEL_KEY: Record<
  LegendZoneKind,
  "league.zone.promotionLabel" | "league.zone.playoffLabel" | "league.zone.relegationLabel"
> = {
  PROMOTION: "league.zone.promotionLabel",
  PLAYOFF: "league.zone.playoffLabel",
  RELEGATION: "league.zone.relegationLabel",
};

export interface ZoneLegendProps {
  readonly locale: SupportedLocale;
  readonly league: Pick<League, "tier">;
  readonly className?: string;
}

export function ZoneLegend({ locale, league, className }: ZoneLegendProps) {
  const zones = listApplicableZones(league);

  return (
    <ul
      aria-label={t(locale, "league.zone.legendTitle")}
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm", className)}
    >
      {zones.map((zone) => (
        <li key={zone} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("scoreboard", ZONE_COLOR_CLASS[zone])}>
            {ZONE_ICON[zone]}
          </span>
          <span>{t(locale, ZONE_LABEL_KEY[zone])}</span>
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden="true" className="scoreboard">
          —
        </span>
        <span>{t(locale, "league.zone.neutralLabel")}</span>
      </li>
    </ul>
  );
}
