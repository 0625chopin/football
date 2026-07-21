// @vitest-environment jsdom
//
// I-151(35일차, 4팀) — jsdom + @testing-library/react 도입 후 첫 UI 렌더 회귀 테스트.
// 전역 vitest.config.ts의 test.environment는 건드리지 않고 이 파일에만 jsdom을 적용한다
// (파일 상단의 `@vitest-environment jsdom` 매직 코멘트, vitest 공식 기능).
//
// 대상: badge.tsx의 14ch 하드 클립(27일차 결정) — `max-w-[14ch]` + `truncate`가 실제
// DOM에 적용되는지 검증한다. ⚠️ jsdom은 레이아웃 엔진이 없어 "실제 렌더 폭"(px) 자체는
// 계산하지 못한다(Playwright 부재인 I-128과 동일한 한계) — 이 테스트는 클립을 유발하는
// 클래스가 실제로 DOM에 적용되는지까지만 검증한다.
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Badge } from "./badge";

describe("Badge", () => {
  test("14ch를 넘는 텍스트에도 하드 클립 클래스(max-w-[14ch] + truncate)가 적용된다", () => {
    render(<Badge>Manager of the Season Extra Long Label</Badge>);

    const el = screen.getByText("Manager of the Season Extra Long Label");

    expect(el.className).toContain("max-w-[14ch]");
    expect(el.className).toContain("truncate");
    // inline-flex 컨테이너라 text-overflow: ellipsis가 적용되지 않는다(27일차 검증,
    // badge.tsx 파일 헤더 주석) — 말줄임 없는 하드 클립이 의도된 동작이므로 ellipsis
    // 관련 클래스가 없는 것도 함께 확인한다.
    expect(el.className).not.toContain("text-ellipsis");
  });

  test("variant prop이 data-variant 속성과 대응 배경 클래스에 반영된다", () => {
    render(<Badge variant="destructive">에러</Badge>);

    const el = screen.getByText("에러");

    expect(el.getAttribute("data-variant")).toBe("destructive");
    expect(el.className).toContain("text-destructive");
  });
});
