import { useQuery } from "@tanstack/react-query";
import { getJobStatus } from "../api/jobs";
import type { JobStatus } from "../types/job";
import { isPermanentApiError } from "../i18n/apiErrors";

const TERMINAL_STATUSES = new Set<JobStatus>(["completed", "failed"]);
const successfulErrorCount = new WeakMap<object,number>();

export function useJobStatus(jobId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["job-status", jobId, token],
    queryFn: ({ signal }) => getJobStatus(jobId!, token!, signal),
    enabled: Boolean(jobId && token),
    staleTime: 0,
    retry: false,
    refetchInterval: (query) => {
      if (isPermanentApiError(query.state.error)) return false;
      const status = query.state.data?.status;
      if (status && TERMINAL_STATUSES.has(status)) return false;
      if (!query.state.error) { successfulErrorCount.set(query,query.state.errorUpdateCount);return 3_000; }
      const failures=query.state.errorUpdateCount-(successfulErrorCount.get(query)??0);
      return [3_000,6_000,12_000,30_000][Math.max(0,Math.min(failures-1,3))];
    },
    refetchOnWindowFocus: query => !isPermanentApiError(query.state.error),
    refetchOnReconnect: query => !isPermanentApiError(query.state.error),
    refetchOnMount: query => !isPermanentApiError(query.state.error),
    refetchIntervalInBackground: false
  });
}
