/**
 * salary.ts 테스트 — Task 029 / 22일차 산출물.
 *
 * 수락 기준("급여 이중 차감 0건")을 최우선으로 검증한다 — 같은 계약·같은 시즌에
 * `postSalaryPayment`를 두 번 호출하면 두 번째 호출이 반드시 던지는지 고정한다. 그 외
 * 성과 분배(순위 포인트 곡선) · 스폰서 수입(zero-sum)도 함께 검증한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import type { Contract, PointTransaction, PointTransactionId, Points, SeasonId, SponsorContract, TeamId } from '@/types';
import { installHardcodedFallback } from '@/lib/config/fallback';
import { invalidateConstants, setFallbackSource, setGlobalDefaultSource } from '@/lib/config/loader';
import {
  calculateLeagueFinishPoints,
  calculateWage,
  DuplicateSalaryPaymentError,
  postLeagueFinishPayout,
  postSalaryPayment,
  postSponsorIncome,
} from './salary';

afterEach(() => {
  setGlobalDefaultSource(null);
  setFallbackSource(null);
  invalidateConstants();
});

const WAGE_RATIO_TABLE = { RATIO: 0.18 };
const LEAGUE_FINISH_POINT_TABLE = {
  L1_BASE: 1500,
  L1_RANGE: 1500,
  L2_BASE: 850,
  L2_RANGE: 950,
  L3_BASE: 400,
  L3_RANGE: 600,
  EXP: 1.8,
};

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-1' as Contract['id'],
    playerId: 'player-1' as Contract['playerId'],
    teamId: 'team-1' as TeamId,
    startSeason: 1,
    endSeason: 3,
    wagePerSeason: 180 as Points,
    transferFeePaid: 1000 as Points,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('calculateWage', () => {
  it('몸값 × RATIO를 반올림한 정수를 반환한다', () => {
    expect(calculateWage(1000 as Points, { table: WAGE_RATIO_TABLE })).toBe(180);
  });

  it('override 없이도 하드코딩 폴백 소스(RATIO=0.18)로 계산한다', () => {
    installHardcodedFallback();
    expect(calculateWage(1000 as Points)).toBe(180);
  });
});

describe('postSalaryPayment — 급여 이중 차감 0건 (수락 기준)', () => {
  it('첫 지급은 정상적으로 잔고를 차감한다', () => {
    const record = postSalaryPayment(5000 as Points, {
      id: 'pt-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      teamId: 'team-1' as TeamId,
      contract: contract(),
      createdAt: '2026-08-19T00:00:00.000Z',
      existingTransactions: [],
    });
    expect(record.amount).toBe(-180);
    expect(record.balanceAfter).toBe(4820);
    expect(record.reasonCode).toBe('WAGE');
  });

  it('같은 계약·같은 시즌에 두 번째로 지급을 시도하면 DuplicateSalaryPaymentError를 던진다', () => {
    const first = postSalaryPayment(5000 as Points, {
      id: 'pt-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      teamId: 'team-1' as TeamId,
      contract: contract(),
      createdAt: '2026-08-19T00:00:00.000Z',
      existingTransactions: [],
    });

    expect(() =>
      postSalaryPayment(first.balanceAfter, {
        id: 'pt-2' as PointTransactionId,
        seasonId: 'season-1' as SeasonId,
        teamId: 'team-1' as TeamId,
        contract: contract(),
        createdAt: '2026-08-19T00:00:01.000Z',
        existingTransactions: [first],
      }),
    ).toThrow(DuplicateSalaryPaymentError);
  });

  it('같은 계약이라도 시즌이 다르면 다시 지급할 수 있다', () => {
    const first = postSalaryPayment(5000 as Points, {
      id: 'pt-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      teamId: 'team-1' as TeamId,
      contract: contract(),
      createdAt: '2026-08-19T00:00:00.000Z',
      existingTransactions: [],
    });

    const second = postSalaryPayment(first.balanceAfter, {
      id: 'pt-2' as PointTransactionId,
      seasonId: 'season-2' as SeasonId,
      teamId: 'team-1' as TeamId,
      contract: contract(),
      createdAt: '2026-08-19T00:00:01.000Z',
      existingTransactions: [first],
    });

    expect(second.balanceAfter).toBe(4640);
  });

  it('다른 계약의 WAGE 레코드가 있어도 이 계약 지급은 막지 않는다', () => {
    const otherContractRecord: PointTransaction = {
      id: 'pt-0' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      ownerType: 'TEAM',
      ownerId: 'team-1',
      amount: -50 as Points,
      reasonCode: 'WAGE',
      refType: 'Contract',
      refId: 'contract-9',
      balanceAfter: 4950 as Points,
      createdAt: '2026-08-19T00:00:00.000Z',
    };

    const record = postSalaryPayment(4950 as Points, {
      id: 'pt-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      teamId: 'team-1' as TeamId,
      contract: contract(),
      createdAt: '2026-08-19T00:00:01.000Z',
      existingTransactions: [otherContractRecord],
    });

    expect(record.amount).toBe(-180);
  });
});

describe('calculateLeagueFinishPoints — 순위 포인트 곡선', () => {
  it('1등은 BASE + RANGE(그 티어 최댓값)를 받는다', () => {
    const points = calculateLeagueFinishPoints(
      { rank: 1, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(points).toBe(3000);
  });

  it('꼴찌는 BASE(그 티어 최솟값)를 받는다', () => {
    const points = calculateLeagueFinishPoints(
      { rank: 20, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(points).toBe(1500);
  });

  it('순위가 좋을수록 포인트가 커진다(단조성)', () => {
    const better = calculateLeagueFinishPoints(
      { rank: 3, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    const worse = calculateLeagueFinishPoints(
      { rank: 10, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(better).toBeGreaterThan(worse);
  });

  it('티어별로 다른 BASE/RANGE를 쓴다', () => {
    const tier1 = calculateLeagueFinishPoints(
      { rank: 1, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    const tier3 = calculateLeagueFinishPoints(
      { rank: 1, teamCount: 20, leagueTier: 3 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(tier3).toBeLessThan(tier1);
  });

  it('teamCount가 1이어도(분모 0 방어) NaN이 아닌 정수를 반환한다', () => {
    const points = calculateLeagueFinishPoints(
      { rank: 1, teamCount: 1, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(Number.isInteger(points)).toBe(true);
  });

  it('범위를 벗어난 rank(잘못된 호출)에서도 BASE~BASE+RANGE 안의 정수를 반환한다', () => {
    const below = calculateLeagueFinishPoints(
      { rank: -5, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    const above = calculateLeagueFinishPoints(
      { rank: 999, teamCount: 20, leagueTier: 1 },
      { table: LEAGUE_FINISH_POINT_TABLE },
    );
    expect(below).toBe(3000);
    expect(above).toBe(1500);
  });
});

describe('postLeagueFinishPayout', () => {
  it('산출된 포인트를 팀 잔고에 더한다', () => {
    const record = postLeagueFinishPayout(1000 as Points, {
      id: 'pt-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      teamId: 'team-1' as TeamId,
      points: 3000 as Points,
      createdAt: '2026-08-19T00:00:00.000Z',
    });
    expect(record.balanceAfter).toBe(4000);
    expect(record.reasonCode).toBe('LEAGUE_FINISH');
  });
});

describe('postSponsorIncome — zero-sum(NFR-QA-005)', () => {
  function sponsorContract(overrides: Partial<SponsorContract> = {}): SponsorContract {
    return {
      id: 'sponsor-contract-1' as SponsorContract['id'],
      sponsorId: 'sponsor-1' as SponsorContract['sponsorId'],
      teamId: 'team-1' as TeamId,
      startSeason: 1,
      endSeason: 5,
      incomePerSeason: 300 as Points,
      sharePct: 10,
      status: 'ACTIVE',
      ...overrides,
    };
  }

  it('팀 잔고는 늘고 스폰서 잔고는 같은 금액만큼 준다', () => {
    const result = postSponsorIncome({
      teamTransactionId: 'pt-team-1' as PointTransactionId,
      sponsorTransactionId: 'pt-sponsor-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      sponsorContract: sponsorContract(),
      teamBalance: 1000 as Points,
      sponsorBalance: 5000 as Points,
      createdAt: '2026-08-19T00:00:00.000Z',
    });

    expect(result.teamTransaction.balanceAfter).toBe(1300);
    expect(result.sponsorTransaction.balanceAfter).toBe(4700);

    const teamDelta = result.teamTransaction.balanceAfter - 1000;
    const sponsorDelta = result.sponsorTransaction.balanceAfter - 5000;
    expect(teamDelta + sponsorDelta).toBe(0);
  });

  it('두 레코드 모두 같은 SponsorContract를 참조한다', () => {
    const result = postSponsorIncome({
      teamTransactionId: 'pt-team-1' as PointTransactionId,
      sponsorTransactionId: 'pt-sponsor-1' as PointTransactionId,
      seasonId: 'season-1' as SeasonId,
      sponsorContract: sponsorContract(),
      teamBalance: 1000 as Points,
      sponsorBalance: 5000 as Points,
      createdAt: '2026-08-19T00:00:00.000Z',
    });

    expect(result.teamTransaction.refType).toBe('SponsorContract');
    expect(result.sponsorTransaction.refType).toBe('SponsorContract');
    expect(result.teamTransaction.refId).toBe('sponsor-contract-1');
    expect(result.sponsorTransaction.refId).toBe('sponsor-contract-1');
  });
});
