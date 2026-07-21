import { RouteNotFound } from "@/components/state/RouteNotFound";

/**
 * `/[lang]/leagues/[leagueId]/fixtures` not-found 폴백 — Task 005(13일차) 신설, Task 013C(36일차) 공용 껍데기로 통합.
 * 자세한 내용은 `RouteNotFound` 파일 주석 참조.
 */
export default function NotFound() {
  return <RouteNotFound />;
}
