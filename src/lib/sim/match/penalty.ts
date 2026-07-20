/**
 * 승부차기(5+서든데스) — PK 골은 `player_match_stat.goals`에 미포함, `pk_home`/`pk_away`
 * 분리 기록
 *
 * Task 023 / 13일차(2026-08-06) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 13일차 행
 * "승부차기(5+서든데스) — PK 골은 `player_match_stat.goals`에 미포함, `pk_home`/`pk_away`
 * 분리 기록 (D-19)"(동일 항목이 `ROADMAP.md` Task 023 5번째 체크박스). 근거 `FR-MT-013`:
 * "넉아웃 경기에서 연장 후에도 동점이면 5+서든데스 승부차기를 진행한다. 키커의
 * `Composure`·`Finishing`, GK의 `Reflexes`·`OneOnOnes`가 반영된다. 승부차기 골은 개인
 * 통산 득점에 미포함한다." 수용 기준 ① 반드시 승자 확정 ② `pk_home`/`pk_away`로 정규
 * 스코어와 분리 기록 ③ `player_match_stat.goals`에 미반영.
 *
 * ## 이 파일의 책임 범위 — "누가 이기는가"는 여기서 결정하지만 "왜 그런 확률인가"는 아니다
 * `tick.ts`(9일차)·`events.ts`(10일차)·`substitution.ts`(12일차)가 확립한 선례와 동일하게,
 * 능력치 기반 판단(키커의 Composure·Finishing, GK의 Reflexes·OneOnOnes를 반영한 성공
 * 확률 산출)은 `Task 024`(17~24일차, 9개 계수 체인)의 산출물을 입력으로 삼는다 — 아직
 * 그 계수도 라인업 데이터도 없다. 이 파일은 승부차기의 **구조(라운드 진행·조기 확정·
 * 서든데스·무한루프 방지)만** 순수 함수로 강제하고, 매 킥의 성공 확률은 호출자가
 * `resolveScoreProbability` 콜백으로 주입한다. 오늘 리터럴이나 추측으로 그 확률을
 * 지어내면 024 계수 체인과 충돌할 소지가 있다(NFR-CFG-001).
 *
 * ## `PENALTY_SHOOTOUT`은 킥마다의 이벤트가 아니다
 * `@/types`의 `MatchEventType`(23종)에는 킥 단위 이벤트가 아니라 **경기 전체에 걸친 구조
 * 마커 1종** `PENALTY_SHOOTOUT`만 있다(`PENALTY_SCORED`/`PENALTY_MISSED`/`PENALTY_AWARDED`는
 * 정규 시간 내 PK 전용이며 `stats.ts`가 이미 `goals`/`penaltiesScored`/`penaltiesSaved`로
 * 집계하는 이벤트다 — 승부차기 킥에 재사용하면 D-19를 위반하게 된다). `stats.ts`(11일차)의
 * `accumulatePlayerMatchStats` exhaustive switch는 이미 `PENALTY_SHOOTOUT`을 "Tier A 기여가
 * 없는 구조/맥락 마커"(`KICKOFF`/`HALF_TIME`/`FULL_TIME`/`EXTRA_TIME_START`와 동일 취급)로
 * 처리하므로, 이 파일이 그 이벤트를 실제로 생성하기 시작해도 `stats.ts`는 수정할 필요가
 * 없다 — 통합 지점이 이미 안전하게 봉합되어 있다(D-19 수용기준③이 구조적으로 성립).
 *
 * ## 조기 확정 — 별도 분기 없이 "남은 시도 수"로 자연 수렴
 * 실제 축구 규칙은 한쪽이 남은 시도로도 따라잡을 수 없게 되면 그 즉시 승부를 확정한다
 * (불필요한 킥을 차지 않는다). 이 파일은 매 킥 직후
 * `remaining(side) = max(BASE_ROUNDS − taken(side), 0)`을 계산해
 * `home.score > away.score + away.remaining` (또는 반대)이면 즉시 확정한다. 기본 5라운드가
 * 전부 소진되면 양쪽 `remaining`이 0이 되어 이 식이 단순 스코어 비교로 자연히 수렴하므로,
 * "조기 확정"과 "정규 라운드 종료 판정"이 하나의 검사로 통일된다 — 별도의 종료 분기가
 * 필요 없다.
 *
 * ## 서든데스 무한루프 방지
 * 서든데스는 매 라운드 양팀이 1킥씩 던져 스코어가 갈리면 즉시 끝난다. 정상적인 확률
 * (양쪽 다 0과 1 사이)에서는 사실상 즉시 끝나지만, 호출자가 병적인 확률(예: 양쪽 다
 * 항상 성공 또는 항상 실패)을 주입하면 스코어가 영원히 동점을 유지할 수 있다. 이 경우
 * "반드시 승자 확정"(수용기준①)을 조용히 못 지키는 대신 `MAX_SUDDEN_DEATH_ROUNDS`를
 * 넘으면 즉시 `Error`를 던져 문제를 드러낸다.
 *
 * ## 리터럴 상수 허용 근거
 * `PENALTY_SHOOTOUT_BASE_ROUNDS`(5)는 `FR-MT-013` 원문 "5+서든데스"에 직접 명시된 축구
 * 규칙 구조 상수다 — `substitution.ts`의 `MAX_SUBSTITUTIONS_PER_TEAM`과 동일한 근거로,
 * 시즌마다 조정되는 밸런싱 파라미터(NFR-CFG-001 대상)가 아니다. `MAX_SUDDEN_DEATH_ROUNDS`는
 * 도메인 값이 아니라 엔진 안전장치 상한(정상 확률에서는 사실상 도달하지 않는 방어선)이다.
 * `PENALTY_SHOOTOUT_RESERVED_TICK`은 `deriveEventSeed`의 시드 파생 지점 식별자일 뿐 도메인
 * 값이 아니다 — `tier-b-resim-contract.ts`가 `tick=0`을 전용 예약값으로 선점한 것과 동일한
 * 성격의 결정론 규약값이다. 실제 `MatchTick.tick`(9일차 `tick.ts`)의 최댓값은
 * 45(전반) + 5(전반 스토피지 최대) + 45(후반) + 8(후반 스토피지 최대) + 15(연장 전반) +
 * 15(연장 후반) = 133이므로, `0`(Tier B 재시뮬레이션 예약)과 `1~133`(실제 tick 범위)
 * 어느 쪽과도 겹치지 않는 `1000`을 이 파일 전용으로 예약한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴(`@/types`)로 `MatchSeed`/`TeamId`만 참조한다(서브경로 금지,
 * 재선언 금지). Map/Set을 쓰지 않는다 — 라운드·side 순서대로 순차 누적만 하므로
 * `sort.ts`의 안정 정렬 헬퍼가 필요 없다(NFR-DT-008 대상 아님).
 */

import type { MatchSeed, TeamId } from '@/types';
import type { MatchEventDraft } from './events';
import { EXTRA_SECOND_HALF_END_MINUTE } from './tick';
import { deriveEventSeed, stateForSeed } from '../rng/derive';
import { rollSucceeds } from '../rng/precision';

/** 기본 승부차기 라운드 수(`FR-MT-013` 원문 "5+서든데스" — 축구 규칙 구조 상수). */
export const PENALTY_SHOOTOUT_BASE_ROUNDS = 5;

/**
 * `deriveEventSeed(matchSeed, tick, eventIndex)` 전용 예약 `tick` 값. 왜 `1000`인지는
 * 파일 상단 "리터럴 상수 허용 근거" 절 참조 — `tier-b-resim-contract.ts`의
 * `TIER_B_RESIM_RESERVED_TICK`(0)과 실제 `MatchTick.tick` 범위(1~133) 양쪽 모두와
 * 배타적이다.
 */
export const PENALTY_SHOOTOUT_RESERVED_TICK = 1000;

/** 서든데스 무한루프 방지 안전장치 상한(도메인 밸런싱 값 아님 — 파일 상단 근거 참조). */
const MAX_SUDDEN_DEATH_ROUNDS = 50;

/** 오늘 골격에서는 항상 빈 객체 — `pk_home`/`pk_away`는 이미 `Fixture` 필드가 SSOT이므로
 * `detail`에 중복 저장하지 않는다(D-18 "detail 최소화" 원칙, `events.ts`/`substitution.ts`와
 * 동일하게 로컬 재정의 — export하지 않음). */
const EMPTY_DETAIL: Readonly<Record<string, unknown>> = {};

/** 승부차기 진영. `tick.ts`의 `MatchPhase`와 동일한 SCREAMING_SNAKE 유니온 스타일. */
export type PenaltyShootoutSide = 'HOME' | 'AWAY';

/** 킥 1개의 성공 확률을 산출하기 위해 호출자에게 전달되는 문맥. */
export interface PenaltyKickContext {
  readonly side: PenaltyShootoutSide;
  /** 1부터 시작. 기본 라운드(1~5) 이후 서든데스는 번호를 이어서 증가시킨다(6, 7, ...). */
  readonly round: number;
  /** 이 진영의 몇 번째 시도인지(1부터) — 024 키커 자동 선정 연동 지점. */
  readonly attemptNumber: number;
  readonly isSuddenDeath: boolean;
}

/** 킥 1개의 결과(감사·표시용 — 도메인 타입이 아니다). */
export interface PenaltyKickResult extends PenaltyKickContext {
  readonly scored: boolean;
}

export interface PenaltyShootoutOptions {
  readonly matchSeed: MatchSeed;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /**
   * 킥 1개의 성공 확률(`[0, 1]`). 실제 값(Composure·Finishing·Reflexes·OneOnOnes 반영)은
   * 이 파일 밖(024 계수 체인 또는 호출부 테스트 픽스처)이 정한다 — 기본값을 두지 않고
   * 필수 파라미터로 강제해 이 파일에 리터럴 밸런싱 상수가 생기지 않게 한다.
   */
  readonly resolveScoreProbability: (context: PenaltyKickContext) => number;
}

export interface PenaltyShootoutResult {
  /** 시간순 킥 로그(감사·표시용). */
  readonly kicks: readonly PenaltyKickResult[];
  /** `Fixture.pkHome`과 동일 의미 — 정규·연장 스코어와 분리된 승부차기 전용 스코어. */
  readonly pkHome: number;
  /** `Fixture.pkAway`와 동일 의미. */
  readonly pkAway: number;
  readonly winnerTeamId: TeamId;
  /** `PENALTY_SHOOTOUT` 구조 마커 1건(킥마다의 이벤트가 아니다 — 파일 상단 참조). */
  readonly event: MatchEventDraft;
}

/** 5라운드 기준 이 진영에 남은 기본 라운드 시도 수(0 이상). */
function remainingBaseAttempts(taken: number): number {
  return Math.max(PENALTY_SHOOTOUT_BASE_ROUNDS - taken, 0);
}

/**
 * 승부차기를 처음부터 끝까지 진행해 승자와 스코어를 확정한다.
 *
 * @param options 시드·팀 식별자·킥 성공 확률 콜백.
 * @param sequence 결과 `event`(`MatchEventDraft`)에 부여할 경기 내 순번 — 이 파일은 자체
 *   순번을 관리하지 않는다(`substitution.ts`의 `applySubstitution` 선례와 동일한 계약).
 * @throws 서든데스가 `MAX_SUDDEN_DEATH_ROUNDS`를 넘도록 결정되지 않으면 오류(파일 상단
 *   "서든데스 무한루프 방지" 절 참조) — "반드시 승자 확정"(FR-MT-013①)을 조용히 어기지
 *   않는다.
 */
export function simulatePenaltyShootout(
  options: PenaltyShootoutOptions,
  sequence: number,
): PenaltyShootoutResult {
  const { matchSeed, homeTeamId, awayTeamId, resolveScoreProbability } = options;

  let homeScore = 0;
  let awayScore = 0;
  let homeTaken = 0;
  let awayTaken = 0;
  let kickIndex = 0;
  const kicks: PenaltyKickResult[] = [];

  const takeKick = (round: number, side: PenaltyShootoutSide, isSuddenDeath: boolean): void => {
    kickIndex += 1;
    const attemptNumber = (side === 'HOME' ? homeTaken : awayTaken) + 1;
    const context: PenaltyKickContext = { side, round, attemptNumber, isSuddenDeath };

    const probability = resolveScoreProbability(context);
    const seed = deriveEventSeed(matchSeed, PENALTY_SHOOTOUT_RESERVED_TICK, kickIndex);
    const state = stateForSeed(seed);
    const roll = rollSucceeds(state, probability);
    const scored = roll.value;

    kicks.push({ ...context, scored });
    if (side === 'HOME') {
      homeTaken += 1;
      if (scored) homeScore += 1;
    } else {
      awayTaken += 1;
      if (scored) awayScore += 1;
    }
  };

  const isDecided = (): boolean => {
    const homeRemaining = remainingBaseAttempts(homeTaken);
    const awayRemaining = remainingBaseAttempts(awayTaken);
    return homeScore > awayScore + awayRemaining || awayScore > homeScore + homeRemaining;
  };

  let decided = false;
  for (let round = 1; round <= PENALTY_SHOOTOUT_BASE_ROUNDS && !decided; round += 1) {
    takeKick(round, 'HOME', false);
    decided = isDecided();
    if (!decided) {
      takeKick(round, 'AWAY', false);
      decided = isDecided();
    }
  }

  // 기본 라운드가 결정 없이 끝났다면 remaining=0 수렴으로 인해 반드시 동점이다.
  let suddenDeathRoundsPlayed = 0;
  let suddenRound = PENALTY_SHOOTOUT_BASE_ROUNDS;
  while (!decided) {
    suddenDeathRoundsPlayed += 1;
    if (suddenDeathRoundsPlayed > MAX_SUDDEN_DEATH_ROUNDS) {
      throw new Error(
        `simulatePenaltyShootout: 서든데스가 ${MAX_SUDDEN_DEATH_ROUNDS}라운드를 넘도록 결정되지 않았습니다 — ` +
          'resolveScoreProbability가 병적인 확률(예: 양 진영 항상 동시 성공/실패)을 반환하고 있는지 확인하십시오.',
      );
    }
    suddenRound += 1;
    takeKick(suddenRound, 'HOME', true);
    takeKick(suddenRound, 'AWAY', true);
    decided = homeScore !== awayScore;
  }

  const winnerTeamId = homeScore > awayScore ? homeTeamId : awayTeamId;

  const event: MatchEventDraft = {
    sequence,
    minute: EXTRA_SECOND_HALF_END_MINUTE,
    addedTime: 0,
    type: 'PENALTY_SHOOTOUT',
    teamId: null,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: EMPTY_DETAIL,
  };

  return { kicks, pkHome: homeScore, pkAway: awayScore, winnerTeamId, event };
}
