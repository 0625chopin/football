#!/usr/bin/env node
/**
 * `tsc --noEmit` 게이트의 dev 서버 경합 완화 — I-181(35일차, 1팀).
 *
 * ## 배경
 * `tsconfig.json`의 `include`에는 `.next/types/**`와 `.next/dev/types/**`가 **둘 다** 들어있다.
 * 이건 우리가 잘못 넣은 게 아니라 **Next.js 16 자신이 의도적으로 그렇게 관리한다** —
 * `node_modules/next/dist/lib/typescript/type-paths.js`의 `getTypeDefinitionGlobPatterns()`
 * 주석: "Include both .next/types and .next/dev/types to avoid tsconfig churn when switching
 * between dev/build modes." `writeConfigurationDefaults.js`가 `next dev`/`next build` 실행마다
 * 이 두 패턴이 `tsconfig.json`에 없으면 **자동으로 다시 채워 넣는다** — 그래서 `tsconfig.json`에서
 * `.next/dev/types/**`를 지워도 다음 `next dev` 실행 때 조용히 되살아난다(durable fix 아님).
 *
 * 문제는 `.next/dev/types/**`가 **dev 서버가 라우트를 방문할 때마다 다시 쓰는 휘발성 산출물**
 * 이라는 점이다. WSL `/mnt` 드라이브 마운트(I-62, DrvFs/9P 파일 연산 제약과 같은 계열)에서는
 * 이 재작성이 원자적이지 않아, dev 서버가 파일을 쓰는 도중에 `tsc`가 그 파일을 읽으면
 * `TS1005`/`TS1002`/`TS1128` 같은 구문 오류가 무작위로 난다(I-181, 팀장·4팀 각자 재현).
 *
 * ## 이 스크립트가 하는 것 — 그 이상은 하지 않는다
 * `tsc --noEmit`을 그대로 실행하고, **오류가 전부 `.next/` 아래 파일에서만 났을 때만** 짧게
 * 기다렸다 재시도한다(최대 `MAX_ATTEMPTS`회). `src/**` 등 실제 소스에 오류가 하나라도 섞이면
 * **재시도 없이 즉시 그대로 실패시킨다** — 진짜 회귀를 재시도로 가리는 일이 없도록 하기 위함.
 * 재시도를 다 써도 `.next/`발 오류가 남으면(일시적 경합이 아닐 수 있음) 있는 그대로 실패 보고한다
 * — 조용히 넘기지 않는다.
 *
 * `.next/**`를 아예 typecheck 대상에서 빼는 방식(vitest typecheck의 `tsconfig.typecheck.json`,
 * I-180)은 여기서는 못 쓴다 — 이 게이트는 `PageProps`/`LayoutProps` 등 Next 라우트 타입
 * 검증까지 포함하는 게 원래 목적이라, 빼면 커버리지가 실제로 줄어든다(I-180과 다른 지점).
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TSC_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsc');
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const DIAGNOSTIC_RE = /^(.+?)\(\d+,\d+\): error TS\d+:/gm;

function runTsc() {
  return spawnSync(TSC_BIN, ['--noEmit', '--pretty', 'false'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

function extractErrorFiles(output) {
  const files = new Set();
  for (const match of output.matchAll(DIAGNOSTIC_RE)) {
    files.add(match[1].split(path.sep).join('/'));
  }
  return files;
}

function isOnlyNextArtifactErrors(files) {
  return files.size > 0 && [...files].every((f) => f.startsWith('.next/'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let last = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = runTsc();
    last = result;
    if (result.status === 0) {
      process.stdout.write(result.stdout);
      return;
    }
    const errorFiles = extractErrorFiles(`${result.stdout}\n${result.stderr}`);
    if (!isOnlyNextArtifactErrors(errorFiles)) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      process.exitCode = result.status ?? 1;
      return;
    }
    if (attempt < MAX_ATTEMPTS) {
      console.warn(
        `[typecheck] .next/** 휘발성 산출물에서만 오류 발견(dev 서버 재생성 중 torn read 의심, I-181) — ` +
          `${RETRY_DELAY_MS}ms 후 재시도 (${attempt}/${MAX_ATTEMPTS})`,
      );
      await sleep(RETRY_DELAY_MS);
    }
  }
  console.error(
    `[typecheck] ${MAX_ATTEMPTS}회 재시도 후에도 .next/** 관련 오류가 지속됩니다 — ` +
      `일시적 경합이 아닐 수 있으니 확인하세요(I-181).`,
  );
  process.stdout.write(last.stdout);
  process.stderr.write(last.stderr);
  process.exitCode = last.status ?? 1;
}

main();
