/**
 * 홈 A2 라이브 그리드 폴링 API — **임시 응답 계약** (36일차, I-182 해소, 5팀)
 *
 * 근거: `docs/team-schedule/05-화면배팅UX팀.md` 35일차 소유 경로 개정 "폴링 fetcher는
 * 반드시 Route Handler(`src/app/api/live/**`) 경유"를 오늘(36일차) 실제로 반영한다.
 * `./LiveMatchGrid.tsx`의 `fetchLiveMatchCards()`가 클라이언트에서 `bootstrapApp()` →
 * `getDataSource()`를 직접 호출해 왔는데(I-182), 이는 ⓐ 폴링이 서버를 거치지 않고
 * 브라우저 인메모리로만 도는 아키텍처 위반이고 ⓑ `bootstrapDataSource()`가 kind에 따라
 * `./supabase`를 동적 import하므로 034b(Supabase 전환) 이후엔 Supabase 어댑터 코드까지
 * 클라이언트 번들에 실릴 위험이 있었다(팀장 실측, ISSUES.md I-182).
 *
 * ## ⚠️ 이 파일은 임시다 — 1팀 정식 응답 타입 계약으로 교체 대상
 * 이 API의 응답 타입 계약은 원래 1팀 소관인데, 35일차에 착수하지 못하고 이월된 채 아직
 * 확정되지 않았다(팀장 전달). 034b 착수 전 I-182를 반드시 해소해야 하는 시급성 때문에
 * 5팀이 이 엔드포인트 하나가 필요로 하는 **최소 계약만** 임시로 정의한다 — 1팀이 전역
 * 응답 계약(예: 에러 포맷·페이지네이션·버전 헤더 등 공통 관례)을 확정하면 이 파일은 그
 * 계약을 따르도록 교체되거나 삭제될 대상이다. **다른 라우트가 이 파일을 재사용하지
 * 않는다** — 엔드포인트별 임시 계약이라는 성격을 지키기 위함.
 *
 * ## 설계 — 새 도메인 타입을 만들지 않는다
 * `fixtures`/`matchClock`은 이미 존재하는 계약을 그대로 재사용한다 — `Fixture`는
 * `@/types`(1팀 8일차 동결) 배럴에서, `WorldClockContext`는 `@/lib/data/DataSource`
 * (1팀 9일차)에서 그대로 가져온다. 이 파일이 새로 정의하는 것은 오직 이 엔드포인트
 * 응답의 "봉투(envelope)" 모양 하나뿐이다. 팀·리그 표시명은 여기 담지 않는다 — 클라이언트가
 * 이미 최초 서버 렌더(`page.tsx`)에서 받은 `teamNameById`/`leagueNameById` 맵을 그대로
 * 재사용해 매 폴링마다 팀/리그 조회를 중복하지 않는다(`./LiveMatchGrid.tsx` 참조).
 */

import type { WorldClockContext } from "@/lib/data/DataSource";
import type { Fixture, LeagueId } from "@/types";

export interface LiveMatchesApiResponse {
  /** 컵 등 리그 소속이 없는 라이브 경기는 제외(3리그 카드 그리드 스코프 밖, `page.tsx`와 동일 기준) */
  readonly fixtures: readonly (Fixture & { readonly leagueId: LeagueId })[];
  /** 경과분·킥오프 카운트다운 계산에 필요한 "지금" — 반드시 이 한 응답 안에서 `fixtures`와 원자적으로 함께 옴 */
  readonly matchClock: WorldClockContext;
}
