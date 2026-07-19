/**
 * 설정 도메인 타입 — **E-41 ~ E-44 완성 + T12 규약** (7일차 2026-07-29, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.12절(공통코드 테이블 설계, D-01 반영)
 * 원칙: `docs/devStep/02.타입스키마설계원칙.md` T12(enum→번역키), D-26(공통코드 불변 규칙)
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: E-41~E-44 **도메인 타입**(엔티티 shape)뿐이다.
 * - **담지 않는 것**: 공통코드 **로더 구현**·캐시·발효 정책 해석 함수(`loadConstants(group)`
 *   등)는 `src/lib/config/**`이며 **3팀 Task 003**(9~12일차) 소관이다(CLAUDE.md 소유 경로
 *   분리). 여기서 타입만 먼저 확정해 3팀이 9일차부터 이 타입을 참조해 구현할 수 있게 한다.
 *
 * 착수 전 확인한 원칙:
 * - **T12**: enum → 번역 키 매핑을 **"타입으로 강제하는 구조 제약"만** 정의한다.
 *   **T12-a**: 실제 번역 키 문자열·네이밍·키 공간은 **4팀 단독 소유(H-09, 22일차)** —
 *   1팀은 키 이름을 선점하지 않는다. 아래 `EnumTranslationCatalog<T>`는 "enum 값과 번역
 *   키가 1:1로 대응해야 한다"는 제약만 표현하며, 실제 카탈로그 객체는 만들지 않는다.
 * - **D-26**: 공통코드는 `value`만 조정하고 `default_value`는 **불변**(복원 기준)이다.
 *   이 파일의 모든 필드는 프로젝트 관례대로 `readonly`이므로 개별 필드에 추가 표기를
 *   두지 않되, `CommonCode.defaultValue`에는 D-26 규칙을 주석으로 명시한다.
 * - **미결 I-15 해소(7일차)**: 구장명(`Team.stadiumName`, `world.ts`) 번역 대상 여부 —
 *   **비대상으로 확정**. 근거: `Team.stadiumName`은 D-17에 따라 절차적으로 생성되는
 *   고유명사이며, D-18이 이미 선수·클럽 이름을 번역 비대상으로 확정한 것과 같은 범주다
 *   (구장은 고정 자산이 아니라 팀에 종속된 이름일 뿐, 국가명처럼 유한 집합의 표시명이
 *   아니다). 아래 "번역 대상 경계" 절 참조. `docs/ISSUES.md` I-15에 반영.
 */

import type { CommonCodeApplyPolicy, CommonCodeHistoryAction, CommonCodeValueType } from './enums';
import type {
  CommonCodeHistoryId,
  CommonCodeId,
  SnapshotId,
  Timestamp,
  UserId,
  WorldId,
} from './brand';

/**
 * **E-41 CommonCodeGroup** — 공통코드 그룹. PK는 자연키 `groupCode`(UPPER_SNAKE, 예:
 * `ROUND_INTERVAL_MIN`)이므로 별도 uuid 브랜드를 두지 않는다(05:537).
 */
export interface CommonCodeGroup {
  readonly groupCode: string;
  readonly groupName: string;
  /** 용도·영향 범위 설명 */
  readonly description: string;
  readonly valueType: CommonCodeValueType;
  /** 발효 정책 (FR-AD-013) */
  readonly applyPolicy: CommonCodeApplyPolicy;
  /** 관련 FR ID 목록(문서 추적성) */
  readonly relatedFr: readonly string[];
  /** 숫자형 허용 범위(NFR-CFG-004). 숫자형이 아니면 둘 다 null */
  readonly minValue: number | null;
  readonly maxValue: number | null;
  /** JSON형 값 검증용 스키마. JSON형이 아니면 null */
  readonly jsonSchema: Readonly<Record<string, unknown>> | null;
  readonly isActive: boolean;
  /** 콘솔 표시 순서 */
  readonly sortOrder: number;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
}

/**
 * **E-42 CommonCode** — 공통코드 값. UNIQUE `(groupCode, code, worldId)`(05:570) —
 * 유니크 제약은 DB/어댑터 책임이며 타입 레벨에서는 강제하지 않는다.
 */
export interface CommonCode {
  readonly id: CommonCodeId;
  /** FK → `CommonCodeGroup.groupCode` */
  readonly groupCode: string;
  /** 그룹 내 키 (예: `LEAGUE_1`, `SEVERITY_3`) */
  readonly code: string;
  /** null = 전역 기본값, 값이 있으면 해당 월드 오버라이드(D-15 단일 월드 전제에서도 필드 자체는 유지) */
  readonly worldId: WorldId | null;
  /** 원시 문자열 값 — 실 관리자가 조정하는 축(D-26) */
  readonly value: string;
  /** 숫자형일 때 인덱싱·검증용 파생 컬럼. 숫자형이 아니면 null */
  readonly valueNum: number | null;
  /** JSON형일 때. JSON형이 아니면 null */
  readonly valueJson: Readonly<Record<string, unknown>> | null;
  /**
   * 초기 시드값(되돌리기 기준). **D-26: 조정은 `value`만 하고 `defaultValue`는 절대
   * 갱신하지 않는다** — 이 필드를 바꾸는 쓰기 경로는 초기 시드 적재뿐이며, 어댑터 구현체
   * (3팀 Task 003/031)는 UPDATE 시 이 필드를 페이로드에서 제외해야 한다(타입이 막지
   * 못하는 런타임 규약이므로 코드 리뷰 체크리스트 C-14가 대신 검증한다).
   */
  readonly defaultValue: string;
  readonly description: string;
  /** 단위 표시("분", "%", "pt" 등). 없으면 null */
  readonly unit: string | null;
  readonly sortOrder: number;
  readonly isActive: boolean;
  /** 발효 시즌(`NEXT_SEASON` 정책용). 해당 없으면 null */
  readonly effectiveFromSeason: number | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly updatedBy: UserId | null;
}

/**
 * **E-43 CommonCodeHistory** — 변경 이력. **append-only**(UPDATE/DELETE 권한 없음,
 * NFR-SEC-010) — 이 인터페이스는 삽입 전용 레코드 shape만 표현하며, 수정 메서드 시그니처
 * 자체를 두지 않는 것(Task 004 `DataSource` 계약)으로 append-only를 강제한다.
 */
export interface CommonCodeHistory {
  readonly id: CommonCodeHistoryId;
  readonly commonCodeId: CommonCodeId;
  /** 코드 삭제 후에도 추적 가능하도록 비정규화 */
  readonly groupCode: string;
  readonly code: string;
  readonly action: CommonCodeHistoryAction;
  readonly oldValue: string | null;
  readonly newValue: string | null;
  readonly oldEffectiveFromSeason: number | null;
  readonly newEffectiveFromSeason: number | null;
  readonly changedBy: UserId;
  readonly changedAt: Timestamp;
  /** 사유 **필수**(NFR-CFG-002) — 빈 문자열 금지는 런타임 검증 책임 */
  readonly reason: string;
}

/**
 * **E-44 SimConstantSnapshot** — 상수 스냅샷(결정론 보장, FR-AD-014).
 *
 * **사용 규칙**: ① 경기 시뮬 직전 유효 상수 집합을 직렬화 후 해시(SHA-256) 계산
 * ② 동일 해시 레코드가 있으면 재사용, 없으면 신규 생성 ③ `Fixture.snapshotId`(NOT NULL,
 * `match.ts`)에 기록 ④ 재현(FR-AD-004) 시 반드시 이 `constants`를 로드해 사용.
 * 해시 계산 자체(정렬 직렬화 + SHA-256)는 2팀 `src/lib/sim/rng/hash.ts`의
 * `canonicalize()`를 재사용한다(T2-b와 동일한 이유로 여기서 재구현하지 않는다) —
 * 실제 스냅샷 생성 로직은 2팀 Task 023/031 소비 시점에 연결된다.
 */
export interface SimConstantSnapshot {
  readonly id: SnapshotId;
  readonly worldId: WorldId;
  /** 값 집합의 SHA-256(중복 제거 키). UNIQUE */
  readonly snapshotHash: string;
  /** `{ "GROUP_CODE": { "CODE": value, ... }, ... }` 전체 값 집합 */
  readonly constants: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /** 최초 생성 시각 */
  readonly createdAt: Timestamp;
  readonly firstUsedSeason: number;
  /** 참조 Fixture/Season 수(관측용, NFR-CFG-006 — 시즌당 스냅샷 ≤ 20건 목표) */
  readonly refCount: number;
}

/* ────────────────────────────────────────────────────────────────────────
 * T12 — enum → 번역 키 매핑 규약
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * enum 값 ↔ 번역 키 **구조 제약** (T12).
 *
 * 실제 번역 키 문자열·네이밍은 **4팀 H-09(22일차) 단독 소유**다(T12-a) — 1팀은 여기서
 * 키 이름을 선점하지 않는다. 이 제네릭이 표현하는 것은 오직 "어떤 enum 유니온 `T`의
 * **모든** 멤버가 정확히 하나의 번역 키에 대응해야 한다"는 매핑의 **완전성**뿐이다.
 * 4팀이 실제 카탈로그 객체(예: `positionLabels`)를 만들 때 이 타입으로 감싸면, `enums.ts`
 * 쪽에서 유니온 멤버가 추가/삭제될 때 카탈로그 쪽 누락·잉여가 `tsc` 오류로 즉시 드러난다.
 *
 * 표시명(번역된 문자열) 자체는 **도메인 타입이 아니라 메시지 카탈로그가 소유**한다 —
 * `src/types/**`의 어떤 인터페이스도 `label`/`displayName` 필드를 갖지 않는다.
 *
 * @example
 * // 4팀 Task 011(14~22일차)에서, 실제 카탈로그 파일 안에 다음과 같이 적용한다
 * // (키 문자열은 예시일 뿐이며 4팀이 확정한다):
 * // const positionLabels: EnumTranslationCatalog<Position> = {
 * //   GK: 'position.gk', CB: 'position.cb', ... // 11군 전부 없으면 tsc 오류
 * // };
 */
export type EnumTranslationCatalog<TMember extends string> = {
  readonly [Member in TMember]: string;
};

/*
 * ## 번역 대상 경계 (D-18, I-14/I-15 해소 반영)
 *
 * - **번역함**: UI 레이블, `EnumTranslationCatalog`로 감싼 enum 표시명(포지션·이벤트·
 *   부상 등급·전술 성향·페이즈·수상 종류 등), 안내·에러 문구.
 * - **번역하지 않음(고유명사, D-17 절차적 생성)**: 선수·감독·클럽·스폰서 이름,
 *   **구장명**(`Team.stadiumName`, I-15 — 7일차 확정), 시드 값.
 *
 * 국가명(`NationalityCode`의 표시명)은 유한 집합이라 번역 **대상**이지만, 구장명은
 * D-17처럼 시드로 절차 생성되는 개방형 고유명사라 국가명과 다른 축이다 — 이 둘을
 * 혼동하지 않는다(I-15가 제기한 정확한 지점).
 */
