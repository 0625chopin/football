import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { MatchCard } from "@/components/composite/MatchCard";
import type { MatchCardData } from "@/components/composite/MatchCard";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { Fixture, FixtureStatus, LeagueId, TeamId } from "@/types";

/**
 * `/[lang]` 홈/라이브센터 — Task 015(34일차, 5팀) 첫날치: **3리그 진행 중 경기 카드
 * 그리드**(실시간 스코어·LIVE 배지)만 다룬다. 폴링 훅(실시간 갱신)·다음 킥오프
 * 카운트다운·뉴스 요약·`FixtureStatus` 4종 전량(SCHEDULED/FINISHED/VOID) 렌더링은
 * 35일차 이후 몫이라 오늘은 손대지 않는다 — `MatchCard`(같은 날 신규, `src/components/
 * composite/MatchCard.tsx`)는 그 상태들도 구조적으로 받을 수 있게 만들어 뒀지만, 이
 * 페이지가 오늘 실제로 조립해 넘기는 데이터는 LIVE 경기뿐이다.
 *
 * ## 데이터 경로 — `DataSource` 추상화만 경유한다
 * `getDataSource()`(1팀 `factory.ts`) → 현재는 `NEXT_PUBLIC_DATA_SOURCE` 미설정이라 항상
 * Mock 어댑터(3팀 `MockDataSource`)가 온다. `getLiveFixtures()`/`getTeamsByIds()`/
 * `getLeagues()` 세 메서드만 쓴다 — Mock 팩토리(`generateMockWorld` 등)를 이 파일이 직접
 * 호출하지 않는다. 그래야 나중에 Supabase 어댑터로 교체될 때 이 파일은 그대로 두고
 * 데이터 조회 부분만 바뀐다(CLAUDE.md "화면 우선 개발" 원칙).
 *
 * ## 경과분(`elapsedMinutes`)을 오늘은 채우지 않는다 — 이슈 후보(팀장 보고)
 * `MatchCard.computeElapsedMinutes`(H-24 `worldclock.ts` 순수 함수 조합, 오늘 신설)는
 * `WorldClockSnapshot`(→ `dataSource.getWorldStatus()`로 구할 수 있다)과 `now: Timestamp`
 * 두 값이 필요하다. 문제는 `now`다 — `DataSource`에 "현재 서버/월드 시각" 조회 메서드가
 * 아직 없고(H-24 전체 소비는 35일차 예정, `docs/dailyWorkLog/30Day.md`), 이 Mock 월드의
 * 모든 시각이 실제 `Date.now()`가 아니라 3팀 Mock 팩토리 내부의 고정 기준
 * (`@/lib/mock/progress`의 `MOCK_NOW`, 2026-08-11 고정값)에 앵커돼 있어 실제 `Date.now()`를
 * 넘기면 킥오프가 아직 "미래"로 계산돼 경과분이 음수가 나온다(직접 계산해 확인: 이 Mock
 * 세계의 `WORLD_CREATED_AT`~`kickoffAt`가 전부 2026-08월에 고정돼 있는데 반해 로컬 wall
 * clock은 2026-07월이다). 그렇다고 `MOCK_NOW`를 이 파일이 직접 import하면 `eslint.config.mjs`
 * Task 044(22일차, 21일차 결함 A 재발 방지) 가드레일 — 프로덕션 코드의 `@/lib/mock/**`
 * 직접 import 금지, `DataSource` 어댑터만 거칠 것 — 를 정면으로 위반한다(`no-restricted-imports`
 * 실측 오류로 확인). 즉 오늘 시점엔 **아키텍처상 올바른 "지금" 값을 구할 방법이 없다** —
 * `Date.now()`로 그럴듯한 오답을 만들기보다 `elapsedMinutes: null`로 두어 `MatchCard`가
 * 그 줄을 아예 렌더링하지 않게 했다(LIVE 배지·스코어는 그대로 정상 표시). 해소되려면
 * `DataSource`에 "현재 조회 시각"을 반환하는 메서드가 새로 생기거나(1팀 판단 필요),
 * 35일차 폴링 훅이 클라이언트 `Date.now()`를 훅 경계에서 주입하는 설계로 대체돼야 한다.
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

  const [liveFixtures, leagues] = await Promise.all([
    dataSource.getLiveFixtures(),
    dataSource.getLeagues(),
  ]);

  // 컵 등 리그 소속이 없는 라이브 경기는 오늘 스코프(3리그 카드 그리드) 밖이라 제외한다.
  const leagueFixtures = liveFixtures.filter(hasLeagueId);

  const teamIds = Array.from(
    new Set(leagueFixtures.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId])),
  );
  const teams = await dataSource.getTeamsByIds(teamIds);

  const teamNameById = new Map<TeamId, string>(teams.map((team) => [team.id, team.name]));
  const leagueNameById = new Map<LeagueId, string>(leagues.map((league) => [league.id, league.name]));

  const cards = leagueFixtures.map((fixture) =>
    buildMatchCardData(fixture, teamNameById, leagueNameById),
  );

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-lg font-semibold">{t(locale, "match.card.gridTitle")}</h1>
      {cards.length === 0 ? (
        <MatchCard locale={locale} state={{ status: "empty" }} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((data) => (
            <MatchCard key={data.id} locale={locale} state={{ status: "ready", data }} />
          ))}
        </div>
      )}
    </main>
  );
}

function hasLeagueId(fixture: Fixture): fixture is Fixture & { leagueId: LeagueId } {
  return fixture.leagueId !== null;
}

function buildMatchCardData(
  fixture: Fixture & { leagueId: LeagueId },
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
    // 위 파일 헤더 "경과분을 오늘은 채우지 않는다" 참조 — DataSource에 "지금" 조회
    // 메서드가 생기기 전까지는 의도적으로 null(이슈 후보, 팀장 보고).
    elapsedMinutes: null,
  };
}
