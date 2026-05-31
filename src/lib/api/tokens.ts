const STORAGE_KEY = "easymsa.jobAccess.v1";
const LEGACY_STORAGE_KEY = "easymsa.jobTokens";

export type JobAccess = {
  app: "easymsa";
  version: 1;
  jobId: string;
  token: string;
  statusUrl: string;
  createdAt: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isJobAccess(value: unknown): value is JobAccess {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<JobAccess>;
  return (
    record.app === "easymsa" &&
    record.version === 1 &&
    typeof record.jobId === "string" &&
    record.jobId.trim().length > 0 &&
    typeof record.token === "string" &&
    record.token.trim().length > 0 &&
    typeof record.statusUrl === "string" &&
    typeof record.createdAt === "string"
  );
}

function jobStatusUrl(jobId: string, token: string) {
  return `/api/jobs/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

function normalizeAccess(access: JobAccess): JobAccess {
  return {
    app: "easymsa",
    version: 1,
    jobId: access.jobId,
    token: access.token,
    statusUrl: access.statusUrl || jobStatusUrl(access.jobId, access.token),
    createdAt: access.createdAt || new Date().toISOString()
  };
}

function readLegacyAccessRecords(): JobAccess[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const legacy = JSON.parse(
      window.localStorage.getItem(LEGACY_STORAGE_KEY) ?? "{}"
    ) as Record<string, string>;

    return Object.entries(legacy)
      .filter(([jobId, token]) => jobId && typeof token === "string" && token)
      .map(([jobId, token]) => ({
        app: "easymsa",
        version: 1,
        jobId,
        token,
        statusUrl: jobStatusUrl(jobId, token),
        createdAt: new Date().toISOString()
      }));
  } catch {
    return [];
  }
}

export function readJobAccessRecords(): JobAccess[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    const current = Array.isArray(parsed)
      ? parsed.filter(isJobAccess).map(normalizeAccess)
      : [];

    if (current.length > 0) {
      return current;
    }

    return readLegacyAccessRecords();
  } catch {
    return readLegacyAccessRecords();
  }
}

function writeJobAccessRecords(records: JobAccess[]) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function createJobAccess({
  jobId,
  token,
  statusUrl,
  createdAt
}: {
  jobId: string;
  token: string;
  statusUrl?: string;
  createdAt?: string | null;
}): JobAccess {
  return {
    app: "easymsa",
    version: 1,
    jobId,
    token,
    statusUrl: statusUrl || jobStatusUrl(jobId, token),
    createdAt: createdAt || new Date().toISOString()
  };
}

export function saveJobAccess(access: JobAccess) {
  const records = readJobAccessRecords();
  const normalized = normalizeAccess(access);
  const duplicateIndex = records.findIndex(
    (record) => record.jobId === normalized.jobId && record.token === normalized.token
  );

  if (duplicateIndex >= 0) {
    records[duplicateIndex] = normalized;
  } else {
    records.unshift(normalized);
  }

  writeJobAccessRecords(records.slice(0, 50));
}

export function findJobAccessByToken(jobId: string, token: string) {
  return (
    readJobAccessRecords().find(
      (record) => record.jobId === jobId && record.token === token
    ) ?? null
  );
}

export function findSingleJobAccess(jobId: string) {
  const matches = readJobAccessRecords().filter((record) => record.jobId === jobId);
  return matches.length === 1 ? matches[0] : null;
}

export function resolveJobAccess(jobId: string, token: string | null) {
  if (token) {
    const access =
      findJobAccessByToken(jobId, token) ??
      createJobAccess({
        jobId,
        token
      });
    saveJobAccess(access);
    return access;
  }

  return findSingleJobAccess(jobId);
}

export function validateJobAccess(value: unknown): JobAccess | null {
  return isJobAccess(value) ? normalizeAccess(value) : null;
}

export function jobRoute(jobId: string, token: string) {
  return `/job/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

export function resultsRoute(jobId: string, token: string) {
  return `/results/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

export function downloadableAccessJson(access: JobAccess) {
  return JSON.stringify(normalizeAccess(access), null, 2);
}

export function accessDownloadFilename(createdAt: string) {
  const date = Number.isNaN(new Date(createdAt).getTime())
    ? new Date()
    : new Date(createdAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("");
  const time = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join("");

  return `easymsa-job-access-${timestamp}-${time}.json`;
}
