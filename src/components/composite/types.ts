// Task 013B(28일차, 5팀) — 복합 컴포넌트 4상태 공유 계약.
//
// 4팀 013A(`src/components/domain/types.ts`)의 `DomainViewState<T>`와 판별 리터럴·
// prop 형태를 동형(同形)으로 맞췄다(팀장 28일차 판정) — `state: CompositeViewState<T>`
// 단일 prop, 정상 상태 리터럴 `"ready"`. 다만 H-12(도메인 표현 14종, 34일차/015 인계)
// 전까지는 그 파일을 직접 import하지 않는다(인계 전 크로스 의존 방지) — 합류 여부는
// 015 시점에 판정한다.
export type CompositeViewState<T> =
  | { readonly status: "loading" }
  // 53일차(5팀) — `message`는 옵션. 값이 없으면 기존처럼 소비 컴포넌트가 자기 네임스페이스의
  // 기본 empty 키를 쓴다(하위 호환). 호출부가 같은 "데이터 없음"이라도 사유가 갈리는 경우
  // (예: GrowthChart — 이력 0건 vs 1건뿐이라 추세를 그릴 수 없음)에만 override한다.
  | { readonly status: "empty"; readonly message?: string }
  | { readonly status: "error"; readonly message?: string }
  | { readonly status: "ready"; readonly data: T }
