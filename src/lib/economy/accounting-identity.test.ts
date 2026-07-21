/**
 * 회계 항등식 5종(NFR-QA-005) + 스폰서 부도율 밴드(KPI-8) — **26일차(2026-08-25), Task 029 마지막 날**
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 26일차 행("Vitest — 회계 항등식 5종
 * (NFR-QA-005), 스폰서 부도율 ≤ 15% 밴드(KPI-8)", 수락 "3시즌 시뮬 회계 항등식 오차 0.
 * 이적료·스폰서 분배 zero-sum") / `src/types/economy.ts` NFR-QA-005 주석("임의 시점
 * `owner.balance = Σ amount`. 이적료·스폰서 분배는 zero-sum").
 *
 * ## 3시즌 시뮬을 이 파일 안에서 직접 구성하는 이유
 * `src/lib/preseason/**`(030, 이적료 조합 로직)와 `src/lib/odds/**`(035)는 아직 없다
 * (각각 56일차·27일차 착수). 회계 항등식은 20~25일차에 이미 만든 원시 함수
 * (`ledger`/`salary`/`sponsor`/`crisis`)를 여러 시즌에 걸쳐 반복 호출한 뒤에도 깨지지
 * 않는지가 검증 대상이므로, 그 조합을 이 테스트가 직접 구성한다 — 2팀이 15일차
 * `snapshot-pipeline.ts`에서 100경기 조합을 테스트 전용으로 자체 구성한 것과 같은 성격
 * (그 파일 헤더 "프로덕션 오케스트레이션 계층이 쓰는 API가 아니라 테스트 전용 고정
 * 픽스처" 참조). 이적료는 아직 전용 모듈이 없어 `ledger.postPointTransaction`을
 * `TRANSFER_IN`/`TRANSFER_OUT` 페어로 직접 호출해 구성한다 — 이는 035/030이 실제로 할
 * 조합과 동일한 원시 연산이다.
 *
 * 결정론은 `@/lib/sim/rng/prng`(`createState`/`nextIntBetween`, 시드 `20_260_825` — 26일차
 * 날짜 리터럴, 밸런싱 값 아님)를 재사용한다. `src/lib/sim/**` 밖이라 NFR-DT-001 제약
 * 대상은 아니지만, 이 프로젝트에서 "결정론이 필요한 난수"는 전부 이 모듈을 경유한다는
 * 관례를 테스트 코드에도 그대로 적용한다 — 임의의 `i % N` 산술은 생성 로직이 조금만
 * 바뀌어도 우연히 같은 패턴이 반복돼(예: 짝수 인덱스만 애용) 시뮬레이션 다양성을
 * 과소평가하기 쉽다.
 *
 * ## 초기 잔고를 원장 레코드로 만드는 이유(항등식 ①을 델타가 아닌 등식으로 검증하기 위해)
 * 팀/스폰서의 시작 잔고를 원장 밖에서 주입하면 "잔고 = Σ원장"이 정확히 성립하지 않고
 * "잔고 − 초기값 = Σ원장"이라는 델타 검증으로 후퇴한다. 그래서 세계 생성 시점의 초기
 * 자금도 `REBUILD_GRANT`(가장 근접한 기존 reasonCode, world 발생 자금 성격) 원장 레코드
 * 1건으로 남겨 "잔고는 언제나 원장의 파생값"이라는 원문 그대로를 등식으로 검증한다.
 *
 * ## 급여 이중 차감 가드를 실제로 통과시키는 이유
 * `postSalaryPayment`의 `existingTransactions`에 매번 빈 배열을 넘기면 `hasWageBeenPaid`
 * 가드가 한 번도 실행되지 않아(항상 "이력 없음"으로 보임) 22일차 수락 기준("급여 이중
 * 차감 0건")을 이 3시즌 시뮬이 사실상 검증하지 않게 된다. 그래서 이 파일은 각 팀의
 * 누적 거래 이력(`transactions`에서 그 팀 소유분을 필터링)을 매 시즌 그대로 넘겨
 * 가드가 실제 이력을 보고 판단하게 하고, 그 결과(중복 0건)를 별도 항등식으로도 재확인한다.
 * `wagePerSeason` 자체는 계약 시점에 고정되는 값이라(`Contract` 타입 주석) 시즌마다
 * 다시 뽑지 않고 팀별로 한 번만 `calculateWage`로 산출해 재사용한다.
 *
 * ## 스폰서 계약 배정 가정 — 26일차 병합본(공허한 통과 방지, 팀장 지시로 확정)
 * 현재 코드베이스 어디에도 "팀당 스폰서 계약 몇 건을 언제 배정하는가"를 결정하는 로직이
 * 없다(그건 프리시즌 9단계 "스폰서 협상", 030/58일차 몫). **최초 초안은 "팀당 1건"이라는
 * 보수적 가정을 썼는데, 그러면 계약당 수입이 스폰서 `scale`에 비례하고 초기 잔고도 같은
 * `scale`에 비례해 만들어져 잔고·지출이 항상 같은 배수로 움직인다 — 즉 부도가 구조적으로
 * 거의 불가능해 KPI-8이 "통과했지만 아무것도 검증하지 않는" 공허한 상태가 된다(실측
 * 2.22%로 확인, 팀장 병합 지시 근거).** 그래서 스폰서의 1/3(`i % 3 === 0`)을 팀 3곳과
 * 동시계약시켜 지출만 3배로 늘리는 비대칭을 의도적으로 만든다 — 나머지 2/3은 여전히
 * 1건뿐이라 "전원이 위험"도 아니다. 스폰서 잔고를 늘리는 경로가 현재 전무하므로(수입 =
 * 팀 이전만 있고 스폰서 자체 매출 모델은 없음) 이 비대칭이 KPI-8을 실제로 시험하는
 * 유일한 축이다. 이 가정 자체가 실제 밸런싱과 다를 수 있어 36일차(031a) 시드 정리
 * 이전에 재검증이 필요하다는 점을 이슈 후보로 남긴다.
 *
 * ## 공허한 통과 방지 가드 — "존재 확인"과 "부호 확인"을 모두 둔다
 * `length > 0`(레코드가 실제로 생겼는가)만으로는 부족하다 — zero-sum 그룹 검증이 버그로
 * 전부 0건 매칭돼도(예: `refId` 오타로 그룹핑이 항상 빈 그룹) `length > 0`은 여전히
 * 참일 수 있다. 그래서 부호가 뻔한 합계(수입은 반드시 양수, 이적료 지출·스폰서 분배는
 * 반드시 음수)도 별도로 확인한다 — 둘 중 하나만 있으면 서로 다른 실패 모드를 놓친다.
 */

import { describe, expect, it } from 'vitest';
import type {
  ClubOwnerId,
  Contract,
  ContractId,
  NewsFeedItemId,
  PlayerId,
  PointTransaction,
  PointTransactionId,
  Points,
  Seed,
  SeasonId,
  Sponsor,
  SponsorContract,
  SponsorContractId,
  SponsorId,
  Team,
  TeamId,
  Timestamp,
} from '@/types';
import { createState, nextIntBetween } from '@/lib/sim/rng/prng';
import { deriveBalance, postPointTransaction } from './ledger';
import { calculateLeagueFinishPoints, calculateWage, postLeagueFinishPayout, postSalaryPayment, postSponsorIncome } from './salary';
import { judgeSponsorBankruptcy, proposeSponsorContract, SponsorSlotLimitExceededError } from './sponsor';
import { judgeFinancialCrisis } from './crisis';

const SEED = 20_260_825; // 26일차 날짜 리터럴(스냅샷 시드 관례) — 밸런싱 값 아님.
const WAGE_RATIO_TABLE = { RATIO: 0.18 };
const LEAGUE_FINISH_TABLE = {
  L1_BASE: 1500,
  L1_RANGE: 1500,
  L2_BASE: 850,
  L2_RANGE: 950,
  L3_BASE: 400,
  L3_RANGE: 600,
  EXP: 1.8,
};
const SPONSOR_PARAM_TABLE = {
  MAX_PER_TEAM: 3,
  CONTRACT_MIN: 1,
  CONTRACT_MAX: 10,
  SHARE_PCT_CAP: 30,
  POOL_MIN: 40,
  INCOME_BASE: 100,
  INCOME_REP_STEP: 8,
};
/** D-35(48일차, I-239) — 이 회계 항등식 시뮬레이션은 구단주 축 배율을 검증 대상으로 삼지 않으므로 고정값 하나만 재사용한다. */
const FIXED_OWNER = { id: 'owner-fixed' as ClubOwnerId, wealth: 15, negotiation: 15, reputation: 50 };

const TEAM_COUNT = 60;
const SPONSOR_COUNT = 45;
const SEASON_COUNT = 3;
const CREATED_AT = '2026-08-25T00:00:00.000Z' as Timestamp;

interface SimResult {
  readonly transactions: readonly PointTransaction[];
  readonly finalTeams: readonly Team[];
  readonly finalSponsors: readonly Sponsor[];
}

function baseTeam(index: number, reputation: number): Team {
  return {
    id: `team-${index}` as TeamId,
    name: `Team ${index}`,
    shortName: `T${index}`,
    foundedSeason: 2000,
    stadiumName: `Stadium ${index}`,
    stadiumCapacity: 20000,
    colorPrimary: '#000000',
    colorSecondary: '#ffffff',
    crestSeed: index as Seed,
    reputation,
    fanBase: 10000,
    academyLevel: 3,
    balance: 0 as Points,
    financialCrisis: false,
    crisisConsecutiveSeasons: 0,
  };
}

function baseSponsor(index: number, scale: number): Sponsor {
  return {
    id: `sponsor-${index}` as SponsorId,
    name: `Sponsor ${index}`,
    industry: 'Technology',
    scale,
    balance: 0 as Points,
    reputation: 50,
    bankruptAtSeason: null,
  };
}

function runThreeSeasonSimulation(): SimResult {
  let cursor = createState(SEED);
  const rnd = (min: number, max: number): number => {
    const r = nextIntBetween(cursor, min, max);
    cursor = r.state;
    return r.value;
  };

  let txSeq = 0;
  const nextTxId = (): PointTransactionId => {
    txSeq += 1;
    return `ptx-${txSeq}` as PointTransactionId;
  };

  const transactions: PointTransaction[] = [];
  function record(tx: PointTransaction): void {
    transactions.push(tx);
  }
  function transactionsForTeam(teamId: TeamId): PointTransaction[] {
    return transactions.filter((t) => t.ownerType === 'TEAM' && t.ownerId === teamId);
  }

  // 팀 생성 + 초기 자금(REBUILD_GRANT 1건씩 — 파일 상단 "초기 잔고를 원장 레코드로
  // 만드는 이유" 참조). 규모별로 넓은 범위(5000~40000)에서 뽑는다.
  let teams: Team[] = Array.from({ length: TEAM_COUNT }, (_, i) => {
    const reputation = rnd(20, 90);
    const team = baseTeam(i, reputation);
    const grantAmount = rnd(5000, 40000) as Points;
    const tx = postPointTransaction(0 as Points, {
      id: nextTxId(),
      seasonId: 'season-0' as SeasonId,
      ownerType: 'TEAM',
      ownerId: team.id,
      amount: grantAmount,
      reasonCode: 'REBUILD_GRANT',
      refType: 'World',
      refId: 'genesis',
      createdAt: CREATED_AT,
    });
    record(tx);
    return { ...team, balance: tx.balanceAfter };
  });

  // 스폰서 생성 + 초기 자금 — `generateSponsors`(mock/world.ts) 산식(scale × 3000~8000)을
  // 그대로 재현한다(규모가 클수록 잔고도 커야 그만큼 큰 SPONSOR_INCOME 지급을 감당한다).
  let sponsors: Sponsor[] = Array.from({ length: SPONSOR_COUNT }, (_, i) => {
    const scale = rnd(1, 5);
    const sponsor = baseSponsor(i, scale);
    const grantAmount = (scale * rnd(3000, 8000)) as Points;
    const tx = postPointTransaction(0 as Points, {
      id: nextTxId(),
      seasonId: 'season-0' as SeasonId,
      ownerType: 'SPONSOR',
      ownerId: sponsor.id,
      amount: grantAmount,
      reasonCode: 'REBUILD_GRANT',
      refType: 'World',
      refId: 'genesis',
      createdAt: CREATED_AT,
    });
    record(tx);
    return { ...sponsor, balance: tx.balanceAfter };
  });

  // 팀별 급여 — 계약 시점에 고정되는 값이라(파일 상단 참조) 시즌 루프 밖에서 한 번만
  // `calculateWage`(실제 프로덕션 함수)로 산출해 재사용한다.
  const teamWage = new Map<TeamId, Points>();
  for (const team of teams) {
    const marketValue = rnd(500, 3000) as Points;
    teamWage.set(team.id, calculateWage(marketValue, { table: WAGE_RATIO_TABLE }));
  }

  // 스폰서 계약 — 스폰서 1/3(`i % 3 === 0`)은 팀 3곳과 동시계약, 나머지 2/3은 1곳만
  // (파일 상단 "스폰서 계약 배정 가정 — 26일차 병합본" 참조). 슬롯(팀당 ≤3)이 이미 찬
  // 팀을 만나면 그 스폰서는 계약을 그만큼 덜 갖는다(정상 동작 — 강제로 다른 팀을 찾지
  // 않는다, 슬롯 한도 자체는 오늘 검증 대상 항등식이 아니다).
  let contracts: SponsorContract[] = [];
  const contractsByTeamForSlot = new Map<TeamId, SponsorContract[]>();
  for (let i = 0; i < SPONSOR_COUNT; i += 1) {
    const sponsor = sponsors[i];
    const contractCount = i % 3 === 0 ? 3 : 1;

    for (let c = 0; c < contractCount; c += 1) {
      const team = teams[(i + c * 5) % TEAM_COUNT];
      const existingForTeam = contractsByTeamForSlot.get(team.id) ?? [];

      try {
        const contract = proposeSponsorContract(
          {
            id: `sctr-${i}-${c}` as SponsorContractId,
            sponsor,
            teamId: team.id,
            teamReputation: team.reputation,
            startSeason: 1,
            requestedSeasonLength: SEASON_COUNT,
            existingContractsForTeam: existingForTeam,
            owner: FIXED_OWNER,
          },
          { table: SPONSOR_PARAM_TABLE },
        );
        contractsByTeamForSlot.set(team.id, [...existingForTeam, contract]);
        contracts.push(contract);
      } catch (err) {
        if (!(err instanceof SponsorSlotLimitExceededError)) throw err;
      }
    }
  }

  for (let season = 1; season <= SEASON_COUNT; season += 1) {
    const seasonId = `season-${season}` as SeasonId;

    // 급여 차감 — `existingTransactions`에 그 팀의 누적 이력을 그대로 넘겨 22일차
    // "이중 차감 0건" 가드가 실제로 이력을 보고 판단하게 한다(파일 상단 참조).
    teams = teams.map((team, i) => {
      const contract: Contract = {
        id: `contract-${i}` as ContractId,
        playerId: `player-${i}` as PlayerId,
        teamId: team.id,
        startSeason: 1,
        endSeason: SEASON_COUNT,
        wagePerSeason: teamWage.get(team.id) as Points,
        transferFeePaid: 0 as Points,
        status: 'ACTIVE',
      };
      const tx = postSalaryPayment(team.balance, {
        id: nextTxId(),
        seasonId,
        teamId: team.id,
        contract,
        createdAt: CREATED_AT,
        existingTransactions: transactionsForTeam(team.id),
      });
      record(tx);
      return { ...team, balance: tx.balanceAfter };
    });

    // 성과 분배(순위 포인트) — season마다 순위를 한 칸씩 순환시켜 매 시즌 다른 순위표를 만든다.
    teams = teams.map((team, i) => {
      const leagueTier = 1 + (i % 3);
      const rank = ((i + season) % TEAM_COUNT) + 1;
      const points = calculateLeagueFinishPoints(
        { rank, teamCount: TEAM_COUNT, leagueTier },
        { table: LEAGUE_FINISH_TABLE },
      );
      const tx = postLeagueFinishPayout(team.balance, {
        id: nextTxId(),
        seasonId,
        teamId: team.id,
        points,
        createdAt: CREATED_AT,
      });
      record(tx);
      return { ...team, balance: tx.balanceAfter };
    });

    // 스폰서 수입(zero-sum) — 이미 부도난 스폰서·VOIDED 계약은 건너뛴다
    for (let i = 0; i < contracts.length; i += 1) {
      const contract = contracts[i];
      if (contract.status !== 'ACTIVE') continue;
      if (contract.startSeason > season || contract.endSeason < season) continue;

      const teamIndex = teams.findIndex((t) => t.id === contract.teamId);
      const sponsorIndex = sponsors.findIndex((s) => s.id === contract.sponsorId);
      if (teamIndex === -1 || sponsorIndex === -1) continue;
      if (sponsors[sponsorIndex].bankruptAtSeason !== null) continue;

      const result = postSponsorIncome({
        teamTransactionId: nextTxId(),
        sponsorTransactionId: nextTxId(),
        seasonId,
        sponsorContract: contract,
        teamBalance: teams[teamIndex].balance,
        sponsorBalance: sponsors[sponsorIndex].balance,
        createdAt: CREATED_AT,
      });
      record(result.teamTransaction);
      record(result.sponsorTransaction);
      teams[teamIndex] = { ...teams[teamIndex], balance: result.teamTransaction.balanceAfter };
      sponsors[sponsorIndex] = { ...sponsors[sponsorIndex], balance: result.sponsorTransaction.balanceAfter };
    }

    // 이적료(zero-sum) — 짝수 인덱스 팀이 (i+1)번 팀에서 영입한다고 가정한 합성 거래
    for (let i = 0; i < TEAM_COUNT; i += 2) {
      const buyerIndex = i;
      const sellerIndex = (i + 1) % TEAM_COUNT;
      const fee = rnd(500, 3000) as Points;
      const transferRefId = `transfer-${season}-${i}`;

      const outTx = postPointTransaction(teams[buyerIndex].balance, {
        id: nextTxId(),
        seasonId,
        ownerType: 'TEAM',
        ownerId: teams[buyerIndex].id,
        amount: -fee as Points,
        reasonCode: 'TRANSFER_OUT',
        refType: 'Transfer',
        refId: transferRefId,
        createdAt: CREATED_AT,
      });
      record(outTx);
      teams[buyerIndex] = { ...teams[buyerIndex], balance: outTx.balanceAfter };

      const inTx = postPointTransaction(teams[sellerIndex].balance, {
        id: nextTxId(),
        seasonId,
        ownerType: 'TEAM',
        ownerId: teams[sellerIndex].id,
        amount: fee,
        reasonCode: 'TRANSFER_IN',
        refType: 'Transfer',
        refId: transferRefId,
        createdAt: CREATED_AT,
      });
      record(inTx);
      teams[sellerIndex] = { ...teams[sellerIndex], balance: inTx.balanceAfter };
    }

    // 시즌 말 — 스폰서 부도 판정 → 계약 일괄 VOIDED 반영
    sponsors = sponsors.map((sponsor) => {
      const contractsForSponsor = contracts.filter((c) => c.sponsorId === sponsor.id);
      const result = judgeSponsorBankruptcy({
        sponsor,
        currentSeason: season,
        seasonId,
        contractsForSponsor,
        newsFeedItemId: `nf-${season}-${sponsor.id}` as NewsFeedItemId,
        occurredAt: CREATED_AT,
      });
      if (result === null) return sponsor;

      const voidedIds = new Set(result.voidedContracts.map((c) => c.id));
      contracts = contracts.map((c) => (voidedIds.has(c.id) ? { ...c, status: 'VOIDED' as const } : c));
      return result.sponsor;
    });

    // 시즌 말 — 재정 위기 재판정
    teams = teams.map((team) => judgeFinancialCrisis(team).team);
  }

  return { transactions, finalTeams: teams, finalSponsors: sponsors };
}

describe('3시즌 시뮬 — 회계 항등식 5종(NFR-QA-005)', () => {
  const { transactions, finalTeams, finalSponsors } = runThreeSeasonSimulation();

  it('①  각 팀의 잔고는 그 팀 원장 전체의 합과 정확히 같다', () => {
    for (const team of finalTeams) {
      const ownerTx = transactions.filter((t) => t.ownerType === 'TEAM' && t.ownerId === team.id);
      expect(deriveBalance(ownerTx)).toBe(team.balance);
    }
  });

  it('①  각 스폰서의 잔고는 그 스폰서 원장 전체의 합과 정확히 같다', () => {
    for (const sponsor of finalSponsors) {
      const ownerTx = transactions.filter((t) => t.ownerType === 'SPONSOR' && t.ownerId === sponsor.id);
      expect(deriveBalance(ownerTx)).toBe(sponsor.balance);
    }
  });

  it('②  스폰서 수입 레코드는 계약·시즌 단위로 zero-sum이다(팀 +금액, 스폰서 −금액)', () => {
    const incomeTx = transactions.filter((t) => t.reasonCode === 'SPONSOR_INCOME');
    const shareTx = transactions.filter((t) => t.reasonCode === 'SPONSOR_SHARE');
    expect(incomeTx.length).toBeGreaterThan(0);
    expect(shareTx.length).toBeGreaterThan(0);

    // 공허한 통과 방지(파일 상단 참조) — "존재"뿐 아니라 부호도 확인한다.
    const incomeSum = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const shareSum = shareTx.reduce((sum, t) => sum + t.amount, 0);
    expect(incomeSum).toBeGreaterThan(0);
    expect(shareSum).toBeLessThan(0);
    expect(incomeSum + shareSum).toBe(0);

    const sponsorTx = [...incomeTx, ...shareTx].filter((t) => t.refType === 'SponsorContract');
    const grouped = new Map<string, number>();
    for (const tx of sponsorTx) {
      const key = `${tx.refId}|${tx.seasonId}`;
      grouped.set(key, (grouped.get(key) ?? 0) + tx.amount);
    }
    for (const [key, sum] of grouped) {
      expect(sum, `group ${key}`).toBe(0);
    }
  });

  it('③  이적료 레코드는 거래 단위로 zero-sum이다(구매팀 −금액, 판매팀 +금액)', () => {
    const outTx = transactions.filter((t) => t.reasonCode === 'TRANSFER_OUT');
    const inTx = transactions.filter((t) => t.reasonCode === 'TRANSFER_IN');
    expect(outTx.length).toBeGreaterThan(0);
    expect(inTx.length).toBeGreaterThan(0);

    // 공허한 통과 방지(파일 상단 참조) — "존재"뿐 아니라 부호도 확인한다.
    const outSum = outTx.reduce((sum, t) => sum + t.amount, 0);
    const inSum = inTx.reduce((sum, t) => sum + t.amount, 0);
    expect(outSum).toBeLessThan(0);
    expect(inSum).toBeGreaterThan(0);
    expect(outSum + inSum).toBe(0);

    const transferTx = [...outTx, ...inTx].filter((t) => t.refType === 'Transfer');
    const grouped = new Map<string, number>();
    for (const tx of transferTx) {
      grouped.set(tx.refId, (grouped.get(tx.refId) ?? 0) + tx.amount);
    }
    for (const [refId, sum] of grouped) {
      expect(sum, `transfer ${refId}`).toBe(0);
    }
  });

  it('④  급여 이중 차감 0건(전역) — WAGE 레코드는 (refId, seasonId) 조합마다 정확히 1건이다', () => {
    const wageTx = transactions.filter((t) => t.reasonCode === 'WAGE');
    expect(wageTx.length).toBe(TEAM_COUNT * SEASON_COUNT); // 팀당 계약 1건 × 시즌 3회

    const seen = new Set<string>();
    for (const tx of wageTx) {
      const key = `${tx.refId}|${tx.seasonId}`;
      expect(seen.has(key), `duplicate WAGE for ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('⑤  zero-sum 카테고리(스폰서 수입·이적료) 전체 합은 시스템 전역으로도 0이다', () => {
    const zeroSumCategories = new Set(['SPONSOR_INCOME', 'SPONSOR_SHARE', 'TRANSFER_IN', 'TRANSFER_OUT']);
    const total = transactions
      .filter((t) => zeroSumCategories.has(t.reasonCode))
      .reduce((sum, t) => sum + t.amount, 0);
    expect(total).toBe(0);
  });

  it('부가: 전 원장 레코드의 amount·balanceAfter는 예외 없이 정수다(DC-08)', () => {
    expect(transactions.length).toBeGreaterThan(0);
    for (const tx of transactions) {
      expect(Number.isInteger(tx.amount)).toBe(true);
      expect(Number.isInteger(tx.balanceAfter)).toBe(true);
    }
  });
});

describe('스폰서 부도율 밴드(KPI-8) — 3시즌 시뮬 실측', () => {
  it('부도 스폰서 비율이 15% 이하다', () => {
    const { finalSponsors } = runThreeSeasonSimulation();
    const bankruptCount = finalSponsors.filter((s) => s.bankruptAtSeason !== null).length;
    const rate = bankruptCount / finalSponsors.length;
    const multiContractCount = finalSponsors.filter((_s, i) => i % 3 === 0).length;
    const multiContractRatio = multiContractCount / finalSponsors.length;

    console.log(
      `[KPI-8] bankrupt=${bankruptCount}/${finalSponsors.length} rate=${(rate * 100).toFixed(2)}% ` +
        `multiContractSponsors=${multiContractCount}/${finalSponsors.length}(${(multiContractRatio * 100).toFixed(1)}%)`,
    );
    expect(rate).toBeLessThanOrEqual(0.15);
  });
});
