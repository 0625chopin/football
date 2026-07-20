import { afterEach, describe, expect, it } from 'vitest';
import { invalidateConstants, setFallbackSource, setGlobalDefaultSource } from '@/lib/config/loader';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { ABILITY_MODIFIER_MAX_DEFAULT, ABILITY_MODIFIER_MIN_DEFAULT } from './modifiers';
import { managerModifier, weatherModifier } from './tactics';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
});

describe('weatherModifier — override 테이블 주입 (전역 로더 상태에 의존하지 않음)', () => {
  it('ABILITY_MULT가 숫자면 그 값을 클램프해 반환한다', () => {
    const table = { HEAVY_RAIN: { ABILITY_MULT: 0.92 } };
    expect(weatherModifier({ weather: 'HEAVY_RAIN', position: 'ST' }, { weatherEffectTable: table })).toBeCloseTo(
      0.92,
      10,
    );
  });

  it('날씨 키 자체가 테이블에 없으면 중립값(1.0)을 반환한다', () => {
    const table = { CLEAR: { ABILITY_MULT: 1.02 } };
    expect(weatherModifier({ weather: 'FOG', position: 'GK' }, { weatherEffectTable: table })).toBe(1.0);
  });

  it('ABILITY_MULT 키가 없거나 숫자가 아니면 중립값(1.0)을 반환한다', () => {
    const table = { WINDY: { OTHER_AXIS: 0.88 } };
    expect(weatherModifier({ weather: 'WINDY', position: 'RW' }, { weatherEffectTable: table })).toBe(1.0);
  });

  it('클램프 override가 테이블 조회 결과에도 적용된다', () => {
    const table = { SNOW: { ABILITY_MULT: 2 } };
    expect(
      weatherModifier({ weather: 'SNOW', position: 'CB' }, { weatherEffectTable: table, max: 1.1 }),
    ).toBe(1.1);
  });
});

describe('managerModifier — 6×6 상성 매트릭스 override 테이블 주입', () => {
  it('자기 성향×상대 성향 셀이 숫자면 그 값을 클램프해 반환한다', () => {
    const table = { COUNTER: { POSSESSION: 1.05 } };
    expect(
      managerModifier({ style: 'COUNTER', opponentStyle: 'POSSESSION' }, { matchupTable: table }),
    ).toBeCloseTo(1.05, 10);
  });

  it('자기 성향 행이 테이블에 없으면 중립값(1.0)을 반환한다', () => {
    const table = { ATTACKING: { DEFENSIVE: 1.08 } };
    expect(
      managerModifier({ style: 'BALANCED', opponentStyle: 'DEFENSIVE' }, { matchupTable: table }),
    ).toBe(1.0);
  });

  it('행은 있지만 상대 성향 열이 없으면 중립값(1.0)을 반환한다', () => {
    const table = { ATTACKING: { DEFENSIVE: 1.08 } };
    expect(
      managerModifier({ style: 'ATTACKING', opponentStyle: 'COUNTER' }, { matchupTable: table }),
    ).toBe(1.0);
  });

  it('클램프 override가 테이블 조회 결과에도 적용된다', () => {
    const table = { HIGH_PRESS: { POSSESSION: 0.2 } };
    expect(
      managerModifier(
        { style: 'HIGH_PRESS', opponentStyle: 'POSSESSION' },
        { matchupTable: table, min: 0.5 },
      ),
    ).toBe(0.5);
  });
});

describe('weatherModifier/managerModifier — 실제 로더 경유 (오버라이드 미지정, 오늘의 실제 상태)', () => {
  it('하드코딩 폴백만 설치된 오늘 상태에서는 두 그룹이 빈 객체라 중립값(1.0)을 반환한다', () => {
    installHardcodedFallback();

    expect(weatherModifier({ weather: 'HEAVY_RAIN', position: 'ST' })).toBe(1.0);
    expect(managerModifier({ style: 'COUNTER', opponentStyle: 'POSSESSION' })).toBe(1.0);
  });

  it('어떤 소스도 등록되지 않으면 ConstantSourceUnavailableError가 그대로 전파된다(삼키지 않음)', () => {
    expect(() => weatherModifier({ weather: 'CLEAR', position: 'GK' })).toThrow();
    expect(() => managerModifier({ style: 'BALANCED', opponentStyle: 'BALANCED' })).toThrow();
  });
});

describe('클램프 경계는 다른 계수 함수와 동일한 안전 기본값을 공유한다', () => {
  it('중립값(1.0)은 항상 [0.35, 1.35] 범위 안이다', () => {
    expect(1.0).toBeGreaterThanOrEqual(ABILITY_MODIFIER_MIN_DEFAULT);
    expect(1.0).toBeLessThanOrEqual(ABILITY_MODIFIER_MAX_DEFAULT);
  });
});
