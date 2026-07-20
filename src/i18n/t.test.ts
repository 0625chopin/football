/**
 * t.ts 테스트 — Task 011 / 18일차.
 *
 * React 의존이 전혀 없는 순수 함수이므로, 서버 컴포넌트 호출 경로("t(lang, key)"를
 * 직접 부르는 경우)를 이 파일만으로 완전히 커버한다. 클라이언트 훅 경로(Context 배선)는
 * provider.test.ts에서 검증한다.
 */

import { describe, expect, it } from "vitest";
import { t } from "./t";

describe("t() — 서버·클라이언트 공용 조회", () => {
  it("ko 카탈로그에서 3단 키를 조회한다", () => {
    expect(t("ko", "common.nav.home")).toBe("홈");
  });

  it("en 카탈로그에서 같은 키를 조회한다", () => {
    expect(t("en", "common.nav.home")).not.toBe(t("ko", "common.nav.home"));
  });

  it("{placeholder}를 params로 치환한다", () => {
    expect(t("ko", "common.header.seasonPhaseLabel", { phase: "REGULAR" })).toBe(
      "시즌 페이즈: REGULAR (준비 중)",
    );
  });

  it("대응하는 값이 없는 placeholder는 원문 그대로 남긴다", () => {
    expect(t("ko", "common.header.seasonPhaseLabel", {})).toBe(
      "시즌 페이즈: {phase} (준비 중)",
    );
  });

  it("params 없이 호출하면 원문을 그대로 반환한다(치환 대상 없는 키)", () => {
    expect(t("ko", "common.action.save")).toBe("저장");
  });

  it("존재하지 않는 키는 조용히 넘어가지 않고 던진다", () => {
    // @ts-expect-error — 런타임 오조회(예: 타입 단언 우회) 방어를 검증하기 위한 의도적 위반.
    expect(() => t("ko", "common.nav.doesNotExist")).toThrow(/존재하지 않는 키/);
  });
});
