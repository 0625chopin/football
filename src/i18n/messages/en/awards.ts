import type { AwardsMessages } from "../ko/awards";

export const awards: AwardsMessages = {
  page: {
    title: "Awards & Hall of Fame",
    caption: "Browse season awards, the Best XI, and all-time multi-award rankings.",
  },
  season: {
    navLabel: "Select season",
    numberFormat: "Season {number}",
  },
  seasonAwards: {
    title: "Season Awards",
    caption: "Individual and team awards for the selected season.",
    empty: "No awards recorded for this season.",
    typeHeader: "Award",
    subjectHeader: "Recipient",
    leagueHeader: "League",
    scopeHeader: "Scope",
  },
  bestXI: {
    title: "Best XI",
    formationNote: "No formation data available — shown in a 4-3-3 layout.",
    empty: "No Best XI selected for this season.",
  },
  ranking: {
    title: "All-Time Multi-Award Ranking",
    caption: "Top all-time totals by cumulative award count.",
    playerTitle: "Players",
    managerTitle: "Managers",
    teamTitle: "Teams",
    rankHeader: "Rank",
    subjectHeader: "Name",
    countHeader: "Awards",
    countFormat: "×{count}",
    empty: "No ranking data available.",
    managerUnavailable: "Manager names can't be looked up, so this ranking can't be shown.",
  },
  subject: {
    unresolvedManager: "Manager info unavailable",
  },
};
