/**
 * `src/lib/sim/season/growth.ts` — Task 028(51일차) "능력치 성장·하락 보정 — 나이대
 * 계수 4구간, PA 초과 금지, 시즌 변동 ±6 이내". `docs/team-schedule/02-시뮬레이션엔진팀.md`
 * 51일차 행. 시즌 종료 시점에 선수 34속성(`PlayerAttributeValues`)을 나이대에 따라
 * 성장·하락시키고, 그 결과가 `Player.pa`(잠재 능력치)를 넘지 않도록 보정한다.
 *
 * ## 나이대 4구간 — `src/lib/mock/world.ts`의 시장가치 나이 배율과 동일 경계값
 * FR-PL 원문에 나이대 경계가 명시돼 있지 않아 이 파일이 판단한다. `src/lib/mock/world.ts`
 * (다른 팀 소유 — import는 하지 않는다, 아래 "OVR 산출" 절 참조)가 시장가치 나이 배율에
 * 이미 `≤21 / 22~29 / 30~33 / ≥34` 4구간을 쓰고 있어("만 21세까지 성장기, 22~29세
 * 전성기, 30~33세 하락 시작, 34세 이상 급격한 하락"이라는 축구 시뮬레이션 통념과도
 * 일치), 같은 경계를 재사용한다 — 프로젝트 안에 나이대를 가르는 기준이 이미 하나
 * 있는데 능력치 성장이 다른 경계를 쓰면 "몇 살부터 하락기인가"라는 질문에 두 개의
 * 서로 다른 답이 생긴다. 계수 자체(성장·하락 폭)는 시장가치 배율과 무관한 별도 값이다
 * (하나는 가치 배율, 하나는 능력치 델타 — 같은 경계, 다른 파라미터).
 *
 * ## 계수는 "구간별 평균 델타" — 실제 변동은 진테(jitter) ±2를 더해 결정
 * `나이대 계수 4구간`은 구간별 기대 성장/하락폭(정수)이다. 실제 속성별 델타는
 * `계수 + 진테(nextIntBetween(-2, 2))`를 **±6으로 클램프**한 값이다 — 진테가 있어야
 * 같은 나이대 안에서도 선수·속성마다 성장 곡선이 갈라지고(전원이 똑같이 늘거나 줄면
 * 시즌마다 전 선수 능력치 분포가 그대로 평행이동만 한다), 클램프가 있어야 "시즌 변동
 * ±6 이내" 수용 기준이 무슨 값을 넣어도 깨지지 않는다(계수를 -4~+3으로 고른 것도
 * 극단값(VETERAN -4 + 진테 -2 = -6)이 정확히 경계에 닿고 절대 넘지 않도록 맞춘
 * 결과다).
 *
 * ## OVR 산출 — `ovrCached`와 동일 방식, 하지만 재구현(import 아님)
 * `PlayerAttribute.ovrCached`는 "선호 포지션 기준 파생 캐시"(`src/types/person.ts`
 * 주석)이며, 현재 유일한 구현은 `src/lib/mock/world.ts`의 "GK면 GK 6속성 평균, 아니면
 * 비GK 28속성 평균, 반올림"이다. 이 파일은 그 로직을 **같은 방식으로 재구현**한다 —
 * `world.ts`는 이 팀(2팀) 소유 경로가 아니라서 import하면 팀 경계를 넘는 역방향
 * 의존(mock 생성 계층 → 엔진 계층)이 생기고, 두 파일이 우연히 겹칠 뿐 같은 소유자가
 * 유지보수하는 단일 소스가 아니기 때문이다(속성 평균 2줄짜리 로직이라 중복 비용도
 * 작다). 두 구현의 속성 키 집합·평균·반올림 규칙이 어긋나면 "성장 후 OVR"과 "생성
 * 시점 OVR"의 의미가 갈라지므로, 값 자체가 달라지면 팀장 조율 대상이다(선례:
 * `prize.ts`의 economy 중복 보고와 동일 성격).
 *
 * ## PA 초과 금지 — 어떻게 보장하는가
 * 진입 전제로 `computeOvr(attributes) <= player.pa`를 검증한다(이미 어겼다면 이
 * 파일 이전 시즌 산출물이 잘못된 것이므로 조용히 넘기지 않고 예외를 던진다). 성장
 * 적용 후 OVR이 PA를 넘으면, **이번 시즌에 실제로 늘어난 속성**(`grown[key] >
 * original[key]`) 중 값이 가장 큰 속성부터 1씩 깎아 OVR을 다시 계산하기를 PA 이하가
 * 될 때까지 반복한다(가장 많이 자란 속성을 먼저 되돌리는 결정론적 규칙 — 난수를 더
 * 쓰지 않는다). 진입 전제가 성립하면 초과분은 반드시 이번 시즌 성장분 안에서만
 * 발생하므로(합이 늘었다는 것은 적어도 한 속성이 늘었다는 뜻) "되돌릴 속성이 없는데
 * 아직 초과"인 경우는 수학적으로 나오지 않는다 — 존재하지 않는 분기를 방어 코드로
 * 만들지 않는다.
 *
 * ## 34속성 순회 순서 — 객체 순서에 기대지 않는다
 * 진테 소비 순서가 PRNG 상태 스레딩에 그대로 반영되므로(결정론, R-03 시드 스냅샷),
 * `Object.keys(attributes)` 같은 암묵적 순서 대신 `ALL_ATTRIBUTE_KEYS`(`src/types/person.ts`
 * `PlayerAttributeValues` 선언 순서 그대로)를 명시 배열로 고정한다.
 *
 * ## 실행 제약 (NFR-DT-001)
 * `Math.random()` / `Date.now()` / `react` / `@supabase/*` 사용·import 0건. 난수는
 * `rng/prng.ts`의 `nextIntBetween()`만 경유하며, 이 파일의 모든 함수가 `{state, value}`를
 * 반환한다 — 호출자는 반환된 `state`를 다음 선수/다음 호출로 반드시 이어받아야 한다.
 * 이 파일의 델타·클램프는 정수 연산이므로 `rng/precision.ts`(확률 비교) 대상이 아니다
 * (`prize.ts`의 지수 계산과 동일 사유). 상수는 I-83 패턴 — 안전 기본값 상수만 두고
 * `loadConstants()`를 이 파일이 직접 호출하지 않는다(`prize.ts` `LEAGUE_FINISH_POINT_DEFAULT`와
 * 동일 배선 책임 분리 — 오케스트레이션 계층이 공통코드 그룹 주입 시점에 실값으로
 * 교체한다). 타입은 `@/types` 배럴로만 import.
 *
 * ## H-16 인계 — 이 파일이 만드는 것
 * `applySeasonAttributeGrowth()`가 시즌 정산 오케스트레이션(3팀 030, 56일차 소비 시작)이
 * 부르는 진입점이다. 선수별 `{player, attributes}` 목록과 시즌 시작 PRNG 상태를 받아
 * 전원의 성장 결과(`AttributeGrowthOutcome[]`)와 다음 호출로 이어받을 상태를 반환한다.
 */

import type { Player, PlayerAttributeValues, PlayerId, Position } from '@/types';
import { nextIntBetween, type PrngResult, type PrngState } from '../rng/prng';

/** 나이대 4구간 — 경계값 근거는 파일 헤더 참조(`src/lib/mock/world.ts` 시장가치 배율과 동일). */
export type AgeBracket = 'YOUTH' | 'PRIME' | 'DECLINE' | 'VETERAN';

/** 나이대별 기대 성장(+)/하락(-) 계수. 실제 속성 델타 = 이 값 + 진테, ±6 클램프. */
export interface AgeGrowthCoefficientTable {
  /** 21세 이하 — 성장기 */
  readonly YOUTH: number;
  /** 22~29세 — 전성기(정체) */
  readonly PRIME: number;
  /** 30~33세 — 하락 시작 */
  readonly DECLINE: number;
  /** 34세 이상 — 급격한 하락 */
  readonly VETERAN: number;
}

/** FR-PL 원문 미확정 구간의 안전 기본값(I-83 주입 패턴). */
export const AGE_GROWTH_COEFFICIENT_DEFAULT: AgeGrowthCoefficientTable = {
  YOUTH: 3,
  PRIME: 0,
  DECLINE: -2,
  VETERAN: -4,
};

/** 속성별 진테(무작위 편차) 폭 — `[-JITTER_SPREAD, +JITTER_SPREAD]`. */
const JITTER_SPREAD = 2;

/** "시즌 변동 ±6 이내" 수용 기준 — 속성 1개의 시즌당 최대 변동폭. */
const SEASON_DELTA_CAP = 6;

const ATTRIBUTE_MIN = 1;
const ATTRIBUTE_MAX = 30;

/** `PlayerAttributeValues`(34필드) 선언 순서 그대로 — PRNG 소비 순서 고정용. */
const ALL_ATTRIBUTE_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'finishing', 'passing', 'crossing', 'dribbling', 'firstTouch', 'tackling',
  'marking', 'heading', 'longShots', 'setPieces',
  'composure', 'decisions', 'vision', 'positioning', 'workRate', 'aggression',
  'leadership', 'teamwork', 'anticipation', 'determination',
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'balance',
  'jumping', 'naturalFitness',
  'reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'kicking', 'commandOfArea',
];

/** GK가 아닌 포지션의 OVR 산출에 쓰는 28속성(`ovrCached` 산출 방식과 동일 키 집합). */
const OUTFIELD_OVR_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'finishing', 'passing', 'crossing', 'dribbling', 'firstTouch', 'tackling',
  'marking', 'heading', 'longShots', 'setPieces',
  'composure', 'decisions', 'vision', 'positioning', 'workRate', 'aggression',
  'leadership', 'teamwork', 'anticipation', 'determination',
  'pace', 'acceleration', 'stamina', 'strength', 'agility', 'balance',
  'jumping', 'naturalFitness',
];

/** GK의 OVR 산출에 쓰는 6속성(`ovrCached` 산출 방식과 동일 키 집합). */
const GOALKEEPER_OVR_KEYS: readonly (keyof PlayerAttributeValues)[] = [
  'reflexes', 'handling', 'oneOnOnes', 'aerialReach', 'kicking', 'commandOfArea',
];

function ovrRelevantKeys(position: Position): readonly (keyof PlayerAttributeValues)[] {
  return position === 'GK' ? GOALKEEPER_OVR_KEYS : OUTFIELD_OVR_KEYS;
}

/** `values`의 관련 속성 평균을 반올림한 OVR. `ovrCached` 산출 방식과 동일(파일 헤더 참조). */
function computeOvr(
  values: PlayerAttributeValues,
  keys: readonly (keyof PlayerAttributeValues)[],
): number {
  const sum = keys.reduce((acc, key) => acc + values[key], 0);
  return Math.round(sum / keys.length);
}

function clampAttribute(value: number): number {
  return Math.min(ATTRIBUTE_MAX, Math.max(ATTRIBUTE_MIN, value));
}

function clampDelta(value: number): number {
  return Math.min(SEASON_DELTA_CAP, Math.max(-SEASON_DELTA_CAP, value));
}

/** 나이 → 4구간 판정. 경계값 근거는 파일 헤더 참조. */
export function resolveAgeBracket(age: number): AgeBracket {
  if (age <= 21) return 'YOUTH';
  if (age <= 29) return 'PRIME';
  if (age <= 33) return 'DECLINE';
  return 'VETERAN';
}

/**
 * 성장 적용 후 OVR이 `pa`를 넘으면, 이번 시즌 실제로 늘어난 속성 중 값이 가장 큰
 * 것부터 1씩 되돌려 OVR을 다시 맞춘다. 되돌릴 속성이 바닥나는 경우는 나오지 않는다
 * (파일 헤더 "PA 초과 금지" 절 참조).
 */
function capToPotentialAbility(
  grown: Record<keyof PlayerAttributeValues, number>,
  original: PlayerAttributeValues,
  relevantKeys: readonly (keyof PlayerAttributeValues)[],
  pa: number,
): void {
  for (;;) {
    const ovr = computeOvr(grown as PlayerAttributeValues, relevantKeys);
    if (ovr <= pa) {
      return;
    }

    let targetKey = relevantKeys[0];
    let largestGrowth = -Infinity;
    for (const key of relevantKeys) {
      const growth = grown[key] - original[key];
      if (growth > largestGrowth) {
        largestGrowth = growth;
        targetKey = key;
      }
    }
    grown[targetKey] -= 1;
  }
}

/** 선수 1명의 성장 적용 결과. */
export interface AttributeGrowthOutcome {
  readonly playerId: PlayerId;
  readonly ageBracket: AgeBracket;
  readonly attributes: PlayerAttributeValues;
  /** 보정 후 재산출한 OVR — 호출자가 `PlayerAttribute.ovrCached` 갱신에 그대로 쓴다. */
  readonly ovrCached: number;
}

/**
 * 선수 1명의 34속성에 나이대 성장·하락 보정을 적용한다. `attributes`가 이미
 * `player.pa`를 넘는 OVR을 담고 있으면 상위 계층의 불변식 위반이므로 예외를 던진다.
 */
export function applyAttributeGrowth(
  state: PrngState,
  player: Pick<Player, 'id' | 'age' | 'pa' | 'preferredPosition'>,
  attributes: PlayerAttributeValues,
  table: AgeGrowthCoefficientTable = AGE_GROWTH_COEFFICIENT_DEFAULT,
): PrngResult<AttributeGrowthOutcome> {
  const relevantKeys = ovrRelevantKeys(player.preferredPosition);
  const initialOvr = computeOvr(attributes, relevantKeys);
  if (initialOvr > player.pa) {
    throw new Error(
      `applyAttributeGrowth: 선수 ${player.id}의 진입 OVR(${initialOvr})이 이미 ` +
        `PA(${player.pa})를 초과했습니다 — 이전 시즌 산출물의 불변식 위반입니다.`,
    );
  }

  const bracket = resolveAgeBracket(player.age);
  const coefficient = table[bracket];

  let cursor = state;
  const grown: Record<keyof PlayerAttributeValues, number> = { ...attributes };

  for (const key of ALL_ATTRIBUTE_KEYS) {
    const jitterStep = nextIntBetween(cursor, -JITTER_SPREAD, JITTER_SPREAD);
    cursor = jitterStep.state;
    const delta = clampDelta(coefficient + jitterStep.value);
    grown[key] = clampAttribute(attributes[key] + delta);
  }

  capToPotentialAbility(grown, attributes, relevantKeys, player.pa);
  const finalAttributes = grown as PlayerAttributeValues;

  return {
    state: cursor,
    value: {
      playerId: player.id,
      ageBracket: bracket,
      attributes: finalAttributes,
      ovrCached: computeOvr(finalAttributes, relevantKeys),
    },
  };
}

/** `applySeasonAttributeGrowth()` 입력 1건 — 성장 대상 선수와 현재 능력치. */
export interface PlayerAttributeGrowthInput {
  readonly player: Pick<Player, 'id' | 'age' | 'pa' | 'preferredPosition'>;
  readonly attributes: PlayerAttributeValues;
}

/**
 * 시즌 정산 진입점(H-16) — 선수 목록 전원에게 순서대로 성장을 적용하며 PRNG 상태를
 * 이어받는다. 반환 배열은 입력과 같은 길이·순서다.
 */
export function applySeasonAttributeGrowth(
  state: PrngState,
  players: readonly PlayerAttributeGrowthInput[],
  table: AgeGrowthCoefficientTable = AGE_GROWTH_COEFFICIENT_DEFAULT,
): PrngResult<readonly AttributeGrowthOutcome[]> {
  let cursor = state;
  const outcomes: AttributeGrowthOutcome[] = [];

  for (const entry of players) {
    const step = applyAttributeGrowth(cursor, entry.player, entry.attributes, table);
    cursor = step.state;
    outcomes.push(step.value);
  }

  return { state: cursor, value: outcomes };
}
