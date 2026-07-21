import { describe, expect, it } from "vitest";

import { FOUR_STATE_COMPONENT_KEYS } from "./StateToggleSlot";
import {
  COMPOSITE_COMPONENT_NAMES,
  COMPOSITE_STATIC_COMPONENT_NAMES,
  DOMAIN_COMPONENT_NAMES,
  STATE_UTILITY_COMPONENT_NAMES,
  computeComponentCoverage,
} from "./component-registry";

// Task 014(38일차) — 커버리지 카운터가 참조하는 레지스트리 자체를 검증한다. 요지는 "이
// 파일이 손으로 유지하는 domain/composite 분류가 StateToggleSlot의 실제 디스패치
// 레지스트리와 항상 같은 집합을 가리킨다"는 불변식이다 — 둘 중 하나만 갱신되면 이 테스트가
// 즉시 실패해 드리프트를 잡는다(파일 헤더 주석 참조).
describe("component-registry", () => {
  it("domain + composite 분류의 합집합이 StateToggleSlot의 4상태 레지스트리 키와 정확히 같다", () => {
    const categorized = new Set([...DOMAIN_COMPONENT_NAMES, ...COMPOSITE_COMPONENT_NAMES]);
    const actual = new Set(FOUR_STATE_COMPONENT_KEYS);

    expect(categorized.size).toBe(DOMAIN_COMPONENT_NAMES.length + COMPOSITE_COMPONENT_NAMES.length);
    expect(categorized.size).toBe(actual.size);
    for (const key of actual) {
      expect(categorized.has(key)).toBe(true);
    }
  });

  it("state·유틸 6종은 중복 없이 고정 목록이다", () => {
    expect(new Set(STATE_UTILITY_COMPONENT_NAMES).size).toBe(STATE_UTILITY_COMPONENT_NAMES.length);
    expect(STATE_UTILITY_COMPONENT_NAMES.length).toBe(6);
  });

  it("4상태 비대상 composite 등록분(ZoneLegend 등)은 COMPOSITE_COMPONENT_NAMES와 겹치지 않는다", () => {
    expect(new Set(COMPOSITE_STATIC_COMPONENT_NAMES).size).toBe(COMPOSITE_STATIC_COMPONENT_NAMES.length);
    for (const name of COMPOSITE_STATIC_COMPONENT_NAMES) {
      expect(COMPOSITE_COMPONENT_NAMES.includes(name)).toBe(false);
    }
  });

  it("등록 컴포넌트 수와 4상태 커버율을 실제로 세어 100%를 반환한다", () => {
    const coverage = computeComponentCoverage();

    expect(coverage.domainCount).toBe(8);
    expect(coverage.compositeCount).toBe(9);
    expect(coverage.stateUtilityCount).toBe(6);
    expect(coverage.compositeStaticCount).toBe(1);
    expect(coverage.registeredCount).toBe(24);
    expect(coverage.fourStateEligibleCount).toBe(17);
    expect(coverage.fourStateImplementedCount).toBe(coverage.fourStateEligibleCount);
  });
});
