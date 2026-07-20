/**
 * loader.ts 테스트 — Task 003 / 10일차 산출물.
 *
 * team-schedule 10일차 완료 판정 대상인 세 축(해석 우선순위, 그룹 단위 캐시, 무효화 훅)과
 * ROADMAP Task 003 수락 기준("엔진이 숫자 리터럴 대신 로더를 통해 값을 얻는 경로가
 * 타입으로 강제된다")을 각각 검증한다.
 *
 * vitest.config.ts가 아직 없어 `@/*` 별칭이 테스트에서 해석되지 않으므로(CLAUDE.md),
 * 이 파일은 상대경로 import만 사용한다.
 *
 * 모듈 스코프 전역 상태(캐시·소스·리스너)를 공유하므로 각 테스트 뒤 반드시 리셋한다.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConstantSourceUnavailableError,
  invalidateConstants,
  loadConstants,
  onConstantsInvalidated,
  setFallbackSource,
  setGlobalDefaultSource,
  type ConstantSource,
} from './loader';

function makeSource(name: string, values: Record<string, unknown>): ConstantSource {
  return {
    name,
    getGroupConstants: vi.fn(() => values as never),
  };
}

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
});

describe('해석 우선순위 — 전역 기본값 → 하드코딩 폴백', () => {
  it('전역 기본값 소스만 등록되면 그 값을 사용한다', () => {
    setGlobalDefaultSource(makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 }));

    expect(loadConstants('MATCH_POINTS')).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
  });

  it('전역 기본값과 하드코딩 폴백이 모두 등록되면 전역 기본값이 우선한다', () => {
    setGlobalDefaultSource(makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 }));
    setFallbackSource(makeSource('fallback', { WIN: 999, DRAW: 999, LOSS: 999 }));

    expect(loadConstants('MATCH_POINTS')).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
  });

  it('전역 기본값이 없고 하드코딩 폴백만 등록되면 폴백 값을 사용한다', () => {
    setFallbackSource(makeSource('fallback', { WIN: 3, DRAW: 1, LOSS: 0 }));

    expect(loadConstants('MATCH_POINTS')).toEqual({ WIN: 3, DRAW: 1, LOSS: 0 });
  });

  it('두 소스 모두 미등록이면 ConstantSourceUnavailableError를 던진다', () => {
    expect(() => loadConstants('MATCH_POINTS')).toThrow(ConstantSourceUnavailableError);

    try {
      loadConstants('MATCH_POINTS');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConstantSourceUnavailableError);
      expect((err as ConstantSourceUnavailableError).group).toBe('MATCH_POINTS');
    }
  });
});

describe('그룹 단위 캐시', () => {
  it('같은 그룹을 2회 조회해도 소스 함수는 1회만 호출된다', () => {
    const source = makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 });
    setGlobalDefaultSource(source);

    loadConstants('MATCH_POINTS');
    loadConstants('MATCH_POINTS');

    expect(source.getGroupConstants).toHaveBeenCalledTimes(1);
  });

  it('그룹이 다르면 캐시가 서로 간섭하지 않는다', () => {
    const source = makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 });
    setGlobalDefaultSource(source);
    // 같은 소스 인스턴스가 groupCode와 무관하게 항상 동일 값을 반환하도록 만들어졌으므로,
    // 서로 다른 그룹을 조회해도 소스 호출 자체는 그룹별로 각각 1회씩 발생해야 한다.
    loadConstants('MATCH_POINTS');
    loadConstants('PROMOTION_RELEGATION_SLOTS');

    expect(source.getGroupConstants).toHaveBeenCalledTimes(2);
  });
});

describe('무효화 훅', () => {
  it('invalidateConstants(group) 이후 재조회하면 소스가 다시 호출된다', () => {
    const source = makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 });
    setGlobalDefaultSource(source);

    loadConstants('MATCH_POINTS');
    invalidateConstants('MATCH_POINTS');
    loadConstants('MATCH_POINTS');

    expect(source.getGroupConstants).toHaveBeenCalledTimes(2);
  });

  it('invalidateConstants() 전체 호출은 모든 그룹 캐시를 지운다', () => {
    const source = makeSource('global', { WIN: 3, DRAW: 1, LOSS: 0 });
    setGlobalDefaultSource(source);

    loadConstants('MATCH_POINTS');
    loadConstants('PROMOTION_RELEGATION_SLOTS');
    invalidateConstants();
    loadConstants('MATCH_POINTS');
    loadConstants('PROMOTION_RELEGATION_SLOTS');

    expect(source.getGroupConstants).toHaveBeenCalledTimes(4);
  });

  it('setGlobalDefaultSource/setFallbackSource 재등록은 캐시를 자동 무효화한다', () => {
    const first = makeSource('global-1', { WIN: 3, DRAW: 1, LOSS: 0 });
    setGlobalDefaultSource(first);
    loadConstants('MATCH_POINTS');

    const second = makeSource('global-2', { WIN: 5, DRAW: 2, LOSS: 0 });
    setGlobalDefaultSource(second);

    expect(loadConstants('MATCH_POINTS')).toEqual({ WIN: 5, DRAW: 2, LOSS: 0 });
    expect(second.getGroupConstants).toHaveBeenCalledTimes(1);
  });

  it('onConstantsInvalidated로 등록한 리스너가 무효화 시 호출되고, 해제 후에는 호출되지 않는다', () => {
    const listener = vi.fn();
    const unsubscribe = onConstantsInvalidated(listener);

    invalidateConstants('MATCH_POINTS');
    expect(listener).toHaveBeenCalledWith('MATCH_POINTS');

    invalidateConstants();
    expect(listener).toHaveBeenCalledWith(undefined);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    invalidateConstants('MATCH_POINTS');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 타입 강제 확인 — 아래 함수들은 절대 호출되지 않는다(컴파일타임 검증 전용).
 * `npx tsc --noEmit`이 이 파일을 포함하므로, `@ts-expect-error`가 실제로 필요한
 * 위치에서만 성립하는지(즉 그 줄을 지우면 tsc가 진짜로 실패하는지)가 검증된다.
 * catalog.ts의 `void _assertCatalogSize;` 관례를 따라 미사용 경고를 피한다.
 * ──────────────────────────────────────────────────────────────────────── */

function _typeEnforcementCheck(): void {
  // @ts-expect-error 카탈로그에 등록되지 않은 그룹 코드는 컴파일 오류가 나야 한다(타입 강제 핵심).
  loadConstants('NOT_A_REGISTERED_GROUP_CODE');
}
void _typeEnforcementCheck;

function _typeShapeCheck(): void {
  const matchPoints = loadConstants('MATCH_POINTS'); // INT 그룹 → 값은 number
  const win: number = matchPoints.WIN;

  const weather = loadConstants('WEATHER_EFFECT'); // JSON 그룹 → 값은 Readonly<Record<string, unknown>>
  const clear: Readonly<Record<string, unknown>> = weather.CLEAR;

  // @ts-expect-error MATCH_POINTS는 INT 그룹이므로 값이 number다 — string 대입은 불가해야 한다.
  const wrongScalar: string = matchPoints.WIN;

  void win;
  void clear;
  void wrongScalar;
}
void _typeShapeCheck;
