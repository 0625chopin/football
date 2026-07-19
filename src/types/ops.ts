/**
 * 운영 도메인 타입 — **E-24 ~ E-27(사건) 완성** (5일차 2026-07-27) +
 * **E-45 ~ E-47(운영/감사) 완성** (8일차 2026-07-30, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.7절(사건), 5.13절(운영/감사)
 *
 * **8일차 추가 경위**: E-45~47은 6~7일차 어느 작업표 항목에도 명시적으로 배정되지
 * 않아 남아 있던 1차 범위 잔여분이다(05문서 25행이 `CommonCodeGroup`~`AuditLog` 7종을
 * "설정/운영"으로 함께 묶어 셈). E-33~E-40(배팅/사용자)처럼 2차 대비 "선정의만"
 * 대상으로 명시된 적이 없으므로, ROADMAP Task 002 수락기준("E-01~E-47 중 1차 범위
 * 전 엔티티가 타입으로 존재")을 충족하려면 8일차 동결 전 완성이 맞다고 판단해 오늘
 * 반영한다(1팀 판정, 매핑표 작성 중 발견 → `docs/ISSUES.md` 등재).
 *
 * 착수 전 확인한 원칙:
 * - 부상 **등급(severity 1~4)**은 6일차 "부상 4등급" 확정 대상이었으며, `enums.ts`의
 *   `InjurySeverity`(`KNOCK`/`MINOR`/`MODERATE`/`SEVERE`) 확정에 맞춰 오늘 교체 완료했다.
 *   `status`(ACTIVE/RECOVERED)는 이미 요구사항에 값이 고정돼 있어 5일차에 `enums.ts`에
 *   확정했다(6일차 목록 밖, 4일차 전례와 동일).
 * - **T6 (D-16)**: 타입에 `Date`·난수 기반 암묵 기본값을 두지 않는다. 시각은 명시 필드로.
 * - **NFR-SEC-010**: `AuditLog`/`CommonCodeHistory`는 append-only — 여기서도 수정용
 *   메서드 시그니처를 두지 않는(Task 004 `DataSource` 계약 소관) 원칙을 유지한다.
 * - 다형 참조(`refType`/`refId`, `actorId`, `targetType`/`targetId`)는 기존
 *   `NewsFeedItem`/`Sanction`/`PointTransaction` 패턴과 동일하게 원시 `string`으로
 *   둔다 — 구체 리터럴 유니온은 소비 시점 확정(단일 패턴 유지, C-6과 무관한 설계 일관성).
 */

import type {
  AuditActorType,
  CronRunStatus,
  InjuryStatus,
  InjurySeverity,
  NewsFeedItemType,
  SanctionType,
} from './enums';
import type {
  AuditLogId,
  CronGapId,
  CronRunId,
  FixtureId,
  InjuryId,
  NewsFeedItemId,
  PlayerId,
  Points,
  SanctionId,
  SeasonId,
  TeamId,
  Timestamp,
  YouthProspectId,
} from './brand';

/**
 * **E-24 Injury** — 부상 기록. `PlayerState.activeInjuryId`(E-11)가 진행 중인 부상을 참조한다.
 */
export interface Injury {
  readonly id: InjuryId;
  readonly playerId: PlayerId;
  /** 경기 중 발생이 아니면(훈련 등) null */
  readonly matchId: FixtureId | null;
  readonly seasonId: SeasonId;
  /** 부상 강도 등급 — 6일차 `InjurySeverity` 확정에 따라 라벨 유니온으로 교체 */
  readonly severity: InjurySeverity;
  /** 표시용 원시 라벨("햄스트링 염좌" 등, 번역 비대상, T13) */
  readonly typeLabel: string;
  readonly occurredRound: number;
  readonly roundsOut: number;
  /** 복귀 예정/실제 라운드 */
  readonly returnRound: number;
  readonly status: InjuryStatus;
}

/**
 * **E-25 YouthProspect** — 유소년 배출 기록. FR-YT-007(구제 보정) 적용 여부의 단일 근거.
 */
export interface YouthProspect {
  readonly id: YouthProspectId;
  readonly seasonId: SeasonId;
  readonly teamId: TeamId;
  readonly playerId: PlayerId;
  /** 배출 시점 아카데미 등급(1~5) 사본 */
  readonly academyLevelAtGeneration: number;
  /** FR-LG-007 구제 보정 적용 여부 */
  readonly bonusApplied: boolean;
}

/**
 * **E-26 NewsFeedItem** — 뉴스피드. `refType`/`refId`로 원본 엔티티를 가리킨다
 * (다형 참조 — 구체 FK 제약은 물리 스키마(6팀) 소관).
 */
export interface NewsFeedItem {
  readonly id: NewsFeedItemId;
  readonly seasonId: SeasonId;
  readonly type: NewsFeedItemType;
  /** 고유명사·구체 수치가 섞인 표시 텍스트 — 번역 대상 아님(T14와 동일 취지) */
  readonly headline: string;
  readonly body: string;
  /** 참조 엔티티 종류(예: "Transfer", "Award") — 구체 리터럴 유니온은 소비 시점 확정 */
  readonly refType: string;
  readonly refId: string;
  readonly occurredAt: Timestamp;
}

/**
 * **E-27 Sanction** — 팀 제재(현재는 리빌드 제재 1종). `effects`에 적용된 페널티·구제
 * 항목을 담되 구체 스키마는 소비 시점(3팀 Task 030 등) 확정.
 */
export interface Sanction {
  readonly id: SanctionId;
  readonly seasonId: SeasonId;
  readonly teamId: TeamId;
  readonly sanctionType: SanctionType;
  readonly effects: Readonly<Record<string, unknown>>;
  /** 리빌드 보조금 */
  readonly grantAmount: Points;
}

/**
 * **E-45 CronRun** — 크론 실행 기록(NFR-CR-007, FR-AD-017~019). no-op 포함 전 실행이
 * 기록 대상이다. **8일차 신규**.
 */
export interface CronRun {
  readonly id: CronRunId;
  readonly startedAt: Timestamp;
  /** 실행 중이면 null (완료 전) */
  readonly finishedAt: Timestamp | null;
  readonly durationMs: number;
  /** false면 락 획득 실패로 no-op 처리됨 */
  readonly lockAcquired: boolean;
  readonly fixturesProcessed: number;
  /** 중단 구간 이후 밀린 라운드 처리(catch-up) 경로였는지 여부(FR-AD-019) */
  readonly isCatchUp: boolean;
  readonly status: CronRunStatus;
  readonly retryCount: number;
  /**
   * 실패 시에만 값. 성공/부분성공이면 null. **번역 비대상**(`Injury.typeLabel`/
   * `NewsFeedItem.headline`과 동일 취지, T13) — 운영자 진단용 원시 코드이며 UI 번역
   * 카탈로그를 거치지 않는다(4팀 8일차 SP-1 지적, `docs/ISSUES.md` I-56).
   */
  readonly errorCode: string | null;
  /** 성공/부분성공이면 null. **번역 비대상**(위 `errorCode`와 동일 이유, 예외 스택·엔진 진단 메시지 원문) */
  readonly errorMessage: string | null;
  /**
   * 이번 실행이 사용한 상수 스냅샷의 해시(`SimConstantSnapshot.snapshotHash`, `config.ts`)
   * — `SnapshotId`(uuid PK)가 아니라 해시 문자열 자체를 담는다(05:683 `snapshot_hash text`).
   * 처리 대상이 없어 스냅샷을 로드하지 않은 실행(NOOP)이면 null.
   */
  readonly snapshotHash: string | null;
}

/**
 * **E-46 CronGap** — 크론 중단 구간 기록(NFR-CR-005). 마지막 성공 실행 후 크론 주기의
 * 3배를 초과하면 생성된다. **8일차 신규**.
 */
export interface CronGap {
  readonly id: CronGapId;
  readonly gapStartedAt: Timestamp;
  /** 회복 전이면(진행 중 중단) null */
  readonly gapEndedAt: Timestamp | null;
  readonly gapMinutes: number;
  /** 라운드가 아니라 Fixture 단위 카운트(05문서 원문, 어드민 콘솔 표시 시 라벨 주의) */
  readonly missedFixtureCount: number;
  /** catch-up 완료 시각. 미회복이면 null */
  readonly recoveredAt: Timestamp | null;
  readonly detectedAt: Timestamp;
}

/**
 * **E-47 AuditLog** — 관리자·자동화 파이프라인 조작 감사 로그(NFR-SEC-010, FR-AD-007).
 * **append-only** — 수정용 메서드 시그니처를 두지 않는 것으로 강제한다(Task 004 계약,
 * `CommonCodeHistory`와 동일 원칙, `config.ts` E-43 주석 참조). **8일차 신규**.
 */
export interface AuditLog {
  readonly id: AuditLogId;
  readonly actorType: AuditActorType;
  /** `actorType='HUMAN'`일 때만 값(관리자 사용자 참조). 그 외 자동화 행위자는 null */
  readonly actorId: string | null;
  /** 수행 동작(예: "WORLD_RESET", "COMMON_CODE_UPDATE") — 구체 리터럴 유니온은 소비 시점 확정 */
  readonly action: string;
  /** 대상 엔티티 종류(예: "World", "CommonCode") — 다형 참조, 기존 `refType` 패턴과 동일 */
  readonly targetType: string;
  readonly targetId: string;
  /** 조작 상세(jsonb) — 구체 스키마는 소비 시점 확정 */
  readonly payload: Readonly<Record<string, unknown>>;
  readonly createdAt: Timestamp;
}
