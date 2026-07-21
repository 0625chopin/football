/**
 * ESLint 가드레일 회귀 테스트 — I-142(35일차, 1팀 해소).
 *
 * I-140에서 `eslint.config.mjs`의 `no-restricted-imports` 블록 2개가 3일간(22~25일차)
 * 조용히 무력화돼 있었는데(같은 규칙 키를 재선언하는 flat config 블록이 앞선 블록을
 * 병합 없이 통째로 교체) 아무도 몰랐던 이유가 "위반 파일을 임시로 만들어 lint를 돌려보고
 * 지우는" 수동 실증뿐이었기 때문이다(회귀 탐지 수단이 없었음). 이 파일이 그 회귀 탐지
 * 수단이다 — `eslint.config.mjs`의 가드레일마다 "위반 스니펫 → 에러/경고 발생"을 실제
 * ESLint 실행으로 단언한다. 6팀이 25일차에 `ESLint#lintText` + 가상 `filePath` 방식의
 * 기술적 실현성을 프로토타입으로 검증해 넘겼다(위반 스니펫 전건 CAUGHT 확인) — 이 파일은
 * 그 방식을 그대로 구현한 것이다.
 *
 * `eslint.config.mjs`는 flat config라 `filePath`가 실제로 그 경로에 존재할 필요는 없다 —
 * ESLint가 `files`/`ignores` 글롭을 `filePath` 문자열에만 매칭해 어느 블록의 규칙을
 * 적용할지 정하므로, 파일을 디스크에 만들지 않고도 각 블록을 개별적으로 가둬 테스트할 수
 * 있다. `cwd`를 프로젝트 루트로 고정해 글롭이 루트의 `eslint.config.mjs` 기준으로
 * 해석되게 한다.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd: PROJECT_ROOT });

async function lint(relativeFilePath: string, code: string) {
  const [result] = await eslint.lintText(code, {
    filePath: path.join(PROJECT_ROOT, relativeFilePath),
  });
  return result.messages;
}

describe('ESLint 가드레일 회귀(I-142)', () => {
  // `eslint.config.mjs`(next/core-web-vitals·next/typescript 프리셋 포함) 최초 로드가
  // 15초 이상 걸려 기본 5초 테스트 타임아웃을 넘긴다 — 첫 케이스에서만 워밍업해 두면
  // ESLint 인스턴스가 설정을 캐시해 이후 호출은 수백 ms대로 끝난다.
  beforeAll(async () => {
    await eslint.lintText('export const warmup = 1;\n', {
      filePath: path.join(PROJECT_ROOT, 'src/lint-guardrails-warmup-probe.ts'),
    });
  }, 30_000);

  it('H-06 — src/components/**의 Supabase 직접 import를 차단한다', async () => {
    const messages = await lint(
      'src/components/domain/Probe.tsx',
      "import { createClient } from '@supabase/supabase-js';\nexport const client = createClient;\n",
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }),
    );
  });

  it('H-06/Task 044 — src/components/**의 src/lib/mock/** 직접 import를 차단한다', async () => {
    const messages = await lint(
      'src/components/domain/Probe.tsx',
      "import { generateMockWorld } from '@/lib/mock/world';\nexport const w = generateMockWorld;\n",
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }),
    );
  });

  it('Task 044 — 프로덕션 어댑터(src/lib/data/supabase/**)의 src/lib/mock/** 직접 import를 차단한다', async () => {
    const messages = await lint(
      'src/lib/data/supabase/probe.ts',
      "import { generateMockWorld } from '@/lib/mock/world';\nexport const w = generateMockWorld;\n",
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }),
    );
  });

  it('NFR-DT-001 — src/lib/sim/**의 Math.random() 호출을 차단한다', async () => {
    const messages = await lint('src/lib/sim/probe.ts', 'export const r = Math.random();\n');
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-properties', severity: 2 }),
    );
  });

  it('NFR-DT-001 — src/lib/sim/**의 Date.now() 호출을 차단한다', async () => {
    const messages = await lint('src/lib/sim/probe.ts', 'export const n = Date.now();\n');
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-properties', severity: 2 }),
    );
  });

  it('NFR-DT-001 — src/lib/sim/**의 react import를 차단한다', async () => {
    const messages = await lint(
      'src/lib/sim/probe.ts',
      "import { useState } from 'react';\nexport const s = useState;\n",
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }),
    );
  });

  it('NFR-DT-001 — src/lib/sim/**의 @supabase/* import를 차단한다', async () => {
    const messages = await lint(
      'src/lib/sim/probe.ts',
      "import { createClient } from '@supabase/supabase-js';\nexport const c = createClient;\n",
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports', severity: 2 }),
    );
  });

  it('D-18 — JSX 자식 텍스트 하드코딩(한글/영문)을 경고한다', async () => {
    const messages = await lint(
      'src/components/domain/Probe.tsx',
      'export function Probe() {\n  return <div>안녕하세요</div>;\n}\n',
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-syntax', severity: 1 }),
    );
  });

  it('D-18 — JSX 자식 위치의 문자열 리터럴 표현식을 경고한다', async () => {
    const messages = await lint(
      'src/components/domain/Probe.tsx',
      'export function Probe() {\n  return <div>{"Hello"}</div>;\n}\n',
    );
    expect(messages).toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-syntax', severity: 1 }),
    );
  });

  it('src/i18n/**는 D-18 JSX 텍스트 경고에서 예외다(번역 카탈로그 자신, 팀장 지시)', async () => {
    const messages = await lint(
      'src/i18n/probe.tsx',
      'export function Probe() {\n  return <div>안녕하세요</div>;\n}\n',
    );
    expect(messages).not.toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-syntax' }),
    );
  });

  it('src/lib/data/mock/**는 Task 044 mock 차단에서 예외다(DataSource 계약상 Mock 구현체)', async () => {
    const messages = await lint(
      'src/lib/data/mock/probe.ts',
      "import { generateMockWorld } from '@/lib/mock/world';\nexport const w = generateMockWorld;\n",
    );
    expect(messages).not.toContainEqual(
      expect.objectContaining({ ruleId: 'no-restricted-imports' }),
    );
  });
});
