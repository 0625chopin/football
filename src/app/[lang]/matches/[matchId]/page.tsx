import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import type { MatchTeamStatComparison } from "@/lib/data/DataSource";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { SupportedLocale } from "@/i18n/locales";
import { MatchScoreboard } from "@/components/composite/MatchScoreboard";
import type { MatchScoreboardData } from "@/components/composite/MatchScoreboard";
import {
  compareEventChronologically,
  deriveMatchPhase,
  foldMatchScore,
} from "@/components/composite/match-scoreboard";
import { EventTimelineItem } from "@/components/composite/EventTimelineItem";
import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import { PitchLineup, orderStartersByFormation } from "@/components/composite/PitchLineup";
import type { PitchLineupData, PitchLineupStarter } from "@/components/composite/PitchLineup";
import { MatchOddsPanel } from "@/components/composite/MatchOddsPanel";
import { StatBar } from "@/components/domain/StatBar";
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
import type {
  Fixture,
  FixtureId,
  MatchEvent,
  MatchLineup,
  PlayerId,
  PlayerMatchStat,
  Team,
  TeamId,
  WeatherType,
} from "@/types";

/**
 * `/[lang]/matches/[matchId]` 경기 상세 — Task 017(43일차 첫날, 5팀), 와이어프레임
 * `docs/wireframe/04-경기상세라이브중계.md` D1(스코어보드)·D3(이벤트 타임라인) 구현.
 * 45일차: D4(라인업 피치 뷰 + 선수별 평점 테이블)·D5(팀 스탯 비교바) 추가.
 * 46일차: D6(날씨·구장 정보)·D7(배당 패널, 표시 전용) 추가. D2(탭)는 여전히 스코프 밖 —
 * 지금은 D4~D7도 D3 아래 순서대로 쌓아 보여주고, 탭 배선은 이후 잔여 스코프다.
 *
 * ## D6 — 구장·관중·날씨는 세 출처가 다르다
 * 구장명·수용인원은 `Team.stadiumName`/`stadiumCapacity`(E-04, 홈팀 기준 — 중립지 경기의
 * 실제 개최 구장을 가리키는 별도 엔티티는 없다), 관중 수는 `Fixture.attendance`(E-15),
 * 날씨는 `dataSource.getMatchWeather()`(E-18, 1:1) 세 곳에서 각각 온다. `MockDataSource`는
 * 아직 날씨 생성기가 없어(그 파일 주석) 이 부분만 항상 `null` — D5 팀 스탯과 동일한
 * "데이터 계층 미구현" 패턴이라 화면은 그 필드만 조건부로 생략한다(전체를 empty로
 * 떨어뜨리지 않는다 — 구장·관중은 실제로 채워지므로).
 *
 * ## D7 — 배당 패널은 오늘 항상 `empty` 상태다 (재구현 대상 아님)
 * `MatchOddsPanel`(신규, 46일차)은 3팀 H-19(`src/lib/odds/display.ts`의 `OddsDisplayPanel`)
 * 타입을 그대로 ready 데이터로 받는 4상태 컴포넌트다. 다만 `DataSource`에 대진별 배당을
 * 내려주는 메서드가 아직 없다(배당 엔진은 몬테카를로 프리시뮬 호출기까지만 나왔고, 결과
 * 영속·서빙은 039/62일차 소관) — 그래서 이 페이지는 오늘 항상 `{ status: "empty" }`를
 * 넘긴다. 나중에 `DataSource`가 메서드를 갖추면 이 한 줄만 실제 조회로 바꾸면 된다.
 *
 * ## R-11(미래 정보 노출 금지) — 이 페이지는 별도 컷오프 로직을 두지 않는다
 * `dataSource.getMatchEvents()`가 이미 "경과분 이후 이벤트는 절대 포함하지 않는다"는
 * 계약(`DataSource.ts` JSDoc)을 서버에서 강제하므로, 이 페이지는 받은 배열을 그대로
 * 접어(fold)·표시만 한다 — 클라이언트 시계로 다시 거르지 않는다(S-2와 동일 원칙). D4의
 * 선수 평점·D5의 팀 스탯도 동일 계약(`getMatchPlayerRatings`/`getMatchTeamStats` JSDoc,
 * S-1~S-4)을 서버가 강제하므로 여기서도 재필터링하지 않는다.
 *
 * ## 스코어·경과분·페이즈는 전부 파생값 — `Fixture.homeScore`를 직접 쓰지 않는다
 * 와이어프레임 E-1 "스코어 스냅샷은 이벤트에 저장되지 않는다"에 따라 `foldMatchScore`
 * (`./match-scoreboard.ts`)로 노출된 이벤트를 접어 산출한다. 경과분·추가시간은 엔진이
 * 그 틱에 실제로 기록한 마지막 이벤트의 `minute`/`addedTime`을 그대로 표시한다(R-14 ①,
 * `(now − kickoff)` 같은 클라이언트 재계산을 하지 않는다).
 *
 * ## D3 — ASSIST는 GOAL 행에 병합한다(E-2)
 * 엔진이 제공하는 `relatedEventSequence`(`ASSIST → GOAL`, 자식→부모)로 짝짓는다. 같은
 * 분에 여러 골이 나도 시간 근접 추정을 하지 않는다 — 추정은 틀릴 수 있지만 연결 참조는
 * 틀릴 수 없다. 병합된 `ASSIST`는 독립 행으로 다시 그리지 않는다.
 *
 * ## D4 — 선발 11명은 `orderStartersByFormation`으로 피치 슬롯 순서에 맞춘다
 * `MatchLineup`은 포지션(`positionSlot`)만 있고 좌우 순서가 없어, `PitchLineup`이 기대하는
 * "슬롯 순서와 인덱스로 짝짓는" `players` 배열과 그대로 맞지 않는다 —
 * `orderStartersByFormation`(`./PitchLineup.tsx`, 45일차)이 그 변환을 담당한다. 팀당
 * 선발이 없으면(교체 이력·벤치 7명은 이번 스코프 밖) 빈 배열로 `empty` 상태를 그대로
 * 내려보낸다.
 *
 * ## D4/D5 — 신규 composite 없이 `StatBar`/`Table` 조합(와이어프레임 04번 §8 각주)
 * "D4 선수 평점 테이블은 `StatBar` 조합으로 구성하며 신규 컴포넌트를 만들지 않는다"는
 * 각주를 D5 팀 스탯 비교바에도 동일 적용했다 — 두 섹션 모두 이 파일이 직접 조합한다.
 * D5는 홈 쪽 막대를 `[&_[data-slot=progress]]:scale-x-[-1]`로만 좌우 반전해(라벨 텍스트는
 * 별도 형제 요소라 영향 없음) 두 팀 막대가 가운데서 마주보는 대칭 비교바를 만든다.
 *
 * ## 이름 해석 — `DataSource` 배치 조회만 경유(R-10)
 * 팀명은 `getTeamsByIds`(2건, 홈/원정), 선수명은 이벤트의 `primaryPlayerId`/
 * `secondaryPlayerId`(ASSIST 병합분 포함) + 라인업/평점의 `playerId`를 전부 합쳐 중복
 * 제거한 뒤 `getPlayerProfile`로 병렬 조회한다. 선수 배치 조회 메서드가 `DataSource`에
 * 아직 없어(`getTeamsByIds`와 달리) 단건 호출을 **고유 선수 ID당** 한 번만 하도록 미리
 * 중복 제거한다.
 */
export default async function Page(props: PageProps<"/[lang]/matches/[matchId]">) {
  const { lang, matchId } = await props.params;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const fixture = await dataSource.getFixture(matchId as FixtureId);
  if (!fixture) {
    notFound();
  }

  const [events, teams, league, lineups, ratings, teamStats, weather] = await Promise.all([
    dataSource.getMatchEvents(fixture.id),
    dataSource.getTeamsByIds([fixture.homeTeamId, fixture.awayTeamId]),
    fixture.leagueId ? dataSource.getLeague(fixture.leagueId) : Promise.resolve(null),
    dataSource.getMatchLineups(fixture.id),
    dataSource.getMatchPlayerRatings(fixture.id),
    dataSource.getMatchTeamStats(fixture.id),
    dataSource.getMatchWeather(fixture.id),
  ]);

  const homeTeam = teams.find((team) => team.id === fixture.homeTeamId) ?? null;
  const awayTeam = teams.find((team) => team.id === fixture.awayTeamId) ?? null;
  const teamNameById = new Map<TeamId, string>(teams.map((team) => [team.id, team.name]));

  const playerIds = Array.from(
    new Set([
      ...events.flatMap((event) => [event.primaryPlayerId, event.secondaryPlayerId]).filter((id): id is PlayerId => id !== null),
      ...lineups.map((lineup) => lineup.playerId),
      ...ratings.map((rating) => rating.playerId),
    ]),
  );
  const playerProfiles = await Promise.all(playerIds.map((id) => dataSource.getPlayerProfile(id)));
  const playerNameById = new Map<PlayerId, string>();
  playerProfiles.forEach((profile, index) => {
    if (profile) {
      playerNameById.set(playerIds[index], profile.name);
    }
  });

  const scoreboardData = buildScoreboardData(fixture, events, homeTeam, awayTeam, league?.name ?? null);
  const timelineRows = buildTimelineRows(events, teamNameById, playerNameById);
  const homePitchData = buildTeamPitchData(fixture.homeTeamId, homeTeam?.name ?? null, lineups, playerNameById);
  const awayPitchData = buildTeamPitchData(fixture.awayTeamId, awayTeam?.name ?? null, lineups, playerNameById);
  const ratingRows = buildRatingRows(ratings, playerNameById, teamNameById);
  const teamStatRows = buildTeamStatRows(fixture.homeTeamId, fixture.awayTeamId, teamStats);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 p-4 md:p-6">
      <MatchScoreboard locale={locale} state={{ status: "ready", data: scoreboardData }} />

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "match.detail.timelineTitle")}</h2>

        {/* 새 이벤트가 폴링으로 늘어날 때 스크린리더가 자동으로 읽도록 준비해 둔다
            (NFR-A11Y-004). 오늘은 서버 1회 렌더뿐이라 갱신은 없지만, 컨테이너 자체를
            나중에 다시 감쌀 필요가 없도록 지금부터 붙여 둔다. */}
        <div aria-live="polite" className="flex flex-col">
          {timelineRows.length === 0 ? (
            <EventTimelineItem locale={locale} state={{ status: "empty" }} />
          ) : (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card px-4">
              {timelineRows.map((row) => (
                <EventTimelineItem key={row.event.id} locale={locale} state={{ status: "ready", data: row }} />
              ))}
            </div>
          )}
        </div>

        {/* R-11 경계 표시 — "결과를 미리 알 수 있으면 이 화면은 실패"(와이어프레임 04번
            §2)라, 노출이 끊기는 지점을 침묵 대신 명문으로 알린다. FINISHED/VOID는 더
            가릴 미래가 없어 표시하지 않는다. */}
        {fixture.status === "LIVE" && scoreboardData.minute !== null && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span aria-hidden>⏳</span>
            {t(locale, "match.timeline.futureBoundary", { minute: scoreboardData.minute })}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "match.detail.lineupTitle")}</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PitchLineup
            locale={locale}
            state={homePitchData ? { status: "ready", data: homePitchData } : { status: "empty" }}
          />
          <PitchLineup
            locale={locale}
            state={awayPitchData ? { status: "ready", data: awayPitchData } : { status: "empty" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="eyebrow text-muted-foreground">{t(locale, "match.lineup.ratingSectionTitle")}</h3>
          {ratingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t(locale, "match.lineup.ratingEmpty")}</p>
          ) : (
            <Table>
              <TableCaption className="sr-only">
                {t(locale, "match.lineup.ratingCaption", {
                  home: homeTeam?.name ?? fixture.homeTeamId,
                  away: awayTeam?.name ?? fixture.awayTeamId,
                })}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t(locale, "match.lineup.playerColumn")}</TableHead>
                  <TableHead scope="col">{t(locale, "match.lineup.teamColumn")}</TableHead>
                  <TableHead scope="col" className="min-w-[10ch]">
                    {t(locale, "match.lineup.ratingColumn")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ratingRows.map((row) => (
                  <TableRow key={row.stat.playerId}>
                    {/* 팀명 셀만 `scope="row"` — `TableCell`(td)은 scope 속성을 지원하지
                        않는 시맨틱이라 여기만 raw `<th>`로 직접 마크업한다(StandingsTable과
                        동일 패턴, 와이어프레임 04번 §7 NFR-A11Y-005). */}
                    <th scope="row" className="p-2 text-left align-middle font-normal whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {row.playerName}
                        {row.stat.isMotm ? (
                          <Badge variant="secondary">{t(locale, "match.lineup.motmLabel")}</Badge>
                        ) : null}
                      </span>
                    </th>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell>
                      <StatBar
                        locale={locale}
                        label={t(locale, "match.lineup.ratingColumn")}
                        state={{ status: "ready", data: { value: row.stat.matchRating, max: 10 } }}
                        className="w-32"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "match.stat.sectionTitle")}</h2>
        {teamStatRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(locale, "match.stat.empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {teamStatRows.map((row) => (
              <div
                key={row.field}
                className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3"
              >
                <div className="[&_[data-slot=progress]]:scale-x-[-1]">
                  <StatBar
                    locale={locale}
                    label={homeTeam?.name ?? fixture.homeTeamId}
                    state={{ status: "ready", data: { value: row.homeValue, max: row.total } }}
                  />
                </div>
                <span className="eyebrow text-center text-muted-foreground">
                  {t(locale, TEAM_STAT_LABEL_KEYS[row.field])}
                </span>
                <StatBar
                  locale={locale}
                  label={awayTeam?.name ?? fixture.awayTeamId}
                  state={{ status: "ready", data: { value: row.awayValue, max: row.total } }}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "match.info.sectionTitle")}</h2>
        {homeTeam === null && fixture.attendance === null && weather === null ? (
          <p className="text-sm text-muted-foreground">{t(locale, "match.info.empty")}</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-sm">
            {homeTeam && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden>🏟</span>
                {t(locale, "match.info.stadiumFormat", {
                  name: homeTeam.stadiumName,
                  capacity: formatCount(homeTeam.stadiumCapacity, locale),
                })}
              </p>
            )}
            {fixture.attendance !== null && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden>👥</span>
                {t(locale, "match.info.attendanceFormat", { count: formatCount(fixture.attendance, locale) })}
              </p>
            )}
            {weather && (
              <p className="flex items-center gap-1.5">
                <span aria-hidden>{WEATHER_ICON[weather.type]}</span>
                {t(locale, "match.info.weatherFormat", {
                  weather: t(locale, WEATHER_LABEL_KEYS[weather.type]),
                  temperature: weather.temperature,
                })}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="eyebrow text-muted-foreground">{t(locale, "match.odds.sectionTitle")}</h2>
        {/* 46일차 — DataSource에 대진별 배당 조회 메서드가 아직 없어 항상 empty(파일 헤더
            주석 참조). MatchOddsPanel 자체는 ready 데이터를 받을 준비가 이미 돼 있다. */}
        <MatchOddsPanel locale={locale} state={{ status: "empty" }} />
      </section>
    </div>
  );
}

/** D6 관중·수용인원 표기 — 로케일 천단위 구분 기호. `Points`가 아닌 일반 정수라
 * `formatPoints`(4팀 `i18n/format.ts`) 대상이 아니다. */
function formatCount(value: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(value);
}

/** D6 날씨 아이콘 — FR-MT-006 9종. 색 단독 구분이 아니라 아이콘+텍스트 라벨을 항상 병기한다. */
const WEATHER_ICON: Record<WeatherType, string> = {
  CLEAR: "☀️",
  CLOUDY: "☁️",
  RAIN: "🌧",
  HEAVY_RAIN: "⛈",
  SNOW: "❄️",
  WINDY: "💨",
  HOT: "🥵",
  COLD: "🥶",
  FOG: "🌫️",
};

/** D6 날씨 라벨 번역키 — enum → 번역키 매핑(R-2). */
const WEATHER_LABEL_KEYS: Record<WeatherType, TranslationKey> = {
  CLEAR: "match.weather.CLEAR",
  CLOUDY: "match.weather.CLOUDY",
  RAIN: "match.weather.RAIN",
  HEAVY_RAIN: "match.weather.HEAVY_RAIN",
  SNOW: "match.weather.SNOW",
  WINDY: "match.weather.WINDY",
  HOT: "match.weather.HOT",
  COLD: "match.weather.COLD",
  FOG: "match.weather.FOG",
};

/**
 * `Fixture`/노출 이벤트 → `MatchScoreboardData` 변환. 페이즈는 `deriveMatchPhase`로
 * 파생하고, 경과분·추가시간은 시간순 마지막 이벤트의 `minute`/`addedTime`을 그대로
 * 옮긴다(엔진 제공값 표시만, R-14 ①).
 *
 * 스코어는 상태별로 출처가 다르다 — **LIVE만 `foldMatchScore`(E-1)로 이벤트를 접는다.**
 * `FINISHED`는 `Fixture.homeScore`/`awayScore`를 직접 쓴다: 경기가 끝나 더 가릴 미래가
 * 없고(E-1의 우려는 "아직 오지 않은 결과가 새는 것"), Mock의 과거 라운드 FINISHED 경기는
 * 이벤트 로그 자체를 만들지 않는다(`MockDataSource.getMatchEvents`가 빈 배열 반환) — 이
 * 상태에서 접으면 항상 0-0이 나와 실제 최종 스코어와 어긋난다.
 */
function buildScoreboardData(
  fixture: Fixture,
  events: readonly MatchEvent[],
  homeTeam: Team | null,
  awayTeam: Team | null,
  leagueName: string | null,
): MatchScoreboardData {
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  if (fixture.status === "LIVE") {
    ({ homeScore, awayScore } = foldMatchScore(fixture.homeTeamId, fixture.awayTeamId, events));
  } else if (fixture.status === "FINISHED") {
    homeScore = fixture.homeScore;
    awayScore = fixture.awayScore;
  }

  const lastEvent = [...events].sort(compareEventChronologically).at(-1) ?? null;

  return {
    leagueName,
    roundLabel: fixture.roundLabel,
    isNeutral: fixture.isNeutral,
    status: fixture.status,
    phase: deriveMatchPhase(fixture.status, events),
    kickoffAt: fixture.kickoffAt,
    minute: fixture.status === "LIVE" ? lastEvent?.minute ?? 0 : null,
    addedTime: fixture.status === "LIVE" ? lastEvent?.addedTime ?? 0 : 0,
    homeTeamName: homeTeam?.name ?? fixture.homeTeamId,
    awayTeamName: awayTeam?.name ?? fixture.awayTeamId,
    homeTeam: homeTeam ?? undefined,
    awayTeam: awayTeam ?? undefined,
    homeScore,
    awayScore,
    pkHome: fixture.pkHome,
    pkAway: fixture.pkAway,
  };
}

/**
 * D3 타임라인 행 — 시간 역순(최신 위, 와이어프레임 04번 §3-1)으로 정렬하고, `ASSIST`를
 * 자신이 가리키는 `GOAL`(E-2, `relatedEventSequence`)에 병합해 독립 행에서 제외한다.
 */
function buildTimelineRows(
  events: readonly MatchEvent[],
  teamNameById: ReadonlyMap<TeamId, string>,
  playerNameById: ReadonlyMap<PlayerId, string>,
): readonly EventTimelineItemData[] {
  const assistByGoalSequence = new Map<number, MatchEvent>();
  for (const event of events) {
    if (event.type === "ASSIST" && event.relatedEventSequence !== null) {
      assistByGoalSequence.set(event.relatedEventSequence, event);
    }
  }

  return [...events]
    .sort(compareEventChronologically)
    .reverse()
    .filter((event) => event.type !== "ASSIST")
    .map((event) => {
      const assist = assistByGoalSequence.get(event.sequence);
      const secondaryPlayerId = assist ? assist.primaryPlayerId : event.secondaryPlayerId;
      return {
        event,
        teamName: event.teamId ? teamNameById.get(event.teamId) ?? null : null,
        primaryPlayerName: event.primaryPlayerId ? playerNameById.get(event.primaryPlayerId) ?? null : null,
        secondaryPlayerName: secondaryPlayerId ? playerNameById.get(secondaryPlayerId) ?? null : null,
      };
    });
}

/**
 * D4 — 팀별 선발 11명을 `PitchLineup`이 기대하는 `PitchLineupData`로 변환한다.
 * `MatchLineup.positionSlot`을 `orderStartersByFormation`(`./PitchLineup.tsx`)으로 피치
 * 슬롯 순서에 맞춘다. 선발이 없으면(벤치 7명·교체 이력은 이번 스코프 밖) `null`을 반환해
 * 호출부가 `empty` 상태로 내려보내게 한다.
 */
function buildTeamPitchData(
  teamId: TeamId,
  teamName: string | null,
  lineups: readonly MatchLineup[],
  playerNameById: ReadonlyMap<PlayerId, string>,
): PitchLineupData | null {
  const starters = lineups.filter((lineup) => lineup.teamId === teamId && lineup.isStarter);
  if (starters.length === 0) {
    return null;
  }

  const starterInputs: PitchLineupStarter[] = starters.map((lineup) => ({
    player: {
      playerId: lineup.playerId,
      name: playerNameById.get(lineup.playerId) ?? lineup.playerId,
    },
    positionSlot: lineup.positionSlot,
  }));

  const ordered = orderStartersByFormation(starters[0].formation, starterInputs);

  return {
    formation: starters[0].formation,
    teamName,
    players: ordered ?? starterInputs.map((starter) => starter.player),
  };
}

interface RatingRow {
  readonly stat: PlayerMatchStat;
  readonly playerName: string;
  readonly teamName: string;
}

/** D4 평점 테이블 행 — 평점 내림차순(높은 평점이 위)으로 정렬한다. */
function buildRatingRows(
  ratings: readonly PlayerMatchStat[],
  playerNameById: ReadonlyMap<PlayerId, string>,
  teamNameById: ReadonlyMap<TeamId, string>,
): readonly RatingRow[] {
  return [...ratings]
    .sort((a, b) => b.matchRating - a.matchRating)
    .map((stat) => ({
      stat,
      playerName: playerNameById.get(stat.playerId) ?? stat.playerId,
      teamName: teamNameById.get(stat.teamId) ?? stat.teamId,
    }));
}

const TEAM_STAT_FIELDS = [
  "possessionAvg",
  "shots",
  "shotsOnTarget",
  "corners",
  "fouls",
  "yellowCards",
  "redCards",
  "xg",
] as const;

type TeamStatField = (typeof TEAM_STAT_FIELDS)[number];

/** D5 스탯 라벨 번역키 — `match.stat.*`(와이어프레임 04번 §4 지정 프리픽스). */
const TEAM_STAT_LABEL_KEYS: Record<TeamStatField, TranslationKey> = {
  possessionAvg: "match.stat.possession",
  shots: "match.stat.shots",
  shotsOnTarget: "match.stat.shotsOnTarget",
  corners: "match.stat.corners",
  fouls: "match.stat.fouls",
  yellowCards: "match.stat.yellowCards",
  redCards: "match.stat.redCards",
  xg: "match.stat.xg",
};

interface TeamStatRow {
  readonly field: TeamStatField;
  readonly homeValue: number;
  readonly awayValue: number;
  /** 두 값의 합 — 대칭 비교바의 공통 `max`(둘 다 0이면 0, `StatBar`가 0으로 처리한다). */
  readonly total: number;
}

/**
 * D5 팀 스탯 비교바 행. 홈/원정 두 건이 모두 있어야만 비교가 성립하므로, 어느 한쪽이라도
 * 없으면(Mock 미구현 — `MockDataSource.getMatchTeamStats`가 항상 빈 배열) 빈 배열을
 * 반환해 empty 상태로 내려보낸다.
 */
function buildTeamStatRows(
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  teamStats: readonly MatchTeamStatComparison[],
): readonly TeamStatRow[] {
  const homeStat = teamStats.find((stat) => stat.teamId === homeTeamId);
  const awayStat = teamStats.find((stat) => stat.teamId === awayTeamId);
  if (!homeStat || !awayStat) {
    return [];
  }

  return TEAM_STAT_FIELDS.map((field) => ({
    field,
    homeValue: homeStat[field],
    awayValue: awayStat[field],
    total: homeStat[field] + awayStat[field],
  }));
}
