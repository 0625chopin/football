// D-18: 기본 로케일 ko, 2차 로케일 en. Task 011(15일차) 로케일 라우팅 전략 확정.
// `src/proxy.ts`(Edge 런타임)와 `src/app/[lang]/layout.tsx`(Node 런타임) 양쪽에서
// import하는 단일 소스 — Next.js 런타임 API를 참조하지 않는 순수 상수/타입 모듈이라야
// 두 런타임 모두에서 안전하게 번들된다.
export const SUPPORTED_LOCALES = ["ko", "en"] as const;
export const DEFAULT_LOCALE: (typeof SUPPORTED_LOCALES)[number] = "ko";

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
