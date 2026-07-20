/**
 * format.ts 테스트 — Task 011 / 20일차.
 *
 * DC-07(킥오프 UTC → 로케일 로컬 변환), 포인트 천단위 구분, 배당 소수 2자리 표기가
 * ko/en 양쪽에서 `Intl.*` 위임을 통해 기대한 형태로 나오는지 검증한다.
 */

import { describe, expect, it } from "vitest";
import type { Points, Timestamp } from "@/types";
import { formatCountdownClock, formatKickoff, formatOdds, formatPoints } from "./format";

const KICKOFF: Timestamp = "2026-08-17T10:30:00.000Z";

describe("formatKickoff() — DC-07 UTC → 로케일 로컬 변환", () => {
  it("ko 로케일에서 dateTime 스타일(기본값)로 변환한다", () => {
    expect(formatKickoff(KICKOFF, "ko")).toBe(formatKickoff(KICKOFF, "ko", "dateTime"));
  });

  it("같은 순간이라도 ko/en 표기가 서식상 다를 수 있다(로케일 위임 확인)", () => {
    const ko = formatKickoff(KICKOFF, "ko", "date");
    const en = formatKickoff(KICKOFF, "en", "date");
    expect(ko).not.toBe(en);
  });

  it("time 스타일은 시:분만 담는다(날짜 성분 없음)", () => {
    const result = formatKickoff(KICKOFF, "ko", "time");
    expect(result).not.toMatch(/2026/);
  });

  it("UTC 원시값을 그대로 반환하지 않는다(로컬 변환이 실제로 일어남)", () => {
    expect(formatKickoff(KICKOFF, "ko", "date")).not.toBe(KICKOFF);
  });
});

describe("formatPoints() — 천단위 구분", () => {
  it("ko 로케일에서 천단위 구분 기호를 넣는다", () => {
    expect(formatPoints(1_234_567 as Points, "ko")).toBe("1,234,567");
  });

  it("en 로케일에서도 동일한 구분 기호를 쓴다(D-18: 콤마 규약 공유)", () => {
    expect(formatPoints(1_234_567 as Points, "en")).toBe("1,234,567");
  });

  it("음수(원장 차감)도 부호를 보존한다", () => {
    expect(formatPoints(-1_000 as Points, "ko")).toBe("-1,000");
  });
});

describe("formatOdds() — 소수 2자리 고정", () => {
  it("정수 배당도 소수 2자리로 채운다", () => {
    expect(formatOdds(2, "ko")).toBe("2.00");
  });

  it("셋째 자리 이하는 반올림한다", () => {
    expect(formatOdds(1.005, "ko")).toBe("1.01");
  });

  it("최대값 근방(500.00)도 그대로 표기한다", () => {
    expect(formatOdds(500, "en")).toBe("500.00");
  });
});

describe("formatCountdownClock() — HH:MM:SS 0-패딩(CountdownTimer, 31일차)", () => {
  it("1시간 미만도 시(H) 자리를 0-패딩해 채운다", () => {
    expect(formatCountdownClock(724_000)).toBe("00:12:04");
  });

  it("초 단위 이하는 버림(floor)한다", () => {
    expect(formatCountdownClock(1_999)).toBe("00:00:01");
  });

  it("음수(경과 후)는 0으로 clamp한다", () => {
    expect(formatCountdownClock(-5_000)).toBe("00:00:00");
  });

  it("1시간 이상도 시:분:초로 정확히 환산한다", () => {
    expect(formatCountdownClock(3 * 3_600_000 + 12_000)).toBe("03:00:12");
  });

  it("ko/en 로케일 인자가 없다 — 콜론 구분 표기는 로케일 불변(공통 관례)", () => {
    expect(formatCountdownClock.length).toBe(1);
  });
});
