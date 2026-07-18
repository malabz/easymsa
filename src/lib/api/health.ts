import { apiUrl, parseApiError } from "./client";

export type CoreHealthResponse = {
  status?: string;
  service?: string;
};

export type ToolHealthResponse = {
  easymsaPrep?: {
    configured?: boolean;
    available?: boolean;
    path?: string | null;
  };
  algorithms?: Record<string, boolean>;
};

export type QueueHealthResponse = {
  queueName?: string;
  queueLength?: number;
};

export type ServiceHealthStatus = "ready" | "degraded" | "offline";

export type ServiceHealth = {
  status: ServiceHealthStatus;
  acceptingJobs: boolean;
  service?: string;
  queueName?: string;
  queueLength: number | null;
  preprocessAvailable: boolean;
  algorithms: Record<string, boolean>;
};

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path), { signal });
  if (!response.ok) {
    throw await parseApiError(response, `Failed to check ${path}`);
  }
  return response.json() as Promise<T>;
}

export function deriveServiceHealth(
  core: CoreHealthResponse,
  tools: ToolHealthResponse,
  queue: QueueHealthResponse
): ServiceHealth {
  const coreReady = core.status === "ok" || core.status === "healthy";
  const preprocessAvailable = tools.easymsaPrep?.available === true;
  const algorithms = tools.algorithms ?? {};
  const automaticAlgorithmAvailable = algorithms.auto !== false;
  const acceptingJobs = coreReady && preprocessAvailable && automaticAlgorithmAvailable;

  return {
    status: acceptingJobs ? "ready" : "degraded",
    acceptingJobs,
    service: core.service,
    queueName: queue.queueName,
    queueLength:
      typeof queue.queueLength === "number" ? queue.queueLength : null,
    preprocessAvailable,
    algorithms
  };
}

export async function getServiceHealth(signal?: AbortSignal): Promise<ServiceHealth> {
  const [core, tools, queue] = await Promise.all([
    getJson<CoreHealthResponse>("/health", signal),
    getJson<ToolHealthResponse>("/health/tools", signal),
    getJson<QueueHealthResponse>("/health/queue", signal)
  ]);

  return deriveServiceHealth(core, tools, queue);
}
