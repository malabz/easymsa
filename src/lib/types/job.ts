import type { Locale } from "../i18n/dictionary";

export type InputMethod = "paste" | "upload" | "demo";

export type CreateJobRequest = {
  jobName: string;
  inputMethod: InputMethod;
  pastedSequence?: string;
  fileName?: string;
  email?: string;
  language: Locale;
};

export type JobStatus =
  | "submitted"
  | "checking"
  | "running"
  | "preparing"
  | "completed"
  | "failed";

export type JobDetail = {
  jobId: string;
  jobName: string;
  status: JobStatus;
  progress: number;
  currentStep: string;
  logs: string[];
  createdAt: string;
  updatedAt: string;
};
