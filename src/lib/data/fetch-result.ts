/**
 * 공용 `Promise → Result<T>` 변환 헬퍼 — **Task 004, 11일차(2026-08-04, 팀장 2차 검증 후
 * 분리)**, 1팀 코어·품질팀 소유, **H-02의 일부**
 *
 * 근거: 원래 이 헬퍼들은 `src/lib/data/polling.ts`에 함께 있었으나, **4팀 11일차 1차
 * 교차 점검에서 구조 결함으로 지적**됐다(`docs/ISSUES.md` I-74) — `polling.ts`가
 * `'use client'` 파일이라 그 파일의 **모든 export**가 RSC 번들러에 의해 client
 * reference로 치환되므로, `fetchResult`/`fetchListResult`가 React를 import하지 않는
 * 순수 `async` 함수임과 무관하게 서버 컴포넌트에서 직접 `await`할 수 없었다 — 그런데
 * `polling.ts`의 I-61 절 예시 코드는 정확히 그 사용법(서버 컴포넌트 1회성 `await`)을
 * 명시하고 있어 문서와 구현이 모순이었다. 이 파일을 `'use client'` **없이** 분리해 그
 * 모순을 해소한다.
 *
 * ## 이 파일의 책임
 * `DataSource`(9일차) 메서드의 두 반환 패턴(단일 엔티티 `T | null`, 컬렉션
 * `readonly T[]`)을 `Result<T>`(10일차 `result.ts`)로 감싸는 것만 한다. React를
 * import하지 않고 브라우저 전용 API도 쓰지 않는 순수 `async` 함수이므로 서버
 * 컴포넌트(RSC)의 1회성 `await`와 클라이언트 폴링 훅(`./polling`의 `usePolling`/
 * `usePollingList`)이 **동일한 함수를 그대로 재사용**한다(I-61 "단발 조회·폴링 공용
 * 헬퍼" 요구, `docs/ISSUES.md` I-61 참조).
 *
 * ```ts
 * // 서버 컴포넌트(1회성 await)
 * import { fetchResult } from '@/lib/data/fetch-result';
 * const result = await fetchResult(() => getDataSource().getFixture(fixtureId));
 *
 * // 클라이언트 컴포넌트(폴링) — usePolling이 내부에서 이 파일의 fetchResult를 재사용
 * import { usePolling } from '@/lib/data/polling';
 * const result = usePolling(() => getDataSource().getFixture(fixtureId), { mode: 'live' });
 * ```
 *
 * ## I-65 — EMPTY 상태의 이중 의미 (가이드, 강제 아님)
 * `fetchListResult`가 위임하는 `fromArray`(`result.ts`)는 "컬렉션이 정상적으로 비어 있음"과
 * "구조적으로 채워져 있어야 하는데 비었음(잠재 버그, 예: `FINISHED` 경기인데 이벤트 0건)"을
 * 구분하지 않는다 — 근본 해결은 2팀이 16일차 전까지 검토하기로 확정됐다(팀장 판정,
 * `docs/ISSUES.md` I-65). 이 두 경우의 구분이 화면 로직상 의미 있는 소비 지점(예: 경기
 * 이벤트 타임라인)은, `fetchListResult`의 `EMPTY` 결과만으로 판단하지 말고 **함께 조회한
 * 관련 상태 필드(예: `Fixture.status`)를 나란히 참고**하는 패턴을 권장한다 —
 * "`SCHEDULED`인데 이벤트 0건"은 정상, "`FINISHED`인데 이벤트 0건"은 의심 신호로 화면
 * (4·5팀)이 구분할 수 있다.
 *
 * ## import 규약
 * `@/types` 도메인 타입을 import하지 않는다(범용 유틸, `result.ts`와 동일 원칙).
 * `Result<T>`·변환 헬퍼는 같은 디렉터리의 `./result`에서만 가져온다. 이 파일은
 * `'use client'`가 **없다** — 서버·클라이언트 양쪽에서 안전하게 import할 수 있어야
 * 하는 것이 이 파일이 존재하는 이유이므로, 이후 이 파일에 React나 브라우저 전용 API를
 * 추가하지 않는다(추가가 필요하면 `./polling`으로 옮길 것).
 */

import { errorResult, fromArray, fromNullable, type Result } from './result';

function describeFetchError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * 단일 엔티티 조회(`DataSource`의 `T | null` 반환 메서드)를 `Result<T>`로 감싼다.
 * 브라우저 API를 쓰지 않는 순수 `async` 함수라 서버 컴포넌트에서 직접 `await`해도 안전하다.
 */
export async function fetchResult<T>(
  fetcher: () => Promise<T | null>,
): Promise<Result<T>> {
  try {
    return fromNullable(await fetcher());
  } catch (cause) {
    return errorResult(describeFetchError(cause), { retryable: true, cause });
  }
}

/**
 * 컬렉션 조회(`DataSource`의 `readonly T[]` 반환 메서드)를 `Result<readonly T[]>`로 감싼다.
 * **I-65 가이드**: 반환된 `EMPTY`가 "정상적으로 빈 상태"인지 "있어야 하는데 비었음(잠재
 * 버그)"인지는 이 함수가 구분하지 않는다 — 구분이 의미 있는 소비 지점은 함께 조회한 관련
 * 상태 필드(예: `Fixture.status`)를 나란히 참고할 것(파일 헤더 "I-65" 절 참조).
 */
export async function fetchListResult<T>(
  fetcher: () => Promise<readonly T[]>,
): Promise<Result<readonly T[]>> {
  try {
    return fromArray(await fetcher());
  } catch (cause) {
    return errorResult(describeFetchError(cause), { retryable: true, cause });
  }
}
