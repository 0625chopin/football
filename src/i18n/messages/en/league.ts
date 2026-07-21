import type { LeagueMessages } from "../ko/league";

export const league: LeagueMessages = {
  list: {
    title: "Leagues",
  },
  detail: {
    title: "League info",
    standingsTitle: "Standings",
    scheduleTitle: "Schedule",
  },
  header: {
    tierLabel: "Tier {tier}",
    teamCountFormat: "{count} teams",
    seasonLabel: "Season {number}",
  },
  zone: {
    legendTitle: "Zone key",
    promotionLabel: "Promotion",
    playoffLabel: "Play-off",
    relegationLabel: "Relegation",
    neutralLabel: "Mid-table",
  },
  table: {
    caption: "{league} {season} standings",
    rank: "#",
    rankFull: "Rank",
    team: "Team",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    goalsFor: "GF",
    goalsAgainst: "GA",
    goalDifference: "GD",
    points: "Pts",
    form: "Form",
    emptySeason: "The season hasn't started yet.",
  },
  empty: {
    message: "No leagues to display.",
  },
  error: {
    loadFailed: "Failed to load league info.",
  },
};
