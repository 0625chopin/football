/**
 * display.ts 테스트 — Task 035 / 34일차(2026-09-04) 산출물.
 *
 * 핵심 수락 기준(팀 일정 34일차 행): "표시 전용 플래그 동작". `bettingEnabled`가 항상
 * `false`로 고정되는지, decimal 표시 형식(Q-03)과 1X2 순서·제외 규칙(FR-BT-005)이
 * 그대로 이어지는지를 검증한다.
 */

import { describe, expect, it } from 'vitest';
import { toMatchOddsDisplayPanel, toOddsDisplayPanel } from './display';

describe('toOddsDisplayPanel — 표시 전용 플래그', () => {
  it('format은 항상 decimal, bettingEnabled는 항상 false다(FR-BT-014)', () => {
    const panel = toOddsDisplayPanel({ HOME: 2.5, DRAW: 3.2, AWAY: 2.8 });
    expect(panel.format).toBe('decimal');
    expect(panel.bettingEnabled).toBe(false);
  });

  it('빈 마켓(전 셀렉션 확률 0)도 패널 자체는 만들어지고 selections만 빈 배열이다', () => {
    const panel = toOddsDisplayPanel({});
    expect(panel.format).toBe('decimal');
    expect(panel.bettingEnabled).toBe(false);
    expect(panel.selections).toEqual([]);
  });

  it('decimal 원시값을 그대로 보존한다 — 표시 문자열은 만들지 않는다(H-09, formatOdds가 단일 경유지)', () => {
    const panel = toOddsDisplayPanel({ HOME: 2.5, DRAW: 500, AWAY: 1.01 });
    const byKey = Object.fromEntries(panel.selections.map((s) => [s.key, s]));
    expect(byKey.HOME.decimalOdds).toBe(2.5);
    expect(byKey.DRAW.decimalOdds).toBe(500);
    expect(byKey.AWAY.decimalOdds).toBe(1.01);
    expect(byKey.HOME).not.toHaveProperty('display');
  });

  it('셀렉션 키 순서를 입력 그대로 따른다(순서 보장이 필요하면 전용 함수를 쓴다)', () => {
    const panel = toOddsDisplayPanel({ AWAY: 2.8, HOME: 2.5, DRAW: 3.2 });
    expect(panel.selections.map((s) => s.key)).toEqual(['AWAY', 'HOME', 'DRAW']);
  });

  it('0 이하 또는 유한하지 않은 배당은 예외를 던진다(가짜 표시값 방지)', () => {
    expect(() => toOddsDisplayPanel({ HOME: 0 })).toThrow(RangeError);
    expect(() => toOddsDisplayPanel({ HOME: -1.5 })).toThrow(RangeError);
    expect(() => toOddsDisplayPanel({ HOME: Number.NaN })).toThrow(RangeError);
    expect(() => toOddsDisplayPanel({ HOME: Number.POSITIVE_INFINITY })).toThrow(RangeError);
  });
});

describe('toMatchOddsDisplayPanel — 경기 1X2 전용', () => {
  it('입력 키 순서와 무관하게 항상 HOME/DRAW/AWAY 순으로 정렬한다', () => {
    const panel = toMatchOddsDisplayPanel({ AWAY: 2.8, HOME: 2.5, DRAW: 3.2 });
    expect(panel.selections.map((s) => s.key)).toEqual(['HOME', 'DRAW', 'AWAY']);
  });

  it('확률 0으로 제외된 셀렉션은 결과에도 그대로 빠진다(FR-BT-005, placeholder 채우지 않음)', () => {
    const panel = toMatchOddsDisplayPanel({ HOME: 1.5, DRAW: 4.2 });
    expect(panel.selections.map((s) => s.key)).toEqual(['HOME', 'DRAW']);
    expect(panel.selections.find((s) => s.key === 'AWAY')).toBeUndefined();
  });

  it('bettingEnabled는 1X2 전용 함수에서도 항상 false다(FR-BT-014)', () => {
    const panel = toMatchOddsDisplayPanel({ HOME: 1.5, DRAW: 4.2, AWAY: 6.0 });
    expect(panel.bettingEnabled).toBe(false);
    expect(panel.format).toBe('decimal');
  });

  it('셀렉션이 하나뿐이어도(극단적 편중) 순서 필터가 정상 동작한다', () => {
    const panel = toMatchOddsDisplayPanel({ DRAW: 500 });
    expect(panel.selections).toEqual([{ key: 'DRAW', decimalOdds: 500 }]);
  });
});
