import type { ResultStage } from "../types/job";
import { useQuery } from "@tanstack/react-query";
import { getAlignmentResult, getResultSummary } from "../api/results";

export function useResultSummary(jobId: string | undefined, token: string | undefined, stage: ResultStage = "final") {
  return useQuery({
    queryKey: ["result-summary", jobId, token, stage],
    queryFn: ({ signal }) => getResultSummary(jobId!, token!, signal, stage),
    enabled: Boolean(jobId && token),
    retry: 2
  });
}

export function useAlignmentResult(jobId: string | undefined, token: string | undefined, stage: ResultStage = "final") {
  return useQuery({
    queryKey: ["alignment-result", jobId, token, stage],
    queryFn: ({ signal }) => getAlignmentResult(jobId!, token!, signal, stage),
    enabled: Boolean(jobId && token),
    retry: 2
  });
}
