/**
 * `/[lang]/admin/config` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 화면 본문 담당은 추후 확정(`/[lang]/admin/page.tsx` 참조). 지금은
 * 라우트 골격만 만든다. `admin` 세그먼트에 별도 `layout.tsx`는 두지 않는다.
 */
export default async function Page(props: PageProps<"/[lang]/admin/config">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/admin/config", lang })}</pre>
    </main>
  );
}
