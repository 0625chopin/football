import type { MatchEventType } from "@/types";

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
    // 43일차(Task 017, 5팀) — D3 R-11 경계 표시. "결과를 미리 알 수 있으면 이 화면은
    // 실패"(와이어프레임 04번 §2)라, 노출 중단 지점을 침묵 대신 명문으로 알린다.
    futureBoundary: "경기 진행 중 — {minute}분 이후 미공개",
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
  },
  bracket: {
    empty: "표시할 대진표가 없습니다.",
    error: "대진표를 불러오지 못했습니다.",
    tbd: "미정",
  },
  playoffs: {
    // {league}는 League.name 그대로 치환된다(고유명사, 번역 대상 아님, D-17).
    title: "{league} 플레이오프",
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
