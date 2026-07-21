import type { FixturesMessages } from "../ko/fixtures";

export const fixtures: FixturesMessages = {
  round: {
    navLabel: "Round navigation",
    label: "Round {current} / {total}",
    prevLabel: "Previous round",
    nextLabel: "Next round",
    currentLabel: "Current",
    kickoffLabel: "Kickoff {time} (local)",
    chipAriaLabel: "Round {round}",
  },
  match: {
    caption: "{league} {season} Round {round} fixtures",
    vsFormat: "{home} vs {away}",
    emptySchedule: "The schedule hasn't been generated yet.",
    errorLoadFailed: "Failed to load the fixtures.",
  },
  special: {
    title: "Special fixtures",
    tiebreakLabel: "Promotion/relegation play-off",
  },
};
