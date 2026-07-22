"use client";

import { useEffect, useState, useTransition } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { Button } from "@/components/ui/button";

import { toggleWorldPause } from "./actions";
import { formatElapsedClock } from "./elapsed";
import { StatusBadge } from "./StatusBadge";

export interface PauseResumeControlProps {
  readonly locale: SupportedLocale;
  readonly lang: string;
  readonly initialIsPaused: boolean;
  /** 경과 계산 앵커 — 정지 중이면 정지 진입 시각, 진행 중이면 마지막 배속 변경 시각 */
  readonly elapsedAnchor: string | null;
}

/**
 * G3 정지/재개(`docs/wireframe/07-어드민-운영콘솔.md` G3, FR-AD-002). I-4: 토글은 즉시
 * 반영하고, 정지 시 G1 카운트다운도 "일시정지 중"으로 전환된다(R-14 ④) — 이 컴포넌트가
 * `toggleWorldPause` 서버 액션으로 오버레이를 갱신하면 `revalidatePath`가 G1을 포함한
 * 페이지 전체를 다시 그린다.
 *
 * ## 경과 표시(`CountdownTimer`와 동일 패턴)
 * "지금"과 앵커의 차를 매초 재는 `Date.now()` 호출은 서버 컴포넌트 렌더 본문에 두면
 * react-hooks/purity(React Compiler)에 걸린다 — `CountdownTimer`처럼 `useEffect` 안에서만
 * 부수효과로 계산하고, 마운트 전에는 "--:--:--" placeholder로 하이드레이션 불일치를
 * 피한다.
 */
export function PauseResumeControl({ locale, lang, initialIsPaused, elapsedAnchor }: PauseResumeControlProps) {
  const [isPaused, setIsPaused] = useState(initialIsPaused);
  const [isPending, startTransition] = useTransition();
  const [elapsedLabel, setElapsedLabel] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      if (isPaused || !elapsedAnchor) {
        setElapsedLabel(null);
        return;
      }
      setElapsedLabel(formatElapsedClock(elapsedAnchor, Date.now()));
    };

    sync();
    if (isPaused) return;

    const intervalId = setInterval(sync, 1000);
    return () => clearInterval(intervalId);
  }, [elapsedAnchor, isPaused]);

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleWorldPause(lang);
      setIsPaused(result.isPaused);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:p-6">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "admin.pause.title")}</h2>

      <div className="flex items-center gap-2" role="status" aria-live="polite">
        <span className="text-sm text-muted-foreground">{t(locale, "admin.status.stateLabel")}</span>
        <StatusBadge locale={locale} isPaused={isPaused} />
      </div>

      {!isPaused && (
        <p className="scoreboard text-xs text-muted-foreground">
          {t(locale, "admin.pause.elapsedFormat", { elapsed: elapsedLabel ?? "--:--:--" })}
        </p>
      )}

      <Button
        type="button"
        variant={isPaused ? "default" : "outline"}
        onClick={handleToggle}
        disabled={isPending}
        className="self-start"
      >
        <span aria-hidden>{isPaused ? "▶" : "⏸"}</span>
        {t(locale, isPaused ? "admin.pause.resumeButton" : "admin.pause.pauseButton")}
      </Button>
    </section>
  );
}
