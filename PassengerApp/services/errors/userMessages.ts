const TECHNICAL_PATTERNS: Array<{ test: RegExp; message: string }> = [
  {
    test: /current phone location|location request timed out|location unavailable|could not read current/i,
    message: "We could not get your exact location. Turn on precise location/GPS and try again.",
  },
  {
    test: /network request failed|failed to fetch|network error/i,
    message: "Connection problem. Please check your internet and try again.",
  },
  {
    test: /request timeout|aborted|timed out/i,
    message: "The request took too long. Please try again.",
  },
  {
    test: /unauthorized|token|401/i,
    message: "Your session expired. Please sign in again.",
  },
  {
    test: /server error|internal server|exception|stack trace|sql|undefined|null/i,
    message: "Something went wrong. Please try again.",
  },
];

export function getFriendlyErrorMessage(message?: unknown, fallback = "Something went wrong. Please try again.") {
  const raw = typeof message === "string" ? message : message instanceof Error ? message.message : "";
  if (!raw.trim()) return fallback;

  const match = TECHNICAL_PATTERNS.find((pattern) => pattern.test.test(raw));
  return match?.message || raw;
}

export function logExpectedError(label: string, error: unknown) {
  if (__DEV__) {
    console.warn(label, error);
  }
}

