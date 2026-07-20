/**
 * `Result<T>` — 로딩/에러/빈/성공 4상태 결과 래퍼 — **Task 004, 10일차(2026-08-03)**,
 * 1팀 코어·품질팀 소유
 *
 * 근거: `ROADMAP.md` Task 004(9~11일차) 구현사항 "로딩/에러/빈 상태를 타입으로 표현하는
 * 결과 래퍼 정의" / `docs/team-schedule/01-코어품질팀.md` 10일차 행 / FR-UI-000(4가지 상태
 * 공통 규칙: 정상/로딩(스켈레톤)/빈 상태(Empty)/에러 상태, `docs/require/03-functional-requirements.md`
 * 1245행) / KPI-6(UI 상태 커버리지 100%)
 *
 * ## 오늘 스코프 (오늘 하는 것 / 안 하는 것)
 * - **오늘**: 4상태를 표현하는 판별 유니온 `Result<T>` 타입과 생성자·타입가드·변환
 *   헬퍼만 정의한다. 이 파일은 **완전 범용 제네릭 유틸**이며 어떤 화면·엔티티에도
 *   결합되지 않는다 — `@/types` 도메인 타입을 import하지 않는다.
 * - **오늘 하지 않는 것**: `DataSource.ts`(9일차 산출물)의 61개 메서드 시그니처를
 *   `Promise<Result<T>>` 형태로 감싸는 작업. `DataSource.ts` 파일 헤더 12~16행이 "10일차에
 *   이 인터페이스를 `Promise<Result<T>>` 형태로 감싼다"고 예고했지만, 이 팀의 10일차
 *   ROADMAP 체크박스·team-schedule 산출물 열은 `factory.ts`·`result.ts` 정의(定義)만
 *   못박고 있고 적용(適用) 대상·시점은 명시하지 않는다. `DataSource`는 순수 데이터
 *   접근 계약(`Promise<T>`)으로 얇게 유지하고, 이 `Result<T>`는 그 위 소비 계층(폴링
 *   훅 등, 11일차 `polling.ts` 또는 그 이후 화면 훅)이 `Promise<T>`를 감싸 만드는 편이
 *   계층 분리상 합리적이라 판단해 오늘은 정의만 하고 적용 지점은 열어 둔다. 이 판단과
 *   9일차 예고문과의 불일치는 `docs/ISSUES.md`에 코디네이션 이슈로 별도 기록한다.
 *
 * ## 설계 원칙
 * - `status` 판별 필드는 `src/types/enums.ts`의 문자열 리터럴 관례(UPPER_SNAKE_CASE,
 *   예: `FixtureStatus = 'SCHEDULED'|'LIVE'|'FINISHED'|'VOID'`)를 그대로 따른다 —
 *   `'LOADING'|'ERROR'|'EMPTY'|'SUCCESS'`.
 * - 4개 변형은 서로 배타적인 판별 유니온이다 — `status` 필드 하나로 TypeScript가
 *   나머지 필드(`error`/`data`)를 정확히 좁힐 수 있다(exhaustive narrowing).
 * - "빈(Empty)" 상태는 값 자체(`null`, 길이 0 배열)와는 별개의 **명시적 상태**다.
 *   컬렉션·널러블 값을 감쌀 때 "성공했지만 데이터가 없음"과 "성공 + 실제 데이터"를
 *   호출자가 섞어 쓰지 않도록, `fromNullable`/`fromArray` 두 변환 헬퍼가 이 판단을
 *   대신해 일관성을 보장한다.
 * - `ResultError`는 최소 설계 — FR-UI-000 수용기준 ②("에러 상태에 재시도 버튼 존재")는
 *   UI 컴포넌트(4팀 소유 `src/components/state/**`)의 책임이지만, 데이터 계층이
 *   `retryable` 힌트를 실어 보내면 UI가 재시도 버튼 노출 여부를 판단하는 데 도움이 된다.
 *
 * ## import 규약
 * 이 파일은 `@/types`를 import하지 않는다(범용 유틸이라 도메인 타입에 결합되지 않음).
 * 소비 계층에서 `Result<Fixture>`처럼 도메인 타입과 조합해 쓸 때만 그쪽 파일이
 * `@/types` 배럴에서 타입을 가져온다(체크리스트 C-5·C-6, 이 파일 자체와는 무관).
 *
 * ## 사용 예시 (실행되지 않는 참고용 스니펫)
 * ```ts
 * import { fromNullable, fromArray, loadingResult, isSuccess } from '@/lib/data/result';
 * import type { Fixture } from '@/types';
 *
 * // 폴링 훅 등 소비 계층 의사코드:
 * // let state: Result<Fixture> = loadingResult();
 * // const fixture = await dataSource.getFixture(fixtureId); // Fixture | null
 * // state = fromNullable(fixture);
 * // if (isSuccess(state)) { render(state.data); }
 *
 * // 컬렉션 예시:
 * // const fixtures = await dataSource.getFixturesByRound(params); // readonly Fixture[]
 * // const state2 = fromArray(fixtures);
 * ```
 */

/** 에러 상태 페이로드 — 최소 설계(메시지 + 재시도 가능 힌트 + 원인 보존) */
export interface ResultError {
  /** 사용자 대면 메시지가 아니라 진단용 원문 — 번역 카탈로그를 거치지 않는다(운영자/개발자용) */
  readonly message: string;
  /** UI가 재시도 버튼을 노출할지 판단하는 힌트(FR-UI-000 수용기준 ②). 생략 시 UI 기본값(노출) */
  readonly retryable?: boolean;
  /** 원본 예외/응답 등 진단용 원인 — 로깅 목적, 응답 렌더링에 직접 쓰지 않는다 */
  readonly cause?: unknown;
}

/** 로딩 중 — 스켈레톤 렌더링 트리거 */
export interface LoadingResult {
  readonly status: 'LOADING';
}

/** 조회 실패 — 에러 상태 + 재시도 액션 렌더링 트리거 */
export interface ErrorResult {
  readonly status: 'ERROR';
  readonly error: ResultError;
}

/** 조회 성공했으나 표시할 데이터가 없음 — Empty 상태 렌더링 트리거 */
export interface EmptyResult {
  readonly status: 'EMPTY';
}

/** 조회 성공 + 데이터 존재 — 정상 상태 렌더링 트리거 */
export interface SuccessResult<T> {
  readonly status: 'SUCCESS';
  readonly data: T;
}

/**
 * FR-UI-000 4가지 상태(정상/로딩/빈/에러)를 표현하는 판별 유니온.
 * `status` 필드로 4개 변형이 서로 배타적으로 좁혀진다.
 */
export type Result<T> = LoadingResult | ErrorResult | EmptyResult | SuccessResult<T>;

/* ────────────────────────────────────────────────────────────────────────
 * 생성자
 * ──────────────────────────────────────────────────────────────────────── */

export function loadingResult(): LoadingResult {
  return { status: 'LOADING' };
}

export function successResult<T>(data: T): SuccessResult<T> {
  return { status: 'SUCCESS', data };
}

export function emptyResult(): EmptyResult {
  return { status: 'EMPTY' };
}

export function errorResult(
  message: string,
  opts?: { readonly retryable?: boolean; readonly cause?: unknown },
): ErrorResult {
  return {
    status: 'ERROR',
    error: {
      message,
      ...(opts?.retryable !== undefined ? { retryable: opts.retryable } : {}),
      ...(opts?.cause !== undefined ? { cause: opts.cause } : {}),
    },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 타입가드 — status 필드로 변형을 좁힌다(제네릭 T 보존)
 * ──────────────────────────────────────────────────────────────────────── */

export function isLoading<T>(result: Result<T>): result is LoadingResult {
  return result.status === 'LOADING';
}

export function isError<T>(result: Result<T>): result is ErrorResult {
  return result.status === 'ERROR';
}

export function isEmpty<T>(result: Result<T>): result is EmptyResult {
  return result.status === 'EMPTY';
}

export function isSuccess<T>(result: Result<T>): result is SuccessResult<T> {
  return result.status === 'SUCCESS';
}

/* ────────────────────────────────────────────────────────────────────────
 * 변환 헬퍼 — "빈" 판정을 호출자마다 다시 만들지 않도록 단일 지점에서 정의
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 단일 엔티티 조회(`T | null` 반환, 예: `DataSource.getFixture`)를 감쌀 때 사용.
 * `null`(미존재)은 `EMPTY`로, 값이 있으면 `SUCCESS`로 변환한다.
 */
export function fromNullable<T>(value: T | null): Result<T> {
  return value === null ? emptyResult() : successResult(value);
}

/**
 * 컬렉션 조회(`readonly T[]` 반환)를 감쌀 때 사용. 길이 0이면 `EMPTY`,
 * 그 외에는 원본 배열을 그대로 담은 `SUCCESS`로 변환한다.
 */
export function fromArray<T>(items: readonly T[]): Result<readonly T[]> {
  return items.length === 0 ? emptyResult() : successResult(items);
}
