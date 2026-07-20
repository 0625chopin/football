/**
 * fetch-result.ts 자기검증 — Task 004(11일차) 산출물의 회귀 테스트.
 * 15일차(Task 008) I-94 재판단 과정에서 드러난 src/lib/data/** 무테스트 문제를
 * 1팀 소유 파일 범위에서 보강한다.
 */

import { describe, expect, it } from 'vitest';
import { fetchListResult, fetchResult } from './fetch-result';

describe('fetchResult', () => {
  it('fetcher가 값을 반환하면 SUCCESS로 감싼다', async () => {
    const result = await fetchResult(async () => 'value');
    expect(result).toEqual({ status: 'SUCCESS', data: 'value' });
  });

  it('fetcher가 null을 반환하면 EMPTY로 감싼다', async () => {
    const result = await fetchResult(async () => null);
    expect(result).toEqual({ status: 'EMPTY' });
  });

  it('fetcher가 reject하면 ERROR로 감싸고 retryable: true를 붙인다', async () => {
    const cause = new Error('network down');
    const result = await fetchResult(async () => {
      throw cause;
    });
    expect(result).toEqual({
      status: 'ERROR',
      error: { message: 'network down', retryable: true, cause },
    });
  });

  it('fetcher가 Error가 아닌 값을 throw해도 문자열로 변환해 담는다', async () => {
    const result = await fetchResult(async () => {
      throw 'raw string cause';
    });
    expect(result.status).toBe('ERROR');
    expect(result.status === 'ERROR' && result.error.message).toBe('raw string cause');
  });
});

describe('fetchListResult', () => {
  it('fetcher가 빈 배열을 반환하면 EMPTY로 감싼다', async () => {
    const result = await fetchListResult(async () => []);
    expect(result).toEqual({ status: 'EMPTY' });
  });

  it('fetcher가 원소가 있는 배열을 반환하면 SUCCESS로 감싼다', async () => {
    const items = [1, 2, 3];
    const result = await fetchListResult(async () => items);
    expect(result).toEqual({ status: 'SUCCESS', data: items });
  });

  it('fetcher가 reject하면 ERROR로 감싸고 retryable: true를 붙인다', async () => {
    const result = await fetchListResult(async () => {
      throw new Error('list fetch failed');
    });
    expect(result).toEqual({
      status: 'ERROR',
      error: { message: 'list fetch failed', retryable: true, cause: expect.any(Error) },
    });
  });
});
