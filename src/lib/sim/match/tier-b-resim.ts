/**
 * Tier B(`NO_EVENT_TYPE` 26필드) matchSeed 재시뮬레이션 — **구현**.
 *
 * Task 023 / 31일차(2026-09-01) 산출물. `docs/team-schedule/02-시뮬레이션엔진팀.md` 31일차 행
 * — "Tier B 26필드(패스 8·드리블 4·수비 11·GK 3) matchSeed 재시뮬레이션 계약 구현". 설계
 * 배경·산출 방식·시드 네임스페이스 예약(tick=0)은 `./TIER_B_RESIM_DESIGN.md`, 타입 계약(11일차,
 * 동결)은 `./tier-b-resim-contract.ts` 참조. 이 파일은 그 계약이 예고한
 * `deriveTierBMatchStats` 함수 본체를 채운다 — 계약 파일 자체는 오늘 손대지 않는다.
 *
 * ## "재시뮬레이션"의 의미 (설계 메모 §2 요약)
 * tick·이벤트 엔진을 다시 돌리는 게 아니다 — 같은 `matchSeed`로 `tick.ts`/`events.ts`를
 * 재실행해도 항상 같은 23종 이벤트 로그가 나올 뿐(결정론), 패스·태클류 이벤트 타입 자체가
 * `MatchEventType`(23종, 폐쇄 집합)에 없다. 대신 이 파일은 **별도의, matchSeed로 시드된
 * 통계 모델 함수**다: 선수별 실효 능력치 + 팀 컨텍스트에서 기댓값을 계산하고, 선수 전용
 * 독립 스트림(§ "시드 스트림 배정" 참조)에서 뽑은 지터를 더해 정수 카운트를 낸다.
 *
 * ## 그룹 내부 일관성 — "완성 ≤ 시도"를 산출 공식 자체가 강제
 * `passesCompleted ≤ passesAttempted` 같은 쌍은 두 값을 독립적으로 뽑지 않는다.
 * `attempted`만 지터를 태워 뽑고, `completed = round(attempted × completionRate)`
 * (`completionRate ∈ [0, 1]`)로 **파생**시킨다 — 산식이 `rate ≤ 1`을 구조적으로 보장하므로
 * `completed`가 `attempted`를 넘을 수 없다(설계 메모 §2-2 "예: completed = round(attempted ×
 * completionRate)").
 *
 * ## NFR-CFG-001 — 기댓값 테이블은 리터럴로 두지 않고 전부 주입받는다
 * 이 파일에는 "패스 시도 분당 몇 회" 같은 밸런싱 숫자를 단 하나도 하드코딩하지 않는다.
 * `events.ts`의 `occursProbability`/`weights`, `xg-manager-tendency.ts`의 `table`과 동일한
 * 패턴 — 오케스트레이션 계층이 `SimConstantSnapshot`(E-44)/3팀 공통코드 또는 임시 확정값에서
 * 채운 `TierBResimExpectationTable`을 필수 파라미터로 주입한다. 안전 기본값을 두지 않는다
 * (I-83 (b) 패턴 — 침묵 대체가 FR-AD-004 재현성을 조용히 깨뜨리는 것을 막는다).
 *
 * 포지션(`Position`, 11군) → 4개 라인 그룹(`TierBPositionGroup`) 매핑만은 예외적으로 이
 * 파일에 고정한다 — 이건 밸런싱 수치가 아니라 "이 포지션 코드가 어느 라인인가"라는 순수
 * 구조적 사실이다(`events.ts`의 `XG_ELIGIBLE_TYPES`처럼 구조 분류는 하드코딩, 수치만 주입).
 *
 * ## 시드 스트림 배정 — `tick = TIER_B_RESIM_RESERVED_TICK`(0), `eventIndex`는 (선수, 슬롯)
 * 계약(`tier-b-resim-contract.ts`)이 예약한 `tick = 0`을 그대로 쓴다. 같은 틱 안에서 선수별로
 * 겹치지 않는 독립 스트림이 필요하므로, `eventIndex = playerIndex × SLOTS_PER_PLAYER + slot`
 * 으로 (선수, 필드 슬롯) 쌍마다 유일한 `eventIndex`를 만든다(`derive.ts`가 보장하는 "다른
 * eventIndex = 독립 스트림"을 그대로 신뢰). `playerIndex`는 호출자(라인업 정렬 순번)가
 * 매 경기 유일하게 배정해야 한다 — 중복되면 두 선수가 같은 난수 스트림을 공유해 조용히
 * 상관관계가 생긴다(이 파일이 런타임에 검증해 즉시 예외를 던진다, 아래 참조).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 * `src/types`는 배럴로만 참조한다(서브경로 금지, 재선언 금지).
 */

import type { MatchSeed, PlayerId, Position } from '../../../types';
import { deriveEventSeed, stateForSeed } from '../rng/derive';
import { nextIntBetween, type PrngState } from '../rng/prng';
import {
  TIER_B_RESIM_RESERVED_TICK,
  type PlayerMatchStatTierBResimFold,
  type TierBResimStatField,
} from './tier-b-resim-contract';

/**
 * `Position`(11군)을 4개 라인 그룹으로 접는다 — 순수 구조 매핑(밸런싱 값 아님, 위 파일
 * 헤더 참조). `TierBResimExpectationTable`이 그룹별로만 기댓값을 받으므로, 실제 선수
 * 개인차(포지션 11종 전부의 미세한 차이)는 `effectiveAbilityModifier`(Task 024 계수 체인)가
 * 흡수한다는 전제다.
 */
export type TierBPositionGroup = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

/**
 * @throws `position`이 `Position`(11군) 밖의 값이면(향후 enums.ts 변경으로 유니온이
 *   늘어나면) 컴파일 타임에 `exhaustiveCheck`가 즉시 오류를 낸다(`stats.ts`의
 *   `accumulatePlayerMatchStats` switch와 동일한 관용구).
 */
export function tierBPositionGroupOf(position: Position): TierBPositionGroup {
  switch (position) {
    case 'GK':
      return 'GOALKEEPER';
    case 'CB':
    case 'LB':
    case 'RB':
      return 'DEFENDER';
    case 'DM':
    case 'CM':
    case 'AM':
      return 'MIDFIELDER';
    case 'LW':
    case 'RW':
    case 'ST':
    case 'SS':
      return 'FORWARD';
    /* v8 ignore start */
    default: {
      const exhaustiveCheck: never = position;
      throw new Error(`tierBPositionGroupOf: 알 수 없는 Position (${String(exhaustiveCheck)})`);
    }
    /* v8 ignore stop */
  }
}

/** 지터 없이 그대로 값을 내는 12개 필드(`attempted`/`completed` 쌍이 아닌 나머지). */
export const TIER_B_INDEPENDENT_FIELDS = [
  'keyPasses',
  'throughBalls',
  'dispossessed',
  'touches',
  'interceptions',
  'clearances',
  'blocks',
  'errorsLeadingToShot',
  'errorsLeadingToGoal',
  'punches',
  'catches',
  'sweeperActions',
] as const satisfies readonly TierBResimStatField[];

/** `attempted`가 지터를 태워 뽑히고 `completed`/`won`이 완성률로 파생되는 7개 쌍(14필드). */
export const TIER_B_PAIRED_FIELDS = [
  { attempted: 'passesAttempted', completed: 'passesCompleted' },
  { attempted: 'longBallsAttempted', completed: 'longBallsCompleted' },
  { attempted: 'crossesAttempted', completed: 'crossesCompleted' },
  { attempted: 'dribblesAttempted', completed: 'dribblesCompleted' },
  { attempted: 'tacklesAttempted', completed: 'tacklesWon' },
  { attempted: 'aerialDuelsAttempted', completed: 'aerialDuelsWon' },
  { attempted: 'groundDuelsAttempted', completed: 'groundDuelsWon' },
] as const satisfies ReadonlyArray<{ attempted: TierBResimStatField; completed: TierBResimStatField }>;

type IndependentFieldName = (typeof TIER_B_INDEPENDENT_FIELDS)[number];
type PairedAttemptedFieldName = (typeof TIER_B_PAIRED_FIELDS)[number]['attempted'];

/** 선수 1명, 필드 1개(독립 필드) 또는 쌍 1개(paired 필드)당 소비하는 시드 슬롯 수. */
export const SLOTS_PER_PLAYER = TIER_B_INDEPENDENT_FIELDS.length + TIER_B_PAIRED_FIELDS.length;

/** 라인 그룹 4종 전부를 키로 갖는 배율/비율 테이블(그룹 하나라도 빠지면 `tsc`가 즉시 오류). */
export type TierBPositionGroupTable = Readonly<Record<TierBPositionGroup, number>>;

export interface TierBIndependentFieldSpec {
  /** 90분 기준 라인 그룹별 기대 발생 횟수(음수 불가). */
  readonly baseRatePer90: TierBPositionGroupTable;
}

export interface TierBPairedFieldSpec {
  /** 90분 기준 라인 그룹별 기대 시도 횟수(음수 불가). */
  readonly attemptedBaseRatePer90: TierBPositionGroupTable;
  /** 라인 그룹별 기준 완성률 `[0, 1]` — `effectiveAbilityModifier`가 이 기준값을 소폭 보정한다. */
  readonly completionRateBaseline: TierBPositionGroupTable;
}

export type TierBIndependentFieldTable = Readonly<Record<IndependentFieldName, TierBIndependentFieldSpec>>;
export type TierBPairedFieldTable = Readonly<Record<PairedAttemptedFieldName, TierBPairedFieldSpec>>;

/**
 * 26필드 전량의 기댓값 정의 — 오케스트레이션 계층이 3팀 공통코드/임시 확정값에서 채워
 * 주입한다(NFR-CFG-001, 안전 기본값 없음). `independent`/`paired`가 `Record` 타입이라
 * 필드 하나라도 빠지면 `tsc`가 즉시 오류를 낸다(56필드 매핑표와 동일한 완전성 강제 관용구).
 */
export interface TierBResimExpectationTable {
  readonly independent: TierBIndependentFieldTable;
  readonly paired: TierBPairedFieldTable;
}

/**
 * 완성률에 능력치 편차를 반영하는 계수. `xg-manager-tendency.ts`의 "중립(1.0) 대비 편차만
 * 실현율만큼 스케일" 원칙과 같은 이유로, `effectiveAbilityModifier`(1.0 중립)를 완성률에
 * 그대로 곱하지 않는다 — 그러면 능력치가 낮을수록 완성률이 선형으로 붕괴해 버린다. 대신
 * 편차 폭을 `COMPLETION_RATE_ABILITY_SPAN`만큼만 좁혀 반영한다.
 *
 * 이 두 상수(0.85 절편·0.15 폭)는 밸런싱 값이 아니라 **이 파일이 "능력치 1단위 편차가
 * 완성률에 과도하게 흔들리지 않는다"는 안정성 형태를 얻기 위해 고정한 산식 계수**다 —
 * `modifiers.ts`의 클램프 `[0.35, 1.35]`처럼가 아니라, `combineAbilityModifiers` 자체가
 * 이미 그 클램프를 거친 배율을 넘겨준다는 전제 위에서 이 파일이 순수하게 도입한 2차 가공
 * 상수라 3팀 공통코드 그룹 신설 대상이 아니다(그룹이 필요하다고 판단되면 이슈 후보로 남긴다).
 */
const COMPLETION_RATE_ABILITY_INTERCEPT = 0.85;
const COMPLETION_RATE_ABILITY_SPAN = 0.15;

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** 기댓값에 `jitterFraction` 폭의 정수 오프셋을 더해 최종 카운트를 낸다(0 미만은 0으로 자름). */
function jitteredCount(state: PrngState, expected: number, jitterFraction: number): number {
  const rounded = Math.round(expected);
  const span = Math.round(Math.abs(expected) * jitterFraction);
  if (span <= 0) {
    return Math.max(0, rounded);
  }
  const offset = nextIntBetween(state, -span, span);
  return Math.max(0, rounded + offset.value);
}

export interface DeriveTierBMatchStatsOptions {
  readonly expectations: TierBResimExpectationTable;
  /**
   * 지터 폭 — `기대값 × jitterFraction`을 정수 오프셋의 절대 상한으로 쓴다. `0`이면
   * 지터 없이 기대값 반올림만 나온다(완전 결정론). 안전 기본값 없음(I-83 (b) 패턴,
   * "지터가 얼마나 커야 하는가"는 이 파일이 지어낼 수 없는 밸런싱 미지수).
   * @throws 음수이거나 유한수가 아니면 오류.
   */
  readonly jitterFraction: number;
}

/** `deriveTierBMatchStats` 선수별 입력 컨텍스트. */
export interface TierBResimPlayerContext {
  readonly playerId: PlayerId;
  /**
   * 이 경기 내에서 유일해야 하는 결정론적 순번(라인업 정렬 인덱스 등, 설계 메모 §3).
   * 시드 스트림 분리의 유일한 근거이므로, 두 선수가 같은 값을 가지면 이 함수가 즉시
   * 예외를 던진다(침묵 상관관계 방지).
   */
  readonly playerIndex: number;
  readonly position: Position;
  /**
   * Task 024 능력치 계수 체인(`combineAbilityModifiers`)의 합성 배율. 클램프
   * `[0.35, 1.35]`를 거친 값을 그대로 받는다고 전제하지만, 이 파일은 범위를 재검증하지
   * 않는다(그 클램프는 `ability/modifiers.ts` 소관이며 이중 강제는 두 파일이 서로 다른
   * 결정을 내리면 어느 쪽이 옳은지 불분명해진다).
   */
  readonly effectiveAbilityModifier: number;
  /** Tier A 이벤트 폴드에서 추정한 팀 지배력 배율(예: 슛/xG 점유율 기반). `1.0` = 중립. */
  readonly teamContextModifier: number;
  /** 이 경기에서 실제로 뛴 분(0 이상, 연장 포함 120까지). 볼륨을 90분 기준에서 스케일한다. */
  readonly minutesPlayed: number;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`deriveTierBMatchStats: ${label}은 0 이상 유한수여야 합니다 (받은 값: ${value}).`);
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`deriveTierBMatchStats: ${label}은 0보다 큰 유한수여야 합니다 (받은 값: ${value}).`);
  }
}

/**
 * `matchSeed` + 선수별 컨텍스트에서 Tier B 26필드(`NO_EVENT_TYPE`)를 결정론적으로 산출한다.
 * `tier-b-resim-contract.ts`(11일차)가 고정한 타입 계약의 실제 구현체 — 같은 입력이면
 * 항상 같은 출력을 낸다(NFR-QA-003과 동일한 결정론 요구, `src/lib/sim/rng/**`의
 * `{state, value}` 스레딩 원칙을 그대로 따른다).
 *
 * @throws `context`에 `playerIndex` 중복이 있으면(시드 스트림 충돌), 또는 어느 선수의
 *   `minutesPlayed`/`teamContextModifier`가 음수·비유한수이거나 `effectiveAbilityModifier`가
 *   0 이하·비유한수이면, 또는 `options.jitterFraction`이 음수·비유한수이면 오류.
 */
export function deriveTierBMatchStats(
  matchSeed: MatchSeed,
  context: readonly TierBResimPlayerContext[],
  options: DeriveTierBMatchStatsOptions,
): ReadonlyMap<PlayerId, PlayerMatchStatTierBResimFold> {
  assertFiniteNonNegative(options.jitterFraction, 'options.jitterFraction');

  const seenPlayerIndices = new Set<number>();
  const result = new Map<PlayerId, PlayerMatchStatTierBResimFold>();

  for (const player of context) {
    if (seenPlayerIndices.has(player.playerIndex)) {
      throw new Error(
        `deriveTierBMatchStats: playerIndex ${player.playerIndex}가 중복됩니다 — 같은 경기에서 ` +
          '두 선수가 같은 시드 스트림을 공유하게 되어 상관관계가 조용히 생깁니다.',
      );
    }
    seenPlayerIndices.add(player.playerIndex);

    assertFiniteNonNegative(player.playerIndex, 'playerIndex');
    assertFiniteNonNegative(player.minutesPlayed, 'minutesPlayed');
    assertFinitePositive(player.effectiveAbilityModifier, 'effectiveAbilityModifier');
    assertFinitePositive(player.teamContextModifier, 'teamContextModifier');

    const group = tierBPositionGroupOf(player.position);
    const minutesFactor = player.minutesPlayed / 90;
    const volumeMultiplier = minutesFactor * player.effectiveAbilityModifier * player.teamContextModifier;

    const row = {} as { -readonly [K in TierBResimStatField]: number };
    let slot = 0;

    for (const field of TIER_B_INDEPENDENT_FIELDS) {
      const spec = options.expectations.independent[field];
      const expected = spec.baseRatePer90[group] * volumeMultiplier;
      const eventIndex = player.playerIndex * SLOTS_PER_PLAYER + slot;
      slot += 1;
      const state = stateForSeed(deriveEventSeed(matchSeed, TIER_B_RESIM_RESERVED_TICK, eventIndex));
      row[field] = jitteredCount(state, expected, options.jitterFraction);
    }

    for (const pair of TIER_B_PAIRED_FIELDS) {
      const spec = options.expectations.paired[pair.attempted];
      const expectedAttempted = spec.attemptedBaseRatePer90[group] * volumeMultiplier;
      const eventIndex = player.playerIndex * SLOTS_PER_PLAYER + slot;
      slot += 1;
      const state = stateForSeed(deriveEventSeed(matchSeed, TIER_B_RESIM_RESERVED_TICK, eventIndex));
      const attempted = jitteredCount(state, expectedAttempted, options.jitterFraction);

      const rate = clamp01(
        spec.completionRateBaseline[group] *
          (COMPLETION_RATE_ABILITY_INTERCEPT + COMPLETION_RATE_ABILITY_SPAN * player.effectiveAbilityModifier),
      );
      const completed = Math.round(attempted * rate);

      row[pair.attempted] = attempted;
      row[pair.completed] = completed;
    }

    result.set(player.playerId, row);
  }

  return result;
}
