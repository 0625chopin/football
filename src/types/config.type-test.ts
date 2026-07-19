/**
 * `config.ts` 타입 레벨 테스트 — 8일차(2026-07-30) Task 002 산출물.
 *
 * 목적: E-41~E-44 필드 형태 고정 + **T12 `EnumTranslationCatalog<T>` 규약의 완전성 강제**를
 * 실제로 재현해 4팀이 22일차(H-09)에 기대할 수 있는 동작을 오늘 증명한다(D항 4팀 사전 동의
 * 판정의 근거 자료).
 */

import { describe, expectTypeOf, it } from 'vitest';
import type { CommonCode, CommonCodeGroup, CommonCodeHistory, EnumTranslationCatalog, SimConstantSnapshot } from './config';
import type { Position } from './enums';

describe('config.ts — CommonCodeGroup/CommonCode/CommonCodeHistory (E-41~43)', () => {
  it('CommonCodeGroup.minValue/maxValue는 숫자형이 아니면 둘 다 null이다(NFR-CFG-004)', () => {
    expectTypeOf<CommonCodeGroup['minValue']>().toBeNullable();
    expectTypeOf<CommonCodeGroup['maxValue']>().toBeNullable();
  });

  it('CommonCode.worldId는 null이면 전역 기본값이다(D-15 단일 월드 전제에서도 필드는 유지)', () => {
    expectTypeOf<CommonCode['worldId']>().toBeNullable();
  });

  it('CommonCode.defaultValue/value 둘 다 존재한다(D-26 조정은 value만)', () => {
    expectTypeOf<CommonCode>().toHaveProperty('defaultValue').toEqualTypeOf<string>();
    expectTypeOf<CommonCode>().toHaveProperty('value').toEqualTypeOf<string>();
  });

  it('CommonCodeHistory는 append-only 레코드 shape이며 changedBy/reason이 필수다(NFR-CFG-002)', () => {
    expectTypeOf<CommonCodeHistory>().toHaveProperty('changedBy').not.toBeNullable();
    expectTypeOf<CommonCodeHistory>().toHaveProperty('reason').toEqualTypeOf<string>();
  });
});

describe('config.ts — SimConstantSnapshot (E-44)', () => {
  it('snapshotHash는 UNIQUE 중복 제거 키(string)다', () => {
    expectTypeOf<SimConstantSnapshot>().toHaveProperty('snapshotHash').toEqualTypeOf<string>();
  });
});

describe('config.ts — EnumTranslationCatalog<T> 완전성 강제 (T12)', () => {
  // 11군 포지션 전체를 담은 카탈로그 — 정상 사례. 키 문자열은 예시일 뿐이며
  // 실제 값은 4팀 H-09(22일차) 소유(T12-a, 여기서 선점하지 않는다).
  const fullCatalog: EnumTranslationCatalog<Position> = {
    GK: 'position.gk',
    CB: 'position.cb',
    LB: 'position.lb',
    RB: 'position.rb',
    DM: 'position.dm',
    CM: 'position.cm',
    AM: 'position.am',
    LW: 'position.lw',
    RW: 'position.rw',
    ST: 'position.st',
    SS: 'position.ss',
  };

  it('11군 전 멤버를 채운 카탈로그는 컴파일된다', () => {
    expectTypeOf(fullCatalog).toEqualTypeOf<EnumTranslationCatalog<Position>>();
  });

  it('한 멤버라도 누락하면 tsc 오류가 난다(4팀이 enums.ts 유니온 변경 시 즉시 알아채는 계약)', () => {
    // @ts-expect-error — 'SS' 누락. Position 유니온에 멤버가 추가/삭제되면 이 자리가 즉시 오류로 반응해야
    // 한다는 것이 T12 규약의 핵심 가치다.
    const incomplete: EnumTranslationCatalog<Position> = {
      GK: 'position.gk',
      CB: 'position.cb',
      LB: 'position.lb',
      RB: 'position.rb',
      DM: 'position.dm',
      CM: 'position.cm',
      AM: 'position.am',
      LW: 'position.lw',
      RW: 'position.rw',
      ST: 'position.st',
    };
    void incomplete;
  });

  it('값 타입은 string이어야 한다(표시명 자체는 메시지 카탈로그 소유, 도메인 타입 아님)', () => {
    expectTypeOf<EnumTranslationCatalog<Position>[Position]>().toEqualTypeOf<string>();
  });
});
