/**
 * bootstrap.ts 자기검증 — Task 004(11일차) 산출물의 회귀 테스트.
 * 15일차(Task 008) I-94 재판단 과정에서 드러난 src/lib/data/** 무테스트 문제를
 * 1팀 소유 파일 범위에서 보강한다.
 *
 * `./mock`·`./supabase`(3팀 Task 007 / 6팀 Task 034)는 이 시점에 아직 존재하지 않으므로
 * `bootstrapDataSource()`가 실제로 어댑터를 로드하는 성공 경로는 검증 대상이 아니다 —
 * 여기서는 "모듈이 없으면 실패를 흘려보내되, 한 번 시도한 뒤에는 재시도하지 않는다"는
 * 부트스트랩 가드 자체의 동작만 검증한다(파일 헤더 "절충 설계" 절 참조).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapApp, bootstrapDataSource, resetDataSourceBootstrap } from './bootstrap';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_DATA_SOURCE;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  resetDataSourceBootstrap();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL_ENV;
  }
});

describe('bootstrapDataSource', () => {
  it('./mock 어댑터가 아직 없으므로 최초 호출은 모듈 조회 실패로 reject한다', async () => {
    await expect(bootstrapDataSource()).rejects.toBeTruthy();
  });

  it('최초 호출이 실패해도 같은 프로세스 내 재호출은 재시도 없이 바로 resolve한다', async () => {
    await expect(bootstrapDataSource()).rejects.toBeTruthy();
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('resetDataSourceBootstrap 이후에는 다시 시도해 다시 reject한다', async () => {
    await expect(bootstrapDataSource()).rejects.toBeTruthy();
    resetDataSourceBootstrap();
    await expect(bootstrapDataSource()).rejects.toBeTruthy();
  });
});

describe('bootstrapApp', () => {
  it('공통코드 폴백 등록 후 어댑터 등록을 시도하며, 어댑터 실패를 그대로 전파한다', async () => {
    await expect(bootstrapApp()).rejects.toBeTruthy();
  });

  it('최초 호출이 실패해도 재호출은 재시도 없이 바로 resolve한다', async () => {
    await expect(bootstrapApp()).rejects.toBeTruthy();
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });
});
