"use client"; // Error Boundary는 Client Component여야 한다(error.md)

import { RouteError } from "@/components/state/RouteError";

/**
 * `/[lang]/players` 에러 폴백 — 50일차(I-223) 신설. 마크업·로케일 처리는 `RouteError`가
 * 담당하며 이 파일은 껍데기만 연결한다(`[playerId]/error.tsx`와 동일 형태).
 *
 * 이 파일이 `"use client"`를 다시 선언하는 이유: Next.js는 `error.tsx` **파일 자체**가
 * 클라이언트 경계여야 한다고 요구하며, import한 컴포넌트가 클라이언트인 것만으로는
 * 대신할 수 없다.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <RouteError error={error} retry={unstable_retry} />;
}
