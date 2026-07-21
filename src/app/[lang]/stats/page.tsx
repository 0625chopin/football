import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import type { TranslationKey } from "@/i18n/keys";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/state/EmptyState";
import type { PlayerStatRankingMetric } from "@/lib/data/DataSource";
import type { LeagueId, PlayerId } from "@/types";

/** 랭킹 표에 노출할 최대 행수 — 순위표는 상위권만 의미 있고, 전량 반환은 클라이언트
 * 재집계 금지 규약(R-10)과도 맞지 않는다. */
const RANK_LIMIT = 20;

/** 지표 드롭다운 — `PlayerStatCoreValues`(56필드) 중 화면에서 가장 흔히 찾는 12종만
 * 선별한다(수락 기준 "10종 이상"). 값(`value`)은 `getPlayerStatRanking`에 그대로 넘기고,
 * `labelKey`는 `stat.metrics.*`(이 팀 소유 네임스페이스)를 경유한다 — 하드코딩 라벨 없음. */
const METRIC_OPTIONS: readonly {
  readonly value: PlayerStatRankingMetric;
  readonly labelKey: TranslationKey;
}[] = [
  { value: "goals", labelKey: "stat.metrics.goals" },
  { value: "assists", labelKey: "stat.metrics.assists" },
  { value: "appearances", labelKey: "stat.metrics.appearances" },
  { value: "minutesPlayed", labelKey: "stat.metrics.minutesPlayed" },
  { value: "shots", labelKey: "stat.metrics.shots" },
  { value: "shotsOnTarget", labelKey: "stat.metrics.shotsOnTarget" },
  { value: "xg", labelKey: "stat.metrics.xg" },
  { value: "xa", labelKey: "stat.metrics.xa" },
  { value: "keyPasses", labelKey: "stat.metrics.keyPasses" },
  { value: "tacklesWon", labelKey: "stat.metrics.tacklesWon" },
  { value: "interceptions", labelKey: "stat.metrics.interceptions" },
  { value: "saves", labelKey: "stat.metrics.saves" },
];
const DEFAULT_METRIC: PlayerStatRankingMetric = "goals";

function resolveMetric(raw: string | undefined): PlayerStatRankingMetric {
  const found = METRIC_OPTIONS.find((option) => option.value === raw);
  return found ? found.value : DEFAULT_METRIC;
}

/**
 * `/[lang]/stats` 통계 랭킹 — Task 019(39일차, 4팀).
 *
 * 리그/통합 필터 + 지표 12종 드롭다운(수락 기준 "10종 이상") + 최소 출전 필터를 갖춘
 * 선수 시즌 랭킹 표. `getPlayerStatRanking`(1팀 `DataSource`, FR-UI-008)이 정렬·상한
 * 적용을 서버에서 이미 마쳐 내려주므로(R-10, 클라이언트 재집계 금지) 이 페이지는 결과를
 * 그대로 표에 얹기만 한다.
 *
 * ## 필터 — 순수 GET 폼, 클라이언트 컴포넌트 없음
 * 리그/지표/전체표시 세 필터는 `<form method="get">` 하나로 처리한다. `router.push` 기반
 * 클라이언트 필터 대신 이 방식을 택한 이유: (1) 이 프로젝트 규약("서버 컴포넌트가
 * 기본, `"use client"`는 상호작용이 실제로 필요할 때만")이 상호작용 없는 페이지에
 * 클라이언트 경계를 새로 만들 근거를 요구하지 않는다, (2) 네이티브 `<select>` +
 * GET 폼 제출은 JS 없이도 동작해 `searchParams` 갱신 → 서버 재조회라는 동일 결과를
 * 얻는다. shadcn `Select` 프리미티브가 이 프로젝트에 없다는 점도 native `<select>`를
 * 자연스러운 선택으로 만든다(`components.json` 등록분에 없음, CLAUDE.md 확인).
 *
 * ## 최소 출전 필터 — "표기"가 수락 기준, 값 자체는 하드코딩하지 않는다
 * `minAppearancePct`를 생략하면 어댑터가 공통코드 `UI_PARAM.LEADERBOARD_MIN_APPEARANCE_PCT`
 * (기본 30%, `DataSource.ts` 511:513 주석 근거)를 스스로 적용한다 — 이 페이지는 그 실제
 * 퍼센트 값을 조회하지 않는다(공통코드 로더는 3팀 `src/lib/config/**` 소관, 이 팀 스코프
 * 밖). "기본 최소 출전 30% 이상" 안내 문구(`stat.filters.minAppearanceDefault`)만 표기하고,
 * 사용자가 그 기본 필터를 끄고 싶으면 `all` 체크박스로 `minAppearancePct: 0`을 명시
 * 전달해 전량을 받는다.
 *
 * ## 이름 조회 — 벌크 우선, 없는 자리만 개별 호출
 * 팀명은 `getTeamsByIds`(1팀, 홈 페이지가 이미 쓰는 패턴)로 한 번에 받는다. 선수명은
 * 벌크 조회 계약이 없어(`DataSource.ts` 확인) `getPlayerProfile` 개별 호출을
 * `Promise.all`로 병렬화한다 — 표 상한이 `RANK_LIMIT`(20)로 고정돼 있어 N+1 비용이
 * 유계다. `getPlayerProfile`은 `PublicPlayerProfile`(pa 미노출)만 반환하므로 도메인
 * 제약(6절)도 자동으로 지킨다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise — await 필요, 동적 렌더링으로 전환됨)
 */
export default async function Page(props: PageProps<"/[lang]/stats">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const leagues = await dataSource.getLeagues();

  const leagueIdByParam = new Map(leagues.map((league) => [league.id as string, league.id]));
  const rawLeagueParam = typeof searchParams.league === "string" ? searchParams.league : "all";
  const leagueId: LeagueId | null = leagueIdByParam.get(rawLeagueParam) ?? null;
  const leagueParam = leagueId ?? "all";
  const metric = resolveMetric(
    typeof searchParams.metric === "string" ? searchParams.metric : undefined,
  );
  const showAll = searchParams.all === "on" || searchParams.all === "1";

  const ranking = await dataSource.getPlayerStatRanking({
    leagueId,
    competitionType: "LEAGUE",
    metric,
    minAppearancePct: showAll ? 0 : undefined,
    limit: RANK_LIMIT,
  });

  const uniquePlayerIds = Array.from(new Set(ranking.map((row) => row.playerId)));
  const uniqueTeamIds = Array.from(new Set(ranking.map((row) => row.teamId)));

  const [players, teams] = await Promise.all([
    Promise.all(uniquePlayerIds.map((playerId) => dataSource.getPlayerProfile(playerId))),
    dataSource.getTeamsByIds(uniqueTeamIds),
  ]);

  const playerNameById = new Map<PlayerId, string>(
    players
      .filter((player) => player !== null)
      .map((player) => [player.id, player.name]),
  );
  const teamNameById = new Map(teams.map((team) => [team.id, team.name]));
  const leagueNameById = new Map(leagues.map((league) => [league.id, league.name]));

  const activeMetricOption = METRIC_OPTIONS.find((option) => option.value === metric);
  const metricLabel = activeMetricOption ? t(locale, activeMetricOption.labelKey) : metric;

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="eyebrow text-lg text-foreground">{t(locale, "stat.leaderboard.pageTitle")}</h1>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow text-muted-foreground">
                {t(locale, "stat.filters.leagueLabel")}
              </span>
              <select
                name="league"
                defaultValue={leagueParam}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="all">{t(locale, "stat.filters.allLeagues")}</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow text-muted-foreground">
                {t(locale, "stat.filters.metricLabel")}
              </span>
              <select
                name="metric"
                defaultValue={metric}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(locale, option.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="all" defaultChecked={showAll} className="size-4" />
              {t(locale, "stat.filters.showAllToggle")}
            </label>

            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t(locale, "stat.filters.apply")}
            </button>

            <p className="basis-full text-xs text-muted-foreground">
              {t(locale, "stat.filters.minAppearanceLabel")} — {t(locale, "stat.filters.minAppearanceDefault")}
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t(locale, "stat.leaderboard.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {ranking.length === 0 ? (
            <EmptyState locale={locale} titleKey="stat.empty.message" />
          ) : (
            <Table>
              <TableCaption>{t(locale, "stat.leaderboard.caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" numeric>
                    {t(locale, "stat.table.rank")}
                  </TableHead>
                  <TableHead scope="col">{t(locale, "stat.table.player")}</TableHead>
                  <TableHead scope="col">{t(locale, "stat.table.team")}</TableHead>
                  <TableHead scope="col">{t(locale, "stat.table.league")}</TableHead>
                  <TableHead scope="col" numeric>
                    {metricLabel}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map((row, index) => (
                  <TableRow key={`${row.playerId}-${row.seasonId}-${row.competitionType}`}>
                    <TableCell numeric>{index + 1}</TableCell>
                    <TableCell>{playerNameById.get(row.playerId) ?? row.playerId}</TableCell>
                    <TableCell>{teamNameById.get(row.teamId) ?? row.teamId}</TableCell>
                    <TableCell>{leagueNameById.get(row.leagueId) ?? row.leagueId}</TableCell>
                    <TableCell numeric>{String(row[metric])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
