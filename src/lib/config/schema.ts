/**
 * 타입·범위 메타데이터 + JSON 스키마 검증 — **37일차(2026-09-09), Task 031a 계속분**
 *
 * 근거: `ROADMAP.md` Task 031a 37일차 행 "타입·범위 메타데이터 및 DB 제약, JSON 스키마
 * 검증(NFR-CFG-004)" / `docs/require/04-non-functional-requirements.md` NFR-CFG-004
 * "설정 값 검증 — 잘못된 값이 저장되어 세계가 붕괴하지 않아야 한다"(수용 기준 ①~④) /
 * `src/types/config.ts` E-42 `CommonCode.minValue`/`maxValue`/`jsonSchema`(13일차 이슈
 * 배치 I-93로 그룹(E-41)에서 코드(E-42) 레벨로 이동한 필드). 소유: 3팀 데이터·밸런싱·
 * 배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 코드 레벨 숫자 허용 범위(min/max) 카탈로그, JSON형 그룹의 코드별 JSON
 *   스키마(자체 구현 — 의존성 추가 없이 이 파일이 실제로 쓰는 서브셋만 지원, 아래
 *   "JSON 스키마 서브셋" 절 참조), 이 둘을 `CommonCode` 저장 페이로드(값 후보)에 적용해
 *   범위 밖·스키마 불일치 값을 **저장 전에 거부**하는 검증 함수(`validateCommonCodeValue`).
 * - **담지 않는 것(이후 일차 소관)**: 물리 DB CHECK 제약 SQL 자체(6팀 DB·인프라 소유
 *   경로, H-17 — 이 파일이 노출하는 범위/스키마 메타데이터가 그 제약을 작성할 때 참고
 *   출발점이 된다) · 36개 그룹 실제 시드값(38일차 `supabase/seed/common-code.sql`) ·
 *   발효 정책 적용(38일차 `apply.ts`). 이 파일은 **애플리케이션 레벨** 검증 게이트만
 *   제공한다 — NFR-CFG-004 ②의 "DB 제약 **또는** 애플리케이션 검증" 중 후자를 오늘
 *   시점에 이 경로(`src/lib/config/**`)에서 구현 가능한 형태로 채운다.
 *
 * ## 범위 메타데이터 커버리지 — 부분 채움, "억측 금지" 원칙 유지
 * `catalog.ts` 헤더가 이미 확립한 원칙("실측 근거 없이 범위를 추정하지 않는다")을 그대로
 * 따른다. `NUMERIC_RANGE_CATALOG`는 **의미가 문서·주석에 명시적으로 드러난 코드만**
 * 채웠다 — 퍼센트(`*_PCT`/`*_CAP`류), 확률(`fallback.ts` 주석이 "확률"이라고 명시한
 * 코드), 배당(decimal odds는 정의상 1.0 이상), 물리적으로 음수가 불가능한 개수·기간류
 * (팀 수·간격(분)·라운드 수·상금·연차 등)만 대상이다. 배율 계수처럼 이름만으로 상한이
 * 불명확한 코드(예: `GROWTH_AGE_FACTOR`의 `*_UP`/`*_DOWN`, `RETIREMENT_PARAM`의
 * `RISK_START_AGE`/`FORCE_AGE`)는 **의도적으로 비워 뒀다** — `getNumericRange`는 등록이
 * 없으면 `{ min: null, max: null }`(무제한)을 반환하므로 검증 자체가 깨지지는 않지만,
 * 그 코드에 대해서는 NFR-CFG-004 ①("범위 메타데이터 존재")이 완전히 충족되지 않는다.
 * `catalog.ts`가 명시한 대로 이는 "그룹별로 점진 채워지는" 작업이며, 나머지는 031b
 * 밸런싱 튜닝 시점에 실측이 쌓이면 보강한다(팀장 보고에 남김).
 *
 * ## JSON 스키마 서브셋
 * `ajv` 등 외부 검증 라이브러리는 미설치이고(package.json — `docs/CLAUDE.md` "아직
 * 도입되지 않은 것"에 준하는 상태) 이 파일이 실제로 표현해야 할 스키마는 얕은 object/
 * array 조합뿐이므로, JSON Schema draft-07의 아주 좁은 서브셋(`type`/`properties`/
 * `required`/`additionalProperties`/`items`/`minimum`/`maximum`/`minItems`/`maxItems`/
 * `enum`)만 직접 구현한다(`matchesJsonSchema`). 새 의존성을 추가하는 대신 이미 있는
 * 값(`CUP_PARAM`·`MANAGER_STYLE_XG`, 전부 얕은 object/array)을 표현할 수 있는 최소
 * 집합만 지원한다 — 표준 JSON Schema 전체 구현이 아니다.
 *
 * **37일차 갱신**: `RATING_WEIGHT`는 최초 이 파일에 `MatchEventType` 기반 코드별 스키마로
 * 등록됐으나, 팀장이 `fallback.ts`의 키 공간을 `keyof PlayerStatCoreValues`로 재판정하며
 * 저장 형태도 `FIELD`/`GK`/`SCALE` 3코드(코드→object 맵)로 바뀌었다(2팀 `rating.ts` 접점
 * 계약, `fallback.ts`의 `SAFE_DEFAULT_VALUES` JSDoc "RATING_WEIGHT 저장 형태" 절 참조).
 * 구조 자체는 이 파일의 "그룹→코드→스키마" 모델과 여전히 맞지만, `field`/`gk` 내부는
 * 56필드 전량을 강제하지 않는 `Partial` 구조(팀장 지시)라 오늘은 코드별 스키마를 새로
 * 만들지 않고 `WEATHER_EFFECT`류와 동일하게 `DEFAULT_JSON_SCHEMA`로 폴백시킨다(031b 이후
 * 점진 보강 대상).
 *
 * ## import 규약
 * 도메인 타입(`CommonCodeValueType`)은 배럴(`@/types`)에서만 import한다(체크리스트
 * C-5·C-6). 그룹 메타데이터는 같은 소유 디렉터리의 `./catalog`에서 가져온다.
 * `src/lib/sim/**`, `src/types/**`는 이 작업에서 수정하지 않는다.
 */

import type { CommonCodeValueType } from '@/types';
import { COMMON_CODE_GROUP_BY_CODE, type CommonCodeGroupCode } from './catalog';

/* ────────────────────────────────────────────────────────────────────────
 * 숫자 허용 범위(min/max) 카탈로그
 * ──────────────────────────────────────────────────────────────────────── */

export interface NumericRange {
  readonly min: number | null;
  readonly max: number | null;
}

const UNBOUNDED: NumericRange = { min: null, max: null };

/** 그룹 → 코드 → 허용 범위. 등록되지 않은 코드는 `getNumericRange`가 `UNBOUNDED`를 반환한다. */
const NUMERIC_RANGE_CATALOG: Partial<
  Record<CommonCodeGroupCode, Readonly<Record<string, NumericRange>>>
> = {
  // 팀 수 — 경기가 성립하려면 최소 2팀 필요(물리적 하한, 상한은 미정).
  LEAGUE_TEAM_COUNT: {
    LEAGUE_1: { min: 2, max: null },
    LEAGUE_2: { min: 2, max: null },
    LEAGUE_3: { min: 2, max: null },
  },
  // 승격·강등 슬롯 — 개수는 음수가 될 수 없다.
  PROMOTION_RELEGATION_SLOTS: {
    PROMOTION: { min: 0, max: null },
    RELEGATION: { min: 0, max: null },
  },
  // 승점 — 음수 승점 제도는 FR-LG-004 어디에도 없다.
  MATCH_POINTS: {
    WIN: { min: 0, max: null },
    DRAW: { min: 0, max: null },
    LOSS: { min: 0, max: null },
  },
  // 라운드 간격(분) — 지속시간은 양수.
  ROUND_INTERVAL_MIN: {
    LEAGUE_1: { min: 1, max: null },
    LEAGUE_2: { min: 1, max: null },
    LEAGUE_3: { min: 1, max: null },
  },
  // 페이즈 길이(분) — 지속시간은 양수.
  PHASE_DURATION_MIN: {
    REGULAR: { min: 1, max: null },
    CUP_SLOT: { min: 1, max: null },
    PLAYOFF: { min: 1, max: null },
    SETTLEMENT: { min: 1, max: null },
    PRESEASON: { min: 1, max: null },
  },
  // BASE/RANGE는 배율 분수(0~1), MIN_C/MAX_C는 평점 스케일(FR-ST-003 클램프 [1.0, 10.0])과
  // 같은 도메인 — CONDITION_MULT 설명에 "컨디션 배율 계수"로 그 범위가 그대로 쓰인다.
  CONDITION_MULT: {
    BASE: { min: 0, max: 1 },
    RANGE: { min: 0, max: 1 },
    MIN_C: { min: 1, max: 10 },
    MAX_C: { min: 1, max: 10 },
  },
  // MULT_BASE/MULT_RANGE는 배율 분수, DRAIN_FULL/RECOVER는 음수가 될 수 없는 수치.
  FITNESS_PARAM: {
    MULT_BASE: { min: 0, max: 1 },
    MULT_RANGE: { min: 0, max: 1 },
    DRAIN_FULL: { min: 0, max: null },
    RECOVER: { min: 0, max: null },
  },
  // "숙련도 배율" — 이름 자체가 감쇄 배율(≤1)임을 명시한다(FR-PL-006).
  POSITION_PROFICIENCY_MULT: {
    P5: { min: 0, max: 1 },
    P4: { min: 0, max: 1 },
    P3: { min: 0, max: 1 },
    P2: { min: 0, max: 1 },
    P1: { min: 0, max: 1 },
    UNFAMILIAR_BASE: { min: 0, max: 1 },
    UNFAMILIAR_STEP: { min: 0, max: 1 },
    UNFAMILIAR_FLOOR: { min: 0, max: 1 },
    GK_CROSS: { min: 0, max: 1 },
  },
  // 홈 어드밴티지 배율 — 음수 배율은 정의상 불가.
  HOME_ADVANTAGE: {
    MULT: { min: 0, max: null },
  },
  // 날씨 발생 확률 — 명시적으로 "확률(합 1.0)"(catalog.ts 설명).
  WEATHER_PROBABILITY: {
    CLEAR: { min: 0, max: 1 },
    RAIN: { min: 0, max: 1 },
    HEAVY_RAIN: { min: 0, max: 1 },
    SNOW: { min: 0, max: 1 },
    WINDY: { min: 0, max: 1 },
    HOT: { min: 0, max: 1 },
    COLD: { min: 0, max: 1 },
    FOG: { min: 0, max: 1 },
    CLOUDY: { min: 0, max: 1 },
  },
  // BASE_TICK_PROB는 확률, *_MULT는 감쇄 배율(≤1), S*_MIN/MAX는 결장일 수(음수 불가).
  INJURY_PARAM: {
    BASE_TICK_PROB: { min: 0, max: 1 },
    SEVERITY_1_MULT: { min: 0, max: 1 },
    SEVERITY_4_RETURN_MULT: { min: 0, max: 1 },
    S2_MIN: { min: 0, max: null },
    S2_MAX: { min: 0, max: null },
    S3_MIN: { min: 0, max: null },
    S3_MAX: { min: 0, max: null },
    S4_MIN: { min: 0, max: null },
    S4_MAX: { min: 0, max: null },
  },
  // 팀 캐미 계수 — STEP/CAP 모두 분수 배율.
  FAMILIARITY: {
    STEP: { min: 0, max: 1 },
    CAP: { min: 0, max: 1 },
  },
  // 순위 포인트 곡선 — 포인트 풀은 음수 불가, EXP(지수)는 양수여야 곡선이 증가한다.
  LEAGUE_FINISH_POINT: {
    L1_BASE: { min: 0, max: null },
    L1_RANGE: { min: 0, max: null },
    L2_BASE: { min: 0, max: null },
    L2_RANGE: { min: 0, max: null },
    L3_BASE: { min: 0, max: null },
    L3_RANGE: { min: 0, max: null },
    EXP: { min: 0, max: null },
  },
  // 상금 — 음수 불가.
  PLAYOFF_PRIZE: {
    L1_WIN: { min: 0, max: null },
    L3_RUNNERUP: { min: 0, max: null },
  },
  CUP_PRIZE: {
    WIN: { min: 0, max: null },
    RUNNERUP: { min: 0, max: null },
    SF: { min: 0, max: null },
    QF: { min: 0, max: null },
    R16: { min: 0, max: null },
    R32: { min: 0, max: null },
    R1: { min: 0, max: null },
    GIANT_KILLING: { min: 0, max: null },
  },
  // OVR_DIVISOR/OVR_EXP는 0 이하면 공식이 붕괴(0 나눔·비증가 곡선), POT_STEP은 분수 배율,
  // FLOOR(하한값)는 음수 불가.
  MARKET_VALUE_PARAM: {
    OVR_DIVISOR: { min: 0, max: null },
    OVR_EXP: { min: 0, max: null },
    POT_STEP: { min: 0, max: 1 },
    FLOOR: { min: 0, max: null },
  },
  // 급여 비율 — 이름 자체가 비율(0~1).
  WAGE_RATIO: {
    RATIO: { min: 0, max: 1 },
  },
  // SHARE_PCT_CAP은 명시적 퍼센트, 나머지 개수류는 음수 불가.
  SPONSOR_PARAM: {
    MAX_PER_TEAM: { min: 0, max: null },
    CONTRACT_MIN: { min: 0, max: null },
    CONTRACT_MAX: { min: 0, max: null },
    SHARE_PCT_CAP: { min: 0, max: 100 },
    POOL_MIN: { min: 0, max: null },
  },
  // 계약 연차 — 최소 1년.
  CONTRACT_PARAM: {
    YEARS_MIN: { min: 1, max: null },
    YEARS_MAX: { min: 1, max: null },
  },
  // 스쿼드 규모 — 인원수는 음수 불가.
  SQUAD_PARAM: {
    MIN: { min: 0, max: null },
    MAX: { min: 0, max: null },
    HARD_MIN: { min: 0, max: null },
    GK_MIN: { min: 0, max: null },
    CB_MIN: { min: 0, max: null },
  },
  // BASE/LEVEL_STEP은 배출 확률성 분수(FR-YT-001), SANCTION_BONUS_PP는 분수 가산치.
  YOUTH_PARAM: {
    BASE: { min: 0, max: 1 },
    LEVEL_STEP: { min: 0, max: 1 },
    SANCTION_BONUS_PP: { min: 0, max: 1 },
  },
  // BASE_PROB는 명시적 확률(은퇴 확률). 나이 임계값(RISK_START_AGE/FORCE_AGE)은 상한이
  // 문서에 없어 의도적으로 비워 둔다(위 헤더 "억측 금지" 절 참조).
  RETIREMENT_PARAM: {
    BASE_PROB: { min: 0, max: 1 },
  },
  // decimal odds는 정의상 1.0 이상(원금 미회수 배당은 존재하지 않는다), OVERROUND(마진)도
  // 1.0 이상이어야 북메이커 마진이 성립한다. 몬테카를로 반복·분할·주기 파라미터는 1회
  // 이상이어야 의미가 있다.
  ODDS_PARAM: {
    MC_N_MATCH: { min: 1, max: null },
    MC_N_SEASON: { min: 1, max: null },
    REFRESH_ROUND_INTERVAL: { min: 1, max: null },
    OVERROUND: { min: 1, max: null },
    MIN_ODDS: { min: 1, max: null },
    MAX_ODDS: { min: 1, max: null },
    INITIAL_LEAD_MIN: { min: 1, max: null },
    PARTITION_COUNT: { min: 1, max: null },
  },
  // 베팅 한계 — 금액·판수는 음수 불가.
  BET_LIMIT: {
    STAKE_MIN: { min: 0, max: null },
    SINGLE_MAX: { min: 0, max: null },
    MULTI_RETURN_MAX: { min: 0, max: null },
    LEGS_MAX: { min: 0, max: null },
  },
  // UI 폴링 주기(ms)는 양수, LEADERBOARD_MIN_APPEARANCE_PCT는 명시적 퍼센트.
  UI_PARAM: {
    POLL_INTERVAL_MS: { min: 1, max: null },
    POLL_LIVE_MS: { min: 1, max: null },
    LEADERBOARD_MIN_APPEARANCE_PCT: { min: 0, max: 100 },
  },
  // 크론 간격·타임아웃(분)은 양수, 재시도/캐치업 개수는 음수 불가.
  CRON_PARAM: {
    INTERVAL_MIN: { min: 1, max: null },
    LOCK_TIMEOUT_MIN: { min: 1, max: null },
    CATCHUP_MAX_PER_RUN: { min: 0, max: null },
    RETRY_MAX: { min: 0, max: null },
    GAP_DETECT_MULTIPLIER: { min: 1, max: null },
  },
  // GRANT_PCT/YOUTH_BONUS_PP는 분수, 명성 페널티는 음수 불가.
  SANCTION_PARAM: {
    REP_PENALTY_PERMANENT: { min: 0, max: null },
    REP_PENALTY_NEGOTIATION: { min: 0, max: null },
    GRANT_PCT: { min: 0, max: 1 },
    YOUTH_BONUS_PP: { min: 0, max: 1 },
  },
  // 카드·정지 임계값·범위는 최소 1(0건 임계값·범위는 규칙 자체가 무의미).
  CARD_PARAM: {
    SUSPENSION_THRESHOLD: { min: 1, max: null },
    RED_MIN: { min: 1, max: null },
    RED_MAX: { min: 1, max: null },
  },
  // 보정 체인 클램프 상하한 — 배율이므로 음수 불가(그룹 자체가 다른 배율들의 클램프
  // 경계이므로 이 클램프 값의 상한은 별도 근거가 없어 비워 둔다).
  EFFECTIVE_MULT_CLAMP: {
    MIN: { min: 0, max: null },
    MAX: { min: 0, max: null },
  },
  // *_PCT류는 명시적 퍼센트, SUCCESS_MIN/MAX는 주석이 명시한 확률, PER_TEAM_MAX는 개수.
  TRANSFER_PARAM: {
    RATE_MIN_PCT: { min: 0, max: 100 },
    RATE_MAX_PCT: { min: 0, max: 100 },
    PER_TEAM_MAX: { min: 0, max: null },
    SUCCESS_MIN: { min: 0, max: 1 },
    SUCCESS_MAX: { min: 0, max: 1 },
    TRADE_VALUE_GAP_PCT: { min: 0, max: 100 },
    LOAN_WAGE_SHARE_PCT: { min: 0, max: 100 },
  },
};

/**
 * 코드의 숫자 허용 범위를 조회한다. 등록되지 않은 그룹·코드는 `{ min: null, max: null }`
 * (무제한)을 반환한다 — E-42 `CommonCode.minValue`/`maxValue`가 숫자형이 아니면 둘 다
 * `null`인 것과 동일한 표현이다.
 */
export function getNumericRange(groupCode: CommonCodeGroupCode, code: string): NumericRange {
  return NUMERIC_RANGE_CATALOG[groupCode]?.[code] ?? UNBOUNDED;
}

/* ────────────────────────────────────────────────────────────────────────
 * JSON 스키마(얕은 서브셋) 카탈로그
 * ──────────────────────────────────────────────────────────────────────── */

export type JsonSchema = Readonly<{
  type?: 'object' | 'array' | 'number' | 'integer' | 'string' | 'boolean';
  properties?: Readonly<Record<string, JsonSchema>>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  enum?: readonly unknown[];
}>;

/** 스키마가 등록되지 않은 JSON형 코드에 적용되는 기본 스키마 — "object여야 한다"만 강제한다. */
const DEFAULT_JSON_SCHEMA: JsonSchema = { type: 'object' };

/**
 * 감독 성향 xG 배율 스키마(FR-MT-009) — 배율은 음수가 불가하고, 상한 3.0은 문서 실값
 * (0.88~1.12)보다 여유를 둔 튜닝 헤드룸이다(031b 밸런싱 튜닝 대상, 과도한 값만 걷어낸다).
 */
const MANAGER_STYLE_XG_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    ownXgMultiplier: { type: 'number', minimum: 0, maximum: 3 },
    concededXgMultiplier: { type: 'number', minimum: 0, maximum: 3 },
  },
  required: ['ownXgMultiplier', 'concededXgMultiplier'],
  additionalProperties: false,
};

/** 그룹 → 코드 → JSON 스키마. 등록되지 않은 JSON형 코드는 `getJsonSchema`가 `DEFAULT_JSON_SCHEMA`를 반환한다. */
const JSON_SCHEMA_CATALOG: Partial<
  Record<CommonCodeGroupCode, Readonly<Record<string, JsonSchema>>>
> = {
  // 컵대회 설정 — BYE_COUNT는 정수 스칼라, INSERT_ROUNDS는 오름차순이 아니라 "라운드
  // 번호 배열"이라는 것만 스키마로 강제한다(순서 불변식은 이 서브셋 밖).
  CUP_PARAM: {
    BYE_COUNT: {
      type: 'object',
      properties: { value: { type: 'integer', minimum: 0 } },
      required: ['value'],
      additionalProperties: false,
    },
    INSERT_ROUNDS: {
      type: 'object',
      properties: {
        value: { type: 'array', items: { type: 'integer', minimum: 1 }, minItems: 1 },
      },
      required: ['value'],
      additionalProperties: false,
    },
  },
  // RATING_WEIGHT는 37일차 2차 판정(팀장, I-187)으로 "코드→JSON object 맵"이 아니라
  // 그룹 전체가 하나의 문서({ base, min, max, field, gk })인 특수 케이스로 바뀌었다
  // (`fallback.ts`의 `RatingWeightRawValue`/`SafeDefaultValueFor` 참조) — 이 파일의
  // "그룹 → 코드 → 스키마" 모델과 더 이상 맞지 않아 코드별 스키마를 등록하지 않는다.
  // `getJsonSchema('RATING_WEIGHT', code)`는 `DEFAULT_JSON_SCHEMA`로 폴백한다.
  MANAGER_STYLE_XG: {
    ATTACKING: MANAGER_STYLE_XG_SCHEMA,
    BALANCED: MANAGER_STYLE_XG_SCHEMA,
    DEFENSIVE: MANAGER_STYLE_XG_SCHEMA,
    COUNTER: MANAGER_STYLE_XG_SCHEMA,
    POSSESSION: MANAGER_STYLE_XG_SCHEMA,
    HIGH_PRESS: MANAGER_STYLE_XG_SCHEMA,
  },
  // WEATHER_EFFECT/OVR_WEIGHT/MANAGER_MATCHUP은 구조 자체가 미정(fallback.ts 빈 구조 —
  // I-187 팀장 판정으로 별도 산정 대상 확정)이라 코드별 스키마를 등록하지 않는다.
  // `getJsonSchema`가 `DEFAULT_JSON_SCHEMA`("object여야 한다")로 폴백해 NFR-CFG-004 ③의
  // 최소선만 충족한다.
};

/** 코드의 JSON 스키마를 조회한다. 등록되지 않으면 `DEFAULT_JSON_SCHEMA`를 반환한다. */
export function getJsonSchema(groupCode: CommonCodeGroupCode, code: string): JsonSchema {
  return JSON_SCHEMA_CATALOG[groupCode]?.[code] ?? DEFAULT_JSON_SCHEMA;
}

/**
 * `JsonSchema` 서브셋(위 헤더 참조)에 대해 `value`가 일치하는지 검사한다. 실패 시
 * 첫 번째 위반 사유를 문자열로 반환하고, 통과하면 `null`을 반환한다(예외를 던지지 않는
 * 내부 헬퍼 — 공개 진입점인 `validateCommonCodeValue`가 예외로 감싼다).
 */
function matchesJsonSchema(value: unknown, schema: JsonSchema, path = '$'): string | null {
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    return `${path}: enum ${JSON.stringify(schema.enum)}에 속하지 않음(값: ${JSON.stringify(value)})`;
  }

  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `${path}: object가 아님`;
      }
      const record = value as Readonly<Record<string, unknown>>;
      for (const key of schema.required ?? []) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          return `${path}: 필수 키 "${key}" 없음`;
        }
      }
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties ?? {}));
        for (const key of Object.keys(record)) {
          if (!allowed.has(key)) {
            return `${path}: 허용되지 않은 키 "${key}"`;
          }
        }
      }
      for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) {
          continue;
        }
        const failure = matchesJsonSchema(record[key], propSchema, `${path}.${key}`);
        if (failure !== null) {
          return failure;
        }
      }
      return null;
    }
    case 'array': {
      if (!Array.isArray(value)) {
        return `${path}: array가 아님`;
      }
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        return `${path}: 최소 길이 ${schema.minItems} 미달(실제: ${value.length})`;
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        return `${path}: 최대 길이 ${schema.maxItems} 초과(실제: ${value.length})`;
      }
      if (schema.items !== undefined) {
        for (let i = 0; i < value.length; i += 1) {
          const failure = matchesJsonSchema(value[i], schema.items, `${path}[${i}]`);
          if (failure !== null) {
            return failure;
          }
        }
      }
      return null;
    }
    case 'number':
    case 'integer': {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${path}: number가 아님`;
      }
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        return `${path}: integer가 아님(값: ${value})`;
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        return `${path}: 최소값 ${schema.minimum} 미달(값: ${value})`;
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        return `${path}: 최대값 ${schema.maximum} 초과(값: ${value})`;
      }
      return null;
    }
    case 'string': {
      return typeof value === 'string' ? null : `${path}: string이 아님`;
    }
    case 'boolean': {
      return typeof value === 'boolean' ? null : `${path}: boolean이 아님`;
    }
    default:
      return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * 저장 전 검증 게이트 — NFR-CFG-004
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 검증 실패 사유. `type`으로 판별한다 — ①`OUT_OF_RANGE`(수용 기준 ②) ②`SCHEMA_MISMATCH`
 * (수용 기준 ③) ③`MISSING_VALUE`(값 타입에 맞는 필드 자체가 없음, 예: JSON형인데
 * `valueJson`이 `null`).
 */
export type CommonCodeValidationFailure =
  | { readonly type: 'MISSING_VALUE'; readonly valueType: CommonCodeValueType }
  | { readonly type: 'OUT_OF_RANGE'; readonly range: NumericRange; readonly value: number }
  | { readonly type: 'SCHEMA_MISMATCH'; readonly reason: string };

/** `validateCommonCodeValue`가 검증 실패 시 던지는 예외 — "저장 전 거부"의 실제 구현체. */
export class CommonCodeValidationError extends Error {
  constructor(
    readonly groupCode: CommonCodeGroupCode,
    readonly code: string,
    readonly failure: CommonCodeValidationFailure,
  ) {
    super(
      `[config/schema] "${groupCode}.${code}" 값이 NFR-CFG-004 검증에 실패해 저장을 거부한다: ` +
        describeFailure(failure),
    );
    this.name = 'CommonCodeValidationError';
  }
}

function describeFailure(failure: CommonCodeValidationFailure): string {
  switch (failure.type) {
    case 'MISSING_VALUE':
      return `값 타입(${failure.valueType})에 대응하는 필드가 없음`;
    case 'OUT_OF_RANGE':
      return `허용 범위(min=${failure.range.min ?? '-∞'}, max=${failure.range.max ?? '+∞'}) 밖의 값 ${failure.value}`;
    case 'SCHEMA_MISMATCH':
      return `JSON 스키마 불일치 — ${failure.reason}`;
    default:
      return '알 수 없는 검증 실패';
  }
}

/** `CommonCode`(E-42) 저장 페이로드 중 검증에 필요한 최소 필드. */
export interface CommonCodeValueCandidate {
  readonly groupCode: CommonCodeGroupCode;
  readonly code: string;
  readonly valueNum: number | null;
  readonly valueJson: Readonly<Record<string, unknown>> | null;
}

/**
 * `NFR-CFG-004`의 저장 전 검증 게이트. `groupCode`의 `valueType`(catalog.ts)에 따라
 * 분기한다 — `INT`/`DECIMAL`은 `valueNum` 범위 검증(①·②), `JSON`은 `valueJson` 스키마
 * 검증(①·③). 위반 시 `CommonCodeValidationError`를 던진다 — 호출자(향후 어드민 콘솔
 * 저장 경로, 시드 로더)는 이 함수를 실제 저장(INSERT/UPDATE) **이전**에 호출해야 한다.
 * `STRING`/`BOOL`은 이 파일이 다루는 범위/스키마 대상이 아니므로 통과시킨다(NFR-CFG-004
 * ①·③이 요구하는 대상은 숫자형 범위·JSON형 스키마뿐이다).
 */
export function validateCommonCodeValue(candidate: CommonCodeValueCandidate): void {
  const { groupCode, code, valueNum, valueJson } = candidate;
  const valueType = COMMON_CODE_GROUP_BY_CODE[groupCode].valueType;

  if (valueType === 'INT' || valueType === 'DECIMAL') {
    if (valueNum === null) {
      throw new CommonCodeValidationError(groupCode, code, { type: 'MISSING_VALUE', valueType });
    }
    const range = getNumericRange(groupCode, code);
    if ((range.min !== null && valueNum < range.min) || (range.max !== null && valueNum > range.max)) {
      throw new CommonCodeValidationError(groupCode, code, {
        type: 'OUT_OF_RANGE',
        range,
        value: valueNum,
      });
    }
    return;
  }

  if (valueType === 'JSON') {
    if (valueJson === null) {
      throw new CommonCodeValidationError(groupCode, code, { type: 'MISSING_VALUE', valueType });
    }
    const schema = getJsonSchema(groupCode, code);
    const failure = matchesJsonSchema(valueJson, schema);
    if (failure !== null) {
      throw new CommonCodeValidationError(groupCode, code, {
        type: 'SCHEMA_MISMATCH',
        reason: failure,
      });
    }
    return;
  }

  // STRING/BOOL — 오늘 시점(37일차) 카탈로그 38종 전량이 INT/DECIMAL/JSON뿐이라 이
  // 분기는 도달하지 않지만, `CommonCodeValueType`이 5종 유니온이라 완전성을 위해 둔다.
}

/** 예외를 던지지 않는 판정 버전. 실패 시 사유를, 통과 시 `null`을 반환한다. */
export function checkCommonCodeValue(
  candidate: CommonCodeValueCandidate,
): CommonCodeValidationFailure | null {
  try {
    validateCommonCodeValue(candidate);
    return null;
  } catch (error) {
    if (error instanceof CommonCodeValidationError) {
      return error.failure;
    }
    throw error;
  }
}
