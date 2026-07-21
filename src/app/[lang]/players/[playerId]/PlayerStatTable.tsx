import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/i18n/t";
import type { SupportedLocale } from "@/i18n/locales";
import type { TranslationKey } from "@/i18n/keys";
import type { PlayerCareerStat, PlayerSeasonStat, PlayerStatCoreValues } from "@/types";

/**
 * E6 스탯 — `[시즌별]`/`[통산]` 탭 공용 테이블. 와이어프레임 05번 E6, 화면 로컬 신규
 * (5팀, `docs/wireframe/05-선수상세.md` §8 컴포넌트 표에 `PlayerStatTable`로 명시).
 *
 * ## 왜 client 컴포넌트가 아닌가
 * 탭 전환(`Tabs`)과 그룹 더보기(`<details>`)는 둘 다 상호작용이지만, `Tabs`는 이미
 * `@/components/ui/tabs`가 `'use client'`를 갖고 있어(radix 프리미티브) 그 경계 안에서만
 * 클라이언트로 넘어간다 — 이 파일 자체는 서버 컴포넌트로 남아도 된다(Server Component가
 * Client Component를 자식으로 렌더하는 것은 Next.js App Router의 정상 패턴).
 * "그룹 더보기"(공격/패스/드리블/수비/규율/GK 6그룹, I-6)는 컬럼을 표 안에서 병합
 * 확장하는 대신 **그룹별 `<details>`로 별도 소표를 여닫는 방식**을 택했다 — 순수 HTML
 * 디스클로저라 이 파일에 새 `'use client'` 경계를 열지 않고도 동작하고, 이미 E2 능력치
 * 아코디언(`page.tsx`)이 쓰는 관례와 같다. FR-ST-001 전 56필드 중 그룹당 3~4개
 * 대표 지표만 골랐다(전량은 오늘 스코프 밖 — 팀장 보고, 이슈 후보) — 필수 수락 기준은
 * "평점(avgRating) 열 채워짐"뿐이고 나머지는 향후 확장 가능한 골격이면 충분하다고 판단했다.
 *
 * ## avgRating — 수락 기준 문구 그대로
 * 50일차 배정 문구("E6 표 `평점` 열 = `avgRating`")를 그대로 따른다. `PlayerStatCoreValues`
 * 에는 없고(그 필드가 `PlayerSeasonStat`/`PlayerCareerStat`에만 있는 이유는 `stat.ts`
 * 헤더 주석 참조 — `PlayerStatRankingMetric` 회귀 방지) `stat.avgRating`을 직접 읽는다.
 *
 * ## 대회(competitionType) 정렬 순서
 * 같은 시즌 안에서는 LEAGUE → PLAYOFF → CUP → TIEBREAK 고정 순서로 보여준다(입력 배열
 * 순서에 좌우되지 않음) — `TrophyCase`의 `TROPHY_TYPE_ORDER` 고정 배열 선례와 동일 판단.
 */

const COMPETITION_TYPE_ORDER = ["LEAGUE", "PLAYOFF", "CUP", "TIEBREAK"] as const satisfies readonly PlayerSeasonStat["competitionType"][];

export interface PlayerStatTableSeasonRow {
  readonly stat: PlayerSeasonStat;
  /** `Season.seasonNumber` 해석 결과(예: "S3"). 시즌 조회는 소비처(page.tsx) 책임
   * (`TrophyCase`의 `seasonLabel: string` 선례와 동일 이유 — 불투명 브랜드 ID). */
  readonly seasonLabel: string;
}

/**
 * 표시 순서로 정렬하는 순수 함수 — 시즌 내림차순(최신 우선), 같은 시즌 안에서는
 * `COMPETITION_TYPE_ORDER` 고정 순서. `seasonNumber`는 호출부가 이미 각 행에 정수로
 * 계산해 넘긴다(`seasonLabel`이 아니라 별도 비교 키가 필요해 이 함수는 그 값을 받는다).
 */
export function sortPlayerStatSeasonRows(
  rows: readonly PlayerStatTableSeasonRow[],
  seasonNumberByStat: (stat: PlayerSeasonStat) => number,
): readonly PlayerStatTableSeasonRow[] {
  return [...rows].sort((a, b) => {
    const seasonDiff = seasonNumberByStat(b.stat) - seasonNumberByStat(a.stat);
    if (seasonDiff !== 0) return seasonDiff;
    return COMPETITION_TYPE_ORDER.indexOf(a.stat.competitionType) - COMPETITION_TYPE_ORDER.indexOf(b.stat.competitionType);
  });
}

interface StatGroupColumn {
  readonly key: keyof PlayerStatCoreValues;
  readonly headerKey: TranslationKey;
}

interface StatGroup {
  readonly titleKey: TranslationKey;
  readonly columns: readonly StatGroupColumn[];
}

const STAT_GROUPS: readonly StatGroup[] = [
  {
    titleKey: "player.stat.groupAttack",
    columns: [
      { key: "shots", headerKey: "player.stat.shotsHeader" },
      { key: "shotsOnTarget", headerKey: "player.stat.shotsOnTargetHeader" },
      { key: "xg", headerKey: "player.stat.xgHeader" },
      { key: "xa", headerKey: "player.stat.xaHeader" },
    ],
  },
  {
    titleKey: "player.stat.groupPassing",
    columns: [
      { key: "passesCompleted", headerKey: "player.stat.passesCompletedHeader" },
      { key: "passesAttempted", headerKey: "player.stat.passesAttemptedHeader" },
      { key: "keyPasses", headerKey: "player.stat.keyPassesHeader" },
    ],
  },
  {
    titleKey: "player.stat.groupDribbling",
    columns: [
      { key: "dribblesCompleted", headerKey: "player.stat.dribblesCompletedHeader" },
      { key: "dribblesAttempted", headerKey: "player.stat.dribblesAttemptedHeader" },
      { key: "touches", headerKey: "player.stat.touchesHeader" },
    ],
  },
  {
    titleKey: "player.stat.groupDefense",
    columns: [
      { key: "tacklesWon", headerKey: "player.stat.tacklesWonHeader" },
      { key: "interceptions", headerKey: "player.stat.interceptionsHeader" },
      { key: "clearances", headerKey: "player.stat.clearancesHeader" },
    ],
  },
  {
    titleKey: "player.stat.groupDiscipline",
    columns: [
      { key: "foulsCommitted", headerKey: "player.stat.foulsCommittedHeader" },
      { key: "yellowCards", headerKey: "player.stat.yellowCardsHeader" },
      { key: "redCards", headerKey: "player.stat.redCardsHeader" },
    ],
  },
  {
    titleKey: "player.stat.groupGk",
    columns: [
      { key: "saves", headerKey: "player.stat.savesHeader" },
      { key: "cleanSheets", headerKey: "player.stat.cleanSheetsHeader" },
      { key: "goalsConceded", headerKey: "player.stat.goalsConcededHeader" },
    ],
  },
];

export interface PlayerStatTableProps {
  readonly locale: SupportedLocale;
  readonly playerName: string;
  readonly seasonRows: readonly PlayerStatTableSeasonRow[];
  readonly careerStat: PlayerCareerStat | null;
  readonly className?: string;
}

export function PlayerStatTable({ locale, playerName, seasonRows, careerStat, className }: PlayerStatTableProps) {
  return (
    <Tabs defaultValue="season" className={className}>
      <TabsList>
        <TabsTrigger value="season">{t(locale, "player.stat.tabSeason")}</TabsTrigger>
        <TabsTrigger value="career">{t(locale, "player.stat.tabCareer")}</TabsTrigger>
      </TabsList>

      <TabsContent value="season" className="flex flex-col gap-3">
        {seasonRows.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t(locale, "player.stat.tableEmpty")}</p>
        ) : (
          <CoreStatTable
            locale={locale}
            caption={t(locale, "player.stat.seasonCaption", { name: playerName })}
            rows={seasonRows.map((row) => ({
              key: `${row.stat.seasonId}-${row.stat.competitionType}`,
              leadingLabel: row.seasonLabel,
              competitionType: row.stat.competitionType,
              core: row.stat,
            }))}
          />
        )}

        {seasonRows.length > 0 && <StatGroupDisclosures locale={locale} rows={seasonRows.map((row) => row.stat)} rowLabels={seasonRows.map((row) => row.seasonLabel)} />}
      </TabsContent>

      <TabsContent value="career" className="flex flex-col gap-3">
        {careerStat === null ? (
          <p className="py-2 text-sm text-muted-foreground">{t(locale, "player.stat.tableEmpty")}</p>
        ) : (
          <>
            <CoreStatTable
              locale={locale}
              caption={t(locale, "player.stat.careerCaption", { name: playerName })}
              rows={[
                {
                  key: "career",
                  leadingLabel: t(locale, "player.stat.careerRowLabel"),
                  competitionType: null,
                  core: careerStat,
                },
              ]}
            />
            <StatGroupDisclosures locale={locale} rows={[careerStat]} rowLabels={[t(locale, "player.stat.careerRowLabel")]} />
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

interface CoreStatRow {
  readonly key: string;
  readonly leadingLabel: string;
  readonly competitionType: PlayerSeasonStat["competitionType"] | null;
  readonly core: PlayerStatCoreValues & { readonly avgRating: number };
}

/** E6 항상 노출 핵심 열 — 시즌/(대회)·출전·선발·분·득·도·평점(avgRating). NFR-RS-002
 * 자체 `overflow-x:auto`(`Table` 컨테이너가 이미 제공), 시즌 열 sticky(NFR-RS-002). */
function CoreStatTable({ locale, caption, rows }: { readonly locale: SupportedLocale; readonly caption: string; readonly rows: readonly CoreStatRow[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="sticky left-0 z-10 bg-background">
            {t(locale, "player.stat.seasonHeader")}
          </TableHead>
          {rows.some((row) => row.competitionType !== null) && (
            <TableHead scope="col">{t(locale, "player.stat.competitionHeader")}</TableHead>
          )}
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.appearancesHeaderFull")} className="no-underline">
              {t(locale, "player.stat.appearancesHeader")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.startsHeaderFull")} className="no-underline">
              {t(locale, "player.stat.startsHeader")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.minutesHeaderFull")} className="no-underline">
              {t(locale, "player.stat.minutesHeader")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.goalsHeaderFull")} className="no-underline">
              {t(locale, "player.stat.goalsHeader")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.assistsHeaderFull")} className="no-underline">
              {t(locale, "player.stat.assistsHeader")}
            </abbr>
          </TableHead>
          <TableHead scope="col" numeric>
            <abbr title={t(locale, "player.stat.ratingHeaderFull")} className="no-underline">
              {t(locale, "player.stat.ratingHeader")}
            </abbr>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableHead scope="row" className="sticky left-0 z-10 bg-background font-normal">
              {row.leadingLabel}
            </TableHead>
            {rows.some((r) => r.competitionType !== null) && (
              <TableCell>
                {row.competitionType ? t(locale, `player.competitionType.${row.competitionType}` as TranslationKey) : "—"}
              </TableCell>
            )}
            <TableCell numeric>{row.core.appearances}</TableCell>
            <TableCell numeric>{row.core.starts}</TableCell>
            <TableCell numeric>{row.core.minutesPlayed}</TableCell>
            <TableCell numeric>{row.core.goals}</TableCell>
            <TableCell numeric>{row.core.assists}</TableCell>
            <TableCell numeric>{row.core.avgRating.toFixed(2)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** I-6 "그룹 더보기" — 공격/패스/드리블/수비/규율/GK 6그룹을 `<details>`로 개별 개폐한다. */
function StatGroupDisclosures({
  locale,
  rows,
  rowLabels,
}: {
  readonly locale: SupportedLocale;
  readonly rows: readonly PlayerStatCoreValues[];
  readonly rowLabels: readonly string[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="eyebrow text-muted-foreground">{t(locale, "player.stat.moreGroupsTitle")}</span>
      <div className="flex flex-wrap gap-2">
        {STAT_GROUPS.map((group) => (
          <details key={group.titleKey} className="rounded-lg border border-border bg-card p-2">
            <summary className="eyebrow cursor-pointer text-muted-foreground">{t(locale, group.titleKey)}</summary>
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t(locale, "player.stat.seasonHeader")}</TableHead>
                  {group.columns.map((column) => (
                    <TableHead key={column.key} scope="col" numeric>
                      {t(locale, column.headerKey)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={`${group.titleKey}-${rowLabels[index]}`}>
                    <TableHead scope="row" className="font-normal">
                      {rowLabels[index]}
                    </TableHead>
                    {group.columns.map((column) => (
                      <TableCell key={column.key} numeric>
                        {row[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        ))}
      </div>
    </div>
  );
}
