/**
 * `SupabaseDataSource`(20~22일차, Task 034a 1~3/3) 자기검증 — 실제 Supabase 접속 없이
 * `SupabaseQueryClient`를 인메모리 페이크로 구현해 20~21일차 6개 메서드와 22일차(3/3)
 * 나머지 전 메서드의 시즌/라운드 기본값 해석·필터링·정렬·컷오프를 오프라인으로 검증한다.
 * `createFakeClient`는 22일차에 임의 테이블 조합을 받도록 일반화됐다(`FakeTables`).
 *
 * `getPlayerStatRanking`은 `loadConstants('UI_PARAM')`을 거치므로 테스트 스위트 실행 전
 * `setGlobalDefaultSource`로 `LEADERBOARD_MIN_APPEARANCE_PCT` 값을 주입해야 로더가
 * `ConstantSourceUnavailableError`를 던지지 않는다(2팀 `tactics.test.ts`와 동일 패턴).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setGlobalDefaultSource } from '@/lib/config/loader';
import type { AuditActorType, CommonCodeId, FixtureId, LeagueId, PlayerId, SeasonId, TeamId } from '@/types';

import type { Database } from '../database.types';
import type { SupabaseFilterBuilder, SupabaseQueryClient, SupabaseQueryResult } from './client';
import { SupabaseDataSource } from './SupabaseDataSource';

type Tables = Database['public']['Tables'];

class FakeFilterBuilder<Row extends Record<string, unknown>>
  implements SupabaseFilterBuilder<Row>
{
  constructor(private readonly rows: readonly Row[]) {}

  eq(column: string, value: string | number | boolean): SupabaseFilterBuilder<Row> {
    return new FakeFilterBuilder(this.rows.filter((row) => row[column] === value));
  }

  lte(column: string, value: string | number): SupabaseFilterBuilder<Row> {
    return new FakeFilterBuilder(this.rows.filter((row) => (row[column] as string | number) <= value));
  }

  in(column: string, values: readonly (string | number)[]): SupabaseFilterBuilder<Row> {
    const wanted = new Set(values);
    return new FakeFilterBuilder(this.rows.filter((row) => wanted.has(row[column] as string | number)));
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

type FakeTables = { readonly [K in keyof Tables]?: readonly Tables[K]['Row'][] };

function createFakeClient(tables: FakeTables): SupabaseQueryClient {
  const byTable: Record<string, readonly Record<string, unknown>[]> = tables as Record<
    string,
    readonly Record<string, unknown>[]
  >;
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

function leagueRow(overrides: Partial<Tables['league']['Row']>): Tables['league']['Row'] {
  return {
    id: 'league-1',
    name: '테스트 리그',
    playoff_team_count: 4,
    promotion_slots: 2,
    relegation_slots: 2,
    round_interval_min: 60,
    team_count: 12,
    tier: 1,
    world_id: 'world-1',
    ...overrides,
  };
}

function managerRow(overrides: Partial<Tables['manager']['Row']>): Tables['manager']['Row'] {
  return {
    age: 45,
    contract_until_season: 5,
    id: 'manager-1',
    is_acting: false,
    name: '테스트 감독',
    preferred_formation: '4-4-2',
    reputation: 50,
    style: 'BALANCED',
    tactical_skill: 50,
    team_id: 'team-1',
    tenure_seasons: 1,
    world_id: 'world-1',
    ...overrides,
  };
}

function playerAttributeRow(
  overrides: Partial<Tables['player_attribute']['Row']>,
): Tables['player_attribute']['Row'] {
  return {
    acceleration: 10,
    aerial_reach: 10,
    aggression: 10,
    agility: 10,
    anticipation: 10,
    balance: 10,
    command_of_area: 10,
    composure: 10,
    crossing: 10,
    decisions: 10,
    determination: 10,
    dribbling: 10,
    finishing: 10,
    first_touch: 10,
    handling: 10,
    heading: 10,
    jumping: 10,
    kicking: 10,
    leadership: 10,
    long_shots: 10,
    marking: 10,
    natural_fitness: 10,
    one_on_ones: 10,
    ovr_cached: 50,
    pace: 10,
    passing: 10,
    player_id: 'player-1',
    positioning: 10,
    reflexes: 10,
    set_pieces: 10,
    stamina: 10,
    strength: 10,
    tackling: 10,
    teamwork: 10,
    updated_at_season: 1,
    vision: 10,
    work_rate: 10,
    ...overrides,
  };
}

function playerPositionRow(
  overrides: Partial<Tables['player_position']['Row']>,
): Tables['player_position']['Row'] {
  return { player_id: 'player-1', position: 'ST', proficiency: 90, ...overrides };
}

function playerStateRow(overrides: Partial<Tables['player_state']['Row']>): Tables['player_state']['Row'] {
  return {
    active_injury_id: null,
    condition: 100,
    familiarity_seasons: 1,
    fitness: 100,
    on_loan_team_id: null,
    player_id: 'player-1',
    squad_number: 9,
    suspension_remaining_cup: 0,
    suspension_remaining_league: 0,
    team_id: 'team-1',
    yellow_accumulated_cup: 0,
    yellow_accumulated_league: 0,
    ...overrides,
  };
}

function contractRow(overrides: Partial<Tables['contract']['Row']>): Tables['contract']['Row'] {
  return {
    end_season: 5,
    id: 'contract-1',
    player_id: 'player-1',
    start_season: 1,
    status: 'ACTIVE',
    team_id: 'team-1',
    transfer_fee_paid: 0,
    wage_per_season: 100_000,
    ...overrides,
  };
}

function transferRow(overrides: Partial<Tables['transfer']['Row']>): Tables['transfer']['Row'] {
  return {
    fee: 1_000_000,
    from_team_id: 'team-2',
    id: 'transfer-1',
    negotiation_log: {},
    player_id: 'player-1',
    season_id: 'season-3',
    to_team_id: 'team-1',
    trade_counterpart_player_id: null,
    type: 'TRANSFER',
    ...overrides,
  };
}

function loanRow(overrides: Partial<Tables['loan']['Row']>): Tables['loan']['Row'] {
  return {
    id: 'loan-1',
    loan_team_id: 'team-2',
    owner_team_id: 'team-1',
    player_id: 'player-1',
    season_id: 'season-3',
    status: 'ACTIVE',
    wage_share_pct: 50,
    ...overrides,
  };
}

function matchEventRow(overrides: Partial<Tables['match_event']['Row']>): Tables['match_event']['Row'] {
  return {
    added_time: 0,
    detail: {},
    id: 'event-1',
    match_id: 'fixture-1',
    minute: 10,
    primary_player_id: 'player-1',
    related_event_sequence: null,
    secondary_player_id: null,
    sequence: 1,
    team_id: 'team-1',
    type: 'GOAL',
    xg: 0.3,
    ...overrides,
  };
}

function matchLineupRow(overrides: Partial<Tables['match_lineup']['Row']>): Tables['match_lineup']['Row'] {
  return {
    formation: '4-4-2',
    is_starter: true,
    match_id: 'fixture-1',
    minute_off: null,
    minute_on: null,
    player_id: 'player-1',
    position_multiplier: 1,
    position_slot: 'ST',
    team_id: 'team-1',
    ...overrides,
  };
}

function weatherRow(overrides: Partial<Tables['weather']['Row']>): Tables['weather']['Row'] {
  return {
    effect_modifiers: {},
    match_id: 'fixture-1',
    temperature: 20,
    type: 'CLEAR',
    wind_speed: 5,
    ...overrides,
  };
}

function injuryRow(overrides: Partial<Tables['injury']['Row']>): Tables['injury']['Row'] {
  return {
    id: 'injury-1',
    match_id: null,
    occurred_round: 1,
    player_id: 'player-1',
    return_round: 3,
    rounds_out: 2,
    season_id: 'season-3',
    severity: 'MINOR',
    status: 'ACTIVE',
    type_label: '근육 부상',
    ...overrides,
  };
}

function newsFeedItemRow(
  overrides: Partial<Tables['news_feed_item']['Row']>,
): Tables['news_feed_item']['Row'] {
  return {
    body: '본문',
    headline: '헤드라인',
    id: 'news-1',
    occurred_at: '2026-08-17T00:00:00Z',
    ref_id: 'player-1',
    ref_type: 'PLAYER',
    season_id: 'season-3',
    type: 'TRANSFER',
    ...overrides,
  };
}

function sponsorRow(overrides: Partial<Tables['sponsor']['Row']>): Tables['sponsor']['Row'] {
  return {
    balance: 1_000_000,
    bankrupt_at_season: null,
    id: 'sponsor-1',
    industry: 'TECH',
    name: '테스트 스폰서',
    reputation: 50,
    scale: 3,
    world_id: 'world-1',
    ...overrides,
  };
}

function sponsorContractRow(
  overrides: Partial<Tables['sponsor_contract']['Row']>,
): Tables['sponsor_contract']['Row'] {
  return {
    end_season: 5,
    id: 'sponsor-contract-1',
    income_per_season: 500_000,
    share_pct: 10,
    sponsor_id: 'sponsor-1',
    start_season: 1,
    status: 'ACTIVE',
    team_id: 'team-1',
    ...overrides,
  };
}

function pointTransactionRow(
  overrides: Partial<Tables['point_transaction']['Row']>,
): Tables['point_transaction']['Row'] {
  return {
    amount: 100,
    balance_after: 1_000,
    created_at: '2026-08-17T00:00:00Z',
    id: 'point-tx-1',
    owner_id: 'team-1',
    owner_type: 'TEAM',
    reason_code: 'SPONSOR_INCOME',
    ref_id: 'sponsor-contract-1',
    ref_type: 'SPONSOR_CONTRACT',
    season_id: 'season-3',
    ...overrides,
  };
}

function commonCodeGroupRow(
  overrides: Partial<Tables['common_code_group']['Row']>,
): Tables['common_code_group']['Row'] {
  return {
    apply_policy: 'IMMEDIATE',
    created_at: '2026-08-17T00:00:00Z',
    description: '설명',
    group_code: 'UI_PARAM',
    group_name: 'UI 파라미터',
    is_active: true,
    related_fr: [],
    sort_order: 1,
    updated_at: '2026-08-17T00:00:00Z',
    value_type: 'INT',
    ...overrides,
  };
}

function commonCodeRow(overrides: Partial<Tables['common_code']['Row']>): Tables['common_code']['Row'] {
  return {
    code: 'SOME_CODE',
    created_at: '2026-08-17T00:00:00Z',
    default_value: '1',
    description: '설명',
    effective_from_season: null,
    group_code: 'UI_PARAM',
    id: 'code-1',
    is_active: true,
    json_schema: null,
    max_value: null,
    min_value: null,
    sort_order: 1,
    unit: null,
    updated_at: '2026-08-17T00:00:00Z',
    updated_by: null,
    value: '1',
    value_json: null,
    value_num: 1,
    world_id: null,
    ...overrides,
  };
}

function cronRunRow(overrides: Partial<Tables['cron_run']['Row']>): Tables['cron_run']['Row'] {
  return {
    duration_ms: 1_000,
    error_code: null,
    error_message: null,
    finished_at: '2026-08-17T00:01:00Z',
    fixtures_processed: 30,
    id: 'cron-1',
    is_catch_up: false,
    lock_acquired: true,
    retry_count: 0,
    snapshot_hash: null,
    started_at: '2026-08-17T00:00:00Z',
    status: 'SUCCESS',
    ...overrides,
  };
}

function cronGapRow(overrides: Partial<Tables['cron_gap']['Row']>): Tables['cron_gap']['Row'] {
  return {
    detected_at: '2026-08-17T00:00:00Z',
    gap_ended_at: '2026-08-17T00:10:00Z',
    gap_minutes: 10,
    gap_started_at: '2026-08-17T00:00:00Z',
    id: 'gap-1',
    missed_fixture_count: 1,
    recovered_at: '2026-08-17T00:10:00Z',
    ...overrides,
  };
}

function auditLogRow(overrides: Partial<Tables['audit_log']['Row']>): Tables['audit_log']['Row'] {
  return {
    action: 'UPDATE_COMMON_CODE',
    actor_id: 'user-1',
    actor_type: 'HUMAN',
    created_at: '2026-08-17T00:00:00Z',
    id: 'audit-1',
    payload: {},
    target_id: 'code-1',
    target_type: 'COMMON_CODE',
    ...overrides,
  };
}

function teamSeasonRow(overrides: Partial<Tables['team_season']['Row']>): Tables['team_season']['Row'] {
  return {
    final_rank: null,
    league_id: 'league-1',
    promoted: false,
    relegated: false,
    season_id: 'season-3',
    team_id: 'team-1',
    tiebreak_applied: null,
    ...overrides,
  };
}

function awardRow(overrides: Partial<Tables['award']['Row']>): Tables['award']['Row'] {
  return {
    criteria: {},
    id: 'award-1',
    league_id: 'league-1',
    manager_id: null,
    player_id: 'player-1',
    scope: 'LEAGUE',
    season_id: 'season-3',
    team_id: null,
    type: 'GOLDEN_BOOT',
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

describe('SupabaseDataSource — 22일차 3/3 신규 메서드', () => {
  describe('getLeagues / getLeague / getCurrentSeason / getSeasons', () => {
    it('getLeagues는 tier 오름차순으로 전 리그를 반환한다', async () => {
      const client = createFakeClient({
        league: [leagueRow({ id: 'l2', tier: 2 }), leagueRow({ id: 'l1', tier: 1 })],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getLeagues();

      expect(result.map((l) => l.id)).toEqual(['l1', 'l2']);
    });

    it('getLeague는 id로 단건 조회하고 없으면 null', async () => {
      const client = createFakeClient({ league: [leagueRow({ id: 'l1' })] });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getLeague('l1' as LeagueId))?.id).toBe('l1');
      expect(await ds.getLeague('no-such' as LeagueId)).toBeNull();
    });

    it('getCurrentSeason은 world.current_season_number로 해석한 시즌을 반환한다', async () => {
      const client = createFakeClient({ world: [WORLD_ROW], season: [SEASON_ROW] });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getCurrentSeason())?.id).toBe('season-3');
    });

    it('getSeasons는 season_number 내림차순(최신순)으로 전 시즌을 반환한다', async () => {
      const client = createFakeClient({
        season: [SEASON_ROW, { ...SEASON_ROW, id: 'season-1', season_number: 1 }],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getSeasons();

      expect(result.map((s) => s.id)).toEqual(['season-3', 'season-1']);
    });
  });

  describe('getLiveFixtures / getNextKickoff / getFixtureRoundBounds', () => {
    it('getLiveFixtures는 status=LIVE인 경기만 kickoffAt 오름차순으로 반환한다', async () => {
      const client = createFakeClient({
        fixture: [
          fixtureRow({ id: 'f-live', status: 'LIVE', kickoff_at: '2026-08-17T10:00:00Z' }),
          fixtureRow({ id: 'f-sched', status: 'SCHEDULED' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getLiveFixtures();

      expect(result.map((f) => f.id)).toEqual(['f-live']);
    });

    it('getNextKickoff은 가장 이른 SCHEDULED 경기를 반환한다', async () => {
      const client = createFakeClient({
        fixture: [
          fixtureRow({ id: 'later', status: 'SCHEDULED', kickoff_at: '2026-08-20T09:00:00Z' }),
          fixtureRow({ id: 'sooner', status: 'SCHEDULED', kickoff_at: '2026-08-18T09:00:00Z' }),
          fixtureRow({ id: 'live', status: 'LIVE', kickoff_at: '2026-08-17T09:00:00Z' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getNextKickoff())?.id).toBe('sooner');
    });

    it('getFixtureRoundBounds는 min/max/currentRound(미종료 최소 라운드)를 계산한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        fixture: [
          fixtureRow({ id: 'r1', round: 1, status: 'FINISHED' }),
          fixtureRow({ id: 'r2', round: 2, status: 'LIVE' }),
          fixtureRow({ id: 'r3', round: 3, status: 'SCHEDULED' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getFixtureRoundBounds({ leagueId: 'league-1' as LeagueId });

      expect(result).toEqual({ minRound: 1, maxRound: 3, currentRound: 2 });
    });

    it('일치하는 경기가 없으면 전부 0을 반환한다', async () => {
      const client = createFakeClient({ world: [WORLD_ROW], season: [SEASON_ROW], fixture: [] });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getFixtureRoundBounds({ leagueId: 'league-1' as LeagueId })).toEqual({
        minRound: 0,
        maxRound: 0,
        currentRound: 0,
      });
    });
  });

  describe('getMatchEvents — 경과 시간 컷오프', () => {
    it('SCHEDULED 경기는 빈 배열을 반환한다(이벤트 전무)', async () => {
      const client = createFakeClient({
        fixture: [fixtureRow({ id: 'f1', status: 'SCHEDULED' })],
        match_event: [matchEventRow({ match_id: 'f1', minute: 10 })],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getMatchEvents('f1' as FixtureId)).toEqual([]);
    });

    it('FINISHED 경기는 전 이벤트를 sequence 오름차순으로 반환한다', async () => {
      const client = createFakeClient({
        fixture: [fixtureRow({ id: 'f1', status: 'FINISHED' })],
        match_event: [
          matchEventRow({ id: 'e2', match_id: 'f1', sequence: 2, minute: 80 }),
          matchEventRow({ id: 'e1', match_id: 'f1', sequence: 1, minute: 10 }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getMatchEvents('f1' as FixtureId);

      expect(result.map((e) => e.id)).toEqual(['e1', 'e2']);
    });

    it('LIVE 경기는 킥오프로부터 경과한 분(minute) 이내 이벤트만 반환한다', async () => {
      const kickoffAt = new Date(Date.now() - 20 * 60_000).toISOString();
      const client = createFakeClient({
        fixture: [fixtureRow({ id: 'f1', status: 'LIVE', kickoff_at: kickoffAt })],
        match_event: [
          matchEventRow({ id: 'past', match_id: 'f1', minute: 10 }),
          matchEventRow({ id: 'future', match_id: 'f1', minute: 50 }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getMatchEvents('f1' as FixtureId);

      expect(result.map((e) => e.id)).toEqual(['past']);
    });

    it('경기가 없으면 빈 배열을 반환한다', async () => {
      const client = createFakeClient({ fixture: [] });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getMatchEvents('no-such' as FixtureId)).toEqual([]);
    });
  });

  describe('getMatchLineups / getMatchWeather / getMatchPlayerRatings / getMatchTeamStats', () => {
    it('getMatchLineups는 match_id로 라인업 전량을 반환한다', async () => {
      const client = createFakeClient({
        match_lineup: [matchLineupRow({ player_id: 'p1' }), matchLineupRow({ player_id: 'p2', team_id: 'team-2' })],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getMatchLineups('fixture-1' as FixtureId);

      expect(result).toHaveLength(2);
    });

    it('getMatchWeather는 단건 조회, 없으면 null', async () => {
      const client = createFakeClient({ weather: [weatherRow({})] });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getMatchWeather('fixture-1' as FixtureId))?.type).toBe('CLEAR');
      expect(await ds.getMatchWeather('no-such' as FixtureId)).toBeNull();
    });

    it('getMatchPlayerRatings/getMatchTeamStats는 Tier B 재시뮬레이션 미구현으로 항상 빈 배열', async () => {
      const ds = new SupabaseDataSource(createFakeClient({}));

      expect(await ds.getMatchPlayerRatings('fixture-1' as FixtureId)).toEqual([]);
      expect(await ds.getMatchTeamStats('fixture-1' as FixtureId)).toEqual([]);
    });
  });

  describe('선수 세부 조회(4군) — 단건/배열 CRUD 패턴', () => {
    it('getPlayerAttribute / getPlayerState / getPlayerPositions', async () => {
      const client = createFakeClient({
        player_attribute: [playerAttributeRow({})],
        player_state: [playerStateRow({})],
        player_position: [playerPositionRow({ position: 'ST' }), playerPositionRow({ position: 'CF' })],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getPlayerAttribute('player-1' as PlayerId))?.ovrCached).toBe(50);
      expect((await ds.getPlayerState('player-1' as PlayerId))?.condition).toBe(100);
      expect((await ds.getPlayerPositions('player-1' as PlayerId)).map((p) => p.position)).toEqual(['ST', 'CF']);
    });

    it('getPlayerAttributeHistory는 seasonNumber 오름차순', async () => {
      const client = createFakeClient({
        player_attribute_history: [
          { ...playerAttributeRow({}), season_number: 2, ovr: 55 },
          { ...playerAttributeRow({}), season_number: 1, ovr: 50 },
        ] as unknown as Tables['player_attribute_history']['Row'][],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getPlayerAttributeHistory('player-1' as PlayerId);

      expect(result.map((r) => r.seasonNumber)).toEqual([1, 2]);
    });

    it('getPlayerSeasonStats / getPlayerCareerStat', async () => {
      const client = createFakeClient({
        player_season_stat: [playerSeasonStatRow({})],
        player_career_stat: [{ ...playerSeasonStatRow({}), total_seasons: 3, total_awards: 1, total_injuries: 0 } as unknown as Tables['player_career_stat']['Row']],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getPlayerSeasonStats('player-1' as PlayerId)).toHaveLength(1);
      expect((await ds.getPlayerCareerStat('player-1' as PlayerId))?.totalSeasons).toBe(3);
      expect(await ds.getPlayerCareerStat('no-such' as PlayerId)).toBeNull();
    });

    it('getPlayerContract는 status=ACTIVE인 계약만 조회한다', async () => {
      const client = createFakeClient({
        contract: [contractRow({ id: 'active', status: 'ACTIVE' }), contractRow({ id: 'expired', status: 'EXPIRED' })],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getPlayerContract('player-1' as PlayerId))?.id).toBe('active');
    });

    it('getPlayerInjuries는 occurredRound 내림차순', async () => {
      const client = createFakeClient({
        injury: [injuryRow({ id: 'old', occurred_round: 1 }), injuryRow({ id: 'new', occurred_round: 5 })],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getPlayerInjuries('player-1' as PlayerId)).map((i) => i.id)).toEqual(['new', 'old']);
    });

    it('getPlayerAwards / getPlayerTransferHistory / getPlayerLoanHistory', async () => {
      const client = createFakeClient({
        award: [awardRow({})],
        transfer: [transferRow({})],
        loan: [loanRow({})],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getPlayerAwards('player-1' as PlayerId)).toHaveLength(1);
      expect(await ds.getPlayerTransferHistory('player-1' as PlayerId)).toHaveLength(1);
      expect(await ds.getPlayerLoanHistory('player-1' as PlayerId)).toHaveLength(1);
    });
  });

  describe('클럽 세부 조회(5군)', () => {
    it('getTeamsByIds는 id 배열로 배치 조회하고, 빈 배열이면 조회하지 않는다', async () => {
      const client = createFakeClient({
        team: [teamRow({ id: 't1' }), teamRow({ id: 't2' }), teamRow({ id: 't3' })],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getTeamsByIds(['t1', 't3'] as TeamId[])).map((t) => t.id)).toEqual(['t1', 't3']);
      expect(await ds.getTeamsByIds([])).toEqual([]);
    });

    it('getTeamSeason은 seasonId 생략 시 현재 시즌으로 해석한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        team_season: [teamSeasonRow({})],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getTeamSeason({ teamId: 'team-1' as TeamId }))?.seasonId).toBe('season-3');
    });

    it('getTeamManager는 team_id로 단건 조회한다', async () => {
      const client = createFakeClient({ manager: [managerRow({})] });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getTeamManager('team-1' as TeamId))?.id).toBe('manager-1');
    });

    it('getTeamSquad는 player_state로 소속 선수 id를 모은 뒤 player를 배치 조회한다(pa 비노출)', async () => {
      const client = createFakeClient({
        player_state: [playerStateRow({ player_id: 'p1' }), playerStateRow({ player_id: 'p2' })],
        player: [playerRow({ id: 'p1' }), playerRow({ id: 'p2' }), playerRow({ id: 'p3' })],
      });
      const ds = new SupabaseDataSource(client);

      const squad = await ds.getTeamSquad('team-1' as TeamId);

      expect(squad.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
      expect(squad[0]).not.toHaveProperty('pa');
    });

    it('getTeamSquadStates', async () => {
      const client = createFakeClient({ player_state: [playerStateRow({})] });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getTeamSquadStates('team-1' as TeamId)).toHaveLength(1);
    });

    it('getTeamSeasonStat은 competitionType 기본값 LEAGUE로 조회한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        team_season_stat: [
          { ...playerSeasonStatRow({}), competition_type: 'LEAGUE' } as unknown as Tables['team_season_stat']['Row'],
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getTeamSeasonStat({ teamId: 'team-1' as TeamId })).not.toBeNull();
    });

    it('getTeamPointTransactions는 owner_type=TEAM·최신순', async () => {
      const client = createFakeClient({
        point_transaction: [
          pointTransactionRow({ id: 'old', created_at: '2026-08-01T00:00:00Z' }),
          pointTransactionRow({ id: 'new', created_at: '2026-08-17T00:00:00Z' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getTeamPointTransactions({ teamId: 'team-1' as TeamId });

      expect(result.map((r) => r.id)).toEqual(['new', 'old']);
    });

    it('getTeamSponsorContracts는 status=ACTIVE만 반환한다', async () => {
      const client = createFakeClient({
        sponsor_contract: [
          sponsorContractRow({ id: 'active', status: 'ACTIVE' }),
          sponsorContractRow({ id: 'expired', status: 'EXPIRED' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getTeamSponsorContracts('team-1' as TeamId)).map((c) => c.id)).toEqual(['active']);
    });

    it('getSponsorsByIds / getSponsors', async () => {
      const client = createFakeClient({ sponsor: [sponsorRow({ id: 's1' }), sponsorRow({ id: 's2' })] });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getSponsorsByIds(['s2'] as never)).map((s) => s.id)).toEqual(['s2']);
      expect(await ds.getSponsors()).toHaveLength(2);
    });

    it('getSponsorContracts는 sponsorId·status를 선택적으로 조합 필터한다', async () => {
      const client = createFakeClient({
        sponsor_contract: [
          sponsorContractRow({ id: 'a', sponsor_id: 's1', status: 'ACTIVE' }),
          sponsorContractRow({ id: 'b', sponsor_id: 's1', status: 'EXPIRED' }),
          sponsorContractRow({ id: 'c', sponsor_id: 's2', status: 'ACTIVE' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getSponsorContracts({ sponsorId: 's1' as never, status: 'ACTIVE' });

      expect(result.map((c) => c.id)).toEqual(['a']);
    });

    it('getTeamTrophies', async () => {
      const client = createFakeClient({ trophy: [{ id: 'tr1', league_id: 'league-1', season_id: 'season-3', team_id: 'team-1', type: 'LEAGUE_TITLE' }] });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getTeamTrophies('team-1' as TeamId)).toHaveLength(1);
    });

    it('getTeamFixtures는 홈+원정 경기를 합쳐 kickoffAt 오름차순, limit 적용', async () => {
      const client = createFakeClient({
        fixture: [
          fixtureRow({ id: 'home', home_team_id: 'team-1', away_team_id: 'team-9', kickoff_at: '2026-08-20T00:00:00Z' }),
          fixtureRow({ id: 'away', home_team_id: 'team-9', away_team_id: 'team-1', kickoff_at: '2026-08-10T00:00:00Z' }),
          fixtureRow({ id: 'unrelated', home_team_id: 'team-8', away_team_id: 'team-9' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getTeamFixtures({ teamId: 'team-1' as TeamId, limit: 1 });

      expect(result.map((f) => f.id)).toEqual(['away']);
    });
  });

  describe('통계(6군) — getAwards / getMultiAwardRanking', () => {
    it('getAwards는 현재 시즌·leagueId·type 필터를 조합한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        award: [
          awardRow({ id: 'match', league_id: 'league-1', type: 'GOLDEN_BOOT' }),
          awardRow({ id: 'wrong-type', league_id: 'league-1', type: 'LEAGUE_MVP' }),
          awardRow({ id: 'wrong-league', league_id: 'league-2', type: 'GOLDEN_BOOT' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getAwards({ leagueId: 'league-1' as LeagueId, type: 'GOLDEN_BOOT' });

      expect(result.map((a) => a.id)).toEqual(['match']);
    });

    it('getMultiAwardRanking은 subjectType 축으로 집계해 내림차순 정렬한다', async () => {
      const client = createFakeClient({
        award: [
          awardRow({ id: 'a1', player_id: 'p1' }),
          awardRow({ id: 'a2', player_id: 'p1' }),
          awardRow({ id: 'a3', player_id: 'p2' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getMultiAwardRanking({ subjectType: 'PLAYER' });

      expect(result).toEqual([
        { subjectType: 'PLAYER', subjectId: 'p1', totalAwards: 2 },
        { subjectType: 'PLAYER', subjectId: 'p2', totalAwards: 1 },
      ]);
    });
  });

  describe('뉴스(7군) — getNewsFeed', () => {
    it('types 필터·limit을 적용해 최신순으로 반환한다', async () => {
      const client = createFakeClient({
        news_feed_item: [
          newsFeedItemRow({ id: 'n1', type: 'TRANSFER', occurred_at: '2026-08-10T00:00:00Z' }),
          newsFeedItemRow({ id: 'n2', type: 'LOAN', occurred_at: '2026-08-17T00:00:00Z' }),
          newsFeedItemRow({ id: 'n3', type: 'TRANSFER', occurred_at: '2026-08-15T00:00:00Z' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getNewsFeed({ types: ['TRANSFER'] });

      expect(result.map((n) => n.id)).toEqual(['n3', 'n1']);
    });
  });

  describe('브래킷(8군) — getPlayoffBracket / getCupBracket', () => {
    it('getPlayoffBracket은 leagueId+PLAYOFF만 반환한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        fixture: [
          fixtureRow({ id: 'po', league_id: 'league-1', competition_type: 'PLAYOFF' }),
          fixtureRow({ id: 'league', league_id: 'league-1', competition_type: 'LEAGUE' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getPlayoffBracket({ leagueId: 'league-1' as LeagueId });

      expect(result.map((f) => f.id)).toEqual(['po']);
    });

    it('getCupBracket은 리그 무관 CUP 경기 전량을 반환한다', async () => {
      const client = createFakeClient({
        world: [WORLD_ROW],
        season: [SEASON_ROW],
        fixture: [
          fixtureRow({ id: 'cup', league_id: 'league-1', competition_type: 'CUP' }),
          fixtureRow({ id: 'league', league_id: 'league-1', competition_type: 'LEAGUE' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getCupBracket();

      expect(result.map((f) => f.id)).toEqual(['cup']);
    });
  });

  describe('어드민(9군)', () => {
    it('getWorldStatus는 단일 world 행을 반환하고, 없으면 에러를 던진다(D-15 불변식)', async () => {
      const ds = new SupabaseDataSource(createFakeClient({ world: [WORLD_ROW] }));
      expect((await ds.getWorldStatus()).id).toBe('world-1');

      const emptyDs = new SupabaseDataSource(createFakeClient({ world: [] }));
      await expect(emptyDs.getWorldStatus()).rejects.toThrow();
    });

    it('getCommonCodeGroups / getCommonCodes / getCommonCodeHistory', async () => {
      const client = createFakeClient({
        common_code_group: [commonCodeGroupRow({ group_code: 'UI_PARAM' })],
        common_code: [commonCodeRow({ group_code: 'UI_PARAM', code: 'X' })],
        common_code_history: [
          { id: 'h1', common_code_id: 'code-1', group_code: 'UI_PARAM', code: 'X', action: 'UPDATE', old_value: '1', new_value: '2', old_effective_from_season: null, new_effective_from_season: null, changed_by: 'user-1', changed_at: '2026-08-17T00:00:00Z', reason: '변경 사유' },
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getCommonCodeGroups()).toHaveLength(1);
      expect(await ds.getCommonCodes('UI_PARAM')).toHaveLength(1);
      expect(await ds.getCommonCodeHistory('code-1' as CommonCodeId)).toHaveLength(1);
    });

    it('getLatestCronRun / getCronRuns(status·onlyCatchUp 필터)', async () => {
      const client = createFakeClient({
        cron_run: [
          cronRunRow({ id: 'old', started_at: '2026-08-01T00:00:00Z', status: 'SUCCESS', is_catch_up: false }),
          cronRunRow({ id: 'new', started_at: '2026-08-17T00:00:00Z', status: 'FAILED', is_catch_up: true }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect((await ds.getLatestCronRun())?.id).toBe('new');
      expect((await ds.getCronRuns({ status: 'FAILED' })).map((r) => r.id)).toEqual(['new']);
      expect((await ds.getCronRuns({ onlyCatchUp: true })).map((r) => r.id)).toEqual(['new']);
    });

    it('getCronRunMetrics는 성공률·평균/최대 소요시간을 집계한다', async () => {
      const client = createFakeClient({
        cron_run: [
          cronRunRow({ id: 'a', status: 'SUCCESS', duration_ms: 1000 }),
          cronRunRow({ id: 'b', status: 'FAILED', duration_ms: 2000 }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      expect(await ds.getCronRunMetrics()).toEqual({
        successRatePct: 50,
        avgDurationMs: 1500,
        maxDurationMs: 2000,
        sampleSize: 2,
      });
    });

    it('표본이 없으면(cron_run 빈 테이블) 0-상태를 반환한다', async () => {
      const ds = new SupabaseDataSource(createFakeClient({ cron_run: [] }));

      expect(await ds.getCronRunMetrics()).toEqual({
        successRatePct: 0,
        avgDurationMs: 0,
        maxDurationMs: 0,
        sampleSize: 0,
      });
    });

    it('getCronGaps', async () => {
      const ds = new SupabaseDataSource(createFakeClient({ cron_gap: [cronGapRow({})] }));

      expect(await ds.getCronGaps()).toHaveLength(1);
    });

    it('getAuditLogs는 actorType 필터 + search(메모리 부분 일치)를 함께 적용한다', async () => {
      const client = createFakeClient({
        audit_log: [
          auditLogRow({ id: 'a1', actor_type: 'HUMAN', action: 'UPDATE_COMMON_CODE' }),
          auditLogRow({ id: 'a2', actor_type: 'HUMAN', action: 'DELETE_SPONSOR', target_type: 'SPONSOR' }),
          auditLogRow({ id: 'a3', actor_type: 'ENGINE', action: 'UPDATE_COMMON_CODE' }),
        ],
      });
      const ds = new SupabaseDataSource(client);

      const result = await ds.getAuditLogs({ actorType: 'HUMAN' as AuditActorType, search: 'common_code' });

      expect(result.map((l) => l.id)).toEqual(['a1']);
    });
  });
});
