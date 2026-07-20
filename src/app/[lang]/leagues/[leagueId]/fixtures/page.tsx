/**
 * `/[lang]/leagues/[leagueId]/fixtures` 라우트 골격 — Task 005(10일차), 빈 페이지.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 */
export default async function Page(
  props: PageProps<"/[lang]/leagues/[leagueId]/fixtures">,
) {
  const { lang, leagueId } = await props.params;

  return (
    <main>
      <pre>
        {JSON.stringify({
          route: "/[lang]/leagues/[leagueId]/fixtures",
          lang,
          leagueId,
        })}
      </pre>
    </main>
  );
}
