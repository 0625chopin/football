/**
 * 4리그 확장 설정 성공 — Task 025 (30일차).
 *
 * `berger.ts`/`kickoff.ts`/`speed.ts`는 리그 수를 리터럴로 갖지 않고 전부 입력 배열의
 * 길이(`leagues.length`)에서 구조적으로 얻는다(NFR-SC-003, 각 파일 헤더 주석 참조).
 * 지금까지의 테스트는 전부 3리그(`LEAGUE_1/2/3`, 05문서 표 예시값)만으로 이 불변식을
 * 검증해 왔다 — "3개를 항상 가정하지 않는다"는 주석상의 주장을 실제로 4번째 리그를
 * 추가해 확인한 적은 없었다. 이 파일은 가상의 4번째 리그(`league-4`, 12팀·130분 간격,
 * 05문서에 없는 합성값 — 실제 시드 데이터가 아니라 "리그가 늘어나도 깨지지 않는다"만
 * 검증하는 용도)를 더해 전체 파이프라인(대진 → 킥오프 → 배속/정지 재계산)이 4리그
 * 규모에서도 동일하게 성립함을 보인다.
 */
import { describe, expect, it } from 'vitest';
import type { LeagueId, TeamId, Timestamp } from '@/types';
import { detectVenueStreaks, generateBergerDoubleRoundRobin } from './berger';
import { planLeagueKickoffs, type LeagueKickoffInput } from './kickoff';
import {
  rescaleLeagueKickoffsForSpeedChange,
  rescheduleLeagueKickoffsForPauseResume,
  type PauseResumeWindow,
  type SpeedChangeContext,
} from './speed';

const ANCHOR: Timestamp = '2026-08-31T00:00:00.000Z';
const REGULAR_PHASE_DURATION_MIN = 3450;

// 05문서 표 예시값(fallback.ts 실측) 3종 + 합성 4번째 리그(실제 시드값 아님, 규모 검증 전용).
const FOUR_LEAGUES: readonly LeagueKickoffInput[] = [
  { leagueId: 'league-1' as LeagueId, totalRounds: 46, roundIntervalMin: 75 },
  { leagueId: 'league-2' as LeagueId, totalRounds: 38, roundIntervalMin: 90 },
  { leagueId: 'league-3' as LeagueId, totalRounds: 30, roundIntervalMin: 115 },
  { leagueId: 'league-4' as LeagueId, totalRounds: 22, roundIntervalMin: 130 },
];
const TEAM_COUNTS: Record<string, number> = {
  'league-1': 24,
  'league-2': 20,
  'league-3': 16,
  'league-4': 12,
};

function teams(count: number, prefix: string): TeamId[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}` as TeamId);
}

describe('4리그 확장 — 대진 완전성 (berger.ts)', () => {
  it.each(FOUR_LEAGUES.map((l) => [l.leagueId, TEAM_COUNTS[l.leagueId]] as const))(
    '%s(팀 수 %i) — 라운드마다 전 팀 1회 등장, 모든 쌍 홈/원정 각 1회',
    (leagueId, teamCount) => {
      const all = teams(teamCount, leagueId);
      const fixtures = generateBergerDoubleRoundRobin(all);

      expect(fixtures).toHaveLength(teamCount * (teamCount - 1));

      const byRound = new Map<number, TeamId[]>();
      for (const f of fixtures) {
        const list = byRound.get(f.round) ?? [];
        list.push(f.homeTeamId, f.awayTeamId);
        byRound.set(f.round, list);
      }
      expect(byRound.size).toBe(2 * (teamCount - 1));
      for (const appearances of byRound.values()) {
        expect(new Set(appearances).size).toBe(teamCount);
      }

      const meetings = new Map<string, number>();
      for (const f of fixtures) {
        meetings.set(`${f.homeTeamId}|${f.awayTeamId}`, (meetings.get(`${f.homeTeamId}|${f.awayTeamId}`) ?? 0) + 1);
      }
      for (const a of all) {
        for (const b of all) {
          if (a === b) continue;
          expect(meetings.get(`${a}|${b}`)).toBe(1);
        }
      }
    },
  );

  it('4번째 리그(12팀, 실전 규모)도 3연속 이상 동일 장소 위반이 0건이다', () => {
    const all = teams(12, 'league-4');
    const fixtures = generateBergerDoubleRoundRobin(all);
    expect(detectVenueStreaks(all, fixtures)).toEqual([]);
  });
});

describe('4리그 확장 — 킥오프 산출 + 동시 종료 정렬 (kickoff.ts)', () => {
  const schedules = planLeagueKickoffs(FOUR_LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);

  it('리그 4개 전부 스케줄이 산출된다', () => {
    expect(schedules).toHaveLength(4);
  });

  it('4개 리그의 1라운드 오프셋이 서로 겹치지 않는다(I-12)', () => {
    const offsets = schedules.map((s) => s.roundOffsetMin);
    expect(new Set(offsets).size).toBe(4);
  });

  it('4개 리그 모두 마지막 라운드가 정확히 T+3,450분에 정렬된다(킥오프 차이 0분 ≤ 30분 수락 기준)', () => {
    const anchorMs = new Date(ANCHOR).getTime();
    schedules.forEach((schedule, index) => {
      const league = FOUR_LEAGUES[index];
      const lastKickoff = schedule.kickoffByRound.get(league.totalRounds)!;
      const diffMin = (new Date(lastKickoff).getTime() - anchorMs) / 60_000 - REGULAR_PHASE_DURATION_MIN;
      expect(Math.abs(diffMin)).toBeLessThanOrEqual(30);
      expect(diffMin).toBe(0);
    });

    const lastKickoffs = new Set(
      schedules.map((schedule, index) => schedule.kickoffByRound.get(FOUR_LEAGUES[index].totalRounds)),
    );
    expect(lastKickoffs.size).toBe(1);
  });
});

describe('4리그 확장 — 배속·정지 재계산에서도 동시 종료 유지 (speed.ts, AS-16)', () => {
  const schedules = planLeagueKickoffs(FOUR_LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);

  it('배속 변경 재계산 후에도 4개 리그 마지막 라운드가 동일 시각이다', () => {
    const context: SpeedChangeContext = {
      referenceNow: ANCHOR,
      oldSpeedMultiplier: 1,
      newSpeedMultiplier: 6,
    };
    const rescaled = rescaleLeagueKickoffsForSpeedChange(schedules, context);
    const lastKickoffs = new Set(
      rescaled.map((schedule, index) => schedule.kickoffByRound.get(FOUR_LEAGUES[index].totalRounds)),
    );
    expect(lastKickoffs.size).toBe(1);
  });

  it('정지/재개 재계산 후에도 4개 리그 마지막 라운드가 동일 시각이다', () => {
    const pausedAt = new Date(new Date(ANCHOR).getTime() + 700 * 60_000).toISOString();
    const resumedAt = new Date(new Date(pausedAt).getTime() + 20 * 60_000).toISOString();
    const window: PauseResumeWindow = { pausedAt, resumedAt };

    const shifted = rescheduleLeagueKickoffsForPauseResume(schedules, window);
    const lastKickoffs = new Set(
      shifted.map((schedule, index) => schedule.kickoffByRound.get(FOUR_LEAGUES[index].totalRounds)),
    );
    expect(lastKickoffs.size).toBe(1);
  });

  it('결정론적이다 — 같은 입력에 항상 같은 4리그 스케줄', () => {
    const again = planLeagueKickoffs(FOUR_LEAGUES, ANCHOR, REGULAR_PHASE_DURATION_MIN);
    expect(again).toEqual(schedules);
  });
});
