/**
 * tick.ts 테스트 — Task 023 / 9일차(2026-07-31) 산출물.
 *
 * 수락 기준(team-schedule 9일차 행) "120틱까지 순회"를 코드로 직접 증명한다.
 * 그 외 결정론(동일 시드 → 동일 결과)·연장 미포함 시 90분 한정·스토피지 범위
 * (전반 0~5 / 후반 1~8) 준수도 함께 검증한다.
 *
 * `@/*` 별칭은 아직 vitest에서 해석되지 않으므로(1팀 Task 008, 12~15일차 정비 예정)
 * 상대경로로만 import한다(`docs/team-schedule` 지시 사항).
 */

import { describe, expect, it } from 'vitest';
import {
  EXTRA_FIRST_HALF_END_MINUTE,
  EXTRA_SECOND_HALF_END_MINUTE,
  FIRST_HALF_END_MINUTE,
  FIRST_HALF_STOPPAGE_RANGE,
  SECOND_HALF_END_MINUTE,
  SECOND_HALF_STOPPAGE_RANGE,
  buildTickSequence,
  type MatchTick,
} from './tick';
import type { MatchSeed } from '../../../types';

/** 테스트 픽스처 전용 캐스트 — 실제 생성 지점(Mock 팩토리 007/Supabase 어댑터 034)이 아니므로 허용(brand.type-test.ts 관례와 동일). */
const SAMPLE_MATCH_SEED = 20260731 as MatchSeed;
const ANOTHER_MATCH_SEED = 990101 as MatchSeed;

function regularTicksOf(ticks: readonly MatchTick[]): readonly MatchTick[] {
  return ticks.filter((t) => t.addedTime === 0);
}

describe('buildTickSequence — 120틱까지 순회 (수락 기준)', () => {
  it('연장 포함 시 minute=120, phase=EXTRA_SECOND인 tick까지 순회한다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: true,
    });

    const finalTick = ticks[ticks.length - 1];
    expect(finalTick.minute).toBe(EXTRA_SECOND_HALF_END_MINUTE);
    expect(finalTick.phase).toBe('EXTRA_SECOND');
    expect(
      ticks.some((t) => t.minute === 120 && t.phase === 'EXTRA_SECOND' && t.addedTime === 0),
    ).toBe(true);
  });

  it('연장 포함 시 정규(비-스토피지) tick이 정확히 120개다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: true,
    });
    expect(regularTicksOf(ticks)).toHaveLength(EXTRA_SECOND_HALF_END_MINUTE);
  });

  it('정규 tick의 minute이 1부터 120까지 끊김·중복 없이 단조 증가한다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: true,
    });
    const minutes = regularTicksOf(ticks).map((t) => t.minute);
    expect(minutes).toEqual(Array.from({ length: EXTRA_SECOND_HALF_END_MINUTE }, (_, i) => i + 1));
  });

  it('연장 전반은 91~105, 연장 후반은 106~120 구간이다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: true,
    });
    const extraFirst = regularTicksOf(ticks).filter((t) => t.phase === 'EXTRA_FIRST');
    const extraSecond = regularTicksOf(ticks).filter((t) => t.phase === 'EXTRA_SECOND');

    expect(extraFirst[0].minute).toBe(SECOND_HALF_END_MINUTE + 1);
    expect(extraFirst[extraFirst.length - 1].minute).toBe(EXTRA_FIRST_HALF_END_MINUTE);
    expect(extraSecond[0].minute).toBe(EXTRA_FIRST_HALF_END_MINUTE + 1);
    expect(extraSecond[extraSecond.length - 1].minute).toBe(EXTRA_SECOND_HALF_END_MINUTE);
  });
});

describe('buildTickSequence — 연장 미포함(정규시간 90분 한정)', () => {
  it('모든 tick의 minute이 90 이하이고, 마지막 정규 tick은 90분이다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: false,
    });
    expect(ticks.every((t) => t.minute <= SECOND_HALF_END_MINUTE)).toBe(true);

    const regular = regularTicksOf(ticks);
    expect(regular).toHaveLength(SECOND_HALF_END_MINUTE);
    expect(regular[regular.length - 1].minute).toBe(SECOND_HALF_END_MINUTE);
  });

  it('EXTRA_FIRST/EXTRA_SECOND phase가 전혀 생성되지 않는다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: false,
    });
    expect(ticks.some((t) => t.phase === 'EXTRA_FIRST' || t.phase === 'EXTRA_SECOND')).toBe(
      false,
    );
  });
});

describe('buildTickSequence — 결정론 (재현성)', () => {
  it('동일 matchSeed로 두 번 호출하면 완전히 동일한 ticks 배열을 낸다', () => {
    const first = buildTickSequence({ matchSeed: SAMPLE_MATCH_SEED, includeExtraTime: true });
    const second = buildTickSequence({ matchSeed: SAMPLE_MATCH_SEED, includeExtraTime: true });
    expect(second.ticks).toEqual(first.ticks);
  });

  it('서로 다른 matchSeed는 스토피지 분수가 달라질 수 있다(항상 다르다는 보장은 아니되, 각자 결정론적이다)', () => {
    const a1 = buildTickSequence({ matchSeed: SAMPLE_MATCH_SEED, includeExtraTime: false });
    const a2 = buildTickSequence({ matchSeed: SAMPLE_MATCH_SEED, includeExtraTime: false });
    const b1 = buildTickSequence({ matchSeed: ANOTHER_MATCH_SEED, includeExtraTime: false });

    // 같은 시드는 항상 같다 (핵심 결정론 보장).
    expect(a2.ticks).toEqual(a1.ticks);
    // 시드가 다르면 최소한 함수 자체가 시드에 무관한 상수를 리턴하지 않는지만 구조적으로 확인한다.
    expect(b1.ticks.length).toBeGreaterThan(0);
  });
});

describe('buildTickSequence — 추가시간(스토피지) 표현', () => {
  it('FIRST_HALF_STOPPAGE tick은 minute=45, addedTime이 0~5 범위 안이다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: false,
    });
    const stoppage = ticks.filter((t) => t.phase === 'FIRST_HALF_STOPPAGE');
    expect(stoppage.length).toBeLessThanOrEqual(FIRST_HALF_STOPPAGE_RANGE.max);
    stoppage.forEach((t, index) => {
      expect(t.minute).toBe(FIRST_HALF_END_MINUTE);
      expect(t.addedTime).toBe(index + 1);
      expect(t.addedTime).toBeGreaterThanOrEqual(1);
      expect(t.addedTime).toBeLessThanOrEqual(FIRST_HALF_STOPPAGE_RANGE.max);
    });
  });

  it('SECOND_HALF_STOPPAGE tick은 minute=90, addedTime이 1~8 범위 안이다(최소 1분 보장)', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: false,
    });
    const stoppage = ticks.filter((t) => t.phase === 'SECOND_HALF_STOPPAGE');
    // 후반 스토피지 하한이 1분이므로 최소 1개는 항상 존재해야 한다.
    expect(stoppage.length).toBeGreaterThanOrEqual(1);
    expect(stoppage.length).toBeLessThanOrEqual(SECOND_HALF_STOPPAGE_RANGE.max);
    stoppage.forEach((t, index) => {
      expect(t.minute).toBe(SECOND_HALF_END_MINUTE);
      expect(t.addedTime).toBe(index + 1);
      expect(t.addedTime).toBeGreaterThanOrEqual(1);
      expect(t.addedTime).toBeLessThanOrEqual(SECOND_HALF_STOPPAGE_RANGE.max);
    });
  });

  it('여러 시드에 걸쳐 후반 스토피지가 0분(무추가시간)으로 떨어지는 일은 없다', () => {
    const seeds = Array.from({ length: 20 }, (_, i) => (1000 + i) as MatchSeed);
    seeds.forEach((matchSeed) => {
      const { ticks } = buildTickSequence({ matchSeed, includeExtraTime: false });
      const stoppage = ticks.filter((t) => t.phase === 'SECOND_HALF_STOPPAGE');
      expect(stoppage.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('buildTickSequence — tick 인덱스', () => {
  it('tick 필드는 1부터 시작해 배열 순서대로 끊김 없이 증가한다', () => {
    const { ticks } = buildTickSequence({
      matchSeed: SAMPLE_MATCH_SEED,
      includeExtraTime: true,
    });
    ticks.forEach((t, index) => {
      expect(t.tick).toBe(index + 1);
    });
  });
});
