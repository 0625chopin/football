"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";

import { confirmWorldReset } from "./actions";
import { DangerConfirmDialog, type DangerConfirmDialogStep2Input } from "./DangerConfirmDialog";

export interface WorldResetPanelProps {
  readonly locale: SupportedLocale;
  readonly lang: string;
}

type SubmitState = { readonly status: "idle" } | { readonly status: "accepted" } | { readonly status: "error" };

/**
 * G5 월드 리셋 위험 영역(`docs/wireframe/07-어드민-운영콘솔.md` G5, I-13). 다른 카드와
 * 시각적으로 격리한다 — `border-destructive` 2중 테두리 + 위험 톤 배경으로 "실수로 다른
 * 조작과 나란히 클릭되지 않게"(3-2절) 한다.
 *
 * ⚠️ **이 컴포넌트는 실제로 월드를 리셋하지 않는다.** `confirmWorldReset` 서버 액션은
 * 2단계 확인을 통과한 "요청"만 감사 로그에 남기고 실행은 하지 않는다 — 근거는
 * `./actions.ts`의 `confirmWorldReset` 주석 참조(I-13 + 55일차 팀장 지시).
 */
export function WorldResetPanel({ locale, lang }: WorldResetPanelProps) {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  function handleConfirm(input: DangerConfirmDialogStep2Input) {
    startTransition(async () => {
      try {
        await confirmWorldReset(lang, {
          reason: input.reason,
          confirmText: input.confirmText,
          archiveOrDelete: input.archiveOrDelete,
          newSeed: input.newSeed || undefined,
        });
        setSubmitState({ status: "accepted" });
      } catch {
        setSubmitState({ status: "error" });
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border-2 border-destructive bg-destructive/5 p-4 md:p-6">
      <h2 className="eyebrow text-destructive">{t(locale, "admin.reset.title")}</h2>

      <p className="rounded-md bg-warning px-3 py-2 text-sm text-warning-foreground">
        <span aria-hidden>⚠ </span>
        <strong>{t(locale, "admin.reset.warningTitle")}</strong>
        <br />
        {t(locale, "admin.reset.warningBody")}
      </p>

      <DangerConfirmDialog
        locale={locale}
        triggerLabel={t(locale, "admin.reset.openButton")}
        onConfirm={handleConfirm}
        isPending={isPending}
        className="self-start"
      />

      {submitState.status === "accepted" && (
        <p className="text-sm text-muted-foreground" role="status">
          {t(locale, "admin.reset.acceptedMessage")}
        </p>
      )}
      {submitState.status === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {t(locale, "admin.reset.errorMessage")}
        </p>
      )}
    </section>
  );
}
