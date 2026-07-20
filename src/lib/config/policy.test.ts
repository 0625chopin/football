/**
 * policy.ts 테스트 — Task 003 / 11일차 산출물.
 *
 * FR-AD-013(발효 시점 규칙) 3종 판정 로직과 `isPolicyEffective` 단일 진입점이 각 정책에
 * 올바르게 위임하는지 검증한다.
 *
 * vitest.config.ts가 아직 없어 `@/*` 별칭이 테스트에서 해석되지 않으므로(CLAUDE.md),
 * 이 파일은 상대경로 import만 사용한다(loader.test.ts 관례). `CommonCodeApplyPolicy`는
 * 리터럴 문자열로 직접 사용한다(타입만 필요하므로 별칭 문제와 무관).
 */

import { describe, expect, it } from 'vitest';
import {
  isPolicyEffective,
  resolveImmediateEffective,
  resolveNextMarketEffective,
  resolveNextSeasonEffective,
  type PolicyEffectContext,
} from './policy';

function ctx(overrides: Partial<PolicyEffectContext> = {}): PolicyEffectContext {
  return {
    currentSeason: 3,
    effectiveFromSeason: null,
    isMarketAlreadyOpened: false,
    ...overrides,
  };
}

describe('resolveNextSeasonEffective', () => {
  it('effectiveFromSeason이 null이면 미발효다', () => {
    expect(resolveNextSeasonEffective(ctx({ effectiveFromSeason: null }))).toBe(false);
  });

  it('effectiveFromSeason이 현재 시즌보다 미래면 미발효다', () => {
    expect(
      resolveNextSeasonEffective(ctx({ currentSeason: 3, effectiveFromSeason: 4 })),
    ).toBe(false);
  });

  it('effectiveFromSeason이 현재 시즌 이하면 발효된다', () => {
    expect(
      resolveNextSeasonEffective(ctx({ currentSeason: 3, effectiveFromSeason: 3 })),
    ).toBe(true);
    expect(
      resolveNextSeasonEffective(ctx({ currentSeason: 3, effectiveFromSeason: 2 })),
    ).toBe(true);
  });
});

describe('resolveImmediateEffective', () => {
  it('컨텍스트와 무관하게 항상 발효된다', () => {
    expect(resolveImmediateEffective(ctx())).toBe(true);
    expect(resolveImmediateEffective(ctx({ effectiveFromSeason: 999 }))).toBe(true);
  });
});

describe('resolveNextMarketEffective', () => {
  it('이미 개설된 마켓이 있으면 미발효다', () => {
    expect(resolveNextMarketEffective(ctx({ isMarketAlreadyOpened: true }))).toBe(false);
  });

  it('개설된 마켓이 없으면 발효된다', () => {
    expect(resolveNextMarketEffective(ctx({ isMarketAlreadyOpened: false }))).toBe(true);
  });
});

describe('isPolicyEffective — 단일 진입점', () => {
  it('NEXT_SEASON 정책을 resolveNextSeasonEffective에 위임한다', () => {
    expect(
      isPolicyEffective('NEXT_SEASON', ctx({ currentSeason: 5, effectiveFromSeason: 5 })),
    ).toBe(true);
    expect(
      isPolicyEffective('NEXT_SEASON', ctx({ currentSeason: 5, effectiveFromSeason: 6 })),
    ).toBe(false);
  });

  it('IMMEDIATE 정책을 resolveImmediateEffective에 위임한다', () => {
    expect(isPolicyEffective('IMMEDIATE', ctx())).toBe(true);
  });

  it('NEXT_MARKET 정책을 resolveNextMarketEffective에 위임한다', () => {
    expect(isPolicyEffective('NEXT_MARKET', ctx({ isMarketAlreadyOpened: true }))).toBe(false);
    expect(isPolicyEffective('NEXT_MARKET', ctx({ isMarketAlreadyOpened: false }))).toBe(true);
  });
});
