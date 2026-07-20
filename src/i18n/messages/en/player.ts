import type { PlayerMessages } from "../ko/player";

export const player: PlayerMessages = {
  list: {
    title: "Players",
  },
  detail: {
    title: "Player profile",
    statsTitle: "Season stats",
  },
  avatar: {
    altText: "{name} avatar",
  },
  ability: {
    title: "Ability",
    technical: "Technical",
    mental: "Mental",
    physical: "Physical",
    goalkeeping: "Goalkeeping",
  },
  state: {
    condition: "Condition",
    fitness: "Fitness",
  },
  position: {
    title: "Position",
    altText: "{position} position",
  },
  empty: {
    message: "No players to display.",
  },
  error: {
    loadFailed: "Failed to load player info.",
  },
};
