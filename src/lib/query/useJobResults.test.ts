import { expect, it, vi } from "vitest";
import { EasyMsaApiError } from "../api/client";
const capture = vi.hoisted(() => ({ options: null as any }));
vi.mock("@tanstack/react-query", () => ({ useQuery: (options: unknown) => { capture.options = options; return options; } }));
import { useAlignmentResult, useResultSummary } from "./useJobResults";

it("does not load complete alignment before it is requested", () => {
  useAlignmentResult("job", "test-only", "initial", false);
  expect(capture.options.enabled).toBe(false);
  useAlignmentResult("job", "test-only", "initial", true);
  expect(capture.options.enabled).toBe(true);
  expect(capture.options.queryKey).toEqual(["alignment-result", "job", "test-only", "initial"]);
  expect(capture.options.staleTime).toBe(Infinity);
  expect(capture.options.gcTime).toBe(60_000);
  expect(capture.options.structuralSharing).toBe(false);
});
it("waits for authenticated job metadata before requesting its summary", () => {
  useResultSummary("job", "test-only", "final", false);
  expect(capture.options.enabled).toBe(false);
  useResultSummary("job", "test-only", "refined", true);
  expect(capture.options.enabled).toBe(true);
  expect(capture.options.queryKey[3]).toBe("refined");
});
it.each([useAlignmentResult, useResultSummary])("stops permanent failures without suppressing a manual retry", hook => {
  hook("job", "test-only");
  const error = new EasyMsaApiError({ code: "INVALID_TOKEN", message: "diagnostic" });
  expect(capture.options.retry(0, error)).toBe(false);
  expect(capture.options.refetchOnReconnect({state:{error}})).toBe(false);
  expect(capture.options.refetchOnMount({state:{error}})).toBe(false);
  expect(capture.options.retry(0, new TypeError("Failed to fetch"))).toBe(true);
});
