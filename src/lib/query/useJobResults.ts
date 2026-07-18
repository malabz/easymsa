import { useQuery } from "@tanstack/react-query";
import { getAlignmentResult, getResultSummary } from "../api/results";

export function useResultSummary(jobId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["result-summary", jobId, token],
    queryFn: ({ signal }) => getResultSummary(jobId!, token!, signal),
    enabled: Boolean(jobId && token),
    retry: 2
  });
}

export function useAlignmentResult(jobId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ["alignment-result", jobId, token],
    queryFn: ({ signal }) => getAlignmentResult(jobId!, token!, signal),
    enabled: Boolean(jobId && token),
    retry: 2
  });
}
