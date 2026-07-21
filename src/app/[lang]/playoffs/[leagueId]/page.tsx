import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { BracketTreeData, BracketRoundData, BracketMatchSlot } from "@/components/composite/BracketTree";
import { BracketViewport } from "@/components/domain/BracketViewport";
import type { CompositeViewState } from "@/components/composite/types";
import type { Fixture, LeagueId, Team } from "@/types";

/**
 * `/[lang]/playoffs/[leagueId]` 플레이오프 대진표 — Task 020(44일차, 4팀).
 *
 * 3리그 전부 같은 화면으로 렌더한다 — 라운드 수·참가팀 수가 리그마다 달라도(리그1 최대
 * 8팀 시드/3라운드, 리그2 4팀/2라운드, 리그3 2팀/1라운드) `BracketTree`(5팀 013B)가
 * `data.rounds` 배열 길이를 그대로 컬럼 수로 쓰는 가변 구조라 화면 쪽에서 리그별 분기가
 * 필요 없다.
 *
 * 47일차(Task 020, 4팀): `BracketTree`를 직접 쓰지 않고 `BracketViewport`(domain/)로
 * 감싼다 — 확대/축소 + 320px 모바일 라운드 페이징(수락 기준: 6라운드 브래킷이 320px에서도
 * 가로 스크롤 컨테이너 내 탐색 가능). `BracketViewport` 헤더 주석 참조.
 *
 * ## 데이터
 * `getPlayoffBracket({ leagueId })`가 반환하는 평면 `Fixture[]`(competitionType='PLAYOFF')를
 * `round` 오름차순으로 묶어 `BracketTreeData`로 변형한다. 같은 라운드 내 좌우 슬롯 순서는
 * 시드 의미가 없다는 계약(`DataSource.ts` I-50)에 따라 `kickoffAt` 오름차순 + `id` 사전식으로
 * 정렬한다. 팀명은 `Fixture`에 없어 `getTeamsByIds` 배치 조회로 조인한다.
 *
 * ## 미래 정보(C-23)
 * 마지막 라운드(결승) 경기는 아직 `SCHEDULED`라 `homeScore`/`awayScore`가 서버에서부터 이미
 * `null`로 내려온다 — 이 화면은 그 값을 그대로 표시할 뿐 별도로 숨기는 로직을 두지 않는다.
 */
export default async function Page(
  props: PageProps<"/[lang]/playoffs/[leagueId]">,
) {
  const { lang, leagueId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const league = await dataSource.getLeague(leagueId as LeagueId);
  if (!league) {
    notFound();
  }

  const fixtures = await dataSource.getPlayoffBracket({ leagueId: league.id });

  const teamIds = Array.from(new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])));
  const teams = await dataSource.getTeamsByIds(teamIds);
  const teamById = new Map(teams.map((team) => [team.id, team] as const));

  const state: CompositeViewState<BracketTreeData> =
    fixtures.length === 0 ? { status: "empty" } : { status: "ready", data: buildBracketData(fixtures, teamById) };

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        {/* {league}는 League.name 그대로 치환된다(고유명사, 번역 대상 아님, D-17) */}
        <h1 className="text-xl font-semibold">{t(locale, "match.playoffs.title", { league: league.name })}</h1>
        <p className="eyebrow text-muted-foreground">
          {t(locale, "league.header.tierLabel", { tier: league.tier })} ·{" "}
          {t(locale, "league.zone.playoffLabel")} ·{" "}
          {t(locale, "league.header.teamCountFormat", { count: league.playoffTeamCount })}
        </p>
      </header>

      <BracketViewport locale={locale} state={state} />
    </div>
  );
}

/**
 * 평면 `Fixture[]`를 라운드별 컬럼으로 묶는 순수 변환. 화면 로컬 글루 코드라 재사용 컴포넌트로
 * 빼지 않는다(leagues/[leagueId] 순위표 화면의 로컬 매핑과 동일 판단).
 */
function buildBracketData(fixtures: readonly Fixture[], teamById: ReadonlyMap<Team["id"], Team>): BracketTreeData {
  const byRound = new Map<number, Fixture[]>();
  for (const fixture of fixtures) {
    const bucket = byRound.get(fixture.round);
    if (bucket) {
      bucket.push(fixture);
    } else {
      byRound.set(fixture.round, [fixture]);
    }
  }

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
          return {
            matchId: fixture.id,
            home: home ? { teamId: home.id, name: home.name, shortName: home.shortName } : null,
            away: away ? { teamId: away.id, name: away.name, shortName: away.shortName } : null,
            homeScore: fixture.homeScore,
            awayScore: fixture.awayScore,
            wentToPenalties: fixture.pkHome != null && fixture.pkAway != null,
            homePenaltyScore: fixture.pkHome,
            awayPenaltyScore: fixture.pkAway,
          };
        }),
      };
    });

  return { rounds };
}
