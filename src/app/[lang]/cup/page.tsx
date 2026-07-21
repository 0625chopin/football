import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import {
  BracketTree,
  resolveBracketWinnerSide,
  type BracketTreeData,
  type BracketRoundData,
  type BracketMatchSlot,
} from "@/components/composite/BracketTree";
import type { CompositeViewState } from "@/components/composite/types";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { Badge } from "@/components/ui/badge";
import type { Fixture, Team, TeamId } from "@/types";

/**
 * `/[lang]/cup` 컵대회 브래킷 — Task 020(45일차, 4팀).
 *
 * ## 브래킷 트리 — `/playoffs/[leagueId]`와 동일 패턴
 * `getCupBracket()`이 반환하는 평면 `Fixture[]`(competitionType='CUP', 리그 스코프 없음)를
 * `round` 오름차순 컬럼으로 묶어 `BracketTree`(5팀 013B)에 그대로 먹인다. 같은 라운드 내
 * 좌우 슬롯 순서는 시드 의미가 없다는 계약(`DataSource.ts` I-50)에 따라 `kickoffAt`
 * 오름차순 + `id` 사전식으로 정렬한다 — `playoffs` 화면의 `buildBracketData`와 동일 이유로
 * 로컬 글루 코드를 공유 컴포넌트로 빼지 않는다.
 *
 * ## 티어 배지 — 3개 리그 통합 대회라 팀마다 소속 리그가 다르다
 * `Fixture`/`Team`에는 리그·티어 정보가 없다(컵은 `leagueId: null`). `getLeagues()`(3개,
 * tier 1/2/3) + 리그별 `getStandings()` 3콜로 `teamId → tier` 맵을 만든다 — 팀 단건 조회
 * (`getTeamSeason`)를 60번 부르는 것보다 이 3콜이 최소 호출이다. `BracketTree`는 참가자별
 * 배지 슬롯이 없어(5팀 소유, 수정 대상 아님) 티어 배지는 트리 바깥의 bye·자이언트킬링
 * 섹션에서만 노출한다.
 *
 * ## bye 4팀 표기 — Fixture에 부전승 필드가 없다
 * `CupRound1Result.byeSeeds`(`src/lib/sim/knockout/cup.ts`)는 시뮬레이션 계층 산출물이라
 * 화면이 직접 참조할 수 없다. 대신 1라운드 참가팀 집합과 2라운드(32강) 참가팀 집합의
 * 차집합으로 부전승 4팀을 순수하게 도출한다 — 2라운드가 아직 생성되지 않았으면(컵 슬롯
 * 진행 전) 차집합도 비어 있으므로 자연히 아무것도 표시하지 않는다(미래 정보 비노출, C-23과
 * 동일한 이유).
 *
 * ## 자이언트킬링 하이라이트
 * 승자 판정은 `BracketTree.tsx`가 export하는 `resolveBracketWinnerSide()`를 그대로
 * 재사용한다(중복 구현 금지). 승자 소속 리그의 티어 숫자가 패자보다 크면(하위 리그가
 * 상위 리그를 이김) 하이라이트 목록에 담는다 — 같은 티어 내 이변은 이 화면이 가진
 * 정보(리그 단위 티어)로는 가릴 수 없어 대상에서 뺀다.
 */
export default async function Page(props: PageProps<"/[lang]/cup">) {
  const { lang } = await props.params;
  const locale: SupportedLocale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const [fixtures, leagues] = await Promise.all([
    dataSource.getCupBracket(),
    dataSource.getLeagues(),
  ]);

  const leagueTierById = new Map(leagues.map((league) => [league.id, league.tier] as const));
  const standingsByLeague = await Promise.all(
    leagues.map((league) => dataSource.getStandings({ leagueId: league.id })),
  );
  const tierByTeamId = new Map<TeamId, number>();
  for (const standings of standingsByLeague) {
    for (const standing of standings) {
      const tier = leagueTierById.get(standing.leagueId);
      if (tier != null) {
        tierByTeamId.set(standing.teamId, tier);
      }
    }
  }

  const teamIds = Array.from(new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])));
  const teams = await dataSource.getTeamsByIds(teamIds);
  const teamById = new Map(teams.map((team) => [team.id, team] as const));

  const { rounds, byeTeamIds, giantKillings } = buildCupBracketData(fixtures, teamById, tierByTeamId);

  const state: CompositeViewState<BracketTreeData> =
    fixtures.length === 0 ? { status: "empty" } : { status: "ready", data: { rounds } };

  const byeTeams = byeTeamIds.map((teamId) => teamById.get(teamId)).filter((team): team is Team => team != null);

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "match.cup.title")}</h1>
        <p className="eyebrow text-muted-foreground">
          {t(locale, "match.cup.summaryFormat", {
            teams: teamIds.length,
            rounds: rounds.length,
            matches: fixtures.length,
          })}
        </p>
      </header>

      <BracketTree locale={locale} state={state} />

      {byeTeams.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">{t(locale, "match.cup.byeSectionTitle")}</h2>
          <ul className="flex flex-col gap-2 md:grid md:grid-cols-2">
            {byeTeams.map((team) => (
              <li key={team.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <TeamBadge locale={locale} size="sm" state={{ status: "ready", data: team }} />
                <span className="flex items-center gap-1">
                  {tierByTeamId.get(team.id) != null ? (
                    <Badge variant="outline">{t(locale, "league.header.tierLabel", { tier: tierByTeamId.get(team.id)! })}</Badge>
                  ) : null}
                  <Badge variant="secondary">{t(locale, "match.cup.byeBadgeLabel")}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t(locale, "match.cup.giantKillingSectionTitle")}</h2>
        {giantKillings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "match.cup.giantKillingEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {giantKillings.map((entry) => (
              <li
                key={entry.fixtureId}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2 text-sm"
              >
                <Badge variant="secondary">{t(locale, "match.cup.giantKillingBadgeLabel")}</Badge>
                <span className="eyebrow text-muted-foreground">{entry.roundLabel}</span>
                <Badge variant="outline">{t(locale, "league.header.tierLabel", { tier: entry.winnerTier })}</Badge>
                <span>
                  {t(locale, "match.cup.matchupFormat", {
                    winner: entry.winnerName,
                    winnerScore: entry.winnerScore,
                    loserScore: entry.loserScore,
                    loser: entry.loserName,
                  })}
                </span>
                <Badge variant="outline">{t(locale, "league.header.tierLabel", { tier: entry.loserTier })}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

interface GiantKillingEntry {
  readonly fixtureId: string;
  readonly roundLabel: string;
  readonly winnerName: string;
  readonly winnerScore: number;
  readonly winnerTier: number;
  readonly loserName: string;
  readonly loserScore: number;
  readonly loserTier: number;
}

interface CupBracketData {
  readonly rounds: readonly BracketRoundData[];
  readonly byeTeamIds: readonly TeamId[];
  readonly giantKillings: readonly GiantKillingEntry[];
}

/**
 * 평면 `Fixture[]`를 라운드별 컬럼 + bye 4팀 + 자이언트킬링 목록으로 변형하는 순수 함수.
 * 화면 로컬 글루 코드라 재사용 컴포넌트로 빼지 않는다(`playoffs` 화면의 `buildBracketData`와
 * 동일 판단).
 */
function buildCupBracketData(
  fixtures: readonly Fixture[],
  teamById: ReadonlyMap<TeamId, Team>,
  tierByTeamId: ReadonlyMap<TeamId, number>,
): CupBracketData {
  const byRound = new Map<number, Fixture[]>();
  for (const fixture of fixtures) {
    const bucket = byRound.get(fixture.round);
    if (bucket) {
      bucket.push(fixture);
    } else {
      byRound.set(fixture.round, [fixture]);
    }
  }

  const giantKillings: GiantKillingEntry[] = [];

  const rounds: BracketRoundData[] = Array.from(byRound.entries())
    .sort(([roundA], [roundB]) => roundA - roundB)
    .map(([, roundFixtures]) => {
      const sorted = [...roundFixtures].sort((a, b) => {
        if (a.kickoffAt !== b.kickoffAt) return a.kickoffAt < b.kickoffAt ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
      return {
        label: sorted[0].roundLabel,
        matches: sorted.map((fixture): BracketMatchSlot => {
          const home = teamById.get(fixture.homeTeamId);
          const away = teamById.get(fixture.awayTeamId);
          const slot: BracketMatchSlot = {
            matchId: fixture.id,
            home: home ? { teamId: home.id, name: home.name, shortName: home.shortName } : null,
            away: away ? { teamId: away.id, name: away.name, shortName: away.shortName } : null,
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            wentToPenalties: fixture.pkHome != null && fixture.pkAway != null,
            homePenaltyScore: fixture.pkHome,
            awayPenaltyScore: fixture.pkAway,
          };

          const winnerSide = resolveBracketWinnerSide(slot);
          if (winnerSide != null && home != null && away != null) {
            const winnerTeam = winnerSide === "home" ? home : away;
            const loserTeam = winnerSide === "home" ? away : home;
            const winnerTier = tierByTeamId.get(winnerTeam.id);
            const loserTier = tierByTeamId.get(loserTeam.id);
            if (winnerTier != null && loserTier != null && winnerTier > loserTier) {
              giantKillings.push({
                fixtureId: fixture.id,
                roundLabel: fixture.roundLabel,
                winnerName: winnerTeam.name,
                winnerScore: (winnerSide === "home" ? fixture.homeScore : fixture.awayScore) ?? 0,
                winnerTier,
                loserName: loserTeam.name,
                loserScore: (winnerSide === "home" ? fixture.awayScore : fixture.homeScore) ?? 0,
                loserTier,
              });
            }
          }

          return slot;
        }),
      };
    });

  const round1TeamIds = new Set(byRound.get(1)?.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]) ?? []);
  const round2TeamIds = new Set(byRound.get(2)?.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]) ?? []);
  const byeTeamIds = Array.from(round2TeamIds).filter((teamId) => !round1TeamIds.has(teamId));

  return { rounds, byeTeamIds, giantKillings };
}
