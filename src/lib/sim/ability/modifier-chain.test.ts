/**
 * `src/lib/sim/ability/modifier-chain.test.ts` — Task 024 / 23일차 산출물.
 *
 * 완료 판정(team-schedule 23일차 행) "전 계수 1.0 강제 시 base 일치"를 직접 고정한다.
 * `modifiers.test.ts`의 `combineAbilityModifiers` 테스트는 리터럴 `1.0` 배열을 합성해
 * 클램프 진입점만 검증했다 — 이 파일은 핵심 9개 함수 중 **8개 개별 계수 함수를 실제로
 * 호출**해 각각 중립 입력(보정 없음)을 넣었을 때 1.0이 나오는지, 그 8개 실측값을
 * `combineAbilityModifiers`로 합성한 결과가 base(1.0)와 일치하는지를 함께 검증한다.
 * 24일차 "계수 체인 통합 검증"의 실제 배선(오케스트레이션)이 아니라, 그 전 단계로
 * 각 함수가 자기 자리에서 중립을 지키는지 확인하는 테스트다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerId } from '@/types';
import { invalidateConstants, setFallbackSource, setGlobalDefaultSource } from '@/lib/config/loader';
import {
  combineAbilityModifiers,
  conditionModifier,
  familiarityModifier,
  fitnessModifier,
  homeModifier,
  injuryModifier,
} from './modifiers';
import { positionModifier } from './position';
import { managerModifier, weatherModifier } from './tactics';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
});

const PLAYER_ID = 'player-1' as PlayerId;

describe('8개 개별 계수 함수 — 각각 중립 입력 시 1.0 (전 계수 1.0 강제, 23일차 수락 기준)', () => {
  it('conditionModifier(condition=10) → 1.0', () => {
    expect(conditionModifier({ condition: 10 })).toBe(1.0);
  });

  it('fitnessModifier(fitness=100) → 1.0', () => {
    expect(fitnessModifier({ fitness: 100 })).toBe(1.0);
  });

  it('injuryModifier(severity=null) → 1.0 (골격 단계 자리표시자)', () => {
    expect(injuryModifier({ severity: null })).toBe(1.0);
  });

  it('familiarityModifier(familiaritySeasons=0) → 1.0', () => {
    expect(familiarityModifier({ familiaritySeasons: 0 })).toBe(1.0);
  });

  it('homeModifier(isHome=false) → 1.0 (골격 단계 자리표시자)', () => {
    expect(homeModifier({ isHome: false })).toBe(1.0);
  });

  it('positionModifier(보유 포지션, proficiency=5) → 1.0', () => {
    expect(
      positionModifier({
        assignedPosition: 'CM',
        playerPositions: [{ playerId: PLAYER_ID, position: 'CM', proficiency: 5 }],
      }),
    ).toBe(1.0);
  });

  it("weatherModifier(ABILITY_MULT=1.0 테이블) → 1.0", () => {
    const table = { CLEAR: { ABILITY_MULT: 1.0 } };
    expect(weatherModifier({ weather: 'CLEAR', position: 'ST' }, { weatherEffectTable: table })).toBe(1.0);
  });

  it('managerModifier(상성 셀 1.0 테이블) → 1.0', () => {
    const table = { BALANCED: { BALANCED: 1.0 } };
    expect(managerModifier({ style: 'BALANCED', opponentStyle: 'BALANCED' }, { matchupTable: table })).toBe(
      1.0,
    );
  });
});

describe('combineAbilityModifiers — 8개 실측값 합성이 base(1.0)와 일치 (23일차 수락 기준)', () => {
  function computeAllNeutralModifiers(): number[] {
    return [
      conditionModifier({ condition: 10 }),
      fitnessModifier({ fitness: 100 }),
      injuryModifier({ severity: null }),
      familiarityModifier({ familiaritySeasons: 0 }),
      homeModifier({ isHome: false }),
      positionModifier({
        assignedPosition: 'CM',
        playerPositions: [{ playerId: PLAYER_ID, position: 'CM', proficiency: 5 }],
      }),
      weatherModifier(
        { weather: 'CLEAR', position: 'ST' },
        { weatherEffectTable: { CLEAR: { ABILITY_MULT: 1.0 } } },
      ),
      managerModifier(
        { style: 'BALANCED', opponentStyle: 'BALANCED' },
        { matchupTable: { BALANCED: { BALANCED: 1.0 } } },
      ),
    ];
  }

  it('8개 계수를 전부 1.0으로 강제하면 합성 결과도 base(1.0)와 일치한다', () => {
    const modifiers = computeAllNeutralModifiers();
    expect(modifiers).toHaveLength(8);
    expect(combineAbilityModifiers(modifiers)).toBe(1.0);
  });

  it('클램프 override가 이 체인 결과에도 적용된다', () => {
    const modifiers = computeAllNeutralModifiers();
    expect(combineAbilityModifiers(modifiers, { max: 0.9 })).toBe(0.9);
  });
});
