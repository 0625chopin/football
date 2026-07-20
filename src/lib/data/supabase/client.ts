/**
 * Supabase 쿼리 클라이언트 주입 인터페이스 — **Task 034a, 20일차(2026-08-17) 도입, 22일차
 * (2026-08-19) 3/3에서 `in()` 추가 + `eq()` boolean 확장 + REST 브리지 클라이언트 추가**,
 * 6팀 DB·인프라팀 소유
 *
 * `@supabase/*` 패키지가 아직 미설치라(`CLAUDE.md` "아직 도입되지 않은 것") `SupabaseClient`
 * 타입을 직접 import할 수 없다. `src/lib/data/supabase/**`에는 이 제약을 다룬 기존 패턴이
 * 없었다(19일차 체크리스트 `docs/db/19Day-V01사전준비-034a체크리스트.md`가 예고한 "클라이언트
 * 주입 인터페이스"는 이 파일이 최초 도입이다) — `@supabase-js`의 `from().select().eq()...`
 * 플루언트 빌더 중 필요한 부분만 최소 구조적 타입으로 duck-typing한다. 실제
 * `SupabaseClient<Database>` 인스턴스는 이 인터페이스보다 넓은 상위집합을 구현하므로 패키지
 * 설치 후 그대로 주입해도 구조적으로 호환된다.
 *
 * ## 22일차 확장 근거 (034a 3/3, `SupabaseDataSource.ts` 전 메서드 구현)
 * - **`eq()` 값 타입에 `boolean` 추가**: `cron_run.is_catch_up` 등 boolean 컬럼 필터가
 *   필요해졌다(`getCronRuns`). 실제 `@supabase-js`의 `.eq()`도 임의 값을 받으므로 상위집합
 *   호환에 문제 없다.
 * - **`in()` 추가**: `getTeamsByIds`/`getSponsorsByIds`처럼 ID 배열로 배치 조회하는 메서드가
 *   오늘 여럿 추가됐다. 실제 `@supabase-js`의 `.in(column, values)`와 동일 시그니처다.
 *
 * ## 범위 밖
 * `select(columns)`의 `columns` 문자열로 컬럼을 좁혀도 반환 타입은 항상 테이블 전체 `Row`로
 * 취급한다(컬럼 단위 타입 프로젝션 미지원) — 지금까지 구현한 메서드는 전체 컬럼(`'*'`)만
 * 사용하므로 문제 없다. 향후 부분 컬럼 조회가 필요해지면 이 인터페이스를 확장한다.
 * `ilike`/`or` 등 텍스트 검색·논리합 연산자도 아직 없다 — 필요한 곳(`getAuditLogs`의
 * `search`)은 전체 로우를 받아 메모리에서 필터링한다(`SupabaseDataSource.ts` 참조).
 *
 * ## `createSupabaseRestQueryClient` — 임시 브리지 구현체 (22일차 신규)
 * `factory.ts` self-registration(`registerDataSource('supabase', ...)`)을 오늘 처음 배선하는데
 * `@supabase-js`가 아직 미설치라 실제 `SupabaseClient`를 만들 수 없다. 새 패키지를 추가하지
 * 않고도 위 duck-typed 인터페이스를 **PostgREST HTTP API를 `fetch`로 직접 호출**해 채운다 —
 * 이 계약이 쓰는 연산(`select`/`eq`/`in`/`order`/`limit`/`maybeSingle`)이 전부 읽기 전용
 * GET 요청으로 표현 가능해서 가능하다(DataSource 자체가 읽기 전용 계약, `DataSource.ts` 헤더
 * 참조). **`@supabase-js` 설치 후에는 이 함수를 실제 `createClient(url, key)`로 교체한다** —
 * 이 인터페이스가 그 상위집합과 구조적으로 호환되므로 교체 시 `SupabaseDataSource.ts`는 수정할
 * 필요가 없다.
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
  eq(column: string, value: string | number | boolean): SupabaseFilterBuilder<Row>;
  in(column: string, values: readonly (string | number)[]): SupabaseFilterBuilder<Row>;
  order(column: string, options?: { readonly ascending?: boolean }): SupabaseFilterBuilder<Row>;
  limit(count: number): SupabaseFilterBuilder<Row>;
  maybeSingle(): PromiseLike<SupabaseQueryResult<Row | null>>;
}

export interface SupabaseQueryClient {
  from<T extends keyof Tables>(
    table: T,
  ): { readonly select: (columns: string) => SupabaseFilterBuilder<Tables[T]['Row']> };
}

/* ────────────────────────────────────────────────────────────────────────
 * REST 브리지 구현체 — 위 파일 헤더 "createSupabaseRestQueryClient" 절 참조.
 * ──────────────────────────────────────────────────────────────────────── */

interface RestFilter {
  readonly column: string;
  readonly op: 'eq' | 'in';
  readonly value: string;
}

function encodeFilterValue(value: string | number | boolean): string {
  return typeof value === 'string' ? encodeURIComponent(value) : String(value);
}

class RestFilterBuilder<Row> implements SupabaseFilterBuilder<Row> {
  constructor(
    private readonly baseUrl: string,
    private readonly headers: Readonly<Record<string, string>>,
    private readonly table: string,
    private readonly columns: string,
    private readonly filters: readonly RestFilter[] = [],
    private readonly orderClause: string | null = null,
    private readonly limitCount: number | null = null,
  ) {}

  private withFilter(filter: RestFilter): RestFilterBuilder<Row> {
    return new RestFilterBuilder(
      this.baseUrl,
      this.headers,
      this.table,
      this.columns,
      [...this.filters, filter],
      this.orderClause,
      this.limitCount,
    );
  }

  eq(column: string, value: string | number | boolean): SupabaseFilterBuilder<Row> {
    return this.withFilter({ column, op: 'eq', value: encodeFilterValue(value) });
  }

  in(column: string, values: readonly (string | number)[]): SupabaseFilterBuilder<Row> {
    const joined = values.map((v) => encodeFilterValue(v)).join(',');
    return this.withFilter({ column, op: 'in', value: `(${joined})` });
  }

  order(column: string, options?: { readonly ascending?: boolean }): SupabaseFilterBuilder<Row> {
    const direction = (options?.ascending ?? true) ? 'asc' : 'desc';
    return new RestFilterBuilder(
      this.baseUrl,
      this.headers,
      this.table,
      this.columns,
      this.filters,
      `${column}.${direction}`,
      this.limitCount,
    );
  }

  limit(count: number): SupabaseFilterBuilder<Row> {
    return new RestFilterBuilder(
      this.baseUrl,
      this.headers,
      this.table,
      this.columns,
      this.filters,
      this.orderClause,
      count,
    );
  }

  private buildUrl(): string {
    const params = new URLSearchParams();
    params.set('select', this.columns);
    for (const filter of this.filters) {
      params.append(filter.column, `${filter.op}.${filter.value}`);
    }
    if (this.orderClause !== null) {
      params.set('order', this.orderClause);
    }
    if (this.limitCount !== null) {
      params.set('limit', String(this.limitCount));
    }
    return `${this.baseUrl}/rest/v1/${this.table}?${params.toString()}`;
  }

  private async execute(): Promise<SupabaseQueryResult<readonly Row[]>> {
    try {
      const response = await fetch(this.buildUrl(), { headers: this.headers });
      if (!response.ok) {
        return { data: null, error: { message: `PostgREST ${response.status}` } };
      }
      const data = (await response.json()) as readonly Row[];
      return { data, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : String(err) } };
    }
  }

  async maybeSingle(): Promise<SupabaseQueryResult<Row | null>> {
    const limited = new RestFilterBuilder<Row>(
      this.baseUrl,
      this.headers,
      this.table,
      this.columns,
      this.filters,
      this.orderClause,
      1,
    );
    const result = await limited.execute();
    if (result.error !== null) {
      return { data: null, error: result.error };
    }
    return { data: result.data?.[0] ?? null, error: null };
  }

  then<TResult1 = SupabaseQueryResult<readonly Row[]>, TResult2 = never>(
    onfulfilled?:
      | ((value: SupabaseQueryResult<readonly Row[]>) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * PostgREST HTTP API로 `SupabaseQueryClient`를 구현하는 임시 브리지(위 파일 헤더 참조).
 * `supabaseUrl`/`apiKey` 생략 시 `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
 * 환경변수를 쓴다(`CLAUDE.md` — 이미 `.env.local`에 설정돼 있음).
 */
export function createSupabaseRestQueryClient(config?: {
  readonly supabaseUrl?: string;
  readonly apiKey?: string;
}): SupabaseQueryClient {
  const supabaseUrl = config?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = config?.apiKey ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (supabaseUrl === undefined || apiKey === undefined) {
    throw new Error(
      '[src/lib/data/supabase/client.ts] NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY가 ' +
        '설정되지 않았습니다.',
    );
  }
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const headers = { apikey: apiKey, Authorization: `Bearer ${apiKey}` };

  return {
    from: <T extends keyof Tables>(table: T) => ({
      select: (columns: string) =>
        new RestFilterBuilder<Tables[T]['Row']>(baseUrl, headers, String(table), columns),
    }),
  };
}
