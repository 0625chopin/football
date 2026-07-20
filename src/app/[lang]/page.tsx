/**
 * `/[lang]` 홈 라우트 골격 — Task 005(10일차), 빈 페이지.
 *
 * 실제 홈 화면 본문은 5팀이 28일차 이후에 채운다(팀 스케줄 §1 소유 경로 표 —
 * 4팀은 라우트 골격만, `src/app/`의 `page.tsx` 본문은 5팀 소관 라우트에 한해
 * 5팀이 작성). 지금은 라우트가 살아있고 `params`가 올바르게 흐르는지만
 * 확인하는 자리 표시자다.
 *
 * 참조: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md
 * (PageProps 헬퍼, Next.js 16 신규 관례)
 */
export default async function Page(props: PageProps<"/[lang]">) {
  const { lang } = await props.params;

  return (
    <main>
      <pre>{JSON.stringify({ route: "/[lang]", lang })}</pre>
    </main>
  );
}
