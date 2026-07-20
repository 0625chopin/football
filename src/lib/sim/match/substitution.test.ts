/**
 * substitution.ts 테스트 — Task 023 / 12일차(2026-08-05) 산출물.
 *
 * 완료 판정(team-schedule 12일차 행) "4번째 교체창 시도 시 거부"를 핵심으로 검증하고,
 * FR-MT-012의 나머지 축(인원 상한 5명, 재투입 금지)과 부상 즉시교체 콜백 위임도 함께
 * 검증한다.
 *
 * `@/*` 별칭은 아직 vitest에서 해석되지 않으므로 상대경로로만 import한다
 * (`docs/team-schedule` 지시 사항, `tick.test.ts` 선례).
 */

import { describe, expect, it } from 'vitest';
import {
  MAX_SUBSTITUTIONS_PER_TEAM,
  MAX_SUBSTITUTION_WINDOWS_PER_TEAM,
  applySubstitution,
  attemptImmediateInjurySubstitution,
  createInitialSubstitutionState,
  type TeamSubstitutionState,
} from './substitution';
import type { MatchTick } from './tick';
import type { MatchEventDraft } from './events';
import type { PlayerId, TeamId } from '../../../types';

/** 테스트 픽스처 전용 캐스트 — 실제 생성 지점이 아니므로 허용(brand.type-test.ts 관례와 동일). */
const TEAM_ID = 'team-1' as TeamId;
const player = (label: string): PlayerId => `player-${label}` as PlayerId;

function tickAt(tick: number, minute: number): MatchTick {
  return { tick, phase: 'FIRST_HALF', minute, addedTime: 0 };
}

function injuryEvent(playerId: PlayerId | null, teamId: TeamId | null = TEAM_ID): MatchEventDraft {
  return {
    sequence: 1,
    minute: 10,
    addedTime: 0,
    type: 'INJURY',
    teamId,
    primaryPlayerId: playerId,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: {},
  };
}

describe('applySubstitution — 교체 창 상한 (완료 판정: 4번째 교체창 시도 시 거부)', () => {
  it('서로 다른 tick 4회 시도 시 1~3번째는 승인, 4번째는 WINDOW_LIMIT_REACHED로 거부된다', () => {
    let state: TeamSubstitutionState = createInitialSubstitutionState();
    const attempts = [1, 2, 3, 4].map((n) => ({
      tick: tickAt(n * 10, n * 10),
      teamId: TEAM_ID,
      playerOffId: player(`off-${n}`),
      playerOnId: player(`on-${n}`),
    }));

    const results = attempts.map((attempt, index) => {
      const result = applySubstitution(state, attempt, index + 1);
      state = result.state;
      return result;
    });

    expect(results.slice(0, 3).every((r) => r.accepted)).toBe(true);
    expect(results[3].accepted).toBe(false);
    expect(results[3].reason).toBe('WINDOW_LIMIT_REACHED');
    expect(state).toBe(results[2].state);
  });

  it('MAX_SUBSTITUTION_WINDOWS_PER_TEAM은 3이다', () => {
    expect(MAX_SUBSTITUTION_WINDOWS_PER_TEAM).toBe(3);
  });

  it('같은 tick(같은 창) 내 다건 교체는 창을 추가로 소비하지 않고 계속 승인된다', () => {
    let state: TeamSubstitutionState = createInitialSubstitutionState();
    const sameTick = tickAt(50, 50);

    const first = applySubstitution(
      state,
      { tick: sameTick, teamId: TEAM_ID, playerOffId: player('a'), playerOnId: player('b') },
      1,
    );
    state = first.state;
    const second = applySubstitution(
      state,
      { tick: sameTick, teamId: TEAM_ID, playerOffId: player('c'), playerOnId: player('d') },
      2,
    );

    expect(first.accepted).toBe(true);
    expect(second.accepted).toBe(true);
    expect(second.state.windowTicks).toEqual([50]);
    expect(second.state.substitutionsUsed).toBe(2);
  });
});

describe('applySubstitution — 인원 상한 (5명)', () => {
  it('MAX_SUBSTITUTIONS_PER_TEAM은 5다', () => {
    expect(MAX_SUBSTITUTIONS_PER_TEAM).toBe(5);
  });

  it('substitutionsUsed가 5에 도달하면 같은 창 안에서도 이후 시도는 SUBSTITUTION_LIMIT_REACHED로 거부된다', () => {
    let state: TeamSubstitutionState = createInitialSubstitutionState();
    const sameTick = tickAt(70, 70);

    for (let n = 1; n <= 5; n += 1) {
      const result = applySubstitution(
        state,
        { tick: sameTick, teamId: TEAM_ID, playerOffId: player(`off-${n}`), playerOnId: player(`on-${n}`) },
        n,
      );
      expect(result.accepted).toBe(true);
      state = result.state;
    }

    const sixth = applySubstitution(
      state,
      { tick: sameTick, teamId: TEAM_ID, playerOffId: player('off-6'), playerOnId: player('on-6') },
      6,
    );
    expect(sixth.accepted).toBe(false);
    expect(sixth.reason).toBe('SUBSTITUTION_LIMIT_REACHED');
  });
});

describe('applySubstitution — 재투입 금지', () => {
  it('이미 교체 아웃된 선수를 playerOffId로 다시 시도하면 거부된다', () => {
    let state: TeamSubstitutionState = createInitialSubstitutionState();
    const first = applySubstitution(
      state,
      { tick: tickAt(1, 1), teamId: TEAM_ID, playerOffId: player('starter'), playerOnId: player('sub-1') },
      1,
    );
    state = first.state;

    const retry = applySubstitution(
      state,
      { tick: tickAt(2, 2), teamId: TEAM_ID, playerOffId: player('starter'), playerOnId: player('sub-2') },
      2,
    );

    expect(retry.accepted).toBe(false);
    expect(retry.reason).toBe('PLAYER_ALREADY_SUBSTITUTED_OFF');
    expect(retry.state).toBe(state);
  });

  it('이미 교체 아웃된 선수를 playerOnId로(재투입) 시도해도 거부된다', () => {
    let state: TeamSubstitutionState = createInitialSubstitutionState();
    const first = applySubstitution(
      state,
      { tick: tickAt(1, 1), teamId: TEAM_ID, playerOffId: player('starter'), playerOnId: player('sub-1') },
      1,
    );
    state = first.state;

    const retry = applySubstitution(
      state,
      { tick: tickAt(2, 2), teamId: TEAM_ID, playerOffId: player('another'), playerOnId: player('starter') },
      2,
    );

    expect(retry.accepted).toBe(false);
    expect(retry.reason).toBe('PLAYER_ALREADY_SUBSTITUTED_OFF');
  });
});

describe('applySubstitution — 승인 시 반환 이벤트', () => {
  it('SUBSTITUTION 이벤트가 primaryPlayerId=교체 인, secondaryPlayerId=교체 아웃으로 구성된다', () => {
    const state = createInitialSubstitutionState();
    const result = applySubstitution(
      state,
      { tick: tickAt(30, 30), teamId: TEAM_ID, playerOffId: player('off'), playerOnId: player('on') },
      7,
    );

    expect(result.event).toEqual({
      sequence: 7,
      minute: 30,
      addedTime: 0,
      type: 'SUBSTITUTION',
      teamId: TEAM_ID,
      primaryPlayerId: player('on'),
      secondaryPlayerId: player('off'),
      xg: null,
      relatedEventSequence: null,
      detail: {},
    });
  });
});

describe('attemptImmediateInjurySubstitution — 부상 발생 시 즉시 교체 판단', () => {
  it('INJURY 타입이 아닌 이벤트에는 null을 반환한다', () => {
    const notInjury: MatchEventDraft = { ...injuryEvent(player('hurt')), type: 'FOUL' };
    const state = createInitialSubstitutionState();

    const result = attemptImmediateInjurySubstitution(
      state,
      notInjury,
      tickAt(15, 15),
      () => player('bench-1'),
      1,
    );

    expect(result).toBeNull();
  });

  it('selectReplacement가 null을 반환하면(대체 선수 없음) null을 반환한다', () => {
    const state = createInitialSubstitutionState();

    const result = attemptImmediateInjurySubstitution(
      state,
      injuryEvent(player('hurt')),
      tickAt(15, 15),
      () => null,
      1,
    );

    expect(result).toBeNull();
  });

  it('참가자 정보가 없는 INJURY 이벤트에는 null을 반환한다', () => {
    const state = createInitialSubstitutionState();

    const result = attemptImmediateInjurySubstitution(
      state,
      injuryEvent(null),
      tickAt(15, 15),
      () => player('bench-1'),
      1,
    );

    expect(result).toBeNull();
  });

  it('정상 INJURY + selectReplacement가 선수를 반환하면 applySubstitution과 동일하게 승인된다', () => {
    const state = createInitialSubstitutionState();
    const tick = tickAt(15, 15);
    const injured = injuryEvent(player('hurt'));

    const viaInjury = attemptImmediateInjurySubstitution(
      state,
      injured,
      tick,
      () => player('bench-1'),
      1,
    );
    const viaDirect = applySubstitution(
      state,
      { tick, teamId: TEAM_ID, playerOffId: player('hurt'), playerOnId: player('bench-1') },
      1,
    );

    expect(viaInjury).not.toBeNull();
    expect(viaInjury).toEqual(viaDirect);
  });
});
