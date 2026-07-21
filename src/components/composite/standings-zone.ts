import type { League } from "@/types";

/**
 * 순위표 존 판별 — 와이어프레임 `02-리그-순위표.md` "존 표기 규약" 표를 그대로 코드화한다.
 *
 * 승격은 위 티어가 있는 리그(tier > 1)에서만, 강등은 아래 티어가 있는 리그(tier < 3)에서만
 * 성립한다 — 리그1엔 승격이 없고(최상위), 리그3엔 강등이 없다(최하위, 대신 리빌드 제재가
 * 적용되지만 그 축은 이 파일 스코프 밖이다). 플레이오프는 전 티어 공통이며 승격 구간과
 * 겹칠 수 있다(`PROMOTION_PLAYOFF`).
 */
export type ZoneKind = "PROMOTION" | "PLAYOFF" | "PROMOTION_PLAYOFF" | "RELEGATION" | "NEUTRAL";

export type ZoneLeagueInfo = Pick<
  League,
  "tier" | "teamCount" | "promotionSlots" | "relegationSlots" | "playoffTeamCount"
>;

export function resolveStandingZone(rank: number, league: ZoneLeagueInfo): ZoneKind {
  const inPromotion = league.tier > 1 && rank <= league.promotionSlots;
  const inPlayoff = rank <= league.playoffTeamCount;
  const inRelegation = league.tier < 3 && rank > league.teamCount - league.relegationSlots;

  if (inPromotion && inPlayoff) return "PROMOTION_PLAYOFF";
  if (inPromotion) return "PROMOTION";
  if (inPlayoff) return "PLAYOFF";
  if (inRelegation) return "RELEGATION";
  return "NEUTRAL";
}

/** B2 존 범례에 표시할 항목 — 이 리그에 실제로 존재하는 존만(리그별로 동적, `NEUTRAL` 제외). */
export function listApplicableZones(
  league: Pick<League, "tier">,
): readonly Exclude<ZoneKind, "NEUTRAL" | "PROMOTION_PLAYOFF">[] {
  const zones: Exclude<ZoneKind, "NEUTRAL" | "PROMOTION_PLAYOFF">[] = ["PLAYOFF"];
  if (league.tier > 1) zones.unshift("PROMOTION");
  if (league.tier < 3) zones.push("RELEGATION");
  return zones;
}
