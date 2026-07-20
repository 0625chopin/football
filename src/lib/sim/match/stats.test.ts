/**
 * stats.ts 테스트 — Task 023 / 11일차(2026-08-04) 산출물.
 *
 * 매핑표(`PLAYER_STAT_FIELD_CLASSIFICATION`)의 56필드 커버리지와, `accumulatePlayerMatchStats`의
 * 폴드 규칙(I-43 goals, I-60 foulsCommitted/foulsDrawn, I-55 penaltiesSaved, xg 합산 등)을
 * 검증한다. `@/*` 별칭은 아직 vitest에서 해석되지 않으므로(1팀 Task 008, 12~15일차 정비 예정)
 * 상대경로로만 import한다(`tick.test.ts` 관례와 동일).
 */

import { describe, expect, it } from 'vitest';
import {
  PLAYER_STAT_FIELD_CLASSIFICATION,
  accumulatePlayerMatchStats,
  type PlayerStatFieldClassification,
} from './stats';
import type { MatchEventDraft } from './events';
import type { MatchEventType, PlayerId, PlayerStatCoreValues, TeamId } from '../../../types';

const PLAYER_A = 'player-a' as PlayerId;
const PLAYER_B = 'player-b' as PlayerId;
const PLAYER_GK = 'player-gk' as PlayerId;
const TEAM_HOME = 'team-home' as TeamId;

/** 테스트 픽스처 전용 이벤트 생성 헬퍼 — 실제 생성 지점(10일차 events.ts)이 아니므로 필드를 직접 채운다. */
function makeEvent(overrides: Partial<MatchEventDraft> & { type: MatchEventType }): MatchEventDraft {
  return {
    sequence: 1,
    minute: 10,
    addedTime: 0,
    teamId: TEAM_HOME,
    primaryPlayerId: null,
    secondaryPlayerId: null,
    xg: null,
    relatedEventSequence: null,
    detail: {},
    ...overrides,
  };
}

const PLAYER_STAT_FIELD_NAMES = Object.keys(
  PLAYER_STAT_FIELD_CLASSIFICATION,
) as (keyof PlayerStatCoreValues)[];

describe('PLAYER_STAT_FIELD_CLASSIFICATION — 56필드 매핑표 커버리지 (I-34)', () => {
  it('PlayerStatCoreValues 56필드 전량이 매핑표에 존재한다', () => {
    expect(PLAYER_STAT_FIELD_NAMES).toHaveLength(56);
  });

  it('Tier A + Tier B 필드 수의 합이 56이다', () => {
    const classifications = Object.values(PLAYER_STAT_FIELD_CLASSIFICATION) as PlayerStatFieldClassification[];
    const tierACount = classifications.filter((c) => c.tier === 'A').length;
    const tierBCount = classifications.filter((c) => c.tier === 'B').length;
    expect(tierACount + tierBCount).toBe(56);
  });

  it('Tier B 필드는 전부 blockedReason이 있고, sourceEventTypes가 비어 있다', () => {
    const tierBEntries = Object.values(PLAYER_STAT_FIELD_CLASSIFICATION).filter(
      (c): c is PlayerStatFieldClassification => c.tier === 'B',
    );
    expect(tierBEntries.length).toBeGreaterThan(0);
    tierBEntries.forEach((entry) => {
      expect(entry.blockedReason).toBeDefined();
      expect(entry.sourceEventTypes).toHaveLength(0);
    });
  });

  it('Tier A 필드는 전부 sourceEventTypes가 최소 1개 이상이고 blockedReason이 없다', () => {
    const tierAEntries = Object.values(PLAYER_STAT_FIELD_CLASSIFICATION).filter(
      (c): c is PlayerStatFieldClassification => c.tier === 'A',
    );
    expect(tierAEntries.length).toBe(16);
    tierAEntries.forEach((entry) => {
      expect(entry.sourceEventTypes.length).toBeGreaterThan(0);
      expect(entry.blockedReason).toBeUndefined();
    });
  });
});

describe('accumulatePlayerMatchStats — I-43 goals fold (GOAL + PENALTY_SCORED)', () => {
  it('같은 선수의 GOAL 1건 + PENALTY_SCORED 1건이 goals=2로 폴드되고 penalties 필드도 함께 채워진다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'GOAL', primaryPlayerId: PLAYER_A, xg: 0.4 }),
      makeEvent({ sequence: 2, type: 'PENALTY_SCORED', primaryPlayerId: PLAYER_A, xg: 0.76 }),
    ];

    const stats = accumulatePlayerMatchStats(events);
    const a = stats.get(PLAYER_A);

    expect(a?.goals).toBe(2);
    expect(a?.penaltiesScored).toBe(1);
    expect(a?.penaltiesTaken).toBe(1);
    expect(a?.shots).toBe(1); // GOAL만 shots에 기여, PENALTY_SCORED는 미포함(가정 3)
    expect(a?.shotsOnTarget).toBe(1);
  });

  it('PENALTY_SHOOTOUT 이벤트는 goals에 전혀 기여하지 않는다(D-19)', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'PENALTY_SHOOTOUT', primaryPlayerId: PLAYER_A }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)).toBeUndefined();
  });
});

describe('accumulatePlayerMatchStats — I-60 foulsCommitted/foulsDrawn fold (FOUL + PENALTY_AWARDED)', () => {
  it('FOUL(A→B) + PENALTY_AWARDED(A→B)가 A.foulsCommitted=2, B.foulsDrawn=2로 집계된다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'FOUL', primaryPlayerId: PLAYER_A, secondaryPlayerId: PLAYER_B }),
      makeEvent({
        sequence: 2,
        type: 'PENALTY_AWARDED',
        primaryPlayerId: PLAYER_A,
        secondaryPlayerId: PLAYER_B,
      }),
    ];

    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.foulsCommitted).toBe(2);
    expect(stats.get(PLAYER_A)?.foulsDrawn).toBe(0);
    expect(stats.get(PLAYER_B)?.foulsDrawn).toBe(2);
    expect(stats.get(PLAYER_B)?.foulsCommitted).toBe(0);
  });

  it('secondaryPlayerId가 없는 FOUL은 foulsCommitted만 증가하고 foulsDrawn은 아무도 증가하지 않는다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'FOUL', primaryPlayerId: PLAYER_A, secondaryPlayerId: null }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.foulsCommitted).toBe(1);
    expect(stats.size).toBe(1);
  });
});

describe('accumulatePlayerMatchStats — xg 합산 (null 방어)', () => {
  it('xg가 null인 슛 이벤트는 0으로 취급되어 예외 없이 합산된다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'SHOT_ON', primaryPlayerId: PLAYER_A, xg: 0.3 }),
      makeEvent({ sequence: 2, type: 'SHOT_OFF', primaryPlayerId: PLAYER_A, xg: null }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.xg).toBeCloseTo(0.3);
    expect(stats.get(PLAYER_A)?.shots).toBe(2);
    expect(stats.get(PLAYER_A)?.shotsOnTarget).toBe(1);
  });
});

describe('accumulatePlayerMatchStats — I-55 penaltiesSaved (PENALTY_MISSED.secondaryPlayerId)', () => {
  it('선방된 PENALTY_MISSED는 secondaryPlayerId(GK)의 penaltiesSaved를 올린다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({
        sequence: 1,
        type: 'PENALTY_MISSED',
        primaryPlayerId: PLAYER_A,
        secondaryPlayerId: PLAYER_GK,
      }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_GK)?.penaltiesSaved).toBe(1);
    expect(stats.get(PLAYER_A)?.penaltiesTaken).toBe(1);
    expect(stats.get(PLAYER_A)?.penaltiesSaved).toBe(0);
  });

  it('골대를 벗어나 빗나간 PENALTY_MISSED(secondaryPlayerId=null)는 아무도 penaltiesSaved가 오르지 않는다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({
        sequence: 1,
        type: 'PENALTY_MISSED',
        primaryPlayerId: PLAYER_A,
        secondaryPlayerId: null,
      }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.penaltiesTaken).toBe(1);
    expect(stats.size).toBe(1);
  });
});

describe('accumulatePlayerMatchStats — 카드류', () => {
  it('YELLOW_CARD 1건은 yellowCards=1, secondYellows=0', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'YELLOW_CARD', primaryPlayerId: PLAYER_A }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.yellowCards).toBe(1);
    expect(stats.get(PLAYER_A)?.secondYellows).toBe(0);
  });

  it('SECOND_YELLOW 1건은 yellowCards=1(가정 2로 폴드)과 secondYellows=1을 동시에 올린다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'SECOND_YELLOW', primaryPlayerId: PLAYER_A }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.yellowCards).toBe(1);
    expect(stats.get(PLAYER_A)?.secondYellows).toBe(1);
  });

  it('RED_CARD 1건은 SECOND_YELLOW와 별개로 redCards=1만 올린다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'RED_CARD', primaryPlayerId: PLAYER_A }),
    ];
    const stats = accumulatePlayerMatchStats(events);
    expect(stats.get(PLAYER_A)?.redCards).toBe(1);
    expect(stats.get(PLAYER_A)?.secondYellows).toBe(0);
  });
});

describe('accumulatePlayerMatchStats — Tier A 기여 없는 구조 마커 이벤트는 무시된다', () => {
  it('KICKOFF/CORNER/INJURY/SUBSTITUTION/HALF_TIME/FULL_TIME/EXTRA_TIME_START만 있으면 참여 선수의 Tier A 필드는 전부 0이거나 행 자체가 없다', () => {
    const noopTypes: MatchEventType[] = [
      'KICKOFF',
      'CORNER',
      'INJURY',
      'SUBSTITUTION',
      'HALF_TIME',
      'FULL_TIME',
      'EXTRA_TIME_START',
    ];
    const events: MatchEventDraft[] = noopTypes.map((type, index) =>
      makeEvent({ sequence: index + 1, type, primaryPlayerId: PLAYER_A }),
    );

    const stats = accumulatePlayerMatchStats(events);
    // 참가자가 있어도 Tier A 기여 이벤트가 하나도 없으면 이 함수는 해당 선수 행을 아예 만들지 않는다
    // (lazy 0-초기화 — 기여가 없는 선수까지 매 회 전원 순회하며 0-row를 만들지 않는다).
    expect(stats.size).toBe(0);
  });
});

describe('accumulatePlayerMatchStats — primaryPlayerId가 null인 이벤트는 안전하게 스킵된다', () => {
  it('primaryPlayerId가 없는 GOAL은 예외 없이 무시되고 어떤 행도 생성하지 않는다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'GOAL', primaryPlayerId: null, xg: 0.5 }),
    ];
    expect(() => accumulatePlayerMatchStats(events)).not.toThrow();
    expect(accumulatePlayerMatchStats(events).size).toBe(0);
  });
});

describe('accumulatePlayerMatchStats — 결정론(순수 함수)', () => {
  it('같은 events 배열을 여러 번 넣어도 항상 같은 결과를 낸다', () => {
    const events: MatchEventDraft[] = [
      makeEvent({ sequence: 1, type: 'GOAL', primaryPlayerId: PLAYER_A, xg: 0.4 }),
      makeEvent({ sequence: 2, type: 'ASSIST', primaryPlayerId: PLAYER_B }),
    ];

    const first = accumulatePlayerMatchStats(events);
    const second = accumulatePlayerMatchStats(events);

    expect(Object.fromEntries(second)).toEqual(Object.fromEntries(first));
  });
});
