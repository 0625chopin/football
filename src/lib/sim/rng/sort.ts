/**
 * 안정 정렬 헬퍼 — 명시적 tiebreak 키 강제
 *
 * Task 006 / 4일차 산출물. 엔진에서 "순서가 결과에 영향을 주는" 모든 정렬은
 * 이 파일의 `stableSortBy()`를 경유해야 합니다.
 *
 * ## 왜 필요한가 (NFR-DT-008)
 * `Map`/`Set`의 순회 순서는 사양상 삽입 순서를 보장하지만, 엔진 코드가
 * 이 사실에 암묵적으로 기대면(예: `[...someMap.values()]`를 그대로 순위표로
 * 쓰는 식) "정렬 기준"이 코드 어디에도 명시되지 않은 채 우연히 동작하게
 * 됩니다. 이런 코드는 리팩터링 한 번으로 조용히 깨지고, 원인 추적이
 * 어렵습니다(R-03). 그래서 이 프로젝트는 **정렬이 필요한 모든 지점에서
 * tiebreak 키를 코드로 명시**하도록 강제합니다.
 *
 * ## 타입 수준 강제 — 런타임 검사가 아닙니다
 * `TiebreakKeys<T>`는 **최소 1개 원소를 가진 튜플 타입**입니다.
 *
 * ```ts
 * type TiebreakKeys<T> = readonly [SortKey<T>, ...SortKey<T>[]];
 * ```
 *
 * `[SortKey<T>, ...SortKey<T>[]]`는 "첫 원소는 반드시 있고, 그 뒤로 0개
 * 이상"이라는 뜻의 튜플이라, 빈 배열 리터럴 `[]`은 이 타입에 대입될 수
 * 없습니다. `stableSortBy(items, [])`처럼 호출하면 **컴파일이 실패**합니다
 * (런타임에 도달하기 전에 `tsc`가 막습니다). 이 파일 하단 주석에 실제
 * 재현 절차를 남겨 두었습니다.
 *
 * 반대로 런타임 값(배열 변수)을 그대로 넘기는 경우처럼 타입 시스템이
 * 원소 개수를 추적할 수 없는 경로에서는 이 보장이 적용되지 않습니다.
 * 그런 동적 구성이 필요하다면 호출부에서 직접
 * `keys: TiebreakKeys<T> = [first, ...rest]`처럼 최소 1개를 타입으로
 * 못박은 뒤 나머지를 스프레드하십시오.
 *
 * ## 안정성 근거 — 왜 병합 정렬을 새로 짜지 않았는가
 * `Array.prototype.sort`는 ECMA-262 2019(ES10) 개정부터 **모든 구현체가
 * 안정 정렬**이어야 한다고 명시적으로 규정합니다(이전에는 구현체 재량).
 * V8(Node/Chrome)·JavaScriptCore(Safari)·SpiderMonkey(Firefox) 전부 이
 * 개정 이후 TimSort 계열로 통일되어 있으므로, 별도 병합 정렬을 구현할
 * 필요가 없습니다. 이 헬퍼는 표준 `sort()` 위에 **명시적 비교자 체인**만
 * 얹습니다.
 *
 * ## 동률이 tiebreak 키로도 갈리지 않을 때 — 최종 폴백은 호출자 책임
 * 이 헬퍼는 주어진 키들을 순서대로 비교하다 전부 0(동률)이면 **0을
 * 반환**합니다. `sort()`가 안정 정렬이므로 이 경우 결과는 **입력 배열의
 * 원래 순서를 그대로 유지**합니다 — 이것이 이 헬퍼가 보장하는 전부입니다.
 *
 * 그 이상의 "동률을 실제로 갈라야 하는" 요구(예: 026 타이브레이커
 * 7단계의 마지막 단계인 시드 기반 결정론적 추첨)는 **의도적으로 이
 * 헬퍼의 책임 밖**에 둡니다. 근거는 셋입니다.
 * 1. **단일 책임** — 이 헬퍼는 상태 없는 순수 비교 유틸입니다. 시드
 *    추첨을 넣으려면 `PrngState`를 인자로 받아야 하는데, 그러면 "정렬"과
 *    "난수 소비"라는 서로 다른 관심사가 한 함수에 섞입니다.
 * 2. **호출부마다 추첨 대상이 다릅니다** — 순위표는 동률 "구간"(2팀 이상)
 *    을 뽑아 그 구간 안에서만 추첨해야 하고, 다른 정렬(예: 컵 시딩)은
 *    애초에 시드 추첨이 아닌 다른 폴백(D-24)을 씁니다. 범용 정렬 헬퍼가
 *    이런 도메인별 규칙을 알 필요가 없습니다.
 * 3. **합성이 쉽습니다** — 호출자는 `stableSortBy()` 결과에서 인접한
 *    동률 원소들을 (같은 키 값을 가진 구간으로) 스캔해 추출한 뒤, 그
 *    구간에 한해 `precision.ts`의 `pickWeightedIndex()` 등으로 시드
 *    기반 추첨을 적용하면 됩니다. 즉 "정렬까지"는 이 파일이, "정렬 이후
 *    동률 그룹의 시드 추첨"은 026(`standing/tiebreak.ts`)이 맡습니다.
 *
 * ## 실행 제약
 * `Math.random()` / `Date.now()` 사용 0건. `react` / `@supabase/*` import
 * 0건. 모듈 스코프 가변 상태 0건(전부 순수 함수). `Map`/`Set` 순회 순서에
 * 의존하는 코드 0건 — 이 헬퍼는 배열만 다룹니다.
 *
 * ## 범위 밖 (후속 일차)
 * 셔플 불변성 Vitest(5일차), 상태 해시(4일차 `hash.ts`, 별도 파일).
 */

/** 정렬 키가 비교에 쓸 수 있는 원시값. */
export type SortComparable = string | number;

/**
 * 정렬 키 하나의 정의 — "무엇을 기준으로, 어느 방향으로" 비교할지 명시합니다.
 *
 * `get`은 정렬 대상에서 비교값을 뽑는 순수 함수여야 합니다(부수효과 금지).
 */
export interface SortKey<T> {
  /** 비교에 사용할 값을 추출합니다. */
  readonly get: (item: T) => SortComparable;
  /** 정렬 방향. 생략 시 오름차순(`'asc'`). */
  readonly dir?: 'asc' | 'desc';
}

/**
 * 명시적 tiebreak 키 목록 — **최소 1개 이상**을 요구하는 튜플 타입입니다.
 *
 * 빈 배열 `[]`을 `stableSortBy()`에 넘기면 이 타입에 대입되지 않으므로
 * **컴파일 타임에 오류**가 됩니다(NFR-DT-008 완료 판정).
 */
export type TiebreakKeys<T> = readonly [SortKey<T>, ...SortKey<T>[]];

/** 부호 규약: `Array.prototype.sort` 비교자와 동일(-1/0/1이 아니어도 부호만 맞으면 됩니다). */
function compareComparable(a: SortComparable, b: SortComparable): number {
  if (typeof a === 'number' || typeof b === 'number') {
    const na = typeof a === 'number' ? a : Number.NaN;
    const nb = typeof b === 'number' ? b : Number.NaN;
    // NaN은 정의상 어떤 값과도 순서가 없으므로, 비교 불능임을 명시적으로 드러내기 위해
    // 예외를 던집니다(조용히 0을 반환하면 "동률"로 오인되어 안정 정렬 순서에 숨습니다).
    if (Number.isNaN(na) || Number.isNaN(nb)) {
      throw new RangeError(
        `stableSortBy: 정렬 키 값이 NaN이거나 숫자·문자열이 혼재합니다 (a=${String(a)}, b=${String(b)})`,
      );
    }
    if (na < nb) return -1;
    if (na > nb) return 1;
    return 0;
  }
  // 문자열은 UTF-16 코드유닛 순으로 비교합니다(로케일 비의존).
  // localeCompare는 실행 환경(ICU 로케일 데이터)에 따라 결과가 달라질 수 있어
  // 결정론(NFR-DT-001/008)을 해칠 수 있으므로 의도적으로 쓰지 않습니다.
  // 서로게이트 페어가 섞인 문자열은 UTF-16 코드유닛 비교와 유니코드 코드포인트
  // 비교가 어긋날 수 있으나, 엔진이 다루는 식별자류 문자열은 ASCII 범위이므로
  // 실무 영향은 없습니다. 필요해지면 후속 이슈로 다룹니다.
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** 정렬 키 하나로 두 원소를 비교합니다. `dir='desc'`면 부호를 반전합니다. */
function compareByKey<T>(a: T, b: T, key: SortKey<T>): number {
  const result = compareComparable(key.get(a), key.get(b));
  return key.dir === 'desc' ? -result : result;
}

/**
 * 명시적 tiebreak 키로 안정 정렬합니다.
 *
 * - 원본 배열을 변형하지 않습니다(얕은 복사 후 정렬).
 * - `keys`를 순서대로 적용해 첫 번째로 0이 아닌 비교 결과를 채택합니다.
 * - 모든 키가 동률이면 0을 반환하며, 안정 정렬 특성상 입력 순서가 유지됩니다.
 *   그 이상의 동률 해소(시드 추첨 등)는 호출자 책임입니다 — 파일 상단 설명 참고.
 *
 * @param items 정렬할 원소들(변형되지 않습니다).
 * @param keys **최소 1개 이상**의 tiebreak 키. 빈 배열은 타입 오류입니다.
 * @returns 정렬된 새 배열.
 *
 * @example
 * ```ts
 * const ranked = stableSortBy(standings, [
 *   { get: (s) => s.points, dir: 'desc' },
 *   { get: (s) => s.goalDifference, dir: 'desc' },
 *   { get: (s) => s.teamId }, // 그래도 갈리지 않으면 팀 ID 오름차순
 * ]);
 * ```
 */
export function stableSortBy<T>(items: readonly T[], keys: TiebreakKeys<T>): T[] {
  // 런타임 방어: 타입을 우회(예: `as TiebreakKeys<T>`로 강제 캐스팅, JS 호출부)해
  // 빈 배열이 실제로 들어오는 경로까지 막습니다. 정상적인 TS 호출에서는
  // 애초에 컴파일이 실패하므로 이 분기에 도달하지 않습니다.
  if (keys.length === 0) {
    throw new RangeError('stableSortBy: keys는 최소 1개 이상이어야 합니다 (받은 값: 빈 배열)');
  }

  return [...items].sort((a, b) => {
    for (const key of keys) {
      const result = compareByKey(a, b, key);
      if (result !== 0) return result;
    }
    return 0;
  });
}

/**
 * 정렬 결과에서 "첫 번째 키 값이 서로 같은" 인접 구간들을 찾습니다.
 *
 * 026 타이브레이커처럼 "정렬까지는 되었지만 여전히 동률인 그룹"만 뽑아
 * 시드 기반 추첨 등 후속 처리를 하고 싶을 때 쓰는 보조 함수입니다.
 * `stableSortBy()`로 이미 정렬된 배열에 대해서만 의미가 있습니다.
 *
 * @param sorted `stableSortBy()`로 정렬된 배열.
 * @param key 동률 판정에 쓸 단일 키(보통 `stableSortBy()`에 넘긴 마지막 키).
 * @returns 각 동률 구간의 `[startIndex, endIndex)` 쌍 목록(길이 1인 구간은 제외).
 */
export function findTiedRuns<T>(
  sorted: readonly T[],
  key: SortKey<T>,
): ReadonlyArray<readonly [number, number]> {
  const runs: Array<readonly [number, number]> = [];
  let runStart = 0;
  for (let i = 1; i <= sorted.length; i += 1) {
    const boundary =
      i === sorted.length || compareComparable(key.get(sorted[runStart]), key.get(sorted[i])) !== 0;
    if (boundary) {
      if (i - runStart > 1) {
        runs.push([runStart, i]);
      }
      runStart = i;
    }
  }
  return runs;
}

/*
 * ## 타입 강제 재현 절차 (기록용 — 실제 검증은 4일차 마감 검증에서 수행)
 *
 * 아래 코드를 임시 파일(`src/lib/sim/rng/__typecheck_tmp.ts` 등, 커밋 대상 아님)에
 * 붙여넣고 `npx tsc --noEmit`을 실행하면 타입 오류가 발생함을 확인할 수 있습니다.
 * 확인 후 임시 파일은 즉시 삭제합니다.
 *
 * ```ts
 * import { stableSortBy } from './sort';
 * declare const items: readonly { id: string }[];
 * // 기대: 아래 줄에서 컴파일 오류.
 * // "Source has 0 element(s) but target requires 1."
 * stableSortBy(items, []);
 * ```
 */
