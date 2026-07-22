/**
 * `api/live/**`(5팀 소유, 화면 폴링용 공개 API) 레이트 리밋 — 59일차, 6팀 DB·인프라팀이
 * 팀장 재수정 지시로 직접 배선(NFR-SEC-009 "공개 API IP당 분당 300건"의 실제 적용
 * 대상이 이 경로였음 — `docs/team-schedule/06-DB인프라팀.md` §1 "api/live/**는 5팀"
 * 이라 이 파일 자체는 5팀 소유 트리 안에 있지만, 리미터 본체(`src/lib/data/supabase/
 * rate-limit.ts`)가 6팀 소유라 배선까지 6팀이 맡았다).
 *
 * `src/app/api/admin/session/rate-limiter.ts`의 리미터와 **키 공간을 공유하지 않는다**
 * (팀장 지시) — 그쪽은 어드민 로그인 무차별 대입 방어 목적이고, 이쪽이 NFR-SEC-009
 * 본연의 "공개 API" 버킷이다. 이 프로젝트의 `api/live/**` 라우트 전체(현재 2개 —
 * `matches/route.ts`, `matches/[matchId]/events/route.ts`)가 **IP당 하나의 공유
 * 버킷**을 쓴다 — NFR-SEC-009 원문이 "공개 API IP당 분당 300건"이라 엔드포인트별로
 * 300건씩 따로 주는 것이 아니라 이 서비스의 공개 API 표면 전체에 IP당 300건이다.
 */

import {
  PUBLIC_RATE_LIMIT,
  createSlidingWindowRateLimiter,
  getClientIp,
} from "@/lib/data/supabase/rate-limit";

/** 모듈 싱글턴 — Route Handler 모듈은 서버 프로세스 수명 동안 재사용되므로 카운트가
 * 요청 간 유지된다. 테스트는 `publicApiRateLimiter.clear()`로 격리한다. */
export const publicApiRateLimiter = createSlidingWindowRateLimiter(PUBLIC_RATE_LIMIT);

/** 초과 시 429 + `Retry-After` 응답을 만들어 반환하고, 허용이면 `null`을 반환한다 —
 * 호출부(각 라우트의 `GET`)는 `null`이 아니면 그대로 리턴하면 된다. */
export function enforcePublicRateLimit(request: Request): Response | null {
  const result = publicApiRateLimiter.check(getClientIp(request.headers), Date.now());
  if (result.allowed) return null;
  return Response.json(
    { message: "rate limit exceeded" },
    { status: 429, headers: { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) } },
  );
}
