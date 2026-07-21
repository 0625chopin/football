"use client"; // Error Boundary는 Client Component여야 한다(error.md)

import { RouteError } from "@/components/state/RouteError";

/**
 * `/[lang]/transfers` 에러 폴백 — Task 005(13일차) 신설, Task 013C(36일차) 공용 껍데기로 통합.
 * 자세한 내용은 `RouteError` 파일 주석 참조.
 *
 * `unstable_retry`(v16.2.0 신규 API — 공식 문서가 `reset`보다 우선 권장)를 그대로 넘긴다.
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
