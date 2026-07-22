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

import {
  applySpeedMultiplier,
  confirmWorldReset,
  fetchAuditLogs,
  lookupMatchSeed,
  toggleWorldPause,
} from "./actions";
import { getWorldOverride, resetWorldOverride } from "./world-override-store";
import { resetAuditLogStore } from "./audit-log-store";
import { WORLD_RESET_CONFIRMATION_WORD } from "./reset-validation";

describe("admin actions (G2/G3/G4)", () => {
  beforeEach(async () => {
    resetDataSourceCache();
    resetWorldOverride(); // 테스트 간 오버레이 격리
    resetAuditLogStore();
    // 59일차 신규 — NFR-SEC-007 1차(`assertAdminConsoleEnabled()`)가 각 액션 첫 줄에
    // 추가됐다. 기본값 미설정=비활성(fail-closed, `console-flag.ts` 참조)이라 켜 두지
    // 않으면 이 스위트가 검증하려는 인가 로직(assertAdminSession 분기)에 도달하기 전에
    // 전부 거부된다.
    process.env.ADMIN_CONSOLE_ENABLED = "true";
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

  describe("NFR-SEC-007 1차(환경 플래그) — 59일차 신규", () => {
    it("ADMIN_CONSOLE_ENABLED가 꺼져 있으면 인가된 세션이어도 거부된다(assertAdminSession 호출 전)", async () => {
      delete process.env.ADMIN_CONSOLE_ENABLED;
      await expect(applySpeedMultiplier("ko", 5)).rejects.toThrow(/disabled/);
      expect(assertAdminSessionMock).not.toHaveBeenCalled();
    });

    it("ADMIN_CONSOLE_ENABLED가 \"true\" 외의 값이면 여전히 비활성으로 판정한다", async () => {
      process.env.ADMIN_CONSOLE_ENABLED = "1";
      await expect(toggleWorldPause("ko")).rejects.toThrow(/disabled/);
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

describe("confirmWorldReset (G5) — I-13: 실제 리셋을 절대 실행하지 않는다", () => {
  beforeEach(async () => {
    resetDataSourceCache();
    resetWorldOverride();
    resetAuditLogStore();
    process.env.ADMIN_CONSOLE_ENABLED = "true"; // 59일차 신규, 위 스위트와 동일 이유
    assertAdminSessionMock.mockReset();
    assertAdminSessionMock.mockResolvedValue(undefined);
    await bootstrapApp();
  });

  it("비인가 세션이면 거부되고 감사 로그도 남지 않는다", async () => {
    assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      confirmWorldReset("ko", {
        reason: "테스트",
        confirmText: WORLD_RESET_CONFIRMATION_WORD,
        archiveOrDelete: "ARCHIVE",
      }),
    ).rejects.toThrow("unauthorized");

    // 감사 로그 조회 자체도 인가가 필요하므로, 여기서는 세션을 복구한 뒤 조회해 로그가
    // 실제로 남지 않았음(비인가 시도가 기록되지 않음)을 확인한다.
    assertAdminSessionMock.mockResolvedValue(undefined);
    expect(await fetchAuditLogs()).toEqual([]);
  });

  it("사유가 비어 있으면 서버측에서 거부한다(클라이언트 상태를 신뢰하지 않음)", async () => {
    await expect(
      confirmWorldReset("ko", {
        reason: "   ",
        confirmText: WORLD_RESET_CONFIRMATION_WORD,
        archiveOrDelete: "ARCHIVE",
      }),
    ).rejects.toThrow(/confirmation gate/);
  });

  it("확인 문구가 정확히 일치하지 않으면 거부한다", async () => {
    await expect(
      confirmWorldReset("ko", {
        reason: "테스트 사유",
        confirmText: "reset", // 대소문자 불일치
        archiveOrDelete: "ARCHIVE",
      }),
    ).rejects.toThrow(/confirmation gate/);

    await expect(
      confirmWorldReset("ko", {
        reason: "테스트 사유",
        confirmText: WORLD_RESET_CONFIRMATION_WORD + "!",
        archiveOrDelete: "ARCHIVE",
      }),
    ).rejects.toThrow(/confirmation gate/);
  });

  it("2단계 게이트를 정확히 통과하면 감사 로그에 executed:false로만 기록되고 World는 변경되지 않는다", async () => {
    const dataSource = getDataSource();
    const before = await dataSource.getWorldStatus();

    const result = await confirmWorldReset("ko", {
      reason: "재현 테스트를 위한 리셋 요청",
      confirmText: WORLD_RESET_CONFIRMATION_WORD,
      archiveOrDelete: "DELETE",
      newSeed: "12345",
    });
    expect(result).toEqual({ accepted: true });

    // 실제 리셋 미실행 확인 — 기저 World와 오버레이 모두 그대로다.
    const after = await dataSource.getWorldStatus();
    expect(after).toEqual(before);
    expect(getWorldOverride()).toBeNull();

    const logs = await fetchAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      actorType: "HUMAN",
      action: "WORLD_RESET_REQUESTED",
      targetType: "World",
      payload: {
        reason: "재현 테스트를 위한 리셋 요청",
        archiveOrDelete: "DELETE",
        newSeed: "12345",
        executed: false,
      },
    });
  });
});

describe("fetchAuditLogs (G6)", () => {
  beforeEach(async () => {
    resetDataSourceCache();
    resetWorldOverride();
    resetAuditLogStore();
    process.env.ADMIN_CONSOLE_ENABLED = "true"; // 59일차 신규, 위 스위트와 동일 이유
    assertAdminSessionMock.mockReset();
    assertAdminSessionMock.mockResolvedValue(undefined);
    await bootstrapApp();
  });

  it("비인가 세션이면 거부된다(어드민 전용 노출)", async () => {
    assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
    await expect(fetchAuditLogs()).rejects.toThrow("unauthorized");
  });

  it("로그가 없으면 빈 배열을 반환한다", async () => {
    expect(await fetchAuditLogs()).toEqual([]);
  });

  it("actorType 필터가 로컬 오버레이 항목에도 적용된다", async () => {
    await confirmWorldReset("ko", {
      reason: "필터 테스트",
      confirmText: WORLD_RESET_CONFIRMATION_WORD,
      archiveOrDelete: "ARCHIVE",
    });

    expect(await fetchAuditLogs({ actorType: "HUMAN" })).toHaveLength(1);
    expect(await fetchAuditLogs({ actorType: "ENGINE" })).toHaveLength(0);
  });

  it("search가 action/targetType/targetId에 대해 대소문자 무관하게 매칭된다", async () => {
    await confirmWorldReset("ko", {
      reason: "검색 테스트",
      confirmText: WORLD_RESET_CONFIRMATION_WORD,
      archiveOrDelete: "ARCHIVE",
    });

    expect(await fetchAuditLogs({ search: "world_reset" })).toHaveLength(1);
    expect(await fetchAuditLogs({ search: "no-such-action" })).toHaveLength(0);
  });
});
