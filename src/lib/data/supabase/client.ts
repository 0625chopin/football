/**
 * Supabase 쿼리 클라이언트 주입 인터페이스 — **Task 034a, 20일차(2026-08-17)**, 6팀
 * DB·인프라팀 소유
 *
 * `@supabase/*` 패키지가 아직 미설치라(`CLAUDE.md` "아직 도입되지 않은 것") `SupabaseClient`
 * 타입을 직접 import할 수 없다. `src/lib/data/supabase/**`에는 이 제약을 다룬 기존 패턴이
 * 없었다(19일차 체크리스트 `docs/db/19Day-V01사전준비-034a체크리스트.md`가 예고한 "클라이언트
 * 주입 인터페이스"는 이 파일이 최초 도입이다) — `@supabase-js`의 `from().select().eq()...`
 * 플루언트 빌더 중 이번 034a 1/3(`getStandings`/`getFixturesByRound`)에 필요한 부분만 최소
 * 구조적 타입으로 duck-typing한다. 실제 `SupabaseClient<Database>` 인스턴스는 이 인터페이스보다
 * 넓은 상위집합을 구현하므로 패키지 설치 후 그대로 주입해도 구조적으로 호환된다.
 *
 * ## 범위 밖
 * `select(columns)`의 `columns` 문자열로 컬럼을 좁혀도 반환 타입은 항상 테이블 전체 `Row`로
 * 취급한다(컬럼 단위 타입 프로젝션 미지원) — 이번 034a 두 메서드는 전체 컬럼(`'*'`)만
 * 사용하므로 문제 없다. 향후 부분 컬럼 조회가 필요해지면 이 인터페이스를 확장한다.
 */

import type { Database } from '../database.types';

type Tables = Database['public']['Tables'];

export interface SupabaseQueryError {
  readonly message: string;
}

export interface SupabaseQueryResult<T> {
  readonly data: T | null;
  readonly error: SupabaseQueryError | null;
}

export interface SupabaseFilterBuilder<Row>
  extends PromiseLike<SupabaseQueryResult<readonly Row[]>> {
  eq(column: string, value: string | number): SupabaseFilterBuilder<Row>;
  order(column: string, options?: { readonly ascending?: boolean }): SupabaseFilterBuilder<Row>;
  limit(count: number): SupabaseFilterBuilder<Row>;
  maybeSingle(): PromiseLike<SupabaseQueryResult<Row | null>>;
}

export interface SupabaseQueryClient {
  from<T extends keyof Tables>(
    table: T,
  ): { readonly select: (columns: string) => SupabaseFilterBuilder<Tables[T]['Row']> };
}
