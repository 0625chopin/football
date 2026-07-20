/**
 * 경기 마켓(1X2) 확률 산출 — 프리시뮬 결과 분포 → 확률
 *
 * Task 035 / 28일차(2026-08-27) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 28일차 행: "경기 마켓 N=3,000 프리시뮬 → 결과 분포 → 확률 산출". 수락 기준: "확률 합 = 1".
 * 근거는 UC-401(`docs/require/02-actors-and-usecases.md`) "독립 시드로 N=3,000 프리시뮬 →
 * 결과 분포 → 확률 → 오버라운드 적용 배당" 중 앞 두 단계이며, R-10(1차는 1X2 등 핵심 마켓만)에
 * 따라 오늘은 1X2(승/무/패)만 다룬다.
 *
 * ## 이 파일의 책임 범위 — "결과 분포 → 확률 산출"까지
 * 실제 배당률 변환(FR-BT-005의 `(1/p) × (1/overround_factor)`, `ODDS_PARAM.OVERROUND`/
 * `MIN_ODDS`/`MAX_ODDS` 적용, 확률 0 셀렉션 마켓 제외)은 이 파일 범위 밖이다(후속 일차,
 * 같은 디렉터리 소관 — 27일차 `runner.ts` 문서 주석과 동일한 분리 원칙).
 *
 * ## 확률 합 = 1 보장
 * 27일차 `runOddsPresimMatch`가 만든 `runs[]`(기본 `ODDS_PARAM.MC_N_MATCH`=3,000회)를
 * 승/무/패로 분류해 정수 카운트로 집계한 뒤, `rng/precision.ts`의 `normalizeWeights`로
 * 6자리 고정 정밀도 정수 단위(합계 정확히 `PROBABILITY_UNIT_MAX` = 1,000,000)로 정규화한다.
 * 부동소수 누적합(`0.333333 + 0.333333 + 0.333334`류 오차)이 아니라 정수 잔차 흡수이므로
 * "확률 합 = 1"이 근사가 아니라 **항상 정확히** 성립한다.
 */

import { normalizeWeights, type ProbabilityUnits } from '@/lib/sim/rng/precision';
import { runOddsPresimMatch, type OddsPresimMatchResult, type RunOddsPresimOptions } from './runner';

/** 1X2 결과 키. `src/types`에 아직 정의가 없어 이 파일 로컬로 둔다(도메인 타입 재선언 아님). */
export type MatchOutcomeKey = 'HOME' | 'DRAW' | 'AWAY';

const MATCH_OUTCOME_KEYS: readonly MatchOutcomeKey[] = ['HOME', 'DRAW', 'AWAY'];

/** 결과 분포 — 반복 실행 중 승/무/패로 갈린 정수 카운트. 합계는 항상 `runs.length`. */
export type MatchOutcomeCounts = Readonly<Record<MatchOutcomeKey, number>>;

/** 확률 산출 — 6자리 고정 정밀도 정수 단위. 합계는 항상 정확히 `PROBABILITY_UNIT_MAX`. */
export type MatchOutcomeProbabilityUnits = Readonly<Record<MatchOutcomeKey, ProbabilityUnits>>;

export interface MatchOutcomeMarket {
  readonly simCount: number;
  readonly counts: MatchOutcomeCounts;
  readonly probabilityUnits: MatchOutcomeProbabilityUnits;
}

function classifyOutcome(homeGoals: number, awayGoals: number): MatchOutcomeKey {
  if (homeGoals > awayGoals) return 'HOME';
  if (homeGoals < awayGoals) return 'AWAY';
  return 'DRAW';
}

/** `runOddsPresimMatch`의 원시 반복 결과를 승/무/패 카운트로 집계한다(결과 분포). */
export function tallyMatchOutcomes(result: OddsPresimMatchResult): MatchOutcomeCounts {
  let home = 0;
  let draw = 0;
  let away = 0;

  for (const run of result.runs) {
    switch (classifyOutcome(run.homeGoals, run.awayGoals)) {
      case 'HOME':
        home += 1;
        break;
      case 'AWAY':
        away += 1;
        break;
      default:
        draw += 1;
    }
  }

  return { HOME: home, DRAW: draw, AWAY: away };
}

/**
 * 결과 분포를 확률로 정규화한다(확률 산출). 카운트 합이 0이면(=반복 0회) 호출하지 않는다 —
 * `runOddsPresimMatch`는 `runCount ≥ 1`을 전제하므로 정상 경로에서는 발생하지 않는다.
 */
export function computeMatchOutcomeProbabilities(
  counts: MatchOutcomeCounts,
): MatchOutcomeProbabilityUnits {
  const units = normalizeWeights(MATCH_OUTCOME_KEYS.map((key) => counts[key]));
  return { HOME: units[0], DRAW: units[1], AWAY: units[2] };
}

/**
 * 대진 하나의 1X2 마켓을 산출한다 — N회(기본 `ODDS_PARAM.MC_N_MATCH`=3,000) 프리시뮬 →
 * 결과 분포 → 확률. `RunOddsPresimOptions`를 그대로 받아 27일차 `runOddsPresimMatch`(엔진
 * 호출·독립 시드 네임스페이스)를 경유한다.
 */
export function computeMatchOutcomeMarket(options: RunOddsPresimOptions): MatchOutcomeMarket {
  const result = runOddsPresimMatch(options);
  const counts = tallyMatchOutcomes(result);
  const probabilityUnits = computeMatchOutcomeProbabilities(counts);
  return { simCount: result.runs.length, counts, probabilityUnits };
}
