import { describe, expect, it } from "vitest";

import {
  COMPOSITE_COMPONENT_NAMES,
  COMPOSITE_STATIC_COMPONENT_NAMES,
  STATE_UTILITY_COMPONENT_NAMES,
  computeComponentCoverage,
} from "./component-registry";

// Task 014(38일차) — 커버리지 카운터가 참조하는 레지스트리를 검증한다.
//
// **44일차(I-222) 변경**: 원래 이 파일의 첫 테스트는 "이 파일의 domain+composite 분류가
// `StateToggleSlot`의 실제 디스패치 레지스트리(`COMPONENT_REGISTRY`) 키와 같은 집합인가"를
// 런타임에 대조했다. 그 대조가 필요했던 이유는 **같은 목록이 두 곳에 복제돼 있었기** 때문인데,
// 44일차에 `ComponentKey`를 이 파일의 배열에서 파생시키고 레지스트리를 `Record<ComponentKey, …>`로
// 선언하도록 바꿔 **누락·잉여가 typecheck에서 즉시 실패**하게 만들었다. 불변식이 타입 시스템으로
// 올라갔으므로 그 테스트는 삭제했다(같은 것을 두 번 검사하지 않는다) — 대신 아래 카운트
// 테스트가 분류 규모가 조용히 바뀌는 것을 계속 잡는다.
//
// 그 구조 변경 덕분에 이 테스트 파일은 더 이상 `"use client"` 모듈(`StateToggleSlot.tsx`)을
// import하지 않는다. vitest는 Node 환경이라 RSC 경계가 없어 client 모듈의 아무 값이나 읽을 수
// 있는데(38일차엔 그 성질에 의존했다), 그건 **테스트만 통과하고 프로덕션에서 깨지는** 조합을
// 허용한다는 뜻이기도 하다 — 이제 그 의존이 없다.
describe("component-registry", () => {
  it("state·유틸 6종은 중복 없이 고정 목록이다", () => {
    expect(new Set(STATE_UTILITY_COMPONENT_NAMES).size).toBe(STATE_UTILITY_COMPONENT_NAMES.length);
    expect(STATE_UTILITY_COMPONENT_NAMES.length).toBe(6);
  });

  it("4상태 비대상 composite 등록분(ZoneLegend 등)은 COMPOSITE_COMPONENT_NAMES와 겹치지 않는다", () => {
    expect(new Set(COMPOSITE_STATIC_COMPONENT_NAMES).size).toBe(COMPOSITE_STATIC_COMPONENT_NAMES.length);
    for (const name of COMPOSITE_STATIC_COMPONENT_NAMES) {
      expect((COMPOSITE_COMPONENT_NAMES as readonly string[]).includes(name)).toBe(false);
    }
  });

  it("등록 컴포넌트 수와 4상태 커버율을 실제로 세어 100%를 반환한다", () => {
    const coverage = computeComponentCoverage();

    expect(coverage.domainCount).toBe(9);
    expect(coverage.compositeCount).toBe(11);
    expect(coverage.stateUtilityCount).toBe(6);
    expect(coverage.compositeStaticCount).toBe(4);
    expect(coverage.registeredCount).toBe(30);
    expect(coverage.fourStateEligibleCount).toBe(20);
    expect(coverage.fourStateImplementedCount).toBe(coverage.fourStateEligibleCount);
  });
});
