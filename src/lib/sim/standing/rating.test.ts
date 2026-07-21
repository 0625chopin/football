/**
 * rating.ts 테스트 — Task 026 / 37일차 산출물(FR-ST-003).
 *
 * FR-ST-003 수용 기준을 직접 겨냥한다: ①평점이 항상 [1.0,10.0] ②무기여 선수는 6.0 근방
 * ③해트트릭 선수 평점 ≥8.5 ④가중치가 (여기서는 주입된) 공통코드에서 온다.
 */

import { describe, expect, it } from 'vitest';
// 테스트 전용 import — 접점 통합 테스트(파일 하단 참조)에만 쓰인다. rating.ts 본체는
// `src/lib/config/**`를 import하지 않는다(I-83 — 엔진은 loadConstants를 직접 호출하지
// 않고 값을 주입받는다). 이 테스트 파일만 예외적으로 3팀 폴백 값을 직접 들여다본다.
import { SAFE_DEFAULT_VALUES } from '@/lib/config/fallback';
import type { PlayerMatchStatTierAFold } from '../match/stats';
import {
  RATING_WEIGHT_DEFAULT,
  computeMatchRating,
  parseRatingWeightConstant,
  resolveRatingWeights,
  type RatingWeightConstants,
} from './rating';

function zeroFold(overrides: Partial<PlayerMatchStatTierAFold> = {}): PlayerMatchStatTierAFold {
  return {
    goals: 0,
    assists: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    penaltiesTaken: 0,
    penaltiesScored: 0,
    ownGoals: 0,
    foulsCommitted: 0,
    foulsDrawn: 0,
    yellowCards: 0,
    secondYellows: 0,
    redCards: 0,
    offsides: 0,
    saves: 0,
    penaltiesSaved: 0,
    ...overrides,
  };
}

describe('computeMatchRating — 수용 기준 ①②③', () => {
  it('무득점·무기여 선발 선수는 기본값 6.0이다(②)', () => {
    expect(computeMatchRating(zeroFold(), false)).toBe(6.0);
  });

  it('해트트릭(골3+도움1) 선수 평점은 8.5 이상이다(③) — 6 + 3*1.0 + 1*0.7 = 9.7', () => {
    const rating = computeMatchRating(zeroFold({ goals: 3, assists: 1 }), false);
    expect(rating).toBeCloseTo(9.7, 5);
    expect(rating).toBeGreaterThanOrEqual(8.5);
  });

  it('가중 합산이 아무리 커도 10.0을 넘지 않는다(①, 상한 클램프)', () => {
    const rating = computeMatchRating(zeroFold({ goals: 10, assists: 10 }), false);
    expect(rating).toBe(10.0);
  });

  it('가중 합산이 아무리 낮아도 1.0 밑으로 내려가지 않는다(①, 하한 클램프)', () => {
    const rating = computeMatchRating(zeroFold({ redCards: 5, yellowCards: 5 }), false);
    expect(rating).toBe(1.0);
  });
});

describe('computeMatchRating — GK는 별도 가중치표를 쓴다', () => {
  it('같은 fold라도 isGoalkeeper 여부에 따라 다른 테이블이 적용된다', () => {
    const fold = zeroFold({ saves: 3, penaltiesSaved: 1 });
    const fieldRating = computeMatchRating(fold, false);
    const gkRating = computeMatchRating(fold, true);

    // 필드플레이어 테이블에는 saves/penaltiesSaved 가중치가 없어 기본값 그대로다.
    expect(fieldRating).toBe(6.0);
    // GK 테이블은 saves(+0.2)*3 + penaltiesSaved(+1.0)*1 만큼 가산한다.
    expect(gkRating).toBeCloseTo(6.0 + 0.2 * 3 + 1.0, 5);
  });
});

describe('computeMatchRating — Tier B 필드는 오늘 데이터가 없어 자동으로 무시된다', () => {
  it('fold에 없는 필드(keyPasses 등)에 가중치를 부여해도 결과에 영향이 없다', () => {
    const rating = computeMatchRating(zeroFold(), false, {
      ...RATING_WEIGHT_DEFAULT,
      field: { ...RATING_WEIGHT_DEFAULT.field, keyPasses: 999 },
    });
    expect(rating).toBe(6.0);
  });
});

describe('computeMatchRating — 가중치 주입(수용 기준 ④의 소비 측 절반)', () => {
  it('weights 파라미터를 넘기면 그 값으로 계산한다(엔진이 직접 loadConstants를 호출하지 않는 I-83 패턴)', () => {
    const custom: RatingWeightConstants = {
      base: 5.0,
      min: 0.0,
      max: 20.0,
      field: { goals: 2.0 },
      gk: {},
    };
    expect(computeMatchRating(zeroFold({ goals: 2 }), false, custom)).toBe(9.0);
  });
});

describe('parseRatingWeightConstant / resolveRatingWeights — I-66 런타임 검증 어댑터', () => {
  it('올바른 구조(FIELD/GK/SCALE 3코드)는 내부 표현으로 변환된다', () => {
    const raw = {
      FIELD: { goals: 1.0 },
      GK: { saves: 0.2 },
      SCALE: { base: 6, min: 1, max: 10 },
    };
    expect(parseRatingWeightConstant(raw)).toEqual({
      base: 6,
      min: 1,
      max: 10,
      field: { goals: 1.0 },
      gk: { saves: 0.2 },
    });
  });

  it('빈 객체({})는 무효로 판정한다(I-71 — 3팀 값이 아직 비어 있는 폴백과 동일 형태)', () => {
    expect(parseRatingWeightConstant({})).toBeNull();
  });

  it('SCALE 코드가 없으면 무효로 판정한다', () => {
    const raw = { FIELD: { goals: 1.0 }, GK: {} };
    expect(parseRatingWeightConstant(raw)).toBeNull();
  });

  it('FIELD/GK 안에 숫자가 아닌 값이 섞이면 무효로 판정한다', () => {
    const raw = { FIELD: { goals: 'oops' }, GK: {}, SCALE: { base: 6, min: 1, max: 10 } };
    expect(parseRatingWeightConstant(raw)).toBeNull();
  });

  it('null/undefined/배열 등 객체가 아닌 입력도 무효로 판정한다', () => {
    expect(parseRatingWeightConstant(null)).toBeNull();
    expect(parseRatingWeightConstant(undefined)).toBeNull();
    expect(parseRatingWeightConstant([1, 2, 3])).toBeNull();
  });

  it('resolveRatingWeights는 무효 입력에서 RATING_WEIGHT_DEFAULT로 안전하게 대체한다', () => {
    expect(resolveRatingWeights({})).toEqual(RATING_WEIGHT_DEFAULT);
    expect(resolveRatingWeights(null)).toEqual(RATING_WEIGHT_DEFAULT);
  });
});

describe('parseRatingWeightConstant — 3팀 RATING_WEIGHT 폴백과의 접점 통합 테스트', () => {
  // 왜 이 테스트가 필요한가: 엔진(rating.ts)과 공통코드 하드코딩 폴백(config/fallback.ts의
  // SAFE_DEFAULT_VALUES)은 서로 다른 팀(2팀/3팀)이 병렬로 만든다(I-83 — 엔진은
  // loadConstants를 직접 호출하지 않고 값을 주입받으므로, 두 쪽은 "JSON 구조가 같다"는
  // 약속으로만 연결된다). 각자 본인 범위 테스트만 돌리면 그 약속이 깨져도(예: 그룹 코드가
  // FIELD/GK 대문자 + MatchEventType 키인데 파서는 field/gk 소문자 + PlayerStatCoreValues
  // 키를 기대) 양쪽 다 초록불이면서 접점만 조용히 죽는다 — 파서가 null을 반환하면
  // resolveRatingWeights()가 하드코딩 RATING_WEIGHT_DEFAULT로 폴백해 "엔진이 공통코드를
  // 전혀 읽지 않는" NFR-CFG-001 위반이 무증상으로 발생한다(37일차 팀장 검증에서 실제 발생).
  // 이 테스트는 실제 폴백 값을 실제 파서에 넣어 그 접점을 직접 검증한다.
  it('SAFE_DEFAULT_VALUES.RATING_WEIGHT을 parseRatingWeightConstant에 넣으면 null이 아니어야 한다', () => {
    const parsed = parseRatingWeightConstant(SAFE_DEFAULT_VALUES.RATING_WEIGHT);
    expect(parsed).not.toBeNull();
  });

  it('파싱된 값에 FR-ST-003 명시 6개 항목이 문서값 그대로 존재한다', () => {
    const parsed = parseRatingWeightConstant(SAFE_DEFAULT_VALUES.RATING_WEIGHT);
    if (!parsed) {
      throw new Error(
        'RATING_WEIGHT 파싱 실패 — 바로 위 테스트가 먼저 이 실패를 잡아야 정상이다. ' +
          '3팀 fallback.ts가 아직 stat-keyed 구조로 재작성되지 않았을 수 있다.',
      );
    }

    expect(parsed.field.goals).toBe(1.0); // 문서: "골 +1.0"
    expect(parsed.field.assists).toBe(0.7); // 문서: "도움 +0.7"
    expect(parsed.field.keyPasses).toBe(0.1); // 문서: "키패스 +0.1"
    expect(parsed.field.errorsLeadingToGoal).toBe(-1.0); // 문서: "실책-실점 −1.0"
    expect(parsed.field.yellowCards).toBe(-0.3); // 문서: "경고 −0.3"
    expect(parsed.field.redCards).toBe(-1.0); // 문서: "퇴장 −1.0"
  });
});
