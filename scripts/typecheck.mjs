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
 *
 * ## I-242 — torn WRITE(구문 오류)는 torn READ와 증상이 다르다
 * 위 재시도 로직은 "`.next/`발 오류뿐이면 일시적 경합"이라는 I-181의 전제(torn READ, 다음
 * 시도면 self-heal) 위에 있다. 그런데 48일차에 `.next/dev/types/routes.d.ts`가 **96줄에서
 * 잘린 채로 굳는(torn WRITE)** 사례가 나왔다 — 이 파일은 사라지지 않고 그 자리에 남고,
 * 그 안의 **구문 오류(TS1xxx)** 하나가 tsc로 하여금 **나머지 전 파일의 semantic 진단을
 * 건너뛰게 만든다.** 그 결과 게이트 출력엔 `.next/` 오류만 찍히고 `src/**`는 "오류 0건"이
 * 아니라 "**검사 자체를 안 한 것**"인데, 위 재시도 로직은 이 둘을 구분하지 못하고 똑같이
 * "재시도해도 그대로면 확인하라"로 끝냈다 — 메시지가 `.next/` 문제로만 읽혀 무시하기 쉬웠다.
 *
 * 그래서 `.next/`발 오류 중 **구문 오류(TS1xxx)**가 섞여 있으면 별도 경로를 탄다:
 * ① semantic 진단이 가려졌을 수 있다는 경고를 **그 즉시** 명시적으로 찍는다(조용히 재시도만
 * 하지 않는다). ② 그 손상 파일을 **지운다**(방치하면 dev 서버가 그 라우트를 다시 방문할
 * 때까지 계속 이 상태로 굳어 있는다). ③ 단, **이 실행 안에서 곧바로 재시도하지는 않는다**
 * — 처음엔 "지우고 바로 재시도하면 dev 서버 재생성을 기다리지 않고 `src/**` 실제 상태를
 * 드러낼 수 있다"고 시도했으나, **실측 결과 그 직후 재검사는 그 파일이 제공하던
 * `PageProps`/`LayoutProps` 등 전역 타입이 아직 없어 전혀 무관한 파일까지 `TS2304`/`TS2740`류
 * 오탐이 번지는 것으로 확인됐다**(48일차 유사 케이스 재현 중 발견) — "가려짐"을 "허위 회귀
 * 다발"로 바꾸는 셈이라 오히려 더 나쁘다. 이 스크립트는 dev 서버 상태를 알 방법이 없어 "지금
 * 재생성됐는지"를 판단할 수 없으므로, 대신 **종료 코드 2**로 "src/** 확인 안 됨"을 "확인했고
 * 오류 있음"(1)·"확인했고 오류 없음"(0)과 분리해 보고하고, 사람이 라우트를 한 번 방문시키거나
 * `next build`로 재생성한 뒤 재실행하게 한다.
 *
 * CI는 영향 없다 — dev 서버가 없는 클린 체크아웃엔 `.next/dev/types/**` 자체가 생기지 않는다.
 *
 * ## I-254 — 두 산출물이 **동시에 존재**할 때의 stale 오탐 (49일차 마감 후 추가)
 * 위 두 절은 `.next/dev/types/**` **한쪽의 손상**만 다룬다. 그런데 `.next/types/**`와
 * `.next/dev/types/**`가 **둘 다 멀쩡히 존재하면서 내용이 다른** 경우가 따로 있다 —
 * `next build`가 쓴 `.next/types/`는 그대로 남아 있는데 그 뒤 dev 세션에서 **새 라우트를
 * 추가**하면 dev 서버는 `.next/dev/types/`만 갱신하기 때문이다. 두 `routes.d.ts`는 각각
 * 자기 `AppRoutes` 유니온을 선언하고 **같은 이름의 전역 `PageProps`/`LayoutProps`를
 * `declare global`로 병합**시키는데, 병합 결과의 제약(constraint)으로 어느 쪽 `AppRoutes`가
 * 채택될지는 우리가 통제하지 못한다. 실제로 오래된 쪽이 채택돼 **새 라우트 파일이
 * `TS2344: Type '"/[lang]/players"' does not satisfy the constraint 'AppRoutes'`로 실패**했다
 * (49일차 마감 후 `players/page.tsx` 신설 중 실측).
 *
 * 이 오탐은 위 두 완화책 어디에도 걸리지 않는다 — 오류 파일이 `.next/`가 아니라 `src/**`라
 * 재시도 대상이 아니고(그게 맞다, 진짜 회귀와 구분할 수 없으므로), 구문 오류도 아니다.
 * 그래서 **tsc를 돌리기 전에** 두 산출물의 신선도를 맞춘다: 둘 다 있으면 `routes.d.ts`의
 * mtime을 비교해 **오래된 쪽 디렉터리를 통째로 지운다**.
 *
 * - 왜 파일 하나가 아니라 디렉터리째인가: 같은 디렉터리의 `validator.ts`가 `./routes.js`를
 *   import하므로 `routes.d.ts`만 지우면 `TS2307`로 바뀔 뿐이다.
 * - 왜 I-242처럼 "지우고 종료"하지 않는가: 그 경우와 달리 **남는 쪽이 전역 타입 전량을
 *   그대로 제공**한다(두 파일의 전역 선언 구조가 동일하다). 지워도 `PageProps` 부재로
 *   오탐이 번지는 상황이 아니므로 같은 실행에서 계속 진행해도 안전하다.
 * - 왜 `tsconfig.json`의 `include`에서 한쪽을 빼지 않는가: Next.js가 매 `next dev`/`next build`
 *   마다 두 패턴을 다시 채워 넣는다(위 "배경" 절) — durable fix가 아니다.
 * - CI 영향 없음: 산출물이 하나뿐이면(또는 둘 다 없으면) 이 단계는 아무것도 하지 않는다.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));
const TSC_BIN = path.join(PROJECT_ROOT, 'node_modules', '.bin', 'tsc');
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 500;
const DIAGNOSTIC_RE = /^(.+?)\(\d+,\d+\): error (TS\d+):/gm;
/** TS1xxx = 구문(syntax) 오류. TypeScript는 구문 오류를 진단 코드 1xxx로 채번한다
 * (2xxx+는 타입 등 semantic 오류) — I-242가 지목한 "가리는" 오류가 바로 이 대역이다. */
const SYNTAX_ERROR_CODE_RE = /^TS1\d{3}$/;

function runTsc() {
  return spawnSync(TSC_BIN, ['--noEmit', '--pretty', 'false'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  });
}

function extractDiagnostics(output) {
  const diagnostics = [];
  for (const match of output.matchAll(DIAGNOSTIC_RE)) {
    diagnostics.push({ file: match[1].split(path.sep).join('/'), code: match[2] });
  }
  return diagnostics;
}

function isOnlyNextArtifactErrors(diagnostics) {
  return diagnostics.length > 0 && diagnostics.every((d) => d.file.startsWith('.next/'));
}

/** `.next/**`발 오류 중 구문 오류(TS1xxx)가 난 파일만 — 이 파일들이 나머지 전체의
 * semantic 진단을 가리는 원흉이다(I-242). 재시도 없이 곧장 지워서 다음 시도를 정상화한다. */
function nextSyntaxErrorFiles(diagnostics) {
  return [
    ...new Set(
      diagnostics
        .filter((d) => d.file.startsWith('.next/') && SYNTAX_ERROR_CODE_RE.test(d.code))
        .map((d) => d.file),
    ),
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 라우트 타입 산출물 2종. 둘 다 `tsconfig.json`의 `include`에 들어 있고(Next.js가 그렇게
 * 관리한다), 각자 `AppRoutes`와 전역 `PageProps`를 선언한다 — 내용이 어긋나면 오탐이 난다(I-254). */
const ROUTE_TYPE_DIRS = ['.next/types', '.next/dev/types'];

/**
 * tsc 실행 전에 라우트 타입 산출물의 신선도를 맞춘다(I-254). 둘 다 존재할 때만 동작하며,
 * `routes.d.ts`의 mtime이 오래된 쪽 디렉터리를 통째로 지운다 — 둘 다 gitignore 대상
 * 재생성 산출물이고, 남는 쪽이 전역 타입 전량을 그대로 제공하므로 이 실행을 계속해도 된다.
 */
function reconcileRouteTypeArtifacts() {
  const present = ROUTE_TYPE_DIRS.map((dir) => ({
    dir,
    routesFile: path.join(PROJECT_ROOT, dir, 'routes.d.ts'),
  })).filter((entry) => existsSync(entry.routesFile));

  if (present.length < 2) return;

  const [older, newer] = present
    .map((entry) => ({ ...entry, mtimeMs: statSync(entry.routesFile).mtimeMs }))
    .sort((a, b) => a.mtimeMs - b.mtimeMs);

  // 같은 시각이면 내용도 같다고 보고 건드리지 않는다(불필요한 삭제·재생성 회피).
  if (older.mtimeMs === newer.mtimeMs) return;

  try {
    rmSync(path.join(PROJECT_ROOT, older.dir), { recursive: true, force: true });
    console.warn(
      `[typecheck] 라우트 타입 산출물이 2종 공존해 오래된 쪽을 제거했습니다: ${older.dir} ` +
        `(최신: ${newer.dir}) — 두 산출물의 AppRoutes가 어긋나면 새 라우트가 TS2344로 ` +
        `오탐 실패합니다(I-254). 지워진 쪽은 다음 next dev/next build가 재생성합니다.`,
    );
  } catch (err) {
    console.warn(`[typecheck] 오래된 라우트 타입 산출물 제거 실패(${older.dir}): ${err.message}`);
  }
}

async function main() {
  reconcileRouteTypeArtifacts();

  let last = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = runTsc();
    last = result;
    if (result.status === 0) {
      process.stdout.write(result.stdout);
      return;
    }
    const diagnostics = extractDiagnostics(`${result.stdout}\n${result.stderr}`);
    if (!isOnlyNextArtifactErrors(diagnostics)) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      process.exitCode = result.status ?? 1;
      return;
    }

    const corruptFiles = nextSyntaxErrorFiles(diagnostics);
    if (corruptFiles.length > 0) {
      // 정리는 하되 이 실행 안에서 곧장 재검사하지 않는다 — 실측 결과, 삭제 직후 재시도는
      // 그 파일이 제공하던 PageProps/LayoutProps 등 전역 타입이 아직 없어 무관한 파일까지
      // TS2304/TS2740류 오탐이 번지는 것으로 확인됐다(48일차 유사 케이스 재현, I-242 조치
      // 중 발견). "가려짐"을 "허위 회귀 다발"로 바꾸는 셈이라, 재생성 여부를 확인할 수단이
      // 없는 이 스크립트가 그 판단까지 떠맡지 않는다 — 사람이 재생성시킨 뒤 재실행하게 한다.
      console.warn(
        `[typecheck] ⚠️ .next/** 파일에 구문 오류(TS1xxx)가 있습니다 — tsc가 이런 오류를 만나면 ` +
          `나머지 전체 파일(src/** 포함)의 semantic 진단을 건너뛸 수 있습니다(I-242). ` +
          `"src/** 오류 없음"은 이번 시도로 확인된 게 아닙니다.`,
      );
      for (const file of corruptFiles) {
        try {
          rmSync(path.join(PROJECT_ROOT, file), { force: true });
          console.warn(`[typecheck] 손상 파일 제거: ${file}`);
        } catch (err) {
          console.warn(`[typecheck] 손상 파일 제거 실패(${file}): ${err.message}`);
        }
      }
      console.error(
        `[typecheck] 손상 파일은 지웠지만 곧바로 재검사하지 않습니다 — 삭제 직후 재검사는 그 ` +
          `파일이 제공하던 전역 타입이 없어 무관한 파일까지 오탐이 번질 수 있음을 확인했습니다. ` +
          `dev 서버로 아무 라우트나 한 번 방문하거나(또는 \`next build\`) 재생성시킨 뒤 이 명령을 ` +
          `다시 실행하세요 — 그래야 이번 결과가 src/** 실제 상태를 신뢰성 있게 반영합니다.`,
      );
      process.exitCode = 2;
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
