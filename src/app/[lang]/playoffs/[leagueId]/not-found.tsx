/**
 * `/[lang]/playoffs/[leagueId]` not-found 폴백 — Task 005(13일차), 빈 자리표시자.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 */
export default function NotFound() {
  return (
    <main className="p-4 text-sm">
      <h2 className="font-semibold">찾을 수 없음 (준비 중)</h2>
      <p className="text-foreground/60">요청한 리소스를 찾을 수 없습니다.</p>
    </main>
  );
}
