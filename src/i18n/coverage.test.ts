import { describe, expect, it } from "vitest";

import { computeTranslationKeyCoverage, diffTranslationKeys } from "./coverage";

// Task 014(38일차) — 번역 키 누락 카운터 검증. 두 층으로 나눠 본다:
// 1) `diffTranslationKeys`는 합성 픽스처로 로직 자체(중첩·리프 판별·양방향 diff)를 검증.
// 2) `computeTranslationKeyCoverage`는 실제 ko/en 카탈로그를 순회해 "지금 이 순간" 0건인지
//    확인 — 카탈로그가 바뀌어 누락이 생기면 이 테스트가 즉시 실패한다.
describe("diffTranslationKeys", () => {
  it("한쪽에만 있는 리프 키를 양방향으로 찾아낸다", () => {
    const a = { common: { title: "제목", onlyInA: "A전용" } };
    const b = { common: { title: "Title", onlyInB: "B only" } };

    const diff = diffTranslationKeys(a, b);

    expect(diff.missingInB).toEqual(["common.onlyInA"]);
    expect(diff.missingInA).toEqual(["common.onlyInB"]);
  });

  it("중첩 그룹은 리프에 도달한 경로만 채택한다(중간 그룹 자체는 유니온에 없음)", () => {
    const a = { nav: { deep: { label: "라벨" } } };
    const b = { nav: { deep: { label: "Label" } } };

    const diff = diffTranslationKeys(a, b);

    expect(diff.missingInB).toEqual([]);
    expect(diff.missingInA).toEqual([]);
  });

  it("완전히 동일한 트리는 양쪽 다 빈 배열이다", () => {
    const tree = { a: { b: "x", c: "y" } };
    const diff = diffTranslationKeys(tree, tree);

    expect(diff.missingInA).toEqual([]);
    expect(diff.missingInB).toEqual([]);
  });
});

describe("computeTranslationKeyCoverage", () => {
  it("실제 ko/en 카탈로그를 순회해 누락 0건을 실측한다", () => {
    const coverage = computeTranslationKeyCoverage();

    expect(coverage.missingInEn).toEqual([]);
    expect(coverage.missingInKo).toEqual([]);
    expect(coverage.missingCount).toBe(0);
    expect(coverage.totalKo).toBeGreaterThan(0);
    expect(coverage.totalKo).toBe(coverage.totalEn);
  });
});
