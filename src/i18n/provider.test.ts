/**
 * provider.tsx 테스트 — Task 011 / 18일차.
 *
 * @testing-library/react + jsdom이 아직 미설치라서(vitest.config.ts 주석 — 4팀 착수
 * 23일차에 함께 도입 예정) DOM 렌더를 가정하는 방식 대신, Node 환경에서도 그대로 동작하는
 * `react-dom/server`의 `renderToStaticMarkup`으로 훅 배선(Context → useLocale/
 * useTranslation)만 검증한다. JSX 없이 `React.createElement`만 쓰므로 파일 확장자를
 * `.tsx`가 아닌 `.ts`로 유지해도 된다(vitest.config.ts의 include는 `*.test.ts`만 매치).
 *
 * JSX 없이 `createElement`로 children을 넘기면 `TranslationProvider`의 `children`이
 * 필수 prop이라 rest-args 오버로드 타입 추론이 실패해(TS2769) props 객체에 `children`을
 * 직접 넣어야 한다 — `react/no-children-prop`은 JSX 대안(`<Foo>{x}</Foo>`)이 있을 때를
 * 겨냥한 규칙이라 이 파일(JSX 자체가 불가능)에는 맞지 않아 국소적으로만 끈다.
 */

/* eslint-disable react/no-children-prop */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TranslationProvider, useLocale, useTranslation } from "./provider";

function HomeLabel() {
  const t = useTranslation();
  return createElement("span", null, t("common.nav.home"));
}

function LocaleLabel() {
  const locale = useLocale();
  return createElement("span", null, locale);
}

describe("TranslationProvider / useTranslation — 클라이언트 훅 경로", () => {
  it("Provider 하위에서 ko 로케일 문자열을 렌더한다", () => {
    const html = renderToStaticMarkup(
      createElement(TranslationProvider, { locale: "ko", children: createElement(HomeLabel) }),
    );
    expect(html).toBe("<span>홈</span>");
  });

  it("Provider 하위에서 en 로케일 문자열을 렌더한다(같은 컴포넌트, 다른 값)", () => {
    const html = renderToStaticMarkup(
      createElement(TranslationProvider, { locale: "en", children: createElement(HomeLabel) }),
    );
    expect(html).not.toContain("홈");
  });

  it("useLocale()이 컨텍스트 로케일을 그대로 노출한다", () => {
    const html = renderToStaticMarkup(
      createElement(TranslationProvider, { locale: "ko", children: createElement(LocaleLabel) }),
    );
    expect(html).toBe("<span>ko</span>");
  });

  it("Provider 없이 호출하면 배선 누락을 조용히 넘기지 않고 던진다", () => {
    expect(() => renderToStaticMarkup(createElement(HomeLabel))).toThrow(
      /TranslationProvider 하위에서만/,
    );
  });
});
