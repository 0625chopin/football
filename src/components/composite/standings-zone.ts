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

/**
 * B4 노이즈 스코프 판단(41일차, 40일차 인계) — "동률 블록 전량 나열"이 아니라 **존 경계에
 * 인접한 블록만** 노출한다.
 *
 * ## 결론과 근거
 * 40일차 실렌더에서 24팀 리그는 병합 후에도 7줄까지 나왔다(`docs/dailyWorkLog/40Day.md`
 * 96행). 와이어프레임 §3 모바일 목업 자체가 예시로 든 두 줄("2·3위는 …", "3/4위 동률 →
 * 단판 플레이오프 예정")도 우연이 아니라 **둘 다 승격/플레이오프 경계선 바로 위 순위**다
 * — B4의 실제 존재 이유는 "이 순위가 왜 이 존에 들었는지"를 설명하는 것이고, 중위권
 * 한복판(어느 존에도 안 닿는 순위)의 동률은 그 질문 자체가 성립하지 않는다. 그래서
 * "전량 나열"을 문면 그대로 구현하는 대신, **블록이 스스로 존 경계를 걸치거나(내부에 존이
 * 2개 이상 섞임) 블록 바로 위/아래 순위와 존이 다른 경우**만 남긴다. 나머지(순수 중위권
 * 동률)는 순위표 자체(B3)에 이미 순위·승점이 나와 있어 정보 손실이 아니다.
 *
 * 이 함수는 표시 여부만 판정한다 — 블록/하위구간 구조 자체(`tiebreak-note.ts`)는 그대로
 * 둔다. 호출부(`leagues/[leagueId]/page.tsx`)가 `TiebreakNoteBlock[]`을 이 함수로 필터링한
 * 뒤 `TiebreakNote`에 넘긴다.
 */
export function isZoneBoundaryAdjacent(
  blockRanks: readonly number[],
  league: ZoneLeagueInfo,
): boolean {
  if (blockRanks.length === 0) return false;

  const start = blockRanks[0];
  const end = blockRanks[blockRanks.length - 1];

  // 블록 내부에서 존이 갈리는 경우(예: 승격 3위 vs 플레이오프 4위가 같은 승점 블록).
  const zonesInBlock = new Set(blockRanks.map((rank) => resolveStandingZone(rank, league)));
  if (zonesInBlock.size > 1) return true;

  const blockZone = resolveStandingZone(start, league);
  const zoneAbove = start > 1 ? resolveStandingZone(start - 1, league) : null;
  const zoneBelow = end < league.teamCount ? resolveStandingZone(end + 1, league) : null;

  return (zoneAbove !== null && zoneAbove !== blockZone) || (zoneBelow !== null && zoneBelow !== blockZone);
}
