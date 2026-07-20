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
    // 15일차(Task 008) — 3단 머지 게이트(scripts/gate.sh)의 test 단계가 스코프를 좁혀
    // 실행될 때(예: 특정 디렉터리만 변경된 PR) 매치되는 테스트가 0건이어도 게이트가
    // "No test files found"로 실패하지 않도록 한다. coverage 임계(위 thresholds)는
    // 이 옵션과 무관하게 그대로 적용된다 — 실측 확인: --passWithNoTests여도 커버리지가
    // 임계 미달이면 여전히 실패한다.
    passWithNoTests: true,
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
      //
      // ⓐ 커버리지 범위 확장(15일차, 팀장 결함 B 지적으로 재판단): 원래 "회계·배당 모듈이
      // 아직 없어 include를 넓혀도 실효 없다"고 보류했으나, 팀장이 실측한 결과 이미 존재하는
      // src/lib/config·naming(3팀)·mock(3팀, 15일차 신설)은 전부 90%대로 임계를 상회했고,
      // 정작 임계 미달 위험이 있던 건 이 팀(1팀) 소유 src/lib/data/**(9~11일차 Task 004,
      // bootstrap/factory/fetch-result/result 4파일이 0%)였다 — 남의 코드가 아니라 우리
      // 코드가 비어 있었으므로 그대로 테스트를 작성해 채운다(각 파일의 *.test.ts 참조).
      // DataSource.ts는 순수 인터페이스 선언이라 실행 가능한 statement가 없어 이 include에
      // 걸려도 분모에 기여하지 않는다(v8 provider 실측 확인).
      include: [
        'src/lib/sim/**/*.ts',
        'src/lib/data/**/*.ts',
        'src/lib/config/**/*.ts',
        'src/lib/naming/**/*.ts',
        'src/lib/mock/**/*.ts',
      ],
      // polling.ts만 예외: React 훅(useEffect/useRef/useState)을 직접 쓰는 유일한 data 파일이라
      // 제대로 검증하려면 @testing-library/react + jsdom 환경이 필요한데 아직 미설치다(ⓑ UI
      // 테스트 전략 결정 — 4팀 UI기반팀 착수(23일차)에 맞춰 해당 의존성을 추가할 때 함께
      // 이 예외를 제거하고 테스트를 작성한다, 이슈 후보로 별도 보고). 그 전까지 이 파일만
      // 커버리지 분모에서 제외해 게이트가 이 파일 때문에 항상 실패하는 것을 막는다.
      exclude: ['src/lib/data/polling.ts'],
      // perFile(I-94, 15일차 재판단): 14일차엔 match/events.ts(0%)·match/stats.ts(branch 66.66%)가
      // 파일 단위로 70%를 밑돌아 aggregate만 채택했었다. 2팀 15일차 산출물(스냅샷 파이프라인 테스트)
      // 반영 후 재측정한 결과 events.ts 100%, stats.ts branch 75.75%로 두 파일 모두 임계를 상회해
      // 원래의 차단 사유가 해소됐다 — perFile을 채택한다. 현재 src/lib/sim/** 전 파일이
      // lines 80%/branches 70%를 상회함(가장 낮은 branch: stats.ts 75.75%, hash.ts 78.57%).
      // stats.ts의 미커버 2줄(541-542)은 `default: exhaustiveCheck` — MatchEventType이 23종을
      // 넘지 않는 한 도달 불가능한 구조적 분기라 여유폭이 얇다(75.75%, 임계까지 5.75%p).
      // 이 파일은 2팀 소유라 여기서 `/* v8 ignore */` 등으로 직접 손대지 않고 이슈로만 남긴다.
      thresholds: {
        lines: 80,
        branches: 70,
        perFile: true,
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
