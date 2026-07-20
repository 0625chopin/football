#!/usr/bin/env node
/**
 * 공통코드 대상 숫자 리터럴 잔존 검사 — Task 010(18일차, D-18).
 *
 * `src/lib/config/fallback.ts`의 `SAFE_DEFAULT_VALUES`(37개 공통코드 그룹 안전 기본값)에
 * 등장하는 수치가 시뮬레이션 엔진 도메인 코드(`src/lib/sim/**`)에 리터럴로 재등장하면
 * "`loadConstants(group)` 대신 하드코딩" 후보로 보고한다
 * (NFR-CFG-001 "공통코드 대상 상수의 숫자 리터럴 잔존 0건").
 *
 * ## 스캔 범위를 `src/lib/sim/**`로 한정하는 이유
 * "도메인 값은 공통코드로만 취득한다"는 원칙(`prng.ts` 헤더 주석)이 적용되는 곳이
 * 시뮬레이션 엔진이다. `src/lib/mock/**`(더미 데이터 생성기)는 실측 근거 없는 난수
 * 범위(`roll(75, 90)` 등)를 의도적으로 정적 코드로 남긴 영역이라(`docs/dailyWorkLog/
 * 10Day.md` "밸런싱 리터럴 0건" 각주 — 공통코드 대상 아님) 스캔하면 숫자 우연 일치가
 * 압도적으로 많아 신호 대비 잡음이 감당 불가능한 수준이 된다(시험 스캔 결과 239건,
 * 전량 우연 일치 — mock 파일 자체를 이슈로 보고 대상에서 제외). `src/lib/data/**`도
 * 마찬가지로 타입 리터럴 유니온(`1 | 2 | 3 | 4 | 5`)·Supabase 생성 타입이라 대상이 아니다.
 *
 * `src/lib/sim/rng/**`는 예외다 — xoshiro/SplitMix PRNG 알고리즘 상수는 05문서 5.12.1절
 * 표에 없는 고정 스펙값이라 애초에 공통코드 대상이 아니며, 바뀌면 재현성(KPI-3)이
 * 깨진다(`docs/dailyWorkLog/1Day.md` 참조).
 *
 * `src/lib/config/**` 자신은 스캔하지 않는다 — `fallback.ts`/`catalog.ts`가 그 값들의
 * 단일 소스이므로 "잔존"이 아니라 정의 그 자체다.
 *
 * 이 스크립트는 오탐이 섞일 수 있는 휴리스틱 검사다(같은 정수가 우연히 일치하는 경우
 * 포함). 발견 = 확정 결함이 아니라 **1팀 리뷰 대상 후보**로 취급한다.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const FALLBACK_FILE = join(ROOT, "src/lib/config/fallback.ts");
const SCAN_ROOTS = ["src/lib/sim"];
const EXCLUDE_DIR_SEGMENTS = ["src/lib/sim/rng"];
const EXCLUDE_FILE_SUFFIXES = [".test.ts", ".type-test.ts", ".test.tsx"];

// 우연 일치가 흔한 값은 신호 대비 잡음이 너무 커서 제외한다:
// - 배열 길이·인덱스·부호로 흔히 쓰이는 값(TRIVIAL_VALUES)
// - 축구 규칙 자체가 고정하는 상수·범용 환산值라 공통코드 대상이 될 수 없는 값
//   (경기 시간 90/45/120분, 시간 환산 60, 백분율 분모 100 등 — GENERIC_ALLOWLIST)
const TRIVIAL_VALUES = new Set([-1, 0, 1, 2]);
const GENERIC_ALLOWLIST = new Set([45, 60, 90, 100, 120]);

function extractSafeDefaultValuesSource(source) {
  const marker = "export const SAFE_DEFAULT_VALUES";
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`${FALLBACK_FILE}에서 SAFE_DEFAULT_VALUES 선언을 찾을 수 없습니다.`);
  }
  // 선언부가 `SAFE_DEFAULT_VALUES: Readonly<{ ... }> = { ... }` 형태라 타입 주석에도
  // `{`가 나온다 — 값 리터럴의 여는 중괄호는 타입 주석 뒤의 `=` 다음에 있는 것이다.
  const equalsIndex = source.indexOf("=", start);
  const braceStart = source.indexOf("{", equalsIndex);
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(braceStart, i + 1);
      }
    }
  }
  throw new Error("SAFE_DEFAULT_VALUES 객체의 닫는 중괄호를 찾지 못했습니다.");
}

function collectProtectedNumbers(objectSource) {
  const withoutComments = stripCommentsAndStrings(objectSource);
  const matches = withoutComments.matchAll(/(?<![\w.])-?\d+(?:\.\d+)?(?!\w)/g);
  const values = new Set();
  for (const [text] of matches) {
    const n = Number(text);
    if (!TRIVIAL_VALUES.has(n) && !GENERIC_ALLOWLIST.has(n)) values.add(n);
  }
  return values;
}

function stripCommentsAndStrings(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");
}

function shouldExcludeDir(relPath) {
  return EXCLUDE_DIR_SEGMENTS.some(
    (seg) => relPath === seg || relPath.startsWith(seg + "/"),
  );
}

function shouldExcludeFile(relPath) {
  return EXCLUDE_FILE_SUFFIXES.some((suf) => relPath.endsWith(suf));
}

function walk(dir, out) {
  const relDir = relative(ROOT, dir).split("\\").join("/");
  if (shouldExcludeDir(relDir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full).split("\\").join("/");
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !shouldExcludeFile(rel)) {
      out.push(full);
    }
  }
}

function findResidualLiterals(file, protectedNumbers) {
  const source = readFileSync(file, "utf8");
  const cleaned = stripCommentsAndStrings(source);
  const lines = cleaned.split("\n");
  const findings = [];
  const numberRe = /(?<![\w.])-?\d+(?:\.\d+)?(?!\w)/g;
  lines.forEach((line, idx) => {
    for (const [text] of line.matchAll(numberRe)) {
      const n = Number(text);
      if (protectedNumbers.has(n)) {
        findings.push({ line: idx + 1, value: n, text: line.trim() });
      }
    }
  });
  return findings;
}

function main() {
  const fallbackSource = readFileSync(FALLBACK_FILE, "utf8");
  const objectSource = extractSafeDefaultValuesSource(fallbackSource);
  const protectedNumbers = collectProtectedNumbers(objectSource);

  const files = [];
  for (const root of SCAN_ROOTS) {
    walk(join(ROOT, root), files);
  }

  let totalFindings = 0;
  for (const file of files) {
    const findings = findResidualLiterals(file, protectedNumbers);
    if (findings.length === 0) continue;
    const relPath = relative(ROOT, file).split("\\").join("/");
    console.log(`\n${relPath}`);
    for (const f of findings) {
      console.log(`  L${f.line}: ${f.value}  ${f.text}`);
      totalFindings++;
    }
  }

  console.log(
    `\n검사 대상 ${files.length}개 파일, 공통코드 값 재등장 후보 ${totalFindings}건 ` +
      `(제외: ${EXCLUDE_DIR_SEGMENTS.join(", ")}).`,
  );
  console.log(
    "휴리스틱 검사이므로 각 항목은 1팀 리뷰 대상 후보다 — 우연 일치는 무시하고, " +
      "실제 하드코딩이면 loadConstants(group) 경유로 교체를 제안하세요.",
  );

  if (totalFindings > 0) {
    process.exitCode = 1;
  }
}

main();
