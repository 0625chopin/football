/**
 * 시즌 종료 시 밸런스 리포트 자동 생성 — 41일차(2026-09-15), Task 043
 *
 * 근거: `docs/team-schedule/03-데이터밸런싱배당팀.md` 41일차 행 "시즌 종료 시 밸런스
 * 리포트 자동 생성 — 승점 분포·부상률·이적률·부도율·OVR 분포·재정 건전성·평균 득점" /
 * 수락 기준 "시즌마다 리포트 1건". KPI-8 정의 원문은
 * `docs/require/01-project-overview.md` "① 시즌당 스폰서 부도율 ≤15% ② 승격팀 5시즌
 * 내 재강등률 40~70% ③ 경기당 평균 득점 2.5~3.0 ④ 홈 승률 42~48%". 소유: 3팀
 * `src/lib/obs/**`.
 *
 * ## 40·42일차와의 경계 (혼동 방지, `metrics.ts` 상단 주석과 대칭)
 * - 40일차 `metrics.ts`: **시스템 관측성**(NFR-OB-002) 지표 — 시뮬 소요·크론 성공률 등.
 *   장기 실행 프로세스의 링버퍼 최근값 집계다.
 * - 이 파일(41일차): **도메인/밸런스** 지표 — 시즌 1회성 스냅샷. 값이 서로 겹치지 않는다.
 * - 42일차 `alert.ts`: 이 두 파일이 만드는 스냅샷을 **소비**해 이상 탐지를 판단하는
 *   상위 레이어(예: 부도율이 이 리포트의 밴드를 벗어나면 경보).
 *
 * ## 순수 함수 — 조회는 호출자 책임
 * 이 모듈은 데이터소스를 읽지 않는다(`Math.random()`/`Date.now()`도 쓰지 않음 —
 * sim 밖이라 NFR-DT-001 대상은 아니지만 `metrics.ts`/`logger.ts`와 동일하게 `Clock`
 * 주입 패턴을 따른다). `generateBalanceReport(input, clock?)`가 이미 로드된 배열을
 * 받아 순수 계산만 한다 — Mock/Supabase 어댑터 중 어느 쪽에서 왔는지 이 파일은 모른다.
 *
 * ## 입력 설계 — 왜 `Player[]`·`Team[]`을 직접 받지 않나
 * OVR 분포는 선수 개별값이 아니라 `TeamSeasonStat.avgOvr`(팀별 평균)의 리그 내 분포로
 * 정의한다 — 경쟁 균형(밸런스) 관측이 목적이라 팀 단위가 소비처(5팀 어드민, 1팀 KPI-8
 * 확인) 요구와 더 맞고, `Player[]` 전량을 이 모듈까지 끌고 올 필요가 없어진다. 부상률·
 * 이적률의 분모도 같은 이유로 `TeamSeasonStat.squadSize` 합계를 쓴다(참조:
 * `stat.ts` E-22 주석 — "합산형만 저장" 원칙과 동일하게, 이 모듈도 이미 합산된 값을
 * 재조합할 뿐 원시 `Player`/`PlayerAttribute`를 순회하지 않는다).
 *
 * ## 승격팀 재강등률(KPI-8 ②) — 왜 `PromotionRecord` 투영 타입을 따로 두나
 * `TeamSeason`(E-05)은 `seasonId`만 갖고 `seasonNumber` 순서 정보가 없다(`Season`
 * 조인이 필요 — `stat.ts`의 `manager_name` 조인 사례와 동일 패턴, D-20 참조). 이 모듈은
 * sim/데이터 계층이 아니므로 `Season[]` 조회·조인 로직을 갖지 않고, 호출자가
 * `TeamSeason` × `Season`을 미리 조인해 `{ teamId, seasonNumber, promoted, relegated }`
 * 로 투영한 배열을 넘긴다. 재강등률은 "승격 시즌 + 5시즌"이 **이미 지난** 코호트만
 * 집계한다 — 아직 5시즌이 지나지 않은 최근 승격팀을 분모에 넣으면 통계가 왜곡된다
 * (미확정 코호트는 자동으로 제외되며, 집계 대상이 0건이면 `rate: null`).
 *
 * ## 소비처 (배선은 각 소비처 책임 — I-188 준수, 이 파일이 직접 호출하지 않는다)
 * - **5팀 어드민 대시보드**: 시즌 종료 시 이 리포트를 조회 화면에 노출 (42일차 인계 예정)
 * - **1팀 036 통합 테스트**: KPI-8 4지표 밴드 확인(`report.kpi8`)
 * - **3팀 자신**: 66·68·81일차 밸런싱 튜닝 루프(031b)가 20시즌 반복 시뮬 후 이 함수로
 *   리포트를 생성해 상수 조정 여부를 판단한다(R-01 — 밸런싱은 반복 루프).
 * - **42일차 `alert.ts`**: 부도율 초과 등 밴드 이탈을 이상 탐지 트리거로 소비할 수 있다
 *   (아직 배선 없음 — 필요해지면 42일차 담당이 직접 import).
 * 실제 "시즌 종료 이벤트에서 이 함수를 호출하는" 배선(크론/서버 액션)은 오늘 스코프
 * 밖이다 — `metrics.ts` 40일차 주석과 동일 사유(계약 고정이 목표, 전 팀 배선은 별도
 * 후속). 소비처 배선 담당이 미배정 상태이므로 팀장에게 이슈 후보로 보고한다.
 *
 * ## 서버/클라이언트 경계
 * `"use client"`를 붙이지 않는다 — `logger.ts`/`metrics.ts`와 동일 사유(RSC 경계에서
 * `"use client"` 모듈의 값을 서버 컴포넌트가 import하면 조용히 빈 값으로 치환되는
 * 38일차 함정, I-192 계열). 5팀 어드민이 서버 컴포넌트에서 리포트를 생성/조회하는
 * 경로를 막지 않기 위함이다.
 */

import type {
  Injury,
  Season,
  SeasonId,
  Sponsor,
  Standing,
  TeamId,
  TeamSeasonStat,
  Transfer,
} from "@/types";
import type { Clock } from "./logger";

export type { Clock } from "./logger";

/** 승격 이후 재강등 판정에 쓰는 시즌 창(윈도우). KPI-8 ②의 "5시즌 내"와 동일 값. */
export const PROMOTION_RELEGATION_WINDOW_SEASONS = 5;

/** KPI-8 4지표의 판정 밴드. 원문: `docs/require/01-project-overview.md` KPI-8 행. */
export const KPI8_BANDS = {
  sponsorBankruptcyRateMax: 0.15,
  promotedTeamRelegationRateMin: 0.4,
  promotedTeamRelegationRateMax: 0.7,
  avgGoalsPerMatchMin: 2.5,
  avgGoalsPerMatchMax: 3.0,
  homeWinRateMin: 0.42,
  homeWinRateMax: 0.48,
} as const;

/**
 * `TeamSeason`(E-05) × `Season`(E-03) 조인 결과의 투영. 호출자(조회 계층)가 만들어
 * 넘긴다 — 이 모듈은 `seasonId → seasonNumber` 해석을 하지 않는다(위 파일 헤더 참조).
 */
export interface PromotionRecord {
  readonly teamId: TeamId;
  readonly seasonNumber: number;
  readonly promoted: boolean;
  readonly relegated: boolean;
}

export interface BalanceReportInput {
  readonly season: Season;
  /** 이 시즌 최종 라운드(= `round === MAX(round)`) 순위 스냅샷 전량. 승점 분포의 원천. */
  readonly standings: readonly Standing[];
  /** 이 시즌 `TeamSeasonStat`(REGULAR) 전 팀. OVR 분포·평균 득점·재정 건전성·부상률·이적률 분모의 원천. */
  readonly teamSeasonStats: readonly TeamSeasonStat[];
  /** 이 시즌 발생한 부상 기록 전량(부상률 분자). */
  readonly injuries: readonly Injury[];
  /** 이 시즌 발생한 이적 기록 전량(이적률 분자). */
  readonly transfers: readonly Transfer[];
  /** 현재 존재하는 스폰서 풀 전량(부도율 분모 — `bankruptAtSeason`이 분자 판정). */
  readonly sponsors: readonly Sponsor[];
  /** 승격/강등 조인 이력 전량(과거~현재). 재강등률(KPI-8 ②) 코호트 판정용. */
  readonly promotionHistory: readonly PromotionRecord[];
}

/** 값 배열에 대한 기술 통계 + 고정 구간(bucket) 히스토그램. 표본 0건이면 전부 `null`/빈 배열. */
export interface Distribution {
  readonly count: number;
  readonly min: number | null;
  readonly max: number | null;
  readonly mean: number | null;
  readonly median: number | null;
  /** 오름차순 고정폭 구간. `count === 0`이면 빈 배열. */
  readonly buckets: readonly DistributionBucket[];
}

export interface DistributionBucket {
  /** 표시용 라벨(예: "40~44"). */
  readonly label: string;
  readonly rangeStart: number;
  /** 구간 상한(포함) — 마지막 구간만 포함, 그 외는 다음 구간과 경계 공유. */
  readonly rangeEnd: number;
  readonly count: number;
}

/** 비율 지표 공통 형태(부상률·이적률·부도율·홈승률). `metrics.ts`의 `RateStats`와 동형이나 도메인이 다르다. */
export interface RateStat {
  readonly numerator: number;
  readonly denominator: number;
  readonly rate: number | null;
}

/** 승격팀 재강등률(KPI-8 ②). `cohortSize === 0`이면(윈도우가 아직 안 닫힘) `rate: null`. */
export interface RelegationAfterPromotionStat {
  readonly windowSeasons: number;
  readonly cohortSize: number;
  readonly relegatedWithinWindowCount: number;
  readonly rate: number | null;
}

export interface FinancialHealthStat {
  readonly teamCount: number;
  /** `balance < 0`(부채 상태) 팀 수 — `Team.financialCrisis`와 별개로 이 시즌 원장 스냅샷만으로 판정. */
  readonly insolventTeamCount: number;
  readonly insolventRate: number | null;
  readonly avgBalance: number | null;
  /** 팀별 `seasonIncome - seasonExpense` 평균. */
  readonly avgSeasonNet: number | null;
  /** 팀별 `wageBill / seasonIncome` 평균(수입 0이면 그 팀은 평균에서 제외). */
  readonly avgWageToIncomeRatio: number | null;
}

export type Kpi8BandStatus = "in-band" | "out-of-band" | "insufficient-data";

export interface Kpi8Indicator {
  readonly value: number | null;
  readonly status: Kpi8BandStatus;
}

/** KPI-8 4지표 밴드 판정. `docs/require/01-project-overview.md` KPI-8 원문 순서(①~④)와 동일하게 배열한다. */
export interface Kpi8Report {
  readonly sponsorBankruptcyRate: Kpi8Indicator;
  readonly promotedTeamRelegationRate: Kpi8Indicator;
  readonly avgGoalsPerMatch: Kpi8Indicator;
  readonly homeWinRate: Kpi8Indicator;
}

/**
 * `/admin`(5팀)·1팀 036·3팀 자신(031b 튜닝 루프)이 그대로 렌더링/판정할 수 있는 고정
 * 계약. 필드를 고치면 소비 코드가 깨지므로, 늘어날 지표는 별도 후속 계약(버전)으로
 * 추가한다(`metrics.ts` `MetricsSnapshot` 주석과 동일 원칙).
 */
export interface BalanceReport {
  readonly seasonId: SeasonId;
  readonly seasonNumber: number;
  /** 승점 분포 — `standings[].points` 히스토그램. */
  readonly pointsDistribution: Distribution;
  /** 부상률 = 이 시즌 부상 발생 건수 / 전체 스쿼드 인원(팀별 `squadSize` 합). */
  readonly injuryRate: RateStat;
  /** 이적률 = 이 시즌 이적 건수 / 전체 스쿼드 인원(위와 동일 분모). */
  readonly transferRate: RateStat;
  /** 부도율(KPI-8 ①) = 이 시즌 `bankruptAtSeason` 스폰서 수 / 전체 스폰서 수. */
  readonly sponsorBankruptcyRate: RateStat;
  /** OVR 분포 — 팀별 `avgOvr` 히스토그램(선수 개별값 아님, 위 파일 헤더 참조). */
  readonly ovrDistribution: Distribution;
  readonly financialHealth: FinancialHealthStat;
  /** 경기당 평균 득점(KPI-8 ③) — 팀 시점이 아니라 매치 시점(양 팀 합산)으로 정규화. */
  readonly avgGoalsPerMatch: number | null;
  readonly kpi8: Kpi8Report;
  /** 리포트 산출 시각(ISO). 주입된 `Clock` 기준. */
  readonly generatedAt: string;
}

const defaultClock: Clock = () => new Date().toISOString();
const DEFAULT_BUCKET_COUNT = 8;

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** 고정폭 구간 히스토그램. 최소값=최대값이면(전 표본 동일값) 구간 1개로 전량을 담는다. */
function buildDistribution(
  values: readonly number[],
  bucketCount: number = DEFAULT_BUCKET_COUNT,
): Distribution {
  if (values.length === 0) {
    return { count: 0, min: null, max: null, mean: null, median: null, buckets: [] };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  if (span === 0) {
    return {
      count: values.length,
      min,
      max,
      mean: mean(values),
      median: median(values),
      buckets: [
        { label: `${min}`, rangeStart: min, rangeEnd: max, count: values.length },
      ],
    };
  }

  const width = span / bucketCount;
  const buckets: DistributionBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const rangeStart = min + i * width;
    const rangeEnd = i === bucketCount - 1 ? max : min + (i + 1) * width;
    return {
      label: `${rangeStart.toFixed(1)}~${rangeEnd.toFixed(1)}`,
      rangeStart,
      rangeEnd,
      count: 0,
    };
  });

  for (const value of values) {
    const rawIndex = Math.floor((value - min) / width);
    const index = Math.min(bucketCount - 1, Math.max(0, rawIndex));
    buckets[index] = { ...buckets[index], count: buckets[index].count + 1 };
  }

  return {
    count: values.length,
    min,
    max,
    mean: mean(values),
    median: median(values),
    buckets,
  };
}

function rateStat(numerator: number, denominator: number): RateStat {
  return { numerator, denominator, rate: denominator === 0 ? null : numerator / denominator };
}

function computeRelegationAfterPromotion(
  promotionHistory: readonly PromotionRecord[],
  currentSeasonNumber: number,
  windowSeasons: number = PROMOTION_RELEGATION_WINDOW_SEASONS,
): RelegationAfterPromotionStat {
  const byTeam = new Map<TeamId, PromotionRecord[]>();
  for (const record of promotionHistory) {
    const list = byTeam.get(record.teamId) ?? [];
    list.push(record);
    byTeam.set(record.teamId, list);
  }

  let cohortSize = 0;
  let relegatedWithinWindowCount = 0;

  for (const [, records] of byTeam) {
    for (const promotion of records) {
      if (!promotion.promoted) continue;
      const windowEnd = promotion.seasonNumber + windowSeasons;
      // 윈도우가 아직 안 닫혔으면(미래 시즌 데이터가 없을 수 있음) 코호트에서 제외한다.
      if (windowEnd > currentSeasonNumber) continue;

      cohortSize += 1;
      const relegatedWithinWindow = records.some(
        (r) =>
          r.relegated &&
          r.seasonNumber > promotion.seasonNumber &&
          r.seasonNumber <= windowEnd,
      );
      if (relegatedWithinWindow) relegatedWithinWindowCount += 1;
    }
  }

  return {
    windowSeasons,
    cohortSize,
    relegatedWithinWindowCount,
    rate: cohortSize === 0 ? null : relegatedWithinWindowCount / cohortSize,
  };
}

function computeFinancialHealth(stats: readonly TeamSeasonStat[]): FinancialHealthStat {
  const teamCount = stats.length;
  if (teamCount === 0) {
    return {
      teamCount: 0,
      insolventTeamCount: 0,
      insolventRate: null,
      avgBalance: null,
      avgSeasonNet: null,
      avgWageToIncomeRatio: null,
    };
  }

  const insolventTeamCount = stats.filter((s) => s.balance < 0).length;
  const balances = stats.map((s) => s.balance);
  const nets = stats.map((s) => s.seasonIncome - s.seasonExpense);
  const wageRatios = stats
    .filter((s) => s.seasonIncome > 0)
    .map((s) => s.wageBill / s.seasonIncome);

  return {
    teamCount,
    insolventTeamCount,
    insolventRate: insolventTeamCount / teamCount,
    avgBalance: mean(balances),
    avgSeasonNet: mean(nets),
    avgWageToIncomeRatio: wageRatios.length === 0 ? null : mean(wageRatios),
  };
}

function bandStatus(value: number | null, min: number, max: number): Kpi8BandStatus {
  if (value === null) return "insufficient-data";
  return value >= min && value <= max ? "in-band" : "out-of-band";
}

function computeKpi8(
  sponsorBankruptcyRate: RateStat,
  relegation: RelegationAfterPromotionStat,
  avgGoalsPerMatch: number | null,
  homeWinRate: RateStat,
): Kpi8Report {
  return {
    sponsorBankruptcyRate: {
      value: sponsorBankruptcyRate.rate,
      status: bandStatus(sponsorBankruptcyRate.rate, 0, KPI8_BANDS.sponsorBankruptcyRateMax),
    },
    promotedTeamRelegationRate: {
      value: relegation.rate,
      status: bandStatus(
        relegation.rate,
        KPI8_BANDS.promotedTeamRelegationRateMin,
        KPI8_BANDS.promotedTeamRelegationRateMax,
      ),
    },
    avgGoalsPerMatch: {
      value: avgGoalsPerMatch,
      status: bandStatus(
        avgGoalsPerMatch,
        KPI8_BANDS.avgGoalsPerMatchMin,
        KPI8_BANDS.avgGoalsPerMatchMax,
      ),
    },
    homeWinRate: {
      value: homeWinRate.rate,
      status: bandStatus(homeWinRate.rate, KPI8_BANDS.homeWinRateMin, KPI8_BANDS.homeWinRateMax),
    },
  };
}

/**
 * 시즌 1건의 밸런스 리포트를 생성한다. 순수 함수 — 입력 배열만으로 계산하며 부수효과가
 * 없다(데이터소스 조회·로깅은 호출자 책임).
 */
export function generateBalanceReport(
  input: BalanceReportInput,
  clock: Clock = defaultClock,
): BalanceReport {
  const { season, standings, teamSeasonStats, injuries, transfers, sponsors, promotionHistory } =
    input;

  const squadSizeTotal = teamSeasonStats.reduce((sum, s) => sum + s.squadSize, 0);

  const totalGoals = teamSeasonStats.reduce((sum, s) => sum + s.goalsFor, 0);
  // played는 팀 단위 카운트라 경기 1건당 두 번(홈/원정 각 팀) 집계된다 — 매치 수로
  // 정규화하려면 2로 나눈다(위 파일 헤더 "입력 설계" 절 avgGoalsPerMatch 정의 참조).
  const totalTeamMatches = teamSeasonStats.reduce((sum, s) => sum + s.played, 0);
  const matchCount = totalTeamMatches / 2;
  const avgGoalsPerMatch = matchCount === 0 ? null : totalGoals / matchCount;

  const homeWins = teamSeasonStats.reduce((sum, s) => sum + s.homeRecord.wins, 0);
  const homePlayed = teamSeasonStats.reduce((sum, s) => sum + s.homeRecord.played, 0);
  const homeWinRate = rateStat(homeWins, homePlayed);

  const bankruptSponsors = sponsors.filter((s) => s.bankruptAtSeason === season.seasonNumber);
  const sponsorBankruptcyRate = rateStat(bankruptSponsors.length, sponsors.length);

  const relegation = computeRelegationAfterPromotion(promotionHistory, season.seasonNumber);

  return {
    seasonId: season.id,
    seasonNumber: season.seasonNumber,
    pointsDistribution: buildDistribution(standings.map((s) => s.points)),
    injuryRate: rateStat(injuries.length, squadSizeTotal),
    transferRate: rateStat(transfers.length, squadSizeTotal),
    sponsorBankruptcyRate,
    ovrDistribution: buildDistribution(teamSeasonStats.map((s) => s.avgOvr)),
    financialHealth: computeFinancialHealth(teamSeasonStats),
    avgGoalsPerMatch,
    kpi8: computeKpi8(sponsorBankruptcyRate, relegation, avgGoalsPerMatch, homeWinRate),
    generatedAt: clock(),
  };
}
