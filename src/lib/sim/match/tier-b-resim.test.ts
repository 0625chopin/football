/**
 * tier-b-resim.ts 테스트 — Task 023 / 31일차(2026-09-01) 산출물.
 *
 * 결정론 재현, 그룹 내부 일관성 불변식(`completed ≤ attempted`), 26필드 커버리지(계약
 * `tier-b-resim-contract.ts`와의 드리프트 가드 포함), `playerIndex` 중복 검증을 짚는다.
 * `@/*` 별칭은 vitest에서 이미 해석되지만, 같은 디렉터리 기존 테스트(`tick.test.ts`
 * 등)가 전부 상대경로를 쓰므로 일관성을 위해 이 파일도 상대경로로만 import한다.
 */

import { describe, expect, it } from 'vitest';
import {
  SLOTS_PER_PLAYER,
  TIER_B_INDEPENDENT_FIELDS,
  TIER_B_PAIRED_FIELDS,
  deriveTierBMatchStats,
  tierBPositionGroupOf,
  type DeriveTierBMatchStatsOptions,
  type TierBPositionGroup,
  type TierBResimExpectationTable,
  type TierBResimPlayerContext,
} from './tier-b-resim';
import { TIER_B_RESIM_FIELD_NAMES } from './tier-b-resim-contract';
import type { MatchSeed, PlayerId, Position } from '../../../types';

const SEED = 20260901 as MatchSeed;

const GROUPS: readonly TierBPositionGroup[] = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

/** 그룹마다 서로 다른 기대값을 주는 픽스처(그룹 게이팅이 실제로 반영되는지 검증용). */
function buildExpectations(): TierBResimExpectationTable {
  const independent = Object.fromEntries(
    TIER_B_INDEPENDENT_FIELDS.map((field, i) => [
      field,
      { baseRatePer90: { GOALKEEPER: 1 + i, DEFENDER: 2 + i, MIDFIELDER: 3 + i, FORWARD: 4 + i } },
    ]),
  ) as TierBResimExpectationTable['independent'];

  const paired = Object.fromEntries(
    TIER_B_PAIRED_FIELDS.map((pair, i) => [
      pair.attempted,
      {
        attemptedBaseRatePer90: { GOALKEEPER: 5 + i, DEFENDER: 10 + i, MIDFIELDER: 15 + i, FORWARD: 8 + i },
        completionRateBaseline: { GOALKEEPER: 0.5, DEFENDER: 0.7, MIDFIELDER: 0.85, FORWARD: 0.75 },
      },
    ]),
  ) as TierBResimExpectationTable['paired'];

  return { independent, paired };
}

const OPTIONS: DeriveTierBMatchStatsOptions = { expectations: buildExpectations(), jitterFraction: 0.2 };

function makeContext(overrides: Partial<TierBResimPlayerContext> = {}): TierBResimPlayerContext {
  return {
    playerId: 'player-1' as PlayerId,
    playerIndex: 0,
    position: 'CM',
    effectiveAbilityModifier: 1.0,
    teamContextModifier: 1.0,
    minutesPlayed: 90,
    ...overrides,
  };
}

describe('tierBPositionGroupOf — Position(11군) → 4개 라인 그룹 매핑', () => {
  it('GK는 GOALKEEPER다', () => {
    expect(tierBPositionGroupOf('GK')).toBe('GOALKEEPER');
  });

  it('CB/LB/RB는 DEFENDER다', () => {
    (['CB', 'LB', 'RB'] as Position[]).forEach((p) => expect(tierBPositionGroupOf(p)).toBe('DEFENDER'));
  });

  it('DM/CM/AM은 MIDFIELDER다', () => {
    (['DM', 'CM', 'AM'] as Position[]).forEach((p) => expect(tierBPositionGroupOf(p)).toBe('MIDFIELDER'));
  });

  it('LW/RW/ST/SS는 FORWARD다', () => {
    (['LW', 'RW', 'ST', 'SS'] as Position[]).forEach((p) => expect(tierBPositionGroupOf(p)).toBe('FORWARD'));
  });

  it('11군 전부가 4개 그룹 중 하나로 빠짐없이 커버된다', () => {
    const ALL_POSITIONS: readonly Position[] = [
      'GK',
      'CB',
      'LB',
      'RB',
      'DM',
      'CM',
      'AM',
      'LW',
      'RW',
      'ST',
      'SS',
    ];
    ALL_POSITIONS.forEach((p) => expect(GROUPS).toContain(tierBPositionGroupOf(p)));
  });
});

describe('TIER_B_INDEPENDENT_FIELDS ∪ TIER_B_PAIRED_FIELDS — 계약과의 26필드 드리프트 가드', () => {
  it('독립 12필드 + 쌍 7개(14필드) = 26필드이고 계약 목록과 정확히 일치한다', () => {
    const pairedNames = TIER_B_PAIRED_FIELDS.flatMap((pair) => [pair.attempted, pair.completed]);
    const allFields = [...TIER_B_INDEPENDENT_FIELDS, ...pairedNames];
    expect(allFields).toHaveLength(26);
    expect(new Set(allFields).size).toBe(26);
    expect(new Set(allFields)).toEqual(new Set(TIER_B_RESIM_FIELD_NAMES));
  });

  it('SLOTS_PER_PLAYER는 19다(독립 12 + 쌍 7 — completed는 별도 시드를 쓰지 않는다)', () => {
    expect(SLOTS_PER_PLAYER).toBe(19);
  });
});

describe('deriveTierBMatchStats — 결정론', () => {
  it('같은 matchSeed·context·options로 두 번 호출해도 완전히 동일한 결과를 낸다', () => {
    const context = [makeContext()];
    const first = deriveTierBMatchStats(SEED, context, OPTIONS);
    const second = deriveTierBMatchStats(SEED, context, OPTIONS);
    expect(Array.from(second.entries())).toEqual(Array.from(first.entries()));
  });

  it('matchSeed가 다르면 (통계적으로) 결과가 달라진다', () => {
    const context = [makeContext()];
    const a = deriveTierBMatchStats(SEED, context, OPTIONS);
    const b = deriveTierBMatchStats((SEED + 1) as MatchSeed, context, OPTIONS);
    expect(a.get('player-1' as PlayerId)).not.toEqual(b.get('player-1' as PlayerId));
  });

  it('playerIndex가 다르면 같은 matchSeed 안에서도 서로 다른 독립 스트림을 얻는다', () => {
    const context = [
      makeContext({ playerId: 'player-1' as PlayerId, playerIndex: 0 }),
      makeContext({ playerId: 'player-2' as PlayerId, playerIndex: 1 }),
    ];
    const map = deriveTierBMatchStats(SEED, context, OPTIONS);
    expect(map.get('player-1' as PlayerId)).not.toEqual(map.get('player-2' as PlayerId));
  });
});

describe('deriveTierBMatchStats — 26필드 전량 커버리지', () => {
  it('반환된 각 선수 행이 계약의 26개 필드를 빠짐없이 갖는다', () => {
    const map = deriveTierBMatchStats(SEED, [makeContext()], OPTIONS);
    const row = map.get('player-1' as PlayerId)!;
    TIER_B_RESIM_FIELD_NAMES.forEach((field) => {
      expect(row).toHaveProperty(field);
      expect(typeof row[field]).toBe('number');
    });
    expect(Object.keys(row)).toHaveLength(26);
  });
});

describe('deriveTierBMatchStats — 그룹 내부 일관성 (completed/won ≤ attempted)', () => {
  it('7개 쌍 전부에서 completed(또는 won)가 attempted를 넘지 않는다(다수 시드로 반복 검증)', () => {
    for (let seedOffset = 0; seedOffset < 20; seedOffset += 1) {
      const map = deriveTierBMatchStats(
        (SEED + seedOffset) as MatchSeed,
        [makeContext({ effectiveAbilityModifier: 0.4 + seedOffset * 0.05 })],
        OPTIONS,
      );
      const row = map.get('player-1' as PlayerId)!;
      TIER_B_PAIRED_FIELDS.forEach((pair) => {
        expect(row[pair.completed]).toBeLessThanOrEqual(row[pair.attempted]);
        expect(row[pair.completed]).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('모든 필드값은 0 이상의 정수다', () => {
    const map = deriveTierBMatchStats(SEED, [makeContext()], OPTIONS);
    const row = map.get('player-1' as PlayerId)!;
    TIER_B_RESIM_FIELD_NAMES.forEach((field) => {
      expect(Number.isInteger(row[field])).toBe(true);
      expect(row[field]).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('deriveTierBMatchStats — 볼륨 스케일링', () => {
  it('minutesPlayed=0이면 모든 attempted/independent 필드가 0이다(교체 아웃 등 미출전 시 볼륨 없음)', () => {
    const map = deriveTierBMatchStats(SEED, [makeContext({ minutesPlayed: 0 })], OPTIONS);
    const row = map.get('player-1' as PlayerId)!;
    TIER_B_RESIM_FIELD_NAMES.forEach((field) => expect(row[field]).toBe(0));
  });

  it('포지션 그룹에 따라 기댓값이 달라진다(GK vs FORWARD, 같은 나머지 입력)', () => {
    const gk = deriveTierBMatchStats(
      SEED,
      [makeContext({ position: 'GK', playerId: 'gk' as PlayerId })],
      { ...OPTIONS, jitterFraction: 0 },
    ).get('gk' as PlayerId)!;
    const forward = deriveTierBMatchStats(
      SEED,
      [makeContext({ position: 'ST', playerId: 'gk' as PlayerId, playerIndex: 0 })],
      { ...OPTIONS, jitterFraction: 0 },
    ).get('gk' as PlayerId)!;
    expect(gk.passesAttempted).not.toBe(forward.passesAttempted);
  });
});

describe('deriveTierBMatchStats — 입력 검증(안전 기본값 없음, I-83 (b) 패턴)', () => {
  it('playerIndex가 중복되면 즉시 예외를 던진다', () => {
    const context = [
      makeContext({ playerId: 'player-1' as PlayerId, playerIndex: 3 }),
      makeContext({ playerId: 'player-2' as PlayerId, playerIndex: 3 }),
    ];
    expect(() => deriveTierBMatchStats(SEED, context, OPTIONS)).toThrow(/playerIndex/);
  });

  it('jitterFraction이 음수면 즉시 예외를 던진다', () => {
    expect(() =>
      deriveTierBMatchStats(SEED, [makeContext()], { ...OPTIONS, jitterFraction: -0.1 }),
    ).toThrow(RangeError);
  });

  it('effectiveAbilityModifier가 0 이하면 즉시 예외를 던진다', () => {
    expect(() =>
      deriveTierBMatchStats(SEED, [makeContext({ effectiveAbilityModifier: 0 })], OPTIONS),
    ).toThrow(RangeError);
  });

  it('minutesPlayed가 음수면 즉시 예외를 던진다', () => {
    expect(() =>
      deriveTierBMatchStats(SEED, [makeContext({ minutesPlayed: -1 })], OPTIONS),
    ).toThrow(RangeError);
  });

  it('빈 context 배열이면 빈 Map을 반환한다(오류 아님)', () => {
    const map = deriveTierBMatchStats(SEED, [], OPTIONS);
    expect(map.size).toBe(0);
  });
});
