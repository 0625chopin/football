import { defineConfig } from 'vitest/config';

// resolve.tsconfigPaths: tsconfig.json의 paths(@/* → ./src/*)를 재선언 없이 재사용.
// Next.js 16 공식 vitest 가이드는 vite-tsconfig-paths 플러그인을 권장하지만,
// 이 프로젝트의 Vite(8.1.5)는 동일 기능을 네이티브 옵션으로 제공해 별도 의존성이 불필요하다.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ['**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
    },
    // *.type-test.ts는 런타임 include가 아니라 typecheck 모드로 검증한다.
    // esbuild 트랜스폼은 expectTypeOf를 소거해 런타임 include에 넣으면 항상 통과하는 vacuous 테스트가 되므로
    // (docs/ISSUES.md I-46, 팀장 2차 검증 실증), 실제 tsc 프로세스를 띄우는 typecheck 모드로만 실행한다.
    typecheck: {
      enabled: true,
      checker: 'tsc',
      include: ['**/*.type-test.ts'],
    },
  },
});
