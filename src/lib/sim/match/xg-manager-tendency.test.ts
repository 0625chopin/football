import { describe, expect, it } from 'vitest';
import type { ManagerStyle } from '@/types';
import {
  applyManagerTendencyXg,
  tacticalSkillRealizationRate,
  type ManagerTendencyXgTable,
} from './xg-manager-tendency';

describe('tacticalSkillRealizationRate — FR-MT-009 숙련도 실현율', () => {
  it('숙련도 30(최대)이면 실현율 1.0(편차 전부 실현)', () => {
    expect(tacticalSkillRealizationRate(30)).toBeCloseTo(1.0, 9);
  });

  it('숙련도 1(최소)이면 실현율 0.6 + 0.4/30', () => {
    expect(tacticalSkillRealizationRate(1)).toBeCloseTo(0.6 + 0.4 / 30, 9);
  });

  it('숙련도 15(중간)이면 실현율 0.6 + 0.4×0.5 = 0.8', () => {
    expect(tacticalSkillRealizationRate(15)).toBeCloseTo(0.8, 9);
  });

  it('숙련도가 올라갈수록 실현율도 단조 증가한다', () => {
    const rates = [1, 5, 10, 15, 20, 25, 30].map(tacticalSkillRealizationRate);
    for (let i = 1; i < rates.length; i += 1) {
      expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    }
  });

  it.each([[0], [31], [-1], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    '범위(1~30) 밖 또는 비유한수(%s)는 예외',
    (skill) => {
      expect(() => tacticalSkillRealizationRate(skill)).toThrow();
    },
  );
});

const CUSTOM_TABLE: ManagerTendencyXgTable = {
  ATTACKING: { ownXgMultiplier: 1.12, concededXgMultiplier: 1.1 },
  BALANCED: { ownXgMultiplier: 1, concededXgMultiplier: 1 },
  DEFENSIVE: { ownXgMultiplier: 0.9, concededXgMultiplier: 0.85 },
  COUNTER: { ownXgMultiplier: 1.05, concededXgMultiplier: 0.95 },
  POSSESSION: { ownXgMultiplier: 1.03, concededXgMultiplier: 1.02 },
  HIGH_PRESS: { ownXgMultiplier: 1.08, concededXgMultiplier: 1.0 },
};

describe('applyManagerTendencyXg — FR-MT-009 팀 단위 xG 조정 (I-119)', () => {
  it('table은 필수 주입 — 안전 기본값 없이 반드시 호출자가 넘긴다(I-83 (b))', () => {
    const result = applyManagerTendencyXg(0.3, 'OWN', {
      style: 'ATTACKING',
      tacticalSkill: 30,
      table: CUSTOM_TABLE,
    });
    expect(result).toBeCloseTo(0.3 * 1.12, 9);
  });

  it('table에 해당 성향 키가 없으면 예외 — 중립값으로 조용히 대체하지 않는다', () => {
    const partial = { ATTACKING: CUSTOM_TABLE.ATTACKING } as unknown as ManagerTendencyXgTable;
    expect(() =>
      applyManagerTendencyXg(0.3, 'OWN', { style: 'DEFENSIVE', tacticalSkill: 20, table: partial }),
    ).toThrow();
  });

  it('숙련도 30(실현율 1.0)이면 성향 배율이 그대로(편차 100%) 적용된다', () => {
    const result = applyManagerTendencyXg(0.3, 'OWN', {
      style: 'ATTACKING',
      tacticalSkill: 30,
      table: CUSTOM_TABLE,
    });
    expect(result).toBeCloseTo(0.3 * 1.12, 9);
  });

  it('숙련도 1(실현율 최소)이면 편차의 일부만 실현되어 배율이 1.12보다 작다', () => {
    const skill1 = applyManagerTendencyXg(0.3, 'OWN', {
      style: 'ATTACKING',
      tacticalSkill: 1,
      table: CUSTOM_TABLE,
    });
    const skill30 = applyManagerTendencyXg(0.3, 'OWN', {
      style: 'ATTACKING',
      tacticalSkill: 30,
      table: CUSTOM_TABLE,
    });
    expect(skill1).toBeGreaterThan(0.3); // 편차가 양수(1.12>1)이므로 중립보다는 크다
    expect(skill1).toBeLessThan(skill30); // 수용 기준 ② — 숙련도 30의 효과가 숙련도 1보다 유의하게 크다
  });

  it('배율이 1 미만(수비 성향 약화)이어도 숙련도가 낮을수록 중립에 더 가깝다 — 방향 무관성', () => {
    const STYLES: readonly ManagerStyle[] = [
      'ATTACKING',
      'BALANCED',
      'DEFENSIVE',
      'COUNTER',
      'POSSESSION',
      'HIGH_PRESS',
    ];
    for (const style of STYLES) {
      const lowSkill = applyManagerTendencyXg(1, 'OWN', { style, tacticalSkill: 1, table: CUSTOM_TABLE });
      const highSkill = applyManagerTendencyXg(1, 'OWN', { style, tacticalSkill: 30, table: CUSTOM_TABLE });
      expect(Math.abs(lowSkill - 1)).toBeLessThanOrEqual(Math.abs(highSkill - 1));
    }
  });

  it('CONCEDED 관점은 concededXgMultiplier를 쓴다(own과 다른 값이면 결과도 다르다)', () => {
    const own = applyManagerTendencyXg(0.3, 'OWN', { style: 'ATTACKING', tacticalSkill: 30, table: CUSTOM_TABLE });
    const conceded = applyManagerTendencyXg(0.3, 'CONCEDED', {
      style: 'ATTACKING',
      tacticalSkill: 30,
      table: CUSTOM_TABLE,
    });
    expect(own).toBeCloseTo(0.3 * 1.12, 9);
    expect(conceded).toBeCloseTo(0.3 * 1.1, 9);
    expect(own).not.toBeCloseTo(conceded, 9);
  });

  it('baseXg=0이면 배율과 무관하게 0을 반환한다', () => {
    expect(
      applyManagerTendencyXg(0, 'OWN', { style: 'ATTACKING', tacticalSkill: 30, table: CUSTOM_TABLE }),
    ).toBe(0);
  });

  it.each([[-0.1], [Number.NaN], [Number.POSITIVE_INFINITY]])('baseXg(%s)가 음수·비유한수면 예외', (baseXg) => {
    expect(() =>
      applyManagerTendencyXg(baseXg, 'OWN', { style: 'BALANCED', tacticalSkill: 15, table: CUSTOM_TABLE }),
    ).toThrow();
  });

  it('BALANCED(중립 배율 1.0)는 숙련도와 무관하게 baseXg를 그대로 유지한다', () => {
    const lowSkill = applyManagerTendencyXg(2.5, 'OWN', {
      style: 'BALANCED',
      tacticalSkill: 1,
      table: CUSTOM_TABLE,
    });
    expect(lowSkill).toBeCloseTo(2.5, 9);
  });
});
