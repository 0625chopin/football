/**
 * `economy.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: DC-08(포인트 정수 고정)·NFR-QA-005(회계 항등식) 관련 필드가 정확한 브랜드/nullable
 * 여부를 갖는지, 다형 참조(PointTransaction.ownerId)가 의도대로 원시 string인지 고정한다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { Contract, Loan, PointTransaction, Sponsor, SponsorContract, Transfer } from './economy';

describe('economy.ts — 금액 필드는 전부 Points 브랜드다 (DC-08)', () => {
  it('Contract.wagePerSeason / transferFeePaid는 Points다', () => {
    expectTypeOf<Contract>().toHaveProperty('wagePerSeason').toMatchTypeOf<number>();
    expectTypeOf<Contract>().toHaveProperty('transferFeePaid').toMatchTypeOf<number>();
  });

  it('PointTransaction.amount/balanceAfter는 Points다(부호 있음, 원장 SSOT)', () => {
    expectTypeOf<PointTransaction>().toHaveProperty('amount').toMatchTypeOf<number>();
    expectTypeOf<PointTransaction>().toHaveProperty('balanceAfter').toMatchTypeOf<number>();
  });
});

describe('economy.ts — 다형 참조는 원시 string이다 (브랜드 통합 없음, 05:415)', () => {
  it('PointTransaction.ownerId는 TeamId | SponsorId 유니온이 아니라 string이다', () => {
    expectTypeOf<PointTransaction>().toHaveProperty('ownerId').toEqualTypeOf<string>();
  });

  it('PointTransaction.refType/refId도 string이다(구체 리터럴은 소비 시점 확정)', () => {
    expectTypeOf<PointTransaction>().toHaveProperty('refType').toEqualTypeOf<string>();
    expectTypeOf<PointTransaction>().toHaveProperty('refId').toEqualTypeOf<string>();
  });
});

describe('economy.ts — nullable 필드 (FA 영입·부도·트레이드)', () => {
  it('Transfer.fromTeamId는 FA 영입 시 null이다(D-16/D-17)', () => {
    expectTypeOf<Transfer['fromTeamId']>().toBeNullable();
  });

  it('Transfer.tradeCounterpartPlayerId는 TRADE가 아니면 null이다', () => {
    expectTypeOf<Transfer['tradeCounterpartPlayerId']>().toBeNullable();
  });

  it('Sponsor.bankruptAtSeason은 정상 상태면 null이다', () => {
    expectTypeOf<Sponsor['bankruptAtSeason']>().toBeNullable();
  });

  it('Loan/SponsorContract 상태 필드가 존재한다(enum 단일 선언 참조, C-6)', () => {
    expectTypeOf<Loan>().toHaveProperty('status');
    expectTypeOf<SponsorContract>().toHaveProperty('status');
  });
});
