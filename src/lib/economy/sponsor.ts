/**
 * 스폰서 계약 제안 — **23일차(2026-08-20), Task 029**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 23일차 행("스폰서 엔티티·계약(팀당
 * 최대 3슬롯, 1~10시즌), 명성 비례 제안 금액", 수락 "팀당 활성 계약 ≤ 3") /
 * `src/lib/config/catalog.ts` `SPONSOR_PARAM` 그룹(FR-EC-008·010·011, "MAX_PER_TEAM=3,
 * CONTRACT_MIN=1, CONTRACT_MAX=10, SHARE_PCT_CAP=30, POOL_MIN=40"). 소유: 3팀
 * 데이터·밸런싱·배당팀(`src/lib/economy/**`).
 *
 * ## Sponsor 엔티티는 이미 있다 — 이 파일이 새로 만드는 건 SponsorContract뿐
 * `Sponsor`(E-28) 자체의 절차적 생성(이름·업종·규모·초기 잔고·명성)은 19일차 H-07
 * `src/lib/mock/world.ts`의 `generateSponsors`가 이미 담당한다(`POOL_MIN`을 "스폰서
 * 풀 최소 개수"로 소비 — 이 파일에서 다루는 `incomePerSeason` 산식과는 무관한 값이다).
 * 오늘 이 파일이 담는 것은 그 스폰서들과 팀 사이의 **계약**(E-29 `SponsorContract`)을
 * 제안하는 로직 하나뿐이다. 잔고 반영(zero-sum 2건 기록)은 22일차 `salary.ts`의
 * `postSponsorIncome`이 이미 담당하므로 이 파일은 원장을 건드리지 않는다 — 이
 * 계약 레코드를 만드는 것까지만.
 *
 * ## 팀당 슬롯 ≤ 3 (수락 기준) — 구조적 가드
 * `salary.ts`의 `DuplicateSalaryPaymentError`와 동일한 성격의 방어다 — "이미 원장에
 * 있는가"를 스캔하듯, 여기서는 "이 팀의 활성(`status === 'ACTIVE'`) 계약이 이미
 * `MAX_PER_TEAM`건인가"를 호출자가 넘긴 `existingContractsForTeam` 전체에서 스캔한다.
 * 이미 꽉 찬 상태에서 제안을 시도하면 새 레코드를 만들지 않고
 * `SponsorSlotLimitExceededError`를 던진다.
 *
 * ## 계약 기간 1~10시즌 — 클램프 (throw 아님)
 * 슬롯 한도와 달리 기간은 "요청값을 유효 범위로 정규화"하는 성격이라
 * `valuation.ts`의 하한 보장(`Math.max(rounded, floor)`)과 같은 방식으로 처리한다 —
 * `requestedSeasonLength`가 무엇이 들어오든 결과는 항상 `CONTRACT_MIN`~`CONTRACT_MAX`
 * 안의 정수다.
 *
 * ## 명성 비례 제안 금액 — 새로 정하는 키 (05문서 미명시)
 * `SPONSOR_PARAM`에 05문서·`fallback.ts` 양쪽 모두 제안 금액 계수가 없다(`POOL_MIN`은
 * 위에서 설명한 대로 스폰서 풀 크기용) — `valuation.ts`가 `AGE_STEP_PCT` 등을 처음
 * 정의했던 것과 같은 상황이라 `INCOME_BASE`/`INCOME_REP_STEP` 두 키를 이 파일이 처음
 * 정한다. 다만 그 두 키는 "있으면 보정, 없으면 중립"(`ageMultiplier`)이 아니라 오늘
 * 수락 기준 자체("명성 비례 제안 금액")라서 `readNumber` 기본값을 중립(0)이 아니라
 * 실제로 비례하는 값으로 둔다 — 기본값: `INCOME_BASE=100`, `INCOME_REP_STEP=8`
 * (평판 0~100, 스폰서 규모 1~5 기준 제안액 100~4500pt 대). 36일차(031a) 시드 정리 시
 * 이 두 키의 실값 정렬이 필요하다 — 팀장 보고에 이슈 후보로 남긴다.
 * `sharePct`는 명성과 무관하게 스폰서 규모(`Sponsor.scale`)에만 비례시키고
 * `SHARE_PCT_CAP`(30)에서 클램프한다 — 규모가 클수록 계약 지분을 더 요구한다는
 * 단순 가정이며, 계수(`SPONSOR_SHARE_PCT_PER_SCALE`)는 공통코드로 올리지 않고 이 파일
 * 전용 상수로 둔다(`valuation.ts`의 `NEUTRAL_MULTIPLIER`와 동일하게 그룹 계수가 아닌
 * 로컬 상수 취급 — "명성 비례"라는 오늘의 결정 대상이 아니기 때문).
 */

import type { Points, Sponsor, SponsorContract, SponsorContractId, TeamId } from '@/types';
import type { ConstantGroupValues } from '@/lib/config/loader';
import { loadConstants } from '@/lib/config/loader';

type SponsorParamTable = ConstantGroupValues<'SPONSOR_PARAM'>;

/** `sharePct`가 명성과 무관하게 스폰서 규모(1~5)에 비례하는 계수 — 그룹 계수 아님, 이 파일 전용. */
const SPONSOR_SHARE_PCT_PER_SCALE = 6;

/** 팀당 활성 계약 슬롯이 이미 `MAX_PER_TEAM`건 찼을 때 던지는 에러(수락 기준 "≤ 3"). */
export class SponsorSlotLimitExceededError extends Error {
  constructor(
    readonly teamId: string,
    readonly maxPerTeam: number,
  ) {
    super(
      `[economy/sponsor] Team "${teamId}"의 활성 스폰서 계약이 이미 ${maxPerTeam}건(최대치)이라 ` +
        '새 계약을 제안할 수 없다.',
    );
    this.name = 'SponsorSlotLimitExceededError';
  }
}

function readNumber(table: SponsorParamTable, key: string, fallback: number): number {
  const raw = table[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function countActiveContracts(contracts: readonly SponsorContract[]): number {
  return contracts.filter((contract) => contract.status === 'ACTIVE').length;
}

function clampSeasonLength(requestedSeasonLength: number, table: SponsorParamTable): number {
  const min = table.CONTRACT_MIN;
  const max = table.CONTRACT_MAX;
  const rounded = Math.round(Number.isFinite(requestedSeasonLength) ? requestedSeasonLength : min);
  return Math.min(max, Math.max(min, rounded));
}

export interface CalculateSponsorIncomeInput {
  /** `Team.reputation`(0~100) */
  readonly teamReputation: number;
  /** `Sponsor.scale`(1~5) */
  readonly sponsorScale: number;
}

export interface CalculateSponsorIncomeOptions {
  /** 미지정 시 `loadConstants('SPONSOR_PARAM')`를 직접 호출한다. */
  readonly table?: SponsorParamTable;
}

/**
 * 시즌당 제안 금액 — `teamReputation`에 비례하고 `sponsorScale`로 스케일된다(파일 상단
 * "명성 비례 제안 금액" 참조). 어떤 입력에도 `Number.isFinite`가 아니게 새지 않도록 방어한다.
 */
export function calculateSponsorIncome(
  input: CalculateSponsorIncomeInput,
  options?: CalculateSponsorIncomeOptions,
): Points {
  const table = options?.table ?? loadConstants('SPONSOR_PARAM');
  const base = readNumber(table, 'INCOME_BASE', 100);
  const repStep = readNumber(table, 'INCOME_REP_STEP', 8);

  const safeReputation = Math.max(0, input.teamReputation);
  const raw = (base + repStep * safeReputation) * input.sponsorScale;

  return Math.round(Number.isFinite(raw) ? raw : base) as Points;
}

function calculateSponsorSharePct(sponsorScale: number, table: SponsorParamTable): number {
  const raw = Math.max(0, sponsorScale) * SPONSOR_SHARE_PCT_PER_SCALE;
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(table.SHARE_PCT_CAP, rounded);
}

export interface ProposeSponsorContractInput {
  readonly id: SponsorContractId;
  readonly sponsor: Sponsor;
  readonly teamId: TeamId;
  /** `Team.reputation`(0~100) — 제안 금액 산출에 쓴다. */
  readonly teamReputation: number;
  readonly startSeason: number;
  /** 희망 계약 기간(시즌 수) — `CONTRACT_MIN`~`CONTRACT_MAX`로 클램프된다. */
  readonly requestedSeasonLength: number;
  /** 이 팀의 기존 `SponsorContract` 전체(활성 슬롯 판정용). */
  readonly existingContractsForTeam: readonly SponsorContract[];
}

export interface ProposeSponsorContractOptions {
  /** 미지정 시 `loadConstants('SPONSOR_PARAM')`를 직접 호출한다. */
  readonly table?: SponsorParamTable;
}

/**
 * 스폰서 계약을 제안한다(`status: 'ACTIVE'`로 생성). 이 팀의 활성 계약이 이미
 * `MAX_PER_TEAM`건이면 `SponsorSlotLimitExceededError`를 던지고 레코드를 만들지 않는다
 * (수락 기준 "팀당 활성 계약 ≤ 3"). 계약 기간은 항상 `CONTRACT_MIN`~`CONTRACT_MAX` 안이다.
 */
export function proposeSponsorContract(
  input: ProposeSponsorContractInput,
  options?: ProposeSponsorContractOptions,
): SponsorContract {
  const table = options?.table ?? loadConstants('SPONSOR_PARAM');

  const activeCount = countActiveContracts(input.existingContractsForTeam);
  if (activeCount >= table.MAX_PER_TEAM) {
    throw new SponsorSlotLimitExceededError(input.teamId, table.MAX_PER_TEAM);
  }

  const seasonLength = clampSeasonLength(input.requestedSeasonLength, table);
  const endSeason = input.startSeason + seasonLength - 1;

  const incomePerSeason = calculateSponsorIncome(
    { teamReputation: input.teamReputation, sponsorScale: input.sponsor.scale },
    { table },
  );
  const sharePct = calculateSponsorSharePct(input.sponsor.scale, table);

  return {
    id: input.id,
    sponsorId: input.sponsor.id,
    teamId: input.teamId,
    startSeason: input.startSeason,
    endSeason,
    incomePerSeason,
    sharePct,
    status: 'ACTIVE',
  };
}
