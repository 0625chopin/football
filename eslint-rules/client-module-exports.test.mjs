/**
 * `client-module-exports` 룰 자체의 회귀 테스트 (44일차, I-222)
 *
 * 이 룰은 "세 번 재발한 함정을 네 번째부터 기계적으로 막는다"가 존재 이유라, 룰이 조용히
 * 무력화되면 원래 상태로 되돌아간다. 실제로 최초 작성 때 PascalCase 판정을 `^[A-Z]`로 두는
 * 바람에 `FOUR_STATE_COMPONENT_KEYS`(SCREAMING_SNAKE)가 통과했고, 실측으로만 발견했다 —
 * 그 케이스를 아래 invalid에 고정해 둔다.
 */
import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { describe, it } from 'vitest';

import { clientModuleExportsRule } from './client-module-exports.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('local-rsc/client-module-exports', () => {
  it('컴포넌트·훅·타입만 통과시키고 순수 값 export를 막는다', () => {
    ruleTester.run('client-module-exports', clientModuleExportsRule, {
      valid: [
        // 지시자가 없는 파일은 이 룰의 대상이 아니다 — 무엇을 export하든 자유롭다.
        { code: "export const resolvePollIntervalMs = () => 5000;" },
        { code: "export const SAFE_DEFAULTS = [1, 2];" },
        // 컴포넌트 / 훅
        { code: "'use client';\nexport function MatchCard() { return null; }" },
        { code: "'use client';\nexport const LiveMatchGrid = () => null;" },
        { code: "'use client';\nexport function usePolling() {}" },
        { code: "'use client';\nexport { Tabs, TabsList };" },
        { code: "'use client';\nexport default function Page() { return null; }" },
        // 타입은 컴파일 시점에 소거되므로 허용
        { code: "'use client';\nexport type PollMode = 'default' | 'live';" },
        { code: "'use client';\nexport interface PollingOptions { mode: string }" },
        { code: "'use client';\nexport type { PollMode };" },
      ],
      invalid: [
        // 44일차 I-222의 원인 그 자체
        {
          code: "'use client';\nexport function resolvePollIntervalMs() { return 5000; }",
          errors: [{ messageId: 'nonComponentExport' }],
        },
        // 38일차 `/sample` 배지 0/16 회귀의 원인 — `^[A-Z]`만 보면 놓친다
        {
          code: "'use client';\nexport const FOUR_STATE_COMPONENT_KEYS = ['MatchCard'];",
          errors: [{ messageId: 'nonComponentExport' }],
        },
        // cva 변형 등 camelCase 유틸
        {
          code: "'use client';\nexport const tabsListVariants = cva('');",
          errors: [{ messageId: 'nonComponentExport' }],
        },
        // 11일차 I-74의 원인
        {
          code: "'use client';\nexport { fetchResult, fetchListResult };",
          errors: [{ messageId: 'nonComponentExport' }, { messageId: 'nonComponentExport' }],
        },
        // 무엇이 나가는지 정적으로 알 수 없는 형태
        {
          code: "'use client';\nexport * from './utils';",
          errors: [{ messageId: 'wildcardExport' }],
        },
        // 지시자 앞에 다른 지시자가 있어도 판정된다('use strict' 등)
        {
          code: "'use strict';\n'use client';\nexport const helper = () => 1;",
          errors: [{ messageId: 'nonComponentExport' }],
        },
      ],
    });
  });
});
