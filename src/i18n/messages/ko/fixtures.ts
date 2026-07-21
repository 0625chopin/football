// Task 016(41일차, 5팀) — `/leagues/[leagueId]/fixtures` 일정/결과 화면
// (`docs/wireframe/03-일정-결과.md`) C1(라운드 네비게이션)·C2(경기 목록)·C3(특수 대진)
// 전용 네임스페이스. B1(리그 헤더·탭)은 순위표 화면과 공유해 `league.*`에 둔다(그 파일
// 주석 참조) — 이 파일은 이 화면 로컬 영역만 담는다.
//
// 신규 네임스페이스 생성 근거: 와이어프레임 §4 "번역키 프리픽스" 열이 `fixtures.*`를
// 명시한다. `docs/team-schedule/05-화면배팅UX팀.md` 소유 메시지 파일 각주(bet/admin/
// league/team/player)에는 아직 열거되지 않았지만, 35일차 규약("화면을 소유한 팀이 자기
// 키 파일을 소유")과 `bet.ts` 신설 전례(§ 그 문서 232행)를 따라 만든다 — 완료 보고에서
// 4팀에 통지한다.
export const fixtures = {
  round: {
    navLabel: "라운드 이동",
    // {current}/{total}은 FixtureRoundBounds.currentRound/maxRound 그대로 치환된다.
    label: "라운드 {current} / {total}",
    prevLabel: "이전 라운드",
    nextLabel: "다음 라운드",
    currentLabel: "현재로",
    // {time}은 formatKickoff(..., "dateTime") 결과 — FR-LG-008상 한 라운드의 전 경기가
    // 동일 kickoffAt을 가지므로 라운드당 하나의 킥오프 시각만 표시하면 된다.
    kickoffLabel: "킥오프 {time} (로컬)",
    chipAriaLabel: "{round}라운드",
  },
  match: {
    // {league}/{season}/{round}는 각각 League.name(고유명사)·조합된 seasonLabel·round 숫자.
    caption: "{league} {season} {round}라운드 일정",
    vsFormat: "{home} vs {away}",
    // FR-UI-004 명문 문구 — 프리시즌·월드 생성 직후 대진 생성 전에 실제 발생.
    emptySchedule: "일정이 생성되지 않았습니다.",
    errorLoadFailed: "일정을 불러오지 못했습니다.",
    // 42일차(Task 016, 5팀) — I-210 해소: C2를 `<table>`로 전환하며 추가한 열 헤더
    // 4종(`scope="col"`). 시각적으로는 `<thead>` 전체를 sr-only로 감춘다(와이어프레임
    // 목업에 헤더 행이 그려져 있지 않다) — 텍스트는 스크린리더 전용이라 길이 제약이 없다.
    statusHeader: "경기 상태",
    homeHeader: "홈 팀",
    scoreHeader: "스코어",
    awayHeader: "원정 팀",
  },
  special: {
    title: "특수 대진",
    tiebreakLabel: "승강 결정 플레이오프",
  },
};

export type FixturesMessages = typeof fixtures;
