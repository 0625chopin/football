"use client"; // Error Boundary는 Client Component여야 한다(error.md)

import { useEffect } from "react";
import { useTranslation } from "@/i18n/provider";

/**
 * `/[lang]/sample` 에러 폴백 — Task 005(13일차), 빈 자리표시자.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 * `unstable_retry`는 v16.2.0 신규 API — 공식 문서가 `reset`보다 우선 권장한다.
 * Client Component라 `useTranslation()`(provider.tsx)으로 현재 활성 로케일을 그대로 따라간다(`src/i18n/README.md` §4, 22일차).
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="p-4 text-sm">
      <h2 className="font-semibold">{t("error.generic.title")}</h2>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-2 rounded border border-foreground/20 px-2 py-1"
      >
        {t("error.generic.retryLabel")}
      </button>
    </main>
  );
}
