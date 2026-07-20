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
