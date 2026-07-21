import Link from "next/link";

import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { Team, TeamId } from "@/types";
import { TeamBadge } from "@/components/domain/TeamBadge";
import { FormStrip } from "@/components/domain/FormStrip";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { CompositeViewState } from "./types";
import { type ZoneKind } from "./standings-zone";

/**
 * `/leagues/[leagueId]` B3 순위 테이블 — Task 016(39일차, 5팀), 화면 로컬(3리그 공용).
 *
 * 존 표기(승격/플레이오프/강등)는 색만으로 전달하지 않는다(NFR-A11Y-002) — 각 행 좌측에
 * 아이콘(`▲`/`◆`/`▼`)을 색과 함께 두고, `<abbr>`로 스크린리더 라벨을 병기한다. 아이콘
 * 문자 자체는 와이어프레임이 로케일 불변으로 고정한 기호라 번역 대상이 아니다(D-17과
 * 동일 축 — 국적·enum과 달리 이 기호는 어느 언어에서도 같은 형태로 쓰인다).
 *
 * 순위·팀명 열은 좌측 sticky로 묶어 가로 스크롤 중에도 어느 팀 행인지 잃지 않는다
 * (NFR-RS-002). `Table` 프리미티브가 이미 `overflow-x-auto` 컨테이너를 갖고 있다.
 *
 * `#`+팀명 열만 sticky로 묶고 승/무/패/득/실/득실/승점/최근5는 스크롤 영역에 둔 것은
 * 와이어프레임 3-1/3-2 레이아웃 그대로다 — 데스크톱(1024+)에선 컨테이너 폭이 전 열을
 * 담아 스크롤이 사실상 발생하지 않는다.
 *
 * 42일차(Task 016, 5팀) — I-210 점검 중 §7 NFR-A11Y-005 "축약 헤더(경/승/무/패 등)는
 * `<abbr title="...">`로 풀네임 제공" 항목이 `rank` 열에만 반영돼 있던 것을 확인해
 * 나머지 8개 숫자·문자 열(경기/승/무/패/득/실/득실/승점/최근5)에도 동일하게 적용했다.
 * `<caption>`(sr-only)·`scope="col"`/`scope="row"`는 39일차에 이미 충족돼 있어 손대지
 * 않았다.
 */

const ZONE_ICON: Record<Exclude<ZoneKind, "NEUTRAL">, string> = {
  PROMOTION: "▲",
  PLAYOFF: "◆",
  PROMOTION_PLAYOFF: "▲◆",
  RELEGATION: "▼",
};

const ZONE_COLOR_CLASS: Record<Exclude<ZoneKind, "NEUTRAL">, string> = {
  PROMOTION: "text-promotion",
  PLAYOFF: "text-playoff",
  PROMOTION_PLAYOFF: "text-promotion",
  RELEGATION: "text-relegation",
};

/** 로딩 상태에서 보여줄 행 스켈레톤 수 — `CompositeViewState`의 `loading` 변형엔 아직
 * 데이터가 없어 실제 리그 팀 수(24/20/16)를 알 수 없다. 이 페이지는 Next 라우트 세그먼트
 * `loading.tsx`가 최초 진입 스켈레톤을 이미 담당해 이 분기를 오늘 실제로 밟지 않는다 —
 * 이 컴포넌트가 향후 클라이언트 재조회 등으로 재사용될 때를 대비해 4상태 계약만 완결해
 * 둔다(이슈 후보: 정확한 팀 수 스켈레톤은 Next 16 파일 규약상 `loading.tsx`가 params에
 * 접근할 수 없어 구조적으로 불가능 — RouteLoading 범용화 여부는 보고 참조). */
const LOADING_SKELETON_ROWS = 10;

function zoneLabel(locale: SupportedLocale, zone: ZoneKind): string | null {
  switch (zone) {
    case "PROMOTION":
      return t(locale, "league.zone.promotionLabel");
    case "PLAYOFF":
      return t(locale, "league.zone.playoffLabel");
    case "PROMOTION_PLAYOFF":
      return `${t(locale, "league.zone.promotionLabel")} · ${t(locale, "league.zone.playoffLabel")}`;
    case "RELEGATION":
      return t(locale, "league.zone.relegationLabel");
    case "NEUTRAL":
      return null;
  }
}

export interface StandingRowData {
  readonly rank: number;
  readonly zone: ZoneKind;
  readonly teamId: TeamId;
  readonly team: Pick<Team, "name" | "shortName" | "crestSeed">;
  readonly played: number;
  readonly won: number;
  readonly drawn: number;
  readonly lost: number;
  readonly gf: number;
  readonly ga: number;
  readonly gd: number;
  readonly points: number;
  /** 최근 5경기 "WWDLW" 등(Standing.form 원본) — `FormStrip`에 그대로 넘긴다. */
  readonly form: string;
}

export interface StandingsTableData {
  readonly leagueName: string;
  readonly seasonLabel: string;
  readonly rows: readonly StandingRowData[];
}

export interface StandingsTableProps {
  readonly locale: SupportedLocale;
  readonly state: CompositeViewState<StandingsTableData>;
  readonly className?: string;
}

export function StandingsTable({ locale, state, className }: StandingsTableProps) {
  if (state.status === "loading") {
    return (
      <div className={cn("space-y-1", className)} aria-hidden="true">
        {Array.from({ length: LOADING_SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (state.status === "empty") {
    return (
      <p className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
        {t(locale, "league.table.emptySeason")}
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <p role="alert" className={cn("py-8 text-center text-sm text-destructive", className)}>
        {state.message ?? t(locale, "league.error.loadFailed")}
      </p>
    );
  }

  const { leagueName, seasonLabel, rows } = state.data;

  return (
    <Table className={className}>
      <TableCaption className="sr-only">
        {t(locale, "league.table.caption", { league: leagueName, season: seasonLabel })}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="sticky left-0 z-10 w-14 bg-background">
            <abbr title={t(locale, "league.table.rankFull")} className="no-underline">
              {t(locale, "league.table.rank")}
            </abbr>
          </TableHead>
          <TableHead scope="col" className="sticky left-14 z-10 bg-background">
            {t(locale, "league.table.team")}
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.playedFull")} className="no-underline">
              {t(locale, "league.table.played")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.wonFull")} className="no-underline">
              {t(locale, "league.table.won")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.drawnFull")} className="no-underline">
              {t(locale, "league.table.drawn")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.lostFull")} className="no-underline">
              {t(locale, "league.table.lost")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.goalsForFull")} className="no-underline">
              {t(locale, "league.table.goalsFor")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.goalsAgainstFull")} className="no-underline">
              {t(locale, "league.table.goalsAgainst")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.goalDifferenceFull")} className="no-underline">
              {t(locale, "league.table.goalDifference")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "league.table.pointsFull")} className="no-underline">
              {t(locale, "league.table.points")}
            </abbr>
          </TableHead>
          <TableHead scope="col">
            <abbr title={t(locale, "league.table.formFull")} className="no-underline">
              {t(locale, "league.table.form")}
            </abbr>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const icon = row.zone === "NEUTRAL" ? null : ZONE_ICON[row.zone];
          const colorClass = row.zone === "NEUTRAL" ? "" : ZONE_COLOR_CLASS[row.zone];
          const label = zoneLabel(locale, row.zone);

          return (
            <TableRow key={row.teamId}>
              <TableCell className="sticky left-0 z-10 w-14 bg-inherit">
                <span className="inline-flex items-center gap-1">
                  {icon ? (
                    <abbr
                      title={label ?? undefined}
                      className={cn("no-underline scoreboard", colorClass)}
                    >
                      {icon}
                    </abbr>
                  ) : (
                    <span aria-hidden="true" className="inline-block w-[1ch]" />
                  )}
                  <span className="scoreboard tabular-nums">{row.rank}</span>
                </span>
              </TableCell>
              {/* 팀명 셀만 `scope="row"` — 와이어프레임 §7 NFR-A11Y-005. `TableCell`(td)은
                  scope 속성을 지원하지 않는 시맨틱이라 여기만 raw <th>로 직접 마크업한다. */}
              <th
                scope="row"
                className="sticky left-14 z-10 w-max bg-inherit p-2 text-left align-middle font-normal whitespace-nowrap"
              >
                <Link
                  href={`/${locale}/teams/${row.teamId}`}
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  <TeamBadge
                    locale={locale}
                    size="sm"
                    state={{ status: "ready", data: row.team }}
                  />
                  <span>{row.team.name}</span>
                </Link>
              </th>
              <TableCell numeric>{row.played}</TableCell>
              <TableCell numeric>{row.won}</TableCell>
              <TableCell numeric>{row.drawn}</TableCell>
              <TableCell numeric>{row.lost}</TableCell>
              <TableCell numeric>{row.gf}</TableCell>
              <TableCell numeric>{row.ga}</TableCell>
              <TableCell numeric>{row.gd > 0 ? `+${row.gd}` : row.gd}</TableCell>
              <TableCell numeric className="font-semibold">
                {row.points}
              </TableCell>
              <TableCell>
                <FormStrip locale={locale} state={{ status: "ready", data: { form: row.form } }} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
