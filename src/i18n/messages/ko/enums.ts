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
// 값은 전부 **자리표시자**(enum 리터럴을 그대로 echo)다. 실제 표시명(ko 번역 문구)은
// 3팀이 23일차 이후 채운다 — 4팀은 값을 임의로 채우지 않는다(팀장 인계 사항).
//
// 22일차: `../index.ts`의 통합 `messages` 카탈로그에 합류했다(팀장 지시, Provider
// 실배선과 동일 일차). 이 파일이 바뀐 건 아니다 — index.ts가 이 파일을 import해 9번째
// 네임스페이스로 붙였을 뿐, 값(전부 자리표시자 echo)은 여전히 3팀 소관이라 여기서
// 채우지 않는다.
//
// 도메인 enum 값은 `@/types` 배럴에서만 import한다(서브경로 `@/types/enums` 금지, C-5).

const position: EnumTranslationCatalog<Position> = {
  GK: "GK",
  CB: "CB",
  LB: "LB",
  RB: "RB",
  DM: "DM",
  CM: "CM",
  AM: "AM",
  LW: "LW",
  RW: "RW",
  ST: "ST",
  SS: "SS",
};

const matchEvent: EnumTranslationCatalog<MatchEventType> = {
  KICKOFF: "KICKOFF",
  SHOT_ON: "SHOT_ON",
  SHOT_OFF: "SHOT_OFF",
  SHOT_BLOCKED: "SHOT_BLOCKED",
  GOAL: "GOAL",
  ASSIST: "ASSIST",
  OWN_GOAL: "OWN_GOAL",
  PENALTY_AWARDED: "PENALTY_AWARDED",
  PENALTY_SCORED: "PENALTY_SCORED",
  PENALTY_MISSED: "PENALTY_MISSED",
  YELLOW_CARD: "YELLOW_CARD",
  SECOND_YELLOW: "SECOND_YELLOW",
  RED_CARD: "RED_CARD",
  FOUL: "FOUL",
  OFFSIDE: "OFFSIDE",
  CORNER: "CORNER",
  SAVE: "SAVE",
  INJURY: "INJURY",
  SUBSTITUTION: "SUBSTITUTION",
  HALF_TIME: "HALF_TIME",
  FULL_TIME: "FULL_TIME",
  EXTRA_TIME_START: "EXTRA_TIME_START",
  PENALTY_SHOOTOUT: "PENALTY_SHOOTOUT",
};

const injurySeverity: EnumTranslationCatalog<InjurySeverity> = {
  KNOCK: "KNOCK",
  MINOR: "MINOR",
  MODERATE: "MODERATE",
  SEVERE: "SEVERE",
};

const managerStyle: EnumTranslationCatalog<ManagerStyle> = {
  ATTACKING: "ATTACKING",
  BALANCED: "BALANCED",
  DEFENSIVE: "DEFENSIVE",
  COUNTER: "COUNTER",
  POSSESSION: "POSSESSION",
  HIGH_PRESS: "HIGH_PRESS",
};

const seasonPhase: EnumTranslationCatalog<SeasonPhase> = {
  REGULAR: "REGULAR",
  CUP_SLOT: "CUP_SLOT",
  PLAYOFF: "PLAYOFF",
  TIEBREAK: "TIEBREAK",
  SETTLEMENT: "SETTLEMENT",
  PRESEASON: "PRESEASON",
};

const awardType: EnumTranslationCatalog<AwardType> = {
  LEAGUE_MVP: "LEAGUE_MVP",
  GOLDEN_BOOT: "GOLDEN_BOOT",
  GOLDEN_PLAYMAKER: "GOLDEN_PLAYMAKER",
  GOLDEN_GLOVE: "GOLDEN_GLOVE",
  BEST_YOUNG_PLAYER: "BEST_YOUNG_PLAYER",
  MANAGER_OF_SEASON: "MANAGER_OF_SEASON",
  TEAM_OF_SEASON: "TEAM_OF_SEASON",
  BALLON_DOR: "BALLON_DOR",
  WORLD_XI: "WORLD_XI",
  CUP_MVP: "CUP_MVP",
  PLAYOFF_MVP: "PLAYOFF_MVP",
  PLAYER_OF_THE_ROUND: "PLAYER_OF_THE_ROUND",
};

const betMarketStatus: EnumTranslationCatalog<BetMarketStatus> = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
  SETTLED: "SETTLED",
  VOIDED: "VOIDED",
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
