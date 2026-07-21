import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import { EmptyState } from "@/components/state/EmptyState";
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
import type { LeagueId, TeamId } from "@/types";

/**
 * `/[lang]/players` 선수 목록 — **50일차 신설(I-223, 사용자 지시)**
 *
 * ## 왜 이 화면이 계획에 없었는가
 * 36일차 I-186이 사이드 내비 5종을 `pending: true`로 막으면서 "인덱스 화면 신설은
 * Task 016~021 스코프"라고 적었으나 44일차 실사에서 그 전제가 틀렸음이 확인됐다 —
 * 그 Task들의 구현 사항은 전부 상세 화면이고 인덱스는 한 줄도 없다(`docs/ISSUES.md`
 * I-223). 리그는 44일차에 같은 이유로 `leagues/page.tsx`를 별건 신설해 해소했고, 이
 * 화면은 그 선례를 그대로 따른 두 번째 사례다.
 *
 * 대응 와이어프레임이 없다(`docs/wireframe/05-선수상세.md`는 `[playerId]` 상세다). 명세
 * 없이 만드는 화면이므로 **스코프를 의도적으로 최소화**한다 — 새 도메인 개념·집계를
 * 끌어들이지 않고, 이미 있는 조회 계약이 그대로 주는 것만 보여준다.
 *
 * ## 데이터 — 전역 선수 목록 계약이 없어서 "리그 → 구단 → 스쿼드"로 좁힌다
 * `DataSource`에는 전 선수를 나열하거나 이름으로 검색하는 메서드가 없다(선수 조회는 전부
 * `playerId` 단건, 다수 조회는 `getTeamSquad`/`getPlayerStatRanking` 두 갈래뿐). 그래서
 * 이 화면은 스쿼드 단위로 좁혀 보여준다:
 *   `getLeagues()` → `getStandings({ leagueId })`로 그 리그 소속 팀 id → `getTeamsByIds`로
 *   팀명 → `getTeamSquad(teamId)`로 명단.
 * 팀 목록을 순위표에서 얻는 것은 우회로처럼 보이지만, `DataSource`에 "리그별 팀 목록"
 * 계약이 따로 없고 `Standing`이 리그×시즌의 전 팀을 한 행씩 담는 유일한 소스다. 정렬은
 * 순위표 순서를 그대로 쓰지 않고 **팀명 기준**으로 세운다 — 이 화면은 순위를 말하는
 * 화면이 아니라 선수를 찾는 화면이라, 순위 순서로 세우면 없는 의미를 붙이게 된다.
 *
 * ## 필터 — 순수 GET 폼, 클라이언트 컴포넌트 없음
 * `?league=`·`?team=` 두 쿼리로 고른다. `/stats`(39일차)가 세운 패턴과 같은 판단이다 —
 * 상호작용이 폼 제출 하나뿐이라 클라이언트 경계를 새로 만들 근거가 없고, 네이티브
 * `<select>` + GET 폼은 JS 없이도 `searchParams` 갱신 → 서버 재조회로 동일 결과를 준다.
 * 리그를 바꾸면 이전 `team` 값이 그 리그에 없을 수 있어, 유효하지 않은 `team`은 무시하고
 * 해당 리그의 첫 팀으로 되돌린다(빈 표 대신 항상 무언가를 보여준다).
 *
 * ## 표시 열 — 이름·포지션·나이 3열만
 * `PublicPlayerProfile`이 더 많은 필드를 갖고 있지만(명성·몸값·스카우트 등급 등) 명세가
 * 없는 화면에서 지표를 늘리면 "무엇을 기준으로 고른 목록인가"라는 의미가 임의로 붙는다.
 * 스카우트 등급은 특히 상세 화면에서 툴팁("정확한 값은 공개되지 않습니다")과 한 쌍으로만
 * 노출되던 값이라 목록에 맨몸으로 세우지 않는다. 국적은 `enums`에 국적 카탈로그가 없어
 * (3팀 소관) 번역키를 경유할 수 없으므로 제외했다 — 코드값을 그대로 찍으면 하드코딩이다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise — await 필요, 동적 렌더링으로 전환됨)
 */
export default async function Page(props: PageProps<"/[lang]/players">) {
  const { lang } = await props.params;
  const searchParams = await props.searchParams;
  const locale = isSupportedLocale(lang) ? lang : DEFAULT_LOCALE;

  await bootstrapApp();
  const dataSource = getDataSource();

  const leagues = [...(await dataSource.getLeagues())].sort((a, b) => a.tier - b.tier);
  const leagueIdByParam = new Map<string, LeagueId>(
    leagues.map((league) => [league.id as string, league.id]),
  );
  const rawLeagueParam = typeof searchParams.league === "string" ? searchParams.league : undefined;
  const selectedLeague =
    (rawLeagueParam ? leagueIdByParam.get(rawLeagueParam) : undefined) ?? leagues[0]?.id ?? null;

  const standings = selectedLeague
    ? await dataSource.getStandings({ leagueId: selectedLeague })
    : [];
  const teams = [...(await dataSource.getTeamsByIds(standings.map((row) => row.teamId)))].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  const teamIdByParam = new Map<string, TeamId>(teams.map((team) => [team.id as string, team.id]));
  const rawTeamParam = typeof searchParams.team === "string" ? searchParams.team : undefined;
  const selectedTeam =
    (rawTeamParam ? teamIdByParam.get(rawTeamParam) : undefined) ?? teams[0]?.id ?? null;

  const squad = selectedTeam ? await dataSource.getTeamSquad(selectedTeam) : [];

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "player.list.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "player.list.description")}</p>
      </header>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow text-muted-foreground">
                {t(locale, "player.list.leagueLabel")}
              </span>
              <select
                name="league"
                defaultValue={selectedLeague ?? ""}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {leagues.map((league) => (
                  // 리그명·팀명은 고유명사라 번역 대상이 아니다(D-17) — 값 그대로 렌더한다.
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow text-muted-foreground">
                {t(locale, "player.list.teamLabel")}
              </span>
              <select
                name="team"
                defaultValue={selectedTeam ?? ""}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t(locale, "player.list.apply")}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {teams.find((team) => team.id === selectedTeam)?.name ??
              t(locale, "player.list.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <EmptyState locale={locale} titleKey="player.list.emptyTeams" />
          ) : squad.length === 0 ? (
            <EmptyState locale={locale} titleKey="player.empty.message" />
          ) : (
            <Table>
              <TableCaption>{t(locale, "player.list.caption")}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t(locale, "player.list.nameHeader")}</TableHead>
                  <TableHead scope="col">{t(locale, "player.list.positionHeader")}</TableHead>
                  <TableHead scope="col" numeric>
                    {t(locale, "player.list.ageHeader")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squad.map((player) => (
                  <TableRow key={player.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/players/${player.id}`}
                        className="rounded-sm underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {player.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {t(locale, `enums.position.${player.preferredPosition}`)}
                    </TableCell>
                    <TableCell numeric>
                      {t(locale, "player.profile.ageFormat", { age: player.age })}
                    </TableCell>
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
