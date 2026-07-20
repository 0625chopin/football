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
};
