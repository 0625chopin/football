/**
 * 화면별 4상태 Mock 픽스처 — **17일차(2026-08-12), Task 007 계속분**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 17일차 행
 * ("4상태 시나리오 Mock — 정상/로딩/빈/에러 각 픽스처 세트 (FR-UI-000)", 산출물
 * `src/lib/mock/fixtures/`, 수락 "4상태 × 전 화면 픽스처 존재"). 소유: 3팀
 * 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/mock/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * `generateMockWorld`(15일차)·`generateMockProgress`(16일차)·`generateSeasonSchedule`
 * (오늘, `./schedule.ts`)가 만든 결정론적 산출물에서 화면별 "정상" 표본 1건을 골라
 * `./states.ts`의 `buildFourStates`로 4상태(정상/로딩/빈/에러)를 만든다. LOADING/EMPTY/
 * ERROR는 어떤 화면이든 데이터가 필요 없어(위 `states.ts` 헤더 참조) 이 파일의 실질
 * 작업은 화면별 "정상 데이터 조립"뿐이다.
 *
 * ## 스코프 — 오늘 커버하는 화면 / 부분 커버 / 커버하지 않는 화면(이슈 후보)
 * **전량 커버(9개)** — 이미 15·16·17일차 산출물에 데이터가 존재:
 * FR-UI-002(홈/라이브센터) · FR-UI-003(리그 순위표) · FR-UI-004(일정/결과, 오늘 `schedule.ts`
 * 신규) · FR-UI-007(경기 상세 — 스코어보드·이벤트 타임라인만, 라인업·팀스탯·날씨는 제외) ·
 * FR-UI-008(통계 랭킹) · FR-UI-009/010(플레이오프·컵 브래킷) · FR-UI-011(이적/뉴스 피드) ·
 * FR-UI-014(스폰서 현황).
 *
 * **부분 커버(2개, 섹션 단위로 있는 것만)**:
 * - FR-UI-005(선수 상세) — `Player`/`PlayerAttribute`/`PlayerPosition`/`PlayerState`로
 *   만드는 프로필·능력치·포지션·컨디션 섹션만 채운다. 계약(`Contract`)·부상(`Injury`)·
 *   수상(`Award`)·이적/임대 이력(`Transfer`/`Loan`)·시즌별/통산 스탯·성장 곡선 섹션은
 *   생성 로직이 아직 없어(21일차 `economy/`, 그 이후 일차 소관) **이번 픽스처에 포함하지
 *   않는다** — 해당 섹션은 이 화면의 4상태 중 EMPTY로만 표현 가능하다(정상 데이터 없음).
 * - FR-UI-006(클럽 상세) — 클럽 헤더·스쿼드·감독 섹션만 채운다. 시즌 지표
 *   (`TeamSeasonStat`)·재정 패널(`PointTransaction`)·스폰서 계약(`SponsorContract`)·
 *   트로피(`Trophy`)·최근/예정 경기(`getTeamFixtures`)는 동일한 이유로 제외.
 *
 * **오늘 커버하지 않음(이슈 후보로 보고)**:
 * FR-UI-001(쇼케이스 — 데이터가 아니라 컴포넌트 나열이라 이 팀 소관 아님) · FR-UI-012
 * (수상/명예의 전당 — `Award` Mock 생성기 없음) · FR-UI-013(시즌 아카이브 — 완료 시즌
 * 스냅샷 생성기 없음, 028 소비 이후 소관) · FR-UI-015~018(마켓/베팅 — `src/lib/odds/`
 * 35일차 소관, 그전엔 데이터 자체가 없음) · FR-UI-019/025/026(운영 콘솔 — `CronRun` Mock
 * 생성기 없음, 공통코드는 `loadConstants`로 값은 읽히지만 `CommonCodeGroup` 엔티티 배열
 * 자체를 만드는 팩토리가 아직 없음).
 *
 * ## import 규약
 * 도메인 타입은 `@/types` 배럴에서만 import한다. `PublicPlayerProfile`/
 * `FixtureRoundBounds`는 도메인 타입이 아니라 1팀 `src/lib/data/DataSource.ts`가 정의한
 * **조회 계약 DTO**라 그 파일에서 직접 import한다(체크리스트 C-5·C-6은 `@/types` 서브경로
 * 직접 import를 금지할 뿐, 다른 소유 모듈의 공개 타입 재사용까지 막지 않는다 — `Result<T>`를
 * `@/lib/data/result`에서 가져오는 것과 동일 성격).
 */

import type { PublicPlayerProfile, FixtureRoundBounds } from '@/lib/data/DataSource';
import { deriveMatchSeed, deriveSeasonSeed, stateForSeed } from '@/lib/sim/rng/derive';
import type {
  Fixture,
  Manager,
  MatchEvent,
  MatchSeed,
  NewsFeedItem,
  Player,
  PlayerAttribute,
  PlayerPosition,
  PlayerSeasonStat,
  PlayerState,
  Sponsor,
  Standing,
  Team,
  WorldSeed,
} from '@/types';
import { generateMockProgress } from '../progress';
import { generateMockWorld } from '../world';
import type { MockWorld } from '../world';
import { CURRENT_ROUND, generateSeasonSchedule } from './schedule';
import { buildFourStates } from './states';
import type { FourStateFixture } from './states';

/** 이 픽스처 세트 전용 고정 시드 — 재실행해도 항상 바이트 단위로 동일한 화면 표본을 낸다. */
export const FIXTURE_WORLD_SEED = 20260812 as WorldSeed;

const FIXTURE_NOW = '2026-08-12T12:00:00.000Z';

/* ────────────────────────────────────────────────────────────────────────
 * 화면별 "정상" 데이터 타입 — 여러 DataSource 메서드를 한 화면 단위로 묶은 합성 뷰
 * ──────────────────────────────────────────────────────────────────────── */

/** FR-UI-002 홈/라이브센터 */
export interface HomeScreenData {
  readonly liveFixtures: readonly Fixture[];
  readonly nextKickoff: Fixture | null;
  readonly topNews: readonly NewsFeedItem[];
}

/** FR-UI-004 일정/결과 (한 리그, 한 라운드 표본 + 라운드 네비게이션 경계) */
export interface FixturesByRoundScreenData {
  readonly fixtures: readonly Fixture[];
  readonly bounds: FixtureRoundBounds;
}

/** FR-UI-007 경기 상세 (스코어보드 + 이벤트 타임라인만 — 위 파일 헤더 스코프 참조) */
export interface MatchDetailScreenData {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
}

/** FR-UI-006 클럽 상세 (헤더 + 스쿼드 + 감독만 — 위 파일 헤더 스코프 참조) */
export interface ClubDetailScreenData {
  readonly team: Team;
  readonly manager: Manager | null;
  readonly squad: readonly PublicPlayerProfile[];
  readonly squadStates: readonly PlayerState[];
}

/** FR-UI-005 선수 상세 (프로필 + 능력치 + 포지션 + 컨디션만 — 위 파일 헤더 스코프 참조) */
export interface PlayerDetailScreenData {
  readonly profile: PublicPlayerProfile;
  readonly attribute: PlayerAttribute | null;
  readonly positions: readonly PlayerPosition[];
  readonly state: PlayerState | null;
}

/* ────────────────────────────────────────────────────────────────────────
 * 파생 헬퍼
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `Player.pa`(잠재능력 원값, 1~30)를 1~5 스카우트 등급으로 환산한다 — 이 계약의 산출식
 * 소유는 `DataSource.ts` I-38 판정에 따라 Mock Task 007(이 팀)에 있다. 등급 구간은 6점
 * 단위 균등 분할(1~6→1, 7~12→2, …, 25~30→5)이며, 실제 스카우팅 밸런스 튜닝(031b)이
 * 이 상수를 대체할 수 있다 — 오늘은 화면 표본에 필요한 최소 규칙만 정의한다.
 */
function toScoutRating(pa: number): 1 | 2 | 3 | 4 | 5 {
  const rating = Math.ceil(pa / 6);
  return Math.min(5, Math.max(1, rating)) as 1 | 2 | 3 | 4 | 5;
}

/**
 * `Player` → `PublicPlayerProfile` 변환. **18일차 `MockDataSource`가 그대로 재사용한다**
 * (export) — `getPlayerProfile`/`getTeamSquad` 등 여러 메서드가 같은 `pa` 제외 규칙을
 * 따라야 해서 어댑터 쪽에서 재구현하지 않는다.
 */
export function toPublicProfile(player: Player): PublicPlayerProfile {
  // `pa`를 구조적으로 제외한다(I-38) — 구조분해 rest 패턴은 미사용 변수 lint 경고가 남아
  // 필드를 전부 나열하는 쪽을 택한다(Player 필드 목록은 world.ts가 이미 동결 타입 그대로
  // 채우고 있어 이 목록도 함께 검증됨 — 필드 추가/삭제 시 여기서 타입 에러로 드러난다).
  const {
    id,
    name,
    nationality,
    birthSeason,
    age,
    preferredFoot,
    preferredPosition,
    reputation,
    marketValue,
    tasteTags,
    retiredAtSeason,
  } = player;
  return {
    id,
    name,
    nationality,
    birthSeason,
    age,
    preferredFoot,
    preferredPosition,
    reputation,
    marketValue,
    tasteTags,
    retiredAtSeason,
    scoutRating: toScoutRating(player.pa),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 진입점
 * ──────────────────────────────────────────────────────────────────────── */

export interface MockFixtureScreens {
  readonly home: FourStateFixture<HomeScreenData>;
  readonly standings: FourStateFixture<readonly Standing[]>;
  readonly fixturesByRound: FourStateFixture<FixturesByRoundScreenData>;
  readonly matchDetail: FourStateFixture<MatchDetailScreenData>;
  readonly playerDetail: FourStateFixture<PlayerDetailScreenData>;
  readonly clubDetail: FourStateFixture<ClubDetailScreenData>;
  readonly statRanking: FourStateFixture<readonly PlayerSeasonStat[]>;
  readonly playoffBracket: FourStateFixture<readonly Fixture[]>;
  readonly cupBracket: FourStateFixture<readonly Fixture[]>;
  readonly newsFeed: FourStateFixture<readonly NewsFeedItem[]>;
  readonly sponsors: FourStateFixture<readonly Sponsor[]>;
}

/**
 * `worldSeed` 하나로 전 화면의 4상태 픽스처 세트를 결정론적으로 생성한다. 동일 시드는
 * 항상 바이트 단위로 동일한 결과를 낸다(D-16).
 */
export function buildMockFixtureScreens(worldSeed: WorldSeed = FIXTURE_WORLD_SEED): MockFixtureScreens {
  const world: MockWorld = generateMockWorld(worldSeed);
  const progress = generateMockProgress(worldSeed, world);

  const primaryLeague = world.leagues[0];
  const leagueTeams = world.teams.slice(0, primaryLeague.teamCount);

  // progress.ts와 같은 시드 계층(worldSeed → seasonSeed)을 경유하되, 스트림 자체는
  // 분리한다 — progress.ts는 이 `seasonSeedValue`에서 곧바로 `stateForSeed`로 커서를
  // 얻어 자신의 매치 키(0..40대)를 스레딩한다. 이 파일이 같은 시드로 같은 지점부터
  // 다시 스레딩하면 두 산출물의 랜덤 시퀀스가 완전히 겹쳐(같은 hex를 다른 필드에
  // 재사용) 우연한 비독립성이 생긴다. `SCHEDULE_STREAM_KEY`(예약 상수, progress.ts가
  // 절대 쓰지 않는 큰 값)로 한 단계 더 파생해 이 파일 전용 시작 상태를 얻고,
  // `SCHEDULE_MATCH_KEY_OFFSET`으로 `Fixture.matchSeed` 키 공간도 progress.ts와
  // 겹치지 않게 분리한다(둘 다 근거는 `derive.ts` 시드 계층 파생 — 임의 상수가
  // 아니라 계층 내 별도 네임스페이스 역할).
  const seasonSeedValue = deriveSeasonSeed(worldSeed, 1);
  const SCHEDULE_STREAM_KEY = 999_999;
  const SCHEDULE_MATCH_KEY_OFFSET = 100_000;
  const scheduleState = stateForSeed(deriveMatchSeed(seasonSeedValue, SCHEDULE_STREAM_KEY));

  let matchKeyCounter = SCHEDULE_MATCH_KEY_OFFSET;
  const nextMatchSeed = (): MatchSeed => {
    const key = matchKeyCounter;
    matchKeyCounter += 1;
    return deriveMatchSeed(seasonSeedValue, key) as MatchSeed;
  };

  // `World.snapshotId`(월드 전역, world.ts)와 달리 `Season.snapshotId`(world.ts:112)는
  // "아직 스냅샷되지 않은 시즌"을 표현할 수 있어 타입상 nullable이다. 이 파일이 만드는
  // `generateMockProgress()` 산출물은 항상 실제 스냅샷 1건을 채워 넣으므로(진행 중 시즌
  // 표본, progress.ts 헤더 참조) 여기서는 null이 나오면 그 자체가 계약 위반이다 — 조용히
  // 폴백하지 않고 즉시 실패시킨다(다른 Mock 팩토리들의 fail-fast 관례와 동일).
  const seasonSnapshotId = progress.season.snapshotId;
  /* v8 ignore start -- generateMockProgress()가 진행 중 시즌에 항상 snapshotId를 채운다는
   * 것은 `progress.test.ts`가 이미 계약으로 고정한 불변식이다(호출자가 그 계약을 깨지
   * 않는 한 이 분기는 공개 API 경로로 구조적으로 도달 불가능한 방어 코드다 — 19일차
   * 게이트 커버리지 보강, `MockDataSource.ts` 생성자의 동일 패턴과 같은 근거). */
  if (seasonSnapshotId === null) {
    throw new Error(
      'buildMockFixtureScreens: generateMockProgress()가 만든 Season.snapshotId가 null이다 — ' +
        '진행 중 시즌 스냅샷은 항상 값이 있어야 한다(progress.ts 계약 위반).',
    );
  }
  /* v8 ignore stop */

  const scheduleStep = generateSeasonSchedule(
    scheduleState,
    primaryLeague,
    leagueTeams,
    progress.season.id,
    seasonSnapshotId,
    FIXTURE_NOW,
    CURRENT_ROUND,
    nextMatchSeed,
  );
  const schedule = scheduleStep.value;

  /* ---- FR-UI-002 홈/라이브센터 ---- */
  const home: HomeScreenData = {
    liveFixtures: progress.liveFixtures,
    // `?? null`은 `progress.ts`가 "리그당 라이브 경기 1건"을 항상 만든다는 계약
    // (`progress.test.ts`가 고정)의 방어일 뿐, 리그 3개인 이 Mock 월드에서 실제로 빈
    // 배열이 나올 수 없다 — 19일차 게이트 커버리지 보강, 위 snapshotId 가드와 동일 근거.
    /* v8 ignore next */
    nextKickoff: progress.liveFixtures[0] ?? null,
    topNews: progress.newsFeed.slice(0, 5),
  };

  /* ---- FR-UI-003 리그 순위표 (오늘 schedule.ts 파생값 — I-106 해소) ---- */
  const standings: readonly Standing[] = schedule.standings;

  /* ---- FR-UI-004 일정/결과 ---- */
  const sampleRound = CURRENT_ROUND;
  const fixturesByRound: FixturesByRoundScreenData = {
    fixtures: schedule.fixtures.filter((f) => f.round === sampleRound),
    bounds: { minRound: 1, maxRound: schedule.totalRounds, currentRound: sampleRound },
  };

  /* ---- FR-UI-007 경기 상세 ---- */
  const sampleFixture = progress.liveFixtures[0];
  const matchDetail: MatchDetailScreenData = {
    fixture: sampleFixture,
    events: progress.matchEvents.filter((e) => e.matchId === sampleFixture.id),
  };

  /* ---- FR-UI-005 선수 상세 ---- */
  const samplePlayer = world.players[0];
  // `world.test.ts`("선수마다 PlayerAttribute·PlayerState가 정확히 1건씩 존재한다")가
  // 이미 고정한 불변식 — `?? null`은 그 계약이 깨졌을 때의 방어일 뿐 실제로 도달하지 않는다.
  /* v8 ignore next */
  const attribute = world.playerAttributes.find((a) => a.playerId === samplePlayer.id) ?? null;
  const positions = world.playerPositions.filter((p) => p.playerId === samplePlayer.id);
  /* v8 ignore next */
  const state = world.playerStates.find((s) => s.playerId === samplePlayer.id) ?? null;
  const playerDetail: PlayerDetailScreenData = {
    profile: toPublicProfile(samplePlayer),
    attribute,
    positions,
    state,
  };

  /* ---- FR-UI-006 클럽 상세 ---- */
  const sampleTeam = world.teams[0];
  // `world.ts`가 팀마다 정확히 감독 1명을 만든다(생성 루프가 팀당 1회 `generateManagerForTeam`
  // 호출) — `?? null`은 그 불변식이 깨졌을 때의 방어일 뿐 실제로 도달하지 않는다.
  /* v8 ignore next */
  const teamManager = world.managers.find((m) => m.teamId === sampleTeam.id) ?? null;
  const teamPlayerIds = new Set(
    world.playerStates.filter((s) => s.teamId === sampleTeam.id).map((s) => s.playerId),
  );
  const squad = world.players.filter((p) => teamPlayerIds.has(p.id)).map(toPublicProfile);
  const squadStates = world.playerStates.filter((s) => s.teamId === sampleTeam.id);
  const clubDetail: ClubDetailScreenData = {
    team: sampleTeam,
    manager: teamManager,
    squad,
    squadStates,
  };

  /* ---- FR-UI-008 통계 랭킹 (goals 내림차순 표본) ---- */
  const statRanking: readonly PlayerSeasonStat[] = [...progress.statLeaders]
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 20);

  return {
    home: buildFourStates(home, 'FR-UI-002 홈/라이브센터'),
    standings: buildFourStates(standings, 'FR-UI-003 리그 순위표'),
    fixturesByRound: buildFourStates(fixturesByRound, 'FR-UI-004 일정/결과'),
    matchDetail: buildFourStates(matchDetail, 'FR-UI-007 경기 상세'),
    playerDetail: buildFourStates(playerDetail, 'FR-UI-005 선수 상세(부분)'),
    clubDetail: buildFourStates(clubDetail, 'FR-UI-006 클럽 상세(부분)'),
    statRanking: buildFourStates(statRanking, 'FR-UI-008 통계 랭킹'),
    playoffBracket: buildFourStates(progress.playoffBracket, 'FR-UI-009 플레이오프 브래킷'),
    cupBracket: buildFourStates(progress.cupBracket, 'FR-UI-010 컵대회 브래킷'),
    newsFeed: buildFourStates(progress.newsFeed, 'FR-UI-011 이적/뉴스 피드'),
    sponsors: buildFourStates(world.sponsors, 'FR-UI-014 스폰서 현황'),
  };
}
