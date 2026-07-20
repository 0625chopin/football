// Task 011(16일차) — 메시지 카탈로그 골격. 값은 `src/app/[lang]/layout.tsx`의
// SiteHeader/SideNav/SiteFooter 하드코딩 문자열(011에서 번역 키로 교체 예정 주석)을
// 그대로 옮긴 것이며, layout.tsx 자체의 실배선은 22일차(LocaleSwitcher.tsx)에 했다.
//
// 22일차: `localeSwitcherPlaceholder`(파라미터화 placeholder)는 실제
// `LocaleSwitcher` 컴포넌트로 교체되며 폐기 — 대신 스위처 자체의 aria-label과 옵션
// 레이블(`localeSwitcherOptionKo`/`En`) 3개 키로 나눈다. 옵션 레이블은 두 로케일
// 카탈로그에서 값이 동일하다(자기 언어의 자체 명칭을 그대로 노출하는 언어 스위처의
// 일반적 UX 관행 — 사용자가 현재 UI 언어를 모르더라도 자신의 언어를 식별할 수 있어야
// 한다). D-17 고유명사와는 다른 이유의 "로케일 불변 문자열"이라 카탈로그에 여전히
// 넣는다(유한 집합 2개, 사람이 리뷰 가능 — i18n/README.md §2.1 판별 질문 참고).
export const common = {
  app: {
    name: "football4",
    devStatus: "개발 진행 중",
  },
  header: {
    leagueSwitcherPlaceholder: "리그 선택 (준비 중)",
    seasonPhaseLabel: "시즌 페이즈: {phase} (준비 중)",
    nextKickoffPlaceholder: "다음 킥오프까지 -- (준비 중)",
    localeSwitcherLabel: "언어 선택",
    localeSwitcherOptionKo: "한국어",
    localeSwitcherOptionEn: "English",
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
    loading: "불러오는 중…",
  },
};

export type CommonMessages = typeof common;
