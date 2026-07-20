import { describe, expect, it } from 'vitest';
import type { SeasonPhase } from '@/types';
import { transitionSeasonPhase, type SeasonPhaseEvent } from './phase';

describe('transitionSeasonPhase — Task 025', () => {
  it('메인 순환을 한 바퀴 전이한다: REGULAR → PLAYOFF → SETTLEMENT → PRESEASON → REGULAR', () => {
    let phase: SeasonPhase = 'REGULAR';
    phase = transitionSeasonPhase(phase, 'END_REGULAR_SEASON');
    expect(phase).toBe('PLAYOFF');
    phase = transitionSeasonPhase(phase, 'COMPLETE_PLAYOFF');
    expect(phase).toBe('SETTLEMENT');
    phase = transitionSeasonPhase(phase, 'COMPLETE_SETTLEMENT');
    expect(phase).toBe('PRESEASON');
    phase = transitionSeasonPhase(phase, 'START_NEW_SEASON');
    expect(phase).toBe('REGULAR');
  });

  it('REGULAR ⇄ CUP_SLOT을 왕복한다', () => {
    let phase: SeasonPhase = 'REGULAR';
    phase = transitionSeasonPhase(phase, 'ENTER_CUP_SLOT');
    expect(phase).toBe('CUP_SLOT');
    phase = transitionSeasonPhase(phase, 'EXIT_CUP_SLOT');
    expect(phase).toBe('REGULAR');
  });

  it('PLAYOFF → TIEBREAK → SETTLEMENT 조건부 경로를 지원한다', () => {
    let phase: SeasonPhase = 'PLAYOFF';
    phase = transitionSeasonPhase(phase, 'ENTER_TIEBREAK');
    expect(phase).toBe('TIEBREAK');
    phase = transitionSeasonPhase(phase, 'RESOLVE_TIEBREAK');
    expect(phase).toBe('SETTLEMENT');
  });

  it.each([
    ['ENTER_CUP_SLOT', 'REGULAR'],
    ['EXIT_CUP_SLOT', 'CUP_SLOT'],
    ['END_REGULAR_SEASON', 'REGULAR'],
    ['ENTER_TIEBREAK', 'PLAYOFF'],
    ['RESOLVE_TIEBREAK', 'TIEBREAK'],
    ['COMPLETE_PLAYOFF', 'PLAYOFF'],
    ['COMPLETE_SETTLEMENT', 'SETTLEMENT'],
    ['START_NEW_SEASON', 'PRESEASON'],
  ] as [SeasonPhaseEvent, SeasonPhase][])(
    '멱등 전이: %s를 같은 시작 페이즈(%s)에서 2회 호출해도 1회 호출과 결과가 같다',
    (event, startPhase) => {
      const once = transitionSeasonPhase(startPhase, event);
      const twice = transitionSeasonPhase(once, event);
      expect(twice).toBe(once);
    },
  );

  it('시작 페이즈도 목표 페이즈도 아니면 예외를 던진다', () => {
    expect(() => transitionSeasonPhase('SETTLEMENT', 'END_REGULAR_SEASON')).toThrow(
      /END_REGULAR_SEASON/,
    );
    expect(() => transitionSeasonPhase('CUP_SLOT', 'COMPLETE_SETTLEMENT')).toThrow();
  });
});
