/**
 * `SupabaseDataSource`(20일차, Task 034a 1/3) 자기검증 — 실제 Supabase 접속 없이
 * `SupabaseQueryClient`를 인메모리 페이크로 구현해 `getStandings`/`getFixturesByRound`의
 * 시즌·라운드 기본값 해석과 필터링을 오프라인으로 검증한다.
 */

import { describe, expect, it } from 'vitest';

import type { LeagueId, SeasonId } from '@/types';

import type { Database } from '../database.types';
import type { SupabaseFilterBuilder, SupabaseQueryClient, SupabaseQueryResult } from './client';
import { SupabaseDataSource } from './SupabaseDataSource';

type Tables = Database['public']['Tables'];

class FakeFilterBuilder<Row extends Record<string, unknown>>
  implements SupabaseFilterBuilder<Row>
{
  constructor(private readonly rows: readonly Row[]) {}

  eq(column: string, value: string | number): SupabaseFilterBuilder<Row> {
    return new FakeFilterBuilder(this.rows.filter((row) => row[column] === value));
  }

  order(column: string, options?: { readonly ascending?: boolean }): SupabaseFilterBuilder<Row> {
    const ascending = options?.ascending ?? true;
    const sorted = [...this.rows].sort((a, b) => {
      const av = a[column] as number | string;
      const bv = b[column] as number | string;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return ascending ? cmp : -cmp;
    });
    return new FakeFilterBuilder(sorted);
  }

  limit(count: number): SupabaseFilterBuilder<Row> {
    return new FakeFilterBuilder(this.rows.slice(0, count));
  }

  async maybeSingle(): Promise<SupabaseQueryResult<Row | null>> {
    return { data: this.rows[0] ?? null, error: null };
  }

  then<TResult1 = SupabaseQueryResult<readonly Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseQueryResult<readonly Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result: SupabaseQueryResult<readonly Row[]> = { data: this.rows, error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function createFakeClient(tables: {
  readonly world: readonly Tables['world']['Row'][];
  readonly season: readonly Tables['season']['Row'][];
  readonly standing: readonly Tables['standing']['Row'][];
  readonly fixture: readonly Tables['fixture']['Row'][];
}): SupabaseQueryClient {
  const byTable: Record<string, readonly Record<string, unknown>[]> = tables;
  return {
    from: (table: string) => ({
      select: (_columns: string) => new FakeFilterBuilder(byTable[table] ?? []),
    }),
  } as unknown as SupabaseQueryClient;
}

const WORLD_ROW = {
  id: 'world-1',
  clock_revision: 1,
  created_at: '2026-01-01T00:00:00Z',
  current_phase: 'REGULAR',
  current_season_number: 3,
  is_paused: false,
  paused_at: null,
  paused_total_minutes: 0,
  speed_changed_at: '2026-01-01T00:00:00Z',
  speed_multiplier: 1,
  world_minutes_at_speed_change: 0,
  world_seed: 1,
} satisfies Tables['world']['Row'];

const SEASON_ROW = {
  id: 'season-3',
  ended_at: null,
  phase: 'REGULAR',
  regular_ends_at: null,
  regular_started_at: '2026-01-01T00:00:00Z',
  season_number: 3,
  season_seed: 1,
  snapshot_id: null,
  started_at: '2026-01-01T00:00:00Z',
  world_id: 'world-1',
} satisfies Tables['season']['Row'];

function standingRow(overrides: Partial<Tables['standing']['Row']>): Tables['standing']['Row'] {
  return {
    drawn: 0,
    fair_play_score: 0,
    form: 'WWWWW',
    ga: 0,
    gd: 0,
    gf: 0,
    league_id: 'league-1',
    lost: 0,
    played: 0,
    points: 0,
    rank: 1,
    round: 1,
    season_id: 'season-3',
    team_id: 'team-1',
    tiebreak_applied: null,
    won: 0,
    ...overrides,
  };
}

function fixtureRow(overrides: Partial<Tables['fixture']['Row']>): Tables['fixture']['Row'] {
  return {
    attendance: null,
    away_score: null,
    away_team_id: 'team-2',
    competition_type: 'LEAGUE',
    et_away_score: null,
    et_home_score: null,
    home_score: null,
    home_team_id: 'team-1',
    ht_away_score: null,
    ht_home_score: null,
    id: 'fixture-1',
    is_neutral: false,
    kickoff_at: '2026-08-17T09:00:00Z',
    league_id: 'league-1',
    match_seed: 1,
    pk_away: null,
    pk_home: null,
    round: 1,
    round_label: '1라운드',
    season_id: 'season-3',
    simulated_at: null,
    snapshot_id: 'snapshot-1',
    status: 'SCHEDULED',
    ...overrides,
  };
}

describe('SupabaseDataSource.getStandings', () => {
  it('leagueId·seasonId·round를 모두 지정하면 해당 라운드만 rank 오름차순으로 반환한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [
        standingRow({ team_id: 'team-2', rank: 2, round: 1 }),
        standingRow({ team_id: 'team-1', rank: 1, round: 1 }),
        standingRow({ team_id: 'team-1', rank: 1, round: 2 }),
      ],
      fixture: [],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getStandings({
      leagueId: 'league-1' as LeagueId,
      seasonId: 'season-3' as SeasonId,
      round: 1,
    });

    expect(result.map((s) => s.teamId)).toEqual(['team-1', 'team-2']);
    expect(result.every((s) => s.round === 1)).toBe(true);
  });

  it('round 생략 시 해당 리그·시즌의 최신(MAX) 라운드를 사용한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [
        standingRow({ team_id: 'team-1', round: 1 }),
        standingRow({ team_id: 'team-1', round: 3 }),
        standingRow({ team_id: 'team-2', round: 3 }),
      ],
      fixture: [],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getStandings({ leagueId: 'league-1' as LeagueId, seasonId: 'season-3' as SeasonId });

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.round === 3)).toBe(true);
  });

  it('seasonId 생략 시 world.current_season_number로 해석된 현재 시즌을 사용한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [standingRow({ round: 5 })],
      fixture: [],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getStandings({ leagueId: 'league-1' as LeagueId, round: 5 });

    expect(result).toHaveLength(1);
    expect(result[0]?.seasonId).toBe('season-3');
  });

  it('world 테이블이 비어 있으면(시즌 미해석) 빈 배열을 반환한다', async () => {
    const client = createFakeClient({ world: [], season: [], standing: [], fixture: [] });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getStandings({ leagueId: 'league-1' as LeagueId });

    expect(result).toEqual([]);
  });
});

describe('SupabaseDataSource.getFixturesByRound', () => {
  it('leagueId·round·seasonId를 지정하면 competitionType 기본값 LEAGUE로 kickoffAt 오름차순 반환한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [
        fixtureRow({ id: 'fixture-2', kickoff_at: '2026-08-17T12:00:00Z' }),
        fixtureRow({ id: 'fixture-1', kickoff_at: '2026-08-17T09:00:00Z' }),
        fixtureRow({ id: 'fixture-3', round: 2, kickoff_at: '2026-08-24T09:00:00Z' }),
      ],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getFixturesByRound({
      leagueId: 'league-1' as LeagueId,
      seasonId: 'season-3' as SeasonId,
      round: 1,
    });

    expect(result.map((f) => f.id)).toEqual(['fixture-1', 'fixture-2']);
  });

  it('competitionType을 지정하면 해당 대회 경기만 반환한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [
        fixtureRow({ id: 'league-fx', competition_type: 'LEAGUE' }),
        fixtureRow({ id: 'cup-fx', competition_type: 'CUP' }),
      ],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getFixturesByRound({
      leagueId: 'league-1' as LeagueId,
      seasonId: 'season-3' as SeasonId,
      round: 1,
      competitionType: 'CUP',
    });

    expect(result.map((f) => f.id)).toEqual(['cup-fx']);
  });

  it('seasonId 생략 시 현재 시즌으로 해석해 조회한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [fixtureRow({ id: 'fixture-1' })],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getFixturesByRound({ leagueId: 'league-1' as LeagueId, round: 1 });

    expect(result).toHaveLength(1);
    expect(result[0]?.seasonId).toBe('season-3');
  });

  it('일치하는 경기가 없으면 빈 배열을 반환한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [fixtureRow({ round: 1 })],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getFixturesByRound({ leagueId: 'league-1' as LeagueId, round: 99 });

    expect(result).toEqual([]);
  });
});
