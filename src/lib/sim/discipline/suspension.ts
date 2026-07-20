/**
 * `src/lib/sim/discipline/suspension.ts`
 *
 * Task 024(22일차) — "카드 누적 5장 정지 / 퇴장 1~3경기 정지, **리그·컵 누적 분리**.
 * 감독 공석 시 BALANCED 폴백 (D-23: 공석 0라운드·즉시 대행)". `docs/team-schedule/
 * 02-시뮬레이션엔진팀.md` 22일차 행. 완료 판정 "리그·컵 카드가 섞이지 않음"을 이 파일이
 * 직접 강제한다(아래 `applyMatchCards`/`advanceCompetitionRound`가 대회 축 인자로 지정된
 * 필드만 갱신하고 나머지 축은 입력 그대로 반환한다 — 테스트로 증명 가능한 구조).
 *
 * ## 입력을 재구현하지 않는다 — 21일차 인계와 같은 원칙
 * 이번 경기의 카드 집계는 `match/stats.ts`의 `accumulatePlayerMatchStats()`가 이미 만든
 * `PlayerMatchStatTierAFold`(`yellowCards`/`secondYellows`/`redCards`)를 그대로 쓴다 —
 * 여기서 `MatchEventDraft[]`를 다시 순회하지 않는다. `yellowCards`는 I-34 확정 fold
 * 규약대로 `SECOND_YELLOW`를 이미 포함한 값이다(`stats.ts` 헤더 "미확정 가정" 2번 참조).
 * 대회 축(`LEAGUE`/`CUP`)은 21일차 `lineup/select.ts`가 이미 연 `SuspensionCompetition`을
 * 재사용한다 — 같은 2분류 타입을 중복 선언하지 않는다(C-6과 같은 원칙을 sim 내부 보조
 * 타입에도 적용). 갱신 대상 필드는 `PlayerState.yellowAccumulatedLeague`/`_Cup`/
 * `suspensionRemainingLeague`/`_Cup`(3일차 확정) 그대로이며, 새 필드를 만들지 않는다.
 *
 * ## 카드 누적 정지 — 5장 임계값, `while` 루프로 초과분까지 결정론적으로 처리
 * 임계값 안전 기본값은 `PlayerState.yellowAccumulatedLeague` 주석이 명시한 공통코드
 * `CARD_PARAM.SUSPENSION_THRESHOLD`=5다. `ability/modifiers.ts`의 I-83 주입 패턴(안전
 * 기본값 export + 선택적 override)을 그대로 따른다 — 오케스트레이션 계층이
 * `SimConstantSnapshot`에서 실제 값을 주입하기 전까지는 기본값을 쓴다. 나머지 연산이
 * 아니라 `while` 루프로 임계값을 반복 차감하는 이유: 한 번에 여러 장이 몰려 임계값을
 * 두 번 이상 넘는 입력에서도(예: 오케스트레이션 계층이 여러 경기를 한 번에 폴드해 넘기는
 * 경우) 정지 경기 수가 매번 같은 방식으로 누적되도록 하기 위해서다(NFR-DT-008 결정론
 * 정신과 동일한 이유 — 입력 분할 방식에 결과가 좌우되지 않아야 한다).
 *
 * ## 퇴장 정지(1~3경기) — 심각도는 이 파일이 추측하지 않는다
 * 카드 사유 taxonomy(`CardReason`)는 I-41로 **보류** 상태다(`person.ts`/`match.ts` 주석
 * 확인 완료 — "값 목록이 불확실해 보류"). 즉 "이번 퇴장이 몇 경기짜리인지"를 판정할
 * 입력 자체가 아직 도메인 타입에 없다 — 이 파일이 임의로 사유→경기수 매핑표를 지어내면
 * 존재하지 않는 taxonomy를 발명하는 것이 된다(select.ts 21일차가 로테이션 이력 필드를
 * 지어내지 않은 것과 같은 판단). 그래서 퇴장(`secondYellows>0 || redCards>0`)이 발생한
 * 경기는 **호출자가 이번 퇴장에 적용할 경기 수를 직접 넘긴다**
 * (`dismissalSuspensionGames`, 퇴장이 있으면 필수). 이 파일은 그 값이 과제 표가 명시한
 * 범위 `[1,3]`(안전 기본값, 오버라이드 가능) 안의 정수인지만 검증한다 — 값 자체를
 * 정하지 않는다. 값을 안 주거나 범위를 벗어나면 fail-fast(`RangeError`).
 *
 * ## 감독 공석 폴백 — D-23, 즉시 대행(0라운드 공백)
 * `Manager`가 `null`이거나(팀에 매칭되는 감독 레코드가 아예 없음) `Manager.teamId`가
 * `null`(레코드는 있으나 미배정, `person.ts` "null = 공석" 주석)이면 즉시 `'BALANCED'`로
 * 대체한다 — 대기 라운드 없이 당장 다음 경기부터 적용된다는 뜻(D-23 "공석 0라운드·즉시
 * 대행"). 실제 대행 `Manager` 레코드 생성(`isActing: true`, 숙련도 50%)은 `person.ts`
 * 주석이 명시하듯 3팀 Task 030(54일차 이후) 소관이라 이 파일은 레코드를 만들지 않는다 —
 * 이 함수는 그 레코드가 아직 없는 이번 경기 시뮬레이션 한 번에 어떤 `ManagerStyle`을
 * 즉시 대입할지만 결정한다. `ability/tactics.ts`의 `ManagerModifierInput.style`이
 * non-null `ManagerStyle`을 요구하므로, 이 함수가 그 필드를 채우는 실제 소비 지점과
 * 맞는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건 — 카드 집계·정지
 * 산정·감독 폴백 판정 전부 결정론적 정수/분기 연산이다. 타입은 `@/types` 배럴로만
 * import.
 */

import type { Manager, ManagerStyle, PlayerState } from '@/types';
import type { PlayerMatchStatTierAFold } from '../match/stats';
import type { SuspensionCompetition } from '../lineup/select';

/** 카드 누적 정지 임계값 안전 기본값(`CARD_PARAM.SUSPENSION_THRESHOLD`=5, I-83 주입 패턴). */
export const CARD_SUSPENSION_THRESHOLD_DEFAULT = 5;
/** 카드 누적 임계값 1회 도달당 부과하는 정지 경기 수 안전 기본값. */
export const CARD_SUSPENSION_GAMES_DEFAULT = 1;
/** 퇴장 정지 최소 경기 수 안전 기본값(과제 표 "퇴장 1~3경기 정지"). */
export const DISMISSAL_SUSPENSION_GAMES_MIN_DEFAULT = 1;
/** 퇴장 정지 최대 경기 수 안전 기본값. */
export const DISMISSAL_SUSPENSION_GAMES_MAX_DEFAULT = 3;

/** 공통코드 오버라이드 — I-83 주입 패턴. 미지정 필드는 안전 기본값을 쓴다. */
export interface SuspensionRuleOptions {
  readonly threshold?: number;
  readonly accumulationSuspensionGames?: number;
  readonly dismissalGamesMin?: number;
  readonly dismissalGamesMax?: number;
}

/** 대회 축 하나(리그 또는 컵)에 대해 정지 판정에 필요한 `PlayerState` 부분집합. */
export type PlayerDisciplineState = Pick<
  PlayerState,
  | 'yellowAccumulatedLeague'
  | 'yellowAccumulatedCup'
  | 'suspensionRemainingLeague'
  | 'suspensionRemainingCup'
>;

/** 이번 경기의 카드 집계 — `match/stats.ts`의 Tier A 폴드 결과를 그대로 재사용. */
export type MatchCardCounts = Pick<PlayerMatchStatTierAFold, 'yellowCards' | 'secondYellows' | 'redCards'>;

interface CompetitionDisciplineState {
  readonly yellowAccumulated: number;
  readonly suspensionRemaining: number;
}

function resolveRules(options: SuspensionRuleOptions | undefined): {
  readonly threshold: number;
  readonly accumulationGames: number;
  readonly dismissalMin: number;
  readonly dismissalMax: number;
} {
  const threshold = options?.threshold ?? CARD_SUSPENSION_THRESHOLD_DEFAULT;
  const accumulationGames = options?.accumulationSuspensionGames ?? CARD_SUSPENSION_GAMES_DEFAULT;
  const dismissalMin = options?.dismissalGamesMin ?? DISMISSAL_SUSPENSION_GAMES_MIN_DEFAULT;
  const dismissalMax = options?.dismissalGamesMax ?? DISMISSAL_SUSPENSION_GAMES_MAX_DEFAULT;

  if (!Number.isInteger(threshold) || threshold <= 0) {
    throw new RangeError(`applyMatchCards: threshold는 1 이상의 정수여야 합니다 (받은 값: ${threshold}).`);
  }
  if (dismissalMin > dismissalMax) {
    throw new RangeError(
      `applyMatchCards: dismissalGamesMin(${dismissalMin})이 dismissalGamesMax(${dismissalMax})보다 큽니다.`,
    );
  }
  return { threshold, accumulationGames, dismissalMin, dismissalMax };
}

function applyCompetitionCards(
  competitionState: CompetitionDisciplineState,
  cards: MatchCardCounts,
  dismissalSuspensionGames: number | undefined,
  options: SuspensionRuleOptions | undefined,
): CompetitionDisciplineState {
  const { threshold, accumulationGames, dismissalMin, dismissalMax } = resolveRules(options);

  let yellowAccumulated = competitionState.yellowAccumulated + cards.yellowCards;
  let suspensionRemaining = competitionState.suspensionRemaining;
  while (yellowAccumulated >= threshold) {
    yellowAccumulated -= threshold;
    suspensionRemaining += accumulationGames;
  }

  const hasDismissal = cards.secondYellows > 0 || cards.redCards > 0;
  if (hasDismissal) {
    if (dismissalSuspensionGames === undefined) {
      throw new RangeError('applyMatchCards: 퇴장이 발생한 경기는 dismissalSuspensionGames가 필수입니다.');
    }
    if (
      !Number.isInteger(dismissalSuspensionGames) ||
      dismissalSuspensionGames < dismissalMin ||
      dismissalSuspensionGames > dismissalMax
    ) {
      throw new RangeError(
        `applyMatchCards: dismissalSuspensionGames는 [${dismissalMin}, ${dismissalMax}] 범위의 정수여야 합니다 ` +
          `(받은 값: ${dismissalSuspensionGames}).`,
      );
    }
    suspensionRemaining += dismissalSuspensionGames;
  }

  return { yellowAccumulated, suspensionRemaining };
}

/**
 * 이번 경기의 카드 집계를 지정된 대회 축(`competition`)에만 반영한다. 반대 축의 누적·
 * 잔여 정지 필드는 입력값 그대로 반환한다(리그·컵 분리를 이 함수 자신이 보장).
 *
 * @throws 퇴장(2차 경고 또는 직접 퇴장)이 있는데 `dismissalSuspensionGames`가 없거나
 *   `[dismissalGamesMin, dismissalGamesMax]`(기본 `[1,3]`) 밖이면 오류.
 */
export function applyMatchCards(
  state: PlayerDisciplineState,
  competition: SuspensionCompetition,
  cards: MatchCardCounts,
  dismissalSuspensionGames?: number,
  options?: SuspensionRuleOptions,
): PlayerDisciplineState {
  if (competition === 'LEAGUE') {
    const updated = applyCompetitionCards(
      { yellowAccumulated: state.yellowAccumulatedLeague, suspensionRemaining: state.suspensionRemainingLeague },
      cards,
      dismissalSuspensionGames,
      options,
    );
    return {
      ...state,
      yellowAccumulatedLeague: updated.yellowAccumulated,
      suspensionRemainingLeague: updated.suspensionRemaining,
    };
  }

  const updated = applyCompetitionCards(
    { yellowAccumulated: state.yellowAccumulatedCup, suspensionRemaining: state.suspensionRemainingCup },
    cards,
    dismissalSuspensionGames,
    options,
  );
  return {
    ...state,
    yellowAccumulatedCup: updated.yellowAccumulated,
    suspensionRemainingCup: updated.suspensionRemaining,
  };
}

/**
 * 지정된 대회 축의 라운드가 하나 진행될 때마다 호출한다 — 잔여 출장정지를 1 차감(0
 * 하한). 반대 축은 입력값 그대로 반환한다(리그·컵 분리를 이 함수 자신이 보장).
 */
export function advanceCompetitionRound(
  state: PlayerDisciplineState,
  competition: SuspensionCompetition,
): PlayerDisciplineState {
  if (competition === 'LEAGUE') {
    return { ...state, suspensionRemainingLeague: Math.max(0, state.suspensionRemainingLeague - 1) };
  }
  return { ...state, suspensionRemainingCup: Math.max(0, state.suspensionRemainingCup - 1) };
}

/**
 * D-23 감독 공석 폴백. `manager`가 `null`이거나 `manager.teamId`가 `null`(공석)이면
 * 즉시 `'BALANCED'`를 반환한다(대기 라운드 없음). 그 외에는 `manager.style` 그대로.
 */
export function resolveManagerStyle(manager: Pick<Manager, 'teamId' | 'style'> | null): ManagerStyle {
  if (manager === null || manager.teamId === null) {
    return 'BALANCED';
  }
  return manager.style;
}
