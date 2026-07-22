"use server";

import { revalidatePath } from "next/cache";

import { assertAdminSession } from "@/app/api/admin/auth";
import { getDataSource } from "@/lib/data/factory";
import type { FixtureId, MatchSeed } from "@/types";
import { getWorldOverride, setWorldOverride } from "./world-override-store";

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
  await assertAdminSession();

  const trimmed = matchId.trim();
  if (!trimmed) {
    return { found: false };
  }

  const fixture = await getDataSource().getFixture(trimmed as FixtureId);
  return fixture ? { found: true, matchSeed: fixture.matchSeed } : { found: false };
}
