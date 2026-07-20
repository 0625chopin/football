/**
 * Task 013A(28일차) — 도메인 표현 컴포넌트 4상태(loading/empty/error/ready) 공유 계약.
 * TeamBadge·PlayerAvatar·AbilityRadar·ConditionGauge가 동일 판별 유니온을 쓰도록
 * 여기 한 곳에서만 선언한다(4개 컴포넌트가 각자 다른 상태 모양을 가지면 소비처가
 * 컴포넌트마다 분기 로직을 새로 익혀야 한다).
 */
export type DomainViewState<T> =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message?: string }
  | { readonly status: "ready"; readonly data: T };
