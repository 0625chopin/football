// Task 011(16일차) 골격. minAppearanceLabel은 H-05(3팀, 13일차) 최소 출전 필터 UI 근거.
export const stat = {
  leaderboard: {
    title: "순위",
  },
  filters: {
    minAppearanceLabel: "최소 출전 비율",
  },
  empty: {
    message: "표시할 통계가 없습니다.",
  },
  error: {
    loadFailed: "통계를 불러오지 못했습니다.",
  },
};

export type StatMessages = typeof stat;
