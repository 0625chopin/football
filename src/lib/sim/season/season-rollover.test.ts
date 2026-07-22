/**
 * 시즌 롤오버 통합 테스트 — Task 028(55일차) "시즌 종료→롤오버 스냅샷 결정론(3시즌) ·
 * 10시즌 구조 불변식 · 20시즌 OVR 연령별 곡선". `docs/team-schedule/02-시뮬레이션엔진팀.md`
 * 55일차 행.
 *
 * ## 이 파일이 실제로 엮는 것 — 새 프로덕션 코드 0줄
 * `growth.ts`(51일차)·`retire.ts`(52일차)·`promotion.ts`(48일차)·`archive.ts`(54일차)·
 * `schedule/berger.ts`(Task 025)는 각자 단위 테스트로만 검증돼 왔고, 시즌 경계를 넘나드는
 * 실제 체인으로 이어붙여진 적이 없었다(46일차 넉아웃 통합 검증과 같은 동기 — 개별 파일
 * 계약이 맞물릴 때만 드러나는 결함은 단위 테스트가 못 잡는다). 이 파일은 그 5개 파일의
 * 프로덕션 함수를 그대로 시즌 경계를 넘어 반복 호출해 이어붙인다. 아래 헬퍼(선수 생성·
 * 롤오버 루프)는 전부 이 테스트 파일 소유의 합성 하네스이며 `season/*.ts` 프로덕션 파일에는
 * 어떤 줄도 추가하지 않는다.
 *
 * ## 순위 프록시 — 왜 실제 매치 엔진을 쓰지 않는가
 * 리그 순위는 "이번 시즌 성장 반영 후 스쿼드 평균 OVR"이라는 결정론적 프록시로 정렬한다.
 * 매치 엔진(`match/**`)과의 통합은 이 테스트의 검증 대상이 아니다 — 여기서 보는 것은
 * "시즌 종료 처리 파이프라인의 자료구조 계약이 여러 시즌에 걸쳐 맞물리는가"뿐이며, 그
 * 질문의 성립 여부는 순위 산출 방식(실경기든 프록시든)과 무관하다.
 *
 * ## 합성 리그 규모 — 왜 24/20/16이 아닌가
 * 팀 수·스쿼드 크기를 축소(6팀×3리그, 팀당 16명)해 20시즌 반복의 계산량을 줄인다.
 * `promotion.ts`는 팀 수를 하드코딩하지 않고 `League.teamCount`/`promotionSlots`/
 * `relegationSlots`만 읽으므로(NFR-CFG-001), 규모를 바꿔도 검증 대상 계약은 동일하다.
 *
 * ## 나이 증분 컨벤션 — 이 파일이 정한 단순화(프로덕션 규약 아님)
 * 시즌 경계에서 "생일이 먼저 지나간다"고 가정한다: `age += 1`을 먼저 적용한 뒤 그 나이로
 * 성장 보정·은퇴 판정을 모두 수행한다. 그 결과 `resolveSeasonRetirements`의
 * `FORCE_AGE`(40) 무조건 분기가 매 시즌 정확히 걸러내어, **롤오버 직후 스냅샷에는 40세
 * 이상이 절대 남지 않는다**(구조 불변식 검증 대상). 실제 오케스트레이션 계층이 나이 증분
 * 시점을 다르게 정할 수 있으나 이는 이 팀 소관 밖(호출자 책임)이므로, 이 파일은 자체
 * 정의한 컨벤션 위에서만 불변식을 검증한다.
 *
 * ## 성능 측정 — NFR-DT-001과 무관
 * `performance.now()`는 벤치 측정 목적일 뿐 시뮬레이션 로직(난수·확률 판정)에는 전혀
 * 쓰이지 않는다(`match/perf-bench.test.ts` 선례와 동일 패턴). `Math.random()`/`Date.now()`
 * 사용 0건. 타입은 `@/types` 배럴로만 import.
 */

import { describe, expect, it } from 'vitest';
import type {
  Contract,
  ContractId,
  League,
  LeagueId,
  PlayerAttributeValues,
  PlayerId,
  Points,
  Position,
  Season,
  SeasonId,
  Standing,
  TeamId,
  TeamSeason,
  World,
  WorldId,
  WorldSeed,
} from '@/types';
import { createState, nextFloat, nextIntBetween, type PrngState } from '../rng/prng';
import { deriveSeasonSeed } from '../rng/derive';
import { stableSortBy } from '../rng/sort';
import { generateBergerDoubleRoundRobin } from '../schedule/berger';
import {
  applySeasonAttributeGrowth,
  resolveAgeBracket,
  type AgeBracket,
  type PlayerAttributeGrowthInput,
} from './growth';
import { resolveSeasonRetirements, type RetirementCandidate } from './retire';
import {
  resolvePromotionExchange,
  type LeagueFinalStandings,
  type PromotionSwap,
} from './promotion';
import { archiveSeason, assertNoWorldReset, computeNextSeasonNumber } from './archive';

// ── 합성 리그 구조 ───────────────────────────────────────────────────────
const TEAM_COUNT_PER_LEAGUE = 6;
const SQUAD_SIZE = 16;
const SLOT_COUNT = 2;
const TOTAL_TEAMS = TEAM_COUNT_PER_LEAGUE * 3;
const TOTAL_PLAYERS = TOTAL_TEAMS * SQUAD_SIZE;

const WORLD_ID = 'world-rollover' as WorldId;
const WORLD_SEED_BASE = 20261005;

const LEAGUE_1 = 'league-1' as LeagueId;
const LEAGUE_2 = 'league-2' as LeagueId;
const LEAGUE_3 = 'league-3' as LeagueId;
const LEAGUE_IDS: readonly LeagueId[] = [LEAGUE_1, LEAGUE_2, LEAGUE_3];

const LEAGUES: ReadonlyMap<LeagueId, League> = new Map([
  [
    LEAGUE_1,
    {
      id: LEAGUE_1,
      name: 'Tier 1',
      tier: 1,
      teamCount: TEAM_COUNT_PER_LEAGUE,
      roundIntervalMin: 90,
      promotionSlots: 0,
      relegationSlots: SLOT_COUNT,
      playoffTeamCount: 2,
    },
  ],
  [
    LEAGUE_2,
    {
      id: LEAGUE_2,
      name: 'Tier 2',
      tier: 2,
      teamCount: TEAM_COUNT_PER_LEAGUE,
      roundIntervalMin: 90,
      promotionSlots: SLOT_COUNT,
      relegationSlots: SLOT_COUNT,
      playoffTeamCount: 2,
    },
  ],
  [
    LEAGUE_3,
    {
      id: LEAGUE_3,
      name: 'Tier 3',
      tier: 3,
      teamCount: TEAM_COUNT_PER_LEAGUE,
      roundIntervalMin: 90,
      promotionSlots: SLOT_COUNT,
      relegationSlots: 0,
      playoffTeamCount: 2,
    },
  ],
]);

const TEAM_IDS: readonly TeamId[] = Array.from(
  { length: TOTAL_TEAMS },
  (_, i) => `team-${i + 1}` as TeamId,
);

function initialLeagueOf(teamIndex: number): LeagueId {
  if (teamIndex < TEAM_COUNT_PER_LEAGUE) return LEAGUE_1;
  if (teamIndex < TEAM_COUNT_PER_LEAGUE * 2) return LEAGUE_2;
  return LEAGUE_3;
}

// ── 34속성 키 — growth.ts가 export하지 않아 재선언(그 파일 자체가 world.ts 대비 취하는
// "재구현, import 아님" 관례와 동일한 이유: 이 테스트의 합성 모집단 생성은 growth.ts의
// 소비자가 아니라 독립된 데이터 생성기다). ──────────────────────────────────
const OUTFIELD_OVR_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'finishing', 'passing', 'crossing', 'dribbling', 'firstTouch', 'tackling',
  'marking', 'heading', 'longShots', 'setPieces',
  'composure', 'decisions', 'vision', 'positioning', 'workRate', 'aggression',
  'leadership', 'teamwork', 'anticipation', 'determination',
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'balance',
  'jumping', 'naturalFitness',
];
const GK_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'kicking', 'commandOfArea',
];

/** 전원 outfield 포지션(`CM`)으로 고정하므로 `growth.ts`의 `ovrRelevantKeys('CM')`과 동일 키. */
function computeOutfieldOvr(attrs: PlayerAttributeValues): number {
  const sum = OUTFIELD_OVR_KEYS.reduce((acc, key) => acc + attrs[key], 0);
  return Math.round(sum / OUTFIELD_OVR_KEYS.length);
}

// ── 합성 선수 ──────────────────────────────────────────────────────────────
interface PlayerCore {
  readonly id: PlayerId;
  readonly age: number;
  readonly pa: number;
  readonly preferredPosition: Position;
}

interface PlayerRecord {
  readonly player: PlayerCore;
  readonly attributes: PlayerAttributeValues;
  /** 마지막으로 적용된 성장의 `ovrCached` (없으면 생성 시점 OVR). */
  readonly ovr: number;
}

function generateAttributes(state: PrngState): { state: PrngState; value: PlayerAttributeValues } {
  let cursor = state;
  const attrs: Record<string, number> = {};
  for (const key of OUTFIELD_OVR_KEYS) {
    const draw = nextIntBetween(cursor, 8, 16);
    cursor = draw.state;
    attrs[key] = draw.value;
  }
  for (const key of GK_KEYS) {
    // GK 6속성은 전원 outfield 포지션이라 OVR 산출에 관여하지 않는다 — 고정값으로 채워
    // `PlayerAttributeValues`(34필드 전량) 형태만 완성한다.
    attrs[key] = 5;
  }
  return { state: cursor, value: attrs as unknown as PlayerAttributeValues };
}

function createPlayer(
  state: PrngState,
  seq: number,
  age: number,
): { state: PrngState; value: PlayerRecord } {
  const attrsStep = generateAttributes(state);
  const ovr = computeOutfieldOvr(attrsStep.value);
  // PA는 진입 OVR 이상이어야 하는 `growth.ts` 전제(파일 헤더 "PA 초과 금지" 절)를 충족하도록
  // ovr 기준 0~14 여유를 더한다(30 상한 클램프).
  const headroomStep = nextIntBetween(attrsStep.state, 0, 14);
  const pa = Math.min(30, ovr + headroomStep.value);
  return {
    state: headroomStep.state,
    value: {
      player: { id: `player-${seq}` as PlayerId, age, pa, preferredPosition: 'CM' },
      attributes: attrsStep.value,
      ovr,
    },
  };
}

// ── 월드 상태 ────────────────────────────────────────────────────────────
interface WorldState {
  readonly players: ReadonlyMap<PlayerId, PlayerRecord>;
  readonly contracts: ReadonlyMap<PlayerId, Contract>;
  readonly teamLeague: ReadonlyMap<TeamId, LeagueId>;
  readonly nextPlayerSeq: number;
  readonly nextContractSeq: number;
}

function buildInitialWorld(seed: number): { worldState: WorldState; prngState: PrngState } {
  let cursor = createState(seed);
  const players = new Map<PlayerId, PlayerRecord>();
  const contracts = new Map<PlayerId, Contract>();
  const teamLeague = new Map<TeamId, LeagueId>();

  let seq = 0;
  let contractSeq = 0;

  TEAM_IDS.forEach((teamId, teamIndex) => {
    teamLeague.set(teamId, initialLeagueOf(teamIndex));
    for (let i = 0; i < SQUAD_SIZE; i += 1) {
      const ageStep = nextIntBetween(cursor, 18, 33);
      cursor = ageStep.state;
      const playerStep = createPlayer(cursor, seq, ageStep.value);
      cursor = playerStep.state;
      seq += 1;

      players.set(playerStep.value.player.id, playerStep.value);
      const contractId = `contract-${contractSeq}` as ContractId;
      contractSeq += 1;
      contracts.set(playerStep.value.player.id, {
        id: contractId,
        playerId: playerStep.value.player.id,
        teamId,
        startSeason: 0,
        endSeason: 999,
        wagePerSeason: 100 as Points,
        transferFeePaid: 0 as Points,
        status: 'ACTIVE',
      });
    }
  });

  return {
    worldState: { players, contracts, teamLeague, nextPlayerSeq: seq, nextContractSeq: contractSeq },
    prngState: cursor,
  };
}

function rosterByTeam(worldState: WorldState): Map<TeamId, PlayerId[]> {
  const map = new Map<TeamId, PlayerId[]>();
  for (const [playerId, contract] of worldState.contracts) {
    const arr = map.get(contract.teamId) ?? [];
    arr.push(playerId);
    map.set(contract.teamId, arr);
  }
  return map;
}

function teamsOfLeague(worldState: WorldState, leagueId: LeagueId): TeamId[] {
  return TEAM_IDS.filter((teamId) => worldState.teamLeague.get(teamId) === leagueId);
}

interface SeasonRolloverResult {
  readonly worldState: WorldState;
  readonly prngState: PrngState;
  readonly season: Season;
  readonly teamSeasons: readonly TeamSeason[];
  readonly swaps: readonly PromotionSwap[];
  readonly fixtureCountByLeague: ReadonlyMap<LeagueId, number>;
  readonly retiredCount: number;
}

/**
 * 시즌 1개 전체 종료→롤오버 처리 — `growth`→`retire`→(리그별 일정·순위 프록시)→`promotion`→
 * `archive` 순서로 프로덕션 함수를 그대로 이어붙인다.
 */
function runSeasonRollover(
  worldState: WorldState,
  prngState: PrngState,
  seasonNumber: number,
  worldSeed: number,
): SeasonRolloverResult {
  const seasonId = `season-${seasonNumber}` as SeasonId;
  const playerIdsSorted = [...worldState.players.keys()].sort();

  // ① 성장 — 나이는 이번 시즌분(+1) 기준(파일 헤더 "나이 증분" 절)
  const growthInputs: PlayerAttributeGrowthInput[] = playerIdsSorted.map((id) => {
    const rec = worldState.players.get(id)!;
    return { player: { ...rec.player, age: rec.player.age + 1 }, attributes: rec.attributes };
  });
  const growthStep = applySeasonAttributeGrowth(prngState, growthInputs);
  let cursor = growthStep.state;
  const growthByPlayer = new Map(growthStep.value.map((o) => [o.playerId, o]));

  // ② 은퇴 판정
  const retirementCandidates: RetirementCandidate[] = playerIdsSorted.map((id) => {
    const rec = worldState.players.get(id)!;
    const outcome = growthByPlayer.get(id)!;
    const ratioStep = nextFloat(cursor);
    cursor = ratioStep.state;
    return {
      player: { id, age: rec.player.age + 1 },
      ovrDelta: outcome.ovrCached - rec.ovr,
      playingTimeRatio: ratioStep.value,
    };
  });
  const retireStep = resolveSeasonRetirements(cursor, retirementCandidates);
  cursor = retireStep.state;
  const retiringIds = new Set(retireStep.value.filter((d) => d.willRetire).map((d) => d.playerId));

  // ③ 스쿼드 롤오버 — 은퇴자는 팀별로 1:1 신인(18세)으로 교체(선수 수 불변)
  const rosters = rosterByTeam(worldState);
  const nextPlayers = new Map<PlayerId, PlayerRecord>();
  const nextContracts = new Map<PlayerId, Contract>();
  let nextPlayerSeq = worldState.nextPlayerSeq;
  let nextContractSeq = worldState.nextContractSeq;
  const teamAvgOvr = new Map<TeamId, number>();

  for (const [teamId, roster] of rosters) {
    let sumOvr = 0;
    for (const playerId of roster) {
      if (retiringIds.has(playerId)) {
        const gen = createPlayer(cursor, nextPlayerSeq, 18);
        cursor = gen.state;
        nextPlayerSeq += 1;
        nextPlayers.set(gen.value.player.id, gen.value);
        sumOvr += gen.value.ovr;

        const contractId = `contract-${nextContractSeq}` as ContractId;
        nextContractSeq += 1;
        nextContracts.set(gen.value.player.id, {
          id: contractId,
          playerId: gen.value.player.id,
          teamId,
          startSeason: seasonNumber,
          endSeason: seasonNumber + 3,
          wagePerSeason: 100 as Points,
          transferFeePaid: 0 as Points,
          status: 'ACTIVE',
        });
      } else {
        const rec = worldState.players.get(playerId)!;
        const outcome = growthByPlayer.get(playerId)!;
        const nextPlayer: PlayerCore = { ...rec.player, age: rec.player.age + 1 };
        nextPlayers.set(playerId, {
          player: nextPlayer,
          attributes: outcome.attributes,
          ovr: outcome.ovrCached,
        });
        sumOvr += outcome.ovrCached;
        nextContracts.set(playerId, worldState.contracts.get(playerId)!);
      }
    }
    teamAvgOvr.set(teamId, sumOvr / roster.length);
  }

  // ④ 리그별 일정(경기 수 불변식) + 순위 프록시(성장 반영 후 스쿼드 평균 OVR)
  const fixtureCountByLeague = new Map<LeagueId, number>();
  const standingsByLeague = new Map<LeagueId, LeagueFinalStandings>();

  for (const leagueId of LEAGUE_IDS) {
    const teams = teamsOfLeague(worldState, leagueId);
    const fixtures = generateBergerDoubleRoundRobin(teams);
    fixtureCountByLeague.set(leagueId, fixtures.length);

    const ranked = stableSortBy(
      teams.map((teamId) => ({ teamId, avgOvr: teamAvgOvr.get(teamId)! })),
      [
        { get: (t) => t.avgOvr, dir: 'desc' },
        { get: (t) => t.teamId, dir: 'asc' },
      ],
    );

    const standings: Standing[] = ranked.map((t, index) => ({
      seasonId,
      leagueId,
      round: teams.length * 2 - 2,
      teamId: t.teamId,
      rank: index + 1,
      played: teams.length * 2 - 2,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
      form: '',
      fairPlayScore: 100,
      tiebreakApplied: null,
    }));

    standingsByLeague.set(leagueId, { league: LEAGUES.get(leagueId)!, standings });
  }

  // ⑤ 승강 교환(경계마다 프로덕션 `resolvePromotionExchange` 그대로 호출)
  const swaps = [
    ...resolvePromotionExchange(standingsByLeague.get(LEAGUE_1)!, standingsByLeague.get(LEAGUE_2)!),
    ...resolvePromotionExchange(standingsByLeague.get(LEAGUE_2)!, standingsByLeague.get(LEAGUE_3)!),
  ];

  const nextTeamLeague = new Map(worldState.teamLeague);
  swaps.forEach((swap) => nextTeamLeague.set(swap.teamId, swap.toLeagueId));

  // ⑥ 시즌 아카이브(프로덕션 `archiveSeason` 그대로 호출 — 예외 없이 봉인되면 통과)
  const season: Season = {
    id: seasonId,
    seasonNumber,
    seasonSeed: deriveSeasonSeed(worldSeed, seasonNumber) as Season['seasonSeed'],
    phase: 'SETTLEMENT',
    regularStartedAt: `s${seasonNumber}-start`,
    regularEndsAt: `s${seasonNumber}-reg-end`,
    startedAt: `s${seasonNumber}-start`,
    endedAt: `s${seasonNumber}-end`,
    snapshotId: null,
  };

  const teamSeasons: TeamSeason[] = [];
  for (const [leagueId, entry] of standingsByLeague) {
    for (const standing of entry.standings) {
      const swap = swaps.find((s) => s.teamId === standing.teamId);
      teamSeasons.push({
        teamId: standing.teamId,
        seasonId,
        leagueId,
        finalRank: standing.rank,
        promoted: swap?.direction === 'PROMOTED',
        relegated: swap?.direction === 'RELEGATED',
        tiebreakApplied: null,
      });
    }
  }

  archiveSeason(season, teamSeasons); // 예외를 던지지 않으면 "봉인 가능 상태" 검증 통과

  return {
    worldState: {
      players: nextPlayers,
      contracts: nextContracts,
      teamLeague: nextTeamLeague,
      nextPlayerSeq,
      nextContractSeq,
    },
    prngState: cursor,
    season,
    teamSeasons,
    swaps,
    fixtureCountByLeague,
    retiredCount: retiringIds.size,
  };
}

function snapshotOf(ws: WorldState) {
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {
    players: [...ws.players.values()]
      .map((r) => ({ id: r.player.id, age: r.player.age, pa: r.player.pa, ovr: r.ovr, attributes: r.attributes }))
      .sort(byId),
    contracts: [...ws.contracts.values()].sort(byId),
    teamLeague: [...ws.teamLeague.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  };
}

describe('시즌 롤오버 결정론 — Task 028 55일차 (3시즌 연속)', () => {
  it('같은 월드 시드에서 3시즌 연속 처리한 스냅샷이 두 번의 독립 실행에서 완전히 일치한다', () => {
    const seed = WORLD_SEED_BASE;

    function runThreeSeasons() {
      let { worldState, prngState } = buildInitialWorld(seed);
      const snapshots: unknown[] = [];
      for (let n = 1; n <= 3; n += 1) {
        const result = runSeasonRollover(worldState, prngState, n, seed);
        worldState = result.worldState;
        prngState = result.prngState;
        snapshots.push({
          season: result.season,
          teamSeasons: result.teamSeasons,
          swaps: result.swaps,
          fixtureCountByLeague: [...result.fixtureCountByLeague.entries()],
          world: snapshotOf(worldState),
        });
      }
      return snapshots;
    }

    const runA = runThreeSeasons();
    const runB = runThreeSeasons();

    expect(runA).toEqual(runB);
  });
});

describe('구조 불변식 — Task 028 55일차 (10시즌 연속)', () => {
  it(
    '팀 수·리그별 경기 수·선수 수·활성 계약 정합성이 10시즌 내내 유지되고 시즌당 처리는 20초 이내다',
    () => {
      const seed = WORLD_SEED_BASE + 1;
      let { worldState, prngState } = buildInitialWorld(seed);
      const archivedSeasonNumbers: number[] = [];
      let prevWorldPick: Pick<World, 'id' | 'worldSeed' | 'currentSeasonNumber'> = {
        id: WORLD_ID,
        worldSeed: seed as WorldSeed,
        currentSeasonNumber: 0,
      };

      for (let n = 1; n <= 10; n += 1) {
        const t0 = performance.now();
        const result = runSeasonRollover(worldState, prngState, n, seed);
        const elapsedMs = performance.now() - t0;
        // 수락 기준: 시즌 종료 처리 ≤ 20초
        expect(elapsedMs).toBeLessThan(20_000);

        // 팀 수 불변 — 리그별 정원, 총원
        LEAGUE_IDS.forEach((leagueId) => {
          const count = [...result.worldState.teamLeague.values()].filter((l) => l === leagueId).length;
          expect(count).toBe(TEAM_COUNT_PER_LEAGUE);
        });
        expect(result.worldState.teamLeague.size).toBe(TOTAL_TEAMS);

        // 경기 수 불변 — 더블 라운드로빈: teamCount × (teamCount − 1)
        result.fixtureCountByLeague.forEach((count) => {
          expect(count).toBe(TEAM_COUNT_PER_LEAGUE * (TEAM_COUNT_PER_LEAGUE - 1));
        });

        // 선수 수 불변
        expect(result.worldState.players.size).toBe(TOTAL_PLAYERS);

        // 계약 정합성 — 활성 계약 수 == 선수 수, 1:1 매칭, 팀별 정원 SQUAD_SIZE
        expect(result.worldState.contracts.size).toBe(TOTAL_PLAYERS);
        const contractPlayerIds = new Set(result.worldState.contracts.keys());
        for (const playerId of result.worldState.players.keys()) {
          expect(contractPlayerIds.has(playerId)).toBe(true);
        }
        expect(
          [...result.worldState.contracts.values()].every((c) => c.status === 'ACTIVE'),
        ).toBe(true);
        const squadSizePerTeam = new Map<TeamId, number>();
        for (const contract of result.worldState.contracts.values()) {
          squadSizePerTeam.set(contract.teamId, (squadSizePerTeam.get(contract.teamId) ?? 0) + 1);
        }
        TEAM_IDS.forEach((teamId) => expect(squadSizePerTeam.get(teamId)).toBe(SQUAD_SIZE));

        // 40세 이상 0명 — "나이 증분" 컨벤션 + FORCE_AGE 무조건 분기의 결과(파일 헤더 참조)
        for (const rec of result.worldState.players.values()) {
          expect(rec.player.age).toBeLessThan(40);
        }

        // 승강 슬롯 정합 — 경계 2개 × (강등 + 승격) = SLOT_COUNT × 2 × 2
        expect(result.swaps.length).toBe(SLOT_COUNT * 2 * 2);

        // I-13 월드 리셋 금지 — 시즌 전이 검증(프로덕션 `assertNoWorldReset` 그대로 호출)
        const nextWorldPick = { id: WORLD_ID, worldSeed: seed as WorldSeed, currentSeasonNumber: n };
        expect(() => assertNoWorldReset(prevWorldPick, nextWorldPick)).not.toThrow();
        prevWorldPick = nextWorldPick;

        archivedSeasonNumbers.push(n);
        expect(computeNextSeasonNumber(archivedSeasonNumbers)).toBe(n + 1);

        worldState = result.worldState;
        prngState = result.prngState;
      }
    },
    30_000,
  );
});

describe('20시즌 OVR 연령별 곡선 — Task 028 55일차', () => {
  it(
    '22~29세(PRIME)가 피크인 종형 곡선을 형성한다',
    () => {
      const seed = WORLD_SEED_BASE + 2;
      let { worldState, prngState } = buildInitialWorld(seed);

      for (let n = 1; n <= 20; n += 1) {
        const result = runSeasonRollover(worldState, prngState, n, seed);
        worldState = result.worldState;
        prngState = result.prngState;
      }

      const sums: Record<AgeBracket, number> = { YOUTH: 0, PRIME: 0, DECLINE: 0, VETERAN: 0 };
      const counts: Record<AgeBracket, number> = { YOUTH: 0, PRIME: 0, DECLINE: 0, VETERAN: 0 };
      for (const rec of worldState.players.values()) {
        const bracket = resolveAgeBracket(rec.player.age);
        sums[bracket] += rec.ovr;
        counts[bracket] += 1;
      }

      // 각 구간 표본이 충분해야 평균이 잡음에 휘둘리지 않는다(모집단 TOTAL_PLAYERS명)
      (Object.keys(counts) as AgeBracket[]).forEach((bracket) => {
        expect(counts[bracket]).toBeGreaterThan(5);
      });

      const avg: Record<AgeBracket, number> = {
        YOUTH: sums.YOUTH / counts.YOUTH,
        PRIME: sums.PRIME / counts.PRIME,
        DECLINE: sums.DECLINE / counts.DECLINE,
        VETERAN: sums.VETERAN / counts.VETERAN,
      };

      // 종형: PRIME이 4구간 중 최댓값이고, 성장기(YOUTH) < PRIME, 하락 방향으로도 감소
      expect(avg.PRIME).toBeGreaterThan(avg.YOUTH);
      expect(avg.PRIME).toBeGreaterThan(avg.DECLINE);
      expect(avg.DECLINE).toBeGreaterThan(avg.VETERAN);
      expect(avg.PRIME).toBe(Math.max(avg.YOUTH, avg.PRIME, avg.DECLINE, avg.VETERAN));
    },
    30_000,
  );
});
