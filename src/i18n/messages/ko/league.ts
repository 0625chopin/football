// Task 011(16일차) 골격. 리그 표준분류(순위표/일정)는 019·020 화면 구현(28일차 이후)에서 확장.
//
// 39일차(Task 016, 5팀): `header`/`zone`/`table` 그룹 추가 — `/leagues/[leagueId]` 순위표
// 화면(`docs/wireframe/02-리그-순위표.md`) B1·B2·B3 영역. 프리픽스는 그 문서 §4 "번역키
// 프리픽스" 열을 그대로 따른다.
export const league = {
  list: {
    title: "리그 목록",
  },
  detail: {
    title: "리그 정보",
    standingsTitle: "순위표",
    scheduleTitle: "일정",
  },
  header: {
    // {tier}는 League.tier(1/2/3) 그대로 치환된다.
    tierLabel: "티어 {tier}",
    // {count}는 League.teamCount 그대로 치환된다.
    teamCountFormat: "{count}팀",
    // {number}는 Season.seasonNumber 그대로 치환된다.
    seasonLabel: "시즌 {number}",
  },
  zone: {
    legendTitle: "존 범례",
    promotionLabel: "승격",
    playoffLabel: "플레이오프",
    relegationLabel: "강등",
    // 잔류는 범례에만 쓰인다 — 행에는 마커를 표시하지 않는다(NFR-A11Y-002 대상은 "의미
    // 있는 신호"뿐이고, 잔류는 신호 부재 자체가 신호라 별도 마커가 필요 없다).
    neutralLabel: "잔류",
  },
  table: {
    // {league}/{season}은 각각 League.name(고유명사, D-17 번역 대상 아님)·
    // seasonLabel(위에서 조합한 값) 그대로 치환된다.
    caption: "{league} {season} 순위표",
    rank: "#",
    rankFull: "순위",
    team: "팀",
    played: "경기",
    won: "승",
    drawn: "무",
    lost: "패",
    goalsFor: "득",
    goalsAgainst: "실",
    goalDifference: "득실",
    points: "승점",
    form: "최근5",
    // FR-UI-003 명문 문구 — 프리시즌/월드 생성 직후 실제 발생.
    emptySeason: "시즌이 아직 시작되지 않았습니다.",
  },
  empty: {
    message: "표시할 리그가 없습니다.",
  },
  error: {
    loadFailed: "리그 정보를 불러오지 못했습니다.",
  },
};

export type LeagueMessages = typeof league;
