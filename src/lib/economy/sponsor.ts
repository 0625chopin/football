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
 *
 * ## 24일차(2026-08-21) 추가 — 스폰서 부도 판정 및 계약 일괄 VOIDED
 * 부도 판정 자체는 새 파라미터가 필요 없다 — `Sponsor.balance`의 타입 주석("음수면
 * 부도 상태", `economy.ts`)이 이미 임계값을 정해 뒀고 `src/lib/data/DataSource.ts`의
 * `getSponsors` 주석도 같은 판정("`Sponsor.balance < 0` 또는 `bankruptAtSeason !==
 * null`")을 전제한다. `judgeSponsorBankruptcy`는 그 판정을 한 곳에 모으고, 중복
 * 판정을 막기 위해 `bankruptAtSeason`이 이미 채워진 스폰서는 다시 처리하지 않는다
 * (`salary.ts`의 `hasWageBeenPaid`와 동일하게 "이미 반영됐는가"를 먼저 스캔하는
 * 구조 — 다만 여기서는 던지지 않고 `null`을 반환한다. 이중 지급은 잘못된 *시도*라
 * 에러지만, 이미 부도난 스폰서를 다시 조회하는 것은 정상 흐름이라 에러가 아니다).
 *
 * "관련 계약 일괄 VOIDED"(수락 기준 "계약 전건 VOIDED")는 그 스폰서의 **활성
 * (`ACTIVE`) 계약 전부**를 예외 없이 `VOIDED`로 바꾼다는 뜻으로 해석했다 — 이미
 * `EXPIRED`인 계약까지 상태를 덮어쓰면 "왜 만료된 계약이 부도 시점에 VOIDED로
 * 바뀌었는가"라는 이력 왜곡이 생기므로 대상에서 제외한다(`proposeSponsorContract`가
 * 슬롯 카운트에서 `EXPIRED`/`VOIDED`를 이미 제외하는 것과 같은 "ACTIVE만 유효한
 * 상태"라는 전제를 여기서도 유지). 호출자는 이 스폰서의 계약 전체(팀 무관,
 * `sponsorId`로 스캔한 결과)를 `contractsForSponsor`로 넘긴다 — `MAX_PER_TEAM`
 * 슬롯 판정이 팀 축으로 스캔하는 것과 달리 부도는 스폰서 축 전역이므로 여러 팀에
 * 걸친 계약이 한 번에 대상이 될 수 있다.
 *
 * 뉴스 피드 노출은 `NewsFeedItemType`에 이미 있는 `'SPONSOR_BANKRUPT'`(E-26,
 * `enums.ts`)를 쓴다 — 오늘 새로 정의하지 않는다.
 */

import type {
  ClubOwner,
  NewsFeedItem,
  NewsFeedItemId,
  Points,
  SeasonId,
  Sponsor,
  SponsorContract,
  SponsorContractId,
  Timestamp,
  TeamId,
} from '@/types';
import type { ConstantGroupValues } from '@/lib/config/loader';
import { loadConstants } from '@/lib/config/loader';

type SponsorParamTable = ConstantGroupValues<'SPONSOR_PARAM'>;

/** `sharePct`가 명성과 무관하게 스폰서 규모(1~5)에 비례하는 계수 — 그룹 계수 아님, 이 파일 전용. */
const SPONSOR_SHARE_PCT_PER_SCALE = 6;

/** 구단주 축 배율의 중립값(D-35 결정④) — `valuation.ts`의 `NEUTRAL_MULTIPLIER`와 동일 관례. */
const NEUTRAL_MULTIPLIER = 1;

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

/**
 * 구단주 자산 배율(D-35 결정④) — `ClubOwner.wealth`(1~30)에 비례. `OWNER_WEALTH_STEP_PCT`가
 * 05문서에 근거 수치가 없어 미설정이면 중립값(배율 1)으로 처리한다(`valuation.ts`의
 * `ageMultiplier` 선례와 동일 관례) — `wealth` 미지정(owner 없음) 시에도 동일하게 중립.
 */
function ownerWealthMultiplier(wealth: number | undefined, table: SponsorParamTable): number {
  if (wealth === undefined) {
    return NEUTRAL_MULTIPLIER;
  }
  const stepPct = readNumber(table, 'OWNER_WEALTH_STEP_PCT', 0);
  if (stepPct === 0) {
    return NEUTRAL_MULTIPLIER;
  }
  const reference = readNumber(table, 'OWNER_WEALTH_REFERENCE', wealth);
  return NEUTRAL_MULTIPLIER + stepPct * (wealth - reference);
}

/** 구단주 평판 배율(D-35 결정④) — `ClubOwner.reputation`(0~100)에 비례. 위와 동일한 중립값 관례. */
function ownerReputationMultiplier(reputation: number | undefined, table: SponsorParamTable): number {
  if (reputation === undefined) {
    return NEUTRAL_MULTIPLIER;
  }
  const stepPct = readNumber(table, 'OWNER_REPUTATION_STEP_PCT', 0);
  if (stepPct === 0) {
    return NEUTRAL_MULTIPLIER;
  }
  const reference = readNumber(table, 'OWNER_REPUTATION_REFERENCE', reputation);
  return NEUTRAL_MULTIPLIER + stepPct * (reputation - reference);
}

/**
 * 구단주 협상력 배율(D-35 결정④) — `ClubOwner.negotiation`(1~30)이 높을수록 스폰서가
 * 요구하는 `sharePct`를 낮춘다(팀 쪽에 유리한 협상). 위와 동일한 중립값 관례.
 */
function ownerNegotiationMultiplier(negotiation: number | undefined, table: SponsorParamTable): number {
  if (negotiation === undefined) {
    return NEUTRAL_MULTIPLIER;
  }
  const stepPct = readNumber(table, 'OWNER_NEGOTIATION_STEP_PCT', 0);
  if (stepPct === 0) {
    return NEUTRAL_MULTIPLIER;
  }
  const reference = readNumber(table, 'OWNER_NEGOTIATION_REFERENCE', negotiation);
  return NEUTRAL_MULTIPLIER - stepPct * (negotiation - reference);
}

export interface CalculateSponsorIncomeInput {
  /** `Team.reputation`(0~100) */
  readonly teamReputation: number;
  /** `Sponsor.scale`(1~5) */
  readonly sponsorScale: number;
  /** `ClubOwner.wealth`(1~30, D-35 결정④) — 미지정 시 중립(배율 1) */
  readonly ownerWealth?: number;
  /** `ClubOwner.reputation`(0~100, D-35 결정④) — 미지정 시 중립(배율 1) */
  readonly ownerReputation?: number;
}

export interface CalculateSponsorIncomeOptions {
  /** 미지정 시 `loadConstants('SPONSOR_PARAM')`를 직접 호출한다. */
  readonly table?: SponsorParamTable;
}

/**
 * 시즌당 제안 금액 — `teamReputation`에 비례하고 `sponsorScale`로 스케일된다(파일 상단
 * "명성 비례 제안 금액" 참조). `ownerWealth`/`ownerReputation`을 지정하지 않으면 기존
 * 산식과 100% 동일하다(중립 배율 1). 어떤 입력에도 `Number.isFinite`가 아니게 새지
 * 않도록 방어한다.
 */
export function calculateSponsorIncome(
  input: CalculateSponsorIncomeInput,
  options?: CalculateSponsorIncomeOptions,
): Points {
  const table = options?.table ?? loadConstants('SPONSOR_PARAM');
  const base = readNumber(table, 'INCOME_BASE', 100);
  const repStep = readNumber(table, 'INCOME_REP_STEP', 8);

  const safeReputation = Math.max(0, input.teamReputation);
  const raw =
    (base + repStep * safeReputation) *
    input.sponsorScale *
    ownerWealthMultiplier(input.ownerWealth, table) *
    ownerReputationMultiplier(input.ownerReputation, table);

  return Math.round(Number.isFinite(raw) ? raw : base) as Points;
}

function calculateSponsorSharePct(
  sponsorScale: number,
  table: SponsorParamTable,
  ownerNegotiation?: number,
): number {
  const raw =
    Math.max(0, sponsorScale) * SPONSOR_SHARE_PCT_PER_SCALE * ownerNegotiationMultiplier(ownerNegotiation, table);
  const rounded = Math.round(raw * 100) / 100;
  return Math.min(table.SHARE_PCT_CAP, Math.max(0, rounded));
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
  /**
   * 계약 체결 주체(D-35 결정②·③, 48일차, I-239) — `signedByOwnerId`에 그대로 대입된다.
   * `wealth`/`negotiation`/`reputation`을 제안 금액·`sharePct` 산출에 반영한다(결정④).
   */
  readonly owner: Pick<ClubOwner, 'id' | 'wealth' | 'negotiation' | 'reputation'>;
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
    {
      teamReputation: input.teamReputation,
      sponsorScale: input.sponsor.scale,
      ownerWealth: input.owner.wealth,
      ownerReputation: input.owner.reputation,
    },
    { table },
  );
  const sharePct = calculateSponsorSharePct(input.sponsor.scale, table, input.owner.negotiation);

  return {
    id: input.id,
    sponsorId: input.sponsor.id,
    teamId: input.teamId,
    signedByOwnerId: input.owner.id,
    startSeason: input.startSeason,
    endSeason,
    incomePerSeason,
    sharePct,
    status: 'ACTIVE',
  };
}

export interface JudgeSponsorBankruptcyInput {
  readonly sponsor: Sponsor;
  /** 부도 판정 시점 시즌(정상이면 결과 없음, `bankruptAtSeason`에 기록될 값). */
  readonly currentSeason: number;
  readonly seasonId: SeasonId;
  /** 이 스폰서의 계약 전체(팀 무관, `sponsorId`로 스캔한 결과) — VOIDED 대상 판정용. */
  readonly contractsForSponsor: readonly SponsorContract[];
  readonly newsFeedItemId: NewsFeedItemId;
  readonly occurredAt: Timestamp;
}

export interface SponsorBankruptcyResult {
  /** `bankruptAtSeason`이 `currentSeason`으로 채워진 스폰서. */
  readonly sponsor: Sponsor;
  /** `status: 'VOIDED'`로 바뀐 계약만(원래 `ACTIVE`였던 것) — 그 외는 결과에 담지 않는다. */
  readonly voidedContracts: readonly SponsorContract[];
  readonly newsFeedItem: NewsFeedItem;
}

/**
 * 스폰서 부도를 판정한다(`Sponsor.balance < 0`). 이미 부도 처리된 스폰서
 * (`bankruptAtSeason !== null`)나 정상 잔고(`balance >= 0`)면 아무것도 하지 않고
 * `null`을 반환한다. 부도가 확정되면 `contractsForSponsor` 중 `ACTIVE`였던 계약
 * 전부를 `VOIDED`로 바꾸고(파일 상단 "24일차 추가" 참조) `SPONSOR_BANKRUPT`
 * 뉴스 피드 아이템 1건을 만든다. 원장은 건드리지 않는다 — 잔고를 바꾸는 유일한
 * 경로는 `ledger.ts`(파일 상단 "20~21일차 관례 승계"와 동일 원칙).
 */
export function judgeSponsorBankruptcy(input: JudgeSponsorBankruptcyInput): SponsorBankruptcyResult | null {
  if (input.sponsor.balance >= 0 || input.sponsor.bankruptAtSeason !== null) {
    return null;
  }

  const bankruptSponsor: Sponsor = {
    ...input.sponsor,
    bankruptAtSeason: input.currentSeason,
  };

  const voidedContracts = input.contractsForSponsor
    .filter((contract) => contract.status === 'ACTIVE')
    .map((contract): SponsorContract => ({ ...contract, status: 'VOIDED' }));

  const newsFeedItem: NewsFeedItem = {
    id: input.newsFeedItemId,
    seasonId: input.seasonId,
    type: 'SPONSOR_BANKRUPT',
    headline: `${input.sponsor.name}, 파산 선언`,
    body:
      voidedContracts.length > 0
        ? `${input.sponsor.name}이(가) 재정 악화로 파산하며 진행 중이던 스폰서십 계약 ${voidedContracts.length}건이 전부 해지됩니다.`
        : `${input.sponsor.name}이(가) 재정 악화로 파산을 선언했습니다.`,
    refType: 'Sponsor',
    refId: input.sponsor.id,
    occurredAt: input.occurredAt,
  };

  return { sponsor: bankruptSponsor, voidedContracts, newsFeedItem };
}
