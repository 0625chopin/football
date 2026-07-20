/**
 * `DataSource` Supabase 구현체 — **Task 034a 1/3, 20일차(2026-08-17)**, 6팀 DB·인프라팀
 * 소유
 *
 * 근거: `ROADMAP.md` Task 034 / `docs/team-schedule/06-DB인프라팀.md` 20일차 행 /
 * `docs/db/19Day-V01사전준비-034a체크리스트.md`(H-02 계약, H-07 Mock 대조 기준) / DC-01
 *
 * ## 오늘 스코프
 * `DataSource`(1팀 H-02) 62개 메서드 중 "1. 순위" 그룹의 `getStandings`와 "2. 일정" 그룹의
 * `getFixturesByRound` **2개만** 구현한다(034a는 3회 분할, 오늘 1/3). 아직 전체 인터페이스를
 * 구현하지 않았으므로 `implements DataSource`가 아니라 `implements Pick<DataSource, ...>`를
 * 쓴다 — 나머지 메서드가 없는 상태로 `implements DataSource`를 쓰면 `tsc`가 즉시 에러를
 * 낸다. 이 클래스는 아직 `factory.ts`의 `registerDataSource('supabase', ...)`에도 등록하지
 * 않는다(등록은 `DataSource` 전체 구현이 끝나는 034a 마지막 파트 이후).
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
 *
 * ## 라운드 기본값 해석 (`getStandings`만 해당)
 * `round` 생략 시 DataSource.ts jsdoc 계약대로 `MAX(round)`를 쓴다 — `standing` 테이블에서
 * 해당 리그·시즌의 최신 라운드값을 먼저 조회한 뒤 그 라운드로 재조회한다(2회 왕복). Mock
 * 구현체(`schedule.currentRound - 1`)처럼 별도 스케줄 상태를 들고 있지 않으므로 DB에 이미
 * 적재된 최신 라운드를 쿼리로 직접 구하는 편이 SQL 계약(`docs/team-schedule` H-17 물리
 * 테이블 기준)에 더 가깝다고 판단했다.
 */

import type { CompetitionType, Fixture, LeagueId, SeasonId, Standing } from '@/types';

import type { DataSource } from '../DataSource';
import type { SupabaseQueryClient } from './client';
import { mapFixtureRow, mapSeasonRow, mapStandingRow } from './mapper';

export class SupabaseDataSource
  implements Pick<DataSource, 'getStandings' | 'getFixturesByRound'>
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
