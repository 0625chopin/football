import type { EnumsMessages } from "../ko/enums";

// Task 011(19일차) — ko(`../ko/enums.ts`)와 동일한 골격. `EnumsMessages` 타입을 만족해야
// 하므로 ko 쪽 그룹·키가 늘거나 줄면 이 파일도 즉시 컴파일 오류로 드러난다.
//
// 23일차: 3팀이 `docs/handoff/H-10-enum-display-names.md`의 잠정 영문 표시명으로 값을
// 채웠다. ko와 동일하게 표시명 열에는 괄호·부연설명을 넣지 않았다.

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
};
