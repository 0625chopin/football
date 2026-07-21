import type { StatMessages } from "../ko/stat";

export const stat: StatMessages = {
  leaderboard: {
    title: "Leaderboard",
    pageTitle: "Stat Rankings",
    caption: "Player season stat rankings",
  },
  table: {
    rank: "Rank",
    player: "Player",
    team: "Team",
    league: "League",
  },
  filters: {
    minAppearanceLabel: "Minimum appearance rate",
    minAppearanceDefault: "Default: 30%+ appearance rate",
    leagueLabel: "League",
    allLeagues: "Combined (all leagues)",
    metricLabel: "Metric",
    showAllToggle: "Ignore appearance filter, show all",
    apply: "Apply filters",
  },
  metrics: {
    goals: "Goals",
    assists: "Assists",
    appearances: "Appearances",
    minutesPlayed: "Minutes played",
    shots: "Shots",
    shotsOnTarget: "Shots on target",
    xg: "Expected goals (xG)",
    xa: "Expected assists (xA)",
    keyPasses: "Key passes",
    tacklesWon: "Tackles won",
    interceptions: "Interceptions",
    saves: "Saves",
  },
  empty: {
    message: "No stats to display.",
  },
  error: {
    loadFailed: "Failed to load stats.",
  },
};
