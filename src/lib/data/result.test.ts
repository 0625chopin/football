/**
 * result.ts 자기검증 — Task 004(10일차) 산출물의 회귀 테스트.
 * 15일차(Task 008) I-94 재판단 과정에서 드러난 src/lib/data/** 무테스트 문제를
 * 1팀 소유 파일 범위에서 보강한다.
 */

import { describe, expect, it } from 'vitest';
import {
  emptyResult,
  errorResult,
  fromArray,
  fromNullable,
  isEmpty,
  isError,
  isLoading,
  isSuccess,
  loadingResult,
  successResult,
} from './result';

describe('생성자', () => {
  it('loadingResult는 LOADING 상태를 만든다', () => {
    expect(loadingResult()).toEqual({ status: 'LOADING' });
  });

  it('successResult는 데이터를 담은 SUCCESS 상태를 만든다', () => {
    expect(successResult(42)).toEqual({ status: 'SUCCESS', data: 42 });
  });

  it('emptyResult는 EMPTY 상태를 만든다', () => {
    expect(emptyResult()).toEqual({ status: 'EMPTY' });
  });

  it('errorResult는 옵션 없이 message만 담을 수 있다', () => {
    expect(errorResult('boom')).toEqual({ status: 'ERROR', error: { message: 'boom' } });
  });

  it('errorResult는 retryable/cause를 전달된 경우에만 포함한다', () => {
    const cause = new Error('root cause');
    expect(errorResult('boom', { retryable: true, cause })).toEqual({
      status: 'ERROR',
      error: { message: 'boom', retryable: true, cause },
    });
  });
});

describe('타입가드', () => {
  it('각 상태에 맞는 가드만 true를 반환한다', () => {
    expect(isLoading(loadingResult())).toBe(true);
    expect(isError(loadingResult())).toBe(false);
    expect(isEmpty(loadingResult())).toBe(false);
    expect(isSuccess(loadingResult())).toBe(false);

    expect(isSuccess(successResult(1))).toBe(true);
    expect(isEmpty(errorResult('x'))).toBe(false);
    expect(isEmpty(emptyResult())).toBe(true);
  });
});

describe('변환 헬퍼', () => {
  it('fromNullable: null이면 EMPTY, 값이 있으면 SUCCESS', () => {
    expect(fromNullable(null)).toEqual({ status: 'EMPTY' });
    expect(fromNullable('x')).toEqual({ status: 'SUCCESS', data: 'x' });
  });

  it('fromArray: 길이 0이면 EMPTY, 그 외에는 원본 배열을 담은 SUCCESS', () => {
    expect(fromArray([])).toEqual({ status: 'EMPTY' });
    const items = [1, 2, 3];
    expect(fromArray(items)).toEqual({ status: 'SUCCESS', data: items });
  });
});
