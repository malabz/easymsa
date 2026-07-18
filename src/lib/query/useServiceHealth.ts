import { useQuery } from "@tanstack/react-query";
import { getServiceHealth } from "../api/health";

export const serviceHealthQueryKey = ["service-health"] as const;

export function useServiceHealth() {
  return useQuery({
    queryKey: serviceHealthQueryKey,
    queryFn: ({ signal }) => getServiceHealth(signal),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1
  });
}
