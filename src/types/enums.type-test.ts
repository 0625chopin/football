/**
 * `enums.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: 6일차 "enum성 값 단일 선언" 완료 판정(작업표)이 못박은 개수(이벤트 23종·포지션
 * 11군·부상 4등급·전술 6종·페이즈 6종)가 이후 실수로 줄거나 늘어나면 `tsc`가 즉시 잡도록
 * 유니온 전량을 리터럴로 고정한다. `toEqualTypeOf`는 **완전 일치**를 요구하므로 멤버가 하나만
 * 추가/삭제돼도 컴파일 오류가 난다 — "중복 enum 선언 0건"과는 별개로 "멤버 누락 0건"을 검증.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  AuditActorType,
  BetMarketStatus,
  CronRunStatus,
  InjurySeverity,
  ManagerStyle,
  MatchEventType,
  Position,
  SeasonPhase,
} from './enums';

describe('enums.ts — 6일차 확정 목록 개수 고정', () => {
  it('SeasonPhase는 6종(REGULAR·CUP_SLOT·PLAYOFF·TIEBREAK·SETTLEMENT·PRESEASON)이다 (D-27)', () => {
    expectTypeOf<SeasonPhase>().toEqualTypeOf<
      'REGULAR' | 'CUP_SLOT' | 'PLAYOFF' | 'TIEBREAK' | 'SETTLEMENT' | 'PRESEASON'
    >();
  });

  it('ManagerStyle은 6종이다 (FR-MT-009)', () => {
    expectTypeOf<ManagerStyle>().toEqualTypeOf<
      'ATTACKING' | 'BALANCED' | 'DEFENSIVE' | 'COUNTER' | 'POSSESSION' | 'HIGH_PRESS'
    >();
  });

  it('Position은 11군이다 (FR-PL-005)', () => {
    expectTypeOf<Position>().toEqualTypeOf<
      'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'ST' | 'SS'
    >();
  });

  it('InjurySeverity는 4등급이다 (FR-PL-009)', () => {
    expectTypeOf<InjurySeverity>().toEqualTypeOf<'KNOCK' | 'MINOR' | 'MODERATE' | 'SEVERE'>();
  });

  it('MatchEventType은 23종이다 (FR-MT-002) — I-43·I-44는 발생 규칙이지 값 목록 변경이 아니다', () => {
    expectTypeOf<MatchEventType>().toEqualTypeOf<
      | 'KICKOFF'
      | 'SHOT_ON'
      | 'SHOT_OFF'
      | 'SHOT_BLOCKED'
      | 'GOAL'
      | 'ASSIST'
      | 'OWN_GOAL'
      | 'PENALTY_AWARDED'
      | 'PENALTY_SCORED'
      | 'PENALTY_MISSED'
      | 'YELLOW_CARD'
      | 'SECOND_YELLOW'
      | 'RED_CARD'
      | 'FOUL'
      | 'OFFSIDE'
      | 'CORNER'
      | 'SAVE'
      | 'INJURY'
      | 'SUBSTITUTION'
      | 'HALF_TIME'
      | 'FULL_TIME'
      | 'EXTRA_TIME_START'
      | 'PENALTY_SHOOTOUT'
    >();
  });

  it('BetMarketStatus는 4종이다 (05:463)', () => {
    expectTypeOf<BetMarketStatus>().toEqualTypeOf<'OPEN' | 'CLOSED' | 'SETTLED' | 'VOIDED'>();
  });
});

describe('enums.ts — 8일차 신규(E-45~47 대응)', () => {
  it('CronRunStatus는 4종이다 (05:680)', () => {
    expectTypeOf<CronRunStatus>().toEqualTypeOf<'SUCCESS' | 'PARTIAL' | 'FAILED' | 'NOOP'>();
  });

  it('AuditActorType은 4종이다 (05:701)', () => {
    expectTypeOf<AuditActorType>().toEqualTypeOf<'HUMAN' | 'ENGINE' | 'ODDS' | 'SETTLEMENT'>();
  });
});
