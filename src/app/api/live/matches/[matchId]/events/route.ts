/**
 * 경기 상세 D3 이벤트 타임라인 폴링 — Route Handler (47일차, Task 017 D2 잔여, 5팀 소유
 * `src/app/api/live/**`)
 *
 * `../../../../../[lang]/matches/[matchId]/LiveEventTimeline.tsx`(클라이언트 컴포넌트)가
 * 3초마다(`resolvePollIntervalMs("live")`, 공통코드 경유) 이 엔드포인트를 `fetch()`한다.
 * `../../matches/route.ts`(홈 A2)와 동일 원칙 — `DataSource` 조회는 여기 서버 측에서만
 * 일어나고, 클라이언트 번들에는 `bootstrapApp`/Mock·Supabase 어댑터 모듈 그래프가 실리지
 * 않는다(I-182).
 *
 * ## R-11 — 컷오프는 `DataSource.getMatchEvents()`가 이미 강제한다
 * `page.tsx`(최초 SSR)와 동일하게, 이 라우트도 받은 이벤트 배열을 그대로 접어(fold)
 * 표시만 한다 — 클라이언트 시계로 다시 거르지 않는다(S-2).
 *
 * ## 타임라인 행 변환은 `page.tsx`와 공유한다
 * `buildTimelineRows`(순수 함수, `'use client'` 없음)를 `../../../../../[lang]/matches/
 * [matchId]/timeline.ts`에서 그대로 가져다 쓴다 — 정렬·ASSIST 병합 규칙이 최초 SSR과
 * 폴링 재조회 사이에서 갈리면 "새로고침 시점에 따라 같은 이벤트가 다르게 보이는" 결함이
 * 생긴다. 다만 이 라우트는 라인업·평점 조회는 하지 않는다 — D3가 필요로 하는 이벤트
 * 참가자(팀 2건 + 이벤트에 등장한 선수)만 조회해 페이로드를 가볍게 유지한다(`page.tsx`의
 * 최초 SSR은 라인업·평점 화면도 함께 그리므로 선수 ID 합집합이 더 크다 — 그 차이는 의도적).
 */

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { compareEventChronologically } from "@/components/composite/match-scoreboard";
import { buildTimelineRows } from "@/app/[lang]/matches/[matchId]/timeline";
import type { FixtureId, PlayerId, TeamId } from "@/types";
import type { MatchEventsApiResponse } from "./types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
): Promise<Response> {
  try {
    const { matchId } = await params;
    await bootstrapApp();
    const dataSource = getDataSource();

    const fixture = await dataSource.getFixture(matchId as FixtureId);
    if (!fixture) {
      return Response.json({ message: "fixture not found" }, { status: 404 });
    }

    const [events, teams] = await Promise.all([
      dataSource.getMatchEvents(fixture.id),
      dataSource.getTeamsByIds([fixture.homeTeamId, fixture.awayTeamId]),
    ]);
    const teamNameById = new Map<TeamId, string>(teams.map((team) => [team.id, team.name]));

    const playerIds = Array.from(
      new Set(
        events
          .flatMap((event) => [event.primaryPlayerId, event.secondaryPlayerId])
          .filter((id): id is PlayerId => id !== null),
      ),
    );
    const playerProfiles = await Promise.all(playerIds.map((id) => dataSource.getPlayerProfile(id)));
    const playerNameById = new Map<PlayerId, string>();
    playerProfiles.forEach((profile, index) => {
      if (profile) {
        playerNameById.set(playerIds[index], profile.name);
      }
    });

    const rows = buildTimelineRows(events, teamNameById, playerNameById);
    const lastEvent = [...events].sort(compareEventChronologically).at(-1) ?? null;

    const payload: MatchEventsApiResponse = {
      status: fixture.status,
      minute: fixture.status === "LIVE" ? lastEvent?.minute ?? 0 : null,
      addedTime: fixture.status === "LIVE" ? lastEvent?.addedTime ?? 0 : 0,
      rows,
    };
    return Response.json(payload);
  } catch (cause) {
    // 진단용 원문은 사용자 대면 문구가 아니다(`result.ts` "ResultError" 절과 동일 원칙) —
    // 클라이언트(`fetchResult`)가 이 실패를 흡수해 번역된 에러 상태로 대체한다.
    console.error("[src/app/api/live/matches/[matchId]/events/route.ts] 이벤트 조회 실패", cause);
    return Response.json({ message: "match events fetch failed" }, { status: 500 });
  }
}
