import Link from "next/link";

import { bootstrapApp } from "@/lib/data/bootstrap";
import { getDataSource } from "@/lib/data/factory";
import { t } from "@/i18n/t";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";
import type { SupportedLocale } from "@/i18n/locales";
import { EmptyState } from "@/components/state/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamBadge } from "@/components/domain/TeamBadge";
import type { LeagueId, Team } from "@/types";

/**
 * `/[lang]/teams` 구단 목록 — **60일차 신설(Task 046, 49일차 배정, I-223 선례)**
 *
 * ## 왜 이 화면이 계획에 없었는가
 * 사이드 내비 잔여 3종(경기·플레이오프·팀) 중 팀 인덱스는 36일차 I-186이 막아 둔 이후
 * 담당 Task 없이 방치되다가, 49일차에 이 Task 046으로 정식 배정됐다(`docs/ISSUES.md`
 * I-223). 대응 와이어프레임이 없어 `leagues/page.tsx`(44일차)·`players/page.tsx`(50일차)와
 * 동일하게 스코프를 최소화한다 — **집계 열(성적·재정·스쿼드 규모)은 수락 기준상 금지**다.
 *
 * ## 데이터 — 리그별 팀 목록 계약이 없어 순위표를 경유한다
 * `DataSource`에 "리그 소속 팀 목록"을 직접 주는 메서드가 없다(`players/page.tsx` 50일차
 * 주석과 동일 사정). `getStandings({ leagueId })`가 그 리그·시즌의 전 팀을 한 행씩 담는
 * 유일한 소스라 여기서 팀 id를 뽑고 `getTeamsByIds`로 표시 정보를 가져온다.
 *
 * ## 정렬 — 팀명순(순위순 금지)
 * `getStandings`가 주는 `rank` 순서를 그대로 쓰지 않는다. 이 화면은 순위를 말하는 화면이
 * 아니라 구단을 찾는 화면이라, 순위 순서로 세우면 없는 의미가 붙는다(`players/page.tsx`
 * 49일차 선례와 동일 판단).
 *
 * ## 필터 — 순수 GET 폼, 클라이언트 컴포넌트 없음
 * `?league=` 하나로 고른다. 상호작용이 폼 제출 하나뿐이라 클라이언트 경계를 새로 만들
 * 근거가 없다(`/stats`·`/players`가 세운 패턴과 동일 판단).
 *
 * ## 카드 — 팀명·티어·순위표/스쿼드 링크만
 * `Team`이 더 많은 필드를 갖고 있지만(명성·팬 규모·재정 등) 수락 기준이 집계 열을 명시적
 * 금지했으므로 티어(선택된 리그 기준)와 두 이동 링크만 둔다. 순위표 링크는 `leagues/
 * [leagueId]`(리그 단위)로, 스쿼드 링크는 `teams/[teamId]`(팀 단위, 이 화면의 주 이동
 * 목적지)로 보낸다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (`searchParams`는 Promise — await 필요, 동적 렌더링으로 전환됨)
 */
export default async function Page(props: PageProps<"/[lang]/teams">) {
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
  const selectedLeagueTier = leagues.find((league) => league.id === selectedLeague)?.tier ?? null;

  const standings = selectedLeague
    ? await dataSource.getStandings({ leagueId: selectedLeague })
    : [];
  const teams = [...(await dataSource.getTeamsByIds(standings.map((row) => row.teamId)))].sort(
    (a, b) => a.name.localeCompare(b.name),
  );

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{t(locale, "team.list.title")}</h1>
        <p className="text-sm text-muted-foreground">{t(locale, "team.list.description")}</p>
      </header>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="eyebrow text-muted-foreground">
                {t(locale, "team.list.leagueLabel")}
              </span>
              <select
                name="league"
                defaultValue={selectedLeague ?? ""}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
              >
                {leagues.map((league) => (
                  // 리그명은 고유명사라 번역 대상이 아니다(D-17) — 값 그대로 렌더한다.
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t(locale, "team.list.apply")}
            </button>
          </form>
        </CardContent>
      </Card>

      {leagues.length === 0 ? (
        <EmptyState locale={locale} titleKey="team.list.emptyLeagues" />
      ) : teams.length === 0 ? (
        <EmptyState locale={locale} titleKey="team.empty.message" />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li key={team.id}>
              <TeamListCard
                locale={locale}
                team={team}
                tier={selectedLeagueTier}
                leagueId={selectedLeague}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamListCard({
  locale,
  team,
  tier,
  leagueId,
}: {
  readonly locale: SupportedLocale;
  readonly team: Team;
  readonly tier: number | null;
  readonly leagueId: LeagueId | null;
}) {
  const squadHref = `/${locale}/teams/${team.id}`;
  const standingsHref = leagueId ? `/${locale}/leagues/${leagueId}` : null;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <TeamBadge locale={locale} state={{ status: "ready", data: team }} />
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{team.name}</CardTitle>
            {tier !== null && (
              <span className="eyebrow text-muted-foreground">
                {t(locale, "team.list.tierFormat", { tier })}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap gap-2">
        <Link
          href={squadHref}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
        >
          {t(locale, "team.list.squadLinkLabel")}
        </Link>
        {standingsHref && (
          <Link
            href={standingsHref}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            {t(locale, "team.list.standingsLinkLabel")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
