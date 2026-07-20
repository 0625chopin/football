/**
 * `src/lib/data/supabase/index.ts`(Task 034a 3/3, 22일차) 등록 배선 자기검증 —
 * **23일차(2026-08-20) 신설**(CI `test:coverage` perFile 임계 위반 — 0% 커버리지 — 해소).
 *
 * `mock/index.test.ts`(H-07 종료 스위트)와 동일한 패턴 — 모듈을 로드하면
 * `registerDataSource('supabase', ...)`가 실행되어 `getDataSource()`가 `SupabaseDataSource`를
 * 반환하는지만 확인한다. 프로바이더는 지연 생성(lazy)이므로 `getDataSource()` 호출 시점에
 * `createSupabaseRestQueryClient()`가 실행되어 환경변수를 요구한다 — 실제 네트워크 호출은
 * 하지 않고(메서드가 함수로 존재하는지만 확인) `SupabaseDataSource` 인스턴스 자체를
 * 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getDataSource, getDataSourceKind, resetDataSourceCache } from '@/lib/data/factory';
import { SupabaseDataSource } from './SupabaseDataSource';

const ORIGINAL_KIND = process.env.NEXT_PUBLIC_DATA_SOURCE;
const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

beforeEach(() => {
  process.env.NEXT_PUBLIC_DATA_SOURCE = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://index-test.example';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'index-test-key';
  resetDataSourceCache();
});

afterEach(() => {
  if (ORIGINAL_KIND === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL_KIND;
  }
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
  resetDataSourceCache();
});

describe('H-22 전 단계 — src/lib/data/supabase/index.ts 등록 배선', () => {
  it('모듈을 로드하면 registerDataSource("supabase", ...)가 실행되어 getDataSource()가 SupabaseDataSource를 반환한다', async () => {
    await import('./index');

    expect(getDataSourceKind()).toBe('supabase');
    const dataSource = getDataSource();
    expect(dataSource).toBeInstanceOf(SupabaseDataSource);
    expect(typeof dataSource.getLeagues).toBe('function');
  });

  it('프로바이더는 지연 생성이다 — 등록 자체는 환경변수 없이도 에러 없이 끝난다', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    await expect(import('./index')).resolves.toBeDefined();
  });
});
