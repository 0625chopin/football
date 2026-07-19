/**
 * 운영 도메인 타입 — **E-24 ~ E-27(사건) 완성** (5일차 2026-07-27, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.7절(사건)
 * 잔여 **E-45 CronRun / E-46 CronGap / E-47 AuditLog**(운영)는 여전히 6~7일차 대상이다.
 *
 * 착수 전 확인한 원칙:
 * - 부상 **등급(severity 1~4)**은 6일차 "부상 4등급" 확정 대상이었으며, `enums.ts`의
 *   `InjurySeverity`(`KNOCK`/`MINOR`/`MODERATE`/`SEVERE`) 확정에 맞춰 오늘 교체 완료했다.
 *   `status`(ACTIVE/RECOVERED)는 이미 요구사항에 값이 고정돼 있어 5일차에 `enums.ts`에
 *   확정했다(6일차 목록 밖, 4일차 전례와 동일).
 * - **T6 (D-16)**: 타입에 `Date`·난수 기반 암묵 기본값을 두지 않는다. 시각은 명시 필드로.
 */

import type { InjuryStatus, InjurySeverity, NewsFeedItemType, SanctionType } from './enums';
import type {
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
