import Link from "next/link";
import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { computeElapsedMinutes, MatchCard, type MatchCardData } from "@/components/composite/MatchCard";
import { RoundNav } from "@/components/composite/RoundNav";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { DataSource } from "@/lib/data/DataSource";
import type { WorldClockSnapshot } from "@/lib/sim/schedule/worldclock";
import type { Fixture, FixtureStatus, LeagueId, SeasonId, Team, TeamId, Timestamp } from "@/types";

/**
 * `/[lang]/leagues/[leagueId]/fixtures` 일정/결과 — Task 016(41일차, 5팀), 와이어프레임
 * `docs/wireframe/03-일정-결과.md` C1(라운드 네비게이션)·C2(경기 목록)·C3(특수 대진) 구현.
 * B1(리그 헤더·탭)은 순위표 화면과 공유하는 세그먼트 레이아웃(`../layout.tsx`, W-16)이
 * 이미 그린다 — 이 파일은 C1 이하만 담당한다.
 *
 * ## 라운드 = 페이지 단위(무한 스크롤 없음)
 * 리그1은 46라운드 × 12경기 = 552경기라 전량 로드가 불가능하다(화면 목표 §2). 현재 보는
 * 라운드는 `?round=N` 쿼리스트링이 단일 소스이고(I-2 "URL 쿼리에 반영 — 공유·뒤로가기
 * 대응"), 없으면 `getFixtureRoundBounds().currentRound`(진행 중 라운드)로 기본 선택한다
 * (I-1). 범위를 벗어난 값은 clamp한다 — 존재하지 않는 라운드로 빈 화면을 만들지 않는다.
 *
 * ## C2 마크업 — 의도적으로 `<table>`이 아니라 `<ul>`이다 (§7 NFR-A11Y-005와의 편차)
 * 와이어프레임은 "데스크톱 2열 배치여도 마크업은 단일 테이블"을 요구하지만, 이 목록은
 * `MatchCard`(`density="row"`, 34일차 신설 — 애초에 "일정/결과 목록 재사용"을 염두에 두고
 * 인터페이스만 미리 갖춰 뒀던 컴포넌트, 그 파일 헤더 참조)를 재사용한다. `MatchCard`는
 * `<div>` 트리라 `<tr>`/`<td>`로 감쌀 수 없다 — 새 테이블 전용 행 컴포넌트를 또 만들면
 * "동일 데이터·다른 밀도" 중복이 하나 더 생긴다(이미 W-02/SP-2 통합 대상으로 지정돼 있음).
 * 대신 홈 A3(다음 킥오프, `[lang]/page.tsx`)와 같은 판단을 따른다 — 열 헤더가 시각적
 * 배치일 뿐 표 탐색(셀 단위 스크린리더 이동)의 이득이 크지 않은 목록이라 `<ul>` +
 * `aria-label`(캡션 동등)로 마크업한다. **완료 보고에서 이 편차를 팀장에게 알린다** —
 * 필요하면 04(경기상세)와 함께 SP-2 통합 시 진짜 `<table>` 행으로 다시 검토한다.
 *
 * ## LIVE 경과분 — H-24 계약(2팀 `worldclock.ts`) 그대로
 * 홈 A2(`[lang]/page.tsx`, 34~35일차)와 동일하게 `getMatchClockContext`로 `now`/`clock`을
 * 한 번에 얻고 `computeElapsedMinutes`(`MatchCard`가 내보내는 순수 함수)로 계산한다 — 이
 * 페이지가 직접 `Date.now()`를 부르지 않는다(C-2 단서: UI가 "지금"을 읽는 것 자체는
 * 허용되지만, 여기서는 그조차 필요 없다 — 서버가 이미 세계시각 컨텍스트를 준다).
 *
 * ## 알려진 Mock 데이터 갭 — LIVE 라운드 행의 점수가 항상 비어 있다
 * `getFixturesByRound`(LEAGUE)가 슬라이스하는 `schedule.fixtures`는 라운드 생성 시점에
 * `status='LIVE'`인 한 경기를 항상 지정하지만(`schedule.ts` "matchIdx===0 → LIVE"), 점수는
 * `status==='FINISHED'`일 때만 시뮬레이션되므로(`schedule.ts` 동일 블록) 그 LIVE 경기는
 * 영구히 `homeScore/awayScore = null`이다. 홈 A2가 보여주는 "진짜" 라이브 스코어는 완전히
 * 별개 소스(`progress.liveFixtures`, 독립 시드·독립 fixtureId)에서 온다 — 두 목록이 같은
 * 경기를 가리키지 않아 병합할 방법이 없다(이 페이지에서 즉석으로 새 Mock 생성기를 만들지
 * 않는다, `MockDataSource.ts` 파일 헤더 원칙과 동일). 그래서 이 라운드 목록의 LIVE 행은
 * "LIVE" 배지 + 경과분(킥오프 시각 기준으로는 계산 가능)까지는 정확하지만 점수는 대시
 * (`–`)로 남는다 — 점수를 지어내지 않는다(C-23). **완료 보고에 이슈 후보로 남긴다.**
 *
 * ## C3 특수 대진 — Mock에 TIEBREAK 생성기가 없어 상시 빈 배열(40일차와 동일 판단 유지)
 * `getFixturesByRound({..., competitionType: 'TIEBREAK'})`는 이 Mock 팩토리에서 항상 `[]`다
 * (`MockDataSource.getFixturesByRound` 주석 "이 Mock 팩토리는 재경기 시나리오를 생성하지
 * 않는다"). 배선만 해 두고(조건부 렌더, 데이터 생기면 그대로 동작) 실제로는 오늘 렌더되지
 * 않는다 — B4 두 번째 줄과 같은 근거로 팀장 인계 항목("B4 두 번째 줄 … 제외 유지")을 그대로
 * 따른다.
 */
export default async function Page(
  props: PageProps<"/[lang]/leagues/[leagueId]/fixtures">,
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

  const [selectedSeason, roundBounds] = await Promise.all([
    resolveSelectedSeason(dataSource, seasonId),
    dataSource.getFixtureRoundBounds({ leagueId: league.id, seasonId }),
  ]);

  const hasSchedule = roundBounds.maxRound > 0;
  const requestedRound = Number(searchParams.round);
  const currentRound = hasSchedule
    ? clampRound(Number.isFinite(requestedRound) ? requestedRound : roundBounds.currentRound, roundBounds)
    : 0;

  const basePath = `/${locale}/leagues/${leagueId}/fixtures`;
  const seasonLabel = selectedSeason
    ? t(locale, "league.header.seasonLabel", { number: selectedSeason.seasonNumber })
    : "";

  if (!hasSchedule) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t(locale, "fixtures.match.emptySchedule")}
        </p>
      </div>
    );
  }

  const [fixtures, specialFixtures] = await Promise.all([
    dataSource.getFixturesByRound({ leagueId: league.id, round: currentRound, seasonId }),
    dataSource.getFixturesByRound({
      leagueId: league.id,
      round: currentRound,
      seasonId,
      competitionType: "TIEBREAK",
    }),
  ]);

  const teamIds = Array.from(
    new Set(fixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])),
  );
  const [teams, matchClock] = await Promise.all([
    dataSource.getTeamsByIds(teamIds),
    dataSource.getMatchClockContext(fixtures.map((fixture) => fixture.id)),
  ]);
  const teamById = new Map<TeamId, Team>(teams.map((team) => [team.id, team]));

  const cards = fixtures.map((fixture) =>
    buildMatchRowData(fixture, matchClock.clock, matchClock.now, teamById),
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <RoundNav
        locale={locale}
        basePath={basePath}
        currentRound={currentRound}
        minRound={roundBounds.minRound}
        maxRound={roundBounds.maxRound}
        liveRound={roundBounds.currentRound}
        kickoffAt={fixtures[0]?.kickoffAt ?? null}
        seasonParam={seasonId}
      />

      {fixtures.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t(locale, "fixtures.match.emptySchedule")}
        </p>
      ) : (
        <>
          <h2 className="sr-only">
            {t(locale, "fixtures.match.caption", {
              league: league.name,
              season: seasonLabel,
              round: currentRound,
            })}
          </h2>
          <ul
            aria-label={t(locale, "fixtures.match.caption", {
              league: league.name,
              season: seasonLabel,
              round: currentRound,
            })}
            className="flex flex-col gap-2 md:grid md:grid-cols-2"
          >
            {cards.map((card) => (
              <li key={card.id}>
                <Link href={`/${locale}/matches/${card.id}`} className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-md">
                  <MatchCard
                    locale={locale}
                    state={{ status: "ready", data: card }}
                    density="row"
                    hideLeagueName
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {specialFixtures.length > 0 && (
        <section aria-labelledby="fixtures-special-title" className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
          <h2 id="fixtures-special-title" className="eyebrow text-muted-foreground">
            {t(locale, "fixtures.special.title")}
          </h2>
          <ul className="flex flex-col gap-2">
            {specialFixtures.map((fixture) => {
              const home = teamById.get(fixture.homeTeamId);
              const away = teamById.get(fixture.awayTeamId);
              return (
                <li key={fixture.id}>
                  {t(locale, "fixtures.special.tiebreakLabel")} —{" "}
                  {t(locale, "fixtures.match.vsFormat", {
                    home: home?.name ?? fixture.homeTeamId,
                    away: away?.name ?? fixture.awayTeamId,
                  })}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

interface FixtureRoundBoundsLike {
  readonly minRound: number;
  readonly maxRound: number;
}

function clampRound(round: number, bounds: FixtureRoundBoundsLike): number {
  return Math.min(Math.max(round, bounds.minRound), bounds.maxRound);
}

/**
 * 시즌 선택 해석 — `seasonId`가 주어지면 `getSeasons()`(아카이브 포함) 목록에서 찾고,
 * 없거나 못 찾으면 현재 시즌으로 되돌아간다. `SeasonSelect` 컴포넌트 헤더와 동일하게
 * 오늘 Mock은 시즌이 1건뿐이라 사실상 항상 현재 시즌이지만, 배선은 아카이브 대비다.
 */
async function resolveSelectedSeason(dataSource: DataSource, seasonId: SeasonId | undefined) {
  if (!seasonId) {
    return dataSource.getCurrentSeason();
  }
  const seasons = await dataSource.getSeasons();
  return seasons.find((season) => season.id === seasonId) ?? dataSource.getCurrentSeason();
}

/**
 * `Fixture` → `MatchCardData` 변환 — 홈 페이지 `buildMatchCardData`(`[lang]/page.tsx`)와
 * 동일 골격이되, 이 화면은 4개 상태 전량(SCHEDULED/LIVE/FINISHED/VOID)을 실제로 만난다는
 * 점이 다르다(홈 A2는 LIVE만). `homeTeam`/`awayTeam`은 `MatchCard` row 밀도의 엠블럼 배지용
 * (41일차 신규 선택 필드, 그 파일 헤더 참조) — 조회 실패 시에도 이름 텍스트는 항상 있다.
 */
function buildMatchRowData(
  fixture: Fixture,
  clock: WorldClockSnapshot,
  now: Timestamp,
  teamById: ReadonlyMap<TeamId, Team>,
): MatchCardData {
  const status: FixtureStatus = fixture.status;
  const homeTeam = teamById.get(fixture.homeTeamId);
  const awayTeam = teamById.get(fixture.awayTeamId);

  return {
    id: fixture.id,
    leagueName: "",
    homeTeamName: homeTeam?.name ?? fixture.homeTeamId,
    awayTeamName: awayTeam?.name ?? fixture.awayTeamId,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    status,
    kickoffAt: fixture.kickoffAt,
    elapsedMinutes: status === "LIVE" ? computeElapsedMinutes(fixture.kickoffAt, clock, now) : null,
    homeTeam: homeTeam && { name: homeTeam.name, shortName: homeTeam.shortName, crestSeed: homeTeam.crestSeed },
    awayTeam: awayTeam && { name: awayTeam.name, shortName: awayTeam.shortName, crestSeed: awayTeam.crestSeed },
  };
}
