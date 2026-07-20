import type { TeamMessages } from "../ko/team";

export const team: TeamMessages = {
  list: {
    title: "Teams",
  },
  detail: {
    title: "Team profile",
    rosterTitle: "Roster",
  },
  badge: {
    altText: "{name} crest",
  },
  form: {
    win: "W",
    draw: "D",
    loss: "L",
    altText: "Last 5 matches: {form}",
  },
  empty: {
    message: "No teams to display.",
  },
  error: {
    loadFailed: "Failed to load team info.",
  },
};
