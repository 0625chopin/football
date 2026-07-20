/**
 * `/[lang]/sample` 라우트 골격 — Task 005(10일차), 빈 페이지.
 *
 * `/sample` 쇼케이스 본편은 4팀 Task 014(34~38일차)에서 완성된다. 지금은
 * 라우트 골격만 만든다.
 */
export default async function Page(props: PageProps<"/[lang]/sample">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/sample", lang })}</pre>
    </main>
  );
}
