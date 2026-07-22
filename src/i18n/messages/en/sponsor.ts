// Task 020(Day 46, Team 4) — namespace for the `/[lang]/sponsors` screen.
// Mirrors `ko/sponsor.ts` — see that file's header comment for the rationale on
// untranslated sponsor name/industry and the local `SponsorContractStatus` labels.
export const sponsor = {
  common: {
    // Amount unit is fixed to "pt" (L-03, no currency symbols). `{amount}` already
    // carries locale thousands-separator formatting from `formatPoints()`.
    pointsFormat: "{amount} pt",
  },
  page: {
    title: "Sponsors",
    caption: "Check each sponsor's balance, contracted team count, bankruptcy risk, and the full contract list.",
  },
  list: {
    title: "Sponsor list",
    empty: "No sponsors registered.",
    balanceLabel: "Balance",
    reputationLabel: "Reputation",
    scaleFormat: "Scale {scale}/5",
    contractCountFormat: "{count} team contracts",
    bankruptBadge: "Bankruptcy risk",
  },
  contracts: {
    title: "Contract details",
    caption: "Full list of sponsor contracts.",
    empty: "No sponsor contracts registered.",
    sponsorHeader: "Sponsor",
    teamHeader: "Team",
    ownerHeader: "Signing owner",
    ownerUnknown: "–",
    periodHeader: "Period",
    periodFormat: "S{start}–S{end}",
    incomeHeader: "Income / season",
    sharePctHeader: "Share",
    sharePctFormat: "{pct}%",
    statusHeader: "Status",
    statusActive: "Active",
    statusExpired: "Expired",
    statusVoided: "Voided",
  },
};

export type SponsorMessages = typeof sponsor;
