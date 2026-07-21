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
 *
 * ## 35일차 갱신 — I-172 해소(식별자명 관련성 필터)
 * 값만으로 일치를 판정하면 순수 우연(예: `postmatch/pipeline.ts`의 재시도 횟수
 * `DEFAULT_MAX_ATTEMPTS = 3`이 `CRON_PARAM.RETRY_MAX = 3`과 숫자만 겹침)까지 전량
 * 보고되어 신호 대비 잡음이 과도했다(34일차 2팀 자진 보고, 팀장 동의). `collectProtectedNumbers`가
 * 이제 각 보호 숫자를 **그 숫자가 나온 최상위 그룹명**과 함께 기록하고, `findResidualLiterals`는
 * 매치된 줄의 식별자 토큰이 그 그룹명 토큰과 하나라도 겹칠 때만 보고한다(예: `GK_CROSS_
 * POSITION_MODIFIER_DEFAULT`는 `POSITION_PROFICIENCY_MULT` 그룹의 `position` 토큰과 겹쳐
 * 그대로 보고되지만, `DEFAULT_MAX_ATTEMPTS`는 어떤 그룹명과도 겹치지 않아 걸러진다).
 * `PARAM`/`MULT`/`MIN`/`MAX` 등 그룹명에 범용적으로 붙는 접미사(`GENERIC_NAME_TOKENS`)는
 * 토큰에서 제외한다 — 안 그러면 거의 모든 그룹이 겹쳐 필터가 무의미해진다.
 *
 * **무조건 경고를 줄이는 것이 목적이 아니다** — 그룹명 단위(개별 키 단위가 아님)로만
 * 관련성을 요구해 보수적으로 좁혔고, 그룹명과 식별자명이 다른 어휘를 쓰는 실제 중복(예:
 * "강퇴"를 `dismissal`로 부르는 코드와 그룹명 `CARD_PARAM.RED_MAX`)은 이 필터로도 못
 * 잡을 수 있다 — 그런 위음성 사례가 쌓이면 그때 조건을 더 넓힌다(팀장 지침 "오탐 사례를
 * 축적해 조건을 좁히는 방향").
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

// 공통코드 그룹명에 구조적으로 반복되는 접미사·범용어(I-172) — 토큰 비교에서 제외하지
// 않으면 대부분의 그룹이 서로 겹쳐 식별자 관련성 필터가 무력화된다.
const GENERIC_NAME_TOKENS = new Set([
  "param",
  "mult",
  "min",
  "max",
  "default",
  "base",
  "value",
  "pct",
  "step",
  "range",
  "factor",
  "cap",
  "ratio",
  "count",
  "limit",
  "rate",
]);

/** 식별자를 스네이크/카멜 구분 없이 소문자 토큰으로 쪼갠다(길이 3 미만·범용어는 제외). */
function tokenize(identifier) {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 3 && !GENERIC_NAME_TOKENS.has(t));
}

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

const NUMBER_RE = /(?<![\w.])-?\d+(?:\.\d+)?(?!\w)/g;

/**
 * `SAFE_DEFAULT_VALUES` 객체를 최상위 그룹(`GROUP_NAME: { ... }`) 단위로 쪼갠다. 이 파일이
 * `Record<CommonCodeGroupCode, ...>` 형태(1단계 그룹 키 → 값 객체)로만 구성된다는 전제에
 * 기대므로(90행 타입 주석 참조), 중첩 깊이만 추적하면 각 그룹의 소스 구간을 정확히 자를 수
 * 있다. `objectSource`는 이미 `stripCommentsAndStrings`를 거친 문자열이어야 한다.
 */
function splitTopLevelGroups(objectSource) {
  const groups = [];
  const n = objectSource.length - 1; // 마지막 '}' 제외
  let i = 1; // 첫 '{' 건너뜀
  while (i < n) {
    while (i < n && /[\s,]/.test(objectSource[i])) i++;
    if (i >= n) break;
    const keyMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(objectSource.slice(i, n));
    if (keyMatch === null) {
      i++;
      continue;
    }
    const groupName = keyMatch[0];
    i += groupName.length;
    while (i < n && /\s/.test(objectSource[i])) i++;
    if (objectSource[i] !== ":") continue; // 그룹 키는 항상 `:`로 이어진다(방어적 스킵)
    i++;
    while (i < n && /\s/.test(objectSource[i])) i++;
    if (objectSource[i] !== "{") {
      // 그룹 값은 항상 객체다(90행 타입 주석) — 예상 밖 형태면 다음 콤마까지 건너뛴다.
      while (i < n && objectSource[i] !== ",") i++;
      continue;
    }
    const start = i;
    let depth = 0;
    for (; i < n; i++) {
      if (objectSource[i] === "{") depth++;
      else if (objectSource[i] === "}") {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    groups.push({ name: groupName, body: objectSource.slice(start, i) });
  }
  return groups;
}

/**
 * 보호 숫자마다 "이 값이 어느 그룹에서 나왔는가"의 식별자 토큰 집합을 함께 기록한다
 * (I-172, 위 파일 헤더 "35일차 갱신" 절). 한 값이 여러 그룹에 우연히 겹치면(예: `3`은
 * 6개 그룹에 등장) 그 그룹들의 토큰을 합집합으로 둔다 — 어느 한 그룹과만 관련 있어도
 * 리뷰 후보로 남긴다.
 */
function collectProtectedNumbers(objectSource) {
  const withoutComments = stripCommentsAndStrings(objectSource);
  const groups = splitTopLevelGroups(withoutComments);
  const contexts = new Map();
  for (const group of groups) {
    const groupTokens = tokenize(group.name);
    for (const [text] of group.body.matchAll(NUMBER_RE)) {
      const n = Number(text);
      if (TRIVIAL_VALUES.has(n) || GENERIC_ALLOWLIST.has(n)) continue;
      const existing = contexts.get(n);
      if (existing === undefined) {
        contexts.set(n, new Set(groupTokens));
      } else {
        for (const t of groupTokens) existing.add(t);
      }
    }
  }
  return contexts;
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

const IDENTIFIER_RE = /[A-Za-z_][A-Za-z0-9_]*/g;

/** 한 줄의 모든 식별자를 토큰화해 합집합으로 모은다(선언 대상뿐 아니라 줄 전체를 본다 —
 * `input.condition * 0.7`처럼 리터럴과 같은 줄에 있는 참조도 관련성 신호로 유효하다). */
function lineTokens(line) {
  const tokens = new Set();
  for (const [identifier] of line.matchAll(IDENTIFIER_RE)) {
    for (const t of tokenize(identifier)) tokens.add(t);
  }
  return tokens;
}

function hasOverlap(a, b) {
  for (const t of a) {
    if (b.has(t)) return true;
  }
  return false;
}

function findResidualLiterals(file, protectedNumberContexts) {
  const source = readFileSync(file, "utf8");
  const cleaned = stripCommentsAndStrings(source);
  const lines = cleaned.split("\n");
  const findings = [];
  lines.forEach((line, idx) => {
    for (const [text] of line.matchAll(NUMBER_RE)) {
      const n = Number(text);
      const groupTokens = protectedNumberContexts.get(n);
      if (groupTokens === undefined) continue;
      if (!hasOverlap(groupTokens, lineTokens(line))) continue;
      findings.push({ line: idx + 1, value: n, text: line.trim() });
    }
  });
  return findings;
}

function main() {
  const fallbackSource = readFileSync(FALLBACK_FILE, "utf8");
  const objectSource = extractSafeDefaultValuesSource(fallbackSource);
  const protectedNumberContexts = collectProtectedNumbers(objectSource);

  const files = [];
  for (const root of SCAN_ROOTS) {
    walk(join(ROOT, root), files);
  }

  let totalFindings = 0;
  for (const file of files) {
    const findings = findResidualLiterals(file, protectedNumberContexts);
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
