/**
 * overround.ts 테스트 — Task 035 / 29일차(2026-08-28) 산출물.
 *
 * 핵심 수락 기준(팀 일정 29일차 행 · FR-BT-005 ①②): "클램프 경계 동작", 마켓 내
 * `Σ(1/odds)`가 1.06 ± 0.005, 확률 0 셀렉션 제외, 파라미터가 공통코드에서 로드.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource } from '@/lib/config/loader';
import { PROBABILITY_SCALE } from '@/lib/sim/rng/precision';
import { computeMarketOdds, convertProbabilityToOdds } from './overround';

const FIXED = { overround: 1.06, minOdds: 1.01, maxOdds: 500 };

afterEach(() => {
  setFallbackSource(null);
  invalidateConstants();
});

describe('convertProbabilityToOdds — 클램프 경계', () => {
  it('확률이 1에 가까워 마진 적용 배당이 하한 아래로 떨어지면 MIN_ODDS(1.01)로 클램프한다', () => {
    // p=0.999999 → fair≈1.000001 → /1.06≈0.9434(하한 미만)
    expect(convertProbabilityToOdds(999_999, FIXED)).toBe(1.01);
  });

  it('확률이 0에 가까워 배당이 상한을 넘으면 MAX_ODDS(500)로 클램프한다', () => {
    // p=0.000001 → fair=1,000,000 → /1.06≈943,396(상한 초과)
    expect(convertProbabilityToOdds(1, FIXED)).toBe(500);
  });

  it('클램프가 필요 없는 중간 확률은 원래 계산값을 소수 둘째 자리로 반올림한다', () => {
    // p=1/3 → fair=3 → /1.06≈2.830192 → 2.83
    expect(convertProbabilityToOdds(333_333, FIXED)).toBe(2.83);
  });

  it('확률 1.0(전체)은 fair odds=1 → /1.06≈0.9434, 여전히 하한 클램프된다', () => {
    expect(convertProbabilityToOdds(PROBABILITY_SCALE, FIXED)).toBe(1.01);
  });

  it('확률 0은 null을 돌려준다(마켓에서 제외 대상)', () => {
    expect(convertProbabilityToOdds(0, FIXED)).toBeNull();
  });

  it('범위를 벗어난 확률 단위(음수)는 예외를 던진다', () => {
    expect(() => convertProbabilityToOdds(-1, FIXED)).toThrow(RangeError);
  });

  it('범위를 벗어난 확률 단위(PROBABILITY_SCALE 초과)는 예외를 던진다', () => {
    expect(() => convertProbabilityToOdds(PROBABILITY_SCALE + 1, FIXED)).toThrow(RangeError);
  });

  it('정수가 아닌 확률 단위는 예외를 던진다', () => {
    expect(() => convertProbabilityToOdds(0.5, FIXED)).toThrow(RangeError);
  });
});

describe('convertProbabilityToOdds — 공통코드 기본값 (NFR-CFG-001)', () => {
  it('옵션을 생략하면 ODDS_PARAM(OVERROUND=1.06/MIN_ODDS=1.01/MAX_ODDS=500)을 로드해 사용한다', () => {
    installHardcodedFallback();
    const withDefaults = convertProbabilityToOdds(333_333);
    const withExplicit = convertProbabilityToOdds(333_333, FIXED);
    expect(withDefaults).toBe(withExplicit);
    expect(withDefaults).toBe(2.83);
  });

  it('일부 옵션만 오버라이드해도 나머지는 공통코드에서 로드한다', () => {
    installHardcodedFallback();
    // overround만 1로(마진 없음) 바꾸면 하한 클램프는 그대로 1.01을 유지해야 한다
    expect(convertProbabilityToOdds(999_999, { overround: 1 })).toBe(1.01);
  });
});

describe('computeMarketOdds — 마켓 단위 변환', () => {
  it('확률 0인 셀렉션은 결과 레코드에 키 자체가 없다(마켓에서 제외)', () => {
    const odds = computeMarketOdds({ HOME: 500_000, DRAW: 500_000, AWAY: 0 }, FIXED);
    expect(Object.keys(odds).sort()).toEqual(['DRAW', 'HOME']);
    expect(odds.AWAY).toBeUndefined();
  });

  it('3-way 균등 분포 마켓의 Σ(1/odds)는 1.06 ± 0.005다(수락 기준 ①)', () => {
    const odds = computeMarketOdds({ HOME: 333_333, DRAW: 333_333, AWAY: 333_334 }, FIXED);
    const sumInverse = 1 / odds.HOME + 1 / odds.DRAW + 1 / odds.AWAY;
    expect(Math.abs(sumInverse - 1.06)).toBeLessThanOrEqual(0.005);
  });

  it('편중된 분포(한쪽 셀렉션이 거의 전부)에서도 각 배당이 [MIN_ODDS, MAX_ODDS] 안에 있다', () => {
    const odds = computeMarketOdds({ HOME: 999_998, DRAW: 1, AWAY: 1 }, FIXED);
    for (const value of Object.values(odds)) {
      expect(value).toBeGreaterThanOrEqual(FIXED.minOdds);
      expect(value).toBeLessThanOrEqual(FIXED.maxOdds);
    }
    expect(odds.HOME).toBe(1.01);
    expect(odds.DRAW).toBe(500);
    expect(odds.AWAY).toBe(500);
  });
});
