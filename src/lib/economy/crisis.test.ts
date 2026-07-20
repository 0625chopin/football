/**
 * crisis.ts 테스트 — Task 029 / 25일차 산출물.
 *
 * 수락 기준("음수 잔고 팀 탐지")을 최우선으로 고정하고, FR-EC-012의 나머지 조건(위기
 * 진입/회복 전이, 2시즌 연속 명성 −5, 강제 매각 트리거)도 함께 경계값으로 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { Points, Seed, Team, TeamId } from '@/types';
import { detectNegativeBalanceTeams, judgeFinancialCrisis } from './crisis';

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1' as TeamId,
    name: 'Test FC',
    shortName: 'TFC',
    foundedSeason: 2000,
    stadiumName: 'Test Stadium',
    stadiumCapacity: 30000,
    colorPrimary: '#000000',
    colorSecondary: '#ffffff',
    crestSeed: 1 as Seed,
    reputation: 50,
    fanBase: 10000,
    academyLevel: 3,
    balance: 1000 as Points,
    financialCrisis: false,
    crisisConsecutiveSeasons: 0,
    ...overrides,
  };
}

describe('detectNegativeBalanceTeams — 수락 기준 "음수 잔고 팀 탐지"', () => {
  it('음수 잔고 팀만 걸러낸다', () => {
    const teams = [
      team({ id: 'team-1' as TeamId, balance: -1 as Points }),
      team({ id: 'team-2' as TeamId, balance: 0 as Points }),
      team({ id: 'team-3' as TeamId, balance: -500 as Points }),
      team({ id: 'team-4' as TeamId, balance: 500 as Points }),
    ];

    const result = detectNegativeBalanceTeams(teams);

    expect(result.map((t) => t.id)).toEqual(['team-1', 'team-3']);
  });

  it('음수 잔고 팀이 없으면 빈 배열이다', () => {
    const teams = [team({ balance: 0 as Points }), team({ balance: 100 as Points })];
    expect(detectNegativeBalanceTeams(teams)).toEqual([]);
  });
});

describe('judgeFinancialCrisis — 위기 진입/지속', () => {
  it('잔고가 음수면 financialCrisis를 true로 설정하고 강제 매각을 트리거한다', () => {
    const result = judgeFinancialCrisis(team({ balance: -1 as Points, financialCrisis: false }));

    expect(result.team.financialCrisis).toBe(true);
    expect(result.team.crisisConsecutiveSeasons).toBe(1);
    expect(result.forcedSaleTriggered).toBe(true);
  });

  it('연속 위기 시즌 수를 누적한다', () => {
    const result = judgeFinancialCrisis(
      team({ balance: -1 as Points, financialCrisis: true, crisisConsecutiveSeasons: 3 }),
    );
    expect(result.team.crisisConsecutiveSeasons).toBe(4);
  });

  it('연속 위기가 정확히 2시즌째면 명성을 5 차감한다', () => {
    const result = judgeFinancialCrisis(
      team({ balance: -1 as Points, financialCrisis: true, crisisConsecutiveSeasons: 1, reputation: 50 }),
    );
    expect(result.team.crisisConsecutiveSeasons).toBe(2);
    expect(result.team.reputation).toBe(45);
  });

  it('3시즌째 이후로는 추가 차감이 없다', () => {
    const result = judgeFinancialCrisis(
      team({ balance: -1 as Points, financialCrisis: true, crisisConsecutiveSeasons: 2, reputation: 45 }),
    );
    expect(result.team.crisisConsecutiveSeasons).toBe(3);
    expect(result.team.reputation).toBe(45);
  });

  it('명성 차감으로 0 미만이 되지 않는다', () => {
    const result = judgeFinancialCrisis(
      team({ balance: -1 as Points, financialCrisis: true, crisisConsecutiveSeasons: 1, reputation: 3 }),
    );
    expect(result.team.reputation).toBe(0);
  });
});

describe('judgeFinancialCrisis — 회복', () => {
  it('잔고가 0 이상이면 즉시 회복해 플래그와 연속 카운트를 리셋한다', () => {
    const result = judgeFinancialCrisis(
      team({ balance: 0 as Points, financialCrisis: true, crisisConsecutiveSeasons: 4, reputation: 30 }),
    );

    expect(result.team.financialCrisis).toBe(false);
    expect(result.team.crisisConsecutiveSeasons).toBe(0);
    expect(result.forcedSaleTriggered).toBe(false);
    expect(result.team.reputation).toBe(30);
  });

  it('원래 위기가 아니었던 팀은 잔고가 정상이면 상태가 그대로다', () => {
    const result = judgeFinancialCrisis(team({ balance: 100 as Points, financialCrisis: false }));
    expect(result.team.financialCrisis).toBe(false);
    expect(result.team.crisisConsecutiveSeasons).toBe(0);
    expect(result.forcedSaleTriggered).toBe(false);
  });
});
