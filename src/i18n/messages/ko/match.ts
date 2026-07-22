import type { MatchEventType, WeatherType } from "@/types";

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
//
// 34일차(Task 015, 5팀): `card`(`MatchCard`) 그룹 추가. LIVE 배지 라벨은 기존 `live.label`을
// 재사용하고(중복 선언 금지), 이 그룹은 카드 자체의 4상태 문구 + 점수/경과분 서식만 담는다.
//
// 35일차(Task 015, 5팀): `news.sectionTitle` 추가 — 홈 A4 "주요 뉴스 요약" 섹션 제목.
// 새 네임스페이스(`home.*`) 대신 기존 `news` 그룹에 얹었다(뉴스 전용 네임스페이스 분리는
// I-154 판정 대기 중이라 임의로 만들지 않음, 28일차 판단과 동일 근거).
//
// 35일차(Task 015, 5팀, I-169 해소 후속): `upcoming`(A3 "다음 킥오프 목록") 그룹 추가.
//
// 37일차(Task 015, 5팀): `card.emptyNextKickoff` 추가 — A2 Empty 상태 "다음 킥오프 HH:MM"
// 행(와이어프레임 01번 §5). 재시도 버튼 라벨은 새 키를 만들지 않고 `error.generic.retryLabel`
// (4팀 `error.ts`)을 재사용한다 — 문구가 "다시 시도"로 동일해 중복 선언할 이유가 없다.
//
// 41일차(Task 016, 5팀): `card.scheduledLabel`/`finishedLabel`/`voidLabel` 추가 — `MatchCard`
// `density="row"`(와이어프레임 03번 C2-r)가 LIVE 외 3개 상태에도 아이콘+라벨 배지를 내도록
// 확장하면서 필요해졌다(기존엔 LIVE만 배지가 있었다, NFR-A11Y-002). 구조는 4팀 소유지만
// 콘텐츠 확장은 이 파일 헤더 1행이 이미 5팀 몫으로 열어 뒀다.
//
// 43일차(Task 017, 5팀): `score`(`MatchScoreboard`, D1) 그룹 추가 — 경기 상세 스코어보드.
// 상태 라벨(예정/종료/연기)은 새 키를 만들지 않고 기존 `card.scheduledLabel` 등을 재사용한다
// (문구가 동일해 중복 선언할 이유가 없음, 37일차 `emptyNextKickoff` 판단과 동일 원칙).
// PSO 표기(`score.psoFormat`)는 R-13 ① 형식("정규+연장 스코어 (승부차기 홈-원정)")을 그대로
// 옮겼다. `timeline.futureBoundary`도 함께 추가 — D3 R-11 경계 표시(와이어프레임 04번 §3-1).
//
// 45일차(Task 017, 5팀): `lineup`에 평점 테이블 키(`ratingCaption`~`motmLabel`) 추가, `stat`
// (`match.stat.*`, D5 팀 스탯 비교바) 그룹 신설. 와이어프레임 04번 §8 각주 "D4 선수 평점
// 테이블은 StatBar 조합으로 구성하며 신규 컴포넌트를 만들지 않는다"에 따라 이 두 영역은
// 전용 composite 없이 `matches/[matchId]/page.tsx`가 `StatBar`/`Table`을 직접 조합한다.
//
// 46일차(Task 017, 5팀): `info`(D6 날씨·구장 정보)·`weather`(WeatherType 9종 라벨)·
// `odds`(D7 배당 패널) 그룹 추가. `weather`는 `event`와 동일 패턴으로 enum 값을 키로 그대로
// 써 `satisfies Record<WeatherType, string>`로 9종 누락을 컴파일 타임에 막는다. `odds`의
// 라벨 3종(`homeWinLabel`/`drawLabel`/`awayWinLabel`)은 `OddsButton`(4팀 013A)의
// `selection.label`에 주입할 이미 번역된 문자열이다 — `BetSelection.label` 자체는 번역
// 대상 여부가 미정(betting.ts 주석)이지만, 이 화면이 만드는 1X2 라벨은 이 팀이 직접
// 정의하는 문구라 통상 번역 카탈로그 경로를 그대로 따른다.
//
// 44일차(Task 017, 5팀): `event` 그룹 추가 — 이벤트 23종 중계 문구 템플릿(와이어프레임
// 04번 §4 D3 지정 프리픽스 `match.event.*`, "실제 중계 문구는 44일차에 작성한다" 각주 이행).
// `enums.matchEvent.*`(4팀 소유)는 뱃지에 쓰이는 단어 하나짜리 라벨("골")이고, 이 그룹은
// 그와 별개로 문장 전체를 담는 중계 캡션이다 — 용도가 달라 기존 키를 재사용하지 않았다.
// `{playerName}`/`{teamName}`류 고유명사 변수는 R-3/D-17에 따라 번역 대상이 아니므로
// 템플릿에 이름을 박지 않고 자리표시자로만 남긴다(치환은 소비처 책임, `t()` 계약 그대로).
// `{reason}`/`{severity}`도 자유 문자열이 아니라 이미 번역된 값이 주입되는 자리표시자다
// (카드 사유·부상 등급은 E-4에 따라 enum → 번역키 매핑을 거친 결과를 소비처가 넣는다 —
// 이 파일이 그 매핑 자체를 갖지 않는다). `{score}`도 마찬가지로 `card.scoreFormat` 등으로
// 이미 서식화된 문자열을 그대로 주입받는다(중복 서식 로직을 이 템플릿에 만들지 않음).
// `ASSIST`는 D3에서 `GOAL` 행에 병합 표시되어 독립 행으로 그려지지 않지만(E-2), 23종
// 전량을 카탈로그로 관리한다는 이 Task의 수락 기준(하드코딩 0)에 맞춰 템플릿은 채워 둔다
// — 소비 여부와 카탈로그 완비는 별개다. 컴포넌트 소비처 배선은 45일차 이후 잔여 스코프.
export const match = {
  list: {
    title: "경기 목록",
    // 51일차(Task 048, 4팀) — 5팀 047(`/matches` 인덱스, 61일차 예정)용 키 골격 선제 생성.
    // 구조만 만들고 값은 5팀이 채운다. 스코프는 축소 확정(I-255) — 전역·날짜 범위 경기
    // 조회 계약이 `DataSource`에 없어 라이브 + 다음 킥오프 + 리그×라운드 폼까지만이며,
    // 날짜 필터·통합 타임라인 키는 만들지 않는다. 라이브 섹션은 `card.gridTitle` 등
    // 기존 키를, 다음 킥오프 섹션은 `upcoming.*`를 재사용한다(중복 선언 금지) — 이
    // `roundForm` 그룹은 리그×라운드 폼 전용 키만 담는다.
    roundForm: {
      sectionTitle: "리그별 라운드 일정",
      leagueLabel: "리그",
      roundLabel: "라운드",
      submitLabel: "조회",
      empty: "선택한 라운드에 경기가 없습니다.",
      error: "일정을 불러오지 못했습니다.",
    },
  },
  detail: {
    title: "경기 상세",
    timelineTitle: "타임라인",
    lineupTitle: "라인업",
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
    // 43일차(Task 017, 5팀) — D3 R-11 경계 표시. "결과를 미리 알 수 있으면 이 화면은
    // 실패"(와이어프레임 04번 §2)라, 노출 중단 지점을 침묵 대신 명문으로 알린다.
    futureBoundary: "경기 진행 중 — {minute}분 이후 미공개",
    // 47일차(Task 017, 5팀) — 킥오프 전 Empty 상태 명문 문구(와이어프레임 04번 §5,
    // FR-UI-007). 일반 `empty`와 별개 키인 이유는 `EventTimelineItem.tsx` 주석 참조.
    emptyKickoffPending: "아직 이벤트가 없습니다 (킥오프 대기)",
    // 47일차(Task 017, 5팀) — D3 라이브 폴링 신규 이벤트 스크린리더 안내(NFR-A11Y-004,
    // 와이어프레임 04번 §6 I-3). `eventLabel`은 `enums.matchEvent.*`(짧은 배지 라벨)를
    // 그대로 주입한다 — 이 화면이 이미 쓰는 중계 문구 템플릿(`event.*`)과는 다른, 안내
    // 전용의 짧은 문장이다.
    liveAnnouncement: "{minute}분, {eventLabel}, {playerName}",
  },
  news: {
    loading: "뉴스를 불러오는 중…",
    empty: "표시할 뉴스가 없습니다.",
    error: "뉴스를 불러오지 못했습니다.",
    // 35일차(Task 015, 5팀) — 홈 A4 "주요 뉴스 요약" 섹션 제목.
    sectionTitle: "주요 뉴스",
  },
  lineup: {
    loading: "라인업을 불러오는 중…",
    empty: "표시할 라인업이 없습니다.",
    error: "라인업을 불러오지 못했습니다.",
    unsupportedFormation: "지원하지 않는 포메이션입니다.",
    captainLabel: "주장",
    captainAbbr: "(C)",
    ratingSectionTitle: "선수별 평점",
    ratingCaption: "{home} vs {away} 선수별 평점",
    ratingEmpty: "표시할 선수 평점이 없습니다.",
    playerColumn: "선수",
    teamColumn: "팀",
    ratingColumn: "평점",
    motmLabel: "MOTM",
  },
  bracket: {
    empty: "표시할 대진표가 없습니다.",
    error: "대진표를 불러오지 못했습니다.",
    tbd: "미정",
    // 47일차(Task 020, 4팀): `BracketViewport`(domain/) 확대/축소·모바일 라운드 페이징
    // 컨트롤 라벨. D-33 등록형 — 새 네임스페이스가 아니라 기존 bracket 그룹 확장이다.
    zoomGroupLabel: "대진표 확대/축소",
    zoomOutLabel: "축소",
    zoomInLabel: "확대",
    zoomResetLabel: "원래대로",
    zoomLevelFormat: "{percent}%",
    roundNavGroupLabel: "라운드 이동",
    prevRoundLabel: "이전 라운드",
    nextRoundLabel: "다음 라운드",
    roundProgressFormat: "{current} / {total}",
  },
  playoffs: {
    // {league}는 League.name 그대로 치환된다(고유명사, 번역 대상 아님, D-17).
    title: "{league} 플레이오프",
  },
  // 50일차(Task 048, 4팀): `playoffsList`(`/[lang]/playoffs` 인덱스) 그룹 추가. 대회 선택
  // 화면이라 `playoffs`(위, `[leagueId]` 상세 제목)와 분리했다 — `league.ts`가 `list`/`detail`
  // 두 그룹으로 나눈 것과 동일 판단. 슬롯 수·킥오프 표기는 새 키를 만들지 않고
  // `league.header.teamCountFormat`·`match.upcoming.matchupFormat`·`match.cup.matchupFormat`·
  // `fixtures.round.kickoffLabel`을 재사용한다.
  playoffsList: {
    title: "플레이오프",
    description: "리그별 플레이오프 대진을 확인하고, 대진표 또는 컵대회로 이동합니다.",
    slotsLabel: "진출 슬롯",
    roundsGeneratedLabel: "생성 라운드",
    roundsGeneratedFormat: "{count}라운드",
    nextMatchLabel: "다음 경기",
    finalResultLabel: "최종 라운드 결과",
    // I-227(mock 리그1 WC 절삭)로 실제 생성 라운드 수가 명세와 달라도 이 카드는 어댑터
    // 반환값을 그대로 보여준다 — 별도의 "정상" 라운드 수를 가정하지 않는다.
    bracketEmptyTitle: "대진표 미생성",
    bracketEmptyDescription: "이 리그는 플레이오프 대진이 아직 생성되지 않았습니다.",
    detailLinkLabel: "대진표 보기",
    cupSectionTitle: "컵대회",
    cupSectionDescription: "3개 리그 통합 토너먼트 대진표를 확인합니다.",
    cupLinkLabel: "컵대회 대진표 보기",
  },
  // 45일차(Task 020, 4팀): `cup`(`/[lang]/cup`) 그룹 추가. 컵은 3개 리그 통합 단일
  // 대회라 `playoffs`처럼 `{league}` 보간이 없다. 티어 라벨 자체는 `league.header.tierLabel`/
  // `teamCountFormat`을 재사용하고(재선언 금지) 여기는 컵 화면 전용 문구만 담는다.
  cup: {
    title: "컵대회",
    summaryFormat: "{teams}팀 · {rounds}라운드 · {matches}경기",
    byeSectionTitle: "1라운드 부전승",
    byeBadgeLabel: "부전승",
    giantKillingSectionTitle: "자이언트킬링 하이라이트",
    giantKillingBadgeLabel: "자이언트킬링",
    giantKillingEmpty: "아직 자이언트킬링 사례가 없습니다.",
    // 승부차기 골은 득점 합산 대상이 아니라(D-19) 승자/패자 스코어는 정규+연장 스코어만 쓴다.
    matchupFormat: "{winner} {winnerScore}-{loserScore} {loser}",
  },
  card: {
    gridTitle: "실시간 경기",
    empty: "현재 진행 중인 경기가 없습니다",
    emptyNextKickoff: "다음 킥오프 {time}",
    error: "라이브 데이터를 불러오지 못했습니다",
    scoreFormat: "{home} - {away}",
    elapsedFormat: "{minute}'",
    scheduledLabel: "예정",
    finishedLabel: "종료",
    voidLabel: "연기",
  },
  upcoming: {
    sectionTitle: "다음 킥오프",
    empty: "예정된 경기가 없습니다.",
    matchupFormat: "{home} vs {away}",
  },
  score: {
    loading: "스코어보드를 불러오는 중…",
    error: "경기 정보를 불러오지 못했습니다.",
    neutralVenueLabel: "중립지",
    notNeutralVenueLabel: "중립지 아님",
    // R-13 ① 형식 — 정규+연장 스코어와 승부차기를 합산하지 않고 분리 표기한다.
    psoFormat: "{home} - {away} (승부차기 {pkHome}-{pkAway})",
    phase: {
      firstHalf: "전반",
      halfTime: "하프타임",
      secondHalf: "후반",
      extraTime: "연장전",
      penaltyShootout: "승부차기",
    },
  },
  stat: {
    // D5 팀 스탯 비교바(와이어프레임 04번 §4). xG는 요구사항 근거가 확정돼 있어 제외하지
    // 않는다(03-functional-requirements.md:990/1027/1059, 04번 §4 "xG는 D5에서 제외하지
    // 않는다" 각주).
    sectionTitle: "팀 스탯 비교",
    empty: "표시할 팀 스탯이 없습니다.",
    possession: "점유율",
    shots: "슈팅",
    shotsOnTarget: "유효 슈팅",
    corners: "코너킥",
    fouls: "파울",
    yellowCards: "옐로카드",
    redCards: "레드카드",
    xg: "xG",
  },
  info: {
    // D6 경기 정보(와이어프레임 04번 §4). 구장명 번역 여부는 미결(W-12) — `stadiumFormat`은
    // `Team.stadiumName`을 변수 그대로 주입하고(D-17과 동일하게 고유명사 취급), 이 문구
    // 자체가 번역 대상인 건 "(수용 {capacity}명)" 앞뒤 서식뿐이다.
    sectionTitle: "경기 정보",
    stadiumFormat: "{name} (수용 {capacity}명)",
    attendanceFormat: "관중 {count}명",
    weatherFormat: "{weather} · 기온 {temperature}℃",
    empty: "표시할 경기 정보가 없습니다.",
    error: "경기 정보를 불러오지 못했습니다.",
  },
  weather: {
    // FR-MT-006 날씨 9종(enums.ts `WeatherType`) → 번역키(R-2). `event`와 동일하게 enum
    // 값을 키로 그대로 써 `satisfies`로 9종 누락을 컴파일 타임에 막는다.
    CLEAR: "맑음",
    CLOUDY: "흐림",
    RAIN: "비",
    HEAVY_RAIN: "폭우",
    SNOW: "눈",
    WINDY: "강풍",
    HOT: "폭염",
    COLD: "혹한",
    FOG: "안개",
  } satisfies Record<WeatherType, string>,
  odds: {
    // D7 배당 패널(와이어프레임 04번 §4, FR-BT-014 표시 전용). 버튼 자체는 4팀 013A
    // `OddsButton`(disabled 고정) 재사용 — 이 그룹은 셀렉션 라벨·상태 문구·비활성 사유
    // 보조텍스트(I-9 `disabledHint`)만 담는다.
    sectionTitle: "배당 (참고용)",
    empty: "표시할 배당 정보가 없습니다.",
    error: "배당 정보를 불러오지 못했습니다.",
    homeWinLabel: "홈 승",
    drawLabel: "무",
    awayWinLabel: "원정 승",
    // 알려지지 않은 셀렉션 키(1X2 밖 마켓)의 방어적 폴백 라벨 — 값을 지어내지 않되 빈
    // 문자열보다는 화면에 뭔가 표시되게 한다.
    otherLabel: "기타",
    disabledHint: "1차 릴리스에서는 참고용입니다. 베팅 제출은 아직 지원하지 않습니다.",
  },
  event: {
    KICKOFF: "킥오프!",
    SHOT_ON: "{playerName}의 유효 슈팅!",
    SHOT_OFF: "{playerName}의 슈팅, 골대를 벗어났습니다.",
    SHOT_BLOCKED: "{playerName}의 슈팅을 {blockerName}이(가) 막아냅니다.",
    GOAL: "GOAL! {playerName}, {teamName}의 골! {score}",
    ASSIST: "{playerName}의 도움",
    OWN_GOAL: "{playerName}의 자책골입니다… {teamName} {score}",
    PENALTY_AWARDED: "{teamName}에 페널티킥! {foulerName}의 파울입니다.",
    PENALTY_SCORED: "{playerName}, 페널티킥 성공! {score}",
    PENALTY_MISSED: "{playerName}의 페널티킥을 {keeperName}이(가) 막아냅니다.",
    YELLOW_CARD: "{playerName} 옐로카드 — {reason}",
    SECOND_YELLOW: "{playerName} 두 번째 경고, 퇴장입니다!",
    RED_CARD: "{playerName} 레드카드 — {reason}",
    FOUL: "{playerName}의 파울 ({victimName})",
    OFFSIDE: "{playerName} 오프사이드",
    CORNER: "{teamName} 코너킥",
    SAVE: "{keeperName}의 선방! {shooterName}의 슈팅을 막아냅니다.",
    INJURY: "{playerName} 부상 — {severity}",
    SUBSTITUTION: "{teamName} 선수 교체: {playerOut} → {playerIn}",
    HALF_TIME: "전반 종료 {score}",
    FULL_TIME: "경기 종료 {score}",
    EXTRA_TIME_START: "연장전이 시작됩니다 {score}",
    PENALTY_SHOOTOUT: "{playerName}의 승부차기 {kickIndex}번째 킥 — {result}",
  } satisfies Record<MatchEventType, string>,
};

export type MatchMessages = typeof match;
