import { defineConfig } from 'vitest/config';

// resolve.tsconfigPaths: tsconfig.json의 paths(@/* → ./src/*)를 재선언 없이 재사용.
// Next.js 16 공식 vitest 가이드는 vite-tsconfig-paths 플러그인을 권장하지만,
// 이 프로젝트의 Vite(8.1.5)는 동일 기능을 네이티브 옵션으로 제공해 별도 의존성이 불필요하다.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // I-151(35일차, 4팀) — jsdom + @testing-library/react 도입과 함께 첫 UI 렌더
    // 테스트(badge.render.test.tsx)가 .tsx 확장자를 쓰므로 include에 tsx를 추가한다.
    // environment는 전역으로 바꾸지 않는다(파일별 `@vitest-environment` 매직 코멘트로
    // jsdom을 필요한 파일에만 적용 — 다른 팀 테스트의 기본 environment에 영향 없음).
    // I-222(44일차) — `mjs`를 추가한다. `eslint-rules/**`의 커스텀 ESLint 룰은 flat config가
    // 로드해야 해서 `.mjs`로 작성되며, 그 룰의 회귀 테스트도 같은 확장자다. 룰 자체가
    // "세 번 재발한 함정을 기계적으로 막는" 장치라 룰이 조용히 무력화되면 원상 복귀하므로,
    // 게이트가 반드시 그 테스트를 실행해야 한다.
    include: ['**/*.{test,spec}.{ts,tsx,mjs}'],
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
      // polling.ts 예외는 **44일차에 해제됐다**(I-222). 15일차 당시 제외 사유는 "React 훅을
      // 직접 쓰는 유일한 data 파일이라 검증에 @testing-library/react + jsdom이 필요한데
      // 미설치"였고, 재포함 조건으로 "그 의존성을 추가할 때 함께 예외를 제거하고 테스트를
      // 작성한다"를 명시해 뒀다. 의존성은 35일차(I-151)에 들어왔으나 예외는 남아 있었고,
      // 그 사이 `polling.ts`가 무테스트로 방치된 결과 I-222(클라이언트에서 `loadConstants`가
      // 100% 실패해 폴링 주기가 안전망 값으로 고정)이 44일차까지 발견되지 않았다.
      // 44일차에 `src/lib/data/polling.test.ts`(jsdom, 10건)를 작성해 조건을 충족했다 —
      // 실측 lines 100% / branches 92.3%로 perFile 임계를 상회한다.
      // database.types.ts: MCP `generate_typescript_types`가 Supabase 스키마에서 그대로 뽑아내는
      // **생성 파일**이다 — type/interface 선언뿐이라 실행 가능한 statement가 없고(순수 타입이라
      // DataSource.ts와 같은 이유로 원래 분모 기여가 0이어야 하지만, 파일 규모가 커 v8 provider가
      // "커버되지 않은 파일"로 집계해 lines 0%로 잡힌다), 애초에 테스트 대상이 될 수 없다.
      // 19일차 팀장 `npm run gate` 마감 검증에서 ERROR로 검출(16~18일차 3개 일차간 게이트가
      // 마감 검증 경로에 연결되지 않아 미검출 — docs/ISSUES.md 신규 항목 참조).
      // polling.ts와 달리 이 제외는 **재포함 조건이 없는 영구 제외**다 — polling.ts는 조건이
      // 채워져 44일차에 해제됐지만, database.types.ts는 생성물 자체의 성격상 재포함할
      // 시나리오가 없다(재생성해도 여전히 순수 타입 선언 파일).
      exclude: ['src/lib/data/database.types.ts'],
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
    //
    // tsconfig(35일차, I-180): 루트 tsconfig.json을 그대로 쓰면 그 include의
    // `.next/dev/types/**/*.ts`(Next dev 서버가 라우트 방문 시 계속 재생성하는 휘발성
    // 산출물)까지 같은 tsc 프로그램에 끌려 들어와, dev 서버가 그 파일을 다시 쓰는 순간과
    // 이 typecheck가 읽는 순간이 겹치면 "파일을 찾을 수 없음"/구문 오류가 무작위로 난다
    // (dev 서버 가동 여부에 따라 로컬·CI 판정이 달라지는 결과). `*.type-test.ts`는
    // `@/types`·순수 도메인 모듈만 검증하고 Next 라우트 타입과 무관하므로,
    // `tsconfig.typecheck.json`(같은 compilerOptions을 상속하되 include를 이 typecheck의
    // `include` 글롭과 동일한 `**/*.type-test.ts`로 좁힘 — `src/app/**`를 프로그램에
    // 끌어들이면 그쪽은 `.next/types/**`가 생성하는 전역 `PageProps`/`LayoutProps`가
    // 필요해 `src/**` 전체로 넓히면 오히려 새 오류가 난다, 실측 확인)으로 분리했다 —
    // Next 라우트 타입 자체의 검증은 여전히 루트 `tsconfig.json` 기반의
    // `npx tsc --noEmit` 게이트가 담당하므로 커버리지 손실은 없다.
    //
    // **정정(35일차, I-181)**: 위 문장을 쓸 때 "루트 게이트는 이 문제가 없다"고 가정했으나
    // 틀렸다 — 루트 `tsconfig.json`도 정확히 같은 이유로 dev 서버 가동 중에는 `npx tsc
    // --noEmit`이 무작위로 실패했다(팀장·4팀 각자 재현). 다만 그 tsconfig는 여기처럼 좁힐 수
    // 없다 — Next가 `.next/dev/types/**`를 `next dev`/`next build`마다 자동으로 다시 채워
    // 넣는다(`node_modules/next/dist/lib/typescript/writeConfigurationDefaults.js`, 의도된
    // 동작 — I-181 상세). 대신 `scripts/typecheck.mjs`(재시도 래퍼)로 완화했다. **CI는 이
    // 경합 자체가 없다**(클린 체크아웃엔 동시에 쓰는 dev 서버가 없으므로) — 로컬에서 dev
    // 서버를 띄운 채로 게이트를 돌릴 때만 해당하는 문제였다.
    typecheck: {
      enabled: true,
      checker: 'tsc',
      include: ['**/*.type-test.ts'],
      tsconfig: './tsconfig.typecheck.json',
    },
  },
});
