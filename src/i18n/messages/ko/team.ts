// Task 011(16일차) 골격. badge 그룹은 Task 013A(28일차) TeamBadge 컴포넌트에서 추가.
export const team = {
  list: {
    title: "팀 목록",
  },
  detail: {
    title: "팀 프로필",
    rosterTitle: "선수단",
  },
  badge: {
    // {name}은 Team.name(고유명사) — 번역 대상 아님(D-17), 그대로 치환된다.
    altText: "{name} 엠블럼",
  },
  empty: {
    message: "표시할 팀이 없습니다.",
  },
  error: {
    loadFailed: "팀 정보를 불러오지 못했습니다.",
  },
};

export type TeamMessages = typeof team;
