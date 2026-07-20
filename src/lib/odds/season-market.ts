/**
 * 시즌 마켓(우승·승격·강등·득점왕) 확률 산출 — 시즌 시뮬레이션 결과 분포 → 확률
 *
 * Task 035 / 30일차(2026-08-31) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 30일차 행: "시즌 마켓 (우승·승격·강등·득점왕)". 수락 기준(원문): "배당오차 ±11.5% →
 * 개선" — 이는 이 파일이 아니라 `ODDS_PARAM.MC_N_SEASON`(공통코드, 27일차 I-08로 이미
 * 300→1,500 상향·`REFRESH_ROUND_INTERVAL`=5 신설 완료, `src/lib/config/fallback.ts`)로
 * 충족된다. 이 파일은 그 N값을 실제로 소비하는 시즌 마켓 최초 구현물이다.
 *
 * ## 이 파일의 책임 범위 — "결과 분포 → 확률 산출"까지
 * `match-market.ts`(28일차)·`overround.ts`(29일차)가 확립한 경계 원칙을 시즌 마켓에도
 * 그대로 적용한다. 잔여 시즌을 실제로 몬테카를로 반복(`MC_N_SEASON`회, `REFRESH_ROUND_INTERVAL`
 * 라운드마다 재산출)하며 대진을 엔진으로 시뮬레이션하고 순위표를 갱신·타이브레이크를
 * 적용해 "이번 반복에서 누가 우승/승격/강등/득점왕인가"를 결정하는 러너(호출부)는
 * `docs/dailyWorkLog/29Day.md` 3팀 인계대로 **별도 일차 소관**이다. 이 파일은 그 러너가
 * 만든 `SeasonMarketOutcome[]`(반복당 우승팀 1·승격팀 N·강등팀 N·득점왕 1명)을 입력으로
 * 받아 선택지별 확률로 정규화하는 지점부터 시작한다 — `runOddsPresimMatch`의 `runs[]`를
 * 입력으로 받는 `match-market.ts`와 동일한 분리 구조다.
 *
 * ## 우승·득점왕 vs 승격·강등 — 정규화 방식이 다른 이유
 * 우승과 득점왕은 반복 1회당 정확히 하나의 승자만 있는 상호 배타적 다항 마켓이라
 * `normalizeWeights`로 합계를 정확히 `PROBABILITY_UNIT_MAX`(=1)로 맞춘다(`match-market.ts`
 * 1X2와 동일 원리). 반면 승격·강등은 한 반복에 여러 팀이 동시에 해당될 수 있는
 * "팀별 독립 이진 마켓"의 묶음이다(예: 승격 2자리면 팀별 승격 확률의 합은 1이 아니라
 * 슬롯 수 ≈ 2에 수렴). 이런 마켓을 `normalizeWeights`로 억지로 합=1 정규화하면 실제로는
 * 두 팀이 동시에 오르는데 "그 반복엔 한 팀만 오른다"는 잘못된 분포로 왜곡된다. 그래서
 * 승격·강등은 팀별로 `count / totalRuns`를 그대로 `toUnits()`(6자리 고정 정밀도,
 * `rng/precision.ts`)로 변환한다 — 선택지 간 합이 1일 필요가 없다.
 *
 * ## 확률 0 셀렉션 제외 (`overround.ts` FR-BT-005 규약과 동일 원칙)
 * 표본에서 한 번도 우승/승격/강등/득점왕이 되지 않은 팀·선수는 결과 레코드에 키 자체가
 * 생기지 않는다(값을 0으로 채우지 않는다) — `computeMarketOdds`가 기대하는 "확률 0
 * 셀렉션은 마켓에서 제외" 계약과 그대로 맞물린다.
 *
 * ## 오버라운드 변환과의 연결 (29일차 인계)
 * 이 파일의 산출 타입은 `overround.ts` 소유 `SelectionProbabilityUnits`
 * (셀렉션 키 → 확률 단위 레코드)를 그대로 쓴다. `overround.ts`의 `computeMarketOdds`가
 * 1X2 마켓과 동일한 함수로 이 마켓들을 그대로 받아 배당률로 변환한다(29일차 문서 주석이
 * 이미 이 용도를 명시: "시즌 마켓... 에도 같은 변환을 요구하므로 범용 함수로 둔다").
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 미사용. 확률 비교·변환은 전부 `rng/precision.ts` 경유.
 * 도메인 타입은 `@/types` 배럴로만 import(서브경로 금지, 재선언 금지).
 */

import type { PlayerId, TeamId } from '@/types';
import { normalizeWeights, toUnits, type ProbabilityUnits } from '@/lib/sim/rng/precision';
import type { SelectionKey, SelectionProbabilityUnits } from './overround';

/**
 * 잔여 시즌 몬테카를로 반복 1회의 결과. 승격/강등 슬롯 수는 리그 규모(1부/2부/3부)에 따라
 * 다르므로 배열 길이가 반복마다 고정되지 않는다 — 호출부(별도 일차 러너)가 실제 슬롯
 * 수만큼 채운다.
 */
export interface SeasonMarketOutcome {
  readonly championTeamId: TeamId;
  readonly promotedTeamIds: readonly TeamId[];
  readonly relegatedTeamIds: readonly TeamId[];
  readonly topScorerPlayerId: PlayerId;
}

export interface SeasonMarket {
  /** 정규화에 쓰인 반복 횟수(호출부가 실제로 넘긴 `outcomes.length`). */
  readonly simCount: number;
  readonly champion: SelectionProbabilityUnits;
  readonly promotion: SelectionProbabilityUnits;
  readonly relegation: SelectionProbabilityUnits;
  readonly topScorer: SelectionProbabilityUnits;
}

function tallySingleWinner(
  outcomes: readonly SeasonMarketOutcome[],
  pick: (outcome: SeasonMarketOutcome) => string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    const key = pick(outcome);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function tallyMembership(
  outcomes: readonly SeasonMarketOutcome[],
  pick: (outcome: SeasonMarketOutcome) => readonly string[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    for (const key of pick(outcome)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** 상호 배타 다항 마켓(우승/득점왕) — 합계는 항상 정확히 `PROBABILITY_UNIT_MAX`. */
function normalizeSingleWinnerMarket(counts: ReadonlyMap<string, number>): SelectionProbabilityUnits {
  const keys = [...counts.keys()];
  const weights = keys.map((key) => counts.get(key) ?? 0);
  const units = normalizeWeights(weights);
  const result: Record<SelectionKey, ProbabilityUnits> = {};
  keys.forEach((key, i) => {
    result[key] = units[i];
  });
  return result;
}

/** 독립 이진 마켓 묶음(승격/강등) — 선택지별 `count / totalRuns`, 선택지 간 합이 1일 필요 없음. */
function normalizeMembershipMarket(
  counts: ReadonlyMap<string, number>,
  totalRuns: number,
): SelectionProbabilityUnits {
  const result: Record<SelectionKey, ProbabilityUnits> = {};
  for (const [key, count] of counts) {
    result[key] = toUnits(count / totalRuns);
  }
  return result;
}

/**
 * 시즌 마켓 4종(우승·승격·강등·득점왕)을 반복 결과 배열에서 확률로 산출한다.
 *
 * @throws `outcomes`가 비었으면 오류(반복 0회는 정상 경로에서 발생하지 않는다 — 호출부가
 * `runCount ≥ 1`을 전제하는 것은 `runOddsPresimMatch`와 동일).
 */
export function computeSeasonMarket(outcomes: readonly SeasonMarketOutcome[]): SeasonMarket {
  if (outcomes.length === 0) {
    throw new RangeError('outcomes: 최소 1개 이상이어야 합니다');
  }
  const totalRuns = outcomes.length;

  const championCounts = tallySingleWinner(outcomes, (outcome) => outcome.championTeamId);
  const topScorerCounts = tallySingleWinner(outcomes, (outcome) => outcome.topScorerPlayerId);
  const promotionCounts = tallyMembership(outcomes, (outcome) => outcome.promotedTeamIds);
  const relegationCounts = tallyMembership(outcomes, (outcome) => outcome.relegatedTeamIds);

  return {
    simCount: totalRuns,
    champion: normalizeSingleWinnerMarket(championCounts),
    promotion: normalizeMembershipMarket(promotionCounts, totalRuns),
    relegation: normalizeMembershipMarket(relegationCounts, totalRuns),
    topScorer: normalizeSingleWinnerMarket(topScorerCounts),
  };
}
