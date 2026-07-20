// Task 011(16일차) — 메시지 카탈로그 골격. 값은 `src/app/[lang]/layout.tsx`의
// SiteHeader/SideNav/SiteFooter 하드코딩 문자열(011에서 번역 키로 교체 예정 주석)을
// 그대로 옮긴 것이며, layout.tsx 자체의 실배선은 22일차(LocaleSwitcher.tsx)에 한다.
export const common = {
  app: {
    name: "football4",
    devStatus: "개발 진행 중",
  },
  header: {
    leagueSwitcherPlaceholder: "리그 선택 (준비 중)",
    seasonPhaseLabel: "시즌 페이즈: {phase} (준비 중)",
    nextKickoffPlaceholder: "다음 킥오프까지 -- (준비 중)",
    localeSwitcherPlaceholder: "{locale} (준비 중)",
  },
  nav: {
    home: "홈",
    leagues: "리그",
    matches: "경기",
    players: "선수",
    teams: "팀",
    stats: "통계",
    playoffs: "플레이오프",
    cup: "컵",
    transfers: "이적",
    awards: "수상",
    archive: "아카이브",
    sponsors: "스폰서",
  },
  footer: {
    devStatus: "football4 · 개발 진행 중",
  },
  action: {
    comingSoon: "준비 중",
    save: "저장",
    cancel: "취소",
    confirm: "확인",
    close: "닫기",
  },
};

export type CommonMessages = typeof common;
