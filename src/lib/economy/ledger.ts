/**
 * 포인트 원장 — **20일차(2026-08-17), Task 029**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 20일차 행("포인트 원장 — 모든 잔고
 * 변동은 원장 레코드 필수, 잔고는 원장의 파생값", DC-08 정수 고정) / `src/types/economy.ts`
 * E-30 `PointTransaction` 헤더("`Team.balance`/`Sponsor.balance`는 이 원장의 파생 캐시다,
 * NFR-QA-005 회계 항등식"). 소유: 3팀 데이터·밸런싱·배당팀(`src/lib/economy/**`).
 *
 * ## 이 파일이 담는 것 / 담지 않는 것
 * - **담는 것**: 잔고를 바꾸는 **유일한 진입점** `postPointTransaction` — 항상 `PointTransaction`
 *   레코드 하나와 그 레코드에서 파생된 `balanceAfter`를 함께 반환한다. 별도로 잔고만 직접
 *   덮어쓰는 함수는 이 파일에 없다 — 그런 함수가 없다는 사실 자체가 "원장 없는 잔고 변동
 *   0건" 수락 기준을 구조적으로 강제한다. 그 외 `deriveBalance`(원장 전체에서 잔고 재계산,
 *   NFR-QA-005 항등식 검증용).
 * - **담지 않는 것**: 영속화(6팀 DataSource 경계 밖, 이 모듈은 순수 로직만), ID/시각 생성
 *   (`PointTransactionId`/`Timestamp`는 호출자가 이미 브랜드된 값을 넘긴다 — `brand.ts`
 *   "생성은 이 파일 밖에서 하지 않는다" 원칙, `mock/world.ts`의 PRNG 파생 ID 관례와 동일),
 *   이적료·스폰서 분배 등 여러 레코드로 구성된 zero-sum 거래의 조합 로직(이후 Task
 *   030/031/035 소비 시점에 이 원시 함수를 반복 호출해 구성).
 *
 * ## 순수 함수 계약
 * `Math.random()`/`Date.now()`/`crypto.randomUUID()`를 쓰지 않는다 — 결정론이 필요한
 * Mock/시뮬레이션 소비처(NFR-DT-001, `mock/world.ts` 헤더와 동일 관례)가 이 함수를 호출할
 * 것이므로 실행 시각·환경에 의존하는 값을 내부에서 만들지 않는다.
 *
 * ## DC-08 (포인트 정수 고정)
 * `amount`/`currentBalance`가 정수가 아니면 `NonIntegerPointsError`를 던진다(fail-fast).
 * 부동소수 연산을 아예 만들지 않도록 덧셈 한 번(`currentBalance + amount`)만 수행한다.
 */

import type {
  PointTransaction,
  PointTransactionId,
  PointTransactionOwnerType,
  PointTransactionReasonCode,
  Points,
  SeasonId,
  Timestamp,
} from '@/types';

/** `postPointTransaction` 입력 — `balanceAfter`는 파생값이라 입력에 없다. */
export interface PostPointTransactionInput {
  readonly id: PointTransactionId;
  readonly seasonId: SeasonId;
  readonly ownerType: PointTransactionOwnerType;
  /** `ownerType`에 따라 `TeamId` 또는 `SponsorId`(다형 참조, `economy.ts` PointTransaction 주석 참조) */
  readonly ownerId: string;
  /** 부호 있음(증감), 정수 고정(DC-08) */
  readonly amount: Points;
  readonly reasonCode: PointTransactionReasonCode;
  readonly refType: string;
  readonly refId: string;
  readonly createdAt: Timestamp;
}

/** DC-08 위반(정수가 아닌 포인트 값) 시 던지는 에러. */
export class NonIntegerPointsError extends Error {
  constructor(
    readonly field: string,
    readonly value: number,
  ) {
    super(`[economy/ledger] DC-08 위반: "${field}" 값 ${value}은(는) 정수가 아니다.`);
    this.name = 'NonIntegerPointsError';
  }
}

function assertIntegerPoints(field: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new NonIntegerPointsError(field, value);
  }
}

/**
 * 잔고를 바꾸는 유일한 진입점. `currentBalance`에 `input.amount`를 더한 값을
 * `balanceAfter`로 갖는 `PointTransaction` 레코드를 반환한다 — 호출자는 이 레코드를
 * 원장에 append하고, `balanceAfter`를 캐시(`Team.balance`/`Sponsor.balance`)에 반영해야
 * 한다. 원장 레코드 없이 캐시만 직접 바꾸는 경로는 이 모듈에 존재하지 않는다.
 */
export function postPointTransaction(
  currentBalance: Points,
  input: PostPointTransactionInput,
): PointTransaction {
  assertIntegerPoints('currentBalance', currentBalance);
  assertIntegerPoints('amount', input.amount);

  const balanceAfter = (currentBalance + input.amount) as Points;
  assertIntegerPoints('balanceAfter', balanceAfter);

  return {
    id: input.id,
    seasonId: input.seasonId,
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    amount: input.amount,
    reasonCode: input.reasonCode,
    refType: input.refType,
    refId: input.refId,
    balanceAfter,
    createdAt: input.createdAt,
  };
}

/**
 * 원장 레코드 목록에서 잔고를 재계산한다(NFR-QA-005 회계 항등식 — 임의 시점
 * `owner.balance = Σ amount` — 검증용). 빈 배열이면 0.
 */
export function deriveBalance(transactions: readonly PointTransaction[]): Points {
  let sum = 0;
  for (const transaction of transactions) {
    assertIntegerPoints('amount', transaction.amount);
    sum += transaction.amount;
  }
  assertIntegerPoints('derivedBalance', sum);
  return sum as Points;
}
