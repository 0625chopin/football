/**
 * factory.ts 자기검증 — Task 004(10일차) 산출물의 회귀 테스트.
 *
 * 15일차(Task 008) I-94 재판단 과정에서 src/lib/data/**가 무테스트(0%)로 드러나
 * (팀장 실측), 1팀 소유 파일이라 이 팀이 직접 보강한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { DataSource } from './DataSource';
import {
  getDataSource,
  getDataSourceKind,
  registerDataSource,
  resetDataSourceCache,
} from './factory';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_DATA_SOURCE;

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL_ENV;
  }
  resetDataSourceCache();
});

describe('getDataSourceKind', () => {
  it('환경변수가 없으면 mock으로 폴백한다', () => {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    expect(getDataSourceKind()).toBe('mock');
  });

  it('supabase로 지정하면 그대로 반환한다', () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'supabase';
    expect(getDataSourceKind()).toBe('supabase');
  });

  it('유효하지 않은 값은 mock으로 폴백한다', () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'garbage';
    expect(getDataSourceKind()).toBe('mock');
  });
});

describe('registerDataSource / getDataSource', () => {
  it('등록된 프로바이더가 생성한 인스턴스를 반환하고, 이후 호출은 캐시를 재사용한다', () => {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    const fake = {} as DataSource;
    let callCount = 0;
    registerDataSource('mock', () => {
      callCount += 1;
      return fake;
    });

    const first = getDataSource();
    const second = getDataSource();

    expect(first).toBe(fake);
    expect(second).toBe(first);
    expect(callCount).toBe(1);
  });

  it('resetDataSourceCache 이후에는 프로바이더를 다시 호출한다', () => {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
    let callCount = 0;
    registerDataSource('mock', () => {
      callCount += 1;
      return {} as DataSource;
    });

    getDataSource();
    resetDataSourceCache();
    getDataSource();

    expect(callCount).toBe(2);
  });

  it('등록되지 않은 kind를 조회하면 kind를 명시한 에러를 던진다', () => {
    process.env.NEXT_PUBLIC_DATA_SOURCE = 'supabase';
    resetDataSourceCache();

    expect(() => getDataSource()).toThrow(/kind="supabase"/);
  });
});
