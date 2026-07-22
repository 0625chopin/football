import { RouteNotFound } from "@/components/state/RouteNotFound";

/**
 * `/[lang]/teams` not-found 폴백 — 60일차(Task 046) 신설. 마크업·로케일 처리는
 * `RouteNotFound`가 담당한다(껍데기만 연결).
 */
export default function NotFound() {
  return <RouteNotFound />;
}
