/**
 * `/[lang]/sponsors` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 화면 본문은 4팀 Task 020(46일차)에서 채운다.
 */
export default async function Page(props: PageProps<"/[lang]/sponsors">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/sponsors", lang })}</pre>
    </main>
  );
}
