import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
      // NFR-DT-001: src/lib/sim/**는 react 훅·Supabase 클라이언트에 의존할 수 없는 순수 함수 도메인이다.
      // Task 023(16일차)의 perf-bench.test.ts 런타임 정규식 검사와 이중으로, 여기서는 정적으로 잡는다.
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
          ],
        },
      ],
    },
  },
  {
    // Task 010(17일차): src/components/**에서 Supabase 클라이언트를 직접 import하는 것을 금지한다.
    // Mock First Development 원칙상 컴포넌트는 src/lib/data의 DataSource 어댑터만 거쳐야 하며,
    // Supabase 클라이언트를 직접 물면 Mock↔실 데이터 교체 시 컴포넌트까지 고쳐야 한다.
    // src/components/**는 4팀이 23일차 이후 만들 예정이라 아직 없지만, 규칙은 선제적으로 넣어둔다.
    files: ["src/components/**/*.ts", "src/components/**/*.tsx"],
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
