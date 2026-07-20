import type {
  AwardType,
  BetMarketStatus,
  EnumTranslationCatalog,
  InjurySeverity,
  ManagerStyle,
  MatchEventType,
  Position,
  SeasonPhase,
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

export const enums = {
  position,
  matchEvent,
  injurySeverity,
  managerStyle,
  seasonPhase,
  awardType,
  betMarketStatus,
};

export type EnumsMessages = typeof enums;
