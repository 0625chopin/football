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
 *   (`MatchTeamStatComparison`)·날씨(`Weather`)**: ⚠️ **48일차 정정(I-229)** — 아래 각 메서드에
 *   그동안 "라인업 생성기 없음(2팀 H-14, 27일차 이후)"라고 적혀 있었으나 **사실이 아니다**.
 *   2팀이 21일차에 `src/lib/sim/lineup/select.ts`의 `selectLineup()`을 이미 완성했다. 이 파일이
 *   비워 둔 진짜 이유는 **경기별(임의의 `fixtureId`) 로스터 가용성 조회 + I-34(LIVE 중 Tier
 *   A/B 컷오프 재계산) 배선이 아직 없어서**다 — 오늘(48일차)은 `getPlayerRecentMatchStats`가
 *   필요로 하는 최근경기평점만 `progress.ts`가 선수 표본별로 직접 생성해 해소했고(별도 데이터
 *   경로), 임의 경기 단위 라인업·팀 스탯 연결은 범위 밖으로 남겨 이슈 후보로 보고한다.
 * - **클럽 시즌 지표(`TeamSeasonStat`)·원장(`PointTransaction`)·트로피(`Trophy`)**:
 *   `economy/`(21일차) → `[]`. **스폰서 계약(`SponsorContract`)은 48일차에 해소했다**(I-231) —
 *   `world.ts`가 `economy/sponsor.ts`의 `proposeSponsorContract`로 팀당 ACTIVE ≤ 3건을 실제
 *   생성하고, 아래 `getSponsorContracts`/`getTeamSponsorContracts`가 그 결과를 슬라이스한다.
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
  AwardId,
  AwardType,
  CommonCode,
  CommonCodeGroup,
  CommonCodeHistory,
  ClubOwner,
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
  ManagerId,
  MatchEvent,
  MatchLineup,
  MatchSeed,
  NewsFeedItem,
  NewsFeedItemType,
  Player,
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerCareerStat,
  PlayerId,
  PlayerMatchStat,
  PlayerPosition,
  PlayerSeasonStat,
  PlayerState,
  PointTransaction,
  Position,
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
 * 수상(Award) Mock 카탈로그 — 41일차(2026-09-15) 추가
 *
 * 근거: 4팀이 `/[lang]/awards`(Task 019)를 완성했으나 `getAwards`/`getMultiAwardRanking`이
 * 항상 `[]`라 시즌별 수상·베스트11 피치 뷰·통산 다관왕 랭킹 세 섹션이 전부 empty로만
 * 렌더되는 문제(40일차 B4와 동일 함정)를 팀장 지시로 해소한다. `Award`(E-31) 12종
 * (FR-AW-001~004)을 진행 중 시즌 1건에 최소 1건씩 채운다 — 새 절차적 생성기를 발명하지
 * 않고, 이미 존재하는 `progress.statLeaders`(시즌 스탯 표본)·`world.players`(스쿼드)를
 * 재료로 삼아 결정론적으로 "가장 나은 후보"를 뽑는다(순수 함수, PRNG 재소비 없음 — 이미
 * PRNG로 만들어진 산출물을 정렬·선택만 하므로 재현성이 자동으로 유지된다).
 *
 * ## 왜 "과거 시즌"을 만들어 시즌 선택기를 실제로 갈아끼우게 하지 않았나
 * 이 Mock 월드는 D-15(단일 월드)에 따라 **진행 중 시즌 1건만 존재**한다(`getSeasons()`가
 * 이미 그렇게 계약돼 있고 `MockDataSource.test.ts`가 이를 고정 — 위 파일 헤더 "다른 시즌
 * 조회" 각주 참조). 과거 시즌 스냅샷 생성기가 없는데 여기서 즉석으로 만들면 이 파일에만
 * 갇힌 발명이 되어 `src/lib/mock/**`(4팀 `/sample` 등 다른 소비자)와 불일치한다(위 파일
 * 헤더 "데이터가 없는 메서드" 원칙과 동일 근거). **판단해 팀장에게 회신** — 시즌 선택기
 * 자체는 1개 링크만 보이는 게 이 Mock 월드의 정직한 현재 상태다.
 */

/** 베스트11(`TEAM_OF_SEASON`/`WORLD_XI`) 슬롯 포지션 구성 — 4-3-3(GK1·CB2·LB1·RB1·DM1·CM2·LW1·ST1·RW1=11).
 * `awards` 페이지가 이 11명을 자체 `POSITION_SORT_ORDER`로 재정렬해 `PitchLineup` 슬롯에
 * 근사 배치하므로, 여기서는 "포지션 개수 구성"만 맞추면 된다(순서는 그쪽 책임). */
const BEST_XI_POSITION_PLAN: readonly Position[] = [
  'GK',
  'CB',
  'CB',
  'LB',
  'RB',
  'DM',
  'CM',
  'CM',
  'LW',
  'ST',
  'RW',
];

/** 리그 소속 선수 전원(FA 제외) — 개인상/베스트11 선정 대상 풀. */
function leagueSquad(
  leagueId: LeagueId,
  teamsByLeague: ReadonlyMap<LeagueId, readonly Team[]>,
  playerStatesByTeam: ReadonlyMap<TeamId, readonly PlayerState[]>,
  playersById: ReadonlyMap<PlayerId, Player>,
): Player[] {
  const teams = teamsByLeague.get(leagueId) ?? [];
  const squad: Player[] = [];
  for (const team of teams) {
    for (const state of playerStatesByTeam.get(team.id) ?? []) {
      const player = playersById.get(state.playerId);
      if (player !== undefined) squad.push(player);
    }
  }
  return squad;
}

function topByReputation(pool: readonly Player[]): Player | undefined {
  return [...pool].sort((a, b) => b.reputation - a.reputation)[0];
}

function topByStatMetric(
  stats: readonly PlayerSeasonStat[],
  metric: keyof PlayerSeasonStat,
): PlayerSeasonStat | undefined {
  return [...stats].sort((a, b) => (b[metric] as number) - (a[metric] as number))[0];
}

/**
 * 슬롯별로 지정된 후보 풀(`pool`)에서 포지션에 맞는 최고 점수 선수를 하나씩 뽑는다.
 * 슬롯마다 다른 풀을 줄 수 있어 "TEAM_OF_SEASON은 리그 1곳, WORLD_XI는 슬롯별로
 * 서로 다른 리그" 같은 선발 기준 분리에 쓴다(41일차 2차 수정 — 아래 `pickBestXI`/
 * `pickWorldXI` 헤더 주석 참조). 풀이 모자라면(소규모 리그 등) 슬롯 풀 합집합에서
 * 미사용 선수로 폴백해 항상 11명을 채운다(4팀 요구 — 베스트11이 빈 자리 없이 그려져야 함).
 */
function pickBestXIFromSlots(
  slots: readonly { readonly position: Position; readonly pool: readonly Player[] }[],
  scoreOf: (playerId: PlayerId) => number,
): Player[] {
  const used = new Set<PlayerId>();
  const chosen: Player[] = [];
  for (const slot of slots) {
    const candidate = slot.pool
      .filter((p) => p.preferredPosition === slot.position && !used.has(p.id))
      .sort((a, b) => scoreOf(b.id) - scoreOf(a.id))[0];
    if (candidate !== undefined) {
      used.add(candidate.id);
      chosen.push(candidate);
    }
  }
  if (chosen.length < slots.length) {
    const unionPool = new Map<PlayerId, Player>();
    for (const slot of slots) {
      for (const p of slot.pool) unionPool.set(p.id, p);
    }
    const fallback = Array.from(unionPool.values())
      .filter((p) => !used.has(p.id))
      .sort((a, b) => scoreOf(b.id) - scoreOf(a.id));
    for (const p of fallback) {
      if (chosen.length >= slots.length) break;
      used.add(p.id);
      chosen.push(p);
    }
  }
  return chosen;
}

/** 단일 풀(리그 1곳)에서 `BEST_XI_POSITION_PLAN` 11명을 뽑는다 — `TEAM_OF_SEASON` 전용. */
function pickBestXI(pool: readonly Player[], scoreOf: (playerId: PlayerId) => number): Player[] {
  return pickBestXIFromSlots(
    BEST_XI_POSITION_PLAN.map((position) => ({ position, pool })),
    scoreOf,
  );
}

/**
 * **41일차 2차 수정(팀장 실렌더 지적)** — `TEAM_OF_SEASON`(최상위 리그 1곳 전용)과
 * `WORLD_XI`가 항상 11명 전원 동일하게 뽑히는 결함을 고쳤다. 원인: `scoreOf`가 대부분
 * `Player.reputation` 폴백을 쓰는데(통계 표본 `STAT_LEADER_SAMPLE_SIZE`=60이 전 리그
 * 통틀어 60명뿐이라 대부분 표본 밖), 이 Mock 월드는 리그 티어가 높을수록 평판도 높게
 * 생성되므로 "전체 선수 풀에서의 포지션별 1위"가 항상 "최상위 리그에서의 포지션별 1위"와
 * 정확히 일치했다(구조적 결함 — 우연이 아니라 매 시드에서 100% 재현).
 *
 * 값을 지어내는 대신(I-41) **선발 기준을 실제로 분리**했다: `WORLD_XI`는 슬롯마다
 * 서로 다른 리그의 스쿼드에서 뽑는다(리그 티어 가중 — 최상위 리그가 5슬롯, 2·3티어가
 * 각 3슬롯). `TEAM_OF_SEASON`은 여전히 최상위 리그 단일 풀만 본다 — 두 축이 같은 리그를
 * 보는 슬롯(예: GK)은 자연스럽게 겹칠 수 있지만, 2·3티어에서만 채워지는 6슬롯은 구조적으로
 * 달라 두 베스트11이 절대 완전히 동일할 수 없다(FR-AW-002 "리그 티어 가중" 취지 반영).
 */
const WORLD_XI_SLOT_LEAGUE_TIER_RANK: readonly number[] = [0, 0, 1, 2, 0, 1, 0, 2, 1, 0, 2];

function pickWorldXI(
  leagueSquadsByTierRank: readonly (readonly Player[])[],
  scoreOf: (playerId: PlayerId) => number,
): Player[] {
  const slots = BEST_XI_POSITION_PLAN.map((position, i) => ({
    position,
    pool: leagueSquadsByTierRank[WORLD_XI_SLOT_LEAGUE_TIER_RANK[i] % leagueSquadsByTierRank.length] ?? [],
  }));
  return pickBestXIFromSlots(slots, scoreOf);
}

/**
 * 시즌 1건(D-15)의 `Award` 전량 + 통산 다관왕 랭킹을 만든다. `AwardType` 12종
 * (FR-AW-001~004)을 리그당(개인상 5종 + `PLAYOFF_MVP` + `PLAYER_OF_THE_ROUND`) ·
 * 최상위 리그 1곳(`TEAM_OF_SEASON` 11명) · 월드 축(`WORLD_XI` 11명·`BALLON_DOR`·
 * `BEST_YOUNG_PLAYER`·`CUP_MVP`)으로 전부 최소 1건씩 채운다.
 *
 * ## `TEAM` subjectType 랭킹이 항상 빈 배열인 이유
 * 12종 전부가 선수 또는 감독(`MANAGER_OF_SEASON`) 수상이라 `teamId`가 채워지는
 * `AwardType`이 도메인상 없다(FR-AW-001~004 원문에 클럽 수상 없음) — 클럽 단위 수상
 * 이력은 `Trophy`(E-32, FR-AW-006)가 담당하는 별도 축이다. `teamId`를 억지로 채워
 * 값을 지어내지 않는다(I-41).
 */
function buildAwardCatalog(
  world: MockWorld,
  teamsByLeague: ReadonlyMap<LeagueId, readonly Team[]>,
  playerStatesByTeam: ReadonlyMap<TeamId, readonly PlayerState[]>,
  managersByTeam: ReadonlyMap<TeamId, Manager>,
  statLeadersByPlayer: ReadonlyMap<PlayerId, readonly PlayerSeasonStat[]>,
  seasonId: SeasonId,
): {
  awards: readonly Award[];
  ranking: ReadonlyMap<'PLAYER' | 'MANAGER' | 'TEAM', readonly MultiAwardRankingEntry[]>;
} {
  const playersById = new Map(world.players.map((p) => [p.id, p] as const));
  const allStats = Array.from(statLeadersByPlayer.values()).flat();
  const scoreOf = (playerId: PlayerId): number =>
    statLeadersByPlayer.get(playerId)?.[0]?.contributionScore ?? playersById.get(playerId)?.reputation ?? 0;

  let seq = 0;
  const awards: Award[] = [];
  function add(
    type: AwardType,
    scope: 'LEAGUE' | 'WORLD' | 'CUP' | 'PLAYOFF',
    target: { leagueId?: LeagueId; playerId?: PlayerId; managerId?: ManagerId },
    criteria: Readonly<Record<string, unknown>> = {},
  ): void {
    seq += 1;
    awards.push({
      id: `mock-award-${seasonId}-${seq}` as AwardId,
      seasonId,
      type,
      scope,
      leagueId: target.leagueId ?? null,
      playerId: target.playerId ?? null,
      managerId: target.managerId ?? null,
      teamId: null,
      criteria,
    });
  }

  for (const league of world.leagues) {
    const squad = leagueSquad(league.id, teamsByLeague, playerStatesByTeam, playersById);
    const leagueStats = allStats.filter((s) => s.leagueId === league.id);

    const mvpStat = topByStatMetric(leagueStats, 'contributionScore');
    const mvpPlayer = mvpStat ? playersById.get(mvpStat.playerId) : topByReputation(squad);
    if (mvpPlayer) {
      add(
        'LEAGUE_MVP',
        'LEAGUE',
        { leagueId: league.id, playerId: mvpPlayer.id },
        { contributionScore: mvpStat?.contributionScore ?? mvpPlayer.reputation },
      );
    }

    const bootStat = topByStatMetric(leagueStats, 'goals');
    const bootPlayer = bootStat ? playersById.get(bootStat.playerId) : topByReputation(squad);
    if (bootPlayer) {
      add('GOLDEN_BOOT', 'LEAGUE', { leagueId: league.id, playerId: bootPlayer.id }, { goals: bootStat?.goals ?? 0 });
    }

    const playmakerStat = topByStatMetric(leagueStats, 'assists');
    const playmakerPlayer = playmakerStat ? playersById.get(playmakerStat.playerId) : topByReputation(squad);
    if (playmakerPlayer) {
      add(
        'GOLDEN_PLAYMAKER',
        'LEAGUE',
        { leagueId: league.id, playerId: playmakerPlayer.id },
        { assists: playmakerStat?.assists ?? 0 },
      );
    }

    const gkStats = leagueStats.filter((s) => playersById.get(s.playerId)?.preferredPosition === 'GK');
    const gloveStat = topByStatMetric(gkStats, 'saves');
    const glovePlayer = gloveStat
      ? playersById.get(gloveStat.playerId)
      : topByReputation(squad.filter((p) => p.preferredPosition === 'GK'));
    if (glovePlayer) {
      add(
        'GOLDEN_GLOVE',
        'LEAGUE',
        { leagueId: league.id, playerId: glovePlayer.id },
        { saves: gloveStat?.saves ?? 0 },
      );
    }

    const topTeam = [...(teamsByLeague.get(league.id) ?? [])].sort((a, b) => b.reputation - a.reputation)[0];
    const manager = topTeam ? managersByTeam.get(topTeam.id) : undefined;
    if (manager) {
      add('MANAGER_OF_SEASON', 'LEAGUE', { leagueId: league.id, managerId: manager.id });
    }

    const playoffStat = topByStatMetric(leagueStats, 'motmAwards');
    const playoffPlayer = playoffStat ? playersById.get(playoffStat.playerId) : topByReputation(squad);
    if (playoffPlayer) {
      add('PLAYOFF_MVP', 'PLAYOFF', { leagueId: league.id, playerId: playoffPlayer.id });
    }

    const roundStat = topByStatMetric(leagueStats, 'keyPasses');
    const roundPlayer = roundStat ? playersById.get(roundStat.playerId) : topByReputation(squad);
    if (roundPlayer) {
      add('PLAYER_OF_THE_ROUND', 'LEAGUE', { leagueId: league.id, playerId: roundPlayer.id });
    }
  }

  // 리그 티어 오름차순(1군 → 3군) — TEAM_OF_SEASON(최상위 리그 1곳)·WORLD_XI(슬롯별 리그
  // 분산) 양쪽이 같은 정렬을 공유해야 "선발 기준이 실제로 다르다"는 근거가 일관된다
  // (위 `pickWorldXI` 헤더 주석 — 41일차 2차 수정).
  const sortedLeagues = [...world.leagues].sort((a, b) => a.tier - b.tier);
  const leagueSquadsByTierRank = sortedLeagues.map((l) =>
    leagueSquad(l.id, teamsByLeague, playerStatesByTeam, playersById),
  );

  // 베스트11(FR-AW-001 TEAM_OF_SEASON) — 최상위 티어 리그 1곳만. 클럽 축구 관례상
  // "시즌의 베스트11"은 최상위 리그 기준이며, 하위 리그까지 매 시즌 11명씩 뽑아도
  // 소비처(awards 페이지)가 티어를 구분해 쓰지 않아 생성 비용만 커진다.
  const topLeague = sortedLeagues[0];
  if (topLeague) {
    const squad = leagueSquadsByTierRank[0];
    for (const player of pickBestXI(squad, scoreOf)) {
      add('TEAM_OF_SEASON', 'LEAGUE', { leagueId: topLeague.id, playerId: player.id });
    }
  }

  // 월드 통합 수상(FR-AW-002) — 슬롯마다 다른 리그에서 뽑아 TEAM_OF_SEASON과 선발 기준을
  // 분리한다(위 `pickWorldXI` 헤더 주석 — 두 베스트11이 완전히 동일해지는 결함 수정).
  for (const player of pickWorldXI(leagueSquadsByTierRank, scoreOf)) {
    add('WORLD_XI', 'WORLD', { playerId: player.id });
  }

  const ballonDorStat = topByStatMetric(allStats, 'contributionScore');
  const ballonDorPlayer = ballonDorStat ? playersById.get(ballonDorStat.playerId) : topByReputation(world.players);
  if (ballonDorPlayer) {
    add(
      'BALLON_DOR',
      'WORLD',
      { playerId: ballonDorPlayer.id },
      { contributionScore: ballonDorStat?.contributionScore ?? ballonDorPlayer.reputation },
    );
  }

  const youngPool = world.players.filter((p) => p.age <= 21);
  const bestYoung = topByReputation(youngPool.length > 0 ? youngPool : world.players);
  if (bestYoung) {
    add('BEST_YOUNG_PLAYER', 'WORLD', { playerId: bestYoung.id }, { age: bestYoung.age });
  }

  // 대회 수상(FR-AW-003) — 컵은 리그 축이 없어 leagueId를 두지 않는다(scope='CUP')
  const cupStat = topByStatMetric(allStats, 'dribblesCompleted');
  const cupPlayer = cupStat ? playersById.get(cupStat.playerId) : topByReputation(world.players);
  if (cupPlayer) {
    add('CUP_MVP', 'CUP', { playerId: cupPlayer.id });
  }

  return { awards, ranking: buildMultiAwardRanking(awards) };
}

/** `Award` 전량을 `subjectType` 축(선수/감독/팀)으로 집계해 내림차순 정렬한다(FR-UI-012 통산 다관왕 랭킹). */
function buildMultiAwardRanking(
  awards: readonly Award[],
): ReadonlyMap<'PLAYER' | 'MANAGER' | 'TEAM', readonly MultiAwardRankingEntry[]> {
  const counts: Record<'PLAYER' | 'MANAGER' | 'TEAM', Map<string, number>> = {
    PLAYER: new Map(),
    MANAGER: new Map(),
    TEAM: new Map(),
  };
  function bump(subjectType: 'PLAYER' | 'MANAGER' | 'TEAM', subjectId: string | null): void {
    if (subjectId === null) return;
    counts[subjectType].set(subjectId, (counts[subjectType].get(subjectId) ?? 0) + 1);
  }
  for (const award of awards) {
    bump('PLAYER', award.playerId);
    bump('MANAGER', award.managerId);
    bump('TEAM', award.teamId);
  }

  const result = new Map<'PLAYER' | 'MANAGER' | 'TEAM', readonly MultiAwardRankingEntry[]>();
  for (const subjectType of ['PLAYER', 'MANAGER', 'TEAM'] as const) {
    const entries = Array.from(counts[subjectType].entries())
      .map(([subjectId, totalAwards]) => ({ subjectType, subjectId, totalAwards }))
      .sort((a, b) => b.totalAwards - a.totalAwards);
    result.set(subjectType, entries);
  }
  return result;
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
  private readonly clubOwnersByTeam: ReadonlyMap<TeamId, ClubOwner>;
  private readonly playerPositionsByPlayer: ReadonlyMap<PlayerId, readonly PlayerPosition[]>;
  private readonly playerStatesByPlayer: ReadonlyMap<PlayerId, PlayerState>;
  private readonly playerStatesByTeam: ReadonlyMap<TeamId, readonly PlayerState[]>;
  private readonly playerAttributesByPlayer: ReadonlyMap<PlayerId, PlayerAttribute>;

  private readonly schedulesByLeague: ReadonlyMap<LeagueId, MockSeasonSchedule>;
  private readonly fixturesById: ReadonlyMap<FixtureId, Fixture>;
  private readonly matchEventsByFixture: ReadonlyMap<FixtureId, readonly MatchEvent[]>;
  private readonly statLeadersByPlayer: ReadonlyMap<PlayerId, readonly PlayerSeasonStat[]>;
  private readonly recentMatchStatsByPlayer: ReadonlyMap<PlayerId, readonly PlayerMatchStat[]>;
  private readonly sponsorContractsByTeam: ReadonlyMap<TeamId, readonly SponsorContract[]>;
  private readonly statAppearanceBasis: number;

  /** 진행 중 시즌 1건(D-15)의 수상 전량 + 통산 다관왕 랭킹 — 생성자에서 1회 산출(41일차, Task 043/019 갭 보완). */
  private readonly awardsForCurrentSeason: readonly Award[];
  private readonly multiAwardRankingBySubjectType: ReadonlyMap<
    'PLAYER' | 'MANAGER' | 'TEAM',
    readonly MultiAwardRankingEntry[]
  >;

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
    this.clubOwnersByTeam = new Map(
      this.world.clubOwners
        .filter((o): o is ClubOwner & { teamId: TeamId } => o.teamId !== null)
        .map((o) => [o.teamId, o] as const),
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

    const recentMatchStatsByPlayer = new Map<PlayerId, PlayerMatchStat[]>();
    for (const stat of this.progress.recentMatchStats) {
      const list = recentMatchStatsByPlayer.get(stat.playerId) ?? [];
      list.push(stat);
      recentMatchStatsByPlayer.set(stat.playerId, list);
    }
    this.recentMatchStatsByPlayer = recentMatchStatsByPlayer;

    const sponsorContractsByTeam = new Map<TeamId, SponsorContract[]>();
    for (const contract of this.world.sponsorContracts) {
      const list = sponsorContractsByTeam.get(contract.teamId) ?? [];
      list.push(contract);
      sponsorContractsByTeam.set(contract.teamId, list);
    }
    this.sponsorContractsByTeam = sponsorContractsByTeam;

    const awardCatalog = buildAwardCatalog(
      this.world,
      this.teamsByLeague,
      this.playerStatesByTeam,
      this.managersByTeam,
      this.statLeadersByPlayer,
      this.progress.season.id,
    );
    this.awardsForCurrentSeason = awardCatalog.awards;
    this.multiAwardRankingBySubjectType = awardCatalog.ranking;
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
    // 48일차 정정(I-229): selectLineup()은 2팀이 21일차에 이미 완성했다 — 없는 건 임의
    // fixtureId별 로스터 가용성 조회 배선이다. 위 파일 헤더 "48일차 정정" 절 참조.
    return [];
  }

  async getMatchPlayerRatings(_fixtureId: FixtureId): Promise<readonly PlayerMatchStat[]> {
    // 48일차 정정(I-229): 최근경기평점(`getPlayerRecentMatchStats`)은 해소했으나, 임의
    // fixtureId 단위 평점은 I-34(LIVE Tier A/B 컷오프) 배선이 아직 없다 — 위 파일 헤더 참조.
    return [];
  }

  async getMatchTeamStats(_fixtureId: FixtureId): Promise<readonly MatchTeamStatComparison[]> {
    // 48일차 정정(I-229): 원천 이벤트는 있으나(`matchEventsByFixture`) 이 DTO로의 파생 집계
    // 배선이 아직 없다 — "원천 자체가 없다"는 이전 서술은 부정확했다. 위 파일 헤더 참조.
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

  /**
   * 최근경기평점(D-34 결정④, 48일차, I-238). `progress.ts`가 스탯 리더보드 표본 선수당
   * 최신순 `RECENT_MATCH_SAMPLE_COUNT`건을 이미 생성해 두므로(3팀 Mock 팩토리), 여기서는
   * 슬라이스만 한다. 이 표본은 생성 시점부터 전부 "종료된 경기"만 표현한다 — 라이브 경기가
   * 이 풀에 애초에 섞이지 않으므로 `Fixture.status`를 다시 조회해 걸러낼 필요가 없다(D-34
   * 결정④ "어댑터 레벨 FINISHED 필터"의 Mock 쪽 이행 방식).
   */
  async getPlayerRecentMatchStats(params: {
    readonly playerId: PlayerId;
    readonly limit: number;
  }): Promise<readonly PlayerMatchStat[]> {
    const stats = this.recentMatchStatsByPlayer.get(params.playerId) ?? [];
    return stats.slice(0, params.limit);
  }

  /** 리그 평균 평점(D-34 결정③, 48일차, I-238) — 표본 0이면 null. */
  async getLeagueAverageRating(params: {
    readonly seasonId: SeasonId;
    readonly leagueId: LeagueId;
    readonly competitionType: CompetitionType;
  }): Promise<number | null> {
    if (!this.isKnownSeason(params.seasonId)) {
      return null;
    }
    const matching = this.progress.statLeaders.filter(
      (s) => s.leagueId === params.leagueId && s.competitionType === params.competitionType,
    );
    if (matching.length === 0) {
      return null;
    }
    const sum = matching.reduce((acc, s) => acc + s.avgRating, 0);
    return Math.round((sum / matching.length) * 100) / 100;
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

  /** 구단주(D-35, 48일차, I-239) — `getTeamManager`와 동일한 팀 1:1 조회 패턴. */
  async getClubOwner(teamId: TeamId): Promise<ClubOwner | null> {
    return this.clubOwnersByTeam.get(teamId) ?? null;
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

  async getTeamSponsorContracts(teamId: TeamId): Promise<readonly SponsorContract[]> {
    return this.sponsorContractsByTeam.get(teamId) ?? [];
  }

  async getSponsorsByIds(sponsorIds: readonly SponsorId[]): Promise<readonly Sponsor[]> {
    const wanted = new Set(sponsorIds);
    return this.world.sponsors.filter((s) => wanted.has(s.id));
  }

  async getSponsors(): Promise<readonly Sponsor[]> {
    return this.world.sponsors;
  }

  async getSponsorContracts(params?: {
    readonly sponsorId?: SponsorId;
    readonly status?: SponsorContractStatus;
  }): Promise<readonly SponsorContract[]> {
    return this.world.sponsorContracts.filter(
      (c) =>
        (params?.sponsorId === undefined || c.sponsorId === params.sponsorId) &&
        (params?.status === undefined || c.status === params.status),
    );
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

  async getAwards(params?: {
    readonly seasonId?: SeasonId;
    readonly leagueId?: LeagueId;
    readonly type?: AwardType;
  }): Promise<readonly Award[]> {
    if (!this.isKnownSeason(params?.seasonId)) {
      // 위 파일 헤더 "다른 시즌 조회" 각주와 동일 원칙 — 과거 시즌 스냅샷이 없어 무시 처리.
      return [];
    }
    let list = this.awardsForCurrentSeason;
    if (params?.leagueId !== undefined) {
      list = list.filter((a) => a.leagueId === params.leagueId);
    }
    if (params?.type !== undefined) {
      list = list.filter((a) => a.type === params.type);
    }
    return list;
  }

  async getMultiAwardRanking(params: {
    readonly subjectType: 'PLAYER' | 'MANAGER' | 'TEAM';
    readonly limit?: number;
  }): Promise<readonly MultiAwardRankingEntry[]> {
    const entries = this.multiAwardRankingBySubjectType.get(params.subjectType) ?? [];
    return entries.slice(0, params.limit ?? DEFAULT_STAT_RANKING_LIMIT);
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
