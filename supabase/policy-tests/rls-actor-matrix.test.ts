/**
 * 정책 테스트 스위트 — 59일차, Task 038 "액터별 허용·거부 케이스 전건".
 *
 * 대상: 51~58일차에 걸쳐 작성된 "RLS 액터 세분화" 마이그레이션 5개(§ parse-policies.ts
 * 헤더 참조) — profile/wallet/wallet_transaction/club_owner/bet_market/bet_selection/
 * odds/bet/bet_leg/audit_log/common_code_history, 총 11개 테이블. 이 세트가 게스트/
 * 배터/운영자 축이 실제로 갈리는 전부다(Group A 34개·`match_event`는 이진 판정만
 * 있어 세분화 대상이 아니고, 로컬 SQL도 없다 — I-263, parse-policies.ts 헤더 참조).
 *
 * 4액터로 축약해 검사한다 — `docs/db/schema-design.md` §6.3.0의 "액터 6종(게스트/배터/
 * 운영자/엔진/배당산출기/정산기)" 중 뒤 3종(엔진/배당산출기/정산기)은 Postgres 레벨에서
 * 전부 `service_role`이라 RLS 판정이 동일하고(`audit_log.actor_type` CHECK 제약으로
 * 애플리케이션 레벨에서만 구분됨, 이 파일의 범위 밖), "운영자"는 아래에서 별도로
 * 검증하듯 이 마이그레이션 세트 어디서도 `profile.role`을 참조하지 않아 RLS 레벨에서는
 * `authenticated`(배터)와 동일하게 취급된다(권한 상승 없음 — 운영자 권한은
 * `src/app/api/admin/auth.ts`의 `assertAdminSession()` 애플리케이션 레이어 전용).
 *   - anon                     → 게스트
 *   - authenticated_non_owner  → 배터(타인 행 조회 시도)
 *   - authenticated_owner      → 배터(본인 행) — 운영자도 RLS 레벨에서는 이 취급과 동일
 *   - service_role             → 엔진/배당산출기/정산기 통합(Postgres 역할 레벨 구분 없음)
 *
 * 원격 DB에 아직 적용되지 않은 정책(`bet_tables.sql`/`audit_append_only.sql` — I-269가
 * 막고 있음)도 포함한다 — "정책 테스트 전건 통과"는 실제 원격 왕복이 아니라 이
 * 세트가 배포됐을 때 성립해야 하는 계약을 지금 고정해 두는 회귀 가드다. 원격
 * 왕복 검증은 apply_migration 이후(I-269 해소 후)의 별도 작업이다.
 */

import { describe, expect, it } from "vitest";
import {
  type Actor,
  type PolicyCommand,
  isAllowedByPolicy,
  isEffectivelyAllowed,
  parseAppendOnlyTriggerTables,
  parsePolicies,
  parseRlsEnabledTables,
  readMigrationFile,
} from "./parse-policies";

const SQL = [
  "../migrations/20260721190748_auth_profile_wallet_provisioning.sql",
  "../migrations/20260722055531_wallet_transaction_table.sql",
  "../migrations/20260721161158_club_owner.sql",
  "../migrations/20260722070511_bet_tables.sql",
  "../migrations/20260722080000_audit_append_only.sql",
]
  .map(readMigrationFile)
  .join("\n");

const policies = parsePolicies(SQL);
const rlsEnabledTables = parseRlsEnabledTables(SQL);
const appendOnlyTriggerTables = parseAppendOnlyTriggerTables(SQL);

const ACTORS: readonly Actor[] = ["anon", "authenticated_non_owner", "authenticated_owner", "service_role"];
const COMMANDS: readonly Exclude<PolicyCommand, "ALL">[] = ["SELECT", "INSERT", "UPDATE", "DELETE"];

type Profile = "PUBLIC_READ_SERVICE_WRITE" | "OWN_ROW" | "SERVICE_ONLY_APPEND_ONLY";

const TABLE_PROFILE: Record<string, Profile> = {
  club_owner: "PUBLIC_READ_SERVICE_WRITE",
  bet_market: "PUBLIC_READ_SERVICE_WRITE",
  bet_selection: "PUBLIC_READ_SERVICE_WRITE",
  odds: "PUBLIC_READ_SERVICE_WRITE",
  profile: "OWN_ROW",
  wallet: "OWN_ROW",
  wallet_transaction: "OWN_ROW",
  bet: "OWN_ROW",
  bet_leg: "OWN_ROW",
  audit_log: "SERVICE_ONLY_APPEND_ONLY",
  common_code_history: "SERVICE_ONLY_APPEND_ONLY",
};

function expected(profile: Profile, command: (typeof COMMANDS)[number], actor: Actor): boolean {
  if (actor === "service_role") {
    // append-only 2종은 트리거가 역할과 무관하게 UPDATE/DELETE를 막는다(진짜 강제 수단).
    if (profile === "SERVICE_ONLY_APPEND_ONLY" && (command === "UPDATE" || command === "DELETE")) return false;
    return true; // service_role은 RLS 자체를 우회 — 그 외엔 항상 허용
  }
  if (profile === "PUBLIC_READ_SERVICE_WRITE") {
    return command === "SELECT"; // 쓰기는 anon/authenticated 전부 거부
  }
  if (profile === "OWN_ROW") {
    if (command === "SELECT") return actor === "authenticated_owner";
    return false; // 쓰기는 service_role 전용
  }
  // SERVICE_ONLY_APPEND_ONLY — anon/authenticated는 SELECT/INSERT/UPDATE/DELETE 전부 거부
  return false;
}

describe("정책 테스트 스위트 — 대상 11개 테이블 RLS 활성화", () => {
  for (const table of Object.keys(TABLE_PROFILE)) {
    it(`${table}: ENABLE ROW LEVEL SECURITY`, () => {
      expect(rlsEnabledTables.has(table)).toBe(true);
    });
  }
});

describe("정책 테스트 스위트 — 액터별 허용·거부 케이스 전건", () => {
  for (const [table, profile] of Object.entries(TABLE_PROFILE)) {
    describe(table, () => {
      for (const command of COMMANDS) {
        for (const actor of ACTORS) {
          const want = expected(profile, command, actor);
          it(`${command} × ${actor} → ${want ? "허용" : "거부"}`, () => {
            const got = isEffectivelyAllowed(policies, appendOnlyTriggerTables, table, command, actor);
            expect(got).toBe(want);
          });
        }
      }
    });
  }
});

describe("정책 테스트 스위트 — 구조적 불변식", () => {
  it("service_role은 RLS 정책 유무와 무관하게 항상 통과한다(우회) — isAllowedByPolicy 계약", () => {
    // 정책이 아예 없는 가상 테이블에서도 service_role은 true여야 한다(RLS 자체를 우회하므로).
    expect(isAllowedByPolicy(policies, "존재하지-않는-테이블", "SELECT", "service_role")).toBe(true);
  });

  it("append-only 2종은 UPDATE/DELETE 정책 자체가 아예 없다(정책 부재가 1차 차단선)", () => {
    for (const table of ["audit_log", "common_code_history"]) {
      const writePolicies = policies.filter(
        (p) => p.table === table && (p.command === "UPDATE" || p.command === "DELETE" || p.command === "ALL"),
      );
      expect(writePolicies).toEqual([]);
    }
  });

  it("append-only 2종은 reject_update_delete 트리거가 걸려 있다(역할 무관 2차 강제)", () => {
    expect(appendOnlyTriggerTables.has("audit_log")).toBe(true);
    expect(appendOnlyTriggerTables.has("common_code_history")).toBe(true);
  });

  it('운영자 권한 상승 없음 — 이 마이그레이션 세트 어떤 정책 조건도 profile.role/ADMIN을 참조하지 않는다', () => {
    // "운영자"가 DB 레벨에서 특별 취급되지 않는다는 것을 직접 증명한다 — 향후 누군가
    // profile.role = 'ADMIN' 형태의 지름길 정책을 추가하면 이 테스트가 깨져
    // (그 시점엔 의도된 변경일 수도 있으므로) 리뷰에서 반드시 짚이게 한다.
    const conditionsMentioningAdmin = policies.filter(
      (p) => /role\s*=\s*'ADMIN'/.test(p.using ?? "") || /role\s*=\s*'ADMIN'/.test(p.withCheck ?? ""),
    );
    expect(conditionsMentioningAdmin).toEqual([]);
  });

  it("파싱 건수 자기검증 — 11개 테이블 40개 정책(4+8+4+20+4)을 전부 읽었다", () => {
    expect(policies.length).toBe(40);
    expect(new Set(policies.map((p) => p.table)).size).toBe(11);
  });
});
