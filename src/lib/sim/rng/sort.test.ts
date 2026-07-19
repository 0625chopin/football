/**
 * sort.ts 테스트 — Task 006 / 5일차 산출물.
 *
 * team-schedule 5일차 완료 판정의 세 번째 축인 **입력 순서 셔플 불변성**을
 * 이 파일이 담당한다: 동일 원소 집합을 어떤 순서로 섞어 넣어도
 * `stableSortBy()`의 최종 정렬 결과(값 시퀀스)는 항상 동일해야 한다.
 *
 * 셔플에는 Math.random()을 쓸 수 없으므로(NFR-DT-001), prng.ts의
 * `nextIntBelow()`로 결정론적 Fisher–Yates 셔플을 이 파일 안에서만 구현한다.
 */

import { describe, expect, it } from 'vitest';
import { createState, nextIntBelow, type PrngState } from './prng';
import { findTiedRuns, stableSortBy, type TiebreakKeys } from './sort';

/** prng.ts 기반 결정론적 Fisher–Yates 셔플. Math.random을 쓰지 않는다. */
function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let cursor: PrngState = createState(seed);
  for (let i = result.length - 1; i > 0; i -= 1) {
    const step = nextIntBelow(cursor, i + 1);
    cursor = step.state;
    const j = step.value;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Row {
  readonly id: string;
  readonly points: number;
}

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${String(i).padStart(3, '0')}`,
    points: (i * 7) % 13, // 의도적으로 동률이 많이 생기게 함(0~12 반복)
  }));
}

const KEYS: TiebreakKeys<Row> = [
  { get: (r) => r.points, dir: 'desc' },
  { get: (r) => r.id }, // 최종 tiebreak — 완전 순서를 보장하는 고유 키
];

describe('sort — 입력 순서 셔플 불변성(핵심)', () => {
  const rows = makeRows(100);
  const canonical = stableSortBy(rows, KEYS).map((r) => r.id);

  it('셔플하지 않은 정렬 결과와 비교할 기준(canonical) 시퀀스를 만든다', () => {
    expect(canonical).toHaveLength(100);
  });

  const shuffleSeeds = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

  it.each(shuffleSeeds)('셔플 seed=%i로 섞은 입력도 canonical과 동일한 정렬 결과를 낸다', (seed) => {
    const shuffled = seededShuffle(rows, seed);
    // 셔플이 실제로 순서를 바꿨는지 먼저 확인(자기 검증 — 우연히 항등 셔플이면 테스트가 무의미해짐).
    expect(shuffled.map((r) => r.id)).not.toEqual(rows.map((r) => r.id));

    const sorted = stableSortBy(shuffled, KEYS).map((r) => r.id);
    expect(sorted).toEqual(canonical);
  });

  it('최소 10가지 이상의 서로 다른 셔플 순서 전부가 동일 결과로 수렴한다', () => {
    const results = shuffleSeeds.map((seed) => stableSortBy(seededShuffle(rows, seed), KEYS).map((r) => r.id));
    expect(shuffleSeeds.length).toBeGreaterThanOrEqual(10);
    for (const result of results) {
      expect(result).toEqual(canonical);
    }
  });

  it('원본 배열을 변형하지 않는다(얕은 복사 후 정렬)', () => {
    const before = rows.map((r) => r.id);
    stableSortBy(rows, KEYS);
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe('sort — 안정 정렬(동률 시 상대 순서 보존)', () => {
  interface Ticket {
    readonly label: string;
    readonly priority: number; // 다수가 동률
  }

  it('tiebreak 키까지 전부 동률이면 입력 순서를 그대로 유지한다', () => {
    const tickets: Ticket[] = [
      { label: 'a', priority: 1 },
      { label: 'b', priority: 1 },
      { label: 'c', priority: 1 },
      { label: 'd', priority: 2 },
      { label: 'e', priority: 1 },
    ];
    // priority만 키로 주어 label 간 동률(같은 priority)을 의도적으로 남긴다.
    const keys: TiebreakKeys<Ticket> = [{ get: (t) => t.priority, dir: 'desc' }];
    const sorted = stableSortBy(tickets, keys);

    // priority=2인 'd'가 최상위, 그 뒤 priority=1 그룹은 입력 순서(a,b,c,e) 그대로.
    expect(sorted.map((t) => t.label)).toEqual(['d', 'a', 'b', 'c', 'e']);
  });

  it('findTiedRuns는 정렬된 배열에서 동률 구간만 식별한다(길이 1 구간 제외)', () => {
    const rows = [
      { id: 'x', score: 10 },
      { id: 'y', score: 10 },
      { id: 'z', score: 8 },
      { id: 'w', score: 5 },
      { id: 'v', score: 5 },
      { id: 'u', score: 5 },
    ];
    const key = { get: (r: (typeof rows)[number]) => r.score, dir: 'desc' as const };
    const sorted = stableSortBy(rows, [key]);
    const runs = findTiedRuns(sorted, key);

    // score=10 그룹(인덱스 0~1), score=8은 단일(제외), score=5 그룹(인덱스 3~5).
    expect(runs).toEqual([
      [0, 2],
      [3, 6],
    ]);
  });
});

describe('sort — 다중 키·문자열 키·오류 케이스', () => {
  it('여러 키를 asc/desc 혼합으로 적용한다', () => {
    interface Player {
      readonly team: string;
      readonly goals: number;
    }
    const players: Player[] = [
      { team: 'b', goals: 3 },
      { team: 'a', goals: 3 },
      { team: 'a', goals: 5 },
    ];
    const keys: TiebreakKeys<Player> = [
      { get: (p) => p.goals, dir: 'desc' },
      { get: (p) => p.team, dir: 'asc' },
    ];
    const sorted = stableSortBy(players, keys);
    expect(sorted).toEqual([
      { team: 'a', goals: 5 },
      { team: 'a', goals: 3 },
      { team: 'b', goals: 3 },
    ]);
  });

  it('문자열 키는 UTF-16 코드유닛 순으로 비교한다', () => {
    const items = [{ id: 'banana' }, { id: 'apple' }, { id: 'cherry' }];
    const sorted = stableSortBy(items, [{ get: (i) => i.id }]);
    expect(sorted.map((i) => i.id)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('정렬 키 값이 NaN이면 예외를 던진다(조용히 동률로 처리하지 않음)', () => {
    const items = [{ v: 1 }, { v: Number.NaN }];
    expect(() => stableSortBy(items, [{ get: (i) => i.v }])).toThrow(RangeError);
  });

  // stableSortBy(items, [])는 TiebreakKeys<T>가 "최소 1개 튜플"이라 컴파일
  // 타임에 이미 거부된다(sort.ts 파일 하단 재현 절차 참고). 런타임 테스트
  // 대상이 아니므로 이 파일에서는 별도 케이스를 두지 않는다.
});
