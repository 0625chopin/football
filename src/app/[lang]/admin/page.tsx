/**
 * `/[lang]/admin` 라우트 골격 — Task 005(11일차), 빈 페이지.
 *
 * 화면 본문 담당은 추후 확정(4·5팀 소유 경로 표에 admin이 명시되지 않음,
 * H-20 운영 콘솔 3종은 5팀 021·60일차 인계 예정이나 이 라우트와의
 * 대응 관계는 아직 결정되지 않았다). 지금은 라우트 골격만 만든다.
 */
export default async function Page(props: PageProps<"/[lang]/admin">) {
  const { lang } = await props.params;

  return (
    <div className="p-4">
      <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-muted-foreground">{JSON.stringify({ route: "/[lang]/admin", lang })}</pre>
    </div>
  );
}
