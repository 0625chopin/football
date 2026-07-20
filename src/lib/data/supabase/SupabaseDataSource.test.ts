/**
 * `SupabaseDataSource`(20~21일차, Task 034a 1~2/3) 자기검증 — 실제 Supabase 접속 없이
 * `SupabaseQueryClient`를 인메모리 페이크로 구현해 `getStandings`/`getFixturesByRound`
 * (20일차)와 `getFixture`/`getPlayerProfile`/`getTeam`/`getPlayerStatRanking`(21일차)의
 * 시즌 기본값 해석·필터링·정렬을 오프라인으로 검증한다.
 *
 * `getPlayerStatRanking`은 `loadConstants('UI_PARAM')`을 거치므로 테스트 스위트 실행 전
 * `setGlobalDefaultSource`로 `LEADERBOARD_MIN_APPEARANCE_PCT` 값을 주입해야 로더가
 * `ConstantSourceUnavailableError`를 던지지 않는다(2팀 `tactics.test.ts`와 동일 패턴).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setGlobalDefaultSource } from '@/lib/config/loader';
import type { LeagueId, PlayerId, SeasonId, TeamId } from '@/types';

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
  readonly player?: readonly Tables['player']['Row'][];
  readonly team?: readonly Tables['team']['Row'][];
  readonly player_season_stat?: readonly Tables['player_season_stat']['Row'][];
}): SupabaseQueryClient {
  const byTable: Record<string, readonly Record<string, unknown>[]> = {
    player: [],
    team: [],
    player_season_stat: [],
    ...tables,
  };
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

function playerRow(overrides: Partial<Tables['player']['Row']>): Tables['player']['Row'] {
  return {
    age: 25,
    birth_season: -22,
    id: 'player-1',
    market_value: 1_000_000,
    name: '테스트 선수',
    nationality: 'KOR',
    pa: 20,
    preferred_foot: 'RIGHT',
    preferred_position: 'ST',
    reputation: 50,
    retired_at_season: null,
    taste_tags: [],
    world_id: 'world-1',
    ...overrides,
  };
}

function teamRow(overrides: Partial<Tables['team']['Row']>): Tables['team']['Row'] {
  return {
    academy_level: 1,
    balance: 0,
    color_primary: '#000000',
    color_secondary: '#ffffff',
    crest_seed: 1,
    crisis_consecutive_seasons: 0,
    fan_base: 0,
    financial_crisis: false,
    founded_season: -50,
    id: 'team-1',
    name: '테스트 FC',
    reputation: 50,
    short_name: 'TFC',
    stadium_capacity: 10000,
    stadium_name: '테스트 스타디움',
    world_id: 'world-1',
    ...overrides,
  };
}

function playerSeasonStatRow(
  overrides: Partial<Tables['player_season_stat']['Row']>,
): Tables['player_season_stat']['Row'] {
  return {
    aerial_duels_attempted: 0,
    aerial_duels_won: 0,
    appearances: 0,
    assists: 0,
    avg_condition: 80,
    big_chances_created: 0,
    big_chances_missed: 0,
    blocks: 0,
    catches: 0,
    clean_sheets: 0,
    clearances: 0,
    competition_type: 'LEAGUE',
    contribution_score: 0,
    crosses_attempted: 0,
    crosses_completed: 0,
    dispossessed: 0,
    dribbles_attempted: 0,
    dribbles_completed: 0,
    errors_leading_to_goal: 0,
    errors_leading_to_shot: 0,
    fouls_committed: 0,
    fouls_drawn: 0,
    free_kick_goals: 0,
    goals: 0,
    goals_conceded: 0,
    ground_duels_attempted: 0,
    ground_duels_won: 0,
    headed_goals: 0,
    injuries_count: 0,
    interceptions: 0,
    key_passes: 0,
    league_id: 'league-1',
    long_balls_attempted: 0,
    long_balls_completed: 0,
    matches_suspended: 0,
    minutes_played: 0,
    motm_awards: 0,
    offsides: 0,
    own_goals: 0,
    passes_attempted: 0,
    passes_completed: 0,
    penalties_faced: 0,
    penalties_saved: 0,
    penalties_scored: 0,
    penalties_taken: 0,
    player_id: 'player-1',
    punches: 0,
    red_cards: 0,
    rounds_injured: 0,
    saves: 0,
    season_id: 'season-3',
    second_yellows: 0,
    shots: 0,
    shots_faced: 0,
    shots_on_target: 0,
    starts: 0,
    sub_appearances: 0,
    sweeper_actions: 0,
    tackles_attempted: 0,
    tackles_won: 0,
    team_id: 'team-1',
    through_balls: 0,
    touches: 0,
    xa: 0,
    xg: 0,
    xg_prevented: 0,
    yellow_cards: 0,
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

describe('SupabaseDataSource.getFixture', () => {
  it('id로 단건 조회한다', async () => {
    const client = createFakeClient({
      world: [],
      season: [],
      standing: [],
      fixture: [fixtureRow({ id: 'fixture-1' }), fixtureRow({ id: 'fixture-2' })],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getFixture('fixture-1' as never);

    expect(result?.id).toBe('fixture-1');
  });

  it('일치하는 경기가 없으면 null을 반환한다', async () => {
    const client = createFakeClient({ world: [], season: [], standing: [], fixture: [] });
    const ds = new SupabaseDataSource(client);

    expect(await ds.getFixture('no-such-fixture' as never)).toBeNull();
  });
});

describe('SupabaseDataSource.getPlayerProfile', () => {
  it('pa를 구조적으로 노출하지 않고 scoutRating을 포함한다(I-38)', async () => {
    const client = createFakeClient({
      world: [],
      season: [],
      standing: [],
      fixture: [],
      player: [playerRow({ id: 'player-1', pa: 25 })],
    });
    const ds = new SupabaseDataSource(client);

    const profile = await ds.getPlayerProfile('player-1' as PlayerId);

    expect(profile?.id).toBe('player-1');
    expect(profile).not.toHaveProperty('pa');
    expect(profile?.scoutRating).toBeGreaterThanOrEqual(1);
    expect(profile?.scoutRating).toBeLessThanOrEqual(5);
  });

  it('일치하는 선수가 없으면 null을 반환한다', async () => {
    const client = createFakeClient({ world: [], season: [], standing: [], fixture: [] });
    const ds = new SupabaseDataSource(client);

    expect(await ds.getPlayerProfile('no-such-player' as PlayerId)).toBeNull();
  });
});

describe('SupabaseDataSource.getTeam', () => {
  it('id로 단건 조회한다', async () => {
    const client = createFakeClient({
      world: [],
      season: [],
      standing: [],
      fixture: [],
      team: [teamRow({ id: 'team-1', name: '테스트 FC' })],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getTeam('team-1' as TeamId);

    expect(result?.name).toBe('테스트 FC');
  });

  it('일치하는 팀이 없으면 null을 반환한다', async () => {
    const client = createFakeClient({ world: [], season: [], standing: [], fixture: [] });
    const ds = new SupabaseDataSource(client);

    expect(await ds.getTeam('no-such-team' as TeamId)).toBeNull();
  });
});

describe('SupabaseDataSource.getPlayerStatRanking', () => {
  beforeAll(() => {
    setGlobalDefaultSource({
      name: 'test-ui-param',
      getGroupConstants: (group) => (group === 'UI_PARAM' ? { LEADERBOARD_MIN_APPEARANCE_PCT: 50 } : undefined),
    });
  });

  afterAll(() => {
    setGlobalDefaultSource(null);
  });

  it('leagueId로 필터하고 metric 내림차순으로 정렬한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [],
      player_season_stat: [
        playerSeasonStatRow({ player_id: 'p1', league_id: 'league-1', goals: 10, appearances: 10 }),
        playerSeasonStatRow({ player_id: 'p2', league_id: 'league-1', goals: 20, appearances: 10 }),
        playerSeasonStatRow({ player_id: 'p3', league_id: 'league-2', goals: 30, appearances: 10 }),
      ],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getPlayerStatRanking({
      leagueId: 'league-1' as LeagueId,
      competitionType: 'LEAGUE',
      metric: 'goals',
    });

    expect(result.map((r) => r.playerId)).toEqual(['p2', 'p1']);
  });

  it('minAppearancePct 미지정 시 UI_PARAM 기본값(여기선 50%)으로 대체해 미달 선수를 제외한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [],
      player_season_stat: [
        playerSeasonStatRow({ player_id: 'full', league_id: 'league-1', goals: 5, appearances: 10 }),
        playerSeasonStatRow({ player_id: 'low', league_id: 'league-1', goals: 99, appearances: 4 }),
      ],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getPlayerStatRanking({
      leagueId: 'league-1' as LeagueId,
      competitionType: 'LEAGUE',
      metric: 'goals',
    });

    expect(result.map((r) => r.playerId)).toEqual(['full']);
  });

  it('leagueId가 null이면 전 리그 통합 랭킹을 반환한다', async () => {
    const client = createFakeClient({
      world: [WORLD_ROW],
      season: [SEASON_ROW],
      standing: [],
      fixture: [],
      player_season_stat: [
        playerSeasonStatRow({ player_id: 'p1', league_id: 'league-1', goals: 10, appearances: 10 }),
        playerSeasonStatRow({ player_id: 'p2', league_id: 'league-2', goals: 20, appearances: 10 }),
      ],
    });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getPlayerStatRanking({ leagueId: null, competitionType: 'LEAGUE', metric: 'goals' });

    expect(result.map((r) => r.playerId)).toEqual(['p2', 'p1']);
  });

  it('통계 데이터가 없으면(basis 해석 불가) 빈 배열을 반환한다', async () => {
    const client = createFakeClient({ world: [WORLD_ROW], season: [SEASON_ROW], standing: [], fixture: [] });
    const ds = new SupabaseDataSource(client);

    const result = await ds.getPlayerStatRanking({ leagueId: null, competitionType: 'LEAGUE', metric: 'goals' });

    expect(result).toEqual([]);
  });
});
