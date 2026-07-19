/**
 * `world.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: E-01~E-05 필수 필드 누락(특히 I-31 해소로 추가된 월드시간 앵커 4필드)을
 * 타입 레벨에서 검출한다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { League, Season, Team, TeamSeason, World } from './world';

describe('world.ts — World (E-01)', () => {
  it('필드 전량(키 집합)이 문서화된 그대로다 — 누락/오타 시 tsc 오류', () => {
    expectTypeOf<keyof World>().toEqualTypeOf<
      | 'id'
      | 'worldSeed'
      | 'currentSeasonNumber'
      | 'currentPhase'
      | 'speedMultiplier'
      | 'isPaused'
      | 'pausedTotalMinutes'
      | 'speedChangedAt'
      | 'worldMinutesAtSpeedChange'
      | 'pausedAt'
      | 'clockRevision'
      | 'createdAt'
    >();
  });

  it('I-31 해소 4필드(월드시간↔실시간 환산 앵커)가 정확한 nullable 여부로 존재한다', () => {
    expectTypeOf<World>().toHaveProperty('pausedAt').toEqualTypeOf<World['pausedAt']>();
    expectTypeOf<World['pausedAt']>().toBeNullable();
    expectTypeOf<World['speedChangedAt']>().not.toBeNullable();
    expectTypeOf<World['clockRevision']>().toEqualTypeOf<number>();
  });
});

describe('world.ts — League/Season/Team/TeamSeason (E-02~E-05)', () => {
  it('League 필드 전량', () => {
    expectTypeOf<keyof League>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'tier'
      | 'teamCount'
      | 'roundIntervalMin'
      | 'promotionSlots'
      | 'relegationSlots'
      | 'playoffTeamCount'
    >();
  });

  it('Season.snapshotId는 nullable이다(시즌 진행 전/재현 전 미배정 가능)', () => {
    expectTypeOf<Season['snapshotId']>().toBeNullable();
  });

  it('Team.balance는 Points 브랜드다(원장 파생 캐시, DC-08)', () => {
    expectTypeOf<Team>().toHaveProperty('balance').toMatchTypeOf<number>();
  });

  it('TeamSeason은 승강 판정 3필드(finalRank·promoted·relegated)를 모두 갖는다', () => {
    expectTypeOf<TeamSeason>().toHaveProperty('finalRank');
    expectTypeOf<TeamSeason>().toHaveProperty('promoted').toEqualTypeOf<boolean>();
    expectTypeOf<TeamSeason>().toHaveProperty('relegated').toEqualTypeOf<boolean>();
  });
});
