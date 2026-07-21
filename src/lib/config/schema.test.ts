/**
 * schema.ts 테스트 — Task 031a / 37일차 산출물.
 *
 * NFR-CFG-004("설정 값 검증 — 잘못된 값이 저장되어 세계가 붕괴하지 않아야 한다")의 수용
 * 기준 ①(범위/스키마 메타데이터 존재)·②(범위 밖 값 거부)·③(JSON 스키마 검증)이 실제로
 * 성립하는지 검증한다.
 *
 * 이 디렉터리 테스트 관례(loader.test.ts·policy.test.ts·fallback.test.ts)를 따라
 * 상대경로 import만 사용한다.
 */

import { describe, expect, it } from 'vitest';
import { SAFE_DEFAULT_VALUES } from './fallback';
import {
  CommonCodeValidationError,
  checkCommonCodeValue,
  getJsonSchema,
  getNumericRange,
  validateCommonCodeValue,
  type CommonCodeValueCandidate,
} from './schema';

function numericCandidate(
  groupCode: CommonCodeValueCandidate['groupCode'],
  code: string,
  valueNum: number,
): CommonCodeValueCandidate {
  return { groupCode, code, valueNum, valueJson: null };
}

function jsonCandidate(
  groupCode: CommonCodeValueCandidate['groupCode'],
  code: string,
  valueJson: Readonly<Record<string, unknown>>,
): CommonCodeValueCandidate {
  return { groupCode, code, valueNum: null, valueJson };
}

describe('getNumericRange', () => {
  it('등록된 코드는 명시된 범위를 반환한다', () => {
    expect(getNumericRange('MATCH_POINTS', 'WIN')).toEqual({ min: 0, max: null });
    expect(getNumericRange('WEATHER_PROBABILITY', 'CLEAR')).toEqual({ min: 0, max: 1 });
  });

  it('등록되지 않은 코드는 무제한(min/max 둘 다 null)을 반환한다', () => {
    expect(getNumericRange('MATCH_POINTS', 'NOT_A_CODE')).toEqual({ min: null, max: null });
    expect(getNumericRange('GROWTH_AGE_FACTOR', 'ROOKIE_UP')).toEqual({ min: null, max: null });
  });
});

describe('validateCommonCodeValue — 숫자형(INT/DECIMAL)', () => {
  it('범위 안의 값은 통과한다', () => {
    expect(() => validateCommonCodeValue(numericCandidate('MATCH_POINTS', 'WIN', 3))).not.toThrow();
    expect(() =>
      validateCommonCodeValue(numericCandidate('WEATHER_PROBABILITY', 'CLEAR', 0.4)),
    ).not.toThrow();
  });

  it('경계값(min/max)은 통과한다', () => {
    expect(() =>
      validateCommonCodeValue(numericCandidate('WEATHER_PROBABILITY', 'CLEAR', 0)),
    ).not.toThrow();
    expect(() =>
      validateCommonCodeValue(numericCandidate('WEATHER_PROBABILITY', 'CLEAR', 1)),
    ).not.toThrow();
  });

  it('범위 밖 값은 저장 전 CommonCodeValidationError로 거부된다', () => {
    expect(() => validateCommonCodeValue(numericCandidate('MATCH_POINTS', 'WIN', -1))).toThrow(
      CommonCodeValidationError,
    );
    expect(() =>
      validateCommonCodeValue(numericCandidate('WEATHER_PROBABILITY', 'CLEAR', 1.5)),
    ).toThrow(CommonCodeValidationError);
    expect(() =>
      validateCommonCodeValue(numericCandidate('LEAGUE_TEAM_COUNT', 'LEAGUE_1', 1)),
    ).toThrow(CommonCodeValidationError);
  });

  it('숫자형인데 valueNum이 없으면 MISSING_VALUE로 거부된다', () => {
    const failure = checkCommonCodeValue({
      groupCode: 'MATCH_POINTS',
      code: 'WIN',
      valueNum: null,
      valueJson: null,
    });
    expect(failure).toEqual({ type: 'MISSING_VALUE', valueType: 'INT' });
  });

  it('범위가 등록되지 않은 코드는 어떤 숫자값도 통과한다(무제한)', () => {
    expect(() =>
      validateCommonCodeValue(numericCandidate('GROWTH_AGE_FACTOR', 'ROOKIE_UP', 999)),
    ).not.toThrow();
  });
});

describe('validateCommonCodeValue — JSON', () => {
  it('CUP_PARAM.BYE_COUNT는 0 이상 정수 스칼라만 통과한다', () => {
    expect(() =>
      validateCommonCodeValue(jsonCandidate('CUP_PARAM', 'BYE_COUNT', { value: 4 })),
    ).not.toThrow();
    expect(() =>
      validateCommonCodeValue(jsonCandidate('CUP_PARAM', 'BYE_COUNT', { value: -1 })),
    ).toThrow(CommonCodeValidationError);
    expect(() =>
      validateCommonCodeValue(jsonCandidate('CUP_PARAM', 'BYE_COUNT', { value: 1.5 })),
    ).toThrow(CommonCodeValidationError);
  });

  it('CUP_PARAM.INSERT_ROUNDS는 1 이상 정수 배열만 통과한다', () => {
    expect(() =>
      validateCommonCodeValue(
        jsonCandidate('CUP_PARAM', 'INSERT_ROUNDS', { value: [6, 12, 18, 24, 32, 40] }),
      ),
    ).not.toThrow();
    expect(() =>
      validateCommonCodeValue(jsonCandidate('CUP_PARAM', 'INSERT_ROUNDS', { value: [] })),
    ).toThrow(CommonCodeValidationError);
    expect(() =>
      validateCommonCodeValue(jsonCandidate('CUP_PARAM', 'INSERT_ROUNDS', { value: [0] })),
    ).toThrow(CommonCodeValidationError);
  });

  it('RATING_WEIGHT(FIELD/GK/SCALE)는 코드별 스키마가 등록되지 않아 object이기만 하면 통과한다', () => {
    // fallback.ts의 RATING_WEIGHT는 FIELD/GK/SCALE 3코드(코드→object 맵)라 이 파일의
    // "그룹→코드→스키마" 모델과 구조는 맞지만, WEATHER_EFFECT/OVR_WEIGHT/MANAGER_MATCHUP과
    // 같은 이유로 코드별 스키마를 아직 등록하지 않았다(031b 이후 점진 보강 대상) — 기본
    // 스키마(object 여부만 검사)로 폴백함을 확인한다.
    expect(getJsonSchema('RATING_WEIGHT', 'FIELD')).toEqual({ type: 'object' });
    expect(() =>
      validateCommonCodeValue(jsonCandidate('RATING_WEIGHT', 'FIELD', { goals: 1.0 })),
    ).not.toThrow();
  });

  it('MANAGER_STYLE_XG 각 성향은 두 배율 필드가 [0,3] 범위인 object만 통과한다', () => {
    expect(() =>
      validateCommonCodeValue(
        jsonCandidate('MANAGER_STYLE_XG', 'ATTACKING', {
          ownXgMultiplier: 1.12,
          concededXgMultiplier: 1.1,
        }),
      ),
    ).not.toThrow();
    expect(() =>
      validateCommonCodeValue(
        jsonCandidate('MANAGER_STYLE_XG', 'ATTACKING', { ownXgMultiplier: -1, concededXgMultiplier: 1 }),
      ),
    ).toThrow(CommonCodeValidationError);
  });

  it('스키마가 등록되지 않은 JSON형 코드는 object이기만 하면 통과한다(기본 스키마)', () => {
    expect(getJsonSchema('WEATHER_EFFECT', 'CLEAR')).toEqual({ type: 'object' });
    expect(() =>
      validateCommonCodeValue(jsonCandidate('WEATHER_EFFECT', 'CLEAR', { anything: 1 })),
    ).not.toThrow();
  });

  it('JSON형인데 valueJson이 없으면 MISSING_VALUE로 거부된다', () => {
    const failure = checkCommonCodeValue({
      groupCode: 'CUP_PARAM',
      code: 'BYE_COUNT',
      valueNum: null,
      valueJson: null,
    });
    expect(failure).toEqual({ type: 'MISSING_VALUE', valueType: 'JSON' });
  });
});

describe('SAFE_DEFAULT_VALUES ↔ schema.ts 정합성', () => {
  it('fallback.ts가 실값을 채운 그룹의 SAFE_DEFAULT_VALUES는 schema.ts 검증을 통과한다', () => {
    // 값이 실제로 채워진 그룹만 대상 — 빈 구조({})인 그룹(WEATHER_EFFECT 등)은 대상 밖.
    for (const [code, value] of Object.entries(SAFE_DEFAULT_VALUES.WEATHER_PROBABILITY)) {
      expect(() =>
        validateCommonCodeValue(numericCandidate('WEATHER_PROBABILITY', code, value)),
      ).not.toThrow();
    }
    for (const [code, value] of Object.entries(SAFE_DEFAULT_VALUES.MATCH_POINTS)) {
      expect(() => validateCommonCodeValue(numericCandidate('MATCH_POINTS', code, value))).not.toThrow();
    }
    const cupParam = SAFE_DEFAULT_VALUES.CUP_PARAM as unknown as Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >;
    for (const [code, value] of Object.entries(cupParam)) {
      expect(() => validateCommonCodeValue(jsonCandidate('CUP_PARAM', code, value))).not.toThrow();
    }
    const managerStyleXg = SAFE_DEFAULT_VALUES.MANAGER_STYLE_XG as unknown as Readonly<
      Record<string, Readonly<Record<string, unknown>>>
    >;
    for (const [code, value] of Object.entries(managerStyleXg)) {
      expect(() =>
        validateCommonCodeValue(jsonCandidate('MANAGER_STYLE_XG', code, value)),
      ).not.toThrow();
    }
  });
});
