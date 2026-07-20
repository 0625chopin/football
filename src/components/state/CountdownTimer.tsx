"use client";

import { useEffect, useState } from "react";
import { formatCountdownClock } from "@/i18n/format";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type { SupportedLocale } from "@/i18n/locales";
import type { Timestamp } from "@/types";
import { cn } from "@/lib/utils";

const DEFAULT_LABEL_KEY: TranslationKey = "common.countdown.nextKickoffLabel";

export interface CountdownTimerProps {
  readonly locale: SupportedLocale;
  /** 다음 킥오프 등 목표 시각 — 서버가 배속을 반영해 이미 산출한 실제 타임스탬프 */
  readonly targetAt: Timestamp;
  /** 월드 정지 상태(`World.isPaused`, E-01). true면 tick을 멈추고 "일시정지 중"을 표기한다 */
  readonly isPaused: boolean;
  /** 기본값은 "다음 킥오프" — 다른 문맥(어드민 콘솔 등)에서 재사용 시 override */
  readonly labelKey?: TranslationKey;
  readonly className?: string;
}

/**
 * 목표 시각까지 남은 실시간을 1초 tick으로 표시한다(`docs/wireframe/00-공통규약.md` R-14).
 *
 * ## 왜 월드시간 환산(H-24)을 쓰지 않는가
 * R-14 ②가 명시적으로 배제한다 — `targetAt`은 이미 서버가 배속을 반영해 산출한 **실제
 * 타임스탬프**(FR-AD-001)이므로, 여기서 다시 `worldMinutesAt` 등으로 환산하면 배속이
 * 이중 적용된다. 이 컴포넌트는 `targetAt`과 로컬 시계(`Date.now()`)의 실시간 차이만
 * 잰다 — `src/lib/sim/**`가 아니라 `components/state/**`라 `Date.now()` 사용이 금지되지
 * 않는다(NFR-DT-001은 시뮬레이션 순수 계층에만 적용).
 *
 * ## 재동기화(R-14 ③)
 * 이 컴포넌트 자체는 구독 메커니즘을 갖지 않는다(H-24 계약 밖, 소비처 책임 —
 * `docs/handoff/H-24-worldclock-realtime-contract.md` §5). 소비처가 배속·정지 변경을
 * 구독해(`shouldResyncWorldClock`) `targetAt`/`isPaused` prop을 새 값으로 갱신해 주면,
 * 아래 `useEffect`의 deps(`targetAt`, `isPaused`)가 바뀌어 tick 앵커가 자동으로
 * 재설정된다 — 배속 변경 시 표시가 불연속적으로 점프하는 것이 정상이다(R-14 ⑤, 보간
 * 애니메이션을 넣지 않는다).
 *
 * ## 정지 상태(R-14 ④)
 * `isPaused`가 true면 tick을 멈추고 "일시정지 중"만 표기한다 — 정지 구간 오프셋 자체의
 * 산출은 H-24 ③(`applyPause`/`applyResume`) 소관이며 이 컴포넌트는 그 결과(`isPaused`)만
 * 소비한다.
 *
 * ## 하이드레이션 안전
 * 마운트 전(서버 렌더·최초 클라이언트 렌더)에는 항상 "--:--:--" placeholder를 그린다.
 * `Date.now()`를 렌더 중에 직접 호출하면 서버 렌더 시각과 클라 하이드레이션 시각이
 * 달라 mismatch가 나므로, 실제 계산은 `useEffect`(마운트 후에만 실행)로 미룬다.
 */
export function CountdownTimer({
  locale,
  targetAt,
  isPaused,
  labelKey = DEFAULT_LABEL_KEY,
  className,
}: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    // 정지/진행 두 분기 모두 상태 갱신을 이 지역 함수 하나로 모아 두 번 호출한다
    // (effect 본문 최상위에서 직접 `setRemainingMs(...)`를 호출하면
    // `react-hooks/set-state-in-effect`가 cascading render 위험으로 잡는다 — 첫 호출은
    // "마운트 시 외부 시계와 동기화"라는 의도된 부수효과이므로 억제가 아니라 헬퍼 함수로
    // 감싸 규칙이 요구하는 형태를 맞춘다).
    const sync = () => {
      if (isPaused) {
        setRemainingMs(null);
        return;
      }
      const targetMs = new Date(targetAt).getTime();
      setRemainingMs(targetMs - Date.now());
    };

    sync();
    if (isPaused) return;

    const intervalId = setInterval(sync, 1000);
    return () => clearInterval(intervalId);
  }, [targetAt, isPaused]);

  return (
    <div className={cn("flex items-center gap-1.5 text-sm", className)}>
      <span className="text-muted-foreground">{t(locale, labelKey)}</span>
      {isPaused ? (
        // --warning-foreground는 페이지 배경 위 단독 사용이 금지된 토큰이다(다크 모드
        // 대비 1.54:1 — globals.css 25일차 주석). 반드시 --warning 배경 위에서만 쓴다
        // (그 조합은 8.2~9.6:1로 충분) — 그래서 텍스트만 색칠하지 않고 --warning 배경
        // 배지로 감싼다.
        <span className="rounded bg-warning px-1.5 py-0.5 font-medium text-warning-foreground">
          {t(locale, "common.countdown.paused")}
        </span>
      ) : (
        <span className="font-medium tabular-nums">
          {remainingMs === null ? "--:--:--" : formatCountdownClock(remainingMs)}
        </span>
      )}
    </div>
  );
}
