// Task 011(16일차) 골격. 리그 표준분류(순위표/일정)는 019·020 화면 구현(28일차 이후)에서 확장.
export const league = {
  list: {
    title: "리그 목록",
  },
  detail: {
    title: "리그 정보",
    standingsTitle: "순위표",
    scheduleTitle: "일정",
  },
  empty: {
    message: "표시할 리그가 없습니다.",
  },
  error: {
    loadFailed: "리그 정보를 불러오지 못했습니다.",
  },
};

export type LeagueMessages = typeof league;
