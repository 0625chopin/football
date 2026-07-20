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

// 22일차(Task 011) — 로케일 스위처가 선택 로케일을 영속화하는 쿠키 이름. 라우팅은
// 여전히 경로 세그먼트(`/ko/...`, `/en/...`)가 단일 소스이고 이 쿠키가 리다이렉트를
// 일으키지는 않는다(`proxy.ts` 미생성, 9일차 §7.4 결정 유지) — 용도는 (1) 브라우저의
// document.cookie로 클라이언트에서 직접 쓰고, (2) `params.lang`에 접근할 수 없는
// 라우트 세그먼트 특수 파일(`loading.tsx`/`not-found.tsx` — Next.js 16.2.10 기준
// 두 파일 모두 props를 받지 않는다, `unstable_rootParams`도 제거되어 대안 없음)이
// 훗날 서버에서 `cookies()`로 읽어 요청별 로케일을 근사하는 것이다. 이 순수 상수
// 모듈 자체는 Next.js 런타임 API를 참조하지 않는다(위 파일 상단 주석과 동일 제약).
export const LOCALE_COOKIE_NAME = "f4_locale";
