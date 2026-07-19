/**
 * `match.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: C-23(NFR-SEC-004, 종료 전 결과 null 허용)을 지키는 필드들의 nullable 여부와,
 * I-37(`relatedEventSequence`)·I-19(PSO 분리)가 실수로 되돌려지지 않는지 타입 레벨에서 고정한다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { Fixture, MatchEvent, MatchLineup, Weather } from './match';

describe('match.ts — Fixture (E-15), C-23 종료 전 null 허용', () => {
  it('스코어 계열(정규/전반/연장/승부차기) 전부 종료 전 null 허용이다', () => {
    expectTypeOf<Fixture['homeScore']>().toBeNullable();
    expectTypeOf<Fixture['awayScore']>().toBeNullable();
    expectTypeOf<Fixture['htHomeScore']>().toBeNullable();
    expectTypeOf<Fixture['etHomeScore']>().toBeNullable();
    expectTypeOf<Fixture['pkHome']>().toBeNullable();
    expectTypeOf<Fixture['pkAway']>().toBeNullable();
  });

  it('snapshotId는 NOT NULL이다(결정론 필수 축, FR-AD-014/DC-14) — matchSeed도 필수', () => {
    expectTypeOf<Fixture['snapshotId']>().not.toBeNullable();
    expectTypeOf<Fixture['matchSeed']>().not.toBeNullable();
  });

  it('simulatedAt은 미계산 시 null 허용이다', () => {
    expectTypeOf<Fixture['simulatedAt']>().toBeNullable();
  });
});

describe('match.ts — MatchEvent (E-16)', () => {
  it('relatedEventSequence는 number | null이다(I-37, ASSIST→GOAL 링크)', () => {
    expectTypeOf<MatchEvent['relatedEventSequence']>().toEqualTypeOf<number | null>();
  });

  it('secondaryPlayerId/xg/teamId/primaryPlayerId는 해당 없을 수 있어 nullable이다', () => {
    expectTypeOf<MatchEvent['secondaryPlayerId']>().toBeNullable();
    expectTypeOf<MatchEvent['xg']>().toBeNullable();
    expectTypeOf<MatchEvent['teamId']>().toBeNullable();
    expectTypeOf<MatchEvent['primaryPlayerId']>().toBeNullable();
  });

  it('sequence/minute은 필수 number다(경기당 여러 인스턴스 식별, I-44 전제)', () => {
    expectTypeOf<MatchEvent['sequence']>().toEqualTypeOf<number>();
    expectTypeOf<MatchEvent['minute']>().toEqualTypeOf<number>();
  });
});

describe('match.ts — MatchLineup/Weather (E-17, E-18)', () => {
  it('minuteOn/minuteOff는 교체 없으면 null이다', () => {
    expectTypeOf<MatchLineup['minuteOn']>().toBeNullable();
    expectTypeOf<MatchLineup['minuteOff']>().toBeNullable();
  });

  it('Weather.matchId는 1:1 FK로 필수다', () => {
    expectTypeOf<Weather>().toHaveProperty('matchId').not.toBeNullable();
  });
});
