import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { computeElapsedMinutes } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";
import { LiveMatchGrid } from "./LiveMatchGrid";
import { NewsItem } from "@/components/composite/NewsItem";
import type { NewsItemData } from "@/components/composite/NewsItem";
import { PhaseIndicator } from "@/components/state/PhaseIndicator";
import { CountdownTimer } from "@/components/state/CountdownTimer";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { formatKickoff } from "@/i18n/format";
import type { DataSource } from "@/lib/data/DataSource";
import type { WorldClockSnapshot } from "@/lib/sim/schedule/worldclock";
import type {
  Fixture,
  FixtureStatus,
  League,
  LeagueId,
  NewsFeedItem,
  TeamId,
  Timestamp,
} from "@/types";

/** A4 주요 뉴스 요약에 노출할 최대 건수(와이어프레임 01번 A4 "최근 이벤트 3~5건") */
const HOME_NEWS_LIMIT = 5;

/** A3 다음 킥오프 목록에 노출할 최대 행수(와이어프레임 01번 A3 "최대 5행") */
const UPCOMING_KICKOFF_LIMIT = 5;

/**
 * `/[lang]` 홈/라이브센터 — Task 015(34일차 첫날치 + 35일차 인계분, 5팀).
 *
 * ## 35일차 추가분 — A1(시즌·페이즈·카운트다운), A2 폴링(`LiveMatchGrid`), A4(뉴스 요약)
 * `getCurrentSeason()`/`getNextKickoff()`/`getWorldStatus()`/`getNewsFeed()` 네 메서드는
 * 전부 34일차 이전부터 `DataSource`에 존재하던 안정 계약이라 I-169(경과분 `now` 소스 부재,
 * `getMatchClockContext` 신설 대상)와 무관하게 오늘 바로 쓸 수 있다고 판단해 연결했다 —
 * `CountdownTimer` 자체가 "지금"을 서버가 아니라 클라 `Date.now()`로 재는 설계(R-14 ②,
 * 컴포넌트 파일 헤더 참조)라 이 페이지가 서버 시각을 별도로 조회할 필요가 없다.
 *
 * A1의 배속 변경 시 재동기화(구독 기반, H-24 ②)는 021(54일차)로 이월된 D-2 판정 그대로다
 * — 오늘은 최초 서버 렌더 값만 내려주고, `isPaused` prop 하나로 "정지 중 카운트다운
 * 정지"만 성립시킨다(35일차 수락 기준).
 *
 * **A2(라이브 그리드) 5초 폴링·경과분**은 I-169 해소(`getMatchClockContext` 신설, 팀장
 * 전달) 후 오늘 마저 연결했다 — 이 서버 컴포넌트는 최초 1회 스냅샷(SSR/LCP용)만 만들고,
 * 실시간 재조회·경과분 재계산은 클라이언트 컴포넌트 `./LiveMatchGrid`(`usePollingList`
 * 소비, 탭 비활성 시 중단은 1팀 H-02 계약이 담당)로 넘긴다. 자세한 근거는 그 파일 헤더 참조.
 *
 * `FixtureStatus` 4종 전량(SCHEDULED/FINISHED/VOID) 렌더링은 여전히 오늘 스코프 밖이다 —
 * `MatchCard`(34일차 신규, `src/components/composite/MatchCard.tsx`)는 그 상태들도
 * 구조적으로 받을 수 있게 만들어 뒀지만, 이 페이지가 오늘 실제로 조립해 넘기는 데이터는
 * LIVE 경기뿐이다.
 *
 * ## A3(다음 킥오프 목록) — 리그별 "현재 라운드"에서 SCHEDULED만 병합
 * 전 리그·전 대회 통틀어 다음 N건을 한 번에 주는 `DataSource` 메서드가 없어(`getNextKickoff`는
 * 1건만 반환), 리그별로 `getFixtureRoundBounds`→`getFixturesByRound(currentRound)`를 돌려
 * `SCHEDULED` 상태만 걸러 킥오프 시각 오름차순 병합·상위 5건을 취한다(`fetchUpcomingFixtures`).
 * **알려진 한계**: 리그의 현재 라운드가 전부 소진(SCHEDULED 0건)됐는데 다음 라운드로 아직
 * 안 넘어간 경계 시점엔 그 리그가 이번 목록에서 빠질 수 있다 — 다음 라운드까지 조회하는
 * 확장은 오늘 스코프 밖(보고 참조).
 *
 * ## 데이터 경로 — `DataSource` 추상화만 경유한다
 * `getDataSource()`(1팀 `factory.ts`) → 현재는 `NEXT_PUBLIC_DATA_SOURCE` 미설정이라 항상
 * Mock 어댑터(3팀 `MockDataSource`)가 온다. Mock 팩토리(`generateMockWorld` 등)를 이
 * 파일이 직접 호출하지 않는다. 그래야 나중에 Supabase 어댑터로 교체될 때 이 파일은 그대로
 * 두고 데이터 조회 부분만 바뀐다(CLAUDE.md "화면 우선 개발" 원칙). `./LiveMatchGrid`도
 * 동일 원칙 — `getDataSource()`만 경유하고 Mock을 직접 참조하지 않는다.
 *
 * ## 경과분(`elapsedMinutes`) — 35일차 I-169 해소로 연결 완료
 * `MatchCard.computeElapsedMinutes`(34일차 신설)는 `WorldClockSnapshot`과 `now:
 * Timestamp` 두 값이 필요했고, `DataSource`에 "현재 조회 시각" 메서드가 없어(I-169) 34일차엔
 * `elapsedMinutes: null`로 남겨 뒀었다. 35일차에 1팀이 `getMatchClockContext(fixtureIds)`
 * (`now`/`clock`/킥오프 앵커를 원자적으로 반환)로 판정을 확정해 두 값 모두 이 메서드
 * 하나로 얻는다 — `now`/`clock`을 따로 조회하지 않는다(배속 변경 시 두 호출 사이 앵커가
 * 어긋나는 것을 막기 위함, `DataSource.ts`의 `WorldClockContext` 주석 참조).
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (PageProps 헬퍼, Next.js 16 신규 관례)
 */
export default async function Page(props: PageProps<"/[lang]">) {
  const { lang } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  // 루트 레이아웃(`src/app/[lang]/layout.tsx`, 4팀 소유)이 이미 호출하지만, 이 함수는
  // in-flight 프라미스를 캐시하는 멱등 함수라(`bootstrap.ts` 헤더 참조) 여기서 다시
  // 호출해도 중복 초기화 비용이 없다 — 레이아웃/페이지 두 서버 컴포넌트의 렌더 순서를
  // 이 페이지가 전제하지 않도록 방어적으로 한 번 더 보장한다.
  await bootstrapApp();
  const dataSource = getDataSource();

  const [liveFixtures, leagues, season, nextKickoff, world, newsFeed] = await Promise.all([
    dataSource.getLiveFixtures(),
    dataSource.getLeagues(),
    dataSource.getCurrentSeason(),
    dataSource.getNextKickoff(),
    dataSource.getWorldStatus(),
    dataSource.getNewsFeed({ limit: HOME_NEWS_LIMIT }),
  ]);

  // 컵 등 리그 소속이 없는 라이브 경기는 오늘 스코프(3리그 카드 그리드) 밖이라 제외한다.
  const leagueFixtures = liveFixtures.filter(hasLeagueId);

  const [matchClock, upcomingFixtures] = await Promise.all([
    dataSource.getMatchClockContext(leagueFixtures.map((fixture) => fixture.id)),
    fetchUpcomingFixtures(dataSource, leagues),
  ]);

  const teamIds = Array.from(
    new Set([
      ...leagueFixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]),
      ...upcomingFixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]),
    ]),
  );
  const teams = await dataSource.getTeamsByIds(teamIds);

  const teamNameById = new Map<TeamId, string>(teams.map((team) => [team.id, team.name]));
  const leagueNameById = new Map<LeagueId, string>(leagues.map((league) => [league.id, league.name]));

  const cards = leagueFixtures.map((fixture) =>
    buildMatchCardData(fixture, matchClock.clock, matchClock.now, teamNameById, leagueNameById),
  );

  const newsItems = newsFeed.map(buildNewsItemData);

  // `LiveMatchGrid`(클라이언트 컴포넌트)는 별도 모듈 그래프(브라우저 번들)에서 실행되므로
  // `Map`을 props로 그대로 넘길 수 없다(RSC 직렬화 경계 — 함수·클래스 인스턴스 불가,
  // 순수 데이터만 통과). 조회용 평면 객체로 변환해 넘긴다.
  const teamNameRecord: Record<TeamId, string> = Object.fromEntries(teamNameById);
  const leagueNameRecord: Record<LeagueId, string> = Object.fromEntries(leagueNameById);

  return (
    <main className="flex flex-col gap-4 p-6">
      {(season || nextKickoff) && (
        <section className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {season && <PhaseIndicator locale={locale} season={season} />}
          {nextKickoff && (
            <CountdownTimer locale={locale} targetAt={nextKickoff.kickoffAt} isPaused={world.isPaused} />
          )}
        </section>
      )}
      <h1 className="text-lg font-semibold">{t(locale, "match.card.gridTitle")}</h1>
      <LiveMatchGrid
        locale={locale}
        initialCards={cards}
        teamNameById={teamNameRecord}
        leagueNameById={leagueNameRecord}
      />
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{t(locale, "match.upcoming.sectionTitle")}</h2>
        {upcomingFixtures.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "match.upcoming.empty")}</p>
        ) : (
          // NFR-A11Y-005: 열 헤더가 의미 없는 목록이라 표가 아니라 <ul>로 마크업한다.
          <ul className="flex flex-col gap-2">
            {upcomingFixtures.map((fixture) => (
              <li
                key={fixture.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatKickoff(fixture.kickoffAt, locale, "time")}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {t(locale, "match.upcoming.matchupFormat", {
                    home: teamNameById.get(fixture.homeTeamId) ?? fixture.homeTeamId,
                    away: teamNameById.get(fixture.awayTeamId) ?? fixture.awayTeamId,
                  })}
                </span>
                <span className="shrink-0 truncate text-xs text-muted-foreground">
                  {leagueNameById.get(fixture.leagueId) ?? fixture.leagueId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">{t(locale, "match.news.sectionTitle")}</h2>
        {newsItems.length === 0 ? (
          <NewsItem locale={locale} state={{ status: "empty" }} />
        ) : (
          <div className="flex flex-col gap-3">
            {newsItems.map((data) => (
              <NewsItem key={data.id} locale={locale} state={{ status: "ready", data }} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * `NewsFeedItem`(E-26) → `NewsItemData`(`NewsItem` 화면 표시용 로컬 타입) 변환.
 * `category`는 원시 enum 값 그대로 넘긴다 — 번역(`enums.newsFeedItemType` 경유)은 `NewsItem`
 * 컴포넌트 자신이 `locale` prop으로 한다(그 파일 헤더 참조, `MatchCard`가 `FixtureStatus`
 * 라벨을 스스로 번역하는 것과 동일 경계). 이 함수가 미리 번역해 넘기지 않는다.
 */
function buildNewsItemData(item: NewsFeedItem): NewsItemData {
  return {
    id: item.id,
    title: item.headline,
    summary: item.body,
    publishedAt: item.occurredAt,
    category: item.type,
  };
}

function hasLeagueId(fixture: Fixture): fixture is Fixture & { leagueId: LeagueId } {
  return fixture.leagueId !== null;
}

/**
 * A3 다음 킥오프 목록 — 리그별 현재 라운드에서 `SCHEDULED` 상태만 모아 킥오프 시각
 * 오름차순으로 병합, 상위 `UPCOMING_KICKOFF_LIMIT`건을 반환한다. 파일 헤더 "A3" 절의
 * 알려진 한계(라운드 경계 시점 일부 리그 누락 가능) 참조.
 */
async function fetchUpcomingFixtures(
  dataSource: DataSource,
  leagues: readonly League[],
): Promise<readonly (Fixture & { leagueId: LeagueId })[]> {
  const perLeague = await Promise.all(
    leagues.map(async (league) => {
      const bounds = await dataSource.getFixtureRoundBounds({ leagueId: league.id });
      const roundFixtures = await dataSource.getFixturesByRound({
        leagueId: league.id,
        round: bounds.currentRound,
      });
      return roundFixtures.filter((fixture) => fixture.status === "SCHEDULED").filter(hasLeagueId);
    }),
  );

  return perLeague
    .flat()
    .sort((a, b) => (a.kickoffAt < b.kickoffAt ? -1 : a.kickoffAt > b.kickoffAt ? 1 : 0))
    .slice(0, UPCOMING_KICKOFF_LIMIT);
}

function buildMatchCardData(
  fixture: Fixture & { leagueId: LeagueId },
  clock: WorldClockSnapshot,
  now: Timestamp,
  teamNameById: ReadonlyMap<TeamId, string>,
  leagueNameById: ReadonlyMap<LeagueId, string>,
): MatchCardData {
  const status: FixtureStatus = fixture.status;

  return {
    id: fixture.id,
    leagueName: leagueNameById.get(fixture.leagueId) ?? fixture.leagueId,
    homeTeamName: teamNameById.get(fixture.homeTeamId) ?? fixture.homeTeamId,
    awayTeamName: teamNameById.get(fixture.awayTeamId) ?? fixture.awayTeamId,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    status,
    kickoffAt: fixture.kickoffAt,
    // 위 파일 헤더 "경과분 — 35일차 I-169 해소로 연결 완료" 참조.
    elapsedMinutes: status === "LIVE" ? computeElapsedMinutes(fixture.kickoffAt, clock, now) : null,
  };
}
