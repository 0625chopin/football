/**
 * `betting.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: E-33~E-40(2차 릴리스 선정의)도 "선정의"일 뿐 타입 정확성은 동일 기준으로 검증한다.
 * `Bet.serverReceivedAt`(C-23, 사후 배팅 차단 041의 서버 측 증거 필드)이 nullable이 아님을
 * 특히 고정한다 — 이 필드가 옵셔널로 풀리면 041 침투 테스트의 전제가 깨진다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { Bet, BetLeg, BetMarket, BetSelection, Odds, User, Wallet, WalletTransaction } from './betting';

describe('betting.ts — Bet (E-36) C-23 서버 증거 필드', () => {
  it('serverReceivedAt/ipHash는 필수다(옵셔널이면 041 침투 테스트 전제가 깨짐)', () => {
    expectTypeOf<Bet>().toHaveProperty('serverReceivedAt').not.toBeNullable();
    expectTypeOf<Bet>().toHaveProperty('ipHash').not.toBeNullable();
  });

  it('settledAt은 정산 전 null이다', () => {
    expectTypeOf<Bet['settledAt']>().toBeNullable();
  });
});

describe('betting.ts — BetMarket/BetSelection/Odds (E-33~35)', () => {
  it('BetMarket.marketType은 아직 string이다(2차 설계 시점 구체화, 선정의)', () => {
    expectTypeOf<BetMarket>().toHaveProperty('marketType').toEqualTypeOf<string>();
  });

  it('BetMarket.snapshotId는 결정론 보장을 위해 필수다(FR-AD-014)', () => {
    expectTypeOf<BetMarket>().toHaveProperty('snapshotId').not.toBeNullable();
  });

  it('Odds.isCurrent로 최신값을 구분한다(이력 테이블 설계, R-08)', () => {
    expectTypeOf<Odds>().toHaveProperty('isCurrent').toEqualTypeOf<boolean>();
  });

  it('BetSelection.probability는 number다(0~1)', () => {
    expectTypeOf<BetSelection>().toHaveProperty('probability').toEqualTypeOf<number>();
  });
});

describe('betting.ts — BetLeg/User/Wallet/WalletTransaction (E-37~40)', () => {
  it('WalletTransaction.refBetId는 BET_* 사유가 아니면 null이다', () => {
    expectTypeOf<WalletTransaction['refBetId']>().toBeNullable();
  });

  it('Wallet.userId는 1:1 PK로 필수다', () => {
    expectTypeOf<Wallet>().toHaveProperty('userId').not.toBeNullable();
  });

  it('User.role은 UserRole 유니온이다', () => {
    expectTypeOf<User>().toHaveProperty('role');
  });

  it('BetLeg는 복합키(betId+selectionId) + 동결 배당 + 결과로 구성된다', () => {
    expectTypeOf<keyof BetLeg>().toEqualTypeOf<'betId' | 'selectionId' | 'oddsAtPlacement' | 'result'>();
  });
});
