/** 승/무/패 최근 폼 결과 한 글자(Standing.form·TeamSeasonStat.currentForm 원본 문자 그대로). */
export type FormResult = "W" | "D" | "L";

const FORM_RESULTS: ReadonlySet<string> = new Set(["W", "D", "L"]);

function isFormResult(char: string): char is FormResult {
  return FORM_RESULTS.has(char);
}

/**
 * "WWDLW" 등 최근 폼 문자열을 결과 배열로 분해한다. 공백은 제거하고, W/D/L 이외 문자는
 * (아직 확정되지 않은 향후 표기·오염 데이터 방어 목적으로) 조용히 걸러낸다 — 예외를 던지지
 * 않는 순수 함수로 유지한다(radar.ts 선례와 동일한 원칙).
 */
export function parseForm(form: string): FormResult[] {
  const chars = form.replace(/\s+/g, "").split("");
  return chars.filter(isFormResult);
}
