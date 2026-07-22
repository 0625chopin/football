"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import type { CommonCode, CommonCodeApplyPolicy, CommonCodeValueType } from "@/types";
import type { CommonCodeGroupCode } from "@/lib/config/catalog";
import { getNumericRange, type NumericRange } from "@/lib/config/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { updateCommonCodeValue } from "./actions";

export interface ConfigEditFormProps {
  readonly locale: SupportedLocale;
  readonly lang: string;
  readonly groupCode: string;
  /** 그룹 대표 `valueType`(E-41, `catalog.ts`) — 현재 카탈로그엔 INT/DECIMAL/JSON만 있다
   * (`docs/wireframe/10-어드민공통코드-폼스펙.md` §2 "발견 1"). */
  readonly groupValueType: CommonCodeValueType;
  readonly applyPolicy: CommonCodeApplyPolicy;
  /** `applyPolicy==='NEXT_SEASON'` 배지 문구에 실제 다음 시즌 번호를 채우는 데만 쓴다
   * (`World.currentSeasonNumber`, 57일차 "발효 시점 지정"). 운영자가 바꿀 수 없는 표시값. */
  readonly currentSeasonNumber: number;
  readonly code: CommonCode;
}

const POLICY_KEY: Readonly<Record<CommonCodeApplyPolicy, TranslationKey>> = {
  NEXT_SEASON: "admin.config.edit.policyNextSeason",
  IMMEDIATE: "admin.config.edit.policyImmediate",
  NEXT_MARKET: "admin.config.edit.policyNextMarket",
};

/**
 * `CUP_PARAM.BYE_COUNT`류 — 그룹 `valueType`은 `JSON`이지만 실값은 스칼라 숫자 하나를
 * `{ value: N }`로만 감싼 형태다(`docs/wireframe/10-어드민공통코드-폼스펙.md` §4.2 —
 * "올바른 분기 신호는 `valueJson`을 파싱한 뒤의 값 형태(shape)뿐"). 이 판별을 만족하는
 * 코드만 숫자 입력 위젯으로 보여준다 — 나머지 JSON형(객체·배열 포함)은 그대로 JSON 에디터.
 */
function isScalarWrappedJson(value: Readonly<Record<string, unknown>>): value is { readonly value: number } {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === "value" && typeof value.value === "number";
}

/** `NumericRange`를 `"min ~ max"` 형태로 표기한다. 상/하한 중 하나만 있으면 그쪽만,
 * 둘 다 없으면(무제한) `null`을 반환해 호출부가 힌트 자체를 숨기게 한다. 부등호·단위 없는
 * 숫자만이라 로케일 문구가 필요 없다(en dash `~`만 사용, ko/en 공용). */
function formatRange(range: NumericRange): string | null {
  if (range.min === null && range.max === null) return null;
  if (range.min !== null && range.max !== null) return `${range.min} ~ ${range.max}`;
  if (range.min !== null) return `≥ ${range.min}`;
  return `≤ ${range.max}`;
}

/**
 * H3 편집 폼(`docs/wireframe/08-어드민-공통코드-스케줄러.md` H3) — Task 021(56~57일차) 스코프.
 * **57일차 추가**: ① 3팀 `getNumericRange`(`@/lib/config/schema`)로 숫자 위젯에 실시간
 * 범위 힌트/인라인 에러(I-4 "타입별 실시간 검증") ② 빈 입력 저장 거부(I-281 — 사유 필수
 * 검증과 같은 위치, `numberError`가 사유 검증과 동일하게 저장 버튼을 막는다) ③ `NEXT_SEASON`
 * 정책 배지에 실제 다음 시즌 번호 표기. 서버 액션(`./actions.ts`)이 여전히 3팀
 * `validateCommonCodeValue`로 최종 판정하며, 이 클라이언트 검증은 그 신뢰 경계를 대체하지
 * 않는다 — 서버 실패 메시지는 그대로 폼 하단에 노출한다(기존 56일차 동작 유지).
 */
export function ConfigEditForm({
  locale,
  lang,
  groupCode,
  groupValueType,
  applyPolicy,
  currentSeasonNumber,
  code,
}: ConfigEditFormProps) {
  const isJsonGroup = groupValueType === "JSON";
  const scalarWrapped = isJsonGroup && code.valueJson !== null && isScalarWrappedJson(code.valueJson);
  const useJsonEditor = isJsonGroup && !scalarWrapped;

  const initialNumberText = scalarWrapped
    ? String((code.valueJson as { readonly value: number }).value)
    : String(code.valueNum ?? "");
  const initialJsonText = code.valueJson !== null ? JSON.stringify(code.valueJson, null, 2) : "{}";

  const [numberText, setNumberText] = useState(initialNumberText);
  const [jsonText, setJsonText] = useState(initialJsonText);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 숫자 위젯(순수 NUMBER 또는 스칼라 래핑 JSON)에만 적용 — 범위 메타데이터는 코드 레벨
  // (`getNumericRange`)이라 순수 JSON 에디터(객체/배열)는 대상이 아니다(08문서 H3 비고).
  const range = !useJsonEditor ? getNumericRange(groupCode as CommonCodeGroupCode, code.code) : null;
  const rangeHint = range ? formatRange(range) : null;

  function computeNumberError(): string | null {
    const trimmed = numberText.trim();
    if (trimmed === "") return t(locale, "admin.config.edit.valueRequired");
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return t(locale, "admin.config.edit.invalidNumber");
    if (range && ((range.min !== null && parsed < range.min) || (range.max !== null && parsed > range.max))) {
      return t(locale, "admin.config.edit.rangeOutOfRange", { range: rangeHint ?? "" });
    }
    return null;
  }
  const numberError = !useJsonEditor ? computeNumberError() : null;

  const canSave = reason.trim().length > 0 && numberError === null && !isPending;
  const policyLabel =
    applyPolicy === "NEXT_SEASON"
      ? t(locale, "admin.config.edit.policyNextSeasonWithSeason", { season: currentSeasonNumber + 1 })
      : t(locale, POLICY_KEY[applyPolicy]);

  function handleSave() {
    const trimmedReason = reason.trim();
    setFormError(null);
    setSavedMessage(null);

    const value = useJsonEditor
      ? ({ kind: "JSON", raw: jsonText } as const)
      : scalarWrapped
        ? ({ kind: "JSON", raw: JSON.stringify({ value: Number(numberText.trim()) }) } as const)
        : ({ kind: "NUMBER", raw: Number(numberText.trim()) } as const);

    startTransition(async () => {
      const result = await updateCommonCodeValue(lang, {
        groupCode,
        code: code.code,
        reason: trimmedReason,
        value,
      });
      if (result.ok) {
        setSavedMessage(t(locale, "admin.config.edit.savedMessage"));
      } else {
        setFormError(result.message);
      }
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.config.edit.title")}</h2>
        <Badge variant="secondary">{policyLabel}</Badge>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-sm font-medium">{code.code}</span>
        {/* D-18 예외 — description은 번역 카탈로그를 거치지 않고 원문(ko) 그대로 표시한다
            (`docs/wireframe/08-어드민-공통코드-스케줄러.md` "D-18 예외" 절). */}
        {code.description && <p className="text-xs text-muted-foreground">{code.description}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="config-edit-value" className="text-sm font-medium">
          {t(locale, "admin.config.edit.valueLabel")}
          {code.unit && <span className="text-muted-foreground"> ({code.unit})</span>}
        </label>
        {useJsonEditor ? (
          <textarea
            id="config-edit-value"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            placeholder={t(locale, "admin.config.edit.jsonPlaceholder")}
            rows={8}
            className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
          />
        ) : (
          <>
            <input
              id="config-edit-value"
              type="number"
              step={groupValueType === "INT" ? 1 : 0.01}
              value={numberText}
              onChange={(event) => setNumberText(event.target.value)}
              aria-invalid={numberError ? true : undefined}
              aria-describedby={numberError ? "config-edit-value-error" : rangeHint ? "config-edit-value-hint" : undefined}
              className="scoreboard h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
            />
            {numberError ? (
              <p id="config-edit-value-error" role="alert" className="text-xs text-destructive">
                {numberError}
              </p>
            ) : (
              rangeHint && (
                <p id="config-edit-value-hint" className="text-xs text-muted-foreground">
                  {t(locale, "admin.config.edit.rangeHint", { range: rangeHint })}
                </p>
              )
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="config-edit-reason" className="text-sm font-medium">
          {t(locale, "admin.config.edit.reasonLabel")}
        </label>
        <textarea
          id="config-edit-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t(locale, "admin.config.edit.reasonPlaceholder")}
          rows={2}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </div>

      {formError && (
        <p role="alert" className="text-xs text-destructive">
          {formError}
        </p>
      )}
      {savedMessage && !isPending && (
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {savedMessage}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={!canSave}>
          {t(locale, "admin.config.edit.saveButton")}
        </Button>
      </div>
    </section>
  );
}
