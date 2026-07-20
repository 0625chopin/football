/**
 * `/[lang]/transfers` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 화면 본문은 4팀 Task 019(40일차)에서 채운다.
 */
export default async function Page(props: PageProps<"/[lang]/transfers">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/transfers", lang })}</pre>
    </main>
  );
}
