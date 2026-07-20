/**
 * Mock 월드 팩토리 — **15일차(2026-08-10), Task 007 계속분**
 *
 * 근거: `ROADMAP.md` Task 007 / `docs/team-schedule/03-데이터밸런싱배당팀.md` 15일차
 * ("3리그 60팀 / 팀당 22~30명 ≈ 1,560명 / 감독 60명 / 스폰서 풀 ≥ 40", 수락 "스쿼드
 * 불변식 22~30명, GK≥2, CB≥3") / D-16(전부 시드 기반 절차적 생성, 실명 데이터 금지) /
 * D-17(국적 기반 이름 생성기 재사용). 소유: 3팀 데이터·밸런싱·배당팀
 * (CLAUDE.md `src/lib/mock/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: `World`(1) · `League`(3) · `Team`(60) · `Manager`(60) · `Player`/
 *   `PlayerAttribute`/`PlayerPosition`/`PlayerState`(팀당 22~30명) · `Sponsor`(≥40)
 *   초기 세계 상태를 시드 하나로 결정론적 생성.
 * - **담지 않는 것**: 진행 상태(라이브 경기·순위·뉴스 — 16일차 `progress.ts`), 4상태
 *   시나리오 픽스처(17일차 `fixtures/`), `DataSource` 어댑터 구현(18일차
 *   `data/mock/MockDataSource.ts`). `Fixture`/`Season`/`TeamSeason`/`Contract` 등은
 *   이후 일차 산출물이 소비하는 시점에 별도로 만든다 — 오늘은 "세계의 최초 1행"만 만든다.
 *
 * ## 순수 함수 계약 (NFR-DT-001과 동일 관례, 이 파일은 `src/lib/sim/**` 밖이지만
 * Mock도 재현 가능해야 한다는 팀장 지시를 그대로 따른다)
 * `Math.random()`/`Date.now()`를 쓰지 않는다. 난수는 전부 2팀 `src/lib/sim/rng/prng.ts`를
 * 경유하고, 이름은 `src/lib/naming/generate.ts`, 엠블럼은 `src/lib/naming/emblem.ts`를
 * 재사용한다(단일 소유 로직 재구현 금지). `World.worldSeed`를 `createState()`에 직접
 * 먹여 이 팩토리 전용 스트림 하나로 전 엔티티를 순차 생성한다 — 시즌/경기 시뮬레이션
 * 시드 계층(`derive.ts`)과는 무관한, 월드 최초 구성 전용 스트림이다.
 *
 * ## 공통코드 의존
 * 스쿼드 규모(`SQUAD_PARAM`)·리그 팀 수(`LEAGUE_TEAM_COUNT`)·라운드 간격
 * (`ROUND_INTERVAL_MIN`)·승강 슬롯(`PROMOTION_RELEGATION_SLOTS`)은 `loadConstants(group)`로
 * 조회한다(엔진이 숫자 리터럴 대신 로더를 거친다는 프로젝트 원칙, `loader.ts` 헤더 참조).
 * 아직 아무도 전역 기본값 소스를 등록하지 않았을 수 있으므로(테스트·독립 실행), 이 파일이
 * 방어적으로 `installHardcodedFallback()`을 호출한다 — 이미 실 DB 소스가 등록돼 있어도
 * 폴백 소스(2순위)만 채우므로 우선순위를 침범하지 않는다.
 *
 * ## OVR 관련 노트 (day19 Vitest 수락 기준 "상위 리그일수록 평균 OVR 유의하게 높음" 대비)
 * `PlayerAttribute.ovrCached`는 리그 티어별 품질 중심값(`TIER_QUALITY_CENTER`)에서 파생된다.
 * 몸값(`marketValue`)은 이 파일 전용 단순 placeholder 공식이며, 실제 몸값 공식(Task 021,
 * 21일차 `src/lib/economy/valuation.ts`)을 대체하지 않는다 — 초기 Mock 값이 필요할 뿐이다.
 */

import { installHardcodedFallback } from '@/lib/config/fallback';
import { loadConstants } from '@/lib/config/loader';
import { generateTeamEmblem } from '@/lib/naming/emblem';
import { generatePlayerName } from '@/lib/naming/generate';
import { SUPPORTED_NATIONALITY_CODES } from '@/lib/naming/namePools';
import { createState, nextIntBelow, nextIntBetween } from '@/lib/sim/rng/prng';
import type { PrngResult, PrngState } from '@/lib/sim/rng/prng';
import type {
  Formation,
  League,
  LeagueId,
  Manager,
  ManagerId,
  ManagerStyle,
  Player,
  PlayerAttribute,
  PlayerAttributeValues,
  PlayerId,
  PlayerPosition,
  PlayerState,
  Points,
  Position,
  PreferredFoot,
  Seed,
  Sponsor,
  SponsorId,
  TasteTag,
  Team,
  TeamId,
  Timestamp,
  World,
  WorldId,
  WorldSeed,
} from '@/types';

/* ────────────────────────────────────────────────────────────────────────
 * 산출물 타입
 * ──────────────────────────────────────────────────────────────────────── */

/** Mock 월드 팩토리의 산출물 — 초기 세계 최초 1행 전체 엔티티 묶음. */
export interface MockWorld {
  readonly world: World;
  readonly leagues: readonly League[];
  readonly teams: readonly Team[];
  readonly managers: readonly Manager[];
  readonly players: readonly Player[];
  readonly playerAttributes: readonly PlayerAttribute[];
  readonly playerPositions: readonly PlayerPosition[];
  readonly playerStates: readonly PlayerState[];
  readonly sponsors: readonly Sponsor[];
}

/* ────────────────────────────────────────────────────────────────────────
 * 정적 Mock 데이터 풀 — 전부 절차적 생성용 컴포넌트일 뿐 실존 개체를 지칭하지 않는다(D-16)
 * ──────────────────────────────────────────────────────────────────────── */

const POSITIONS: readonly Position[] = [
  'GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST', 'SS',
];

const PREFERRED_FOOT_POOL: readonly PreferredFoot[] = [
  'RIGHT', 'RIGHT', 'RIGHT', 'LEFT', 'LEFT', 'BOTH',
];

const MANAGER_STYLES: readonly ManagerStyle[] = [
  'ATTACKING', 'BALANCED', 'DEFENSIVE', 'COUNTER', 'POSSESSION', 'HIGH_PRESS',
];

/** 포메이션 7종 — `enums.ts` 주석("포메이션 7종")과 개수만 일치, 값 목록 자체는 미확정 */
const FORMATIONS: readonly Formation[] = [
  '4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-3-2', '4-1-4-1', '3-4-3',
];

/** 성향 태그 — `TasteTag`는 아직 값 목록이 확정되지 않은 `string`이라(enums.ts) Mock 전용 풀 */
const TASTE_TAGS: readonly TasteTag[] = [
  'AMBITIOUS', 'LOYAL', 'MERCENARY', 'HOMEGROWN', 'MEDIA_DARLING',
  'QUIET_PROFESSIONAL', 'HOT_HEADED', 'MENTOR', 'MAVERICK', 'FAN_FAVORITE',
];

const CITY_NAME_POOL: readonly string[] = [
  'Brackwell', 'Duskmoor', 'Ashvale', 'Ironbridge', 'Redwater', 'Stonefield',
  'Wrenford', 'Hallowmere', 'Larkspire', 'Thistledown', 'Graywick', 'Sablewood',
  'Moorhaven', 'Cinderfell', 'Brightholt', 'Emberdale', 'Fenwick', 'Greymoor',
  'Hartwell', 'Kestrelbay', 'Lonebridge', 'Marrowgate', 'Nightshire', 'Oakendell',
  'Palewick', 'Quillford', 'Ravensmere', 'Silverkeep', 'Thornbury', 'Umberfall',
  'Vesperfield', 'Wyndmoor', 'Ashbourne', 'Brightfen', 'Coalhaven', 'Driftwood',
  'Everfrost', 'Foxglenn', 'Glasswick', 'Hollowmere', 'Ivywick', 'Juniperdale',
  'Kelsmoor', 'Lindenport', 'Mistgate', 'Norwick', 'Oldferry', 'Pinehollow',
  'Rookwood', 'Saltmere', 'Timberfall', 'Underhall', 'Vale End', 'Westgarth',
  'Yewbridge', 'Ashenford', 'Bellhaven', 'Cragmoor', 'Dunmere', 'Elmswick',
];

const TEAM_NAME_SUFFIXES: readonly string[] = [
  'United', 'City', 'Athletic', 'Rovers', 'Wanderers', 'Town', 'Rangers', 'County',
];

const SPONSOR_NAME_PREFIXES: readonly string[] = [
  'Vertex', 'Nimbus', 'Solace', 'Cobalt', 'Halcyon', 'Pinnacle', 'Zenith', 'Quantum',
  'Meridian', 'Lucent', 'Apex', 'Vantage', 'Cascade', 'Orbital', 'Sterling', 'Beacon',
  'Catalyst', 'Horizon', 'Ember', 'Granite', 'Ironclad', 'Lumen', 'Nova', 'Onyx',
  'Prism', 'Radiant', 'Summit', 'Torrent', 'Vivid', 'Wraith',
];

const SPONSOR_NAME_SUFFIXES: readonly string[] = [
  'Corp', 'Holdings', 'Group', 'Industries', 'Dynamics', 'Systems', 'Networks',
  'Global', 'Partners', 'Labs',
];

const SPONSOR_INDUSTRIES: readonly string[] = [
  'Technology', 'Finance', 'Automotive', 'Beverage', 'Airline', 'Retail', 'Energy',
  'Telecom', 'Insurance', 'Sportswear', 'Logistics', 'Media', 'Hospitality',
  'Construction', 'Pharma',
];

/** 리그 티어별 능력치 품질 중심값(1~30 스케일). 티어가 높을수록 평균 OVR이 유의하게 높아진다. */
const TIER_QUALITY_CENTER: Readonly<Record<number, number>> = { 1: 20, 2: 15, 3: 11 };
/** 팀 간 품질 편차(품질 중심값 ± 이 폭). */
const TEAM_QUALITY_JITTER = 3;
/** 개별 속성 굴림 폭(품질 중심값 ± 이 폭). */
const ATTR_JITTER = 4;
/** 자연스러운(비선호) 속성군의 오프셋 — 필드player의 GK 6속성, GK의 필드 28속성이 대상. */
const WEAK_ATTR_OFFSET = 9;

/** 티어별 리그 표시명 — 실존 리그명을 모사하지 않는 가상 명칭(D-16). */
const LEAGUE_NAMES: Readonly<Record<number, string>> = {
  1: 'Ascension League',
  2: 'Horizon League',
  3: 'Foundation League',
};

/** 티어별 플레이오프 참가 팀 수 — `world.ts` `League` 필드 주석("10 / 4 / 2") 그대로 */
const PLAYOFF_TEAM_COUNT: Readonly<Record<number, number>> = { 1: 10, 2: 4, 3: 2 };

/**
 * Mock 산출물 전역 공유 "현재 시각" 앵커 — **19일차 I-114 해소**. `progress.ts`의
 * `MOCK_NOW`, `data/mock/MockDataSource.ts`의 설정 타임스탬프가 전부 이 값 하나에서
 * 파생된다. 이전에는 이 파일(15일차, 08-10)·`progress.ts`(16일차, 08-11)·
 * `MockDataSource.ts`(18일차, 08-13)가 각자 작성한 날짜를 그대로 하드코딩해 최대 3일까지
 * 기준 시각이 벌어져 있었다(I-114) — 이후 새 Mock 산출물이 "현재 시각"이 필요하면
 * 이 상수를 재노출/재사용하고 별도 리터럴을 새로 만들지 않는다.
 */
export const MOCK_EPOCH_NOW: Timestamp = '2026-08-11T15:00:00.000Z';

/**
 * 이름 없는 새 월드가 생성된 시각(고정값) — `MOCK_EPOCH_NOW`보다 40일 앞선 시점으로 둔다.
 * `progress.ts`가 이 값에서 파생하는 시즌 시작 시각(`MOCK_EPOCH_NOW` - 10일)보다도
 * 앞서야, "월드가 자신의 진행 중 시즌보다 나중에 생성됐다"는 시간 역전이 생기지 않는다
 * (I-114, 결정론을 위해 `Date.now()`를 쓰지 않고 고정 오프셋으로 계산한다).
 */
const WORLD_CREATED_AT: Timestamp = daysBeforeEpoch(40);

/** `MOCK_EPOCH_NOW`에서 `days`일 전 시각을 계산한다 — `progress.ts`의 `minutesBefore`와 동일 관례. */
function daysBeforeEpoch(days: number): Timestamp {
  return new Date(new Date(MOCK_EPOCH_NOW).getTime() - days * 86_400_000).toISOString() as Timestamp;
}

const OUTFIELD_ATTR_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'finishing', 'passing', 'crossing', 'dribbling', 'firstTouch', 'tackling',
  'marking', 'heading', 'longShots', 'setPieces',
  'composure', 'decisions', 'vision', 'positioning', 'workRate', 'aggression',
  'leadership', 'teamwork', 'anticipation', 'determination',
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'balance',
  'jumping', 'naturalFitness',
];

const GK_ATTR_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'kicking', 'commandOfArea',
];

/** 같은 라인 안에서 소화 가능한 인접 포지션 — `PlayerPosition` 부포지션 부여에 사용 */
const POSITION_ADJACENCY: Readonly<Record<Position, readonly Position[]>> = {
  GK: [],
  CB: ['LB', 'RB'],
  LB: ['CB', 'LW'],
  RB: ['CB', 'RW'],
  DM: ['CM'],
  CM: ['DM', 'AM'],
  AM: ['CM', 'LW', 'RW'],
  LW: ['LB', 'AM', 'ST'],
  RW: ['RB', 'AM', 'ST'],
  ST: ['SS', 'LW', 'RW'],
  SS: ['AM', 'ST'],
};

/** GK/CB를 제외한 포지션의 최소 인원(고정값 — `SQUAD_PARAM`이 다루는 축은 GK/CB뿐이다). */
const BASE_NON_GOALKEEPING_COUNTS: Readonly<Record<Exclude<Position, 'GK' | 'CB'>, number>> = {
  LB: 1, RB: 1, DM: 1, CM: 2, AM: 1, LW: 1, RW: 1, ST: 2, SS: 1,
};

/**
 * 스쿼드 배정 기본값(각 포지션 최소 인원) — `squadParam.GK_MIN`/`CB_MIN`을 그대로 반영해
 * 리터럴 하드코딩 대신 `loadConstants('SQUAD_PARAM')`을 경유한다(프로젝트 원칙, `loader.ts`
 * 헤더 "엔진이 숫자 리터럴 대신 로더를 통해 값을 얻는 경로가 타입으로 강제된다" 참조).
 */
function buildBasePositionCounts(squadParam: SquadParamConstants): Record<Position, number> {
  return {
    GK: squadParam.GK_MIN,
    CB: squadParam.CB_MIN,
    ...BASE_NON_GOALKEEPING_COUNTS,
  };
}

/** 스쿼드 잔여 인원을 채울 때 뽑는 가중 풀 — 실전 스쿼드 뎁스 비중을 대략 반영 */
const EXTRA_SLOT_POOL: readonly Position[] = [
  'CM', 'CM', 'CM', 'CB', 'CB', 'ST', 'ST', 'DM', 'AM', 'LW', 'RW', 'LB', 'RB', 'SS', 'GK',
];

/** 팀당 허용하는 추가(기본 2명 초과) 골키퍼 수 상한 — 스쿼드가 GK 과다로 쏠리지 않게 함 */
const EXTRA_GK_CAP = 1;

/* ────────────────────────────────────────────────────────────────────────
 * 범용 헬퍼
 * ──────────────────────────────────────────────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: PlayerAttributeValues, keys: readonly (keyof PlayerAttributeValues)[]): number {
  const sum = keys.reduce((acc, key) => acc + values[key], 0);
  return sum / keys.length;
}

function pick<T>(state: PrngState, pool: readonly T[]): PrngResult<T> {
  const step = nextIntBelow(state, pool.length);
  return { state: step.state, value: pool[step.value] };
}

/**
 * 128비트(4×32비트) 난수를 UUID v4 형태(`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`)
 * 문자열로 접는다. `brand.ts`가 "실제 UUID/시드 값을 만드는 단일 지점"으로 지목한
 * Mock 팩토리가 이 조립을 담당한다 — `crypto.randomUUID()`는 결정론이 깨져 쓰지 않는다.
 */
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

/** Fisher-Yates — `[1, upTo]` 정수를 결정론적으로 뒤섞는다(등번호 무중복 배정용). */
function shuffledRange(state: PrngState, upTo: number): PrngResult<readonly number[]> {
  const arr = Array.from({ length: upTo }, (_, i) => i + 1);
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

/** 중복 없는 이름을 뽑을 때까지 재시도한다(블랙리스트 회피 관례, `naming/generate.ts`와 동일 패턴). */
const MAX_UNIQUE_RETRY = 200;

/* ────────────────────────────────────────────────────────────────────────
 * 리그 / 팀
 * ──────────────────────────────────────────────────────────────────────── */

interface LeagueTeamCountConstants {
  readonly LEAGUE_1: number;
  readonly LEAGUE_2: number;
  readonly LEAGUE_3: number;
}

function generateLeagues(
  state: PrngState,
): PrngResult<readonly League[]> {
  const teamCount = loadConstants('LEAGUE_TEAM_COUNT') as unknown as LeagueTeamCountConstants;
  const roundInterval = loadConstants('ROUND_INTERVAL_MIN') as unknown as LeagueTeamCountConstants;
  const slots = loadConstants('PROMOTION_RELEGATION_SLOTS') as unknown as {
    readonly PROMOTION: number;
    readonly RELEGATION: number;
  };

  let cursor = state;
  const leagues: League[] = [];
  for (const tier of [1, 2, 3] as const) {
    const idStep = nextId(cursor);
    cursor = idStep.state;

    const tierTeamCount =
      tier === 1 ? teamCount.LEAGUE_1 : tier === 2 ? teamCount.LEAGUE_2 : teamCount.LEAGUE_3;
    const tierRoundInterval =
      tier === 1 ? roundInterval.LEAGUE_1 : tier === 2 ? roundInterval.LEAGUE_2 : roundInterval.LEAGUE_3;

    leagues.push({
      id: idStep.value as LeagueId,
      name: LEAGUE_NAMES[tier],
      tier,
      teamCount: tierTeamCount,
      roundIntervalMin: tierRoundInterval,
      promotionSlots: slots.PROMOTION,
      relegationSlots: slots.RELEGATION,
      playoffTeamCount: PLAYOFF_TEAM_COUNT[tier],
    });
  }

  return { state: cursor, value: leagues };
}

function deriveShortName(
  cityName: string,
  suffix: string,
  teamIndex: number,
  used: Set<string>,
): string {
  const candidates = [
    cityName.slice(0, 3).toUpperCase(),
    `${cityName.slice(0, 1)}${suffix.slice(0, 2)}`.toUpperCase(),
    `${cityName.slice(0, 2)}${suffix.slice(0, 1)}`.toUpperCase(),
  ];
  for (const candidate of candidates) {
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `T${teamIndex.toString().padStart(2, '0')}`.slice(0, 3);
}

function generateTeamsForLeague(
  state: PrngState,
  league: League,
  usedTeamNames: Set<string>,
  usedShortNames: Set<string>,
  teamIndexOffset: number,
): PrngResult<readonly Team[]> {
  let cursor = state;
  const teams: Team[] = [];

  const tierQualityCenter = TIER_QUALITY_CENTER[league.tier];
  const capacityRange =
    league.tier === 1
      ? { min: 25000, max: 60000 }
      : league.tier === 2
        ? { min: 15000, max: 40000 }
        : { min: 8000, max: 25000 };
  const balanceCenter = league.tier === 1 ? 60000 : league.tier === 2 ? 25000 : 10000;

  for (let i = 0; i < league.teamCount; i += 1) {
    let cityName = '';
    let suffix = '';
    let name = '';
    for (let attempt = 0; attempt < MAX_UNIQUE_RETRY; attempt += 1) {
      const cityStep = pick(cursor, CITY_NAME_POOL);
      const suffixStep = pick(cityStep.state, TEAM_NAME_SUFFIXES);
      cursor = suffixStep.state;
      const candidateName = `${cityStep.value} ${suffixStep.value}`;
      if (!usedTeamNames.has(candidateName)) {
        cityName = cityStep.value;
        suffix = suffixStep.value;
        name = candidateName;
        break;
      }
    }
    if (name === '') {
      throw new RangeError(
        `generateTeamsForLeague: 고유한 팀 이름을 ${MAX_UNIQUE_RETRY}회 시도 내에 찾지 못했습니다.`,
      );
    }
    usedTeamNames.add(name);

    const shortName = deriveShortName(cityName, suffix, teamIndexOffset + i + 1, usedShortNames);
    usedShortNames.add(shortName);

    const idStep = nextId(cursor);
    cursor = idStep.state;

    const crestSeedStep = nextIntBelow(cursor, 0x100000000);
    cursor = crestSeedStep.state;
    const crestSeed = crestSeedStep.value as Seed;
    const emblem = generateTeamEmblem(crestSeed);

    const foundedOffsetStep = nextIntBetween(cursor, 5, 90);
    cursor = foundedOffsetStep.state;

    const capacityStep = nextIntBetween(cursor, capacityRange.min, capacityRange.max);
    cursor = capacityStep.state;

    const reputationJitterStep = nextIntBetween(cursor, -10, 10);
    cursor = reputationJitterStep.state;

    const fanBaseStep = nextIntBetween(cursor, 5000, 500000);
    cursor = fanBaseStep.state;

    const academyBaseStep = nextIntBetween(cursor, 1, 5);
    cursor = academyBaseStep.state;

    const balanceJitterStep = nextIntBetween(cursor, -3000, 3000);
    cursor = balanceJitterStep.state;

    const reputation = clamp(tierQualityCenter * 3 + reputationJitterStep.value, 0, 100);
    const balance = Math.max(500, balanceCenter + balanceJitterStep.value);

    teams.push({
      id: idStep.value as TeamId,
      name,
      shortName,
      foundedSeason: 1 - foundedOffsetStep.value,
      stadiumName: `${cityName} Stadium`,
      stadiumCapacity: capacityStep.value,
      colorPrimary: emblem.colorPrimary,
      colorSecondary: emblem.colorSecondary,
      crestSeed,
      reputation,
      fanBase: fanBaseStep.value,
      academyLevel: academyBaseStep.value,
      balance: balance as Points,
      financialCrisis: false,
      crisisConsecutiveSeasons: 0,
    });
  }

  return { state: cursor, value: teams };
}

/* ────────────────────────────────────────────────────────────────────────
 * 감독
 * ──────────────────────────────────────────────────────────────────────── */

function generateManagerForTeam(
  state: PrngState,
  team: Team,
  tierQualityCenter: number,
): PrngResult<Manager> {
  let cursor = state;

  const idStep = nextId(cursor);
  cursor = idStep.state;

  const nationalityStep = pick(cursor, SUPPORTED_NATIONALITY_CODES);
  cursor = nationalityStep.state;

  const nameStep = generatePlayerName(cursor, nationalityStep.value);
  cursor = nameStep.state;

  const ageStep = nextIntBetween(cursor, 35, 65);
  cursor = ageStep.state;

  const styleStep = pick(cursor, MANAGER_STYLES);
  cursor = styleStep.state;

  const formationStep = pick(cursor, FORMATIONS);
  cursor = formationStep.state;

  const skillJitterStep = nextIntBetween(cursor, -ATTR_JITTER, ATTR_JITTER);
  cursor = skillJitterStep.state;

  const reputationJitterStep = nextIntBetween(cursor, -8, 8);
  cursor = reputationJitterStep.state;

  const contractLengthStep = nextIntBetween(cursor, 1, 5);
  cursor = contractLengthStep.state;

  const tenureStep = nextIntBetween(cursor, 0, 10);
  cursor = tenureStep.state;

  const manager: Manager = {
    id: idStep.value as ManagerId,
    teamId: team.id,
    name: nameStep.value.fullName,
    age: ageStep.value,
    style: styleStep.value,
    tacticalSkill: clamp(tierQualityCenter + skillJitterStep.value, 1, 30),
    preferredFormation: formationStep.value,
    isActing: false,
    reputation: clamp(tierQualityCenter * 3 + reputationJitterStep.value, 0, 100),
    contractUntilSeason: 1 + contractLengthStep.value,
    tenureSeasons: tenureStep.value,
  };

  return { state: cursor, value: manager };
}

/* ────────────────────────────────────────────────────────────────────────
 * 스쿼드(선수)
 * ──────────────────────────────────────────────────────────────────────── */

interface SquadParamConstants {
  readonly MIN: number;
  readonly MAX: number;
  readonly HARD_MIN: number;
  readonly GK_MIN: number;
  readonly CB_MIN: number;
}

function allocateSquadPositions(
  state: PrngState,
  squadSize: number,
  squadParam: SquadParamConstants,
): PrngResult<Record<Position, number>> {
  const counts: Record<Position, number> = buildBasePositionCounts(squadParam);
  let remaining = squadSize - POSITIONS.reduce((acc, pos) => acc + counts[pos], 0);
  let cursor = state;
  let extraGk = 0;
  let guard = 0;
  const guardLimit = Math.max(remaining, 1) * 50;

  while (remaining > 0 && guard < guardLimit) {
    guard += 1;
    const step = pick(cursor, EXTRA_SLOT_POOL);
    cursor = step.state;
    if (step.value === 'GK' && extraGk >= EXTRA_GK_CAP) {
      continue;
    }
    if (step.value === 'GK') {
      extraGk += 1;
    }
    counts[step.value] += 1;
    remaining -= 1;
  }
  // 방어적 폴백 — 가중 풀에서 상한 초과로 반복해도 못 채운 잔여분은 CM에 몰아준다(무한루프 방지).
  if (remaining > 0) {
    counts.CM += remaining;
  }

  return { state: cursor, value: counts };
}

function generatePlayerAttributes(
  state: PrngState,
  isGoalkeeper: boolean,
  qualityCenter: number,
): PrngResult<PlayerAttributeValues> {
  const strongCenter = qualityCenter;
  const weakCenter = clamp(qualityCenter - WEAK_ATTR_OFFSET, 1, 30);
  const outfieldCenter = isGoalkeeper ? weakCenter : strongCenter;
  const gkCenter = isGoalkeeper ? strongCenter : weakCenter;

  let cursor = state;
  const next = (center: number): number => {
    const step = nextIntBetween(cursor, -ATTR_JITTER, ATTR_JITTER);
    cursor = step.state;
    return clamp(center + step.value, 1, 30);
  };

  const value: PlayerAttributeValues = {
    finishing: next(outfieldCenter),
    passing: next(outfieldCenter),
    crossing: next(outfieldCenter),
    dribbling: next(outfieldCenter),
    firstTouch: next(outfieldCenter),
    tackling: next(outfieldCenter),
    marking: next(outfieldCenter),
    heading: next(outfieldCenter),
    longShots: next(outfieldCenter),
    setPieces: next(outfieldCenter),
    composure: next(outfieldCenter),
    decisions: next(outfieldCenter),
    vision: next(outfieldCenter),
    positioning: next(outfieldCenter),
    workRate: next(outfieldCenter),
    aggression: next(outfieldCenter),
    leadership: next(outfieldCenter),
    teamwork: next(outfieldCenter),
    anticipation: next(outfieldCenter),
    determination: next(outfieldCenter),
    pace: next(outfieldCenter),
    acceleration: next(outfieldCenter),
    stamina: next(outfieldCenter),
    strength: next(outfieldCenter),
    agility: next(outfieldCenter),
    balance: next(outfieldCenter),
    jumping: next(outfieldCenter),
    naturalFitness: next(outfieldCenter),
    reflexes: next(gkCenter),
    handling: next(gkCenter),
    oneOnOnes: next(gkCenter),
    aerialReach: next(gkCenter),
    kicking: next(gkCenter),
    commandOfArea: next(gkCenter),
  };

  return { state: cursor, value };
}

interface SquadGenerationResult {
  readonly players: readonly Player[];
  readonly playerAttributes: readonly PlayerAttribute[];
  readonly playerPositions: readonly PlayerPosition[];
  readonly playerStates: readonly PlayerState[];
}

function generateSquadForTeam(
  state: PrngState,
  team: Team,
  tier: number,
  squadParam: SquadParamConstants,
): PrngResult<SquadGenerationResult> {
  let cursor = state;

  const squadSizeStep = nextIntBetween(cursor, squadParam.MIN, squadParam.MAX);
  cursor = squadSizeStep.state;
  const squadSize = squadSizeStep.value;

  const allocationStep = allocateSquadPositions(cursor, squadSize, squadParam);
  cursor = allocationStep.state;
  const positionCounts = allocationStep.value;

  const numbersStep = shuffledRange(cursor, 99);
  cursor = numbersStep.state;
  const squadNumbers = numbersStep.value;

  const teamQualityJitterStep = nextIntBetween(cursor, -TEAM_QUALITY_JITTER, TEAM_QUALITY_JITTER);
  cursor = teamQualityJitterStep.state;
  const teamQualityCenter = clamp(
    TIER_QUALITY_CENTER[tier] + teamQualityJitterStep.value,
    4,
    27,
  );

  const players: Player[] = [];
  const playerAttributes: PlayerAttribute[] = [];
  const playerPositions: PlayerPosition[] = [];
  const playerStates: PlayerState[] = [];

  let numberCursor = 0;
  for (const position of POSITIONS) {
    const count = positionCounts[position];
    for (let i = 0; i < count; i += 1) {
      const isGoalkeeper = position === 'GK';

      const idStep = nextId(cursor);
      cursor = idStep.state;

      const nationalityStep = pick(cursor, SUPPORTED_NATIONALITY_CODES);
      cursor = nationalityStep.state;

      const nameStep = generatePlayerName(cursor, nationalityStep.value);
      cursor = nameStep.state;

      const ageStep = nextIntBetween(cursor, 16, 38);
      cursor = ageStep.state;

      const footStep = pick(cursor, PREFERRED_FOOT_POOL);
      cursor = footStep.state;

      const attrStep = generatePlayerAttributes(cursor, isGoalkeeper, teamQualityCenter);
      cursor = attrStep.state;

      const ovr = Math.round(
        isGoalkeeper
          ? average(attrStep.value, GK_ATTR_KEYS)
          : average(attrStep.value, OUTFIELD_ATTR_KEYS),
      );

      const youthCeiling = clamp(Math.round((29 - ageStep.value) / 2), 0, 8);
      const potentialMarginStep = nextIntBetween(cursor, 0, Math.max(1, youthCeiling));
      cursor = potentialMarginStep.state;
      const pa = clamp(ovr + potentialMarginStep.value, ovr, 30);

      const reputationJitterStep = nextIntBetween(cursor, -5, 5);
      cursor = reputationJitterStep.state;
      const reputation = clamp(Math.round(ovr * 2.8) + reputationJitterStep.value, 0, 100);

      const ageMultiplier =
        ageStep.value <= 21 ? 1.3 : ageStep.value <= 29 ? 1.0 : ageStep.value <= 33 ? 0.7 : 0.4;
      const marketValue = Math.max(100, Math.round((100 + ovr * ovr * 3) * ageMultiplier));

      const tasteTagCountStep = nextIntBelow(cursor, 2);
      cursor = tasteTagCountStep.state;
      const firstTagStep = pick(cursor, TASTE_TAGS);
      cursor = firstTagStep.state;
      const tasteTags: TasteTag[] = [firstTagStep.value];
      if (tasteTagCountStep.value === 1) {
        const secondTagStep = pick(cursor, TASTE_TAGS.filter((tag) => tag !== firstTagStep.value));
        cursor = secondTagStep.state;
        tasteTags.push(secondTagStep.value);
      }

      const playerId = idStep.value as PlayerId;

      players.push({
        id: playerId,
        name: nameStep.value.fullName,
        nationality: nationalityStep.value,
        birthSeason: 1 - ageStep.value,
        age: ageStep.value,
        preferredFoot: footStep.value,
        preferredPosition: position,
        pa,
        reputation,
        marketValue: marketValue as Points,
        tasteTags,
        retiredAtSeason: null,
      });

      playerAttributes.push({
        ...attrStep.value,
        playerId,
        ovrCached: ovr,
        updatedAtSeason: 1,
      });

      playerPositions.push({ playerId, position, proficiency: 5 });

      const adjacent = POSITION_ADJACENCY[position];
      if (adjacent.length > 0) {
        const hasSecondaryStep = nextIntBelow(cursor, 100);
        cursor = hasSecondaryStep.state;
        if (hasSecondaryStep.value < 40) {
          const secondaryStep = pick(cursor, adjacent);
          cursor = secondaryStep.state;
          const proficiencyStep = nextIntBetween(cursor, 2, 4);
          cursor = proficiencyStep.state;
          playerPositions.push({
            playerId,
            position: secondaryStep.value,
            proficiency: proficiencyStep.value,
          });
        }
      }

      const conditionStep = nextIntBetween(cursor, 70, 100);
      cursor = conditionStep.state;
      const fitnessStep = nextIntBetween(cursor, 80, 100);
      cursor = fitnessStep.state;

      playerStates.push({
        playerId,
        teamId: team.id,
        onLoanTeamId: null,
        squadNumber: squadNumbers[numberCursor],
        condition: conditionStep.value / 10,
        fitness: fitnessStep.value,
        familiaritySeasons: 0,
        yellowAccumulatedLeague: 0,
        yellowAccumulatedCup: 0,
        suspensionRemainingLeague: 0,
        suspensionRemainingCup: 0,
        activeInjuryId: null,
      });
      numberCursor += 1;
    }
  }

  return {
    state: cursor,
    value: { players, playerAttributes, playerPositions, playerStates },
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 스폰서
 * ──────────────────────────────────────────────────────────────────────── */

interface SponsorParamConstants {
  readonly MAX_PER_TEAM: number;
  readonly CONTRACT_MIN: number;
  readonly CONTRACT_MAX: number;
  readonly SHARE_PCT_CAP: number;
  readonly POOL_MIN: number;
}

function generateSponsors(
  state: PrngState,
  poolMin: number,
): PrngResult<readonly Sponsor[]> {
  let cursor = state;

  const extraStep = nextIntBetween(cursor, 0, 15);
  cursor = extraStep.state;
  const count = poolMin + extraStep.value;

  const usedNames = new Set<string>();
  const sponsors: Sponsor[] = [];

  for (let i = 0; i < count; i += 1) {
    let name = '';
    for (let attempt = 0; attempt < MAX_UNIQUE_RETRY; attempt += 1) {
      const prefixStep = pick(cursor, SPONSOR_NAME_PREFIXES);
      const suffixStep = pick(prefixStep.state, SPONSOR_NAME_SUFFIXES);
      cursor = suffixStep.state;
      const candidate = `${prefixStep.value} ${suffixStep.value}`;
      if (!usedNames.has(candidate)) {
        name = candidate;
        break;
      }
    }
    if (name === '') {
      throw new RangeError(
        `generateSponsors: 고유한 스폰서 이름을 ${MAX_UNIQUE_RETRY}회 시도 내에 찾지 못했습니다.`,
      );
    }
    usedNames.add(name);

    const idStep = nextId(cursor);
    cursor = idStep.state;

    const industryStep = pick(cursor, SPONSOR_INDUSTRIES);
    cursor = industryStep.state;

    const scaleStep = nextIntBetween(cursor, 1, 5);
    cursor = scaleStep.state;

    const balanceStep = nextIntBetween(cursor, 3000, 8000);
    cursor = balanceStep.state;

    const reputationStep = nextIntBetween(cursor, 0, 100);
    cursor = reputationStep.state;

    sponsors.push({
      id: idStep.value as SponsorId,
      name,
      industry: industryStep.value,
      scale: scaleStep.value,
      balance: (scaleStep.value * balanceStep.value) as Points,
      reputation: reputationStep.value,
      bankruptAtSeason: null,
    });
  }

  return { state: cursor, value: sponsors };
}

/* ────────────────────────────────────────────────────────────────────────
 * 진입점
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * `worldSeed` 하나로 초기 Mock 월드 전체(리그 3·팀 60·감독 60·선수 약 1,560명·스폰서 ≥40)를
 * 결정론적으로 생성한다. 동일 `worldSeed`는 항상 바이트 단위로 동일한 결과를 낸다.
 */
export function generateMockWorld(worldSeed: WorldSeed): MockWorld {
  installHardcodedFallback();

  const squadParam = loadConstants('SQUAD_PARAM') as unknown as SquadParamConstants;
  const sponsorParam = loadConstants('SPONSOR_PARAM') as unknown as SponsorParamConstants;

  let state = createState(worldSeed);

  const worldIdStep = nextId(state);
  state = worldIdStep.state;

  const leaguesStep = generateLeagues(state);
  state = leaguesStep.state;
  const leagues = leaguesStep.value;

  const usedTeamNames = new Set<string>();
  const usedShortNames = new Set<string>();
  const teams: Team[] = [];
  const managers: Manager[] = [];
  const players: Player[] = [];
  const playerAttributes: PlayerAttribute[] = [];
  const playerPositions: PlayerPosition[] = [];
  const playerStates: PlayerState[] = [];

  let teamIndexOffset = 0;
  for (const league of leagues) {
    const teamsStep = generateTeamsForLeague(state, league, usedTeamNames, usedShortNames, teamIndexOffset);
    state = teamsStep.state;
    teamIndexOffset += league.teamCount;

    for (const team of teamsStep.value) {
      teams.push(team);

      const managerStep = generateManagerForTeam(state, team, TIER_QUALITY_CENTER[league.tier]);
      state = managerStep.state;
      managers.push(managerStep.value);

      const squadStep = generateSquadForTeam(state, team, league.tier, squadParam);
      state = squadStep.state;
      players.push(...squadStep.value.players);
      playerAttributes.push(...squadStep.value.playerAttributes);
      playerPositions.push(...squadStep.value.playerPositions);
      playerStates.push(...squadStep.value.playerStates);
    }
  }

  const sponsorsStep = generateSponsors(state, sponsorParam.POOL_MIN);
  state = sponsorsStep.state;

  const world: World = {
    id: worldIdStep.value as WorldId,
    worldSeed,
    currentSeasonNumber: 1,
    currentPhase: 'PRESEASON',
    speedMultiplier: 1,
    isPaused: false,
    pausedTotalMinutes: 0,
    speedChangedAt: WORLD_CREATED_AT,
    worldMinutesAtSpeedChange: 0,
    pausedAt: null,
    clockRevision: 0,
    createdAt: WORLD_CREATED_AT,
  };

  return {
    world,
    leagues,
    teams,
    managers,
    players,
    playerAttributes,
    playerPositions,
    playerStates,
    sponsors: sponsorsStep.value,
  };
}
