import { notFound } from "next/navigation";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { MatchScoreboard } from "@/components/composite/MatchScoreboard";
import type { MatchScoreboardData } from "@/components/composite/MatchScoreboard";
import {
  compareEventChronologically,
  deriveMatchPhase,
  foldMatchScore,
} from "@/components/composite/match-scoreboard";
import { EventTimelineItem } from "@/components/composite/EventTimelineItem";
import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import type { Fixture, FixtureId, MatchEvent, PlayerId, Team, TeamId } from "@/types";

/**
 * `/[lang]/matches/[matchId]` 경기 상세 — Task 017(43일차 첫날, 5팀), 와이어프레임
 * `docs/wireframe/04-경기상세라이브중계.md` D1(스코어보드)·D3(이벤트 타임라인) 구현.
 * D2(탭)·D4(라인업)·D5(팀 스탯)·D6(경기 정보)·D7(배당 패널)은 43~48일차 잔여 구간에서
 * 이어진다(오늘 스코프 밖).
 *
 * ## R-11(미래 정보 노출 금지) — 이 페이지는 별도 컷오프 로직을 두지 않는다
 * `dataSource.getMatchEvents()`가 이미 "경과분 이후 이벤트는 절대 포함하지 않는다"는
 * 계약(`DataSource.ts` JSDoc)을 서버에서 강제하므로, 이 페이지는 받은 배열을 그대로
 * 접어(fold)·표시만 한다 — 클라이언트 시계로 다시 거르지 않는다(S-2와 동일 원칙).
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
 * ## 이름 해석 — `DataSource` 배치 조회만 경유(R-10)
 * 팀명은 `getTeamsByIds`(2건, 홈/원정), 선수명은 이벤트에 등장하는 `primaryPlayerId`/
 * `secondaryPlayerId`(ASSIST 병합분 포함)를 중복 제거해 `getPlayerProfile`로 병렬 조회한다.
 * 선수 배치 조회 메서드가 `DataSource`에 아직 없어(`getTeamsByIds`와 달리) 단건 호출을
 * 이벤트당이 아니라 **고유 선수 ID당** 한 번만 하도록 미리 중복 제거한다.
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

  const [events, teams, league] = await Promise.all([
    dataSource.getMatchEvents(fixture.id),
    dataSource.getTeamsByIds([fixture.homeTeamId, fixture.awayTeamId]),
    fixture.leagueId ? dataSource.getLeague(fixture.leagueId) : Promise.resolve(null),
  ]);

  const homeTeam = teams.find((team) => team.id === fixture.homeTeamId) ?? null;
  const awayTeam = teams.find((team) => team.id === fixture.awayTeamId) ?? null;
  const teamNameById = new Map<TeamId, string>(teams.map((team) => [team.id, team.name]));

  const playerIds = Array.from(
    new Set(
      events
        .flatMap((event) => [event.primaryPlayerId, event.secondaryPlayerId])
        .filter((id): id is PlayerId => id !== null),
    ),
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
    </div>
  );
}

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
