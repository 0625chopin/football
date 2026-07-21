/**
 * derive.ts 테스트 — Task 006 / 5일차 산출물.
 *
 * 시드 계층 파생(world → season → match → event)의 결정론과, 배당 프리시뮬
 * 네임스페이스 독립성(NFR-DT-006)을 검증한다.
 */

import { describe, expect, it } from 'vitest';
import { createState } from './prng';
import {
  SEED_NAMESPACE,
  assertNamespace,
  deriveEventSeed,
  deriveMatchSeed,
  deriveSeasonSeed,
  deriveStandingDrawSeed,
  hashKey,
  isSameNamespace,
  namespaceOf,
  stateForSeed,
} from './derive';

describe('derive — 결정론(재현성)', () => {
  it('동일 (worldSeed, seasonNumber)는 항상 동일 시즌 시드를 낸다', () => {
    const a = deriveSeasonSeed(123456, 3);
    const b = deriveSeasonSeed(123456, 3);
    expect(a).toBe(b);
  });

  it('동일 (seasonSeed, matchKey)는 항상 동일 경기 시드를 낸다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const a = deriveMatchSeed(seasonSeed, 42);
    const b = deriveMatchSeed(seasonSeed, 42);
    expect(a).toBe(b);
  });

  it('동일 (matchSeed, tick, eventIndex)는 항상 동일 이벤트 시드를 낸다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const matchSeed = deriveMatchSeed(seasonSeed, 42);
    const a = deriveEventSeed(matchSeed, 57, 2);
    const b = deriveEventSeed(matchSeed, 57, 2);
    expect(a).toBe(b);
  });

  it('deriveEventSeed의 eventIndex 기본값은 0이다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const matchSeed = deriveMatchSeed(seasonSeed, 42);
    expect(deriveEventSeed(matchSeed, 57)).toBe(deriveEventSeed(matchSeed, 57, 0));
  });

  it('stateForSeed(seed)는 createState(seed)와 완전히 동일한 결과를 낸다', () => {
    const seed = deriveSeasonSeed(999, 5);
    expect(stateForSeed(seed)).toEqual(createState(seed));
  });

  it('hashKey는 동일 문자열에 대해 항상 동일 값을 낸다', () => {
    expect(hashKey('league-1-round-3')).toBe(hashKey('league-1-round-3'));
  });

  it('hashKey는 서로 다른 문자열에 대해 (일반적으로) 다른 값을 낸다', () => {
    const keys = ['a', 'b', 'match-001', 'match-002', '리그1', '리그2'];
    const hashes = new Set(keys.map(hashKey));
    expect(hashes.size).toBe(keys.length);
  });
});

describe('derive — 계층 간 비충돌(샘플 검증)', () => {
  it('서로 다른 seasonNumber 조합에서 파생한 시즌 시드에 중복이 없다', () => {
    const worldSeed = 20260721;
    const seeds = Array.from({ length: 200 }, (_, seasonNumber) => deriveSeasonSeed(worldSeed, seasonNumber));
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('서로 다른 matchKey 조합에서 파생한 경기 시드에 중복이 없다', () => {
    const seasonSeed = deriveSeasonSeed(1, 0);
    const seeds = Array.from({ length: 500 }, (_, matchKey) => deriveMatchSeed(seasonSeed, matchKey));
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('서로 다른 (tick, eventIndex) 조합에서 파생한 이벤트 시드에 중복이 없다', () => {
    const seasonSeed = deriveSeasonSeed(1, 0);
    const matchSeed = deriveMatchSeed(seasonSeed, 1);
    const seeds: number[] = [];
    for (let tick = 0; tick < 30; tick += 1) {
      for (let eventIndex = 0; eventIndex < 5; eventIndex += 1) {
        seeds.push(deriveEventSeed(matchSeed, tick, eventIndex));
      }
    }
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('extraIndices를 다르게 주면(재경기 회차 등) 경기 시드가 달라진다', () => {
    const seasonSeed = deriveSeasonSeed(1, 0);
    const a = deriveMatchSeed(seasonSeed, 10, 0);
    const b = deriveMatchSeed(seasonSeed, 10, 1);
    expect(a).not.toBe(b);
  });
});

describe('derive — 네임스페이스 분리(NFR-DT-006)', () => {
  it('MAIN과 ODDS_PRESIM 네임스페이스의 시드는 상위 비트 태그가 다르다', () => {
    const main = deriveSeasonSeed(1, 0, SEED_NAMESPACE.MAIN);
    const presim = deriveSeasonSeed(1, 0, SEED_NAMESPACE.ODDS_PRESIM);
    expect(namespaceOf(main)).toBe(SEED_NAMESPACE.MAIN);
    expect(namespaceOf(presim)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    expect(isSameNamespace(main, presim)).toBe(false);
  });

  it('동일 (worldSeed, seasonNumber)라도 네임스페이스가 다르면 값 자체가 다르다', () => {
    const main = deriveSeasonSeed(7, 1, SEED_NAMESPACE.MAIN);
    const presim = deriveSeasonSeed(7, 1, SEED_NAMESPACE.ODDS_PRESIM);
    expect(main).not.toBe(presim);
  });

  it('두 네임스페이스로 대량 생성한 시드 집합은 서로소(교집합 0)이다', () => {
    const mainSeeds = new Set(
      Array.from({ length: 300 }, (_, i) => deriveSeasonSeed(1, i, SEED_NAMESPACE.MAIN)),
    );
    const presimSeeds = new Set(
      Array.from({ length: 300 }, (_, i) => deriveSeasonSeed(1, i, SEED_NAMESPACE.ODDS_PRESIM)),
    );
    const intersection = [...mainSeeds].filter((seed) => presimSeeds.has(seed));
    expect(intersection).toHaveLength(0);
  });

  it('자식 시드(match/event)는 부모의 네임스페이스를 그대로 상속한다', () => {
    const presimSeason = deriveSeasonSeed(1, 0, SEED_NAMESPACE.ODDS_PRESIM);
    const presimMatch = deriveMatchSeed(presimSeason, 1);
    const presimEvent = deriveEventSeed(presimMatch, 1, 0);

    expect(namespaceOf(presimMatch)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    expect(namespaceOf(presimEvent)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
  });

  it('assertNamespace는 기대와 일치하면 통과, 불일치면 예외를 던진다', () => {
    const main = deriveSeasonSeed(1, 0, SEED_NAMESPACE.MAIN);
    expect(() => assertNamespace(main, SEED_NAMESPACE.MAIN)).not.toThrow();
    expect(() => assertNamespace(main, SEED_NAMESPACE.ODDS_PRESIM)).toThrow(Error);
  });

  it('잘못된 인자에는 RangeError를 던진다', () => {
    expect(() => deriveSeasonSeed(-1, 0)).toThrow(RangeError);
    // 6일차 I-39: worldSeed 상한은 32비트(0xffffffff)가 아니라 53비트
    // 안전 정수(Number.MAX_SAFE_INTEGER, D-28)다. 0x100000000(2^32)은 더 이상
    // 상한을 넘지 않으므로 던지지 않아야 하고, MAX_SAFE_INTEGER + 1만 던진다.
    expect(() => deriveSeasonSeed(0xffffffff + 1, 0)).not.toThrow();
    expect(() => deriveSeasonSeed(Number.MAX_SAFE_INTEGER + 1, 0)).toThrow(RangeError);
    expect(() => deriveSeasonSeed(1, -1)).toThrow(RangeError);
    expect(() => deriveSeasonSeed(1, 1.5)).toThrow(RangeError);
    // @ts-expect-error 런타임 방어 확인용으로 타입을 우회한다.
    expect(() => deriveSeasonSeed(1, 0, 9)).toThrow(RangeError);
    expect(() => namespaceOf(-1)).toThrow(RangeError);
  });
});

describe('derive — 53비트 시드 폭 (I-39 / D-28 회귀 방지)', () => {
  it('deriveSeasonSeed(Number.MAX_SAFE_INTEGER, n)은 예외 없이 안전 정수를 반환한다 (issue A 재현 방지)', () => {
    const seed = deriveSeasonSeed(Number.MAX_SAFE_INTEGER, 1);
    expect(Number.isSafeInteger(seed)).toBe(true);
  });

  it('deriveMatchSeed/deriveEventSeed도 53비트에 가까운 부모 시드에서 예외 없이 안전 정수를 반환한다', () => {
    const seasonSeed = deriveSeasonSeed(Number.MAX_SAFE_INTEGER, 0);
    const matchSeed = deriveMatchSeed(seasonSeed, 1);
    const eventSeed = deriveEventSeed(matchSeed, 1, 0);
    expect(Number.isSafeInteger(matchSeed)).toBe(true);
    expect(Number.isSafeInteger(eventSeed)).toBe(true);
  });

  it('큰 worldSeed(2^40 이상)에서도 namespaceOf가 MAIN/ODDS_PRESIM을 정확히 분리한다 (issue B 재현 방지)', () => {
    const bigWorldSeed = 2 ** 45 + 123456789;
    const main = deriveSeasonSeed(bigWorldSeed, 3, SEED_NAMESPACE.MAIN);
    const presim = deriveSeasonSeed(bigWorldSeed, 3, SEED_NAMESPACE.ODDS_PRESIM);
    expect(namespaceOf(main)).toBe(SEED_NAMESPACE.MAIN);
    expect(namespaceOf(presim)).toBe(SEED_NAMESPACE.ODDS_PRESIM);
    expect(main).not.toBe(presim);
  });

  it('worldSeed가 2^32만큼 차이 나도(구현이 하위 32비트만 쓰면 충돌) 시즌 시드가 달라진다 (issue B 재현 방지)', () => {
    const worldSeedA = 123456789;
    const worldSeedB = worldSeedA + 2 ** 32;
    expect(deriveSeasonSeed(worldSeedA, 0)).not.toBe(deriveSeasonSeed(worldSeedB, 0));
  });

  it('worldSeed 상한 부근(2^51, 2^52)에서도 대량 시즌 시드 생성에 중복이 없다', () => {
    const worldSeed = Number.MAX_SAFE_INTEGER;
    const seeds = Array.from({ length: 500 }, (_, seasonNumber) => deriveSeasonSeed(worldSeed, seasonNumber));
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});

describe('deriveStandingDrawSeed — 026(35일차) 순위표 시드 추첨', () => {
  it('동일 (seasonSeed, round, tiedGroupKey)는 항상 동일 시드를 낸다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const a = deriveStandingDrawSeed(seasonSeed, 10, hashKey('team-a|team-b'));
    const b = deriveStandingDrawSeed(seasonSeed, 10, hashKey('team-a|team-b'));
    expect(a).toBe(b);
  });

  it('라운드가 다르면(같은 동률 그룹이라도) 다른 시드를 낸다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const groupKey = hashKey('team-a|team-b');
    expect(deriveStandingDrawSeed(seasonSeed, 10, groupKey)).not.toBe(
      deriveStandingDrawSeed(seasonSeed, 11, groupKey),
    );
  });

  it('같은 라운드라도 동률 그룹이 다르면 다른 시드를 낸다', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    expect(deriveStandingDrawSeed(seasonSeed, 10, hashKey('team-a|team-b'))).not.toBe(
      deriveStandingDrawSeed(seasonSeed, 10, hashKey('team-c|team-d')),
    );
  });

  it('MATCH 계층과 값 집합이 겹치지 않는다(같은 인덱스를 넣어도 다른 값)', () => {
    const seasonSeed = deriveSeasonSeed(1, 1);
    const matchSeed = deriveMatchSeed(seasonSeed, 10);
    const standingSeed = deriveStandingDrawSeed(seasonSeed, 10, 0);
    expect(matchSeed).not.toBe(standingSeed);
  });
});
