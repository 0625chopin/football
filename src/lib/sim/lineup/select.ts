/**
 * `src/lib/sim/lineup/select.ts`
 *
 * Task 024(21일차) — 라인업 자동 선정. `docs/team-schedule/02-시뮬레이션엔진팀.md` 21일차
 * 행: "가용성 × 컨디션 × 피로 × 포지션으로 선발 11 + 벤치 7(GK≥1), 로테이션 정책". 완료
 * 판정 "부상·정지 선수 선발 0건"을 이 파일이 직접 강제한다.
 *
 * ## 계수는 재구현하지 않는다 — 20일차 인계 지시
 * 컨디션·피로는 `ability/modifiers.ts`(18일차), 포지션 숙련도는 `ability/position.ts`
 * (19일차)를 그대로 호출해 `combineAbilityModifiers`로 합성한다. 이 파일은 계수 공식을
 * 새로 선언하지 않는다. 캐미·홈·날씨·감독 성향(나머지 5종 계수)은 오늘 과제 표의
 * "가용성 × 컨디션 × 피로 × 포지션" 4항에 없어 배선하지 않는다 — 넣으면 표에 없는
 * 가정을 지어내는 것이다.
 *
 * ## 가용성 — 새 입력 필드를 만들지 않는다
 * 부상은 `PlayerState.activeInjuryId`(null 아니면 제외), 정지는
 * `PlayerState.suspensionRemainingLeague`/`suspensionRemainingCup`(3일차 확정, 카드 누적
 * 정지의 리그/컵 독립 판정 필드 — `person.ts` 주석 참조)을 그대로 쓴다. 둘 다 이미
 * 존재하는 필드라 타입에 새로 추가할 필요가 없었다. 어느 대회 기준으로 볼지는
 * `SelectLineupInput.suspensionCompetition`(`'LEAGUE' | 'CUP'`)으로 호출자가 명시한다 —
 * `CompetitionType`(LEAGUE/PLAYOFF/CUP/TIEBREAK 4종)을 이 2분류 중 어디에 매핑할지는
 * 대회 구조(025/026) 소관이라 이 파일이 추측하지 않는다. 부상·정지 판정은 **점수 감점이
 * 아니라 후보 풀에서 완전히 제외**한다 — 감점 방식으로는 "0건"을 점수 값에 관계없이
 * 보장할 수 없다.
 *
 * ## "로테이션 정책" — 21일차 판단(팀장 보고 대상)
 * 실제 워크로드 기반 로테이션(최근 N경기 출전 이력에 따른 강제 휴식)을 구현하려면
 * `PlayerState`에 없는 필드가 필요하다 — 타입은 8일차 동결됐고 이런 이력 필드는 없다
 * (C-7 배치 절차 없이 지어낼 수 없음). 그래서 오늘은 로테이션을 `fitnessModifier`가
 * 이미 반영하는 피로 페널티 이상으로 확장하지 않는다 — 피로가 낮은 선수는 점수가
 * 낮아져 자연히 밀려나고, 그 결과로 로테이션이 유도된다. 점수가 동률이면(플레이스홀더
 * 계수·목업 데이터에서 흔함) `playerId` 오름차순으로 결정론만 고정한다(`gk-fallback.ts`
 * 선례와 동일 패턴, NFR-DT-008). 실제 이력 기반 로테이션이 필요해지면 `PlayerState`
 * 필드 추가가 선행돼야 한다 — 이슈 후보로 보고한다.
 *
 * ## 슬롯 배정 — 그리디, 전역 최적 할당이 아니다
 * `startingSlots`(11개 포지션, 순서 그대로)를 순회하며 슬롯마다 아직 배정되지 않은
 * 가용 후보 중 그 슬롯 기준 합성 점수가 가장 높은 1명을 뽑는다. 11×후보 조합 전역
 * 최적화(헝가리안 알고리즘 등)는 오늘 과제 표 범위를 넘는다 — GK 교차 배율(0.35)이
 * 이미 강한 페널티라 비GK 후보가 GK 슬롯을 부당하게 가로챌 유인이 낮아 실무 영향이
 * 작다고 판단했다. 팀장 보고 대상 판단이다.
 *
 * ## 벤치 — 포지션 슬롯이 아니라 "가장 자신 있는 포지션" 기준 + GK≥1 보장
 * 벤치 선수는 아직 실제로 뛰는 슬롯이 없다(교체 시점에 결정). `MatchLineup.positionSlot`은
 * `isStarter` 여부와 무관하게 필수 필드라, 벤치 각 선수에게는 보유 포지션 중 숙련도가
 * 가장 높은(동률이면 `Position` 코드 오름차순) 포지션을 명목상 슬롯으로 채운다 — 실제
 * 교체 배정은 `substitution.ts`/`gk-fallback.ts` 소관이라 이 값은 감사·표시 용도다
 * (`MatchLineup.positionMultiplier`와 같은 성격, G 결정 참조). GK 보유 가용 후보 중
 * 점수가 가장 높은 1명을 먼저 벤치에 확정해 `LINEUP_BENCH_MIN_GOALKEEPERS`(1)를 보장한
 * 뒤, 나머지 자리를 점수 순으로 채운다. GK 보유 가용 후보가 남아 있지 않으면 조용히
 * 벤치를 채우지 않고 오류를 던진다(fail-fast) — 정상 스쿼드는 `SQUAD_PARAM.GK_MIN`
 * (공통코드, 2)을 만족하므로 정상 데이터에서는 발생하지 않는다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()`/`Date.now()`/`react`/`@supabase/*` 사용·import 0건 — 이 파일은 난수를
 * 쓰지 않는다(순위 산정은 결정론적 비교만). 타입은 `@/types` 배럴로만 import.
 */

import type { PlayerId, PlayerPosition, PlayerState, Position } from '@/types';
import {
  type AbilityModifierClampOptions,
  combineAbilityModifiers,
  conditionModifier,
  fitnessModifier,
} from '../ability/modifiers';
import { positionModifier, type PositionModifierOptions } from '../ability/position';
import { stableSortBy } from '../rng/sort';

/** 선발 인원 — 축구 규칙 구조 상수(11명 고정, `substitution.ts`의 5/3과 같은 성격). */
export const LINEUP_STARTER_COUNT = 11;
/** 벤치 인원 — 21일차 과제 표 "벤치 7" 원문 그대로의 구조 상수. */
export const LINEUP_BENCH_COUNT = 7;
/** 벤치에 보장해야 하는 최소 GK 보유 인원 — 21일차 과제 표 "GK≥1" 원문 그대로. */
export const LINEUP_BENCH_MIN_GOALKEEPERS = 1;

/** 정지 판정에 쓸 대회 축 — `PlayerState`의 리그/컵 독립 정지 필드 중 어느 것을 볼지. */
export type SuspensionCompetition = 'LEAGUE' | 'CUP';

/**
 * 라인업 선정 후보 1명 — 계수 체인·가용성 판정에 필요한 `PlayerState`/`PlayerPosition`
 * 부분집합만 담는다(파일 상단 "가용성" 절 참조, 새 필드 없음).
 */
export interface LineupCandidate {
  readonly playerId: PlayerId;
  readonly condition: PlayerState['condition'];
  readonly fitness: PlayerState['fitness'];
  readonly activeInjuryId: PlayerState['activeInjuryId'];
  readonly suspensionRemainingLeague: PlayerState['suspensionRemainingLeague'];
  readonly suspensionRemainingCup: PlayerState['suspensionRemainingCup'];
  /** 선수가 소화 가능한 포지션 전체(E-10) — 1개 이상 필수(`positionModifier`가 검증). */
  readonly positions: readonly PlayerPosition[];
}

/** 계수 체인 오버라이드 — I-83 스냅샷 주입 패턴. `position`은 `positionModifier` 전용 오버라이드. */
export interface LineupModifierOptions extends AbilityModifierClampOptions {
  readonly position?: PositionModifierOptions;
}

export interface SelectLineupInput {
  readonly suspensionCompetition: SuspensionCompetition;
  /** 선발 11명이 채울 슬롯(포지션), 정확히 `LINEUP_STARTER_COUNT`개. */
  readonly startingSlots: readonly Position[];
  readonly roster: readonly LineupCandidate[];
  readonly options?: LineupModifierOptions;
}

export interface LineupAssignment {
  readonly playerId: PlayerId;
  readonly position: Position;
  /** `combineAbilityModifiers([condition, fitness, position])` 결과 — 감사·테스트용. */
  readonly score: number;
}

export interface LineupSelectionResult {
  readonly starters: readonly LineupAssignment[];
  readonly bench: readonly LineupAssignment[];
}

function isAvailable(candidate: LineupCandidate, competition: SuspensionCompetition): boolean {
  if (candidate.activeInjuryId !== null) return false;
  const suspensionRemaining =
    competition === 'LEAGUE' ? candidate.suspensionRemainingLeague : candidate.suspensionRemainingCup;
  return suspensionRemaining <= 0;
}

/** 보유 포지션 중 숙련도가 가장 높은(동률이면 `Position` 코드 오름차순) 포지션. */
function bestOwnPosition(positions: readonly PlayerPosition[]): Position {
  const ranked = stableSortBy(positions, [
    { get: (entry) => entry.proficiency, dir: 'desc' },
    { get: (entry) => entry.position },
  ]);
  return ranked[0].position;
}

function scoreFor(
  candidate: LineupCandidate,
  position: Position,
  options: LineupModifierOptions | undefined,
): number {
  const condition = conditionModifier({ condition: candidate.condition }, options);
  const fitness = fitnessModifier({ fitness: candidate.fitness }, options);
  const positionScore = positionModifier(
    { assignedPosition: position, playerPositions: candidate.positions },
    options?.position,
  );
  return combineAbilityModifiers([condition, fitness, positionScore], options);
}

/** 점수 내림차순 → `playerId` 오름차순(결정론 tiebreak, 파일 상단 "로테이션 정책" 절 참조). */
function rankByScoreDesc<T extends { readonly score: number; readonly candidate: LineupCandidate }>(
  entries: readonly T[],
): T[] {
  return stableSortBy(entries, [
    { get: (entry) => entry.score, dir: 'desc' },
    { get: (entry) => entry.candidate.playerId },
  ]);
}

/**
 * 선발 11 + 벤치 7(GK≥1)을 선정한다.
 *
 * @throws `startingSlots.length !== LINEUP_STARTER_COUNT`이면 오류.
 * @throws 슬롯을 채울 가용 후보가 남아 있지 않으면 오류.
 * @throws 벤치 GK≥1 요건을 만족할 GK 보유 가용 후보가 없거나, 벤치 나머지 자리를 채울
 *   가용 후보가 부족하면 오류.
 */
export function selectLineup(input: SelectLineupInput): LineupSelectionResult {
  const { suspensionCompetition, startingSlots, roster, options } = input;

  if (startingSlots.length !== LINEUP_STARTER_COUNT) {
    throw new RangeError(
      `selectLineup: startingSlots는 정확히 ${LINEUP_STARTER_COUNT}개여야 합니다 (받은 값: ${startingSlots.length}개).`,
    );
  }

  const remaining = new Map(
    roster
      .filter((candidate) => isAvailable(candidate, suspensionCompetition))
      .map((candidate) => [candidate.playerId, candidate] as const),
  );

  const starters: LineupAssignment[] = [];
  for (const slot of startingSlots) {
    const pool = [...remaining.values()];
    if (pool.length === 0) {
      throw new RangeError(`selectLineup: '${slot}' 슬롯에 배정할 가용 선수가 남아 있지 않습니다.`);
    }
    const ranked = rankByScoreDesc(
      pool.map((candidate) => ({ candidate, score: scoreFor(candidate, slot, options) })),
    );
    const picked = ranked[0];
    starters.push({ playerId: picked.candidate.playerId, position: slot, score: picked.score });
    remaining.delete(picked.candidate.playerId);
  }

  const benchRanked = rankByScoreDesc(
    [...remaining.values()].map((candidate) => {
      const position = bestOwnPosition(candidate.positions);
      return { candidate, position, score: scoreFor(candidate, position, options) };
    }),
  );

  const gkEntry =
    benchRanked.find((entry) => entry.candidate.positions.some((p) => p.position === 'GK')) ?? null;
  if (gkEntry === null) {
    throw new RangeError(
      `selectLineup: 벤치 GK≥${LINEUP_BENCH_MIN_GOALKEEPERS} 요건을 만족할 GK 보유 가용 후보가 없습니다.`,
    );
  }

  const others = benchRanked.filter((entry) => entry.candidate.playerId !== gkEntry.candidate.playerId);
  const benchFillCount = LINEUP_BENCH_COUNT - LINEUP_BENCH_MIN_GOALKEEPERS;
  if (others.length < benchFillCount) {
    throw new RangeError(
      `selectLineup: 벤치 ${LINEUP_BENCH_COUNT}명을 채울 가용 선수가 부족합니다 ` +
        `(GK 포함 가용 인원: ${others.length + 1}명).`,
    );
  }

  const bench: LineupAssignment[] = [
    { playerId: gkEntry.candidate.playerId, position: gkEntry.position, score: gkEntry.score },
    ...others
      .slice(0, benchFillCount)
      .map((entry) => ({ playerId: entry.candidate.playerId, position: entry.position, score: entry.score })),
  ];

  return { starters, bench };
}
