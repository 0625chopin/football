/**
 * `src/lib/sim/standing/rating.ts`
 *
 * Task 026(37일차) — "경기 평점 산출(FR-ST-003)". `docs/team-schedule/
 * 02-시뮬레이션엔진팀.md` 37일차 행. FR-ST-003 원문: "기본 6.0에서 시작해 이벤트
 * 가중치(골 +1.0, 도움 +0.7, 키패스 +0.1, 실책-실점 −1.0, 경고 −0.3, 퇴장 −1.0 등)를
 * 가감하고 [1.0, 10.0]으로 클램프한다. GK는 별도 가중치표를 사용한다. 가중치는 공통코드
 * `RATING_WEIGHT`로 관리한다."
 *
 * ## I-187 팀장 판정 — 가중치는 주입, 하드코딩 금지 (I-83 패턴)
 * 이 파일은 `src/lib/sim/**`라 `loadConstants('RATING_WEIGHT')`를 직접 호출하지 않는다
 * (팀 소유 경로 규칙, `docs/team-schedule/02-시뮬레이션엔진팀.md` §1 "절대 금지"). 대신
 * 값을 `RatingWeightConstants` 파라미터로 주입받고, 미주입 시 `RATING_WEIGHT_DEFAULT`
 * (FR-ST-003 원문 예시값 그대로)를 안전 기본값으로 쓴다 — `tiebreak.ts`의
 * `MATCH_POINTS_DEFAULT`와 동일한 패턴.
 *
 * ## I-66 타입 간극 — 런타임 검증 어댑터
 * `loadConstants(group)`의 JSON 그룹 반환은 `Readonly<Record<string, Readonly<Record<string,
 * unknown>>>>`(그룹→코드→object, `loader.ts`의 `ConstantGroupValues<'RATING_WEIGHT'>` 정의)로
 * 키가 컴파일타임에 열려 있다. 오케스트레이션 계층이 이 값을 그대로 엔진에 주입하면 타입
 * 안전성이 경계에서 끊긴다 — `parseRatingWeightConstant()`가 그 경계 검증기다. 무검증
 * 캐스팅(`as RatingWeightConstants`) 대신 코드·필드별 검사를 거쳐, 구조가 어긋나면(3팀 값이
 * 아직 비어 있는 `{}` 폴백 포함, I-71) `null`을 반환한다 — 호출자는 `resolveRatingWeights()`로
 * `null`일 때 안전 기본값을 쓴다.
 *
 * **저장 형태가 `{ base, min, max, field, gk }`(flat)가 아니라 `FIELD`/`GK`/`SCALE` 3코드인
 * 이유(팀장 판정, 37일차)**: 공통코드 모델은 "그룹 → 코드 → JSON object"만 표현 가능하다
 * (`ConstantGroupValues<G>`가 코드값 전체를 `Readonly<Record<string, unknown>>`로 강제 —
 * 코드 하나의 값이 순수 스칼라 `number`인 형태는 저장 자체가 안 됨, 3팀이 `TS2322`로 재현).
 * 그래서 `base`/`min`/`max` 스칼라 3개를 `SCALE`이라는 코드 하나의 object로 묶어 담는다:
 * `{ FIELD: {...}, GK: {...}, SCALE: { base, min, max } }`. 이 파서가 그 3코드를 읽어
 * 내부 표현(`RatingWeightConstants`)으로 변환하는 유일한 지점이다 — config 쪽에 별도
 * 정규화 어댑터를 두지 않는다(팀장 지시, 정규화 계층을 2단으로 늘리지 않음).
 *
 * ## 소비 가능한 필드는 오늘 기준 Tier A뿐 — 미래 확장은 코드 변경 없이 활성화
 * `PlayerMatchStatTierAFold`(`match/stats.ts`, 11일차)는 `PlayerStatCoreValues` 56필드 중
 * 오늘 이벤트 폴드로 실제 계산되는 16개(Tier A)만 갖는다. FR-ST-003 예시의 "키패스"·
 * "실책-실점"은 Tier B(요구사항 근거 부재로 아직 미계산, `stats.ts` 분류표 참조)라 오늘은
 * 그 가중치가 곱해질 데이터 자체가 없다. 이 파일은 가중치 테이블을
 * `keyof PlayerStatCoreValues`(56필드 전량 유니온)로 열어 두고 `fold`에 **실제로 존재하는
 * 키만** 순회해 곱한다 — Tier B 필드가 나중에 Tier A로 승격돼도 이 파일을 고칠 필요가
 * 없다. `RATING_WEIGHT_DEFAULT`에는 FR-ST-003 원문 예시값(키패스·실책-실점 포함)을 전부
 * 그대로 담아 문서적 근거를 보존한다.
 *
 * ## GK 판별은 이 파일 책임 밖
 * "GK는 별도 가중치표를 사용한다"의 GK 여부(포지션) 판정은 `PlayerMatchStatTierAFold`에
 * 없다(라인업/포지션 컨텍스트, `stats.ts`의 `NEEDS_ROSTER_CONTEXT` 분류와 동일 사유) —
 * 호출자가 `isGoalkeeper`를 명시적으로 넘긴다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건. 타입은 `@/types`
 * 배럴로만 import.
 */

import type { PlayerStatCoreValues } from '@/types';
import type { PlayerMatchStatTierAFold } from '../match/stats';

/** `RATING_WEIGHT` 필드플레이어/GK 가중치 테이블 — 키는 `PlayerStatCoreValues` 필드명과 동일. */
export type RatingWeightTable = Readonly<Partial<Record<keyof PlayerStatCoreValues, number>>>;

/** FR-ST-003이 정의하는 평점 산식 상수 전체(기본값·클램프 범위·필드플레이어/GK 가중치표). */
export interface RatingWeightConstants {
  readonly base: number;
  readonly min: number;
  readonly max: number;
  readonly field: RatingWeightTable;
  readonly gk: RatingWeightTable;
}

/**
 * FR-ST-003 원문 예시값 — 미주입 시 안전 기본값(I-83 패턴). `gk`의 `saves`/`penaltiesSaved`는
 * 원문에 구체 수치가 없어(GK는 "별도 가중치표"만 요구) 이 파일이 잠정 부여한 값이다
 * (031b 밸런싱 튜닝 대상 — 근거 없는 값이라 이슈 후보로 팀장 보고에 포함).
 */
export const RATING_WEIGHT_DEFAULT: RatingWeightConstants = {
  base: 6.0,
  min: 1.0,
  max: 10.0,
  field: {
    goals: 1.0,
    assists: 0.7,
    keyPasses: 0.1,
    errorsLeadingToGoal: -1.0,
    yellowCards: -0.3,
    redCards: -1.0,
  },
  gk: {
    goals: 1.0,
    assists: 0.7,
    keyPasses: 0.1,
    errorsLeadingToGoal: -1.0,
    yellowCards: -0.3,
    redCards: -1.0,
    saves: 0.2,
    penaltiesSaved: 1.0,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 경기 평점 산출(FR-ST-003) — `weights.base`에서 시작해 `fold`에 실제로 존재하는 필드만
 * 가중 합산하고 `[weights.min, weights.max]`로 클램프한다. `isGoalkeeper`에 따라
 * `weights.field`/`weights.gk` 중 하나만 적용한다.
 */
export function computeMatchRating(
  fold: PlayerMatchStatTierAFold,
  isGoalkeeper: boolean,
  weights: RatingWeightConstants = RATING_WEIGHT_DEFAULT,
): number {
  const table = isGoalkeeper ? weights.gk : weights.field;
  let rating = weights.base;

  for (const key of Object.keys(fold) as (keyof PlayerMatchStatTierAFold)[]) {
    const weight = table[key];
    if (weight === undefined) continue;
    rating += weight * fold[key];
  }

  return clamp(rating, weights.min, weights.max);
}

// ── I-66 런타임 검증 어댑터 ──────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseWeightTable(raw: unknown): RatingWeightTable | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const table: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isFiniteNumber(value)) return null;
    table[key] = value;
  }
  return table as RatingWeightTable;
}

function parseScale(raw: unknown): { base: number; min: number; max: number } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!isFiniteNumber(obj.base) || !isFiniteNumber(obj.min) || !isFiniteNumber(obj.max)) {
    return null;
  }
  return { base: obj.base, min: obj.min, max: obj.max };
}

/**
 * `loadConstants('RATING_WEIGHT')`가 반환한 `Readonly<Record<string, unknown>>`(그룹 코드
 * `FIELD`/`GK`/`SCALE` 3개)를 `RatingWeightConstants`로 검증·변환한다(I-66). 기대 구조:
 * `{ FIELD: {...}, GK: {...}, SCALE: { base, min, max } }` — `FIELD`/`GK`는
 * `PlayerStatCoreValues` 필드명을 키로 하는 숫자 값 객체, `SCALE`은 숫자 3개를 담은 object
 * (파일 헤더 "저장 형태가 flat이 아닌 이유" 참조 — 공통코드 모델이 코드당 순수 스칼라를
 * 저장할 수 없어 `SCALE` 코드로 묶었다). 3코드 중 하나라도 없거나 구조가 어긋나면(3팀 값이
 * 아직 비어 있는 `{}` 폴백 포함, I-71) `null`을 반환한다.
 */
export function parseRatingWeightConstant(raw: unknown): RatingWeightConstants | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const scale = parseScale(obj.SCALE);
  if (scale === null) return null;

  const field = parseWeightTable(obj.FIELD);
  const gk = parseWeightTable(obj.GK);
  if (field === null || gk === null) return null;

  return { base: scale.base, min: scale.min, max: scale.max, field, gk };
}

/** `parseRatingWeightConstant()`가 `null`을 반환하면 안전 기본값으로 대체한다(I-71). */
export function resolveRatingWeights(raw: unknown): RatingWeightConstants {
  return parseRatingWeightConstant(raw) ?? RATING_WEIGHT_DEFAULT;
}
