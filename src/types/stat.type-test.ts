/**
 * `stat.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: "합산형만 저장, 파생 비율은 계산" 원칙(E-19 원문)이 실수로 깨져 비율형 파생 필드
 * (`shotAccuracy` 등)가 추가되지 않는지, `PlayerStatCoreValues` 공유 블록 재사용(C-6)이
 * 유지되는지를 타입 레벨에서 고정한다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  Award,
  PlayerCareerStat,
  PlayerMatchStat,
  PlayerSeasonStat,
  PlayerStatCoreValues,
  Standing,
  TeamMarginResult,
  TeamSeasonStat,
  TeamSplitRecord,
  Trophy,
} from './stat';

describe('stat.ts — PlayerStatCoreValues 비율형 파생 필드 미포함(E-19 원문)', () => {
  it('shotAccuracy/conversionRate/passAccuracy/duelWinRate/savePercentage는 필드로 존재하지 않는다', () => {
    expectTypeOf<PlayerStatCoreValues>().not.toHaveProperty('shotAccuracy');
    expectTypeOf<PlayerStatCoreValues>().not.toHaveProperty('conversionRate');
    expectTypeOf<PlayerStatCoreValues>().not.toHaveProperty('passAccuracy');
    expectTypeOf<PlayerStatCoreValues>().not.toHaveProperty('duelWinRate');
    expectTypeOf<PlayerStatCoreValues>().not.toHaveProperty('savePercentage');
  });

  it('PlayerMatchStat/PlayerSeasonStat/PlayerCareerStat이 공유 블록을 재사용한다(C-6)', () => {
    expectTypeOf<PlayerMatchStat>().toMatchTypeOf<PlayerStatCoreValues>();
    expectTypeOf<PlayerSeasonStat>().toMatchTypeOf<PlayerStatCoreValues>();
    expectTypeOf<PlayerCareerStat>().toMatchTypeOf<PlayerStatCoreValues>();
  });

  it('PlayerMatchStat은 경기 단위 식별자 3종 + 평점 2필드를 추가로 갖는다', () => {
    expectTypeOf<PlayerMatchStat>().toHaveProperty('matchId');
    expectTypeOf<PlayerMatchStat>().toHaveProperty('matchRating').toEqualTypeOf<number>();
    expectTypeOf<PlayerMatchStat>().toHaveProperty('isMotm').toEqualTypeOf<boolean>();
  });

  it('PlayerSeasonStat은 대회 구분 축(competitionType, H)을 포함한 복합키 필드를 갖는다', () => {
    expectTypeOf<PlayerSeasonStat>().toHaveProperty('competitionType');
    expectTypeOf<PlayerSeasonStat>().toHaveProperty('seasonId');
  });
});

describe('stat.ts — TeamSeasonStat (E-22) 저장/파생 경계', () => {
  it('goalDifference/ppg 등 산술 파생 필드는 저장하지 않는다(조회 시점 계산)', () => {
    expectTypeOf<TeamSeasonStat>().not.toHaveProperty('goalDifference');
    expectTypeOf<TeamSeasonStat>().not.toHaveProperty('ppg');
    expectTypeOf<TeamSeasonStat>().not.toHaveProperty('xgDiff');
  });

  it('홈/원정 분리 기록과 최다 점수차 기록이 공유 보조 블록 타입을 쓴다', () => {
    expectTypeOf<TeamSeasonStat>().toHaveProperty('homeRecord').toEqualTypeOf<TeamSplitRecord>();
    expectTypeOf<TeamSeasonStat>().toHaveProperty('awayRecord').toEqualTypeOf<TeamSplitRecord>();
    expectTypeOf<TeamSeasonStat['biggestWin']>().toEqualTypeOf<TeamMarginResult | null>();
    expectTypeOf<TeamSeasonStat['biggestLoss']>().toEqualTypeOf<TeamMarginResult | null>();
  });
});

describe('stat.ts — Standing (E-23) / Award·Trophy (E-31·E-32)', () => {
  it('Standing.tiebreakApplied는 TeamSeason과 동일 축의 nullable number다', () => {
    expectTypeOf<Standing['tiebreakApplied']>().toEqualTypeOf<number | null>();
  });

  it('Award는 수상 대상 3종이 배타적으로 nullable이다(playerId/managerId/teamId)', () => {
    expectTypeOf<Award['playerId']>().toBeNullable();
    expectTypeOf<Award['managerId']>().toBeNullable();
    expectTypeOf<Award['teamId']>().toBeNullable();
  });

  it('Trophy.leagueId는 CUP_TITLE 등 비리그 트로피에서 null이다', () => {
    expectTypeOf<Trophy['leagueId']>().toBeNullable();
  });
});
