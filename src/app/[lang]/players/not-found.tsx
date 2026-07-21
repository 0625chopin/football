import { RouteNotFound } from "@/components/state/RouteNotFound";

/**
 * `/[lang]/players` not-found 폴백 — 50일차(I-223) 신설. 마크업·로케일 처리는
 * `RouteNotFound`가 담당한다(껍데기만 연결).
 */
export default function NotFound() {
  return <RouteNotFound />;
}
