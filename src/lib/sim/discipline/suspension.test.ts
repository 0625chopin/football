/**
 * suspension.ts 테스트 — Task 024 / 22일차 산출물.
 *
 * 완료 판정(team-schedule 22일차 행) "리그·컵 카드가 섞이지 않음"을 직접 고정한다.
 * `@/*` 별칭은 vitest에서 해석되지만, `select.test.ts` 선례를 따라 이 파일도 상대경로로
 * `../../../types`를 import한다.
 */

import { describe, expect, it } from 'vitest';
import {
  CARD_SUSPENSION_THRESHOLD_DEFAULT,
  advanceCompetitionRound,
  applyMatchCards,
  resolveManagerStyle,
  type MatchCardCounts,
  type PlayerDisciplineState,
} from './suspension';
import type { TeamId } from '../../../types';

const NO_CARDS: MatchCardCounts = { yellowCards: 0, secondYellows: 0, redCards: 0 };
const team = (label: string): TeamId => `team-${label}` as TeamId;

const baseState = (): PlayerDisciplineState => ({
  yellowAccumulatedLeague: 0,
  yellowAccumulatedCup: 0,
  suspensionRemainingLeague: 0,
  suspensionRemainingCup: 0,
});

describe('applyMatchCards — 리그·컵 분리', () => {
  it('LEAGUE 갱신 시 컵 필드는 그대로다', () => {
    const state: PlayerDisciplineState = {
      ...baseState(),
      yellowAccumulatedCup: 3,
      suspensionRemainingCup: 2,
    };
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 1 });
    expect(result.yellowAccumulatedLeague).toBe(1);
    expect(result.yellowAccumulatedCup).toBe(3);
    expect(result.suspensionRemainingCup).toBe(2);
  });

  it('CUP 갱신 시 리그 필드는 그대로다', () => {
    const state: PlayerDisciplineState = {
      ...baseState(),
      yellowAccumulatedLeague: 4,
      suspensionRemainingLeague: 1,
    };
    const result = applyMatchCards(state, 'CUP', { ...NO_CARDS, yellowCards: 1 });
    expect(result.yellowAccumulatedCup).toBe(1);
    expect(result.yellowAccumulatedLeague).toBe(4);
    expect(result.suspensionRemainingLeague).toBe(1);
  });
});

describe('applyMatchCards — 카드 누적 정지 임계값', () => {
  it(`누적이 ${CARD_SUSPENSION_THRESHOLD_DEFAULT} 미만이면 정지가 걸리지 않는다`, () => {
    const state: PlayerDisciplineState = { ...baseState(), yellowAccumulatedLeague: 3 };
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 1 });
    expect(result.yellowAccumulatedLeague).toBe(4);
    expect(result.suspensionRemainingLeague).toBe(0);
  });

  it(`누적이 정확히 ${CARD_SUSPENSION_THRESHOLD_DEFAULT}에 도달하면 정지 1경기, 누적은 0으로 초기화`, () => {
    const state: PlayerDisciplineState = { ...baseState(), yellowAccumulatedLeague: 4 };
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 1 });
    expect(result.yellowAccumulatedLeague).toBe(0);
    expect(result.suspensionRemainingLeague).toBe(1);
  });

  it('한 번에 임계값을 두 번 넘기면(예: 3 + 7장) 정지가 2회 누적된다', () => {
    const state: PlayerDisciplineState = { ...baseState(), yellowAccumulatedLeague: 3 };
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 7 });
    expect(result.yellowAccumulatedLeague).toBe(0);
    expect(result.suspensionRemainingLeague).toBe(2);
  });

  it('기존 정지가 남아 있는 상태에서 새 임계값 도달분은 그 위에 더해진다', () => {
    const state: PlayerDisciplineState = {
      ...baseState(),
      yellowAccumulatedLeague: 4,
      suspensionRemainingLeague: 1,
    };
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 1 });
    expect(result.suspensionRemainingLeague).toBe(2);
  });

  it('options로 임계값·정지 경기 수를 오버라이드할 수 있다', () => {
    const state = baseState();
    const result = applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, yellowCards: 3 }, undefined, {
      threshold: 3,
      accumulationSuspensionGames: 2,
    });
    expect(result.yellowAccumulatedLeague).toBe(0);
    expect(result.suspensionRemainingLeague).toBe(2);
  });
});

describe('applyMatchCards — 퇴장 정지(1~3경기)', () => {
  it('RED_CARD가 있는데 dismissalSuspensionGames를 안 주면 오류', () => {
    const state = baseState();
    expect(() => applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, redCards: 1 })).toThrow(RangeError);
  });

  it('SECOND_YELLOW만 있어도 퇴장으로 취급해 dismissalSuspensionGames가 필수다', () => {
    const state = baseState();
    expect(() => applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, secondYellows: 1 })).toThrow(RangeError);
  });

  it('dismissalSuspensionGames가 범위(기본 [1,3]) 밖이면 오류 — 0', () => {
    const state = baseState();
    expect(() => applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, redCards: 1 }, 0)).toThrow(RangeError);
  });

  it('dismissalSuspensionGames가 범위(기본 [1,3]) 밖이면 오류 — 4', () => {
    const state = baseState();
    expect(() => applyMatchCards(state, 'LEAGUE', { ...NO_CARDS, redCards: 1 }, 4)).toThrow(RangeError);
  });

  it.each([1, 2, 3])('dismissalSuspensionGames=%i는 정지 잔여에 그대로 더해진다', (games) => {
    const state = baseState();
    const result = applyMatchCards(state, 'CUP', { ...NO_CARDS, redCards: 1 }, games);
    expect(result.suspensionRemainingCup).toBe(games);
  });

  it('같은 경기의 카드 누적 정지와 퇴장 정지는 함께 더해진다', () => {
    const state: PlayerDisciplineState = { ...baseState(), yellowAccumulatedLeague: 4 };
    const result = applyMatchCards(state, 'LEAGUE', { yellowCards: 1, secondYellows: 1, redCards: 0 }, 1);
    expect(result.suspensionRemainingLeague).toBe(2);
  });

  it('카드가 전혀 없으면 dismissalSuspensionGames 없이도 오류가 나지 않는다', () => {
    const state = baseState();
    expect(() => applyMatchCards(state, 'LEAGUE', NO_CARDS)).not.toThrow();
  });
});

describe('advanceCompetitionRound — 대회 축별 라운드 진행', () => {
  it('지정한 대회 축만 1 차감하고 반대 축은 그대로다', () => {
    const state: PlayerDisciplineState = {
      ...baseState(),
      suspensionRemainingLeague: 2,
      suspensionRemainingCup: 1,
    };
    const result = advanceCompetitionRound(state, 'LEAGUE');
    expect(result.suspensionRemainingLeague).toBe(1);
    expect(result.suspensionRemainingCup).toBe(1);
  });

  it('0 미만으로 내려가지 않는다', () => {
    const state = baseState();
    const result = advanceCompetitionRound(state, 'CUP');
    expect(result.suspensionRemainingCup).toBe(0);
  });
});

describe('resolveManagerStyle — D-23 감독 공석 폴백', () => {
  it('manager가 null이면 BALANCED', () => {
    expect(resolveManagerStyle(null)).toBe('BALANCED');
  });

  it('manager.teamId가 null(공석)이면 BALANCED', () => {
    expect(resolveManagerStyle({ teamId: null, style: 'ATTACKING' })).toBe('BALANCED');
  });

  it('정상 배정된 감독은 자신의 style을 그대로 반환한다', () => {
    expect(resolveManagerStyle({ teamId: team('a'), style: 'HIGH_PRESS' })).toBe('HIGH_PRESS');
  });
});
