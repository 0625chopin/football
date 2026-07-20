// Task 011(16일차) 골격. 성장 곡선·부상 타임라인·트로피 등 확장 키는 013A(28일차 이후) 컴포넌트 구현 시 추가.
export const player = {
  list: {
    title: "선수 목록",
  },
  detail: {
    title: "선수 프로필",
    statsTitle: "시즌 스탯",
  },
  empty: {
    message: "표시할 선수가 없습니다.",
  },
  error: {
    loadFailed: "선수 정보를 불러오지 못했습니다.",
  },
};

export type PlayerMessages = typeof player;
