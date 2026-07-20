import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
