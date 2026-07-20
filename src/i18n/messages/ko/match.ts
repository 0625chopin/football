// Task 011(16일차) 골격 — 키 구조는 4팀 소유, 콘텐츠 확장은 5팀 기여 몫
// (`docs/team-schedule/04-UI기반i18n팀.md` §1 소유 경로 각주).
export const match = {
  list: {
    title: "경기 목록",
  },
  detail: {
    title: "경기 상세",
    timelineTitle: "타임라인",
  },
  live: {
    label: "라이브",
  },
  empty: {
    message: "표시할 경기가 없습니다.",
  },
  error: {
    loadFailed: "경기 정보를 불러오지 못했습니다.",
  },
};

export type MatchMessages = typeof match;
