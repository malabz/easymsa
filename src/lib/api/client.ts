export const API_MODE = import.meta.env.VITE_API_MODE || "mock";
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (API_MODE === "real" ? "http://localhost:8000/api" : "");

export type ApiErrorBody = {
  code: string;
  message: string;
  details: unknown;
};

export class EasyMsaApiError extends Error {
  code: string;
  status?: number;
  details: unknown;

  constructor({
    code,
    message,
    status,
    details
  }: {
    code: string;
    message: string;
    status?: number;
    details?: unknown;
  }) {
    super(message);
    this.name = "EasyMsaApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function isMockMode() {
  return API_MODE === "mock";
}

export function apiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function parseApiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: ApiErrorBody;
    };

    if (payload.error?.code && payload.error.message) {
      return new EasyMsaApiError({
        code: payload.error.code,
        message: humanizeApiError(payload.error.code, payload.error.message),
        status: response.status,
        details: payload.error.details
      });
    }
  } catch {
    // Fall through to the generic error below.
  }

  return new EasyMsaApiError({
    code: "HTTP_ERROR",
    message: fallback,
    status: response.status
  });
}

export function missingTokenError(jobId: string) {
  return new EasyMsaApiError({
    code: "MISSING_TOKEN",
    message: `Missing access token for ${jobId}. Please submit the job again from this browser.`
  });
}

export function humanizeApiError(code: string, fallback: string) {
  const messages: Record<string, string> = {
    INVALID_TOKEN: "Invalid or missing access token. Please submit the job again from this browser.",
    JOB_NOT_FOUND: "Job not found.",
    JOB_EXPIRED: "This job has expired or was deleted.",
    JOB_NOT_COMPLETED: "The job is not completed yet.",
    INPUT_REQUIRED: "Please provide pasted FASTA input or upload a file.",
    INPUT_EMPTY: "The submitted input is empty.",
    UNSUPPORTED_FILE_TYPE: "This file type is not supported by the server.",
    UPLOAD_TOO_LARGE: "The uploaded file is too large.",
    QUEUE_FULL: "The job queue is currently full. Please try again later."
  };

  return messages[code] ?? fallback;
}
