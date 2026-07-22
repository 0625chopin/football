"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import type { CommonCode, CommonCodeApplyPolicy, CommonCodeValueType } from "@/types";
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

/**
 * H3 편집 폼(`docs/wireframe/08-어드민-공통코드-스케줄러.md` H3) — Task 021(56일차) 스코프.
 * **범위 검증 인라인 에러·발효 시점 지정·변경 이력(H4)은 57일차 스코프라 여기 없다** —
 * 서버 액션(`./actions.ts`)이 3팀 `validateCommonCodeValue`로 최종 판정하고, 실패하면
 * 필드별 인라인이 아니라 폼 하단에 그 메시지를 그대로 보여주는 선까지만 오늘 구현한다.
 * 발효 정책(H3-p)은 그룹마다 고정이라 배지로 **표시만** 한다(운영자가 바꿀 수 없음, 08문서).
 */
export function ConfigEditForm({ locale, lang, groupCode, groupValueType, applyPolicy, code }: ConfigEditFormProps) {
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

  const canSave = reason.trim().length > 0 && !isPending;

  function handleSave() {
    const trimmedReason = reason.trim();
    setFormError(null);
    setSavedMessage(null);

    const value = useJsonEditor
      ? ({ kind: "JSON", raw: jsonText } as const)
      : scalarWrapped
        ? ({ kind: "JSON", raw: JSON.stringify({ value: Number(numberText) }) } as const)
        : ({ kind: "NUMBER", raw: Number(numberText) } as const);

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
        <Badge variant="secondary">{t(locale, POLICY_KEY[applyPolicy])}</Badge>
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
          <input
            id="config-edit-value"
            type="number"
            step={groupValueType === "INT" ? 1 : 0.01}
            value={numberText}
            onChange={(event) => setNumberText(event.target.value)}
            className="scoreboard h-9 w-full max-w-[200px] rounded-md border border-input bg-background px-3 text-sm"
          />
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
