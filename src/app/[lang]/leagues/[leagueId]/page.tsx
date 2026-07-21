import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { StandingsTable, type StandingRowData } from "@/components/composite/StandingsTable";
import { ZoneLegend } from "@/components/composite/ZoneLegend";
import { resolveStandingZone } from "@/components/composite/standings-zone";
import type { LeagueId } from "@/types";

/**
 * `/[lang]/leagues/[leagueId]` 순위표 — Task 016(39일차, 5팀), 와이어프레임
 * `docs/wireframe/02-리그-순위표.md` B1(간이)·B2(존 범례)·B3(순위 테이블) 구현.
 *
 * ## 오늘 스코프
 * 오늘 팀장 지시 범위는 순위·팀·경기·승무패·득실·승점·최근5경기(`FormStrip`) + 존 표기
 * (NFR-A11Y-002 색+아이콘+라벨 3중)다. 와이어프레임의 B1-t(탭)·B4(타이브레이커 주석)·
 * B5(리그3 리빌드 제재 안내)·시즌 선택기(UC-011 아카이브 연동)는 Task 016 잔여 스코프
 * (39~40일차 중 40일차분)로 남겨 둔다 — 오늘 임의로 채우지 않는다.
 *
 * ## 순위·승점 계산은 2팀 엔진 산출물을 그대로 쓴다
 * `Standing.rank`/`points`/`gd` 등은 2팀이 38일차 Task 026(타이브레이커 포함 순위 산정)에서
 * 이미 계산해 `DataSource.getStandings()`가 반환한다. 이 페이지는 정렬·재계산을 하지
 * 않고 그 값을 그대로 표시만 한다 — 순위 규칙이 여기서 다시 구현되면 두 곳의 판정이
 * 어긋날 수 있다(와이어프레임 I-7 "정렬 없음. FR-LG-005 순위 규칙이 유일한 정렬").
 *
 * ## 존(zone) 판별은 파생값 — 저장되지 않는다
 * 승격/플레이오프/강등 여부는 `Standing`에 필드로 없다(순위 + 리그 슬롯 설정에서 매 렌더
 * 파생). `resolveStandingZone`(`./standings-zone.ts`)이 그 공식을 담당하고, `StandingsTable`·
 * `ZoneLegend` 둘 다 이 한 곳만 참조한다.
 */
export default async function Page(
  props: PageProps<"/[lang]/leagues/[leagueId]">,
) {
  const { lang, leagueId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const league = await dataSource.getLeague(leagueId as LeagueId);
  if (!league) {
    notFound();
  }

  const [season, standings] = await Promise.all([
    dataSource.getCurrentSeason(),
    dataSource.getStandings({ leagueId: league.id }),
  ]);

  const teams = await dataSource.getTeamsByIds(standings.map((standing) => standing.teamId));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const isSeasonLive = season !== null && standings.length > 0;
  const seasonLabel = season ? t(locale, "league.header.seasonLabel", { number: season.seasonNumber }) : "";

  const rows: StandingRowData[] = isSeasonLive
    ? [...standings]
        .sort((a, b) => a.rank - b.rank)
        .map((standing) => {
          // 팀 배치 조회(`getTeamsByIds`)는 순위표가 넘긴 teamId 전량으로 조회했으므로
          // 여기서 항상 찾아진다(데이터 정합성 전제 — Standing이 존재하지 않는 팀을
          // 가리키는 것은 구조적으로 불가능하다).
          const team = teamById.get(standing.teamId)!;
          return {
            rank: standing.rank,
            zone: resolveStandingZone(standing.rank, league),
            teamId: standing.teamId,
            team,
            played: standing.played,
            won: standing.won,
            drawn: standing.drawn,
            lost: standing.lost,
            gf: standing.gf,
            ga: standing.ga,
            gd: standing.gd,
            points: standing.points,
            form: standing.form,
          };
        })
    : [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold">{league.name}</h1>
        <span className="eyebrow text-muted-foreground">
          {t(locale, "league.header.tierLabel", { tier: league.tier })} ·{" "}
          {t(locale, "league.header.teamCountFormat", { count: league.teamCount })}
        </span>
      </header>

      {isSeasonLive && <ZoneLegend locale={locale} league={league} />}

      <StandingsTable
        locale={locale}
        state={
          isSeasonLive
            ? { status: "ready", data: { leagueName: league.name, seasonLabel, rows } }
            : { status: "empty" }
        }
      />
    </div>
  );
}
