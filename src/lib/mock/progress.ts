/**
 * Mock 진행 상태 팩토리 — **16일차(2026-08-11), Task 007 계속분**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 16일차
 * ("라이브 경기·이벤트 타임라인·순위표·스탯·뉴스 피드·브래킷", 산출물 "6종 Mock 생성").
 * 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/mock/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: `generateMockWorld()`(15일차 `world.ts`)가 만든 초기 세계(리그·팀·선수)를
 *   입력받아, 진행 중인 시즌의 **스냅샷 하나**를 결정론적으로 만든다 — 리그당 라이브 경기
 *   1건 + 그 경기의 분 단위 이벤트 타임라인, 리그별 순위표, 선수 스탯 리더보드, 뉴스 피드,
 *   리그별 플레이오프·월드컵 대진표. 6종 각각은 `src/lib/data/DataSource.ts`(1팀 소유)의
 *   대응 메서드(`getLiveFixtures`/`getMatchEvents`/`getStandings`/`getPlayerStatRanking`/
 *   `getNewsFeed`/`getPlayoffBracket`+`getCupBracket`) 반환 타입과 1:1로 맞춰 18일차
 *   `MockDataSource` 구현체가 그대로 슬라이스해 쓸 수 있게 한다.
 * - **담지 않는 것**: 풀 시즌 라운드로빈 일정·4상태(예정/라이브/종료/무효) 시나리오
 *   픽스처 세트는 17일차 `fixtures/`가 별도로 만든다 — 이 파일의 순위표는 그 전체 일정을
 *   역산한 결과가 아니라, 자체적으로 내적 정합(played=won+drawn+lost 등)만 보장하는
 *   독립적인 "진행 중 스냅샷" 표본이다. `DataSource` 어댑터 구현(18일차)도 범위 밖.
 *
 * ## 순수 함수 계약 (world.ts와 동일 관례)
 * `Math.random()`/`Date.now()`/인자 없는 `new Date()`를 쓰지 않는다. 시드는 2팀
 * `src/lib/sim/rng/derive.ts`의 계층 파생(`deriveSeasonSeed`→`deriveMatchSeed`)을 그대로
 * 경유하고, 일반 콘텐츠 난수는 `src/lib/sim/rng/prng.ts`를 순차 스레딩한다. 달력 연산은
 * 고정 앵커(`MOCK_NOW`)에서 `new Date(isoString)`로만 오프셋하므로 결정론이 깨지지 않는다.
 *
 * ## 단순화 지점(명시적 스코프 축소 — 추후 정교화 대상)
 * - 순위표는 전 팀이 "동일 라운드(`STANDINGS_ROUND`)를 소화했다"고 가정한 표본이며, 실제
 *   라운드로빈 대진 이력에서 파생되지 않는다.
 * - 플레이오프 시딩은 `League.playoffTeamCount`(10/4/2)를 2의 거듭제곱으로 내림(8/4/2)한
 *   값만 사용한다 — 부전승(bye) 슬롯은 다루지 않는다(`DataSource.ts` I-50 논의와 동일한
 *   미해결 지점, 실제 대진 구조 확정 전까지는 마찬가지로 유보).
 * - 컵 대진은 스펙상 "6라운드(64강)"이나 Mock 월드 팀 수(60)가 이에 못 미쳐 32강(5라운드)
 *   로 축소한다.
 */

import { installHardcodedFallback } from '@/lib/config/fallback';
import { loadConstants } from '@/lib/config/loader';
import { deriveMatchSeed, deriveSeasonSeed, stateForSeed } from '@/lib/sim/rng/derive';
import { nextIntBelow, nextIntBetween } from '@/lib/sim/rng/prng';
import type { PrngResult, PrngState } from '@/lib/sim/rng/prng';
import type {
  Fixture,
  FixtureId,
  FixtureStatus,
  League,
  LeagueId,
  MatchEvent,
  MatchEventId,
  MatchEventType,
  MatchSeed,
  NewsFeedItem,
  NewsFeedItemId,
  NewsFeedItemType,
  Player,
  PlayerId,
  PlayerSeasonStat,
  PlayerState,
  PlayerStatCoreValues,
  Position,
  Season,
  SeasonId,
  SeasonSeed,
  SnapshotId,
  Standing,
  Team,
  TeamId,
  WorldSeed,
} from '@/types';
import { MOCK_EPOCH_NOW } from './world';
import type { MockWorld } from './world';

/* ────────────────────────────────────────────────────────────────────────
 * 산출물 타입
 * ──────────────────────────────────────────────────────────────────────── */

/** Mock 진행 상태 팩토리의 산출물 — 6종 스냅샷 묶음. */
export interface MockProgress {
  readonly season: Season;
  /** 라이브 경기(리그당 최대 1건) — `getLiveFixtures` 대응 */
  readonly liveFixtures: readonly Fixture[];
  /** 위 라이브 경기들의 분 단위 이벤트 전량(평면 배열, `matchId`로 구분) — `getMatchEvents` 대응 */
  readonly matchEvents: readonly MatchEvent[];
  /** 리그별 최신 라운드 순위표 — `getStandings` 대응 */
  readonly standings: readonly Standing[];
  /** 선수 스탯 리더보드 표본 — `getPlayerStatRanking` 대응 */
  readonly statLeaders: readonly PlayerSeasonStat[];
  /** 발생 시각 역순 뉴스 — `getNewsFeed` 대응 */
  readonly newsFeed: readonly NewsFeedItem[];
  /** 리그별 플레이오프 대진 — `getPlayoffBracket` 대응 */
  readonly playoffBracket: readonly Fixture[];
  /** 월드 단일 컵 대진 — `getCupBracket` 대응 */
  readonly cupBracket: readonly Fixture[];
}

/* ────────────────────────────────────────────────────────────────────────
 * 고정 앵커 / 상수
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 이 진행 상태 스냅샷이 표현하는 "현재 시각"(고정값) — `world.ts`의 `MOCK_EPOCH_NOW`를
 * 그대로 재노출한다(19일차 I-114 해소, 기준 시각 통일). 이 파일에서 별도 리터럴을 다시
 * 하드코딩하지 않는다 — 결정론을 위해 `Date.now()`를 쓰지 않는 원칙은 동일하다.
 */
export const MOCK_NOW = MOCK_EPOCH_NOW;

/** 순위표가 표현하는 라운드 — 전 팀이 이 라운드까지 소화했다고 가정한다(단순화, 파일 헤더 참조). */
const STANDINGS_ROUND = 10;

/** 스탯 리더보드 표본 크기(전 리그 통합) */
const STAT_LEADER_SAMPLE_SIZE = 60;

/** 뉴스 피드 생성 건수 */
const NEWS_FEED_COUNT = 24;

const NEWS_FEED_TYPES: readonly NewsFeedItemType[] = [
  'TRANSFER', 'LOAN', 'RETIREMENT', 'YOUTH_DEBUT', 'MANAGER_CHANGE',
  'SPONSOR_BANKRUPT', 'AWARD', 'INJURY', 'MILESTONE', 'SANCTION',
];

/** 라이브 경기 이벤트 타임라인의 "채움" 이벤트 풀(득점 계열 제외) */
const FILLER_EVENT_POOL: readonly MatchEventType[] = [
  'SHOT_ON', 'SHOT_OFF', 'SHOT_BLOCKED', 'FOUL', 'CORNER', 'OFFSIDE', 'YELLOW_CARD', 'SAVE',
];

/** 득점으로 집계되는 이벤트 타입(스코어보드 fold 규칙, I-43과 동일 취지) */
const GOAL_EVENT_TYPES: ReadonlySet<MatchEventType> = new Set(['GOAL', 'PENALTY_SCORED', 'OWN_GOAL']);

/** 포지션별 공격 관여도(0=순수 수비, 1=순수 공격) — 스탯 리더보드 생성 편향에만 쓰는 표본값 */
const POSITION_ATTACK_BIAS: Readonly<Record<Position, number>> = {
  GK: 0, CB: 0.08, LB: 0.25, RB: 0.25, DM: 0.2, CM: 0.35,
  AM: 0.65, LW: 0.75, RW: 0.75, ST: 0.9, SS: 0.85,
};

/* ────────────────────────────────────────────────────────────────────────
 * 범용 헬퍼 (world.ts와 동일 관례 — 자기완결 파일 유지)
 * ──────────────────────────────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pick<T>(state: PrngState, pool: readonly T[]): PrngResult<T> {
  const step = nextIntBelow(state, pool.length);
  return { state: step.state, value: pool[step.value] };
}

/** 128비트 난수를 UUID v4 형태로 접는다 — `world.ts`의 `nextId`와 동일 구현. */
function nextId(state: PrngState): PrngResult<string> {
  let cursor = state;
  const words: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const step = nextIntBelow(cursor, 0x100000000);
    cursor = step.state;
    words.push(step.value);
  }
  const hex = words.map((w) => w.toString(16).padStart(8, '0')).join('');
  const value =
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-` +
    `${((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  return { state: cursor, value };
}

/** Fisher-Yates — `[0, length)` 인덱스를 결정론적으로 뒤섞는다(표본 추출용). */
function shuffleIndices(state: PrngState, length: number): PrngResult<readonly number[]> {
  const arr = Array.from({ length }, (_, i) => i);
  let cursor = state;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const step = nextIntBelow(cursor, i + 1);
    cursor = step.state;
    const j = step.value;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return { state: cursor, value: arr };
}

function minutesBefore(anchorIso: string, minutes: number): string {
  return new Date(new Date(anchorIso).getTime() - minutes * 60_000).toISOString();
}

function minutesAfter(anchorIso: string, minutes: number): string {
  return new Date(new Date(anchorIso).getTime() + minutes * 60_000).toISOString();
}

/** `leagues`/`teams`는 `world.ts`가 리그 순서대로 팀을 연속 생성한다는 전제에 의존한다(동일 파일 `world.test.ts` 선례). */
function groupTeamsByLeague(
  leagues: readonly League[],
  teams: readonly Team[],
): readonly (readonly Team[])[] {
  const groups: Team[][] = [];
  let offset = 0;
  for (const league of leagues) {
    groups.push(teams.slice(offset, offset + league.teamCount));
    offset += league.teamCount;
  }
  return groups;
}

interface TeamSquadIndex {
  readonly outfield: readonly PlayerId[];
  readonly goalkeepers: readonly PlayerId[];
}

function buildTeamPlayerIndex(world: MockWorld): ReadonlyMap<TeamId, TeamSquadIndex> {
  const playersById = new Map<PlayerId, Player>(world.players.map((p) => [p.id, p] as const));
  const map = new Map<TeamId, { outfield: PlayerId[]; goalkeepers: PlayerId[] }>();

  for (const state of world.playerStates) {
    if (state.teamId === null) {
      continue;
    }
    const player = playersById.get(state.playerId);
    if (player === undefined) {
      continue;
    }
    let bucket = map.get(state.teamId);
    if (bucket === undefined) {
      bucket = { outfield: [], goalkeepers: [] };
      map.set(state.teamId, bucket);
    }
    if (player.preferredPosition === 'GK') {
      bucket.goalkeepers.push(player.id);
    } else {
      bucket.outfield.push(player.id);
    }
  }

  return map;
}

/* ────────────────────────────────────────────────────────────────────────
 * 순위표
 * ──────────────────────────────────────────────────────────────────────── */

function generateStandings(
  state: PrngState,
  leagues: readonly League[],
  teamsByLeague: readonly (readonly Team[])[],
  seasonId: SeasonId,
  matchPoints: Readonly<Record<'WIN' | 'DRAW' | 'LOSS', number>>,
): PrngResult<readonly Standing[]> {
  let cursor = state;
  const standings: Standing[] = [];

  leagues.forEach((league, leagueIdx) => {
    const teams = teamsByLeague[leagueIdx];
    const rows: (Omit<Standing, 'rank'>)[] = [];

    for (const team of teams) {
      const winP = clamp(0.3 + (team.reputation - 50) / 250, 0.12, 0.72);
      const drawP = 0.24;

      let won = 0;
      let drawn = 0;
      let lost = 0;
      for (let i = 0; i < STANDINGS_ROUND; i += 1) {
        const rollStep = nextIntBetween(cursor, 0, 999);
        cursor = rollStep.state;
        const roll = rollStep.value / 1000;
        if (roll < winP) {
          won += 1;
        } else if (roll < winP + drawP) {
          drawn += 1;
        } else {
          lost += 1;
        }
      }

      const rollGoals = (lo: number, hi: number): number => {
        const step = nextIntBetween(cursor, lo, hi);
        cursor = step.state;
        return step.value;
      };
      let gf = 0;
      let ga = 0;
      for (let i = 0; i < won; i += 1) {
        gf += rollGoals(1, 3);
        ga += rollGoals(0, 1);
      }
      for (let i = 0; i < drawn; i += 1) {
        const g = rollGoals(0, 2);
        gf += g;
        ga += g;
      }
      for (let i = 0; i < lost; i += 1) {
        gf += rollGoals(0, 1);
        ga += rollGoals(1, 3);
      }

      const formChars: string[] = [];
      for (let i = 0; i < 5; i += 1) {
        const rollStep = nextIntBetween(cursor, 0, 999);
        cursor = rollStep.state;
        const roll = rollStep.value / 1000;
        formChars.push(roll < winP ? 'W' : roll < winP + drawP ? 'D' : 'L');
      }

      const fairPlayStep = nextIntBetween(cursor, 55, 98);
      cursor = fairPlayStep.state;

      rows.push({
        seasonId,
        leagueId: league.id,
        round: STANDINGS_ROUND,
        teamId: team.id,
        played: STANDINGS_ROUND,
        won,
        drawn,
        lost,
        gf,
        ga,
        gd: gf - ga,
        points: won * matchPoints.WIN + drawn * matchPoints.DRAW + lost * matchPoints.LOSS,
        form: formChars.join(''),
        fairPlayScore: fairPlayStep.value,
        tiebreakApplied: null,
      });
    }

    rows.sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    rows.forEach((row, i) => standings.push({ ...row, rank: i + 1 }));
  });

  return { state: cursor, value: standings };
}

/* ────────────────────────────────────────────────────────────────────────
 * 스탯 리더보드
 * ──────────────────────────────────────────────────────────────────────── */

function generatePlayerStatCore(
  state: PrngState,
  isGoalkeeper: boolean,
  appearances: number,
  attackBias: number,
): PrngResult<PlayerStatCoreValues> {
  let cursor = state;
  const roll = (lo: number, hi: number): number => {
    const step = nextIntBetween(cursor, lo, hi);
    cursor = step.state;
    return step.value;
  };

  const starts = roll(Math.max(0, appearances - 3), appearances);
  const subAppearances = appearances - starts;
  const minutesPlayed = starts * roll(75, 90) + subAppearances * roll(10, 30);

  const shots = isGoalkeeper ? 0 : roll(0, Math.round(appearances * (1 + attackBias * 4)));
  const shotsOnTarget = roll(0, shots);
  const goals = roll(0, Math.round(shotsOnTarget * 0.6));
  const xg = roll(0, Math.round((shots + 1) * 15 * (0.5 + attackBias))) / 100;
  const assists = roll(0, Math.round(appearances * attackBias * 0.4));
  const xa = roll(0, Math.round((assists + 1) * 20)) / 100;
  const bigChancesCreated = roll(0, Math.round(appearances * attackBias * 0.3));
  const bigChancesMissed = roll(0, Math.round(shots * 0.15));
  const penaltiesTaken = attackBias > 0.5 ? roll(0, Math.round(appearances * 0.08)) : 0;
  const penaltiesScored = roll(0, penaltiesTaken);
  const freeKickGoals = roll(0, Math.round(goals * 0.2));
  const headedGoals = roll(0, Math.max(0, goals - freeKickGoals));
  const ownGoalRoll = roll(0, 99);
  const ownGoals = ownGoalRoll < 2 ? 1 : 0;

  const passesAttempted = roll(appearances * 10, appearances * (isGoalkeeper ? 25 : 45));
  const passesCompleted = Math.round(passesAttempted * (roll(70, 92) / 100));
  const keyPasses = roll(0, Math.round(appearances * attackBias * 0.6));
  const longBallsAttempted = roll(0, Math.round(passesAttempted * 0.15));
  const longBallsCompleted = Math.round(longBallsAttempted * (roll(55, 85) / 100));
  const crossesAttempted = isGoalkeeper ? 0 : roll(0, Math.round(appearances * attackBias * 1.5));
  const crossesCompleted = Math.round(crossesAttempted * (roll(20, 45) / 100));
  const throughBalls = roll(0, Math.round(appearances * attackBias * 0.3));

  const dribblesAttempted = isGoalkeeper ? 0 : roll(0, Math.round(appearances * attackBias * 2));
  const dribblesCompleted = Math.round(dribblesAttempted * (roll(45, 75) / 100));
  const dispossessed = roll(0, Math.round(appearances * (1 - attackBias * 0.3)));
  const touches = roll(appearances * 15, appearances * 60);

  const defenseBias = 1 - attackBias;
  const tacklesAttempted = isGoalkeeper ? 0 : roll(0, Math.round(appearances * defenseBias * 3));
  const tacklesWon = Math.round(tacklesAttempted * (roll(50, 80) / 100));
  const interceptions = roll(0, Math.round(appearances * defenseBias * 2));
  const clearances = roll(0, Math.round(appearances * defenseBias * 3));
  const blocks = roll(0, Math.round(appearances * defenseBias * 1.5));
  const aerialDuelsAttempted = roll(0, appearances * 2);
  const aerialDuelsWon = Math.round(aerialDuelsAttempted * (roll(35, 70) / 100));
  const groundDuelsAttempted = roll(0, appearances * 3);
  const groundDuelsWon = Math.round(groundDuelsAttempted * (roll(35, 65) / 100));
  const errorsLeadingToShot = roll(0, Math.round(appearances * 0.15));
  const errorsLeadingToGoal = roll(0, Math.round(appearances * 0.05));

  const foulsCommitted = roll(0, Math.round(appearances * 1.5));
  const foulsDrawn = roll(0, Math.round(appearances * 1.5));
  const yellowCards = roll(0, Math.max(1, Math.round(appearances * 0.3)));
  const secondYellows = roll(0, Math.round(yellowCards * 0.1));
  const redCards = secondYellows > 0 ? roll(0, 1) : 0;
  const offsides = isGoalkeeper ? 0 : roll(0, Math.round(appearances * attackBias * 0.8));

  const shotsFaced = isGoalkeeper ? roll(appearances * 2, appearances * 5) : 0;
  const goalsConceded = isGoalkeeper ? roll(0, Math.round(shotsFaced * 0.35)) : 0;
  const saves = isGoalkeeper ? Math.max(0, shotsFaced - goalsConceded) : 0;
  const cleanSheets = isGoalkeeper
    ? roll(0, Math.max(0, appearances - Math.ceil(goalsConceded / 1.5)))
    : 0;
  const penaltiesFaced = isGoalkeeper ? roll(0, Math.round(appearances * 0.15)) : 0;
  const penaltiesSaved = isGoalkeeper ? roll(0, penaltiesFaced) : 0;
  const punches = isGoalkeeper ? roll(0, Math.round(appearances * 0.8)) : 0;
  const catches = isGoalkeeper ? roll(0, Math.round(appearances * 3)) : 0;
  const sweeperActions = isGoalkeeper ? roll(0, Math.round(appearances * 0.6)) : 0;
  const xgPrevented = isGoalkeeper ? roll(-300, 300) / 100 : 0;

  const value: PlayerStatCoreValues = {
    appearances, starts, subAppearances, minutesPlayed,
    goals, assists, shots, shotsOnTarget, xg, xa, bigChancesCreated, bigChancesMissed,
    penaltiesTaken, penaltiesScored, freeKickGoals, headedGoals, ownGoals,
    passesAttempted, passesCompleted, keyPasses, longBallsAttempted, longBallsCompleted,
    crossesAttempted, crossesCompleted, throughBalls,
    dribblesAttempted, dribblesCompleted, dispossessed, touches,
    tacklesAttempted, tacklesWon, interceptions, clearances, blocks,
    aerialDuelsAttempted, aerialDuelsWon, groundDuelsAttempted, groundDuelsWon,
    errorsLeadingToShot, errorsLeadingToGoal,
    foulsCommitted, foulsDrawn, yellowCards, secondYellows, redCards, offsides,
    saves, shotsFaced, goalsConceded, cleanSheets, penaltiesFaced, penaltiesSaved,
    punches, catches, sweeperActions, xgPrevented,
  };

  return { state: cursor, value };
}

function generateStatLeaders(
  state: PrngState,
  world: MockWorld,
  teamToLeague: ReadonlyMap<TeamId, LeagueId>,
  seasonId: SeasonId,
): PrngResult<readonly PlayerSeasonStat[]> {
  let cursor = state;
  const teamById = new Map<TeamId, Team>(world.teams.map((t) => [t.id, t] as const));
  const stateByPlayer = new Map<PlayerId, PlayerState>(
    world.playerStates.map((s) => [s.playerId, s] as const),
  );

  const sampleSize = Math.min(STAT_LEADER_SAMPLE_SIZE, world.players.length);
  const shuffleStep = shuffleIndices(cursor, world.players.length);
  cursor = shuffleStep.state;
  const selectedIndices = shuffleStep.value.slice(0, sampleSize);

  const stats: PlayerSeasonStat[] = [];
  for (const idx of selectedIndices) {
    const player = world.players[idx];
    const playerState = stateByPlayer.get(player.id);
    if (playerState === undefined || playerState.teamId === null) {
      continue;
    }
    const team = teamById.get(playerState.teamId);
    const leagueId = teamToLeague.get(playerState.teamId);
    if (team === undefined || leagueId === undefined) {
      continue;
    }

    const isGoalkeeper = player.preferredPosition === 'GK';
    const attackBias = POSITION_ATTACK_BIAS[player.preferredPosition];

    const appearancesStep = nextIntBetween(cursor, Math.max(1, STANDINGS_ROUND - 4), STANDINGS_ROUND);
    cursor = appearancesStep.state;

    const coreStep = generatePlayerStatCore(cursor, isGoalkeeper, appearancesStep.value, attackBias);
    cursor = coreStep.state;

    const contributionStep = nextIntBetween(cursor, 0, 100);
    cursor = contributionStep.state;
    const conditionStep = nextIntBetween(cursor, 55, 100);
    cursor = conditionStep.state;
    const motmStep = nextIntBetween(cursor, 0, Math.max(1, Math.round(coreStep.value.appearances * 0.15)));
    cursor = motmStep.state;
    const injuriesStep = nextIntBetween(cursor, 0, 3);
    cursor = injuriesStep.state;
    const roundsInjuredStep = nextIntBetween(cursor, 0, injuriesStep.value * 3);
    cursor = roundsInjuredStep.state;
    const suspendedStep = nextIntBetween(cursor, 0, Math.floor(coreStep.value.yellowCards / 5));
    cursor = suspendedStep.state;

    stats.push({
      ...coreStep.value,
      playerId: player.id,
      seasonId,
      competitionType: 'LEAGUE',
      teamId: team.id,
      leagueId,
      contributionScore: contributionStep.value,
      avgCondition: conditionStep.value / 10,
      motmAwards: motmStep.value,
      injuriesCount: injuriesStep.value,
      roundsInjured: roundsInjuredStep.value,
      matchesSuspended: suspendedStep.value,
    });
  }

  return { state: cursor, value: stats };
}

/* ────────────────────────────────────────────────────────────────────────
 * 뉴스 피드
 * ──────────────────────────────────────────────────────────────────────── */

function generateNewsFeed(
  state: PrngState,
  world: MockWorld,
  seasonId: SeasonId,
): PrngResult<readonly NewsFeedItem[]> {
  let cursor = state;
  const items: NewsFeedItem[] = [];

  for (let i = 0; i < NEWS_FEED_COUNT; i += 1) {
    const typeStep = pick(cursor, NEWS_FEED_TYPES);
    cursor = typeStep.state;
    const playerStep = pick(cursor, world.players);
    cursor = playerStep.state;
    const teamAStep = pick(cursor, world.teams);
    cursor = teamAStep.state;
    const teamBStep = pick(cursor, world.teams);
    cursor = teamBStep.state;
    const managerStep = pick(cursor, world.managers);
    cursor = managerStep.state;
    const sponsorStep = pick(cursor, world.sponsors);
    cursor = sponsorStep.state;
    const offsetStep = nextIntBetween(cursor, 0, 10_080);
    cursor = offsetStep.state;
    const idStep = nextId(cursor);
    cursor = idStep.state;

    const player = playerStep.value;
    const teamA = teamAStep.value;
    const teamB = teamBStep.value;
    const manager = managerStep.value;
    const sponsor = sponsorStep.value;

    let headline: string;
    let body: string;
    let refType: string;
    let refId: string;

    switch (typeStep.value) {
      case 'TRANSFER':
        headline = `${player.name}, ${teamA.name}에서 ${teamB.name}로 이적`;
        body = `${player.name} 선수가 ${teamA.name}을(를) 떠나 ${teamB.name}과(와) 새 계약을 체결했습니다.`;
        refType = 'Transfer';
        refId = player.id;
        break;
      case 'LOAN':
        headline = `${player.name}, ${teamB.name}로 임대`;
        body = `${player.name} 선수가 이번 시즌 ${teamB.name}에서 임대 신분으로 활약합니다.`;
        refType = 'Loan';
        refId = player.id;
        break;
      case 'RETIREMENT':
        headline = `${player.name}, 현역 은퇴 선언`;
        body = `${player.name} 선수가 선수 생활을 마치고 은퇴를 선언했습니다.`;
        refType = 'Player';
        refId = player.id;
        break;
      case 'YOUTH_DEBUT':
        headline = `${player.name}, ${teamA.name} 1군 데뷔`;
        body = `유스 출신 ${player.name} 선수가 ${teamA.name} 1군 무대에 데뷔했습니다.`;
        refType = 'Player';
        refId = player.id;
        break;
      case 'MANAGER_CHANGE':
        headline = `${teamA.name}, 신임 감독 ${manager.name} 선임`;
        body = `${teamA.name}이(가) ${manager.name} 감독을 새 사령탑으로 선임했습니다.`;
        refType = 'Manager';
        refId = manager.id;
        break;
      case 'SPONSOR_BANKRUPT':
        headline = `${sponsor.name}, 파산 선언`;
        body = `${sponsor.name}이(가) 재정 악화로 파산을 선언하며 스폰서십 계약에 영향이 예상됩니다.`;
        refType = 'Sponsor';
        refId = sponsor.id;
        break;
      case 'AWARD':
        headline = `${player.name}, 이달의 선수 선정`;
        body = `${player.name} 선수가 뛰어난 활약으로 이달의 선수로 선정됐습니다.`;
        refType = 'Award';
        refId = player.id;
        break;
      case 'INJURY':
        headline = `${player.name}, 부상으로 이탈`;
        body = `${player.name} 선수가 경기 중 부상을 당해 당분간 결장이 예상됩니다.`;
        refType = 'Injury';
        refId = player.id;
        break;
      case 'MILESTONE':
        headline = `${player.name}, 통산 기록 달성`;
        body = `${player.name} 선수가 팀 통산 출전 기록을 새로 썼습니다.`;
        refType = 'Player';
        refId = player.id;
        break;
      case 'SANCTION':
        headline = `${teamA.name}에 리빌드 제재 부과`;
        body = `${teamA.name}이(가) 규정 위반으로 리빌드 제재를 받았습니다.`;
        refType = 'Sanction';
        refId = teamA.id;
        break;
    }

    items.push({
      id: idStep.value as NewsFeedItemId,
      seasonId,
      type: typeStep.value,
      headline,
      body,
      refType,
      refId,
      occurredAt: minutesBefore(MOCK_NOW, offsetStep.value),
    });
  }

  items.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0));
  return { state: cursor, value: items };
}

/* ────────────────────────────────────────────────────────────────────────
 * 라이브 경기 + 이벤트 타임라인
 * ──────────────────────────────────────────────────────────────────────── */

interface LiveMatchResult {
  readonly fixture: Fixture;
  readonly events: readonly MatchEvent[];
}

function generateLiveMatch(
  state: PrngState,
  homeTeam: Team,
  awayTeam: Team,
  league: League,
  round: number,
  seasonId: SeasonId,
  snapshotId: SnapshotId,
  matchSeed: MatchSeed,
  teamPlayerIndex: ReadonlyMap<TeamId, TeamSquadIndex>,
): PrngResult<LiveMatchResult> {
  let cursor = state;

  const fixtureIdStep = nextId(cursor);
  cursor = fixtureIdStep.state;
  const fixtureId = fixtureIdStep.value as FixtureId;

  const elapsedStep = nextIntBetween(cursor, 1, 90);
  cursor = elapsedStep.state;
  const elapsed = elapsedStep.value;

  const homeGoalsStep = nextIntBetween(cursor, 0, elapsed >= 30 ? 3 : 1);
  cursor = homeGoalsStep.state;
  const awayGoalsStep = nextIntBetween(cursor, 0, elapsed >= 30 ? 3 : 1);
  cursor = awayGoalsStep.state;

  let sequence = 0;
  const rawEvents: MatchEvent[] = [];

  const pushEvent = (
    minute: number,
    type: MatchEventType,
    teamId: TeamId | null,
    primaryPlayerId: PlayerId | null,
    extra: Partial<Pick<MatchEvent, 'secondaryPlayerId' | 'xg' | 'relatedEventSequence' | 'detail'>> = {},
  ): void => {
    const evIdStep = nextId(cursor);
    cursor = evIdStep.state;
    rawEvents.push({
      id: evIdStep.value as MatchEventId,
      matchId: fixtureId,
      sequence,
      minute,
      addedTime: 0,
      type,
      teamId,
      primaryPlayerId,
      secondaryPlayerId: extra.secondaryPlayerId ?? null,
      xg: extra.xg ?? null,
      relatedEventSequence: extra.relatedEventSequence ?? null,
      detail: extra.detail ?? {},
    });
    sequence += 1;
  };

  pushEvent(0, 'KICKOFF', null, null);
  if (elapsed >= 45) {
    pushEvent(45, 'HALF_TIME', null, null);
  }

  const pushGoals = (teamId: TeamId, opponentId: TeamId, count: number): void => {
    const scorers = teamPlayerIndex.get(teamId);
    const opponentScorers = teamPlayerIndex.get(opponentId);
    if (scorers === undefined || scorers.outfield.length === 0) {
      return;
    }
    for (let i = 0; i < count; i += 1) {
      const minuteStep = nextIntBetween(cursor, 1, elapsed);
      cursor = minuteStep.state;
      const kindStep = nextIntBetween(cursor, 0, 99);
      cursor = kindStep.state;

      if (kindStep.value < 8 && opponentScorers !== undefined && opponentScorers.outfield.length > 0) {
        const scorerStep = pick(cursor, opponentScorers.outfield);
        cursor = scorerStep.state;
        pushEvent(minuteStep.value, 'OWN_GOAL', teamId, scorerStep.value);
      } else if (kindStep.value < 20) {
        const scorerStep = pick(cursor, scorers.outfield);
        cursor = scorerStep.state;
        const awardedSequence = sequence;
        pushEvent(minuteStep.value, 'PENALTY_AWARDED', teamId, scorerStep.value);
        pushEvent(minuteStep.value, 'PENALTY_SCORED', teamId, scorerStep.value, {
          relatedEventSequence: awardedSequence,
        });
      } else {
        const scorerStep = pick(cursor, scorers.outfield);
        cursor = scorerStep.state;
        pushEvent(minuteStep.value, 'GOAL', teamId, scorerStep.value);
        const goalSequence = sequence - 1;

        const assistRollStep = nextIntBetween(cursor, 0, 99);
        cursor = assistRollStep.state;
        const candidates = scorers.outfield.filter((id) => id !== scorerStep.value);
        if (assistRollStep.value < 60 && candidates.length > 0) {
          const assisterStep = pick(cursor, candidates);
          cursor = assisterStep.state;
          pushEvent(minuteStep.value, 'ASSIST', teamId, assisterStep.value, {
            relatedEventSequence: goalSequence,
          });
        }
      }
    }
  };

  pushGoals(homeTeam.id, awayTeam.id, homeGoalsStep.value);
  pushGoals(awayTeam.id, homeTeam.id, awayGoalsStep.value);

  const fillerCountStep = nextIntBetween(cursor, Math.round(elapsed / 6), Math.round(elapsed / 3) + 1);
  cursor = fillerCountStep.state;
  for (let i = 0; i < fillerCountStep.value; i += 1) {
    const minuteStep = nextIntBetween(cursor, 0, elapsed);
    cursor = minuteStep.state;
    const typeStep = pick(cursor, FILLER_EVENT_POOL);
    cursor = typeStep.state;
    const sideStep = nextIntBetween(cursor, 0, 1);
    cursor = sideStep.state;
    const actingTeam = sideStep.value === 0 ? homeTeam : awayTeam;
    const opposingTeam = sideStep.value === 0 ? awayTeam : homeTeam;

    if (typeStep.value === 'SAVE') {
      const gks = teamPlayerIndex.get(opposingTeam.id)?.goalkeepers ?? [];
      if (gks.length === 0) {
        continue;
      }
      const gkStep = pick(cursor, gks);
      cursor = gkStep.state;
      pushEvent(minuteStep.value, 'SAVE', opposingTeam.id, gkStep.value);
      continue;
    }

    const pool = teamPlayerIndex.get(actingTeam.id)?.outfield ?? [];
    if (pool.length === 0) {
      continue;
    }
    const playerStep = pick(cursor, pool);
    cursor = playerStep.state;

    if (typeStep.value === 'SHOT_ON' || typeStep.value === 'SHOT_OFF' || typeStep.value === 'SHOT_BLOCKED') {
      const xgCentiStep = nextIntBetween(cursor, 1, 40);
      cursor = xgCentiStep.state;
      pushEvent(minuteStep.value, typeStep.value, actingTeam.id, playerStep.value, {
        xg: xgCentiStep.value / 100,
      });
    } else {
      pushEvent(minuteStep.value, typeStep.value, actingTeam.id, playerStep.value);
    }
  }

  const sorted = [...rawEvents].sort((a, b) => a.minute - b.minute);
  const seqMap = new Map<number, number>();
  sorted.forEach((ev, i) => seqMap.set(ev.sequence, i));
  const events: MatchEvent[] = sorted.map((ev, i) => ({
    ...ev,
    sequence: i,
    relatedEventSequence: ev.relatedEventSequence === null ? null : seqMap.get(ev.relatedEventSequence) ?? null,
  }));

  const homeScore = events.filter((e) => GOAL_EVENT_TYPES.has(e.type) && e.teamId === homeTeam.id).length;
  const awayScore = events.filter((e) => GOAL_EVENT_TYPES.has(e.type) && e.teamId === awayTeam.id).length;
  const htHomeScore = elapsed >= 45
    ? events.filter((e) => GOAL_EVENT_TYPES.has(e.type) && e.teamId === homeTeam.id && e.minute <= 45).length
    : null;
  const htAwayScore = elapsed >= 45
    ? events.filter((e) => GOAL_EVENT_TYPES.has(e.type) && e.teamId === awayTeam.id && e.minute <= 45).length
    : null;

  const attendanceStep = nextIntBetween(
    cursor,
    Math.round(homeTeam.stadiumCapacity * 0.5),
    homeTeam.stadiumCapacity,
  );
  cursor = attendanceStep.state;

  const fixture: Fixture = {
    id: fixtureId,
    seasonId,
    competitionType: 'LEAGUE',
    leagueId: league.id,
    round,
    roundLabel: `${round}라운드`,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    isNeutral: false,
    kickoffAt: minutesBefore(MOCK_NOW, elapsed),
    status: 'LIVE',
    homeScore,
    awayScore,
    htHomeScore,
    htAwayScore,
    etHomeScore: null,
    etAwayScore: null,
    pkHome: null,
    pkAway: null,
    attendance: attendanceStep.value,
    matchSeed,
    snapshotId,
    simulatedAt: null,
  };

  return { state: cursor, value: { fixture, events } };
}

/* ────────────────────────────────────────────────────────────────────────
 * 브래킷 (플레이오프 / 컵)
 * ──────────────────────────────────────────────────────────────────────── */

function floorPow2(n: number): number {
  let p = 1;
  while (p * 2 <= n) {
    p *= 2;
  }
  return p;
}

function roundLabelFor(teamsInRound: number): string {
  return teamsInRound === 2 ? '결승' : `${teamsInRound}강`;
}

function simulateBracket(
  state: PrngState,
  seedTeams: readonly Team[],
  competitionType: 'PLAYOFF' | 'CUP',
  leagueId: LeagueId | null,
  seasonId: SeasonId,
  snapshotId: SnapshotId,
  nextMatchSeed: () => MatchSeed,
): PrngResult<readonly Fixture[]> {
  let cursor = state;
  const fixtures: Fixture[] = [];
  const totalRounds = Math.log2(seedTeams.length);

  let currentTeams = seedTeams;
  let round = 1;

  while (currentTeams.length >= 2) {
    const isFinalRound = currentTeams.length === 2;
    const label = roundLabelFor(currentTeams.length);
    const winners: Team[] = [];

    for (let i = 0; i < currentTeams.length; i += 2) {
      const home = currentTeams[i];
      const away = currentTeams[i + 1];

      const idStep = nextId(cursor);
      cursor = idStep.state;

      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let pkHome: number | null = null;
      let pkAway: number | null = null;
      let status: FixtureStatus = 'SCHEDULED';
      let simulatedAt: string | null = null;
      let attendance: number | null = null;
      let winner = home;

      if (!isFinalRound) {
        const hsStep = nextIntBetween(cursor, 0, 4);
        cursor = hsStep.state;
        const asStep = nextIntBetween(cursor, 0, 4);
        cursor = asStep.state;
        homeScore = hsStep.value;
        awayScore = asStep.value;

        if (homeScore === awayScore) {
          const pkHomeStep = nextIntBetween(cursor, 3, 6);
          cursor = pkHomeStep.state;
          const pkAwayRollStep = nextIntBetween(cursor, 3, 6);
          cursor = pkAwayRollStep.state;
          pkHome = pkHomeStep.value;
          pkAway = pkAwayRollStep.value === pkHome ? pkHome + 1 : pkAwayRollStep.value;
          winner = pkHome > pkAway ? home : away;
        } else {
          winner = homeScore > awayScore ? home : away;
        }

        status = 'FINISHED';
        simulatedAt = MOCK_NOW;
        const attendanceStep = nextIntBetween(
          cursor,
          Math.round(home.stadiumCapacity * 0.4),
          home.stadiumCapacity,
        );
        cursor = attendanceStep.state;
        attendance = attendanceStep.value;
      }

      const kickoffAt = isFinalRound
        ? minutesAfter(MOCK_NOW, 3 * 1440)
        : minutesBefore(MOCK_NOW, (totalRounds - round) * 1440 + 1);

      fixtures.push({
        id: idStep.value as FixtureId,
        seasonId,
        competitionType,
        leagueId,
        round,
        roundLabel: label,
        homeTeamId: home.id,
        awayTeamId: away.id,
        isNeutral: false,
        kickoffAt,
        status,
        homeScore,
        awayScore,
        htHomeScore: null,
        htAwayScore: null,
        etHomeScore: null,
        etAwayScore: null,
        pkHome,
        pkAway,
        attendance,
        matchSeed: nextMatchSeed(),
        snapshotId,
        simulatedAt,
      });

      if (!isFinalRound) {
        winners.push(winner);
      }
    }

    if (isFinalRound) {
      break;
    }
    currentTeams = winners;
    round += 1;
  }

  return { state: cursor, value: fixtures };
}

/* ────────────────────────────────────────────────────────────────────────
 * 진입점
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `worldSeed` + 기존 `MockWorld`로 진행 중인 시즌의 스냅샷(라이브 경기·이벤트 타임라인·
 * 순위표·스탯 리더보드·뉴스 피드·플레이오프/컵 대진표)을 결정론적으로 생성한다.
 * 동일 입력은 항상 바이트 단위로 동일한 결과를 낸다.
 */
export function generateMockProgress(
  worldSeed: WorldSeed,
  world: MockWorld,
  seasonNumber = 1,
): MockProgress {
  installHardcodedFallback();
  const matchPoints = loadConstants('MATCH_POINTS');

  const seasonSeedValue = deriveSeasonSeed(worldSeed, seasonNumber);
  const seasonSeed = seasonSeedValue as SeasonSeed;
  let state = stateForSeed(seasonSeedValue);

  let matchKeyCounter = 0;
  const nextMatchSeed = (): MatchSeed => {
    const key = matchKeyCounter;
    matchKeyCounter += 1;
    return deriveMatchSeed(seasonSeedValue, key) as MatchSeed;
  };

  const seasonIdStep = nextId(state);
  state = seasonIdStep.state;
  const seasonId = seasonIdStep.value as SeasonId;

  const snapshotIdStep = nextId(state);
  state = snapshotIdStep.state;
  const snapshotId = snapshotIdStep.value as SnapshotId;

  const seasonStartedAt = minutesBefore(MOCK_NOW, 10 * 1440);
  const season: Season = {
    id: seasonId,
    seasonNumber,
    seasonSeed,
    phase: 'REGULAR',
    regularStartedAt: seasonStartedAt,
    regularEndsAt: null,
    startedAt: seasonStartedAt,
    endedAt: null,
    snapshotId,
  };

  const teamsByLeague = groupTeamsByLeague(world.leagues, world.teams);
  const teamToLeague = new Map<TeamId, LeagueId>();
  world.leagues.forEach((league, i) => {
    for (const team of teamsByLeague[i]) {
      teamToLeague.set(team.id, league.id);
    }
  });

  const standingsStep = generateStandings(state, world.leagues, teamsByLeague, seasonId, matchPoints);
  state = standingsStep.state;
  const standings = standingsStep.value;

  const teamPlayerIndex = buildTeamPlayerIndex(world);
  const teamById = new Map<TeamId, Team>(world.teams.map((t) => [t.id, t] as const));

  const liveFixtures: Fixture[] = [];
  const matchEvents: MatchEvent[] = [];
  world.leagues.forEach((league, i) => {
    const teams = teamsByLeague[i];
    if (teams.length < 2) {
      return;
    }
    const pairStep = shuffleIndices(state, teams.length);
    state = pairStep.state;
    const home = teams[pairStep.value[0]];
    const away = teams[pairStep.value[1]];

    const liveStep = generateLiveMatch(
      state,
      home,
      away,
      league,
      STANDINGS_ROUND + 1,
      seasonId,
      snapshotId,
      nextMatchSeed(),
      teamPlayerIndex,
    );
    state = liveStep.state;
    liveFixtures.push(liveStep.value.fixture);
    matchEvents.push(...liveStep.value.events);
  });

  const statLeadersStep = generateStatLeaders(state, world, teamToLeague, seasonId);
  state = statLeadersStep.state;

  const newsFeedStep = generateNewsFeed(state, world, seasonId);
  state = newsFeedStep.state;

  const playoffBracket: Fixture[] = [];
  world.leagues.forEach((league) => {
    const seedCount = floorPow2(league.playoffTeamCount);
    if (seedCount < 2) {
      return;
    }
    const seedTeams = standings
      .filter((s) => s.leagueId === league.id)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, seedCount)
      .map((s) => teamById.get(s.teamId))
      .filter((t): t is Team => t !== undefined);
    if (seedTeams.length < 2) {
      return;
    }
    const bracketStep = simulateBracket(
      state,
      seedTeams,
      'PLAYOFF',
      league.id,
      seasonId,
      snapshotId,
      nextMatchSeed,
    );
    state = bracketStep.state;
    playoffBracket.push(...bracketStep.value);
  });

  const cupSeedCount = floorPow2(world.teams.length);
  const cupSeedTeams = [...world.teams].sort((a, b) => b.reputation - a.reputation).slice(0, cupSeedCount);
  const cupBracketStep = simulateBracket(
    state,
    cupSeedTeams,
    'CUP',
    null,
    seasonId,
    snapshotId,
    nextMatchSeed,
  );
  state = cupBracketStep.state;
  const cupBracket = cupBracketStep.value;

  return {
    season,
    liveFixtures,
    matchEvents,
    standings,
    statLeaders: statLeadersStep.value,
    newsFeed: newsFeedStep.value,
    playoffBracket,
    cupBracket,
  };
}
