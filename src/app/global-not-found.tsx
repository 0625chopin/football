import type { Metadata } from "next";
import Link from "next/link";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "요청하신 페이지를 찾을 수 없습니다.",
};

// `[lang]/not-found.tsx`는 `[lang]/layout.tsx`(최상위 동적 세그먼트)를 거치므로 lang 값이
// 유효하지 않은 요청에서도 <html lang>이 렌더링된다. 이 파일은 라우팅 자체를 우회하는
// 완전 미매치 URL 전용 폴백이라 로케일과 무관하게 고정 텍스트만 쓴다(I-89, Task 011).
// 22일차: 그 고정 텍스트 자체는 D-18에 따라 카탈로그를 경유하도록 바꿨다(DEFAULT_LOCALE로
// 고정 — `src/i18n/README.md` §4, `error.notFound.*`/`common.nav.home` 재사용).
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 antialiased">
        <h1 className="text-2xl font-semibold">{t(DEFAULT_LOCALE, "error.notFound.title")}</h1>
        <p className="text-foreground/60">{t(DEFAULT_LOCALE, "error.notFound.description")}</p>
        <Link href="/ko" className="underline">
          {t(DEFAULT_LOCALE, "common.nav.home")}
        </Link>
      </body>
    </html>
  );
}
