/**
 * `client.ts`(Task 034a, 20~22일차) 자기검증 — **23일차(2026-08-20) 신설**.
 *
 * `SupabaseDataSource.test.ts`는 `SupabaseFilterBuilder`/`SupabaseQueryClient`의 **페이크
 * 구현**(`FakeFilterBuilder`)으로 어댑터 로직만 검증했다 — 이 파일이 실제로 구현하는
 * `RestFilterBuilder`(PostgREST HTTP 브리지)와 `createSupabaseRestQueryClient` 자체는 그
 * 어떤 테스트도 거치지 않아 커버리지 0%였다(CI `test:coverage` perFile 임계 위반, 23일차
 * 팀장 보고). `global.fetch`를 스텁해 실제 URL 조립·헤더·에러 변환 경로를 오프라인으로
 * 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseRestQueryClient } from './client';

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function restoreEnv(): void {
  if (ORIGINAL_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  }
  if (ORIGINAL_KEY === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ORIGINAL_KEY;
  }
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

afterEach(() => {
  restoreEnv();
  vi.unstubAllGlobals();
});

describe('createSupabaseRestQueryClient — 설정 해석', () => {
  it('config도 환경변수도 없으면 에러를 던진다', () => {
    expect(() => createSupabaseRestQueryClient()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL\/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it('config를 명시하면 환경변수 없이도 동작하고, baseUrl 끝의 슬래시를 제거한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createSupabaseRestQueryClient({
      supabaseUrl: 'https://example.test/',
      apiKey: 'explicit-key',
    });
    await client.from('league').select('*');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl.startsWith('https://example.test/rest/v1/league?')).toBe(true);
    expect(calledInit.headers).toEqual({
      apikey: 'explicit-key',
      Authorization: 'Bearer explicit-key',
    });
  });

  it('환경변수로 폴백한다', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://env.test';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'env-key';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal('fetch', fetchMock);

    const client = createSupabaseRestQueryClient();
    await client.from('team').select('*');

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(calledUrl).toBe('https://env.test/rest/v1/team?select=*');
  });
});

describe('RestFilterBuilder — 쿼리 조립', () => {
  function stubFetchOnce(data: unknown): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  it('eq/in/order/limit가 쿼리스트링에 누적 반영된다(문자열은 encodeURIComponent, 그 외는 String)', async () => {
    const fetchMock = stubFetchOnce([]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    await client
      .from('team')
      .select('id,name')
      .eq('name', '레알 마드리드')
      .eq('is_active', true)
      .in('id', ['a', 1])
      .order('name', { ascending: false })
      .limit(10);

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    const url = new URL(calledUrl);
    expect(url.pathname).toBe('/rest/v1/team');
    expect(url.searchParams.get('select')).toBe('id,name');
    expect(url.searchParams.getAll('name')).toEqual(['eq.레알 마드리드']);
    expect(url.searchParams.getAll('is_active')).toEqual(['eq.true']);
    expect(url.searchParams.getAll('id')).toEqual(['in.(a,1)']);
    expect(url.searchParams.get('order')).toBe('name.desc');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('order 옵션 생략 시 기본은 ascending(asc)이다', async () => {
    const fetchMock = stubFetchOnce([]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    await client.from('team').select('*').order('name');

    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get('order')).toBe('name.asc');
  });

  it('빌더는 불변(각 메서드가 새 인스턴스를 반환)이라 중간 단계 재사용이 서로 간섭하지 않는다', async () => {
    const fetchMock = stubFetchOnce([]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const base = client.from('team').select('*').eq('season_id', 's1');
    await base.eq('id', 'team-a');
    await base.eq('id', 'team-b');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urlA = new URL((fetchMock.mock.calls[0] as [string])[0]);
    const urlB = new URL((fetchMock.mock.calls[1] as [string])[0]);
    expect(urlA.searchParams.getAll('id')).toEqual(['eq.team-a']);
    expect(urlB.searchParams.getAll('id')).toEqual(['eq.team-b']);
  });

  it('then()으로 await하면 성공 시 data/error를 반환한다', async () => {
    stubFetchOnce([{ id: '1' }, { id: '2' }]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*');

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('maybeSingle()은 첫 로우 하나만 반환하고, 결과가 비어 있으면 null이다', async () => {
    const fetchMock = stubFetchOnce([{ id: 'only' }]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*').maybeSingle();

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: 'only' });
    const [calledUrl] = fetchMock.mock.calls[0] as [string];
    expect(new URL(calledUrl).searchParams.get('limit')).toBe('1');
  });

  it('maybeSingle()은 결과가 없으면 data: null을 반환한다', async () => {
    stubFetchOnce([]);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*').maybeSingle();

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('PostgREST가 !ok 응답을 주면 상태코드를 담은 error를 반환한다(throw하지 않는다)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve(null) });
    vi.stubGlobal('fetch', fetchMock);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'PostgREST 404' });
  });

  it('maybeSingle()도 !ok 응답의 error를 그대로 전파한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve(null) });
    vi.stubGlobal('fetch', fetchMock);
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*').maybeSingle();

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'PostgREST 500' });
  });

  it('fetch 자체가 Error를 던지면 message를 error로 감싼다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*');

    expect(result.data).toBeNull();
    expect(result.error).toEqual({ message: 'network down' });
  });

  it('fetch가 Error가 아닌 값을 던지면 String()으로 변환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('boom'));
    const client = createSupabaseRestQueryClient({ supabaseUrl: 'https://x.test', apiKey: 'k' });

    const result = await client.from('team').select('*');

    expect(result.error).toEqual({ message: 'boom' });
  });
});
