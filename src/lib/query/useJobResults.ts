import type { ResultStage } from "../types/job";
import { useQuery } from "@tanstack/react-query";
import { getAlignmentResult, getResultSummary } from "../api/results";
import { isPermanentApiError } from "../i18n/apiErrors";
import { EasyMsaApiError } from "../api/client";
const timedOut = (error:unknown) => error instanceof EasyMsaApiError && error.code === "LOAD_TIMEOUT";

export function useResultSummary(jobId: string | undefined, token: string | undefined, stage: ResultStage = "final", enabled = true) {
  return useQuery({
    queryKey: ["result-summary", jobId, token, stage],
    queryFn: ({ signal }) => getResultSummary(jobId!, token!, signal, stage),
    enabled: Boolean(jobId && token && enabled),
    retry: (attempt, error) => !isPermanentApiError(error) && !timedOut(error) && attempt < 2,
    refetchOnWindowFocus: query => !isPermanentApiError(query.state.error),
    refetchOnReconnect: query => !isPermanentApiError(query.state.error),
    refetchOnMount: query => !isPermanentApiError(query.state.error),
    staleTime: Infinity,
    gcTime: 5 * 60_000
  });
}

export function useAlignmentResult(jobId: string | undefined, token: string | undefined, stage: ResultStage = "final", enabled = true) {
  return useQuery({
    queryKey: ["alignment-result", jobId, token, stage],
    queryFn: ({ signal }) => getAlignmentResult(jobId!, token!, signal, stage),
    enabled: Boolean(jobId && token && enabled),
    retry: (attempt, error) => !isPermanentApiError(error) && !timedOut(error) && attempt < 2,
    staleTime: Infinity,
    gcTime: 60_000,
    // Completed artifacts are immutable; avoid focus/refetch copies of large MSAs.
    refetchOnWindowFocus: false,
    refetchOnReconnect: query => !isPermanentApiError(query.state.error),
    refetchOnMount: query => !isPermanentApiError(query.state.error),
    structuralSharing: false
  });
}
