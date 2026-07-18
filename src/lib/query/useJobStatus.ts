import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "../api/jobs";
import type { JobStatus } from "../types/job";

const TERMINAL_STATUSES = new Set<JobStatus>(["completed", "failed"]);

export function useJobStatus(jobId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["job-status", jobId, token],
    queryFn: ({ signal }) => getJobStatus(jobId!, token!, signal),
    enabled: Boolean(jobId && token),
    staleTime: 0,
    retry: 3,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.has(status) ? false : 3_000;
    },
    refetchIntervalInBackground: false
  });
}
