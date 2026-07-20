import { describe, expect, it } from 'vitest';
import type { TeamId } from '@/types';
import { detectVenueStreaks, generateBergerDoubleRoundRobin } from './berger';

const teams = (count: number): TeamId[] =>
  Array.from({ length: count }, (_, i) => `team-${i}` as TeamId);

describe('generateBergerDoubleRoundRobin — Task 025', () => {
  it.each([
    [24, 552, 46],
    [20, 380, 38],
    [16, 240, 30],
  ])('teamCount=%i → 경기수 %i, 라운드수 %i', (teamCount, expectedFixtures, expectedRounds) => {
    const fixtures = generateBergerDoubleRoundRobin(teams(teamCount));

    expect(fixtures).toHaveLength(expectedFixtures);
    expect(Math.max(...fixtures.map((f) => f.round))).toBe(expectedRounds);
    expect(fixtures).toHaveLength(teamCount * (teamCount - 1));
    expect(expectedRounds).toBe(2 * (teamCount - 1));
  });

  it('각 라운드에서 모든 팀이 정확히 한 번씩만 등장한다', () => {
    const teamCount = 20;
    const fixtures = generateBergerDoubleRoundRobin(teams(teamCount));

    const byRound = new Map<number, TeamId[]>();
    for (const f of fixtures) {
      const list = byRound.get(f.round) ?? [];
      list.push(f.homeTeamId, f.awayTeamId);
      byRound.set(f.round, list);
    }

    expect(byRound.size).toBe(2 * (teamCount - 1));
    for (const appearances of byRound.values()) {
      expect(appearances).toHaveLength(teamCount);
      expect(new Set(appearances).size).toBe(teamCount);
    }
  });

  it('모든 팀 쌍이 정확히 두 번(홈 1·원정 1) 맞붙는다', () => {
    const teamCount = 16;
    const all = teams(teamCount);
    const fixtures = generateBergerDoubleRoundRobin(all);

    const meetings = new Map<string, { home: number; away: number }>();
    for (const a of all) {
      for (const b of all) {
        if (a !== b) meetings.set(`${a}|${b}`, { home: 0, away: 0 });
      }
    }

    for (const f of fixtures) {
      const forward = meetings.get(`${f.homeTeamId}|${f.awayTeamId}`);
      expect(forward).toBeDefined();
      forward!.home += 1;

      const reverse = meetings.get(`${f.awayTeamId}|${f.homeTeamId}`);
      expect(reverse).toBeDefined();
      reverse!.away += 1;
    }

    for (const { home, away } of meetings.values()) {
      expect(home).toBe(1);
      expect(away).toBe(1);
    }
  });

  it.each([[24], [20], [16]])(
    'teamCount=%i → 전 팀의 홈경기 수가 정확히 teamCount - 1로 균등하다',
    (teamCount) => {
      const all = teams(teamCount);
      const fixtures = generateBergerDoubleRoundRobin(all);

      const homeCounts = new Map<TeamId, number>(all.map((id) => [id, 0]));
      const awayCounts = new Map<TeamId, number>(all.map((id) => [id, 0]));
      for (const f of fixtures) {
        homeCounts.set(f.homeTeamId, (homeCounts.get(f.homeTeamId) ?? 0) + 1);
        awayCounts.set(f.awayTeamId, (awayCounts.get(f.awayTeamId) ?? 0) + 1);
      }

      for (const id of all) {
        expect(homeCounts.get(id)).toBe(teamCount - 1);
        expect(awayCounts.get(id)).toBe(teamCount - 1);
      }
    },
  );

  it('결정론적이다 — 같은 입력에 항상 같은 출력', () => {
    const input = teams(24);
    const first = generateBergerDoubleRoundRobin(input);
    const second = generateBergerDoubleRoundRobin(input);
    expect(second).toEqual(first);
  });

  it('2차전은 1차전 각 라운드의 홈/원정을 뒤집어 그대로 이어 붙인다', () => {
    const teamCount = 16;
    const fixtures = generateBergerDoubleRoundRobin(teams(teamCount));
    const firstLegRounds = teamCount - 1;

    const firstLeg = fixtures.filter((f) => f.round <= firstLegRounds);
    const secondLeg = fixtures.filter((f) => f.round > firstLegRounds);

    expect(firstLeg).toHaveLength(secondLeg.length);
    for (const f of firstLeg) {
      const mirrored = secondLeg.find(
        (s) =>
          s.round === f.round + firstLegRounds &&
          s.homeTeamId === f.awayTeamId &&
          s.awayTeamId === f.homeTeamId,
      );
      expect(mirrored).toBeDefined();
    }
  });

  it('홀수 팀 수는 예외를 던진다', () => {
    expect(() => generateBergerDoubleRoundRobin(teams(15))).toThrow();
  });

  it('팀 수 2 미만은 예외를 던진다', () => {
    expect(() => generateBergerDoubleRoundRobin(teams(0))).toThrow();
    expect(() => generateBergerDoubleRoundRobin(teams(1))).toThrow();
  });
});

describe('detectVenueStreaks — FR-LG-003 ② (26일차)', () => {
  it.each([[24], [20], [16]])(
    'teamCount=%i(실전 규모) → 3연속 이상 동일 장소 위반이 0건이다',
    (teamCount) => {
      const all = teams(teamCount);
      const fixtures = generateBergerDoubleRoundRobin(all);
      expect(detectVenueStreaks(all, fixtures)).toEqual([]);
    },
  );

  it('teamCount=4 → 1차전이 3라운드뿐이라 3연속 스트릭이 수학적으로 불가피하다(전수 탐색 확인, 위반 반환)', () => {
    const all = teams(4);
    const fixtures = generateBergerDoubleRoundRobin(all);
    const streaks = detectVenueStreaks(all, fixtures);

    expect(streaks.length).toBeGreaterThan(0);
    for (const streak of streaks) {
      expect(streak.length).toBeGreaterThanOrEqual(3);
      expect(all).toContain(streak.teamId);
    }
  });

  it('빈 대진표는 위반 없이 빈 배열을 반환한다', () => {
    expect(detectVenueStreaks(teams(4), [])).toEqual([]);
  });

  it('2연속 동일 장소는 위반으로 잡히지 않는다(경계값)', () => {
    // team-0: H,H,A,A (2연속 두 번, 3연속 없음) / team-1: A,A,H,H
    const fixtures = [
      { round: 1, homeTeamId: 'team-0' as TeamId, awayTeamId: 'team-1' as TeamId },
      { round: 2, homeTeamId: 'team-0' as TeamId, awayTeamId: 'team-1' as TeamId },
      { round: 3, homeTeamId: 'team-1' as TeamId, awayTeamId: 'team-0' as TeamId },
      { round: 4, homeTeamId: 'team-1' as TeamId, awayTeamId: 'team-0' as TeamId },
    ];
    expect(detectVenueStreaks(['team-0' as TeamId, 'team-1' as TeamId], fixtures)).toEqual([]);
  });

  it('정확히 3연속이면 위반 1건을 정확한 시작 라운드·길이로 보고한다', () => {
    const fixtures = [
      { round: 1, homeTeamId: 'team-0' as TeamId, awayTeamId: 'team-1' as TeamId },
      { round: 2, homeTeamId: 'team-0' as TeamId, awayTeamId: 'team-1' as TeamId },
      { round: 3, homeTeamId: 'team-0' as TeamId, awayTeamId: 'team-1' as TeamId },
      { round: 4, homeTeamId: 'team-1' as TeamId, awayTeamId: 'team-0' as TeamId },
    ];
    const streaks = detectVenueStreaks(['team-0' as TeamId, 'team-1' as TeamId], fixtures);

    expect(streaks).toContainEqual({
      teamId: 'team-0',
      venue: 'HOME',
      startRound: 1,
      length: 3,
    });
    expect(streaks).toContainEqual({
      teamId: 'team-1',
      venue: 'AWAY',
      startRound: 1,
      length: 3,
    });
  });
});
