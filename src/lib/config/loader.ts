/**
 * 공통코드 상수 로더 인터페이스 — **10일차(2026-08-03), Task 003 계속분**
 *
 * 근거: `ROADMAP.md` Task 003(9~12일차) 수락 기준 "36개 그룹이 모두 등록되고, **엔진이
 * 숫자 리터럴 대신 로더를 통해 값을 얻는 경로가 타입으로 강제된다**" / `docs/team-schedule/
 * 03-데이터밸런싱배당팀.md` 10일차 행 "상수 로더 인터페이스 — 해석 우선순위(전역 기본값
 * → 하드코딩 폴백), 그룹 단위 캐시, 무효화 훅" / 인계물 H-05(12일차) 함수명 `loadConstants(group)`
 * 고정. 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: `loadConstants(group)` 조회 계약, 그룹별 값 스칼라 타입을 카탈로그
 *   `valueType`에서 유도하는 타입 유틸, 값 소스(`ConstantSource`) 주입 지점, 그룹 단위
 *   캐시, 무효화 훅(`invalidateConstants`/`onConstantsInvalidated`).
 * - **담지 않는 것(이후 일차 소관)**: 하드코딩 안전 기본값 테이블·폴백 시 WARN 로그
 *   규약(11일차 `fallback.ts`, NFR-CFG-005/AS-13), 발효 정책 3종 해석 함수(11일차
 *   `policy.ts`), 상수 스냅샷 직렬화·해시(12일차 `snapshot.ts`), 실제 그룹별 시드 기본값
 *   (36일차 `supabase/seed/common-code.sql`). **오늘 시점에는 어떤 실제 값 데이터도
 *   존재하지 않는다** — `catalog.ts`는 그룹 메타데이터(E-41)만 가지고 있을 뿐, 그룹 내부
 *   코드별 값(E-42 `CommonCode.value`/`defaultValue`)은 아직 어디에도 정의돼 있지 않다.
 *   그래서 이 파일은 "값을 얻는 경로의 계약·캐시·무효화 메커니즘"만 오늘 확정하고, 실제
 *   값을 채우는 소스 구현체는 11일차 이후가 `setFallbackSource`/`setGlobalDefaultSource`로
 *   주입한다(Mock-First 원칙 — 소비 계약은 고정, 소스 구현만 교체 가능해야 한다).
 *
 * ## "타입으로 강제"의 실체
 * `loadConstants<G extends CommonCodeGroupCode>(group: G)`의 `group` 파라미터는
 * `catalog.ts`가 파생한 36개 `groupCode` 리터럴 유니온으로 제한된다 — 미등록·오타 그룹
 * 코드를 넘기면 `npx tsc --noEmit`이 즉시 실패한다(런타임 검증이 아니라 컴파일타임
 * 강제). 반환 타입 `ConstantGroupValues<G>`도 해당 그룹의 카탈로그 `valueType`(리터럴)에서
 * 자동 유도되므로(`INT`/`DECIMAL`→`number`, `STRING`→`string`, `BOOL`→`boolean`,
 * `JSON`→`Readonly<Record<string, unknown>>`), 그룹마다 서로 다른 스칼라 타입이 강제된다.
 * 엔진이 이 함수를 거치지 않고 숫자를 직접 하드코딩할 이유가 없도록, 그룹별 실제 값은
 * 이 모듈(과 이후 소스 구현체) 밖으로 노출되지 않는다.
 *
 * ## 해석 우선순위 · 캐시 · 무효화
 * 1. 그룹 단위 캐시(`Map<CommonCodeGroupCode, ConstantGroupValues<...>>`)를 먼저 조회한다.
 * 2. 캐시 미스면 **전역 기본값 소스 → 하드코딩 폴백 소스** 순으로 조회한다(team-schedule
 *    10일차 행 순서 그대로). 두 소스 모두 `setGlobalDefaultSource`/`setFallbackSource`로
 *    나중에 주입되는 `ConstantSource`이며, 오늘은 둘 다 미등록(`null`) 상태가 기본값이다.
 * 3. 두 소스 모두 값을 못 주면 `ConstantSourceUnavailableError`를 던진다. **주의**:
 *    AS-13/NFR-CFG-005("공통코드 미등록·손상에도 시스템 미정지")의 실제 구현은 하드코딩
 *    안전 기본값 폴백 + WARN 로그이며 이는 11일차 `fallback.ts` 소관이다. 오늘은 폴백
 *    소스가 아예 없으므로 "조용히 빈 값을 반환"하는 쪽이 오히려 잘못된 값으로 오인될
 *    위험(silent wrong data)이 있어, 명시적 에러를 던지는 fail-fast를 임시 동작으로
 *    택했다 — `fallback.ts`가 `setFallbackSource`를 호출하는 순간부터 이 에러 경로는
 *    자연히 사라진다.
 * 4. 소스를 재등록(`setGlobalDefaultSource`/`setFallbackSource`)하면 캐시 전체를
 *    무효화한다(stale 값 방지). `invalidateConstants(group?)`로 그룹 단위 또는 전체
 *    무효화를 수동으로도 호출할 수 있다(어드민 콘솔의 값 수정, 5팀 소비 예정).
 * 5. `onConstantsInvalidated(listener)`로 무효화 이벤트를 구독할 수 있다(4팀 폴링,
 *    5팀 어드민 대시보드가 재조회 타이밍을 잡는 데 사용할 수 있는 얇은 훅).
 *
 * ## import 규약
 * 도메인 타입(`CommonCodeValueType`)은 **배럴(`@/types`)에서만** import한다(체크리스트
 * C-5·C-6, `@/types/config` 같은 서브경로 직접 import 금지). 카탈로그 관련 타입·값은
 * 같은 소유 디렉터리의 `./catalog`에서 가져온다(9일차 `catalog.ts` 헤더가 "10일차 로더가
 * `COMMON_CODE_GROUP_BY_CODE`를 초기 소스로 재사용할 수 있다"고 명시한 재사용 원칙을
 * 따른다). `src/lib/sim/**`, `src/types/**`는 이 작업에서 수정하지 않는다.
 */

import type { CommonCodeValueType } from '@/types';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from './catalog';

/* ────────────────────────────────────────────────────────────────────────
 * 그룹별 값 스칼라 타입 유도
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 카탈로그 배열에서 특정 그룹코드 `G`에 대응하는 원소의 리터럴 타입만 좁힌다.
 * `COMMON_CODE_GROUP_CATALOG`가 `as const satisfies readonly CommonCodeGroupCatalogEntry[]`로
 * 선언돼 각 원소가 리터럴 타입(`groupCode`·`valueType` 리터럴)을 유지하기 때문에 가능하다
 * (`catalog.ts`가 내보내는 `COMMON_CODE_GROUP_BY_CODE`는 `Record<CommonCodeGroupCode,
 * CommonCodeGroupCatalogEntry>` 타입 어노테이션 때문에 그룹별 리터럴이 넓혀져 있어
 * 이 용도로 쓸 수 없다 — 값 조회 O(1) 용도로만 재사용한다, 아래 참조).
 */
type CatalogEntryFor<G extends CommonCodeGroupCode> = Extract<
  (typeof COMMON_CODE_GROUP_CATALOG)[number],
  { readonly groupCode: G }
>;

/** `CommonCodeValueType`(E-41 `value_type`)을 실제 TS 스칼라 타입으로 매핑한다. */
type ScalarForValueType<T extends CommonCodeValueType> = T extends 'INT' | 'DECIMAL'
  ? number
  : T extends 'STRING'
    ? string
    : T extends 'BOOL'
      ? boolean
      : T extends 'JSON'
        ? Readonly<Record<string, unknown>>
        : never;

/**
 * 그룹 `G`가 담는 코드별 값 맵의 타입. 코드(예: `LEAGUE_1`)는 카탈로그(그룹 메타데이터,
 * E-41)에 구조화돼 있지 않고 그룹 내부 값(E-42)에만 존재하므로 키는 `string`으로 열어
 * 두되, 값 타입은 그룹의 `valueType`에서 정확히 유도한다.
 */
export type ConstantGroupValues<G extends CommonCodeGroupCode> = Readonly<
  Record<string, ScalarForValueType<CatalogEntryFor<G>['valueType']>>
>;

/* ────────────────────────────────────────────────────────────────────────
 * 값 소스 — 전역 기본값 / 하드코딩 폴백 (pluggable)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 상수 값 소스 계약. `getGroupConstants`는 **비제네릭**이다 — 소스 구현체(11일차
 * 하드코딩 폴백 테이블, 훗날 DB 어댑터, 테스트 더블)가 그룹별 제네릭 반환 타입을 맞출
 * 필요 없이 평범한 함수로 남도록 하기 위함이다. 그룹별 정확한 스칼라 타입 강제는
 * `loadConstants` 공개 API 경계 한 곳에서만 수행한다(과설계 방지).
 */
export interface ConstantSource {
  /** 관측·디버깅용 소스 식별자(예: `'fallback-table'`, `'supabase'`). */
  readonly name: string;
  /** 그룹의 코드별 값 맵을 반환한다. 이 소스가 해당 그룹을 모르면 `undefined`. */
  getGroupConstants(
    group: CommonCodeGroupCode,
  ): ConstantGroupValues<CommonCodeGroupCode> | undefined;
}

let globalDefaultSource: ConstantSource | null = null;
let fallbackSource: ConstantSource | null = null;

/**
 * 전역 기본값 소스를 등록/해제한다(해석 우선순위 1순위). 오늘은 실제 구현체가 없으므로
 * 기본값은 `null`이다 — 훗날 DB 기반 어댑터가 연결되는 지점.
 * 등록·해제 시 캐시가 전체 무효화된다(stale 값 방지).
 */
export function setGlobalDefaultSource(source: ConstantSource | null): void {
  globalDefaultSource = source;
  invalidateConstants();
}

/**
 * 하드코딩 폴백 소스를 등록/해제한다(해석 우선순위 2순위). 11일차 `fallback.ts`가
 * 안전 기본값 테이블을 완성하면 이 함수로 자신을 등록한다.
 * 등록·해제 시 캐시가 전체 무효화된다(stale 값 방지).
 */
export function setFallbackSource(source: ConstantSource | null): void {
  fallbackSource = source;
  invalidateConstants();
}

/**
 * `loadConstants(group)`가 어떤 소스에서도 값을 얻지 못했을 때 던지는 에러.
 * AS-13("미등록·손상에도 시스템 미정지")의 실제 무정지·WARN 로그 처리는 11일차
 * `fallback.ts`가 폴백 소스를 등록하면서 완성된다 — 오늘은 두 소스가 모두 비어 있을
 * 수 있는 과도기이므로, 잘못된 값을 조용히 흘려보내는 대신 명시적으로 실패시킨다.
 */
export class ConstantSourceUnavailableError extends Error {
  constructor(readonly group: CommonCodeGroupCode) {
    super(
      `[config/loader] "${group}" 그룹의 상수 값을 어떤 소스에서도 찾지 못했다. ` +
        '전역 기본값 소스(DB)와 하드코딩 폴백 소스(11일차 fallback.ts) 중 ' +
        '적어도 하나가 이 그룹의 값을 반환해야 한다.',
    );
    this.name = 'ConstantSourceUnavailableError';
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * 그룹 단위 캐시
 * ──────────────────────────────────────────────────────────────────────── */

const cache = new Map<CommonCodeGroupCode, ConstantGroupValues<CommonCodeGroupCode>>();

/**
 * 그룹 `group`의 상수 값 맵을 조회한다. 캐시 → 전역 기본값 소스 → 하드코딩 폴백 소스
 * 순으로 해석한다(team-schedule 10일차 행). 이것이 이 모듈이 노출하는 **유일한** 값
 * 취득 경로다 — 엔진 코드는 숫자 리터럴 대신 반드시 이 함수를 거친다.
 */
export function loadConstants<G extends CommonCodeGroupCode>(group: G): ConstantGroupValues<G> {
  const cached = cache.get(group);
  if (cached !== undefined) {
    return cached as ConstantGroupValues<G>;
  }

  const resolved = globalDefaultSource?.getGroupConstants(group) ??
    fallbackSource?.getGroupConstants(group);

  if (resolved === undefined) {
    throw new ConstantSourceUnavailableError(group);
  }

  cache.set(group, resolved);
  return resolved as ConstantGroupValues<G>;
}

/* ────────────────────────────────────────────────────────────────────────
 * 무효화 훅
 * ──────────────────────────────────────────────────────────────────────── */

type InvalidationListener = (group: CommonCodeGroupCode | undefined) => void;
const invalidationListeners = new Set<InvalidationListener>();

/**
 * 캐시를 무효화한다. `group`을 주면 해당 그룹만, 생략하면 전체를 지운다. 이후
 * `loadConstants` 호출은 소스에서 값을 다시 조회한다. 등록된 무효화 리스너를
 * 모두 호출한다.
 */
export function invalidateConstants(group?: CommonCodeGroupCode): void {
  if (group === undefined) {
    cache.clear();
  } else {
    cache.delete(group);
  }
  for (const listener of invalidationListeners) {
    listener(group);
  }
}

/**
 * 무효화 이벤트를 구독한다. 4팀 폴링 훅, 5팀 어드민 대시보드가 캐시 무효화 시점에
 * 맞춰 재조회하는 용도로 사용할 수 있다. 반환값을 호출하면 구독을 해제한다.
 */
export function onConstantsInvalidated(listener: InvalidationListener): () => void {
  invalidationListeners.add(listener);
  return () => {
    invalidationListeners.delete(listener);
  };
}
