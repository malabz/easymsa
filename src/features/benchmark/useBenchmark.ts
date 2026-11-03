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
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error("Benchmark data unavailable");
      return websiteSnapshot(parseSnapshot(await response.json()));
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false
  }, queryClient);
  return { data: query.data ?? null, failed: query.isError, retry: () => { void query.refetch(); } };
}
