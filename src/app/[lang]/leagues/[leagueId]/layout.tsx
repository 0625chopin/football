import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { NavLink } from "@/components/ui/NavLink";
import { PhaseIndicator } from "@/components/state/PhaseIndicator";
import { SeasonSelect } from "@/components/composite/SeasonSelect";
import type { LeagueId } from "@/types";

/**
 * `/[lang]/leagues/[leagueId]` 세그먼트 레이아웃 — B1 리그 헤더 + B1-t 탭
 * (Task 016, 41일차 인계분, 5팀). `docs/wireframe/02-리그-순위표.md`·`03-일정-결과.md`
 * 두 화면이 공유하는 영역이며, 두 문서 §4 B1 행이 이 배치를 명시한다
 * ("✅ `src/app/leagues/[leagueId]/layout.tsx`로 구현 — 세그먼트 layout은 5팀 소유 확정",
 * W-16 해소, 2일차 팀장 판정). 순위표 페이지(`page.tsx`)가 39일차부터 자체 `<header>`로
 * 그리던 리그명·티어·팀수 블록을 오늘 이 레이아웃으로 옮기고, 그 페이지는 B2 이하만
 * 담당한다.
 *
 * ## 왜 세그먼트 레이아웃이 `searchParams`를 못 읽는가 (`node_modules/next/dist/docs/
 * 01-app/03-api-reference/03-file-conventions/layout.md` "Props" 절 참조)
 * 레이아웃은 `params`만 받고 `searchParams`는 받지 않는다(라우트 전환 시 재조회를 피하려는
 * 의도적 설계). 그래서 이 레이아웃이 그리는 라운드 진행("R21/46 · 정규시즌")은 **항상
 * 현재(라이브) 시즌 기준**이고, 사용자가 아래 시즌 선택기로 과거 시즌을 선택해도 이 줄은
 * 안 바뀐다 — 과거 시즌의 순위/일정 자체는 각 `page.tsx`가 `searchParams.season`을 읽어
 * 정확히 그 시즌 것을 보여준다(오늘 스코프는 이 정도로 충분하다고 판단 — 완료 보고 참조,
 * 필요하면 이슈로 남긴다).
 */
export default async function LeagueLayout(
  props: LayoutProps<"/[lang]/leagues/[leagueId]">,
) {
  const { lang, leagueId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const league = await dataSource.getLeague(leagueId as LeagueId);
  if (!league) {
    notFound();
  }

  const [season, seasons, roundBounds] = await Promise.all([
    dataSource.getCurrentSeason(),
    dataSource.getSeasons(),
    dataSource.getFixtureRoundBounds({ leagueId: league.id }),
  ]);

  const standingsHref = `/${locale}/leagues/${leagueId}`;
  const fixturesHref = `/${locale}/leagues/${leagueId}/fixtures`;

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold">{league.name}</h1>
            <span className="eyebrow text-muted-foreground">
              {t(locale, "league.header.tierLabel", { tier: league.tier })} ·{" "}
              {t(locale, "league.header.teamCountFormat", { count: league.teamCount })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {seasons.length > 0 && (
              <SeasonSelect
                locale={locale}
                seasons={seasons.map((s) => ({ id: s.id, seasonNumber: s.seasonNumber }))}
                currentSeasonId={season?.id ?? seasons[0].id}
              />
            )}
            {season && roundBounds.maxRound > 0 && (
              <PhaseIndicator
                locale={locale}
                season={season}
                round={{ current: roundBounds.currentRound, total: roundBounds.maxRound }}
              />
            )}
          </div>
        </div>

        {/* B1-t 탭 — 같은 `[leagueId]` 하위 라우트 전환(와이어프레임 02번 §4 B1-t,
            03번 §4 B1 "41일차 fixtures 화면과 공유"). `NavLink`(4팀 013A)를 그대로 쓴다 —
            좌우 초크 밑줄 활성 표시(`touchline-under-on`)가 이미 이 규약을 구현해 뒀다. */}
        <nav aria-label={t(locale, "league.tab.standingsLabel")} className="flex gap-1">
          <NavLink href={standingsHref} orientation="horizontal" exact>
            {t(locale, "league.tab.standingsLabel")}
          </NavLink>
          <NavLink href={fixturesHref} orientation="horizontal" exact>
            {t(locale, "league.tab.fixturesLabel")}
          </NavLink>
        </nav>
      </header>

      {props.children}
    </div>
  );
}
