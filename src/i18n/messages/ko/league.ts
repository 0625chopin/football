// Task 011(16일차) 골격. 리그 표준분류(순위표/일정)는 019·020 화면 구현(28일차 이후)에서 확장.
//
// 39일차(Task 016, 5팀): `header`/`zone`/`table` 그룹 추가 — `/leagues/[leagueId]` 순위표
// 화면(`docs/wireframe/02-리그-순위표.md`) B1·B2·B3 영역. 프리픽스는 그 문서 §4 "번역키
// 프리픽스" 열을 그대로 따른다.
//
// 40일차(Task 016, 5팀): `tiebreak` 그룹 추가 — B4 영역. `stageNSuffix`는 FR-LG-005 2~7
// 단계 명사구 + 한국어 조사(로/으로)를 미리 붙여 둔 완성형이다(예: "골득실로"). 문장은
// `decidedBy` 템플릿이 `{ranks}위는 {stage} 순위가 갈렸습니다` 형태로 그대로 이어붙인다 —
// 조사 결합기를 새로 만들지 않고 고정 7종 enum이라는 점을 이용해 값 자체에 조사를 담았다.
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
  tiebreak: {
    title: "타이브레이커 적용 단계",
    // {ranks}는 "2·3"처럼 미리 조합된 순위 목록, {stage}는 stageNSuffix 값 그대로 치환된다.
    // 동률 블록 전체가 한 단계로만 갈렸을 때(하위구간 1개) 그대로 쓴다.
    decidedBy: "{ranks}위는 {stage} 순위가 갈렸습니다.",
    // 한 승점 동률 블록 안에서 구성원마다 다른 단계로 갈렸을 때(하위구간 2개 이상) 쓴다.
    // {blockRanks}는 블록 전체 순위 목록, {clauses}는 `clause` 조각을 clauseSeparator로
    // 이어붙인 문자열이다.
    decidedByMulti: "{blockRanks}위 동률 — {clauses} 순위가 갈렸습니다.",
    // decidedByMulti 안에서 하위구간 하나를 나타내는 조각. 이것만으로는 문장이 아니다
    // (마침표·"순위가 갈렸습니다"는 decidedByMulti가 한 번만 붙인다).
    clause: "{ranks}위는 {stage}",
    clauseSeparator: ", ",
    stage2Suffix: "골득실로",
    stage3Suffix: "다득점으로",
    stage4Suffix: "승자승으로",
    stage5Suffix: "다승으로",
    stage6Suffix: "페어플레이로",
    stage7Suffix: "시드 추첨으로",
  },
  empty: {
    message: "표시할 리그가 없습니다.",
  },
  error: {
    loadFailed: "리그 정보를 불러오지 못했습니다.",
  },
};

export type LeagueMessages = typeof league;
