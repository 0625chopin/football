/**
 * promotion.ts 테스트 — Task 028 / 48일차 산출물.
 *
 * 완료 판정 "승강 후 팀 수 불변"을 증명한다: 리그1↔리그2, 리그2↔리그3 교환 후 각 리그의
 * 팀 수가 교환 전 `league.teamCount`와 같은지 확인하고, 슬롯 수가 어긋나 팀 수 불변이
 * 깨지는 입력·순위가 불완전한 입력은 명시적 오류가 되는지도 검증한다.
 */

import { describe, expect, it } from 'vitest';
import type { League, LeagueId, SeasonId, Standing, TeamId } from '@/types';
import {
  resolvePromotionExchange,
  resolveSeasonPromotionExchange,
  type LeagueFinalStandings,
  type PromotionSwap,
} from './promotion';

const SEASON_ID = 'season-1' as SeasonId;
const ROUND = 999;

interface LeagueOverrides {
  readonly id: string;
  readonly tier: number;
  readonly teamCount?: number;
  readonly promotionSlots?: number;
  readonly relegationSlots?: number;
}

/** `id`는 이 함수 안에서만 `LeagueId`로 브랜드 캐스트한다(brand.ts "생성은 1회만" 규약). */
function league(overrides: LeagueOverrides): League {
  return {
    name: `League ${overrides.tier}`,
    teamCount: 4,
    roundIntervalMin: 90,
    promotionSlots: 1,
    relegationSlots: 1,
    playoffTeamCount: 2,
    ...overrides,
    id: overrides.id as LeagueId,
  };
}

function standing(leagueId: LeagueId, teamId: string, rank: number): Standing {
  return {
    seasonId: SEASON_ID,
    leagueId,
    round: ROUND,
    teamId: teamId as TeamId,
    rank,
    played: 38,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
    form: '',
    fairPlayScore: 0,
    tiebreakApplied: null,
  };
}

function finalTable(l: League, teamIds: readonly string[]): LeagueFinalStandings {
  return {
    league: l,
    standings: teamIds.map((teamId, index) => standing(l.id, teamId, index + 1)),
  };
}

function teamCounts(swaps: readonly PromotionSwap[], leagues: readonly League[]): Record<string, number> {
  const startCount = new Map(leagues.map((l) => [l.id as string, l.teamCount]));
  for (const swap of swaps) {
    startCount.set(swap.fromLeagueId as string, (startCount.get(swap.fromLeagueId as string) ?? 0) - 1);
    startCount.set(swap.toLeagueId as string, (startCount.get(swap.toLeagueId as string) ?? 0) + 1);
  }
  return Object.fromEntries(startCount);
}

describe('resolvePromotionExchange — 인접 두 리그 교환', () => {
  const higher = league({ id: 'L1', tier: 1, teamCount: 4, promotionSlots: 1, relegationSlots: 2 });
  const lower = league({ id: 'L2', tier: 2, teamCount: 6, promotionSlots: 2, relegationSlots: 2 });

  const higherTable = finalTable(higher, ['H1', 'H2', 'H3', 'H4']);
  const lowerTable = finalTable(lower, ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);

  it('상위 리그 하위 relegationSlots팀과 하위 리그 상위 promotionSlots팀을 맞바꾼다', () => {
    const swaps = resolvePromotionExchange(higherTable, lowerTable);

    const relegated = swaps.filter((s) => s.direction === 'RELEGATED').map((s) => s.teamId);
    const promoted = swaps.filter((s) => s.direction === 'PROMOTED').map((s) => s.teamId);

    expect(relegated.sort()).toEqual(['H3', 'H4']);
    expect(promoted.sort()).toEqual(['S1', 'S2']);
    for (const s of swaps.filter((s) => s.direction === 'RELEGATED')) {
      expect(s.fromLeagueId).toBe('L1');
      expect(s.toLeagueId).toBe('L2');
    }
    for (const s of swaps.filter((s) => s.direction === 'PROMOTED')) {
      expect(s.fromLeagueId).toBe('L2');
      expect(s.toLeagueId).toBe('L1');
    }
  });

  it('교환 후 리그별 팀 수가 교환 전 teamCount와 같다(팀 수 불변)', () => {
    const swaps = resolvePromotionExchange(higherTable, lowerTable);
    const counts = teamCounts(swaps, [higher, lower]);

    expect(counts['L1']).toBe(higher.teamCount);
    expect(counts['L2']).toBe(lower.teamCount);
  });

  it('강등 슬롯과 승격 슬롯 수가 다르면(팀 수 불변이 깨지므로) 예외를 던진다', () => {
    const mismatchedLower = league({ id: 'L2', tier: 2, teamCount: 6, promotionSlots: 3, relegationSlots: 2 });
    const mismatchedTable = finalTable(mismatchedLower, ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);

    expect(() => resolvePromotionExchange(higherTable, mismatchedTable)).toThrow(/팀 수 불변/);
  });

  it('최종 순위 팀 수가 league.teamCount와 다르면 예외를 던진다', () => {
    const incomplete: LeagueFinalStandings = {
      league: higher,
      standings: [standing(higher.id, 'H1', 1), standing(higher.id, 'H2', 2)],
    };

    expect(() => resolvePromotionExchange(incomplete, lowerTable)).toThrow(/최종 순위/);
  });

  it('rank가 1~teamCount를 연속으로 채우지 않으면(동률 미해소) 예외를 던진다', () => {
    const duplicateRank: LeagueFinalStandings = {
      league: higher,
      standings: [
        standing(higher.id, 'H1', 1),
        standing(higher.id, 'H2', 2),
        standing(higher.id, 'H3', 2),
        standing(higher.id, 'H4', 4),
      ],
    };

    expect(() => resolvePromotionExchange(duplicateRank, lowerTable)).toThrow(/연속으로 채우지/);
  });

  it('승격+강등 슬롯 합이 teamCount를 초과하면 예외를 던진다', () => {
    const overlapping = league({ id: 'L1', tier: 1, teamCount: 4, promotionSlots: 3, relegationSlots: 3 });
    const overlappingTable = finalTable(overlapping, ['H1', 'H2', 'H3', 'H4']);

    expect(() => resolvePromotionExchange(overlappingTable, lowerTable)).toThrow(/초과합니다/);
  });
});

describe('resolveSeasonPromotionExchange — 3부 리그 전체 교환', () => {
  const tier1 = league({ id: 'L1', tier: 1, teamCount: 24, promotionSlots: 3, relegationSlots: 3 });
  const tier2 = league({ id: 'L2', tier: 2, teamCount: 20, promotionSlots: 3, relegationSlots: 3 });
  const tier3 = league({ id: 'L3', tier: 3, teamCount: 16, promotionSlots: 3, relegationSlots: 3 });

  const tier1Teams = Array.from({ length: 24 }, (_, i) => `T1-${i + 1}`);
  const tier2Teams = Array.from({ length: 20 }, (_, i) => `T2-${i + 1}`);
  const tier3Teams = Array.from({ length: 16 }, (_, i) => `T3-${i + 1}`);

  const tier1Table = finalTable(tier1, tier1Teams);
  const tier2Table = finalTable(tier2, tier2Teams);
  const tier3Table = finalTable(tier3, tier3Teams);

  it('리그1 22~24위 ↔ 리그2 1~3위, 리그2 18~20위 ↔ 리그3 1~3위를 교환한다', () => {
    const swaps = resolveSeasonPromotionExchange(tier1Table, tier2Table, tier3Table);

    const relegatedFromL1 = swaps
      .filter((s) => s.fromLeagueId === 'L1' && s.direction === 'RELEGATED')
      .map((s) => s.teamId)
      .sort();
    const promotedToL1 = swaps
      .filter((s) => s.toLeagueId === 'L1' && s.direction === 'PROMOTED')
      .map((s) => s.teamId)
      .sort();
    const relegatedFromL2 = swaps
      .filter((s) => s.fromLeagueId === 'L2' && s.direction === 'RELEGATED')
      .map((s) => s.teamId)
      .sort();
    const promotedFromL3 = swaps
      .filter((s) => s.fromLeagueId === 'L3' && s.direction === 'PROMOTED')
      .map((s) => s.teamId)
      .sort();

    expect(relegatedFromL1).toEqual(['T1-22', 'T1-23', 'T1-24']);
    expect(promotedToL1).toEqual(['T2-1', 'T2-2', 'T2-3']);
    expect(relegatedFromL2).toEqual(['T2-18', 'T2-19', 'T2-20']);
    expect(promotedFromL3).toEqual(['T3-1', 'T3-2', 'T3-3']);
    for (const s of swaps.filter((s) => s.fromLeagueId === 'L3')) {
      expect(s.toLeagueId).toBe('L2');
    }
  });

  it('24/20/16 팀 수가 승강 후에도 불변이다', () => {
    const swaps = resolveSeasonPromotionExchange(tier1Table, tier2Table, tier3Table);
    const counts = teamCounts(swaps, [tier1, tier2, tier3]);

    expect(counts['L1']).toBe(24);
    expect(counts['L2']).toBe(20);
    expect(counts['L3']).toBe(16);
  });

  it('리그2는 승격(리그1행)과 강등(리그3행) 대상이 겹치지 않는다', () => {
    const swaps = resolveSeasonPromotionExchange(tier1Table, tier2Table, tier3Table);
    const l2Outgoing = swaps.filter((s) => s.fromLeagueId === 'L2').map((s) => s.teamId);

    expect(new Set(l2Outgoing).size).toBe(l2Outgoing.length);
  });
});
