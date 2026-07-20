/**
 * `/[lang]/stats` 라우트 골격 — Task 005(10일차), 빈 페이지.
 *
 * 실제 통계 랭킹 화면은 4팀 Task 019(39일차)에서 채운다.
 */
export default async function Page(props: PageProps<"/[lang]/stats">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/stats", lang })}</pre>
    </main>
  );
}
