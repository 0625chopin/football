import type { ErrorMessages } from "../ko/error";

export const error: ErrorMessages = {
  notFound: {
    title: "Page not found",
    description: "The page you requested does not exist.",
  },
  generic: {
    title: "Something went wrong",
    description: "Please try again in a moment.",
  },
  network: {
    title: "Network error",
    description: "Please check your connection.",
  },
  validation: {
    required: "This field is required.",
  },
};
