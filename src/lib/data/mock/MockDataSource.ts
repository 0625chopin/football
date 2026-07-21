/**
 * `DataSource` Mock 어댑터 구현체 — **18일차(2026-08-13), Task 007 계속분(H-02)**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 18일차 행
 * ("Mock 어댑터를 `DataSource` 인터페이스로 구현", 산출물 `src/lib/data/mock/MockDataSource.ts`,
 * 완료 판정 "인터페이스 전 메서드 구현") / H-02(1팀 `DataSource` 계약, 13일차 인계) / H-07
 * (Mock 팩토리 + 어댑터, 19일차 확정 예정 → 4·5·6팀 20일차 소비 개시). 소유: 3팀
 * 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/data/mock/**` — 인터페이스 자체(`../DataSource.ts`)는
 * 1팀 소유라 이 파일에서 수정하지 않는다).
 *
 * ## 이 파일이 하는 것
 * 15~17일차 Mock 팩토리(`src/lib/mock/**`, 이 팀 소유)가 만든 결정론적 산출물
 * (`generateMockWorld`/`generateMockProgress`/`generateSeasonSchedule`)을 `DataSource`
 * 69개 조회 메서드 계약에 맞춰 얇게 슬라이스한다 — 여기서 새로운 절차적 생성 로직을 만들지
 * 않는다(그건 `src/lib/mock/**`의 몫). 생성자에서 한 번 월드·진행·전 리그 풀 시즌 일정을
 * 만들고, 인덱스(Map)를 미리 구성해 각 메서드가 O(1)/O(n) 조회만 하도록 한다.
 *
 * ## I-106 해소 — `getStandings`
 * `getStandings`는 16일차 `progress.ts`의 독립 표본이 아니라 **17일차 `schedule.ts`가
 * 실제 대진 이력에서 역산한 순위표**를 슬라이스한다(팀장 인계 지시). `round` 파라미터가
 * 기본 라운드(스케줄의 `currentRound - 1`)와 다르면, `schedule.ts`가 export한
 * `deriveStandingsFromFixtures`를 그 라운드 이하로 필터링한 fixtures에 재적용해 그 시점
 * 스냅샷을 만든다(재구현하지 않고 단일 소스 재사용).
 *
 * ## 데이터가 없는 메서드 — 왜 비어 있는가 (스코프, 이슈 후보로 팀장 보고)
 * 아래 축은 15~17일차 Mock 팩토리에 생성기가 아직 없다(`fixtures/screens.ts` 헤더가 이미
 * 같은 경계를 명시해 뒀다 — FR-UI-005/006 "부분 커버", FR-UI-012/013/015~019/025/026
 * "오늘 커버하지 않음"과 동일 근거). **새 Mock 생성 로직을 이 파일에서 즉석으로 만들지
 * 않는다** — 존재하지 않는 생성기를 이 어댑터가 대신 발명하면, 그 발명이 이 파일에만
 * 갇혀 `src/lib/mock/**`(4팀 `/sample` 쇼케이스 등 다른 소비자)와 불일치하는 산출물이 된다.
 * - **계약(`Contract`)·부상(`Injury`)·수상(`Award`)·이적(`Transfer`)·임대(`Loan`)·통산
 *   집계(`PlayerCareerStat`)·능력치 히스토리(`PlayerAttributeHistory`)**: `economy/`
 *   (21일차)·성장·수상 파이프라인(28일차) 이후 생성기가 생긴다 → `null`/`[]`.
 * - **라인업(`MatchLineup`)·경기 선수 평점(`PlayerMatchStat`)·팀 스탯 비교
 *   (`MatchTeamStatComparison`)·날씨(`Weather`)**: 2팀 엔진 반환 타입(H-14, 27일차) 이후 →
 *   `[]`/`null`.
 * - **클럽 시즌 지표(`TeamSeasonStat`)·원장(`PointTransaction`)·스폰서 계약
 *   (`SponsorContract`)·트로피(`Trophy`)**: `economy/`(21일차) → `[]`.
 * - **크론(`CronRun`/`CronGap`)·감사 로그(`AuditLog`)**: 실행 이력 자체가 발생한 적이
 *   없는 새 Mock 월드라 `[]`/`null`이 오히려 정확하다(값을 발명하는 게 아니라 "아직 실행
 *   안 됨"이 사실). `getCronRunMetrics`도 표본 0건이므로 전부 0(`sampleSize: 0`)을 반환한다
 *   — 이것도 값 날조가 아니라 "0건 집계"의 정직한 표현이다.
 * - **다른 시즌 조회(`getSeasons`/`seasonId` 파라미터)**: D-15 단일 월드에 진행 중 시즌
 *   1건만 존재한다 — 과거 시즌 스냅샷 생성기가 없어 현재 시즌 외 `seasonId`는 빈 배열/
 *   무시로 처리한다(각주 참조).
 *
 * ## 담는 것 — 위 목록에 없는 나머지는 실제로 파생/조회한다
 * `getCommonCodeGroups`/`getCommonCodes`는 3팀이 **이미 소유한** `src/lib/config/**`
 * (카탈로그 37종 + `loadConstants`)을 그대로 도메인 엔티티로 감싼다 — 발명이 아니라 이미
 * 존재하는 산출물의 재포장이라 위 "데이터가 없는 메서드" 원칙과 배치되지 않는다.
 * `getTeamSeason`은 `teamToLeague` 인덱스 + 진행 중 시즌 전제(`finalRank`/`promoted`/
 * `relegated`가 항상 `null`/`false`)로 100% 파생 가능해 포함했다.
 *
 * ## 순수성 관례
 * 생성자에서 딱 한 번 `generateMockWorld`/`generateMockProgress`/`generateSeasonSchedule`
 * (전 리그)를 호출해 결정론적으로 상태를 굳힌다 — 이후 인스턴스 생성은 순수 조회만 한다.
 * `getStandings`의 라운드 재계산 경로만 예외적으로 쿼리 시점에 결정론적 PRNG를 다시
 * 스레딩한다(같은 입력 → 항상 같은 출력, `Math.random()` 미사용).
 *
 * ## 19일차 갱신 — I-114 해소
 * 공통코드 그룹/코드 타임스탬프가 이 파일 전용 리터럴(`MOCK_CONFIG_TIMESTAMP`, 08-13)을
 * 따로 갖고 있었는데, `world.ts`의 `WORLD_CREATED_AT`(08-10)·`progress.ts`의 `MOCK_NOW`
 * (08-11)와 각각 최대 3일까지 어긋나 있었다. 이제 생성자에서 `this.world.world.createdAt`
 * (`world.ts`의 단일 앵커 `MOCK_EPOCH_NOW`에서 파생)을 그대로 재사용해 별도 리터럴을
 * 없앴다 — 이 어댑터가 새 타임스탬프가 필요해지더라도 여기서 새 날짜를 하드코딩하지 않는다.
 */

import { installHardcodedFallback } from '@/lib/config/fallback';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from '@/lib/config/catalog';
import { loadConstants } from '@/lib/config/loader';
import type { PublicPlayerProfile, FixtureRoundBounds, MatchTeamStatComparison, CronRunMetrics, PlayerStatRankingMetric, MultiAwardRankingEntry, WorldClockContext } from '@/lib/data/DataSource';
import type { DataSource } from '@/lib/data/DataSource';
import { worldMinutesAt } from '@/lib/sim/schedule/worldclock';
import { toPublicProfile } from '@/lib/data/player-profile';
import { CURRENT_ROUND, deriveStandingsFromFixtures, generateSeasonSchedule } from '@/lib/mock/fixtures/schedule';
import type { MockSeasonSchedule } from '@/lib/mock/fixtures/schedule';
import { generateMockProgress, MOCK_NOW } from '@/lib/mock/progress';
import type { MockProgress } from '@/lib/mock/progress';
import { generateMockWorld } from '@/lib/mock/world';
import type { MockWorld } from '@/lib/mock/world';
import { createState, nextIntBelow } from '@/lib/sim/rng/prng';
import { deriveMatchSeed, deriveSeasonSeed, hashKey, stateForSeed } from '@/lib/sim/rng/derive';
import type {
  AuditActorType,
  AuditLog,
  Award,
  AwardType,
  CommonCode,
  CommonCodeGroup,
  CommonCodeHistory,
  CommonCodeId,
  CompetitionType,
  Contract,
  CronGap,
  CronRun,
  CronRunStatus,
  Fixture,
  FixtureId,
  Injury,
  League,
  LeagueId,
  Loan,
  Manager,
  MatchEvent,
  MatchLineup,
  MatchSeed,
  NewsFeedItem,
  NewsFeedItemType,
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerCareerStat,
  PlayerId,
  PlayerMatchStat,
  PlayerPosition,
  PlayerSeasonStat,
  PlayerState,
  PointTransaction,
  Season,
  SeasonId,
  Sponsor,
  SponsorContract,
  SponsorContractStatus,
  SponsorId,
  Standing,
  Team,
  TeamId,
  TeamSeason,
  TeamSeasonStat,
  Transfer,
  Trophy,
  Weather,
  World,
  WorldSeed,
} from '@/types';

/* ────────────────────────────────────────────────────────────────────────
 * 결정론 상수 — 이 어댑터 전용 시드·스트림 키·고정 시각
 * ──────────────────────────────────────────────────────────────────────── */

/** 이 어댑터가 만드는 Mock 월드의 기본 시드(18일차 날짜). 호출자가 다른 시드를 넘기면 그걸 쓴다. */
const MOCK_DATA_SOURCE_WORLD_SEED = 20260813 as WorldSeed;

/**
 * 전 리그 풀 시즌 일정 생성 시 리그별 PRNG 시작 상태를 분리하는 스트림 키 베이스.
 * `fixtures/screens.ts`가 쓰는 `SCHEDULE_STREAM_KEY`(999_999)와 겹치지 않는 별도 상수 —
 * 이 파일은 그 파일과 별개의 `generateMockProgress` 인스턴스를 스레딩하므로 겹쳐도 안전하지만
 * (서로 다른 객체 그래프), 관례상 파일마다 자기 몫의 네임스페이스를 쓴다.
 */
const SCHEDULE_STREAM_KEY_BASE = 800_000;
/** 리그별 `Fixture.matchSeed` 키 공간 — `progress.ts` 자체 소비량(리그 3 + 브래킷 수십 건)과 겹치지 않게 충분히 띄운다. */
const SCHEDULE_MATCH_KEY_BASE = 1_000_000;
const SCHEDULE_MATCH_KEY_STRIDE = 100_000;
/** `getStandings` 임의 라운드 재계산 전용 스트림 키 베이스 — 위 스케줄 생성 키 공간과도 분리한다. */
const STANDINGS_QUERY_STREAM_KEY_BASE = 600_000;

const DEFAULT_TEAM_FIXTURES_LIMIT = 20;
const DEFAULT_STAT_RANKING_LIMIT = 50;
const DEFAULT_NEWS_FEED_LIMIT = 20;

/* ────────────────────────────────────────────────────────────────────────
 * 범용 헬퍼 (world.ts/schedule.ts와 동일 관례 — 자기완결 파일 유지)
 * ──────────────────────────────────────────────────────────────────────── */

/** 128비트 난수를 UUID v4 형태로 접는다 — `world.ts`/`schedule.ts`의 `nextId`와 동일 구현. */
function stableId(seedText: string): string {
  let cursor = createState(hashKey(seedText));
  const words: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const step = nextIntBelow(cursor, 0x100000000);
    cursor = step.state;
    words.push(step.value);
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-` +
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  );
}

function clampRound(round: number, totalRounds: number): number {
  return Math.min(totalRounds, Math.max(0, Math.round(round)));
}

/* ────────────────────────────────────────────────────────────────────────
 * MockDataSource
 * ──────────────────────────────────────────────────────────────────────── */

export class MockDataSource implements DataSource {
  private readonly world: MockWorld;
  private readonly progress: MockProgress;
  private readonly seasonSeedValue: number;
  /** 공통코드 그룹/코드 Mock 엔티티의 타임스탬프 — `world.createdAt`을 재사용한다(19일차 I-114 해소, 기준 시각 통일). */
  private readonly configTimestamp: string;

  private readonly teamToLeague: ReadonlyMap<TeamId, LeagueId>;
  private readonly teamsByLeague: ReadonlyMap<LeagueId, readonly Team[]>;
  private readonly managersByTeam: ReadonlyMap<TeamId, Manager>;
  private readonly playerPositionsByPlayer: ReadonlyMap<PlayerId, readonly PlayerPosition[]>;
  private readonly playerStatesByPlayer: ReadonlyMap<PlayerId, PlayerState>;
  private readonly playerStatesByTeam: ReadonlyMap<TeamId, readonly PlayerState[]>;
  private readonly playerAttributesByPlayer: ReadonlyMap<PlayerId, PlayerAttribute>;

  private readonly schedulesByLeague: ReadonlyMap<LeagueId, MockSeasonSchedule>;
  private readonly fixturesById: ReadonlyMap<FixtureId, Fixture>;
  private readonly matchEventsByFixture: ReadonlyMap<FixtureId, readonly MatchEvent[]>;
  private readonly statLeadersByPlayer: ReadonlyMap<PlayerId, readonly PlayerSeasonStat[]>;
  private readonly statAppearanceBasis: number;

  constructor(worldSeed: WorldSeed = MOCK_DATA_SOURCE_WORLD_SEED) {
    installHardcodedFallback();

    this.world = generateMockWorld(worldSeed);
    this.progress = generateMockProgress(worldSeed, this.world);
    this.seasonSeedValue = deriveSeasonSeed(worldSeed, 1);
    this.configTimestamp = this.world.world.createdAt;

    const seasonSnapshotId = this.progress.season.snapshotId;
    /* v8 ignore start -- generateMockProgress()가 진행 중 시즌에 항상 snapshotId를 채운다는
     * 것은 `progress.test.ts`가 고정한 불변식이다. 공개 생성자 경로로는 구조적으로 도달할
     * 수 없는 방어 코드라 19일차 게이트 커버리지 보강에서 테스트로 강제 유발하지 않는다
     * (`fixtures/screens.ts`의 동일 패턴과 같은 근거). */
    if (seasonSnapshotId === null) {
      throw new Error(
        'MockDataSource: generateMockProgress()가 만든 Season.snapshotId가 null입니다 — ' +
          '진행 중 시즌 스냅샷은 항상 값이 있어야 합니다(progress.ts 계약 위반).',
      );
    }
    /* v8 ignore stop */

    /* ---- 리그/팀 인덱스 ---- */
    const teamToLeague = new Map<TeamId, LeagueId>();
    const teamsByLeague = new Map<LeagueId, Team[]>();
    let teamOffset = 0;
    for (const league of this.world.leagues) {
      const teams = this.world.teams.slice(teamOffset, teamOffset + league.teamCount);
      teamsByLeague.set(league.id, teams);
      for (const team of teams) {
        teamToLeague.set(team.id, league.id);
      }
      teamOffset += league.teamCount;
    }
    this.teamToLeague = teamToLeague;
    this.teamsByLeague = teamsByLeague;

    this.managersByTeam = new Map(
      this.world.managers
        .filter((m): m is Manager & { teamId: TeamId } => m.teamId !== null)
        .map((m) => [m.teamId, m] as const),
    );
    this.playerAttributesByPlayer = new Map(this.world.playerAttributes.map((a) => [a.playerId, a] as const));

    const playerPositionsByPlayer = new Map<PlayerId, PlayerPosition[]>();
    for (const pos of this.world.playerPositions) {
      const list = playerPositionsByPlayer.get(pos.playerId) ?? [];
      list.push(pos);
      playerPositionsByPlayer.set(pos.playerId, list);
    }
    this.playerPositionsByPlayer = playerPositionsByPlayer;

    const playerStatesByPlayer = new Map<PlayerId, PlayerState>();
    const playerStatesByTeam = new Map<TeamId, PlayerState[]>();
    for (const state of this.world.playerStates) {
      playerStatesByPlayer.set(state.playerId, state);
      if (state.teamId !== null) {
        const list = playerStatesByTeam.get(state.teamId) ?? [];
        list.push(state);
        playerStatesByTeam.set(state.teamId, list);
      }
    }
    this.playerStatesByPlayer = playerStatesByPlayer;
    this.playerStatesByTeam = playerStatesByTeam;

    /* ---- 전 리그 풀 시즌 일정(I-106 해소 — getStandings/getFixturesByRound 슬라이스 대상) ---- */
    // `generateSeasonSchedule` 내부가 자체적으로 `loadConstants('MATCH_POINTS')`를 다시
    // 조회하므로(schedule.ts 관례) 여기서는 별도로 들고 있지 않는다.
    const schedulesByLeague = new Map<LeagueId, MockSeasonSchedule>();
    const fixturesById = new Map<FixtureId, Fixture>();

    this.world.leagues.forEach((league, leagueIndex) => {
      const teams = teamsByLeague.get(league.id);
      /* v8 ignore start -- teamsByLeague는 바로 위 for문에서 this.world.leagues의 모든
       * 리그에 대해 채워지므로, 같은 리스트를 다시 순회하는 이 forEach에서 미스가 날 수
       * 없다 — 구조적으로 도달 불가능한 방어 코드(19일차 게이트 커버리지 보강, 위 생성자
       * 가드와 동일 근거). */
      if (teams === undefined) {
        throw new Error(`MockDataSource: 리그 "${league.id}"의 팀 목록을 찾을 수 없습니다.`);
      }
      /* v8 ignore stop */

      const scheduleState = stateForSeed(
        deriveMatchSeed(this.seasonSeedValue, SCHEDULE_STREAM_KEY_BASE + leagueIndex),
      );
      let matchKeyCounter = SCHEDULE_MATCH_KEY_BASE + leagueIndex * SCHEDULE_MATCH_KEY_STRIDE;
      const nextMatchSeed = (): MatchSeed => {
        const key = matchKeyCounter;
        matchKeyCounter += 1;
        return deriveMatchSeed(this.seasonSeedValue, key) as MatchSeed;
      };

      const scheduleStep = generateSeasonSchedule(
        scheduleState,
        league,
        teams,
        this.progress.season.id,
        seasonSnapshotId,
        MOCK_NOW,
        CURRENT_ROUND,
        nextMatchSeed,
        this.seasonSeedValue,
      );
      schedulesByLeague.set(league.id, scheduleStep.value);
      for (const fixture of scheduleStep.value.fixtures) {
        fixturesById.set(fixture.id, fixture);
      }
    });
    this.schedulesByLeague = schedulesByLeague;

    // 라이브·브래킷 경기(progress.ts 산출물)도 같은 조회 인덱스에 합류시킨다 — schedule.ts는
    // LEAGUE 대진만 만들므로 getFixture(fixtureId)가 두 산출물을 가리지 않고 찾게 하기 위함.
    for (const fixture of [
      ...this.progress.liveFixtures,
      ...this.progress.playoffBracket,
      ...this.progress.cupBracket,
    ]) {
      fixturesById.set(fixture.id, fixture);
    }
    this.fixturesById = fixturesById;

    const matchEventsByFixture = new Map<FixtureId, MatchEvent[]>();
    for (const event of this.progress.matchEvents) {
      const list = matchEventsByFixture.get(event.matchId) ?? [];
      list.push(event);
      matchEventsByFixture.set(event.matchId, list);
    }
    this.matchEventsByFixture = matchEventsByFixture;

    const statLeadersByPlayer = new Map<PlayerId, PlayerSeasonStat[]>();
    for (const stat of this.progress.statLeaders) {
      const list = statLeadersByPlayer.get(stat.playerId) ?? [];
      list.push(stat);
      statLeadersByPlayer.set(stat.playerId, list);
    }
    this.statLeadersByPlayer = statLeadersByPlayer;
    this.statAppearanceBasis = Math.max(1, ...this.progress.statLeaders.map((s) => s.appearances));
  }

  /** 요청한 시즌이 이 Mock 월드가 아는 유일한 진행 중 시즌인지 확인한다(위 파일 헤더 "다른 시즌 조회" 각주). */
  private isKnownSeason(seasonId: SeasonId | undefined): boolean {
    return seasonId === undefined || seasonId === this.progress.season.id;
  }

  /* ============================================================
   * 1. 순위 (Standings)
   * ============================================================ */

  async getLeagues(): Promise<readonly League[]> {
    return this.world.leagues;
  }

  async getLeague(leagueId: LeagueId): Promise<League | null> {
    return this.world.leagues.find((l) => l.id === leagueId) ?? null;
  }

  async getCurrentSeason(): Promise<Season | null> {
    return this.progress.season;
  }

  async getSeasons(): Promise<readonly Season[]> {
    return [this.progress.season];
  }

  async getStandings(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly round?: number;
  }): Promise<readonly Standing[]> {
    if (!this.isKnownSeason(params.seasonId)) {
      return [];
    }
    const schedule = this.schedulesByLeague.get(params.leagueId);
    if (schedule === undefined) {
      return [];
    }

    const defaultRound = schedule.currentRound - 1;
    if (params.round === undefined || params.round === defaultRound) {
      return schedule.standings;
    }

    const round = clampRound(params.round, schedule.totalRounds);
    const teams = this.teamsByLeague.get(params.leagueId) ?? [];
    const fixturesUpToRound = schedule.fixtures.filter((f) => f.round <= round);
    const matchPoints = loadConstants('MATCH_POINTS');
    const queryState = stateForSeed(
      deriveMatchSeed(this.seasonSeedValue, STANDINGS_QUERY_STREAM_KEY_BASE + round),
    );

    const step = deriveStandingsFromFixtures(
      queryState,
      params.leagueId,
      teams,
      fixturesUpToRound,
      this.progress.season.id,
      round,
      matchPoints,
      this.seasonSeedValue,
    );
    return step.value;
  }

  /* ============================================================
   * 2. 일정 (Fixtures)
   * ============================================================ */

  async getLiveFixtures(): Promise<readonly Fixture[]> {
    return this.progress.liveFixtures;
  }

  async getNextKickoff(): Promise<Fixture | null> {
    const candidates: Fixture[] = [];
    for (const schedule of this.schedulesByLeague.values()) {
      for (const fixture of schedule.fixtures) {
        if (fixture.status === 'SCHEDULED') {
          candidates.push(fixture);
        }
      }
    }
    for (const fixture of [...this.progress.playoffBracket, ...this.progress.cupBracket]) {
      if (fixture.status === 'SCHEDULED') {
        candidates.push(fixture);
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    return candidates.reduce((earliest, f) => (f.kickoffAt < earliest.kickoffAt ? f : earliest));
  }

  async getFixturesByRound(params: {
    readonly leagueId: LeagueId;
    readonly round: number;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<readonly Fixture[]> {
    if (!this.isKnownSeason(params.seasonId)) {
      return [];
    }
    const competitionType = params.competitionType ?? 'LEAGUE';

    if (competitionType === 'LEAGUE') {
      const schedule = this.schedulesByLeague.get(params.leagueId);
      if (schedule === undefined) {
        return [];
      }
      return schedule.fixtures.filter((f) => f.round === params.round);
    }
    if (competitionType === 'PLAYOFF') {
      return this.progress.playoffBracket.filter(
        (f) => f.leagueId === params.leagueId && f.round === params.round,
      );
    }
    if (competitionType === 'CUP') {
      return this.progress.cupBracket.filter((f) => f.round === params.round);
    }
    // TIEBREAK — 이 Mock 팩토리는 재경기 시나리오를 생성하지 않는다(생성기 없음).
    return [];
  }

  async getFixtureRoundBounds(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<FixtureRoundBounds> {
    const competitionType = params.competitionType ?? 'LEAGUE';

    if (competitionType === 'LEAGUE') {
      const schedule = this.schedulesByLeague.get(params.leagueId);
      if (schedule === undefined) {
        return { minRound: 0, maxRound: 0, currentRound: 0 };
      }
      return { minRound: 1, maxRound: schedule.totalRounds, currentRound: schedule.currentRound };
    }

    const bracket =
      competitionType === 'PLAYOFF'
        ? this.progress.playoffBracket.filter((f) => f.leagueId === params.leagueId)
        : competitionType === 'CUP'
          ? this.progress.cupBracket
          : [];
    if (bracket.length === 0) {
      return { minRound: 0, maxRound: 0, currentRound: 0 };
    }
    const rounds = bracket.map((f) => f.round);
    const maxRound = Math.max(...rounds);
    const minRound = Math.min(...rounds);
    const inProgressRound = bracket.find((f) => f.status !== 'FINISHED')?.round;
    return { minRound, maxRound, currentRound: inProgressRound ?? maxRound };
  }

  /**
   * I-169/I-174 — `now`(`MOCK_NOW`, 이 Mock 월드의 고정 앵커)와 `clock`(`this.world.world`의
   * 시계 필드)을 원자적으로 반환한다. `kickoffWorldMinutesByFixtureId`는 I-174가 완전히
   * 해소되기 전까지의 근사값(킥오프 이후 배속 전이가 없었다는 가정) — `worldMinutesAt`을
   * 현재 `clock`으로 `fixture.kickoffAt`에 대해 호출해 산출한다. 이 Mock 월드는 생성자에서
   * 배속/정지 전이를 만들지 않으므로(고정 `speedChangedAt` 앵커) 근사 오차가 없다.
   */
  async getMatchClockContext(fixtureIds: readonly FixtureId[]): Promise<WorldClockContext> {
    const clock = this.world.world;
    const kickoffWorldMinutesByFixtureId: Record<FixtureId, number> = {};
    for (const fixtureId of fixtureIds) {
      const fixture = this.fixturesById.get(fixtureId);
      if (fixture === undefined) {
        continue;
      }
      kickoffWorldMinutesByFixtureId[fixtureId] = worldMinutesAt(clock, fixture.kickoffAt);
    }
    return { now: MOCK_NOW, clock, kickoffWorldMinutesByFixtureId };
  }

  /* ============================================================
   * 3. 경기 (Match detail)
   * ============================================================ */

  async getFixture(fixtureId: FixtureId): Promise<Fixture | null> {
    return this.fixturesById.get(fixtureId) ?? null;
  }

  async getMatchEvents(fixtureId: FixtureId): Promise<readonly MatchEvent[]> {
    return this.matchEventsByFixture.get(fixtureId) ?? [];
  }

  async getMatchLineups(_fixtureId: FixtureId): Promise<readonly MatchLineup[]> {
    // 라인업 생성기 없음(2팀 H-14, 27일차 이후) — 위 파일 헤더 참조.
    return [];
  }

  async getMatchPlayerRatings(_fixtureId: FixtureId): Promise<readonly PlayerMatchStat[]> {
    // 경기 단위 선수 평점 생성기 없음(2팀 H-14, 27일차 이후) — 위 파일 헤더 참조.
    return [];
  }

  async getMatchTeamStats(_fixtureId: FixtureId): Promise<readonly MatchTeamStatComparison[]> {
    // 비영속 파생 DTO지만 원천 이벤트/스탯 생성기가 없어 파생할 데이터 자체가 없다.
    return [];
  }

  async getMatchWeather(_fixtureId: FixtureId): Promise<Weather | null> {
    // 날씨 생성기 없음 — 위 파일 헤더 참조.
    return null;
  }

  /* ============================================================
   * 4. 선수 (Player detail)
   * ============================================================ */

  async getPlayerProfile(playerId: PlayerId): Promise<PublicPlayerProfile | null> {
    const player = this.world.players.find((p) => p.id === playerId);
    return player === undefined ? null : toPublicProfile(player);
  }

  async getPlayerAttribute(playerId: PlayerId): Promise<PlayerAttribute | null> {
    return this.playerAttributesByPlayer.get(playerId) ?? null;
  }

  async getPlayerState(playerId: PlayerId): Promise<PlayerState | null> {
    return this.playerStatesByPlayer.get(playerId) ?? null;
  }

  async getPlayerPositions(playerId: PlayerId): Promise<readonly PlayerPosition[]> {
    return this.playerPositionsByPlayer.get(playerId) ?? [];
  }

  async getPlayerAttributeHistory(_playerId: PlayerId): Promise<readonly PlayerAttributeHistory[]> {
    // 시즌별 능력치 스냅샷 히스토리 생성기 없음(현재 스냅샷 1건만 존재) — 위 파일 헤더 참조.
    return [];
  }

  async getPlayerSeasonStats(playerId: PlayerId): Promise<readonly PlayerSeasonStat[]> {
    return this.statLeadersByPlayer.get(playerId) ?? [];
  }

  async getPlayerCareerStat(_playerId: PlayerId): Promise<PlayerCareerStat | null> {
    // 통산 집계 생성기 없음 — 위 파일 헤더 참조.
    return null;
  }

  async getPlayerContract(_playerId: PlayerId): Promise<Contract | null> {
    // 계약 생성기 없음(economy/, 21일차) — 위 파일 헤더 참조.
    return null;
  }

  async getPlayerInjuries(_playerId: PlayerId): Promise<readonly Injury[]> {
    return [];
  }

  async getPlayerAwards(_playerId: PlayerId): Promise<readonly Award[]> {
    return [];
  }

  async getPlayerTransferHistory(_playerId: PlayerId): Promise<readonly Transfer[]> {
    return [];
  }

  async getPlayerLoanHistory(_playerId: PlayerId): Promise<readonly Loan[]> {
    return [];
  }

  /* ============================================================
   * 5. 클럽 (Club/Team detail)
   * ============================================================ */

  async getTeam(teamId: TeamId): Promise<Team | null> {
    return this.world.teams.find((t) => t.id === teamId) ?? null;
  }

  async getTeamsByIds(teamIds: readonly TeamId[]): Promise<readonly Team[]> {
    const wanted = new Set(teamIds);
    return this.world.teams.filter((t) => wanted.has(t.id));
  }

  async getTeamSeason(params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
  }): Promise<TeamSeason | null> {
    if (!this.isKnownSeason(params.seasonId)) {
      return null;
    }
    const leagueId = this.teamToLeague.get(params.teamId);
    if (leagueId === undefined) {
      return null;
    }
    const schedule = this.schedulesByLeague.get(leagueId);
    const standing = schedule?.standings.find((s) => s.teamId === params.teamId) ?? null;
    return {
      teamId: params.teamId,
      seasonId: this.progress.season.id,
      leagueId,
      // 진행 중 시즌(Season.phase='REGULAR')이라 최종 순위·승강 여부는 계약대로 아직 미확정이다.
      finalRank: null,
      promoted: false,
      relegated: false,
      tiebreakApplied: standing?.tiebreakApplied ?? null,
    };
  }

  async getTeamManager(teamId: TeamId): Promise<Manager | null> {
    return this.managersByTeam.get(teamId) ?? null;
  }

  async getTeamSquad(teamId: TeamId): Promise<readonly PublicPlayerProfile[]> {
    const states = this.playerStatesByTeam.get(teamId) ?? [];
    const playerIds = new Set(states.map((s) => s.playerId));
    return this.world.players.filter((p) => playerIds.has(p.id)).map(toPublicProfile);
  }

  async getTeamSquadStates(teamId: TeamId): Promise<readonly PlayerState[]> {
    return this.playerStatesByTeam.get(teamId) ?? [];
  }

  async getTeamSeasonStat(_params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<TeamSeasonStat | null> {
    // 클럽 시즌 지표 생성기 없음(economy/, 21일차) — 위 파일 헤더 참조.
    return null;
  }

  async getTeamPointTransactions(_params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly PointTransaction[]> {
    return [];
  }

  async getTeamSponsorContracts(_teamId: TeamId): Promise<readonly SponsorContract[]> {
    return [];
  }

  async getSponsorsByIds(sponsorIds: readonly SponsorId[]): Promise<readonly Sponsor[]> {
    const wanted = new Set(sponsorIds);
    return this.world.sponsors.filter((s) => wanted.has(s.id));
  }

  async getSponsors(): Promise<readonly Sponsor[]> {
    return this.world.sponsors;
  }

  async getSponsorContracts(_params?: {
    readonly sponsorId?: SponsorId;
    readonly status?: SponsorContractStatus;
  }): Promise<readonly SponsorContract[]> {
    return [];
  }

  async getTeamTrophies(_teamId: TeamId): Promise<readonly Trophy[]> {
    return [];
  }

  async getTeamFixtures(params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly Fixture[]> {
    const leagueId = this.teamToLeague.get(params.teamId);
    const leagueFixtures = leagueId === undefined ? [] : (this.schedulesByLeague.get(leagueId)?.fixtures ?? []);
    const bracketFixtures = [...this.progress.playoffBracket, ...this.progress.cupBracket];

    const involved = [...leagueFixtures, ...bracketFixtures].filter(
      (f) => f.homeTeamId === params.teamId || f.awayTeamId === params.teamId,
    );
    involved.sort((a, b) => (a.kickoffAt < b.kickoffAt ? -1 : a.kickoffAt > b.kickoffAt ? 1 : 0));
    return involved.slice(0, params.limit ?? DEFAULT_TEAM_FIXTURES_LIMIT);
  }

  /* ============================================================
   * 6. 통계 (Stats ranking)
   * ============================================================ */

  async getPlayerStatRanking(params: {
    readonly leagueId: LeagueId | null;
    readonly competitionType: CompetitionType;
    readonly metric: PlayerStatRankingMetric;
    readonly minAppearancePct?: number;
    readonly limit?: number;
  }): Promise<readonly PlayerSeasonStat[]> {
    if (params.competitionType !== 'LEAGUE') {
      // 스탯 리더보드 표본은 LEAGUE 집계만 생성돼 있다(progress.ts) — 위 파일 헤더 참조.
      return [];
    }

    const uiParam = loadConstants('UI_PARAM');
    const minAppearancePct = params.minAppearancePct ?? uiParam.LEADERBOARD_MIN_APPEARANCE_PCT ?? 0;

    const filtered = this.progress.statLeaders.filter((entry) => {
      if (params.leagueId !== null && entry.leagueId !== params.leagueId) {
        return false;
      }
      const appearancePct = (entry.appearances / this.statAppearanceBasis) * 100;
      return appearancePct >= minAppearancePct;
    });

    const sorted = [...filtered].sort(
      (a, b) => (b[params.metric] as number) - (a[params.metric] as number),
    );
    return sorted.slice(0, params.limit ?? DEFAULT_STAT_RANKING_LIMIT);
  }

  async getAwards(_params?: {
    readonly seasonId?: SeasonId;
    readonly leagueId?: LeagueId;
    readonly type?: AwardType;
  }): Promise<readonly Award[]> {
    return [];
  }

  async getMultiAwardRanking(_params: {
    readonly subjectType: 'PLAYER' | 'MANAGER' | 'TEAM';
    readonly limit?: number;
  }): Promise<readonly MultiAwardRankingEntry[]> {
    return [];
  }

  /* ============================================================
   * 7. 뉴스 (News)
   * ============================================================ */

  async getNewsFeed(params?: {
    readonly types?: readonly NewsFeedItemType[];
    readonly limit?: number;
  }): Promise<readonly NewsFeedItem[]> {
    const types = params?.types;
    const filtered =
      types === undefined ? this.progress.newsFeed : this.progress.newsFeed.filter((n) => types.includes(n.type));
    return filtered.slice(0, params?.limit ?? DEFAULT_NEWS_FEED_LIMIT);
  }

  /* ============================================================
   * 8. 브래킷 (Bracket)
   * ============================================================ */

  async getPlayoffBracket(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
  }): Promise<readonly Fixture[]> {
    if (!this.isKnownSeason(params.seasonId)) {
      return [];
    }
    return this.progress.playoffBracket.filter((f) => f.leagueId === params.leagueId);
  }

  async getCupBracket(params?: { readonly seasonId?: SeasonId }): Promise<readonly Fixture[]> {
    if (!this.isKnownSeason(params?.seasonId)) {
      return [];
    }
    return this.progress.cupBracket;
  }

  /* ============================================================
   * 9. 어드민 (Admin, 읽기 전용)
   * ============================================================ */

  async getWorldStatus(): Promise<World> {
    return this.world.world;
  }

  async getCommonCodeGroups(): Promise<readonly CommonCodeGroup[]> {
    return COMMON_CODE_GROUP_CATALOG.map((entry) => ({
      ...entry,
      isActive: true,
      createdAt: this.configTimestamp,
      updatedAt: this.configTimestamp,
    }));
  }

  async getCommonCodes(groupCode: string): Promise<readonly CommonCode[]> {
    const catalogEntry = COMMON_CODE_GROUP_CATALOG.find((g) => g.groupCode === groupCode);
    if (catalogEntry === undefined) {
      return [];
    }
    const values = loadConstants(groupCode as CommonCodeGroupCode);

    return Object.entries(values).map(([code, raw], index) => {
      const isNumber = typeof raw === 'number';
      const isJsonObject = typeof raw === 'object' && raw !== null;
      // `Array.isArray(raw)` true 분기: `fallback.ts`의 JSON형 그룹 5종 전부 코드값이
      // 배열이 아닌 객체(또는 빈 `{}`)라 현재 데이터로는 도달하지 않는다 — 배열형 JSON
      // 공통코드가 실제로 생기면(31a 시드 SQL 이후) 이 분기가 그때 커버된다(19일차 게이트
      // 커버리지 보강, 방어적 미래 대비 분기).
      /* v8 ignore next */
      const valueJson: Readonly<Record<string, unknown>> | null = isJsonObject
        ? Array.isArray(raw)
          ? { items: raw }
          : (raw as Readonly<Record<string, unknown>>)
        : null;
      const serialized = isJsonObject ? JSON.stringify(raw) : String(raw);

      return {
        id: stableId(`${groupCode}:${code}`) as CommonCodeId,
        groupCode,
        code,
        worldId: null,
        value: serialized,
        valueNum: isNumber ? (raw as number) : null,
        valueJson,
        minValue: null,
        maxValue: null,
        jsonSchema: null,
        defaultValue: serialized,
        description: catalogEntry.description,
        unit: null,
        sortOrder: index + 1,
        isActive: true,
        effectiveFromSeason: null,
        createdAt: this.configTimestamp,
        updatedAt: this.configTimestamp,
        updatedBy: null,
      };
    });
  }

  async getCommonCodeHistory(_commonCodeId: CommonCodeId): Promise<readonly CommonCodeHistory[]> {
    // 새 Mock 월드에는 관리자 변경 이력이 아직 없다 — append-only 로그의 정직한 초기 상태.
    return [];
  }

  async getLatestCronRun(): Promise<CronRun | null> {
    return null;
  }

  async getCronRuns(_params?: {
    readonly status?: CronRunStatus;
    readonly onlyCatchUp?: boolean;
    readonly limit?: number;
  }): Promise<readonly CronRun[]> {
    return [];
  }

  async getCronRunMetrics(_params?: { readonly sampleSize?: number }): Promise<CronRunMetrics> {
    // 표본 0건 — 값을 지어내지 않고 "아직 실행 이력 없음"을 그대로 반영한다.
    return { successRatePct: 0, avgDurationMs: 0, maxDurationMs: 0, sampleSize: 0 };
  }

  async getCronGaps(_params?: { readonly limit?: number }): Promise<readonly CronGap[]> {
    return [];
  }

  async getAuditLogs(_params?: {
    readonly actorType?: AuditActorType;
    readonly search?: string;
    readonly limit?: number;
  }): Promise<readonly AuditLog[]> {
    return [];
  }
}
