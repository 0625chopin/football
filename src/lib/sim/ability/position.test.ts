import { describe, expect, it } from 'vitest';
import type { PlayerId, Position } from '@/types';
import { GK_CROSS_POSITION_MODIFIER_DEFAULT } from '../match/gk-fallback';
import {
  POSITION_ADJACENCY,
  POSITION_PROFICIENCY_LEVEL_MULT_DEFAULT,
  POSITION_UNFAMILIAR_BASE_DEFAULT,
  POSITION_UNFAMILIAR_FLOOR_DEFAULT,
  POSITION_UNFAMILIAR_STEP_DEFAULT,
  positionGraphDistance,
  positionModifier,
} from './position';

const ALL_POSITIONS = Object.keys(POSITION_ADJACENCY) as Position[];
/** 테스트 픽스처 전용 캐스트 — 실제 생성 지점이 아니므로 허용(gk-fallback.test.ts 관례와 동일). */
const PLAYER_ID = 'player-1' as PlayerId;

describe('POSITION_ADJACENCY / positionGraphDistance — FR-PL-007 그래프 성질', () => {
  it('11개 포지션 전건이 그래프에 있다', () => {
    expect(ALL_POSITIONS).toHaveLength(11);
  });

  it('연결 그래프다 — 고립 노드 0건(전 쌍 dist가 유한)', () => {
    for (const from of ALL_POSITIONS) {
      for (const to of ALL_POSITIONS) {
        expect(Number.isFinite(positionGraphDistance(from, to))).toBe(true);
      }
    }
  });

  it('모든 포지션 쌍의 dist ≤ 5다', () => {
    for (const from of ALL_POSITIONS) {
      for (const to of ALL_POSITIONS) {
        expect(positionGraphDistance(from, to)).toBeLessThanOrEqual(5);
      }
    }
  });

  it('무방향 — dist(a,b) === dist(b,a)', () => {
    for (const from of ALL_POSITIONS) {
      for (const to of ALL_POSITIONS) {
        expect(positionGraphDistance(from, to)).toBe(positionGraphDistance(to, from));
      }
    }
  });

  it('같은 포지션끼리는 dist 0', () => {
    for (const position of ALL_POSITIONS) {
      expect(positionGraphDistance(position, position)).toBe(0);
    }
  });

  it('인접 포지션(엣지로 직접 연결)은 dist 1 — 예: CB-LB, AM-ST 경유 SS', () => {
    expect(positionGraphDistance('CB', 'LB')).toBe(1);
    expect(positionGraphDistance('AM', 'SS')).toBe(1);
    expect(positionGraphDistance('LW', 'ST')).toBe(1);
  });
});

describe('positionModifier — 보유 단계표 (FR-PL-006)', () => {
  it.each(Object.entries(POSITION_PROFICIENCY_LEVEL_MULT_DEFAULT))(
    '보유 proficiency=%s → M_position=%s',
    (proficiency, expected) => {
      const result = positionModifier({
        assignedPosition: 'CM',
        playerPositions: [{ playerId: PLAYER_ID, position: 'CM', proficiency: Number(proficiency) }],
      });
      expect(result).toBeCloseTo(expected, 10);
    },
  );

  it('보유 항목이 여러 개면 assignedPosition과 일치하는 항목만 쓴다', () => {
    const result = positionModifier({
      assignedPosition: 'ST',
      playerPositions: [
        { playerId: PLAYER_ID, position: 'CM', proficiency: 1 },
        { playerId: PLAYER_ID, position: 'ST', proficiency: 5 },
      ],
    });
    expect(result).toBeCloseTo(1.0, 10);
  });
});

describe('positionModifier — 미보유 거리식 `max(0.45, 0.88 − 0.11×dist)` (FR-PL-006)', () => {
  it('dist=1 → 0.77', () => {
    const result = positionModifier({
      assignedPosition: 'LB',
      playerPositions: [{ playerId: PLAYER_ID, position: 'CB', proficiency: 5 }],
    });
    expect(result).toBeCloseTo(0.77, 10);
  });

  it('dist가 커질수록 페널티가 단조 증가(배율은 단조 감소)한다 — GK를 제외한 최장거리 조합', () => {
    const results = ALL_POSITIONS.filter((p) => p !== 'GK').flatMap((from) =>
      ALL_POSITIONS.filter((p) => p !== 'GK' && p !== from).map((to) => {
        const dist = positionGraphDistance(from, to);
        const modifier = positionModifier({
          assignedPosition: to,
          playerPositions: [{ playerId: PLAYER_ID, position: from, proficiency: 5 }],
        });
        return { dist, modifier };
      }),
    );

    const byDist = new Map<number, number>();
    for (const { dist, modifier } of results) {
      const seen = byDist.get(dist);
      // 같은 dist는 항상 같은 배율이어야 한다(순수 함수, 입력=dist만의 함수)
      if (seen !== undefined) expect(modifier).toBeCloseTo(seen, 10);
      byDist.set(dist, modifier);
    }

    const sortedDistances = [...byDist.keys()].sort((a, b) => a - b);
    for (let i = 1; i < sortedDistances.length; i += 1) {
      const prev = byDist.get(sortedDistances[i - 1])!;
      const curr = byDist.get(sortedDistances[i])!;
      expect(curr).toBeLessThanOrEqual(prev);
    }
  });

  it('하한 0.45 밑으로 내려가지 않는다(거리 식 자체의 floor)', () => {
    const raw = POSITION_UNFAMILIAR_BASE_DEFAULT - POSITION_UNFAMILIAR_STEP_DEFAULT * 10;
    expect(raw).toBeLessThan(POSITION_UNFAMILIAR_FLOOR_DEFAULT);
    const result = positionModifier({
      assignedPosition: 'ST',
      playerPositions: [{ playerId: PLAYER_ID, position: 'ST', proficiency: 5 }],
    });
    expect(result).toBeGreaterThanOrEqual(POSITION_UNFAMILIAR_FLOOR_DEFAULT);
  });

  it('보유 포지션이 여러 개면 가장 가까운 쪽 기준으로 dist를 잰다', () => {
    const viaNearest = positionModifier({
      assignedPosition: 'ST',
      playerPositions: [
        { playerId: PLAYER_ID, position: 'CB', proficiency: 5 },
        { playerId: PLAYER_ID, position: 'LW', proficiency: 5 },
      ],
    });
    const viaLwOnly = positionModifier({
      assignedPosition: 'ST',
      playerPositions: [{ playerId: PLAYER_ID, position: 'LW', proficiency: 5 }],
    });
    expect(viaNearest).toBeCloseTo(viaLwOnly, 10);
  });
});

describe('positionModifier — GK 교차 예외 0.35 (FR-PL-006, 우선 적용)', () => {
  it('비GK가 GK로 출전 시 0.35', () => {
    const result = positionModifier({
      assignedPosition: 'GK',
      playerPositions: [{ playerId: PLAYER_ID, position: 'CB', proficiency: 5 }],
    });
    expect(result).toBeCloseTo(GK_CROSS_POSITION_MODIFIER_DEFAULT, 10);
  });

  it('GK가 필드로 출전 시 0.35', () => {
    const result = positionModifier({
      assignedPosition: 'ST',
      playerPositions: [{ playerId: PLAYER_ID, position: 'GK', proficiency: 5 }],
    });
    expect(result).toBeCloseTo(GK_CROSS_POSITION_MODIFIER_DEFAULT, 10);
  });

  it('GK가 다중 포지션으로 CB도 보유해도, CB 출전 시 교차 예외가 보유 단계표보다 우선한다', () => {
    const result = positionModifier({
      assignedPosition: 'CB',
      playerPositions: [
        { playerId: PLAYER_ID, position: 'GK', proficiency: 5 },
        { playerId: PLAYER_ID, position: 'CB', proficiency: 5 },
      ],
    });
    expect(result).toBeCloseTo(GK_CROSS_POSITION_MODIFIER_DEFAULT, 10);
  });

  it('GK가 GK로 출전하면 교차 예외가 아니라 보유 단계표를 쓴다', () => {
    const result = positionModifier({
      assignedPosition: 'GK',
      playerPositions: [{ playerId: PLAYER_ID, position: 'GK', proficiency: 3 }],
    });
    expect(result).toBeCloseTo(0.88, 10);
  });

  it('crossPositionModifier override가 적용된다', () => {
    const result = positionModifier(
      {
        assignedPosition: 'GK',
        playerPositions: [{ playerId: PLAYER_ID, position: 'ST', proficiency: 5 }],
      },
      { crossPositionModifier: 0.4 },
    );
    expect(result).toBeCloseTo(0.4, 10);
  });
});

describe('positionModifier — 오류 처리', () => {
  it('playerPositions가 비어 있으면 오류를 던진다', () => {
    expect(() => positionModifier({ assignedPosition: 'ST', playerPositions: [] })).toThrow(RangeError);
  });

  it('보유 항목의 proficiency가 1~5 밖이면 오류를 던진다', () => {
    expect(() =>
      positionModifier({
        assignedPosition: 'ST',
        playerPositions: [{ playerId: PLAYER_ID, position: 'ST', proficiency: 6 }],
      }),
    ).toThrow(RangeError);
  });
});

describe('positionModifier — 클램프 override 배선(I-83 패턴 일관성)', () => {
  it('max 오버라이드가 보유 단계표 결과에도 적용된다', () => {
    const result = positionModifier(
      {
        assignedPosition: 'ST',
        playerPositions: [{ playerId: PLAYER_ID, position: 'ST', proficiency: 5 }],
      },
      { max: 0.9 },
    );
    expect(result).toBe(0.9);
  });
});
