/**
 * 경제 도메인 타입 — **E-12 ~ E-14 완성** (4일차 2026-07-24, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.4절(계약/이동)
 * 나머지 범위(**E-28 Sponsor / E-29 SponsorContract / E-30 PointTransaction**, 명예 E-31~32)는
 * 여전히 **5일차(07-27)**.
 *
 * **배치 확정(팀장 승인, 4일차)**: E-12 Contract / E-13 Transfer / E-14 Loan(계약·이동
 * 도메인)은 여기 `economy.ts`에 둔다. 근거는 **소비자 기준** — 셋 다 급여·이적료·분배율
 * 등 금액 축을 공유하고 주 소비처가 3팀 `src/lib/economy/**`·`src/lib/preseason/**`이라
 * "인물"보다 "경제" 도메인에 가깝다. person.ts는 34속성으로 이미 부피가 커졌으므로 관계
 * 엔티티까지 얹지 않고 인물 6종(E-06~E-11)으로 순수하게 완결시킨다. 별도 파일 신설은
 * 기각됐다 — 동결(8일차)까지 4일 남은 시점에 11파일 구조·배럴·6팀 H-08 대응표를 흔들
 * 이유가 없다. **이 배치는 5일차 이후 재론하지 않는다.**
 *
 * 착수 전 확인할 원칙:
 * - **DC-08**: 포인트는 **정수 고정**(`Points`, `brand.ts`). 소수점 연산을 도입하지 않는다.
 * - `Team.balance`는 원장(`PointTransaction`)의 **파생 캐시**이며 원장이 단일 근거다.
 * - **T13**: 금액은 숫자로 두고 로케일 서식은 UI 계층 책임이다.
 * - **D-21**: 임대는 1단계·1시즌 고정, 상한은 공통코드(3팀 030 소관) — 타입은 상한을 강제하지 않는다.
 */

import type { ContractStatus, LoanStatus, TransferType } from './enums';
import type {
  ContractId,
  LoanId,
  PlayerId,
  Points,
  SeasonId,
  TeamId,
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
  /** 임대료 분배 비율(%). 기본 50 */
  readonly wageSharePct: number;
  readonly status: LoanStatus;
}
