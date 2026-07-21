// Task 011(16일차) 골격. minAppearanceLabel은 H-05(3팀, 13일차) 최소 출전 필터 UI 근거.
// 39일차(Task 019, 4팀) — 통계 랭킹 화면 실장에 맞춰 leaderboard/filters를 확장하고
// table·metrics 그룹을 신설. minAppearanceLabel은 필드값 변경 없이 그대로 유지(기존
// 소비처 StatBar 등 영향 없음).
export const stat = {
  leaderboard: {
    title: "순위",
    pageTitle: "통계 랭킹",
    caption: "선수 시즌 통계 순위표",
  },
  table: {
    rank: "순위",
    player: "선수",
    team: "팀",
    league: "리그",
  },
  filters: {
    minAppearanceLabel: "최소 출전 비율",
    minAppearanceDefault: "기본값: 최소 출전 30% 이상",
    leagueLabel: "리그",
    allLeagues: "통합(전체 리그)",
    metricLabel: "지표",
    showAllToggle: "출전 조건 무시하고 전체 표시",
    apply: "필터 적용",
  },
  metrics: {
    goals: "골",
    assists: "도움",
    appearances: "출전",
    minutesPlayed: "출전 시간(분)",
    shots: "슈팅",
    shotsOnTarget: "유효 슈팅",
    xg: "기대 득점(xG)",
    xa: "기대 도움(xA)",
    keyPasses: "키패스",
    tacklesWon: "태클 성공",
    interceptions: "인터셉트",
    saves: "선방",
  },
  empty: {
    message: "표시할 통계가 없습니다.",
  },
  error: {
    loadFailed: "통계를 불러오지 못했습니다.",
  },
};

export type StatMessages = typeof stat;
