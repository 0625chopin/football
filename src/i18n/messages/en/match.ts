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
    futureBoundary: "Match in progress — minute {minute} onward not yet revealed",
  },
  news: {
    loading: "Loading news…",
    empty: "No news to display.",
    error: "Failed to load news.",
    sectionTitle: "Top News",
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
    empty: "No matches in progress",
    emptyNextKickoff: "Next kickoff {time}",
    error: "Unable to load live data",
    scoreFormat: "{home} - {away}",
    elapsedFormat: "{minute}'",
    scheduledLabel: "Scheduled",
    finishedLabel: "FT",
    voidLabel: "Postponed",
  },
  upcoming: {
    sectionTitle: "Next Kickoff",
    empty: "No upcoming matches.",
    matchupFormat: "{home} vs {away}",
  },
  score: {
    loading: "Loading scoreboard…",
    error: "Failed to load match info.",
    neutralVenueLabel: "Neutral venue",
    notNeutralVenueLabel: "Not a neutral venue",
    psoFormat: "{home} - {away} (Penalties {pkHome}-{pkAway})",
    phase: {
      firstHalf: "1st half",
      halfTime: "Half-time",
      secondHalf: "2nd half",
      extraTime: "Extra time",
      penaltyShootout: "Penalty shootout",
    },
  },
};
