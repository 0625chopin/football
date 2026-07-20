/**
 * bootstrap.ts 자기검증 — Task 004(11일차) 산출물의 회귀 테스트.
 * 15일차(Task 008) I-94 재판단 과정에서 드러난 src/lib/data/** 무테스트 문제를
 * 1팀 소유 파일 범위에서 보강한다.
 *
 * ## 19일차 갱신 (I-113)
 * `./mock`(3팀 Task 007, H-07 배선)이 생기는 순간 "모듈이 없어 reject한다"는 전제의
 * 테스트가 그대로 깨진다. `mock/index.ts` 존재 여부를 런타임에 확인해
 * `describe.runIf`/`skipIf`로 "배럴 이전"과 "배럴 이후" 두 세계관을 모두 검증하도록
 * 바꿨다 — 오늘(배럴 없음)도, 3팀이 같은 날 뒤이어 배럴을 얹은 뒤(배럴 있음)도 이 파일을
 * 다시 건드릴 필요가 없다. `./supabase`는 6팀 Task 034(이후 일차)까지 여전히 없으므로
 * 관련 경로는 항상 "부재" 세계관을 유지한다(파일 헤더 원문의 "절충 설계" 참조).
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bootstrapApp, bootstrapDataSource, resetDataSourceBootstrap } from './bootstrap';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_DATA_SOURCE;

const mockBarrelExists = existsSync(join(dirname(fileURLToPath(import.meta.url)), 'mock', 'index.ts'));

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

describe.skipIf(mockBarrelExists)('bootstrapDataSource (./mock 부재 — 배럴 이전 세계관)', () => {
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

describe.runIf(mockBarrelExists)('bootstrapDataSource (./mock 존재 — 등록 성공 경로)', () => {
  it('./mock이 존재하면 최초 호출이 어댑터 등록까지 마치고 resolve한다', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('재호출도 재시도 없이 바로 resolve한다', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });

  it('resetDataSourceBootstrap 이후에도 다시 resolve한다(모듈은 이미 로드돼 있으므로)', async () => {
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
    resetDataSourceBootstrap();
    await expect(bootstrapDataSource()).resolves.toBeUndefined();
  });
});

describe.skipIf(mockBarrelExists)('bootstrapApp (./mock 부재 — 배럴 이전 세계관)', () => {
  it('공통코드 폴백 등록 후 어댑터 등록을 시도하며, 어댑터 실패를 그대로 전파한다', async () => {
    await expect(bootstrapApp()).rejects.toBeTruthy();
  });

  it('최초 호출이 실패해도 재호출은 재시도 없이 바로 resolve한다', async () => {
    await expect(bootstrapApp()).rejects.toBeTruthy();
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });
});

describe.runIf(mockBarrelExists)('bootstrapApp (./mock 존재 — 등록 성공 경로)', () => {
  it('공통코드 폴백 등록 후 어댑터 등록까지 정상적으로 resolve한다', async () => {
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });

  it('재호출은 재시도 없이 바로 resolve한다', async () => {
    await expect(bootstrapApp()).resolves.toBeUndefined();
    await expect(bootstrapApp()).resolves.toBeUndefined();
  });
});
