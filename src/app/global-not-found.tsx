import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Geist, Geist_Mono, Gothic_A1 } from "next/font/google";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "요청하신 페이지를 찾을 수 없습니다.",
};

/**
 * Task 013C(36일차) — 이 파일은 자기 `<html>`/`<body>`를 직접 갖는 독립 문서라
 * `[lang]/layout.tsx`가 주입하는 폰트 변수를 물려받지 못한다. 그래서 같은 4종을 여기서도
 * 선언한다(next/font는 같은 폰트를 여러 파일에서 불러도 중복 다운로드하지 않는다).
 * 선언하지 않으면 `--font-*`가 비어 `globals.css`의 폰트 스택이 전부 폴백으로 떨어져,
 * 이 화면만 OS 기본 글꼴로 보인다(36일차 렌더 확인).
 */
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const gothicA1 = Gothic_A1({
  variable: "--font-gothic-a1",
  weight: ["400", "500", "700"],
  preload: false,
});

// `[lang]/not-found.tsx`는 `[lang]/layout.tsx`(최상위 동적 세그먼트)를 거치므로 lang 값이
// 유효하지 않은 요청에서도 <html lang>이 렌더링된다. 이 파일은 라우팅 자체를 우회하는
// 완전 미매치 URL 전용 폴백이라 로케일과 무관하게 고정 텍스트만 쓴다(I-89, Task 011).
// 22일차: 그 고정 텍스트 자체는 D-18에 따라 카탈로그를 경유하도록 바꿨다(DEFAULT_LOCALE로
// 고정 — `src/i18n/README.md` §4, `error.notFound.*`/`common.nav.home` 재사용).
//
// 36일차: 이 화면은 레이아웃(헤더·내비·푸터)을 통째로 벗어난 유일한 화면이라, 그 부재가
// "앱 밖으로 떨어졌다"는 신호가 되도록 오히려 살린다 — 대신 워드마크와 터치라인을 두어
// 어느 제품의 404인지는 알 수 있게 하고, 홈으로 가는 길을 준다.
export default function GlobalNotFound() {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${gothicA1.variable} antialiased`}
    >
      <body className="board pitch-stripes flex min-h-screen flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span aria-hidden className="h-5 w-[3px] rounded-full bg-primary" />
          <span className="eyebrow text-[0.95rem] tracking-[0.2em]">
            {t(DEFAULT_LOCALE, "common.app.name")}
          </span>
        </div>

        <main className="flex flex-1 flex-col items-start justify-center gap-3 px-6 pb-24 md:px-12">
          <span className="eyebrow text-board-muted">404</span>
          <h1 className="text-3xl md:text-4xl">{t(DEFAULT_LOCALE, "error.notFound.title")}</h1>
          <p className="text-sm text-board-muted">
            {t(DEFAULT_LOCALE, "error.notFound.description")}
          </p>
          <Button asChild size="lg" className="mt-3">
            <Link href={`/${DEFAULT_LOCALE}`}>{t(DEFAULT_LOCALE, "common.nav.home")}</Link>
          </Button>
        </main>
      </body>
    </html>
  );
}
