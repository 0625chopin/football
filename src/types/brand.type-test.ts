/**
 * `brand.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: ID/시드 브랜드가 **서로 대입 불가**함을 타입 레벨에서 고정한다(7일차 팀장이 임시
 * 파일로 수동 검증했던 것과 동일한 성질을 회귀 테스트로 남긴다, `docs/dailyWorkLog/7Day.md` §5).
 * `vitest.config.ts`가 아직 없어 `@/*` 별칭이 테스트에서 해석되지 않으므로 상대경로로 import한다
 * (CLAUDE.md, 8일차까지의 관례).
 *
 * 이 파일은 런타임 단언이 없다 — `expectTypeOf`/`@ts-expect-error`는 `tsc` 컴파일 단계에서만
 * 의미를 가지며, `npx tsc --noEmit`이 이 파일의 타입 오류를 잡아낸다.
 */

import { describe, expectTypeOf, it } from 'vitest';
import type {
  AuditLogId,
  Brand,
  EventSeed,
  MatchSeed,
  PlayerId,
  Points,
  Seed,
  SeasonSeed,
  TeamId,
  Timestamp,
  WorldSeed,
} from './brand';

describe('brand.ts — ID 브랜드 상호 배타성', () => {
  it('서로 다른 엔티티 ID는 대입 불가능하다(tsc가 잡아야 함)', () => {
    const teamId = 'team-1' as TeamId;
    // @ts-expect-error — TeamId를 PlayerId 자리에 넣을 수 없다(ID 혼용 방지, 7일차 완료 판정)
    const wrong: PlayerId = teamId;
    void wrong;
  });

  it('브랜드 없는 원시 string은 브랜드 ID 자리에 대입 불가능하다', () => {
    const raw: string = 'not-branded';
    // @ts-expect-error — 캐스트 없이 원시 string을 브랜드 ID에 대입할 수 없다(생성은 단일 지점에서만, brand.ts 헤더)
    const wrong: TeamId = raw;
    void wrong;
  });
});

describe('brand.ts — 시드 계층 상호 배타성 (T2-b·T2-d)', () => {
  it('WorldSeed는 SeasonSeed 자리에 대입 불가능하다', () => {
    const worldSeed = 1 as WorldSeed;
    // @ts-expect-error — 계층이 다른 시드는 뒤바뀌어 쓰일 수 없다(I-16 해소 조건)
    const wrong: SeasonSeed = worldSeed;
    void wrong;
  });

  it('MatchSeed는 EventSeed 자리에 대입 불가능하다', () => {
    const matchSeed = 1 as MatchSeed;
    // @ts-expect-error — 계층이 다른 시드는 뒤바뀌어 쓰일 수 없다(T2-b·T2-d)
    const wrong: EventSeed = matchSeed;
    void wrong;
  });

  it('범용 Seed(Team.crestSeed 등)는 계층 시드 자리에 대입 불가능하다', () => {
    const genericSeed = 1 as Seed;
    // @ts-expect-error — 범용 Seed와 계층 Seed(WorldSeed 등)는 값 표현이 같아도 다른 브랜드다
    const wrong: WorldSeed = genericSeed;
    void wrong;
  });
});

describe('brand.ts — Points는 plain number와 명목적으로 다르다 (DC-08)', () => {
  it('숫자 리터럴을 캐스트 없이 Points 자리에 대입할 수 없다', () => {
    const amount = 100;
    // @ts-expect-error — 정수 보장은 생성 지점의 런타임 책임이며, 타입은 캐스트를 강제해 그 지점을 드러낸다
    const wrong: Points = amount;
    void wrong;
  });
});

describe('brand.ts — Timestamp/Brand 유틸리티 형태', () => {
  it('Timestamp는 일반 string이다(표시 서식은 UI 책임, T13)', () => {
    expectTypeOf<Timestamp>().toEqualTypeOf<string>();
  });

  it('Brand<T, TName>은 T와 리터럴 __brand 프로퍼티의 교차 타입이다', () => {
    expectTypeOf<Brand<string, 'X'>>().toMatchTypeOf<string>();
  });

  it('8일차 신규 AuditLogId도 다른 uuid 브랜드와 동일한 규약(Brand<string,._.>)을 따른다', () => {
    expectTypeOf<AuditLogId>().toMatchTypeOf<string>();
  });
});
