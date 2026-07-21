import type { ReactNode } from "react";

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
import { PitchLineup } from "@/components/composite/PitchLineup";
import type {
  PitchFormationCode,
  PitchLineupData,
  PitchLineupPlayer,
} from "@/components/composite/PitchLineup";
import { LoadMoreLink, buildLoadMoreHref, parseLoadMoreLimit } from "@/components/ui/LoadMoreLink";
import type { MultiAwardRankingEntry } from "@/lib/data/DataSource";
import type { Award, AwardType, PlayerId, Position, TeamId } from "@/types";

/** 통산 다관왕 랭킹 표에 초기 노출할 행수 — `stats` 페이지 `RANK_LIMIT_DEFAULT`와 동일
 * 판단(R-10, 상위권만 의미 있고 전량 반환은 클라이언트 재집계 금지 규약과 맞지 않는다).
 * "더 보기"는 선수/감독/팀 3부문에 같은 `limit` 하나를 공유한다 — 부문별로 따로 늘리면
 * "규약 통일"(43일차 수락 기준)에 어긋난다. 감독 부문은 항상 조회 불가 안내로 대체되어
 * (아래 렌더링부 참조) `limit`이 몇이든 영향이 없다. */
const RANKING_LIMIT_DEFAULT = 10;
const RANKING_LIMIT_STEP = 10;
const RANKING_LIMIT_MAX = 50;

/** 베스트11류 수상 2종 — `getAwards`의 `type` 필터로 구분한다(`DataSource.ts` 528줄
 * 주석 "베스트11도 type 필터로 조회 가능해 별도 메서드가 불필요"). 이 두 타입은 "시즌별
 * 수상" 표에서 제외하고 피치 뷰 섹션이 전담한다(같은 수상을 두 섹션에 중복 노출하지 않음). */
const BEST_XI_AWARD_TYPES: readonly AwardType[] = ["TEAM_OF_SEASON", "WORLD_XI"];

/**
 * 베스트11 피치 뷰 표시 포메이션 — `Award`(E-31)엔 포메이션 필드가 없다(FR-AW-005
 * 스코프 밖). 실제 배치를 알 수 없으므로 11명을 포지션 우선순위(GK→수비→미드필더→공격,
 * `POSITION_SORT_ORDER`)로 정렬해 `PitchLineup`의 고정 4-3-3 슬롯 순서(GK,LB,CB,CB,RB,
 * DM,CM,CM,LW,ST,RW)에 근사 배치한다. 실제 선수 포지션과 슬롯 라벨이 어긋날 수 있어
 * `awards.bestXI.formationNote`로 근사임을 안내한다(이슈 후보 — 보고 참조).
 */
const BEST_XI_FORMATION: PitchFormationCode = "4-3-3";

const POSITION_SORT_ORDER: Readonly<Record<Position, number>> = {
  GK: 0,
  CB: 1,
  LB: 2,
  RB: 3,
  DM: 4,
  CM: 5,
  AM: 6,
  LW: 7,
  RW: 8,
  ST: 9,
  SS: 10,
};

/** 선수명 → 선수 상세(`/[lang]/players/[playerId]`) 인라인 링크 스타일 — `stats` 페이지와
 * 같은 관용구를 쓴다(한 행에 선수·팀·리그 등 대상이 섞여 있어 행 전체 링크는 쓸 수 없다).
 * `getPlayerProfile`이 `null`을 준 선수는 링크로 감싸지 않는다 — 상세가 `notFound()`로
 * 떨어지는 죽은 링크이기 때문이다. 팀·감독 주체는 목록/상세 진입점이 정리되기 전까지
 * 텍스트 그대로 둔다(감독은 애초에 이름 해석 자체가 불가 — 헤더 주석 참조). */
const PLAYER_LINK_CLASS =
  "rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

const RANKING_GROUPS: readonly {
  readonly subjectType: MultiAwardRankingEntry["subjectType"];
  readonly titleKey: TranslationKey;
}[] = [
  { subjectType: "PLAYER", titleKey: "awards.ranking.playerTitle" },
  { subjectType: "MANAGER", titleKey: "awards.ranking.managerTitle" },
  { subjectType: "TEAM", titleKey: "awards.ranking.teamTitle" },
];

function isBestXiAward(award: Award): boolean {
  return BEST_XI_AWARD_TYPES.includes(award.type);
}

/**
 * `/[lang]/awards` 수상/명예의 전당 — Task 019(41일차, 4팀).
 *
 * 세 섹션으로 구성한다: ① 시즌별 수상(베스트11류 제외) 표, ② 베스트11 피치 뷰
 * (`PitchLineup` 재사용, `TEAM_OF_SEASON`/`WORLD_XI` 각각), ③ 통산 다관왕 랭킹
 * (`getMultiAwardRanking`, 선수/감독/팀 3부문). 별도 와이어프레임 문서가 없는 신규
 * 화면이라 `/stats`(39일차)·`/transfers`(40일차)가 세운 패턴(서버 컴포넌트, GET 폼/링크
 * 기반 필터, `getDataSource()` 단일 경유)을 그대로 따랐다.
 *
 * ## 시즌 선택 — GET 링크, 클라이언트 컴포넌트 없음
 * `?season=<seasonNumber>` 쿼리 하나로 시즌을 고른다. `NavLink`(사이드 내비 전용,
 * `usePathname` 기반)는 쿼리스트링을 구분하지 못해 이 용도에 맞지 않아 재사용하지
 * 않았다 — 대신 `NavLink`와 같은 활성 표시 관용구(좌측이 아닌 밑줄 `touchline-on` +
 * `aria-current`)를 이 페이지 로컬 마크업으로 직접 둔다. 상호작용은 순수 링크 내비게이션
 * 뿐이라 클라이언트 경계가 필요 없다(스타일 다시보기: `stats`/`transfers` 페이지 헤더
 * 주석과 동일 판단).
 *
 * ## 이름 조회 — 벌크 우선, 없는 자리만 개별 호출
 * 팀명은 `getTeamsByIds`(1팀)로 한 번에, 선수명은 `getPlayerProfile` 개별 호출을
 * `Promise.all`로 병렬화한다(`stats` 페이지와 동일 패턴) — `getPlayerProfile`은
 * `PublicPlayerProfile`(pa 미노출)만 반환해 도메인 제약(6절)도 자동으로 지킨다.
 * **감독(`managerId`) 수상은 이름을 해석하지 못한다** — `DataSource`에 감독 단건 조회가
 * `getTeamManager(teamId)`(팀→감독 방향)만 있고 `managerId`만 아는 상태에서 역방향으로
 * 조회하는 메서드가 없다. 시즌별 수상 표에선 `awards.subject.unresolvedManager` 안내
 * 문구로 대체한다(이슈 후보 — 보고 참조). **통산 다관왕 랭킹의 감독 부문**은 41일차
 * 팀장 피드백으로 한 단계 더 나갔다 — 해석 불가 이름으로 "1~N위 전부 동일 문구" 표를
 * 그리면 정보값이 0인데 순위표처럼 보여 오해를 준다. 데이터 유무와 무관하게
 * `awards.ranking.managerUnavailable` 안내로 대체한다(아래 렌더링부 참조).
 *
 * ## 시즌별 수상 — 리그 열 추가(41일차 팀장 피드백)
 * `Award.leagueId`(LEAGUE 범위가 아니면 null)가 이미 있어 "리그 MVP"류가 리그 3개에서
 * 각 1건씩 나올 때 어느 리그인지 표에서 바로 구분된다. `getLeagues()`를 벌크 조회해
 * `leagueNameById`로 매핑하고, `leagueId`가 없는(WORLD/CUP/PLAYOFF 범위) 행은 "—"로 둔다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise — await 필요, 동적 렌더링으로 전환됨)
 */
export default async function Page(props: PageProps<"/[lang]/awards">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const [seasons, currentSeason, leagues] = await Promise.all([
    dataSource.getSeasons(),
    dataSource.getCurrentSeason(),
    dataSource.getLeagues(),
  ]);
  const leagueNameById = new Map(leagues.map((league) => [league.id, league.name]));

  const rawSeasonParam = typeof searchParams.season === "string" ? searchParams.season : undefined;
  const selectedSeason =
    seasons.find((season) => String(season.seasonNumber) === rawSeasonParam) ??
    seasons.find((season) => season.id === currentSeason?.id) ??
    seasons[0] ??
    null;

  const rankingLimit = parseLoadMoreLimit(searchParams.limit, RANKING_LIMIT_DEFAULT, RANKING_LIMIT_MAX);

  const [seasonAwards, rankingResults] = await Promise.all([
    selectedSeason ? dataSource.getAwards({ seasonId: selectedSeason.id }) : Promise.resolve([]),
    Promise.all(
      RANKING_GROUPS.map((group) =>
        dataSource.getMultiAwardRanking({ subjectType: group.subjectType, limit: rankingLimit }),
      ),
    ),
  ]);

  const rankingBySubjectType = new Map(
    RANKING_GROUPS.map((group, index) => [group.subjectType, rankingResults[index]] as const),
  );
  const rankingHasMore = rankingResults.some(
    (entries) => entries.length === rankingLimit && rankingLimit < RANKING_LIMIT_MAX,
  );
  const rankingLoadMoreHref = rankingHasMore
    ? buildLoadMoreHref(searchParams, Math.min(rankingLimit + RANKING_LIMIT_STEP, RANKING_LIMIT_MAX))
    : null;

  const bestXiAwardsByType = new Map<AwardType, Award[]>();
  const seasonAwardRows: Award[] = [];
  for (const award of seasonAwards) {
    if (isBestXiAward(award)) {
      const bucket = bestXiAwardsByType.get(award.type) ?? [];
      bucket.push(award);
      bestXiAwardsByType.set(award.type, bucket);
    } else {
      seasonAwardRows.push(award);
    }
  }

  const playerIds = new Set<PlayerId>();
  const teamIds = new Set<TeamId>();
  for (const award of seasonAwardRows) {
    if (award.playerId) playerIds.add(award.playerId);
    if (award.teamId) teamIds.add(award.teamId);
  }
  for (const bucket of bestXiAwardsByType.values()) {
    for (const award of bucket) {
      if (award.playerId) playerIds.add(award.playerId);
    }
  }
  for (const entries of rankingResults) {
    for (const entry of entries) {
      if (entry.subjectType === "PLAYER") playerIds.add(entry.subjectId as PlayerId);
      if (entry.subjectType === "TEAM") teamIds.add(entry.subjectId as TeamId);
    }
  }

  const [playerProfiles, teams] = await Promise.all([
    Promise.all(Array.from(playerIds).map((id) => dataSource.getPlayerProfile(id))),
    dataSource.getTeamsByIds(Array.from(teamIds)),
  ]);

  const playerById = new Map(
    playerProfiles.filter((profile) => profile !== null).map((profile) => [profile.id, profile]),
  );
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));

  function renderPlayerName(playerId: PlayerId): ReactNode {
    const profile = playerById.get(playerId);
    if (!profile) return playerId;
    return (
      <Link href={`/${locale}/players/${playerId}`} className={PLAYER_LINK_CLASS}>
        {profile.name}
      </Link>
    );
  }

  function renderAwardSubject(award: Award): ReactNode {
    if (award.playerId) return renderPlayerName(award.playerId);
    if (award.teamId) return teamNameById.get(award.teamId) ?? award.teamId;
    if (award.managerId) return t(locale, "awards.subject.unresolvedManager");
    return "—";
  }

  function renderRankingSubject(entry: MultiAwardRankingEntry): ReactNode {
    switch (entry.subjectType) {
      case "PLAYER":
        return renderPlayerName(entry.subjectId as PlayerId);
      case "TEAM":
        return teamNameById.get(entry.subjectId as TeamId) ?? entry.subjectId;
      case "MANAGER":
        return t(locale, "awards.subject.unresolvedManager");
    }
  }

  function buildBestXiPlayers(awardsForType: readonly Award[]): readonly PitchLineupPlayer[] {
    const resolved = awardsForType
      .filter((award): award is Award & { playerId: PlayerId } => award.playerId !== null)
      .map((award) => {
        const profile = playerById.get(award.playerId);
        return {
          playerId: award.playerId,
          name: profile?.name ?? award.playerId,
          position: profile?.preferredPosition,
        };
      });

    return resolved
      .slice()
      .sort((a, b) => {
        const orderA = a.position ? POSITION_SORT_ORDER[a.position] : Number.MAX_SAFE_INTEGER;
        const orderB = b.position ? POSITION_SORT_ORDER[b.position] : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      })
      .slice(0, 11)
      .map(({ playerId, name }) => ({ playerId, name }));
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="eyebrow text-lg text-foreground">{t(locale, "awards.page.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "awards.page.caption")}</p>
      </div>

      {seasons.length > 0 ? (
        <nav
          aria-label={t(locale, "awards.season.navLabel")}
          className="flex gap-1 overflow-x-auto"
        >
          {seasons.map((season) => {
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
                {t(locale, "awards.season.numberFormat", { number: season.seasonNumber })}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "awards.seasonAwards.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {seasonAwardRows.length === 0 ? (
            <EmptyState locale={locale} titleKey="awards.seasonAwards.empty" />
          ) : (
            <Table>
              <TableCaption>{t(locale, "awards.seasonAwards.caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t(locale, "awards.seasonAwards.typeHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "awards.seasonAwards.subjectHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "awards.seasonAwards.leagueHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "awards.seasonAwards.scopeHeader")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seasonAwardRows.map((award) => (
                  <TableRow key={award.id}>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(locale, `enums.awardType.${award.type}` as TranslationKey)}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderAwardSubject(award)}</TableCell>
                    <TableCell>
                      {award.leagueId ? (leagueNameById.get(award.leagueId) ?? award.leagueId) : "—"}
                    </TableCell>
                    <TableCell>
                      {t(locale, `enums.awardScope.${award.scope}` as TranslationKey)}
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
          <CardTitle>{t(locale, "awards.bestXI.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {bestXiAwardsByType.size === 0 ? (
            <EmptyState locale={locale} titleKey="awards.bestXI.empty" />
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t(locale, "awards.bestXI.formationNote")}
              </p>
              {BEST_XI_AWARD_TYPES.map((type) => {
                const bucket = bestXiAwardsByType.get(type);
                if (!bucket || bucket.length === 0) return null;
                const pitchData: PitchLineupData = {
                  formation: BEST_XI_FORMATION,
                  players: buildBestXiPlayers(bucket),
                };
                return (
                  <div key={type} className="flex flex-col gap-2">
                    <h3 className="eyebrow text-muted-foreground">
                      {t(locale, `enums.awardType.${type}` as TranslationKey)}
                    </h3>
                    <PitchLineup locale={locale} state={{ status: "ready", data: pitchData }} />
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "awards.ranking.title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-xs text-muted-foreground">{t(locale, "awards.ranking.caption")}</p>
          {RANKING_GROUPS.map((group) => {
            const entries = rankingBySubjectType.get(group.subjectType) ?? [];
            return (
              <div key={group.subjectType} className="flex flex-col gap-2">
                <h3 className="eyebrow text-muted-foreground">{t(locale, group.titleKey)}</h3>
                {group.subjectType === "MANAGER" ? (
                  // `managerId` 역조회 메서드가 `DataSource`에 없어(헤더 주석 참조) 이름을
                  // 전혀 해석할 수 없다 — 해석 불가 이름으로 순위표를 그리면 "1위=2위=3위
                  // 감독 정보 없음"처럼 정보값 0인 표가 노출된다(41일차 팀장 피드백).
                  // 데이터 유무와 무관하게 조회 불가 안내로 대체한다.
                  <EmptyState locale={locale} titleKey="awards.ranking.managerUnavailable" />
                ) : entries.length === 0 ? (
                  <EmptyState locale={locale} titleKey="awards.ranking.empty" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col" numeric>
                          {t(locale, "awards.ranking.rankHeader")}
                        </TableHead>
                        <TableHead scope="col">{t(locale, "awards.ranking.subjectHeader")}</TableHead>
                        <TableHead scope="col" numeric>
                          {t(locale, "awards.ranking.countHeader")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((entry, index) => (
                        <TableRow key={`${entry.subjectType}-${entry.subjectId}`}>
                          <TableCell numeric>{index + 1}</TableCell>
                          <TableCell>{renderRankingSubject(entry)}</TableCell>
                          <TableCell numeric>
                            {t(locale, "awards.ranking.countFormat", { count: entry.totalAwards })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </CardContent>
        {rankingLoadMoreHref ? (
          <CardContent className="flex justify-center pt-0">
            <LoadMoreLink locale={locale} href={rankingLoadMoreHref} />
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
