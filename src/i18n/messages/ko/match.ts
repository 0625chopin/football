// Task 011(16일차) 골격 — 키 구조는 4팀 소유, 콘텐츠 확장은 5팀 기여 몫
// (`docs/team-schedule/04-UI기반i18n팀.md` §1 소유 경로 각주).
//
// 28일차(013B, 5팀): `timeline`(`EventTimelineItem`)·`news`(`NewsItem`) 그룹 추가.
// `news`는 아직 전용 네임스페이스가 없어(도메인 타입 미정의) 5팀 기여가 허용된 이 파일에
// 임시로 얹었다 — 뉴스 도메인이 확정되면 4팀과 협의해 별도 네임스페이스로 분리 검토.
//
// 29일차(013B, 5팀): `lineup`(`PitchLineup`) 그룹 추가. `unsupportedFormation`은
// `Formation`(src/types/enums.ts)이 아직 값 목록 미확정인 `string`이라, 이 컴포넌트가
// 로컬로 정의한 7종 코드 밖의 값이 들어왔을 때의 방어 상태 문구.
//
// 30일차(013B, 5팀): `bracket`(`BracketTree`) 그룹 추가. 넉아웃 트리는 플레이오프·컵
// 공용이라 특정 화면 전용 네임스페이스가 아직 없어, 기존 5팀 기여분과 같은 파일에
// 얹었다(전용 네임스페이스 분리는 4팀과 협의 필요 — `news`와 동일 판단).
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
  lineup: {
    loading: "라인업을 불러오는 중…",
    empty: "표시할 라인업이 없습니다.",
    error: "라인업을 불러오지 못했습니다.",
    unsupportedFormation: "지원하지 않는 포메이션입니다.",
    captainLabel: "주장",
    captainAbbr: "(C)",
  },
  bracket: {
    empty: "표시할 대진표가 없습니다.",
    error: "대진표를 불러오지 못했습니다.",
    tbd: "미정",
  },
};

export type MatchMessages = typeof match;
