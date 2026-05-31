import type {
  CreateJobRequest,
  JobDetail,
  JobStatus
} from "../types/job";

type StoredJob = {
  jobId: string;
  jobName: string;
  token: string;
  inputMethod: CreateJobRequest["inputMethod"];
  createdAt: string;
};

const STORAGE_KEY = "easymsa.mockJobs";

const statusOrder: JobStatus[] = [
  "queued",
  "preprocessing",
  "aligning",
  "packaging",
  "completed"
];

const statusMeta: Record<
  JobStatus,
  { progress: number; message: string; logs: string[] }
> = {
  queued: {
    progress: 8,
    message: "Job submitted.",
    logs: ["Job request received.", "Waiting for input validation."]
  },
  preprocessing: {
    progress: 28,
    message: "Preprocessing input FASTA.",
    logs: [
      "Job request received.",
      "Input file or pasted FASTA accepted.",
      "Validating sequence records."
    ]
  },
  aligning: {
    progress: 64,
    message: "Running alignment.",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Starting mock MSA analysis.",
      "Estimating alignment summary metrics."
    ]
  },
  packaging: {
    progress: 86,
    message: "Packaging results.",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Mock MSA analysis completed.",
      "Preparing visualization and download files."
    ]
  },
  completed: {
    progress: 100,
    message: "Job completed.",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Mock MSA analysis completed.",
      "Results are ready."
    ]
  },
  failed: {
    progress: 100,
    message: "Job failed.",
    logs: ["The job failed during mock execution."]
  }
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJobs(): Record<string, StoredJob> {
  if (!canUseStorage()) {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeJobs(jobs: Record<string, StoredJob>) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function mockToken() {
  return `mock_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

function statusUrl(jobId: string, token: string) {
  return `/api/jobs/${encodeURIComponent(jobId)}?token=${encodeURIComponent(token)}`;
}

function getStatusFromElapsed(createdAt: string): JobStatus {
  const elapsedSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;

  if (elapsedSeconds >= 12) {
    return "completed";
  }
  if (elapsedSeconds >= 8) {
    return "packaging";
  }
  if (elapsedSeconds >= 4) {
    return "aligning";
  }
  if (elapsedSeconds >= 1.5) {
    return "preprocessing";
  }
  return "queued";
}

function toJobDetail(job: StoredJob): JobDetail {
  const status = getStatusFromElapsed(job.createdAt);
  const meta = statusMeta[status];

  return {
    jobId: job.jobId,
    jobName: job.jobName,
    status,
    progress: meta.progress,
    message: meta.message,
    createdAt: job.createdAt,
    updatedAt: new Date().toISOString(),
    startedAt: status === "queued" ? null : job.createdAt,
    completedAt: status === "completed" ? new Date().toISOString() : null,
    expiresAt:
      status === "completed"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    downloadUrl: status === "completed" ? `/demo/all_results.zip` : null,
    preprocess: {
      status: status === "queued" ? null : status === "failed" ? "failed" : "completed",
      mode: "audit",
      strictness: "normal",
      errorCode: null,
      errorMessage: null
    },
    algorithm: {
      name: "demo"
    },
    emailStatus: null,
    emailError: null,
    emailSentAt: null,
    failure: null
  };
}

export async function createMockJob(
  request: CreateJobRequest
): Promise<{
  jobId: string;
  status: JobStatus;
  statusUrl: string;
  downloadUrl: null;
  token: string;
  createdAt: string;
}> {
  const createdAt = new Date().toISOString();
  const token = mockToken();
  const jobId =
    request.inputMethod === "demo" ? request.jobName : request.jobName;
  const jobs = readJobs();
  const storageKey = `${jobId}\n${token}`;

  jobs[storageKey] = {
    jobId,
    jobName: request.jobName,
    token,
    inputMethod: request.inputMethod,
    createdAt
  };

  writeJobs(jobs);

  return {
    jobId,
    status: "queued",
    statusUrl: statusUrl(jobId, token),
    downloadUrl: null,
    token,
    createdAt
  };
}

export async function getMockJobStatus(jobId: string, token: string): Promise<JobDetail> {
  const jobs = readJobs();
  const storageKey = `${jobId}\n${token}`;

  if (!jobs[storageKey] && jobId === "demo-job") {
    jobs[storageKey] = {
      jobId,
      jobName: "Demo alignment",
      token,
      inputMethod: "demo",
      createdAt: new Date(Date.now() - 13_000).toISOString()
    };
    writeJobs(jobs);
  }

  if (!jobs[storageKey]) {
    jobs[storageKey] = {
      jobId,
      jobName: "Mock alignment job",
      token,
      inputMethod: "demo",
      createdAt: new Date().toISOString()
    };
    writeJobs(jobs);
  }

  return toJobDetail(jobs[storageKey]);
}

export function getJobStatusOrder() {
  return statusOrder;
}
