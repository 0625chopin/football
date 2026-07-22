import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import { formatPoints } from "@/i18n/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Points, TeamSeasonStat } from "@/types";

/**
 * F5 재정 패널(`06-클럽상세.md`) — 52일차, 화면 로컬(5팀). `TeamSeasonStat`(F4와 동일
 * 소스, `getTeamSeasonStat`)의 재정 그룹 필드를 그대로 보여준다 — F4처럼 항상 `null`이라
 * 사실상 empty로 렌더된다(같은 데이터 계층 갭, `SeasonStatPanel.tsx` 헤더 참조).
 *
 * **재정 위기 배지 조건 — 휴리스틱**: FR-EC-012 "재정 위기"에 대응하는 명시 boolean 필드가
 * `TeamSeasonStat`에 없다. `Sponsor.balance < 0`을 부도 위험 조건으로 쓰는 `/sponsors`
 * 화면(4팀, 46일차) 선례를 좇아 `balance < 0`을 재정 위기로 판정한다 — 정식 필드가
 * 추가되면 이 휴리스틱을 교체해야 한다(이슈 후보).
 */

export interface FinancePanelProps {
  readonly locale: SupportedLocale;
  readonly stat: TeamSeasonStat | null;
}

export function FinancePanel({ locale, stat }: FinancePanelProps) {
  if (stat === null) {
    return <p className="text-sm text-muted-foreground">{t(locale, "team.finance.empty")}</p>;
  }

  const net = stat.seasonIncome - stat.seasonExpense;
  const wageRatioPct = stat.seasonIncome > 0 ? Math.round((stat.wageBill / stat.seasonIncome) * 100) : null;
  const transferBalance = stat.transferIncome - stat.transferSpend;
  const isCrisis = stat.balance < 0;

  return (
    <div className="flex flex-col gap-2 text-sm">
      <Row label={t(locale, "team.finance.balanceLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.balance, locale) })} />
      <Row label={t(locale, "team.finance.seasonIncomeLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.seasonIncome, locale) })} />
      <Row label={t(locale, "team.finance.seasonExpenseLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.seasonExpense, locale) })} />
      <p className="scoreboard">
        {t(locale, "team.finance.netFormat", { sign: net >= 0 ? "▲" : "▼", amount: formatPoints(Math.abs(net) as Points, locale) })}
      </p>
      <Row label={t(locale, "team.finance.wageBillLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.wageBill, locale) })} />
      {wageRatioPct !== null && <p className="text-xs text-muted-foreground">{t(locale, "team.finance.wageRatioFormat", { pct: wageRatioPct })}</p>}
      <Row label={t(locale, "team.finance.transferSpendLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.transferSpend, locale) })} />
      <Row label={t(locale, "team.finance.transferIncomeLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.transferIncome, locale) })} />
      <p className="scoreboard text-xs">
        {t(locale, "team.finance.transferBalanceFormat", {
          sign: transferBalance >= 0 ? "▲" : "▼",
          amount: formatPoints(Math.abs(transferBalance) as Points, locale),
        })}
      </p>
      <Row label={t(locale, "team.finance.sponsorIncomeLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.sponsorIncome, locale) })} />
      <Row label={t(locale, "team.finance.sponsorPayoutLabel")} value={t(locale, "team.finance.pointsFormat", { amount: formatPoints(stat.sponsorPayout, locale) })} />

      <div>
        {isCrisis ? (
          <Badge variant="outline" className={cn("gap-1 border-warning bg-warning text-warning-foreground")}>
            <span aria-hidden>⚠</span>
            {t(locale, "team.finance.statusCrisis")}
          </Badge>
        ) : (
          <Badge variant="secondary">
            <span aria-hidden>◆</span>
            {t(locale, "team.finance.statusNormal")}
          </Badge>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="scoreboard tabular-nums">{value}</span>
    </div>
  );
}
