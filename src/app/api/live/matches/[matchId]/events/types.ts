/**
 * 경기 상세 D3 이벤트 타임라인 폴링 API — **임시 응답 계약** (47일차, Task 017 D2 잔여, 5팀)
 *
 * `../../../matches/route.ts`(홈 A2 라이브 그리드)와 동일한 사정으로 임시다 — 1팀 정식
 * 응답 타입 계약이 아직 없어(그 파일 헤더 "이 파일은 임시다" 절과 동일 근거) 이 엔드포인트가
 * 필요로 하는 최소 계약만 정의한다. **다른 라우트가 이 파일을 재사용하지 않는다.**
 *
 * ## 설계 — 단일 페이로드로 status/minute/rows를 함께 내려준다
 * `EventTimelineItemData[]`만 반환하면 "빈 배열"이 "킥오프 전이라 정상 비어 있음"인지
 * "FINISHED인데 이벤트가 없어 의심스러움"인지 구분할 수 없다(I-65, `@/lib/data/fetch-result`
 * 파일 헤더 참조). 그래서 이 응답은 리스트가 아니라 **단일 객체**로 감싸 `status`를 함께
 * 실어 보낸다 — 소비처(`LiveEventTimeline.tsx`)가 `usePollingList`가 아니라 `usePolling`
 * (단일 엔티티 훅)을 쓰는 이유이기도 하다.
 */

import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import type { FixtureStatus } from "@/types";

export interface MatchEventsApiResponse {
  readonly status: FixtureStatus;
  /** LIVE가 아니면 `null`(D1 스코어보드와 동일 규약, `./match-scoreboard.ts` 없이도 일관). */
  readonly minute: number | null;
  readonly addedTime: number;
  readonly rows: readonly EventTimelineItemData[];
}
