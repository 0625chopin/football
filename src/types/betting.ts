/**
 * 배팅 / 사용자 도메인 타입 — **E-33~E-40 선정의 완성** (5일차 2026-07-27, Task 002)
 *
 * 근거: `docs/require/05-data-requirements.md` 5.10절(배팅)·5.11절(사용자)
 *
 * ⚠️ 배팅(5종) + 사용자(3종)는 **2차 릴리스** 범위다. 1차에서는 **타입만 선정의**하고
 * 화면·엔진이 소비하지 않는다(`src/lib/data/**` 등 어떤 어댑터도 이 파일을 아직 참조하지
 * 않아야 한다). `WalletTransaction` 충전(`TOPUP`) 관련 실제 흐름은 3차.
 *
 * 착수 전 확인한 원칙:
 * - **T13**: 배당은 숫자, 포인트는 정수(`Points`)로 두고 서식은 UI 책임.
 * - **마켓 상태(`BetMarket.status`)는 6일차 목록에 명시된 enum성 값**이며, 6일차에
 *   `enums.ts`의 `BetMarketStatus`가 `OPEN/CLOSED/SETTLED/VOIDED` 4종으로 확정됐다.
 *   `scope`/`market_type`처럼 6일차 목록 밖인 값은 5일차에 이미 확정했다.
 *   `market_type`(FR-BT-002~004 마켓 전체, 17종 이상)은 2차 배팅 엔진 설계 시점(5팀 소관)에
 *   구체화하는 편이 안전해 오늘은 `string`으로 둔다(선정의 단계이므로 소비자가 없다).
 * - **C-23 / 041**: 마감·정산 시각 판정은 서버 권한이며 클라이언트 시계를 신뢰하지 않는다.
 *   `Bet.serverReceivedAt`이 그 근거 필드다.
 */

import type {
  BetMarketScope,
  BetMarketStatus,
  BetSelectionResult,
  BetStatus,
  BetType,
  UserRole,
  WalletCurrency,
  WalletTransactionReason,
} from './enums';
import type {
  BetId,
  BetMarketId,
  BetSelectionId,
  OddsId,
  Points,
  SnapshotId,
  Timestamp,
  UserId,
  WalletTransactionId,
} from './brand';

/**
 * **E-33 BetMarket** — 배팅 마켓. `refType`/`refId`가 `scope`에 따라 fixture / season+league
 * / competition 중 하나를 가리킨다(다형 참조, 05:461).
 */
export interface BetMarket {
  readonly id: BetMarketId;
  readonly scope: BetMarketScope;
  /** FR-BT-002~004의 전 마켓 종류(17종 이상) — 2차 설계 시점 구체화, 선정의 단계라 `string` */
  readonly marketType: string;
  readonly refType: string;
  readonly refId: string;
  readonly opensAt: Timestamp;
  readonly closesAt: Timestamp;
  readonly status: BetMarketStatus;
  /** 기본 1.0600(6% 오버라운드 마진) */
  readonly overround: number;
  /** 산출에 쓴 몬테카를로 반복 횟수(N) */
  readonly simCount: number;
  /** 산출 시점 상수 스냅샷 — 결정론 보장(FR-AD-014) */
  readonly snapshotId: SnapshotId;
}

/** **E-34 BetSelection** — 마켓 내 셀렉션. 복합 참조(`marketId` FK) */
export interface BetSelection {
  readonly id: BetSelectionId;
  readonly marketId: BetMarketId;
  /** 표시용 라벨(번역 대상 여부는 소비 시점 확정) */
  readonly label: string;
  readonly outcomeKey: string;
  /** 산출 확률(0~1) */
  readonly probability: number;
  readonly result: BetSelectionResult;
}

/** **E-35 Odds** — 셀렉션별 배당. 시점별 이력을 남기고 `isCurrent`로 최신값을 구분한다 */
export interface Odds {
  readonly id: OddsId;
  readonly selectionId: BetSelectionId;
  /** 1.01 ~ 500.00 */
  readonly decimalOdds: number;
  readonly computedAt: Timestamp;
  readonly isCurrent: boolean;
}

/**
 * **E-36 Bet** — 베팅 슬립. `oddsSnapshot`이 제출 시점 배당을 동결한다(사후 변동 무관).
 * `serverReceivedAt`/`ipHash`는 사후 배팅 차단(041)의 서버 측 증거 필드다(C-23).
 */
export interface Bet {
  readonly id: BetId;
  readonly userId: UserId;
  readonly stake: Points;
  readonly totalOdds: number;
  readonly potentialReturn: Points;
  readonly type: BetType;
  readonly status: BetStatus;
  readonly placedAt: Timestamp;
  /** 정산 전 null */
  readonly settledAt: Timestamp | null;
  /** 제출 시점 배당 동결(jsonb) — 구체 스키마는 소비 시점 확정 */
  readonly oddsSnapshot: Readonly<Record<string, unknown>>;
  /** 서버가 요청을 수신한 시각(클라이언트 시계 미신뢰, C-23) */
  readonly serverReceivedAt: Timestamp;
  readonly ipHash: string;
}

/** **E-37 BetLeg** — 베팅 다리(멀티 베팅의 각 셀렉션). 복합 키(`betId` + `selectionId`) */
export interface BetLeg {
  readonly betId: BetId;
  readonly selectionId: BetSelectionId;
  /** 베팅 시점 배당(동결값) */
  readonly oddsAtPlacement: number;
  readonly result: BetSelectionResult;
}

/** **E-38 User** — 사용자. `id`는 `auth.users` 참조(Supabase 도입 후, 3차) */
export interface User {
  readonly id: UserId;
  readonly displayName: string;
  readonly role: UserRole;
}

/** **E-39 Wallet** — 사용자 지갑. `userId` PK(1:1) */
export interface Wallet {
  readonly userId: UserId;
  readonly balance: Points;
  readonly currency: WalletCurrency;
}

/** **E-40 WalletTransaction** — 지갑 거래 원장. `TOPUP` 관련 실제 흐름은 3차 릴리스 범위 */
export interface WalletTransaction {
  readonly id: WalletTransactionId;
  readonly userId: UserId;
  readonly amount: Points;
  readonly reason: WalletTransactionReason;
  /** `BET_*` 사유일 때 참조. 아니면 null */
  readonly refBetId: BetId | null;
  readonly balanceAfter: Points;
}
