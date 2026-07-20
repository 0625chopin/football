import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "요청하신 페이지를 찾을 수 없습니다.",
};

// `[lang]/not-found.tsx`는 `[lang]/layout.tsx`(최상위 동적 세그먼트)를 거치므로 lang 값이
// 유효하지 않은 요청에서도 <html lang>이 렌더링된다. 이 파일은 라우팅 자체를 우회하는
// 완전 미매치 URL 전용 폴백이라 로케일과 무관하게 고정 텍스트만 쓴다(I-89, Task 011).
export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 antialiased">
        <h1 className="text-2xl font-semibold">404 - Page Not Found</h1>
        <p className="text-foreground/60">요청하신 페이지를 찾을 수 없습니다.</p>
        <Link href="/ko" className="underline">
          홈으로 이동
        </Link>
      </body>
    </html>
  );
}
