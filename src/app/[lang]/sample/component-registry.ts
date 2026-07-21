/**
 * Task 014(38일차, 4팀) — 커버리지 체크리스트가 세는 "등록 컴포넌트" 카탈로그.
 *
 * 이 파일은 서버 컴포넌트(`page.tsx`)가 렌더 경로에서 직접 import한다 — 그래서 `"use client"`
 * 파일인 `StateToggleSlot.tsx`의 **값**을 여기서 import하지 않는다. Server Component가 client
 * 모듈의 일반 값 export를 가져오면 RSC 경계에서 client reference로 치환돼 실제 배열 대신 빈
 * 값으로 평가된다(38일차 — 배지가 "0/16"으로 나타난 회귀, Playwright로 재현). 이 함정의 전체
 * 이력과 강제 수단은 `eslint-rules/client-module-exports.mjs` 파일 헤더가 단일 소스다.
 *
 * ## 44일차(I-222) 구조 변경 — 목록 복제와 드리프트 테스트를 없앴다
 * 38일차 구조는 "이 파일이 이름 목록을 손으로 유지하고, `StateToggleSlot`의 실제 디스패치
 * 레지스트리(`COMPONENT_REGISTRY`)와 같은 집합인지 런타임 테스트가 매번 대조"하는 방식이었다.
 * 즉 **같은 목록이 두 곳에 있고 드리프트를 사후에 잡는** 구조였다. 44일차에 방향을 뒤집었다 —
 * 아래 두 배열이 **유일한 원본**이고 `ComponentKey`가 거기서 파생되며, `COMPONENT_REGISTRY`는
 * `Record<ComponentKey, ...>`로 선언돼 **키가 빠지거나 남으면 typecheck가 즉시 실패**한다.
 * 불변식이 런타임 테스트에서 타입 시스템으로 올라갔으므로 복제도 대조 테스트도 필요 없다.
 *
 * - domain/composite 분류는 이 파일이 리터럴로 유지한다(4상태 대상 18종 + 비대상 7종, I-168).
 * - `as const`가 필수다 — 떼면 타입이 `string[]`로 넓어져 `ComponentKey`가 `string`이 되고,
 *   레지스트리 exhaustive 검사가 통째로 무력화된다(조용히, 오류 없이).
 */

export const DOMAIN_COMPONENT_NAMES = [
  "AbilityRadar",
  "ConditionGauge",
  "FitnessBar",
  "FormStrip",
  "PlayerAvatar",
  "PositionMap",
  "StatBar",
  "TeamBadge",
] as const;

export const COMPOSITE_COMPONENT_NAMES = [
  "BracketTree",
  "EventTimelineItem",
  "GrowthChart",
  "InjuryTimeline",
  "MatchCard",
  "MatchScoreboard",
  "NewsItem",
  "PitchLineup",
  "StandingsTable",
  "TrophyCase",
] as const;

// 39일차(Task 016 등록분, 5팀 산출물) — `ZoneLegend`는 composite/ 소유이지만
// `CompositeViewState<T>` 계약이 없는 순수 표시 컴포넌트다(`league` prop만 받음, loading/
// empty/error 변형이 구조적으로 존재하지 않는다). 그래서 `COMPOSITE_COMPONENT_NAMES`(=
// StateToggleSlot의 4상태 디스패치 레지스트리와 정확히 같아야 하는 집합, 아래 invariant
// 테스트 참조)에는 넣지 않고, 이 별도 목록으로 "등록은 됐지만 4상태 비대상"임을 명시한다.
export const COMPOSITE_STATIC_COMPONENT_NAMES = ["ZoneLegend"] as const;

// state·유틸 6종 — I-168에 따라 4상태 규약 비대상(위 `COMPONENT_REGISTRY`에 없다: 그 자체가
// 4상태를 구현하는 도구라 대상이 아니다). `StateToggleSlot`을 거치지 않고 page.tsx가 직접
// 인스턴스를 렌더하므로 이 이름 목록만 사람이 유지한다(6종 고정 계약, 자주 바뀌지 않는다).
export const STATE_UTILITY_COMPONENT_NAMES = [
  "CountdownTimer",
  "EmptyState",
  "ErrorState",
  "OddsButton",
  "PhaseIndicator",
  "SkeletonBlock",
] as const;

/**
 * 4상태(loading/empty/error/ready) 규약 대상 컴포넌트의 키. 위 두 배열에서 파생하므로 목록을
 * 따로 손으로 유지하지 않는다 — `StateToggleSlot.tsx`의 `COMPONENT_REGISTRY`가 이 타입으로
 * `Record`를 선언해 누락·잉여를 컴파일 시점에 잡는다(위 파일 헤더 "44일차 구조 변경" 절).
 *
 * **타입이므로 client 파일이 import해도 안전하다** — 타입은 컴파일 시점에 소거돼 RSC 경계의
 * client reference 치환 대상이 아니다(I-222).
 */
export type ComponentKey =
  | (typeof DOMAIN_COMPONENT_NAMES)[number]
  | (typeof COMPOSITE_COMPONENT_NAMES)[number];

export interface ComponentCoverage {
  readonly domainCount: number;
  readonly compositeCount: number;
  readonly stateUtilityCount: number;
  /** `COMPOSITE_STATIC_COMPONENT_NAMES`(4상태 비대상 composite 등록분)의 수. */
  readonly compositeStaticCount: number;
  /** 쇼케이스에 등록된 전체 컴포넌트 수 (domain + composite + composite정적 + state·유틸). */
  readonly registeredCount: number;
  /** 4상태 규약 대상(domain + composite)의 수 — 분모. */
  readonly fourStateEligibleCount: number;
  /**
   * "구현됨"의 분자. domain/composite로 분류된 컴포넌트는 정의상 전부
   * `StateToggleSlot.tsx`의 `COMPONENT_REGISTRY`를 거쳐 렌더된다(그 밖의 경로가 없다) —
   * 그 전제가 실제로 유지되는지는 `component-registry.test.ts`가 매번 재검증한다(파일
   * 헤더 주석 참조). 여기서는 검증된 분모를 그대로 분자로 쓴다.
   */
  readonly fourStateImplementedCount: number;
}

export function computeComponentCoverage(): ComponentCoverage {
  const domainCount = DOMAIN_COMPONENT_NAMES.length;
  const compositeCount = COMPOSITE_COMPONENT_NAMES.length;
  const stateUtilityCount = STATE_UTILITY_COMPONENT_NAMES.length;
  const compositeStaticCount = COMPOSITE_STATIC_COMPONENT_NAMES.length;
  const fourStateEligibleCount = domainCount + compositeCount;

  return {
    domainCount,
    compositeCount,
    stateUtilityCount,
    compositeStaticCount,
    registeredCount: fourStateEligibleCount + stateUtilityCount + compositeStaticCount,
    fourStateEligibleCount,
    fourStateImplementedCount: fourStateEligibleCount,
  };
}
