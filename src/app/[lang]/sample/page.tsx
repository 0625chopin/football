import type { ReactNode } from "react";

import { DEFAULT_LOCALE, isSupportedLocale, type SupportedLocale } from "@/i18n/locales";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadMoreLink } from "@/components/ui/LoadMoreLink";
import { Separator } from "@/components/ui/separator";

import type { BracketParticipant, BracketTreeData } from "@/components/composite/BracketTree";
import type { EventTimelineItemData } from "@/components/composite/EventTimelineItem";
import type { InjuryTimelineData } from "@/components/composite/InjuryTimeline";
import type { MatchCardData } from "@/components/composite/MatchCard";
import type { MatchScoreboardData } from "@/components/composite/MatchScoreboard";
import {
  compareEventChronologically,
  deriveMatchPhase,
  foldMatchScore,
} from "@/components/composite/match-scoreboard";
import type { NewsItemData } from "@/components/composite/NewsItem";
import type { PitchLineupData } from "@/components/composite/PitchLineup";
import type { StandingRowData, StandingsTableData } from "@/components/composite/StandingsTable";
import type {
  TrophyCaseAwardRow,
  TrophyCaseData,
  TrophyCaseTrophyRow,
} from "@/components/composite/TrophyCase";
import { ZoneLegend } from "@/components/composite/ZoneLegend";
import { resolveStandingZone } from "@/components/composite/standings-zone";

import { CountdownTimer } from "@/components/state/CountdownTimer";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorBoundary } from "@/components/state/ErrorBoundary";
import { ErrorState } from "@/components/state/ErrorState";
import { OddsButton } from "@/components/state/OddsButton";
import { PhaseIndicator } from "@/components/state/PhaseIndicator";
import { SkeletonBlock } from "@/components/state/SkeletonBlock";

import { CoverageChecklist } from "./CoverageChecklist";
import { DataSourceToggle } from "./DataSourceToggle";
import { LocaleCompareToggle } from "./LocaleCompareToggle";
import { StateToggleSlot } from "./StateToggleSlot";
import { ViewportFrame } from "./ViewportFrame";
import { computeComponentCoverage } from "./component-registry";

import { computeTranslationKeyCoverage } from "@/i18n/coverage";
import { getDataSource, getDataSourceKind } from "@/lib/data/factory";
import type {
  AwardId,
  Fixture,
  Injury,
  InjuryId,
  PlayerAttributeHistory,
  Seed,
  TeamId,
  TrophyId,
} from "@/types";

/**
 * `/[lang]/sample` 컴포넌트 쇼케이스 — Task 014(34~35일차, 4팀).
 *
 * 34일차 스코프: 카테고리별 섹션 레이아웃 + 앵커 내비게이션 + 21종 전량 등록.
 * 35일차 추가분: domain 8종·composite 8종(MatchCard 신규 등록 포함, 총 22종)에
 * `StateToggleSlot`으로 4상태(loading/empty/error/ready) 토글을 붙이고, 전체 섹션을
 * `ViewportFrame`으로 감싸 모바일/태블릿/데스크톱 뷰포트 프리뷰를 지원한다(state 6종은
 * I-168에 따라 4상태 대상이 아니라 토글 없이 정적 표시 유지). ErrorBoundary·커버리지
 * 카운터·어댑터 토글은 이후 회차로 이월한다.
 *
 * 36일차 추가분: **로케일 전환 컨트롤**(D-18, 수락 기준 "즉시 전환") — 이미 조회해 둔 데이터로
 * 쇼케이스 본문을 ko/en 두 번 렌더(`renderShowcaseBody`)하고, `LocaleCompareToggle`(신설,
 * 클라이언트)이 라우트 이동 없이 둘 중 하나만 조건부 마운트해 전환한다. 설계 근거와 헤더
 * `LocaleSwitcher`와의 차이는 그 파일 헤더 주석 참조.
 *
 * 37일차 추가분: **컴포넌트별 `ErrorBoundary` 격리** — `ComponentSlot`(22개 사용처 전량)이
 * 각자의 `children`을 `@/components/state/ErrorBoundary`(Next.js 16.2 `unstable_catchError`
 * 기반, 신설)로 감싼다. 하나가 렌더 중 던져도 그 슬롯 카드 안에서만 대체 UI로 멈추고
 * 나머지 21종은 정상 렌더된다. **어댑터 토글(Mock↔Supabase, UC-602)** — `DataSourceToggle`
 * (신설, 클라이언트)이 `data-source-actions.ts`의 서버 액션을 통해 `NEXT_PUBLIC_DATA_SOURCE`를
 * 런타임에 바꾸고 `factory.ts`의 `resetDataSourceCache()`로 캐시를 비운 뒤 이 라우트를
 * 재검증한다 — 설계 근거·안전장치(전환 실패 시 자동 복귀)는 그 파일 헤더 주석 참조.
 *
 * 38일차 추가분: **커버리지 체크리스트** — `CoverageChecklist`(신설)가 등록 컴포넌트 수·
 * 4상태 구현 수·번역 키 누락 수 3개 카운터를 표시한다. 숫자는 전부 실제로 센 값이다(하드코딩
 * 아님) — 컴포넌트 쪽은 `component-registry.ts`의 `computeComponentCoverage()`가
 * `StateToggleSlot`의 실제 디스패치 레지스트리 키 수를 그대로 세고, 번역 키 쪽은
 * `@/i18n/coverage`의 `computeTranslationKeyCoverage()`가 `messages.ko`/`messages.en`
 * 카탈로그를 런타임에 순회해 diff한다. 아래 domain/composite/state 섹션의 `count` 배지도
 * 같은 레지스트리 값(`coverage.domainCount` 등)으로 교체해 매직 넘버(8/8/6) 중복을 없앴다.
 *
 * `MatchCard`(5팀 Task 015, 34일차 구현 완료)를 composite 섹션에 8번째로 등록한다.
 * 차트/어드민 카테고리는 전용 컴포넌트가 아직 없어 섹션 골격만 두고 "미구현"으로 표기한다
 * (복합 카테고리의 `GrowthChart`가 1차 차트 구현이며 그쪽에서 이미 등록된다).
 *
 * Mock 데이터는 `src/lib/mock/**`(3팀 소유)를 직접 import하지 않고 항상 `getDataSource()`
 * (`@/lib/data/factory`) 어댑터를 경유한다 — 프로덕션 코드가 `src/lib/mock/**`를 직접
 * import하면 ESLint(Task 044, 21일차 결함 A 재발 방지)가 막는다. `Injury`/`Trophy`/`Award`/
 * `PlayerAttributeHistory`는 `MockDataSource`가 아직 `[]`만 반환한다(economy/성장·수상
 * 파이프라인, 21·28일차 이후 생성기 예정 — `MockDataSource.ts` 파일 헤더 "데이터가 없는
 * 메서드" 절 참조). 그 3+1종만 어댑터가 실제로 반환하는 ID(`samplePlayer`/`sampleTeam`/
 * `season`)를 참조하는 이 쇼케이스 전용 최소 인라인 표본으로 보완한다(새 mock 팩토리
 * 파일을 만들지 않음 — 그 소유 경로는 3팀).
 */

interface CategoryDef {
  readonly id: "domain" | "composite" | "state" | "chart" | "admin";
  readonly navKey: TranslationKey;
}

const CATEGORIES: readonly CategoryDef[] = [
  { id: "domain", navKey: "sample.nav.domain" },
  { id: "composite", navKey: "sample.nav.composite" },
  { id: "state", navKey: "sample.nav.state" },
  { id: "chart", navKey: "sample.nav.chart" },
  { id: "admin", navKey: "sample.nav.admin" },
];

function ComponentSlot({
  name,
  locale,
  children,
}: {
  readonly name: string;
  readonly locale: SupportedLocale;
  readonly children: ReactNode;
}) {
  return (
    <Card size="sm" className="gap-3">
      <CardHeader>
        <CardTitle className="font-mono text-xs text-muted-foreground">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 37일차 — 컴포넌트 하나가 렌더 중 던져도 이 슬롯 안에서만 격리한다(파일 헤더 참조 및
            src/components/state/ErrorBoundary.tsx 헤더 주석). */}
        <ErrorBoundary locale={locale} name={name}>
          {children}
        </ErrorBoundary>
      </CardContent>
    </Card>
  );
}

function ShowcaseSection({
  id,
  title,
  description,
  count,
  children,
}: {
  readonly id: CategoryDef["id"];
  readonly title: string;
  readonly description: string;
  readonly count?: number;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {count !== undefined && (
          <Badge variant="secondary" className="shrink-0">
            {count}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function NotImplementedPanel({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-10 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default async function Page(props: PageProps<"/[lang]/sample">) {
  const { lang } = await props.params;
  const locale: SupportedLocale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  /* ── Mock 데이터 조립 (프로덕션 규약대로 `getDataSource()` 어댑터 경유) ─── */
  const currentDataSourceKind = getDataSourceKind();
  // 37일차 팀장 지적 — `DataSourceToggle`은 프로덕션 빌드에서 렌더하지 않는다(보조 장치일
  // 뿐, 실제 방어선은 `data-source-actions.ts`의 서버 측 조기 반환이다. 그 파일 헤더 참조).
  const showDataSourceToggle = process.env.NODE_ENV === "development";
  const dataSource = getDataSource();

  // 38일차 — 커버리지 체크리스트 집계는 로케일·데이터소스 무관이라 한 번만 계산해 아래
  // `renderShowcaseBody`(ko/en 두 번 호출) 양쪽이 같은 값을 클로저로 참조한다.
  const componentCoverage = computeComponentCoverage();
  const translationKeyCoverage = computeTranslationKeyCoverage();

  const leagues = await dataSource.getLeagues();
  const primaryLeague = leagues[0] ?? null;

  const [season, standings, liveFixtures, cupBracket, newsFeedItems] = await Promise.all([
    dataSource.getCurrentSeason(),
    primaryLeague ? dataSource.getStandings({ leagueId: primaryLeague.id }) : Promise.resolve([]),
    dataSource.getLiveFixtures(),
    dataSource.getCupBracket(),
    dataSource.getNewsFeed({ limit: 1 }),
  ]);

  const sampleStanding = standings[0] ?? null;
  const sampleTeamId = sampleStanding?.teamId ?? null;

  const [sampleTeam, squad, squadStates, statRanking] = await Promise.all([
    sampleTeamId ? dataSource.getTeam(sampleTeamId) : Promise.resolve(null),
    sampleTeamId ? dataSource.getTeamSquad(sampleTeamId) : Promise.resolve([]),
    sampleTeamId ? dataSource.getTeamSquadStates(sampleTeamId) : Promise.resolve([]),
    primaryLeague
      ? dataSource.getPlayerStatRanking({
          leagueId: primaryLeague.id,
          competitionType: "LEAGUE",
          metric: "goals",
          limit: 1,
        })
      : Promise.resolve([]),
  ]);

  const samplePlayer = squad[0] ?? null;
  const samplePlayerAttribute = samplePlayer ? await dataSource.getPlayerAttribute(samplePlayer.id) : null;
  const samplePlayerState = samplePlayer
    ? (squadStates.find((s) => s.playerId === samplePlayer.id) ?? null)
    : null;

  const sampleFixture = liveFixtures[0] ?? null;
  const matchEvents = sampleFixture ? await dataSource.getMatchEvents(sampleFixture.id) : [];
  const sampleEvent = matchEvents.find((event) => event.type === "GOAL") ?? matchEvents[0] ?? null;

  const teamIdsToResolve = new Set<TeamId>();
  for (const fixture of cupBracket) {
    teamIdsToResolve.add(fixture.homeTeamId);
    teamIdsToResolve.add(fixture.awayTeamId);
  }
  if (sampleEvent?.teamId) teamIdsToResolve.add(sampleEvent.teamId);
  if (sampleFixture) {
    teamIdsToResolve.add(sampleFixture.homeTeamId);
    teamIdsToResolve.add(sampleFixture.awayTeamId);
  }
  // StandingsTable(39일차, 5팀 016 등록분) 행 표시용 팀명 — 아래 벌크 조회에 함께 담는다.
  for (const standing of standings) {
    teamIdsToResolve.add(standing.teamId);
  }
  const [teamsForDisplay, eventPrimaryPlayer, eventSecondaryPlayer] = await Promise.all([
    dataSource.getTeamsByIds([...teamIdsToResolve]),
    sampleEvent?.primaryPlayerId
      ? dataSource.getPlayerProfile(sampleEvent.primaryPlayerId)
      : Promise.resolve(null),
    sampleEvent?.secondaryPlayerId
      ? dataSource.getPlayerProfile(sampleEvent.secondaryPlayerId)
      : Promise.resolve(null),
  ]);
  const teamById = new Map(teamsForDisplay.map((team) => [team.id, team] as const));

  /* ── domain 8종 ────────────────────────────────────────────────────── */
  const teamBadgeData = sampleTeam
    ? { name: sampleTeam.name, shortName: sampleTeam.shortName, crestSeed: sampleTeam.crestSeed }
    : null;
  const playerAvatarData = samplePlayer ? { id: samplePlayer.id, name: samplePlayer.name } : null;
  const abilityRadarData = samplePlayerAttribute ?? null;
  const conditionGaugeData = samplePlayerState
    ? { condition: samplePlayerState.condition, fitness: samplePlayerState.fitness }
    : null;
  const fitnessBarData = samplePlayerState ? { fitness: samplePlayerState.fitness } : null;
  const formStripData = sampleStanding ? { form: sampleStanding.form } : null;
  const positionMapData = samplePlayer ? { position: samplePlayer.preferredPosition } : null;
  const sampleStatLeader = statRanking[0] ?? null;
  const statBarData = sampleStatLeader ? { value: sampleStatLeader.goals, max: 30 } : null;

  /* ── composite 8종(MatchCard 포함) ────────────────────────────────── */
  function toParticipant(teamId: TeamId): BracketParticipant {
    const team = teamById.get(teamId);
    return { teamId, name: team?.name ?? teamId, shortName: team?.shortName };
  }

  const bracketRoundsMap = new Map<number, Fixture[]>();
  for (const fixture of cupBracket) {
    const list = bracketRoundsMap.get(fixture.round) ?? [];
    list.push(fixture);
    bracketRoundsMap.set(fixture.round, list);
  }
  const bracketTreeData: BracketTreeData = {
    rounds: [...bracketRoundsMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, fixtures]) => ({
        label: fixtures[0]?.roundLabel ?? "",
        matches: fixtures.map((fixture) => ({
          matchId: fixture.id,
          home: toParticipant(fixture.homeTeamId),
          away: toParticipant(fixture.awayTeamId),
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          wentToPenalties: fixture.pkHome != null && fixture.pkAway != null,
          homePenaltyScore: fixture.pkHome,
          awayPenaltyScore: fixture.pkAway,
        })),
      })),
  };
  const bracketTreeReadyData = bracketTreeData.rounds.length > 0 ? bracketTreeData : null;

  const eventTimelineData: EventTimelineItemData | null = sampleEvent
    ? {
        event: sampleEvent,
        teamName: sampleEvent.teamId ? (teamById.get(sampleEvent.teamId)?.name ?? null) : null,
        primaryPlayerName: eventPrimaryPlayer?.name ?? null,
        secondaryPlayerName: eventSecondaryPlayer?.name ?? null,
      }
    : null;

  // Injury/Trophy/Award/PlayerAttributeHistory — `MockDataSource`가 아직 `[]`만 반환하는
  // 엔티티(위 파일 헤더 주석 참조). 실제 `samplePlayer`/`sampleTeam`/`season` ID를
  // 참조하되, 엔티티 본체는 이 쇼케이스 전용 최소 표본으로 손으로 구성한다.
  const injuryTimelineData: InjuryTimelineData | null =
    samplePlayer && season
      ? {
          injuries: [
            {
              id: "sample-injury-1" as InjuryId,
              playerId: samplePlayer.id,
              matchId: null,
              seasonId: season.id,
              severity: "MODERATE",
              typeLabel: "햄스트링 부상",
              occurredRound: 4,
              roundsOut: 3,
              returnRound: 7,
              status: "RECOVERED",
            },
            {
              id: "sample-injury-2" as InjuryId,
              playerId: samplePlayer.id,
              matchId: null,
              seasonId: season.id,
              severity: "KNOCK",
              typeLabel: "타박상",
              occurredRound: 9,
              roundsOut: 1,
              returnRound: 10,
              status: "ACTIVE",
            },
          ] satisfies readonly Injury[],
          totalRounds: 20,
        }
      : null;

  const sampleNews = newsFeedItems[0] ?? null;
  const newsItemData: NewsItemData | null = sampleNews
    ? {
        id: sampleNews.id,
        title: sampleNews.headline,
        summary: sampleNews.body,
        publishedAt: sampleNews.occurredAt,
        category: sampleNews.type,
      }
    : null;

  const pitchLineupData: PitchLineupData | null = sampleTeam
    ? {
        formation: "4-4-2",
        teamName: sampleTeam.name,
        players: squad.slice(0, 11).map((player, index) => ({
          playerId: player.id,
          name: player.name,
          isCaptain: index === 0,
        })),
      }
    : null;
  const pitchLineupReadyData =
    pitchLineupData && pitchLineupData.players.length > 0 ? pitchLineupData : null;

  const trophyCaseData: TrophyCaseData | null =
    sampleTeam && samplePlayer && season
      ? {
          trophies: [
            {
              trophy: {
                id: "sample-trophy-1" as TrophyId,
                seasonId: season.id,
                teamId: sampleTeam.id,
                type: "LEAGUE_TITLE",
                leagueId: primaryLeague?.id ?? null,
              },
              seasonLabel: `S${season.seasonNumber}`,
            },
          ] satisfies readonly TrophyCaseTrophyRow[],
          awards: [
            {
              award: {
                id: "sample-award-1" as AwardId,
                seasonId: season.id,
                type: "GOLDEN_BOOT",
                scope: "LEAGUE",
                leagueId: primaryLeague?.id ?? null,
                playerId: samplePlayer.id,
                managerId: null,
                teamId: null,
                criteria: {},
              },
              seasonLabel: `S${season.seasonNumber}`,
            },
          ] satisfies readonly TrophyCaseAwardRow[],
        }
      : null;

  const growthHistory: readonly PlayerAttributeHistory[] =
    samplePlayer && samplePlayerAttribute
      ? [0, 1, 2].map((offset) => {
          const { ovrCached: _ovrCached, ...attributeValues } = samplePlayerAttribute;
          return {
            ...attributeValues,
            playerId: samplePlayer.id,
            seasonNumber: offset + 1,
            ovr: Math.max(1, samplePlayerAttribute.ovrCached - (2 - offset) * 2),
          };
        })
      : [];
  const growthChartReadyData = growthHistory.length > 0 ? growthHistory : null;

  const matchCardData: MatchCardData | null = sampleFixture
    ? {
        id: sampleFixture.id,
        leagueName: primaryLeague?.name ?? "",
        homeTeamName: teamById.get(sampleFixture.homeTeamId)?.name ?? sampleFixture.homeTeamId,
        awayTeamName: teamById.get(sampleFixture.awayTeamId)?.name ?? sampleFixture.awayTeamId,
        homeScore: sampleFixture.homeScore,
        awayScore: sampleFixture.awayScore,
        status: sampleFixture.status,
        kickoffAt: sampleFixture.kickoffAt,
        // H-24 계약상 이 컴포넌트가 경과분을 계산하지 않는다(MatchCard.tsx 파일 헤더 참조) —
        // 실시간 계산이 필요한 소비처(홈/라이브센터)는 5팀 Task 015 소관이라, 쇼케이스는
        // 정적 표시로 충분해 항상 null을 넘긴다.
        elapsedMinutes: null,
      }
    : null;

  // MatchScoreboard(43일차, 5팀 Task 017 — /sample 등록은 4팀 인계분). 상태 다양성이
  // 드러나도록 LIVE/FINISHED 두 슬롯을 둔다(팀장 지침).
  //
  // LIVE — 위에서 이미 조회한 실제 라이브 픽스처(`sampleFixture`/`matchEvents`)를 그대로
  // 쓴다. 스코어는 컴포넌트 계약대로 `Fixture.homeScore`를 직접 넘기지 않고 `foldMatchScore`
  // (이벤트 접기)로 산출한다(파일 헤더 E-1). `minute`/`addedTime`은 H-24 실시간 계산을
  // 새로 구현하지 않는다(`MatchCard.computeElapsedMinutes` 헤더 주석과 동일 판단 — 쇼케이스는
  // 정적 스냅샷으로 충분하다) — 대신 이미 받아 둔 이벤트 중 가장 나중 것의 (minute,
  // addedTime)을 근사치로 보여준다.
  const sortedMatchEvents = [...matchEvents].sort(compareEventChronologically);
  const latestMatchEvent = sortedMatchEvents[sortedMatchEvents.length - 1] ?? null;

  const matchScoreboardLiveData: MatchScoreboardData | null = sampleFixture
    ? {
        leagueName: primaryLeague?.name ?? null,
        roundLabel: sampleFixture.roundLabel,
        isNeutral: sampleFixture.isNeutral,
        status: sampleFixture.status,
        phase: deriveMatchPhase(sampleFixture.status, matchEvents),
        kickoffAt: sampleFixture.kickoffAt,
        minute: latestMatchEvent?.minute ?? null,
        addedTime: latestMatchEvent?.addedTime ?? 0,
        homeTeamName: teamById.get(sampleFixture.homeTeamId)?.name ?? sampleFixture.homeTeamId,
        awayTeamName: teamById.get(sampleFixture.awayTeamId)?.name ?? sampleFixture.awayTeamId,
        homeTeam: teamById.get(sampleFixture.homeTeamId),
        awayTeam: teamById.get(sampleFixture.awayTeamId),
        ...foldMatchScore(sampleFixture.homeTeamId, sampleFixture.awayTeamId, matchEvents),
        pkHome: null,
        pkAway: null,
      }
    : null;

  // FINISHED — 실제 종료 픽스처를 이 화면이 따로 조회하지 않으므로(추가 조회 비용 없이
  // 기존에 이미 받아 둔 리그 순위표 상위 두 팀으로 표시만 꾸민다), 스코어·라운드는 다른
  // 종료 예시(`TrophyCase`의 `sample-award-1` 등)와 동일하게 화면 전용 표본값이다 — 실제
  // 경기 결과가 아니다.
  const finishedHomeStanding = standings[0] ?? null;
  const finishedAwayStanding = standings[1] ?? null;
  const matchScoreboardFinishedData: MatchScoreboardData | null =
    finishedHomeStanding && finishedAwayStanding
      ? {
          leagueName: primaryLeague?.name ?? null,
          roundLabel: "R1",
          isNeutral: false,
          status: "FINISHED",
          phase: "FULL_TIME",
          kickoffAt: sampleFixture?.kickoffAt ?? "1970-01-01T00:00:00.000Z",
          minute: null,
          addedTime: 0,
          homeTeamName: teamById.get(finishedHomeStanding.teamId)?.name ?? finishedHomeStanding.teamId,
          awayTeamName: teamById.get(finishedAwayStanding.teamId)?.name ?? finishedAwayStanding.teamId,
          homeTeam: teamById.get(finishedHomeStanding.teamId),
          awayTeam: teamById.get(finishedAwayStanding.teamId),
          homeScore: 2,
          awayScore: 1,
          pkHome: null,
          pkAway: null,
        }
      : null;

  // StandingsTable(39일차, 5팀 Task 016 — /sample 등록은 4팀 인계분) — 표 전체 24행은
  // 불필요해(팀장 인계 지침) 순위 상위 몇 행만 표본으로 쓴다. 존 판정(`resolveStandingZone`)
  // 은 5팀 소유 순수 함수를 그대로 재사용하고(로직 복제 금지), 팀 표시 정보는 위에서 이미
  // 벌크 조회한 `teamById`를 그대로 재사용한다(N+1 방지).
  const STANDINGS_SAMPLE_ROW_COUNT = 6;
  const standingsRows: readonly StandingRowData[] = primaryLeague
    ? [...standings]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, STANDINGS_SAMPLE_ROW_COUNT)
        .map((standing) => {
          const team = teamById.get(standing.teamId);
          return {
            rank: standing.rank,
            zone: resolveStandingZone(standing.rank, primaryLeague),
            teamId: standing.teamId,
            team: {
              name: team?.name ?? standing.teamId,
              shortName: team?.shortName ?? standing.teamId,
              crestSeed: team?.crestSeed ?? (0 as Seed),
            },
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
        })
    : [];
  const standingsTableData: StandingsTableData | null =
    primaryLeague && season && standingsRows.length > 0
      ? {
          leagueName: primaryLeague.name,
          seasonLabel: `S${season.seasonNumber}`,
          rows: standingsRows,
        }
      : null;

  // ZoneLegend(39일차, 5팀 Task 016) — 4상태 계약이 없는 순수 표시 컴포넌트라(`league` prop만
  // 받음) StateToggleSlot 토글 대상이 아니다. 팀장 인계 지침대로 tier가 다른 예시 2개를
  // 정적으로 나란히 보여준다: 승격이 있는 리그(tier>1)와 강등이 없는 리그(tier=3, 최하위).
  const zoneLegendPromotionLeague = leagues.find((league) => league.tier > 1) ?? null;
  const zoneLegendNoRelegationLeague = leagues.find((league) => league.tier === 3) ?? null;

  /* ── state 6종(4상태 규약 비대상) ──────────────────────────────────── */
  const phaseIndicatorRound = { current: 10, total: 20 };

  /**
   * 쇼케이스 본문 하나를 특정 로케일로 렌더한다. `Page` 안에서 이미 조회한 데이터(위 전체)를
   * 클로저로 그대로 참조하고 — 데이터 자체는 로케일에 무관하다(D-17, 선수·팀 이름은 번역
   * 대상이 아니다) — 문자열만 `bodyLocale`로 조회한다. `LocaleCompareToggle`이 이 함수를
   * "ko"/"en" 두 번 호출해 결과를 `ko`/`en` prop으로 받는다(파일 헤더 주석 참조).
   */
  function renderShowcaseBody(bodyLocale: SupportedLocale) {
    return (
      <div className="space-y-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">{t(bodyLocale, "sample.meta.title")}</h1>
          <p className="text-sm text-muted-foreground">{t(bodyLocale, "sample.meta.description")}</p>
        </header>

        <CoverageChecklist
          locale={bodyLocale}
          registeredCount={componentCoverage.registeredCount}
          fourStateImplementedCount={componentCoverage.fourStateImplementedCount}
          fourStateEligibleCount={componentCoverage.fourStateEligibleCount}
          missingTranslationKeyCount={translationKeyCoverage.missingCount}
        />

        <ViewportFrame locale={bodyLocale}>
          <nav
            aria-label={t(bodyLocale, "sample.meta.title")}
            className="sticky top-0 z-10 -mx-6 flex flex-wrap gap-2 border-b border-border bg-background/95 px-6 py-3 backdrop-blur"
          >
            {CATEGORIES.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {t(bodyLocale, category.navKey)}
              </a>
            ))}
          </nav>

          <ShowcaseSection
            id="domain"
            title={t(bodyLocale, "sample.section.domainTitle")}
            description={t(bodyLocale, "sample.section.domainDescription")}
            count={componentCoverage.domainCount}
          >
            <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
              <ComponentSlot name="AbilityRadar" locale={bodyLocale}>
                <StateToggleSlot
                  name="AbilityRadar"
                  componentKey="AbilityRadar"
                  locale={bodyLocale}
                  readyData={abilityRadarData}
                />
              </ComponentSlot>
              <ComponentSlot name="ConditionGauge" locale={bodyLocale}>
                <StateToggleSlot
                  name="ConditionGauge"
                  componentKey="ConditionGauge"
                  locale={bodyLocale}
                  readyData={conditionGaugeData}
                />
              </ComponentSlot>
              <ComponentSlot name="FitnessBar" locale={bodyLocale}>
                <StateToggleSlot
                  name="FitnessBar"
                  componentKey="FitnessBar"
                  locale={bodyLocale}
                  readyData={fitnessBarData}
                />
              </ComponentSlot>
              <ComponentSlot name="FormStrip" locale={bodyLocale}>
                <StateToggleSlot
                  name="FormStrip"
                  componentKey="FormStrip"
                  locale={bodyLocale}
                  readyData={formStripData}
                />
              </ComponentSlot>
              <ComponentSlot name="PlayerAvatar" locale={bodyLocale}>
                <StateToggleSlot
                  name="PlayerAvatar"
                  componentKey="PlayerAvatar"
                  locale={bodyLocale}
                  readyData={playerAvatarData}
                />
              </ComponentSlot>
              <ComponentSlot name="PositionMap" locale={bodyLocale}>
                <StateToggleSlot
                  name="PositionMap"
                  componentKey="PositionMap"
                  locale={bodyLocale}
                  readyData={positionMapData}
                />
              </ComponentSlot>
              <ComponentSlot name="StatBar" locale={bodyLocale}>
                <StateToggleSlot
                  name="StatBar"
                  componentKey="StatBar"
                  locale={bodyLocale}
                  readyData={statBarData}
                  extraProps={{ label: t(bodyLocale, "stat.leaderboard.title") }}
                />
              </ComponentSlot>
              <ComponentSlot name="TeamBadge" locale={bodyLocale}>
                <StateToggleSlot
                  name="TeamBadge"
                  componentKey="TeamBadge"
                  locale={bodyLocale}
                  readyData={teamBadgeData}
                />
              </ComponentSlot>
            </div>
          </ShowcaseSection>

          <Separator />

          <ShowcaseSection
            id="composite"
            title={t(bodyLocale, "sample.section.compositeTitle")}
            description={t(bodyLocale, "sample.section.compositeDescription")}
            count={componentCoverage.compositeCount}
          >
            <div className="grid gap-4 @sm:grid-cols-2">
              <ComponentSlot name="BracketTree" locale={bodyLocale}>
                <StateToggleSlot
                  name="BracketTree"
                  componentKey="BracketTree"
                  locale={bodyLocale}
                  readyData={bracketTreeReadyData}
                />
              </ComponentSlot>
              <ComponentSlot name="EventTimelineItem" locale={bodyLocale}>
                <StateToggleSlot
                  name="EventTimelineItem"
                  componentKey="EventTimelineItem"
                  locale={bodyLocale}
                  readyData={eventTimelineData}
                />
              </ComponentSlot>
              <ComponentSlot name="GrowthChart" locale={bodyLocale}>
                <StateToggleSlot
                  name="GrowthChart"
                  componentKey="GrowthChart"
                  locale={bodyLocale}
                  readyData={growthChartReadyData}
                />
              </ComponentSlot>
              <ComponentSlot name="InjuryTimeline" locale={bodyLocale}>
                <StateToggleSlot
                  name="InjuryTimeline"
                  componentKey="InjuryTimeline"
                  locale={bodyLocale}
                  readyData={injuryTimelineData}
                />
              </ComponentSlot>
              <ComponentSlot name="MatchCard" locale={bodyLocale}>
                <StateToggleSlot
                  name="MatchCard"
                  componentKey="MatchCard"
                  locale={bodyLocale}
                  readyData={matchCardData}
                />
              </ComponentSlot>
              <ComponentSlot name="MatchScoreboard (LIVE)" locale={bodyLocale}>
                <StateToggleSlot
                  name="MatchScoreboard (LIVE)"
                  componentKey="MatchScoreboard"
                  locale={bodyLocale}
                  readyData={matchScoreboardLiveData}
                />
              </ComponentSlot>
              <ComponentSlot name="MatchScoreboard (FINISHED)" locale={bodyLocale}>
                <StateToggleSlot
                  name="MatchScoreboard (FINISHED)"
                  componentKey="MatchScoreboard"
                  locale={bodyLocale}
                  readyData={matchScoreboardFinishedData}
                />
              </ComponentSlot>
              <ComponentSlot name="NewsItem" locale={bodyLocale}>
                <StateToggleSlot
                  name="NewsItem"
                  componentKey="NewsItem"
                  locale={bodyLocale}
                  readyData={newsItemData}
                />
              </ComponentSlot>
              <ComponentSlot name="PitchLineup" locale={bodyLocale}>
                <StateToggleSlot
                  name="PitchLineup"
                  componentKey="PitchLineup"
                  locale={bodyLocale}
                  readyData={pitchLineupReadyData}
                />
              </ComponentSlot>
              <ComponentSlot name="TrophyCase" locale={bodyLocale}>
                <StateToggleSlot
                  name="TrophyCase"
                  componentKey="TrophyCase"
                  locale={bodyLocale}
                  readyData={trophyCaseData}
                />
              </ComponentSlot>
              <ComponentSlot name="StandingsTable" locale={bodyLocale}>
                <StateToggleSlot
                  name="StandingsTable"
                  componentKey="StandingsTable"
                  locale={bodyLocale}
                  readyData={standingsTableData}
                />
              </ComponentSlot>
              {/* ZoneLegend — `state: CompositeViewState<T>` 계약이 없는 순수 표시
                  컴포넌트(파일 헤더 참조, `league` prop만 받음)라 StateToggleSlot 토글
                  대상이 아니다. tier가 다른 2개 예시를 정적으로 나란히 보여준다(팀장
                  인계 지침 — 승격 있는 리그 / 강등 없는 리그). */}
              <ComponentSlot name="ZoneLegend" locale={bodyLocale}>
                <div className="space-y-3">
                  {zoneLegendPromotionLeague ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t(bodyLocale, "sample.zoneLegend.tierLabel", {
                          league: zoneLegendPromotionLeague.name,
                          tier: zoneLegendPromotionLeague.tier,
                        })}
                      </p>
                      <ZoneLegend locale={bodyLocale} league={zoneLegendPromotionLeague} />
                    </div>
                  ) : (
                    <SkeletonBlock rows={1} />
                  )}
                  {zoneLegendNoRelegationLeague ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t(bodyLocale, "sample.zoneLegend.tierLabel", {
                          league: zoneLegendNoRelegationLeague.name,
                          tier: zoneLegendNoRelegationLeague.tier,
                        })}
                      </p>
                      <ZoneLegend locale={bodyLocale} league={zoneLegendNoRelegationLeague} />
                    </div>
                  ) : (
                    <SkeletonBlock rows={1} />
                  )}
                </div>
              </ComponentSlot>
            </div>
          </ShowcaseSection>

          {/* LoadMoreLink(ui/, 43일차) — ZoneLegend와 동일 판단(I-168): 4상태 계약이
              없는 순수 표시 컴포넌트라 domain/composite 카운터·앵커 내비 대상이 아니다.
              소진 상태(`href={null}`)는 아무것도 렌더하지 않는 게 계약이라, 그 사실을
              캡션으로 문서화하고 두 번째 인스턴스는 실제로 아무 것도 그리지 않는다. */}
          <div className="space-y-2">
            <h3 className="eyebrow text-muted-foreground">
              {t(bodyLocale, "sample.section.paginationTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t(bodyLocale, "sample.section.paginationDescription")}
            </p>
            <ComponentSlot name="LoadMoreLink" locale={bodyLocale}>
              <div className="flex flex-wrap items-center gap-3">
                <LoadMoreLink locale={bodyLocale} href="?limit=40" />
                <span className="text-xs text-muted-foreground">
                  {t(bodyLocale, "sample.section.paginationExhaustedNote")}
                </span>
                <LoadMoreLink locale={bodyLocale} href={null} />
              </div>
            </ComponentSlot>
          </div>

          <Separator />

          <ShowcaseSection
            id="state"
            title={t(bodyLocale, "sample.section.stateTitle")}
            description={t(bodyLocale, "sample.section.stateDescription")}
            count={componentCoverage.stateUtilityCount}
          >
            <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
              <ComponentSlot name="CountdownTimer" locale={bodyLocale}>
                <CountdownTimer locale={bodyLocale} targetAt="2026-09-04T21:00:00.000Z" isPaused={false} />
              </ComponentSlot>
              <ComponentSlot name="EmptyState" locale={bodyLocale}>
                <EmptyState locale={bodyLocale} titleKey="player.empty.message" />
              </ComponentSlot>
              <ComponentSlot name="ErrorState" locale={bodyLocale}>
                <ErrorState locale={bodyLocale} />
              </ComponentSlot>
              <ComponentSlot name="OddsButton" locale={bodyLocale}>
                <OddsButton
                  locale={bodyLocale}
                  selection={{ label: "홈 승" }}
                  odds={{ decimalOdds: 1.85 }}
                />
              </ComponentSlot>
              <ComponentSlot name="PhaseIndicator" locale={bodyLocale}>
                {season ? (
                  <PhaseIndicator locale={bodyLocale} season={season} round={phaseIndicatorRound} />
                ) : (
                  <SkeletonBlock rows={1} />
                )}
              </ComponentSlot>
              <ComponentSlot name="SkeletonBlock" locale={bodyLocale}>
                <SkeletonBlock rows={3} />
              </ComponentSlot>
            </div>
          </ShowcaseSection>

          <Separator />

          <ShowcaseSection
            id="chart"
            title={t(bodyLocale, "sample.section.chartTitle")}
            description={t(bodyLocale, "sample.section.chartDescription")}
          >
            <NotImplementedPanel label={t(bodyLocale, "sample.status.notImplemented")} />
          </ShowcaseSection>

          <Separator />

          <ShowcaseSection
            id="admin"
            title={t(bodyLocale, "sample.section.adminTitle")}
            description={t(bodyLocale, "sample.section.adminDescription")}
          >
            <NotImplementedPanel label={t(bodyLocale, "sample.status.notImplemented")} />
          </ShowcaseSection>
        </ViewportFrame>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      {showDataSourceToggle && (
        <div className="mb-4">
          <DataSourceToggle locale={locale} initialKind={currentDataSourceKind} />
        </div>
      )}
      <LocaleCompareToggle locale={locale} ko={renderShowcaseBody("ko")} en={renderShowcaseBody("en")} />
    </main>
  );
}
