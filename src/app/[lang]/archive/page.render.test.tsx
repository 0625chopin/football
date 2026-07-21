// @vitest-environment jsdom
//
// `/[lang]/archive` 실렌더 회귀 테스트 — 42일차, 팀장 조건부 승인(A안) 반영.
//
// ## 왜 이 테스트가 필요한가 (I-208 사각지대 회피)
// 오늘 시점 `MockDataSource.getSeasons()`는 진행 중 시즌 1건만 반환해(`endedAt: null`,
// D-15) `page.tsx`의 "완료 시즌이 있을 때" 분기(최종 순위·우승·수상 요약)가 실제 요청으로는
// 한 번도 실행되지 않는다. 그 분기를 실렌더·단위 테스트 어느 쪽으로도 검증하지 않은 채
// 두면 "만들어졌지만 아무도 호출하지 않는" 죽은 코드가 된다(팀장 지적, 5팀 41일차 B4
// 사각지대와 동일 유형). 이 파일은 **완료 시즌이 존재하는 픽스처를 테스트 안에서만
// 구성**해 그 분기를 실제로 실행한다 — `MockDataSource.ts`(3팀 소유) 자체는 건드리지
// 않는다(`factory.ts`의 `registerDataSource`로 이 테스트 프로세스에서만 임시 교체).
//
// ## DataSource 교체 절차 (factory.test.ts 1팀 선례와 동일 패턴)
// `bootstrapApp()`을 먼저 한 번 실제로 완료시켜(실제 mock 어댑터가 `'mock'` kind로
// self-registration) `appBootstrapPromise`/`dataSourceBootstrapPromise` 캐시를 채운다.
// 이후 `registerDataSource('mock', () => fake)`로 레지스트리 항목만 내 픽스처로 덮어쓰고
// `resetDataSourceCache()`로 싱글턴 캐시를 비운다 — `page.tsx`가 내부에서 다시
// `bootstrapApp()`을 호출해도 이미 캐시돼 있어 재등록(=내 픽스처 덮어쓰기)이 일어나지
// 않고, 이어지는 `getDataSource()`가 내 픽스처를 반환한다.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { registerDataSource, resetDataSourceCache } from "@/lib/data/factory";
import type { DataSource, PublicPlayerProfile } from "@/lib/data/DataSource";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import type {
  Award,
  AwardId,
  League,
  LeagueId,
  PlayerId,
  Season,
  SeasonId,
  Standing,
  Team,
  TeamId,
} from "@/types";

import Page from "./page";

const LEAGUE_ID = "league-1" as LeagueId;
const SEASON_ID = "season-1" as SeasonId;
const CHAMPION_TEAM_ID = "team-champion" as TeamId;
const RUNNER_UP_TEAM_ID = "team-runner-up" as TeamId;
const MVP_PLAYER_ID = "player-mvp" as PlayerId;

const league: League = {
  id: LEAGUE_ID,
  name: "테스트 1부 리그",
  tier: 1,
  teamCount: 2,
  roundIntervalMin: 90,
  promotionSlots: 0,
  relegationSlots: 1,
  playoffTeamCount: 1,
};

const completedSeason: Season = {
  id: SEASON_ID,
  seasonNumber: 1,
  seasonSeed: 1 as Season["seasonSeed"],
  phase: "SETTLEMENT",
  regularStartedAt: "2026-01-01T00:00:00.000Z",
  regularEndsAt: "2026-06-01T00:00:00.000Z",
  startedAt: "2026-01-01T00:00:00.000Z",
  endedAt: "2026-06-05T00:00:00.000Z",
  snapshotId: null,
};

function makeTeam(id: TeamId, name: string): Team {
  return {
    id,
    name,
    shortName: name.slice(0, 3).toUpperCase(),
    foundedSeason: 1,
    stadiumName: `${name} 스타디움`,
    stadiumCapacity: 30000,
    colorPrimary: "#111111",
    colorSecondary: "#eeeeee",
    crestSeed: 1 as Team["crestSeed"],
    reputation: 50,
    fanBase: 10000,
    academyLevel: 3,
    balance: 0 as Team["balance"],
    financialCrisis: false,
    crisisConsecutiveSeasons: 0,
  };
}

function makeStanding(rank: number, teamId: TeamId): Standing {
  return {
    seasonId: SEASON_ID,
    leagueId: LEAGUE_ID,
    round: 10,
    teamId,
    rank,
    played: 10,
    won: rank === 1 ? 8 : 3,
    drawn: 1,
    lost: rank === 1 ? 1 : 6,
    gf: rank === 1 ? 20 : 8,
    ga: rank === 1 ? 5 : 18,
    gd: rank === 1 ? 15 : -10,
    points: rank === 1 ? 25 : 10,
    form: "WWWWW",
    fairPlayScore: 90,
    tiebreakApplied: null,
  };
}

const mvpProfile: PublicPlayerProfile = {
  id: MVP_PLAYER_ID,
  name: "테스트 MVP",
  nationality: "KOR" as PublicPlayerProfile["nationality"],
  birthSeason: -5,
  age: 24,
  preferredFoot: "RIGHT",
  preferredPosition: "ST",
  reputation: 80,
  marketValue: 100 as PublicPlayerProfile["marketValue"],
  tasteTags: [],
  retiredAtSeason: null,
  scoutRating: 5,
};

const teamAward: Award = {
  id: "award-team" as AwardId,
  seasonId: SEASON_ID,
  type: "MANAGER_OF_SEASON",
  scope: "LEAGUE",
  leagueId: LEAGUE_ID,
  playerId: null,
  managerId: null,
  teamId: CHAMPION_TEAM_ID,
  criteria: {},
};

const playerAward: Award = {
  id: "award-player" as AwardId,
  seasonId: SEASON_ID,
  type: "LEAGUE_MVP",
  scope: "LEAGUE",
  leagueId: LEAGUE_ID,
  playerId: MVP_PLAYER_ID,
  managerId: null,
  teamId: null,
  criteria: {},
};

// 베스트11류는 "수상 요약"에서 제외돼야 한다(`page.tsx`의 `BEST_XI_AWARD_TYPES`) — 이
// 픽스처가 실제로 걸러지는지 아래 테스트가 확인한다.
const bestXiAward: Award = {
  id: "award-best-xi" as AwardId,
  seasonId: SEASON_ID,
  type: "TEAM_OF_SEASON",
  scope: "WORLD",
  leagueId: null,
  playerId: MVP_PLAYER_ID,
  managerId: null,
  teamId: null,
  criteria: {},
};

function buildFakeDataSource(overrides: Partial<DataSource>): DataSource {
  return {
    getSeasons: async () => [completedSeason],
    getLeagues: async () => [league],
    getStandings: async () => [
      makeStanding(1, CHAMPION_TEAM_ID),
      makeStanding(2, RUNNER_UP_TEAM_ID),
    ],
    getAwards: async () => [teamAward, playerAward, bestXiAward],
    getTeamsByIds: async (ids: readonly TeamId[]) =>
      [makeTeam(CHAMPION_TEAM_ID, "챔피언 FC"), makeTeam(RUNNER_UP_TEAM_ID, "챌린저 FC")].filter(
        (team) => ids.includes(team.id),
      ),
    getPlayerProfile: async (id: PlayerId) => (id === MVP_PLAYER_ID ? mvpProfile : null),
    ...overrides,
  } as DataSource;
}

/** 실제 mock 어댑터를 한 번 실등록시켜 `bootstrapApp()`/`bootstrapDataSource()` 캐시를
 * 채운다 — 이후 `registerDataSource('mock', ...)` 재호출로 레지스트리만 내 픽스처로
 * 덮어써도 `page.tsx` 내부의 `await bootstrapApp()`이 재등록을 트리거하지 않는다(파일
 * 헤더 주석 참조). `MockDataSource.ts` 자체는 이 과정에서 한 번도 인스턴스화되지 않는다
 * (`registerDataSource`는 지연 프로바이더만 등록 — `mock/index.ts` 헤더 주석 참조). */
beforeAll(async () => {
  await bootstrapApp();
});

afterEach(() => {
  // 이 프로젝트엔 vitest `setupFiles`가 없어 `@testing-library/react`의 자동 정리가
  // 걸리지 않는다(35일차 `badge.render.test.tsx`는 테스트 간 부재 단언이 없어 우연히
  // 문제가 드러나지 않았을 뿐이다) — 직접 `cleanup()`을 호출해 이전 테스트의 DOM이
  // 다음 테스트의 `queryByText(...).toBeNull()` 단언을 오염시키지 않게 한다.
  cleanup();
  resetDataSourceCache();
});

function makeProps(searchParams: Record<string, string | undefined> = {}) {
  return {
    params: Promise.resolve({ lang: "ko" as const }),
    searchParams: Promise.resolve(searchParams),
  } as Parameters<typeof Page>[0];
}

describe("/[lang]/archive — 완료 시즌 없음(오늘의 실제 데이터 상태)", () => {
  it("FR-UI-013 지정 빈 상태 문구를 렌더한다", async () => {
    registerDataSource("mock", () =>
      buildFakeDataSource({ getSeasons: async () => [{ ...completedSeason, endedAt: null }] }),
    );
    resetDataSourceCache();

    const element = await Page(makeProps());
    render(element);

    expect(screen.getByText("완료된 시즌이 없습니다.")).toBeTruthy();
    expect(screen.queryByText("테스트 1부 리그")).toBeNull();
  });
});

describe("/[lang]/archive — 완료 시즌 있음(게이팅된 경로, 팀장 지시 A안)", () => {
  it("최종 순위·우승·수상 요약을 실제로 렌더한다", async () => {
    registerDataSource("mock", () => buildFakeDataSource({}));
    resetDataSourceCache();

    const element = await Page(makeProps());
    render(element);

    // 시즌 선택기 — 완료 시즌 1건이 링크로 뜬다.
    expect(
      screen.getByRole("link", { name: t("ko", "archive.season.numberFormat", { number: 1 }) }),
    ).toBeTruthy();

    // ① 최종 순위 — 리그명 + 두 팀명이 표에 나온다.
    expect(screen.getAllByText("테스트 1부 리그").length).toBeGreaterThan(0);
    expect(screen.getAllByText("챔피언 FC").length).toBeGreaterThan(0);
    expect(screen.getByText("챌린저 FC")).toBeTruthy();

    // ② 우승 — 1위 팀이 우승팀으로 표시된다.
    expect(screen.getByText(t("ko", "archive.champions.title"))).toBeTruthy();

    // ③ 수상 요약 — 팀 수상·개인 수상은 나오고, 베스트11은 제외된다.
    expect(screen.getByText("테스트 MVP")).toBeTruthy();
    expect(screen.getByText(t("ko", "enums.awardType.LEAGUE_MVP" as TranslationKey))).toBeTruthy();
    expect(
      screen.queryByText(t("ko", "enums.awardType.TEAM_OF_SEASON" as TranslationKey)),
    ).toBeNull();

    // 빈 상태 문구는 뜨지 않는다.
    expect(screen.queryByText("완료된 시즌이 없습니다.")).toBeNull();
  });
});
