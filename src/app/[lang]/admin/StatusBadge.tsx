import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";

export interface StatusBadgeProps {
  readonly locale: SupportedLocale;
  readonly isPaused: boolean;
}

/**
 * G1/G3 공용 진행·정지 상태 표시(`docs/wireframe/07-어드민-운영콘솔.md` NFR-A11Y-002 —
 * "아이콘(▶/⏸) + 라벨 + 색 3중"). 순수 표시 컴포넌트라 서버·클라이언트 양쪽에서 그대로
 * 쓸 수 있다(hooks 없음) — G1(서버 컴포넌트)과 G3 `PauseResumeControl`(클라이언트)이
 * 같은 컴포넌트를 재사용한다(중복 회피).
 *
 * 색 사용 근거: `--warning`은 배경 대비가 낮아(1.34:1) 페이지 배경 위 단독 채움이
 * 금지되고 반드시 `--warning-foreground`와 배지 형태로 짝지어야 한다(globals.css 주석,
 * `CountdownTimer`의 기존 정지 배지와 동일 패턴 재사용). `--live`는 그 제약이 없어
 * `MatchCard`의 LIVE 표기와 동일하게 텍스트에 직접 쓴다.
 */
export function StatusBadge({ locale, isPaused }: StatusBadgeProps) {
  if (isPaused) {
    return (
      <span className="eyebrow inline-flex items-center gap-1 rounded-sm bg-warning px-1.5 py-1 text-warning-foreground">
        <span aria-hidden>⏸</span>
        {t(locale, "admin.status.paused")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-live">
      <span aria-hidden className="live-dot" />
      <span className="text-sm font-medium">
        <span aria-hidden>▶ </span>
        {t(locale, "admin.status.running")}
      </span>
    </span>
  );
}
