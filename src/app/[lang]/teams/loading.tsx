import { RouteLoading } from "@/components/state/RouteLoading";

/**
 * `/[lang]/teams` 로딩 폴백 — 60일차(Task 046) 신설.
 *
 * 표시·로케일 근사는 전부 `RouteLoading`이 담당한다. 이 파일이 하는 일은 Next.js의
 * 파일 규약(`loading.tsx`)에 그 껍데기를 연결하는 것뿐이다.
 */
export default function Loading() {
  return <RouteLoading />;
}
