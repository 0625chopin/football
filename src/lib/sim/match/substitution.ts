/**
 * 교체 로직 — 최대 5명·3창, 부상 발생 시 즉시 교체 판단
 *
 * Task 023 / 12일차(2026-08-05) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 12일차 행:
 * "교체 로직(최대 5명·3창), 부상 발생 시 즉시 교체 판단"(동일 항목이 `ROADMAP.md` Task 023
 * 4번째 체크박스). 근거 `FR-MT-012`: "경기당 최대 5명(3회 창) 교체 가능. 부상 발생·체력
 * 저하·스코어 상황에 따라 자동 판단한다."
 *
 * ## 이 파일의 책임 범위 — "누가 교체되는가"는 여기서 결정하지 않는다
 * 능력치 기반 자동 판단(부상 정도·피로·스코어 상황을 종합해 어느 선수를 투입할지 고르는
 * 로직)은 `Task 024`(17~24일차, 9개 계수 체인·라인업 자동 선정)의 산출물을 입력으로
 * 삼는다 — 아직 그 계수도 벤치 데이터 연결도 없다. `tick.ts`/`events.ts`가 확립한 선례와
 * 동일하게, 이 파일은 **교체 창·인원 상한이라는 규칙(state machine)만** 순수 함수로
 * 강제하고, "누구를 내보내고 누구를 투입할지"는 호출자가 `selectReplacement` 콜백으로
 * 주입한다. 오늘 리터럴이나 추측으로 그 판단을 지어내면 024 계수 체인과 충돌할 소지가
 * 있다(NFR-CFG-001).
 *
 * ## 리터럴 상수 허용 근거
 * `MAX_SUBSTITUTIONS_PER_TEAM`(5)·`MAX_SUBSTITUTION_WINDOWS_PER_TEAM`(3)은 `FR-MT-012`
 * 원문에 직접 명시된 축구 규칙 구조 상수다 — `tick.ts`의 90/45/30(경기 시간 구조 상수)과
 * 동일한 근거로, 시즌마다 조정되는 밸런싱 파라미터(NFR-CFG-001 대상)가 아니다.
 *
 * ## "교체 창(window)" 식별 — 새 상수 없이 `MatchTick.tick` 재사용
 * `tick.ts`는 `MatchTick.tick`을 "1부터 시작하는 순차 인덱스... 로깅·정렬용"으로 정의해
 * 매 순회 슬롯마다 유일한 값을 보장한다. 같은 정지 순간(같은 tick)에서 일어난 **같은 팀**의
 * 교체는 몇 명이든 같은 한 창으로 취급하고, 다른 tick에서의 교체는 새 창을 하나 소비한다 —
 * 이 식별자를 그대로 재사용하므로 별도 그룹핑 로직이나 새 상수가 필요 없다. 팀별
 * `TeamSubstitutionState`를 독립적으로 유지하므로(같은 tick이라도 홈·원정은 각자의
 * `windowTicks`를 따로 채운다) 창 상한은 항상 팀 단위로 적용된다.
 *
 * ### 사후 재구성 규약(I-42 ④) — `(teamId, minute, addedTime)` 3튜플
 * 실시간 시뮬레이션 중에는 이 파일의 `TeamSubstitutionState`가 창을 직접 추적하므로 별도
 * 기록이 필요 없지만, 영속된 `MatchEvent` 로그만으로 사후에 "몇 번째 창이었는지"를
 * 재구성해야 하는 소비처(6팀 스탯 재계산, 5팀 중계 UI)를 위해 규약을 명시한다: 같은
 * `matchId`의 `SUBSTITUTION` 이벤트를 **`(teamId, minute, addedTime)` 3튜플**로 그룹핑하면
 * 같은 창에 속한 교체가 정확히 묶인다. `minute`+`addedTime` 쌍만으로는 부족하다 — 같은
 * tick에서 홈·원정 양 팀이 동시에 교체하면 `teamId`가 없는 그룹핑은 서로 다른 두 팀의
 * 창을 하나로 합쳐버린다. `(teamId, minute, addedTime)`은 한 경기 내에서 유일하므로(위
 * "새 상수 없이 `MatchTick.tick` 재사용" 절 — 팀 단위로 봐도 tick은 여전히 유일) `detail`에
 * `window` 같은 신규 키를 얹지 않아도 재구성이 결정론적으로 성립한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건. 확률 판정이나
 * 다건 정렬이 필요 없어 `rng/`·`precision.ts`·`sort.ts`는 import하지 않는다. `offPlayerIds`는
 * 멤버십 검사(`has`)에만 쓰고 순회하지 않는다(NFR-DT-008 — Set 순회 순서 비의존).
 * `src/types`는 배럴(`@/types`)로 `PlayerId`/`TeamId`만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { PlayerId, TeamId } from '@/types';
import type { MatchTick } from './tick';
import type { MatchEventDraft } from './events';

/** 경기당 팀별 교체 가능 인원 상한(FR-MT-012 원문). */
export const MAX_SUBSTITUTIONS_PER_TEAM = 5;
/** 경기당 팀별 교체 창(정지 순간) 상한(FR-MT-012 원문). */
export const MAX_SUBSTITUTION_WINDOWS_PER_TEAM = 3;

/** 판단 로직 없이 표시 문구도 없는 빈 상세(events.ts의 `EMPTY_DETAIL`과 동일 패턴). */
const EMPTY_DETAIL: Readonly<Record<string, unknown>> = {};

/**
 * 팀 1개의 교체 진행 상태. 불변 — `applySubstitution`이 매 호출마다 새 객체를 반환한다.
 */
export interface TeamSubstitutionState {
  readonly substitutionsUsed: number;
  /** 이미 소비한 교체 창의 `MatchTick.tick` 값. 순서는 소비 순이며 최대 3개. */
  readonly windowTicks: readonly number[];
  /** 이 경기에서 필드를 떠난 선수(교체 아웃된 선수) — 재투입 금지 검사 전용, 순회하지 않는다. */
  readonly offPlayerIds: ReadonlySet<PlayerId>;
}

/** 교체 없이 시작하는 팀 상태. */
export function createInitialSubstitutionState(): TeamSubstitutionState {
  return { substitutionsUsed: 0, windowTicks: [], offPlayerIds: new Set() };
}

/** 교체 시도 입력 — 콜백(전술 판단 또는 부상 즉시판단)이 이미 "누구"를 정한 뒤의 최종 요청. */
export interface SubstitutionAttempt {
  readonly tick: MatchTick;
  readonly teamId: TeamId;
  /** 교체 아웃(필드에서 나가는 선수). */
  readonly playerOffId: PlayerId;
  /** 교체 인(필드로 들어오는 선수). */
  readonly playerOnId: PlayerId;
}

export type SubstitutionRejectionReason =
  | 'PLAYER_ALREADY_SUBSTITUTED_OFF'
  | 'SUBSTITUTION_LIMIT_REACHED'
  | 'WINDOW_LIMIT_REACHED';

export interface SubstitutionResult {
  readonly accepted: boolean;
  readonly reason: SubstitutionRejectionReason | null;
  /** 승인 시 갱신된 상태, 거부 시 입력받은 `state`와 동일(참조 보존). */
  readonly state: TeamSubstitutionState;
  /** 승인 시 `SUBSTITUTION` 이벤트 초안, 거부 시 `null`. */
  readonly event: MatchEventDraft | null;
}

function reject(
  reason: SubstitutionRejectionReason,
  state: TeamSubstitutionState,
): SubstitutionResult {
  return { accepted: false, reason, state, event: null };
}

/**
 * 교체 시도 1건을 팀 상태에 적용한다. 검사 순서: (1) 재투입 금지(데이터 유효성 —
 * 상한 검사보다 근본적인 사유라 먼저 본다) → (2) 인원 상한(5명) → (3) 창 상한(3회).
 *
 * `sequence`는 호출자(경기 이벤트 로그 조립부)가 부여하는 다음 이벤트 순번이다 —
 * `events.ts`의 `generateMatchEvents`처럼 이 파일도 자체적으로 순번을 관리하지 않는다.
 */
export function applySubstitution(
  state: TeamSubstitutionState,
  attempt: SubstitutionAttempt,
  sequence: number,
): SubstitutionResult {
  if (state.offPlayerIds.has(attempt.playerOffId) || state.offPlayerIds.has(attempt.playerOnId)) {
    return reject('PLAYER_ALREADY_SUBSTITUTED_OFF', state);
  }
  if (state.substitutionsUsed >= MAX_SUBSTITUTIONS_PER_TEAM) {
    return reject('SUBSTITUTION_LIMIT_REACHED', state);
  }

  const isNewWindow = !state.windowTicks.includes(attempt.tick.tick);
  if (isNewWindow && state.windowTicks.length >= MAX_SUBSTITUTION_WINDOWS_PER_TEAM) {
    return reject('WINDOW_LIMIT_REACHED', state);
  }

  const nextState: TeamSubstitutionState = {
    substitutionsUsed: state.substitutionsUsed + 1,
    windowTicks: isNewWindow ? [...state.windowTicks, attempt.tick.tick] : state.windowTicks,
    offPlayerIds: new Set([...state.offPlayerIds, attempt.playerOffId]),
  };

  const event: MatchEventDraft = {
    sequence,
    minute: attempt.tick.minute,
    addedTime: attempt.tick.addedTime,
    type: 'SUBSTITUTION',
    teamId: attempt.teamId,
    // `@/types/match.ts` MatchEvent.secondaryPlayerId 주석 확정 규약: SUBSTITUTION의
    // primaryPlayerId=교체 인, secondaryPlayerId=교체 아웃.
    primaryPlayerId: attempt.playerOnId,
    secondaryPlayerId: attempt.playerOffId,
    xg: null,
    relatedEventSequence: null,
    detail: EMPTY_DETAIL,
  };

  return { accepted: true, reason: null, state: nextState, event };
}

/** `attemptImmediateInjurySubstitution`의 대체 선수 선정 콜백에 전달되는 문맥. */
export interface InjurySubstitutionContext {
  readonly injuryEvent: MatchEventDraft;
  readonly tick: MatchTick;
}

/**
 * `INJURY` 이벤트 발생 시 즉시 교체를 시도한다(FR-MT-012 "부상 발생 시 자동 판단").
 *
 * 이 함수는 강제로 교체를 만들어내지 않는다 — `injuryEvent`가 `INJURY` 타입이 아니거나
 * 참가자 정보가 없으면(구조상 적용 대상 아님), 또는 `selectReplacement`가 대체 선수를
 * 찾지 못해 `null`을 반환하면(벤치 소진 등 — 판단은 024/호출자 몫) 그대로 `null`을
 * 반환해 "이 틱에서는 교체 시도 자체가 없었다"를 나타낸다. 대체 선수가 정해지면
 * `applySubstitution`에 위임해 인원·창 상한 검사를 동일하게 통과시킨다.
 */
export function attemptImmediateInjurySubstitution(
  state: TeamSubstitutionState,
  injuryEvent: MatchEventDraft,
  tick: MatchTick,
  selectReplacement: (context: InjurySubstitutionContext) => PlayerId | null,
  sequence: number,
): SubstitutionResult | null {
  if (injuryEvent.type !== 'INJURY' || injuryEvent.primaryPlayerId === null || injuryEvent.teamId === null) {
    return null;
  }

  const replacementId = selectReplacement({ injuryEvent, tick });
  if (replacementId === null) {
    return null;
  }

  return applySubstitution(
    state,
    {
      tick,
      teamId: injuryEvent.teamId,
      playerOffId: injuryEvent.primaryPlayerId,
      playerOnId: replacementId,
    },
    sequence,
  );
}
