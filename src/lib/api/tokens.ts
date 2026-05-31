const STORAGE_KEY = "easymsa.jobTokens";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readTokens(): Record<string, string> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveJobToken(jobId: string, token: string) {
  if (!canUseStorage()) {
    return;
  }

  const tokens = readTokens();
  tokens[jobId] = token;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function getJobToken(jobId: string) {
  return readTokens()[jobId] ?? null;
}

export function tokenQuery(jobId: string) {
  const token = getJobToken(jobId);
  return token ? `token=${encodeURIComponent(token)}` : null;
}
