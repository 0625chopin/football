/**
 * mapper.ts 자기검증 — 17일차 Task 032 산출물이 무테스트(0%)로 게이트를 막고 있어
 * (perFile lines 80% / branches 70%) 6팀이 직접 보강한다. 실제 Supabase 접속 없이
 * DB row 리터럴을 만들어 각 mapXxxRow 함수에 넣고 도메인 필드 매핑을 검증하는
 * 순수 오프라인 단위 테스트다.
 */

import { describe, expect, it } from 'vitest';
import {
  mapAuditLogRow,
  mapAwardRow,
  mapClubOwnerRow,
  mapCommonCodeGroupRow,
  mapCommonCodeHistoryRow,
  mapCommonCodeRow,
  mapContractRow,
  mapCronGapRow,
  mapCronRunRow,
  mapFixtureRow,
  mapInjuryRow,
  mapLeagueRow,
  mapLoanRow,
  mapManagerRow,
  mapMatchEventRow,
  mapMatchLineupRow,
  mapNewsFeedItemRow,
  mapPlayerAttributeHistoryRow,
  mapPlayerAttributeRow,
  mapPlayerCareerStatRow,
  mapPlayerMatchStatRow,
  mapPlayerPositionRow,
  mapPlayerRow,
  mapPlayerSeasonStatRow,
  mapPlayerStateRow,
  mapPointTransactionRow,
  mapSanctionRow,
  mapSeasonRow,
  mapSimConstantSnapshotRow,
  mapSponsorContractRow,
  mapSponsorRow,
  mapStandingRow,
  mapTeamRow,
  mapTeamSeasonRow,
  mapTeamSeasonStatRow,
  mapTransferRow,
  mapTrophyRow,
  mapWeatherRow,
  mapWorldRow,
  mapYouthProspectRow,
} from './mapper';

/* ────────────────────────────────────────────────────────────────────────
 * 공유 블록 — `person.ts`/`stat.ts` 여러 테이블이 재사용하는 34/56필드 묶음을
 * mapper.ts의 mapPlayerAttributeValues/mapPlayerStatCoreValues와 동일하게 구성한다.
 * ──────────────────────────────────────────────────────────────────────── */

const attributeRowFields = {
  acceleration: 12,
  aerial_reach: 13,
  aggression: 14,
  agility: 15,
  anticipation: 16,
  balance: 17,
  command_of_area: 18,
  composure: 19,
  crossing: 20,
  decisions: 21,
  determination: 22,
  dribbling: 23,
  finishing: 24,
  first_touch: 25,
  handling: 26,
  heading: 27,
  jumping: 28,
  kicking: 29,
  leadership: 30,
  long_shots: 31,
  marking: 32,
  natural_fitness: 33,
  one_on_ones: 34,
  pace: 35,
  passing: 36,
  positioning: 37,
  reflexes: 38,
  set_pieces: 39,
  stamina: 40,
  strength: 41,
  tackling: 42,
  teamwork: 43,
  vision: 44,
  work_rate: 45,
};

const attributeExpectedFields = {
  acceleration: 12,
  aerialReach: 13,
  aggression: 14,
  agility: 15,
  anticipation: 16,
  balance: 17,
  commandOfArea: 18,
  composure: 19,
  crossing: 20,
  decisions: 21,
  determination: 22,
  dribbling: 23,
  finishing: 24,
  firstTouch: 25,
  handling: 26,
  heading: 27,
  jumping: 28,
  kicking: 29,
  leadership: 30,
  longShots: 31,
  marking: 32,
  naturalFitness: 33,
  oneOnOnes: 34,
  pace: 35,
  passing: 36,
  positioning: 37,
  reflexes: 38,
  setPieces: 39,
  stamina: 40,
  strength: 41,
  tackling: 42,
  teamwork: 43,
  vision: 44,
  workRate: 45,
};

const statCoreRowFields = {
  aerial_duels_attempted: 20,
  aerial_duels_won: 11,
  appearances: 20,
  assists: 5,
  big_chances_created: 6,
  big_chances_missed: 2,
  blocks: 9,
  catches: 0,
  clean_sheets: 0,
  clearances: 15,
  crosses_attempted: 28,
  crosses_completed: 11,
  dispossessed: 12,
  dribbles_attempted: 34,
  dribbles_completed: 19,
  errors_leading_to_goal: 1,
  errors_leading_to_shot: 2,
  fouls_committed: 14,
  fouls_drawn: 16,
  free_kick_goals: 1,
  goals: 9,
  goals_conceded: 0,
  ground_duels_attempted: 38,
  ground_duels_won: 21,
  headed_goals: 2,
  interceptions: 22,
  key_passes: 33,
  long_balls_attempted: 40,
  long_balls_completed: 25,
  minutes_played: 1620,
  offsides: 5,
  own_goals: 0,
  passes_attempted: 820,
  passes_completed: 700,
  penalties_faced: 0,
  penalties_saved: 0,
  penalties_scored: 2,
  penalties_taken: 3,
  punches: 0,
  red_cards: 0,
  saves: 0,
  second_yellows: 1,
  shots: 40,
  shots_faced: 0,
  shots_on_target: 18,
  starts: 18,
  sub_appearances: 2,
  sweeper_actions: 0,
  tackles_attempted: 45,
  tackles_won: 30,
  through_balls: 7,
  touches: 1100,
  xa: 4.2,
  xg: 8.4,
  xg_prevented: 0,
  yellow_cards: 4,
};

const statCoreExpectedFields = {
  appearances: 20,
  starts: 18,
  subAppearances: 2,
  minutesPlayed: 1620,
  goals: 9,
  assists: 5,
  shots: 40,
  shotsOnTarget: 18,
  xg: 8.4,
  xa: 4.2,
  bigChancesCreated: 6,
  bigChancesMissed: 2,
  penaltiesTaken: 3,
  penaltiesScored: 2,
  freeKickGoals: 1,
  headedGoals: 2,
  ownGoals: 0,
  passesAttempted: 820,
  passesCompleted: 700,
  keyPasses: 33,
  longBallsAttempted: 40,
  longBallsCompleted: 25,
  crossesAttempted: 28,
  crossesCompleted: 11,
  throughBalls: 7,
  dribblesAttempted: 34,
  dribblesCompleted: 19,
  dispossessed: 12,
  touches: 1100,
  tacklesAttempted: 45,
  tacklesWon: 30,
  interceptions: 22,
  clearances: 15,
  blocks: 9,
  aerialDuelsAttempted: 20,
  aerialDuelsWon: 11,
  groundDuelsAttempted: 38,
  groundDuelsWon: 21,
  errorsLeadingToShot: 2,
  errorsLeadingToGoal: 1,
  foulsCommitted: 14,
  foulsDrawn: 16,
  yellowCards: 4,
  secondYellows: 1,
  redCards: 0,
  offsides: 5,
  saves: 0,
  shotsFaced: 0,
  goalsConceded: 0,
  cleanSheets: 0,
  penaltiesFaced: 0,
  penaltiesSaved: 0,
  punches: 0,
  catches: 0,
  sweeperActions: 0,
  xgPrevented: 0,
};

const teamSeasonStatBaseRow = {
  academy_level: 3,
  avg_age: 24.5,
  avg_condition: 88,
  avg_ovr: 75,
  away_draws: 2,
  away_goals_against: 10,
  away_goals_for: 15,
  away_losses: 3,
  away_played: 10,
  away_wins: 5,
  balance: 1000000,
  clean_sheets: 8,
  competition_type: 'league',
  conceding_by_period: { '0-15': 2 },
  current_form: 'WWDLW',
  draws: 5,
  failed_to_score: 3,
  fair_play_score: 90,
  fan_base: 80,
  fouls: 120,
  goals_against: 25,
  goals_for: 40,
  home_draws: 3,
  home_goals_against: 15,
  home_goals_for: 25,
  home_losses: 2,
  home_played: 10,
  home_wins: 5,
  injuries_active: 1,
  league_id: 'league-1',
  longest_unbeaten: 6,
  longest_win_streak: 4,
  losses: 5,
  minutes_distribution: { '1-15': 100 },
  open_play_goals: 30,
  penalty_goals: 5,
  played: 20,
  points: 35,
  possession_avg: 52.5,
  red_cards: 1,
  reputation: 70,
  scoring_by_period: { '0-15': 3 },
  season_expense: 500000,
  season_id: 'season-1',
  season_income: 800000,
  seasons_in_tier1: 2,
  seasons_in_tier2: 0,
  seasons_in_tier3: 0,
  set_piece_goals: 5,
  shots: 200,
  shots_on_target: 90,
  sponsor_income: 100000,
  sponsor_payout: 20000,
  squad_market_value: 15000000,
  squad_size: 25,
  suspensions_active: 0,
  team_id: 'team-1',
  transfer_income: 2000000,
  transfer_spend: 3000000,
  trophies_cup: 0,
  trophies_league: 1,
  trophies_playoff: 0,
  wage_bill: 4000000,
  wins: 10,
  xg_against: 22.1,
  xg_for: 38.4,
  yellow_cards: 40,
};

const teamSeasonStatBaseExpected = {
  teamId: 'team-1',
  seasonId: 'season-1',
  competitionType: 'league',
  leagueId: 'league-1',
  played: 20,
  wins: 10,
  draws: 5,
  losses: 5,
  points: 35,
  goalsFor: 40,
  goalsAgainst: 25,
  homeRecord: { played: 10, wins: 5, draws: 3, losses: 2, goalsFor: 25, goalsAgainst: 15 },
  awayRecord: { played: 10, wins: 5, draws: 2, losses: 3, goalsFor: 15, goalsAgainst: 10 },
  cleanSheets: 8,
  failedToScore: 3,
  currentForm: 'WWDLW',
  longestWinStreak: 4,
  longestUnbeaten: 6,
  shots: 200,
  shotsOnTarget: 90,
  xgFor: 38.4,
  xgAgainst: 22.1,
  scoringByPeriod: { '0-15': 3 },
  concedingByPeriod: { '0-15': 2 },
  setPieceGoals: 5,
  openPlayGoals: 30,
  penaltyGoals: 5,
  possessionAvg: 52.5,
  fouls: 120,
  yellowCards: 40,
  redCards: 1,
  fairPlayScore: 90,
  squadSize: 25,
  avgAge: 24.5,
  avgOvr: 75,
  avgCondition: 88,
  squadMarketValue: 15000000,
  injuriesActive: 1,
  suspensionsActive: 0,
  minutesDistribution: { '1-15': 100 },
  balance: 1000000,
  seasonIncome: 800000,
  seasonExpense: 500000,
  wageBill: 4000000,
  transferSpend: 3000000,
  transferIncome: 2000000,
  sponsorIncome: 100000,
  sponsorPayout: 20000,
  reputation: 70,
  fanBase: 80,
  academyLevel: 3,
  trophiesLeague: 1,
  trophiesPlayoff: 0,
  trophiesCup: 0,
  seasonsInTier1: 2,
  seasonsInTier2: 0,
  seasonsInTier3: 0,
};

/* ────────────────────────────────────────────────────────────────────────
 * 1. 월드 / 리그
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapWorldRow', () => {
  it('DB row를 World로 매핑한다', () => {
    const result = mapWorldRow({
      clock_revision: 5,
      created_at: '2026-01-01T00:00:00Z',
      current_phase: 'regular',
      current_season_number: 3,
      id: 'world-1',
      is_paused: false,
      paused_at: null,
      paused_total_minutes: 0,
      speed_changed_at: '2026-01-01T00:00:00Z',
      speed_multiplier: 1,
      world_minutes_at_speed_change: 0,
      world_seed: 42,
    });
    expect(result).toEqual({
      id: 'world-1',
      worldSeed: 42,
      currentSeasonNumber: 3,
      currentPhase: 'regular',
      speedMultiplier: 1,
      isPaused: false,
      pausedTotalMinutes: 0,
      speedChangedAt: '2026-01-01T00:00:00Z',
      worldMinutesAtSpeedChange: 0,
      pausedAt: null,
      clockRevision: 5,
      createdAt: '2026-01-01T00:00:00Z',
    });
  });
});

describe('mapLeagueRow', () => {
  it('DB row를 League로 매핑하고 world_id는 드롭한다', () => {
    const result = mapLeagueRow({
      id: 'league-1',
      name: 'Premier',
      playoff_team_count: 4,
      promotion_slots: 2,
      relegation_slots: 3,
      round_interval_min: 10,
      team_count: 20,
      tier: 1,
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'league-1',
      name: 'Premier',
      tier: 1,
      teamCount: 20,
      roundIntervalMin: 10,
      promotionSlots: 2,
      relegationSlots: 3,
      playoffTeamCount: 4,
    });
  });
});

describe('mapSeasonRow', () => {
  it('DB row를 Season으로 매핑한다', () => {
    const result = mapSeasonRow({
      ended_at: null,
      id: 'season-1',
      phase: 'regular',
      regular_ends_at: '2026-06-01T00:00:00Z',
      regular_started_at: '2026-01-01T00:00:00Z',
      season_number: 1,
      season_seed: 7,
      snapshot_id: 'snap-1',
      started_at: '2026-01-01T00:00:00Z',
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'season-1',
      seasonNumber: 1,
      seasonSeed: 7,
      phase: 'regular',
      regularStartedAt: '2026-01-01T00:00:00Z',
      regularEndsAt: '2026-06-01T00:00:00Z',
      startedAt: '2026-01-01T00:00:00Z',
      endedAt: null,
      snapshotId: 'snap-1',
    });
  });
});

describe('mapTeamRow', () => {
  it('DB row를 Team으로 매핑한다', () => {
    const result = mapTeamRow({
      academy_level: 3,
      balance: 500000,
      color_primary: '#fff',
      color_secondary: '#000',
      crest_seed: 9,
      crisis_consecutive_seasons: 0,
      fan_base: 80,
      financial_crisis: false,
      founded_season: 1990,
      id: 'team-1',
      name: 'FC Test',
      reputation: 70,
      short_name: 'TST',
      stadium_capacity: 40000,
      stadium_name: 'Test Arena',
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'team-1',
      name: 'FC Test',
      shortName: 'TST',
      foundedSeason: 1990,
      stadiumName: 'Test Arena',
      stadiumCapacity: 40000,
      colorPrimary: '#fff',
      colorSecondary: '#000',
      crestSeed: 9,
      reputation: 70,
      fanBase: 80,
      academyLevel: 3,
      balance: 500000,
      financialCrisis: false,
      crisisConsecutiveSeasons: 0,
    });
  });
});

describe('mapTeamSeasonRow', () => {
  it('DB row를 TeamSeason으로 매핑한다', () => {
    const result = mapTeamSeasonRow({
      final_rank: 3,
      league_id: 'league-1',
      promoted: false,
      relegated: false,
      season_id: 'season-1',
      team_id: 'team-1',
      tiebreak_applied: null,
    });
    expect(result).toEqual({
      teamId: 'team-1',
      seasonId: 'season-1',
      leagueId: 'league-1',
      finalRank: 3,
      promoted: false,
      relegated: false,
      tiebreakApplied: null,
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 2. 인물
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapManagerRow', () => {
  it('DB row를 Manager로 매핑한다', () => {
    const result = mapManagerRow({
      age: 45,
      contract_until_season: 5,
      id: 'manager-1',
      is_acting: false,
      name: 'John',
      preferred_formation: '4-4-2',
      reputation: 60,
      style: 'balanced',
      tactical_skill: 70,
      team_id: 'team-1',
      tenure_seasons: 2,
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'manager-1',
      teamId: 'team-1',
      name: 'John',
      age: 45,
      style: 'balanced',
      tacticalSkill: 70,
      preferredFormation: '4-4-2',
      isActing: false,
      reputation: 60,
      contractUntilSeason: 5,
      tenureSeasons: 2,
    });
  });
});

describe('mapPlayerRow', () => {
  it('DB row를 Player로 매핑한다', () => {
    const result = mapPlayerRow({
      age: 24,
      birth_season: 2000,
      id: 'player-1',
      market_value: 1000000,
      name: 'Alex',
      nationality: 'KOR',
      pa: 150,
      preferred_foot: 'right',
      preferred_position: 'ST',
      reputation: 55,
      retired_at_season: null,
      taste_tags: ['aggressive'],
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'player-1',
      name: 'Alex',
      nationality: 'KOR',
      birthSeason: 2000,
      age: 24,
      preferredFoot: 'right',
      preferredPosition: 'ST',
      pa: 150,
      reputation: 55,
      marketValue: 1000000,
      tasteTags: ['aggressive'],
      retiredAtSeason: null,
    });
  });
});

describe('mapPlayerAttributeRow', () => {
  it('34속성 + playerId/ovrCached/updatedAtSeason을 매핑한다', () => {
    const result = mapPlayerAttributeRow({
      ...attributeRowFields,
      player_id: 'player-1',
      ovr_cached: 80,
      updated_at_season: 3,
    });
    expect(result).toEqual({
      ...attributeExpectedFields,
      playerId: 'player-1',
      ovrCached: 80,
      updatedAtSeason: 3,
    });
  });
});

describe('mapPlayerAttributeHistoryRow', () => {
  it('34속성 + playerId/seasonNumber/ovr을 매핑한다', () => {
    const result = mapPlayerAttributeHistoryRow({
      ...attributeRowFields,
      player_id: 'player-1',
      season_number: 2,
      ovr: 78,
    });
    expect(result).toEqual({
      ...attributeExpectedFields,
      playerId: 'player-1',
      seasonNumber: 2,
      ovr: 78,
    });
  });
});

describe('mapPlayerPositionRow', () => {
  it('DB row를 PlayerPosition으로 매핑한다', () => {
    const result = mapPlayerPositionRow({
      player_id: 'player-1',
      position: 'CM',
      proficiency: 15,
    });
    expect(result).toEqual({ playerId: 'player-1', position: 'CM', proficiency: 15 });
  });
});

describe('mapPlayerStateRow', () => {
  it('DB row를 PlayerState로 매핑한다', () => {
    const result = mapPlayerStateRow({
      active_injury_id: null,
      condition: 90,
      familiarity_seasons: 2,
      fitness: 95,
      on_loan_team_id: null,
      player_id: 'player-1',
      squad_number: 10,
      suspension_remaining_cup: 0,
      suspension_remaining_league: 0,
      team_id: 'team-1',
      yellow_accumulated_cup: 0,
      yellow_accumulated_league: 1,
    });
    expect(result).toEqual({
      playerId: 'player-1',
      teamId: 'team-1',
      onLoanTeamId: null,
      squadNumber: 10,
      condition: 90,
      fitness: 95,
      familiaritySeasons: 2,
      yellowAccumulatedLeague: 1,
      yellowAccumulatedCup: 0,
      suspensionRemainingLeague: 0,
      suspensionRemainingCup: 0,
      activeInjuryId: null,
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 3. 계약 / 이동
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapContractRow', () => {
  it('DB row를 Contract로 매핑한다', () => {
    const result = mapContractRow({
      end_season: 5,
      id: 'contract-1',
      player_id: 'player-1',
      start_season: 1,
      status: 'active',
      team_id: 'team-1',
      transfer_fee_paid: 200000,
      wage_per_season: 50000,
    });
    expect(result).toEqual({
      id: 'contract-1',
      playerId: 'player-1',
      teamId: 'team-1',
      startSeason: 1,
      endSeason: 5,
      wagePerSeason: 50000,
      transferFeePaid: 200000,
      status: 'active',
    });
  });
});

describe('mapTransferRow', () => {
  it('jsonb negotiation_log을 포함해 Transfer로 매핑한다', () => {
    const result = mapTransferRow({
      fee: 1000000,
      from_team_id: 'team-1',
      id: 'transfer-1',
      negotiation_log: { rounds: 2 },
      player_id: 'player-1',
      season_id: 'season-1',
      to_team_id: 'team-2',
      trade_counterpart_player_id: null,
      type: 'permanent',
    });
    expect(result).toEqual({
      id: 'transfer-1',
      seasonId: 'season-1',
      playerId: 'player-1',
      fromTeamId: 'team-1',
      toTeamId: 'team-2',
      fee: 1000000,
      type: 'permanent',
      tradeCounterpartPlayerId: null,
      negotiationLog: { rounds: 2 },
    });
  });
});

describe('mapLoanRow', () => {
  it('DB row를 Loan으로 매핑한다', () => {
    const result = mapLoanRow({
      id: 'loan-1',
      loan_team_id: 'team-2',
      owner_team_id: 'team-1',
      player_id: 'player-1',
      season_id: 'season-1',
      status: 'active',
      wage_share_pct: 50,
    });
    expect(result).toEqual({
      id: 'loan-1',
      seasonId: 'season-1',
      playerId: 'player-1',
      ownerTeamId: 'team-1',
      loanTeamId: 'team-2',
      wageSharePct: 50,
      status: 'active',
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 4. 경기
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapFixtureRow', () => {
  it('DB row를 Fixture로 매핑한다', () => {
    const result = mapFixtureRow({
      attendance: 30000,
      away_score: 1,
      away_team_id: 'team-2',
      competition_type: 'league',
      et_away_score: null,
      et_home_score: null,
      home_score: 2,
      home_team_id: 'team-1',
      ht_away_score: 0,
      ht_home_score: 1,
      id: 'fixture-1',
      is_neutral: false,
      kickoff_at: '2026-02-01T15:00:00Z',
      league_id: 'league-1',
      match_seed: 99,
      pk_away: null,
      pk_home: null,
      round: 5,
      round_label: 'Round 5',
      season_id: 'season-1',
      simulated_at: '2026-02-01T17:00:00Z',
      snapshot_id: 'snap-1',
      status: 'finished',
    });
    expect(result).toEqual({
      id: 'fixture-1',
      seasonId: 'season-1',
      competitionType: 'league',
      leagueId: 'league-1',
      round: 5,
      roundLabel: 'Round 5',
      homeTeamId: 'team-1',
      awayTeamId: 'team-2',
      isNeutral: false,
      kickoffAt: '2026-02-01T15:00:00Z',
      status: 'finished',
      homeScore: 2,
      awayScore: 1,
      htHomeScore: 1,
      htAwayScore: 0,
      etHomeScore: null,
      etAwayScore: null,
      pkHome: null,
      pkAway: null,
      attendance: 30000,
      matchSeed: 99,
      snapshotId: 'snap-1',
      simulatedAt: '2026-02-01T17:00:00Z',
    });
  });
});

describe('mapMatchEventRow', () => {
  it('jsonb detail을 포함해 MatchEvent로 매핑한다', () => {
    const result = mapMatchEventRow({
      added_time: 1,
      detail: { note: 'goal' },
      id: 'event-1',
      match_id: 'fixture-1',
      minute: 23,
      primary_player_id: 'player-1',
      related_event_sequence: null,
      secondary_player_id: null,
      sequence: 4,
      team_id: 'team-1',
      type: 'goal',
      xg: 0.3,
    });
    expect(result).toEqual({
      id: 'event-1',
      matchId: 'fixture-1',
      sequence: 4,
      minute: 23,
      addedTime: 1,
      type: 'goal',
      teamId: 'team-1',
      primaryPlayerId: 'player-1',
      secondaryPlayerId: null,
      xg: 0.3,
      relatedEventSequence: null,
      detail: { note: 'goal' },
    });
  });
});

describe('mapMatchLineupRow', () => {
  it('DB row를 MatchLineup으로 매핑한다', () => {
    const result = mapMatchLineupRow({
      formation: '4-3-3',
      is_starter: true,
      match_id: 'fixture-1',
      minute_off: null,
      minute_on: 0,
      player_id: 'player-1',
      position_multiplier: 1,
      position_slot: 'ST',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      matchId: 'fixture-1',
      teamId: 'team-1',
      playerId: 'player-1',
      formation: '4-3-3',
      positionSlot: 'ST',
      isStarter: true,
      minuteOn: 0,
      minuteOff: null,
      positionMultiplier: 1,
    });
  });
});

describe('mapWeatherRow', () => {
  it('jsonb effect_modifiers를 포함해 Weather로 매핑한다', () => {
    const result = mapWeatherRow({
      effect_modifiers: { rain: 0.1 },
      match_id: 'fixture-1',
      temperature: 18,
      type: 'clear',
      wind_speed: 5,
    });
    expect(result).toEqual({
      matchId: 'fixture-1',
      type: 'clear',
      temperature: 18,
      windSpeed: 5,
      effectModifiers: { rain: 0.1 },
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 5. 통계 / 명예
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapPlayerMatchStatRow', () => {
  it('56 공유필드 + 경기별 필드를 PlayerMatchStat으로 매핑한다', () => {
    const result = mapPlayerMatchStatRow({
      ...statCoreRowFields,
      is_motm: true,
      match_id: 'fixture-1',
      match_rating: 8.2,
      player_id: 'player-1',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      ...statCoreExpectedFields,
      matchId: 'fixture-1',
      playerId: 'player-1',
      teamId: 'team-1',
      matchRating: 8.2,
      isMotm: true,
    });
  });
});

describe('mapPlayerSeasonStatRow', () => {
  it('56 공유필드 + 시즌별 필드를 PlayerSeasonStat으로 매핑한다', () => {
    const result = mapPlayerSeasonStatRow({
      ...statCoreRowFields,
      avg_condition: 88,
      avg_rating: 7.3,
      competition_type: 'league',
      contribution_score: 75,
      injuries_count: 1,
      league_id: 'league-1',
      matches_suspended: 0,
      motm_awards: 2,
      player_id: 'player-1',
      rounds_injured: 2,
      season_id: 'season-1',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      ...statCoreExpectedFields,
      playerId: 'player-1',
      seasonId: 'season-1',
      competitionType: 'league',
      teamId: 'team-1',
      leagueId: 'league-1',
      contributionScore: 75,
      avgCondition: 88,
      avgRating: 7.3,
      motmAwards: 2,
      injuriesCount: 1,
      roundsInjured: 2,
      matchesSuspended: 0,
    });
  });
});

describe('mapPlayerCareerStatRow', () => {
  it('56 공유필드 + 커리어 누계 필드를 PlayerCareerStat으로 매핑한다', () => {
    const result = mapPlayerCareerStatRow({
      ...statCoreRowFields,
      avg_rating: 6.9,
      player_id: 'player-1',
      total_awards: 3,
      total_injuries: 2,
      total_seasons: 5,
    });
    expect(result).toEqual({
      ...statCoreExpectedFields,
      playerId: 'player-1',
      avgRating: 6.9,
      totalSeasons: 5,
      totalAwards: 3,
      totalInjuries: 2,
    });
  });
});

describe('mapTeamSeasonStatRow', () => {
  it('무승/무패(biggest_win/loss가 null)면 biggestWin/biggestLoss가 null이다', () => {
    const result = mapTeamSeasonStatRow({
      ...teamSeasonStatBaseRow,
      biggest_loss_fixture_id: null,
      biggest_loss_goals_against: null,
      biggest_loss_goals_for: null,
      biggest_loss_opponent_team_id: null,
      biggest_win_fixture_id: null,
      biggest_win_goals_against: null,
      biggest_win_goals_for: null,
      biggest_win_opponent_team_id: null,
    });
    expect(result).toEqual({
      ...teamSeasonStatBaseExpected,
      biggestWin: null,
      biggestLoss: null,
    });
  });

  it('biggest_win/loss가 있으면 TeamMarginResult로 중첩 매핑한다', () => {
    const result = mapTeamSeasonStatRow({
      ...teamSeasonStatBaseRow,
      biggest_loss_fixture_id: 'fixture-2',
      biggest_loss_goals_against: 4,
      biggest_loss_goals_for: 0,
      biggest_loss_opponent_team_id: 'team-3',
      biggest_win_fixture_id: 'fixture-3',
      biggest_win_goals_against: 0,
      biggest_win_goals_for: 5,
      biggest_win_opponent_team_id: 'team-4',
    });
    expect(result).toEqual({
      ...teamSeasonStatBaseExpected,
      biggestWin: {
        opponentTeamId: 'team-4',
        fixtureId: 'fixture-3',
        goalsFor: 5,
        goalsAgainst: 0,
      },
      biggestLoss: {
        opponentTeamId: 'team-3',
        fixtureId: 'fixture-2',
        goalsFor: 0,
        goalsAgainst: 4,
      },
    });
  });
});

describe('mapStandingRow', () => {
  it('DB row를 Standing으로 매핑한다', () => {
    const result = mapStandingRow({
      drawn: 5,
      fair_play_score: 90,
      form: 'WWDLW',
      ga: 20,
      gd: 15,
      gf: 35,
      league_id: 'league-1',
      lost: 3,
      played: 20,
      points: 38,
      rank: 2,
      round: 20,
      season_id: 'season-1',
      team_id: 'team-1',
      tiebreak_applied: null,
      won: 12,
    });
    expect(result).toEqual({
      seasonId: 'season-1',
      leagueId: 'league-1',
      round: 20,
      teamId: 'team-1',
      rank: 2,
      played: 20,
      won: 12,
      drawn: 5,
      lost: 3,
      gf: 35,
      ga: 20,
      gd: 15,
      points: 38,
      form: 'WWDLW',
      fairPlayScore: 90,
      tiebreakApplied: null,
    });
  });
});

describe('mapAwardRow', () => {
  it('jsonb criteria를 포함해 Award로 매핑한다', () => {
    const result = mapAwardRow({
      criteria: { metric: 'goals' },
      id: 'award-1',
      league_id: 'league-1',
      manager_id: null,
      player_id: 'player-1',
      scope: 'league',
      season_id: 'season-1',
      team_id: 'team-1',
      type: 'top_scorer',
    });
    expect(result).toEqual({
      id: 'award-1',
      seasonId: 'season-1',
      type: 'top_scorer',
      scope: 'league',
      leagueId: 'league-1',
      playerId: 'player-1',
      managerId: null,
      teamId: 'team-1',
      criteria: { metric: 'goals' },
    });
  });
});

describe('mapTrophyRow', () => {
  it('DB row를 Trophy로 매핑한다', () => {
    const result = mapTrophyRow({
      id: 'trophy-1',
      league_id: 'league-1',
      season_id: 'season-1',
      team_id: 'team-1',
      type: 'league_winner',
    });
    expect(result).toEqual({
      id: 'trophy-1',
      seasonId: 'season-1',
      teamId: 'team-1',
      type: 'league_winner',
      leagueId: 'league-1',
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 6. 사건 / 운영 / 감사
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapInjuryRow', () => {
  it('DB row를 Injury로 매핑한다', () => {
    const result = mapInjuryRow({
      id: 'injury-1',
      match_id: 'fixture-1',
      occurred_round: 5,
      player_id: 'player-1',
      return_round: 9,
      rounds_out: 4,
      season_id: 'season-1',
      severity: 'moderate',
      status: 'active',
      type_label: 'hamstring',
    });
    expect(result).toEqual({
      id: 'injury-1',
      playerId: 'player-1',
      matchId: 'fixture-1',
      seasonId: 'season-1',
      severity: 'moderate',
      typeLabel: 'hamstring',
      occurredRound: 5,
      roundsOut: 4,
      returnRound: 9,
      status: 'active',
    });
  });
});

describe('mapYouthProspectRow', () => {
  it('DB row를 YouthProspect로 매핑한다', () => {
    const result = mapYouthProspectRow({
      academy_level_at_generation: 4,
      bonus_applied: true,
      id: 'youth-1',
      player_id: 'player-1',
      season_id: 'season-1',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      id: 'youth-1',
      seasonId: 'season-1',
      teamId: 'team-1',
      playerId: 'player-1',
      academyLevelAtGeneration: 4,
      bonusApplied: true,
    });
  });
});

describe('mapNewsFeedItemRow', () => {
  it('DB row를 NewsFeedItem으로 매핑한다', () => {
    const result = mapNewsFeedItemRow({
      body: 'content',
      headline: 'headline',
      id: 'news-1',
      occurred_at: '2026-02-01T00:00:00Z',
      ref_id: 'fixture-1',
      ref_type: 'fixture',
      season_id: 'season-1',
      type: 'match_result',
    });
    expect(result).toEqual({
      id: 'news-1',
      seasonId: 'season-1',
      type: 'match_result',
      headline: 'headline',
      body: 'content',
      refType: 'fixture',
      refId: 'fixture-1',
      occurredAt: '2026-02-01T00:00:00Z',
    });
  });
});

describe('mapSanctionRow', () => {
  it('jsonb effects를 포함해 Sanction으로 매핑한다', () => {
    const result = mapSanctionRow({
      effects: { pointsDeduction: 3 },
      grant_amount: 0,
      id: 'sanction-1',
      sanction_type: 'points_deduction',
      season_id: 'season-1',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      id: 'sanction-1',
      seasonId: 'season-1',
      teamId: 'team-1',
      sanctionType: 'points_deduction',
      effects: { pointsDeduction: 3 },
      grantAmount: 0,
    });
  });
});

describe('mapCronRunRow', () => {
  it('DB row를 CronRun으로 매핑한다', () => {
    const result = mapCronRunRow({
      duration_ms: 1500,
      error_code: null,
      error_message: null,
      finished_at: '2026-02-01T00:01:00Z',
      fixtures_processed: 10,
      id: 'cron-1',
      is_catch_up: false,
      lock_acquired: true,
      retry_count: 0,
      snapshot_hash: 'hash1',
      started_at: '2026-02-01T00:00:00Z',
      status: 'success',
    });
    expect(result).toEqual({
      id: 'cron-1',
      startedAt: '2026-02-01T00:00:00Z',
      finishedAt: '2026-02-01T00:01:00Z',
      durationMs: 1500,
      lockAcquired: true,
      fixturesProcessed: 10,
      isCatchUp: false,
      status: 'success',
      retryCount: 0,
      errorCode: null,
      errorMessage: null,
      snapshotHash: 'hash1',
    });
  });
});

describe('mapCronGapRow', () => {
  it('DB row를 CronGap으로 매핑한다', () => {
    const result = mapCronGapRow({
      detected_at: '2026-02-01T00:00:00Z',
      gap_ended_at: '2026-02-01T00:05:00Z',
      gap_minutes: 5,
      gap_started_at: '2026-02-01T00:00:00Z',
      id: 'gap-1',
      missed_fixture_count: 2,
      recovered_at: '2026-02-01T00:05:00Z',
    });
    expect(result).toEqual({
      id: 'gap-1',
      gapStartedAt: '2026-02-01T00:00:00Z',
      gapEndedAt: '2026-02-01T00:05:00Z',
      gapMinutes: 5,
      missedFixtureCount: 2,
      recoveredAt: '2026-02-01T00:05:00Z',
      detectedAt: '2026-02-01T00:00:00Z',
    });
  });
});

describe('mapAuditLogRow', () => {
  it('jsonb payload를 포함해 AuditLog로 매핑한다', () => {
    const result = mapAuditLogRow({
      action: 'update',
      actor_id: 'user-1',
      actor_type: 'admin',
      created_at: '2026-02-01T00:00:00Z',
      id: 'audit-1',
      payload: { field: 'balance' },
      target_id: 'team-1',
      target_type: 'team',
    });
    expect(result).toEqual({
      id: 'audit-1',
      actorType: 'admin',
      actorId: 'user-1',
      action: 'update',
      targetType: 'team',
      targetId: 'team-1',
      payload: { field: 'balance' },
      createdAt: '2026-02-01T00:00:00Z',
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 7. 경제
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapSponsorRow', () => {
  it('DB row를 Sponsor로 매핑한다', () => {
    const result = mapSponsorRow({
      balance: 500000,
      bankrupt_at_season: null,
      id: 'sponsor-1',
      industry: 'tech',
      name: 'Acme',
      reputation: 60,
      scale: 3,
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'sponsor-1',
      name: 'Acme',
      industry: 'tech',
      scale: 3,
      balance: 500000,
      reputation: 60,
      bankruptAtSeason: null,
    });
  });
});

describe('mapSponsorContractRow', () => {
  it('DB row를 SponsorContract로 매핑한다', () => {
    const result = mapSponsorContractRow({
      end_season: 5,
      id: 'sc-1',
      income_per_season: 200000,
      share_pct: 10,
      signed_by_owner_id: 'owner-1',
      sponsor_id: 'sponsor-1',
      start_season: 1,
      status: 'active',
      team_id: 'team-1',
    });
    expect(result).toEqual({
      id: 'sc-1',
      sponsorId: 'sponsor-1',
      teamId: 'team-1',
      signedByOwnerId: 'owner-1',
      startSeason: 1,
      endSeason: 5,
      incomePerSeason: 200000,
      sharePct: 10,
      status: 'active',
    });
  });
});

describe('mapClubOwnerRow', () => {
  it('DB row를 ClubOwner로 매핑한다(world_id는 드롭)', () => {
    const result = mapClubOwnerRow({
      age: 52,
      id: 'owner-1',
      name: 'Owner One',
      nationality: 'KR',
      negotiation: 18,
      reputation: 70,
      since_season: 3,
      team_id: 'team-1',
      wealth: 22,
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'owner-1',
      teamId: 'team-1',
      name: 'Owner One',
      age: 52,
      nationality: 'KR',
      wealth: 22,
      negotiation: 18,
      reputation: 70,
      sinceSeason: 3,
    });
  });

  it('team_id가 null이면 공석으로 매핑한다(Manager 패턴 승계)', () => {
    const result = mapClubOwnerRow({
      age: 40,
      id: 'owner-2',
      name: 'Owner Two',
      nationality: 'US',
      negotiation: 10,
      reputation: 50,
      since_season: 1,
      team_id: null,
      wealth: 15,
      world_id: 'world-1',
    });
    expect(result.teamId).toBeNull();
  });
});

describe('mapPointTransactionRow', () => {
  it('DB row를 PointTransaction으로 매핑한다', () => {
    const result = mapPointTransactionRow({
      amount: 1000,
      balance_after: 5000,
      created_at: '2026-02-01T00:00:00Z',
      id: 'pt-1',
      owner_id: 'team-1',
      owner_type: 'team',
      reason_code: 'sponsor_income',
      ref_id: 'sponsor-1',
      ref_type: 'sponsor',
      season_id: 'season-1',
    });
    expect(result).toEqual({
      id: 'pt-1',
      seasonId: 'season-1',
      ownerType: 'team',
      ownerId: 'team-1',
      amount: 1000,
      reasonCode: 'sponsor_income',
      refType: 'sponsor',
      refId: 'sponsor-1',
      balanceAfter: 5000,
      createdAt: '2026-02-01T00:00:00Z',
    });
  });
});

/* ────────────────────────────────────────────────────────────────────────
 * 8. 설정
 * ──────────────────────────────────────────────────────────────────────── */

describe('mapCommonCodeGroupRow', () => {
  it('DB row를 CommonCodeGroup으로 매핑한다', () => {
    const result = mapCommonCodeGroupRow({
      apply_policy: 'immediate',
      created_at: '2026-02-01T00:00:00Z',
      description: 'desc',
      group_code: 'GRP',
      group_name: 'Group',
      is_active: true,
      related_fr: ['FR-01'],
      sort_order: 1,
      updated_at: '2026-02-01T00:00:00Z',
      value_type: 'number',
    });
    expect(result).toEqual({
      groupCode: 'GRP',
      groupName: 'Group',
      description: 'desc',
      valueType: 'number',
      applyPolicy: 'immediate',
      relatedFr: ['FR-01'],
      isActive: true,
      sortOrder: 1,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    });
  });
});

describe('mapCommonCodeRow', () => {
  it('value_json/json_schema가 null이면 그대로 null로 매핑한다', () => {
    const result = mapCommonCodeRow({
      code: 'CODE1',
      created_at: '2026-02-01T00:00:00Z',
      default_value: '10',
      description: 'desc',
      effective_from_season: 1,
      group_code: 'GRP',
      id: 'cc-1',
      is_active: true,
      json_schema: null,
      max_value: 100,
      min_value: 0,
      sort_order: 1,
      unit: 'pts',
      updated_at: '2026-02-01T00:00:00Z',
      updated_by: null,
      value: '10',
      value_json: null,
      value_num: 10,
      world_id: null,
    });
    expect(result).toEqual({
      id: 'cc-1',
      groupCode: 'GRP',
      code: 'CODE1',
      worldId: null,
      value: '10',
      valueNum: 10,
      valueJson: null,
      minValue: 0,
      maxValue: 100,
      jsonSchema: null,
      defaultValue: '10',
      description: 'desc',
      unit: 'pts',
      sortOrder: 1,
      isActive: true,
      effectiveFromSeason: 1,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      updatedBy: null,
    });
  });

  it('value_json/json_schema가 non-null이면 캐스트된 객체로 매핑한다', () => {
    const result = mapCommonCodeRow({
      code: 'CODE2',
      created_at: '2026-02-01T00:00:00Z',
      default_value: '20',
      description: 'desc2',
      effective_from_season: 2,
      group_code: 'GRP',
      id: 'cc-2',
      is_active: true,
      json_schema: { type: 'number' },
      max_value: 200,
      min_value: 0,
      sort_order: 2,
      unit: 'pts',
      updated_at: '2026-02-01T00:00:00Z',
      updated_by: 'user-1',
      value: '20',
      value_json: { foo: 1 },
      value_num: 20,
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'cc-2',
      groupCode: 'GRP',
      code: 'CODE2',
      worldId: 'world-1',
      value: '20',
      valueNum: 20,
      valueJson: { foo: 1 },
      minValue: 0,
      maxValue: 200,
      jsonSchema: { type: 'number' },
      defaultValue: '20',
      description: 'desc2',
      unit: 'pts',
      sortOrder: 2,
      isActive: true,
      effectiveFromSeason: 2,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      updatedBy: 'user-1',
    });
  });
});

describe('mapCommonCodeHistoryRow', () => {
  it('DB row를 CommonCodeHistory로 매핑한다', () => {
    const result = mapCommonCodeHistoryRow({
      action: 'update',
      changed_at: '2026-02-01T00:00:00Z',
      changed_by: 'user-1',
      code: 'CODE1',
      common_code_id: 'cc-1',
      group_code: 'GRP',
      id: 'cch-1',
      new_effective_from_season: 2,
      new_value: '20',
      old_effective_from_season: 1,
      old_value: '10',
      reason: 'balance adjustment',
    });
    expect(result).toEqual({
      id: 'cch-1',
      commonCodeId: 'cc-1',
      groupCode: 'GRP',
      code: 'CODE1',
      action: 'update',
      oldValue: '10',
      newValue: '20',
      oldEffectiveFromSeason: 1,
      newEffectiveFromSeason: 2,
      changedBy: 'user-1',
      changedAt: '2026-02-01T00:00:00Z',
      reason: 'balance adjustment',
    });
  });
});

describe('mapSimConstantSnapshotRow', () => {
  it('jsonb constants를 포함해 SimConstantSnapshot으로 매핑한다', () => {
    const result = mapSimConstantSnapshotRow({
      constants: { sim: { k: 1 } },
      created_at: '2026-02-01T00:00:00Z',
      first_used_season: 1,
      id: 'snap-1',
      ref_count: 3,
      snapshot_hash: 'hash',
      world_id: 'world-1',
    });
    expect(result).toEqual({
      id: 'snap-1',
      worldId: 'world-1',
      snapshotHash: 'hash',
      constants: { sim: { k: 1 } },
      createdAt: '2026-02-01T00:00:00Z',
      firstUsedSeason: 1,
      refCount: 3,
    });
  });
});
