/**
 * sponsor.ts 테스트 — Task 029 / 23~24일차 산출물.
 *
 * 23일차 수락 기준("팀당 활성 계약 ≤ 3")을 최우선으로 검증한다 — 이미 3건 활성 계약이 있는
 * 팀에 제안하면 반드시 던지는지 고정한다. 그 외 계약 기간 클램프(1~10시즌)·명성
 * 비례 제안 금액도 함께 검증한다. 24일차분은 부도 판정("계약 전건 VOIDED")을 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type {
  ClubOwner,
  ClubOwnerId,
  NewsFeedItemId,
  SeasonId,
  Sponsor,
  SponsorContract,
  SponsorContractId,
  TeamId,
  Timestamp,
} from '@/types';
import {
  calculateSponsorIncome,
  judgeSponsorBankruptcy,
  proposeSponsorContract,
  SponsorSlotLimitExceededError,
} from './sponsor';

const SPONSOR_PARAM_TABLE = {
  MAX_PER_TEAM: 3,
  CONTRACT_MIN: 1,
  CONTRACT_MAX: 10,
  SHARE_PCT_CAP: 30,
  POOL_MIN: 40,
  INCOME_BASE: 100,
  INCOME_REP_STEP: 8,
};

function sponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: 'sponsor-1' as Sponsor['id'],
    name: 'Acme Corp',
    industry: 'TECH',
    scale: 3,
    balance: 5000 as Sponsor['balance'],
    reputation: 50,
    bankruptAtSeason: null,
    ...overrides,
  };
}

function activeContract(overrides: Partial<SponsorContract> = {}): SponsorContract {
  return {
    id: 'sponsor-contract-x' as SponsorContractId,
    sponsorId: 'sponsor-x' as SponsorContract['sponsorId'],
    teamId: 'team-1' as TeamId,
    signedByOwnerId: 'owner-x' as ClubOwnerId,
    startSeason: 1,
    endSeason: 5,
    incomePerSeason: 300 as SponsorContract['incomePerSeason'],
    sharePct: 10,
    status: 'ACTIVE',
    ...overrides,
  };
}

function owner(overrides: Partial<Pick<ClubOwner, 'id' | 'wealth' | 'negotiation' | 'reputation'>> = {}) {
  return {
    id: 'owner-1' as ClubOwnerId,
    wealth: 15,
    negotiation: 15,
    reputation: 50,
    ...overrides,
  };
}

describe('calculateSponsorIncome — 명성 비례 제안 금액', () => {
  it('팀 명성이 높을수록 제안 금액이 커진다(단조성)', () => {
    const low = calculateSponsorIncome(
      { teamReputation: 10, sponsorScale: 3 },
      { table: SPONSOR_PARAM_TABLE },
    );
    const high = calculateSponsorIncome(
      { teamReputation: 90, sponsorScale: 3 },
      { table: SPONSOR_PARAM_TABLE },
    );
    expect(high).toBeGreaterThan(low);
  });

  it('스폰서 규모가 클수록 같은 명성이라도 제안 금액이 커진다', () => {
    const small = calculateSponsorIncome(
      { teamReputation: 50, sponsorScale: 1 },
      { table: SPONSOR_PARAM_TABLE },
    );
    const large = calculateSponsorIncome(
      { teamReputation: 50, sponsorScale: 5 },
      { table: SPONSOR_PARAM_TABLE },
    );
    expect(large).toBeGreaterThan(small);
  });

  it('음수 명성이 들어와도(잘못된 호출) NaN이 아닌 정수를 반환한다', () => {
    const points = calculateSponsorIncome(
      { teamReputation: -20, sponsorScale: 2 },
      { table: SPONSOR_PARAM_TABLE },
    );
    expect(Number.isInteger(points)).toBe(true);
  });
});

describe('proposeSponsorContract — 팀당 활성 계약 ≤ 3 (수락 기준)', () => {
  it('활성 계약이 없으면 정상적으로 ACTIVE 계약을 만든다', () => {
    const contract = proposeSponsorContract(
      {
        id: 'sponsor-contract-1' as SponsorContractId,
        sponsor: sponsor(),
        teamId: 'team-1' as TeamId,
        teamReputation: 50,
        startSeason: 5,
        requestedSeasonLength: 3,
        existingContractsForTeam: [],
        owner: owner(),
      },
      { table: SPONSOR_PARAM_TABLE },
    );

    expect(contract.status).toBe('ACTIVE');
    expect(contract.startSeason).toBe(5);
    expect(contract.endSeason).toBe(7);
  });

  it('활성 계약이 이미 MAX_PER_TEAM(3)건이면 SponsorSlotLimitExceededError를 던진다', () => {
    const existing = [
      activeContract({ id: 'c1' as SponsorContractId }),
      activeContract({ id: 'c2' as SponsorContractId }),
      activeContract({ id: 'c3' as SponsorContractId }),
    ];

    expect(() =>
      proposeSponsorContract(
        {
          id: 'sponsor-contract-4' as SponsorContractId,
          sponsor: sponsor(),
          teamId: 'team-1' as TeamId,
          teamReputation: 50,
          startSeason: 5,
          requestedSeasonLength: 3,
          existingContractsForTeam: existing,
          owner: owner(),
        },
        { table: SPONSOR_PARAM_TABLE },
      ),
    ).toThrow(SponsorSlotLimitExceededError);
  });

  it('만료(EXPIRED)·해지(VOIDED) 계약은 슬롯 카운트에 넣지 않는다', () => {
    const existing = [
      activeContract({ id: 'c1' as SponsorContractId, status: 'EXPIRED' }),
      activeContract({ id: 'c2' as SponsorContractId, status: 'VOIDED' }),
      activeContract({ id: 'c3' as SponsorContractId, status: 'ACTIVE' }),
    ];

    const contract = proposeSponsorContract(
      {
        id: 'sponsor-contract-4' as SponsorContractId,
        sponsor: sponsor(),
        teamId: 'team-1' as TeamId,
        teamReputation: 50,
        startSeason: 5,
        requestedSeasonLength: 3,
        existingContractsForTeam: existing,
        owner: owner(),
      },
      { table: SPONSOR_PARAM_TABLE },
    );

    expect(contract.status).toBe('ACTIVE');
  });

  it('희망 기간이 범위를 벗어나도(0, 999) 1~10시즌으로 클램프된다', () => {
    const tooShort = proposeSponsorContract(
      {
        id: 'sponsor-contract-a' as SponsorContractId,
        sponsor: sponsor(),
        teamId: 'team-1' as TeamId,
        teamReputation: 50,
        startSeason: 1,
        requestedSeasonLength: 0,
        existingContractsForTeam: [],
        owner: owner(),
      },
      { table: SPONSOR_PARAM_TABLE },
    );
    const tooLong = proposeSponsorContract(
      {
        id: 'sponsor-contract-b' as SponsorContractId,
        sponsor: sponsor(),
        teamId: 'team-1' as TeamId,
        teamReputation: 50,
        startSeason: 1,
        requestedSeasonLength: 999,
        existingContractsForTeam: [],
        owner: owner(),
      },
      { table: SPONSOR_PARAM_TABLE },
    );

    expect(tooShort.endSeason - tooShort.startSeason + 1).toBe(1);
    expect(tooLong.endSeason - tooLong.startSeason + 1).toBe(10);
  });

  it('sharePct는 SHARE_PCT_CAP(30)을 넘지 않는다', () => {
    const contract = proposeSponsorContract(
      {
        id: 'sponsor-contract-c' as SponsorContractId,
        sponsor: sponsor({ scale: 5 }),
        teamId: 'team-1' as TeamId,
        teamReputation: 50,
        startSeason: 1,
        requestedSeasonLength: 3,
        existingContractsForTeam: [],
        owner: owner(),
      },
      { table: SPONSOR_PARAM_TABLE },
    );

    expect(contract.sharePct).toBeLessThanOrEqual(30);
  });
});

describe('judgeSponsorBankruptcy — 부도 시 계약 전건 VOIDED (24일차 수락 기준)', () => {
  it('잔고가 음수면 부도 확정 — bankruptAtSeason이 채워지고 활성 계약이 전부 VOIDED된다', () => {
    const contracts = [
      activeContract({ id: 'c1' as SponsorContractId, sponsorId: 'sponsor-1' as Sponsor['id'], status: 'ACTIVE' }),
      activeContract({ id: 'c2' as SponsorContractId, sponsorId: 'sponsor-1' as Sponsor['id'], status: 'ACTIVE' }),
      activeContract({ id: 'c3' as SponsorContractId, sponsorId: 'sponsor-1' as Sponsor['id'], status: 'EXPIRED' }),
    ];

    const result = judgeSponsorBankruptcy({
      sponsor: sponsor({ balance: -500 as Sponsor['balance'] }),
      currentSeason: 6,
      seasonId: 'season-6' as SeasonId,
      contractsForSponsor: contracts,
      newsFeedItemId: 'news-1' as NewsFeedItemId,
      occurredAt: '2026-08-21T00:00:00.000Z' as Timestamp,
    });

    expect(result).not.toBeNull();
    expect(result?.sponsor.bankruptAtSeason).toBe(6);
    expect(result?.voidedContracts).toHaveLength(2);
    expect(result?.voidedContracts.every((contract) => contract.status === 'VOIDED')).toBe(true);
    expect(result?.newsFeedItem.type).toBe('SPONSOR_BANKRUPT');
    expect(result?.newsFeedItem.refId).toBe('sponsor-1');
  });

  it('만료(EXPIRED)·이미 해지(VOIDED)된 계약은 VOIDED 대상에서 제외한다', () => {
    const contracts = [
      activeContract({ id: 'c1' as SponsorContractId, status: 'EXPIRED' }),
      activeContract({ id: 'c2' as SponsorContractId, status: 'VOIDED' }),
    ];

    const result = judgeSponsorBankruptcy({
      sponsor: sponsor({ balance: -1 as Sponsor['balance'] }),
      currentSeason: 6,
      seasonId: 'season-6' as SeasonId,
      contractsForSponsor: contracts,
      newsFeedItemId: 'news-1' as NewsFeedItemId,
      occurredAt: '2026-08-21T00:00:00.000Z' as Timestamp,
    });

    expect(result?.voidedContracts).toHaveLength(0);
  });

  it('잔고가 정상(≥0)이면 null을 반환하고 아무것도 바꾸지 않는다', () => {
    const result = judgeSponsorBankruptcy({
      sponsor: sponsor({ balance: 0 as Sponsor['balance'] }),
      currentSeason: 6,
      seasonId: 'season-6' as SeasonId,
      contractsForSponsor: [],
      newsFeedItemId: 'news-1' as NewsFeedItemId,
      occurredAt: '2026-08-21T00:00:00.000Z' as Timestamp,
    });

    expect(result).toBeNull();
  });

  it('이미 부도 처리된 스폰서(bankruptAtSeason 기록됨)는 재판정하지 않고 null을 반환한다', () => {
    const result = judgeSponsorBankruptcy({
      sponsor: sponsor({ balance: -9999 as Sponsor['balance'], bankruptAtSeason: 3 }),
      currentSeason: 6,
      seasonId: 'season-6' as SeasonId,
      contractsForSponsor: [activeContract({ status: 'ACTIVE' })],
      newsFeedItemId: 'news-1' as NewsFeedItemId,
      occurredAt: '2026-08-21T00:00:00.000Z' as Timestamp,
    });

    expect(result).toBeNull();
  });
});
