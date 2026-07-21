import Link from "next/link";

import { formatPoints } from "@/i18n/format";
import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/keys";
import type { Loan, TeamId, Transfer } from "@/types";

/**
 * E9 `[이적]` 탭 — `TransferHistoryList`. 와이어프레임 05번 §8 컴포넌트 표에 명시된
 * 화면 로컬 신규 컴포넌트(5팀). `Transfer`(E-13)와 `Loan`(E-14)은 서로 다른 엔티티지만
 * 화면에서는 시간순 커리어 한 줄로 합쳐 보여준다("이적 전후 클럽·이적료·유형(이적/임대/
 * FA/방출)", 영역 명세 E9) — `Loan`은 `TransferType`에 대응 값이 없으므로(D-21, 별도
 * 축) 이 컴포넌트가 조립 시점에 `"LOAN"` kind를 얹는다.
 *
 * ## 이적료(fee) — 단위 pt(L-03)
 * `Loan`에는 이적료 필드가 없다(임대료 분배율 `wageSharePct`만 있음, `economy.ts` 참조).
 * 임대 행은 이적료 열을 비워 두고(`—`), 임대료 분배율만 보조 텍스트로 보여준다.
 *
 * ## 클럽 링크(I-8)
 * `fromTeamId`/`toTeamId`(또는 `ownerTeamId`/`loanTeamId`)를 소비처(`page.tsx`)가 이미
 * 해석한 `teamNameById: ReadonlyMap<TeamId, string>`을 받아 이름 + `/teams/[teamId]`
 * 링크를 함께 그린다 — 이름 해석 자체는 이 컴포넌트 책임 밖(`EventTimelineItem` 선례와
 * 동일 이유, ID→표시명은 여러 항목을 함께 보는 리스트 컨테이너가 아니라 그 상위 페이지가
 * 배치 조회로 처리). 맵에 없는(FA 등) `fromTeamId === null`은 `player.profile.freeAgentBadge`
 * ("무소속")로 대체한다 — 새 키를 만들지 않고 E1과 같은 개념을 재사용한다(C-6 준용).
 */

export interface TransferHistoryRow {
  readonly key: string;
  readonly seasonLabel: string;
  readonly seasonNumber: number;
  readonly kind: "LOAN" | Transfer["type"];
  readonly fromTeamId: TeamId | null;
  readonly toTeamId: TeamId;
  /** LOAN이면 null(위 헤더 주석 — 임대는 이적료 필드가 없음) */
  readonly fee: Transfer["fee"] | null;
}

/**
 * `Transfer[]`·`Loan[]`을 하나의 시간순 리스트로 합치는 순수 함수. 두 엔티티는 서로
 * 다른 배열로 들어오므로(각자 다른 정렬 상태일 수 있음) 병합 후 `seasonNumber` 내림차순
 * (최신 우선)으로 다시 정렬한다 — 시즌이 같으면 이적을 임대보다 앞에 둔다(임의 규칙이지만
 * 결정적이어야 렌더 순서가 흔들리지 않는다). 원본 배열은 변경하지 않는다.
 */
export function buildTransferHistoryRows(
  transfers: readonly { readonly transfer: Transfer; readonly seasonLabel: string; readonly seasonNumber: number }[],
  loans: readonly { readonly loan: Loan; readonly seasonLabel: string; readonly seasonNumber: number }[],
): readonly TransferHistoryRow[] {
  const transferRows: TransferHistoryRow[] = transfers.map(({ transfer, seasonLabel, seasonNumber }) => ({
    key: `transfer-${transfer.id}`,
    seasonLabel,
    seasonNumber,
    kind: transfer.type,
    fromTeamId: transfer.fromTeamId,
    toTeamId: transfer.toTeamId,
    fee: transfer.fee,
  }));
  const loanRows: TransferHistoryRow[] = loans.map(({ loan, seasonLabel, seasonNumber }) => ({
    key: `loan-${loan.id}`,
    seasonLabel,
    seasonNumber,
    kind: "LOAN",
    fromTeamId: loan.ownerTeamId,
    toTeamId: loan.loanTeamId,
    fee: null,
  }));
  return [...transferRows, ...loanRows].sort((a, b) => {
    if (a.seasonNumber !== b.seasonNumber) return b.seasonNumber - a.seasonNumber;
    return a.kind === "LOAN" && b.kind !== "LOAN" ? 1 : b.kind === "LOAN" && a.kind !== "LOAN" ? -1 : 0;
  });
}

export interface TransferHistoryListProps {
  readonly locale: SupportedLocale;
  readonly rows: readonly TransferHistoryRow[];
  readonly teamNameById: ReadonlyMap<TeamId, string>;
  readonly buildTeamHref: (teamId: TeamId) => string;
  readonly className?: string;
}

export function TransferHistoryList({ locale, rows, teamNameById, buildTeamHref, className }: TransferHistoryListProps) {
  if (rows.length === 0) {
    return <p className={`py-2 text-sm text-muted-foreground ${className ?? ""}`}>{t(locale, "player.career.transferEmpty")}</p>;
  }

  return (
    <ul data-slot="transfer-history-list" className={`flex flex-col gap-2 ${className ?? ""}`}>
      {rows.map((row) => (
        <li key={row.key} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <span className="eyebrow shrink-0 text-muted-foreground">{row.seasonLabel}</span>
          <TeamRef locale={locale} teamId={row.fromTeamId} teamNameById={teamNameById} buildTeamHref={buildTeamHref} />
          <span aria-hidden="true" className="text-muted-foreground">
            →
          </span>
          <TeamRef locale={locale} teamId={row.toTeamId} teamNameById={teamNameById} buildTeamHref={buildTeamHref} />
          <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>{row.kind === "LOAN" ? t(locale, "player.career.loanKindLabel") : t(locale, `player.transferType.${row.kind}` as TranslationKey)}</span>
            {row.fee !== null && <span className="tabular-nums">{t(locale, "player.value.pointsFormat", { amount: formatPoints(row.fee, locale) })}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TeamRef({
  locale,
  teamId,
  teamNameById,
  buildTeamHref,
}: {
  readonly locale: SupportedLocale;
  readonly teamId: TeamId | null;
  readonly teamNameById: ReadonlyMap<TeamId, string>;
  readonly buildTeamHref: (teamId: TeamId) => string;
}) {
  if (teamId === null) {
    return <span className="text-muted-foreground">{t(locale, "player.profile.freeAgentBadge")}</span>;
  }
  const name = teamNameById.get(teamId);
  if (!name) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Link href={buildTeamHref(teamId)} className="font-medium hover:underline">
      {name}
    </Link>
  );
}
