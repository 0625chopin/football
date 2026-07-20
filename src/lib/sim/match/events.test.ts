/**
 * events.ts 테스트 — Task 023 / 15일차(2026-08-10) 산출물.
 *
 * 14일차 인계: `events.ts`가 커버리지 0%였다(어떤 테스트도 이 파일의 런타임 함수를 호출하지
 * 않음 — `stats.test.ts`는 `MatchEventDraft` 타입만 참조하고 픽스처를 직접 채웠다). 이
 * 파일이 `generateMatchEvents`/`sortMatchEventsChronologically`/`linkPenaltyOutcomes`/
 * `assertNoDisplayText`를 직접 호출해 그 공백을 해소한다. 100경기 규모 결정론 검증은
 * `match-snapshot.test.ts`(NFR-QA-003)가 별도로 맡는다 — 이 파일은 작고 통제된 픽스처로
 * 각 함수의 정확한 동작(경계값·규약)을 짚는다.
 *
 * `@/*` 별칭은 아직 vitest에서 해석되지 않던 시절의 관례를 그대로 따라(1팀 Task 008)
 * 상대경로로만 import한다(`tick.test.ts`/`stats.test.ts` 관례와 동일).
 */

import { describe, expect, it } from 'vitest';
import {
  MATCH_EVENT_TYPES,
  MATCH_EVENT_TYPE_COUNT,
  assertNoDisplayText,
  generateMatchEvents,
  linkPenaltyOutcomes,
  sortMatchEventsChronologically,
  type GenerateMatchEventsOptions,
  type MatchEventDraft,
} from './events';
import type { MatchTick } from './tick';
import type { MatchEventType, MatchSeed, PlayerId, TeamId } from '../../../types';

const SEED = 424242 as MatchSeed;
const TEAM_HOME = 'team-home' as TeamId;
const PLAYER_A = 'player-a' as PlayerId;

function makeTicks(count: number): MatchTick[] {
  return Array.from({ length: count }, (_, i) => ({
    tick: i + 1,
    phase: 'FIRST_HALF',
    minute: i + 1,
    addedTime: 0,
  }));
}

/** 23종 전량에 동일 가중치 1을 주는 기본 옵션(occursProbability는 호출부가 override). */
function baseOptions(overrides: Partial<GenerateMatchEventsOptions> = {}): GenerateMatchEventsOptions {
  const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 1])) as Record<
    MatchEventType,
    number
  >;
  return { occursProbability: 0.5, weights, ...overrides };
}

describe('MATCH_EVENT_TYPES / MATCH_EVENT_TYPE_COUNT — FR-MT-002 수용기준', () => {
  it('정확히 23종이고 중복이 없다', () => {
    expect(MATCH_EVENT_TYPE_COUNT).toBe(23);
    expect(new Set(MATCH_EVENT_TYPES).size).toBe(23);
  });
});

describe('assertNoDisplayText — D-18 (표시 문구 금지)', () => {
  it('금지 키(label/text/message/description/caption/title)는 값과 무관하게 거부된다', () => {
    expect(() => assertNoDisplayText({ label: 'ok' })).toThrow(/D-18/);
    expect(() => assertNoDisplayText({ TEXT: 'anything' })).toThrow();
  });

  it('공백을 포함한 문자열 값은 거부된다', () => {
    expect(() => assertNoDisplayText({ zone: 'left wing' })).toThrow();
  });

  it('공백 없는 코드값·숫자·불리언은 통과한다', () => {
    expect(() => assertNoDisplayText({ zone: 'left-wing', level: 2, flag: true })).not.toThrow();
  });

  it('빈 객체는 통과한다(10일차 EMPTY_DETAIL 기본값)', () => {
    expect(() => assertNoDisplayText({})).not.toThrow();
  });
});

describe('generateMatchEvents — 발생 판정 (occursProbability)', () => {
  it('occursProbability=0이면 어떤 틱에서도 이벤트가 생성되지 않는다', () => {
    const drafts = generateMatchEvents(makeTicks(20), SEED, baseOptions({ occursProbability: 0 }));
    expect(drafts).toHaveLength(0);
  });

  it('occursProbability=1이면 모든 틱에서 이벤트가 생성되고 sequence가 1부터 연속한다', () => {
    const ticks = makeTicks(15);
    const drafts = generateMatchEvents(ticks, SEED, baseOptions({ occursProbability: 1 }));
    expect(drafts).toHaveLength(ticks.length);
    drafts.forEach((draft, i) => expect(draft.sequence).toBe(i + 1));
  });

  it('같은 시드·같은 옵션으로 두 번 생성해도 완전히 동일한 결과를 낸다(결정론)', () => {
    const ticks = makeTicks(30);
    const options = baseOptions({ occursProbability: 0.5 });
    const first = generateMatchEvents(ticks, SEED, options);
    const second = generateMatchEvents(ticks, SEED, options);
    expect(second).toEqual(first);
  });
});

describe('generateMatchEvents — 타입 선택 (weights)', () => {
  it('한 타입에만 가중치를 몰아주면 발생한 이벤트가 전부 그 타입이다', () => {
    const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 0])) as Record<
      MatchEventType,
      number
    >;
    const skewed = { ...weights, GOAL: 1 };
    const drafts = generateMatchEvents(
      makeTicks(25),
      SEED,
      baseOptions({ occursProbability: 1, weights: skewed }),
    );
    expect(drafts.length).toBeGreaterThan(0);
    drafts.forEach((draft) => expect(draft.type).toBe('GOAL'));
  });
});

describe('generateMatchEvents — 참가자·xG 콜백', () => {
  it('resolveParticipants가 주입한 팀·선수를 그대로 사용한다', () => {
    const drafts = generateMatchEvents(
      makeTicks(5),
      SEED,
      baseOptions({
        occursProbability: 1,
        resolveParticipants: () => ({
          teamId: TEAM_HOME,
          primaryPlayerId: PLAYER_A,
          secondaryPlayerId: null,
        }),
      }),
    );
    expect(drafts.length).toBeGreaterThan(0);
    drafts.forEach((draft) => {
      expect(draft.teamId).toBe(TEAM_HOME);
      expect(draft.primaryPlayerId).toBe(PLAYER_A);
    });
  });

  it('resolveParticipants 미제공 시 참가자는 전부 null이다', () => {
    const drafts = generateMatchEvents(makeTicks(5), SEED, baseOptions({ occursProbability: 1 }));
    drafts.forEach((draft) => {
      expect(draft.teamId).toBeNull();
      expect(draft.primaryPlayerId).toBeNull();
      expect(draft.secondaryPlayerId).toBeNull();
    });
  });

  it('estimateXg가 있어도 xG 비대상 타입(FOUL 등)은 항상 xg=null이다', () => {
    const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 0])) as Record<
      MatchEventType,
      number
    >;
    const foulOnly = { ...weights, FOUL: 1 };
    const drafts = generateMatchEvents(
      makeTicks(5),
      SEED,
      baseOptions({ occursProbability: 1, weights: foulOnly, estimateXg: () => 0.9 }),
    );
    expect(drafts.length).toBeGreaterThan(0);
    drafts.forEach((draft) => {
      expect(draft.type).toBe('FOUL');
      expect(draft.xg).toBeNull();
    });
  });

  it('estimateXg가 있으면 xG 대상 타입(SHOT_ON 등)은 그 값을 그대로 쓴다', () => {
    const weights = Object.fromEntries(MATCH_EVENT_TYPES.map((type) => [type, 0])) as Record<
      MatchEventType,
      number
    >;
    const shotOnly = { ...weights, SHOT_ON: 1 };
    const drafts = generateMatchEvents(
      makeTicks(5),
      SEED,
      baseOptions({ occursProbability: 1, weights: shotOnly, estimateXg: () => 0.42 }),
    );
    expect(drafts.length).toBeGreaterThan(0);
    drafts.forEach((draft) => {
      expect(draft.type).toBe('SHOT_ON');
      expect(draft.xg).toBe(0.42);
    });
  });
});

describe('sortMatchEventsChronologically — minute → addedTime → sequence 타이브레이크', () => {
  function makeDraft(overrides: Partial<MatchEventDraft>): MatchEventDraft {
    return {
      sequence: 1,
      minute: 1,
      addedTime: 0,
      type: 'FOUL',
      teamId: null,
      primaryPlayerId: null,
      secondaryPlayerId: null,
      xg: null,
      relatedEventSequence: null,
      detail: {},
      ...overrides,
    };
  }

  it('minute 역순으로 들어와도 오름차순으로 정렬된다', () => {
    const unsorted = [
      makeDraft({ sequence: 1, minute: 80 }),
      makeDraft({ sequence: 2, minute: 10 }),
      makeDraft({ sequence: 3, minute: 45 }),
    ];
    const sorted = sortMatchEventsChronologically(unsorted);
    expect(sorted.map((e) => e.minute)).toEqual([10, 45, 80]);
  });

  it('같은 minute이면 addedTime으로, 그마저 같으면 sequence로 갈린다', () => {
    const unsorted = [
      makeDraft({ sequence: 3, minute: 45, addedTime: 2 }),
      makeDraft({ sequence: 1, minute: 45, addedTime: 0 }),
      makeDraft({ sequence: 2, minute: 45, addedTime: 1 }),
    ];
    const sorted = sortMatchEventsChronologically(unsorted);
    expect(sorted.map((e) => e.sequence)).toEqual([1, 2, 3]);
  });

  it('minute과 addedTime이 둘 다 같으면 세 번째 키(sequence)로 갈린다', () => {
    const unsorted = [
      makeDraft({ sequence: 5, minute: 10, addedTime: 0 }),
      makeDraft({ sequence: 4, minute: 10, addedTime: 0 }),
    ];
    const sorted = sortMatchEventsChronologically(unsorted);
    expect(sorted.map((e) => e.sequence)).toEqual([4, 5]);
  });
});

describe('linkPenaltyOutcomes — I-54 PENALTY_SCORED/MISSED → PENALTY_AWARDED', () => {
  function makeDraft(overrides: Partial<MatchEventDraft>): MatchEventDraft {
    return {
      sequence: 1,
      minute: 1,
      addedTime: 0,
      type: 'FOUL',
      teamId: null,
      primaryPlayerId: null,
      secondaryPlayerId: null,
      xg: null,
      relatedEventSequence: null,
      detail: {},
      ...overrides,
    };
  }

  it('PENALTY_AWARDED 직후 PENALTY_SCORED가 그 awarded를 가리킨다', () => {
    const events = [
      makeDraft({ sequence: 1, type: 'PENALTY_AWARDED' }),
      makeDraft({ sequence: 2, type: 'PENALTY_SCORED' }),
    ];
    const linked = linkPenaltyOutcomes(events);
    expect(linked[1].relatedEventSequence).toBe(1);
    expect(linked[0].relatedEventSequence).toBeNull();
  });

  it('PENALTY_AWARDED와 결과 이벤트 사이에 무관한 이벤트가 껴 있어도 연결된다', () => {
    const events = [
      makeDraft({ sequence: 1, type: 'PENALTY_AWARDED' }),
      makeDraft({ sequence: 2, type: 'GOAL' }),
      makeDraft({ sequence: 3, type: 'PENALTY_MISSED' }),
    ];
    const linked = linkPenaltyOutcomes(events);
    expect(linked[2].relatedEventSequence).toBe(1);
    expect(linked[1].relatedEventSequence).toBeNull();
  });

  it('선행 PENALTY_AWARDED가 없는 PENALTY_SCORED는 relatedEventSequence가 그대로 null이다', () => {
    const events = [makeDraft({ sequence: 1, type: 'PENALTY_SCORED' })];
    const linked = linkPenaltyOutcomes(events);
    expect(linked[0].relatedEventSequence).toBeNull();
  });

  it('연속 두 PK — 각 결과가 자신의 직전 awarded에만 연결되고 재사용되지 않는다', () => {
    const events = [
      makeDraft({ sequence: 1, type: 'PENALTY_AWARDED' }),
      makeDraft({ sequence: 2, type: 'PENALTY_SCORED' }),
      makeDraft({ sequence: 3, type: 'PENALTY_AWARDED' }),
      makeDraft({ sequence: 4, type: 'PENALTY_MISSED' }),
    ];
    const linked = linkPenaltyOutcomes(events);
    expect(linked[1].relatedEventSequence).toBe(1);
    expect(linked[3].relatedEventSequence).toBe(3);
  });

  it('awarded가 이미 소비된 뒤 곧바로 온 결과 이벤트는 연결되지 않는다', () => {
    const events = [
      makeDraft({ sequence: 1, type: 'PENALTY_AWARDED' }),
      makeDraft({ sequence: 2, type: 'PENALTY_SCORED' }),
      makeDraft({ sequence: 3, type: 'PENALTY_MISSED' }), // 대응하는 awarded 없음
    ];
    const linked = linkPenaltyOutcomes(events);
    expect(linked[1].relatedEventSequence).toBe(1);
    expect(linked[2].relatedEventSequence).toBeNull();
  });
});
