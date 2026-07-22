"use client";

import { useState } from "react";
import Link from "next/link";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Position, PlayerState } from "@/types";
import type { PublicPlayerProfile } from "@/lib/data/DataSource";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * F2 스쿼드 테이블(`06-클럽상세.md`) — 51일차, 화면 로컬(5팀).
 *
 * ⚠️ **PA·스카우트 등급 미표기(W-32 초안 채택)** — 목록에서 잠재력 비교가 가능해지면
 * R-5 취지를 우회하므로, 이 표는 `PublicPlayerProfile`을 받되 `scoutRating`을 렌더링하지
 * 않는다(선수 상세에만 노출).
 *
 * **상태 배지 3단만 구현(정상/부상/정지)** — 와이어프레임 F2-s는 KNOCK(경미 부상, 출전
 * 가능)을 별도 4번째 상태로 요구하지만, 이를 판정하려면 `getPlayerInjuries(playerId)`를
 * 스쿼드 22~30명 전원에 대해 개별 호출해야 한다(팀 단위 배치 조회 계약이 `DataSource`에
 * 없음). 51일차 스코프(CP, 여유 0일)에서 감당하기엔 비용 대비 이득이 낮다고 판단해
 * 축소했다 — 이슈 후보로 보고.
 *
 * **정렬 미구현(W-37 미승인)** — 열 헤더 클릭 정렬은 와이어프레임이 "승인 필요"로 표시한
 * 미결 항목이라 구현하지 않는다. 포지션 필터(I-3)만 클라이언트 필터로 제공한다(재요청 없음).
 */

const POSITION_GROUP: Record<Position, "GK" | "DF" | "MF" | "FW"> = {
  GK: "GK",
  CB: "DF",
  LB: "DF",
  RB: "DF",
  DM: "MF",
  CM: "MF",
  AM: "MF",
  LW: "FW",
  RW: "FW",
  ST: "FW",
  SS: "FW",
};

type PositionFilter = "ALL" | "GK" | "DF" | "MF" | "FW";

const FILTER_ORDER: readonly PositionFilter[] = ["ALL", "GK", "DF", "MF", "FW"];

const FILTER_LABEL_KEY: Record<PositionFilter, "team.squad.filterAll" | "team.squad.filterGk" | "team.squad.filterDf" | "team.squad.filterMf" | "team.squad.filterFw"> = {
  ALL: "team.squad.filterAll",
  GK: "team.squad.filterGk",
  DF: "team.squad.filterDf",
  MF: "team.squad.filterMf",
  FW: "team.squad.filterFw",
};

type SquadStatus = "normal" | "injured" | "suspended";

/** 정지 > 부상 > 정상 순(05 문서 E3 가용성 배지 우선순위와 동일 축, KNOCK 세분만 생략). */
function deriveStatus(state: PlayerState | undefined): SquadStatus {
  if (!state) return "normal";
  if (state.suspensionRemainingLeague > 0 || state.suspensionRemainingCup > 0) return "suspended";
  if (state.activeInjuryId !== null) return "injured";
  return "normal";
}

const STATUS_PRESENTATION: Record<
  SquadStatus,
  { readonly icon: string; readonly labelKey: "team.squad.statusNormal" | "team.squad.statusInjured" | "team.squad.statusSuspended"; readonly variant: "secondary" | "destructive" }
> = {
  normal: { icon: "─", labelKey: "team.squad.statusNormal", variant: "secondary" },
  injured: { icon: "✚", labelKey: "team.squad.statusInjured", variant: "destructive" },
  suspended: { icon: "⛔", labelKey: "team.squad.statusSuspended", variant: "destructive" },
};

export interface SquadTableRow {
  readonly player: PublicPlayerProfile;
  readonly state: PlayerState | undefined;
  readonly ovr: number | null;
  readonly appearances: number | null;
  readonly goals: number | null;
}

export interface SquadTableProps {
  readonly locale: SupportedLocale;
  readonly teamName: string;
  readonly rows: readonly SquadTableRow[];
}

export function SquadTable({ locale, teamName, rows }: SquadTableProps) {
  const [filter, setFilter] = useState<PositionFilter>("ALL");

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t(locale, "team.squad.empty")}</p>;
  }

  const visibleRows =
    filter === "ALL" ? rows : rows.filter((row) => POSITION_GROUP[row.player.preferredPosition] === filter);

  const count = rows.length;
  const avgAge = rows.reduce((sum, row) => sum + row.player.age, 0) / count;
  const ovrValues = rows.map((row) => row.ovr).filter((value): value is number => value !== null);
  const avgOvr = ovrValues.length > 0 ? ovrValues.reduce((sum, value) => sum + value, 0) / ovrValues.length : null;
  const injuredCount = rows.filter((row) => deriveStatus(row.state) === "injured").length;
  const suspendedCount = rows.filter((row) => deriveStatus(row.state) === "suspended").length;

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as PositionFilter)}>
        <TabsList>
          {FILTER_ORDER.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(locale, FILTER_LABEL_KEY[key])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Table>
        <TableCaption className="sr-only">{t(locale, "team.squad.caption", { teamName })}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" numeric className="sticky left-0 z-10 bg-background">
              {t(locale, "team.squad.colNumber")}
            </TableHead>
            <TableHead scope="col" className="sticky left-8 z-10 bg-background">
              {t(locale, "team.squad.colName")}
            </TableHead>
            <TableHead scope="col">{t(locale, "team.squad.colPosition")}</TableHead>
            <TableHead scope="col" numeric>
              {t(locale, "team.squad.colAge")}
            </TableHead>
            <TableHead scope="col" numeric>
              {t(locale, "team.squad.colOvr")}
            </TableHead>
            <TableHead scope="col" numeric>
              {t(locale, "team.squad.colCondition")}
            </TableHead>
            <TableHead scope="col">{t(locale, "team.squad.colStatus")}</TableHead>
            <TableHead scope="col" numeric>
              {t(locale, "team.squad.colAppearances")}
            </TableHead>
            <TableHead scope="col" numeric>
              {t(locale, "team.squad.colGoals")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => {
            const status = deriveStatus(row.state);
            const presentation = STATUS_PRESENTATION[status];
            return (
              <TableRow key={row.player.id}>
                <TableCell numeric className="sticky left-0 z-10 w-8 bg-inherit">
                  {row.state?.squadNumber ?? "—"}
                </TableCell>
                {/* 이름 셀만 scope="row"(NFR-A11Y-005) — TableCell(td)은 scope를 지원하지
                    않아 raw <th>로 직접 마크업한다(StandingsTable 선례와 동일). */}
                <th
                  scope="row"
                  className="sticky left-8 z-10 w-max bg-inherit p-2 text-left align-middle font-normal whitespace-nowrap"
                >
                  <Link href={`/${locale}/players/${row.player.id}`} className="hover:underline">
                    {row.player.name}
                  </Link>
                </th>
                <TableCell>{t(locale, `enums.position.${row.player.preferredPosition}`)}</TableCell>
                <TableCell numeric>{row.player.age}</TableCell>
                <TableCell numeric className="scoreboard">
                  {row.ovr ?? "—"}
                </TableCell>
                <TableCell numeric>{row.state ? row.state.condition.toFixed(1) : "—"}</TableCell>
                <TableCell>
                  <Badge variant={presentation.variant} className={cn(status === "normal" && "bg-transparent")}>
                    <span aria-hidden>{presentation.icon}</span>
                    {t(locale, presentation.labelKey)}
                  </Badge>
                </TableCell>
                <TableCell numeric>{row.appearances ?? "—"}</TableCell>
                <TableCell numeric>{row.goals ?? "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        {t(locale, "team.squad.summaryFormat", { count, avgAge: avgAge.toFixed(1), avgOvr: avgOvr !== null ? avgOvr.toFixed(1) : "—" })}
        {injuredCount > 0 && <> · {t(locale, "team.squad.summaryInjuriesFormat", { count: injuredCount })}</>}
        {suspendedCount > 0 && <> · {t(locale, "team.squad.summarySuspensionsFormat", { count: suspendedCount })}</>}
      </p>
    </div>
  );
}
