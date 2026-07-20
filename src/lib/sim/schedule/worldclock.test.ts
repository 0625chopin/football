import { describe, expect, it } from 'vitest';
import type { Timestamp } from '@/types';
import {
  applyPause,
  applyResume,
  applySpeedChange,
  classifyWorldClockTransition,
  matchElapsedMinutesAt,
  shouldResyncWorldClock,
  worldMinutesAt,
  type WorldClockSnapshot,
} from './worldclock';

const T0: Timestamp = '2026-08-31T00:00:00.000Z';

function addMinutes(ts: Timestamp, minutes: number): Timestamp {
  return new Date(new Date(ts).getTime() + minutes * 60_000).toISOString();
}

function baseClock(overrides?: Partial<WorldClockSnapshot>): WorldClockSnapshot {
  return {
    speedMultiplier: 1,
    isPaused: false,
    pausedTotalMinutes: 0,
    speedChangedAt: T0,
    worldMinutesAtSpeedChange: 0,
    pausedAt: null,
    clockRevision: 0,
    ...overrides,
  };
}

describe('worldMinutesAt — H-24 ① 경과분 산출식', () => {
  it('배속 1일 때 실시간 경과분이 그대로 월드분이 된다', () => {
    const clock = baseClock();
    expect(worldMinutesAt(clock, addMinutes(T0, 10))).toBeCloseTo(10, 9);
  });

  it('배속 4일 때 실시간 경과분의 4배가 월드분이 된다', () => {
    const clock = baseClock({ speedMultiplier: 4 });
    expect(worldMinutesAt(clock, addMinutes(T0, 10))).toBeCloseTo(40, 9);
  });

  it('앵커(worldMinutesAtSpeedChange)가 0이 아니면 그 값 위에 더해진다', () => {
    const clock = baseClock({ worldMinutesAtSpeedChange: 500, speedMultiplier: 2 });
    expect(worldMinutesAt(clock, addMinutes(T0, 5))).toBeCloseTo(510, 9);
  });

  it('정지 중이면 now와 무관하게 동결된 worldMinutesAtSpeedChange를 반환한다', () => {
    const clock = baseClock({ isPaused: true, worldMinutesAtSpeedChange: 123 });
    expect(worldMinutesAt(clock, addMinutes(T0, 10_000))).toBe(123);
  });

  it('now가 speedChangedAt보다 앞서면 예외', () => {
    const clock = baseClock();
    expect(() => worldMinutesAt(clock, addMinutes(T0, -1))).toThrow();
  });

  it('같은 입력에는 항상 같은 출력 — 결정론', () => {
    const clock = baseClock({ speedMultiplier: 7, worldMinutesAtSpeedChange: 42 });
    const now = addMinutes(T0, 33);
    expect(worldMinutesAt(clock, now)).toBe(worldMinutesAt(clock, now));
  });
});

describe('applySpeedChange — 배속 전이', () => {
  it('전이 순간에는 월드분이 끊기지 않는다(연속성)', () => {
    const clock = baseClock({ speedMultiplier: 1 });
    const at = addMinutes(T0, 10);
    const before = worldMinutesAt(clock, at);
    const next = applySpeedChange(clock, at, 5);
    expect(worldMinutesAt(next, at)).toBeCloseTo(before, 9);
  });

  it('전이 이후에는 새 배속으로 누적된다', () => {
    const clock = baseClock({ speedMultiplier: 1 });
    const at = addMinutes(T0, 10);
    const next = applySpeedChange(clock, at, 5);
    // 전이 시점(월드분=10) + 이후 real 4분 × 배속5 = 30
    expect(worldMinutesAt(next, addMinutes(at, 4))).toBeCloseTo(30, 9);
  });

  it('clockRevision을 1 증가시킨다', () => {
    const clock = baseClock({ clockRevision: 3 });
    const next = applySpeedChange(clock, addMinutes(T0, 1), 2);
    expect(next.clockRevision).toBe(4);
  });

  it('유효 범위(0.25~20) 밖 배속은 예외', () => {
    const clock = baseClock();
    expect(() => applySpeedChange(clock, addMinutes(T0, 1), 21)).toThrow();
    expect(() => applySpeedChange(clock, addMinutes(T0, 1), 0.1)).toThrow();
  });
});

describe('applyPause / applyResume — H-24 ③ 정지 구간 오프셋 규약', () => {
  it('정지 시점의 월드분을 동결하고, 이후 실시간이 흘러도 변하지 않는다', () => {
    const clock = baseClock({ speedMultiplier: 3 });
    const pausedAt = addMinutes(T0, 10); // 월드분 30 시점
    const paused = applyPause(clock, pausedAt);
    expect(worldMinutesAt(paused, addMinutes(pausedAt, 999))).toBeCloseTo(30, 9);
  });

  it('이미 정지 중이면 no-op — 원본을 그대로 반환하고 리비전도 그대로', () => {
    const clock = baseClock({ isPaused: true, pausedAt: T0, clockRevision: 5 });
    const result = applyPause(clock, addMinutes(T0, 1));
    expect(result).toBe(clock);
    expect(result.clockRevision).toBe(5);
  });

  it('재개 시 정지 구간 실시간 길이만큼만 pausedTotalMinutes에 가산된다', () => {
    const clock = baseClock({ speedMultiplier: 2 });
    const pausedAt = addMinutes(T0, 10);
    const paused = applyPause(clock, pausedAt);
    const resumedAt = addMinutes(pausedAt, 45);
    const resumed = applyResume(paused, resumedAt);
    expect(resumed.pausedTotalMinutes).toBeCloseTo(45, 9);
    expect(resumed.isPaused).toBe(false);
    expect(resumed.pausedAt).toBeNull();
  });

  it('재개 직후에는 정지 시점의 월드분을 그대로 이어받는다(정지 구간에는 월드 시간이 흐르지 않는다)', () => {
    const clock = baseClock({ speedMultiplier: 2 });
    const pausedAt = addMinutes(T0, 10); // 월드분 20
    const paused = applyPause(clock, pausedAt);
    const resumedAt = addMinutes(pausedAt, 45);
    const resumed = applyResume(paused, resumedAt);
    expect(worldMinutesAt(resumed, resumedAt)).toBeCloseTo(20, 9);
  });

  it('재개 이후에는 재개 시점부터 다시 배속이 적용된다', () => {
    const clock = baseClock({ speedMultiplier: 2 });
    const pausedAt = addMinutes(T0, 10); // 월드분 20
    const paused = applyPause(clock, pausedAt);
    const resumedAt = addMinutes(pausedAt, 45);
    const resumed = applyResume(paused, resumedAt);
    // 월드분 20 + 재개 후 real 3분 × 배속2 = 26
    expect(worldMinutesAt(resumed, addMinutes(resumedAt, 3))).toBeCloseTo(26, 9);
  });

  it('정지 중이 아닌데 재개를 호출하면 예외', () => {
    const clock = baseClock({ isPaused: false });
    expect(() => applyResume(clock, addMinutes(T0, 1))).toThrow();
  });

  it('applyPause/applyResume 모두 clockRevision을 1 증가시킨다', () => {
    const clock = baseClock({ clockRevision: 0 });
    const paused = applyPause(clock, addMinutes(T0, 1));
    expect(paused.clockRevision).toBe(1);
    const resumed = applyResume(paused, addMinutes(T0, 5));
    expect(resumed.clockRevision).toBe(2);
  });
});

describe('matchElapsedMinutesAt — H-24 ① 진행 중 경기 경과분', () => {
  it('킥오프 이후 배속 변경 없이 경과한 만큼 그대로 반환한다', () => {
    const clockAtKickoff = baseClock({ speedMultiplier: 2, worldMinutesAtSpeedChange: 1000 });
    const kickoffAt = addMinutes(T0, 0);
    const kickoffWorldMinutes = worldMinutesAt(clockAtKickoff, kickoffAt);

    const laterNow = addMinutes(kickoffAt, 5); // real 5분 × 배속2 = 10 월드분 경과
    expect(matchElapsedMinutesAt(kickoffWorldMinutes, clockAtKickoff, laterNow)).toBeCloseTo(10, 9);
  });

  it('경기 도중 배속이 바뀌어도 킥오프 시점 앵커를 기준으로 누적 경과분을 올바르게 구한다', () => {
    const clockAtKickoff = baseClock({ speedMultiplier: 1 });
    const kickoffAt = T0;
    const kickoffWorldMinutes = worldMinutesAt(clockAtKickoff, kickoffAt);

    // 킥오프 후 real 10분 지나 배속을 1→4로 변경
    const speedChangeAt = addMinutes(kickoffAt, 10);
    const midMatchClock = applySpeedChange(clockAtKickoff, speedChangeAt, 4);

    // 이후 real 2분 더 경과(배속4) → 이 구간 월드분 8, 총 10+8=18 경과
    const now = addMinutes(speedChangeAt, 2);
    expect(matchElapsedMinutesAt(kickoffWorldMinutes, midMatchClock, now)).toBeCloseTo(18, 9);
  });
});

describe('classifyWorldClockTransition / shouldResyncWorldClock — H-24 ② 구독·재동기화 신호', () => {
  it('clockRevision이 같으면 unchanged, 재동기화 불필요', () => {
    const prev = baseClock({ clockRevision: 1 });
    const next = baseClock({ clockRevision: 1, speedMultiplier: 99 }); // 다른 필드 변화는 무시
    expect(classifyWorldClockTransition(prev, next)).toEqual({ type: 'unchanged' });
    expect(shouldResyncWorldClock(prev, next)).toBe(false);
  });

  it('정지 전이를 paused로 분류한다', () => {
    const prev = baseClock({ clockRevision: 0, isPaused: false });
    const next = applyPause(prev, addMinutes(T0, 1));
    expect(classifyWorldClockTransition(prev, next)).toEqual({ type: 'paused' });
    expect(shouldResyncWorldClock(prev, next)).toBe(true);
  });

  it('재개 전이를 resumed로 분류한다', () => {
    const paused = applyPause(baseClock(), addMinutes(T0, 1));
    const resumed = applyResume(paused, addMinutes(T0, 5));
    expect(classifyWorldClockTransition(paused, resumed)).toEqual({ type: 'resumed' });
  });

  it('배속 변경을 speed-changed(from/to 포함)로 분류한다', () => {
    const clock = baseClock({ speedMultiplier: 1 });
    const next = applySpeedChange(clock, addMinutes(T0, 1), 8);
    expect(classifyWorldClockTransition(clock, next)).toEqual({
      type: 'speed-changed',
      from: 1,
      to: 8,
    });
  });

  it('리비전만 다르고 추적 필드가 전부 같으면 revision-only', () => {
    const prev = baseClock({ clockRevision: 1 });
    const next = { ...prev, clockRevision: 2 };
    expect(classifyWorldClockTransition(prev, next)).toEqual({ type: 'revision-only' });
    expect(shouldResyncWorldClock(prev, next)).toBe(true);
  });
});
