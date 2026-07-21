/**
 * schedule.ts 자기검증 — Task 007 / 17일차 산출물.
 *
 * 서클법 더블 라운드로빈이 "각 팀이 나머지 전 팀과 홈·원정 각 1회씩" 정확히 만나는지,
 * 그리고 순위표가 `FINISHED` 경기 결과를 **집계**해 파생됐는지(I-106 해소 검증 — 팀별
 * played가 실제 FINISHED 경기 수와 일치)를 검증한다.
 */

import { describe, expect, it } from 'vitest';
import { createState } from '@/lib/sim/rng/prng';
import { deriveMatchSeed, deriveSeasonSeed } from '@/lib/sim/rng/derive';
import type { MatchSeed, SeasonId, SnapshotId, WorldSeed } from '@/types';
import { generateMockWorld } from '../world';
import { CURRENT_ROUND, generateSeasonSchedule } from './schedule';

const SEED_A = 20260812 as WorldSeed;
const world = generateMockWorld(SEED_A);
const seasonId = 'season-test' as SeasonId;
const snapshotId = 'snapshot-test' as SnapshotId;
const NOW = '2026-08-12T12:00:00.000Z';
// 7단계(시드 추첨) 타이브레이커 계산에 필요 — 40일차, `resolveStandings()` 위임 이후 신규.
const seasonSeedValue = deriveSeasonSeed(SEED_A, 1);

function nextMatchSeedFactory(): () => MatchSeed {
  let key = 0;
  return () => {
    const seed = deriveMatchSeed(SEED_A, key) as MatchSeed;
    key += 1;
    return seed;
  };
}

describe('generateSeasonSchedule', () => {
  it('동일 입력으로 두 번 호출하면 전 결과가 100% 동일하다', () => {
    const league = world.leagues[0];
    const teams = world.teams.filter((t) =>
      world.teams.slice(0, league.teamCount).includes(t),
    );

    const state = createState(SEED_A);
    const first = generateSeasonSchedule(
      state,
      league,
      teams.slice(0, league.teamCount),
      seasonId,
      snapshotId,
      NOW,
      CURRENT_ROUND,
      nextMatchSeedFactory(),
      seasonSeedValue,
    );
    const second = generateSeasonSchedule(
      state,
      league,
      teams.slice(0, league.teamCount),
      seasonId,
      snapshotId,
      NOW,
      CURRENT_ROUND,
      nextMatchSeedFactory(),
      seasonSeedValue,
    );
    expect(second.value).toEqual(first.value);
  });

  it.each([0, 1, 2])(
    '리그 %i — 각 팀이 나머지 전 팀과 홈 1회·원정 1회씩 정확히 만난다(더블 라운드로빈)',
    (leagueIdx) => {
      const league = world.leagues[leagueIdx];
      let offset = 0;
      for (let i = 0; i < leagueIdx; i += 1) {
        offset += world.leagues[i].teamCount;
      }
      const teams = world.teams.slice(offset, offset + league.teamCount);

      const state = createState(SEED_A);
      const result = generateSeasonSchedule(
        state,
        league,
        teams,
        seasonId,
        snapshotId,
        NOW,
        CURRENT_ROUND,
        nextMatchSeedFactory(),
        seasonSeedValue,
      );

      expect(result.value.totalRounds).toBe(2 * (league.teamCount - 1));
      expect(result.value.fixtures).toHaveLength(league.teamCount * (league.teamCount - 1));

      const meetingCount = new Map<string, { home: number; away: number }>();
      for (const team of teams) {
        for (const opponent of teams) {
          if (team.id === opponent.id) continue;
          meetingCount.set(`${team.id}->${opponent.id}`, { home: 0, away: 0 });
        }
      }
      for (const fixture of result.value.fixtures) {
        const key = `${fixture.homeTeamId}->${fixture.awayTeamId}`;
        const entry = meetingCount.get(key);
        expect(entry).toBeDefined();
        entry!.home += 1;
      }
      for (const [, entry] of meetingCount) {
        expect(entry.home).toBe(1);
      }

      // 각 라운드 내에서 팀이 중복 출전하지 않는다(팀당 정확히 1경기)
      for (let round = 1; round <= result.value.totalRounds; round += 1) {
        const roundFixtures = result.value.fixtures.filter((f) => f.round === round);
        expect(roundFixtures).toHaveLength(league.teamCount / 2);
        const involved = new Set<string>();
        for (const f of roundFixtures) {
          expect(involved.has(f.homeTeamId)).toBe(false);
          expect(involved.has(f.awayTeamId)).toBe(false);
          involved.add(f.homeTeamId);
          involved.add(f.awayTeamId);
        }
      }
    },
  );

  it('순위표는 FINISHED 경기만 집계한 값이다(I-106 해소) — played가 실제 FINISHED 경기 수와 일치', () => {
    const league = world.leagues[0];
    const teams = world.teams.slice(0, league.teamCount);

    const state = createState(SEED_A);
    const result = generateSeasonSchedule(
      state,
      league,
      teams,
      seasonId,
      snapshotId,
      NOW,
      CURRENT_ROUND,
      nextMatchSeedFactory(),
      seasonSeedValue,
    );

    expect(result.value.standings).toHaveLength(league.teamCount);

    for (const row of result.value.standings) {
      const actuallyFinished = result.value.fixtures.filter(
        (f) =>
          f.status === 'FINISHED' && (f.homeTeamId === row.teamId || f.awayTeamId === row.teamId),
      );
      expect(row.played).toBe(actuallyFinished.length);
      expect(row.played).toBe(row.won + row.drawn + row.lost);
      expect(row.points).toBe(row.won * 3 + row.drawn);
      expect(row.gd).toBe(row.gf - row.ga);
    }

    // 미래 라운드(currentRound보다 큰 라운드)는 전부 SCHEDULED, 스코어 null
    const futureFixtures = result.value.fixtures.filter((f) => f.round > CURRENT_ROUND);
    for (const f of futureFixtures) {
      expect(f.status).toBe('SCHEDULED');
      expect(f.homeScore).toBeNull();
      expect(f.awayScore).toBeNull();
    }

    // 과거 라운드(currentRound보다 작은 라운드)는 전부 FINISHED
    const pastFixtures = result.value.fixtures.filter((f) => f.round < CURRENT_ROUND);
    for (const f of pastFixtures) {
      expect(f.status).toBe('FINISHED');
      expect(f.homeScore).not.toBeNull();
      expect(f.awayScore).not.toBeNull();
    }

    const ranks = result.value.standings.map((r) => r.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: league.teamCount }, (_, i) => i + 1));
  });
});
