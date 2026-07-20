/**
 * schedule.ts 테스트 — Task 035 / 32일차(2026-09-02) 산출물.
 *
 * 핵심 수락 기준(팀 일정 32일차 행): "킥오프 후 재산출 0건". `now >= kickoffAt`이면
 * 최초 산출·재산출(라인업 확정/부상 발생) 모두 항상 `shouldCompute: false`여야 한다.
 */

import { describe, expect, it } from 'vitest';
import {
  computeInitialComputeAt,
  decideInitialCompute,
  decideRecompute,
  hasKickoffPassed,
} from './schedule';

const KICKOFF = '2026-09-02T20:00:00.000Z';
const LEAD_MIN = 30;
const INITIAL_WINDOW = '2026-09-02T19:30:00.000Z'; // KICKOFF - 30min

describe('hasKickoffPassed', () => {
  it('now < kickoffAt이면 false', () => {
    expect(hasKickoffPassed('2026-09-02T19:59:59.999Z', KICKOFF)).toBe(false);
  });

  it('now === kickoffAt이면 true(등호 포함 — 킥오프 순간부터 경기 전 전제가 깨진다)', () => {
    expect(hasKickoffPassed(KICKOFF, KICKOFF)).toBe(true);
  });

  it('now > kickoffAt이면 true', () => {
    expect(hasKickoffPassed('2026-09-02T20:00:00.001Z', KICKOFF)).toBe(true);
  });

  it('유효하지 않은 ISO 문자열이면 예외를 던진다', () => {
    expect(() => hasKickoffPassed('not-a-timestamp', KICKOFF)).toThrow(/유효한 ISO 타임스탬프/);
    expect(() => hasKickoffPassed(KICKOFF, 'not-a-timestamp')).toThrow(/유효한 ISO 타임스탬프/);
  });
});

describe('computeInitialComputeAt', () => {
  it('킥오프 - leadMinutes분을 반환한다', () => {
    expect(computeInitialComputeAt(KICKOFF, LEAD_MIN)).toBe(INITIAL_WINDOW);
  });

  it('leadMinutes가 0 이하이면 예외를 던진다', () => {
    expect(() => computeInitialComputeAt(KICKOFF, 0)).toThrow(/leadMinutes는 0보다 커야/);
    expect(() => computeInitialComputeAt(KICKOFF, -5)).toThrow(/leadMinutes는 0보다 커야/);
  });
});

describe('decideInitialCompute', () => {
  it('산출 윈도(T-30분) 이전이면 BEFORE_INITIAL_WINDOW로 스킵한다', () => {
    const decision = decideInitialCompute('2026-09-02T19:29:59.999Z', KICKOFF, LEAD_MIN);
    expect(decision).toEqual({
      shouldCompute: false,
      trigger: 'INITIAL_WINDOW',
      skipReason: 'BEFORE_INITIAL_WINDOW',
    });
  });

  it('산출 윈도 도달 정각이면 실행한다', () => {
    const decision = decideInitialCompute(INITIAL_WINDOW, KICKOFF, LEAD_MIN);
    expect(decision).toEqual({ shouldCompute: true, trigger: 'INITIAL_WINDOW', skipReason: null });
  });

  it('윈도 이후 ~ 킥오프 이전이면 실행한다', () => {
    const decision = decideInitialCompute('2026-09-02T19:45:00.000Z', KICKOFF, LEAD_MIN);
    expect(decision).toEqual({ shouldCompute: true, trigger: 'INITIAL_WINDOW', skipReason: null });
  });

  it('킥오프 정각 이상이면 항상 KICKOFF_PASSED로 스킵한다(최초 산출을 뒤늦게 열지 않는다)', () => {
    const atKickoff = decideInitialCompute(KICKOFF, KICKOFF, LEAD_MIN);
    const afterKickoff = decideInitialCompute('2026-09-02T20:15:00.000Z', KICKOFF, LEAD_MIN);
    expect(atKickoff).toEqual({ shouldCompute: false, trigger: 'INITIAL_WINDOW', skipReason: 'KICKOFF_PASSED' });
    expect(afterKickoff).toEqual({
      shouldCompute: false,
      trigger: 'INITIAL_WINDOW',
      skipReason: 'KICKOFF_PASSED',
    });
  });
});

describe('decideRecompute — 핵심 수락 기준: 킥오프 후 재산출 0건', () => {
  it.each(['LINEUP_CONFIRMED', 'INJURY_OCCURRED'] as const)(
    '%s: 킥오프 이전이면 산출 윈도 도달 여부와 무관하게 재산출을 허용한다',
    (trigger) => {
      // INITIAL_WINDOW(T-30분)보다도 이른 시점(T-45분)이지만 재산출은 허용된다
      const early = decideRecompute('2026-09-02T19:15:00.000Z', KICKOFF, trigger);
      expect(early).toEqual({ shouldCompute: true, trigger, skipReason: null });

      const justBeforeKickoff = decideRecompute('2026-09-02T19:59:59.999Z', KICKOFF, trigger);
      expect(justBeforeKickoff).toEqual({ shouldCompute: true, trigger, skipReason: null });
    },
  );

  it.each(['LINEUP_CONFIRMED', 'INJURY_OCCURRED'] as const)(
    '%s: 킥오프 정각 이상이면 항상 재산출을 차단한다',
    (trigger) => {
      const atKickoff = decideRecompute(KICKOFF, KICKOFF, trigger);
      const longAfterKickoff = decideRecompute('2026-09-02T21:00:00.000Z', KICKOFF, trigger);
      expect(atKickoff).toEqual({ shouldCompute: false, trigger, skipReason: 'KICKOFF_PASSED' });
      expect(longAfterKickoff).toEqual({
        shouldCompute: false,
        trigger,
        skipReason: 'KICKOFF_PASSED',
      });
    },
  );
});
