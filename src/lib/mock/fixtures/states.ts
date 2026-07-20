/**
 * 4상태(정상/로딩/빈/에러) 픽스처 제네릭 빌더 — **17일차(2026-08-12), Task 007 계속분**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 17일차 행
 * ("4상태 시나리오 Mock — 정상/로딩/빈/에러 각 픽스처 세트", FR-UI-000). 소유: 3팀
 * 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/mock/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 화면별 "정상 데이터 1건"만 넘기면 `Result<T>`(1팀 `src/lib/data/result.ts`,
 *   FR-UI-000)로 감싼 4상태 묶음을 기계적으로 만들어 주는 제네릭 헬퍼. LOADING/EMPTY/ERROR는
 *   화면·엔티티와 무관하게 항상 같은 모양이라(정상 데이터만 화면마다 다르다) 화면별로
 *   반복 작성하지 않는다.
 * - **담지 않는 것**: 화면별 실제 정상 데이터 조립(`screens.ts` 소관). UI 컴포넌트 렌더링
 *   (4팀 `src/components/state/**` 소관, `SkeletonBlock`/`EmptyState`/`ErrorState` 등
 *   FR-UI-021).
 *
 * ## 설계 원칙
 * `ErrorResult.message`는 "사용자 대면 메시지가 아니라 진단용 원문"이라는 `result.ts`의
 * 설계를 그대로 따른다 — 화면별 사용자向 에러 카피(FR-UI 요구사항 표의 "에러" 열, 예:
 * "라이브 데이터를 불러오지 못했습니다")는 **UI/i18n 계층의 책임**이지 이 Mock 데이터
 * 계층의 책임이 아니다(10일차 결론, `docs/dailyWorkLog/10Day.md` 72행: "섹션별 Empty
 * 문구는 EmptyResult에 사유 필드 불필요, 컴포넌트가 메시지 키를 주입"). 그래서 이 파일의
 * `errorResult` 호출은 화면 식별용 진단 문자열만 담고, `retryable: true`만 공통 힌트로
 * 실어 보낸다(FR-UI-000 수용기준 ② "에러 상태에 재시도 버튼 존재"의 근거를 데이터 계층이
 * 제공).
 */

import { emptyResult, errorResult, loadingResult, successResult } from '@/lib/data/result';
import type { Result } from '@/lib/data/result';

/** 화면 하나가 가지는 4상태 묶음 — FR-UI-000. */
export interface FourStateFixture<T> {
  readonly normal: Result<T>;
  readonly loading: Result<T>;
  readonly empty: Result<T>;
  readonly error: Result<T>;
}

/**
 * `normalData` 하나로 4상태 전부를 만든다. `screenLabel`은 사람이 읽는 진단용
 * 식별자일 뿐(예: `'FR-UI-002 홈/라이브센터'`) — 사용자에게 노출되는 문구가 아니다.
 */
export function buildFourStates<T>(normalData: T, screenLabel: string): FourStateFixture<T> {
  return {
    normal: successResult(normalData),
    loading: loadingResult(),
    empty: emptyResult(),
    error: errorResult(`[mock fixture] ${screenLabel} 조회 실패 — 강제 에러 픽스처`, {
      retryable: true,
    }),
  };
}
