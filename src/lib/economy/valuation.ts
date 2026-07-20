/**
 * 몸값 공식 — **21일차(2026-08-18), Task 029**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 21일차 행("몸값 공식(OVR·나이·잠재·
 * 명성·계약·티어), 하한 100pt 보장", 수락 "최저 몸값 ≥ 100pt") / `src/lib/config/catalog.ts`
 * `MARKET_VALUE_PARAM` 그룹(FR-EC-005, "OVR_DIVISOR=15, OVR_EXP=2.6, AGE_*, POT_STEP=0.05,
 * REP_BASE=0.8, REP_STEP=0.004, CONTRACT_*, TIER_*, FLOOR=100"). 소유: 3팀 데이터·밸런싱·
 * 배당팀(`src/lib/economy/**`).
 *
 * ## 20일차 `ledger.ts` 관례 승계
 * DC-08 정수 고정(최종 산출만 — 입력 스칼라는 `PlayerAttribute.ovrCached`처럼 평균 파생값이라
 * 정수가 아닐 수 있다), `@/types` 배럴 import(서브경로 금지). ID·Timestamp는 이 파일이 다루지
 * 않는다(순수 스칼라 계산이라 생성 대상 자체가 없다). 전용 Error 클래스도 두지 않았다 —
 * 입력이 잘못돼도 "예외를 던져 멈추는" 대신 "최악의 입력에도 하한을 구조적으로 보장한다"는
 * 편이 이 함수(단일 스칼라 반환, 트랜잭션 무결성과 무관)의 성격에 맞는다고 판단했다.
 *
 * ## 계수 소비 방식 — 20일차 `sim/ability/tactics.ts`의 "override 우선, 없으면
 * loadConstants" 패턴을 그대로 확장한다(`options?.table ?? loadConstants('MARKET_VALUE_PARAM')`).
 * `fallback.ts`(11일차)의 `SAFE_DEFAULT_VALUES.MARKET_VALUE_PARAM`에는 `OVR_DIVISOR`·
 * `OVR_EXP`·`POT_STEP`·`REP_BASE`·`REP_STEP`·`FLOOR` 6개만 채워져 있다 — `AGE_*`/`CONTRACT_*`/
 * `TIER_*`는 05문서 5.12.1 원본부터 `AGE_*`처럼 이름만 있고 구체 숫자가 없어(catalog.ts
 * `description`과 05문서가 동일 문자열) "억측 금지" 원칙(fallback.ts 헤더, WEATHER_EFFECT/
 * MANAGER_MATCHUP과 동일 사유)에 따라 안 채워진 상태다. 그래서 이 파일도 그 두 그룹과
 * 같은 취급을 한다 — 값이 없는 키는 조용히 **중립값**(나이·계약·티어 보정 없음, 배율 1)으로
 * 대체하고, 이미 결정된 6개 키는 `loadConstants`가 던지는 `ConstantSourceUnavailableError`를
 * 그대로 전파한다(부트스트랩 누락을 숨기지 않는다).
 *
 * ## 새로 정하는 키 (05문서 미명시 — `tactics.ts`의 `ABILITY_MULT`와 동일 성격)
 * `AGE_STEP_PCT`/`AGE_PEAK`(나이가 피크에서 멀수록 `AGE_STEP_PCT`만큼 배율 감소),
 * `CONTRACT_STEP_PCT`/`CONTRACT_REFERENCE_YEARS`(잔여 계약이 기준 연수보다 많을수록
 * `CONTRACT_STEP_PCT`만큼 배율 증가), `TIER_{n}_MULT`(리그 티어 1/2/3별 배율) — 이 5개
 * 이름은 이 파일이 처음 정한다. 36일차(031a) 시드 데이터 작성 시 이 키와 어긋나지 않도록
 * 정렬이 필요하다 — 팀장 보고에 이슈 후보로 남긴다.
 *
 * ## 공식과 반올림 근거
 * `raw = ovrBase(ovr) × potential(ovr, pa) × reputation(rep) × age(age) × contract(years) ×
 * tier(tier)`이며, `ovrBase = OVR_DIVISOR × ovr^OVR_EXP`다 — 그룹 내에서 절대 스케일(포인트
 * 단위)을 지니는 유일한 항이 이것이고 나머지 5항은 전부 1.0 근방의 무차원 배율이기 때문에,
 * "OVR_DIVISOR"라는 이름과 달리 여기서는 나눗셈이 아니라 스케일 계수로 곱셈에 쓴다 — 이름과
 * 실제 용법이 어긋나 보일 수 있어 이것도 팀장 보고 이슈 후보로 남긴다(36일차 이전에
 * `OVR_SCALE` 개명 검토 여지).
 * `Math.round`로 반올림한다: 몸값은 시장의 "추정치"이며 floor/ceil은 항상 한쪽으로만
 * 편향되는 반면(과소/과대평가 계통 오차), round는 편향이 없다 — DC-08은 정수만 요구할 뿐
 * 방향을 지정하지 않으므로 편향 없는 쪽을 택했다.
 *
 * ## 하한 보장 — 구조적 불변식 (수락 기준 "최저 몸값 ≥ 100pt")
 * ①  `ovr`이 음수로 들어와도(잘못된 호출) `ovr^OVR_EXP`가 `NaN`이 되지 않도록 `ovrBase`
 *    계산 전에 `Math.max(0, ovr)`로 밑을 0 이상으로 고정한다 — 음수 밑에 소수 지수는
 *    JS에서 `NaN`이라 `Math.max(rounded, floor)`의 `NaN` 전파(= "floor가 있어도 NaN이
 *    이긴다")로 하한이 뚫릴 수 있었다.
 * ②  최종 `raw`가 어떤 경로로든 `Number.isFinite`가 아니면(이론상 방어) 0으로 대체 후
 *    floor를 적용한다.
 * ③  마지막 줄이 항상 `Math.max(rounded, floor)`이며 그 앞의 모든 배율 계산과 완전히
 *    분리돼 있다 — 배율 로직이 아무리 바뀌어도 이 한 줄만 보면 하한이 지켜짐을 알 수 있다.
 */

import type { Points } from '@/types';
import type { ConstantGroupValues } from '@/lib/config/loader';
import { loadConstants } from '@/lib/config/loader';

type MarketValueParamTable = ConstantGroupValues<'MARKET_VALUE_PARAM'>;

/** 배율 항의 중립값(보정 없음) — `tactics.ts`의 `NEUTRAL_MODIFIER`와 동일 개념, 이 파일 전용 상수. */
const NEUTRAL_MULTIPLIER = 1;

export interface MarketValueInput {
  /** `PlayerAttribute.ovrCached`(선호 포지션 기준 파생 평균 — 정수 아닐 수 있음) */
  readonly ovr: number;
  /** `Player.pa`(잠재 능력치, 1~30, 공개 API 미노출 필드) */
  readonly potentialAbility: number;
  /** `Player.reputation`(0~100) */
  readonly reputation: number;
  /** `Player.age` */
  readonly age: number;
  /** `Contract.endSeason - 현재 시즌번호` (음수 = 이미 만료, 호출자가 계산해 넘긴다) */
  readonly contractYearsRemaining: number;
  /** `League.tier`(1/2/3) */
  readonly leagueTier: number;
}

export interface CalculateMarketValueOptions {
  /** 미지정 시 `loadConstants('MARKET_VALUE_PARAM')`를 직접 호출한다. */
  readonly table?: MarketValueParamTable;
}

function readNumber(table: MarketValueParamTable, key: string, fallback: number): number {
  const raw = table[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function ovrBaseValue(ovr: number, table: MarketValueParamTable): number {
  const divisor = table.OVR_DIVISOR;
  const exponent = table.OVR_EXP;
  const safeOvr = Math.max(0, ovr);
  return divisor * safeOvr ** exponent;
}

function potentialMultiplier(ovr: number, potentialAbility: number, table: MarketValueParamTable): number {
  const step = table.POT_STEP;
  const growthHeadroom = Math.max(0, potentialAbility - ovr);
  return NEUTRAL_MULTIPLIER + step * growthHeadroom;
}

function reputationMultiplier(reputation: number, table: MarketValueParamTable): number {
  return table.REP_BASE + table.REP_STEP * Math.max(0, reputation);
}

/** `AGE_STEP_PCT`/`AGE_PEAK` — 미결 키(파일 상단 "새로 정하는 키" 참조), 없으면 중립값. */
function ageMultiplier(age: number, table: MarketValueParamTable): number {
  const stepPct = readNumber(table, 'AGE_STEP_PCT', 0);
  if (stepPct === 0) {
    return NEUTRAL_MULTIPLIER;
  }
  const peak = readNumber(table, 'AGE_PEAK', age);
  return NEUTRAL_MULTIPLIER + stepPct * (peak - age);
}

/** `CONTRACT_STEP_PCT`/`CONTRACT_REFERENCE_YEARS` — 미결 키, 없으면 중립값. */
function contractMultiplier(yearsRemaining: number, table: MarketValueParamTable): number {
  const stepPct = readNumber(table, 'CONTRACT_STEP_PCT', 0);
  if (stepPct === 0) {
    return NEUTRAL_MULTIPLIER;
  }
  const reference = readNumber(table, 'CONTRACT_REFERENCE_YEARS', yearsRemaining);
  return NEUTRAL_MULTIPLIER + stepPct * (yearsRemaining - reference);
}

/** `TIER_{n}_MULT` — 미결 키, 없으면 중립값. */
function tierMultiplier(tier: number, table: MarketValueParamTable): number {
  return readNumber(table, `TIER_${tier}_MULT`, NEUTRAL_MULTIPLIER);
}

/**
 * 몸값을 계산한다. 어떤 입력 조합에서도 반환값은 `table.FLOOR`(기본 100) 이상의 정수다
 * (파일 상단 "하한 보장" 참조).
 */
export function calculateMarketValue(input: MarketValueInput, options?: CalculateMarketValueOptions): Points {
  const table = options?.table ?? loadConstants('MARKET_VALUE_PARAM');

  const raw =
    ovrBaseValue(input.ovr, table) *
    potentialMultiplier(input.ovr, input.potentialAbility, table) *
    reputationMultiplier(input.reputation, table) *
    ageMultiplier(input.age, table) *
    contractMultiplier(input.contractYearsRemaining, table) *
    tierMultiplier(input.leagueTier, table);

  const rounded = Math.round(Number.isFinite(raw) ? raw : 0);
  const floor = Math.round(readNumber(table, 'FLOOR', 100));

  return Math.max(rounded, floor) as Points;
}
