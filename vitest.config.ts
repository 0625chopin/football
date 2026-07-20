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
      // Task 008(14일차) — src/lib/sim/ 라인 80%/브랜치 70% 임계 설정.
      // `include`가 없으면 무테스트 파일(예: match/events.ts, 305줄)이 분모에서 통째로 빠져
      // 커버리지가 실제보다 부풀려 보인다(13일차 실측, docs/ISSUES.md I-90).
      // 13일차 인계 문구는 "all: true + include"를 함께 요구했으나, 이 프로젝트에 설치된
      // vitest 4.1.10 / @vitest/coverage-v8 기준 `all` 옵션은 타입에 존재하지 않는다
      // (node_modules/vitest/dist/chunks/reporters.d.*.d.ts의 CoverageOptions 확인,
      // tsc typecheck 모드가 즉시 오류로 검출 — 구버전 vitest 지식 기반의 오기로 판단).
      // 실제로는 `include`를 지정하는 것만으로 전체 테스트 실행 시 미테스트 파일까지
      // 자동 포함된다(@vitest/coverage-v8/dist/provider.js — `options.include != null` 조건
      // 확인). 별도 `all` 플래그는 불필요하다.
      // include는 'src/lib/sim/**'가 아니라 확장자를 '*.ts'로 한정한다 — 글롭을 넓게 주면
      // 같은 디렉터리의 TIER_B_RESIM_DESIGN.md(2팀 설계 메모)까지 v8 provider가 소스로 파싱을
      // 시도하다 실패해(rolldown ParseError) 매 실행마다 노이즈 로그가 남는다(실측 확인).
      include: ['src/lib/sim/**/*.ts'],
      // 임계는 aggregate(전역) 기준이다(`thresholds.perFile`을 켜지 않음).
      // 실측(14일차)상 match/events.ts(0%, 2팀 소유·무테스트)·match/stats.ts(branch 66.66%)가
      // 이미 파일 단위로는 70%를 밑돈다 — perFile을 켜면 이 팀이 남의 소유 구현 파일의
      // 테스트 보강을 즉시 강제하는 파괴적 변경이 되므로(13일차 인계 문구가 이 위험을 사전 경고),
      // 이번 Task 008 스코프에서는 aggregate만 채택한다. lines/branches 두 지표만 게이트로
      // 삼는 것은 ROADMAP.md Task 008 수락 기준("라인 80%/브랜치 70%")과 정확히 일치한다.
      // perFile 세분화는 별도 이슈(docs/ISSUES.md)로 다음 배치에서 판단한다.
      thresholds: {
        lines: 80,
        branches: 70,
      },
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
