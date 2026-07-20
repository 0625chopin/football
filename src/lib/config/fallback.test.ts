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
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from './catalog';
import {
  SAFE_DEFAULT_VALUES,
  hardcodedFallbackSource,
  installHardcodedFallback,
} from './fallback';
import { invalidateConstants, loadConstants, setFallbackSource, setGlobalDefaultSource } from './loader';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
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
});
