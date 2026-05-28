import type {
  CreateJobRequest,
  JobDetail,
  JobStatus
} from "../types/job";

type StoredJob = {
  jobId: string;
  jobName: string;
  inputMethod: CreateJobRequest["inputMethod"];
  createdAt: string;
};

const STORAGE_KEY = "easymsa.mockJobs";

const statusOrder: JobStatus[] = [
  "submitted",
  "checking",
  "running",
  "preparing",
  "completed"
];

const statusMeta: Record<
  JobStatus,
  { progress: number; currentStep: string; logs: string[] }
> = {
  submitted: {
    progress: 8,
    currentStep: "Job submitted",
    logs: ["Job request received.", "Waiting for input validation."]
  },
  checking: {
    progress: 28,
    currentStep: "Checking input",
    logs: [
      "Job request received.",
      "Input file or pasted FASTA accepted.",
      "Validating sequence records."
    ]
  },
  running: {
    progress: 64,
    currentStep: "Running analysis",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Starting mock MSA analysis.",
      "Estimating alignment summary metrics."
    ]
  },
  preparing: {
    progress: 86,
    currentStep: "Preparing results",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Mock MSA analysis completed.",
      "Preparing visualization and download files."
    ]
  },
  completed: {
    progress: 100,
    currentStep: "Completed",
    logs: [
      "Job request received.",
      "Input validation completed.",
      "Mock MSA analysis completed.",
      "Results are ready."
    ]
  },
  failed: {
    progress: 100,
    currentStep: "Failed",
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

function getStatusFromElapsed(createdAt: string): JobStatus {
  const elapsedSeconds = (Date.now() - new Date(createdAt).getTime()) / 1000;

  if (elapsedSeconds >= 12) {
    return "completed";
  }
  if (elapsedSeconds >= 8) {
    return "preparing";
  }
  if (elapsedSeconds >= 4) {
    return "running";
  }
  if (elapsedSeconds >= 1.5) {
    return "checking";
  }
  return "submitted";
}

function toJobDetail(job: StoredJob): JobDetail {
  const status = getStatusFromElapsed(job.createdAt);
  const meta = statusMeta[status];

  return {
    jobId: job.jobId,
    jobName: job.jobName,
    status,
    progress: meta.progress,
    currentStep: meta.currentStep,
    logs: meta.logs,
    createdAt: job.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export async function createMockJob(
  request: CreateJobRequest
): Promise<{ jobId: string; status: JobStatus; createdAt: string }> {
  const createdAt = new Date().toISOString();
  const jobId =
    request.inputMethod === "demo" ? "demo-job" : `job-${Date.now().toString()}`;
  const jobs = readJobs();

  jobs[jobId] = {
    jobId,
    jobName: request.jobName,
    inputMethod: request.inputMethod,
    createdAt
  };

  writeJobs(jobs);

  return {
    jobId,
    status: "submitted",
    createdAt
  };
}

export async function getMockJobStatus(jobId: string): Promise<JobDetail> {
  const jobs = readJobs();

  if (!jobs[jobId] && jobId === "demo-job") {
    jobs[jobId] = {
      jobId: "demo-job",
      jobName: "Demo alignment",
      inputMethod: "demo",
      createdAt: new Date(Date.now() - 13_000).toISOString()
    };
    writeJobs(jobs);
  }

  if (!jobs[jobId]) {
    jobs[jobId] = {
      jobId,
      jobName: "Mock alignment job",
      inputMethod: "demo",
      createdAt: new Date().toISOString()
    };
    writeJobs(jobs);
  }

  return toJobDetail(jobs[jobId]);
}

export function getJobStatusOrder() {
  return statusOrder;
}
