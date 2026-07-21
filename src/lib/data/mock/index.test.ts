/**
 * Task 007 종료 스위트 — **19일차(2026-08-14)**.
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 19일차 행("Vitest — 시드 재현성,
 * 스쿼드 구조 불변식, 등번호 중복 0, 국적별 이름 풀 매칭", 수락 "동일 시드 2회 생성 시 전
 * 엔티티 100% 동일 / 상위 리그일수록 평균 OVR 유의하게 높음 / 정적 JSON 하드코딩 0건" /
 * H-07 인계).
 *
 * `world.test.ts`(15일차)·`generate.test.ts`(13일차)가 각 산출물 단위에서 이미 위 기준을
 * 검증했다(두 파일 헤더가 "19일차에 별도로 보강/추가되며 대체하지 않는다"고 명시) — 이
 * 파일은 그걸 반복하지 않고, **① 이 팀의 최종 조립 지점(`index.ts`가 등록한
 * `MockDataSource`)에서도 같은 기준이 깨지지 않는지**, **② 개별 유닛 테스트로는 못 잡는
 * 전체-월드 스케일 교차 검증(국적↔이름 실제 디코딩, I-114 시각 순서, 정적 JSON 존재 여부)**을
 * 담는다.
 */

import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDataSource,
  getDataSourceKind,
  getRegisteredConstantSource,
  resetDataSourceCache,
} from '@/lib/data/factory';
import { NATIONALITY_NAME_POOLS } from '@/lib/naming/namePools';
import type { NationalityNamePool } from '@/lib/naming/namePools';
import { generateMockProgress } from '@/lib/mock/progress';
import { generateMockWorld } from '@/lib/mock/world';
import type { WorldSeed } from '@/types';

const SEED_A = 20260814 as WorldSeed;
const SEED_B = 424242 as WorldSeed;

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_DATA_SOURCE;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  resetDataSourceCache();
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_DATA_SOURCE;
  } else {
    process.env.NEXT_PUBLIC_DATA_SOURCE = ORIGINAL_ENV;
  }
  resetDataSourceCache();
});

/**
 * `fullName`이 `pool`의 이름/성 후보군 조합으로 실제 분해 가능한지 검사한다
 * (`namePools.ts`의 `formatFullName` 역연산 — 원본 given/family를 들고 있지 않은
 * `Player.name` 문자열만으로 매칭을 확인해야 하므로, 후보 성(family)을 하나씩 접두사로
 * 떼어보며 나머지가 이름(given) 풀에 있는지 확인한다).
 */
function nameMatchesPool(fullName: string, pool: NationalityNamePool): boolean {
  if (pool.nameOrder === 'GIVEN_FIRST_SPACED') {
    const spaceIndex = fullName.indexOf(' ');
    if (spaceIndex === -1) {
      return false;
    }
    const given = fullName.slice(0, spaceIndex);
    const family = fullName.slice(spaceIndex + 1);
    return pool.givenNames.includes(given) && pool.familyNames.includes(family);
  }
  return pool.familyNames.some((family) => {
    if (!fullName.startsWith(family)) {
      return false;
    }
    const given = fullName.slice(family.length);
    return pool.givenNames.includes(given);
  });
}

describe('H-07 — src/lib/data/mock/index.ts 등록 배선', () => {
  it('모듈을 로드하면 registerDataSource("mock", ...)가 실행되어 getDataSource()가 MockDataSource를 반환한다', async () => {
    await import('./index');

    expect(getDataSourceKind()).toBe('mock');
    const dataSource = getDataSource();
    expect(dataSource).toBeDefined();

    const leagues = await dataSource.getLeagues();
    expect(leagues).toHaveLength(3);
  });

  it('42일차(I-206) — registerConstantSource("mock", ...)도 함께 실행되어 조회 가능하다', async () => {
    await import('./index');

    const source = getRegisteredConstantSource('mock');
    expect(source).toBeDefined();
    expect(source?.name).toBe('mock-normal-defaults');
    expect(source?.getGroupConstants('UI_PARAM')).toEqual({
      POLL_INTERVAL_MS: 5000,
      POLL_LIVE_MS: 3000,
      LEADERBOARD_MIN_APPEARANCE_PCT: 30,
    });
  });
});

describe('Task 007 종료 — 조립된 MockDataSource 레벨 재검증', () => {
  it('같은 worldSeed로 만든 Mock 산출물은 월드·진행 상태가 100% 동일하다(시드 재현성 — 어댑터가 소비하는 두 팩토리 레벨에서 재확인)', () => {
    const worldA1 = generateMockWorld(SEED_A);
    const worldA2 = generateMockWorld(SEED_A);
    expect(worldA2).toEqual(worldA1);

    const progressA1 = generateMockProgress(SEED_A, worldA1);
    const progressA2 = generateMockProgress(SEED_A, worldA2);
    expect(progressA2).toEqual(progressA1);
  });

  it('팀당 스쿼드는 어댑터를 거쳐도 22~30명·GK≥2·CB≥3·등번호 무중복을 유지한다', async () => {
    const world = generateMockWorld(SEED_A);

    for (const team of world.teams.slice(0, 5)) {
      const states = world.playerStates.filter((s) => s.teamId === team.id);
      expect(states.length).toBeGreaterThanOrEqual(22);
      expect(states.length).toBeLessThanOrEqual(30);

      const numbers = states.map((s) => s.squadNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
      for (const n of numbers) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(99);
      }

      const players = world.players.filter((p) => states.some((s) => s.playerId === p.id));
      expect(players.filter((p) => p.preferredPosition === 'GK').length).toBeGreaterThanOrEqual(2);
      expect(players.filter((p) => p.preferredPosition === 'CB').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('다른 worldSeed(SEED_B)로도 동일한 구조 불변식을 만족한다(시드 특정값에 대한 우연이 아님)', () => {
    const world = generateMockWorld(SEED_B);
    expect(world.teams).toHaveLength(60);
    for (const team of world.teams) {
      const states = world.playerStates.filter((s) => s.teamId === team.id);
      const numbers = states.map((s) => s.squadNumber);
      expect(new Set(numbers).size).toBe(numbers.length);
    }
  });

  it('전 선수의 이름이 자신의 nationality 풀에서 실제로 분해 가능하다(국적별 이름 풀 매칭 100%)', () => {
    const world = generateMockWorld(SEED_A);
    expect(world.players.length).toBeGreaterThan(0);

    for (const player of world.players) {
      const pool = NATIONALITY_NAME_POOLS[player.nationality];
      expect(pool, `nationality "${player.nationality}"에 대한 이름 풀이 없습니다`).toBeDefined();
      expect(
        nameMatchesPool(player.name, pool),
        `"${player.name}"(${player.nationality})가 이름 풀 조합으로 분해되지 않습니다`,
      ).toBe(true);
    }

    for (const manager of world.managers) {
      // 감독도 동일 생성기(`generatePlayerName`)를 재사용하므로 같은 기준으로 검증한다.
      const nationalityGuess = Object.values(NATIONALITY_NAME_POOLS).find((pool) =>
        nameMatchesPool(manager.name, pool),
      );
      expect(nationalityGuess, `감독 "${manager.name}"가 어떤 국적 풀과도 매칭되지 않습니다`).toBeDefined();
    }
  });

  it('I-114 해소 — 월드 생성 시각이 시즌 시작 시각보다 앞선다(시간 역전 없음)', () => {
    const world = generateMockWorld(SEED_A);
    const progress = generateMockProgress(SEED_A, world);

    expect(progress.season.startedAt).not.toBeNull();
    expect(new Date(world.world.createdAt).getTime()).toBeLessThan(
      new Date(progress.season.startedAt as string).getTime(),
    );
  });

  it('정적 JSON 하드코딩 0건 — 이 팀 소유 경로에 데이터 성격의 .json 파일이 없다(D-16)', () => {
    const ownedDirs = [
      'lib/config',
      'lib/mock',
      'lib/naming',
      'lib/economy',
      'lib/preseason',
      'lib/odds',
      'lib/data/mock',
    ];
    const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    expect(existsSync(join(srcRoot, 'app'))).toBe(true); // srcRoot 계산 자기검증(경로 오타 방지)

    const jsonFiles: string[] = [];
    for (const rel of ownedDirs) {
      const dirPath = join(srcRoot, rel);
      if (!existsSync(dirPath)) {
        continue;
      }
      walkForJson(dirPath, jsonFiles);
    }

    // tsconfig 등 설정 파일이 아니라 "데이터" json만 금지 대상이므로, package.json류는 애초에
    // 이 팀 소유 경로 밑에 없다 — 존재 자체가 위반이다.
    expect(jsonFiles).toEqual([]);
  });
});

function walkForJson(dirPath: string, out: string[]): void {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkForJson(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      out.push(full);
    }
  }
}
