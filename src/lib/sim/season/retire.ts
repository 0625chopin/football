/**
 * `src/lib/sim/season/retire.ts` — Task 028(52일차) "명성 갱신(선수·팀), 은퇴 판정
 * (34세부터 확률 상승, 40세 강제)". `docs/team-schedule/02-시뮬레이션엔진팀.md` 52일차 행.
 * 근거: FR-PL-012(선수 명성), FR-TM-002(팀 명성), FR-PL-015(은퇴).
 *
 * ## 은퇴 — "40세 이상 0명"은 어떻게 성립하는가
 * `applyRetirementDecision()`은 `age >= table.FORCE_AGE`를 확률 분기가 아니라 **무조건
 * 분기**로 먼저 처리한다 — 이 분기는 PRNG를 소비하지 않고 `willRetire: true`를 반환한다.
 * 따라서 "40세 이상은 반드시 은퇴"는 확률이 우연히 1에 못 미쳐 실패하는 경로 자체가 없어
 * 런타임 검사가 아니라 코드 구조로 성립한다(49일차 `rebuild.ts`·48일차 `promotion.ts`가
 * 세운 "불변식은 예외/구조로 강제" 선례를 그대로 따른다). `resolveSeasonRetirements()`가
 * 반환하는 배열에서 `age >= FORCE_AGE`인 항목은 항상 `willRetire === true`이며, 호출자가
 * 이 값을 `Player.retiredAtSeason`에 반영하면 "40세 이상 현역 0명"(FR-PL-015 수용 기준 ①)이
 * 이어진다(영속화는 이 파일 밖 오케스트레이션 계층 몫 — `promotion.ts`가 `PromotionSwap[]`만
 * 반환하는 것과 동일한 책임 분리).
 *
 * `RISK_START_AGE`(34) 미만은 확률 자체를 0으로 두어(나이 기반 위험이 시작되지 않았으므로)
 * `computeRetirementProbability()`가 조기에 0을 반환하지만, 그 값도 여전히
 * `rollSucceeds()`(정확히는 그 하위의 `precision.ts`)를 거쳐 판정한다 — "34세 미만은 은퇴하지
 * 않는다"를 별도 조건 분기로 만들지 않고 확률 0의 자연스러운 결과로 얻는다(존재하지 않는
 * 분기를 방어 코드로 만들지 않는다는 `growth.ts` PA 초과 절과 동일한 태도). 이 경로는
 * PRNG 상태를 소비한다 — `FORCE_AGE` 무조건 분기만 상태를 건드리지 않는다.
 *
 * ## 확률 곡선 — 나이·OVR 하락·출전 시간 3축 (FR-PL-015 원문 입력)
 * `RISK_START_AGE`~`FORCE_AGE-1` 구간에서 나이 1살당 `AGE_PROB_STEP`씩 선형 증가하는
 * 기저 확률에, 이번 시즌 OVR **하락분**(`ovrDelta < 0`)과 낮은 출전 시간
 * (`playingTimeRatio < LOW_PLAYTIME_RATIO_THRESHOLD`)이 가산된다. OVR이 성장했으면
 * (`ovrDelta >= 0`) 하락 가산은 0이다 — 성장이 은퇴 확률을 낮추지는 않는다(원문이 "하락
 * 기반"이라고만 명시하므로 상승분에 대한 억측을 더하지 않는다). 계수 자체는 `RETIREMENT_PARAM`
 * (공통코드 그룹 24, `RISK_START_AGE`=34/`FORCE_AGE`=40)에 `BASE_PROB`만 등록돼 있고 값이
 * 비어 있다 — `AGE_PROB_STEP`/`DECLINE_PROB_PER_POINT`/`LOW_PLAYTIME_*`는 그 그룹에도 다른
 * 어떤 그룹에도 등록처가 없다. `growth.ts`의 나이대 계수(FR-PL-011 원문 배율과 다른 자체
 * 가산 계수를 이 팀이 판단해 채운 선례)와 동일하게, 이 파일도 값 자체를 "판단"해 안전
 * 기본값으로 채운다(I-83 패턴) — 실값 정렬은 공통코드 배선 시점(Task 031b류) 몫이다.
 *
 * ## 확률 클램프는 precision.ts 경유 (NFR-DT-005)
 * 세 성분의 합이 이론상 1을 넘을 수 있다(38세·큰 하락폭·저출전 동시 발생). 부동소수
 * `Math.min(1, ...)`으로 직접 클램프하지 않고 `rng/precision.ts`의 `clampToUnits()`로
 * 6자리 정수 단위 클램프 후 `fromUnits()`로 되돌린 값만 `rollSucceeds()`에 넘긴다 —
 * 이 파일의 모든 확률 비교가 정수 단위를 경유하게 하기 위해서다(부동소수 `<`/`===` 직접
 * 비교 금지, 프로젝트 규약).
 *
 * ## 명성 갱신 — 선수(FR-PL-012)·팀(FR-TM-002)
 * 두 함수 모두 **순수 산술**이며 PRNG를 쓰지 않는다(명성 갱신은 확률이 아니라 "수상·리그
 * 티어·출전 기여·팀 성적"이라는 결정론적 입력의 가중합이므로 `rng/**` 대상이 아니다 —
 * `growth.ts`의 OVR 재계산과 동일 사유). 결과는 입력 명성에 시즌 델타를 더해 0~100으로
 * 클램프한 값이며, 이력 보존(수용 기준 ①)은 호출자가 이전 값을 스냅샷에 남기는 몫이다.
 *
 * 선수: `resolvePlayerReputation()`이 리그 티어 보너스·수상 보너스·(평점 편차 + 팀 성적
 * 편차)×출전 시간 비율을 더한다 — 벤치 선수는 팀이 우승해도 평점/팀 성적으로 인한 명성
 * 변동을 거의 받지 않도록 출전 시간이 그 두 성분에만 곱해진다(수상 보너스는 수상 자체가
 * 이미 상당한 출전을 전제하므로 곱하지 않는다).
 *
 * 팀: `resolveTeamReputation()`이 리그 티어 보너스·트로피 보너스·순위 성과 편차를 더한다.
 * FR-TM-002 원문의 "팬 규모"는 **이 파일의 입력에서 제외**한다 — `Team.fanBase`는
 * 5,000~500,000 스케일(`src/lib/mock/world.ts` 생성 범위)이라 정규화 기준(리그 전체
 * 분포)이 팀 1개 단위 순수 함수 안에서 성립하지 않는다(리그 전체 컨텍스트가 필요한 값을
 * 이 파일에서 억측하지 않는다 — `promotion.ts`가 슬롯 수 불일치를 추측 대신 예외로 던지는
 * 태도와 동일). "최근 5시즌 성적"도 이번 시즌 성과만 반영하고 이력 가중은 오케스트레이션
 * 계층(호출자가 누적) 몫이다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 은퇴 판정의 유일한
 * 난수 경로는 `rng/precision.ts`의 `rollSucceeds()`(내부적으로 `rng/prng.ts`의 `nextFloat()`
 * 경유)이며, 모든 함수가 `{state, value}`를 반환해 호출자가 `state`를 다음 호출로 이어받는다.
 * 명성 갱신 두 함수는 PRNG를 쓰지 않으므로 상태를 받지도 반환하지도 않는다. 타입은
 * `@/types` 배럴로만 import.
 */

import type { Player, PlayerId, Team, TeamId } from '@/types';
import { clampToUnits, fromUnits, rollSucceeds } from '../rng/precision';
import type { PrngResult, PrngState } from '../rng/prng';

// ── 은퇴 판정 ────────────────────────────────────────────────────────────

/** `RETIREMENT_PARAM` 공통코드(그룹 24, FR-PL-015) 키 구성 + 이 파일이 판단해 채운 보조 계수. */
export interface RetirementParamTable {
  /** 34 — 이 나이부터 확률이 0을 벗어난다(카탈로그 등록값) */
  readonly RISK_START_AGE: number;
  /** 40 — 이 나이 이상은 무조건 은퇴(카탈로그 등록값) */
  readonly FORCE_AGE: number;
  /** `RISK_START_AGE` 시점의 기저 확률(카탈로그 미등록, 이 파일이 판단) */
  readonly BASE_PROB: number;
  /** 나이 1살당 기저 확률 가산폭(`RISK_START_AGE`~`FORCE_AGE-1` 구간) */
  readonly AGE_PROB_STEP: number;
  /** 이번 시즌 OVR 하락 1점당 확률 가산폭(하락분에만 적용, 상승분은 0) */
  readonly DECLINE_PROB_PER_POINT: number;
  /** 이 비율 미만 출전 시 저출전 가산이 붙는다 */
  readonly LOW_PLAYTIME_RATIO_THRESHOLD: number;
  /** 저출전 가산폭 */
  readonly LOW_PLAYTIME_PROB_BONUS: number;
}

/** 카탈로그 미등록 구간의 안전 기본값(I-83 주입 패턴). 파일 헤더 "확률 곡선" 절 참조. */
export const RETIREMENT_PARAM_DEFAULT: RetirementParamTable = {
  RISK_START_AGE: 34,
  FORCE_AGE: 40,
  BASE_PROB: 0.05,
  AGE_PROB_STEP: 0.12,
  DECLINE_PROB_PER_POINT: 0.02,
  LOW_PLAYTIME_RATIO_THRESHOLD: 0.25,
  LOW_PLAYTIME_PROB_BONUS: 0.1,
};

/** 은퇴 판정 대상 선수 1명의 시즌 입력. */
export interface RetirementCandidate {
  readonly player: Pick<Player, 'id' | 'age'>;
  /** 이번 시즌 OVR 변동(성장 후 − 성장 전). 하락이면 음수, 은퇴 확률에만 반영. */
  readonly ovrDelta: number;
  /** 이번 시즌 출전 시간 비율 0~1 (팀 전체 가능 출전 시간 대비). */
  readonly playingTimeRatio: number;
}

/** 은퇴가 발동된 근거. `willRetire`가 false면 항상 `null`. */
export type RetirementReason = 'FORCE_AGE' | 'RISK_AGE' | null;

/** 선수 1명의 은퇴 판정 결과. */
export interface RetirementDecision {
  readonly playerId: PlayerId;
  readonly age: number;
  readonly willRetire: boolean;
  readonly reason: RetirementReason;
  /** 판정에 실제로 쓰인 확률(강제 은퇴는 1, 위험 나이 미만은 0). */
  readonly retirementProbability: number;
}

/**
 * 나이·OVR 하락·출전 시간으로 은퇴 확률을 계산한다(`[0, 1]`, 클램프 전 원값).
 * `age`가 `RISK_START_AGE` 미만이면 0, `FORCE_AGE` 이상은 이 함수를 거치지 않고
 * `applyRetirementDecision()`이 직접 1로 처리한다(파일 헤더 참조).
 */
export function computeRetirementProbability(
  age: number,
  ovrDelta: number,
  playingTimeRatio: number,
  table: RetirementParamTable = RETIREMENT_PARAM_DEFAULT,
): number {
  if (age < table.RISK_START_AGE) {
    return 0;
  }

  const ageComponent =
    table.BASE_PROB + (age - table.RISK_START_AGE) * table.AGE_PROB_STEP;
  const declineComponent =
    ovrDelta < 0 ? -ovrDelta * table.DECLINE_PROB_PER_POINT : 0;
  const lowPlaytimeComponent =
    playingTimeRatio < table.LOW_PLAYTIME_RATIO_THRESHOLD ? table.LOW_PLAYTIME_PROB_BONUS : 0;

  return ageComponent + declineComponent + lowPlaytimeComponent;
}

/**
 * 선수 1명의 은퇴 여부를 판정한다. `age >= table.FORCE_AGE`는 PRNG를 소비하지 않는
 * 무조건 분기다(파일 헤더 "40세 이상 0명" 절 참조).
 */
export function applyRetirementDecision(
  state: PrngState,
  candidate: RetirementCandidate,
  table: RetirementParamTable = RETIREMENT_PARAM_DEFAULT,
): PrngResult<RetirementDecision> {
  const { player, ovrDelta, playingTimeRatio } = candidate;

  if (player.age >= table.FORCE_AGE) {
    return {
      state,
      value: {
        playerId: player.id,
        age: player.age,
        willRetire: true,
        reason: 'FORCE_AGE',
        retirementProbability: 1,
      },
    };
  }

  const rawProbability = computeRetirementProbability(player.age, ovrDelta, playingTimeRatio, table);
  const clampedProbability = fromUnits(clampToUnits(rawProbability));
  const draw = rollSucceeds(state, clampedProbability);

  return {
    state: draw.state,
    value: {
      playerId: player.id,
      age: player.age,
      willRetire: draw.value,
      reason: draw.value ? 'RISK_AGE' : null,
      retirementProbability: clampedProbability,
    },
  };
}

/**
 * 시즌 정산 진입점 — 선수 목록 전원에게 순서대로 은퇴 판정을 적용하며 PRNG 상태를
 * 이어받는다. 반환 배열은 입력과 같은 길이·순서다.
 */
export function resolveSeasonRetirements(
  state: PrngState,
  candidates: readonly RetirementCandidate[],
  table: RetirementParamTable = RETIREMENT_PARAM_DEFAULT,
): PrngResult<readonly RetirementDecision[]> {
  let cursor = state;
  const decisions: RetirementDecision[] = [];

  for (const candidate of candidates) {
    const step = applyRetirementDecision(cursor, candidate, table);
    cursor = step.state;
    decisions.push(step.value);
  }

  return { state: cursor, value: decisions };
}

// ── 명성 갱신 ────────────────────────────────────────────────────────────

const REPUTATION_MIN = 0;
const REPUTATION_MAX = 100;

function clampReputation(value: number): number {
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, Math.round(value)));
}

/**
 * 순위(1=최상위)를 −1(최하위)~+1(1위)로 정규화한다. `teamCount`가 1이면(단일 팀 리그는
 * 실제로 나오지 않지만) 0으로 취급해 나눗셈 0을 피한다.
 */
function normalizeRankPerformance(finalRank: number, teamCount: number): number {
  if (teamCount <= 1) {
    return 0;
  }
  return 1 - (2 * (finalRank - 1)) / (teamCount - 1);
}

/** `resolvePlayerReputation()`이 판단해 채운 안전 기본값(I-83 패턴, 등록 공통코드 그룹 없음). */
export interface PlayerReputationParamTable {
  /** 리그 티어별 시즌 고정 보너스(1=최상위 티어) */
  readonly TIER_BONUS: { readonly 1: number; readonly 2: number; readonly 3: number };
  /** 개인 수상 1건당 보너스 */
  readonly AWARD_BONUS_PER_AWARD: number;
  /** 이 평점을 기준(0)으로 편차에 비례해 가감된다 */
  readonly RATING_NEUTRAL: number;
  /** 평점 편차 1당 배율 */
  readonly RATING_SCALE: number;
  /** 팀 성과(정규화 −1~+1) 배율 */
  readonly TEAM_PERFORMANCE_SCALE: number;
}

export const PLAYER_REPUTATION_PARAM_DEFAULT: PlayerReputationParamTable = {
  TIER_BONUS: { 1: 2, 2: 1, 3: 0 },
  AWARD_BONUS_PER_AWARD: 4,
  RATING_NEUTRAL: 6.5,
  RATING_SCALE: 2,
  TEAM_PERFORMANCE_SCALE: 3,
};

/** `resolvePlayerReputation()` 입력 1건 — 선수 1명의 이번 시즌 명성 산출 재료. */
export interface PlayerReputationSeasonInput {
  readonly player: Pick<Player, 'id' | 'reputation'>;
  /** 소속 리그 티어(1이 최상위) */
  readonly leagueTier: 1 | 2 | 3;
  /** 이번 시즌 개인 수상 횟수 */
  readonly awardsWon: number;
  /** 이번 시즌 출전 시간 비율 0~1 */
  readonly playingTimeRatio: number;
  /** 이번 시즌 평균 평점(0~10 스케일, FR-ST-003 산출물 — 이 파일은 재계산하지 않는다) */
  readonly averageRating: number;
  /** 소속 팀의 이번 시즌 최종 순위(1=1위) */
  readonly teamFinalRank: number;
  /** 소속 리그의 팀 수 */
  readonly leagueTeamCount: number;
}

/**
 * 선수 1명의 시즌 명성을 갱신한다(FR-PL-012). 순수 함수 — PRNG를 쓰지 않는다.
 * 이력 보존은 호출자 몫이며, 이 함수는 새 값만 돌려준다.
 */
export function resolvePlayerReputation(
  input: PlayerReputationSeasonInput,
  table: PlayerReputationParamTable = PLAYER_REPUTATION_PARAM_DEFAULT,
): number {
  const { player, leagueTier, awardsWon, playingTimeRatio, averageRating, teamFinalRank, leagueTeamCount } =
    input;

  const tierBonus = table.TIER_BONUS[leagueTier];
  const awardBonus = awardsWon * table.AWARD_BONUS_PER_AWARD;
  const ratingContribution = (averageRating - table.RATING_NEUTRAL) * table.RATING_SCALE;
  const teamPerformanceContribution =
    normalizeRankPerformance(teamFinalRank, leagueTeamCount) * table.TEAM_PERFORMANCE_SCALE;

  const delta =
    tierBonus + awardBonus + playingTimeRatio * (ratingContribution + teamPerformanceContribution);

  return clampReputation(player.reputation + delta);
}

/** `resolveTeamReputation()`이 판단해 채운 안전 기본값(I-83 패턴, 등록 공통코드 그룹 없음). */
export interface TeamReputationParamTable {
  /** 리그 티어별 시즌 고정 보너스(1=최상위 티어) */
  readonly TIER_BONUS: { readonly 1: number; readonly 2: number; readonly 3: number };
  /** 트로피(리그 우승·컵 등) 1건당 보너스 */
  readonly TROPHY_BONUS_PER_TROPHY: number;
  /** 순위 성과(정규화 −1~+1) 배율 */
  readonly RANK_PERFORMANCE_SCALE: number;
}

export const TEAM_REPUTATION_PARAM_DEFAULT: TeamReputationParamTable = {
  TIER_BONUS: { 1: 2, 2: 1, 3: 0 },
  TROPHY_BONUS_PER_TROPHY: 5,
  RANK_PERFORMANCE_SCALE: 4,
};

/** `resolveTeamReputation()` 입력 1건 — 팀 1개의 이번 시즌 명성 산출 재료. */
export interface TeamReputationSeasonInput {
  readonly team: Pick<Team, 'id' | 'reputation'>;
  /** 이번 시즌 리그 티어(1이 최상위) */
  readonly leagueTier: 1 | 2 | 3;
  /** 이번 시즌 최종 순위(1=1위) */
  readonly finalRank: number;
  /** 소속 리그의 팀 수 */
  readonly leagueTeamCount: number;
  /** 이번 시즌 획득 트로피 수(리그 우승·컵 우승 등) */
  readonly trophiesWon: number;
}

/**
 * 팀 1개의 시즌 명성을 갱신한다(FR-TM-002). 팬 규모는 입력에서 제외한다(파일 헤더
 * "명성 갱신" 절 참조 — 리그 전체 분포 없이는 정규화 기준이 성립하지 않는다).
 * 순수 함수 — PRNG를 쓰지 않는다.
 */
export function resolveTeamReputation(
  input: TeamReputationSeasonInput,
  table: TeamReputationParamTable = TEAM_REPUTATION_PARAM_DEFAULT,
): number {
  const { team, leagueTier, finalRank, leagueTeamCount, trophiesWon } = input;

  const tierBonus = table.TIER_BONUS[leagueTier];
  const trophyBonus = trophiesWon * table.TROPHY_BONUS_PER_TROPHY;
  const rankPerformance = normalizeRankPerformance(finalRank, leagueTeamCount) * table.RANK_PERFORMANCE_SCALE;

  const delta = tierBonus + trophyBonus + rankPerformance;

  return clampReputation(team.reputation + delta);
}

/** `resolveSeasonReputations()`가 반환하는 결과 1건 — 선수 또는 팀 어느 한쪽. */
export interface SeasonReputationOutcome {
  readonly players: readonly { readonly playerId: PlayerId; readonly reputation: number }[];
  readonly teams: readonly { readonly teamId: TeamId; readonly reputation: number }[];
}

/**
 * 시즌 정산 진입점 — 선수·팀 명성을 한 번에 갱신한다. PRNG를 쓰지 않으므로 상태를
 * 받지도 반환하지도 않는다(은퇴 판정과 달리 이 함수는 `PrngResult`가 아니다).
 */
export function resolveSeasonReputations(
  players: readonly PlayerReputationSeasonInput[],
  teams: readonly TeamReputationSeasonInput[],
  playerTable: PlayerReputationParamTable = PLAYER_REPUTATION_PARAM_DEFAULT,
  teamTable: TeamReputationParamTable = TEAM_REPUTATION_PARAM_DEFAULT,
): SeasonReputationOutcome {
  return {
    players: players.map((input) => ({
      playerId: input.player.id,
      reputation: resolvePlayerReputation(input, playerTable),
    })),
    teams: teams.map((input) => ({
      teamId: input.team.id,
      reputation: resolveTeamReputation(input, teamTable),
    })),
  };
}
