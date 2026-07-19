/**
 * `person.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: FR-PL-002(34속성)와 3일차 교차 점검이 못박은 `PlayerState` 4축(condition/fitness/
 * familiarity/yellow 분리)이 실수로 줄어들면 `tsc`가 즉시 잡도록 고정한다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  Manager,
  Player,
  PlayerAttribute,
  PlayerAttributeHistory,
  PlayerAttributeValues,
  PlayerPosition,
  PlayerState,
} from './person';

describe('person.ts — PlayerAttributeValues (34속성, FR-PL-002)', () => {
  it('기술10 + 정신10 + 신체8 + GK6 = 34개 필드가 정확히 존재한다', () => {
    expectTypeOf<keyof PlayerAttributeValues>().toEqualTypeOf<
      // 기술 10
      | 'finishing'
      | 'passing'
      | 'crossing'
      | 'dribbling'
      | 'firstTouch'
      | 'tackling'
      | 'marking'
      | 'heading'
      | 'longShots'
      | 'setPieces'
      // 정신 10
      | 'composure'
      | 'decisions'
      | 'vision'
      | 'positioning'
      | 'workRate'
      | 'aggression'
      | 'leadership'
      | 'teamwork'
      | 'anticipation'
      | 'determination'
      // 신체 8
      | 'pace'
      | 'acceleration'
      | 'stamina'
      | 'strength'
      | 'agility'
      | 'balance'
      | 'jumping'
      | 'naturalFitness'
      // GK 6
      | 'reflexes'
      | 'handling'
      | 'oneOnOnes'
      | 'aerialReach'
      | 'kicking'
      | 'commandOfArea'
    >();
  });

  it('34속성 전 필드가 number 타입이다(1~30 정수 스케일, T5는 브랜드화 보류 — 8일차 최종 결정 참조)', () => {
    expectTypeOf<PlayerAttributeValues[keyof PlayerAttributeValues]>().toEqualTypeOf<number>();
  });

  it('PlayerAttribute/PlayerAttributeHistory가 34속성 블록을 재사용한다(C-6, 필드 중복 선언 금지)', () => {
    expectTypeOf<PlayerAttribute>().toMatchTypeOf<PlayerAttributeValues>();
    expectTypeOf<PlayerAttributeHistory>().toMatchTypeOf<PlayerAttributeValues>();
  });
});

describe('person.ts — Player (E-07)', () => {
  it('pa(잠재능력)와 retiredAtSeason은 값 존재 + nullable 여부가 정확하다', () => {
    expectTypeOf<Player>().toHaveProperty('pa').toEqualTypeOf<number>();
    expectTypeOf<Player['retiredAtSeason']>().toBeNullable();
  });

  it('tasteTags는 readonly 배열이다', () => {
    expectTypeOf<Player['tasteTags']>().toMatchTypeOf<readonly string[]>();
  });
});

describe('person.ts — PlayerState (E-11, 3일차 교차 점검 4축)', () => {
  it('능력치 보정 체인 3계수 입력(condition/fitness/familiaritySeasons)이 존재한다', () => {
    expectTypeOf<PlayerState>().toHaveProperty('condition').toEqualTypeOf<number>();
    expectTypeOf<PlayerState>().toHaveProperty('fitness').toEqualTypeOf<number>();
    expectTypeOf<PlayerState>().toHaveProperty('familiaritySeasons').toEqualTypeOf<number>();
  });

  it('리그/컵 카드 누적이 분리된 4필드로 존재한다(합치면 오판정, 파일 헤더 주석 근거)', () => {
    expectTypeOf<PlayerState>().toHaveProperty('yellowAccumulatedLeague');
    expectTypeOf<PlayerState>().toHaveProperty('yellowAccumulatedCup');
    expectTypeOf<PlayerState>().toHaveProperty('suspensionRemainingLeague');
    expectTypeOf<PlayerState>().toHaveProperty('suspensionRemainingCup');
  });

  it('teamId/onLoanTeamId/activeInjuryId는 nullable이다', () => {
    expectTypeOf<PlayerState['teamId']>().toBeNullable();
    expectTypeOf<PlayerState['onLoanTeamId']>().toBeNullable();
    expectTypeOf<PlayerState['activeInjuryId']>().toBeNullable();
  });
});

describe('person.ts — Manager/PlayerPosition (E-06, E-10)', () => {
  it('Manager.teamId는 nullable이다(공석 허용, T21)', () => {
    expectTypeOf<Manager['teamId']>().toBeNullable();
  });

  it('Manager.isActing이 존재한다(D-23 대행 판정, I-49, 8일차 신규)', () => {
    expectTypeOf<Manager>().toHaveProperty('isActing').toEqualTypeOf<boolean>();
  });

  it('PlayerPosition.proficiency는 number다(1~5, FR-PL-006)', () => {
    expectTypeOf<PlayerPosition>().toHaveProperty('proficiency').toEqualTypeOf<number>();
  });
});
