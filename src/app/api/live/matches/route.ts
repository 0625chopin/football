/**
 * 홈 A2 라이브 그리드 폴링 — Route Handler (36일차, I-182 해소, 5팀 소유 `src/app/api/live/**`)
 *
 * `./LiveMatchGrid.tsx`(클라이언트 컴포넌트)가 5초마다 이 엔드포인트를 `fetch()`한다.
 * `DataSource` 조회(`bootstrapApp()`/`getDataSource()`)는 여기 서버 측에서만 일어난다 —
 * 클라이언트 번들에는 `bootstrapApp` 심볼도, 그 아래 Mock/Supabase 어댑터 모듈 그래프도
 * 더 이상 실리지 않는다(I-182 해소분, 근거는 `./types.ts` 파일 헤더 참조).
 *
 * 팀/리그 표시명은 여기서 조회하지 않는다 — 클라이언트가 이미 최초 서버 렌더(`page.tsx`)
 * 때 받은 `teamNameById`/`leagueNameById` 맵을 갖고 있으므로, 매 폴링마다 `getTeamsByIds`/
 * `getLeagues`를 중복 호출하지 않고 원시 `Fixture`+`WorldClockContext`만 내려준다(응답을
 * 가볍게 유지). 이름 매핑·경과분 계산(`computeElapsedMinutes`)은 여전히 `LiveMatchGrid.tsx`가
 * 담당한다 — 이 파일이 하던 일(데이터 접근)과 그 파일이 하던 일(표시용 가공)의 경계를
 * 그대로 유지했다.
 *
 * 응답 타입 계약은 임시다 — `./types.ts` 파일 헤더 "이 파일은 임시다" 절 참조.
 *
 * 캐싱: Route Handler의 `GET`은 기본적으로 캐시되지 않지만(Next.js 16 문서,
 * `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` "Caching"
 * 절), 이 엔드포인트는 정의상 "지금 진행 중인 경기"라 캐시되면 폴링의 의미가 없다 —
 * 향후 이 프로젝트가 Cache Components를 켜더라도 정적 프리렌더로 새지 않도록
 * `dynamic = "force-dynamic"`을 명시적으로 고정해 둔다.
 *
 * 레이트 리밋(59일차, NFR-SEC-009 "공개 API IP당 분당 300건") — `../rate-limiter.ts`
 * (6팀 배선, 파일 헤더 참조) 참조.
 */

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import type { Fixture, LeagueId } from "@/types";
import type { LiveMatchesApiResponse } from "./types";
import { enforcePublicRateLimit } from "../rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const rateLimited = enforcePublicRateLimit(request);
  if (rateLimited) return rateLimited;

  try {
    await bootstrapApp();
    const dataSource = getDataSource();

    const liveFixtures = await dataSource.getLiveFixtures();
    const leagueFixtures = liveFixtures.filter(hasLeagueId);
    const matchClock = await dataSource.getMatchClockContext(
      leagueFixtures.map((fixture) => fixture.id),
    );

    const payload: LiveMatchesApiResponse = { fixtures: leagueFixtures, matchClock };
    return Response.json(payload);
  } catch (cause) {
    // 진단용 원문은 사용자 대면 문구가 아니다(`result.ts` "ResultError" 절과 동일 원칙) —
    // 클라이언트(`fetchListResult`)가 이 실패를 흡수해 번역된 에러 상태로 대체한다.
    console.error("[src/app/api/live/matches/route.ts] 라이브 경기 조회 실패", cause);
    return Response.json({ message: "live matches fetch failed" }, { status: 500 });
  }
}

function hasLeagueId(fixture: Fixture): fixture is Fixture & { leagueId: LeagueId } {
  return fixture.leagueId !== null;
}
