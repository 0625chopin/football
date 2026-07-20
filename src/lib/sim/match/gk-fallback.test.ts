/**
 * gk-fallback.ts 테스트 — Task 023 / 14일차(2026-08-07) 산출물.
 *
 * 완료 판정(team-schedule 14일차 행) "D-22 절차대로 동작, 결정론 유지"를 D-22 ①~⑤
 * 각 단계별로 직접 증명한다.
 *
 * `@/*` 별칭은 vitest에서 이미 해석되지만, 같은 디렉터리의 기존 테스트
 * (`tick.test.ts`/`substitution.test.ts`/`penalty.test.ts`)가 전부 상대경로를 쓰므로
 * 일관성을 위해 이 파일도 상대경로로만 import한다.
 */

import { describe, expect, it } from 'vitest';
import {
  GK_CROSS_POSITION_MODIFIER_DEFAULT,
  GK_FALLBACK_TIEBREAK_EVENT_INDEX,
  resolveGkFallback,
  type GkFallbackCandidate,
  type ResolveGkFallbackOptions,
} from './gk-fallback';
import { createInitialSubstitutionState, type TeamSubstitutionState } from './substitution';
import type { MatchTick } from './tick';
import type { MatchSeed, PlayerId, TeamId } from '../../../types';

/** 테스트 픽스처 전용 캐스트 — 실제 생성 지점이 아니므로 허용(brand.type-test.ts 관례와 동일). */
const TEAM_ID = 'team-1' as TeamId;
const SEED = 20260807 as MatchSeed;
const player = (label: string): PlayerId => `player-${label}` as PlayerId;

function tickAt(tick: number, minute: number): MatchTick {
  return { tick, phase: 'FIRST_HALF', minute, addedTime: 0 };
}

function candidate(label: string, goalkeepingAbility: number, effectiveAbility: number): GkFallbackCandidate {
  return { playerId: player(label), goalkeepingAbility, effectiveAbility };
}

function baseOptions(
  overrides: Partial<ResolveGkFallbackOptions> = {},
): ResolveGkFallbackOptions {
  return {
    matchSeed: SEED,
    tick: tickAt(30, 30),
    teamId: TEAM_ID,
    substitutionState: createInitialSubstitutionState(),
    benchGoalkeeperId: null,
    onFieldOutfieldPlayers: [candidate('a', 10, 50), candidate('b', 8, 40)],
    sequence: 1,
    ...overrides,
  };
}

describe('resolveGkFallback — ① 벤치 GK + 교체 여유 (D-22 ①)', () => {
  it('벤치 GK가 있고 교체 카드가 남아 있으면 유효 능력치 최저 필드플레이어를 빼고 벤치 GK를 투입한다', () => {
    const outfield = [candidate('weak', 5, 20), candidate('strong', 12, 90)];
    const benchGk = player('bench-gk');

    const result = resolveGkFallback(
      baseOptions({ benchGoalkeeperId: benchGk, onFieldOutfieldPlayers: outfield }),
    );

    expect(result.method).toBe('BENCH_GOALKEEPER_SUBSTITUTION');
    expect(result.goalkeeperPlayerId).toBe(benchGk);
    expect(result.crossPositionModifier).toBeNull();
    expect(result.crossPositionModifierSource).toBeNull();
    expect(result.resolvedBy).toBeNull();
    expect(result.substitution?.accepted).toBe(true);
    expect(result.substitution?.event).toEqual({
      sequence: 1,
      minute: 30,
      addedTime: 0,
      type: 'SUBSTITUTION',
      teamId: TEAM_ID,
      primaryPlayerId: benchGk,
      secondaryPlayerId: player('weak'),
      xg: null,
      relatedEventSequence: null,
      detail: {},
    });
  });
});

describe('resolveGkFallback — ② 교체 소진/벤치 GK 없음 → 필드 재배치로 폴백 (D-22 ②)', () => {
  it('교체 인원(5명)이 소진되면 벤치 GK가 있어도 필드플레이어 재배치로 폴백한다', () => {
    const exhaustedState: TeamSubstitutionState = {
      substitutionsUsed: 5,
      windowTicks: [1, 2, 3],
      offPlayerIds: new Set(),
    };
    const outfield = [candidate('only', 15, 60)];

    const result = resolveGkFallback(
      baseOptions({
        benchGoalkeeperId: player('bench-gk'),
        substitutionState: exhaustedState,
        onFieldOutfieldPlayers: outfield,
      }),
    );

    expect(result.method).toBe('FIELD_PLAYER_REASSIGNMENT');
    expect(result.goalkeeperPlayerId).toBe(player('only'));
    expect(result.crossPositionModifier).toBe(GK_CROSS_POSITION_MODIFIER_DEFAULT);
    expect(result.substitution).toBeNull();
  });

  it('교체 창(3회)이 소진되면(새 창 필요) 필드플레이어 재배치로 폴백한다', () => {
    const windowExhaustedState: TeamSubstitutionState = {
      substitutionsUsed: 3,
      windowTicks: [1, 2, 3],
      offPlayerIds: new Set(),
    };
    const outfield = [candidate('only', 15, 60)];

    const result = resolveGkFallback(
      baseOptions({
        // windowTicks에 없는 새 tick(30) → 새 창 필요 → WINDOW_LIMIT_REACHED
        tick: tickAt(30, 30),
        benchGoalkeeperId: player('bench-gk'),
        substitutionState: windowExhaustedState,
        onFieldOutfieldPlayers: outfield,
      }),
    );

    expect(result.method).toBe('FIELD_PLAYER_REASSIGNMENT');
  });

  it('벤치 GK가 없으면 교체 여유가 있어도 곧바로 필드플레이어 재배치로 간다', () => {
    const outfield = [candidate('only', 15, 60)];

    const result = resolveGkFallback(
      baseOptions({ benchGoalkeeperId: null, onFieldOutfieldPlayers: outfield }),
    );

    expect(result.method).toBe('FIELD_PLAYER_REASSIGNMENT');
    expect(result.goalkeeperPlayerId).toBe(player('only'));
    expect(result.resolvedBy).toBe('GOALKEEPING_ABILITY');
  });

  it('①의 교체 시도가 PLAYER_ALREADY_SUBSTITUTED_OFF로 거부되면 조용히 폴백하지 않고 오류를 던진다', () => {
    const alreadyOffState: TeamSubstitutionState = {
      substitutionsUsed: 1,
      windowTicks: [10],
      offPlayerIds: new Set([player('weak')]),
    };
    const outfield = [candidate('weak', 5, 20), candidate('strong', 12, 90)];

    expect(() =>
      resolveGkFallback(
        baseOptions({
          benchGoalkeeperId: player('bench-gk'),
          substitutionState: alreadyOffState,
          onFieldOutfieldPlayers: outfield,
        }),
      ),
    ).toThrow(/PLAYER_ALREADY_SUBSTITUTED_OFF/);
  });
});

describe('resolveGkFallback — ② goalkeeping 능력치 최고 단독 (D-22 ②)', () => {
  it('goalkeeping이 유일하게 최고인 선수가 단독으로 선정된다', () => {
    const outfield = [candidate('gk-best', 20, 30), candidate('rest', 15, 90)];

    const result = resolveGkFallback(baseOptions({ onFieldOutfieldPlayers: outfield }));

    expect(result.method).toBe('FIELD_PLAYER_REASSIGNMENT');
    expect(result.goalkeeperPlayerId).toBe(player('gk-best'));
    expect(result.resolvedBy).toBe('GOALKEEPING_ABILITY');
    expect(result.crossPositionModifier).toBe(0.35);
  });
});

describe('resolveGkFallback — ③ goalkeeping 동률 시 유효 능력치 최저 (D-22 ③)', () => {
  it('goalkeeping이 동률이면 유효 능력치가 가장 낮은 선수가 선정된다', () => {
    const outfield = [
      candidate('tied-high-eff', 18, 90),
      candidate('tied-low-eff', 18, 10),
      candidate('not-tied', 12, 5),
    ];

    const result = resolveGkFallback(baseOptions({ onFieldOutfieldPlayers: outfield }));

    expect(result.goalkeeperPlayerId).toBe(player('tied-low-eff'));
    expect(result.resolvedBy).toBe('EFFECTIVE_ABILITY');
  });
});

describe('resolveGkFallback — ④ 그래도 동률이면 시드 결정론적 선택 (D-22 ④)', () => {
  const tiedOutfield = [candidate('x', 18, 40), candidate('y', 18, 40), candidate('z', 18, 40)];

  it('완전 동률 후보에서 resolvedBy=SEED_DRAW로 선정되고, 동일 입력을 반복 실행해도 100% 동일하다', () => {
    const options = baseOptions({ onFieldOutfieldPlayers: tiedOutfield });

    const first = resolveGkFallback(options);
    const second = resolveGkFallback(options);

    expect(first.resolvedBy).toBe('SEED_DRAW');
    expect(second).toEqual(first);
  });

  it('후보 배열의 입력 순서를 바꿔도 동일한 선수가 선정된다(순서 비의존)', () => {
    const shuffled = [tiedOutfield[2], tiedOutfield[0], tiedOutfield[1]];

    const original = resolveGkFallback(baseOptions({ onFieldOutfieldPlayers: tiedOutfield }));
    const reordered = resolveGkFallback(baseOptions({ onFieldOutfieldPlayers: shuffled }));

    expect(reordered.goalkeeperPlayerId).toBe(original.goalkeeperPlayerId);
  });

  it('GK_FALLBACK_TIEBREAK_EVENT_INDEX는 events.ts가 예약한 0/1/2와 겹치지 않는다', () => {
    expect(GK_FALLBACK_TIEBREAK_EVENT_INDEX).toBe(3);
  });
});

describe('resolveGkFallback — ⑤ GK 교차 배율 (D-22 ⑤)', () => {
  it('GK_CROSS_POSITION_MODIFIER_DEFAULT는 0.35다', () => {
    expect(GK_CROSS_POSITION_MODIFIER_DEFAULT).toBe(0.35);
  });

  it('FIELD_PLAYER_REASSIGNMENT일 때만 배율이 적용되고, 벤치 GK 투입 시에는 null이다', () => {
    const fieldResult = resolveGkFallback(
      baseOptions({ onFieldOutfieldPlayers: [candidate('only', 10, 10)] }),
    );
    const benchResult = resolveGkFallback(
      baseOptions({
        benchGoalkeeperId: player('bench-gk'),
        onFieldOutfieldPlayers: [candidate('only', 10, 10)],
      }),
    );

    expect(fieldResult.crossPositionModifier).toBe(GK_CROSS_POSITION_MODIFIER_DEFAULT);
    expect(benchResult.crossPositionModifier).toBeNull();
  });
});

describe('resolveGkFallback — I-83(14일차 확정) 스냅샷 주입 파라미터 + 출처 관측(1팀 14일차 지적, 사용자 승인)', () => {
  it('crossPositionModifier를 명시적으로 주입하면 안전 기본값(0.35) 대신 주입값을 쓰고, 출처는 INJECTED다', () => {
    const injected = 0.42; // 오케스트레이션 계층이 SimConstantSnapshot에서 꺼내 주입했다고 가정한 값.

    const result = resolveGkFallback(
      baseOptions({
        onFieldOutfieldPlayers: [candidate('only', 10, 10)],
        crossPositionModifier: injected,
      }),
    );

    expect(result.crossPositionModifier).toBe(injected);
    expect(result.crossPositionModifier).not.toBe(GK_CROSS_POSITION_MODIFIER_DEFAULT);
    expect(result.crossPositionModifierSource).toBe('INJECTED');
  });

  it('crossPositionModifier를 생략하면 안전 기본값(GK_CROSS_POSITION_MODIFIER_DEFAULT)을 쓰고, 출처는 DEFAULT다', () => {
    const result = resolveGkFallback(
      baseOptions({ onFieldOutfieldPlayers: [candidate('only', 10, 10)] }),
    );

    expect(result.crossPositionModifier).toBe(GK_CROSS_POSITION_MODIFIER_DEFAULT);
    expect(result.crossPositionModifierSource).toBe('DEFAULT');
  });

  it('우연히 기본값과 동일한 값을 명시적으로 주입해도(0.35) 출처는 여전히 INJECTED다 — "생략 vs 우연한 동일값"을 구분한다', () => {
    const result = resolveGkFallback(
      baseOptions({
        onFieldOutfieldPlayers: [candidate('only', 10, 10)],
        crossPositionModifier: GK_CROSS_POSITION_MODIFIER_DEFAULT,
      }),
    );

    expect(result.crossPositionModifier).toBe(GK_CROSS_POSITION_MODIFIER_DEFAULT);
    expect(result.crossPositionModifierSource).toBe('INJECTED');
  });
});

describe('resolveGkFallback — 방어', () => {
  it('onFieldOutfieldPlayers가 빈 배열이면 오류를 던진다', () => {
    expect(() => resolveGkFallback(baseOptions({ onFieldOutfieldPlayers: [] }))).toThrow(RangeError);
  });
});
