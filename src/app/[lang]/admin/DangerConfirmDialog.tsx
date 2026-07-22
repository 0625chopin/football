"use client";

import { useState } from "react";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WORLD_RESET_CONFIRMATION_WORD, isWorldResetConfirmValid } from "./reset-validation";

export interface DangerConfirmDialogStep2Input {
  readonly reason: string;
  readonly confirmText: string;
  readonly archiveOrDelete: "ARCHIVE" | "DELETE";
  readonly newSeed: string;
}

export interface DangerConfirmDialogProps {
  readonly locale: SupportedLocale;
  readonly triggerLabel: string;
  readonly onConfirm: (input: DangerConfirmDialogStep2Input) => void | Promise<void>;
  readonly isPending: boolean;
  readonly className?: string;
}

/**
 * G5 "2단계 확인 + 사유 입력" 게이트(`docs/wireframe/07-어드민-운영콘솔.md` G5 상세,
 * RS-1~RS-2, I-13). **서로 다른 두 모달**로 나뉜다(RS-1) — 1단계는 의도 확인 +
 * 아카이브/삭제 선택, 2단계는 새 시드(선택)·사유(필수)·확인 문구 타이핑이다.
 *
 * radix-ui `AlertDialog`를 직접 쓴다(`Tabs`/`Avatar` 등 기존 `components/ui/*`와 동일
 * 의존성, 이미 런타임 의존성 8종에 포함) — 화면 로컬 컴포넌트라 `components/ui/`에 새
 * 프리미티브를 추가하지 않는다(4팀 소유 경로 침범 회피). `AlertDialog`는 명시적 액션 없이
 * 바깥 클릭으로 닫히지 않아 위험 조작에 적합하고, `Escape`는 기본적으로 즉시 취소로
 * 이어진다(NFR-A11Y-003 "Esc로 각 단계 취소, 재확인 없이 즉시 취소").
 *
 * `docs/wireframe/07-어드민-운영콘솔.md` §8: "71일차 040 보이드/강제정산 UI에서도 재사용
 * 후보 — 그때 composite 승격 여부 판단." 지금은 화면 로컬로 두고 재사용 시점에 판단한다.
 */
export function DangerConfirmDialog({
  locale,
  triggerLabel,
  onConfirm,
  isPending,
  className,
}: DangerConfirmDialogProps) {
  const [step, setStep] = useState<"closed" | "step1" | "step2">("closed");
  const [archiveOrDelete, setArchiveOrDelete] = useState<"ARCHIVE" | "DELETE">("ARCHIVE");
  const [newSeed, setNewSeed] = useState("");
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  function resetFormState() {
    setArchiveOrDelete("ARCHIVE");
    setNewSeed("");
    setReason("");
    setConfirmText("");
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setStep("closed");
      resetFormState();
      return;
    }
    setStep("step1");
  }

  const canConfirm = isWorldResetConfirmValid(reason, confirmText);

  async function handleConfirmClick() {
    if (!canConfirm) return;
    await onConfirm({ reason, confirmText, archiveOrDelete, newSeed });
    setStep("closed");
    resetFormState();
  }

  return (
    <AlertDialogPrimitive.Root open={step !== "closed"} onOpenChange={handleOpenChange}>
      <AlertDialogPrimitive.Trigger asChild>
        <Button type="button" variant="destructive" className={className}>
          <span aria-hidden>⚠</span>
          {triggerLabel}
        </Button>
      </AlertDialogPrimitive.Trigger>

      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />

        {step === "step1" && (
          <AlertDialogPrimitive.Content
            className={cn(
              "fixed z-50 flex flex-col gap-4 border border-destructive bg-card p-4 shadow-lg",
              // NFR-RS: 320px에서 전체화면 시트, md 이상에서 중앙 정렬 모달(§7 "위험 조작 대비").
              "inset-0 overflow-y-auto md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[85vh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg",
            )}
          >
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-destructive">
              {t(locale, "admin.reset.step1Title")}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description asChild>
              <div className="flex flex-col gap-3 text-sm">
                <p className="font-medium">{t(locale, "admin.reset.step1Question")}</p>
                <p className="rounded-md bg-warning px-3 py-2 text-warning-foreground">
                  <span aria-hidden>⚠ </span>
                  {t(locale, "admin.reset.warningBody")}
                </p>

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-muted-foreground">
                    {t(locale, "admin.reset.retentionLegend")}
                  </legend>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="archiveOrDelete"
                      value="ARCHIVE"
                      checked={archiveOrDelete === "ARCHIVE"}
                      onChange={() => setArchiveOrDelete("ARCHIVE")}
                    />
                    {t(locale, "admin.reset.retentionArchive")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="archiveOrDelete"
                      value="DELETE"
                      checked={archiveOrDelete === "DELETE"}
                      onChange={() => setArchiveOrDelete("DELETE")}
                    />
                    {t(locale, "admin.reset.retentionDelete")}
                  </label>
                </fieldset>
              </div>
            </AlertDialogPrimitive.Description>

            <div className="mt-2 flex justify-end gap-2">
              <AlertDialogPrimitive.Cancel asChild>
                <Button type="button" variant="outline">
                  {t(locale, "admin.reset.cancelButton")}
                </Button>
              </AlertDialogPrimitive.Cancel>
              <Button type="button" variant="destructive" onClick={() => setStep("step2")}>
                {t(locale, "admin.reset.continueButton")}
              </Button>
            </div>
          </AlertDialogPrimitive.Content>
        )}

        {step === "step2" && (
          <AlertDialogPrimitive.Content
            className={cn(
              "fixed z-50 flex flex-col gap-4 border border-destructive bg-card p-4 shadow-lg",
              "inset-0 overflow-y-auto md:inset-auto md:top-1/2 md:left-1/2 md:max-h-[85vh] md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg",
            )}
          >
            <AlertDialogPrimitive.Title className="text-lg font-semibold text-destructive">
              {t(locale, "admin.reset.step2Title")}
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description asChild>
              <div className="flex flex-col gap-3 text-sm">
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{t(locale, "admin.reset.newSeedLabel")}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newSeed}
                    onChange={(event) => setNewSeed(event.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">{t(locale, "admin.reset.reasonLabel")}</span>
                  <textarea
                    required
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={t(locale, "admin.reset.reasonPlaceholder")}
                    rows={3}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    {t(locale, "admin.reset.confirmWordInstructionFormat", {
                      word: WORLD_RESET_CONFIRMATION_WORD,
                    })}
                  </span>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    placeholder={t(locale, "admin.reset.confirmWordPlaceholder")}
                    className="scoreboard h-9 rounded-md border border-border bg-background px-2 text-sm"
                  />
                </label>
              </div>
            </AlertDialogPrimitive.Description>

            <div className="mt-2 flex flex-col gap-2">
              {!canConfirm && (
                <p className="text-xs text-muted-foreground">
                  {t(locale, "admin.reset.confirmButtonDisabledHint")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <AlertDialogPrimitive.Cancel asChild>
                  <Button type="button" variant="outline">
                    {t(locale, "admin.reset.cancelButton")}
                  </Button>
                </AlertDialogPrimitive.Cancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!canConfirm || isPending}
                  onClick={handleConfirmClick}
                >
                  {t(locale, "admin.reset.confirmButton")}
                </Button>
              </div>
            </div>
          </AlertDialogPrimitive.Content>
        )}
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
