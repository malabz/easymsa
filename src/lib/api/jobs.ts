import { apiUrl, parseApiError } from "./client";
import { createJobAccess, saveJobAccess } from "./tokens";
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
  formData.set("algorithm", request.algorithm ?? "auto");
  formData.set("language", request.language);
  formData.set("preprocess_mode", request.preprocessMode ?? "audit");
  if (request.algorithmParams) {
    formData.set("algorithm_params", JSON.stringify(request.algorithmParams));
  }

  if (request.email) {
    formData.set("email", request.email);
  }

  if (request.inputMethod === "upload" && request.file) {
    formData.set("input_file", request.file);
    return formData;
  }

  formData.set("pasted_sequence", request.pastedSequence ?? "");

  return formData;
}

function jobPathSegment(jobId: string) {
  return encodeURIComponent(jobId);
}

export async function createJob(
  request: CreateJobRequest
): Promise<CreateJobResponse> {
  const response = await fetch(apiUrl("/jobs"), {
    method: "POST",
    body: toFormData(request)
  });

  if (!response.ok) {
    throw await parseApiError(response, "Failed to create job");
  }

  const payload = (await response.json()) as CreateJobResponse;

  if (payload.token) {
    saveJobAccess(
      createJobAccess({
        jobId: payload.jobId,
        token: payload.token,
        statusUrl: payload.statusUrl,
        createdAt: payload.createdAt
      })
    );
  }

  return payload;
}

export async function getJobStatus(jobId: string, token: string): Promise<JobDetail> {
  const response = await fetch(
    apiUrl(`/jobs/${jobPathSegment(jobId)}?token=${encodeURIComponent(token)}`)
  );

  if (!response.ok) {
    throw await parseApiError(response, "Failed to load job status");
  }

  return response.json();
}
