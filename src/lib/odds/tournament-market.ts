/**
 * 토너먼트(컵) 브래킷 마켓 — 라운드별 진출·우승 확률 산출
 *
 * Task 035 / 31일차(2026-09-01) 산출물. `docs/team-schedule/03-데이터밸런싱배당팀.md`
 * 31일차 행: "토너먼트 마켓 브래킷 기반 산출". 수락 기준(원문): "브래킷 경로별 확률 산출".
 *
 * ## 이 파일의 책임 범위 — "결과 분포 → 확률 산출"까지 (30일차 `season-market.ts`와 동일 경계)
 * 단일 엘리미네이션 브래킷을 라운드마다 실제로 몬테카를로 반복 시뮬레이션(대진을 엔진으로
 * 돌려 승자를 가리고 다음 라운드로 올리는 것 — 대진표 편성·시드 배정·부전승 처리 포함)하는
 * 러너는 `season-market.ts` 30일차 문서와 동일한 이유로 **별도 소관**이다. 이 파일은 그
 * 러너가 반복 1회마다 만든 "라운드별 진출 팀 목록"을 `TournamentBracketOutcome`으로 받아
 * 팀별·라운드별 확률로 정규화하는 지점부터 시작한다 — `runOddsPresimMatch`의 `runs[]`를
 * 입력으로 받는 `match-market.ts`, `SeasonMarketOutcome[]`를 입력으로 받는
 * `season-market.ts`와 동일한 분리 구조다.
 *
 * ## "브래킷 경로별 확률" = 라운드별 진출 마켓(독립 이진) + 우승 마켓(상호 배타)
 * 브래킷 슬롯·대진 구조는 `src/types`에 도메인 타입으로 없다 — H-01 동결 리뷰(8일차,
 * `src/types/index.ts` 헤더 "SP-1 동결 리뷰" 절)가 "브래킷 슬롯"을 이미 "파생 가능/타입
 * 대상 아님"으로 판정했으므로, 이 파일이 필요한 최소 로컬 타입만 둔다(도메인 타입 재선언이
 * 아니다 — `match-market.ts`의 `MatchOutcomeKey`와 동일한 선례).
 *
 * 라운드 수(브래킷 크기의 log2)는 같은 마켓 안의 모든 반복에서 고정이어야 한다 — 16강전
 * 대회와 8강전 대회 결과를 한 마켓에 섞으면 라운드 인덱스가 무의미해진다. 마지막 라운드는
 * 반드시 승자가 정확히 1명이어야 한다(우승자). 그 앞 라운드들은 "이번 반복에 이 라운드까지
 * 살아남은(다음 라운드로 진출한) 팀"이 라운드마다 여러 명일 수 있는 독립 이진 마켓
 * 묶음이라 `season-market.ts`의 승격·강등과 동일하게 팀별 `count / totalRuns`를
 * `toUnits()`로 변환한다(선택지 간 합이 1일 필요 없음 — 예: 8강 진출 마켓이면 팀별 확률의
 * 합은 슬롯 수 ≈ 8에 수렴). 우승 라운드만 `season-market.ts`의 우승·득점왕과 동일하게
 * `normalizeWeights`로 합계를 정확히 `PROBABILITY_UNIT_MAX`로 맞춘다.
 *
 * ## 확률 0 셀렉션 제외 (`overround.ts` FR-BT-005 규약과 동일 원칙)
 * 어떤 라운드에서도 한 번도 도달하지 못한 팀은 그 라운드 결과 레코드에 키 자체가 생기지
 * 않는다(값을 0으로 채우지 않는다) — `computeMarketOdds`가 기대하는 "확률 0 셀렉션은
 * 마켓에서 제외" 계약과 그대로 맞물린다.
 *
 * ## 오버라운드 변환과의 연결 (29일차 인계)
 * 이 파일의 산출 타입은 `overround.ts` 소유 `SelectionProbabilityUnits`(셀렉션 키 → 확률
 * 단위 레코드)를 그대로 쓴다. `overround.ts`의 `computeMarketOdds`가 1X2·시즌 마켓과 동일한
 * 범용 함수로 라운드별 마켓을 그대로 받아 배당률로 변환한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` 미사용. 확률 비교·변환은 전부 `rng/precision.ts` 경유.
 * 도메인 타입은 `@/types` 배럴로만 import(서브경로 금지, 재선언 금지).
 */

import type { TeamId } from '@/types';
import { normalizeWeights, toUnits, type ProbabilityUnits } from '@/lib/sim/rng/precision';
import type { SelectionKey, SelectionProbabilityUnits } from './overround';

/**
 * 브래킷 몬테카를로 반복 1회의 결과. `roundWinners[r]`은 라운드 `r`(0-based)을 통과해
 * 다음 라운드로 진출한 팀 목록이며, 마지막 인덱스(`roundWinners.length - 1`)는 우승팀
 * 1명만 담는다. 라운드가 진행될수록 배열 길이가 줄어들어야 하지만 그 형태 자체(부전승·
 * 시드 배정에 따라 정확히 절반씩 줄지 않을 수 있음)는 이 파일이 검증하지 않는다 —
 * 브래킷 편성은 호출부(별도 소관 러너)의 책임이고, 이 파일은 마지막 라운드가 정확히
 * 1명인지만 방어적으로 확인한다.
 */
export interface TournamentBracketOutcome {
  readonly roundWinners: readonly (readonly TeamId[])[];
}

export interface TournamentBracketMarket {
  /** 정규화에 쓰인 반복 횟수(호출부가 실제로 넘긴 `outcomes.length`). */
  readonly simCount: number;
  /**
   * 라운드별 마켓. 인덱스 `r`은 `TournamentBracketOutcome.roundWinners[r]`과 대응한다.
   * 마지막 인덱스(`rounds.length - 1`)가 우승 마켓 — 상호 배타 다항(합계 정확히
   * `PROBABILITY_UNIT_MAX`). 그 앞 인덱스는 전부 라운드 진출(생존) 마켓 — 독립 이진 마켓
   * 묶음(팀별 `count / totalRuns`, 선택지 간 합이 1일 필요 없음).
   */
  readonly rounds: readonly SelectionProbabilityUnits[];
}

function tallyRoundMembership(
  outcomes: readonly TournamentBracketOutcome[],
  roundIndex: number,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    for (const teamId of outcome.roundWinners[roundIndex]) {
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1);
    }
  }
  return counts;
}

/** 독립 이진 마켓 묶음(라운드 진출) — `season-market.ts`의 승격·강등과 동일한 정규화. */
function normalizeMembershipRound(
  counts: ReadonlyMap<string, number>,
  totalRuns: number,
): SelectionProbabilityUnits {
  const result: Record<SelectionKey, ProbabilityUnits> = {};
  for (const [key, count] of counts) {
    result[key] = toUnits(count / totalRuns);
  }
  return result;
}

/** 상호 배타 다항 마켓(우승) — `season-market.ts`의 우승·득점왕과 동일한 정규화. */
function normalizeChampionRound(counts: ReadonlyMap<string, number>): SelectionProbabilityUnits {
  const keys = [...counts.keys()];
  const weights = keys.map((key) => counts.get(key) ?? 0);
  const units = normalizeWeights(weights);
  const result: Record<SelectionKey, ProbabilityUnits> = {};
  keys.forEach((key, i) => {
    result[key] = units[i];
  });
  return result;
}

/**
 * 브래킷 라운드 수 일관성과 마지막 라운드(우승) 형태를 검사한다. 라운드 수가 반복마다
 * 다르거나 마지막 라운드 승자가 1명이 아니면 상위 버그(브래킷 편성 러너 결함)이므로
 * 방어적으로 예외를 던진다.
 */
function assertConsistentBracketShape(outcomes: readonly TournamentBracketOutcome[]): number {
  const roundCount = outcomes[0].roundWinners.length;
  if (roundCount === 0) {
    throw new RangeError('roundWinners: 최소 1개 라운드 이상이어야 합니다');
  }
  outcomes.forEach((outcome, i) => {
    if (outcome.roundWinners.length !== roundCount) {
      throw new RangeError(
        `roundWinners.length: 모든 반복이 같은 라운드 수여야 합니다 ` +
          `(outcomes[0]=${roundCount}, outcomes[${i}]=${outcome.roundWinners.length})`,
      );
    }
    const finalRoundWinners = outcome.roundWinners[roundCount - 1];
    if (finalRoundWinners.length !== 1) {
      throw new RangeError(
        `roundWinners[${roundCount - 1}]: 마지막 라운드(우승)는 정확히 1팀이어야 합니다 ` +
          `(outcomes[${i}]=${finalRoundWinners.length}팀)`,
      );
    }
  });
  return roundCount;
}

/**
 * 브래킷 라운드별 진출·우승 확률을 반복 결과 배열에서 산출한다 — "브래킷 경로별 확률
 * 산출"(Task 035 31일차 수락 기준).
 *
 * @throws `outcomes`가 비었거나, 라운드 수가 반복마다 다르거나, 마지막 라운드 승자가
 * 1팀이 아니면 오류.
 */
export function computeTournamentBracketMarket(
  outcomes: readonly TournamentBracketOutcome[],
): TournamentBracketMarket {
  if (outcomes.length === 0) {
    throw new RangeError('outcomes: 최소 1개 이상이어야 합니다');
  }
  const totalRuns = outcomes.length;
  const roundCount = assertConsistentBracketShape(outcomes);

  const rounds: SelectionProbabilityUnits[] = [];
  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const counts = tallyRoundMembership(outcomes, roundIndex);
    const isChampionRound = roundIndex === roundCount - 1;
    rounds.push(
      isChampionRound ? normalizeChampionRound(counts) : normalizeMembershipRound(counts, totalRuns),
    );
  }

  return { simCount: totalRuns, rounds };
}
