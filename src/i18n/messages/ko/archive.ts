// Task 019(42일차, 4팀) — `/[lang]/archive` 시즌 아카이브 전용 네임스페이스.
//
// ## 왜 지금은 항상 `page.empty`만 렌더되는가
// `FR-UI-013`(`docs/require/03-functional-requirements.md`)의 UC-011 선행조건은 "시즌
// 1회 이상 종료"이고, 미충족 시 빈 상태 문구를 "완료된 시즌이 없습니다"로 스펙 자체가
// 명시한다. `MockDataSource.getSeasons()`는 D-15(단일 월드)에 따라 진행 중 시즌 1건만
// 반환하며(`endedAt: null`), `TeamSeason.finalRank`도 타입 주석부터 "시즌 종료 전에는
// null"이다 — 즉 지금 완료 시즌이 0건인 건 결함이 아니라 스펙이 예견한 케이스다(42일차
// 착수 전 팀장 보고·확인). 과거 시즌 스냅샷을 지어내지 않는다(41일차 `awards.ts` 헤더
// 주석과 동일 판단, 3팀 41일차 거절 사례 참조).
//
// `page.empty` 이하 나머지 키(시즌 선택기·최종 순위·우승·수상 요약)는 완료 시즌이
// 생기는 즉시 그대로 동작하도록 배선만 완결해 둔다 — 오늘 실렌더로 검증되는 것은
// `page.empty` 경로뿐이다.
export const archive = {
  page: {
    title: "시즌 아카이브",
    caption: "완료된 시즌의 최종 순위·우승·수상을 확인합니다.",
    empty: "완료된 시즌이 없습니다.",
    emptyDescription: "현재 시즌이 아직 진행 중입니다. 시즌이 종료되면 이곳에 기록이 쌓입니다.",
  },
  season: {
    navLabel: "시즌 선택",
    numberFormat: "시즌 {number}",
  },
  standings: {
    title: "최종 순위",
    caption: "승격·플레이오프·강등 구간은 각 리그 표 위 범례를 참고하세요.",
    empty: "이 리그의 최종 순위 데이터가 없습니다.",
  },
  champions: {
    title: "우승",
    leagueHeader: "리그",
    teamHeader: "우승팀",
    empty: "우승 정보가 없습니다.",
  },
  awardsSummary: {
    title: "수상 요약",
    caption: "이 시즌 확정된 개인·팀 수상 내역입니다.",
    empty: "이 시즌 수상 기록이 없습니다.",
    typeHeader: "수상",
    subjectHeader: "수상자",
    leagueHeader: "리그",
  },
  subject: {
    unresolvedManager: "감독 정보 없음",
  },
};

export type ArchiveMessages = typeof archive;
