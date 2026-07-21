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
//
// 41일차(Task 016, 5팀): `tab`(B1-t)·`rebuild`(B5) 그룹 + `header.seasonSelectorLabel` 추가.
// `tab`은 순위표·일정 두 화면이 공유하는 세그먼트 레이아웃(`leagues/[leagueId]/layout.tsx`,
// W-16 해소)에서 쓴다. `rebuild`는 FR-LG-007 원문(`docs/require/03-functional-requirements.md`
// 85행)의 페널티 3종·구제 2종 수치를 그대로 옮긴 요약이며, 리그3(`tier === 3`)에서만 렌더된다
// (조건부 영역, 빈 박스 금지 원칙과 별개로 애초에 다른 티어에선 이 그룹 자체를 참조하지 않는다).
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
    // 시즌 선택기(B1 "[시즌 3▾]")의 접근성 라벨. 표시 텍스트는 옵션마다 seasonLabel 재사용.
    seasonSelectorLabel: "시즌 선택",
  },
  tab: {
    standingsLabel: "순위표",
    fixturesLabel: "일정/결과",
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
    // 42일차(Task 016, 5팀) — 축약 헤더(경/승/무/패 등) 풀네임. 와이어프레임 §7
    // NFR-A11Y-005 "축약 헤더는 `<abbr title="...">`로 풀네임 제공"에 맞춰 추가했다.
    // `played`("경기")는 그 자체로 완전한 단어라 축약이 아니지만, 나머지 6열과 표기를
    // 통일해 전 숫자열에 동일하게 `<abbr>`을 적용한다(StandingsTable 참조).
    playedFull: "경기 수",
    won: "승",
    wonFull: "승리",
    drawn: "무",
    drawnFull: "무승부",
    lost: "패",
    lostFull: "패배",
    goalsFor: "득",
    goalsForFull: "득점",
    goalsAgainst: "실",
    goalsAgainstFull: "실점",
    goalDifference: "득실",
    goalDifferenceFull: "득실차",
    points: "승점",
    pointsFull: "승점",
    form: "최근5",
    formFull: "최근 5경기 결과",
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
  rebuild: {
    title: "리빌드 제재 안내",
    summary: "리그3 최하위 2팀(15~16위)에는 강등 대신 리빌드 제재가 적용됩니다.",
    penaltyTitle: "페널티",
    penalty1: "시즌 종료 포인트 최저 구간 지급",
    penalty2: "다음 프리시즌 신규 스폰서 협상 시 팀 명성 −5 보정(1회)",
    penalty3: "팀 명성 −3 영구 반영",
    reliefTitle: "구제",
    relief1: "리빌드 보조금 — 리그3 1위 포인트의 40% 지급",
    relief2: "다음 시즌 유소년 배출 확률 +10%p(1시즌 한정)",
    footnote: "리그 탈락·해체는 하지 않습니다.",
  },
  empty: {
    message: "표시할 리그가 없습니다.",
  },
  error: {
    loadFailed: "리그 정보를 불러오지 못했습니다.",
  },
};

export type LeagueMessages = typeof league;
