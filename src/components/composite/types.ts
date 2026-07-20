// Task 013B(28일차, 5팀) — 복합 컴포넌트 4상태 공유 계약.
//
// 4팀 013A(`src/components/domain/types.ts`)의 `DomainViewState<T>`와 판별 리터럴·
// prop 형태를 동형(同形)으로 맞췄다(팀장 28일차 판정) — `state: CompositeViewState<T>`
// 단일 prop, 정상 상태 리터럴 `"ready"`. 다만 H-12(도메인 표현 14종, 34일차/015 인계)
// 전까지는 그 파일을 직접 import하지 않는다(인계 전 크로스 의존 방지) — 합류 여부는
// 015 시점에 판정한다.
export type CompositeViewState<T> =
  | { readonly status: "loading" }
  | { readonly status: "empty" }
  | { readonly status: "error"; readonly message?: string }
  | { readonly status: "ready"; readonly data: T }
