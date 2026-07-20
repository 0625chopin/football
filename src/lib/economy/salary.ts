/**
 * 급여 차감 · 성과 분배 · 스폰서 수입 — **22일차(2026-08-19), Task 029**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 22일차 행("급여(몸값 × 비율 0.18)
 * 차감, 성과 분배, 스폰서 수입", 수락 "급여 이중 차감 0건") / `src/lib/config/catalog.ts`
 * `WAGE_RATIO`(FR-EC-006, RATIO=0.18) · `LEAGUE_FINISH_POINT`(FR-EC-002) 그룹. 소유:
 * 3팀 데이터·밸런싱·배당팀(`src/lib/economy/**`).
 *
 * ## 20~21일차 관례 승계
 * DC-08 정수 고정, `@/types` 배럴 import(서브경로 금지), `Math.random()`/`Date.now()`
 * 미사용(NFR-DT-001), 잔고를 바꾸는 경로는 `ledger.ts`의 `postPointTransaction` 하나만
 * 경유한다 — 이 파일은 그 위에 "무엇을 얼마나 지급/차감할지"를 얹을 뿐, 잔고 갱신 로직을
 * 다시 구현하지 않는다.
 *
 * ## 급여 이중 차감 방지 (수락 기준) — 구조적 근거
 * `Contract.wagePerSeason`은 계약 시점에 이미 고정된 값이다(계산식 `calculateWage`는 그
 * 값을 만드는 쪽에서 쓴다 — 이 파일은 소비만 한다). 이중 차감을 막는 지점은 "같은 계약이
 * 같은 시즌에 두 번 청구되는가"이므로, `postSalaryPayment`는 매번 그 시즌 원장 전체
 * (`existingTransactions`)를 스캔해 `reasonCode: 'WAGE'` + `refType: 'Contract'` +
 * `refId: contract.id` + `seasonId`가 일치하는 레코드가 이미 있으면 새 레코드를 만들지
 * 않고 `DuplicateSalaryPaymentError`를 던진다 — `ledger.ts`가 "원장 없는 잔고 변동"을
 * 막듯, 이 파일은 "같은 계약의 중복 원장"을 막는다. 원장 자체가 유일한 근거이므로 별도
 * "이미 지급함" 플래그를 추가하지 않는다(단일 소스 원칙, `valuation.ts` 헤더와 동일 사유).
 *
 * ## 성과 분배 — 순위 포인트 곡선
 * `LEAGUE_FINISH_POINT` 설명("L1_BASE=1500, L1_RANGE=1500, … EXP=1.8")을 "1등이
 * BASE+RANGE, 꼴찌가 BASE, 그 사이는 EXP로 휘는 곡선"으로 해석했다 — 순위(`rank`)가
 * 낮을수록(=성적이 좋을수록) 포인트가 커지도록 진행도 `progress = (teamCount - rank) /
 * (teamCount - 1)`(1등=1, 꼴찌=0)를 `EXP` 지수로 휘게 한 뒤 `BASE + RANGE × progress^EXP`.
 * `teamCount ≤ 1`이면 분모가 0이 되므로 분모를 `Math.max(1, teamCount - 1)`로 방어하고,
 * `rank`가 1~teamCount 범위를 벗어나도(잘못된 호출) `progress`를 0~1로 clamp해 `NaN`/
 * 범위 밖 값이 새지 않게 한다(`valuation.ts`의 "구조적 불변식" 방어와 동일한 성격).
 *
 * ## 스폰서 수입 — zero-sum 2건 기록
 * `SponsorContract.incomePerSeason`(계약 시점에 이미 고정)을 팀 잔고에 더하고 스폰서
 * 잔고에서 같은 금액을 뺀다 — 팀 한 건만 기록하면 `NFR-QA-005`(회계 항등식, 원장 합 =
 * 잔고)가 스폰서 쪽에서 깨진다. 두 레코드 모두 `refType: 'SponsorContract'` +
 * `refId: sponsorContract.id`로 같은 거래를 가리키므로 사후 대조가 가능하다.
 */

import type {
  Contract,
  Points,
  PointTransaction,
  PointTransactionId,
  SeasonId,
  SponsorContract,
  TeamId,
  Timestamp,
} from '@/types';
import type { ConstantGroupValues } from '@/lib/config/loader';
import { loadConstants } from '@/lib/config/loader';
import { postPointTransaction } from './ledger';

type WageRatioTable = ConstantGroupValues<'WAGE_RATIO'>;
type LeagueFinishPointTable = ConstantGroupValues<'LEAGUE_FINISH_POINT'>;

/** 같은 계약·같은 시즌에 급여가 두 번 청구될 때 던지는 에러(수락 기준 "이중 차감 0건"). */
export class DuplicateSalaryPaymentError extends Error {
  constructor(
    readonly contractId: string,
    readonly seasonId: string,
  ) {
    super(`[economy/salary] Contract "${contractId}"의 ${seasonId} 시즌 급여가 이미 원장에 있다(중복 차감 시도).`);
    this.name = 'DuplicateSalaryPaymentError';
  }
}

function hasWageBeenPaid(
  existingTransactions: readonly PointTransaction[],
  contractId: string,
  seasonId: SeasonId,
): boolean {
  return existingTransactions.some(
    (transaction) =>
      transaction.reasonCode === 'WAGE' &&
      transaction.refType === 'Contract' &&
      transaction.refId === contractId &&
      transaction.seasonId === seasonId,
  );
}

export interface CalculateWageOptions {
  /** 미지정 시 `loadConstants('WAGE_RATIO')`를 직접 호출한다. */
  readonly table?: WageRatioTable;
}

/** 몸값 기준 급여 산출 — `Contract.wagePerSeason`을 만드는 쪽(계약 체결/갱신)이 쓴다. */
export function calculateWage(marketValue: Points, options?: CalculateWageOptions): Points {
  const table = options?.table ?? loadConstants('WAGE_RATIO');
  return Math.round(marketValue * table.RATIO) as Points;
}

export interface PostSalaryPaymentInput {
  readonly id: PointTransactionId;
  readonly seasonId: SeasonId;
  readonly teamId: TeamId;
  readonly contract: Contract;
  readonly createdAt: Timestamp;
  /** 이 계약이 속한 팀·시즌의 원장 레코드 전체 — 중복 지급 판정에 쓴다. */
  readonly existingTransactions: readonly PointTransaction[];
}

/**
 * `contract.wagePerSeason`을 팀 잔고에서 차감한다. 같은 `contract.id` + `seasonId` 조합의
 * `WAGE` 레코드가 `existingTransactions`에 이미 있으면 `DuplicateSalaryPaymentError`를
 * 던지고 새 레코드를 만들지 않는다.
 */
export function postSalaryPayment(currentBalance: Points, input: PostSalaryPaymentInput): PointTransaction {
  if (hasWageBeenPaid(input.existingTransactions, input.contract.id, input.seasonId)) {
    throw new DuplicateSalaryPaymentError(input.contract.id, input.seasonId);
  }

  return postPointTransaction(currentBalance, {
    id: input.id,
    seasonId: input.seasonId,
    ownerType: 'TEAM',
    ownerId: input.teamId,
    amount: -input.contract.wagePerSeason as Points,
    reasonCode: 'WAGE',
    refType: 'Contract',
    refId: input.contract.id,
    createdAt: input.createdAt,
  });
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function leagueFinishTierKey(leagueTier: number): 'L1' | 'L2' | 'L3' {
  if (leagueTier <= 1) return 'L1';
  if (leagueTier === 2) return 'L2';
  return 'L3';
}

export interface CalculateLeagueFinishPointsInput {
  /** 1 = 우승 */
  readonly rank: number;
  readonly teamCount: number;
  readonly leagueTier: number;
}

export interface CalculateLeagueFinishPointsOptions {
  readonly table?: LeagueFinishPointTable;
}

/**
 * 순위 포인트 곡선 — 1등이 `{tier}_BASE + {tier}_RANGE`, 꼴찌가 `{tier}_BASE`, 그 사이는
 * `EXP` 지수로 휜다(파일 상단 "성과 분배" 참조). `rank`/`teamCount`가 범위를 벗어나도
 * `progress`를 0~1로 clamp해 결과가 `{tier}_BASE`~`{tier}_BASE + {tier}_RANGE` 밖으로
 * 새지 않는다.
 */
export function calculateLeagueFinishPoints(
  input: CalculateLeagueFinishPointsInput,
  options?: CalculateLeagueFinishPointsOptions,
): Points {
  const table = options?.table ?? loadConstants('LEAGUE_FINISH_POINT');
  const prefix = leagueFinishTierKey(input.leagueTier);
  const base = table[`${prefix}_BASE`];
  const range = table[`${prefix}_RANGE`];
  const exp = table.EXP;

  const denominator = Math.max(1, input.teamCount - 1);
  const progress = clamp01((input.teamCount - input.rank) / denominator);
  const raw = base + range * progress ** exp;

  return Math.round(Number.isFinite(raw) ? raw : base) as Points;
}

export interface PostLeagueFinishPayoutInput {
  readonly id: PointTransactionId;
  readonly seasonId: SeasonId;
  readonly teamId: TeamId;
  readonly points: Points;
  readonly createdAt: Timestamp;
}

/** `calculateLeagueFinishPoints` 산출값을 팀 잔고에 반영한다. */
export function postLeagueFinishPayout(currentBalance: Points, input: PostLeagueFinishPayoutInput): PointTransaction {
  return postPointTransaction(currentBalance, {
    id: input.id,
    seasonId: input.seasonId,
    ownerType: 'TEAM',
    ownerId: input.teamId,
    amount: input.points,
    reasonCode: 'LEAGUE_FINISH',
    refType: 'Season',
    refId: input.seasonId,
    createdAt: input.createdAt,
  });
}

export interface PostSponsorIncomeInput {
  readonly teamTransactionId: PointTransactionId;
  readonly sponsorTransactionId: PointTransactionId;
  readonly seasonId: SeasonId;
  readonly sponsorContract: SponsorContract;
  readonly teamBalance: Points;
  readonly sponsorBalance: Points;
  readonly createdAt: Timestamp;
}

export interface SponsorIncomeResult {
  readonly teamTransaction: PointTransaction;
  readonly sponsorTransaction: PointTransaction;
}

/**
 * `sponsorContract.incomePerSeason`만큼 팀 잔고를 늘리고 스폰서 잔고를 같은 금액만큼
 * 줄인다(zero-sum, NFR-QA-005). 두 레코드 모두 같은 `refId`(`sponsorContract.id`)를
 * 가리켜 사후 대조가 가능하다.
 */
export function postSponsorIncome(input: PostSponsorIncomeInput): SponsorIncomeResult {
  const amount = input.sponsorContract.incomePerSeason;

  const teamTransaction = postPointTransaction(input.teamBalance, {
    id: input.teamTransactionId,
    seasonId: input.seasonId,
    ownerType: 'TEAM',
    ownerId: input.sponsorContract.teamId,
    amount,
    reasonCode: 'SPONSOR_INCOME',
    refType: 'SponsorContract',
    refId: input.sponsorContract.id,
    createdAt: input.createdAt,
  });

  const sponsorTransaction = postPointTransaction(input.sponsorBalance, {
    id: input.sponsorTransactionId,
    seasonId: input.seasonId,
    ownerType: 'SPONSOR',
    ownerId: input.sponsorContract.sponsorId,
    amount: -amount as Points,
    reasonCode: 'SPONSOR_SHARE',
    refType: 'SponsorContract',
    refId: input.sponsorContract.id,
    createdAt: input.createdAt,
  });

  return { teamTransaction, sponsorTransaction };
}
