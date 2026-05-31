import { apiUrl, isMockMode, missingTokenError, parseApiError } from "./client";
import { getJobToken, saveJobToken } from "./tokens";
import { createMockJob, getMockJobStatus } from "../mock/mockJobs";
import { demoInputFasta } from "../mock/demoInput";
import type {
  CreateJobRequest,
  JobDetail,
  JobStatus
} from "../types/job";

export type CreateJobResponse = {
  jobId: string;
  status: JobStatus;
  statusUrl?: string;
  downloadUrl?: string | null;
  token?: string;
  createdAt?: string;
};

function toFormData(request: CreateJobRequest) {
  const formData = new FormData();
  formData.set("job_name", request.jobName);
  formData.set("algorithm", "demo");

  if (request.email) {
    formData.set("email", request.email);
  }

  if (request.inputMethod === "upload" && request.file) {
    formData.set("input_file", request.file);
    return formData;
  }

  formData.set(
    "pasted_sequence",
    request.inputMethod === "demo"
      ? demoInputFasta
      : request.pastedSequence ?? ""
  );

  return formData;
}

function jobPathSegment(jobId: string) {
  return encodeURIComponent(jobId);
}

export async function createJob(
  request: CreateJobRequest
): Promise<CreateJobResponse> {
  if (isMockMode()) {
    return createMockJob(request);
  }

  const response = await fetch(apiUrl("/jobs"), {
    method: "POST",
    body: toFormData(request)
  });

  if (!response.ok) {
    throw await parseApiError(response, "Failed to create job");
  }

  const payload = (await response.json()) as CreateJobResponse;

  if (payload.token) {
    saveJobToken(payload.jobId, payload.token);
  }

  return payload;
}

export async function getJobStatus(jobId: string): Promise<JobDetail> {
  if (isMockMode()) {
    return getMockJobStatus(jobId);
  }

  const token = getJobToken(jobId);

  if (!token) {
    throw missingTokenError(jobId);
  }

  const response = await fetch(
    apiUrl(`/jobs/${jobPathSegment(jobId)}?token=${encodeURIComponent(token)}`)
  );

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load job status");
  }

  return response.json();
}
