/**
 * `DataSource` Supabase 구현체 — **Task 034a 2/3, 21일차(2026-08-18)**, 6팀 DB·인프라팀
 * 소유
 *
 * 근거: `ROADMAP.md` Task 034 / `docs/team-schedule/06-DB인프라팀.md` 21일차 행 /
 * `docs/db/19Day-V01사전준비-034a체크리스트.md`(H-02 계약, H-07 Mock 대조 기준) / DC-01
 *
 * ## 오늘 스코프
 * DataSource.ts의 섹션 헤더 "3. 경기(Match detail)"·"4. 선수(Player detail)"·
 * "5. 클럽(Club/Team detail)"·"6. 통계(Stats ranking)" 각각에서 **그 화면의 진입점(루트
 * 조회) 메서드 1개씩**만 구현한다 — `getFixture`/`getPlayerProfile`/`getTeam`/
 * `getPlayerStatRanking` 4개(20일차 "순위·일정" 1메서드씩 패턴의 연속). 나머지(라인업·
 * 이벤트·계약·이적 이력 등 세부 섹션)는 생성기가 아직 없거나(2팀 H-14 27일차 이후) 오늘
 * 스코프 밖이라 22일차(3/3, "인터페이스 전 메서드 구현")로 넘긴다. 여전히
 * `implements Pick<DataSource, ...>`.
 *
 * ## `getPlayerProfile` — `pa` 비노출은 어댑터에서 재구현하지 않는다
 * `mapper.ts` 헤더가 명시하듯 `PublicPlayerProfile`은 "여러 테이블 조합/조회 시점 파생"이
 * 필요해 매퍼가 아니라 이 파일(Task 034) 소관이다. `pa`→`scoutRating` 변환은
 * `src/lib/data/player-profile.ts`의 `toPublicProfile`을 그대로 가져다 쓴다 — **21일차
 * 결함 A 조치로 3팀 소유 Mock 픽스처 모듈에서 이 파일과 같은 1팀 소유 `src/lib/data/`
 * 아래로 이동됐다**(순수 함수라 Mock 의존이 없었는데도 프로덕션 어댑터가 Mock 월드
 * 생성기 그래프 전체를 끌어오는 결함이었다 — 이동 상세는 `player-profile.ts` 헤더 참조).
 * `mapPlayerRow`로 얻은 `Player`(pa 포함)를 그 함수에 통과시켜 `pa`를 구조적으로 제거한다.
 *
 * ## `getPlayerStatRanking` — 출전율 분모(basis)·정렬은 Mock(H-07)과 동일 규칙
 * `minAppearancePct` 생략 시 `loadConstants('UI_PARAM').LEADERBOARD_MIN_APPEARANCE_PCT`로
 * 대체(미등록이면 로더가 `ConstantSourceUnavailableError`를 던지는 것이 정상 — 36일차
 * 시드 전까지 2팀 `tactics.ts`와 동일 상태). 출전율 분모는 Mock처럼 "해당 시즌·대회구분의
 * `MAX(appearances)`"로 구하되(리그로는 좁히지 않음 — Mock의 `statAppearanceBasis` 산출
 * 범위를 그대로 따름), 컬럼 프로젝션이 없는 `client.ts` 제약상 필터·정렬·자르기를 매핑된
 * 도메인 객체 배열에서 메모리 연산으로 수행한다(Mock의 `(a[params.metric] as number)` 비교와
 * 동일 방식이라 camelCase 필드명이 그대로 정렬 키로 맞는다).
 *
 * ## `client.ts` 확장 안 함
 * 오늘 4개 메서드 모두 단건 조회(`getFixture`/`getTeam`/`getPlayerProfile`)이거나 전체
 * 컬럼을 받아 메모리에서 가공(`getPlayerStatRanking`)해 `select('*')`만으로 충분했다.
 * 컬럼 프로젝션(`select(columns)`)이 필요한 조인은 아직 없어 20일차가 남긴 "범위 밖" 상태를
 * 오늘도 확장하지 않는다.
 *
 * ## Result 래핑 안 함
 * `result.ts` 헤더가 명시하듯 `DataSource`는 `Promise<T>`를 그대로 반환하는 얇은 데이터
 * 접근 계약이다 — `Result<T>` 래핑은 상위 소비 계층(`fetch-result.ts`) 책임이라 Mock
 * 구현체와 동일하게 여기서도 감싸지 않는다(19일차 체크리스트 §2 "Result 래핑 여부" 확인
 * 결과).
 *
 * ## 시즌 기본값 해석
 * `getCurrentSeason`(1팀 H-02 jsdoc)과 동일하게 `params.seasonId` 생략 시 `world` 테이블의
 * `current_season_number`로 해석된 현재 시즌을 쓴다(D-15 단일 월드 — world 행은 항상
 * 1개이므로 `world_id` 추가 필터 없이 `season_number`만으로 유일하게 찾는다). 시즌 브랜드
 * ID(`SeasonId`)는 이 파일에서 직접 캐스트하지 않고 `mapSeasonRow`(같은 팀 소유 `mapper.ts`)를
 * 거친다 — 브랜드 생성은 매퍼 파일이 유일 지점이라는 `mapper.ts` 헤더 원칙을 따른다.
 * `getPlayerStatRanking`도 `seasonId` 파라미터 자체가 계약에 없어(항상 현재 시즌) 동일
 * 해석을 재사용한다.
 *
 * ## 라운드 기본값 해석 (`getStandings`만 해당)
 * `round` 생략 시 DataSource.ts jsdoc 계약대로 `MAX(round)`를 쓴다 — `standing` 테이블에서
 * 해당 리그·시즌의 최신 라운드값을 먼저 조회한 뒤 그 라운드로 재조회한다(2회 왕복). Mock
 * 구현체(`schedule.currentRound - 1`)처럼 별도 스케줄 상태를 들고 있지 않으므로 DB에 이미
 * 적재된 최신 라운드를 쿼리로 직접 구하는 편이 SQL 계약(`docs/team-schedule` H-17 물리
 * 테이블 기준)에 더 가깝다고 판단했다.
 */

import { toPublicProfile } from '@/lib/data/player-profile';
import type {
  CompetitionType,
  Fixture,
  FixtureId,
  LeagueId,
  PlayerId,
  PlayerSeasonStat,
  SeasonId,
  Standing,
  Team,
  TeamId,
} from '@/types';

import { loadConstants } from '../../config/loader';
import type { DataSource, PlayerStatRankingMetric, PublicPlayerProfile } from '../DataSource';
import type { SupabaseQueryClient } from './client';
import { mapFixtureRow, mapPlayerRow, mapPlayerSeasonStatRow, mapSeasonRow, mapStandingRow, mapTeamRow } from './mapper';

const DEFAULT_STAT_RANKING_LIMIT = 50;

export class SupabaseDataSource
  implements
    Pick<
      DataSource,
      | 'getStandings'
      | 'getFixturesByRound'
      | 'getFixture'
      | 'getPlayerProfile'
      | 'getTeam'
      | 'getPlayerStatRanking'
    >
{
  constructor(private readonly client: SupabaseQueryClient) {}

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

  private async resolveCurrentSeasonId(): Promise<SeasonId | null> {
    const { data: worldRow, error: worldError } = await this.client
      .from('world')
      .select('current_season_number')
      .limit(1)
      .maybeSingle();
    if (worldError !== null || worldRow === null) {
      return null;
    }

    const { data: seasonRow, error: seasonError } = await this.client
      .from('season')
      .select('*')
      .eq('season_number', worldRow.current_season_number)
      .maybeSingle();
    if (seasonError !== null || seasonRow === null) {
      return null;
    }

    return mapSeasonRow(seasonRow).id;
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
}
