/**
 * fallback.ts 테스트 — Task 003 / 11일차 산출물.
 *
 * NFR-CFG-005("공통코드가 미등록·손상되어도 시스템이 정지하지 않는다")와 AS-13(폴백 시
 * WARN 로그)이 실제로 성립하는지, 그리고 38개 그룹 커버리지를 검증한다(14일차 I-88
 * 사용자 결정으로 `NATIONALITY_WEIGHT` 그룹 추가, 36→37 / 31일차 I-160 반영으로
 * `MANAGER_STYLE_XG` 그룹 추가, 37→38).
 *
 * vitest.config.ts가 아직 없어 `@/*` 별칭이 테스트에서 해석되지 않으므로(CLAUDE.md),
 * 이 파일은 상대경로 import만 사용한다(loader.test.ts 관례).
 *
 * 모듈 스코프 전역 상태(loader.ts의 캐시·소스)를 공유하므로 각 테스트 뒤 반드시 리셋한다.
 *
 * 42일차 추가: `warnFallbackUsed`가 그룹별 "최초 1회만 WARN"으로 바뀌면서
 * (`obs/alert.ts`의 `FallbackWarnRecorder` 경유, I-206 대응) 그 누적 상태도 모듈 스코프
 * 전역이므로 같은 이유로 매 테스트 뒤 `resetFallbackWarnTracking()`으로 리셋한다 —
 * 리셋하지 않으면 같은 그룹을 두 번째로 조회하는 테스트에서 `console.warn`이 호출되지
 * 않아(이미 첫 WARN을 다른 테스트가 소비한 상태) 테스트 순서에 결과가 좌우된다.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from './catalog';
import {
  SAFE_DEFAULT_VALUES,
  hardcodedFallbackSource,
  installHardcodedFallback,
  resetFallbackWarnTracking,
} from './fallback';
import { invalidateConstants, loadConstants, setFallbackSource, setGlobalDefaultSource } from './loader';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
  resetFallbackWarnTracking();
  vi.restoreAllMocks();
});

describe('SAFE_DEFAULT_VALUES 커버리지', () => {
  it('38개 그룹 전량에 안전 기본값 키가 존재한다', () => {
    const groupCodes = COMMON_CODE_GROUP_CATALOG.map((g) => g.groupCode);
    expect(groupCodes).toHaveLength(38);

    for (const code of groupCodes) {
      expect(Object.prototype.hasOwnProperty.call(SAFE_DEFAULT_VALUES, code)).toBe(true);
    }
  });
});

describe('hardcodedFallbackSource', () => {
  it('등록된 그룹의 값을 반환하고 WARN 로그를 남긴다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const value = hardcodedFallbackSource.getGroupConstants('MATCH_POINTS');

    expect(value).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toContain('MATCH_POINTS');
  });

  it('알 수 없는 그룹코드를 넘기면 undefined를 반환하고 WARN 로그를 남기지 않는다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const value = hardcodedFallbackSource.getGroupConstants(
      'NOT_A_REGISTERED_GROUP_CODE' as CommonCodeGroupCode,
    );

    expect(value).toBeUndefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('installHardcodedFallback', () => {
  it('전역 기본값 소스가 없으면 하드코딩 폴백 값을 사용한다(시스템 미정지)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    installHardcodedFallback();

    expect(loadConstants('SQUAD_PARAM')).toEqual({
      MIN: 22,
      MAX: 30,
      HARD_MIN: 18,
      GK_MIN: 2,
      CB_MIN: 3,
    });
  });

  it('전역 기본값 소스가 있으면 그 값이 우선하고 하드코딩 폴백은 쓰이지 않는다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setGlobalDefaultSource({
      name: 'global',
      getGroupConstants: () => ({ WIN: 999, DRAW: 999, LOSS: 999 }),
    });

    installHardcodedFallback();

    expect(loadConstants('MATCH_POINTS')).toEqual({ WIN: 999, DRAW: 999, LOSS: 999 });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('UI_PARAM 폴백값은 정상 운영값(5초/3초)이 아니라 비용 안전망(30초/15초)이다', () => {
    // 팀장 결정(11일차 2차 교차 점검, docs/business/03-budget-plan.md §2.5) — 공통코드
    // 조회 실패 시 가장 비싼 설정(5초=월 $133.7)으로 폴백하는 역전을 막기 위한 값.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    installHardcodedFallback();

    expect(loadConstants('UI_PARAM')).toEqual({
      POLL_INTERVAL_MS: 30000,
      POLL_LIVE_MS: 15000,
      LEADERBOARD_MIN_APPEARANCE_PCT: 30,
    });
  });

  it('RATING_WEIGHT는 { FIELD, GK, SCALE } 3코드이고 FR-ST-003 명시 6개 스탯 키가 FIELD/GK 모두에 있다(I-187, 37일차)', () => {
    // 2팀 rating.ts의 RatingWeightConstants/RatingWeightTable과 동일한 키 공간
    // (keyof PlayerStatCoreValues)을 쓴다는 접점 계약 — 이 파일은 상대경로 import
    // 관례상 `@/types`를 참조하지 않으므로 FR-ST-003 원문 명시 6개 필드명을 하드코딩한다.
    // 최상위가 FIELD/GK/SCALE 3코드인 이유는 fallback.ts의 SAFE_DEFAULT_VALUES JSDoc
    // "RATING_WEIGHT 저장 형태" 절 참조(코드→object 맵만 허용되는 공통코드 모델 제약).
    const FR_ST_003_EXPLICIT_STAT_KEYS = [
      'goals', // "골 +1.0"
      'assists', // "도움 +0.7"
      'keyPasses', // "키패스 +0.1"
      'errorsLeadingToGoal', // "실책-실점 −1.0"
      'yellowCards', // "경고 −0.3"
      'redCards', // "퇴장 −1.0"
    ] as const;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    installHardcodedFallback();

    const ratingWeight = loadConstants('RATING_WEIGHT') as unknown as {
      FIELD: Record<string, number>;
      GK: Record<string, number>;
      SCALE: { base: number; min: number; max: number };
    };

    // FR-ST-003 "기본 6.0에서 시작해 ... [1.0, 10.0]으로 클램프한다"
    expect(ratingWeight.SCALE.base).toBe(6.0);
    expect(ratingWeight.SCALE.min).toBe(1.0);
    expect(ratingWeight.SCALE.max).toBe(10.0);

    for (const table of [ratingWeight.FIELD, ratingWeight.GK]) {
      for (const key of FR_ST_003_EXPLICIT_STAT_KEYS) {
        expect(table).toHaveProperty(key);
        expect(typeof table[key]).toBe('number');
      }
    }
    expect(ratingWeight.FIELD.goals).toBe(1.0);
    expect(ratingWeight.FIELD.assists).toBe(0.7);
    expect(ratingWeight.FIELD.keyPasses).toBe(0.1);
    expect(ratingWeight.FIELD.errorsLeadingToGoal).toBe(-1.0);
    expect(ratingWeight.FIELD.yellowCards).toBe(-0.3);
    expect(ratingWeight.FIELD.redCards).toBe(-1.0);
  });
});
