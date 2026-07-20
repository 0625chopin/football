// Task 011(16일차) 골격.
export const team = {
  list: {
    title: "팀 목록",
  },
  detail: {
    title: "팀 프로필",
    rosterTitle: "선수단",
  },
  empty: {
    message: "표시할 팀이 없습니다.",
  },
  error: {
    loadFailed: "팀 정보를 불러오지 못했습니다.",
  },
};

export type TeamMessages = typeof team;
