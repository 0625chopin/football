/**
 * `DataSource` Supabase 구현체 — **Task 034a 3/3, 22일차(2026-08-19)**, 6팀 DB·인프라팀
 * 소유. **`implements Pick<DataSource, ...>` → `implements DataSource` 전체 전환 완료.**
 *
 * 근거: `ROADMAP.md` Task 034 / `docs/team-schedule/06-DB인프라팀.md` 22일차 행 /
 * `docs/dailyWorkLog/21Day.md` "6팀" 절(오늘로 이월된 계획) / DC-01
 *
 * ## 오늘 스코프
 * 21일차가 남긴 "나머지(라인업·이벤트·계약·이적 이력 등 세부 섹션)"과, 아직 손대지 않았던
 * 뉴스·브래킷·어드민 3개 구역(I-126 승인 "잔여 구역은 진입점 1개씩" 방침)을 포함해 `DataSource`
 * 전 메서드를 채운다. 물리 테이블·매퍼(`mapper.ts`, Task 032, 17일차)는 이미 47종 전부
 * 갖춰져 있어(H-17, 18일차) 오늘은 각 메서드가 어느 테이블·어떤 필터/기본값으로 매퍼를
 * 호출하는지 배선하는 작업이다 — 새 매퍼를 추가하지 않는다.
 *
 * ## Mock(H-07)과 "똑같이 비어 있는" 메서드가 여전히 있는 이유 — I-34 / Tier B 재시뮬레이션
 * `getMatchPlayerRatings`/`getMatchTeamStats`는 오늘도 빈 배열을 반환한다. Mock이 이 둘을
 * 비우는 이유("생성기 없음")와 달리, 이쪽은 물리 테이블(`player_match_stat`)이 있고 데이터가
 * 없어서가 아니다 — **Tier B 26필드의 `matchSeed` 재시뮬레이션 컴포넌트 자체가 아직 구현이
 * 없다**(`src/lib/sim/match/tier-b-resim-contract.ts` 헤더: "계약(타입)만, 구현 없음", 2팀
 * 소유). 이 컴포넌트 없이는 `status='LIVE'`인 경기의 Tier A/B 분리 컷오프 재계산(I-34 3차
 * 판정)을 정확히 구현할 수 없고, 재시뮬레이션 없이 저장된 최종 로우를 그대로 반환하면 041
 * 침투 테스트가 잡아내야 할 바로 그 결함("LIVE 중 최종값 유출")을 스스로 만드는 셈이라 이
 * 방식은 채택하지 않는다. 컴포넌트가 도착하면(2팀 H-14, 27일차 이후) 이 두 메서드만 다시
 * 채운다 — 그 전까지는 Mock과 동일하게 빈 배열이 "정직한 현재 상태"다.
 *
 * ## `client.ts` 제약 — 메모리 연산으로 대체하는 지점
 * `SupabaseQueryClient`(`client.ts`, 22일차 `in()` 추가)는 `ilike`/`or`(논리합) 연산자가
 * 없다. 이게 필요한 지점(`getAuditLogs`의 `search`, `getTeamFixtures`의 "홈 또는 원정")은
 * 21일차 `getPlayerStatRanking`이 이미 쓴 패턴 그대로 — DB에서 좁힐 수 있는 만큼 좁힌 뒤
 * 매핑된 도메인 객체 배열에서 메모리 필터·정렬·자르기를 수행한다.
 *
 * ## 경과 시간 컷오프 — `getMatchEvents`만 오늘 구현
 * `getMatchEvents`는 Tier A/B 분리가 필요 없다(이벤트 로그 자체가 그대로 노출 대상) — 서버
 * 시각과 `kickoffAt`의 차(분)를 매 요청 계산해 `minute` 컬럼으로 직접 필터링하면 충분하다
 * (`resolveElapsedMinutes` 참조). "경기 길이" 상수로 상한을 별도로 두지 않는다 — DB에는
 * 애초에 실제 종료 분을 넘는 이벤트가 없으므로(사전 계산된 경기, FR-MT-016 ④) 실시간 경과
 * 분으로 필터링하는 것만으로 상한 없이도 안전하다.
 *
 * ## `getPlayerProfile` — `pa` 비노출은 어댑터에서 재구현하지 않는다 (21일차 결정 유지)
 * `mapper.ts` 헤더가 명시하듯 `PublicPlayerProfile`은 "여러 테이블 조합/조회 시점 파생"이
 * 필요해 매퍼가 아니라 이 파일(Task 034) 소관이다. `pa`→`scoutRating` 변환은
 * `src/lib/data/player-profile.ts`의 `toPublicProfile`을 그대로 가져다 쓴다.
 *
 * ## Result 래핑 안 함
 * `result.ts` 헤더가 명시하듯 `DataSource`는 `Promise<T>`를 그대로 반환하는 얇은 데이터
 * 접근 계약이다 — `Result<T>` 래핑은 상위 소비 계층(`fetch-result.ts`) 책임이라 여기서도
 * 감싸지 않는다.
 *
 * ## 시즌 기본값 해석
 * `resolveCurrentSeason`(신규, 21일차 `resolveCurrentSeasonId`를 이 함수 위에 재구성)이
 * `world.current_season_number`로 해석된 현재 시즌을 반환한다(D-15 단일 월드 — `world` 행은
 * 항상 1개). `getCurrentSeason()`이 오늘 이 함수를 그대로 공개 메서드로 노출한다.
 *
 * ## 라운드 기본값 해석
 * `getStandings`는 21일차와 동일(`MAX(round)`). `getFixtureRoundBounds`는 오늘 신규 —
 * 해당 리그(또는 CUP이면 리그 무관)·시즌·대회구분의 전 경기를 가져와 메모리에서
 * `min(round)`/`max(round)`를 구하고, `status !== 'FINISHED'`인 가장 이른 라운드를
 * `currentRound`로 삼는다(전부 종료면 `maxRound`).
 */

import { toPublicProfile } from '@/lib/data/player-profile';
import type {
  // 브랜드 ID
  CommonCodeId,
  FixtureId,
  LeagueId,
  PlayerId,
  SeasonId,
  SponsorId,
  TeamId,
  // enum성 값
  AuditActorType,
  AwardType,
  CompetitionType,
  CronRunStatus,
  NewsFeedItemType,
  SponsorContractStatus,
  // 엔티티
  Award,
  AuditLog,
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
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerCareerStat,
  PlayerMatchStat,
  PlayerPosition,
  PlayerSeasonStat,
  PlayerState,
  PointTransaction,
  Season,
  Sponsor,
  SponsorContract,
  Standing,
  Team,
  TeamSeason,
  TeamSeasonStat,
  Transfer,
  Trophy,
  Weather,
  World,
} from '@/types';

import { loadConstants } from '../../config/loader';
import type {
  CronRunMetrics,
  DataSource,
  FixtureRoundBounds,
  MatchTeamStatComparison,
  MultiAwardRankingEntry,
  PlayerStatRankingMetric,
  PublicPlayerProfile,
  WorldClockContext,
} from '../DataSource';
import type { SupabaseQueryClient } from './client';
import { worldMinutesAt } from '@/lib/sim/schedule/worldclock';
import {
  mapAuditLogRow,
  mapAwardRow,
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
  mapPlayerPositionRow,
  mapPlayerRow,
  mapPlayerSeasonStatRow,
  mapPlayerStateRow,
  mapPointTransactionRow,
  mapSeasonRow,
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
} from './mapper';

const DEFAULT_STAT_RANKING_LIMIT = 50;
const DEFAULT_TEAM_FIXTURES_LIMIT = 20;
const DEFAULT_NEWS_FEED_LIMIT = 20;
const DEFAULT_CRON_RUNS_LIMIT = 100;
const DEFAULT_CRON_RUN_METRICS_SAMPLE_SIZE = 100;
const DEFAULT_CRON_GAPS_LIMIT = 50;
const DEFAULT_AUDIT_LOG_LIMIT = 50;
/** `getAuditLogs`의 `search`가 메모리 필터라 DB 단 limit보다 넉넉히 받아 둔다(위 파일 헤더 참조) */
const AUDIT_LOG_SEARCH_POOL_SIZE = 500;
const DEFAULT_TEAM_POINT_TRANSACTIONS_LIMIT = 50;
const DEFAULT_MULTI_AWARD_RANKING_LIMIT = 10;

export class SupabaseDataSource implements DataSource {
  constructor(private readonly client: SupabaseQueryClient) {}

  /* ============================================================
   * 내부 유틸 — 시즌/컷오프 공용 해석
   * ============================================================ */

  private async fetchWorldRow() {
    const { data, error } = await this.client.from('world').select('*').limit(1).maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return data;
  }

  private async resolveCurrentSeason(): Promise<Season | null> {
    const worldRow = await this.fetchWorldRow();
    if (worldRow === null) {
      return null;
    }
    const { data, error } = await this.client
      .from('season')
      .select('*')
      .eq('season_number', worldRow.current_season_number)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapSeasonRow(data);
  }

  private async resolveCurrentSeasonId(): Promise<SeasonId | null> {
    const season = await this.resolveCurrentSeason();
    return season?.id ?? null;
  }

  private async resolveLatestStandingRound(
    leagueId: LeagueId,
    seasonId: SeasonId,
  ): Promise<number | null> {
    const { data, error } = await this.client
      .from('standing')
      .select('round')
      .eq('league_id', leagueId)
      .eq('season_id', seasonId)
      .order('round', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return data.round;
  }

  /**
   * `status='LIVE'`인 경기의 실시간 경과 분을 계산한다. `SCHEDULED`면 `null`(이벤트 전무),
   * `FINISHED`/`VOID`면 `Number.POSITIVE_INFINITY`(전량 노출) — 위 파일 헤더 "경과 시간
   * 컷오프" 절 참조.
   */
  private resolveElapsedMinutes(fixture: Fixture): number | null {
    if (fixture.status === 'SCHEDULED') {
      return null;
    }
    if (fixture.status !== 'LIVE') {
      return Number.POSITIVE_INFINITY;
    }
    return Math.floor((Date.now() - new Date(fixture.kickoffAt).getTime()) / 60_000);
  }

  /* ============================================================
   * 1. 순위 (Standings)
   * ============================================================ */

  async getLeagues(): Promise<readonly League[]> {
    const { data, error } = await this.client.from('league').select('*').order('tier', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapLeagueRow);
  }

  async getLeague(leagueId: LeagueId): Promise<League | null> {
    const { data, error } = await this.client.from('league').select('*').eq('id', leagueId).maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapLeagueRow(data);
  }

  async getCurrentSeason(): Promise<Season | null> {
    return this.resolveCurrentSeason();
  }

  async getSeasons(): Promise<readonly Season[]> {
    const { data, error } = await this.client
      .from('season')
      .select('*')
      .order('season_number', { ascending: false });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapSeasonRow);
  }

  async getStandings(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly round?: number;
  }): Promise<readonly Standing[]> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return [];
    }

    const round = params.round ?? (await this.resolveLatestStandingRound(params.leagueId, seasonId));
    if (round === null) {
      return [];
    }

    const { data, error } = await this.client
      .from('standing')
      .select('*')
      .eq('league_id', params.leagueId)
      .eq('season_id', seasonId)
      .eq('round', round)
      .order('rank', { ascending: true });

    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapStandingRow);
  }

  /* ============================================================
   * 2. 일정 (Fixtures)
   * ============================================================ */

  async getLiveFixtures(): Promise<readonly Fixture[]> {
    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('status', 'LIVE')
      .order('kickoff_at', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapFixtureRow);
  }

  async getNextKickoff(): Promise<Fixture | null> {
    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('status', 'SCHEDULED')
      .order('kickoff_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapFixtureRow(data);
  }

  async getFixturesByRound(params: {
    readonly leagueId: LeagueId;
    readonly round: number;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<readonly Fixture[]> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return [];
    }
    const competitionType = params.competitionType ?? 'LEAGUE';

    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('league_id', params.leagueId)
      .eq('season_id', seasonId)
      .eq('round', params.round)
      .eq('competition_type', competitionType)
      .order('kickoff_at', { ascending: true });

    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapFixtureRow);
  }

  async getFixtureRoundBounds(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<FixtureRoundBounds> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return { minRound: 0, maxRound: 0, currentRound: 0 };
    }
    const competitionType = params.competitionType ?? 'LEAGUE';

    let query = this.client
      .from('fixture')
      .select('*')
      .eq('season_id', seasonId)
      .eq('competition_type', competitionType);
    if (competitionType !== 'CUP') {
      query = query.eq('league_id', params.leagueId);
    }

    const { data, error } = await query;
    if (error !== null || data === null || data.length === 0) {
      return { minRound: 0, maxRound: 0, currentRound: 0 };
    }

    const fixtures = data.map(mapFixtureRow);
    const rounds = fixtures.map((f) => f.round);
    const maxRound = Math.max(...rounds);
    const minRound = Math.min(...rounds);
    const inProgressRound = fixtures
      .filter((f) => f.status !== 'FINISHED')
      .reduce<number | null>((min, f) => (min === null || f.round < min ? f.round : min), null);
    return { minRound, maxRound, currentRound: inProgressRound ?? maxRound };
  }

  /**
   * I-169/I-174 — `now`(서버 실시각, `resolveElapsedMinutes`와 동일하게 `Date.now()` 기준)와
   * `clock`(`world` 단일 행)을 원자적으로 반환한다. `kickoffWorldMinutesByFixtureId`는
   * I-174가 완전히 해소되기 전까지의 근사값(킥오프 이후 배속 전이가 없었다는 가정 — 킥오프
   * 순간 앵커를 영속할 컬럼이 `fixture`에 아직 없다) — 현재 `clock`으로 `worldMinutesAt`을
   * `fixture.kickoff_at`에 대해 호출해 산출한다.
   */
  async getMatchClockContext(fixtureIds: readonly FixtureId[]): Promise<WorldClockContext> {
    const worldRow = await this.fetchWorldRow();
    if (worldRow === null) {
      throw new Error(
        '[src/lib/data/supabase/SupabaseDataSource.ts] world 테이블에 레코드가 없습니다 (D-15 단일 월드 불변식 위반).',
      );
    }
    const clock = mapWorldRow(worldRow);
    const now = new Date(Date.now()).toISOString();

    const kickoffWorldMinutesByFixtureId: Record<FixtureId, number> = {};
    if (fixtureIds.length > 0) {
      const { data, error } = await this.client.from('fixture').select('*').in('id', fixtureIds);
      if (error === null && data !== null) {
        for (const row of data) {
          const fixture = mapFixtureRow(row);
          kickoffWorldMinutesByFixtureId[fixture.id] = worldMinutesAt(clock, fixture.kickoffAt);
        }
      }
    }

    return { now, clock, kickoffWorldMinutesByFixtureId };
  }

  /* ============================================================
   * 3. 경기 (Match detail)
   * ============================================================ */

  async getFixture(fixtureId: FixtureId): Promise<Fixture | null> {
    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('id', fixtureId)
      .maybeSingle();

    if (error !== null || data === null) {
      return null;
    }
    return mapFixtureRow(data);
  }

  async getMatchEvents(fixtureId: FixtureId): Promise<readonly MatchEvent[]> {
    const fixture = await this.getFixture(fixtureId);
    if (fixture === null) {
      return [];
    }
    const elapsedMinutes = this.resolveElapsedMinutes(fixture);
    if (elapsedMinutes === null) {
      return [];
    }

    const { data, error } = await this.client
      .from('match_event')
      .select('*')
      .eq('match_id', fixtureId)
      .order('sequence', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    const events = data.map(mapMatchEventRow);
    if (elapsedMinutes === Number.POSITIVE_INFINITY) {
      return events;
    }
    return events.filter((e) => e.minute <= elapsedMinutes);
  }

  async getMatchLineups(fixtureId: FixtureId): Promise<readonly MatchLineup[]> {
    const { data, error } = await this.client.from('match_lineup').select('*').eq('match_id', fixtureId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapMatchLineupRow);
  }

  /**
   * ⚠️ Tier B 재시뮬레이션 컴포넌트 미구현(위 파일 헤더 참조) — 항상 빈 배열. Mock(H-07)과
   * 동일 관측(둘 다 비어 있음)이지만 사유는 다르다(Mock=생성기 없음, 여기=재계산 로직 없음).
   */
  async getMatchPlayerRatings(_fixtureId: FixtureId): Promise<readonly PlayerMatchStat[]> {
    return [];
  }

  /** ⚠️ 위 `getMatchPlayerRatings`와 동일 사유로 빈 배열(비영속 파생 DTO, 소스가 될 Tier A/B 값이 아직 없음) */
  async getMatchTeamStats(_fixtureId: FixtureId): Promise<readonly MatchTeamStatComparison[]> {
    return [];
  }

  async getMatchWeather(fixtureId: FixtureId): Promise<Weather | null> {
    const { data, error } = await this.client.from('weather').select('*').eq('match_id', fixtureId).maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapWeatherRow(data);
  }

  /* ============================================================
   * 4. 선수 (Player detail)
   * ============================================================ */

  async getPlayerProfile(playerId: PlayerId): Promise<PublicPlayerProfile | null> {
    const { data, error } = await this.client
      .from('player')
      .select('*')
      .eq('id', playerId)
      .maybeSingle();

    if (error !== null || data === null) {
      return null;
    }
    return toPublicProfile(mapPlayerRow(data));
  }

  async getPlayerAttribute(playerId: PlayerId): Promise<PlayerAttribute | null> {
    const { data, error } = await this.client
      .from('player_attribute')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapPlayerAttributeRow(data);
  }

  async getPlayerState(playerId: PlayerId): Promise<PlayerState | null> {
    const { data, error } = await this.client
      .from('player_state')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapPlayerStateRow(data);
  }

  async getPlayerPositions(playerId: PlayerId): Promise<readonly PlayerPosition[]> {
    const { data, error } = await this.client.from('player_position').select('*').eq('player_id', playerId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapPlayerPositionRow);
  }

  async getPlayerAttributeHistory(playerId: PlayerId): Promise<readonly PlayerAttributeHistory[]> {
    const { data, error } = await this.client
      .from('player_attribute_history')
      .select('*')
      .eq('player_id', playerId)
      .order('season_number', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapPlayerAttributeHistoryRow);
  }

  async getPlayerSeasonStats(playerId: PlayerId): Promise<readonly PlayerSeasonStat[]> {
    const { data, error } = await this.client.from('player_season_stat').select('*').eq('player_id', playerId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapPlayerSeasonStatRow);
  }

  async getPlayerCareerStat(playerId: PlayerId): Promise<PlayerCareerStat | null> {
    const { data, error } = await this.client
      .from('player_career_stat')
      .select('*')
      .eq('player_id', playerId)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapPlayerCareerStatRow(data);
  }

  /**
   * ⚠️ 신규 계약(D-34, 48일차, I-238) — `getMatchPlayerRatings`와 동일 사유로 오늘은 계약만
   * 만족하는 최소 구현이다(팀장 확정, 1.52인일 부하). 실사용은 034b(66~68일차)이므로 실제
   * 조회는 그때 채운다.
   */
  async getPlayerRecentMatchStats(_params: {
    readonly playerId: PlayerId;
    readonly limit: number;
  }): Promise<readonly PlayerMatchStat[]> {
    return [];
  }

  /** 위 `getPlayerRecentMatchStats`와 동일 사유(D-34, 48일차, I-238) — 034b에서 채운다 */
  async getLeagueAverageRating(_params: {
    readonly seasonId: SeasonId;
    readonly leagueId: LeagueId;
    readonly competitionType: CompetitionType;
  }): Promise<number | null> {
    return null;
  }

  async getPlayerContract(playerId: PlayerId): Promise<Contract | null> {
    const { data, error } = await this.client
      .from('contract')
      .select('*')
      .eq('player_id', playerId)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapContractRow(data);
  }

  async getPlayerInjuries(playerId: PlayerId): Promise<readonly Injury[]> {
    const { data, error } = await this.client
      .from('injury')
      .select('*')
      .eq('player_id', playerId)
      .order('occurred_round', { ascending: false });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapInjuryRow);
  }

  async getPlayerAwards(playerId: PlayerId): Promise<readonly Award[]> {
    const { data, error } = await this.client.from('award').select('*').eq('player_id', playerId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapAwardRow);
  }

  async getPlayerTransferHistory(playerId: PlayerId): Promise<readonly Transfer[]> {
    const { data, error } = await this.client.from('transfer').select('*').eq('player_id', playerId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapTransferRow);
  }

  async getPlayerLoanHistory(playerId: PlayerId): Promise<readonly Loan[]> {
    const { data, error } = await this.client.from('loan').select('*').eq('player_id', playerId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapLoanRow);
  }

  /* ============================================================
   * 5. 클럽 (Club/Team detail)
   * ============================================================ */

  async getTeam(teamId: TeamId): Promise<Team | null> {
    const { data, error } = await this.client
      .from('team')
      .select('*')
      .eq('id', teamId)
      .maybeSingle();

    if (error !== null || data === null) {
      return null;
    }
    return mapTeamRow(data);
  }

  async getTeamsByIds(teamIds: readonly TeamId[]): Promise<readonly Team[]> {
    if (teamIds.length === 0) {
      return [];
    }
    const { data, error } = await this.client.from('team').select('*').in('id', teamIds);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapTeamRow);
  }

  async getTeamSeason(params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
  }): Promise<TeamSeason | null> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return null;
    }
    const { data, error } = await this.client
      .from('team_season')
      .select('*')
      .eq('team_id', params.teamId)
      .eq('season_id', seasonId)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapTeamSeasonRow(data);
  }

  async getTeamManager(teamId: TeamId): Promise<Manager | null> {
    const { data, error } = await this.client.from('manager').select('*').eq('team_id', teamId).maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapManagerRow(data);
  }

  /**
   * ⚠️ 신규 계약(D-35, 48일차, I-239) — `club_owner` 테이블은 오늘 마이그레이션으로 신설되지만
   * `database.types.ts` 재생성은 51일차로 이월(팀장 확정, 1.52인일 부하) — 재생성 전까지는
   * 타입 안전하게 조회할 수 없어 `getTeamManager`와 대칭 자리만 채운다. 실사용은 034b
   * (66~68일차)이므로 실제 조회는 그 이후 채운다.
   */
  async getClubOwner(_teamId: TeamId): Promise<ClubOwner | null> {
    return null;
  }

  async getTeamSquad(teamId: TeamId): Promise<readonly PublicPlayerProfile[]> {
    const { data: stateRows, error: stateError } = await this.client
      .from('player_state')
      .select('*')
      .eq('team_id', teamId);
    if (stateError !== null || stateRows === null || stateRows.length === 0) {
      return [];
    }
    const playerIds = stateRows.map((row) => row.player_id);
    const { data: playerRows, error: playerError } = await this.client.from('player').select('*').in('id', playerIds);
    if (playerError !== null || playerRows === null) {
      return [];
    }
    return playerRows.map(mapPlayerRow).map(toPublicProfile);
  }

  async getTeamSquadStates(teamId: TeamId): Promise<readonly PlayerState[]> {
    const { data, error } = await this.client.from('player_state').select('*').eq('team_id', teamId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapPlayerStateRow);
  }

  async getTeamSeasonStat(params: {
    readonly teamId: TeamId;
    readonly seasonId?: SeasonId;
    readonly competitionType?: CompetitionType;
  }): Promise<TeamSeasonStat | null> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return null;
    }
    const competitionType = params.competitionType ?? 'LEAGUE';
    const { data, error } = await this.client
      .from('team_season_stat')
      .select('*')
      .eq('team_id', params.teamId)
      .eq('season_id', seasonId)
      .eq('competition_type', competitionType)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapTeamSeasonStatRow(data);
  }

  async getTeamPointTransactions(params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly PointTransaction[]> {
    const { data, error } = await this.client
      .from('point_transaction')
      .select('*')
      .eq('owner_type', 'TEAM')
      .eq('owner_id', params.teamId)
      .order('created_at', { ascending: false })
      .limit(params.limit ?? DEFAULT_TEAM_POINT_TRANSACTIONS_LIMIT);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapPointTransactionRow);
  }

  async getTeamSponsorContracts(teamId: TeamId): Promise<readonly SponsorContract[]> {
    const { data, error } = await this.client
      .from('sponsor_contract')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'ACTIVE');
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapSponsorContractRow);
  }

  async getSponsorsByIds(sponsorIds: readonly SponsorId[]): Promise<readonly Sponsor[]> {
    if (sponsorIds.length === 0) {
      return [];
    }
    const { data, error } = await this.client.from('sponsor').select('*').in('id', sponsorIds);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapSponsorRow);
  }

  async getSponsors(): Promise<readonly Sponsor[]> {
    const { data, error } = await this.client.from('sponsor').select('*');
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapSponsorRow);
  }

  async getSponsorContracts(params?: {
    readonly sponsorId?: SponsorId;
    readonly status?: SponsorContractStatus;
  }): Promise<readonly SponsorContract[]> {
    let query = this.client.from('sponsor_contract').select('*');
    if (params?.sponsorId !== undefined) {
      query = query.eq('sponsor_id', params.sponsorId);
    }
    if (params?.status !== undefined) {
      query = query.eq('status', params.status);
    }
    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapSponsorContractRow);
  }

  async getTeamTrophies(teamId: TeamId): Promise<readonly Trophy[]> {
    const { data, error } = await this.client.from('trophy').select('*').eq('team_id', teamId);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapTrophyRow);
  }

  async getTeamFixtures(params: {
    readonly teamId: TeamId;
    readonly limit?: number;
  }): Promise<readonly Fixture[]> {
    const [homeResult, awayResult] = await Promise.all([
      this.client.from('fixture').select('*').eq('home_team_id', params.teamId),
      this.client.from('fixture').select('*').eq('away_team_id', params.teamId),
    ]);
    if (homeResult.error !== null && awayResult.error !== null) {
      return [];
    }
    const merged = [...(homeResult.data ?? []), ...(awayResult.data ?? [])].map(mapFixtureRow);
    merged.sort((a, b) => (a.kickoffAt < b.kickoffAt ? -1 : a.kickoffAt > b.kickoffAt ? 1 : 0));
    return merged.slice(0, params.limit ?? DEFAULT_TEAM_FIXTURES_LIMIT);
  }

  /* ============================================================
   * 6. 통계 (Stats ranking)
   * ============================================================ */

  async getPlayerStatRanking(params: {
    readonly leagueId: LeagueId | null;
    readonly competitionType: CompetitionType;
    readonly metric: PlayerStatRankingMetric;
    readonly minAppearancePct?: number;
    readonly limit?: number;
  }): Promise<readonly PlayerSeasonStat[]> {
    const seasonId = await this.resolveCurrentSeasonId();
    if (seasonId === null) {
      return [];
    }

    const basis = await this.resolveStatAppearanceBasis(seasonId, params.competitionType);
    if (basis === null) {
      return [];
    }

    const uiParam = loadConstants('UI_PARAM');
    const minAppearancePct = params.minAppearancePct ?? uiParam.LEADERBOARD_MIN_APPEARANCE_PCT ?? 0;

    let query = this.client
      .from('player_season_stat')
      .select('*')
      .eq('season_id', seasonId)
      .eq('competition_type', params.competitionType);
    if (params.leagueId !== null) {
      query = query.eq('league_id', params.leagueId);
    }

    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }

    const filtered = data.map(mapPlayerSeasonStatRow).filter((entry) => {
      const appearancePct = (entry.appearances / basis) * 100;
      return appearancePct >= minAppearancePct;
    });

    const sorted = [...filtered].sort(
      (a, b) => (b[params.metric] as number) - (a[params.metric] as number),
    );
    return sorted.slice(0, params.limit ?? DEFAULT_STAT_RANKING_LIMIT);
  }

  async getAwards(params?: {
    readonly seasonId?: SeasonId;
    readonly leagueId?: LeagueId;
    readonly type?: AwardType;
  }): Promise<readonly Award[]> {
    const seasonId = params?.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return [];
    }
    let query = this.client.from('award').select('*').eq('season_id', seasonId);
    if (params?.leagueId !== undefined) {
      query = query.eq('league_id', params.leagueId);
    }
    if (params?.type !== undefined) {
      query = query.eq('type', params.type);
    }
    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapAwardRow);
  }

  async getMultiAwardRanking(params: {
    readonly subjectType: 'PLAYER' | 'MANAGER' | 'TEAM';
    readonly limit?: number;
  }): Promise<readonly MultiAwardRankingEntry[]> {
    const { data, error } = await this.client.from('award').select('*');
    if (error !== null || data === null) {
      return [];
    }

    const counts = new Map<string, number>();
    for (const row of data) {
      const subjectId =
        params.subjectType === 'PLAYER'
          ? row.player_id
          : params.subjectType === 'MANAGER'
            ? row.manager_id
            : row.team_id;
      if (subjectId === null) {
        continue;
      }
      counts.set(subjectId, (counts.get(subjectId) ?? 0) + 1);
    }

    const entries: MultiAwardRankingEntry[] = Array.from(counts.entries()).map(([subjectId, totalAwards]) => ({
      subjectType: params.subjectType,
      subjectId,
      totalAwards,
    }));
    entries.sort((a, b) => b.totalAwards - a.totalAwards);
    return entries.slice(0, params.limit ?? DEFAULT_MULTI_AWARD_RANKING_LIMIT);
  }

  /* ============================================================
   * 7. 뉴스 (News)
   * ============================================================ */

  async getNewsFeed(params?: {
    readonly types?: readonly NewsFeedItemType[];
    readonly limit?: number;
  }): Promise<readonly NewsFeedItem[]> {
    let query = this.client.from('news_feed_item').select('*');
    if (params?.types !== undefined && params.types.length > 0) {
      query = query.in('type', [...params.types]);
    }
    query = query.order('occurred_at', { ascending: false }).limit(params?.limit ?? DEFAULT_NEWS_FEED_LIMIT);
    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapNewsFeedItemRow);
  }

  /* ============================================================
   * 8. 브래킷 (Bracket)
   * ============================================================ */

  async getPlayoffBracket(params: {
    readonly leagueId: LeagueId;
    readonly seasonId?: SeasonId;
  }): Promise<readonly Fixture[]> {
    const seasonId = params.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return [];
    }
    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('league_id', params.leagueId)
      .eq('season_id', seasonId)
      .eq('competition_type', 'PLAYOFF')
      .order('kickoff_at', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapFixtureRow);
  }

  async getCupBracket(params?: { readonly seasonId?: SeasonId }): Promise<readonly Fixture[]> {
    const seasonId = params?.seasonId ?? (await this.resolveCurrentSeasonId());
    if (seasonId === null) {
      return [];
    }
    const { data, error } = await this.client
      .from('fixture')
      .select('*')
      .eq('season_id', seasonId)
      .eq('competition_type', 'CUP')
      .order('kickoff_at', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapFixtureRow);
  }

  /* ============================================================
   * 9. 어드민 (Admin, 읽기 전용)
   * ============================================================ */

  async getWorldStatus(): Promise<World> {
    const row = await this.fetchWorldRow();
    if (row === null) {
      throw new Error(
        '[src/lib/data/supabase/SupabaseDataSource.ts] world 테이블에 레코드가 없습니다 (D-15 단일 월드 불변식 위반).',
      );
    }
    return mapWorldRow(row);
  }

  async getCommonCodeGroups(): Promise<readonly CommonCodeGroup[]> {
    const { data, error } = await this.client
      .from('common_code_group')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapCommonCodeGroupRow);
  }

  async getCommonCodes(groupCode: string): Promise<readonly CommonCode[]> {
    const { data, error } = await this.client
      .from('common_code')
      .select('*')
      .eq('group_code', groupCode)
      .order('sort_order', { ascending: true });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapCommonCodeRow);
  }

  async getCommonCodeHistory(commonCodeId: CommonCodeId): Promise<readonly CommonCodeHistory[]> {
    const { data, error } = await this.client
      .from('common_code_history')
      .select('*')
      .eq('common_code_id', commonCodeId)
      .order('changed_at', { ascending: false });
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapCommonCodeHistoryRow);
  }

  async getLatestCronRun(): Promise<CronRun | null> {
    const { data, error } = await this.client
      .from('cron_run')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return mapCronRunRow(data);
  }

  async getCronRuns(params?: {
    readonly status?: CronRunStatus;
    readonly onlyCatchUp?: boolean;
    readonly limit?: number;
  }): Promise<readonly CronRun[]> {
    let query = this.client.from('cron_run').select('*');
    if (params?.status !== undefined) {
      query = query.eq('status', params.status);
    }
    if (params?.onlyCatchUp === true) {
      query = query.eq('is_catch_up', true);
    }
    query = query.order('started_at', { ascending: false }).limit(params?.limit ?? DEFAULT_CRON_RUNS_LIMIT);
    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapCronRunRow);
  }

  async getCronRunMetrics(params?: { readonly sampleSize?: number }): Promise<CronRunMetrics> {
    const { data, error } = await this.client
      .from('cron_run')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(params?.sampleSize ?? DEFAULT_CRON_RUN_METRICS_SAMPLE_SIZE);
    if (error !== null || data === null || data.length === 0) {
      return { successRatePct: 0, avgDurationMs: 0, maxDurationMs: 0, sampleSize: 0 };
    }

    const runs = data.map(mapCronRunRow);
    const sampleSize = runs.length;
    const successCount = runs.filter((r) => r.status === 'SUCCESS').length;
    const durations = runs.map((r) => r.durationMs);
    const avgDurationMs = durations.reduce((sum, d) => sum + d, 0) / sampleSize;
    const maxDurationMs = Math.max(...durations);
    return {
      successRatePct: (successCount / sampleSize) * 100,
      avgDurationMs,
      maxDurationMs,
      sampleSize,
    };
  }

  async getCronGaps(params?: { readonly limit?: number }): Promise<readonly CronGap[]> {
    const { data, error } = await this.client
      .from('cron_gap')
      .select('*')
      .order('gap_started_at', { ascending: false })
      .limit(params?.limit ?? DEFAULT_CRON_GAPS_LIMIT);
    if (error !== null || data === null) {
      return [];
    }
    return data.map(mapCronGapRow);
  }

  async getAuditLogs(params?: {
    readonly actorType?: AuditActorType;
    readonly search?: string;
    readonly limit?: number;
  }): Promise<readonly AuditLog[]> {
    const limit = params?.limit ?? DEFAULT_AUDIT_LOG_LIMIT;
    let query = this.client.from('audit_log').select('*');
    if (params?.actorType !== undefined) {
      query = query.eq('actor_type', params.actorType);
    }
    query = query
      .order('created_at', { ascending: false })
      .limit(params?.search !== undefined ? AUDIT_LOG_SEARCH_POOL_SIZE : limit);
    const { data, error } = await query;
    if (error !== null || data === null) {
      return [];
    }

    const logs = data.map(mapAuditLogRow);
    if (params?.search === undefined) {
      return logs;
    }
    const needle = params.search.toLowerCase();
    return logs
      .filter((log) => log.action.toLowerCase().includes(needle) || log.targetType.toLowerCase().includes(needle))
      .slice(0, limit);
  }

  /* ============================================================
   * 내부 유틸 — 통계 랭킹 출전율 분모(21일차 유지)
   * ============================================================ */

  private async resolveStatAppearanceBasis(
    seasonId: SeasonId,
    competitionType: CompetitionType,
  ): Promise<number | null> {
    const { data, error } = await this.client
      .from('player_season_stat')
      .select('appearances')
      .eq('season_id', seasonId)
      .eq('competition_type', competitionType)
      .order('appearances', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error !== null || data === null) {
      return null;
    }
    return Math.max(1, data.appearances);
  }
}
