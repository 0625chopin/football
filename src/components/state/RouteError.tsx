"use client"; // Error Boundary는 Client Component여야 한다(error.md)

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/provider";

/**
 * Task 013C(36일차, 4팀) — 라우트 error 폴백의 공용 껍데기.
 *
 * 생성 배경은 `RouteLoading`의 파일 주석 참조(주석 한 줄만 다른 파일 20개를 하나로 모음).
 *
 * ## 로케일
 * 이쪽은 근사가 필요 없다 — Client Component라 `useTranslation()`(provider.tsx)으로 현재
 * 활성 로케일을 그대로 따라간다(`src/i18n/README.md` §4, 22일차). `loading`/`not-found`가
 * 쿠키 근사를 쓰는 것과 대비되는 지점이다.
 *
 * ## 표시
 * 종전에는 제목 + 손으로 만든 테두리 버튼이 전부였고 설명 문구(`error.generic.description`,
 * 16일차부터 카탈로그에 있었으나 미사용)를 아무도 쓰지 않았다. 오류 화면은 무슨 일이
 * 일어났는지와 다음에 무엇을 할 수 있는지를 함께 말해야 하므로 설명을 붙이고, 버튼은
 * 프로젝트 표준 `Button`으로 바꿔 포커스 링·크기 규약을 공유하게 한다.
 */
export function RouteError({
  error,
  retry,
}: {
  readonly error: Error & { digest?: string };
  /** `error.tsx`가 받는 `unstable_retry`(v16.2.0 신규 API — 공식 문서가 `reset`보다 우선 권장). */
  readonly retry: () => void;
}) {
  const t = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-start gap-3 px-4 py-16 md:px-6">
      <h2 className="text-2xl">{t("error.generic.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("error.generic.description")}</p>
      <Button type="button" size="lg" onClick={() => retry()} className="mt-2">
        {t("error.generic.retryLabel")}
      </Button>
    </div>
  );
}
