/**
 * `route.ts`(관리자 세션 발급) 전용 레이트 리밋 싱글턴 — 59일차, NFR-SEC-009.
 *
 * `route.ts` 자체에서 내보내지 않는다 — Next.js Route Handler는 `GET`/`POST`/...·
 * `dynamic` 등 정해진 심볼만 export할 수 있고, 그 외 이름을 export하면
 * `.next/dev/types`가 생성하는 라우트 타입 검사(`AppRouteHandlerConfig`)가
 * `TS2344`로 실패한다(59일차 최초 시도에서 실측 — `adminSessionRateLimiter`를
 * `route.ts`에서 직접 export했다가 `npm run typecheck`가 잡아냄). 그래서 리미터
 * 인스턴스를 별도 파일로 빼고, 테스트도 이 파일에서 직접 import한다.
 */

import { PUBLIC_RATE_LIMIT, createSlidingWindowRateLimiter } from "@/lib/data/supabase/rate-limit";

/** 모듈 싱글턴 — Route Handler 모듈은 서버 프로세스 수명 동안 재사용되므로 카운트가
 * 요청 간 유지된다. 테스트는 `adminSessionRateLimiter.clear()`로 격리한다. */
export const adminSessionRateLimiter = createSlidingWindowRateLimiter(PUBLIC_RATE_LIMIT);
