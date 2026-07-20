/**
 * `/[lang]/leagues/[leagueId]` 라우트 골격 — Task 005(10일차), 빈 페이지.
 *
 * 화면 본문은 5팀 소관(`src/app/leagues/**`, page.tsx 본문)이며 28일차 이후
 * 채워진다. 4팀은 라우트 골격만 만든다.
 */
export default async function Page(
  props: PageProps<"/[lang]/leagues/[leagueId]">,
) {
  const { lang, leagueId } = await props.params;

  return (
    <main>
      <pre>
        {JSON.stringify({
          route: "/[lang]/leagues/[leagueId]",
          lang,
          leagueId,
        })}
      </pre>
    </main>
  );
}
