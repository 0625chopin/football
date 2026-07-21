import type { SampleMessages } from "../ko/sample";

export const sample: SampleMessages = {
  meta: {
    title: "Component Showcase",
    description: "Browse the reusable presentation components the app screens share, grouped by category.",
  },
  nav: {
    domain: "Domain",
    composite: "Composite",
    state: "State & Utility",
    chart: "Chart",
    admin: "Admin",
  },
  section: {
    domainTitle: "Domain Components",
    domainDescription: "8 components that represent a single entity such as a player or team.",
    compositeTitle: "Composite Components",
    compositeDescription: "8 components that combine multiple data points into one screen fragment (incl. MatchCard).",
    stateTitle: "State & Utility Components",
    stateDescription: "6 shared loading/empty/error and utility components (not subject to the 4-state contract).",
    chartTitle: "Chart",
    chartDescription:
      "No chart-only category components yet — GrowthChart in the composite category is the first chart implementation (I-152).",
    adminTitle: "Admin",
    adminDescription: "No admin console components yet.",
  },
  status: {
    notImplemented: "Not implemented",
    componentCount: "{count} registered",
  },
  state: {
    toggleLabel: "Switch preview state",
    loading: "Loading",
    empty: "Empty",
    error: "Error",
    ready: "Ready",
  },
  viewport: {
    toggleLabel: "Switch viewport preview",
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
  },
  locale: {
    toggleLabel: "Switch locale preview",
    hint: "The header locale switcher navigates to a new page — this toggle compares instantly, without leaving the page.",
  },
  dataSource: {
    toggleLabel: "Switch data adapter",
    hint: "Swapping the data source only requires the environment flag — component code stays untouched (UC-602).",
    optionMock: "Mock",
    optionSupabase: "Supabase",
    switching: "Switching…",
    revertedToMock: "The switch failed, so it was reverted to the previous adapter.",
  },
};
