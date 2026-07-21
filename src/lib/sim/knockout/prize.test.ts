/**
 * prize.ts 테스트 — Task 027 / 45일차 산출물.
 *
 * 완료 판정 "승격 팀 수 불변"을 증명하는 대상은 없다(이 파일은 승격을 아예 계산하지
 * 않는다는 것 자체가 그 판정의 근거 — export 목록에 승격 관련 함수가 없다). 대신
 * FR-EC-003/FR-EC-004 상금표 값 일치, 리그별 유효 placement 검증, 자이언트킬링 티어 차
 * 계산을 값으로 증명한다.
 */

import { describe, expect, it } from 'vitest';
import {
  CUP_PRIZE_DEFAULT,
  PLAYOFF_PRIZE_DEFAULT,
  resolveCupPrize,
  resolveGiantKillingBonus,
  resolvePlayoffPrize,
} from './prize';

describe('resolvePlayoffPrize — FR-EC-003', () => {
  it('리그1 5종 성적이 요구사항 표와 정확히 일치한다', () => {
    expect(resolvePlayoffPrize(1, 'WIN')).toEqual({ amount: 1500, reasonCode: 'PLAYOFF_PRIZE' });
    expect(resolvePlayoffPrize(1, 'RUNNERUP')).toEqual({
      amount: 800,
      reasonCode: 'PLAYOFF_PRIZE',
    });
    expect(resolvePlayoffPrize(1, 'SEMIFINAL_OUT').amount).toBe(400);
    expect(resolvePlayoffPrize(1, 'QUARTERFINAL_OUT').amount).toBe(200);
    expect(resolvePlayoffPrize(1, 'WILDCARD_OUT').amount).toBe(100);
  });

  it('리그2 3종 성적이 요구사항 표와 일치한다', () => {
    expect(resolvePlayoffPrize(2, 'WIN').amount).toBe(800);
    expect(resolvePlayoffPrize(2, 'RUNNERUP').amount).toBe(400);
    expect(resolvePlayoffPrize(2, 'SEMIFINAL_OUT').amount).toBe(200);
  });

  it('리그3 2종 성적이 요구사항 표와 일치한다(카탈로그 등록값 L1_WIN/L3_RUNNERUP과도 일치)', () => {
    expect(resolvePlayoffPrize(3, 'WIN').amount).toBe(400);
    expect(resolvePlayoffPrize(3, 'RUNNERUP').amount).toBe(200);
  });

  it('리그2/3에 존재하지 않는 성적 조합은 RangeError', () => {
    expect(() => resolvePlayoffPrize(2, 'QUARTERFINAL_OUT')).toThrow(RangeError);
    expect(() => resolvePlayoffPrize(2, 'WILDCARD_OUT')).toThrow(RangeError);
    expect(() => resolvePlayoffPrize(3, 'SEMIFINAL_OUT')).toThrow(RangeError);
    expect(() => resolvePlayoffPrize(3, 'QUARTERFINAL_OUT')).toThrow(RangeError);
    expect(() => resolvePlayoffPrize(3, 'WILDCARD_OUT')).toThrow(RangeError);
  });

  it('유효 범위 밖 tier는 RangeError', () => {
    // @ts-expect-error 런타임 방어 검증(4 등 범위 밖 tier 유입 방어)
    expect(() => resolvePlayoffPrize(4, 'WIN')).toThrow(RangeError);
  });

  it('테이블을 주입하면 주입된 값을 그대로 쓴다(I-83 패턴)', () => {
    const override = { ...PLAYOFF_PRIZE_DEFAULT, L1_WIN: 9999 };
    expect(resolvePlayoffPrize(1, 'WIN', override).amount).toBe(9999);
  });
});

describe('resolveCupPrize — FR-EC-004', () => {
  it('7종 성적이 요구사항 표와 정확히 일치한다', () => {
    expect(resolveCupPrize('WIN')).toEqual({ amount: 2000, reasonCode: 'CUP_PRIZE' });
    expect(resolveCupPrize('RUNNERUP').amount).toBe(1000);
    expect(resolveCupPrize('SEMIFINAL_OUT').amount).toBe(500);
    expect(resolveCupPrize('QUARTERFINAL_OUT').amount).toBe(250);
    expect(resolveCupPrize('ROUND_OF_16_OUT').amount).toBe(120);
    expect(resolveCupPrize('ROUND_OF_32_OUT').amount).toBe(60);
    expect(resolveCupPrize('ROUND_1_OUT').amount).toBe(30);
  });

  it('테이블을 주입하면 주입된 값을 그대로 쓴다', () => {
    const override = { ...CUP_PRIZE_DEFAULT, WIN: 1 };
    expect(resolveCupPrize('WIN', override).amount).toBe(1);
  });
});

describe('resolveGiantKillingBonus — FR-EC-004 "티어 차당 +100pt"', () => {
  it('하위 티어(숫자 큼) 승리 시 티어 차 × 단가', () => {
    expect(resolveGiantKillingBonus(3, 1)).toEqual({
      amount: 200,
      reasonCode: 'GIANT_KILLING_BONUS',
    });
    expect(resolveGiantKillingBonus(2, 1)?.amount).toBe(100);
    expect(resolveGiantKillingBonus(3, 2)?.amount).toBe(100);
  });

  it('같은 티어 대결은 보너스 없음(null)', () => {
    expect(resolveGiantKillingBonus(1, 1)).toBeNull();
    expect(resolveGiantKillingBonus(2, 2)).toBeNull();
  });

  it('상위 티어가 이긴 통상적 결과는 보너스 없음(null)', () => {
    expect(resolveGiantKillingBonus(1, 3)).toBeNull();
    expect(resolveGiantKillingBonus(1, 2)).toBeNull();
  });

  it('단가를 주입하면 주입된 단가로 계산한다', () => {
    expect(resolveGiantKillingBonus(3, 1, { ...CUP_PRIZE_DEFAULT, GIANT_KILLING: 50 })?.amount).toBe(
      100,
    );
  });
});
