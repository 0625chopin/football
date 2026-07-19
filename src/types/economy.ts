/**
 * 경제 도메인 타입 — **E-12 ~ E-14, E-28 ~ E-30 완성** (4~5일차, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.4절(계약/이동), 5.8절(경제 — 스폰서·원장)
 *
 * **배치 확정(팀장 승인, 4일차)**: E-12 Contract / E-13 Transfer / E-14 Loan(계약·이동
 * 도메인)은 여기 `economy.ts`에 둔다. 근거는 **소비자 기준** — 셋 다 급여·이적료·분배율
 * 등 금액 축을 공유하고 주 소비처가 3팀 `src/lib/economy/**`·`src/lib/preseason/**`이라
 * "인물"보다 "경제" 도메인에 가깝다. person.ts는 34속성으로 이미 부피가 커졌으므로 관계
 * 엔티티까지 얹지 않고 인물 6종(E-06~E-11)으로 순수하게 완결시킨다. 별도 파일 신설은
 * 기각됐다 — 동결(8일차)까지 4일 남은 시점에 11파일 구조·배럴·6팀 H-08 대응표를 흔들
 * 이유가 없다. **이 배치는 5일차 이후 재론하지 않는다.**
 *
 * **5일차 추가**: E-28 Sponsor / E-29 SponsorContract / E-30 PointTransaction. 명예
 * (E-31 Award / E-32 Trophy)는 금액 축이 없어 `stat.ts`에 배치했다(그 파일 헤더 주석 참조).
 *
 * 착수 전 확인할 원칙:
 * - **DC-08**: 포인트는 **정수 고정**(`Points`, `brand.ts`). 소수점 연산을 도입하지 않는다.
 * - `Team.balance`는 원장(`PointTransaction`)의 **파생 캐시**이며 원장이 단일 근거다.
 * - **T13**: 금액은 숫자로 두고 로케일 서식은 UI 계층 책임이다.
 * - **D-21**: 임대는 1단계·1시즌 고정, 상한은 공통코드(3팀 030 소관) — 타입은 상한을 강제하지 않는다.
 * - **NFR-QA-005(회계 항등식)**: 임의 시점 `owner.balance = Σ amount`. 이적료·스폰서 분배는
 *   zero-sum이며, `PointTransaction.balanceAfter`가 그 시점 스냅샷이다.
 */

import type {
  ContractStatus,
  LoanStatus,
  PointTransactionOwnerType,
  PointTransactionReasonCode,
  SponsorContractStatus,
  TransferType,
} from './enums';
import type {
  ContractId,
  LoanId,
  PlayerId,
  PointTransactionId,
  Points,
  SeasonId,
  SponsorContractId,
  SponsorId,
  TeamId,
  Timestamp,
  TransferId,
} from './brand';

/** **E-12 Contract** — 선수 계약. 기간 1~5시즌(공통코드 `CONTRACT_PARAM`) */
export interface Contract {
  readonly id: ContractId;
  readonly playerId: PlayerId;
  readonly teamId: TeamId;
  readonly startSeason: number;
  readonly endSeason: number;
  readonly wagePerSeason: Points;
  readonly transferFeePaid: Points;
  readonly status: ContractStatus;
}

/**
 * **E-13 Transfer** — 이적 기록. `fromTeamId`가 null이면 FA 영입(D-16/D-17의 절차적
 * 생성 결과일 뿐 실명 데이터 도입은 아님).
 */
export interface Transfer {
  readonly id: TransferId;
  readonly seasonId: SeasonId;
  readonly playerId: PlayerId;
  /** FA면 null */
  readonly fromTeamId: TeamId | null;
  readonly toTeamId: TeamId;
  readonly fee: Points;
  readonly type: TransferType;
  /** TRADE일 때 상대 선수. 아니면 null */
  readonly tradeCounterpartPlayerId: PlayerId | null;
  /** 시도 횟수·성공 확률·몸값 조정 이력(jsonb) — 구체 스키마는 3팀 Task 030 소비 시점 확정 */
  readonly negotiationLog: Readonly<Record<string, unknown>>;
}

/** **E-14 Loan** — 임대. D-21(재임대 금지·1시즌 고정·상한)의 단일 레코드 근거 */
export interface Loan {
  readonly id: LoanId;
  readonly seasonId: SeasonId;
  readonly playerId: PlayerId;
  readonly ownerTeamId: TeamId;
  readonly loanTeamId: TeamId;
  /**
   * 임대료 분배 비율(%). 기본 50. **8일차 판정(I-52)**: 퍼센트형 필드는 DC-08 4범주
   * (포인트/배당/확률/컨디션) 어디에도 명시적으로 속하지 않지만, 타입 레벨에서는 다른
   * 0~100 스케일 필드(`reputation`, `academyLevel` 등)와 동일하게 **일반 `number`**로
   * 둔다 — 별도 브랜드를 두지 않는 이유는 T5(능력치) 판정과 같다(person.ts 참조). 소수
   * 자리 정밀도(`numeric(5,2)`)는 물리 스키마(6팀 Task 009) 책임이다.
   */
  readonly wageSharePct: number;
  readonly status: LoanStatus;
}

/**
 * **E-28 Sponsor** — 스폰서. **`worldId` 필드를 두지 않는다**(D-15, 단일 월드 전제 —
 * 물리 스키마의 `world_id` FK는 6팀 소관이며 조회 계층이 1회 해석해 스코핑한다).
 */
export interface Sponsor {
  readonly id: SponsorId;
  readonly name: string;
  readonly industry: string;
  /** 1~5 */
  readonly scale: number;
  /** 음수면 부도 상태 */
  readonly balance: Points;
  readonly reputation: number;
  /** 부도 발생 시즌. 정상이면 null */
  readonly bankruptAtSeason: number | null;
}

/**
 * **E-29 SponsorContract** — 스폰서 계약. 팀당 `status = 'ACTIVE'` 레코드는 ≤ 3개로
 * 제약된다(원문 05:408) — 타입 레벨에서는 강제하지 않으며 어댑터/DB 제약이 담당한다.
 */
export interface SponsorContract {
  readonly id: SponsorContractId;
  readonly sponsorId: SponsorId;
  readonly teamId: TeamId;
  /** 기간 1~10시즌 */
  readonly startSeason: number;
  readonly endSeason: number;
  readonly incomePerSeason: Points;
  /** ≤ 30.00(%) — 퍼센트 표현 규약은 `Loan.wageSharePct` 주석 참조(I-52) */
  readonly sharePct: number;
  readonly status: SponsorContractStatus;
}

/**
 * **E-30 PointTransaction** — 포인트 원장. 세계의 유일한 통화(FR-EC-001)의 SSOT이며
 * `Team.balance`/`Sponsor.balance`는 이 원장의 파생 캐시다(회계 항등식, NFR-QA-005).
 */
export interface PointTransaction {
  readonly id: PointTransactionId;
  readonly seasonId: SeasonId;
  readonly ownerType: PointTransactionOwnerType;
  /** `ownerType`에 따라 `TeamId` 또는 `SponsorId` — 다형 참조라 브랜드 통합 없이 원시 문자열 */
  readonly ownerId: string;
  /** 부호 있음(증감) */
  readonly amount: Points;
  readonly reasonCode: PointTransactionReasonCode;
  /** 참조 엔티티 종류(예: "Transfer", "SponsorContract") — 구체 리터럴 유니온은 소비 시점 확정 */
  readonly refType: string;
  readonly refId: string;
  /** 이 거래 반영 직후 잔고 스냅샷 */
  readonly balanceAfter: Points;
  readonly createdAt: Timestamp;
}
