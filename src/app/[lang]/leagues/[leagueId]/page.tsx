import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { StandingsTable, type StandingRowData } from "@/components/composite/StandingsTable";
import { ZoneLegend } from "@/components/composite/ZoneLegend";
import { isZoneBoundaryAdjacent, resolveStandingZone } from "@/components/composite/standings-zone";
import { TiebreakNote } from "@/components/composite/TiebreakNote";
import { buildTiebreakNoteBlocks } from "@/components/composite/tiebreak-note";
import type { LeagueId, SeasonId } from "@/types";

/**
 * `/[lang]/leagues/[leagueId]` 순위표 — Task 016(39~41일차, 5팀), 와이어프레임
 * `docs/wireframe/02-리그-순위표.md` B2(존 범례)·B3(순위 테이블)·B4(타이브레이커)·
 * B5(리빌드 제재) 구현. B1(리그 헤더·탭)은 41일차부터 세그먼트 레이아웃
 * (`./layout.tsx`, W-16)이 담당한다 — 이 파일에서 중복으로 그리지 않는다.
 *
 * ## 41일차 추가분(40일차 인계)
 * ① **B4 노이즈 스코프 판단** — `isZoneBoundaryAdjacent`(`standings-zone.ts`)로 존 경계와
 * 무관한 중위권 동률 블록을 걸러낸다. 그 함수 헤더에 결론과 근거를 적었다.
 * ② **B5 리그3 리빌드 제재 안내** — `league.tier === 3`일 때만 렌더(FR-LG-007, 조건부 영역).
 * ③ **시즌 선택기 연동** — `searchParams.season`을 `getStandings`의 `seasonId`로 전달한다.
 * `MockDataSource.getSeasons()`가 오늘 1건만 반환해(과거 시즌 생성기 없음, 파일 헤더 참조)
 * 실질적으로 선택지가 없지만, 배선 자체는 아카이브 시즌이 늘어나는 순간 그대로 동작한다.
 * B4 두 번째 줄(TIEBREAK Fixture 예정 안내)은 Mock 재경기 생성기 부재로 계속 제외한다
 * (40일차 판단 유지, `docs/dailyWorkLog/40Day.md` 참조).
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
  const searchParams = await props.searchParams;
  const seasonId = typeof searchParams.season === "string" ? (searchParams.season as SeasonId) : undefined;

  await bootstrapApp();
  const dataSource = getDataSource();

  const league = await dataSource.getLeague(leagueId as LeagueId);
  if (!league) {
    notFound();
  }

  const [season, standings] = await Promise.all([
    dataSource.getCurrentSeason(),
    dataSource.getStandings({ leagueId: league.id, seasonId }),
  ]);

  const teams = await dataSource.getTeamsByIds(standings.map((standing) => standing.teamId));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const isSeasonLive = season !== null && standings.length > 0;
  const seasonLabel = season ? t(locale, "league.header.seasonLabel", { number: season.seasonNumber }) : "";

  const sortedStandings = isSeasonLive ? [...standings].sort((a, b) => a.rank - b.rank) : [];

  const rows: StandingRowData[] = sortedStandings.map((standing) => {
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
  });

  // B4 — `Standing.tiebreakApplied`(2팀 Task 026)에서 파생되는 값이라 별도 조회 없이
  // 이미 받아 둔 순위 배열에서 바로 뽑는다(`tiebreak-note.ts` 상단 주석 참조 — 승점이
  // 같았던 블록 단위로 묶어야 단독 순위 문장이 나오지 않는다, 40일차 회귀 수정).
  // 41일차 — 존 경계와 무관한 블록은 노이즈로 걸러낸다(`isZoneBoundaryAdjacent` 헤더 참조).
  const tiebreakBlocks = buildTiebreakNoteBlocks(sortedStandings).filter((block) =>
    isZoneBoundaryAdjacent(block.blockRanks, league),
  );

  // B5 — 리그3 최하위에만 적용되는 조건부 안내(FR-LG-007). 팀별 상태가 아니라 규칙 자체를
  // 요약하는 정적 문구라 `Standing`/`Team`에서 별도 조회하지 않는다.
  const showRebuildNotice = isSeasonLive && league.tier === 3;

  return (
    <div className="flex flex-col gap-6 p-4">
      {isSeasonLive && <ZoneLegend locale={locale} league={league} />}

      <StandingsTable
        locale={locale}
        state={
          isSeasonLive
            ? { status: "ready", data: { leagueName: league.name, seasonLabel, rows } }
            : { status: "empty" }
        }
      />

      {isSeasonLive && <TiebreakNote locale={locale} blocks={tiebreakBlocks} />}

      {showRebuildNotice && (
        <section
          aria-labelledby="league-rebuild-notice-title"
          className="flex flex-col gap-2 rounded-lg border border-warning bg-warning/10 p-4 text-sm"
        >
          <h2 id="league-rebuild-notice-title" className="flex items-center gap-2 font-semibold">
            <span aria-hidden className="text-warning-foreground">⚠</span>
            {t(locale, "league.rebuild.title")}
          </h2>
          <p>{t(locale, "league.rebuild.summary")}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="eyebrow text-muted-foreground">{t(locale, "league.rebuild.penaltyTitle")}</p>
              <ul className="list-inside list-disc">
                <li>{t(locale, "league.rebuild.penalty1")}</li>
                <li>{t(locale, "league.rebuild.penalty2")}</li>
                <li>{t(locale, "league.rebuild.penalty3")}</li>
              </ul>
            </div>
            <div>
              <p className="eyebrow text-muted-foreground">{t(locale, "league.rebuild.reliefTitle")}</p>
              <ul className="list-inside list-disc">
                <li>{t(locale, "league.rebuild.relief1")}</li>
                <li>{t(locale, "league.rebuild.relief2")}</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t(locale, "league.rebuild.footnote")}</p>
        </section>
      )}
    </div>
  );
}
