import Link from "next/link";

import { t } from "@/i18n/t";
import { formatKickoff } from "@/i18n/format";
import type { SupportedLocale } from "@/i18n/locales";
import type { Timestamp } from "@/types";
import { cn } from "@/lib/utils";

/**
 * `/leagues/[leagueId]/fixtures` C1 라운드 네비게이션 — Task 016(41일차, 5팀), 화면 로컬.
 * 와이어프레임 `03-일정-결과.md` §4 C1, §6 I-2/I-3.
 *
 * ## 서버 컴포넌트로 충분한 이유
 * 라운드 이동은 순수 GET 네비게이션(`?round=N`)이다 — 클릭 시 상태를 클라이언트가 들고
 * 있을 필요가 없다(`LocaleSwitcher`처럼 즉시 리다이렉트가 필요한 것도 아니다). "현재
 * 선택된 라운드" 판정도 클라이언트 훅(`usePathname` 등) 없이 호출부가 이미 아는
 * `currentRound`(서버에서 `searchParams.round`를 읽어 넘김) prop 비교만으로 끝난다 —
 * 그래서 이 컴포넌트는 `"use client"` 없이 `<Link>`만으로 완결된다(JS 비활성 환경에서도
 * 동작, I-2 "URL 쿼리에 반영" 요구사항과도 정합).
 *
 * ## 칩 스트립은 자체 overflow-x:auto(NFR-RS-002, R-6)
 * 리그1은 46개 칩이 나온다 — 부모 폭과 무관하게 이 컨테이너 안에서만 가로 스크롤이
 * 발생하고 페이지 본문은 스크롤되지 않는다(320px NFR-RS-001).
 */
export interface RoundNavProps {
  readonly locale: SupportedLocale;
  /** 쿼리스트링을 붙일 기준 경로 — `/${locale}/leagues/${leagueId}/fixtures`. */
  readonly basePath: string;
  readonly currentRound: number;
  readonly minRound: number;
  readonly maxRound: number;
  /** 현재 화면에 진짜 "현재 진행 라운드"(기본 선택 대상) — "현재로" 버튼의 목적지이자
   *  비활성화 판정 기준. `getFixtureRoundBounds().currentRound`를 그대로 받는다. */
  readonly liveRound: number;
  /** 이 라운드의 킥오프 시각 — FR-LG-008상 한 라운드의 전 경기가 동일 시각에 킥오프하므로
   *  대표값 1개만 있으면 된다. 라운드에 경기가 없으면(방어적) null. */
  readonly kickoffAt: Timestamp | null;
  /** 라운드 이동 시 함께 보존할 시즌 쿼리 — 없으면 붙이지 않는다(현재 시즌 조회). */
  readonly seasonParam?: string;
  readonly className?: string;
}

function roundHref(basePath: string, round: number, seasonParam?: string): string {
  const params = new URLSearchParams({ round: String(round) });
  if (seasonParam) params.set("season", seasonParam);
  return `${basePath}?${params.toString()}`;
}

export function RoundNav({
  locale,
  basePath,
  currentRound,
  minRound,
  maxRound,
  liveRound,
  kickoffAt,
  seasonParam,
  className,
}: RoundNavProps) {
  const hasPrev = currentRound > minRound;
  const hasNext = currentRound < maxRound;
  const isOnLiveRound = currentRound === liveRound;
  const rounds = Array.from({ length: maxRound - minRound + 1 }, (_, i) => minRound + i);

  return (
    <nav aria-label={t(locale, "fixtures.round.navLabel")} className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2">
          <NavButton
            href={hasPrev ? roundHref(basePath, currentRound - 1, seasonParam) : null}
            label={t(locale, "fixtures.round.prevLabel")}
          >
            ◀
          </NavButton>
          <span className="scoreboard text-sm font-medium">
            {t(locale, "fixtures.round.label", { current: currentRound, total: maxRound })}
          </span>
          <NavButton
            href={hasNext ? roundHref(basePath, currentRound + 1, seasonParam) : null}
            label={t(locale, "fixtures.round.nextLabel")}
          >
            ▶
          </NavButton>
        </div>
        {/* "현재로" — 이미 현재 라운드를 보고 있으면 비활성(와이어프레임 §6 I-3). */}
        <NavButton href={isOnLiveRound ? null : roundHref(basePath, liveRound, seasonParam)} label={undefined}>
          {t(locale, "fixtures.round.currentLabel")}
        </NavButton>
      </div>

      {/* 칩 스트립 — NFR-A11Y-003: 선택 칩에 aria-current, 좌우 화살표 키 이동은 네이티브
          앵커 탭 순서로 대체(칩이 전부 포커스 가능한 링크라 Tab으로도 순회 가능). */}
      <div className="overflow-x-auto">
        <ul className="flex w-max items-center gap-1 py-0.5">
          {rounds.map((round) => {
            const isActive = round === currentRound;
            return (
              <li key={round}>
                <Link
                  href={roundHref(basePath, round, seasonParam)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={t(locale, "fixtures.round.chipAriaLabel", { round })}
                  className={cn(
                    // 가로 칩 스트립이라 `NavLink`(사이드바)의 수평 변형과 같은 관례를 쓴다
                    // — 좌측 바 대신 `touchline-under-on`(90도 돌린 초크 밑줄).
                    "touchline scoreboard inline-flex min-w-8 items-center justify-center rounded-md border px-2 py-1 text-xs transition-colors",
                    isActive
                      ? "touchline-under-on border-transparent font-semibold"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {round}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {kickoffAt && (
        <p className="text-xs text-muted-foreground">
          {t(locale, "fixtures.round.kickoffLabel", { time: formatKickoff(kickoffAt, locale, "dateTime") })}
        </p>
      )}
    </nav>
  );
}

/** 이전/다음/현재로 버튼 — 비활성 시(`href` null) `<button disabled>`로, 활성 시 `<Link>`로. */
function NavButton({
  href,
  label,
  children,
}: {
  readonly href: string | null;
  readonly label: string | undefined;
  readonly children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-sm transition-colors",
    href
      ? "border-border hover:bg-muted"
      : "border-border/50 text-muted-foreground/50 cursor-not-allowed",
  );

  if (!href) {
    return (
      <button type="button" disabled aria-label={label} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}
