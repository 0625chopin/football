"use client";

import { useEffect } from "react";
import { unstable_catchError, type ErrorInfo } from "next/error";

import type { SupportedLocale } from "@/i18n/locales";
import { ErrorState } from "@/components/state/ErrorState";
import { cn } from "@/lib/utils";

export interface ErrorBoundaryProps {
  readonly locale: SupportedLocale;
  /** 격리 대상 식별 라벨(쇼케이스 컴포넌트명 등) — 여러 개가 동시에 크래시했을 때 콘솔에서 구분한다. */
  readonly name: string;
  readonly className?: string;
}

/**
 * Task 014(37일차, 4팀) — 컴포넌트 단위 크래시 격리.
 *
 * `/sample` 쇼케이스는 22종을 한 라우트 트리에 렌더한다. 이 래퍼 없이는 그중 하나가 렌더
 * 중 던지면 라우트 세그먼트 `error.tsx`까지 올라가 나머지 21종이 함께 사라진다(Next.js
 * 에러 바운더리는 기본적으로 라우트 세그먼트 단위 — `node_modules/next/dist/docs/01-app/
 * 01-getting-started/10-error-handling.md` "Nested error boundaries"). Next.js 16.2에서
 * 도입된 `unstable_catchError`(`node_modules/next/dist/docs/01-app/03-api-reference/
 * 04-functions/catchError.md`)는 라우트 세그먼트가 아니라 트리의 임의 지점을 바운더리로
 * 만들 수 있어, 손으로 클래스 컴포넌트 에러 바운더리를 구현하는 대신 이를 쓴다 — 프레임워크의
 * `redirect()`/`notFound()` 내부 에러를 오인해 삼키지 않고, `unstable_retry()`가 클라이언트
 * 상태를 보존한 채 재시도하는 이점도 그대로 따라온다.
 */
function ErrorBoundaryFallback(
  { locale, name, className }: ErrorBoundaryProps,
  { error, unstable_retry }: ErrorInfo,
) {
  useEffect(() => {
    console.error(`[ErrorBoundary:${name}]`, error);
  }, [error, name]);

  return (
    <div className={cn("space-y-1", className)}>
      <p className="eyebrow text-destructive">{name}</p>
      <ErrorState locale={locale} onRetry={() => unstable_retry()} />
    </div>
  );
}

export const ErrorBoundary = unstable_catchError(ErrorBoundaryFallback);
