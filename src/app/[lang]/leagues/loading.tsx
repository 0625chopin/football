import { RouteLoading } from "@/components/state/RouteLoading";

/**
 * `/[lang]/leagues` 로딩 폴백 — 44일차(I-223) 신설.
 *
 * 표시·로케일 근사는 전부 `RouteLoading`이 담당한다. 이 파일이 하는 일은 Next.js의
 * 파일 규약(`loading.tsx`)에 그 껍데기를 연결하는 것뿐이다 — 라우트별로 다르게 보여야 할
 * 것이 생기면 그때 이 파일에 직접 마크업을 둔다.
 */
export default function Loading() {
  return <RouteLoading />;
}
