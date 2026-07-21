import { describe, expect, it } from "vitest";
import type {
  Injury,
  Season,
  SeasonId,
  Sponsor,
  Standing,
  TeamId,
  TeamSeasonStat,
} from "@/types";
import {
  generateBalanceReport,
  KPI8_BANDS,
  type BalanceReportInput,
  type PromotionRecord,
} from "./balance-report";

function season(overrides: Partial<Season> = {}): Season {
  return {
    id: "season-1" as SeasonId,
    seasonNumber: 10,
    seasonSeed: 1 as Season["seasonSeed"],
    phase: "SETTLEMENT",
    regularStartedAt: null,
    regularEndsAt: null,
    startedAt: null,
    endedAt: null,
    snapshotId: null,
    ...overrides,
  };
}

function standing(overrides: Partial<Standing> = {}): Standing {
  return {
    seasonId: "season-1" as SeasonId,
    leagueId: "league-1" as Standing["leagueId"],
    round: 38,
    teamId: "team-1" as TeamId,
    rank: 1,
    played: 38,
    won: 20,
    drawn: 10,
    lost: 8,
    gf: 60,
    ga: 40,
    gd: 20,
    points: 70,
    form: "WWDLW",
    fairPlayScore: 90,
    tiebreakApplied: null,
    ...overrides,
  };
}

function teamSeasonStat(overrides: Partial<TeamSeasonStat> = {}): TeamSeasonStat {
  return {
    teamId: "team-1" as TeamId,
    seasonId: "season-1" as SeasonId,
    competitionType: "LEAGUE",
    leagueId: "league-1" as TeamSeasonStat["leagueId"],
    played: 38,
    wins: 20,
    draws: 10,
    losses: 8,
    points: 70,
    goalsFor: 60,
    goalsAgainst: 40,
    homeRecord: { played: 19, wins: 12, draws: 4, losses: 3, goalsFor: 34, goalsAgainst: 18 },
    awayRecord: { played: 19, wins: 8, draws: 6, losses: 5, goalsFor: 26, goalsAgainst: 22 },
    cleanSheets: 10,
    failedToScore: 3,
    biggestWin: null,
    biggestLoss: null,
    currentForm: "WWDLW",
    longestWinStreak: 5,
    longestUnbeaten: 10,
    shots: 400,
    shotsOnTarget: 180,
    xgFor: 58,
    xgAgainst: 42,
    scoringByPeriod: {},
    concedingByPeriod: {},
    setPieceGoals: 8,
    openPlayGoals: 48,
    penaltyGoals: 4,
    possessionAvg: 52,
    fouls: 300,
    yellowCards: 60,
    redCards: 2,
    fairPlayScore: 90,
    squadSize: 25,
    avgAge: 26,
    avgOvr: 70,
    avgCondition: 90,
    squadMarketValue: 1000 as TeamSeasonStat["squadMarketValue"],
    injuriesActive: 2,
    suspensionsActive: 1,
    minutesDistribution: {},
    balance: 500 as TeamSeasonStat["balance"],
    seasonIncome: 300 as TeamSeasonStat["seasonIncome"],
    seasonExpense: 250 as TeamSeasonStat["seasonExpense"],
    wageBill: 200 as TeamSeasonStat["wageBill"],
    transferSpend: 50 as TeamSeasonStat["transferSpend"],
    transferIncome: 20 as TeamSeasonStat["transferIncome"],
    sponsorIncome: 80 as TeamSeasonStat["sponsorIncome"],
    sponsorPayout: 0 as TeamSeasonStat["sponsorPayout"],
    reputation: 60,
    fanBase: 50000,
    academyLevel: 3,
    trophiesLeague: 0,
    trophiesPlayoff: 0,
    trophiesCup: 0,
    seasonsInTier1: 5,
    seasonsInTier2: 0,
    seasonsInTier3: 0,
    ...overrides,
  };
}

function sponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: "sponsor-1" as Sponsor["id"],
    name: "Sponsor A",
    industry: "tech",
    scale: 3,
    balance: 1000 as Sponsor["balance"],
    reputation: 50,
    bankruptAtSeason: null,
    ...overrides,
  };
}

const baseInput: BalanceReportInput = {
  season: season(),
  standings: [standing()],
  teamSeasonStats: [teamSeasonStat()],
  injuries: [],
  transfers: [],
  sponsors: [sponsor()],
  promotionHistory: [],
};

describe("generateBalanceReport", () => {
  it("clock을 주입하면 generatedAt에 그대로 반영된다", () => {
    const report = generateBalanceReport(baseInput, () => "T0");
    expect(report.generatedAt).toBe("T0");
    expect(report.seasonId).toBe("season-1");
    expect(report.seasonNumber).toBe(10);
  });

  it("표본이 1건이면 승점/OVR 분포는 count 1 · min=max=mean=median이다", () => {
    const report = generateBalanceReport(baseInput, () => "T0");
    expect(report.pointsDistribution.count).toBe(1);
    expect(report.pointsDistribution.min).toBe(70);
    expect(report.pointsDistribution.max).toBe(70);
    expect(report.pointsDistribution.mean).toBe(70);
    expect(report.ovrDistribution.buckets.reduce((s, b) => s + b.count, 0)).toBe(1);
  });

  it("부상률·이적률 분모는 팀별 squadSize 합이다", () => {
    const injuries: Injury[] = [
      {
        id: "injury-1" as Injury["id"],
        playerId: "player-1" as Injury["playerId"],
        matchId: null,
        seasonId: "season-1" as SeasonId,
        severity: "MINOR",
        typeLabel: "햄스트링",
        occurredRound: 5,
        roundsOut: 2,
        returnRound: 7,
        status: "RECOVERED",
      },
    ];
    const report = generateBalanceReport({ ...baseInput, injuries }, () => "T0");
    expect(report.injuryRate).toEqual({ numerator: 1, denominator: 25, rate: 1 / 25 });
    expect(report.transferRate).toEqual({ numerator: 0, denominator: 25, rate: 0 });
  });

  it("부도율 = 이 시즌 bankruptAtSeason 스폰서 수 / 전체 스폰서 수 (KPI-8 ①)", () => {
    const sponsors = [
      sponsor({ id: "sponsor-1" as Sponsor["id"], bankruptAtSeason: 10 }),
      sponsor({ id: "sponsor-2" as Sponsor["id"], bankruptAtSeason: null }),
    ];
    const report = generateBalanceReport({ ...baseInput, sponsors }, () => "T0");
    expect(report.sponsorBankruptcyRate).toEqual({ numerator: 1, denominator: 2, rate: 0.5 });
    expect(report.kpi8.sponsorBankruptcyRate.status).toBe("out-of-band");
    expect(0.5).toBeGreaterThan(KPI8_BANDS.sponsorBankruptcyRateMax);
  });

  it("경기당 평균 득점은 팀 합산 played를 2로 나눠 매치 단위로 정규화한다 (KPI-8 ③)", () => {
    const stats = [
      teamSeasonStat({ teamId: "team-1" as TeamId, played: 2, goalsFor: 5 }),
      teamSeasonStat({ teamId: "team-2" as TeamId, played: 2, goalsFor: 3 }),
    ];
    // 2팀 2경기(각자 2경기 소화 = 매치 2건), 총 득점 8골 → 매치당 4골
    const report = generateBalanceReport({ ...baseInput, teamSeasonStats: stats }, () => "T0");
    expect(report.avgGoalsPerMatch).toBe(4);
    expect(report.kpi8.avgGoalsPerMatch.status).toBe("out-of-band");
  });

  it("홈 승률은 팀별 homeRecord 합산으로 계산된다", () => {
    const stats = [
      teamSeasonStat({
        teamId: "team-1" as TeamId,
        homeRecord: { played: 10, wins: 5, draws: 2, losses: 3, goalsFor: 15, goalsAgainst: 10 },
      }),
    ];
    const report = generateBalanceReport({ ...baseInput, teamSeasonStats: stats }, () => "T0");
    expect(report.kpi8.homeWinRate.value).toBe(0.5);
  });

  it("표본이 전혀 없으면(빈 리그) 전 비율 필드가 null이고 분포 count는 0이다", () => {
    const report = generateBalanceReport(
      { ...baseInput, standings: [], teamSeasonStats: [], sponsors: [] },
      () => "T0",
    );
    expect(report.pointsDistribution).toEqual({
      count: 0,
      min: null,
      max: null,
      mean: null,
      median: null,
      buckets: [],
    });
    expect(report.sponsorBankruptcyRate.rate).toBeNull();
    expect(report.avgGoalsPerMatch).toBeNull();
    expect(report.financialHealth.insolventRate).toBeNull();
    expect(report.kpi8.avgGoalsPerMatch.status).toBe("insufficient-data");
  });

  it("재정 건전성 — balance<0 팀을 부채 상태로 집계한다", () => {
    const stats = [
      teamSeasonStat({ teamId: "team-1" as TeamId, balance: -100 as TeamSeasonStat["balance"] }),
      teamSeasonStat({ teamId: "team-2" as TeamId, balance: 200 as TeamSeasonStat["balance"] }),
    ];
    const report = generateBalanceReport({ ...baseInput, teamSeasonStats: stats }, () => "T0");
    expect(report.financialHealth.teamCount).toBe(2);
    expect(report.financialHealth.insolventTeamCount).toBe(1);
    expect(report.financialHealth.insolventRate).toBe(0.5);
  });

  it("재강등률(KPI-8 ②) — 윈도우가 닫힌 코호트만 집계하고, 안 닫힌 최근 승격은 제외한다", () => {
    const promotionHistory: PromotionRecord[] = [
      // team-1: 시즌 3에 승격, 시즌 5에 강등 → 윈도우(3~8) 내 강등, currentSeason=10이라 닫힘
      { teamId: "team-1" as TeamId, seasonNumber: 3, promoted: true, relegated: false },
      { teamId: "team-1" as TeamId, seasonNumber: 5, promoted: false, relegated: true },
      // team-2: 시즌 4에 승격, 강등 기록 없음 → 윈도우(4~9) 닫힘, 잔류로 집계
      { teamId: "team-2" as TeamId, seasonNumber: 4, promoted: true, relegated: false },
      // team-3: 시즌 8에 승격 → 윈도우(8~13)가 currentSeason=10보다 뒤라 코호트 제외
      { teamId: "team-3" as TeamId, seasonNumber: 8, promoted: true, relegated: false },
    ];
    const report = generateBalanceReport({ ...baseInput, promotionHistory }, () => "T0");
    expect(report.kpi8.promotedTeamRelegationRate.value).toBe(0.5); // 2건 중 1건 강등
  });
});
