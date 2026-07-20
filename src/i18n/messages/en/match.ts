import type { MatchMessages } from "../ko/match";

export const match: MatchMessages = {
  list: {
    title: "Matches",
  },
  detail: {
    title: "Match detail",
    timelineTitle: "Timeline",
  },
  live: {
    label: "Live",
  },
  empty: {
    message: "No matches to display.",
  },
  error: {
    loadFailed: "Failed to load match info.",
  },
  timeline: {
    loading: "Loading timeline…",
    empty: "No events to display.",
    error: "Failed to load events.",
    minuteFormat: "{minute}'",
    addedTimeFormat: "{minute}+{added}'",
  },
  news: {
    loading: "Loading news…",
    empty: "No news to display.",
    error: "Failed to load news.",
  },
  lineup: {
    loading: "Loading lineup…",
    empty: "No lineup to display.",
    error: "Failed to load lineup.",
    unsupportedFormation: "Unsupported formation.",
    captainLabel: "Captain",
    captainAbbr: "(C)",
  },
  bracket: {
    empty: "No bracket to display.",
    error: "Failed to load bracket.",
    tbd: "TBD",
  },
  card: {
    gridTitle: "Live Matches",
    empty: "No matches to display.",
    error: "Failed to load match info.",
    scoreFormat: "{home} - {away}",
    elapsedFormat: "{minute}'",
  },
};
