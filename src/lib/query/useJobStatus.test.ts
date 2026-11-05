import { expect, it, vi } from "vitest";
import { EasyMsaApiError } from "../api/client";
const capture = vi.hoisted(() => ({ options: null as any }));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: unknown) => { capture.options = options; return options; } }));
import { useJobStatus } from "./useJobStatus";

it.each(["INVALID_TOKEN", "JOB_NOT_FOUND", "JOB_EXPIRED"])("stops retries and all automatic refetch triggers for %s", code => {
  useJobStatus("job", "test-key");
  const error = new EasyMsaApiError({ code, message: "error" });
  const query = { state: { error, data: undefined, errorUpdateCount: 1 } };
  expect(capture.options.retry).toBe(false);
  expect(capture.options.refetchInterval(query)).toBe(false);
  expect(capture.options.refetchOnWindowFocus(query)).toBe(false);
  expect(capture.options.refetchOnReconnect(query)).toBe(false);
  expect(capture.options.refetchOnMount(query)).toBe(false);
});
it("backs off transient failures while continuing active tasks and stopping completed tasks", () => {
  useJobStatus("job", "test-key");
  const error = new TypeError("Failed to fetch");
  expect(capture.options.retry).toBe(false);
  for (const [index,delay] of [3000,6000,12000,30000,30000].entries()) expect(capture.options.refetchInterval({state:{error,errorUpdateCount:index+1}})).toBe(delay);
  expect(capture.options.refetchInterval({ state: { data: { status: "running" } } })).toBe(3000);
  expect(capture.options.refetchInterval({ state: { data: { status: "completed" } } })).toBe(false);
});
