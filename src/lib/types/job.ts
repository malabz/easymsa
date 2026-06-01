import type { Locale } from "../i18n/dictionary";

export type InputMethod = "paste" | "upload" | "demo";
export type AlignmentAlgorithm = "mafft" | "demo" | "halign";

export type CreateJobRequest = {
  jobName: string;
  inputMethod: InputMethod;
  pastedSequence?: string;
  file?: File;
  fileName?: string;
  email?: string;
  language: Locale;
  algorithm?: AlignmentAlgorithm;
  algorithmParams?: Record<string, unknown>;
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

export type CountMap = Record<string, number>;

export type PreprocessSummaryCounts = {
  raw_sequence_count?: number;
  raw_total_bases?: number;
  clean_sequence_count?: number;
  clean_total_bases?: number;
  removed_sequence_count?: number;
  collapsed_duplicate_count?: number;
};

export type PreprocessDedupSummary = {
  enabled?: boolean;
  duplicate_groups?: number;
  collapsed_count?: number;
};

export type PreprocessStatus = {
  status: string | null;
  mode: string | null;
  strictness: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  summaryCounts: PreprocessSummaryCounts | null;
  qcCounts: CountMap | null;
  warningCounts: CountMap | null;
  removalCounts: CountMap | null;
  cleaningCounts: CountMap | null;
  dedupSummary: PreprocessDedupSummary | null;
  summaryUnavailable: boolean;
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
