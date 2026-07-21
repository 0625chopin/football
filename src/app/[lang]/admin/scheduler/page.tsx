/**
 * `/[lang]/admin/scheduler` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 화면 본문 담당은 추후 확정(`/[lang]/admin/page.tsx` 참조). 지금은
 * 라우트 골격만 만든다. `admin` 세그먼트에 별도 `layout.tsx`는 두지 않는다.
 */
export default async function Page(
  props: PageProps<"/[lang]/admin/scheduler">,
) {
  const { lang } = await props.params;

  return (
    <div className="p-4">
      <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify({ route: "/[lang]/admin/scheduler", lang })}</pre>
    </div>
  );
}
