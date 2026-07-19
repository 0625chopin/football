/**
 * `ops.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: E-24~E-27(사건) 기존분 + **E-45~E-47(오늘 신규 추가분)** 필드 형태를 회귀 고정한다.
 * 특히 E-45~47은 오늘 처음 정의됐으므로, 정본(`docs/require/05-data-requirements.md` 5.13절)
 * 대비 필드 존재·nullable 여부가 정확한지가 이 파일의 핵심 검증 대상이다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { AuditLog, CronGap, CronRun, Injury, NewsFeedItem, Sanction, YouthProspect } from './ops';

describe('ops.ts — Injury/YouthProspect/NewsFeedItem/Sanction (E-24~27)', () => {
  it('Injury.matchId는 훈련 중 부상이면 null이다', () => {
    expectTypeOf<Injury['matchId']>().toBeNullable();
  });

  it('NewsFeedItem은 다형 참조(refType/refId)를 string으로 갖는다', () => {
    expectTypeOf<NewsFeedItem>().toHaveProperty('refType').toEqualTypeOf<string>();
    expectTypeOf<NewsFeedItem>().toHaveProperty('refId').toEqualTypeOf<string>();
  });

  it('Sanction.effects는 jsonb 여유 공간(Readonly<Record<string, unknown>>)이다', () => {
    expectTypeOf<Sanction>().toHaveProperty('effects').toEqualTypeOf<Readonly<Record<string, unknown>>>();
  });

  it('YouthProspect.bonusApplied는 FR-LG-007 구제 보정 적용 여부 boolean이다', () => {
    expectTypeOf<YouthProspect>().toHaveProperty('bonusApplied').toEqualTypeOf<boolean>();
  });
});

describe('ops.ts — CronRun (E-45, 8일차 신규)', () => {
  it('필드 전량(키 집합)이 05:670~683 정본과 일치한다', () => {
    expectTypeOf<keyof CronRun>().toEqualTypeOf<
      | 'id'
      | 'startedAt'
      | 'finishedAt'
      | 'durationMs'
      | 'lockAcquired'
      | 'fixturesProcessed'
      | 'isCatchUp'
      | 'status'
      | 'retryCount'
      | 'errorCode'
      | 'errorMessage'
      | 'snapshotHash'
    >();
  });

  it('finishedAt/errorCode/errorMessage/snapshotHash는 nullable이다', () => {
    expectTypeOf<CronRun['finishedAt']>().toBeNullable();
    expectTypeOf<CronRun['errorCode']>().toBeNullable();
    expectTypeOf<CronRun['errorMessage']>().toBeNullable();
    expectTypeOf<CronRun['snapshotHash']>().toBeNullable();
  });

  it('snapshotHash는 SnapshotId 브랜드가 아니라 해시 문자열(string)이다', () => {
    expectTypeOf<CronRun['snapshotHash']>().toEqualTypeOf<string | null>();
  });

  it('lockAcquired/isCatchUp은 boolean, fixturesProcessed/retryCount/durationMs는 number다', () => {
    expectTypeOf<CronRun>().toHaveProperty('lockAcquired').toEqualTypeOf<boolean>();
    expectTypeOf<CronRun>().toHaveProperty('isCatchUp').toEqualTypeOf<boolean>();
    expectTypeOf<CronRun>().toHaveProperty('fixturesProcessed').toEqualTypeOf<number>();
    expectTypeOf<CronRun>().toHaveProperty('retryCount').toEqualTypeOf<number>();
    expectTypeOf<CronRun>().toHaveProperty('durationMs').toEqualTypeOf<number>();
  });
});

describe('ops.ts — CronGap (E-46, 8일차 신규)', () => {
  it('필드 전량(키 집합)이 05:685~694 정본과 일치한다', () => {
    expectTypeOf<keyof CronGap>().toEqualTypeOf<
      'id' | 'gapStartedAt' | 'gapEndedAt' | 'gapMinutes' | 'missedFixtureCount' | 'recoveredAt' | 'detectedAt'
    >();
  });

  it('gapEndedAt/recoveredAt은 회복 전 null이다', () => {
    expectTypeOf<CronGap['gapEndedAt']>().toBeNullable();
    expectTypeOf<CronGap['recoveredAt']>().toBeNullable();
  });

  it('missedFixtureCount는 라운드가 아니라 Fixture 단위 number다(05문서 원문 주의사항)', () => {
    expectTypeOf<CronGap>().toHaveProperty('missedFixtureCount').toEqualTypeOf<number>();
  });
});

describe('ops.ts — AuditLog (E-47, 8일차 신규)', () => {
  it('필드 전량(키 집합)이 05:696~706 정본과 일치한다', () => {
    expectTypeOf<keyof AuditLog>().toEqualTypeOf<
      'id' | 'actorType' | 'actorId' | 'action' | 'targetType' | 'targetId' | 'payload' | 'createdAt'
    >();
  });

  it('actorId는 HUMAN이 아닌 자동화 행위자에서 null이 되므로 nullable string이다', () => {
    expectTypeOf<AuditLog['actorId']>().toEqualTypeOf<string | null>();
  });

  it('payload는 jsonb 여유 공간이며, append-only라 수정용 필드/메서드가 없다(수정 메서드는 타입 자체가 아니라 Task 004 계약 소관)', () => {
    expectTypeOf<AuditLog>().toHaveProperty('payload').toEqualTypeOf<Readonly<Record<string, unknown>>>();
  });
});
