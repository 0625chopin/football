import { beforeEach, describe, expect, it, vi } from "vitest";

// `revalidatePath`는 실제 Next.js 요청 컨텍스트가 있어야 동작한다 — `../actions.test.ts`와
// 동일한 이유로 no-op 처리한다(이 파일이 검증하는 대상은 값 파싱·서버 검증·오버레이 반영
// 로직이지 캐시 무효화 배선 자체가 아니다).
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { assertAdminSessionMock } = vi.hoisted(() => ({ assertAdminSessionMock: vi.fn() }));
vi.mock("@/app/api/admin/auth", () => ({ assertAdminSession: assertAdminSessionMock }));

import { bootstrapApp } from "@/lib/data/bootstrap";
import { resetDataSourceCache } from "@/lib/data/factory";

import { updateCommonCodeValue } from "./actions";
import { applyConfigOverrides, resetConfigOverrideStore } from "./config-override-store";
import { getLocalConfigHistory, resetConfigHistoryStore } from "./config-history-store";

describe("updateCommonCodeValue (H3 저장)", () => {
  beforeEach(async () => {
    resetDataSourceCache();
    resetConfigOverrideStore();
    resetConfigHistoryStore();
    assertAdminSessionMock.mockReset();
    assertAdminSessionMock.mockResolvedValue(undefined); // 기본값: 인가된 세션
    // 57일차부터 effectiveFromSeason 계산에 getWorldStatus()/getCommonCodeGroups()가
    // 필요해졌다(`../actions.test.ts`와 동일하게 Mock 어댑터 부트스트랩 필요).
    await bootstrapApp();
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

  it("NEXT_SEASON 정책 그룹 저장 시 effectiveFromSeason이 다음 시즌으로 채워진다(57일차)", async () => {
    // ROUND_INTERVAL_MIN은 catalog.ts에서 applyPolicy: 'NEXT_SEASON'. Mock 월드의
    // currentSeasonNumber는 1(MockDataSource.test.ts 실측) → 저장 시 2가 기록돼야 한다.
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "라운드 간격 조정",
      value: { kind: "NUMBER", raw: 80 },
    });
    expect(result).toEqual({ ok: true });

    const [{ effectiveFromSeason }] = applyConfigOverrides([
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
    expect(effectiveFromSeason).toBe(2);
  });

  it("IMMEDIATE 정책 그룹 저장 시 effectiveFromSeason은 null로 유지된다(57일차)", async () => {
    // CRON_PARAM은 catalog.ts에서 applyPolicy: 'IMMEDIATE'. RETRY_MAX 허용 범위는
    // min:0 (schema.ts NUMERIC_RANGE_CATALOG).
    const result = await updateCommonCodeValue("ko", {
      groupCode: "CRON_PARAM",
      code: "RETRY_MAX",
      reason: "재시도 횟수 조정",
      value: { kind: "NUMBER", raw: 5 },
    });
    expect(result).toEqual({ ok: true });

    const [{ effectiveFromSeason }] = applyConfigOverrides([
      {
        id: "x" as never,
        groupCode: "CRON_PARAM",
        code: "RETRY_MAX",
        worldId: null,
        value: "3",
        valueNum: 3,
        valueJson: null,
        minValue: null,
        maxValue: null,
        jsonSchema: null,
        defaultValue: "3",
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
    expect(effectiveFromSeason).toBeNull();
  });

  it("저장 성공 시 변경 이력(H4)이 append-only 오버레이에 기록된다(57일차)", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "라운드 간격 조정",
      value: { kind: "NUMBER", raw: 80 },
    });
    expect(result).toEqual({ ok: true });

    const history = getLocalConfigHistory("ROUND_INTERVAL_MIN", "LEAGUE_1");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      action: "UPDATE",
      newValue: "80",
      newEffectiveFromSeason: 2,
      reason: "라운드 간격 조정",
    });
  });

  it("검증 실패로 저장이 거부되면 변경 이력을 기록하지 않는다(57일차)", async () => {
    const result = await updateCommonCodeValue("ko", {
      groupCode: "ROUND_INTERVAL_MIN",
      code: "LEAGUE_1",
      reason: "테스트",
      value: { kind: "NUMBER", raw: -5 },
    });
    expect(result.ok).toBe(false);
    expect(getLocalConfigHistory("ROUND_INTERVAL_MIN", "LEAGUE_1")).toHaveLength(0);
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
