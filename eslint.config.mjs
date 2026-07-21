import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import { localRscPlugin } from "./eslint-rules/client-module-exports.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // I-222(44일차): `'use client'` 파일은 컴포넌트·훅·타입만 export한다. RSC 번들러가 그런
    // 파일의 **모든 export**를 client reference로 치환하므로, 순수 유틸·상수를 거기 두면
    // 서버 컴포넌트가 가져갔을 때 호출 시 런타임 오류가 나거나 **값이 조용히 비어서 평가**된다.
    // 이 저장소에서 11일차(I-74 `fetchResult`)·38일차(`/sample` 배지 0/16 오표시)·44일차
    // (I-222 `resolvePollIntervalMs`) 세 번 재발했고, 세 번 다 "고치고 주석 남기기"로 끝나
    // 다음 사람이 다시 밟았다 — 그래서 주석이 아니라 린트로 고정한다. 룰 본문과 전체 근거는
    // `eslint-rules/client-module-exports.mjs` 파일 헤더가 단일 소스다.
    //
    // 테스트 파일도 범위에 넣는다 — vitest는 Node 환경이라 RSC 경계가 없어 client 모듈의
    // 아무 값이나 import할 수 있고(38일차 `component-registry.test.ts`가 실제로 그렇게 썼다),
    // 그래서 테스트만 통과하는 채로 프로덕션에서 깨지는 조합이 성립한다. 즉 테스트는 이
    // 함정의 안전지대가 아니라 **사각지대**다.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    plugins: { "local-rsc": localRscPlugin },
    rules: {
      "local-rsc/client-module-exports": "error",
    },
  },
  // Task 010(19일차, H-06 인계): eslint-config-next/typescript의 @typescript-eslint/no-unused-vars
  // 기본값은 argsIgnorePattern이 없어, 인터페이스 계약상 어쩔 수 없이 받지만 쓰지 않는 매개변수를
  // `_` 접두사로 표시하는 이 저장소의 기존 관례(예: src/lib/data/mock/MockDataSource.ts)를
  // 인식하지 못하고 전부 경고로 잡는다. 접두사 관례 자체는 이미 코드베이스에 있었으므로
  // 이 규칙만 그 관례를 인식하도록 맞춘다 — 실제 미사용 변수(접두사 없음)는 계속 경고된다.
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // NFR-DT-001: src/lib/sim/** 는 결정론 유지가 필요해 Math.random()/Date.now()를 금지한다.
  // 이 둘은 MemberExpression(object.property) 형태라 no-restricted-globals가 아니라
  // no-restricted-properties로 잡아야 실제로 동작한다(no-restricted-globals는 프로퍼티 키가 아니라
  // 스코프상의 전역 식별자 참조만 검사하므로 Math.random()에는 반응하지 않는다).
  {
    files: ["src/lib/sim/**/*.ts", "src/lib/sim/**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message:
            "src/lib/sim/**는 결정론이 필요합니다. Math.random() 대신 src/lib/sim/rng/prng.ts의 시드 PRNG를 사용하세요 (NFR-DT-001).",
        },
        {
          object: "Date",
          property: "now",
          message:
            "src/lib/sim/**는 결정론이 필요합니다. Date.now() 사용을 금지합니다 (NFR-DT-001).",
        },
      ],
      // no-restricted-imports는 여기 두지 않는다 — 아래 Task 044 블록(files: src/**/*.ts(x))이
      // src/lib/sim/**에도 매칭되고 이 블록보다 뒤에 오는데, flat config는 같은 파일에 매칭되는
      // 여러 블록이 같은 규칙 키를 설정하면 병합하지 않고 나중 블록으로 전체 교체한다. 그래서
      // Task 044 블록보다 앞에서 no-restricted-imports를 설정하면 통째로 덮어써져 무력화된다
      // (25일차 034a 컴포넌트 가드레일 검증 중 같은 패턴의 결함을 발견해 여기도 같은 구조임을
      // 확인함). react/react-dom/@supabase/* 차단은 아래 Task 044 블록 뒤의 전용 블록으로 옮겼다.
    },
  },
  {
    // Task 044(22일차, 21일차 결함 A 재발 방지): 프로덕션 데이터 어댑터가 `src/lib/mock/**`를
    // 직접 import하면 그 모듈 그래프에 Mock 월드 생성기 스택 전체가 딸려 들어온다 — 21일차에
    // SupabaseDataSource.ts가 `@/lib/mock/fixtures/screens`를 import해 실제로 벌어졌던 결함
    // (docs/dailyWorkLog/21Day.md, 팀장이 `toScoutRating`/`toPublicProfile`을 Mock 비의존
    // `src/lib/data/player-profile.ts`로 추출시켜 해소). Mock↔실데이터 교체(Task 034)의
    // 전제가 "Mock을 걷어내도 프로덕션 어댑터가 안 깨진다"이므로 정적으로 고정한다.
    //
    // `src/lib/mock/**` 자신과, DataSource 계약상 Mock을 구현해야 하는 `src/lib/data/mock/**`
    // (MockDataSource.ts 등)만 예외다 — 그 외 어댑터(`src/lib/data/supabase/**` 등)·앱
    // 코드는 DataSource 인터페이스를 거쳐야지 Mock 픽스처를 직접 물면 안 된다. 테스트 파일은
    // 테스트 더블로 Mock 픽스처를 쓰는 것이 정당한 용도라 범위에서 뺀다.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/lib/mock/**",
      "src/lib/data/mock/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.type-test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/mock/*", "@/lib/mock/**"],
              message:
                "프로덕션 코드는 src/lib/mock/**를 직접 import할 수 없습니다 (21일차 결함 A). src/lib/data의 DataSource 어댑터를 거치세요.",
            },
          ],
        },
      ],
    },
  },
  {
    // NFR-DT-001(5일차) → 25일차(Task 034a) 재배치: src/lib/sim/**는 react 훅·Supabase 클라이언트에
    // 의존할 수 없는 순수 함수 도메인이다. Task 023(16일차)의 perf-bench.test.ts 런타임 정규식
    // 검사와 이중으로, 여기서는 정적으로 잡는다.
    //
    // 원래 이 규칙은 위 no-restricted-properties와 같은 블록(파일 앞쪽, 5일차)에 있었다. 바로
    // 위 Task 044 블록(files: src/**/*.ts(x))도 src/lib/sim/**에 매칭되고 이 규칙보다 뒤에
    // 있어, flat config의 "같은 규칙 키는 병합 없이 나중 블록으로 전체 교체" 동작 때문에
    // 통째로 덮어써져 있었다(react/react-dom/@supabase/* 차단이 무력화된 채 방치, mock 차단만
    // 살아있었음 — 25일차 034a 컴포넌트 가드레일 검증 중 같은 결함 패턴을 발견해 확인). 그래서
    // Task 044 블록보다 뒤로 옮기고 mock 차단 패턴도 병합했다.
    files: ["src/lib/sim/**/*.ts", "src/lib/sim/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message:
                "src/lib/sim/**는 순수 함수 도메인입니다. react를 import할 수 없습니다 (NFR-DT-001).",
            },
            {
              name: "react-dom",
              message:
                "src/lib/sim/**는 순수 함수 도메인입니다. react-dom을 import할 수 없습니다 (NFR-DT-001).",
            },
          ],
          patterns: [
            {
              group: ["@supabase/*"],
              message:
                "src/lib/sim/**는 순수 함수 도메인입니다. @supabase/*를 import할 수 없습니다 (NFR-DT-001).",
            },
            {
              group: ["@/lib/mock/*", "@/lib/mock/**"],
              message:
                "프로덕션 코드는 src/lib/mock/**를 직접 import할 수 없습니다 (21일차 결함 A). src/lib/data의 DataSource 어댑터를 거치세요.",
            },
          ],
        },
      ],
    },
  },
  {
    // Task 010(17일차) → 25일차(Task 034a) 재배치: src/components/**에서 Supabase 클라이언트를
    // 직접 import하는 것을 금지한다. Mock First Development 원칙상 컴포넌트는 src/lib/data의
    // DataSource 어댑터만 거쳐야 하며, Supabase 클라이언트를 직접 물면 Mock↔실 데이터 교체 시
    // 컴포넌트까지 고쳐야 한다.
    //
    // 원래 이 블록은 위 Task 044 블록보다 앞에 있었다. flat config는 같은 파일에 매칭되는 여러
    // 블록이 같은 규칙 키(no-restricted-imports)를 설정하면 병합하지 않고 나중 블록으로 전체
    // 교체한다 — 그래서 뒤에 오는 Task 044 블록(대상이 겹치는 src/**/*.tsx)이 이 규칙을 통째로
    // 덮어써 무력화시켰다(컴포넌트에 @supabase/* import를 넣어도 lint가 안 잡히는 채로 방치됨,
    // 25일차 034a 실증 중 발견). 그래서 이 블록을 파일 내 no-restricted-imports 설정 중 가장
    // 뒤로 옮기고, Task 044의 mock 차단 패턴도 함께 담아 컴포넌트에서는 두 보호가 모두 살도록
    // 병합했다. 다른 경로(src/lib/data/supabase/** 등)는 여전히 위 Task 044 블록만 적용된다.
    files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
    ignores: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/**/*.type-test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*"],
              message:
                "src/components/**에서 Supabase 클라이언트를 직접 import할 수 없습니다. src/lib/data의 DataSource 어댑터를 거치세요.",
            },
            {
              group: ["@/lib/mock/*", "@/lib/mock/**"],
              message:
                "프로덕션 코드는 src/lib/mock/**를 직접 import할 수 없습니다 (21일차 결함 A). src/lib/data의 DataSource 어댑터를 거치세요.",
            },
          ],
        },
      ],
    },
  },
  {
    // Task 010(18일차, D-18): JSX 텍스트 리터럴 하드코딩 경고 — src/i18n/t()(Task 011,
    // src/i18n/t.ts) 번역 키 경유를 강제하기 위한 선제 경고다. 아직 화면 본문은 4팀이
    // 28일차 이후 채우지만(CLAUDE.md), 헤더 골격(src/app/[lang]/layout.tsx, 12일차)처럼
    // 지금도 JSX에 한글/영문 리터럴을 직접 박아 넣는 코드가 있어 규칙을 선제적으로 켠다.
    //
    // 감지 대상: (1) JSX 자식 텍스트 노드, (2) `{"문자열"}`처럼 JSX 자식 위치에 직접 박은
    // 문자열 리터럴. 속성값(`title="..."` 등)은 범위 밖 — D-18 표현이 "JSX 텍스트 리터럴"로
    // 자식 텍스트에 한정하며, 속성까지 넓히면 `data-testid`/`type` 같은 비UI 속성까지
    // 오탐한다. 한글(가-힣) 또는 영문자가 하나라도 포함된 경우만 잡는다 — 숫자·기호만
    // 있는 텍스트("·", "0", "-")는 번역 대상이 아니라 잡지 않는다(숫자 리터럴은 별도로
    // `scripts/check-literals.mjs`가 공통코드 대상만 좁혀서 검사한다, 이 규칙과 역할 분리).
    //
    // `src/i18n/**`는 예외 — 번역 카탈로그/Provider 자신은 텍스트의 출처이지 소비자가
    // 아니다(4팀이 18일차에 만드는 `t.ts`/`provider.tsx` 오탐 방지, 팀장 지시).
    files: ["src/**/*.tsx"],
    ignores: ["src/i18n/**", "src/**/*.test.tsx", "src/**/*.type-test.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXText[value=/[A-Za-z가-힣]/]",
          message:
            "하드코딩된 UI 텍스트입니다 (D-18). src/i18n/t() 번역 키를 경유하세요 — src/i18n/keys.ts 네이밍 규약 참고.",
        },
        {
          selector: "JSXElement > JSXExpressionContainer > Literal[value=/[A-Za-z가-힣]/]",
          message:
            "하드코딩된 UI 텍스트입니다 (D-18). src/i18n/t() 번역 키를 경유하세요 — src/i18n/keys.ts 네이밍 규약 참고.",
        },
        {
          selector: "JSXFragment > JSXExpressionContainer > Literal[value=/[A-Za-z가-힣]/]",
          message:
            "하드코딩된 UI 텍스트입니다 (D-18). src/i18n/t() 번역 키를 경유하세요 — src/i18n/keys.ts 네이밍 규약 참고.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // vitest coverage 리포트 산출물 (Task 008, 13일차 `test:coverage` 스크립트 신설로 발생)
    "coverage/**",
    // WSL에서 Turbopack이 Windows 절대경로를 그대로 디렉터리명으로 만든 스트레이 아티팩트 (I-62).
    // 디렉터리명 자체가 "E:\claudeStudy\workspaces\football4"라는 리터럴 문자열이라
    // 백슬래시를 이스케이프할 필요 없이 "E:*" 와일드카드로 그 안의 모든 파일을 제외한다.
    "E:*/**",
  ]),
]);

export default eslintConfig;
