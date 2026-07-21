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
 * ## `count: 'exact'` + `lte` — 47일차(I-234) 추가
 * `/api/health`의 밀린 Fixture 수가 `BACKLOG_SCAN_LIMIT`(1000) 스캔 근사치였던 한계
 * (I-234)를 없애기 위해 PostgREST `Prefer: count=exact` + `Content-Range` 파싱을
 * 추가한다. `select(columns, { count: 'exact', head: true })`는 실제 `@supabase-js`와
 * 동일 시그니처이며, `head: true`면 본문 없이(`HEAD` 메서드) 정확한 총건수만 받는다.
 * `lte`는 "킥오프가 지난" 조건(`kickoff_at <= now`)을 서버 쪽 필터로 표현하기 위해
 * `eq`와 대칭으로 추가한다.
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
  /** `count: 'exact'`를 요청했을 때만 채워지는 총건수(PostgREST `Content-Range`). */
  readonly count?: number | null;
}

export interface SupabaseFilterBuilder<Row>
  extends PromiseLike<SupabaseQueryResult<readonly Row[]>> {
  eq(column: string, value: string | number | boolean): SupabaseFilterBuilder<Row>;
  lte(column: string, value: string | number): SupabaseFilterBuilder<Row>;
  in(column: string, values: readonly (string | number)[]): SupabaseFilterBuilder<Row>;
  order(column: string, options?: { readonly ascending?: boolean }): SupabaseFilterBuilder<Row>;
  limit(count: number): SupabaseFilterBuilder<Row>;
  maybeSingle(): PromiseLike<SupabaseQueryResult<Row | null>>;
}

export interface SupabaseQueryClient {
  from<T extends keyof Tables>(
    table: T,
  ): {
    readonly select: (
      columns: string,
      options?: { readonly count?: 'exact'; readonly head?: boolean },
    ) => SupabaseFilterBuilder<Tables[T]['Row']>;
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * REST 브리지 구현체 — 위 파일 헤더 "createSupabaseRestQueryClient" 절 참조.
 * ──────────────────────────────────────────────────────────────────────── */

interface RestFilter {
  readonly column: string;
  readonly op: 'eq' | 'lte' | 'in';
  readonly value: string;
}

// `buildUrl()`이 `URLSearchParams`로 직렬화하는 시점에 퍼센트 인코딩을 1회 수행하므로,
// 여기서는 원본 문자열을 그대로 넘긴다 — 미리 `encodeURIComponent`로 인코딩해 두면
// `URLSearchParams`가 그 결과물(리터럴 `%`)을 다시 인코딩해 이중 인코딩이 발생한다
// (예: 공백 1글자가 `%2520`으로 전송되어 PostgREST가 값을 원복하지 못한다 — 23일차
// `client.test.ts` 작성 중 실측 발견, 그전까지 커버리지 0%라 미검출).
function stringifyFilterValue(value: string | number | boolean): string {
  return String(value);
}

/** `Content-Range: 0-24/117` 또는 `head:true`일 때의 `Content-Range: (star)/117`에서 총건수(117)만 뽑는다. 미상이면 null. */
function parseContentRangeTotal(headerValue: string | null): number | null {
  if (headerValue === null) return null;
  const total = headerValue.split('/')[1];
  if (total === undefined || total === '*') return null;
  const parsed = Number(total);
  return Number.isNaN(parsed) ? null : parsed;
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
    private readonly countMode: 'exact' | null = null,
    private readonly headMode: boolean = false,
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
      this.countMode,
      this.headMode,
    );
  }

  eq(column: string, value: string | number | boolean): SupabaseFilterBuilder<Row> {
    return this.withFilter({ column, op: 'eq', value: stringifyFilterValue(value) });
  }

  lte(column: string, value: string | number): SupabaseFilterBuilder<Row> {
    return this.withFilter({ column, op: 'lte', value: stringifyFilterValue(value) });
  }

  in(column: string, values: readonly (string | number)[]): SupabaseFilterBuilder<Row> {
    const joined = values.map((v) => stringifyFilterValue(v)).join(',');
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
      this.countMode,
      this.headMode,
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
      this.countMode,
      this.headMode,
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
    const requestHeaders =
      this.countMode === null ? this.headers : { ...this.headers, Prefer: `count=${this.countMode}` };
    try {
      const response = await fetch(this.buildUrl(), {
        method: this.headMode ? 'HEAD' : 'GET',
        headers: requestHeaders,
      });
      const count = parseContentRangeTotal(response.headers?.get('content-range') ?? null);
      if (!response.ok) {
        return { data: null, error: { message: `PostgREST ${response.status}` }, count };
      }
      if (this.headMode) {
        return { data: [], error: null, count };
      }
      const data = (await response.json()) as readonly Row[];
      return { data, error: null, count };
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
      this.countMode,
      this.headMode,
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
      select: (columns: string, options?: { readonly count?: 'exact'; readonly head?: boolean }) =>
        new RestFilterBuilder<Tables[T]['Row']>(
          baseUrl,
          headers,
          String(table),
          columns,
          [],
          null,
          null,
          options?.count ?? null,
          options?.head ?? false,
        ),
    }),
  };
}
