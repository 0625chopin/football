/**
 * `src/lib/sim/ability/position.ts`
 *
 * Task 024(19일차) — 포지션 숙련도 계수(`M_position`). FR-PL-006(숙련도 5단계 + 미보유
 * 처리) / FR-PL-007(포지션 인접 그래프) 원문을 그대로 구현한다. 값 출처는
 * `docs/require/03-functional-requirements.md` FR-PL-006·FR-PL-007, 공통코드 그룹
 * `POSITION_PROFICIENCY_MULT`(`docs/require/05-data-requirements.md` #8).
 *
 * ## `modifiers.ts` 잔류 vs 파일 분리 — 19일차 판단(오늘 결정)
 * **분리한다.** 근거 셋:
 * ① 컨디션·피로·캐미(18일차, `modifiers.ts` 잔류)는 입력 1~2개의 단일 수식이었다.
 *    포지션은 (a) 11노드·15엣지 인접 그래프, (b) 그래프 전 쌍 BFS 거리 산출, (c) GK 교차
 *    예외 → 보유 단계표 → 미보유 거리식 3단 분기까지 필요해 성격이 다르다.
 * ② `ROADMAP.md`/팀 일정표의 19일차 산출물 필드가 이미 `position.ts`로 못박혀 있다
 *    (모호했던 "분리 여부 재판단"은 그래프 유무가 갈랐다 — 20일차 날씨·감독은 각각 단일
 *    매트릭스 룩업이라 이 판단이 그대로 넘어가지 않는다. 20일차에 별도 판단 필요).
 * ③ `match/gk-fallback.ts`(14일차)도 동일하게 "복잡한 분기 + 여러 상수"라는 이유로
 *    별도 파일로 분리된 선례가 있다 — 그리고 이 파일의 GK 교차 배율은 그 파일의 상수를
 *    그대로 재사용한다(아래 참조, 값 중복 선언 금지).
 *
 * `modifiers.ts`의 `positionModifier`/`PositionModifierInput` 스텁은 이 파일로 대체되며
 * 제거했다. `combineAbilityModifiers`(9번째 함수, `modifiers.ts`)는 계수 값(number)만
 * 받으므로 호출자가 이 파일의 `positionModifier` 결과를 다른 8개 계수와 함께 배열로
 * 넘기면 된다 — 계수 체인 실제 배선은 24일차(Task 024 통합) 몫이라 여기서는 만들지 않는다.
 *
 * ## GK 교차 배율은 새로 선언하지 않는다 (I-83 패턴 재사용)
 * `docs/require/05-data-requirements.md` #8: `POSITION_PROFICIENCY_MULT.GK_CROSS = 0.35`.
 * 이 값은 `match/gk-fallback.ts`(14일차)의 `GK_CROSS_POSITION_MODIFIER_DEFAULT`와
 * **동일한 공통코드 값**이다(같은 카탈로그 그룹의 같은 키) — 우연히 값이 같은 게 아니라
 * 같은 소스다. 그래서 이 파일은 상수를 다시 선언하지 않고 `gk-fallback.ts`에서 import해
 * 재사용한다. 주입 파라미터명도 `crossPositionModifier`로 맞춰(같은 개념, 같은 이름)
 * 오케스트레이션 계층이 두 파일에 같은 값을 배선할 때 헷갈리지 않게 했다.
 *
 * ## "GK인지"는 무엇으로 판정하는가 — `PlayerPosition` 목록에 `GK` 항목 보유 여부
 * FR-PL-006 원문은 "비GK가 GK로 출전" / "GK가 필드로 출전"이라고만 쓰고 판정 기준을
 * 정의하지 않는다. 이 함수의 입력이 `PlayerPosition[]`(E-10, 선수가 소화 가능한 포지션
 * 전체)뿐이므로, 그 목록에 `position: 'GK'` 항목이 있는지로 판정한다. **이 판정은 보유
 * 단계표보다 우선한다** — 즉 GK가 `CB` 항목도 함께 보유하고 있어도(다중 포지션),
 * `assignedPosition`이 `CB`면 여전히 교차 예외(0.35)가 적용된다. FR-PL-006 "하드 고정"
 * 문구와 수용 기준 ④("GK 교차 예외가 우선 적용됨")가 이 우선순위를 명시한다.
 *
 * ## 미보유 거리(`dist`)는 "가장 가까운 보유 포지션" 기준 — 19일차 판단
 * FR-PL-006은 `dist = FR-PL-007 최단거리`라고만 쓰고 기준점(어느 포지션에서 잰
 * 거리인지)을 명시하지 않는다. 선수가 다중 포지션을 보유할 수 있으므로(FR-PL-005),
 * 보유 포지션 중 `assignedPosition`과 가장 가까운(= 페널티가 가장 작은) 포지션을
 * 기준으로 삼는다 — "선수가 가장 무리 없이 옮겨갈 수 있는 자리에서 이동했다"는
 * 해석이 가장 자연스럽고, 보유 포지션이 1개뿐이면 자동으로 그 포지션 기준과 같아져
 * 특별 취급이 필요 없다.
 *
 * ## BFS 거리는 그래프 로드시 전 쌍 미리 계산한다
 * 11노드 그래프라 매 호출 BFS도 무시할 만한 비용이지만, 어차피 라인업 선정(21일차)
 * ·계수 체인(24일차)에서 선수 수만큼 반복 호출되므로 모듈 로드 시 1회 전 쌍 BFS로
 * `POSITION_DISTANCE_TABLE`을 만들어 이후는 테이블 조회(O(1))로 처리한다. 그래프
 * 자체가 `POSITION_ADJACENCY`(FR-PL-007 원문 엣지 그대로) 상수이므로 재계산 비용도
 * 결정론에 영향이 없다(입력이 없는 순수 상수 초기화).
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` / `react` / `@supabase/*` 사용·import 0건.
 * 타입은 `@/types` 배럴로만 import(서브경로 금지).
 */

import type { PlayerPosition, Position } from '@/types';
import { type AbilityModifierClampOptions, clampAbilityModifier } from './modifiers';
import { GK_CROSS_POSITION_MODIFIER_DEFAULT } from '../match/gk-fallback';

/**
 * 포지션 인접 그래프(FR-PL-007 원문 엣지 그대로, 무방향).
 * `GK—CB` / `CB—LB,RB,DM` / `LB—RB,LW` / `RB—RW` / `DM—CM` / `CM—AM` /
 * `AM—SS,LW,RW` / `LW—ST` / `RW—ST` / `SS—ST`.
 */
export const POSITION_ADJACENCY: Readonly<Record<Position, readonly Position[]>> = {
  GK: ['CB'],
  CB: ['GK', 'LB', 'RB', 'DM'],
  LB: ['CB', 'RB', 'LW'],
  RB: ['CB', 'LB', 'RW'],
  DM: ['CB', 'CM'],
  CM: ['DM', 'AM'],
  AM: ['CM', 'SS', 'LW', 'RW'],
  LW: ['LB', 'AM', 'ST'],
  RW: ['RB', 'AM', 'ST'],
  ST: ['LW', 'RW', 'SS'],
  SS: ['AM', 'ST'],
};

function bfsDistancesFrom(origin: Position): Record<Position, number> {
  const distances = { [origin]: 0 } as Record<Position, number>;
  const queue: Position[] = [origin];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    for (const neighbor of POSITION_ADJACENCY[current]) {
      if (distances[neighbor] === undefined) {
        distances[neighbor] = distances[current] + 1;
        queue.push(neighbor);
      }
    }
  }
  return distances;
}

/** 전 포지션 쌍 최단거리 사전 계산(모듈 로드 1회) — `positionGraphDistance`의 조회 테이블 */
const POSITION_DISTANCE_TABLE: Readonly<Record<Position, Readonly<Record<Position, number>>>> =
  Object.fromEntries(
    (Object.keys(POSITION_ADJACENCY) as Position[]).map((position) => [position, bfsDistancesFrom(position)]),
  ) as Record<Position, Record<Position, number>>;

/** `POSITION_ADJACENCY` 상에서 두 포지션의 BFS 최단거리. 같은 포지션이면 0. */
export function positionGraphDistance(from: Position, to: Position): number {
  return POSITION_DISTANCE_TABLE[from][to];
}

/** 보유 숙련도 5단계 → 배율 (FR-PL-006, 공통코드 `POSITION_PROFICIENCY_MULT.P1~P5`) */
export const POSITION_PROFICIENCY_LEVEL_MULT_DEFAULT: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  5: 1.0,
  4: 0.95,
  3: 0.88,
  2: 0.75,
  1: 0.6,
};

/** 미보유 거리식 `max(FLOOR, BASE − STEP×dist)`의 항 (공통코드 `UNFAMILIAR_*`) */
export const POSITION_UNFAMILIAR_BASE_DEFAULT = 0.88;
export const POSITION_UNFAMILIAR_STEP_DEFAULT = 0.11;
export const POSITION_UNFAMILIAR_FLOOR_DEFAULT = 0.45;

/**
 * `positionModifier` 오버라이드 — I-83 스냅샷 주입 패턴. 미지정 필드는 안전 기본값을
 * 쓴다. `crossPositionModifier`는 `gk-fallback.ts`의 동명 파라미터와 같은 공통코드
 * 값(`POSITION_PROFICIENCY_MULT.GK_CROSS`)을 가리킨다 — 오케스트레이션 계층이 두 곳에
 * 같은 값을 배선한다.
 */
export interface PositionModifierOptions extends AbilityModifierClampOptions {
  readonly levelMult?: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5, number>>>;
  readonly unfamiliarBase?: number;
  readonly unfamiliarStep?: number;
  readonly unfamiliarFloor?: number;
  readonly crossPositionModifier?: number;
}

export interface PositionModifierInput {
  /** 실제 출전 포지션(라인업 슬롯) */
  readonly assignedPosition: Position;
  /** 선수가 소화 가능한 포지션 전체(E-10 `PlayerPosition`, 본인 레코드) — 1개 이상 필수 */
  readonly playerPositions: readonly PlayerPosition[];
}

/**
 * 포지션 숙련도 계수(`M_position`, FR-PL-006).
 *
 * 판정 순서(우선순위대로):
 * ① GK 교차 — `assignedPosition`이 GK인지 여부와 선수의 GK 보유 여부가 다르면
 *    **하드 고정** `crossPositionModifier`(기본 0.35, 보유 단계표보다 우선).
 * ② 보유 — `playerPositions`에 `assignedPosition` 항목이 있으면 그 `proficiency`(1~5)를
 *    단계표에서 조회.
 * ③ 미보유 — 보유 포지션 중 `assignedPosition`과 가장 가까운 것 기준 BFS 거리로
 *    `max(FLOOR, BASE − STEP×dist)`.
 *
 * @throws `playerPositions`가 비어 있거나, 보유 항목의 `proficiency`가 1~5 밖이면 오류.
 */
export function positionModifier(input: PositionModifierInput, options?: PositionModifierOptions): number {
  const { assignedPosition, playerPositions } = input;
  if (playerPositions.length === 0) {
    throw new RangeError('positionModifier: playerPositions는 최소 1개 이상이어야 합니다');
  }

  const playerIsGoalkeeper = playerPositions.some((entry) => entry.position === 'GK');
  const assignedIsGoalkeeper = assignedPosition === 'GK';
  if (playerIsGoalkeeper !== assignedIsGoalkeeper) {
    const crossValue = options?.crossPositionModifier ?? GK_CROSS_POSITION_MODIFIER_DEFAULT;
    return clampAbilityModifier(crossValue, options);
  }

  const heldEntry = playerPositions.find((entry) => entry.position === assignedPosition);
  if (heldEntry) {
    const levelMult = { ...POSITION_PROFICIENCY_LEVEL_MULT_DEFAULT, ...options?.levelMult };
    const raw = levelMult[heldEntry.proficiency as 1 | 2 | 3 | 4 | 5];
    if (raw === undefined) {
      throw new RangeError(
        `positionModifier: proficiency는 1~5여야 합니다 (받은 값: ${heldEntry.proficiency})`,
      );
    }
    return clampAbilityModifier(raw, options);
  }

  const dist = Math.min(
    ...playerPositions.map((entry) => positionGraphDistance(entry.position, assignedPosition)),
  );
  const base = options?.unfamiliarBase ?? POSITION_UNFAMILIAR_BASE_DEFAULT;
  const step = options?.unfamiliarStep ?? POSITION_UNFAMILIAR_STEP_DEFAULT;
  const floor = options?.unfamiliarFloor ?? POSITION_UNFAMILIAR_FLOOR_DEFAULT;
  const raw = Math.max(floor, base - step * dist);
  return clampAbilityModifier(raw, options);
}
