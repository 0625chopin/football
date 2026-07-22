/**
 * `src/lib/sim/season/awards.ts` — Task 028(53일차) "수상 — 리그별 개인, 월드 통합,
 * 대회, 베스트11, 클럽 트로피. PK 골은 득점왕 집계 제외(D-19)".
 * `docs/team-schedule/02-시뮬레이션엔진팀.md` 53일차 행. 근거: FR-AW-001~002, D-19·D-20.
 *
 * ## "득점왕 집계에 PK 0건"은 어떻게 성립하는가
 * `resolveLeagueGoldenBoot()`는 `PlayerSeasonStat.goals`만 읽는다. D-19("승부차기 득점은
 * 개인 통산 득점에 미포함")는 이 파일이 별도로 빼는 게 아니라 **`goals` 필드 자체가 구조적으로
 * PSO 득점을 받을 수 없다**(T16/T17, `src/types/stat.ts` 파일 헤더 — `PENALTY_SHOOTOUT`
 * 이벤트는 `Fixture.pkHome`/`pkAway`로만 반영되고 `PlayerStatCoreValues` 집계 파이프라인에
 * 재입력되지 않는다). 따라서 "PK 0건"은 이 파일의 런타임 분기가 아니라 **입력 타입이 이미
 * 보장하는 불변식**이며, 이 파일은 그 보장을 깨지 않고 `goals`를 그대로 순위 매김에만
 * 쓴다(값을 재계산·재검증하지 않는다 — `prize.ts`가 `PlayerMatchStat.isMotm`을 재계산하지
 * 않는 것과 동일한 "이미 확정된 집계값을 그대로 소비" 태도). ⚠️ 경기 중 정규 PK 득점
 * (`PENALTY_SCORED` 이벤트)은 D-19 대상이 **아니다** — I-43 fold 규칙에 따라 `GOAL`과 함께
 * `goals`에 정상 합산되며(연장전 득점과 동일하게 D-19 ④가 명시적으로 포함), 이 파일이
 * 별도로 `penaltiesScored`를 빼지 않는 이유가 여기 있다. D-19가 배제하는 것은
 * "승부차기"(경기 승패가 결정되지 않아 시행하는 PSO)뿐이다.
 *
 * ## 5개 카테고리 — 무엇을 만들고 무엇을 만들지 않는가
 * `AwardType`(E-31, 12종) 중 **`PLAYER_OF_THE_ROUND`는 이 파일 범위 밖**이다 — 라운드
 * 단위 시상이라 시즌 정산(028)이 아니라 라운드 진행 파이프라인(`postmatch/`) 소관이며,
 * 53일차 작업표 원문에도 "리그별 개인·월드 통합·대회·베스트11·클럽 트로피" 5개 범주만
 * 열거돼 있다. 나머지 11종은 다음 5개 함수 그룹으로 나눈다:
 * - **리그별 개인**: `resolveLeagueGoldenBoot`/`GoldenPlaymaker`/`GoldenGlove`/`Mvp`/
 *   `BestYoungPlayer`/`ManagerOfSeason` — `LEAGUE_MVP`·`GOLDEN_BOOT`·`GOLDEN_PLAYMAKER`·
 *   `GOLDEN_GLOVE`·`BEST_YOUNG_PLAYER`·`MANAGER_OF_SEASON`.
 * - **베스트11**: `resolveLeagueTeamOfSeason`(`TEAM_OF_SEASON`, 리그별) /
 *   `resolveWorldXI`(`WORLD_XI`, 전 리그 통합).
 * - **월드 통합**: `resolveBallonDor`(`BALLON_DOR`).
 * - **대회**: `resolveCupMvp`(`CUP_MVP`) / `resolvePlayoffMvp`(`PLAYOFF_MVP`).
 * - **클럽 트로피**(E-32): `resolveLeagueTitleTrophies`/`resolvePlayoffTitleTrophies`/
 *   `resolveCupTitleTrophy`/`resolvePromotionTrophies`.
 *
 * ## 이 파일이 하지 않는 것 — id 발급
 * `Award.id`/`Trophy.id`(uuid, `AwardId`/`TrophyId`)는 이 파일이 만들지 않는다. 브랜드 ID는
 * "생성은 브랜드 타입 파일 밖 단일 지점에서만"(`src/types/brand.ts` 원칙)이고, 이 엔진은
 * 결정론(NFR-DT-001)을 위해 `crypto.randomUUID()` 같은 비결정 소스를 쓸 수 없다. 그래서
 * 모든 함수가 `Omit<Award, 'id'>`/`Omit<Trophy, 'id'>`(`AwardOutcome`/`TrophyOutcome`)만
 * 반환한다 — `prize.ts`가 `PointTransaction`을 만들지 않고 금액·사유 코드만 계산해
 * 돌려주는 것과 동일한 책임 분리다. 실제 레코드 삽입(id 부여)은 오케스트레이션 계층 몫이다.
 *
 * ## 순위 기준 — 원문에 없는 값은 "판단"하지 않고 주입받는다
 * `GOLDEN_BOOT`/`GOLDEN_PLAYMAKER`/`GOLDEN_GLOVE`는 `PlayerSeasonStat`의 원시 합산값
 * (`goals`/`assists`/`cleanSheets`)을 그대로 쓴다 — 새 공식을 만들지 않는다. `LEAGUE_MVP`/
 * `BEST_YOUNG_PLAYER`/`CUP_MVP`/`PLAYOFF_MVP`는 `contributionScore`(FR-PL-011 성장 보정
 * 입력으로 이미 존재하는 "리그 기여도 점수")를 1차 기준, `avgRating`(D-34)을 동률 해소
 * 기준으로 쓴다 — 둘 다 이미 스키마에 있는 필드이므로 이 파일이 가중치를 새로 발명하지
 * 않는다. `MANAGER_OF_SEASON`은 다르다 — "기대 대비 성과"는 프리시즌 예측치 같은 이
 * 파일에 없는 외부 데이터가 있어야 정의되므로, 점수 자체를 계산하지 않고
 * `ManagerAwardCandidate.performanceScore`로 **주입받는다**(이 파일은 그 값으로 순위만
 * 매긴다) — `resolveTeamReputation`이 팬 규모를 "리그 전체 분포 없이는 정규화가 성립하지
 * 않는다"며 입력에서 뺀 것과 같은 태도(`retire.ts` 파일 헤더 참조).
 *
 * ## 월드 통합 가중치 (I-83 패턴)
 * `BALLON_DOR`/`WORLD_XI`는 리그 티어가 다른 선수를 한 줄로 세워야 하므로,
 * `WorldAwardCandidate.leagueTier`에 `AwardParamTable.LEAGUE_TIER_WEIGHT`(공통코드
 * 미등록, 이 파일이 판단해 채운 안전 기본값)를 곱해 1차 정렬 키로 쓴다 — `retire.ts`의
 * `TIER_BONUS`(리그 티어별 명성 가산)와 동일한 성격의 보정이다. 원 점수(`contributionScore`
 * /`avgRating`)도 `criteria`에 그대로 남겨 가중 적용 전 값을 잃지 않는다.
 *
 * ## 동률 해소 — PRNG가 필요 없는 이유
 * 모든 정렬의 마지막 tiebreak 키는 `player.id`(또는 `manager.id`)다. 브랜드 ID는 엔티티당
 * 유일하므로 이 키에서 반드시 동률이 갈린다 — `standing/tiebreak.ts`류가 시드 추첨까지
 * 가야 하는 "완전 동일 팀 데이터" 상황과 달리, 개인 수상은 대상 자체가 유일해 시드 기반
 * 추첨(`rng/precision.ts`)이 필요한 지점이 구조적으로 없다. 그래서 이 파일은 `rng/**`를
 * import하지 않는다(이 팀 다른 season 파일과의 유일한 차이).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 정렬은 `rng/sort.ts`의
 * `stableSortBy()`만 경유한다(NFR-DT-008). 타입은 `@/types` 배럴로만 import.
 */

import type {
  Award,
  LeagueId,
  Manager,
  Player,
  PlayerSeasonStat,
  Position,
  SeasonId,
  TeamId,
  Trophy,
} from '@/types';
import { stableSortBy } from '../rng/sort';
import type { PromotionSwap } from './promotion';

// ── 공통 ────────────────────────────────────────────────────────────────

/** id 미부여 수상 산출물 — 파일 헤더 "id 발급" 절 참조. */
export type AwardOutcome = Omit<Award, 'id'>;
/** id 미부여 트로피 산출물 — 위와 동일 이유. */
export type TrophyOutcome = Omit<Trophy, 'id'>;

/** `Position`(11종) → 베스트11 편성용 4개 라인 그룹. */
export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW';

const POSITION_GROUP: Readonly<Record<Position, PositionGroup>> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  DM: 'MF',
  CM: 'MF',
  AM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW',
  SS: 'FW',
};

/** 리그별 개인상·베스트11 입력 1건 — 선수 1명의 이번 시즌 리그 집계. */
export interface SeasonAwardCandidate {
  readonly player: Pick<Player, 'id' | 'age' | 'preferredPosition'>;
  readonly stat: PlayerSeasonStat;
}

/** 이 파일이 판단해 채운 안전 기본값(I-83 패턴, 등록 공통코드 그룹 없음). */
export interface AwardParamTable {
  /** 이 나이 이하만 `BEST_YOUNG_PLAYER` 후보(원 축구 U-21 관례) */
  readonly BEST_YOUNG_MAX_AGE: number;
  /** 월드 통합 시상(`BALLON_DOR`/`WORLD_XI`)에서 리그 티어별 가중치(1=최상위) */
  readonly LEAGUE_TIER_WEIGHT: { readonly 1: number; readonly 2: number; readonly 3: number };
  /** 베스트11 포지션 그룹별 인원 — 합이 11이어야 한다 */
  readonly TEAM_OF_SEASON_FORMATION: Readonly<Record<PositionGroup, number>>;
}

export const AWARD_PARAM_DEFAULT: AwardParamTable = {
  BEST_YOUNG_MAX_AGE: 21,
  LEAGUE_TIER_WEIGHT: { 1: 1.2, 2: 1.0, 3: 0.8 },
  TEAM_OF_SEASON_FORMATION: { GK: 1, DF: 4, MF: 3, FW: 3 },
};

function assertNonEmpty<T>(candidates: readonly T[], fnName: string): void {
  if (candidates.length === 0) {
    throw new RangeError(`${fnName}: candidates가 비어 있습니다.`);
  }
}

/** `stat.competitionType`/(있으면) `stat.leagueId`가 기대값과 다른 항목이 섞여 있으면 던진다. */
function assertScope(
  candidates: readonly SeasonAwardCandidate[],
  competitionType: PlayerSeasonStat['competitionType'],
  leagueId: LeagueId | null,
  fnName: string,
): void {
  for (const candidate of candidates) {
    if (candidate.stat.competitionType !== competitionType) {
      throw new Error(
        `${fnName}: playerId=${candidate.player.id}의 competitionType=` +
          `${candidate.stat.competitionType}이(가) 기대값(${competitionType})과 다릅니다.`,
      );
    }
    if (leagueId !== null && candidate.stat.leagueId !== leagueId) {
      throw new Error(
        `${fnName}: playerId=${candidate.player.id}의 leagueId=${candidate.stat.leagueId}이(가) ` +
          `기대값(${leagueId})과 다릅니다.`,
      );
    }
  }
}

// ── 리그별 개인 ────────────────────────────────────────────────────────

/**
 * 리그 득점왕(`GOLDEN_BOOT`). `PlayerSeasonStat.goals`만 읽는다 — PK 0건 보장은 파일 헤더
 * "득점왕" 절 참조. 동률은 도움 수 → 선수 ID 순으로 해소한다.
 */
export function resolveLeagueGoldenBoot(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
): AwardOutcome {
  assertNonEmpty(candidates, 'resolveLeagueGoldenBoot');
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueGoldenBoot');

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.stat.goals, dir: 'desc' },
    { get: (c) => c.stat.assists, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'GOLDEN_BOOT',
    scope: 'LEAGUE',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { goals: winner.stat.goals, assists: winner.stat.assists },
  };
}

/** 리그 도움왕(`GOLDEN_PLAYMAKER`). 동률은 득점 수 → 선수 ID 순으로 해소한다. */
export function resolveLeagueGoldenPlaymaker(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
): AwardOutcome {
  assertNonEmpty(candidates, 'resolveLeagueGoldenPlaymaker');
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueGoldenPlaymaker');

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.stat.assists, dir: 'desc' },
    { get: (c) => c.stat.goals, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'GOLDEN_PLAYMAKER',
    scope: 'LEAGUE',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { assists: winner.stat.assists, goals: winner.stat.goals },
  };
}

/**
 * 리그 골든글러브(`GOLDEN_GLOVE`) — `preferredPosition`이 `GK` 그룹인 후보만 대상.
 * 이번 시즌 GK 출전 기록이 없으면(정상적인 데이터에서는 드물다) `null`을 돌려준다 —
 * 강제로 없는 후보를 지어내지 않는다.
 */
export function resolveLeagueGoldenGlove(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
): AwardOutcome | null {
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueGoldenGlove');

  const keepers = candidates.filter((c) => POSITION_GROUP[c.player.preferredPosition] === 'GK');
  if (keepers.length === 0) {
    return null;
  }

  const [winner] = stableSortBy(keepers, [
    { get: (c) => c.stat.cleanSheets, dir: 'desc' },
    { get: (c) => c.stat.goalsConceded, dir: 'asc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'GOLDEN_GLOVE',
    scope: 'LEAGUE',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { cleanSheets: winner.stat.cleanSheets, goalsConceded: winner.stat.goalsConceded },
  };
}

/**
 * 리그 MVP(`LEAGUE_MVP`) — `contributionScore` 1차, `avgRating` 동률 해소
 * (파일 헤더 "순위 기준" 절 참조).
 */
export function resolveLeagueMvp(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
): AwardOutcome {
  assertNonEmpty(candidates, 'resolveLeagueMvp');
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueMvp');

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.stat.contributionScore, dir: 'desc' },
    { get: (c) => c.stat.avgRating, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'LEAGUE_MVP',
    scope: 'LEAGUE',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { contributionScore: winner.stat.contributionScore, avgRating: winner.stat.avgRating },
  };
}

/**
 * 영플레이어상(`BEST_YOUNG_PLAYER`) — `table.BEST_YOUNG_MAX_AGE` 이하만 대상. 대상이
 * 없으면(어린 선수가 이번 시즌 리그 출전 기록이 없으면) `null`.
 */
export function resolveLeagueBestYoungPlayer(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
  table: AwardParamTable = AWARD_PARAM_DEFAULT,
): AwardOutcome | null {
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueBestYoungPlayer');

  const young = candidates.filter((c) => c.player.age <= table.BEST_YOUNG_MAX_AGE);
  if (young.length === 0) {
    return null;
  }

  const [winner] = stableSortBy(young, [
    { get: (c) => c.stat.contributionScore, dir: 'desc' },
    { get: (c) => c.stat.avgRating, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'BEST_YOUNG_PLAYER',
    scope: 'LEAGUE',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: {
      age: winner.player.age,
      contributionScore: winner.stat.contributionScore,
      avgRating: winner.stat.avgRating,
    },
  };
}

/** 감독상(`MANAGER_OF_SEASON`) 입력 1건 — 점수 자체는 호출자가 산출(파일 헤더 참조). */
export interface ManagerAwardCandidate {
  readonly manager: Pick<Manager, 'id'>;
  readonly teamId: TeamId;
  readonly finalRank: number;
  /** "기대 대비 성과" 등 호출자가 산출한 점수. 높을수록 우수. */
  readonly performanceScore: number;
}

/**
 * 감독상(`MANAGER_OF_SEASON`) — `performanceScore` 1차, 최종 순위(낮을수록 상위) 동률 해소.
 * 대상이 없으면(공석뿐인 리그 등) `null`.
 */
export function resolveLeagueManagerOfSeason(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly ManagerAwardCandidate[],
): AwardOutcome | null {
  if (candidates.length === 0) {
    return null;
  }

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.performanceScore, dir: 'desc' },
    { get: (c) => c.finalRank, dir: 'asc' },
    { get: (c) => c.manager.id },
  ]);

  return {
    seasonId,
    type: 'MANAGER_OF_SEASON',
    scope: 'LEAGUE',
    leagueId,
    playerId: null,
    managerId: winner.manager.id,
    teamId: winner.teamId,
    criteria: { performanceScore: winner.performanceScore, finalRank: winner.finalRank },
  };
}

// ── 베스트11 ──────────────────────────────────────────────────────────

/** 포지션 그룹별로 `avgRating` 상위 `count`명을 뽑아 베스트11 엔트리로 매핑한다. */
function pickBestByGroup<T extends SeasonAwardCandidate>(
  candidates: readonly T[],
  group: PositionGroup,
  count: number,
  weightOf: (c: T) => number,
): { readonly candidate: T; readonly slotRank: number; readonly weight: number }[] {
  const inGroup = candidates.filter((c) => POSITION_GROUP[c.player.preferredPosition] === group);
  const ranked = stableSortBy(
    inGroup.map((c) => ({ c, weight: weightOf(c) })),
    [{ get: (x) => x.weight, dir: 'desc' }, { get: (x) => x.c.player.id }],
  );

  return ranked.slice(0, count).map((entry, index) => ({
    candidate: entry.c,
    slotRank: index + 1,
    weight: entry.weight,
  }));
}

/**
 * 리그 베스트11(`TEAM_OF_SEASON`) — `table.TEAM_OF_SEASON_FORMATION` 포지션 그룹별 인원만큼
 * `avgRating`(동률 시 `contributionScore`) 상위를 뽑는다. 한 그룹에 후보가 정원보다 적으면
 * 있는 만큼만 채운다(정원을 채우려 후보를 지어내지 않는다).
 */
export function resolveLeagueTeamOfSeason(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly SeasonAwardCandidate[],
  table: AwardParamTable = AWARD_PARAM_DEFAULT,
): readonly AwardOutcome[] {
  assertNonEmpty(candidates, 'resolveLeagueTeamOfSeason');
  assertScope(candidates, 'LEAGUE', leagueId, 'resolveLeagueTeamOfSeason');

  const groups: readonly PositionGroup[] = ['GK', 'DF', 'MF', 'FW'];
  const entries: AwardOutcome[] = [];

  for (const group of groups) {
    const picks = pickBestByGroup(
      candidates,
      group,
      table.TEAM_OF_SEASON_FORMATION[group],
      (c) => c.stat.avgRating,
    );
    for (const pick of picks) {
      entries.push({
        seasonId,
        type: 'TEAM_OF_SEASON',
        scope: 'LEAGUE',
        leagueId,
        playerId: pick.candidate.player.id,
        managerId: null,
        teamId: pick.candidate.stat.teamId,
        criteria: {
          positionGroup: group,
          slotRank: pick.slotRank,
          avgRating: pick.candidate.stat.avgRating,
          contributionScore: pick.candidate.stat.contributionScore,
        },
      });
    }
  }

  return entries;
}

/** 월드 통합 시상 입력 1건 — 리그별 후보에 소속 리그 티어를 얹는다(가중치 산정용). */
export interface WorldAwardCandidate extends SeasonAwardCandidate {
  readonly leagueTier: 1 | 2 | 3;
}

/**
 * 월드 베스트11(`WORLD_XI`) — 리그를 가리지 않고 `avgRating × LEAGUE_TIER_WEIGHT[tier]`
 * 가중값으로 포지션 그룹별 정원을 채운다(파일 헤더 "월드 통합 가중치" 절 참조).
 */
export function resolveWorldXI(
  seasonId: SeasonId,
  candidates: readonly WorldAwardCandidate[],
  table: AwardParamTable = AWARD_PARAM_DEFAULT,
): readonly AwardOutcome[] {
  assertNonEmpty(candidates, 'resolveWorldXI');
  assertScope(candidates, 'LEAGUE', null, 'resolveWorldXI');

  const groups: readonly PositionGroup[] = ['GK', 'DF', 'MF', 'FW'];
  const entries: AwardOutcome[] = [];

  for (const group of groups) {
    const picks = pickBestByGroup(
      candidates,
      group,
      table.TEAM_OF_SEASON_FORMATION[group],
      (c) => c.stat.avgRating * table.LEAGUE_TIER_WEIGHT[c.leagueTier],
    );
    for (const pick of picks) {
      entries.push({
        seasonId,
        type: 'WORLD_XI',
        scope: 'WORLD',
        leagueId: null,
        playerId: pick.candidate.player.id,
        managerId: null,
        teamId: pick.candidate.stat.teamId,
        criteria: {
          positionGroup: group,
          slotRank: pick.slotRank,
          weightedRating: pick.weight,
          avgRating: pick.candidate.stat.avgRating,
          leagueTier: pick.candidate.leagueTier,
        },
      });
    }
  }

  return entries;
}

// ── 월드 통합 (개인) ──────────────────────────────────────────────────

/**
 * 발롱도르(`BALLON_DOR`) — `contributionScore × LEAGUE_TIER_WEIGHT[tier]` 1차,
 * `avgRating` 동률 해소(파일 헤더 "월드 통합 가중치" 절 참조).
 */
export function resolveBallonDor(
  seasonId: SeasonId,
  candidates: readonly WorldAwardCandidate[],
  table: AwardParamTable = AWARD_PARAM_DEFAULT,
): AwardOutcome {
  assertNonEmpty(candidates, 'resolveBallonDor');
  assertScope(candidates, 'LEAGUE', null, 'resolveBallonDor');

  const ranked = stableSortBy(
    candidates.map((c) => ({
      c,
      weightedScore: c.stat.contributionScore * table.LEAGUE_TIER_WEIGHT[c.leagueTier],
    })),
    [
      { get: (x) => x.weightedScore, dir: 'desc' },
      { get: (x) => x.c.stat.avgRating, dir: 'desc' },
      { get: (x) => x.c.player.id },
    ],
  );
  const winner = ranked[0];

  return {
    seasonId,
    type: 'BALLON_DOR',
    scope: 'WORLD',
    leagueId: null,
    playerId: winner.c.player.id,
    managerId: null,
    teamId: winner.c.stat.teamId,
    criteria: {
      weightedScore: winner.weightedScore,
      contributionScore: winner.c.stat.contributionScore,
      avgRating: winner.c.stat.avgRating,
      leagueTier: winner.c.leagueTier,
    },
  };
}

// ── 대회(컵·플레이오프) ──────────────────────────────────────────────

/** 대회(컵/플레이오프) 개인상 입력 1건 — 리그별 후보와 동일 재료지만 나이·포지션이 불필요. */
export interface CompetitionAwardCandidate {
  readonly player: Pick<Player, 'id'>;
  readonly stat: PlayerSeasonStat;
}

function assertCompetitionScope(
  candidates: readonly CompetitionAwardCandidate[],
  competitionType: PlayerSeasonStat['competitionType'],
  fnName: string,
): void {
  for (const candidate of candidates) {
    if (candidate.stat.competitionType !== competitionType) {
      throw new Error(
        `${fnName}: playerId=${candidate.player.id}의 competitionType=` +
          `${candidate.stat.competitionType}이(가) 기대값(${competitionType})과 다릅니다.`,
      );
    }
  }
}

/**
 * 컵대회 MVP(`CUP_MVP`) — 3개 리그 통합 60팀 단일 토너먼트(41일차 `cup.ts`)라 `leagueId`는
 * 항상 `null`이다(E-31 `scope`가 `LEAGUE`가 아니므로).
 */
export function resolveCupMvp(
  seasonId: SeasonId,
  candidates: readonly CompetitionAwardCandidate[],
): AwardOutcome {
  assertNonEmpty(candidates, 'resolveCupMvp');
  assertCompetitionScope(candidates, 'CUP', 'resolveCupMvp');

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.stat.contributionScore, dir: 'desc' },
    { get: (c) => c.stat.avgRating, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'CUP_MVP',
    scope: 'CUP',
    leagueId: null,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { contributionScore: winner.stat.contributionScore, avgRating: winner.stat.avgRating },
  };
}

/**
 * 플레이오프 MVP(`PLAYOFF_MVP`) — 플레이오프는 리그별 대회(40일차 `playoff.ts`)이므로
 * `leagueId`를 명시적으로 받는다.
 */
export function resolvePlayoffMvp(
  seasonId: SeasonId,
  leagueId: LeagueId,
  candidates: readonly CompetitionAwardCandidate[],
): AwardOutcome {
  assertNonEmpty(candidates, 'resolvePlayoffMvp');
  assertCompetitionScope(candidates, 'PLAYOFF', 'resolvePlayoffMvp');

  const [winner] = stableSortBy(candidates, [
    { get: (c) => c.stat.contributionScore, dir: 'desc' },
    { get: (c) => c.stat.avgRating, dir: 'desc' },
    { get: (c) => c.player.id },
  ]);

  return {
    seasonId,
    type: 'PLAYOFF_MVP',
    scope: 'PLAYOFF',
    leagueId,
    playerId: winner.player.id,
    managerId: null,
    teamId: winner.stat.teamId,
    criteria: { contributionScore: winner.stat.contributionScore, avgRating: winner.stat.avgRating },
  };
}

// ── 클럽 트로피 ───────────────────────────────────────────────────────

/** 리그 우승 팀 1건 — 최종 순위 확정(026/028)은 이 파일 밖에서 이미 끝났다고 가정한다. */
export interface LeagueChampion {
  readonly leagueId: LeagueId;
  readonly teamId: TeamId;
}

/** 플레이오프 우승 팀 1건. */
export interface PlayoffChampion {
  readonly leagueId: LeagueId;
  readonly teamId: TeamId;
}

/** 컵대회 우승 팀 — 3개 리그 통합 단일 우승팀이라 `leagueId`가 없다. */
export interface CupChampion {
  readonly teamId: TeamId;
}

/** 리그별 우승 트로피(`LEAGUE_TITLE`). */
export function resolveLeagueTitleTrophies(
  seasonId: SeasonId,
  champions: readonly LeagueChampion[],
): readonly TrophyOutcome[] {
  return champions.map((champion) => ({
    seasonId,
    teamId: champion.teamId,
    type: 'LEAGUE_TITLE',
    leagueId: champion.leagueId,
  }));
}

/** 리그별 플레이오프 우승 트로피(`PLAYOFF_TITLE`). */
export function resolvePlayoffTitleTrophies(
  seasonId: SeasonId,
  champions: readonly PlayoffChampion[],
): readonly TrophyOutcome[] {
  return champions.map((champion) => ({
    seasonId,
    teamId: champion.teamId,
    type: 'PLAYOFF_TITLE',
    leagueId: champion.leagueId,
  }));
}

/** 컵대회 우승 트로피(`CUP_TITLE`) — 특정 리그에 속하지 않으므로 `leagueId: null`(E-32). */
export function resolveCupTitleTrophy(seasonId: SeasonId, champion: CupChampion): TrophyOutcome {
  return {
    seasonId,
    teamId: champion.teamId,
    type: 'CUP_TITLE',
    leagueId: null,
  };
}

/**
 * 승격 트로피(`PROMOTION`) — `promotion.ts`가 이미 계산한 `PromotionSwap[]`에서
 * `direction === 'PROMOTED'`만 골라 매핑한다(값을 다시 계산하지 않는다). `leagueId`는
 * 승격해 들어간 상위 리그(`toLeagueId`)로 둔다 — "승격"이라는 성과의 귀속처이기 때문이다.
 */
export function resolvePromotionTrophies(
  seasonId: SeasonId,
  swaps: readonly PromotionSwap[],
): readonly TrophyOutcome[] {
  return swaps
    .filter((swap) => swap.direction === 'PROMOTED')
    .map((swap) => ({
      seasonId,
      teamId: swap.teamId,
      type: 'PROMOTION' as const,
      leagueId: swap.toLeagueId,
    }));
}
