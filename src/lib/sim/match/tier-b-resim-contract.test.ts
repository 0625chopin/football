/**
 * tier-b-resim-contract.ts 테스트 — 11일차(2026-08-04), 팀장 결정("Tier B 40필드 소유
 * 배정") 후속. `TIER_B_RESIM_FIELD_NAMES`(손으로 쓴 26개 목록)가 `stats.ts`의
 * `PLAYER_STAT_FIELD_CLASSIFICATION`(`blockedReason === 'NO_EVENT_TYPE'`)과 항상
 * 일치하는지 런타임에 교차 검증한다 — `stats.ts`의 분류가 바뀌어도 이 파일이 조용히
 * 뒤처지지 않도록 하는 드리프트 가드다. `@/*` 별칭은 vitest에서 아직 미해석이므로
 * 상대경로 import(`tick.test.ts` 관례).
 */

import { describe, expect, it } from 'vitest';
import {
  TIER_B_RESIM_FIELD_NAMES,
  TIER_B_RESIM_RESERVED_TICK,
} from './tier-b-resim-contract';
import { PLAYER_STAT_FIELD_CLASSIFICATION, type PlayerStatFieldClassification } from './stats';
import type { PlayerStatCoreValues } from '../../../types';

/** 필드별 리터럴 유니온을 공통 인터페이스로 넓혀 `.blockedReason` 접근을 허용한다(Tier A 리터럴은 그 키 자체가 없어 좁혀진 채로는 접근 불가). */
function classificationOf(field: keyof PlayerStatCoreValues): PlayerStatFieldClassification {
  return PLAYER_STAT_FIELD_CLASSIFICATION[field];
}

describe('TIER_B_RESIM_FIELD_NAMES — stats.ts 분류와의 드리프트 가드', () => {
  it('정확히 26개다', () => {
    expect(TIER_B_RESIM_FIELD_NAMES).toHaveLength(26);
  });

  it('중복 없이 26개 전부 서로 다른 필드다', () => {
    expect(new Set(TIER_B_RESIM_FIELD_NAMES).size).toBe(26);
  });

  it('목록의 모든 필드가 stats.ts에서 blockedReason=NO_EVENT_TYPE으로 분류돼 있다', () => {
    TIER_B_RESIM_FIELD_NAMES.forEach((field) => {
      const classification = classificationOf(field);
      expect(classification.tier).toBe('B');
      expect(classification.blockedReason).toBe('NO_EVENT_TYPE');
    });
  });

  it('stats.ts에서 blockedReason=NO_EVENT_TYPE인 필드가 전부(그리고 이것만) 목록에 있다', () => {
    const fieldNames = Object.keys(PLAYER_STAT_FIELD_CLASSIFICATION) as (keyof PlayerStatCoreValues)[];
    const noEventTypeFields = fieldNames.filter(
      (name) => classificationOf(name).blockedReason === 'NO_EVENT_TYPE',
    );

    expect(new Set(noEventTypeFields)).toEqual(new Set(TIER_B_RESIM_FIELD_NAMES));
  });

  it('NEEDS_ROSTER_CONTEXT·DETAIL_SCHEMA_UNDEFINED 필드는 이 목록에 없다(재분류 대기 — 재시뮬레이션 영구 대상 아님)', () => {
    const rosterOrSchemaFields = [
      'appearances',
      'starts',
      'subAppearances',
      'minutesPlayed',
      'shotsFaced',
      'goalsConceded',
      'cleanSheets',
      'penaltiesFaced',
      'xgPrevented',
      'xa',
      'bigChancesCreated',
      'bigChancesMissed',
      'freeKickGoals',
      'headedGoals',
    ];
    rosterOrSchemaFields.forEach((field) => {
      expect(TIER_B_RESIM_FIELD_NAMES).not.toContain(field);
    });
  });
});

describe('TIER_B_RESIM_RESERVED_TICK — 시드 네임스페이스 예약', () => {
  it('0으로 예약되어 있다(tick.ts/events.ts는 MatchTick.tick이 1부터 시작해 0을 쓴 적이 없음)', () => {
    expect(TIER_B_RESIM_RESERVED_TICK).toBe(0);
  });
});
