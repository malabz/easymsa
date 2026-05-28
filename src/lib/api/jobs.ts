import { apiUrl, isMockMode } from "./client";
import { createMockJob, getMockJobStatus } from "../mock/mockJobs";
import type {
  CreateJobRequest,
  JobDetail,
  JobStatus
} from "../types/job";

export type CreateJobResponse = {
  jobId: string;
  status: JobStatus;
  createdAt: string;
};

export async function createJob(
  request: CreateJobRequest
): Promise<CreateJobResponse> {
  if (isMockMode()) {
    return createMockJob(request);
  }

  const response = await fetch(apiUrl("/jobs"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error("Failed to create job");
  }

  return response.json();
}

export async function getJobStatus(jobId: string): Promise<JobDetail> {
  if (isMockMode()) {
    return getMockJobStatus(jobId);
  }

  const response = await fetch(apiUrl(`/jobs/${jobId}`));

  if (!response.ok) {
    throw new Error("Failed to load job status");
  }

  return response.json();
}
