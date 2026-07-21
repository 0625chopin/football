import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/EmptyState";
import { StandingsTable, type StandingRowData } from "@/components/composite/StandingsTable";
import { ZoneLegend } from "@/components/composite/ZoneLegend";
import { resolveStandingZone } from "@/components/composite/standings-zone";
import { TeamBadge } from "@/components/domain/TeamBadge";
import type { Award, AwardType, League, PlayerId, Standing, Team, TeamId } from "@/types";
import type { PublicPlayerProfile } from "@/lib/data/DataSource";

/** 베스트11류(`TEAM_OF_SEASON`/`WORLD_XI`)는 `/awards` 전담 섹션이라 이 화면의 "수상 요약"
 * 표에서 제외한다(41일차 `awards` 페이지와 동일 판단 — 같은 수상을 두 화면에 중복 노출하지
 * 않는다, `awards/page.tsx`의 `BEST_XI_AWARD_TYPES`와 동일 값이지만 화면별 독립 상수로 둔다). */
const BEST_XI_AWARD_TYPES: readonly AwardType[] = ["TEAM_OF_SEASON", "WORLD_XI"];

/**
 * `/[lang]/archive` 시즌 아카이브 — Task 019(42일차, 4팀).
 * `docs/require/03-functional-requirements.md` FR-UI-013 / UC-011 "시즌 선택, 최종
 * 순위·우승·승강·수상 요약" 구현.
 *
 * ## 완료 시즌이 없으면 전체가 빈 상태 — 결함이 아니라 스펙이 정의한 경로
 * UC-011 선행조건은 "시즌 1회 이상 종료"이고, 미충족 시 빈 상태 문구가 FR-UI-013에 이미
 * "완료된 시즌이 없습니다"로 명시돼 있다. `Season.endedAt`이 그 판별 기준이며(현재
 * `MockDataSource.getSeasons()`는 D-15에 따라 진행 중 시즌 1건만 반환, `endedAt: null`),
 * `TeamSeason.finalRank`도 타입 주석부터 "시즌 종료 전에는 null"이다. 즉 이 화면이 뭘
 * 보여줄 자격이 있는 데이터는 아직 하나도 없다 — `/awards`처럼 "링크 1개짜리 선택기"를
 * 흉내내는 대신, 스펙이 정의한 이 빈 상태를 그대로 쓴다(42일차 착수 전 팀장 보고·확인,
 * `src/i18n/messages/ko/archive.ts` 헤더 주석 참조). 과거 시즌 데이터를 지어내지 않는다
 * (41일차 `awards.ts` 헤더·3팀 41일차 판단과 동일 근거).
 *
 * 완료 시즌이 하나라도 생기면 아래 섹션이 그대로 동작한다:
 * ① **최종 순위** — 리그별 `getStandings`(`round` 생략 = 최신/최종 라운드) + 기존
 *    `StandingsTable`/`ZoneLegend`(5팀 `/leagues/[leagueId]` 컴포넌트) 재사용. 승격/
 *    플레이오프/강등(FR-UI-013 "승강")은 이 표의 존 아이콘·범례가 이미 담당해 별도
 *    섹션을 두지 않는다(중복 방지, `leagues/[leagueId]/page.tsx`와 동일 판단).
 * ② **우승** — 리그별 최종 순위 1위(`Standing.rank === 1`)에서 도출한다. `Trophy`
 *    (E-32)는 시즌 단위 벌크 조회 메서드가 `DataSource`에 없어(`getTeamTrophies`는 팀
 *    단건만) 쓸 수 없다 — `leagues/[leagueId]` 페이지가 순위/승점을 재계산하지 않듯,
 *    이 화면도 2팀이 이미 계산한 `Standing.rank`를 그대로만 읽는다.
 * ③ **수상 요약** — `getAwards({ seasonId })`(41일차 3팀이 실데이터로 채움), 베스트11
 *    제외. 개인/팀 수상만 압축 표로 보여준다 — 풀 랭킹·베스트11 피치 뷰는 `/awards`
 *    전담이라 여기서 다시 그리지 않는다.
 *
 * ## 시즌 선택 — GET 링크, 클라이언트 컴포넌트 없음
 * `/awards`·`/stats`·`/transfers`와 동일 패턴(`?season=<seasonNumber>`). 완료 시즌
 * 목록만 후보로 삼는다(진행 중 시즌은 애초에 후보가 아니다 — 위 판단 참조).
 *
 * ## "더 보기"(`LoadMoreLink`) 미적용 — 43일차 규약 통일 스코프 밖
 * `/stats`·`/transfers`·`/awards`는 `RANK_LIMIT_DEFAULT`류 상수로 표를 인위적으로
 * 자르지만, 이 화면의 순위표(리그당 팀 수 고정)·우승 표(리그 3개 고정)·수상 요약
 * (`getAwards({ seasonId })`, 시즌 1건 범위라 자체가 이미 유계)은 어디에도 그런 임의
 * 상한이 없다 — 늘릴 "더"가 없으므로 세 화면과 같은 `limit` 규약을 적용하지 않는다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise — await 필요)
 */
export default async function Page(props: PageProps<"/[lang]/archive">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const seasons = await dataSource.getSeasons();
  const completedSeasons = seasons.filter((season) => season.endedAt !== null);

  const rawSeasonParam = typeof searchParams.season === "string" ? searchParams.season : undefined;
  const selectedSeason =
    completedSeasons.find((season) => String(season.seasonNumber) === rawSeasonParam) ??
    completedSeasons[0] ??
    null;

  let leagues: readonly League[] = [];
  let leagueStandings: readonly (readonly Standing[])[] = [];
  let summaryAwards: readonly Award[] = [];
  let teamById = new Map<TeamId, Team>();
  let playerById = new Map<PlayerId, PublicPlayerProfile>();
  let leagueNameById = new Map<string, string>();

  if (selectedSeason) {
    leagues = await dataSource.getLeagues();
    leagueStandings = await Promise.all(
      leagues.map((league) => dataSource.getStandings({ leagueId: league.id, seasonId: selectedSeason.id })),
    );
    const seasonAwards = await dataSource.getAwards({ seasonId: selectedSeason.id });
    summaryAwards = seasonAwards.filter((award) => !BEST_XI_AWARD_TYPES.includes(award.type));

    const teamIds = new Set<TeamId>();
    for (const standings of leagueStandings) {
      for (const standing of standings) teamIds.add(standing.teamId);
    }
    for (const award of summaryAwards) {
      if (award.teamId) teamIds.add(award.teamId);
    }
    const playerIds = new Set<PlayerId>();
    for (const award of summaryAwards) {
      if (award.playerId) playerIds.add(award.playerId);
    }

    const [teams, playerProfiles] = await Promise.all([
      dataSource.getTeamsByIds(Array.from(teamIds)),
      Promise.all(Array.from(playerIds).map((id) => dataSource.getPlayerProfile(id))),
    ]);

    teamById = new Map(teams.map((team) => [team.id, team]));
    playerById = new Map(
      playerProfiles
        .filter((profile): profile is NonNullable<typeof profile> => profile !== null)
        .map((profile) => [profile.id, profile]),
    );
    leagueNameById = new Map(leagues.map((league) => [league.id, league.name]));
  }

  // 완료 시즌이 없으면 `teamById`/`playerById`가 비어 있어 이 함수는 항상 폴백(원본 ID)만
  // 반환한다 — `summaryAwards`도 그 경우 항상 빈 배열이라 실제로 호출되지 않는다.
  function resolveAwardSubjectName(award: Award): string {
    if (award.playerId) return playerById.get(award.playerId)?.name ?? award.playerId;
    if (award.teamId) return teamById.get(award.teamId)?.name ?? award.teamId;
    if (award.managerId) return t(locale, "archive.subject.unresolvedManager");
    return "—";
  }

  function buildRows(league: League, standings: readonly Standing[]): readonly StandingRowData[] {
    return [...standings]
      .sort((a, b) => a.rank - b.rank)
      .map((standing) => {
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
  }

  const champions = leagues.map((league, index) => {
    const standings = leagueStandings[index] ?? [];
    const championStanding = standings.find((standing) => standing.rank === 1) ?? null;
    return {
      league,
      team: championStanding ? (teamById.get(championStanding.teamId) ?? null) : null,
    };
  });
  const hasAnyChampion = champions.some((entry) => entry.team !== null);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="eyebrow text-lg text-foreground">{t(locale, "archive.page.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "archive.page.caption")}</p>
      </div>

      {completedSeasons.length > 0 ? (
        <nav aria-label={t(locale, "archive.season.navLabel")} className="flex gap-1 overflow-x-auto">
          {completedSeasons.map((season) => {
            const isActive = selectedSeason?.id === season.id;
            return (
              <Link
                key={season.id}
                href={`?season=${season.seasonNumber}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "touchline shrink-0 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "touchline-on bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(locale, "archive.season.numberFormat", { number: season.seasonNumber })}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {selectedSeason === null ? (
        <EmptyState
          locale={locale}
          titleKey="archive.page.empty"
          descriptionKey="archive.page.emptyDescription"
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t(locale, "archive.standings.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-8">
              <p className="text-xs text-muted-foreground">{t(locale, "archive.standings.caption")}</p>
              {leagues.map((league, index) => {
                const standings = leagueStandings[index] ?? [];
                return (
                  <div key={league.id} className="flex flex-col gap-2">
                    <h3 className="eyebrow text-muted-foreground">{league.name}</h3>
                    {standings.length === 0 ? (
                      <EmptyState locale={locale} titleKey="archive.standings.empty" />
                    ) : (
                      <>
                        <ZoneLegend locale={locale} league={league} />
                        <StandingsTable
                          locale={locale}
                          state={{
                            status: "ready",
                            data: {
                              leagueName: league.name,
                              seasonLabel: t(locale, "archive.season.numberFormat", {
                                number: selectedSeason.seasonNumber,
                              }),
                              rows: buildRows(league, standings),
                            },
                          }}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(locale, "archive.champions.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnyChampion ? (
                <EmptyState locale={locale} titleKey="archive.champions.empty" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t(locale, "archive.champions.leagueHeader")}</TableHead>
                      <TableHead scope="col">{t(locale, "archive.champions.teamHeader")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {champions.map(({ league, team }) => (
                      <TableRow key={league.id}>
                        <TableCell>{league.name}</TableCell>
                        <TableCell>
                          {team ? (
                            <span className="inline-flex items-center gap-2">
                              <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: team }} />
                              {team.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t(locale, "archive.awardsSummary.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="pb-2 text-xs text-muted-foreground">{t(locale, "archive.awardsSummary.caption")}</p>
              {summaryAwards.length === 0 ? (
                <EmptyState locale={locale} titleKey="archive.awardsSummary.empty" />
              ) : (
                <Table>
                  <TableCaption className="sr-only">{t(locale, "archive.awardsSummary.title")}</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">{t(locale, "archive.awardsSummary.typeHeader")}</TableHead>
                      <TableHead scope="col">{t(locale, "archive.awardsSummary.subjectHeader")}</TableHead>
                      <TableHead scope="col">{t(locale, "archive.awardsSummary.leagueHeader")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryAwards.map((award) => (
                      <TableRow key={award.id}>
                        <TableCell>
                          <Badge variant="secondary">
                            {t(locale, `enums.awardType.${award.type}` as TranslationKey)}
                          </Badge>
                        </TableCell>
                        <TableCell>{resolveAwardSubjectName(award)}</TableCell>
                        <TableCell>
                          {award.leagueId ? (leagueNameById.get(award.leagueId) ?? award.leagueId) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
