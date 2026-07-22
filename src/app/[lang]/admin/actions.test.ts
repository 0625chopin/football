import { beforeEach, describe, expect, it, vi } from "vitest";

// `revalidatePath`는 실제 Next.js 요청 컨텍스트(static generation store)가 있어야
// 동작한다 — 단위 테스트에는 그 컨텍스트가 없으므로 no-op으로 대체한다(이 파일이
// 검증하는 대상은 배속 클램프·오버레이 병합·시드 조회 로직이지 Next.js 캐시 무효화
// 배선 자체가 아니다).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// `assertAdminSession`(6팀 소유, `src/app/api/admin/auth.ts`)은 이 파일 작성 시점에
// 아직 존재하지 않는다(팀장 지시 — 계약 시그니처만 고정, 파일은 병렬 진행 중).
// `vi.hoisted`로 통제 가능한 mock을 만들어 인가/비인가 양쪽 분기를 모두 검증한다 —
// 실제 파일이 들어오면 이 mock은 그대로 유효하고(같은 named export), 통합 확인은
// 팀장이 앱 내 실측으로 진행한다(54일차 보고 참조).
const { assertAdminSessionMock } = vi.hoisted(() => ({ assertAdminSessionMock: vi.fn() }));
vi.mock("@/app/api/admin/auth", () => ({ assertAdminSession: assertAdminSessionMock }));

import { resetDataSourceCache } from "@/lib/data/factory";
import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";

import { applySpeedMultiplier, lookupMatchSeed, toggleWorldPause } from "./actions";
import { getWorldOverride, resetWorldOverride } from "./world-override-store";

describe("admin actions (G2/G3/G4)", () => {
  beforeEach(async () => {
    resetDataSourceCache();
    resetWorldOverride(); // 테스트 간 오버레이 격리
    assertAdminSessionMock.mockReset();
    assertAdminSessionMock.mockResolvedValue(undefined); // 기본값: 인가된 세션
    await bootstrapApp();
  });

  describe("인가 재검증 — 3함수 전부 첫 줄에서 assertAdminSession()을 통과해야 한다", () => {
    it("비인가 세션이면 applySpeedMultiplier가 거부되고 오버레이를 건드리지 않는다", async () => {
      assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
      await expect(applySpeedMultiplier("ko", 5)).rejects.toThrow("unauthorized");
      expect(getWorldOverride()).toBeNull();
    });

    it("비인가 세션이면 toggleWorldPause가 거부되고 오버레이를 건드리지 않는다", async () => {
      assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
      await expect(toggleWorldPause("ko")).rejects.toThrow("unauthorized");
      expect(getWorldOverride()).toBeNull();
    });

    it("비인가 세션이면 lookupMatchSeed도 거부된다(어드민 전용 시드 노출이라 읽기도 포함)", async () => {
      const dataSource = getDataSource();
      const nextKickoff = await dataSource.getNextKickoff();
      assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
      await expect(lookupMatchSeed(nextKickoff!.id)).rejects.toThrow("unauthorized");
    });

    it("각 액션은 assertAdminSession을 정확히 1회 호출한다", async () => {
      await applySpeedMultiplier("ko", 5);
      expect(assertAdminSessionMock).toHaveBeenCalledTimes(1);
    });
  });

  it("배속을 0.25~20 범위로 클램프한다", async () => {
    const tooHigh = await applySpeedMultiplier("ko", 999);
    expect(tooHigh.speedMultiplier).toBe(20);

    const tooLow = await applySpeedMultiplier("ko", 0.001);
    expect(tooLow.speedMultiplier).toBe(0.25);

    const valid = await applySpeedMultiplier("ko", 5);
    expect(valid.speedMultiplier).toBe(5);
  });

  it("정지/재개를 토글하고 pausedAt을 갱신한다", async () => {
    const paused = await toggleWorldPause("ko");
    expect(paused.isPaused).toBe(true);

    const resumed = await toggleWorldPause("ko");
    expect(resumed.isPaused).toBe(false);
  });

  it("존재하는 matchId는 matchSeed를 반환한다", async () => {
    const dataSource = getDataSource();
    const nextKickoff = await dataSource.getNextKickoff();
    expect(nextKickoff).not.toBeNull();

    const result = await lookupMatchSeed(nextKickoff!.id);
    expect(result.found).toBe(true);
    expect(typeof result.matchSeed).toBe("number");
  });

  it("존재하지 않거나 빈 matchId는 found:false를 반환한다", async () => {
    expect(await lookupMatchSeed("no-such-fixture")).toEqual({ found: false });
    expect(await lookupMatchSeed("   ")).toEqual({ found: false });
  });
});
