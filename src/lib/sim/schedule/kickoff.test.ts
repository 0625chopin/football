import { describe, expect, it } from 'vitest';
import type { LeagueId, TeamId, Timestamp } from '@/types';
import { generateBergerDoubleRoundRobin } from './berger';
import {
  attachKickoffTimes,
  computeLeagueRoundOffsetsMin,
  planLeagueKickoffs,
  type LeagueKickoffInput,
} from './kickoff';

const ANCHOR: Timestamp = '2026-08-26T00:00:00.000Z';
const REGULAR_PHASE_DURATION_MIN = 3450;

// 05문서 표 예시값(fallback.ts 실측)을 테스트 고정값으로만 사용한다 — 엔진 코드에는 없음.
const LEAGUES: readonly LeagueKickoffInput[] = [
  { leagueId: 'league-1' as LeagueId, totalRounds: 46, roundIntervalMin: 75 },
  { leagueId: 'league-2' as LeagueId, totalRounds: 38, roundIntervalMin: 90 },
  { leagueId: 'league-3' as LeagueId, totalRounds: 30, roundIntervalMin: 115 },
];

describe('computeLeagueRoundOffsetsMin — I-12 라운드 오프셋', () => {
  it('리그 1개 이하면 오프셋은 전부 0', () => {
    expect(computeLeagueRoundOffsetsMin([])).toEqual([]);
    expect(computeLeagueRoundOffsetsMin([75])).toEqual([0]);
  });

  it('최소 간격을 리그 수로 나눈 만큼 순서대로 어긋난다', () => {
    const offsets = computeLeagueRoundOffsetsMin([75, 90, 115]);
    expect(offsets).toEqual([0, 25, 50]);
  });

  it('간격이 0 이하면 예외', () => {
    expect(() => computeLeagueRoundOffsetsMin([75, 0])).toThrow();
    expect(() => computeLeagueRoundOffsetsMin([75, -10])).toThrow();
  });
});

describe('planLeagueKickoffs — 최종 라운드 강제 정렬', () => {
  const schedules = planLeagueKickoffs(LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);

  it('리그마다 1라운드는 I-12 오프셋에, 마지막 라운드는 정확히 T+3,450분에 온다', () => {
    const anchorMs = new Date(ANCHOR).getTime();
    const expectedOffsets = [0, 25, 50];

    schedules.forEach((schedule, index) => {
      const league = LEAGUES[index];
      expect(schedule.roundOffsetMin).toBe(expectedOffsets[index]);

      const firstKickoff = schedule.kickoffByRound.get(1)!;
      expect((new Date(firstKickoff).getTime() - anchorMs) / 60_000).toBe(expectedOffsets[index]);

      const lastKickoff = schedule.kickoffByRound.get(league.totalRounds)!;
      expect((new Date(lastKickoff).getTime() - anchorMs) / 60_000).toBe(REGULAR_PHASE_DURATION_MIN);
    });
  });

  it('라운드가 올라갈수록 킥오프 시각도 항상 증가한다(리그별)', () => {
    for (const schedule of schedules) {
      const rounds = [...schedule.kickoffByRound.keys()].sort((a, b) => a - b);
      for (let i = 1; i < rounds.length; i += 1) {
        const prev = schedule.kickoffByRound.get(rounds[i - 1])!;
        const curr = schedule.kickoffByRound.get(rounds[i])!;
        expect(new Date(curr).getTime()).toBeGreaterThan(new Date(prev).getTime());
      }
    }
  });

  it('totalRounds === 1이면 유일한 라운드가 강제 정렬 지점(T+3,450분)에 온다', () => {
    const [single] = planLeagueKickoffs(
      [{ leagueId: 'league-solo' as LeagueId, totalRounds: 1, roundIntervalMin: 75 }],
      ANCHOR,
      REGULAR_PHASE_DURATION_MIN,
    );
    const anchorMs = new Date(ANCHOR).getTime();
    const only = single.kickoffByRound.get(1)!;
    expect((new Date(only).getTime() - anchorMs) / 60_000).toBe(REGULAR_PHASE_DURATION_MIN);
  });

  it('regularPhaseDurationMin이 roundOffsetMin 이하면 예외', () => {
    expect(() =>
      planLeagueKickoffs(
        [{ leagueId: 'league-x' as LeagueId, totalRounds: 5, roundIntervalMin: 75 }],
        ANCHOR,
        100, // 단일 리그는 오프셋 0이므로 0보다 크면 통과
      ),
    ).not.toThrow();

    expect(() =>
      planLeagueKickoffs(LEAGUES, ANCHOR, 10 /* 오프셋(0/25/50)보다 작거나 같음 */),
    ).toThrow();
  });

  it('totalRounds가 1 미만이거나 정수가 아니면 예외', () => {
    expect(() =>
      planLeagueKickoffs(
        [{ leagueId: 'league-x' as LeagueId, totalRounds: 0, roundIntervalMin: 75 }],
        ANCHOR,
        REGULAR_PHASE_DURATION_MIN,
      ),
    ).toThrow();
  });
});

describe('attachKickoffTimes — berger.ts 대진표와 결합', () => {
  it('모든 fixture에 자기 라운드의 킥오프 시각이 붙는다', () => {
    const teamIds = Array.from({ length: 16 }, (_, i) => `team-${i}` as TeamId);
    const fixtures = generateBergerDoubleRoundRobin(teamIds);
    const [schedule] = planLeagueKickoffs(
      [{ leagueId: 'league-3' as LeagueId, totalRounds: 30, roundIntervalMin: 115 }],
      ANCHOR,
      REGULAR_PHASE_DURATION_MIN,
    );

    const scheduled = attachKickoffTimes(fixtures, schedule.kickoffByRound);

    expect(scheduled).toHaveLength(fixtures.length);
    for (const fixture of scheduled) {
      expect(fixture.kickoffAt).toBe(schedule.kickoffByRound.get(fixture.round));
    }
  });

  it('kickoffByRound에 없는 라운드가 있으면 예외', () => {
    const teamIds = Array.from({ length: 4 }, (_, i) => `team-${i}` as TeamId);
    const fixtures = generateBergerDoubleRoundRobin(teamIds);
    const emptyMap = new Map<number, Timestamp>();

    expect(() => attachKickoffTimes(fixtures, emptyMap)).toThrow();
  });
});
