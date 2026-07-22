/**
 * RLS 정책 SQL 파서 — 59일차(Task 038 "정책 테스트 스위트")를 위한 순수 유틸리티.
 *
 * `docs/db/schema-design.md` §6.3.1이 "액터 6종(게스트/배터/운영자/엔진/배당산출기/정산기)
 * 세분화 정책"을 56~59일차 Task 038로 예고해 뒀고, 실제 세분화 SQL은 마이그레이션
 * 파일 자체(51~58일차, `auth_profile_wallet_provisioning.sql`/`wallet_transaction_table.sql`/
 * `club_owner.sql`/`bet_tables.sql`/`audit_append_only.sql`)에 **이미 단일 소스로
 * 존재**한다 — 이 파일은 그 SQL 텍스트를 직접 파싱해 하드코딩 사본 없이 실제 배포될
 * 정책을 검증한다(`src/lib/a11y/contrast.test.ts`가 `globals.css`를 직접 파싱하는 것과
 * 동일한 이유 — 사본은 반드시 표류한다).
 *
 * ⚠️ 범위: Group A(공개 읽기 34개)·Group C(`match_event`)는 18일차(Task 032)에 원격
 * 적용됐지만 그 SQL 자체가 로컬 파일에 없다(I-263 — "마이그레이션 로컬 미문서·채번
 * 불일치", 034b 전 해소 예정, 6팀 기존 인지 이슈). 이 파일은 그 두 그룹을 재구성하지
 * 않는다 — 로컬 SQL이 없는 걸 파싱할 수는 없고, I-263 해소는 오늘 스코프 밖이다.
 * 대신 오늘 실제로 작업 대상인 **Task 038 액터 세분화 시리즈**(Group B의 append-only
 * 2종 + Group D 전량 8개, 총 11개 테이블 — "게스트/배터/운영자" 축이 실제로 갈리는
 * 테이블 전부)를 다룬다.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type PolicyCommand = "ALL" | "SELECT" | "INSERT" | "UPDATE" | "DELETE";

export interface ParsedPolicy {
  readonly name: string;
  readonly table: string;
  readonly command: PolicyCommand;
  readonly using: string | null;
  readonly withCheck: string | null;
}

/** 조건절 하나를 실제 RLS 평가 의미로 분류한다. */
export type ConditionClass = "public" | "service_role_only" | "own_row" | "unknown";

/** `startFrom` 이후 첫 `(`부터 괄호 깊이를 세어 짝이 맞는 `)`까지 잘라낸다(중첩 EXISTS
 * 서브쿼리 대응 — 단순 non-greedy 정규식으로는 중첩 괄호를 못 다룬다). */
function extractParenGroup(text: string, startFrom: number): string | null {
  const start = text.indexOf("(", startFrom);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") {
      depth--;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return null;
}

const POLICY_START_RE =
  /CREATE POLICY\s+(\w+)\s+ON\s+(?:public\.)?(\w+)\s+FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)/g;

/** SQL 전문에서 `CREATE POLICY` 문 전건을 뽑는다. 각 문은 세미콜론으로 끝난다는
 * 프로젝트 전역 SQL 스타일(전 마이그레이션 파일 공통, 문자열 리터럴 안에 `;`가
 * 오는 경우 없음)에 기대어 문 경계를 찾는다. */
export function parsePolicies(sql: string): readonly ParsedPolicy[] {
  const policies: ParsedPolicy[] = [];
  for (const match of sql.matchAll(POLICY_START_RE)) {
    const [full, name, table, command] = match;
    const bodyStart = (match.index ?? 0) + full.length;
    const stmtEnd = sql.indexOf(";", bodyStart);
    const body = stmtEnd === -1 ? sql.slice(bodyStart) : sql.slice(bodyStart, stmtEnd);

    const usingKeywordIdx = body.search(/USING\s*\(/);
    const withCheckKeywordIdx = body.search(/WITH CHECK\s*\(/);

    const using = usingKeywordIdx === -1 ? null : extractParenGroup(body, usingKeywordIdx)?.trim() ?? null;
    const withCheck =
      withCheckKeywordIdx === -1 ? null : extractParenGroup(body, withCheckKeywordIdx)?.trim() ?? null;

    policies.push({ name, table, command: command as PolicyCommand, using, withCheck });
  }
  return policies;
}

/** 테이블별 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 존재 여부. */
export function parseRlsEnabledTables(sql: string): ReadonlySet<string> {
  const RE = /ALTER TABLE\s+(?:public\.)?(\w+)\s+ENABLE ROW LEVEL SECURITY/g;
  const tables = new Set<string>();
  for (const match of sql.matchAll(RE)) {
    tables.add(match[1]);
  }
  return tables;
}

/** `reject_update_delete()` append-only 트리거가 걸린 테이블(역할·RLS 우회와 무관하게
 * UPDATE/DELETE를 차단 — service_role도 예외 없음). */
export function parseAppendOnlyTriggerTables(sql: string): ReadonlySet<string> {
  const RE =
    /CREATE TRIGGER\s+\w+\s+BEFORE\s+UPDATE OR DELETE\s+ON\s+(?:public\.)?(\w+)[\s\S]*?EXECUTE FUNCTION\s+public\.reject_update_delete/g;
  const tables = new Set<string>();
  for (const match of sql.matchAll(RE)) {
    tables.add(match[1]);
  }
  return tables;
}

/** USING/WITH CHECK 조건 텍스트를 실제 평가 의미로 분류. 정책이 `USING`만 있고
 * `WITH CHECK`가 없는 SELECT/DELETE 계열은 `using`을, INSERT처럼 `WITH CHECK`만
 * 있는 계열은 `withCheck`를 넣어 호출한다. */
export function classifyCondition(condition: string | null): ConditionClass {
  if (condition === null) return "unknown";
  const normalized = condition.replace(/\s+/g, " ").trim();
  if (normalized === "true") return "public";
  // 이 프로젝트는 RLS initplan 최적화로 `auth.uid()`/`auth.role()`를
  // `(SELECT auth.uid())`처럼 감싸 쓴다(20260720084831_fix_rls_initplan_standalone_policies
  // 선례) — 그래서 함수 호출 직후 선택적 `)`(SELECT 래퍼의 닫는 괄호)를 허용한다.
  if (/auth\.role\(\)\)?\s*=\s*'service_role'/.test(normalized)) return "service_role_only";
  if (/auth\.uid\(\)\)?\s*=\s*(user_id|id)\b/.test(normalized)) return "own_row";
  // bet_leg 패턴 — user_id 컬럼이 없는 복합키 테이블이라 소유 bet을 EXISTS 서브쿼리로
  // 간접 판정한다(57일차 bet_tables.sql 주석). auth.uid()가 조건 안에 있고 EXISTS로
  // 소유권을 위임하는 형태면 여전히 "본인 행만"이라는 의미이므로 own_row로 분류한다.
  if (/^EXISTS/.test(normalized) && /auth\.uid\(\)/.test(normalized)) return "own_row";
  return "unknown";
}

export type Actor = "anon" | "authenticated_non_owner" | "authenticated_owner" | "service_role";

/** 하나의 (조건 분류) 정책이 주어진 액터에게 "이 정책으로 통과 가능"인지. RLS는
 * 허용 정책들을 OR로 묶으므로, 테이블 하나의 특정 오퍼레이션에 대해 이 함수가 어느
 * 하나라도 true를 반환하면 그 액터는 허용된다(권한 상승 없음 — profile.role은 이
 * 마이그레이션 세트의 어떤 정책 조건에도 등장하지 않는다, 아래 own_row/public/
 * service_role_only 세 갈래가 전부). */
export function conditionAllowsActor(cls: ConditionClass, actor: Actor): boolean {
  switch (cls) {
    case "public":
      return true; // 공개 정책은 전 액터에 허용
    case "own_row":
      return actor === "authenticated_owner";
    case "service_role_only":
      return actor === "service_role";
    case "unknown":
      return false;
  }
}

export function policiesForCommand(
  policies: readonly ParsedPolicy[],
  table: string,
  command: Exclude<PolicyCommand, "ALL">,
): readonly ParsedPolicy[] {
  return policies.filter((p) => p.table === table && (p.command === command || p.command === "ALL"));
}

/** RLS 정책만 놓고 본 판정(= PostgREST/REST 경유 anon·authenticated 요청 기준).
 * service_role은 이 함수가 다루는 "정책 존재 여부"와 무관하게 Postgres RLS 자체를
 * 우회한다(`docs/db/schema-design.md` 1211~1213행) — 그래서 `service_role`은 항상
 * `true`를 반환하고, 실제 차단은 트리거(별도 `parseAppendOnlyTriggerTables`)로만
 * 표현된다. 이 구분을 테스트가 명시적으로 검증한다. */
export function isAllowedByPolicy(
  policies: readonly ParsedPolicy[],
  table: string,
  command: Exclude<PolicyCommand, "ALL">,
  actor: Actor,
): boolean {
  if (actor === "service_role") return true; // RLS 자체를 우회(위 주석 참조)

  const relevant = policiesForCommand(policies, table, command);
  return relevant.some((p) => {
    const conditionText = command === "INSERT" ? p.withCheck : p.using ?? p.withCheck;
    return conditionAllowsActor(classifyCondition(conditionText), actor);
  });
}

/** RLS 정책 + append-only 트리거를 합쳐 본 최종(실효) 판정. */
export function isEffectivelyAllowed(
  policies: readonly ParsedPolicy[],
  appendOnlyTriggerTables: ReadonlySet<string>,
  table: string,
  command: Exclude<PolicyCommand, "ALL">,
  actor: Actor,
): boolean {
  if ((command === "UPDATE" || command === "DELETE") && appendOnlyTriggerTables.has(table)) {
    // 트리거는 역할과 무관하게 차단한다 — service_role의 RLS 우회도 무력화됨
    // (docs/db/schema-design.md 1211~1213행 근거, audit_append_only.sql 상단 주석 동일).
    return false;
  }
  return isAllowedByPolicy(policies, table, command, actor);
}

export function readMigrationFile(relativePath: string): string {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}
