/**
 * G3 "경과 표시"(`docs/wireframe/07-어드민-운영콘솔.md` G3, "03:14:02 경과") 서식 헬퍼.
 *
 * `src/i18n/format.ts`에 추가하지 않은 이유: 그 파일은 4팀 소유 i18n 규약 파일이고
 * (`docs/team-schedule/05-화면배팅UX팀.md` §1 "4팀 소유 경로" 표), 이 계산은 특정 화면
 * (`/admin`)의 로컬 표시 로직이라 화면 소유 경로(5팀) 안에 둔다.
 *
 * `Date.now()` 사용은 위반이 아니다 — 금지는 `src/lib/sim/**`(NFR-DT-001) 한정이며,
 * `components/state/CountdownTimer` 등 UI 계층에서 현재 시각을 읽는 것은 이미 허용된
 * 패턴이다(CLAUDE.md 참고).
 */
export function formatElapsedClock(fromIso: string, nowMs: number): string {
  const fromMs = new Date(fromIso).getTime();
  const totalSeconds = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
