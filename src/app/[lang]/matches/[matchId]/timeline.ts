import { compareEventChronologically } from "@/components/composite/match-scoreboard";
import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import type { MatchEvent, PlayerId, TeamId } from "@/types";

/**
 * D3 타임라인 행 빌더 — Task 017(43일차) `page.tsx`가 쓰던 것을 47일차(라이브 폴링
 * 도입)에 이 파일로 옮겼다. `'use client'`가 없는 순수 함수라 서버 컴포넌트(`page.tsx`,
 * 최초 SSR)와 Route Handler(`src/app/api/live/matches/[matchId]/events/route.ts`, 3초
 * 폴링 재조회)가 동일 로직을 공유한다 — 정렬·ASSIST 병합 규칙이 두 곳에서 갈릴 일이 없다.
 *
 * 시간 역순(최신 위, 와이어프레임 04번 §3-1)으로 정렬하고, `ASSIST`를 자신이 가리키는
 * `GOAL`(E-2, `relatedEventSequence`)에 병합해 독립 행에서 제외한다.
 */
export function buildTimelineRows(
  events: readonly MatchEvent[],
  teamNameById: ReadonlyMap<TeamId, string>,
  playerNameById: ReadonlyMap<PlayerId, string>,
): readonly EventTimelineItemData[] {
  const assistByGoalSequence = new Map<number, MatchEvent>();
  for (const event of events) {
    if (event.type === "ASSIST" && event.relatedEventSequence !== null) {
      assistByGoalSequence.set(event.relatedEventSequence, event);
    }
  }

  return [...events]
    .sort(compareEventChronologically)
    .reverse()
    .filter((event) => event.type !== "ASSIST")
    .map((event) => {
      const assist = assistByGoalSequence.get(event.sequence);
      const secondaryPlayerId = assist ? assist.primaryPlayerId : event.secondaryPlayerId;
      return {
        event,
        teamName: event.teamId ? teamNameById.get(event.teamId) ?? null : null,
        primaryPlayerName: event.primaryPlayerId ? playerNameById.get(event.primaryPlayerId) ?? null : null,
        secondaryPlayerName: secondaryPlayerId ? playerNameById.get(secondaryPlayerId) ?? null : null,
      };
    });
}
