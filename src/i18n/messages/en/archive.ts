import type { ArchiveMessages } from "../ko/archive";

export const archive: ArchiveMessages = {
  page: {
    title: "Season Archive",
    caption: "Browse final standings, champions, and awards for completed seasons.",
    empty: "No completed seasons yet.",
    emptyDescription: "The current season is still in progress. Records will appear here once a season ends.",
  },
  season: {
    navLabel: "Select season",
    numberFormat: "Season {number}",
  },
  standings: {
    title: "Final Standings",
    caption: "See the legend above each league table for promotion, playoff, and relegation zones.",
    empty: "No final standings for this league.",
  },
  champions: {
    title: "Champions",
    leagueHeader: "League",
    teamHeader: "Champion",
    empty: "No champion recorded.",
  },
  awardsSummary: {
    title: "Award Summary",
    caption: "Confirmed individual and team awards for this season.",
    empty: "No awards recorded for this season.",
    typeHeader: "Award",
    subjectHeader: "Recipient",
    leagueHeader: "League",
  },
  subject: {
    unresolvedManager: "Manager info unavailable",
  },
};
