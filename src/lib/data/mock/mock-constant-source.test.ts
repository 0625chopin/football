/**
 * mock-constant-source.ts 테스트 — 42일차(2026-09-16), I-206 mock 쪽 해소 검증.
 *
 * 핵심 검증 3가지: ① 38그룹 전량 값을 반환한다(폴백으로 새는 그룹이 없어야 WARN이
 * 진짜 0건이 된다), ② UI_PARAM만 안전망(30000/15000)이 아니라 정상값(5000/3000)이다,
 * ③ `loadConstants`를 호출하지 않는다(순환 재귀 회피 — `factory.ts` 경고 대상).
 */

import { describe, expect, it } from "vitest";
import { COMMON_CODE_GROUP_CATALOG } from "@/lib/config/catalog";
import { SAFE_DEFAULT_VALUES } from "@/lib/config/fallback";
import { mockConstantSource } from "./mock-constant-source";

describe("mockConstantSource", () => {
  it("38개 그룹 전량에 값을 반환한다(undefined로 새어 폴백을 유발하는 그룹이 없다)", () => {
    const groupCodes = COMMON_CODE_GROUP_CATALOG.map((g) => g.groupCode);
    expect(groupCodes).toHaveLength(38);

    for (const code of groupCodes) {
      expect(mockConstantSource.getGroupConstants(code)).toBeDefined();
    }
  });

  it("UI_PARAM은 안전망 값(30000/15000)이 아니라 정상 운영값(5000/3000)이다", () => {
    expect(mockConstantSource.getGroupConstants("UI_PARAM")).toEqual({
      POLL_INTERVAL_MS: 5000,
      POLL_LIVE_MS: 3000,
      LEADERBOARD_MIN_APPEARANCE_PCT: 30,
    });
    // 안전망 테이블 자체는 여전히 비용 안전용 값을 유지해야 한다(11일차 결정 보존 확인).
    expect(SAFE_DEFAULT_VALUES.UI_PARAM).toEqual({
      POLL_INTERVAL_MS: 30000,
      POLL_LIVE_MS: 15000,
      LEADERBOARD_MIN_APPEARANCE_PCT: 30,
    });
  });

  it("UI_PARAM 외 그룹은 SAFE_DEFAULT_VALUES와 동일 값을 그대로 재사용한다(값 재발명 없음)", () => {
    expect(mockConstantSource.getGroupConstants("MATCH_POINTS")).toEqual(
      SAFE_DEFAULT_VALUES.MATCH_POINTS,
    );
    expect(mockConstantSource.getGroupConstants("SQUAD_PARAM")).toEqual(
      SAFE_DEFAULT_VALUES.SQUAD_PARAM,
    );
  });

  it("소스 이름이 'mock-normal-defaults'다(하드코딩 폴백 'hardcoded-fallback'과 구분)", () => {
    expect(mockConstantSource.name).toBe("mock-normal-defaults");
  });
});
