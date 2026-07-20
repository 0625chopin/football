import { t } from "@/i18n/t";
import { DEFAULT_LOCALE } from "@/i18n/locales";

/**
 * `/[lang]/teams/[teamId]` 로딩 폴백 — Task 005(13일차), 빈 자리표시자.
 *
 * 화면 본문은 5팀 소관이며 28일차 이후 채워진다. 4팀은 라우트 골격만 만든다.
 * lang 파라미터를 받지 못하는 특수 파일이라 DEFAULT_LOCALE로 고정 표시한다(`src/i18n/README.md` §4, 22일차).
 */
export default function Loading() {
  return (
    <main aria-busy="true" className="p-4 text-sm text-foreground/60">
      {t(DEFAULT_LOCALE, "common.action.loading")}
    </main>
  );
}
