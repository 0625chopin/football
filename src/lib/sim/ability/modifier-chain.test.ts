/**
 * `src/lib/sim/ability/modifier-chain.test.ts` — Task 024 / 23~24일차 산출물.
 *
 * 완료 판정(team-schedule 23일차 행) "전 계수 1.0 강제 시 base 일치"를 직접 고정한다.
 * `modifiers.test.ts`의 `combineAbilityModifiers` 테스트는 리터럴 `1.0` 배열을 합성해
 * 클램프 진입점만 검증했다 — 이 파일은 핵심 9개 함수 중 **8개 개별 계수 함수를 실제로
 * 호출**해 각각 중립 입력(보정 없음)을 넣었을 때 1.0이 나오는지, 그 8개 실측값을
 * `combineAbilityModifiers`로 합성한 결과가 base(1.0)와 일치하는지를 함께 검증한다.
 * 23일차 시점에는 "각 함수가 자기 자리에서 중립을 지키는지"만 봤고, `weatherModifier`/
 * `managerModifier`는 테스트가 직접 주입한 리터럴 테이블(`{ CLEAR: { ABILITY_MULT: 1.0 } }`)로
 * 검증해 **실제 공통코드 로더 경로를 타지 않았다**.
 *
 * ## 24일차 추가분 — "계수 체인 통합 검증"
 * 아래 두 번째 `describe` 블록은 오케스트레이션 계층이 실제로 쓰는 경로, 즉
 * `installHardcodedFallback()`으로 등록되는 `@/lib/config/fallback`의
 * `hardcodedFallbackSource`를 통해 `weatherModifier`/`managerModifier`가 `loadConstants`를
 * 직접 호출하는 실제 배선을 검증한다. `WEATHER_EFFECT`/`MANAGER_MATCHUP`은 그 소스에서도
 * 빈 객체(`{}`, "억측 금지" 원칙 — 파일 헤더 참조)이므로, 오버라이드 테이블 없이도 두 함수가
 * `NEUTRAL_MODIFIER`(1.0)로 안전 폴백해 체인 전체가 여전히 base(1.0)로 합성되는지, 그리고
 * `ConstantSourceUnavailableError`가 던져지지 않는지를 함께 고정한다. 이 값들이 36일차
 * (031a) 실제 구조로 채워지면 이 테스트의 "1.0 유지" 전제가 깨질 수 있으므로, 그 시점에
 * 함께 갱신해야 한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerId } from '@/types';
import { installHardcodedFallback } from '@/lib/config/fallback';
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

describe('실 공통코드 로더 경로 통합 검증 (24일차 "계수 체인 통합 검증")', () => {
  it('installHardcodedFallback() 등록 후 오버라이드 테이블 없이도 8개 계수 합성이 base(1.0)와 일치한다', () => {
    installHardcodedFallback();

    const modifiers = [
      conditionModifier({ condition: 10 }),
      fitnessModifier({ fitness: 100 }),
      injuryModifier({ severity: null }),
      familiarityModifier({ familiaritySeasons: 0 }),
      homeModifier({ isHome: false }),
      positionModifier({
        assignedPosition: 'CM',
        playerPositions: [{ playerId: PLAYER_ID, position: 'CM', proficiency: 5 }],
      }),
      // 오버라이드 테이블을 주지 않는다 — hardcodedFallbackSource의 WEATHER_EFFECT
      // 빈 객체를 실제로 거쳐 NEUTRAL_MODIFIER 폴백이 일어나는지 검증한다.
      weatherModifier({ weather: 'CLEAR', position: 'ST' }),
      managerModifier({ style: 'BALANCED', opponentStyle: 'BALANCED' }),
    ];

    expect(modifiers).toHaveLength(8);
    expect(modifiers.every((m) => m === 1.0)).toBe(true);
    expect(combineAbilityModifiers(modifiers)).toBe(1.0);
  });
});
