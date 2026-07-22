import type { AdminMessages } from "../ko/admin";

export const admin: AdminMessages = {
  console: {
    title: "Admin console",
  },
  status: {
    inactive: "Admin features are not ready yet.",
    stateLabel: "Status",
    running: "Running",
    paused: "Paused",
    noNextKickoff: "No upcoming kickoff scheduled",
  },
  speed: {
    title: "Speed control",
    multiplierFormat: "×{value}",
    currentFormat: "Current ×{value}",
    sliderLabel: "Speed slider",
    applyButton: "Apply",
    appliedFormat: "Speed applied at ×{value}",
    disclaimer: "ⓘ In-progress match results are unaffected",
  },
  pause: {
    title: "Pause / resume",
    elapsedFormat: "{elapsed} elapsed",
    pauseButton: "Pause",
    resumeButton: "Resume",
  },
  seed: {
    title: "Seed inspector",
    worldSeedLabel: "world_seed",
    seasonSeedLabel: "season_seed",
    seasonSeedContextFormat: "(Season {season})",
    matchSeedLabel: "Look up match_seed",
    matchIdPlaceholder: "Enter matchId",
    lookupButton: "Look up",
    lookupResultFormat: "{matchId} → {value}",
    notFound: "Could not find that match",
  },
  error: {
    accessDenied: "You don't have access.",
  },
};
