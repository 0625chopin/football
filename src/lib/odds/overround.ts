/**
 * 오버라운드 적용 배당률 변환 — 확률 → 배당
 *
 * Task 035 / 29일차(2026-08-28) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 29일차 행: "오버라운드 1.06 적용, 배당 1.01~500.00 클램프". 수락 기준: "클램프 경계 동작".
 * 근거는 `docs/require/03-functional-requirements.md` FR-BT-005 ①②:
 * "배당 = (1 / p) × (1 / overround_factor), 오버라운드 마진 6%(Σ(1/odds) = 1.06),
 * 최소 1.01·최대 500.00, 확률 0 셀렉션은 마켓에서 제외".
 *
 * ## 28일차 인계 — 여기서 이어받는 것
 * `match-market.ts` 헤더가 명시한 대로 "확률 산출까지"가 28일차 범위였고, "실제 배당률
 * 변환"은 이 파일 소관으로 남겨졌다. 이 파일은 `match-market.ts`의 1X2 전용 타입
 * (`MatchOutcomeKey` 등)에 의존하지 않는다 — FR-BT-005는 경기 마켓(1X2)뿐 아니라 시즌
 * 마켓(잔여 시즌 N=300/1,500 프리시뮬 → 우승/승격/강등/득점왕)에도 같은 변환을 요구하므로,
 * "셀렉션 키 → 확률 단위" 레코드를 입력으로 받는 범용 함수로 둔다.
 *
 * ## 공식 유도 — 왜 `(1/p) × (1/overround)`가 `Σ(1/odds) = overround`를 만드는가
 * 마켓의 확률 합은 항상 1이다(`normalizeWeights`가 보장). `odds_i = 1 / (p_i × overround)`로
 * 두면 `1/odds_i = p_i × overround`이고, `Σ(1/odds_i) = overround × Σp_i = overround × 1
 * = overround`가 정확히 성립한다. `p_i`가 6자리 고정 정밀도 정수(`ProbabilityUnits`)이므로
 * `1/p_i = PROBABILITY_SCALE / probabilityUnits_i`로 계산한다(부동소수 확률값을 직접 다시
 * 만들지 않는다 — `precision.ts` 규약 유지).
 *
 * ## 클램프와 반올림 순서 — 수락 기준 ①의 허용 오차(±0.005)가 나오는 이유
 * 배당은 소수 둘째 자리(십진 표시, decimal odds — Q-03 결정)까지만 표시하므로 원시 계산값을
 * `[MIN_ODDS, MAX_ODDS]`로 먼저 클램프한 뒤 센트 단위로 반올림한다. 반올림이 클램프 경계를
 * 다시 벗어나는 것을 막기 위해 반올림 후 한 번 더 방어적으로 클램프한다(부동소수 표현
 * 오차로 `500.0000000002` 같은 값이 나와도 `500.00`을 벗어나지 않도록). 이 반올림 오차가
 * 누적되면 `Σ(1/odds)`가 정확히 1.06이 아니라 1.06 근방이 되는데, FR-BT-005 수락 기준
 * ①이 "1.06 ± 0.005"로 오차를 이미 허용한 것이 이 반올림 때문이다.
 *
 * ## 확률 0 셀렉션 제외 (FR-BT-005 "확률 0 셀렉션은 마켓에서 제외")
 * `convertProbabilityToOdds`는 `probabilityUnits = 0`이면 `null`을 돌려주고,
 * `computeMarketOdds`는 `null`인 셀렉션을 결과 레코드에서 아예 키를 만들지 않는다
 * (값을 `0`이나 `Infinity`로 채우지 않는다 — 마켓 자체에서 제외라는 요구사항 그대로).
 *
 * ## 공통코드 (NFR-CFG-001, 수락 기준 ⑤)
 * 기본 `overround`/`minOdds`/`maxOdds`는 `loadConstants('ODDS_PARAM')`의
 * `OVERROUND`/`MIN_ODDS`/`MAX_ODDS`에서 읽는다(리터럴 하드코딩 금지). `runner.ts`의
 * `runCount`, `match-market.ts`의 `RunOddsPresimOptions`와 동일하게, 테스트·시즌 마켓처럼
 * 다른 값이 필요한 호출부를 위해 `OverroundOptions`로 오버라이드할 수 있게 열어 둔다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import 0건.
 */

import { loadConstants } from '@/lib/config/loader';
import { PROBABILITY_SCALE, type ProbabilityUnits } from '@/lib/sim/rng/precision';

/** 배당 표시 소수 자리 — decimal odds 2자리 고정(Q-03: "decimal만 지원"). */
const ODDS_DISPLAY_DECIMALS = 2;
const ODDS_DISPLAY_SCALE = 10 ** ODDS_DISPLAY_DECIMALS;

/** 마켓 내 셀렉션을 식별하는 키. 1X2("HOME"/"DRAW"/"AWAY")뿐 아니라 시즌 마켓 키도 포괄한다. */
export type SelectionKey = string;

/** 셀렉션별 확률 — 6자리 고정 정밀도 정수 단위(`precision.ts`). */
export type SelectionProbabilityUnits = Readonly<Record<SelectionKey, ProbabilityUnits>>;

/**
 * 셀렉션별 배당 — decimal odds, 소수 둘째 자리까지.
 * 확률 0인 셀렉션은 키 자체가 없다(마켓에서 제외).
 */
export type SelectionOdds = Readonly<Record<SelectionKey, number>>;

export interface OverroundOptions {
  /** 오버라운드 배수. 기본 `ODDS_PARAM.OVERROUND`(1.06). */
  readonly overround?: number;
  /** 배당 하한. 기본 `ODDS_PARAM.MIN_ODDS`(1.01). */
  readonly minOdds?: number;
  /** 배당 상한. 기본 `ODDS_PARAM.MAX_ODDS`(500). */
  readonly maxOdds?: number;
}

interface ResolvedOverroundOptions {
  readonly overround: number;
  readonly minOdds: number;
  readonly maxOdds: number;
}

function resolveOptions(options: OverroundOptions): ResolvedOverroundOptions {
  const hasAllOverrides =
    options.overround !== undefined && options.minOdds !== undefined && options.maxOdds !== undefined;

  // 셋 다 넘어오면 공통코드 그룹 자체를 조회하지 않는다 — 순수 클램프 경계 테스트처럼
  // 폴백 소스 등록 여부와 무관하게 동작해야 하는 호출부를 위한 탈출구다.
  const params = hasAllOverrides ? null : loadConstants('ODDS_PARAM');

  return {
    overround: options.overround ?? params!.OVERROUND,
    minOdds: options.minOdds ?? params!.MIN_ODDS,
    maxOdds: options.maxOdds ?? params!.MAX_ODDS,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** decimal odds를 소수 둘째 자리로 반올림한다(표시용 — 확률 비교가 아니므로 `precision.ts` 대상이 아니다). */
function roundOdds(value: number): number {
  return Math.round(value * ODDS_DISPLAY_SCALE) / ODDS_DISPLAY_SCALE;
}

/**
 * 셀렉션 하나의 확률(정수 단위)을 오버라운드 적용 배당으로 변환한다.
 *
 * `probabilityUnits = 0`이면 `null`을 돌려준다 — 호출부는 이를 "마켓에서 제외"로 취급해야
 * 한다(FR-BT-005). `0`보다 작거나 `PROBABILITY_UNIT_MAX`(1,000,000)를 넘으면 방어적으로
 * 예외를 던진다(`precision.ts`가 보장하는 범위를 벗어난 입력은 상위 버그다).
 */
export function convertProbabilityToOdds(
  probabilityUnits: ProbabilityUnits,
  options: OverroundOptions = {},
): number | null {
  if (!Number.isInteger(probabilityUnits) || probabilityUnits < 0 || probabilityUnits > PROBABILITY_SCALE) {
    throw new RangeError(
      `probabilityUnits: 0 이상 ${PROBABILITY_SCALE} 이하의 정수여야 합니다 (받은 값: ${probabilityUnits})`,
    );
  }
  if (probabilityUnits === 0) {
    return null;
  }

  const { overround, minOdds, maxOdds } = resolveOptions(options);

  const fairOdds = PROBABILITY_SCALE / probabilityUnits;
  const marginedOdds = fairOdds / overround;
  const clamped = clamp(marginedOdds, minOdds, maxOdds);
  const rounded = roundOdds(clamped);

  // 반올림이 경계를 다시 벗어나는 것을 막는 방어적 재클램프(위 문서 주석 참고).
  return clamp(rounded, minOdds, maxOdds);
}

/**
 * 마켓 전체(셀렉션 키 → 확률 단위)를 오버라운드 적용 배당 레코드로 변환한다.
 * 확률 0 셀렉션은 결과 레코드에 키가 아예 생기지 않는다(마켓에서 제외).
 */
export function computeMarketOdds(
  probabilityUnits: SelectionProbabilityUnits,
  options: OverroundOptions = {},
): SelectionOdds {
  const odds: Record<SelectionKey, number> = {};
  for (const key of Object.keys(probabilityUnits)) {
    const value = convertProbabilityToOdds(probabilityUnits[key], options);
    if (value !== null) {
      odds[key] = value;
    }
  }
  return odds;
}
