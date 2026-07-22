/**
 * DB → 도메인 매퍼 — **Task 032, 17일차(2026-08-12), 6팀 DB·인프라팀 소유**
 *
 * `database.types.ts`(MCP 생성, snake_case·브랜드 없음)와 `src/types/**`(8일차 동결,
 * camelCase·브랜드/enum) 사이의 **단방향 경계**다. 이 파일 밖 어떤 계층도(어댑터 구현체
 * 포함) `database.types.ts`의 `Row`를 직접 화면·컴포넌트에 노출하지 않는다 — 항상 이
 * 파일의 `mapXxxRow` 함수를 거쳐 도메인 타입으로 변환한 값만 전달한다(DC-01).
 *
 * ## 캐스팅 원칙
 * - **브랜드 ID/시드/포인트**(`TeamId`/`MatchSeed`/`Points` 등)와 **enum성 문자열**
 *   (`FixtureStatus`/`MatchEventType` 등)은 DB 컬럼이 검증되지 않은 `string`/`number`이므로
 *   `as XxxBrand` 단일 캐스트로 부여한다(`brand.ts` 헤더 "생성은 이 파일 밖에서 하지
 *   않는다" 원칙 — 매퍼가 그 유일 생성 지점 중 하나다).
 * - **`jsonb` 컬럼**(`Json` 유니온)은 도메인 쪽 `Readonly<Record<string, unknown>>` 등과
 *   구조적으로 겹치지 않아 `as unknown as T`(`asJson`/`asJsonOrNull` 헬퍼)를 쓴다.
 * - 그 외 원시 `number`/`boolean`/`string` 필드는 캐스트 없이 그대로 대입한다(구조적으로
 *   이미 호환).
 *
 * ## 범위 밖 (이 파일이 다루지 않는 것)
 * - **배팅/사용자 도메인**(`betting.ts`: `BetMarket`/`Bet`/`User` 등, E-33~E-40) — 2차
 *   릴리스 선정의 대상이며 대응 테이블 자체가 아직 마이그레이션되지 않았다
 *   (`supabase/migrations/`에 `bet_*`/`users`/`wallet_transaction` 없음). 해당 테이블이
 *   생기는 시점에 이 파일에 이어서 추가한다.
 * - **`DataSource.ts`의 합성 DTO**(`PublicPlayerProfile`/`MatchTeamStatComparison`/
 *   `FixtureRoundBounds`/`CronRunMetrics`/`PlayerStatRankingMetric`/`MultiAwardRankingEntry`)
 *   — 여러 테이블을 조합하거나 조회 시점 파생(스카우트 등급 등)이 필요한 조회 계층 로직이라
 *   Task 034(Supabase 어댑터) 소관이다. 이 파일은 테이블 1개 ↔ 엔티티 1개의 순수 변환만 한다.
 *
 * 도메인 타입은 배럴(`@/types`)로만 import한다(체크리스트 C-5·C-6).
 */

import type { Database } from '../database.types';
import type {
  // 브랜드 ID
  AuditLogId,
  AwardId,
  ClubOwnerId,
  CommonCodeHistoryId,
  CommonCodeId,
  ContractId,
  CronGapId,
  CronRunId,
  FixtureId,
  InjuryId,
  LeagueId,
  LoanId,
  ManagerId,
  MatchEventId,
  NewsFeedItemId,
  PlayerId,
  PointTransactionId,
  SanctionId,
  SeasonId,
  Seed,
  SnapshotId,
  SponsorContractId,
  SponsorId,
  TeamId,
  TransferId,
  TrophyId,
  UserId,
  WorldId,
  YouthProspectId,
  // 시드 계층 / 포인트
  MatchSeed,
  Points,
  SeasonSeed,
  WorldSeed,
  // enum성 값
  AuditActorType,
  AwardScope,
  AwardType,
  CommonCodeApplyPolicy,
  CommonCodeHistoryAction,
  CommonCodeValueType,
  CompetitionType,
  ContractStatus,
  CronRunStatus,
  Formation,
  FixtureStatus,
  InjurySeverity,
  InjuryStatus,
  LoanStatus,
  ManagerStyle,
  MatchEventType,
  NationalityCode,
  NewsFeedItemType,
  PointTransactionOwnerType,
  PointTransactionReasonCode,
  Position,
  PreferredFoot,
  SanctionType,
  SeasonPhase,
  SponsorContractStatus,
  TransferType,
  TrophyType,
  WeatherType,
  // 도메인 엔티티
  AuditLog,
  Award,
  ClubOwner,
  CommonCode,
  CommonCodeGroup,
  CommonCodeHistory,
  Contract,
  CronGap,
  CronRun,
  Fixture,
  Injury,
  League,
  Loan,
  Manager,
  MatchEvent,
  MatchLineup,
  NewsFeedItem,
  Player,
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerAttributeValues,
  PlayerCareerStat,
  PlayerMatchStat,
  PlayerPosition,
  PlayerSeasonStat,
  PlayerState,
  PlayerStatCoreValues,
  PointTransaction,
  Sanction,
  SimConstantSnapshot,
  Season,
  Sponsor,
  SponsorContract,
  Standing,
  Team,
  TeamMarginResult,
  TeamSeason,
  TeamSeasonStat,
  TeamSplitRecord,
  Transfer,
  Trophy,
  Weather,
  World,
  YouthProspect,
} from '@/types';

/* ────────────────────────────────────────────────────────────────────────
 * 내부 유틸
 * ──────────────────────────────────────────────────────────────────────── */

type Tables = Database['public']['Tables'];
/** 테이블명으로 생성된 `Row` shape을 뽑는 축약 별칭 */
type Row<T extends keyof Tables> = Tables[T]['Row'];
type Json = Database['public']['Tables']['audit_log']['Row']['payload'];

/** `jsonb` 컬럼(`Json` 유니온) → 도메인 쪽 구조화 타입. 구조가 겹치지 않아 2단 캐스트 필요 */
function asJson<T>(value: Json): T {
  return value as unknown as T;
}

/** nullable `jsonb` 컬럼용 — null이면 그대로 null */
function asJsonOrNull<T>(value: Json | null): T | null {
  return value === null ? null : (value as unknown as T);
}

/* ────────────────────────────────────────────────────────────────────────
 * 공유 블록 매퍼 — `person.ts`/`stat.ts`가 여러 테이블에서 재사용하는 필드 묶음.
 * 도메인 쪽이 단일 선언(C-6)이므로 여기서도 함수 하나로 묶어 3~4개 테이블 매퍼가 재사용한다.
 * ──────────────────────────────────────────────────────────────────────── */

type PlayerAttributeValuesRow = Pick<
  Row<'player_attribute'>,
  | 'acceleration'
  | 'aerial_reach'
  | 'aggression'
  | 'agility'
  | 'anticipation'
  | 'balance'
  | 'command_of_area'
  | 'composure'
  | 'crossing'
  | 'decisions'
  | 'determination'
  | 'dribbling'
  | 'finishing'
  | 'first_touch'
  | 'handling'
  | 'heading'
  | 'jumping'
  | 'kicking'
  | 'leadership'
  | 'long_shots'
  | 'marking'
  | 'natural_fitness'
  | 'one_on_ones'
  | 'pace'
  | 'passing'
  | 'positioning'
  | 'reflexes'
  | 'set_pieces'
  | 'stamina'
  | 'strength'
  | 'tackling'
  | 'teamwork'
  | 'vision'
  | 'work_rate'
>;

/** `PlayerAttribute`/`PlayerAttributeHistory` 공유 34속성 블록(`person.ts` `PlayerAttributeValues`) */
function mapPlayerAttributeValues(row: PlayerAttributeValuesRow): PlayerAttributeValues {
  return {
    finishing: row.finishing,
    passing: row.passing,
    crossing: row.crossing,
    dribbling: row.dribbling,
    firstTouch: row.first_touch,
    tackling: row.tackling,
    marking: row.marking,
    heading: row.heading,
    longShots: row.long_shots,
    setPieces: row.set_pieces,
    composure: row.composure,
    decisions: row.decisions,
    vision: row.vision,
    positioning: row.positioning,
    workRate: row.work_rate,
    aggression: row.aggression,
    leadership: row.leadership,
    teamwork: row.teamwork,
    anticipation: row.anticipation,
    determination: row.determination,
    pace: row.pace,
    acceleration: row.acceleration,
    stamina: row.stamina,
    strength: row.strength,
    agility: row.agility,
    balance: row.balance,
    jumping: row.jumping,
    naturalFitness: row.natural_fitness,
    reflexes: row.reflexes,
    handling: row.handling,
    oneOnOnes: row.one_on_ones,
    aerialReach: row.aerial_reach,
    kicking: row.kicking,
    commandOfArea: row.command_of_area,
  };
}

type PlayerStatCoreRow = Pick<
  Row<'player_career_stat'>,
  | 'aerial_duels_attempted'
  | 'aerial_duels_won'
  | 'appearances'
  | 'assists'
  | 'big_chances_created'
  | 'big_chances_missed'
  | 'blocks'
  | 'catches'
  | 'clean_sheets'
  | 'clearances'
  | 'crosses_attempted'
  | 'crosses_completed'
  | 'dispossessed'
  | 'dribbles_attempted'
  | 'dribbles_completed'
  | 'errors_leading_to_goal'
  | 'errors_leading_to_shot'
  | 'fouls_committed'
  | 'fouls_drawn'
  | 'free_kick_goals'
  | 'goals'
  | 'goals_conceded'
  | 'ground_duels_attempted'
  | 'ground_duels_won'
  | 'headed_goals'
  | 'interceptions'
  | 'key_passes'
  | 'long_balls_attempted'
  | 'long_balls_completed'
  | 'minutes_played'
  | 'offsides'
  | 'own_goals'
  | 'passes_attempted'
  | 'passes_completed'
  | 'penalties_faced'
  | 'penalties_saved'
  | 'penalties_scored'
  | 'penalties_taken'
  | 'punches'
  | 'red_cards'
  | 'saves'
  | 'second_yellows'
  | 'shots'
  | 'shots_faced'
  | 'shots_on_target'
  | 'starts'
  | 'sub_appearances'
  | 'sweeper_actions'
  | 'tackles_attempted'
  | 'tackles_won'
  | 'through_balls'
  | 'touches'
  | 'xa'
  | 'xg'
  | 'xg_prevented'
  | 'yellow_cards'
>;

/**
 * `PlayerMatchStat`/`PlayerSeasonStat`/`PlayerCareerStat` 공유 56필드 블록
 * (`stat.ts` `PlayerStatCoreValues`, FR-ST-001 — 비율형 파생 지표는 여기 없음, 조회 시점 계산)
 */
function mapPlayerStatCoreValues(row: PlayerStatCoreRow): PlayerStatCoreValues {
  return {
    appearances: row.appearances,
    starts: row.starts,
    subAppearances: row.sub_appearances,
    minutesPlayed: row.minutes_played,
    goals: row.goals,
    assists: row.assists,
    shots: row.shots,
    shotsOnTarget: row.shots_on_target,
    xg: row.xg,
    xa: row.xa,
    bigChancesCreated: row.big_chances_created,
    bigChancesMissed: row.big_chances_missed,
    penaltiesTaken: row.penalties_taken,
    penaltiesScored: row.penalties_scored,
    freeKickGoals: row.free_kick_goals,
    headedGoals: row.headed_goals,
    ownGoals: row.own_goals,
    passesAttempted: row.passes_attempted,
    passesCompleted: row.passes_completed,
    keyPasses: row.key_passes,
    longBallsAttempted: row.long_balls_attempted,
    longBallsCompleted: row.long_balls_completed,
    crossesAttempted: row.crosses_attempted,
    crossesCompleted: row.crosses_completed,
    throughBalls: row.through_balls,
    dribblesAttempted: row.dribbles_attempted,
    dribblesCompleted: row.dribbles_completed,
    dispossessed: row.dispossessed,
    touches: row.touches,
    tacklesAttempted: row.tackles_attempted,
    tacklesWon: row.tackles_won,
    interceptions: row.interceptions,
    clearances: row.clearances,
    blocks: row.blocks,
    aerialDuelsAttempted: row.aerial_duels_attempted,
    aerialDuelsWon: row.aerial_duels_won,
    groundDuelsAttempted: row.ground_duels_attempted,
    groundDuelsWon: row.ground_duels_won,
    errorsLeadingToShot: row.errors_leading_to_shot,
    errorsLeadingToGoal: row.errors_leading_to_goal,
    foulsCommitted: row.fouls_committed,
    foulsDrawn: row.fouls_drawn,
    yellowCards: row.yellow_cards,
    secondYellows: row.second_yellows,
    redCards: row.red_cards,
    offsides: row.offsides,
    saves: row.saves,
    shotsFaced: row.shots_faced,
    goalsConceded: row.goals_conceded,
    cleanSheets: row.clean_sheets,
    penaltiesFaced: row.penalties_faced,
    penaltiesSaved: row.penalties_saved,
    punches: row.punches,
    catches: row.catches,
    sweeperActions: row.sweeper_actions,
    xgPrevented: row.xg_prevented,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 1. 월드 / 리그 (E-01~E-05, `world.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapWorldRow(row: Row<'world'>): World {
  return {
    id: row.id as WorldId,
    worldSeed: row.world_seed as WorldSeed,
    currentSeasonNumber: row.current_season_number,
    currentPhase: row.current_phase as SeasonPhase,
    speedMultiplier: row.speed_multiplier,
    isPaused: row.is_paused,
    pausedTotalMinutes: row.paused_total_minutes,
    speedChangedAt: row.speed_changed_at,
    worldMinutesAtSpeedChange: row.world_minutes_at_speed_change,
    pausedAt: row.paused_at,
    clockRevision: row.clock_revision,
    createdAt: row.created_at,
  };
}

/** `world_id` FK는 조회 계층 스코핑용이며 도메인 `League`에 없다(D-15) — 매핑에서 드롭 */
export function mapLeagueRow(row: Row<'league'>): League {
  return {
    id: row.id as LeagueId,
    name: row.name,
    tier: row.tier,
    teamCount: row.team_count,
    roundIntervalMin: row.round_interval_min,
    promotionSlots: row.promotion_slots,
    relegationSlots: row.relegation_slots,
    playoffTeamCount: row.playoff_team_count,
  };
}

/** `world_id` FK는 도메인 `Season`에 없다(D-15) — 매핑에서 드롭 */
export function mapSeasonRow(row: Row<'season'>): Season {
  return {
    id: row.id as SeasonId,
    seasonNumber: row.season_number,
    seasonSeed: row.season_seed as SeasonSeed,
    phase: row.phase as SeasonPhase,
    regularStartedAt: row.regular_started_at,
    regularEndsAt: row.regular_ends_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    snapshotId: row.snapshot_id as SnapshotId | null,
  };
}

/** `world_id` FK는 도메인 `Team`에 없다(D-15) — 매핑에서 드롭 */
export function mapTeamRow(row: Row<'team'>): Team {
  return {
    id: row.id as TeamId,
    name: row.name,
    shortName: row.short_name,
    foundedSeason: row.founded_season,
    stadiumName: row.stadium_name,
    stadiumCapacity: row.stadium_capacity,
    colorPrimary: row.color_primary,
    colorSecondary: row.color_secondary,
    crestSeed: row.crest_seed as Seed,
    reputation: row.reputation,
    fanBase: row.fan_base,
    academyLevel: row.academy_level,
    balance: row.balance as Points,
    financialCrisis: row.financial_crisis,
    crisisConsecutiveSeasons: row.crisis_consecutive_seasons,
  };
}

export function mapTeamSeasonRow(row: Row<'team_season'>): TeamSeason {
  return {
    teamId: row.team_id as TeamId,
    seasonId: row.season_id as SeasonId,
    leagueId: row.league_id as LeagueId,
    finalRank: row.final_rank,
    promoted: row.promoted,
    relegated: row.relegated,
    tiebreakApplied: row.tiebreak_applied,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. 인물 (E-06~E-11, `person.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

/** `world_id` FK는 도메인 `Manager`에 없다(D-15) — 매핑에서 드롭 */
export function mapManagerRow(row: Row<'manager'>): Manager {
  return {
    id: row.id as ManagerId,
    teamId: row.team_id as TeamId | null,
    name: row.name,
    age: row.age,
    style: row.style as ManagerStyle,
    tacticalSkill: row.tactical_skill,
    preferredFormation: row.preferred_formation as Formation,
    isActing: row.is_acting,
    reputation: row.reputation,
    contractUntilSeason: row.contract_until_season,
    tenureSeasons: row.tenure_seasons,
  };
}

/** `world_id` FK는 도메인 `ClubOwner`에 없다(D-15) — 매핑에서 드롭 */
export function mapClubOwnerRow(row: Row<'club_owner'>): ClubOwner {
  return {
    id: row.id as ClubOwnerId,
    teamId: row.team_id as TeamId | null,
    name: row.name,
    age: row.age,
    nationality: row.nationality as NationalityCode,
    wealth: row.wealth,
    negotiation: row.negotiation,
    reputation: row.reputation,
    sinceSeason: row.since_season,
  };
}

/** `world_id` FK는 도메인 `Player`에 없다(D-15) — 매핑에서 드롭 */
export function mapPlayerRow(row: Row<'player'>): Player {
  return {
    id: row.id as PlayerId,
    name: row.name,
    nationality: row.nationality as NationalityCode,
    birthSeason: row.birth_season,
    age: row.age,
    preferredFoot: row.preferred_foot as PreferredFoot,
    preferredPosition: row.preferred_position as Position,
    pa: row.pa,
    reputation: row.reputation,
    marketValue: row.market_value as Points,
    tasteTags: row.taste_tags,
    retiredAtSeason: row.retired_at_season,
  };
}

export function mapPlayerAttributeRow(row: Row<'player_attribute'>): PlayerAttribute {
  return {
    ...mapPlayerAttributeValues(row),
    playerId: row.player_id as PlayerId,
    ovrCached: row.ovr_cached,
    updatedAtSeason: row.updated_at_season,
  };
}

export function mapPlayerAttributeHistoryRow(
  row: Row<'player_attribute_history'>,
): PlayerAttributeHistory {
  return {
    ...mapPlayerAttributeValues(row),
    playerId: row.player_id as PlayerId,
    seasonNumber: row.season_number,
    ovr: row.ovr,
  };
}

export function mapPlayerPositionRow(row: Row<'player_position'>): PlayerPosition {
  return {
    playerId: row.player_id as PlayerId,
    position: row.position as Position,
    proficiency: row.proficiency,
  };
}

export function mapPlayerStateRow(row: Row<'player_state'>): PlayerState {
  return {
    playerId: row.player_id as PlayerId,
    teamId: row.team_id as TeamId | null,
    onLoanTeamId: row.on_loan_team_id as TeamId | null,
    squadNumber: row.squad_number,
    condition: row.condition,
    fitness: row.fitness,
    familiaritySeasons: row.familiarity_seasons,
    yellowAccumulatedLeague: row.yellow_accumulated_league,
    yellowAccumulatedCup: row.yellow_accumulated_cup,
    suspensionRemainingLeague: row.suspension_remaining_league,
    suspensionRemainingCup: row.suspension_remaining_cup,
    activeInjuryId: row.active_injury_id as InjuryId | null,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. 계약 / 이동 (E-12~E-14, `economy.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapContractRow(row: Row<'contract'>): Contract {
  return {
    id: row.id as ContractId,
    playerId: row.player_id as PlayerId,
    teamId: row.team_id as TeamId,
    startSeason: row.start_season,
    endSeason: row.end_season,
    wagePerSeason: row.wage_per_season as Points,
    transferFeePaid: row.transfer_fee_paid as Points,
    status: row.status as ContractStatus,
  };
}

export function mapTransferRow(row: Row<'transfer'>): Transfer {
  return {
    id: row.id as TransferId,
    seasonId: row.season_id as SeasonId,
    playerId: row.player_id as PlayerId,
    fromTeamId: row.from_team_id as TeamId | null,
    toTeamId: row.to_team_id as TeamId,
    fee: row.fee as Points,
    type: row.type as TransferType,
    tradeCounterpartPlayerId: row.trade_counterpart_player_id as PlayerId | null,
    negotiationLog: asJson<Readonly<Record<string, unknown>>>(row.negotiation_log),
  };
}

export function mapLoanRow(row: Row<'loan'>): Loan {
  return {
    id: row.id as LoanId,
    seasonId: row.season_id as SeasonId,
    playerId: row.player_id as PlayerId,
    ownerTeamId: row.owner_team_id as TeamId,
    loanTeamId: row.loan_team_id as TeamId,
    wageSharePct: row.wage_share_pct,
    status: row.status as LoanStatus,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. 경기 (E-15~E-18, `match.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapFixtureRow(row: Row<'fixture'>): Fixture {
  return {
    id: row.id as FixtureId,
    seasonId: row.season_id as SeasonId,
    competitionType: row.competition_type as CompetitionType,
    leagueId: row.league_id as LeagueId | null,
    round: row.round,
    roundLabel: row.round_label,
    homeTeamId: row.home_team_id as TeamId,
    awayTeamId: row.away_team_id as TeamId,
    isNeutral: row.is_neutral,
    kickoffAt: row.kickoff_at,
    status: row.status as FixtureStatus,
    homeScore: row.home_score,
    awayScore: row.away_score,
    htHomeScore: row.ht_home_score,
    htAwayScore: row.ht_away_score,
    etHomeScore: row.et_home_score,
    etAwayScore: row.et_away_score,
    pkHome: row.pk_home,
    pkAway: row.pk_away,
    attendance: row.attendance,
    matchSeed: row.match_seed as MatchSeed,
    snapshotId: row.snapshot_id as SnapshotId,
    simulatedAt: row.simulated_at,
  };
}

export function mapMatchEventRow(row: Row<'match_event'>): MatchEvent {
  return {
    id: row.id as MatchEventId,
    matchId: row.match_id as FixtureId,
    sequence: row.sequence,
    minute: row.minute,
    addedTime: row.added_time,
    type: row.type as MatchEventType,
    teamId: row.team_id as TeamId | null,
    primaryPlayerId: row.primary_player_id as PlayerId | null,
    secondaryPlayerId: row.secondary_player_id as PlayerId | null,
    xg: row.xg,
    relatedEventSequence: row.related_event_sequence,
    detail: asJson<Readonly<Record<string, unknown>>>(row.detail),
  };
}

export function mapMatchLineupRow(row: Row<'match_lineup'>): MatchLineup {
  return {
    matchId: row.match_id as FixtureId,
    teamId: row.team_id as TeamId,
    playerId: row.player_id as PlayerId,
    formation: row.formation as Formation,
    positionSlot: row.position_slot as Position,
    isStarter: row.is_starter,
    minuteOn: row.minute_on,
    minuteOff: row.minute_off,
    positionMultiplier: row.position_multiplier,
  };
}

export function mapWeatherRow(row: Row<'weather'>): Weather {
  return {
    matchId: row.match_id as FixtureId,
    type: row.type as WeatherType,
    temperature: row.temperature,
    windSpeed: row.wind_speed,
    effectModifiers: asJson<Readonly<Record<string, unknown>>>(row.effect_modifiers),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. 통계 / 명예 (E-19~E-23, E-31, E-32, `stat.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapPlayerMatchStatRow(row: Row<'player_match_stat'>): PlayerMatchStat {
  return {
    ...mapPlayerStatCoreValues(row),
    matchId: row.match_id as FixtureId,
    playerId: row.player_id as PlayerId,
    teamId: row.team_id as TeamId,
    matchRating: row.match_rating,
    isMotm: row.is_motm,
  };
}

export function mapPlayerSeasonStatRow(row: Row<'player_season_stat'>): PlayerSeasonStat {
  return {
    ...mapPlayerStatCoreValues(row),
    playerId: row.player_id as PlayerId,
    seasonId: row.season_id as SeasonId,
    competitionType: row.competition_type as CompetitionType,
    teamId: row.team_id as TeamId,
    leagueId: row.league_id as LeagueId,
    contributionScore: row.contribution_score,
    avgCondition: row.avg_condition,
    avgRating: row.avg_rating,
    motmAwards: row.motm_awards,
    injuriesCount: row.injuries_count,
    roundsInjured: row.rounds_injured,
    matchesSuspended: row.matches_suspended,
  };
}

export function mapPlayerCareerStatRow(row: Row<'player_career_stat'>): PlayerCareerStat {
  return {
    ...mapPlayerStatCoreValues(row),
    playerId: row.player_id as PlayerId,
    totalSeasons: row.total_seasons,
    totalAwards: row.total_awards,
    totalInjuries: row.total_injuries,
    avgRating: row.avg_rating,
  };
}

/**
 * `TeamSeasonStat` — 홈/원정 세부(`TeamSplitRecord`)·최다득실차(`TeamMarginResult`)는
 * DB에 평탄화(flatten)돼 있어 매퍼가 중첩 객체로 재구성한다(도메인 쪽 구조, `stat.ts` 참조).
 * `biggest_win_fixture_id`/`biggest_loss_fixture_id`가 null이면(무승/무패) 나머지 동반
 * 컬럼도 함께 null이라는 게 스키마 불변식이므로, null 아닌 분기에서만 non-null로 캐스트한다.
 */
export function mapTeamSeasonStatRow(row: Row<'team_season_stat'>): TeamSeasonStat {
  const homeRecord: TeamSplitRecord = {
    played: row.home_played,
    wins: row.home_wins,
    draws: row.home_draws,
    losses: row.home_losses,
    goalsFor: row.home_goals_for,
    goalsAgainst: row.home_goals_against,
  };
  const awayRecord: TeamSplitRecord = {
    played: row.away_played,
    wins: row.away_wins,
    draws: row.away_draws,
    losses: row.away_losses,
    goalsFor: row.away_goals_for,
    goalsAgainst: row.away_goals_against,
  };
  const biggestWin: TeamMarginResult | null =
    row.biggest_win_fixture_id === null
      ? null
      : {
          opponentTeamId: row.biggest_win_opponent_team_id as TeamId,
          fixtureId: row.biggest_win_fixture_id as FixtureId,
          goalsFor: row.biggest_win_goals_for as number,
          goalsAgainst: row.biggest_win_goals_against as number,
        };
  const biggestLoss: TeamMarginResult | null =
    row.biggest_loss_fixture_id === null
      ? null
      : {
          opponentTeamId: row.biggest_loss_opponent_team_id as TeamId,
          fixtureId: row.biggest_loss_fixture_id as FixtureId,
          goalsFor: row.biggest_loss_goals_for as number,
          goalsAgainst: row.biggest_loss_goals_against as number,
        };

  return {
    teamId: row.team_id as TeamId,
    seasonId: row.season_id as SeasonId,
    competitionType: row.competition_type as CompetitionType,
    leagueId: row.league_id as LeagueId,
    played: row.played,
    wins: row.wins,
    draws: row.draws,
    losses: row.losses,
    points: row.points,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    homeRecord,
    awayRecord,
    cleanSheets: row.clean_sheets,
    failedToScore: row.failed_to_score,
    biggestWin,
    biggestLoss,
    currentForm: row.current_form,
    longestWinStreak: row.longest_win_streak,
    longestUnbeaten: row.longest_unbeaten,
    shots: row.shots,
    shotsOnTarget: row.shots_on_target,
    xgFor: row.xg_for,
    xgAgainst: row.xg_against,
    scoringByPeriod: asJson<Readonly<Record<string, number>>>(row.scoring_by_period),
    concedingByPeriod: asJson<Readonly<Record<string, number>>>(row.conceding_by_period),
    setPieceGoals: row.set_piece_goals,
    openPlayGoals: row.open_play_goals,
    penaltyGoals: row.penalty_goals,
    possessionAvg: row.possession_avg,
    fouls: row.fouls,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards,
    fairPlayScore: row.fair_play_score,
    squadSize: row.squad_size,
    avgAge: row.avg_age,
    avgOvr: row.avg_ovr,
    avgCondition: row.avg_condition,
    squadMarketValue: row.squad_market_value as Points,
    injuriesActive: row.injuries_active,
    suspensionsActive: row.suspensions_active,
    minutesDistribution: asJson<Readonly<Record<string, number>>>(row.minutes_distribution),
    balance: row.balance as Points,
    seasonIncome: row.season_income as Points,
    seasonExpense: row.season_expense as Points,
    wageBill: row.wage_bill as Points,
    transferSpend: row.transfer_spend as Points,
    transferIncome: row.transfer_income as Points,
    sponsorIncome: row.sponsor_income as Points,
    sponsorPayout: row.sponsor_payout as Points,
    reputation: row.reputation,
    fanBase: row.fan_base,
    academyLevel: row.academy_level,
    trophiesLeague: row.trophies_league,
    trophiesPlayoff: row.trophies_playoff,
    trophiesCup: row.trophies_cup,
    seasonsInTier1: row.seasons_in_tier1,
    seasonsInTier2: row.seasons_in_tier2,
    seasonsInTier3: row.seasons_in_tier3,
  };
}

export function mapStandingRow(row: Row<'standing'>): Standing {
  return {
    seasonId: row.season_id as SeasonId,
    leagueId: row.league_id as LeagueId,
    round: row.round,
    teamId: row.team_id as TeamId,
    rank: row.rank,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    gf: row.gf,
    ga: row.ga,
    gd: row.gd,
    points: row.points,
    form: row.form,
    fairPlayScore: row.fair_play_score,
    tiebreakApplied: row.tiebreak_applied,
  };
}

export function mapAwardRow(row: Row<'award'>): Award {
  return {
    id: row.id as AwardId,
    seasonId: row.season_id as SeasonId,
    type: row.type as AwardType,
    scope: row.scope as AwardScope,
    leagueId: row.league_id as LeagueId | null,
    playerId: row.player_id as PlayerId | null,
    managerId: row.manager_id as ManagerId | null,
    teamId: row.team_id as TeamId | null,
    criteria: asJson<Readonly<Record<string, unknown>>>(row.criteria),
  };
}

export function mapTrophyRow(row: Row<'trophy'>): Trophy {
  return {
    id: row.id as TrophyId,
    seasonId: row.season_id as SeasonId,
    teamId: row.team_id as TeamId,
    type: row.type as TrophyType,
    leagueId: row.league_id as LeagueId | null,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. 사건 / 운영 / 감사 (E-24~E-27, E-45~E-47, `ops.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapInjuryRow(row: Row<'injury'>): Injury {
  return {
    id: row.id as InjuryId,
    playerId: row.player_id as PlayerId,
    matchId: row.match_id as FixtureId | null,
    seasonId: row.season_id as SeasonId,
    severity: row.severity as InjurySeverity,
    typeLabel: row.type_label,
    occurredRound: row.occurred_round,
    roundsOut: row.rounds_out,
    returnRound: row.return_round,
    status: row.status as InjuryStatus,
  };
}

export function mapYouthProspectRow(row: Row<'youth_prospect'>): YouthProspect {
  return {
    id: row.id as YouthProspectId,
    seasonId: row.season_id as SeasonId,
    teamId: row.team_id as TeamId,
    playerId: row.player_id as PlayerId,
    academyLevelAtGeneration: row.academy_level_at_generation,
    bonusApplied: row.bonus_applied,
  };
}

export function mapNewsFeedItemRow(row: Row<'news_feed_item'>): NewsFeedItem {
  return {
    id: row.id as NewsFeedItemId,
    seasonId: row.season_id as SeasonId,
    type: row.type as NewsFeedItemType,
    headline: row.headline,
    body: row.body,
    refType: row.ref_type,
    refId: row.ref_id,
    occurredAt: row.occurred_at,
  };
}

export function mapSanctionRow(row: Row<'sanction'>): Sanction {
  return {
    id: row.id as SanctionId,
    seasonId: row.season_id as SeasonId,
    teamId: row.team_id as TeamId,
    sanctionType: row.sanction_type as SanctionType,
    effects: asJson<Readonly<Record<string, unknown>>>(row.effects),
    grantAmount: row.grant_amount as Points,
  };
}

export function mapCronRunRow(row: Row<'cron_run'>): CronRun {
  return {
    id: row.id as CronRunId,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    lockAcquired: row.lock_acquired,
    fixturesProcessed: row.fixtures_processed,
    isCatchUp: row.is_catch_up,
    status: row.status as CronRunStatus,
    retryCount: row.retry_count,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    snapshotHash: row.snapshot_hash,
  };
}

export function mapCronGapRow(row: Row<'cron_gap'>): CronGap {
  return {
    id: row.id as CronGapId,
    gapStartedAt: row.gap_started_at,
    gapEndedAt: row.gap_ended_at,
    gapMinutes: row.gap_minutes,
    missedFixtureCount: row.missed_fixture_count,
    recoveredAt: row.recovered_at,
    detectedAt: row.detected_at,
  };
}

export function mapAuditLogRow(row: Row<'audit_log'>): AuditLog {
  return {
    id: row.id as AuditLogId,
    actorType: row.actor_type as AuditActorType,
    actorId: row.actor_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    payload: asJson<Readonly<Record<string, unknown>>>(row.payload),
    createdAt: row.created_at,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 7. 경제 (E-28~E-30, `economy.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

/** `world_id` FK는 도메인 `Sponsor`에 없다(D-15) — 매핑에서 드롭 */
export function mapSponsorRow(row: Row<'sponsor'>): Sponsor {
  return {
    id: row.id as SponsorId,
    name: row.name,
    industry: row.industry,
    scale: row.scale,
    balance: row.balance as Points,
    reputation: row.reputation,
    bankruptAtSeason: row.bankrupt_at_season,
  };
}

export function mapSponsorContractRow(row: Row<'sponsor_contract'>): SponsorContract {
  return {
    id: row.id as SponsorContractId,
    sponsorId: row.sponsor_id as SponsorId,
    teamId: row.team_id as TeamId,
    signedByOwnerId: row.signed_by_owner_id as ClubOwnerId,
    startSeason: row.start_season,
    endSeason: row.end_season,
    incomePerSeason: row.income_per_season as Points,
    sharePct: row.share_pct,
    status: row.status as SponsorContractStatus,
  };
}

export function mapPointTransactionRow(row: Row<'point_transaction'>): PointTransaction {
  return {
    id: row.id as PointTransactionId,
    seasonId: row.season_id as SeasonId,
    ownerType: row.owner_type as PointTransactionOwnerType,
    ownerId: row.owner_id,
    amount: row.amount as Points,
    reasonCode: row.reason_code as PointTransactionReasonCode,
    refType: row.ref_type,
    refId: row.ref_id,
    balanceAfter: row.balance_after as Points,
    createdAt: row.created_at,
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 8. 설정 (E-41~E-44, `config.ts`)
 * ──────────────────────────────────────────────────────────────────────── */

export function mapCommonCodeGroupRow(row: Row<'common_code_group'>): CommonCodeGroup {
  return {
    groupCode: row.group_code,
    groupName: row.group_name,
    description: row.description,
    valueType: row.value_type as CommonCodeValueType,
    applyPolicy: row.apply_policy as CommonCodeApplyPolicy,
    relatedFr: row.related_fr,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCommonCodeRow(row: Row<'common_code'>): CommonCode {
  return {
    id: row.id as CommonCodeId,
    groupCode: row.group_code,
    code: row.code,
    worldId: row.world_id as WorldId | null,
    value: row.value,
    valueNum: row.value_num,
    valueJson: asJsonOrNull<Readonly<Record<string, unknown>>>(row.value_json),
    minValue: row.min_value,
    maxValue: row.max_value,
    jsonSchema: asJsonOrNull<Readonly<Record<string, unknown>>>(row.json_schema),
    defaultValue: row.default_value,
    description: row.description,
    unit: row.unit,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    effectiveFromSeason: row.effective_from_season,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by as UserId | null,
  };
}

export function mapCommonCodeHistoryRow(row: Row<'common_code_history'>): CommonCodeHistory {
  return {
    id: row.id as CommonCodeHistoryId,
    commonCodeId: row.common_code_id as CommonCodeId,
    groupCode: row.group_code,
    code: row.code,
    action: row.action as CommonCodeHistoryAction,
    oldValue: row.old_value,
    newValue: row.new_value,
    oldEffectiveFromSeason: row.old_effective_from_season,
    newEffectiveFromSeason: row.new_effective_from_season,
    changedBy: row.changed_by as UserId,
    changedAt: row.changed_at,
    reason: row.reason,
  };
}

export function mapSimConstantSnapshotRow(row: Row<'sim_constant_snapshot'>): SimConstantSnapshot {
  return {
    id: row.id as SnapshotId,
    worldId: row.world_id as WorldId,
    snapshotHash: row.snapshot_hash,
    constants: asJson<Readonly<Record<string, Readonly<Record<string, unknown>>>>>(
      row.constants,
    ),
    createdAt: row.created_at,
    firstUsedSeason: row.first_used_season,
    refCount: row.ref_count,
  };
}
