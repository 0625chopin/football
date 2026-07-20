import { messages } from "./messages";
import type { TranslationKey } from "./keys";
import type { SupportedLocale } from "./locales";

// Task 011(18일차) — 번역 함수 API 본체.
//
// ## 서버·클라이언트 겸용 설계
//
// `t()`는 React를 전혀 참조하지 않는 순수 함수다(로케일 + 키 → 문자열). Next.js 공식
// i18n 가이드(`node_modules/next/dist/docs/01-app/02-guides/internationalization.md`
// "Localization" 절)가 제시하는 정석도 Context/훅이 아니라 `getDictionary(locale)`을
// 서버 컴포넌트에서 직접 호출하는 순수 함수 패턴이다 — 서버 컴포넌트는 이미 라우트
// 세그먼트로부터 `params.lang`을 받으므로 훅이 필요 없다.
//
// 클라이언트 컴포넌트도 이 함수를 그대로 호출할 수 있지만(로케일 값을 prop으로 들고
// 있다면), 트리 깊숙한 곳의 클라이언트 컴포넌트까지 매 레벨 `lang` prop을 드릴링하는
// 것을 피하려면 Context가 필요하다 — 그 배선은 `provider.tsx`의 `useTranslation()`이
// 이 함수를 감싸 제공한다(내부적으로 동일한 `t()`를 호출).
//
// 즉 하나의 순수 함수가 서버 직접 호출 경로와 클라이언트 훅 경로 양쪽의 단일 소스다.

export type TranslationParams = Record<string, string | number>;

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

function resolve(locale: SupportedLocale, key: TranslationKey): string {
  const catalog: unknown = messages[locale];
  let node: unknown = catalog;

  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null || !(segment in node)) {
      // `key`가 `TranslationKey`로 타입 검증된 호출부에서는 발생하지 않는다. 그래도
      // 타입 단언(`as TranslationKey`)으로 우회한 오호출을 조용히 빈 문자열로 삼키지
      // 않고 즉시 드러내기 위해 에러를 던진다(런타임 오조회를 개발 중 바로 발견).
      throw new Error(`[i18n] 존재하지 않는 키: "${key}" (locale: ${locale})`);
    }
    node = (node as Record<string, unknown>)[segment];
  }

  if (typeof node !== "string") {
    throw new Error(`[i18n] "${key}"는 문자열로 귀결되지 않습니다 (locale: ${locale})`);
  }
  return node;
}

/**
 * 번역 키를 현재 로케일의 문자열로 조회한다. `params`가 있으면 `{name}` 형태의
 * 자리표시자를 치환한다(예: `common.header.seasonPhaseLabel`의 `{phase}`).
 * 대응하는 값이 없는 자리표시자는 원문 그대로 남긴다(무음 소거보다 결함이 눈에 띄게).
 *
 * React에 의존하지 않는 순수 함수라 서버 컴포넌트에서 `t(lang, key)`로 직접 호출해도
 * 되고, 클라이언트 컴포넌트에서 `useTranslation()`(provider.tsx)이 로케일을 바인딩해
 * 감싸 써도 된다.
 */
export function t(
  locale: SupportedLocale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const template = resolve(locale, key);
  if (!params) return template;

  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
