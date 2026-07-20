// Task 011(16일차) 골격 — 키 구조는 4팀 소유, 콘텐츠 확장은 5팀 기여 몫
// (`docs/team-schedule/04-UI기반i18n팀.md` §1 소유 경로 각주).
//
// 28일차(013B, 5팀): `timeline`(`EventTimelineItem`)·`news`(`NewsItem`) 그룹 추가.
// `news`는 아직 전용 네임스페이스가 없어(도메인 타입 미정의) 5팀 기여가 허용된 이 파일에
// 임시로 얹었다 — 뉴스 도메인이 확정되면 4팀과 협의해 별도 네임스페이스로 분리 검토.
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
  timeline: {
    loading: "타임라인을 불러오는 중…",
    empty: "표시할 이벤트가 없습니다.",
    error: "이벤트를 불러오지 못했습니다.",
    minuteFormat: "{minute}'",
    addedTimeFormat: "{minute}+{added}'",
  },
  news: {
    loading: "뉴스를 불러오는 중…",
    empty: "표시할 뉴스가 없습니다.",
    error: "뉴스를 불러오지 못했습니다.",
  },
};

export type MatchMessages = typeof match;
