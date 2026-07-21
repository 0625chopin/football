import { describe, expect, it, vi } from "vitest";
import { createLogger, type LogRecord } from "./logger";

describe("createLogger", () => {
  it("빈 상관 컨텍스트로는 생성조차 되지 않는다", () => {
    expect(() => createLogger({})).toThrowError(/correlation/);
  });

  it("모든 레벨의 로그가 상관 ID를 그대로 실어 나른다", () => {
    const records: LogRecord[] = [];
    const logger = createLogger(
      { season: "2026", matchId: "m-1" },
      { sink: (record) => records.push(record) },
    );

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(records).toHaveLength(4);
    expect(records.map((r) => r.level)).toEqual(["debug", "info", "warn", "error"]);
    for (const record of records) {
      expect(record.correlation).toEqual({ season: "2026", matchId: "m-1" });
    }
  });

  it("data는 넘긴 경우에만 레코드에 포함된다", () => {
    const records: LogRecord[] = [];
    const logger = createLogger(
      { season: "2026" },
      { sink: (record) => records.push(record) },
    );

    logger.info("no data");
    logger.info("with data", { round: 3 });

    expect(records[0]).not.toHaveProperty("data");
    expect(records[1].data).toEqual({ round: 3 });
  });

  it("주입된 clock을 그대로 사용한다(결정론 친화적)", () => {
    const records: LogRecord[] = [];
    const logger = createLogger(
      { season: "2026" },
      { clock: () => "FIXED", sink: (record) => records.push(record) },
    );

    logger.info("hello");

    expect(records[0].timestamp).toBe("FIXED");
  });

  it("child()는 부모 컨텍스트를 물려받고 겹치는 키는 자식이 덮어쓴다", () => {
    const records: LogRecord[] = [];
    const parent = createLogger(
      { season: "2026", stage: "regular" },
      { sink: (record) => records.push(record) },
    );
    const child = parent.child({ matchId: "m-42", stage: "playoff" });

    child.info("kickoff");

    expect(records[0].correlation).toEqual({
      season: "2026",
      stage: "playoff",
      matchId: "m-42",
    });
  });

  it("child()가 부모 sink/clock 설정을 그대로 물려받는다", () => {
    const records: LogRecord[] = [];
    const parent = createLogger(
      { season: "2026" },
      { clock: () => "FIXED", sink: (record) => records.push(record) },
    );

    parent.child({ matchId: "m-1" }).warn("late substitution");

    expect(records[0].timestamp).toBe("FIXED");
    expect(records[0].level).toBe("warn");
  });

  it("기본 sink는 레벨에 맞는 console 메서드로 JSON 문자열을 출력한다", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const logger = createLogger({ season: "2026" }, { clock: () => "FIXED" });
      logger.debug("hello", { n: 1 });

      expect(debugSpy).toHaveBeenCalledTimes(1);
      const parsed = JSON.parse(debugSpy.mock.calls[0][0] as string);
      expect(parsed).toEqual({
        level: "debug",
        message: "hello",
        timestamp: "FIXED",
        correlation: { season: "2026" },
        data: { n: 1 },
      });
    } finally {
      debugSpy.mockRestore();
    }
  });
});
