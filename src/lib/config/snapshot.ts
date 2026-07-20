/**
 * 상수 스냅샷 직렬화·해시(SHA-256) 규칙 확정 — **12일차(2026-08-05), Task 003 완결분**
 *
 * 근거: `ROADMAP.md` Task 003 "상수 스냅샷 직렬화·해시(SHA-256) 규칙 확정 (FR-AD-014,
 * NFR-CFG-006)" / `docs/team-schedule/03-데이터밸런싱배당팀.md` 12일차 행 / `docs/require/
 * 03-functional-requirements.md` FR-AD-014("경기·시즌 처리 시 그 시점에 적용된 공통코드
 * 값 집합을 스냅샷으로 기록한다") / `docs/require/04-non-functional-requirements.md`
 * NFR-CFG-006("① 동일 값 집합은 해시 기준으로 1건만 저장 ② 시즌당 ≤ 20건 ③ 시즌당 ≤ 1MB").
 * 소유: 3팀 데이터·밸런싱·배당팀(CLAUDE.md `src/lib/config/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: `src/types` E-44 `SimConstantSnapshot`의 `constants` 필드를 현재 로더
 *   상태에서 조립하는 함수(`buildConstantsSnapshotInput`), 그 값을 해싱하는 함수
 *   (`computeSnapshotHash`), 기존 스냅샷 목록 대비 재사용/신규 여부를 판정하는 순수 dedup
 *   규칙(`resolveSnapshotDedup`, NFR-CFG-006 ①), 재사용 시 참조 카운트를 불변으로 증가시키는
 *   헬퍼(`withIncrementedRefCount`).
 * - **담지 않는 것(이후 일차·타 팀 소관)**:
 *   - **실제 DB 영속화**(`sim_constant_snapshot` 테이블 insert/update) — 6팀 DB·인프라.
 *   - **실제 스냅샷 생성 호출**(경기 시뮬 직전에 이 파일의 함수들을 실제로 엮어 부르는 배선) —
 *     `src/types/config.ts`의 E-44 JSDoc이 이미 "2팀 Task 023/031 소비 시점에 연결된다"고
 *     명시한다. 이 파일은 그 배선이 사용할 **규칙**만 오늘 확정한다.
 *   - **NFR-CFG-006 ②③(시즌당 ≤ 20건, ≤ 1MB) 예산 감사** — `docs/team-schedule/
 *     03-데이터밸런싱배당팀.md`가 12일차("규칙 확정")와 38일차(`apply.ts`, "발효 정책
 *     적용 — ... 상수 스냅샷 기록·해시 중복 제거(시즌당 ≤ 20건, ≤ 1MB)")를 **별도 산출물로
 *     이미 분리**해 두었다. 해시 dedup 규칙(①)이 정확해야 ②③ 예산이 의미를 가지므로, 오늘은
 *     ①만 확정하고 실제 운영 중 카운팅·용량 감사는 38일차가 담당한다 — 여기서 선제 구현하면
 *     책임이 겹치는 과설계가 된다.
 *   - 실제 그룹별 시드 데이터(36일차 `supabase/seed/common-code.sql`).
 *
 * ## 왜 이 파일에는 `catalog.ts`류 컴파일타임 assert(`_assertCatalogSize` 등)가 없는가
 * `catalog.ts`/`fallback.ts`의 assert는 "고정된 36개 그룹 전량이 반드시 존재해야 한다"는
 * **정적 불변식**을 검증한다. 이 파일의 `buildConstantsSnapshotInput`은 임의의 그룹
 * 서브셋(`groups` 매개변수)을 받도록 설계돼 있어(아래 "그룹 서브셋을 허용하는 이유" 참조)
 * "정확히 36개"라는 불변식 자체가 성립하지 않는다 — 억지로 assert를 추가하면 오히려 잘못된
 * 제약을 코드에 새기게 되므로 의도적으로 두지 않는다.
 *
 * ## 그룹 서브셋을 허용하는 이유
 * 실사용(2팀 소비 시점)에서는 `groups` 인자를 생략해 36개 그룹 전체가 기본 동작이다.
 * 다만 테스트에서 "값 집합이 다르면 해시가 다르다"를 검증하려고 매번 36개 그룹 전량에 대해
 * `ConstantSource`를 등록하는 것은 이 규칙 자체와 무관한 부담이므로, 그룹 목록을 주입 가능한
 * 매개변수로 열어 두었다.
 *
 * ## 해시 계산 재사용 — `src/lib/sim/rng/hash.ts` (2팀 소유, 수정하지 않음)
 * `SimConstantSnapshot`(E-44) JSDoc이 "해시 계산 자체(정렬 직렬화 + SHA-256)는 2팀
 * `src/lib/sim/rng/hash.ts`의 `canonicalize()`를 재사용한다"고 명시한다. 이 모듈은 이미
 * 외부 의존 0·완전 동기·결정론적 키 정렬 직렬화(UTF-16 코드유닛 순)를 보장하므로 재구현하지
 * 않는다(CLAUDE.md는 `src/lib/sim/**` **수정**을 금지할 뿐 **import**는 금지하지 않으며,
 * 이 재사용은 E-44 타입 JSDoc이 직접 지시한 것이다).
 *
 * `computeSnapshotHash`는 `SimConstantSnapshot['constants']`
 * (`Readonly<Record<string, Readonly<Record<string, unknown>>>>`)를 `hash.ts`의
 * `Canonicalizable`로 넘긴다. 내부 값 타입이 `unknown`이라 두 타입이 구조적으로 정확히
 * 일치하지 않아 캐스팅이 필요하지만, `canonicalize()`가 이미 런타임에 지원 불가 타입
 * (`NaN`/`Infinity`/`bigint`/`function`/`symbol`)을 `RangeError`로 던지므로(hash.ts
 * `canonicalizeValue`), 이 정적 캐스팅은 "런타임 검증은 기존 라이브러리가 이미 수행한다"는
 * 전제 아래 안전하다. 이 파일에서 그 검증을 다시 구현하지 않는다.
 *
 * ## import 규약
 * 도메인 타입(`SimConstantSnapshot`)은 배럴(`@/types`)에서만 import한다(체크리스트 C-5·
 * C-6). 카탈로그·로더는 같은 소유 디렉터리의 `./catalog`, `./loader`에서 가져온다. 해시
 * 유틸은 `src/lib/sim/rng/hash`에서 상대경로로 가져온다(기존 3팀 파일들이 전부 상대경로
 * import를 쓰는 관례를 그대로 따른다). `src/lib/sim/**`, `src/types/**`는 이 작업에서
 * 수정하지 않는다.
 */

import type { SimConstantSnapshot } from '@/types';
import { COMMON_CODE_GROUP_CATALOG, type CommonCodeGroupCode } from './catalog';
import { loadConstants } from './loader';
import { hashState, type Canonicalizable } from '../sim/rng/hash';

/** 카탈로그가 파생하는 36개 그룹 코드 전체 — `buildConstantsSnapshotInput`의 기본 범위. */
const ALL_GROUP_CODES: readonly CommonCodeGroupCode[] = COMMON_CODE_GROUP_CATALOG.map(
  (group) => group.groupCode,
);

/**
 * 지정한 그룹들의 현재 상수 값을 `loadConstants(group)`로 모아 `SimConstantSnapshot['constants']`
 * shape(그룹코드 → 코드별 값 맵) 객체를 조립한다. `groups`를 생략하면 36개 그룹 전체를 쓴다
 * (실사용 기본 동작). 각 그룹 조회는 `loader.ts`의 그룹 단위 캐시를 거치므로 반복 호출
 * 비용은 무시할 수 있다.
 *
 * 소스가 등록돼 있지 않은 그룹을 조회하면 `loadConstants`가 `ConstantSourceUnavailableError`를
 * 던진다(이 함수가 새로 만드는 동작이 아니라 `loader.ts`의 기존 계약을 그대로 물려받는다).
 */
export function buildConstantsSnapshotInput(
  groups: readonly CommonCodeGroupCode[] = ALL_GROUP_CODES,
): SimConstantSnapshot['constants'] {
  const result: Record<string, Readonly<Record<string, unknown>>> = {};
  for (const group of groups) {
    result[group] = loadConstants(group);
  }
  return result;
}

/**
 * 상수 값 집합을 정렬 직렬화 후 SHA-256으로 해싱한다(FR-AD-014). `hash.ts`의 `hashState()`에
 * 위임하는 얇은 wrapper다 — 이 경계 한 곳에서만 `unknown → Canonicalizable` 캐스팅을 하는
 * 이유는 파일 헤더 "해시 계산 재사용" 절 참조.
 */
export function computeSnapshotHash(constants: SimConstantSnapshot['constants']): string {
  return hashState(constants as unknown as Canonicalizable);
}

/**
 * 해시 중복 제거 판정 결과(NFR-CFG-006 ①). 기존 스냅샷 중 동일 해시가 있으면 그 레코드를
 * 재사용(`REUSE`)하고, 없으면 새로 계산된 해시로 신규 생성이 필요함(`CREATE`)을 알린다.
 * `CREATE`는 `snapshotHash`만 반환한다 — `id`/`worldId`/`createdAt`/`firstUsedSeason` 등
 * 나머지 필드는 실제 생성 시점(2팀 Task 023/031 소비 시점)의 컨텍스트가 있어야 채울 수
 * 있으므로 이 파일의 책임 밖이다.
 */
export type SnapshotDedupResult =
  | { readonly kind: 'REUSE'; readonly snapshot: SimConstantSnapshot }
  | { readonly kind: 'CREATE'; readonly snapshotHash: string };

/**
 * 새 상수 값 집합을 기존 스냅샷 목록과 비교해 재사용 여부를 판정하는 순수 함수(부작용·DB
 * 접근 없음). "동일 값 집합은 해시 기준으로 1건만 저장한다"(NFR-CFG-006 ①)는 규칙 자체를
 * 여기서 확정하며, 실제 저장·갱신은 호출자(DB 계층)의 책임이다.
 */
export function resolveSnapshotDedup(
  constants: SimConstantSnapshot['constants'],
  existingSnapshots: readonly SimConstantSnapshot[],
): SnapshotDedupResult {
  const snapshotHash = computeSnapshotHash(constants);
  const existing = existingSnapshots.find((snapshot) => snapshot.snapshotHash === snapshotHash);

  if (existing !== undefined) {
    return { kind: 'REUSE', snapshot: existing };
  }
  return { kind: 'CREATE', snapshotHash };
}

/**
 * 기존 스냅샷을 재사용(`REUSE`)하기로 판정했을 때, `refCount`를 1 증가시킨 새 레코드를
 * 반환하는 불변 헬퍼다. 원본 `snapshot`은 변경하지 않는다 — 실제 영속화(DB update)는
 * 호출자(6팀 DB 계층/2팀 소비 시점)의 책임이다.
 */
export function withIncrementedRefCount(snapshot: SimConstantSnapshot): SimConstantSnapshot {
  return { ...snapshot, refCount: snapshot.refCount + 1 };
}
