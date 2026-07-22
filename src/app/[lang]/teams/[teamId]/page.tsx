import { notFound } from "next/navigation";
import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { SupportedLocale } from "@/i18n/locales";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { StatBar } from "@/components/domain/StatBar";
import { FormStrip } from "@/components/domain/FormStrip";
import { Badge } from "@/components/ui/badge";
import { TrophyCase } from "@/components/composite/TrophyCase";
import type { TrophyCaseTrophyRow } from "@/components/composite/TrophyCase";
import { computeElapsedMinutes } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";
import { SquadTable } from "./SquadTable";
import type { SquadTableRow } from "./SquadTable";
import { SeasonStatPanel } from "./SeasonStatPanel";
import { FinancePanel } from "./FinancePanel";
import { SponsorSlots } from "./SponsorSlots";
import type { SponsorSlotEntry } from "./SponsorSlots";
import { RecentUpcomingFixtures } from "./RecentUpcomingFixtures";
import type {
  ClubOwner,
  Fixture,
  FixtureStatus,
  Manager,
  Sponsor,
  Standing,
  Team,
  TeamId,
  Trophy,
} from "@/types";

/**
 * 51일차 팀장 판정(사용자 승인) — 창단 시즌(`Team.foundedSeason`)·구단주 재임 시즌
 * (`ClubOwner.sinceSeason`) 잠정 숨김. 원인: mock 생성값이 `currentSeason=1` 축과
 * 충돌한다(창단·취임이 진행 중 시즌보다 미래로 나옴 — 51일차엔 반대로 음수였다가 3팀
 * 재수정 후 방향만 뒤집혔다). 근본 원인이 도메인 축 문제라 값만 고쳐서 못 푼다 — 표시
 * 규약 판정 전까지 두 필드를 숨긴다(이월, "표시 규약 미결 이슈"로만 참조). i18n 키
 * (`team.header.foundedSeasonFormat`/`team.owner.sinceSeasonFormat`)는 지우지 않는다 —
 * 판정이 나면 이 상수만 `true`로 되돌린다.
 */
const SHOW_SEASON_ORIGIN_FIELDS = false;

/**
 * `/[lang]/teams/[teamId]` 클럽 상세 1/2 — Task 018(51일차, 5팀), 와이어프레임
 * `docs/wireframe/06-클럽상세.md`. **오늘은 F1(클럽 헤더)·F2(스쿼드)·F3(감독·전술)·
 * F3-o(구단주, D-35)만 채운다** — F4(시즌 지표)~F8(최근/예정 경기)은 52일차 몫이라
 * 이 파일에 아직 없다.
 *
 * ## F1 헤더 실패 = 페이지 전체 에러 (05 문서와 동일 원칙, 06 문서 §5)
 * `getTeam`이 `null`이면 클럽 존재 자체가 불확실하므로 `notFound()`로 페이지 전체를
 * 처리한다. 그 아래 섹션(순위·감독·구단주·스쿼드)은 각자 독립 조회이며 값이 없으면
 * 그 섹션만 "—"/공석 문구로 대체한다(섹션 단위 완전 격리·재시도 UI는 53일차 몫).
 *
 * ## F2 스쿼드 OVR·출전·득점 — 선수당 개별 조회(N+1)
 * `PublicPlayerProfile`에는 OVR이 없다(`getPlayerAttribute(playerId).ovrCached`에만
 * 있음, 팀장 51일차 사전 조사). 배치 조회 계약이 `DataSource`에 없어 스쿼드 인원수만큼
 * `getPlayerAttribute`/`getPlayerSeasonStats`를 병렬 호출한다 — Mock 어댑터는 인메모리
 * 조회라 22~30건 병렬 호출의 비용이 낮다(실 DB 전환 시 배치 메서드 도입은 이슈 후보).
 *
 * ## F3 감독 카드 — 공석과 임시 감독을 구분한다
 * `getTeamManager`가 `null`이면 "감독 공석"(엔진이 아직 대행조차 선임 못 한 Mock 데이터
 * 공백)을, `Manager.isActing === true`면 이름은 그대로 보여주되 "임시 감독" 배지를
 * 덧붙인다(D-23, `DataSource.getTeamManager` 주석 참조).
 *
 * ## F3-o 구단주 카드 — Manager 공석 관례 승계(D-35)
 * `getClubOwner`가 `null`이면 "구단주 공석"만 표기한다. `ClubOwner`엔 `isActing` 개념이
 * 없어(감독과 달리 대행 구단주 개념 자체가 없음, `person.ts` 참조) 이분법으로 충분하다.
 */
export default async function Page(props: PageProps<"/[lang]/teams/[teamId]">) {
  const { lang, teamId: rawTeamId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;
  const teamId = rawTeamId as TeamId;

  await bootstrapApp();
  const dataSource = getDataSource();

  const team = await dataSource.getTeam(teamId);
  if (!team) {
    notFound();
  }

  const [teamSeason, manager, owner, squad, squadStates, currentSeason] = await Promise.all([
    dataSource.getTeamSeason({ teamId }),
    dataSource.getTeamManager(teamId),
    dataSource.getClubOwner(teamId),
    dataSource.getTeamSquad(teamId),
    dataSource.getTeamSquadStates(teamId),
    dataSource.getCurrentSeason(),
  ]);

  const [league, standings] = teamSeason
    ? await Promise.all([
        dataSource.getLeague(teamSeason.leagueId),
        dataSource.getStandings({ leagueId: teamSeason.leagueId }),
      ])
    : [null, []];
  const standing: Standing | null = standings.find((row) => row.teamId === teamId) ?? null;

  const stateByPlayerId = new Map(squadStates.map((state) => [state.playerId, state]));

  const squadDetails = await Promise.all(
    squad.map((player) =>
      Promise.all([dataSource.getPlayerAttribute(player.id), dataSource.getPlayerSeasonStats(player.id)]),
    ),
  );

  const squadRows: readonly SquadTableRow[] = squad
    .map((player, index): SquadTableRow => {
      const [attribute, seasonStats] = squadDetails[index];
      const currentLeagueStat = seasonStats.find(
        (stat) => stat.competitionType === "LEAGUE" && stat.seasonId === currentSeason?.id,
      );
      return {
        player,
        state: stateByPlayerId.get(player.id),
        ovr: attribute?.ovrCached ?? null,
        appearances: currentLeagueStat?.appearances ?? null,
        goals: currentLeagueStat?.goals ?? null,
      };
    })
    .slice()
    .sort((a, b) => (a.state?.squadNumber ?? Infinity) - (b.state?.squadNumber ?? Infinity));

  // F4~F8(52일차, Task 018 2/2) — 병렬 조회. `teamSeasonStat`은 MockDataSource가 클럽
  // 시즌 지표 생성기 미착수라 항상 null(F4·F5가 empty로 렌더되는 이유, 각 패널 헤더 참조).
  const [teamSeasonStat, sponsorContracts, trophies, fixtures, seasons] = await Promise.all([
    currentSeason
      ? dataSource.getTeamSeasonStat({ teamId, seasonId: currentSeason.id, competitionType: "LEAGUE" })
      : Promise.resolve(null),
    dataSource.getTeamSponsorContracts(teamId),
    dataSource.getTeamTrophies(teamId),
    dataSource.getTeamFixtures({ teamId, limit: 30 }),
    dataSource.getSeasons(),
  ]);

  // F6 — 스폰서 자체 정보(이름·업종·규모·부도 위험)는 계약과 별도 조인(`getSponsorsByIds`).
  const sponsorIds = Array.from(new Set(sponsorContracts.map((contract) => contract.sponsorId)));
  const sponsors = sponsorIds.length > 0 ? await dataSource.getSponsorsByIds(sponsorIds) : [];
  const sponsorById = new Map<Sponsor["id"], Sponsor>(sponsors.map((sponsor) => [sponsor.id, sponsor]));
  const sponsorEntries: readonly SponsorSlotEntry[] = sponsorContracts
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((contract) => ({ contract, sponsor: sponsorById.get(contract.sponsorId) ?? null }));

  // F7 — `Trophy.seasonId`는 불투명 브랜드라 표시 라벨로 해석해야 한다(players/page.tsx
  // `resolveSeasonLabel` 선례와 동일 패턴, `league.header.seasonLabel` 키 재사용).
  const seasonNumberById = new Map(seasons.map((season) => [season.id, season.seasonNumber]));
  function resolveSeasonLabel(seasonId: Trophy["seasonId"]): string {
    const seasonNumber = seasonNumberById.get(seasonId);
    return seasonNumber !== undefined ? t(locale, "league.header.seasonLabel", { number: seasonNumber }) : "—";
  }
  const trophyRows: readonly TrophyCaseTrophyRow[] = trophies.map((trophy) => ({
    trophy,
    seasonLabel: resolveSeasonLabel(trophy.seasonId),
  }));

  // F8 — LIVE(S-9 분리 행) / 최근(FINISHED·VOID) / 예정(SCHEDULED) 3갈래. 경과분은 홈
  // (`[lang]/page.tsx`)과 동일하게 `getMatchClockContext` + `MatchCard.computeElapsedMinutes`
  // 조합(H-24 계약)으로 채운다 — 미폴링(I-1, W-36 미승인 기본값)이라 진입 시 1회만 조회한다.
  const fixtureTeamIds = Array.from(new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])));
  const [matchClock, fixtureTeams] = await Promise.all([
    dataSource.getMatchClockContext(fixtures.map((fixture) => fixture.id)),
    fixtureTeamIds.length > 0 ? dataSource.getTeamsByIds(fixtureTeamIds) : Promise.resolve([]),
  ]);
  const teamNameById = new Map<TeamId, string>(fixtureTeams.map((otherTeam) => [otherTeam.id, otherTeam.name]));
  teamNameById.set(team.id, team.name);

  function buildFixtureCardData(fixture: Fixture): MatchCardData {
    const status: FixtureStatus = fixture.status;
    const leagueName =
      fixture.leagueId === null
        ? t(locale, "team.match.cupLabel")
        : fixture.leagueId === league?.id
          ? (league?.name ?? fixture.leagueId)
          : fixture.leagueId;
    return {
      id: fixture.id,
      leagueName,
      homeTeamName: teamNameById.get(fixture.homeTeamId) ?? fixture.homeTeamId,
      awayTeamName: teamNameById.get(fixture.awayTeamId) ?? fixture.awayTeamId,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      status,
      kickoffAt: fixture.kickoffAt,
      elapsedMinutes: status === "LIVE" ? computeElapsedMinutes(fixture.kickoffAt, matchClock.clock, matchClock.now) : null,
    };
  }

  const liveFixtureCards = fixtures.filter((fixture) => fixture.status === "LIVE").map(buildFixtureCardData);
  const recentFixtureCards = fixtures
    .filter((fixture) => fixture.status === "FINISHED" || fixture.status === "VOID")
    .sort((a, b) => (a.kickoffAt < b.kickoffAt ? 1 : a.kickoffAt > b.kickoffAt ? -1 : 0))
    .slice(0, 5)
    .map(buildFixtureCardData);
  const upcomingFixtureCards = fixtures
    .filter((fixture) => fixture.status === "SCHEDULED")
    .sort((a, b) => (a.kickoffAt < b.kickoffAt ? -1 : a.kickoffAt > b.kickoffAt ? 1 : 0))
    .slice(0, 5)
    .map(buildFixtureCardData);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <ClubHeaderSection locale={locale} team={team} league={league} standing={standing} />

      {/* 데스크톱(1024+): 좌 62% F2 스쿼드 / 우 38% F3·F3-o(06 문서 3-2절). sm(375px)은
          이 프로젝트에서 320px과 동일 취급(I-184)이라 전환점으로 쓰지 않는다 — lg 하나만. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
        <section className="flex flex-col gap-3">
          <h2 className="eyebrow text-muted-foreground">{t(locale, "team.squad.title")}</h2>
          <SquadTable locale={locale} teamName={team.name} rows={squadRows} />

          <h2 className="eyebrow mt-3 text-muted-foreground">{t(locale, "team.season.title")}</h2>
          <SeasonStatPanel locale={locale} stat={teamSeasonStat} />
        </section>

        <div className="flex flex-col gap-6">
          <ManagerSection locale={locale} manager={manager} currentSeasonNumber={currentSeason?.seasonNumber ?? null} />
          <OwnerSection locale={locale} owner={owner} />

          <section className="flex flex-col gap-3">
            <h2 className="eyebrow text-muted-foreground">{t(locale, "team.finance.title")}</h2>
            <FinancePanel locale={locale} stat={teamSeasonStat} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="eyebrow text-muted-foreground">{t(locale, "team.sponsor.title")}</h2>
            <SponsorSlots
              locale={locale}
              entries={sponsorEntries}
              owner={owner}
              currentSeasonNumber={currentSeason?.seasonNumber ?? null}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="eyebrow text-muted-foreground">{t(locale, "team.trophy.title")}</h2>
            <TrophyCase locale={locale} state={{ status: "ready", data: { trophies: trophyRows } }} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="eyebrow text-muted-foreground">{t(locale, "team.match.title")}</h2>
            <RecentUpcomingFixtures
              locale={locale}
              live={liveFixtureCards}
              recent={recentFixtureCards}
              upcoming={upcomingFixtureCards}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * F1 클럽 헤더
 * ============================================================ */

function ClubHeaderSection({
  locale,
  team,
  league,
  standing,
}: {
  readonly locale: SupportedLocale;
  readonly team: Team;
  readonly league: { readonly id: string; readonly name: string } | null;
  readonly standing: Standing | null;
}) {
  const intlLocale = locale === "ko" ? "ko-KR" : "en-US";
  const fanBaseFormatted = new Intl.NumberFormat(intlLocale).format(team.fanBase);
  const capacityFormatted = new Intl.NumberFormat(intlLocale).format(team.stadiumCapacity);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <TeamBadge locale={locale} size="lg" state={{ status: "ready", data: team }} />
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{team.name}</h1>
            <span className="eyebrow text-muted-foreground">{team.shortName}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {league && (
              <Link href={`/${locale}/leagues/${league.id}`} className="hover:underline">
                {league.name}
              </Link>
            )}
            {SHOW_SEASON_ORIGIN_FIELDS && (
              <>
                <span>·</span>
                <span>{t(locale, "team.header.foundedSeasonFormat", { number: team.foundedSeason })}</span>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(locale, "team.header.stadiumLabel")} {team.stadiumName} ·{" "}
            {t(locale, "team.header.capacityFormat", { count: capacityFormatted })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-3">
        <StatBar
          locale={locale}
          label={t(locale, "team.header.reputationLabel")}
          state={{ status: "ready", data: { value: team.reputation, max: 100 } }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="scoreboard text-base">{t(locale, "team.header.fanBaseFormat", { count: fanBaseFormatted })}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="scoreboard text-base">
            {standing ? t(locale, "team.header.rankFormat", { rank: standing.rank }) : t(locale, "team.header.rankUnavailable")}
          </span>
          {standing && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t(locale, "team.header.recentFormLabel")}</span>
              <FormStrip locale={locale} state={{ status: "ready", data: { form: standing.form } }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
 * F3 감독 · 전술 카드
 * ============================================================ */

function ManagerSection({
  locale,
  manager,
  currentSeasonNumber,
}: {
  readonly locale: SupportedLocale;
  readonly manager: Manager | null;
  readonly currentSeasonNumber: number | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "team.manager.title")}</h2>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        {manager ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium">{manager.name}</span>
              <span className="text-sm text-muted-foreground">{t(locale, "team.manager.ageFormat", { age: manager.age })}</span>
              {manager.isActing && <Badge variant="outline">{t(locale, "team.manager.actingBadge")}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{t(locale, `enums.managerStyle.${manager.style}`)}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(locale, "team.manager.tacticalSkillLabel")}</span>
              <span className="scoreboard">{t(locale, "team.manager.tacticalSkillFormat", { value: manager.tacticalSkill })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(locale, "team.manager.formationLabel")}</span>
              <span className="scoreboard">{manager.preferredFormation}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t(locale, "team.manager.contractRemainingFormat", {
                  count: currentSeasonNumber !== null ? Math.max(manager.contractUntilSeason - currentSeasonNumber, 0) : 0,
                })}
              </span>
              <span className="text-xs text-muted-foreground">{t(locale, "team.manager.reputationFormat", { value: manager.reputation })}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t(locale, "team.manager.vacantMessage")}</p>
        )}
      </div>
    </section>
  );
}

/* ============================================================
 * F3-o 구단주 카드(D-35)
 * ============================================================ */

function OwnerSection({ locale, owner }: { readonly locale: SupportedLocale; readonly owner: ClubOwner | null }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="eyebrow text-muted-foreground">{t(locale, "team.owner.title")}</h2>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        {owner ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-medium">{owner.name}</span>
              <span className="text-sm text-muted-foreground">{t(locale, "team.owner.ageFormat", { age: owner.age })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(locale, "team.owner.nationalityLabel")}</span>
              <span>{owner.nationality}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(locale, "team.owner.wealthFormat", { value: owner.wealth })}</span>
              <span className="text-muted-foreground">{t(locale, "team.owner.negotiationFormat", { value: owner.negotiation })}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="scoreboard">{t(locale, "team.owner.reputationFormat", { value: owner.reputation })}</span>
              {SHOW_SEASON_ORIGIN_FIELDS && (
                <span className="text-xs text-muted-foreground">
                  {t(locale, "team.owner.sinceSeasonFormat", { number: owner.sinceSeason })}
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t(locale, "team.owner.vacantMessage")}</p>
        )}
      </div>
    </section>
  );
}
