/**
 * `/[lang]/players/[playerId]` 로딩 폴백 — Task 005(13일차), 빈 자리표시자.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 */
export default function Loading() {
  return (
    <main aria-busy="true" className="p-4 text-sm text-foreground/60">
      불러오는 중… (준비 중)
    </main>
  );
}
