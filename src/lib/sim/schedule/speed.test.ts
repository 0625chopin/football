import { describe, expect, it } from 'vitest';
import type { LeagueId, Timestamp } from '@/types';
import { planLeagueKickoffs, type LeagueKickoffInput } from './kickoff';
import {
  rescaleKickoffsForSpeedChange,
  rescaleLeagueKickoffsForSpeedChange,
  rescheduleKickoffsForPauseResume,
  rescheduleLeagueKickoffsForPauseResume,
  type PauseResumeWindow,
  type SpeedChangeContext,
} from './speed';

const ANCHOR: Timestamp = '2026-08-26T00:00:00.000Z';
const REGULAR_PHASE_DURATION_MIN = 3450;

const LEAGUES: readonly LeagueKickoffInput[] = [
  { leagueId: 'league-1' as LeagueId, totalRounds: 46, roundIntervalMin: 75 },
  { leagueId: 'league-2' as LeagueId, totalRounds: 38, roundIntervalMin: 90 },
  { leagueId: 'league-3' as LeagueId, totalRounds: 30, roundIntervalMin: 115 },
];

function minutesFromAnchor(ts: Timestamp): number {
  return (new Date(ts).getTime() - new Date(ANCHOR).getTime()) / 60_000;
}

describe('rescaleKickoffsForSpeedChange — 배속 변경 비례 재계산', () => {
  const [schedule] = planLeagueKickoffs(
    [LEAGUES[0]],
    ANCHOR,
    REGULAR_PHASE_DURATION_MIN,
  );

  it('referenceNow 이전(포함) 킥오프는 그대로 둔다', () => {
    const referenceNow = new Date(
      new Date(ANCHOR).getTime() + REGULAR_PHASE_DURATION_MIN * 60_000,
    ).toISOString();
    const context: SpeedChangeContext = {
      referenceNow,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 4,
    };
    const rescaled = rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context);
    // 마지막 라운드 킥오프는 정확히 referenceNow이므로 <= 조건으로 "이미 지남" 취급되어 불변.
    expect(rescaled.get(LEAGUES[0].totalRounds)).toBe(
      schedule.kickoffByRound.get(LEAGUES[0].totalRounds),
    );
  });

  it('배속을 4배로 올리면 남은 실시간이 1/4로 압축된다', () => {
    const referenceNow = ANCHOR; // 시작 시점 기준 — 1라운드 이후 전부 "미래"
    const context: SpeedChangeContext = {
      referenceNow,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 4,
    };
    const rescaled = rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context);

    const originalLastMin = minutesFromAnchor(
      schedule.kickoffByRound.get(LEAGUES[0].totalRounds)!,
    );
    const rescaledLastMin = minutesFromAnchor(rescaled.get(LEAGUES[0].totalRounds)!);
    expect(rescaledLastMin).toBeCloseTo(originalLastMin / 4, 6);
  });

  it('배속을 0.5배로 내리면 남은 실시간이 2배로 늘어난다', () => {
    const referenceNow = ANCHOR;
    const context: SpeedChangeContext = {
      referenceNow,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 0.5,
    };
    const rescaled = rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context);

    const originalFirstMin = minutesFromAnchor(schedule.kickoffByRound.get(1)!);
    const rescaledFirstMin = minutesFromAnchor(rescaled.get(1)!);
    expect(rescaledFirstMin).toBeCloseTo(originalFirstMin * 2, 6);
  });

  it('배속 범위(0.25~20) 밖이면 예외', () => {
    const context: SpeedChangeContext = {
      referenceNow: ANCHOR,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 21,
    };
    expect(() => rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context)).toThrow();

    expect(() =>
      rescaleKickoffsForSpeedChange(schedule.kickoffByRound, {
        referenceNow: ANCHOR,
        oldSpeedMultiplier: 0.1,
        newSpeedMultiplier: 1,
      }),
    ).toThrow();
  });

  it('재계산 후에도 라운드가 올라갈수록 킥오프 시각이 항상 증가한다', () => {
    const context: SpeedChangeContext = {
      referenceNow: ANCHOR,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 8,
    };
    const rescaled = rescaleKickoffsForSpeedChange(schedule.kickoffByRound, context);
    const rounds = [...rescaled.keys()].sort((a, b) => a - b);
    for (let i = 1; i < rounds.length; i += 1) {
      const prev = rescaled.get(rounds[i - 1])!;
      const curr = rescaled.get(rounds[i])!;
      expect(new Date(curr).getTime()).toBeGreaterThan(new Date(prev).getTime());
    }
  });
});

describe('rescheduleKickoffsForPauseResume — 정지/재개 오프셋', () => {
  const [schedule] = planLeagueKickoffs(
    [LEAGUES[0]],
    ANCHOR,
    REGULAR_PHASE_DURATION_MIN,
  );

  it('정지 이전 킥오프는 그대로 두고, 이후 킥오프는 정지 길이만큼 뒤로 밀린다', () => {
    const pausedAt = new Date(new Date(ANCHOR).getTime() + 1000 * 60_000).toISOString();
    const resumedAt = new Date(new Date(pausedAt).getTime() + 30 * 60_000).toISOString();
    const window: PauseResumeWindow = { pausedAt, resumedAt };

    const shifted = rescheduleKickoffsForPauseResume(schedule.kickoffByRound, window);

    for (const [round, original] of schedule.kickoffByRound) {
      const shiftedAt = shifted.get(round)!;
      if (new Date(original).getTime() < new Date(pausedAt).getTime()) {
        expect(shiftedAt).toBe(original);
      } else {
        expect(new Date(shiftedAt).getTime() - new Date(original).getTime()).toBe(30 * 60_000);
      }
    }
  });

  it('resumedAt이 pausedAt보다 앞서면 예외', () => {
    expect(() =>
      rescheduleKickoffsForPauseResume(schedule.kickoffByRound, {
        pausedAt: '2026-08-26T02:00:00.000Z',
        resumedAt: '2026-08-26T01:00:00.000Z',
      }),
    ).toThrow();
  });

  it('정지 길이가 0이면 원본 맵을 그대로 반환한다', () => {
    const window: PauseResumeWindow = { pausedAt: ANCHOR, resumedAt: ANCHOR };
    expect(rescheduleKickoffsForPauseResume(schedule.kickoffByRound, window)).toBe(
      schedule.kickoffByRound,
    );
  });
});

describe('AS-16 — 리그 간 동시 종료 정렬 유지', () => {
  const schedules = planLeagueKickoffs(LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);

  it('배속 변경 재계산 후에도 모든 리그의 마지막 라운드가 동일 시각에 남는다', () => {
    const context: SpeedChangeContext = {
      referenceNow: ANCHOR,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 3,
    };
    const rescaled = rescaleLeagueKickoffsForSpeedChange(schedules, context);

    const lastKickoffs = rescaled.map((schedule, index) =>
      schedule.kickoffByRound.get(LEAGUES[index].totalRounds),
    );
    expect(new Set(lastKickoffs).size).toBe(1);
  });

  it('정지/재개 재계산 후에도 모든 리그의 마지막 라운드가 동일 시각에 남는다', () => {
    const pausedAt = new Date(new Date(ANCHOR).getTime() + 500 * 60_000).toISOString();
    const resumedAt = new Date(new Date(pausedAt).getTime() + 45 * 60_000).toISOString();
    const window: PauseResumeWindow = { pausedAt, resumedAt };

    const shifted = rescheduleLeagueKickoffsForPauseResume(schedules, window);

    const lastKickoffs = shifted.map((schedule, index) =>
      schedule.kickoffByRound.get(LEAGUES[index].totalRounds),
    );
    expect(new Set(lastKickoffs).size).toBe(1);
  });
});
