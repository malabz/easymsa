import type { Locale } from "../i18n/dictionary";

export type InputMethod = "paste" | "upload" | "demo";

export type CreateJobRequest = {
  jobName: string;
  inputMethod: InputMethod;
  pastedSequence?: string;
  file?: File;
  fileName?: string;
  email?: string;
  language: Locale;
};

export type JobStatus =
  | "queued"
  | "preprocessing"
  | "aligning"
  | "packaging"
  | "completed"
  | "failed";

export type ApiFailure = {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
};

export type PreprocessStatus = {
  status: string | null;
  mode: string | null;
  strictness: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type AlgorithmStatus = {
  name: string | null;
};

export type JobDetail = {
  jobId: string;
  jobName: string | null;
  status: JobStatus;
  progress: number;
  message: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
  preprocess: PreprocessStatus;
  algorithm: AlgorithmStatus;
  emailStatus: string | null;
  emailError: string | null;
  emailSentAt: string | null;
  failure: ApiFailure | null;
};
