import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "../api/jobs";
import type { JobStatus } from "../types/job";
import { isPermanentApiError } from "../i18n/apiErrors";

const TERMINAL_STATUSES = new Set<JobStatus>(["completed", "failed"]);

export function useJobStatus(jobId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["job-status", jobId, token],
    queryFn: ({ signal }) => getJobStatus(jobId!, token!, signal),
    enabled: Boolean(jobId && token),
    staleTime: 0,
    retry: (failureCount, error) => failureCount < 3 && !isPermanentApiError(error),
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    refetchInterval: (query) => {
      if (isPermanentApiError(query.state.error)) return false;
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.has(status)) return false;
      return query.state.error ? Math.min(3_000 * 2 ** query.state.errorUpdateCount, 30_000) : 3_000;
    },
    refetchOnWindowFocus: query => !isPermanentApiError(query.state.error),
    refetchOnReconnect: query => !isPermanentApiError(query.state.error),
    refetchOnMount: query => !isPermanentApiError(query.state.error),
    refetchIntervalInBackground: false
  });
}
