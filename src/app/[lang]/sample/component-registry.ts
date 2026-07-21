/**
 * Task 014(38일차, 4팀) — 커버리지 체크리스트가 세는 "등록 컴포넌트" 카탈로그.
 *
 * 이 파일은 서버 컴포넌트(`page.tsx`)가 렌더 경로에서 직접 import한다 — 그래서
 * `"use client"` 파일인 `StateToggleSlot.tsx`의 값(`COMPONENT_REGISTRY`/
 * `FOUR_STATE_COMPONENT_KEYS`)을 여기서 import하지 않는다. Server Component가
 * client 모듈의 일반 값 export를 가져오면 RSC 경계에서 클라이언트 레퍼런스로 치환돼
 * 실제 배열 대신 빈 값으로 평가되는 것을 실측으로 확인했다(38일차 — 배지가 "0/16"으로
 * 나타난 회귀, Playwright로 재현 후 이 구조로 수정). 대신:
 *
 * - domain/composite/state 분류는 이 파일이 리터럴로 유지한다(4상태 대상 16종 + 비대상
 *   6종, I-168).
 * - 그 16종이 `StateToggleSlot.tsx`의 실제 디스패치 레지스트리(`COMPONENT_REGISTRY`)와
 *   정확히 같은 집합인지는 `component-registry.test.ts`(vitest, Node 환경 — RSC 경계가
 *   없어 client 모듈을 안전하게 import할 수 있다)가 매번 교차 검증해 드리프트를 잡는다.
 *   즉 "실제로 세는" 근거는 프로덕션 런타임이 아니라 테스트가 매 실행마다 재확인한다.
 */

export const DOMAIN_COMPONENT_NAMES: readonly string[] = [
  "AbilityRadar",
  "ConditionGauge",
  "FitnessBar",
  "FormStrip",
  "PlayerAvatar",
  "PositionMap",
  "StatBar",
  "TeamBadge",
];

export const COMPOSITE_COMPONENT_NAMES: readonly string[] = [
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
];

// 39일차(Task 016 등록분, 5팀 산출물) — `ZoneLegend`는 composite/ 소유이지만
// `CompositeViewState<T>` 계약이 없는 순수 표시 컴포넌트다(`league` prop만 받음, loading/
// empty/error 변형이 구조적으로 존재하지 않는다). 그래서 `COMPOSITE_COMPONENT_NAMES`(=
// StateToggleSlot의 4상태 디스패치 레지스트리와 정확히 같아야 하는 집합, 아래 invariant
// 테스트 참조)에는 넣지 않고, 이 별도 목록으로 "등록은 됐지만 4상태 비대상"임을 명시한다.
export const COMPOSITE_STATIC_COMPONENT_NAMES: readonly string[] = ["ZoneLegend"];

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
