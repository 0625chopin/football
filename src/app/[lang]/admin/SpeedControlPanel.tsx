"use client";

import { useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { applySpeedMultiplier } from "./actions";

const MIN_SPEED_MULTIPLIER = 0.25;
const MAX_SPEED_MULTIPLIER = 20;
const SPEED_STEP = 0.25;
const SPEED_PRESETS = [1, 5, 20] as const;

export interface SpeedControlPanelProps {
  readonly locale: SupportedLocale;
  /** 현재 로케일 라우트 세그먼트 — 적용 후 `revalidatePath(`/${lang}/admin`)` 대상 */
  readonly lang: string;
  readonly initialSpeedMultiplier: number;
}

/**
 * G2 배속 제어(`docs/wireframe/07-어드민-운영콘솔.md` G2, FR-AD-001). "화면 로컬" 신규
 * 컴포넌트라 `src/components/composite/`로 승격하지 않고 라우트 폴더에 둔다(와이어프레임
 * 8절 표 그대로).
 *
 * I-2/I-3 인터랙션: 슬라이더 드래그는 **로컬 미리보기만**(서버 미반영), `[적용]` 클릭
 * 시에만 `applySpeedMultiplier` 서버 액션을 호출한다 — 매 드래그 tick마다 서버를 부르지
 * 않는다.
 */
export function SpeedControlPanel({ locale, lang, initialSpeedMultiplier }: SpeedControlPanelProps) {
  const [previewValue, setPreviewValue] = useState(initialSpeedMultiplier);
  const [appliedValue, setAppliedValue] = useState(initialSpeedMultiplier);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    startTransition(async () => {
      const result = await applySpeedMultiplier(lang, previewValue);
      setAppliedValue(result.speedMultiplier);
      setPreviewValue(result.speedMultiplier);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.speed.title")}</h2>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t(locale, "admin.speed.multiplierFormat", { value: MIN_SPEED_MULTIPLIER })}</span>
          <span>{t(locale, "admin.speed.multiplierFormat", { value: MAX_SPEED_MULTIPLIER })}</span>
        </div>
        {/* 터치 타깃 44px 이상(NFR-RS-001) — 트랙 자체는 얇아도 컨테이너 높이로 탭 영역 확보 */}
        <div className="flex h-11 items-center">
          <input
            type="range"
            min={MIN_SPEED_MULTIPLIER}
            max={MAX_SPEED_MULTIPLIER}
            step={SPEED_STEP}
            value={previewValue}
            aria-label={t(locale, "admin.speed.sliderLabel")}
            aria-valuetext={t(locale, "admin.speed.multiplierFormat", { value: previewValue })}
            onChange={(event) => setPreviewValue(Number(event.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="scoreboard text-lg" role="status" aria-live="polite">
          {t(locale, "admin.speed.currentFormat", { value: previewValue })}
        </span>
        <div className="flex gap-1.5">
          {SPEED_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={previewValue === preset ? "default" : "outline"}
              onClick={() => setPreviewValue(preset)}
              className={cn(previewValue === preset && "touchline touchline-on")}
            >
              {t(locale, "admin.speed.multiplierFormat", { value: preset })}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleApply} disabled={isPending}>
          {t(locale, "admin.speed.applyButton")}
        </Button>
        {!isPending && (
          <p className="text-xs text-muted-foreground">
            {t(locale, "admin.speed.appliedFormat", { value: appliedValue })}
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t(locale, "admin.speed.disclaimer")}</p>
    </section>
  );
}
