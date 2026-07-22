"use client";

import type { ReactNode } from "react";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { TeamSeasonStat } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * F4 시즌 지표(`06-클럽상세.md`) — 52일차, 화면 로컬(5팀). FR-ST-002 전량을 그룹 탭 5종으로
 * 분할한다(W-30 초안 채택 — 팀장 승인 전이라도 와이어프레임 목업이 이미 이 형태라 그대로
 * 구현, 승인 대기는 이슈로만 추적).
 *
 * **파생값은 여기서 계산한다**(TeamSeasonStat 파일 헤더 "저장분/파생분 구분" 원칙 — 득실차·
 * PPG·정확도·xG차·경기당 득실은 저장하지 않고 조회 시점 계산).
 *
 * **`getTeamSeasonStat`가 항상 `null`을 반환한다**(MockDataSource, 클럽 시즌 지표 생성기
 * 없음 — 21일차 이후 미착수, 팀장 51~52일차 확인). 이 컴포넌트는 그 상태를 정직하게
 * empty로 표시한다 — 버그가 아니라 데이터 계층 갭(이슈 후보로 보고).
 *
 * **패스·수비 탭의 패스 정확도·태클 성공률·인터셉트 미표기** — `TeamSeasonStat`(E-22)는
 * 이 세 값을 저장하지 않는다(파일 헤더: `PlayerSeasonStat` 스쿼드 합계에서 파생 가능하다는
 * 설계 의도이나, 그 합산 계약이 `DataSource`에 없음). 저장된 `possessionAvg`와 파생 가능한
 * 경기당 실점·시간대별 실점만 표시한다(이슈 후보).
 */

const GROUPS = ["results", "attack", "passDefense", "discipline", "squad"] as const;
type Group = (typeof GROUPS)[number];

const GROUP_LABEL_KEY: Record<Group, "team.season.tabResults" | "team.season.tabAttack" | "team.season.tabPassDefense" | "team.season.tabDiscipline" | "team.season.tabSquad"> = {
  results: "team.season.tabResults",
  attack: "team.season.tabAttack",
  passDefense: "team.season.tabPassDefense",
  discipline: "team.season.tabDiscipline",
  squad: "team.season.tabSquad",
};

export interface SeasonStatPanelProps {
  readonly locale: SupportedLocale;
  readonly stat: TeamSeasonStat | null;
}

export function SeasonStatPanel({ locale, stat }: SeasonStatPanelProps) {
  if (stat === null) {
    return <p className="text-sm text-muted-foreground">{t(locale, "team.season.empty")}</p>;
  }

  const goalDifference = stat.goalsFor - stat.goalsAgainst;
  const ppg = stat.played > 0 ? stat.points / stat.played : 0;
  const shotAccuracyPct = stat.shots > 0 ? Math.round((stat.shotsOnTarget / stat.shots) * 100) : null;
  const xgDiff = stat.xgFor - stat.xgAgainst;
  const goalsPerGame = stat.played > 0 ? stat.goalsFor / stat.played : 0;
  const goalsConcededPerGame = stat.played > 0 ? stat.goalsAgainst / stat.played : 0;

  return (
    <Tabs defaultValue="results">
      <TabsList>
        {GROUPS.map((group) => (
          <TabsTrigger key={group} value={group}>
            {t(locale, GROUP_LABEL_KEY[group])}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="results">
        <div className="flex flex-col gap-1.5 text-sm">
          <Row>{t(locale, "team.season.playedFormat", { played: stat.played, wins: stat.wins, draws: stat.draws, losses: stat.losses })}</Row>
          <Row>{t(locale, "team.season.pointsFormat", { points: stat.points })}</Row>
          <Row>
            {t(locale, "team.season.goalsFormat", {
              goalsFor: stat.goalsFor,
              goalsAgainst: stat.goalsAgainst,
              goalDifference: signed(goalDifference),
            })}
          </Row>
          <Row>{t(locale, "team.season.ppgFormat", { value: ppg.toFixed(2) })}</Row>
          <Row>{t(locale, "team.season.homeRecordFormat", { wins: stat.homeRecord.wins, draws: stat.homeRecord.draws, losses: stat.homeRecord.losses })}</Row>
          <Row>{t(locale, "team.season.awayRecordFormat", { wins: stat.awayRecord.wins, draws: stat.awayRecord.draws, losses: stat.awayRecord.losses })}</Row>
          <LabelValue label={t(locale, "team.season.cleanSheetsLabel")} value={stat.cleanSheets} />
          <LabelValue label={t(locale, "team.season.failedToScoreLabel")} value={stat.failedToScore} />
          <LabelValue label={t(locale, "team.season.longestWinStreakLabel")} value={stat.longestWinStreak} />
          <LabelValue label={t(locale, "team.season.longestUnbeatenLabel")} value={stat.longestUnbeaten} />
        </div>
      </TabsContent>

      <TabsContent value="attack">
        <div className="flex flex-col gap-1.5 text-sm">
          <LabelValue label={t(locale, "team.season.shotsLabel")} value={stat.shots} />
          <LabelValue label={t(locale, "team.season.shotsOnTargetLabel")} value={stat.shotsOnTarget} />
          {shotAccuracyPct !== null && <Row>{t(locale, "team.season.shotAccuracyFormat", { pct: shotAccuracyPct })}</Row>}
          <LabelValue label={t(locale, "team.season.xgForLabel")} value={stat.xgFor.toFixed(1)} />
          <LabelValue label={t(locale, "team.season.xgAgainstLabel")} value={stat.xgAgainst.toFixed(1)} />
          <Row>{t(locale, "team.season.xgDiffFormat", { value: signedDecimal(xgDiff) })}</Row>
          <Row>{t(locale, "team.season.goalsPerGameFormat", { value: goalsPerGame.toFixed(2) })}</Row>
          <LabelValue label={t(locale, "team.season.setPieceGoalsLabel")} value={stat.setPieceGoals} />
          <LabelValue label={t(locale, "team.season.openPlayGoalsLabel")} value={stat.openPlayGoals} />
          <LabelValue label={t(locale, "team.season.penaltyGoalsLabel")} value={stat.penaltyGoals} />
          <PeriodDistribution locale={locale} titleKey="team.season.scoringByPeriodTitle" record={stat.scoringByPeriod} />
        </div>
      </TabsContent>

      <TabsContent value="passDefense">
        <div className="flex flex-col gap-1.5 text-sm">
          <Row>{t(locale, "team.season.possessionAvgFormat", { pct: stat.possessionAvg })}</Row>
          <Row>{t(locale, "team.season.goalsConcededPerGameFormat", { value: goalsConcededPerGame.toFixed(2) })}</Row>
          <PeriodDistribution locale={locale} titleKey="team.season.concedingByPeriodTitle" record={stat.concedingByPeriod} />
        </div>
      </TabsContent>

      <TabsContent value="discipline">
        <div className="flex flex-col gap-1.5 text-sm">
          <LabelValue label={t(locale, "team.season.foulsLabel")} value={stat.fouls} />
          <LabelValue label={t(locale, "team.season.yellowCardsLabel")} value={stat.yellowCards} />
          <LabelValue label={t(locale, "team.season.redCardsLabel")} value={stat.redCards} />
          <LabelValue label={t(locale, "team.season.fairPlayScoreLabel")} value={stat.fairPlayScore} />
        </div>
      </TabsContent>

      <TabsContent value="squad">
        <div className="flex flex-col gap-1.5 text-sm">
          <Row>{t(locale, "team.season.squadSizeFormat", { count: stat.squadSize })}</Row>
          <Row>{t(locale, "team.season.avgAgeFormat", { value: stat.avgAge.toFixed(1) })}</Row>
          <Row>{t(locale, "team.season.avgOvrFormat", { value: stat.avgOvr.toFixed(1) })}</Row>
          <Row>{t(locale, "team.season.avgConditionFormat", { value: stat.avgCondition.toFixed(1) })}</Row>
          <LabelValue label={t(locale, "team.season.squadMarketValueLabel")} value={stat.squadMarketValue} numeric />
          <Row>{t(locale, "team.season.injuriesActiveFormat", { count: stat.injuriesActive })}</Row>
          <Row>{t(locale, "team.season.suspensionsActiveFormat", { count: stat.suspensionsActive })}</Row>
          <PeriodDistribution locale={locale} titleKey="team.season.minutesDistributionTitle" record={stat.minutesDistribution} />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function signedDecimal(value: number): string {
  const rounded = value.toFixed(1);
  return value > 0 ? `+${rounded}` : rounded;
}

function Row({ children }: { readonly children: ReactNode }) {
  return <p className="scoreboard">{children}</p>;
}

function LabelValue({ label, value, numeric }: { readonly label: string; readonly value: string | number; readonly numeric?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={numeric ? "scoreboard tabular-nums" : "tabular-nums"}>{value}</span>
    </div>
  );
}

/**
 * F4-p 시간대별 분포(W-31 — 소유 미정, 오늘은 화면 로컬로 구현). 차트 라이브러리 없이
 * 구간별 텍스트 표(NFR-A11Y-005 대체 텍스트 요구를 별도 sr-only 없이 본문 자체로 충족).
 */
function PeriodDistribution({
  locale,
  titleKey,
  record,
}: {
  readonly locale: SupportedLocale;
  readonly titleKey: "team.season.scoringByPeriodTitle" | "team.season.concedingByPeriodTitle" | "team.season.minutesDistributionTitle";
  readonly record: Readonly<Record<string, number>>;
}) {
  const entries = Object.entries(record).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return (
    <div className="flex flex-col gap-1 border-t border-border pt-2">
      <span className="eyebrow text-muted-foreground">{t(locale, titleKey)}</span>
      {entries.length === 0 ? (
        <span className="text-xs text-muted-foreground">{t(locale, "team.season.periodEmpty")}</span>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {entries.map(([period, count]) => (
            <span key={period} className="scoreboard tabular-nums">
              {t(locale, "team.season.periodEntryFormat", { period, count })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
