import type { EnumsMessages } from "../ko/enums";

// Task 011(19일차) — ko(`../ko/enums.ts`)와 동일한 골격. `EnumsMessages` 타입을 만족해야
// 하므로 ko 쪽 그룹·키가 늘거나 줄면 이 파일도 즉시 컴파일 오류로 드러난다.
//
// 23일차: 3팀이 `docs/handoff/H-10-enum-display-names.md`의 잠정 영문 표시명으로 값을
// 채웠다. ko와 동일하게 표시명 열에는 괄호·부연설명을 넣지 않았다.
//
// 24일차(I-135): `awardScope` 그룹 골격 추가. ko와 동일하게 값은 자리표시자(enum
// 리터럴 echo)이며, 3팀이 실제 영문 표시명을 채운다.

export const enums: EnumsMessages = {
  position: {
    GK: "Goalkeeper",
    CB: "Centre-Back",
    LB: "Left-Back",
    RB: "Right-Back",
    DM: "Defensive Midfielder",
    CM: "Central Midfielder",
    AM: "Attacking Midfielder",
    LW: "Left Winger",
    RW: "Right Winger",
    ST: "Striker",
    SS: "Second Striker",
  },
  matchEvent: {
    KICKOFF: "Kickoff",
    SHOT_ON: "Shot on Target",
    SHOT_OFF: "Shot off Target",
    SHOT_BLOCKED: "Blocked Shot",
    GOAL: "Goal",
    ASSIST: "Assist",
    OWN_GOAL: "Own Goal",
    PENALTY_AWARDED: "Penalty Awarded",
    // Sole event on regular/extra-time PK goals — no duplicate GOAL for the same goal (I-43)
    PENALTY_SCORED: "Penalty Scored",
    PENALTY_MISSED: "Penalty Missed",
    YELLOW_CARD: "Yellow Card",
    // Immediate red card from a second yellow card
    SECOND_YELLOW: "Second Yellow Card",
    RED_CARD: "Red Card",
    FOUL: "Foul",
    OFFSIDE: "Offside",
    CORNER: "Corner Kick",
    SAVE: "Save",
    INJURY: "Injury",
    SUBSTITUTION: "Substitution",
    HALF_TIME: "Half Time",
    FULL_TIME: "Full Time",
    EXTRA_TIME_START: "Extra Time Start",
    // Repeats as a separate record per kick (same literal, different sequence) — 1 literal != 1 instance (I-44)
    PENALTY_SHOOTOUT: "Penalty Shootout Kick",
  },
  injurySeverity: {
    KNOCK: "Knock",
    MINOR: "Minor",
    MODERATE: "Moderate",
    SEVERE: "Severe",
  },
  // 31일차 — H-10 §8 미착수 목록에 있던 `InjuryStatus`(2) 그룹, 5팀 제보로 오늘 채움.
  injuryStatus: {
    ACTIVE: "Injured",
    RECOVERED: "Recovered",
  },
  managerStyle: {
    ATTACKING: "Attacking",
    BALANCED: "Balanced",
    DEFENSIVE: "Defensive",
    COUNTER: "Counter-Attacking",
    POSSESSION: "Possession-Based",
    // High-intensity pressing tactic
    HIGH_PRESS: "High Press",
  },
  seasonPhase: {
    REGULAR: "Regular Season",
    CUP_SLOT: "Cup Slot",
    PLAYOFF: "Playoff",
    // Conditional phase entered only when promotion/relegation boundary ties occur
    TIEBREAK: "Tiebreak",
    SETTLEMENT: "Settlement",
    PRESEASON: "Preseason",
  },
  awardType: {
    LEAGUE_MVP: "League MVP",
    GOLDEN_BOOT: "Golden Boot",
    GOLDEN_PLAYMAKER: "Golden Playmaker",
    // Awarded to the goalkeeper with the fewest goals conceded in the season
    GOLDEN_GLOVE: "Golden Glove",
    BEST_YOUNG_PLAYER: "Best Young Player",
    MANAGER_OF_SEASON: "Manager of the Season",
    TEAM_OF_SEASON: "Team of the Season",
    BALLON_DOR: "Ballon d'Or",
    WORLD_XI: "World XI",
    CUP_MVP: "Cup MVP",
    PLAYOFF_MVP: "Playoff MVP",
    PLAYER_OF_THE_ROUND: "Player of the Round",
  },
  betMarketStatus: {
    OPEN: "Open",
    CLOSED: "Closed",
    SETTLED: "Settled",
    VOIDED: "Voided",
  },
  awardScope: {
    LEAGUE: "League",
    WORLD: "World",
    CUP: "Cup",
    PLAYOFF: "Playoff",
  },
  // 33일차(I-166) — `trophyType` 그룹 신설, ko와 동일한 4종.
  trophyType: {
    LEAGUE_TITLE: "League Title",
    PLAYOFF_TITLE: "Playoff Title",
    CUP_TITLE: "Cup Title",
    PROMOTION: "Promotion",
  },
  // 35일차(5팀 제보) — `newsFeedItemType` 그룹 신설, ko와 동일한 10종.
  newsFeedItemType: {
    TRANSFER: "Transfer",
    LOAN: "Loan",
    RETIREMENT: "Retirement",
    YOUTH_DEBUT: "Youth Debut",
    MANAGER_CHANGE: "Manager Change",
    SPONSOR_BANKRUPT: "Sponsor Bankruptcy",
    AWARD: "Award",
    INJURY: "Injury",
    MILESTONE: "Milestone",
    SANCTION: "Sanction",
  },
};
