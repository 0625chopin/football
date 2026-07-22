/**
 * archive.ts 테스트 — Task 028 / 54일차 산출물.
 *
 * 완료 판정 "히스토리 누적 보존"을 증명한다: ① 정산 완료된 시즌만 아카이브되고 미완결
 * 입력은 명시적 오류가 되는지 ② `season_number`가 히스토리 최댓값 + 1로만 누적되고
 * 감소·재사용 시 오류가 되는지 ③ `World` 후보가 `id`/`worldSeed`를 유지하고
 * `currentSeasonNumber`가 단조 증가하지 않으면(=월드 리셋) 오류가 되는지(I-13).
 */

import { describe, expect, it } from 'vitest';
import type { Season, SeasonId, TeamId, TeamSeason, World, WorldId, WorldSeed } from '@/types';
import { archiveSeason, assertNoWorldReset, computeNextSeasonNumber } from './archive';

const SEASON_ID = 'season-1' as SeasonId;

function season(overrides: Partial<Season> = {}): Season {
  return {
    id: SEASON_ID,
    seasonNumber: 1,
    seasonSeed: 1 as Season['seasonSeed'],
    phase: 'SETTLEMENT',
    regularStartedAt: '2026-07-21T00:00:00.000Z',
    regularEndsAt: '2026-09-01T00:00:00.000Z',
    startedAt: '2026-07-21T00:00:00.000Z',
    endedAt: '2026-09-10T00:00:00.000Z',
    snapshotId: null,
    ...overrides,
  };
}

function teamSeason(overrides: Partial<TeamSeason> = {}): TeamSeason {
  return {
    teamId: 'team-1' as TeamId,
    seasonId: SEASON_ID,
    leagueId: 'league-1' as TeamSeason['leagueId'],
    finalRank: 1,
    promoted: false,
    relegated: false,
    tiebreakApplied: null,
    ...overrides,
  };
}

function world(overrides: Partial<World> = {}): Pick<World, 'id' | 'worldSeed' | 'currentSeasonNumber'> {
  return {
    id: 'world-1' as WorldId,
    worldSeed: 42 as WorldSeed,
    currentSeasonNumber: 1,
    ...overrides,
  };
}

describe('archiveSeason — Task 028 54일차', () => {
  it('SETTLEMENT·endedAt 확정·finalRank 확정 시즌을 그대로 봉인한다', () => {
    const s = season();
    const teamSeasons = [teamSeason(), teamSeason({ teamId: 'team-2' as TeamId, finalRank: 2 })];

    const archive = archiveSeason(s, teamSeasons);

    expect(archive.season).toBe(s);
    expect(archive.teamSeasons).toBe(teamSeasons);
  });

  it('phase가 SETTLEMENT가 아니면 예외를 던진다', () => {
    const s = season({ phase: 'PRESEASON' });
    expect(() => archiveSeason(s, [])).toThrow(/SETTLEMENT/);
  });

  it('endedAt이 확정되지 않으면 예외를 던진다', () => {
    const s = season({ endedAt: null });
    expect(() => archiveSeason(s, [])).toThrow(/endedAt/);
  });

  it('다른 시즌 소속 teamSeason이 섞여 있으면 예외를 던진다', () => {
    const s = season();
    const wrongSeasonTeamSeason = teamSeason({ seasonId: 'season-2' as SeasonId });
    expect(() => archiveSeason(s, [wrongSeasonTeamSeason])).toThrow(/seasonId/);
  });

  it('finalRank가 미확정인 teamSeason이 있으면 예외를 던진다', () => {
    const s = season();
    const unresolved = teamSeason({ finalRank: null });
    expect(() => archiveSeason(s, [unresolved])).toThrow(/finalRank/);
  });
});

describe('computeNextSeasonNumber — I-13 season_number 누적', () => {
  it('히스토리가 비어 있으면 1을 반환한다(월드 최초 시즌)', () => {
    expect(computeNextSeasonNumber([])).toBe(1);
  });

  it('히스토리 최댓값 + 1을 반환한다', () => {
    expect(computeNextSeasonNumber([1, 2, 3])).toBe(4);
    expect(computeNextSeasonNumber([1, 5, 3])).toBe(6);
  });

  it('입력 순서와 무관하게 최댓값 + 1을 반환한다(순서 불변)', () => {
    expect(computeNextSeasonNumber([54, 1, 30])).toBe(55);
  });

  it('중복된 시즌 번호가 있으면 예외를 던진다', () => {
    expect(() => computeNextSeasonNumber([1, 2, 2])).toThrow(/중복/);
  });

  it('0 이하 또는 정수가 아닌 값이 있으면 예외를 던진다', () => {
    expect(() => computeNextSeasonNumber([1, 0])).toThrow(RangeError);
    expect(() => computeNextSeasonNumber([1, 1.5])).toThrow(RangeError);
    expect(() => computeNextSeasonNumber([-1])).toThrow(RangeError);
  });
});

describe('assertNoWorldReset — I-13 월드 리셋 금지', () => {
  it('id·worldSeed 유지 + currentSeasonNumber 증가는 통과한다', () => {
    const prev = world({ currentSeasonNumber: 54 });
    const next = world({ currentSeasonNumber: 55 });
    expect(() => assertNoWorldReset(prev, next)).not.toThrow();
  });

  it('World.id가 바뀌면 예외를 던진다', () => {
    const prev = world();
    const next = world({ id: 'world-2' as WorldId, currentSeasonNumber: 2 });
    expect(() => assertNoWorldReset(prev, next)).toThrow(/World\.id/);
  });

  it('worldSeed가 바뀌면 예외를 던진다', () => {
    const prev = world();
    const next = world({ worldSeed: 43 as WorldSeed, currentSeasonNumber: 2 });
    expect(() => assertNoWorldReset(prev, next)).toThrow(/worldSeed/);
  });

  it('currentSeasonNumber가 감소하면 예외를 던진다', () => {
    const prev = world({ currentSeasonNumber: 10 });
    const next = world({ currentSeasonNumber: 1 });
    expect(() => assertNoWorldReset(prev, next)).toThrow(/단조 증가/);
  });

  it('currentSeasonNumber가 그대로면(정체) 예외를 던진다', () => {
    const prev = world({ currentSeasonNumber: 10 });
    const next = world({ currentSeasonNumber: 10 });
    expect(() => assertNoWorldReset(prev, next)).toThrow(/단조 증가/);
  });
});
