import type {
  AwardScope,
  AwardType,
  BetMarketStatus,
  EnumTranslationCatalog,
  InjurySeverity,
  InjuryStatus,
  ManagerStyle,
  MatchEventType,
  NewsFeedItemType,
  Position,
  SeasonPhase,
  TrophyType,
} from "@/types";

// Task 011(19일차) — enum 표시명 카탈로그 골격 (3팀 H-10 목록: 포지션 11군·이벤트 23종·
// 부상 4등급·전술 6종·페이즈 6종·수상 12종·마켓 상태 4종). `EnumTranslationCatalog<T>`
// (T12, `@/types` — `src/types/config.ts`)로 각 그룹을 감싸 도메인 enum의 **전 멤버**가
// 매핑됐는지 tsc가 강제한다 — 유니온 멤버가 늘거나 줄면 이 파일이 즉시 컴파일 오류로 드러난다.
//
// 23일차: 3팀이 `docs/handoff/H-10-enum-display-names.md`(13일차 확정, 4팀 검수 반영)의
// 잠정 표시명으로 값을 채웠다. 표시명 열에는 괄호·부연설명을 넣지 않는 컨벤션(같은 문서
// §"표시명 작성 컨벤션")을 따랐다 — 부연이 필요한 항목(`SECOND_YELLOW`·`HIGH_PRESS`·
// `GOLDEN_GLOVE`·`TIEBREAK`·`PENALTY_SCORED`·`PENALTY_SHOOTOUT`)은 아래 각 값 옆 주석으로만
// 남기고 표시명 문자열 자체에는 넣지 않았다.
//
// 22일차: `../index.ts`의 통합 `messages` 카탈로그에 합류했다(팀장 지시, Provider
// 실배선과 동일 일차).
//
// 24일차(I-135): H-10 문서상 7그룹+AwardScope 별도 절(4종) 중 `AwardScope` 그룹
// 골격이 누락돼 있던 것을 추가했다. 값은 19일차 골격과 동일한 관례로 **자리표시자**
// (enum 리터럴 echo)이며, 실제 표시명은 3팀이 채운다(4팀은 값을 임의로 채우지 않는다).
//
// 도메인 enum 값은 `@/types` 배럴에서만 import한다(서브경로 `@/types/enums` 금지, C-5).

const position: EnumTranslationCatalog<Position> = {
  GK: "골키퍼",
  CB: "센터백",
  LB: "레프트백",
  RB: "라이트백",
  DM: "수비형 미드필더",
  CM: "중앙 미드필더",
  AM: "공격형 미드필더",
  LW: "레프트윙",
  RW: "라이트윙",
  ST: "스트라이커",
  SS: "세컨드 스트라이커",
};

const matchEvent: EnumTranslationCatalog<MatchEventType> = {
  KICKOFF: "킥오프",
  SHOT_ON: "유효슈팅",
  SHOT_OFF: "빗나간 슈팅",
  SHOT_BLOCKED: "블록된 슈팅",
  GOAL: "골",
  ASSIST: "어시스트",
  OWN_GOAL: "자책골",
  PENALTY_AWARDED: "페널티킥 선언",
  // 정규·연장 PK 득점 시 단독 발생, 같은 골에 GOAL 중복 발생 없음(I-43)
  PENALTY_SCORED: "페널티킥 성공",
  PENALTY_MISSED: "페널티킥 실패",
  YELLOW_CARD: "경고",
  // 옐로카드 두 장 누적으로 즉시 퇴장 처리됨
  SECOND_YELLOW: "두 번째 경고",
  RED_CARD: "퇴장",
  FOUL: "파울",
  OFFSIDE: "오프사이드",
  CORNER: "코너킥",
  SAVE: "선방",
  INJURY: "부상",
  SUBSTITUTION: "선수 교체",
  HALF_TIME: "전반 종료",
  FULL_TIME: "경기 종료",
  EXTRA_TIME_START: "연장전 시작",
  // 킥마다 별도 레코드로 반복 발생(같은 리터럴, 다른 sequence), 리터럴 1종 ≠ 인스턴스 1건(I-44)
  PENALTY_SHOOTOUT: "승부차기 킥",
};

const injurySeverity: EnumTranslationCatalog<InjurySeverity> = {
  KNOCK: "경미한 타박상",
  MINOR: "경상",
  MODERATE: "중등도 부상",
  SEVERE: "중상",
};

// 31일차(I-160과 별개 제보 — 5팀 Task 018 `InjuryTimeline` 구현 중 발견): H-10 문서
// "8. 후속 대상 열거형 목록"에 `InjuryStatus`(2)가 미착수로 남아 있던 그룹. 값 2종뿐이라
// H-10 원 컨벤션(괄호·부연설명 없이 간결한 표시명)을 그대로 따랐다.
const injuryStatus: EnumTranslationCatalog<InjuryStatus> = {
  ACTIVE: "부상 중",
  RECOVERED: "회복 완료",
};

const managerStyle: EnumTranslationCatalog<ManagerStyle> = {
  ATTACKING: "공격적",
  BALANCED: "균형",
  DEFENSIVE: "수비적",
  COUNTER: "역습",
  POSSESSION: "점유율 중시",
  // 고강도 압박 전술
  HIGH_PRESS: "하이프레스",
};

const seasonPhase: EnumTranslationCatalog<SeasonPhase> = {
  REGULAR: "정규 시즌",
  CUP_SLOT: "컵대회 슬롯",
  PLAYOFF: "플레이오프",
  // 승강 경계 동률 발생 시에만 진입하는 조건부 페이즈
  TIEBREAK: "동률 해소전",
  SETTLEMENT: "시즌 정산",
  PRESEASON: "프리시즌",
};

const awardType: EnumTranslationCatalog<AwardType> = {
  LEAGUE_MVP: "리그 MVP",
  GOLDEN_BOOT: "득점왕",
  GOLDEN_PLAYMAKER: "도움왕",
  // 시즌 최소 실점 골키퍼에게 수여
  GOLDEN_GLOVE: "골든글러브",
  BEST_YOUNG_PLAYER: "영플레이어상",
  MANAGER_OF_SEASON: "올해의 감독",
  TEAM_OF_SEASON: "올해의 팀",
  BALLON_DOR: "발롱도르",
  WORLD_XI: "월드 일레븐",
  CUP_MVP: "컵대회 MVP",
  PLAYOFF_MVP: "플레이오프 MVP",
  PLAYER_OF_THE_ROUND: "라운드 MVP",
};

const betMarketStatus: EnumTranslationCatalog<BetMarketStatus> = {
  OPEN: "진행중",
  CLOSED: "마감",
  SETTLED: "정산완료",
  VOIDED: "무효",
};

const awardScope: EnumTranslationCatalog<AwardScope> = {
  LEAGUE: "LEAGUE",
  WORLD: "WORLD",
  CUP: "CUP",
  PLAYOFF: "PLAYOFF",
};

// 33일차(I-166): `TrophyType`(E-32, 4종) 정본 표시명 카탈로그 신설. `TrophyCase.tsx`
// (5팀, Task 013B 32일차)가 `AwardType`은 이 파일의 `awardType`을 그대로 경유하면서도
// `TrophyType`은 카탈로그가 없어 `team.trophy.type.*` 로컬 키로 임시 처리하고 있었다
// (그 파일 헤더 "TrophyType(E-32, 4종) 카탈로그 부재" 절 — 이슈 후보로 남겨 둔 항목).
// 이 그룹이 그 공백을 메운다 — 5팀은 `enums.trophyType.${type}` 키로 그대로 소비하면 된다
// (`awardType`과 동일한 소비 패턴, `t(locale, \`enums.trophyType.${row.trophy.type}\`)`).
const trophyType: EnumTranslationCatalog<TrophyType> = {
  LEAGUE_TITLE: "리그 우승",
  PLAYOFF_TITLE: "플레이오프 우승",
  CUP_TITLE: "컵대회 우승",
  PROMOTION: "승격",
};

// 35일차(5팀 제보) — `NewsFeedItem.type`(E-26, 10종) 표시명 카탈로그 신설. 5팀이 홈 뉴스
// 요약 배지를 배선하다 이 그룹이 없어 D-18(하드코딩 금지) 위반을 피하려고 배지 자체를
// 생략해 두었던 공백을 메운다. 값은 `src/types/enums.ts`(8일차 동결) `NewsFeedItemType`
// 전량이다.
const newsFeedItemType: EnumTranslationCatalog<NewsFeedItemType> = {
  TRANSFER: "이적",
  LOAN: "임대",
  RETIREMENT: "은퇴",
  YOUTH_DEBUT: "유소년 데뷔",
  MANAGER_CHANGE: "감독 교체",
  SPONSOR_BANKRUPT: "스폰서 파산",
  AWARD: "수상",
  INJURY: "부상",
  MILESTONE: "마일스톤",
  SANCTION: "제재",
};

export const enums = {
  position,
  matchEvent,
  injurySeverity,
  injuryStatus,
  managerStyle,
  seasonPhase,
  awardType,
  betMarketStatus,
  awardScope,
  trophyType,
  newsFeedItemType,
};

export type EnumsMessages = typeof enums;
