import { describe, expect, it } from "vitest";
import { parseForm } from "./form";

describe("parseForm", () => {
  it("WWDLW를 5개 결과 배열로 분해한다", () => {
    expect(parseForm("WWDLW")).toEqual(["W", "W", "D", "L", "W"]);
  });

  it("빈 문자열은 빈 배열이 된다", () => {
    expect(parseForm("")).toEqual([]);
  });

  it("공백은 제거하고 분해한다", () => {
    expect(parseForm("W W D")).toEqual(["W", "W", "D"]);
  });

  it("W/D/L 이외 문자는 걸러낸다(예외를 던지지 않는다)", () => {
    expect(parseForm("W?D#L")).toEqual(["W", "D", "L"]);
  });
});
