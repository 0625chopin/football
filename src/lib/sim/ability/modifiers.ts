/**
 * `src/lib/sim/ability/modifiers.ts`
 *
 * Task 024(17일차 골격) — 능력치 보정 계수 함수 9종.
 * FR-MT-004~009 계수 체인의 각 항을 담당하는 8개 개별 계수 함수와, 이들을
 * 하나의 최종 배율로 합성하는 `combineAbilityModifiers`(9번째)를 포함한다.
 *
 * ## 이 파일의 범위 (17일차 = 골격만)
 * 여기서 확정하는 것은 **시그니처 + 클램프 경계 동작**뿐이다. 각 계수의 실제
 * 공식은 이후 일차에 이 자리를 채운다 — 컨디션·피로·캐미(18일차, 동일 파일),
 * 포지션 숙련도(19일차, `position.ts` 분리 여부는 그날 재판단), 날씨·감독
 * 상성(20일차, `tactics.ts` 분리). 그때까지 8개 개별 함수는 전부 **중립값
 * 1.0을 클램프해 반환하는 자리표시자**다(`// TODO(N일차)` 주석 참조) —
 * 조기에 공식을 확정하면 그날 담당 판단을 앞질러 버리므로 의도적으로 비워
 * 둔다.
 *
 * ## 클램프 [0.35, 1.35]
 * 모든 계수(및 최종 합성값)는 이 범위를 벗어나지 않는다. 하한 0.35는
 * `match/gk-fallback.ts`의 D-22 GK 교차 배율 안전 기본값과 같은 값이다(우연이
 * 아니라 "유효 능력이 최저치에서도 0이 되지 않는다"는 동일한 설계 의도).
 * 이 경계값이 시즌마다 조정 가능한 밸런싱 파라미터(NFR-CFG-001 공통코드
 * 대상)인지, 알고리즘 불변식인지는 아직 결정되지 않았다 — 결정 전까지
 * `gk-fallback.ts`(I-83)와 동일한 패턴, 즉 **안전 기본값 export + 선택적
 * override 파라미터**로 만들어 둔다. 오케스트레이션 계층이
 * `SimConstantSnapshot`(E-44, `@/types`)에서 실제 값을 주입하기 전까지는
 * 기본값(0.35 / 1.35)을 쓴다.
 *
 * ## 확률 비교가 아님
 * 이 파일의 클램프는 `src/lib/sim/rng/precision.ts`의 확률 비교 규약
 * (NFR-DT-005, `[0,1]` 6자리 정수 단위)의 대상이 아니다 — 계수는 `[0.35, 1.35]`
 * 범위의 단순 배율이고, `Math.min`/`Math.max` 비교(둘 다 IEEE-754 표준 연산)만으로
 * 결과가 플랫폼·실행 시점과 무관하게 결정론적이다. 성공/실패 판정을 다루는
 * 확률 비교에는 여전히 `precision.ts`를 거쳐야 한다.
 */

import type { InjurySeverity, ManagerStyle, Position, WeatherType } from '@/types';

/** 계수 하한 안전 기본값 (D-22 GK 교차 배율과 동일 값, I-83 주입 패턴 참조) */
export const ABILITY_MODIFIER_MIN_DEFAULT = 0.35;
/** 계수 상한 안전 기본값 */
export const ABILITY_MODIFIER_MAX_DEFAULT = 1.35;

/**
 * 클램프 경계 오버라이드. 오케스트레이션 계층이 `SimConstantSnapshot`에서 꺼낸
 * 실제 값을 주입할 때 사용한다. 미지정 필드는 안전 기본값을 쓴다.
 */
export interface AbilityModifierClampOptions {
  readonly min?: number;
  readonly max?: number;
}

/** 공통 스텁 입력 — 모든 개별 계수 함수가 공유하는 두 번째 인자 */
type ClampOpts = AbilityModifierClampOptions | undefined;

/**
 * 계수 값을 `[min, max]`(기본 `[0.35, 1.35]`)로 클램프한다.
 *
 * 계수 체인(024)의 **유일한 클램프 진입점**이다 — 개별 계수 함수 8종과
 * 최종 합성(`combineAbilityModifiers`) 전부 이 함수를 거친다.
 *
 * @throws `value`가 유한수가 아니거나, `min > max`이면 오류.
 */
export function clampAbilityModifier(value: number, options?: AbilityModifierClampOptions): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`clampAbilityModifier: 유한한 수여야 합니다 (받은 값: ${value})`);
  }
  const min = options?.min ?? ABILITY_MODIFIER_MIN_DEFAULT;
  const max = options?.max ?? ABILITY_MODIFIER_MAX_DEFAULT;
  if (min > max) {
    throw new RangeError(`clampAbilityModifier: min(${min})이 max(${max})보다 큽니다`);
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * 골격 단계 공통 자리표시자 — 실제 공식이 채워지기 전까지 모든 개별 계수
 * 함수가 이 중립값(보정 없음)을 클램프해 반환한다.
 */
const NEUTRAL_MODIFIER = 1.0;

/** `conditionModifier` 입력 — `PlayerState.condition`(1.0~10.0) */
export interface ConditionModifierInput {
  readonly condition: number;
}

/** 컨디션 계수. TODO(18일차): `M = 0.70 + 0.30×(C−1)/9`로 교체 */
export function conditionModifier(_input: ConditionModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `fitnessModifier` 입력 — `PlayerState.fitness`(0~100) */
export interface FitnessModifierInput {
  readonly fitness: number;
}

/** 피로 계수. TODO(18일차): `M = 0.75 + 0.25×(fitness/100)`로 교체 */
export function fitnessModifier(_input: FitnessModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `injuryModifier` 입력 — 활성 부상 등급(없으면 null) */
export interface InjuryModifierInput {
  readonly severity: InjurySeverity | null;
}

/** 부상 계수. TODO: 등급별 페널티 공식 확정 후 채움 */
export function injuryModifier(_input: InjuryModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `familiarityModifier` 입력 — `PlayerState.familiaritySeasons`(연속 재직 시즌) */
export interface FamiliarityModifierInput {
  readonly familiaritySeasons: number;
}

/** 팀 캐미(재직 연차) 계수. TODO(18일차): 상한 +6%(`M ≤ 1.06`) 공식으로 교체 */
export function familiarityModifier(_input: FamiliarityModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `homeModifier` 입력 — 홈 경기 여부 */
export interface HomeModifierInput {
  readonly isHome: boolean;
}

/** 홈 이점 계수. TODO: 공식 확정 후 채움 */
export function homeModifier(_input: HomeModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `weatherModifier` 입력 — 날씨 9종 × 포지션 */
export interface WeatherModifierInput {
  readonly weather: WeatherType;
  readonly position: Position;
}

/** 날씨 계수. TODO(20일차): 공통코드 매트릭스 연동(`tactics.ts` 분리 여부 그날 재판단) */
export function weatherModifier(_input: WeatherModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `managerModifier` 입력 — 감독 성향 6종 */
export interface ManagerModifierInput {
  readonly style: ManagerStyle;
}

/** 감독 성향 계수. TODO(20일차): 6×6 상성 매트릭스 연동 */
export function managerModifier(_input: ManagerModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/** `positionModifier` 입력 — `PlayerPosition.proficiency`(1~5) */
export interface PositionModifierInput {
  readonly proficiency: number;
}

/** 포지션 숙련도 계수. TODO(19일차): BFS 인접 페널티 공식 연동(`position.ts` 분리 여부 그날 재판단) */
export function positionModifier(_input: PositionModifierInput, options?: ClampOpts): number {
  return clampAbilityModifier(NEUTRAL_MODIFIER, options);
}

/**
 * 계수 체인 합성(9번째 함수) — 개별 계수 8종(또는 그 일부)을 곱한 뒤 한 번 더
 * 클램프한다. 24일차 "계수 1.0 시 base 일치" 수락 기준의 기반이 되는 자리다.
 *
 * @throws `modifiers`가 비어 있으면 오류.
 */
export function combineAbilityModifiers(
  modifiers: readonly number[],
  options?: AbilityModifierClampOptions,
): number {
  if (modifiers.length === 0) {
    throw new RangeError('combineAbilityModifiers: modifiers는 최소 1개 이상이어야 합니다');
  }
  const product = modifiers.reduce((acc, modifier) => acc * modifier, 1);
  return clampAbilityModifier(product, options);
}
