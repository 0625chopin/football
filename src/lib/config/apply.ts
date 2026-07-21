/**
 * 발효 정책 적용 + 상수 스냅샷 예산 감사 — **38일차(2026-09-10), Task 031a 완결분**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 38일차 행 "발효 정책 적용 —
 * `NEXT_SEASON` 그룹이 진행 중 시즌에 영향 0. 상수 스냅샷 기록·해시 중복 제거(시즌당 ≤ 20건,
 * ≤ 1MB)" / `docs/require/04-non-functional-requirements.md` NFR-CFG-006(② 시즌당 ≤ 20건
 * ③ 시즌당 ≤ 1MB) / FR-AD-013(발효 시점 규칙) / FR-AD-014(상수 스냅샷). 소유: 3팀
 * 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**:
 *   1. `resolveEffectiveCommonCode` — 11일차 `policy.ts`(정책 판정 함수)와 9일차
 *      `catalog.ts`(그룹별 `applyPolicy`)를 엮어, "현재 값(`current`)"과 "대기 중인 값
 *      (`pending`)" 중 지금 시점에 실제로 적용돼야 하는 쪽을 고르는 단일 진입점. 이것이
 *      "`NEXT_SEASON` 그룹이 진행 중 시즌에 영향 0"의 실제 구현이다 — `pending.effectiveFromSeason`이
 *      아직 도달하지 않았으면 무조건 `current`를 반환하므로, 시즌 중 반영 사례가 애초에
 *      만들어지지 않는다(회피가 아니라 함수 계약 자체가 그렇게 되어 있다).
 *   2. `resolveSnapshotRecording` — 12일차 `snapshot.ts`의 해시 중복 제거(`resolveSnapshotDedup`,
 *      NFR-CFG-006 ①)를 그대로 재사용하되, 그 위에 시즌 단위 예산(②≤20건, ③≤1MB)을
 *      감사하는 계층을 얹는다. `snapshot.ts` 헤더가 12일차에 "①만 확정하고 ②③ 예산 감사는
 *      38일차가 담당한다"고 명시적으로 남겨 둔 그 배선이다.
 * - **담지 않는 것(이후 일차·타 팀 소관)**:
 *   - **실제 시즌·마켓 상태 조회**(DB/엔진에서 `PolicyEffectContext`를 채우는 일) — 2팀
 *     엔진, 5팀 어드민 콘솔, 5팀 035 배당 소비 시점. 이 파일의 함수는 순수 함수이며
 *     컨텍스트를 인자로 받을 뿐 스스로 조회하지 않는다.
 *   - **실제 DB 영속화**(스냅샷 insert/update, `CommonCode.value` 갱신) — 6팀 DB·인프라 +
 *     2팀 Task 023/031 소비 시점. `resolveSnapshotRecording`이 `BUDGET_EXCEEDED`를 반환해도
 *     이 파일은 아무것도 쓰지 않는다 — 호출자가 그 판정을 보고 쓰기 여부를 결정한다.
 *   - **`loader.ts`에 발효 필터를 결합하는 일**(05문서 5.12.2절 "발효 필터") — 11일차
 *     `policy.ts` 헤더가 이미 "이후 일차 소관"으로 남겨 둔 별도 배선이며, 오늘 38일차
 *     산출물 범위(team-schedule)는 `apply.ts` 단일 파일이므로 `loader.ts`는 건드리지
 *     않는다. `loadConstants`가 반환하는 "지금 유효한 값"과 이 파일의 `resolveEffectiveCommonCode`
 *     (코드 레벨 current/pending 판정)는 서로 다른 층위다 — 전자는 그룹 전체 조회 경로,
 *     후자는 개별 `CommonCode` 레코드의 발효 여부 판정이다.
 *
 * ## 예산 초과 시 왜 throw가 아니라 판정 값(`BUDGET_EXCEEDED`)을 반환하는가
 * `loader.ts`의 `ConstantSourceUnavailableError`(값을 아예 못 구하는 경우)와 달리, 스냅샷
 * 예산 초과는 "새 스냅샷을 못 만들 뿐 기존 값 조회·경기 진행 자체는 계속 가능"한 상황이다.
 * AS-13/NFR-CFG-005가 이 파일 전역에 적용되는 원칙은 아니지만, 이 프로젝트 전반의 "시스템
 * 미정지" 기조(`fallback.ts` WARN 로그 패턴과 동일 철학)를 따라 예외를 던지지 않고 타입으로
 * 구분되는 판정 값을 반환한다 — 실제 초과 시 어떻게 대응할지(경고 로그만 남기고 계속 재사용을
 * 강제할지, 관리자에게 알릴지)는 DB 쓰기 계층(6팀)의 정책이므로 이 파일이 선점하지 않는다.
 *
 * ## 스냅샷 바이트 크기 계산 — `canonicalize()` 재사용, `TextEncoder`로 바이트 측정
 * `computeSnapshotHash`(12일차)와 동일하게 정렬 직렬화는 `../sim/rng/hash`의 `canonicalize()`를
 * 재사용한다(2팀 소유, 수정하지 않음 — "동일 값 집합 → 동일 바이트" 결정론을 새로 구현하지
 * 않기 위함). `hash.ts` 자체는 `src/lib/sim/**` 이식성 제약(Edge/브라우저에서도 동일 동작) 때문에
 * 전역 `TextEncoder`를 의도적으로 피하지만, 이 파일은 `src/lib/config/**` 소유 경로라 그 제약
 * (`src/lib/sim/**`에서 `Math.random()`/`Date.now()`/`react`/`@supabase/*` 금지, CLAUDE.md
 * NFR-DT-001)의 대상이 아니다 — 이미 표준화된 `TextEncoder`(Node 11+/모든 브라우저 전역)로
 * UTF-8 바이트 길이를 재는 것이 `hash.ts`의 자체 구현 UTF-8 인코더를 이 파일에 복제하는 것보다
 * 단순하다.
 *
 * ## import 규약
 * 도메인 타입(`CommonCode`, `SimConstantSnapshot`)은 배럴(`@/types`)에서만 import한다
 * (체크리스트 C-5·C-6). 정책·카탈로그·스냅샷 모듈은 같은 소유 디렉터리의 상대경로
 * (`./policy`, `./catalog`, `./snapshot`)에서, 해시 유틸은 `snapshot.ts` 관례를 따라
 * `../sim/rng/hash`에서 가져온다. `src/lib/sim/**`, `src/types/**`는 이 작업에서 수정하지
 * 않는다.
 */

import type { CommonCode, SimConstantSnapshot } from '@/types';
import { COMMON_CODE_GROUP_BY_CODE, type CommonCodeGroupCode } from './catalog';
import { isPolicyEffective, type PolicyEffectContext } from './policy';
import { resolveSnapshotDedup } from './snapshot';
import { canonicalize, type Canonicalizable } from '../sim/rng/hash';

/* ────────────────────────────────────────────────────────────────────────
 * 1. 발효 정책 적용 — NEXT_SEASON 그룹의 진행 중 시즌 영향 0
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 발효 정책 판정 대상 — 같은 공통코드(`groupCode`+`code`)의 "지금 서비스 중인 값"과
 * "관리자가 등록한 대기 중인 값"의 쌍. 두 레코드는 반드시 같은 `groupCode`/`code`를
 * 가리켜야 한다(다르면 `MismatchedCommonCodeChangeError`).
 */
export interface CommonCodeChangeCandidate {
  /** 지금 실제로 적용되고 있는 값. */
  readonly current: CommonCode;
  /** 관리자가 등록했지만 아직 발효 여부가 확정되지 않은 값. */
  readonly pending: CommonCode;
}

/**
 * `current`와 `pending`이 같은 공통코드를 가리키지 않을 때 던지는 에러. 서로 다른 코드를
 * 잘못 짝지어 넘기면 발효 정책 판정 자체가 무의미해지므로 fail-fast로 즉시 드러낸다
 * (`loader.ts`의 `ConstantSourceUnavailableError`와 동일한 방어적 스타일).
 */
export class MismatchedCommonCodeChangeError extends Error {
  constructor(
    readonly current: CommonCode,
    readonly pending: CommonCode,
  ) {
    super(
      '[config/apply] current/pending이 같은 공통코드를 가리키지 않는다: ' +
        `current=${current.groupCode}.${current.code}, pending=${pending.groupCode}.${pending.code}`,
    );
    this.name = 'MismatchedCommonCodeChangeError';
  }
}

/** `pending.groupCode`가 38종 카탈로그에 없을 때 던지는 에러(오타·미등록 그룹). */
export class UnknownCommonCodeGroupError extends Error {
  constructor(readonly groupCode: string) {
    super(`[config/apply] "${groupCode}"는 카탈로그(catalog.ts)에 등록되지 않은 그룹코드다.`);
    this.name = 'UnknownCommonCodeGroupError';
  }
}

/**
 * 발효 정책 3종(`NEXT_SEASON`/`IMMEDIATE`/`NEXT_MARKET`) 단일 진입점. 카탈로그에서
 * `pending.groupCode`의 `applyPolicy`를 조회하고, `pending.effectiveFromSeason`을
 * `ctx`에 실어 `isPolicyEffective`(11일차 `policy.ts`)에 위임한다.
 *
 * - `NEXT_SEASON`: `pending.effectiveFromSeason`이 `ctx.currentSeason`에 아직 도달하지
 *   않았으면(또는 `null`이면) **무조건 `current`를 반환한다** — 진행 중 시즌에는 절대
 *   `pending`이 새어 나가지 않는다는 것이 이 함수의 계약이다.
 * - `IMMEDIATE`: 컨텍스트와 무관하게 항상 `pending`을 반환한다.
 * - `NEXT_MARKET`: `ctx.isMarketAlreadyOpened`가 `true`면(이미 개설된 마켓이 있으면)
 *   `current`를, `false`면 `pending`을 반환한다.
 */
export function resolveEffectiveCommonCode(
  candidate: CommonCodeChangeCandidate,
  ctx: Omit<PolicyEffectContext, 'effectiveFromSeason'>,
): CommonCode {
  const { current, pending } = candidate;
  if (current.groupCode !== pending.groupCode || current.code !== pending.code) {
    throw new MismatchedCommonCodeChangeError(current, pending);
  }

  const catalogEntry = COMMON_CODE_GROUP_BY_CODE[pending.groupCode as CommonCodeGroupCode];
  if (catalogEntry === undefined) {
    throw new UnknownCommonCodeGroupError(pending.groupCode);
  }

  const effective = isPolicyEffective(catalogEntry.applyPolicy, {
    ...ctx,
    effectiveFromSeason: pending.effectiveFromSeason,
  });
  return effective ? pending : current;
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. 상수 스냅샷 예산 감사 — 시즌당 ≤ 20건, ≤ 1MB (NFR-CFG-006 ②③)
 * ──────────────────────────────────────────────────────────────────────── */

/** NFR-CFG-006 ②③ 예산 상한. */
export const SNAPSHOT_SEASON_BUDGET = {
  /** 시즌당 신규 스냅샷 레코드 상한(NFR-CFG-006 ②). REUSE는 이 카운트에 포함되지 않는다. */
  maxCount: 20,
  /** 시즌당 스냅샷 `constants` 총 직렬화 바이트 상한(NFR-CFG-006 ③). */
  maxBytes: 1024 * 1024,
} as const;

/**
 * `constants`를 `canonicalize()`로 정렬 직렬화한 뒤 UTF-8 바이트 길이를 잰다.
 * `computeSnapshotHash`(12일차 `snapshot.ts`)와 동일한 캐스팅 경계 원칙을 따른다 — `unknown`
 * 내부 값 타입 때문에 `Canonicalizable`과 구조적으로 정확히 일치하지 않지만,
 * `canonicalize()`가 이미 런타임에 지원 불가 타입을 `RangeError`로 던지므로 이 캐스팅은 안전하다.
 */
export function computeConstantsByteSize(constants: SimConstantSnapshot['constants']): number {
  const canonical = canonicalize(constants as unknown as Canonicalizable);
  return new TextEncoder().encode(canonical).length;
}

/**
 * 스냅샷 기록 판정 결과.
 * - `REUSE`: 동일 해시 기존 레코드가 있다(`resolveSnapshotDedup`과 동일 — 예산을 소비하지
 *   않는다).
 * - `CREATE`: 새 레코드를 만들어도 시즌 예산(②③) 안에 들어온다.
 * - `BUDGET_EXCEEDED`: 값 집합 자체는 신규(해시 중복 아님)이지만, 만들면 시즌 예산을
 *   초과한다. `reason`이 어느 상한을 넘었는지 구분한다.
 */
export type SnapshotRecordDecision =
  | { readonly kind: 'REUSE'; readonly snapshot: SimConstantSnapshot }
  | { readonly kind: 'CREATE'; readonly snapshotHash: string; readonly byteSize: number }
  | {
      readonly kind: 'BUDGET_EXCEEDED';
      readonly reason: 'COUNT' | 'BYTES';
      readonly snapshotHash: string;
    };

/**
 * 새 상수 값 집합을 기록해도 되는지 판정하는 순수 함수(부작용·DB 접근 없음).
 *
 * 1. 먼저 `resolveSnapshotDedup`(12일차, NFR-CFG-006 ①)로 해시 중복 여부를 확인한다.
 *    `REUSE`면 예산 감사 없이 그대로 반환한다 — 재사용은 새 레코드를 만들지 않으므로
 *    시즌 예산을 소비하지 않는다.
 * 2. `CREATE`면 `existingSnapshots`에서 `firstUsedSeason === season`인 레코드만 추려
 *    시즌 범위로 좁힌 뒤, 개수(②)와 `computeConstantsByteSize` 총합(③)을 상한과 비교한다.
 * 3. 둘 다 상한 안이면 `CREATE`(+ 새 레코드의 바이트 크기)를, 하나라도 넘으면
 *    `BUDGET_EXCEEDED`를 반환한다.
 *
 * `existingSnapshots`는 특정 시즌으로 미리 필터링할 필요가 없다 — 이 함수가 `season` 인자로
 * 직접 필터링한다(호출자 부담을 줄이고, 필터 누락으로 인한 오판정을 막기 위함).
 */
export function resolveSnapshotRecording(
  constants: SimConstantSnapshot['constants'],
  season: number,
  existingSnapshots: readonly SimConstantSnapshot[],
): SnapshotRecordDecision {
  const dedup = resolveSnapshotDedup(constants, existingSnapshots);
  if (dedup.kind === 'REUSE') {
    return dedup;
  }

  const seasonSnapshots = existingSnapshots.filter(
    (snapshot) => snapshot.firstUsedSeason === season,
  );

  if (seasonSnapshots.length >= SNAPSHOT_SEASON_BUDGET.maxCount) {
    return { kind: 'BUDGET_EXCEEDED', reason: 'COUNT', snapshotHash: dedup.snapshotHash };
  }

  const existingBytes = seasonSnapshots.reduce(
    (sum, snapshot) => sum + computeConstantsByteSize(snapshot.constants),
    0,
  );
  const newBytes = computeConstantsByteSize(constants);

  if (existingBytes + newBytes > SNAPSHOT_SEASON_BUDGET.maxBytes) {
    return { kind: 'BUDGET_EXCEEDED', reason: 'BYTES', snapshotHash: dedup.snapshotHash };
  }

  return { kind: 'CREATE', snapshotHash: dedup.snapshotHash, byteSize: newBytes };
}
