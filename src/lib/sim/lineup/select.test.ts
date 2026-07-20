/**
 * select.ts 테스트 — Task 024 / 21일차 산출물.
 *
 * 완료 판정(team-schedule 21일차 행) "부상·정지 선수 선발 0건"을 직접 고정한다.
 * `@/*` 별칭은 vitest에서 해석되지만, `gk-fallback.test.ts` 선례를 따라 이 파일도
 * 상대경로로 `@/types`를 import한다.
 */

import { describe, expect, it } from 'vitest';
import {
  LINEUP_BENCH_COUNT,
  LINEUP_BENCH_MIN_GOALKEEPERS,
  LINEUP_STARTER_COUNT,
  selectLineup,
  type LineupCandidate,
  type SelectLineupInput,
} from './select';
import type { InjuryId, PlayerId, PlayerPosition, Position } from '../../../types';

const player = (label: string): PlayerId => `player-${label}` as PlayerId;

/** 4-3-3 형태의 11슬롯 — 값 자체는 이 파일 테스트 전용 픽스처, 공통코드 대상 아님. */
const STARTING_SLOTS: readonly Position[] = [
  'GK',
  'CB',
  'CB',
  'LB',
  'RB',
  'DM',
  'CM',
  'AM',
  'LW',
  'RW',
  'ST',
];

function positions(playerId: PlayerId, entries: ReadonlyArray<readonly [Position, number]>): PlayerPosition[] {
  return entries.map(([position, proficiency]) => ({ playerId, position, proficiency }));
}

function candidate(
  label: string,
  overrides: Partial<Omit<LineupCandidate, 'playerId'>> = {},
): LineupCandidate {
  const id = player(label);
  return {
    playerId: id,
    condition: 10,
    fitness: 100,
    activeInjuryId: null,
    suspensionRemainingLeague: 0,
    suspensionRemainingCup: 0,
    positions: positions(id, [['CM', 5]]),
    ...overrides,
  };
}

/** GK 1명 + 아웃필드 10군데(슬롯당 최소 1명) + 여유 인원까지 갖춘 기본 가용 로스터(20명). */
function baseRoster(): LineupCandidate[] {
  const outfieldSlots = STARTING_SLOTS.filter((slot) => slot !== 'GK');
  const starters = outfieldSlots.map((slot, index) =>
    candidate(`start-${index}-${slot}`, { positions: positions(player(`start-${index}-${slot}`), [[slot, 5]]) }),
  );
  const goalkeepers = [
    candidate('gk-1', { positions: positions(player('gk-1'), [['GK', 5]]) }),
    candidate('gk-2', { positions: positions(player('gk-2'), [['GK', 4]]) }),
    candidate('gk-3', { positions: positions(player('gk-3'), [['GK', 3]]) }),
  ];
  const spares = outfieldSlots.map((slot, index) =>
    candidate(`spare-${index}-${slot}`, {
      positions: positions(player(`spare-${index}-${slot}`), [[slot, 3]]),
    }),
  );
  return [...starters, ...goalkeepers, ...spares];
}

function baseInput(overrides: Partial<SelectLineupInput> = {}): SelectLineupInput {
  return {
    suspensionCompetition: 'LEAGUE',
    startingSlots: STARTING_SLOTS,
    roster: baseRoster(),
    ...overrides,
  };
}

describe('selectLineup — 가용성(부상·정지) 배제 (21일차 완료 판정)', () => {
  it('활성 부상 선수는 선발·벤치 어디에도 0건 선정된다', () => {
    const injuredId = player('gk-1');
    const roster = baseRoster().map((c) =>
      c.playerId === injuredId ? { ...c, activeInjuryId: 'injury-1' as InjuryId } : c,
    );
    const result = selectLineup(baseInput({ roster }));
    const allSelected = [...result.starters, ...result.bench].map((a) => a.playerId);
    expect(allSelected).not.toContain(injuredId);
  });

  it('해당 대회 잔여 출장정지가 있는 선수는 0건 선정된다(리그)', () => {
    const suspendedId = player('gk-1');
    const roster = baseRoster().map((c) =>
      c.playerId === suspendedId ? { ...c, suspensionRemainingLeague: 1 } : c,
    );
    const result = selectLineup(baseInput({ suspensionCompetition: 'LEAGUE', roster }));
    const allSelected = [...result.starters, ...result.bench].map((a) => a.playerId);
    expect(allSelected).not.toContain(suspendedId);
  });

  it('리그 정지는 컵 선정에 영향을 주지 않는다(대회 독립 판정)', () => {
    const suspendedId = player('gk-1');
    const roster = baseRoster().map((c) =>
      c.playerId === suspendedId ? { ...c, suspensionRemainingLeague: 1, suspensionRemainingCup: 0 } : c,
    );
    const result = selectLineup(baseInput({ suspensionCompetition: 'CUP', roster }));
    const allSelected = [...result.starters, ...result.bench].map((a) => a.playerId);
    expect(allSelected).toContain(suspendedId);
  });
});

describe('selectLineup — 출력 형태(선발 11 + 벤치 7, GK≥1)', () => {
  it('선발 11명·벤치 7명을 반환한다', () => {
    const result = selectLineup(baseInput());
    expect(result.starters).toHaveLength(LINEUP_STARTER_COUNT);
    expect(result.bench).toHaveLength(LINEUP_BENCH_COUNT);
  });

  it('벤치에 GK 보유 선수가 최소 1명 포함된다', () => {
    const result = selectLineup(baseInput());
    const benchGoalkeepers = result.bench.filter((assignment) => {
      const original = baseRoster().find((c) => c.playerId === assignment.playerId);
      return original?.positions.some((p) => p.position === 'GK') ?? false;
    });
    expect(benchGoalkeepers.length).toBeGreaterThanOrEqual(LINEUP_BENCH_MIN_GOALKEEPERS);
  });

  it('선발 GK 슬롯에는 GK 보유 후보가 우선 배정된다(교차 배율 0.35 페널티)', () => {
    const result = selectLineup(baseInput());
    const gkAssignment = result.starters.find((a) => a.position === 'GK');
    expect(gkAssignment?.playerId).toBe(player('gk-1'));
  });

  it('선발·벤치 사이에 중복 선수가 없다', () => {
    const result = selectLineup(baseInput());
    const ids = [...result.starters, ...result.bench].map((a) => a.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('selectLineup — 결정론(NFR-DT-008) 및 입력 검증', () => {
  it('점수가 동률이면 playerId 오름차순으로 고정된다', () => {
    const slots: readonly Position[] = ['GK', ...(Array(10).fill('CM') as Position[])];
    const roster: LineupCandidate[] = [
      candidate('gk-1', { positions: positions(player('gk-1'), [['GK', 5]]) }),
      candidate('gk-2', { positions: positions(player('gk-2'), [['GK', 5]]) }),
      candidate('b', { positions: positions(player('b'), [['CM', 5]]) }),
      candidate('a', { positions: positions(player('a'), [['CM', 5]]) }),
      ...Array.from({ length: 14 }, (_, i) =>
        candidate(`cm-${i}`, { positions: positions(player(`cm-${i}`), [['CM', 5]]) }),
      ),
    ];
    const result = selectLineup({ suspensionCompetition: 'LEAGUE', startingSlots: slots, roster });
    // 'a'와 'b'는 동일 조건(CM, proficiency 5)이라 점수가 같다 — 'a'가 먼저 뽑혀야 한다.
    const cmPicks = result.starters.filter((a) => a.position === 'CM').map((a) => a.playerId);
    expect(cmPicks).toContain(player('a'));
  });

  it('동일 입력을 두 번 호출하면 완전히 같은 결과가 나온다(재현성)', () => {
    const input = baseInput();
    expect(selectLineup(input)).toEqual(selectLineup(input));
  });

  it('startingSlots가 11개가 아니면 오류를 던진다', () => {
    expect(() => selectLineup(baseInput({ startingSlots: ['GK', 'CB'] }))).toThrow(RangeError);
  });

  it('슬롯을 채울 가용 후보 자체가 roster에 부족하면 오류를 던진다', () => {
    const roster = baseRoster().slice(0, 5); // 11슬롯보다 적은 인원
    expect(() => selectLineup(baseInput({ roster }))).toThrow(RangeError);
  });

  it('벤치 GK≥1을 만족할 GK 보유 가용 후보가 없으면 오류를 던진다', () => {
    // GK 보유 후보를 1명(gk-1)만 남긴다 — 그 1명이 선발 GK로 배정되고 나면 벤치용 GK가 0명.
    const roster = baseRoster().filter(
      (c) => c.playerId !== player('gk-2') && c.playerId !== player('gk-3'),
    );
    expect(() => selectLineup(baseInput({ roster }))).toThrow(RangeError);
  });
});
