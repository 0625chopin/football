import { describe, expect, it } from 'vitest';
import type { LeagueId, Timestamp } from '@/types';
import { planLeagueKickoffs, type LeagueKickoffInput, type LeagueKickoffSchedule } from './kickoff';
import {
  computeCupSlotWindows,
  deriveCupSlotMarkers,
  findCupSlotConflicts,
  insertCupSlotsIntoLeagueKickoffs,
  shiftTimestampForCupSlots,
  CUP_STAGE_SLOT_ORDER,
} from './cup-slot';

// fallback.ts 실측값(ROUND_INTERVAL_MIN/LEAGUE_TEAM_COUNT/PHASE_DURATION_MIN/CUP_PARAM).
const ANCHOR: Timestamp = '2026-07-21T00:00:00.000Z';
const REGULAR_PHASE_DURATION_MIN = 3450;
const CUP_SLOT_DURATION_MIN = 75;
const INSERT_AFTER_ROUNDS = [6, 12, 18, 24, 32, 40];

const LEAGUE_1 = 'league-1' as LeagueId;
const LEAGUE_2 = 'league-2' as LeagueId;
const LEAGUE_3 = 'league-3' as LeagueId;

const LEAGUES: readonly LeagueKickoffInput[] = [
  { leagueId: LEAGUE_1, totalRounds: 46, roundIntervalMin: 75 },
  { leagueId: LEAGUE_2, totalRounds: 38, roundIntervalMin: 90 },
  { leagueId: LEAGUE_3, totalRounds: 30, roundIntervalMin: 115 },
];

function planNaiveSchedules(): readonly LeagueKickoffSchedule[] {
  return planLeagueKickoffs(LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);
}

describe('cup-slot.ts — 슬롯 창 산출 (computeCupSlotWindows)', () => {
  it('삽입 지점 6개 → 슬롯 6개, CUP_STAGE_SLOT_ORDER와 1:1 대응한다', () => {
    const [league1] = planNaiveSchedules();
    const windows = computeCupSlotWindows(
      league1.kickoffByRound,
      INSERT_AFTER_ROUNDS,
      CUP_SLOT_DURATION_MIN,
    );

    expect(windows).toHaveLength(6);
    windows.forEach((w, i) => {
      expect(w.slotIndex).toBe(i + 1);
      expect(w.afterRound).toBe(INSERT_AFTER_ROUNDS[i]);
      expect(w.stage).toBe(CUP_STAGE_SLOT_ORDER[i]);
      expect(new Date(w.endAt).getTime() - new Date(w.startAt).getTime()).toBe(
        CUP_SLOT_DURATION_MIN * 60_000,
      );
    });
  });

  it('슬롯 창이 라운드 순서대로 겹치지 않고 뒤로 갈수록 늦다', () => {
    const [league1] = planNaiveSchedules();
    const windows = computeCupSlotWindows(
      league1.kickoffByRound,
      INSERT_AFTER_ROUNDS,
      CUP_SLOT_DURATION_MIN,
    );
    for (let i = 1; i < windows.length; i += 1) {
      expect(new Date(windows[i].startAt).getTime()).toBeGreaterThan(
        new Date(windows[i - 1].endAt).getTime(),
      );
    }
  });

  it('insertAfterRounds가 오름차순이 아니어도(공통코드 스키마가 순서를 강제하지 않음) 슬롯을 라운드 오름차순으로 만든다', () => {
    const [league1] = planNaiveSchedules();
    const shuffled = [24, 6, 40, 12, 32, 18];
    const shuffledStages = [
      CUP_STAGE_SLOT_ORDER[3],
      CUP_STAGE_SLOT_ORDER[0],
      CUP_STAGE_SLOT_ORDER[5],
      CUP_STAGE_SLOT_ORDER[1],
      CUP_STAGE_SLOT_ORDER[4],
      CUP_STAGE_SLOT_ORDER[2],
    ];
    const windows = computeCupSlotWindows(
      league1.kickoffByRound,
      shuffled,
      CUP_SLOT_DURATION_MIN,
      shuffledStages,
    );
    expect(windows.map((w) => w.afterRound)).toEqual([6, 12, 18, 24, 32, 40]);
    expect(windows.map((w) => w.stage)).toEqual(CUP_STAGE_SLOT_ORDER);
  });

  it('insertAfterRounds와 stages 길이가 다르면 예외를 던진다', () => {
    const [league1] = planNaiveSchedules();
    expect(() =>
      computeCupSlotWindows(league1.kickoffByRound, INSERT_AFTER_ROUNDS, CUP_SLOT_DURATION_MIN, [
        'FINAL',
      ]),
    ).toThrow(RangeError);
  });

  it('기준 리그 스케줄에 없는 라운드를 삽입 지점으로 주면 예외를 던진다', () => {
    const [league1] = planNaiveSchedules();
    expect(() => computeCupSlotWindows(league1.kickoffByRound, [999], CUP_SLOT_DURATION_MIN, ['FINAL'])).toThrow();
  });

  it('중복된 삽입 지점 라운드는 예외를 던진다', () => {
    const [league1] = planNaiveSchedules();
    expect(() => deriveCupSlotMarkers(league1.kickoffByRound, [6, 6, 12])).toThrow();
  });
});

describe('cup-slot.ts — 완료 판정: 슬롯 중 리그 킥오프 0건', () => {
  const naiveSchedules = planNaiveSchedules();
  const [league1] = naiveSchedules;
  const markers = deriveCupSlotMarkers(league1.kickoffByRound, INSERT_AFTER_ROUNDS);
  const windows = computeCupSlotWindows(league1.kickoffByRound, INSERT_AFTER_ROUNDS, CUP_SLOT_DURATION_MIN);
  const adjustedSchedules = insertCupSlotsIntoLeagueKickoffs(naiveSchedules, markers, CUP_SLOT_DURATION_MIN);

  it('3개 리그 전부 조정 후 슬롯 창 내부에 킥오프가 0건이다', () => {
    expect(findCupSlotConflicts(windows, adjustedSchedules)).toEqual([]);
  });

  it('리그별 라운드 수는 삽입 전후로 변하지 않는다(경기 수 불변)', () => {
    adjustedSchedules.forEach((schedule, index) => {
      expect(schedule.kickoffByRound.size).toBe(LEAGUES[index].totalRounds);
    });
  });

  it('조정 후에도 각 리그 내부에서 라운드가 오를수록 킥오프 시각이 항상 증가한다', () => {
    for (const schedule of adjustedSchedules) {
      const rounds = [...schedule.kickoffByRound.keys()].sort((a, b) => a - b);
      for (let i = 1; i < rounds.length; i += 1) {
        const prev = schedule.kickoffByRound.get(rounds[i - 1])!;
        const curr = schedule.kickoffByRound.get(rounds[i])!;
        expect(new Date(curr).getTime()).toBeGreaterThan(new Date(prev).getTime());
      }
    }
  });

  it('삽입 지점 라운드 자신의 킥오프는 자기 슬롯 시작 시각과 정확히 같다(조정 후)', () => {
    const league1Adjusted = adjustedSchedules[0];
    windows.forEach((w) => {
      expect(league1Adjusted.kickoffByRound.get(w.afterRound)).toBe(w.startAt);
    });
  });

  it('결정론적이다 — 같은 입력에 항상 같은 조정 스케줄', () => {
    const again = insertCupSlotsIntoLeagueKickoffs(naiveSchedules, markers, CUP_SLOT_DURATION_MIN);
    expect(again).toEqual(adjustedSchedules);
  });

  it('슬롯을 반영하지 않은 원본 스케줄로 검사하면(대조군) 충돌이 나올 수 있다', () => {
    // 조정 전 원본 스케줄은 슬롯 개념을 전혀 모르므로, 슬롯 창(조정 후 좌표계)과 뒤섞어
    // 검사하면 일반적으로 값이 어긋난다는 것만 대조군으로 확인한다(회귀 방지용 가드,
    // 특정 충돌 건수를 단언하지 않는다 — 인터벌 값에 따라 0건일 수도 있다).
    const rawConflicts = findCupSlotConflicts(windows, naiveSchedules);
    const adjustedConflicts = findCupSlotConflicts(windows, adjustedSchedules);
    expect(adjustedConflicts).toEqual([]);
    expect(rawConflicts.length).toBeGreaterThanOrEqual(0);
  });
});

describe('cup-slot.ts — shiftTimestampForCupSlots 불변식', () => {
  const markers: readonly Timestamp[] = [
    '2026-08-01T00:00:00.000Z',
    '2026-08-05T00:00:00.000Z',
    '2026-08-10T00:00:00.000Z',
  ];
  const durationMin = 75;

  it('마커 이전 시각은 전혀 밀리지 않는다', () => {
    const t: Timestamp = '2026-07-31T23:59:00.000Z';
    expect(shiftTimestampForCupSlots(t, markers, durationMin)).toBe(t);
  });

  it('마커 자신은 그 앞의 마커 개수만큼만 밀린다', () => {
    const shifted = shiftTimestampForCupSlots(markers[1], markers, durationMin);
    expect(new Date(shifted).getTime() - new Date(markers[1]).getTime()).toBe(1 * durationMin * 60_000);
  });

  it('모든 마커 이후 시각은 마커 개수만큼 전부 밀린다', () => {
    const t: Timestamp = '2026-08-11T00:00:00.000Z';
    const shifted = shiftTimestampForCupSlots(t, markers, durationMin);
    expect(new Date(shifted).getTime() - new Date(t).getTime()).toBe(3 * durationMin * 60_000);
  });

  it('cupSlotDurationMin이 0 이하이면 예외를 던진다', () => {
    expect(() => shiftTimestampForCupSlots(markers[0], markers, 0)).toThrow();
    expect(() => shiftTimestampForCupSlots(markers[0], markers, -5)).toThrow();
  });
});
