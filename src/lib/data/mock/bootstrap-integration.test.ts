/**
 * bootstrapApp() × mock 전역 기본값 소스 통합 검증 — 42일차(2026-09-16), I-206.
 *
 * 41일차 인계 내용대로 `setGlobalDefaultSource()` 호출처가 없어 dev 서버가 매 조회마다
 * `[config/fallback]` WARN을 45건씩 찍고 있었다(`MATCH_POINTS` 20 · `SPONSOR_PARAM`/
 * `SQUAD_PARAM`/`LEAGUE_TEAM_COUNT`/`PROMOTION_RELEGATION_SLOTS`/`ROUND_INTERVAL_MIN` 각
 * 5). 이 파일은 실제 `bootstrapApp()`(1팀 `src/lib/data/bootstrap.ts`, 읽기 전용 소비)을
 * 그대로 거쳐 — 이 팀이 오늘 등록한 `mockConstantSource`(`./mock-constant-source.ts`)까지
 * 포함한 전체 경로가 실제로 WARN을 없애는지 검증한다. 단위 테스트(`mock-constant-source.test.ts`)는
 * 소스 자체의 값만 보고, 이 파일은 "부트스트랩을 거쳐 `loadConstants`를 호출했을 때
 * 실제로 폴백을 안 타는가"까지 확인한다.
 *
 * `NEXT_PUBLIC_DATA_SOURCE`를 명시적으로 `'mock'`으로 고정한다 — 로컬 개발 기본값과
 * 같지만, 테스트 환경 변수에 의존하지 않고 이 파일 스스로 전제를 보장하기 위함이다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMMON_CODE_GROUP_CATALOG } from "@/lib/config/catalog";
import { invalidateConstants, loadConstants, setFallbackSource, setGlobalDefaultSource } from "@/lib/config/loader";
import { resetFallbackWarnTracking } from "@/lib/config/fallback";
import { resetDataSourceBootstrap } from "@/lib/data/bootstrap";
import { resetDataSourceCache } from "@/lib/data/factory";

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_DATA_SOURCE;

beforeEach(() => {
  process.env.NEXT_PUBLIC_DATA_SOURCE = "mock";
  resetDataSourceCache();
  resetDataSourceBootstrap();
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
  resetFallbackWarnTracking();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL_ENV;
  }
  resetDataSourceCache();
  resetDataSourceBootstrap();
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
  resetFallbackWarnTracking();
  vi.restoreAllMocks();
});

describe("bootstrapApp() → mock 전역 기본값 소스 (I-206)", () => {
  it("38개 그룹 전량 조회해도 console.warn이 0건이다(하드코딩 폴백을 타지 않는다)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { bootstrapApp } = await import("@/lib/data/bootstrap");

    await bootstrapApp();

    for (const { groupCode } of COMMON_CODE_GROUP_CATALOG) {
      loadConstants(groupCode);
    }

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("UI_PARAM은 부트스트랩 이후 안전망 값(30000)이 아니라 정상값(5000)을 반환한다", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { bootstrapApp } = await import("@/lib/data/bootstrap");

    await bootstrapApp();

    expect(loadConstants("UI_PARAM")).toEqual({
      POLL_INTERVAL_MS: 5000,
      POLL_LIVE_MS: 3000,
      LEADERBOARD_MIN_APPEARANCE_PCT: 30,
    });
  });
});
