import { boundedRequest } from "../../lib/api/boundedRequest";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "../../lib/query/queryClient";
import { parseSnapshot } from "./model";
import { websiteSnapshot } from "./website";

export function useBenchmark() {
  const url = `${import.meta.env.BASE_URL}benchmark/snapshot.json`;
  // The public report is one comparison snapshot for this browser session.
  // Sharing it keeps navigation from replacing the workspace with a loader.
  const query = useQuery({
    queryKey: ["benchmark", "public-snapshot", url],
    queryFn: async ({ signal }) => {
      return boundedRequest(url, { signal }, async response => websiteSnapshot(parseSnapshot(await response.json())), 60_000);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false
  }, queryClient);
  return { data: query.data ?? null, failed: query.isError, retry: () => { void query.refetch(); } };
}
