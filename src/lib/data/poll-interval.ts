/**
 * 폴링 주기 해석 — **서버·클라이언트 공용**, 1팀 코어·품질팀 소유
 *
 * ## 왜 `./polling`에서 분리했나 (44일차, I-222 — I-74와 동형의 분리)
 * 원래 `PollMode`/`resolvePollIntervalMs`는 `./polling`에 있었으나, 그 파일은 첫 줄이
 * `'use client'`라 **RSC 번들러가 그 파일의 모든 export를 client reference로 치환**한다.
 * 그래서 서버 컴포넌트가 `resolvePollIntervalMs`를 import해 호출하면 값이 오는 게 아니라
 * *"Attempted to call resolvePollIntervalMs() from the server but it is on the client"*
 * 런타임 오류가 난다(44일차 실측 — 홈 `/ko`가 에러 바운더리로 떨어졌다).
 *
 * 이것은 11일차에 `fetchResult`/`fetchListResult`를 `'use client'` 없는 `./fetch-result`로
 * 떼어낸 것(`./polling` 파일 헤더 "파일 분리 이력", I-74)과 **정확히 같은 문제·같은 해법**이다.
 * 이 파일에는 `'use client'`를 두지 않는다 — React도 import하지 않는 순수 모듈이라 서버
 * 컴포넌트가 그대로 호출할 수 있고, 클라이언트 훅(`./polling`)도 그대로 재사용한다.
 *
 * ## 이 함수는 **서버에서 부르는 것이 정상 경로**다 (I-222)
 * `loadConstants`의 값 소스(`@/lib/config/loader`의 `globalDefaultSource`/`fallbackSource`)는
 * 모듈 스코프 싱글턴이고, 그 둘을 채우는 `bootstrapApp()`은 서버 컴포넌트에서만 `await`된다.
 * **브라우저 번들의 `loader.ts`는 별도 인스턴스라 두 소스가 영원히 비어 있다** — 즉 이 함수를
 * 클라이언트에서 부르면 100% 조회 실패해 안전망 값(30초/15초)만 나오고, 공통코드 경유로
 * 정상값(5초/3초)을 공급하려던 설계(R-8)가 도달 불가능해진다. 그래서 화면은 **서버
 * 컴포넌트에서 이 함수를 호출해 그 ms를 props로 내려주고**, 클라이언트 훅에는
 * `PollingOptions.intervalMs`로 주입한다(`./polling` 파일 헤더 "44일차 정정" 절).
 *
 * ## import 규약
 * React를 import하지 않는다(그러면 이 분리의 목적이 무너진다). `@/types` 도메인 타입도
 * 쓰지 않는다(`./result`와 동일 원칙). 공통코드 로더는 3팀 소유 `@/lib/config/loader`에서
 * **읽기 전용으로 소비**한다(그 파일을 수정하지 않는다).
 */

import { loadConstants } from '@/lib/config/loader';

/** 기본 폴링(일정·순위표 등) 또는 라이브 경기 상세 폴링 중 어느 주기를 쓸지 선택한다. */
export type PollMode = 'default' | 'live';

/**
 * `loadConstants('UI_PARAM')`이 값을 못 줄 때만 쓰는 **최후 안전망 — 정상 운영값이 아니다**
 * (사용자 판정, 11일차, `docs/ISSUES.md` I-77). ROADMAP.md Task 004 원문의 "기본 5초 /
 * 라이브 3초"는 6팀이 `common_code` 실데이터를 적재한 뒤 공통코드 경유로 공급되는 정상값이고,
 * 이 두 상수는 그 조회 자체가 실패했을 때(장애 상황)만 쓰인다. 장애 시에도 정상값(5초/3초)
 * 그대로 폴백하면 동시 접속자 수에 비례해 비용이 급증하는 폴링 요청이 장애 상황에서 오히려
 * 최대치로 쏟아지는 역전 구조가 된다(`docs/business/03-budget-plan.md` §2.5 케이스 A 기준
 * 월 5초=$133.7 vs 30초=$1.6) — 그래서 안전망만 30초/15초로 낮췄다. `@/lib/config/fallback`의
 * `SAFE_DEFAULT_VALUES.UI_PARAM`(3팀 11일차)과 동일한 수치로 맞췄다 — 두 값이 어긋나면 안 된다.
 */
const DEFAULT_POLL_INTERVAL_MS = 30000;
const DEFAULT_POLL_LIVE_MS = 15000;

/**
 * `mode`에 해당하는 폴링 주기(ms)를 공통코드에서 조회한다. `UI_PARAM` 그룹 코드 이름은
 * 3팀이 확정한 `POLL_INTERVAL_MS`/`POLL_LIVE_MS`를 쓴다(3팀 11일차, `docs/wireframe/
 * 00-공통규약.md` C-03a 해소). 소스 미등록·값 누락 등 어떤 이유로든 조회에 실패하면 예외를
 * 흡수하고 `DEFAULT_POLL_INTERVAL_MS`/`DEFAULT_POLL_LIVE_MS`(비용 안전망 전용값, 정상값
 * 아님 — 위 상수 JSDoc 참조)로 폴백한다(AS-13/NFR-CFG-005 무정지 원칙).
 *
 * **서버 컴포넌트에서 호출할 것** — 클라이언트에서 부르면 항상 폴백값이 나온다(위 파일 헤더).
 */
export function resolvePollIntervalMs(mode: PollMode): number {
  const key = mode === 'live' ? 'POLL_LIVE_MS' : 'POLL_INTERVAL_MS';
  const fallback = mode === 'live' ? DEFAULT_POLL_LIVE_MS : DEFAULT_POLL_INTERVAL_MS;

  try {
    const value = loadConstants('UI_PARAM')[key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value
      : fallback;
  } catch (cause) {
    console.warn(
      `[src/lib/data/poll-interval.ts] UI_PARAM 공통코드 조회 실패 — 안전 기본값(${fallback}ms, mode="${mode}")으로 폴백합니다.`,
      cause,
    );
    return fallback;
  }
}
