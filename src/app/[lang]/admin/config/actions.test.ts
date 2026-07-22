import { beforeEach, describe, expect, it, vi } from "vitest";

// `revalidatePath`는 실제 Next.js 요청 컨텍스트가 있어야 동작한다 — `../actions.test.ts`와
// 동일한 이유로 no-op 처리한다(이 파일이 검증하는 대상은 값 파싱·서버 검증·오버레이 반영
// 로직이지 캐시 무효화 배선 자체가 아니다).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { assertAdminSessionMock } = vi.hoisted(() => ({ assertAdminSessionMock: vi.fn() }));
vi.mock("@/app/api/admin/auth", () => ({ assertAdminSession: assertAdminSessionMock }));

import { updateCommonCodeValue } from "./actions";
import { applyConfigOverrides, resetConfigOverrideStore } from "./config-override-store";

describe("updateCommonCodeValue (H3 저장)", () => {
  beforeEach(() => {
    resetConfigOverrideStore();
    assertAdminSessionMock.mockReset();
    assertAdminSessionMock.mockResolvedValue(undefined); // 기본값: 인가된 세션
  });

  it("비인가 세션이면 거부되고 오버레이를 건드리지 않는다", async () => {
    assertAdminSessionMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      updateCommonCodeValue("ko", {
        groupCode: "ROUND_INTERVAL_MIN",
        code: "LEAGUE_1",
        reason: "테스트",
        value: { kind: "NUMBER", raw: 80 },
      }),
    ).rejects.toThrow("unauthorized");

    const [{ value }] = applyConfigOverrides([
      {
        id: "x" as never,
        groupCode: "ROUND_INTERVAL_MIN",
        code: "LEAGUE_1",
        worldId: null,
        value: "75",
        valueNum: 75,
        valueJson: null,
        minValue: null,
        maxValue: null,
        jsonSchema: null,
        defaultValue: "75",
        description: "",
        unit: null,
        sortOrder: 1,
        isActive: true,
        effectiveFromSeason: null,
        createdAt: "2026-07-21T00:00:00.000Z" as never,
        updatedAt: "2026-07-21T00:00:00.000Z" as never,
        updatedBy: null,
      },
    ]);
    expect(value).toBe("75"); // 오버레이가 적용되지 않았다 = 저장이 일어나지 않았다
  });

  it("사유가 비어 있으면 서버측에서 거부한다(V-4)", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "   ",
      value: { kind: "NUMBER", raw: 80 },
    });
    expect(result).toEqual({ ok: false, message: expect.any(String) });
  });

  it("숫자가 아닌 값은 거부한다", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "테스트",
      value: { kind: "NUMBER", raw: Number.NaN },
    });
    expect(result.ok).toBe(false);
  });

  it("파싱 불가능한 JSON은 거부한다", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "MANAGER_STYLE_XG",
      code: "ATTACKING",
      reason: "테스트",
      value: { kind: "JSON", raw: "{not valid json" },
    });
    expect(result.ok).toBe(false);
  });

  it("허용 범위를 벗어난 숫자는 3팀 schema.ts 검증으로 거부된다(NFR-CFG-004)", async () => {
    // ROUND_INTERVAL_MIN.LEAGUE_1 허용 범위는 min:1 (schema.ts NUMERIC_RANGE_CATALOG).
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "테스트",
      value: { kind: "NUMBER", raw: -5 },
    });
    expect(result).toEqual({ ok: false, message: expect.stringContaining("허용 범위") });
  });

  it("JSON 스키마를 벗어난 값은 거부된다(MANAGER_STYLE_XG)", async () => {
    // MANAGER_STYLE_XG 코드는 { ownXgMultiplier, concededXgMultiplier } 필수 — 누락 시 거부.
    const result = await updateCommonCodeValue("ko", {
      groupCode: "MANAGER_STYLE_XG",
      code: "ATTACKING",
      reason: "테스트",
      value: { kind: "JSON", raw: JSON.stringify({ ownXgMultiplier: 1.1 }) },
    });
    expect(result.ok).toBe(false);
  });

  it("유효한 숫자값 저장은 오버레이에 반영된다", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "라운드 간격 조정",
      value: { kind: "NUMBER", raw: 80 },
    });
    expect(result).toEqual({ ok: true });

    const [{ value, valueNum }] = applyConfigOverrides([
      {
        id: "x" as never,
        groupCode: "ROUND_INTERVAL_MIN",
        code: "LEAGUE_1",
        worldId: null,
        value: "75",
        valueNum: 75,
        valueJson: null,
        minValue: null,
        maxValue: null,
        jsonSchema: null,
        defaultValue: "75",
        description: "",
        unit: null,
        sortOrder: 1,
        isActive: true,
        effectiveFromSeason: null,
        createdAt: "2026-07-21T00:00:00.000Z" as never,
        updatedAt: "2026-07-21T00:00:00.000Z" as never,
        updatedBy: null,
      },
    ]);
    expect(value).toBe("80");
    expect(valueNum).toBe(80);
  });

  it("CUP_PARAM.BYE_COUNT(스칼라 래핑 JSON)에 유효한 값 저장이 성공한다", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "CUP_PARAM",
      code: "BYE_COUNT",
      reason: "바이 수 조정",
      value: { kind: "JSON", raw: JSON.stringify({ value: 8 }) },
    });
    expect(result).toEqual({ ok: true });
  });

  it("CUP_PARAM.INSERT_ROUNDS(배열 래핑 JSON)에 유효한 값 저장이 성공한다", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "CUP_PARAM",
      code: "INSERT_ROUNDS",
      reason: "삽입 라운드 조정",
      value: { kind: "JSON", raw: JSON.stringify({ value: [6, 12, 18] }) },
    });
    expect(result).toEqual({ ok: true });
  });
});
