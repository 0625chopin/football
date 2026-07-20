/**
 * `/[lang]/bet` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 2차(배팅) 기능 활성화 전까지 자리만 예약한다(ROADMAP Task 005 "플래그로
 * 비활성"). 실제 feature flag 시스템은 아직 프로젝트에 도입되지 않았으므로
 * (CLAUDE.md "아직 도입되지 않은 것") 코드 레벨 조건부 렌더링은 만들지 않고
 * placeholder만 둔다.
 */
export default async function Page(props: PageProps<"/[lang]/bet">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]/bet", lang })}</pre>
    </main>
  );
}
