import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // I-89 (15일차, Task 011): 루트 레이아웃(`src/app/[lang]/layout.tsx`)이 최상위 동적
    // 세그먼트를 쓰는 구성이라, 완전히 매치되지 않는 URL에서 `[lang]/not-found.tsx`를 거치면
    // 유효하지 않은 lang 값으로도 <html lang>이 렌더링될 위험이 있다. global-not-found는
    // 레이아웃을 우회해 이 경로를 없앤다.
    globalNotFound: true,
  },
};

export default nextConfig;
