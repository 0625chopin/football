/**
 * bootstrap.ts 자기검증 — Task 004(11일차) 산출물의 회귀 테스트.
 * 15일차(Task 008) I-94 재판단 과정에서 드러난 src/lib/data/** 무테스트 문제를
 * 1팀 소유 파일 범위에서 보강한다.
 *
 * ## 22일차 갱신 (I-75 확정·해소 + 부트스트랩 플래그 실패 은폐 결함 회귀)
 * `./mock`(3팀 Task 007, 19일차)·`./supabase`(6팀 Task 034)가 이제 둘 다 실존해 19일차의
 * "배럴 이전/이후 세계관" 분기(`existsSync` 기반 skipIf/runIf)가 항상 "이후" 쪽만 타는
 * 죽은 코드가 됐다 — 게다가 그 "이전" 분기는 부트스트랩 플래그가 실패를 은폐하던 옛 버그
 * (첫 호출 reject → 플래그는 true로 남음 → 재호출이 재시도 없이 resolve)를 **정상 동작으로
 * 문서화**하고 있었다. 파일 존재 여부에 기대는 대신 `vi.doMock('./mock', ...)`으로 성공/실패를
 * 결정론적으로 주입해, 실제 파일 상태와 무관하게 재시도·단일 등록 계약을 검증한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  vi.doUnmock('./mock');
  resetDataSourceBootstrap();
});

describe('bootstrapDataSource — 등록 성공 경로 (실제 ./mock 사용)', () => {
  it('최초 호출이 어댑터 등록까지 마치고 resolve한다', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('재호출도 재등록 없이 바로 resolve한다', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('resetDataSourceBootstrap 이후에도 다시 resolve한다(모듈은 이미 로드돼 있으므로)', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
    resetDataSourceBootstrap();
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });
});

describe('bootstrapDataSource — 실패 후 재시도 (22일차, 결함 ⓑ 회귀)', () => {
  it('최초 호출이 실패하면 플래그가 성공으로 오염되지 않고, 재호출이 처음부터 다시 시도한다', async () => {
    vi.doMock('./mock', () => {
      throw new Error('boom');
    });

    await expect(bootstrapDataSource()).rejects.toBeTruthy();

    vi.doUnmock('./mock');
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('동시 호출은 in-flight 프라미스를 공유해 등록 모듈을 한 번만 로드한다', async () => {
    const loadSpy = vi.fn();
    vi.doMock('./mock', () => {
      loadSpy();
      return {};
    });

    await Promise.all([bootstrapDataSource(), bootstrapDataSource(), bootstrapDataSource()]);

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('성공 후 재호출은 등록 모듈을 다시 로드하지 않고 캐시된 결과를 재사용한다', async () => {
    const loadSpy = vi.fn();
    vi.doMock('./mock', () => {
      loadSpy();
      return {};
    });

    await bootstrapDataSource();
    await bootstrapDataSource();

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});

describe('bootstrapApp — 등록 성공 경로 (실제 ./mock 사용)', () => {
  it('공통코드 폴백 등록 후 어댑터 등록까지 정상적으로 resolve한다', async () => {
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });

  it('재호출은 재실행 없이 바로 resolve한다', async () => {
    await expect(bootstrapApp()).resolves.toBeUndefined();
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });
});

describe('bootstrapApp — 실패 후 재시도 (22일차, 결함 ⓑ 회귀)', () => {
  it('어댑터 등록 실패를 그대로 전파하고, 재호출이 처음부터 다시 시도한다', async () => {
    vi.doMock('./mock', () => {
      throw new Error('boom');
    });

    await expect(bootstrapApp()).rejects.toBeTruthy();

    vi.doUnmock('./mock');
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });
});
