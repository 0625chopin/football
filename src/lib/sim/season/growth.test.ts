/**
 * growth.ts 테스트 — Task 028 / 51일차 산출물.
 *
 * 완료 판정 "OVR ≤ PA 전건"을 증명한다: 여러 시즌 반복 성장에서도 OVR이 PA를 넘지
 * 않는지, 나이대 4구간이 성장/하락 방향을 옳게 가르는지, 속성별 시즌 변동이 ±6
 * 이내인지, 동일 시드 재현성(R-03 스냅샷 규약)을 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { PlayerId, PlayerAttributeValues, Position } from '@/types';
import { createState } from '../rng/prng';
import {
  AGE_GROWTH_COEFFICIENT_DEFAULT,
  applyAttributeGrowth,
  applySeasonAttributeGrowth,
  resolveAgeBracket,
  type PlayerAttributeGrowthInput,
} from './growth';

const ATTRIBUTE_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'finishing', 'passing', 'crossing', 'dribbling', 'firstTouch', 'tackling',
  'marking', 'heading', 'longShots', 'setPieces',
  'composure', 'decisions', 'vision', 'positioning', 'workRate', 'aggression',
  'leadership', 'teamwork', 'anticipation', 'determination',
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'balance',
  'jumping', 'naturalFitness',
  'reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'kicking', 'commandOfArea',
];

function flatAttributes(value: number): PlayerAttributeValues {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, value])) as unknown as PlayerAttributeValues;
}

function player(overrides: {
  age: number;
  pa: number;
  preferredPosition?: Position;
  id?: string;
}) {
  return {
    id: (overrides.id ?? 'p1') as PlayerId,
    age: overrides.age,
    pa: overrides.pa,
    preferredPosition: overrides.preferredPosition ?? 'ST',
  };
}

describe('resolveAgeBracket', () => {
  it('4구간 경계값을 정확히 가른다', () => {
    expect(resolveAgeBracket(21)).toBe('YOUTH');
    expect(resolveAgeBracket(22)).toBe('PRIME');
    expect(resolveAgeBracket(29)).toBe('PRIME');
    expect(resolveAgeBracket(30)).toBe('DECLINE');
    expect(resolveAgeBracket(33)).toBe('DECLINE');
    expect(resolveAgeBracket(34)).toBe('VETERAN');
  });
});

describe('applyAttributeGrowth', () => {
  it('OVR이 PA를 넘지 않도록 성장을 보정한다(YOUTH, 다시즌 반복)', () => {
    let state = createState(1);
    let attributes = flatAttributes(20);
    const p = player({ age: 18, pa: 22 });

    for (let season = 0; season < 20; season += 1) {
      const step = applyAttributeGrowth(state, p, attributes);
      state = step.state;
      attributes = step.value.attributes;
      expect(step.value.ovrCached).toBeLessThanOrEqual(p.pa);
    }
  });

  it('속성별 시즌 변동은 ±6을 넘지 않는다', () => {
    const state = createState(7);
    const attributes = flatAttributes(15);
    const p = player({ age: 18, pa: 30 });

    const step = applyAttributeGrowth(state, p, attributes);
    for (const key of ATTRIBUTE_KEYS) {
      const delta = step.value.attributes[key] - attributes[key];
      expect(Math.abs(delta)).toBeLessThanOrEqual(6);
    }
  });

  it('VETERAN 구간은 OVR을 하락시킨다', () => {
    const state = createState(3);
    const attributes = flatAttributes(20);
    const p = player({ age: 36, pa: 20 });

    const step = applyAttributeGrowth(state, p, attributes);
    const initialOvr = 20;
    expect(step.value.ovrCached).toBeLessThan(initialOvr);
    expect(step.value.ageBracket).toBe('VETERAN');
  });

  it('속성값은 1 미만으로 내려가지 않는다', () => {
    const state = createState(9);
    const attributes = flatAttributes(2);
    const p = player({ age: 38, pa: 5 });

    const step = applyAttributeGrowth(state, p, attributes);
    for (const key of ATTRIBUTE_KEYS) {
      expect(step.value.attributes[key]).toBeGreaterThanOrEqual(1);
    }
  });

  it('GK는 GK 6속성만으로 OVR을 산출한다', () => {
    const state = createState(11);
    const attributes = { ...flatAttributes(10), reflexes: 25, handling: 25, oneOnOnes: 25, aerialReach: 25, kicking: 25, commandOfArea: 25 };
    const p = player({ age: 25, pa: 25, preferredPosition: 'GK' });

    const step = applyAttributeGrowth(state, p, attributes);
    expect(step.value.ovrCached).toBeGreaterThan(20);
  });

  it('진입 OVR이 이미 PA를 초과하면 예외를 던진다', () => {
    const state = createState(5);
    const attributes = flatAttributes(25);
    const p = player({ age: 25, pa: 20 });

    expect(() => applyAttributeGrowth(state, p, attributes)).toThrow(/PA/);
  });

  it('동일 시드는 동일 결과를 재현한다(결정론)', () => {
    const attributes = flatAttributes(18);
    const p = player({ age: 20, pa: 28 });

    const a = applyAttributeGrowth(createState(42), p, attributes);
    const b = applyAttributeGrowth(createState(42), p, attributes);

    expect(a.value).toEqual(b.value);
  });

  it('YOUTH 계수가 클수록 평균 성장폭이 크다(계수 배선 확인)', () => {
    const attributes = flatAttributes(15);
    const youth = applyAttributeGrowth(
      createState(2),
      player({ age: 19, pa: 30 }),
      attributes,
      AGE_GROWTH_COEFFICIENT_DEFAULT,
    );
    const veteran = applyAttributeGrowth(
      createState(2),
      player({ age: 35, pa: 30 }),
      attributes,
      AGE_GROWTH_COEFFICIENT_DEFAULT,
    );

    expect(youth.value.ovrCached).toBeGreaterThan(veteran.value.ovrCached);
  });
});

describe('applySeasonAttributeGrowth', () => {
  it('입력과 같은 길이·순서로 전원 성장 결과를 반환하고 상태를 이어받는다', () => {
    const entries: PlayerAttributeGrowthInput[] = [
      { player: player({ age: 19, pa: 25, id: 'a' }), attributes: flatAttributes(18) },
      { player: player({ age: 35, pa: 22, id: 'b' }), attributes: flatAttributes(20) },
    ];

    const result = applySeasonAttributeGrowth(createState(13), entries);

    expect(result.value).toHaveLength(2);
    expect(result.value[0].playerId).toBe('a');
    expect(result.value[1].playerId).toBe('b');
    for (const outcome of result.value) {
      const input = entries.find((e) => e.player.id === outcome.playerId);
      expect(outcome.ovrCached).toBeLessThanOrEqual(input!.player.pa);
    }
  });
});
