"use server";

import { revalidatePath } from "next/cache";

import { assertAdminSession } from "@/app/api/admin/auth";
import { getDataSource } from "@/lib/data/factory";
import type { AuditActorType, AuditLog, AuditLogId, FixtureId, MatchSeed } from "@/types";
import { getWorldOverride, setWorldOverride } from "./world-override-store";
import { mergeAuditLogs, recordLocalAuditLog } from "./audit-log-store";
import { isWorldResetConfirmValid } from "./reset-validation";
import { assertAdminConsoleEnabled } from "./console-flag";
import { fetchAuditLogsForAdminConsole } from "./service-role-audit";

// Task 021(54일차) — G2 배속 제어·G3 정지/재개·G4 시드 조회의 서버 액션.
// 왜 이 파일이 쓰기 조작을 담당하는지는 `./world-override-store.ts` 파일 헤더 참조
// (`DataSource`는 읽기 전용, 쓰기는 화면 소유 팀이 별도 경로로 구현하도록 위임됨).
//
// ## 인가 재검증 (팀장 재수정 지시, 54일차 — Next.js 16 공식 문서 근거)
// `node_modules/next/dist/docs/01-app/02-guides/data-security.md`가 명시적으로 경고한다:
// "A page-level authentication check does not extend to the Server Actions defined
// within it... the Server Action is a separate entry point and must verify the caller
// on its own." 즉 `src/proxy.ts`의 `/admin/**` 라우트 가드는 이 파일의 액션들을 보호하지
// 않는다 — 액션은 빌드가 발급하는 action ID로 직접 POST 가능한 별도 진입점이다
// (`src/app/[lang]/sample/data-source-actions.ts` 파일 헤더의 동일 경고 참조).
// 그래서 쓰기(`applySpeedMultiplier`/`toggleWorldPause`)뿐 아니라 어드민 전용 조회
// (`lookupMatchSeed`, 시드 노출)까지 **3함수 전부** 첫 줄에서 `assertAdminSession()`을
// 통과해야 한다. 이 함수는 6팀 소유(`src/app/api/admin/auth.ts`)이며 비인가 시 throw한다
// — `src/proxy.ts`와 동일한 "Supabase access token → `public.profile.role==='ADMIN'`"
// 판정을 재사용한다(계약은 팀장이 양팀에 동일 통보로 고정, 시그니처 변경 없음).
//
// ## 환경 플래그 재검증 (NFR-SEC-007 1차, 59일차 신규)
// 같은 이유로 `assertAdminConsoleEnabled()`(`./console-flag.ts`, 이 팀 소유)도 5함수
// 전부 첫 줄 — `assertAdminSession()`보다 먼저 — 통과해야 한다. 인증(2차)과 별개의
// 킬스위치이므로 순서를 바꿔도 안전과는 무관하지만, 더 싼 검사를 먼저 실패시켜 불필요한
// Supabase 왕복을 피한다.

const MIN_SPEED_MULTIPLIER = 0.25;
const MAX_SPEED_MULTIPLIER = 20;

function clampSpeedMultiplier(value: number): number {
  if (!Number.isFinite(value)) return MIN_SPEED_MULTIPLIER;
  return Math.min(MAX_SPEED_MULTIPLIER, Math.max(MIN_SPEED_MULTIPLIER, value));
}

/**
 * G2 `[적용]`(FR-AD-001) — 배속을 오버레이에 반영하고 `clockRevision`을 올려 G1
 * 카운트다운 재동기화 신호(R-14 ③)를 흉내낸다. `lang`은 현재 라우트 재검증용.
 */
export async function applySpeedMultiplier(
  lang: string,
  requestedMultiplier: number,
): Promise<{ readonly speedMultiplier: number }> {
  assertAdminConsoleEnabled();
  await assertAdminSession();

  const dataSource = getDataSource();
  const base = await dataSource.getWorldStatus();
  const current = getWorldOverride() ?? base;
  const speedMultiplier = clampSpeedMultiplier(requestedMultiplier);

  setWorldOverride({
    speedMultiplier,
    isPaused: current.isPaused,
    pausedTotalMinutes: current.pausedTotalMinutes,
    speedChangedAt: new Date().toISOString(),
    worldMinutesAtSpeedChange: current.worldMinutesAtSpeedChange,
    pausedAt: current.pausedAt,
    clockRevision: current.clockRevision + 1,
  });

  revalidatePath(`/${lang}/admin`);
  return { speedMultiplier };
}

/**
 * G3 정지/재개 토글(FR-AD-002) — `isPaused`를 뒤집고 정지 진입 시각만 기록한다. 실제
 * 누적 정지 분(`pausedTotalMinutes`) 산출은 2팀 H-24 ③ 소관이라 여기서 재구현하지 않는다
 * (`world-override-store.ts` 파일 헤더 "한계" 절 참조).
 */
export async function toggleWorldPause(lang: string): Promise<{ readonly isPaused: boolean }> {
  assertAdminConsoleEnabled();
  await assertAdminSession();

  const dataSource = getDataSource();
  const base = await dataSource.getWorldStatus();
  const current = getWorldOverride() ?? base;
  const nextIsPaused = !current.isPaused;
  const now = new Date().toISOString();

  setWorldOverride({
    speedMultiplier: current.speedMultiplier,
    isPaused: nextIsPaused,
    pausedTotalMinutes: current.pausedTotalMinutes,
    speedChangedAt: current.speedChangedAt,
    worldMinutesAtSpeedChange: current.worldMinutesAtSpeedChange,
    pausedAt: nextIsPaused ? now : null,
    clockRevision: current.clockRevision + 1,
  });

  revalidatePath(`/${lang}/admin`);
  return { isPaused: nextIsPaused };
}

/**
 * G4 `match_seed` 조회(FR-AD-003, 읽기 전용) — `getFixture`는 이미 `DataSource` 계약
 * 안에 있으므로 오버레이 없이 그대로 위임한다. 존재하지 않는 matchId는 `found: false`
 * (§5 Empty, W-42 제안 문구를 채택 — `admin.seed.notFound`).
 */
export async function lookupMatchSeed(
  matchId: string,
): Promise<{ readonly found: boolean; readonly matchSeed?: MatchSeed }> {
  assertAdminConsoleEnabled();
  await assertAdminSession();

  const trimmed = matchId.trim();
  if (!trimmed) {
    return { found: false };
  }

  const fixture = await getDataSource().getFixture(trimmed as FixtureId);
  return fixture ? { found: true, matchSeed: fixture.matchSeed } : { found: false };
}

/**
 * G5 월드 리셋 — **2단계 확인 게이트를 통과한 "요청"만 감사 로그에 남기고, 실제 월드는
 * 리셋하지 않는다**(I-13, 55일차 팀장 지시). 이유:
 * 1. `DataSource`(9일차 스코프)에 리셋 대상 메서드 자체가 없다 — G2/G3처럼 오버레이로
 *    흉내낼 수 있는 필드 갱신이 아니라 E-01 World 전체 재생성 + 히스토리 아카이브/삭제라
 *    엔진(2팀)·영속화(6팀) 양쪽이 없으면 "정확한" 리셋이 불가능하다.
 * 2. I-13("세계를 리셋하지 말 것")과 이번 작업 지시가 **이 세션에서 파괴적 동작을 어떤
 *    경우에도 트리거하지 말라**고 명시했다.
 * 그래서 이 함수는 (a) 인가 재검증 (b) 서버측 재검증(클라이언트가 버튼을 잘못 활성화해도
 * 막는다, I-270과 동일 원칙을 입력 검증에 적용) (c) 감사 로그에 `executed:false`로 요청
 * 사실만 기록 — 세 단계만 수행한다. `World`/`world-override-store`는 건드리지 않는다.
 *
 * 서버측 재검증이 실패하면(사유 공백·확인 문구 불일치) throw한다 — 클라이언트의
 * `isWorldResetConfirmValid` 판정과 **같은 함수**를 재사용하므로 두 판정이 어긋날 수 없다.
 */
export async function confirmWorldReset(
  lang: string,
  input: {
    readonly reason: string;
    readonly confirmText: string;
    readonly archiveOrDelete: "ARCHIVE" | "DELETE";
    readonly newSeed?: string;
  },
): Promise<{ readonly accepted: true }> {
  assertAdminConsoleEnabled();
  await assertAdminSession();

  if (!isWorldResetConfirmValid(input.reason, input.confirmText)) {
    throw new Error("[admin/actions] world reset rejected: confirmation gate not satisfied");
  }

  const world = await getDataSource().getWorldStatus();
  const trimmedNewSeed = input.newSeed?.trim();

  recordLocalAuditLog({
    id: crypto.randomUUID() as AuditLogId,
    actorType: "HUMAN",
    // assertAdminSession()은 인가 여부만 반환하고 호출자 식별자를 내려주지 않는다(계약
    // 시그니처 고정, 6팀 파일 헤더 참조) — 사용자 식별이 필요해지면 이슈로 등재한다.
    actorId: null,
    action: "WORLD_RESET_REQUESTED",
    targetType: "World",
    targetId: String(world.id),
    payload: {
      reason: input.reason.trim(),
      archiveOrDelete: input.archiveOrDelete,
      newSeed: trimmedNewSeed || null,
      executed: false,
    },
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/${lang}/admin`);
  return { accepted: true };
}

/**
 * G6 로그 뷰어 조회(FR-AD-007, 읽기 전용) — 어드민 전용 감사 로그 노출이라 `lookupMatchSeed`와
 * 같은 근거로 조회도 `assertAdminSession()`을 거친다. 기저 `getAuditLogs()`(3팀 Mock은 항상
 * `[]`, 파일 헤더 참조) 위에 이 화면의 로컬 리셋-요청 오버레이(`audit-log-store.ts`)를 얹어
 * 반환한다.
 */
export async function fetchAuditLogs(params?: {
  readonly actorType?: AuditActorType;
  readonly search?: string;
  readonly limit?: number;
}): Promise<readonly AuditLog[]> {
  assertAdminConsoleEnabled();
  await assertAdminSession();

  const base = await fetchAuditLogsForAdminConsole(params);
  return mergeAuditLogs(base, params);
}
