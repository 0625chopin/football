/**
 * ledger.ts 테스트 — Task 029 / 20일차 산출물.
 *
 * 수락 기준("원장 없는 잔고 변동 0건")을 "잔고를 바꾸는 함수는 항상 PointTransaction
 * 레코드를 반환하고, 그 레코드의 balanceAfter가 곧 새 잔고다"로 검증한다. 더불어
 * DC-08(정수 고정)과 NFR-QA-005(원장 합 = 잔고) 항등식을 확인한다.
 */

import { describe, expect, it } from 'vitest';
import type { PointTransactionId, Points, SeasonId } from '@/types';
import { deriveBalance, NonIntegerPointsError, postPointTransaction } from './ledger';

function txInput(overrides: Partial<Parameters<typeof postPointTransaction>[1]> = {}) {
  return {
    id: 'pt-1' as PointTransactionId,
    seasonId: 'season-1' as SeasonId,
    ownerType: 'TEAM' as const,
    ownerId: 'team-1',
    amount: 1000 as Points,
    reasonCode: 'LEAGUE_FINISH' as const,
    refType: 'Season',
    refId: 'season-1',
    createdAt: '2026-08-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('postPointTransaction', () => {
  it('현재 잔고에 amount를 더한 값을 balanceAfter로 갖는 레코드를 반환한다', () => {
    const record = postPointTransaction(5000 as Points, txInput({ amount: 1200 as Points }));
    expect(record.balanceAfter).toBe(6200);
    expect(record.amount).toBe(1200);
  });

  it('음수 amount(지출)도 정상 반영한다', () => {
    const record = postPointTransaction(
      5000 as Points,
      txInput({ amount: -800 as Points, reasonCode: 'WAGE' }),
    );
    expect(record.balanceAfter).toBe(4200);
  });

  it('입력 필드를 그대로 레코드에 옮긴다(원장이 유일한 근거)', () => {
    const input = txInput({ refType: 'Transfer', refId: 'transfer-9' });
    const record = postPointTransaction(0 as Points, input);
    expect(record).toMatchObject({
      id: input.id,
      seasonId: input.seasonId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      reasonCode: input.reasonCode,
      refType: 'Transfer',
      refId: 'transfer-9',
      createdAt: input.createdAt,
    });
  });

  it('DC-08: currentBalance가 정수가 아니면 던진다', () => {
    expect(() => postPointTransaction(100.5 as Points, txInput())).toThrow(
      NonIntegerPointsError,
    );
  });

  it('DC-08: amount가 정수가 아니면 던진다', () => {
    expect(() =>
      postPointTransaction(1000 as Points, txInput({ amount: 0.1 as Points })),
    ).toThrow(NonIntegerPointsError);
  });
});

describe('deriveBalance', () => {
  it('빈 원장은 잔고 0이다', () => {
    expect(deriveBalance([])).toBe(0);
  });

  it('원장 전체 합이 잔고다(NFR-QA-005 회계 항등식)', () => {
    const first = postPointTransaction(0 as Points, txInput({ amount: 3000 as Points }));
    const second = postPointTransaction(
      first.balanceAfter,
      txInput({ id: 'pt-2' as PointTransactionId, amount: -500 as Points, reasonCode: 'WAGE' }),
    );
    expect(deriveBalance([first, second])).toBe(second.balanceAfter);
    expect(deriveBalance([first, second])).toBe(2500);
  });
});
