import { RouteNotFound } from "@/components/state/RouteNotFound";

/**
 * `/[lang]/leagues` not-found 폴백 — 44일차(I-223) 신설.
 * 자세한 내용은 `RouteNotFound` 파일 주석 참조.
 */
export default function NotFound() {
  return <RouteNotFound />;
}
