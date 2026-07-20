import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
