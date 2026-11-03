import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { queryClient } from "../../lib/query/queryClient";
import { publishedSnapshot } from "./__tests__/fixtures";
import { useBenchmark } from "./useBenchmark";

beforeEach(() => { queryClient.clear(); });
afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals(); });
const response = () => ({ ok: true, json: async () => publishedSnapshot() });

it("shares the validated report across readers and returns it synchronously after remount", async () => {
  const fetch = vi.fn().mockResolvedValue(response());
  vi.stubGlobal("fetch", fetch);
  const first = renderHook(useBenchmark);
  const second = renderHook(useBenchmark);
  await waitFor(() => expect(first.result.current.data).not.toBeNull());
  expect(second.result.current.data).toBe(first.result.current.data);
  expect(fetch).toHaveBeenCalledTimes(1);
  const data = first.result.current.data;
  first.unmount(); second.unmount();
  const returned = renderHook(useBenchmark);
  expect(returned.result.current.data).toBe(data);
  expect(returned.result.current.failed).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("reports a read error and retries only when requested", async () => {
  const fetch = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(response());
  vi.stubGlobal("fetch", fetch);
  const first = renderHook(useBenchmark);
  await waitFor(() => expect(first.result.current.failed).toBe(true));
  first.unmount();
  const returned = renderHook(useBenchmark);
  expect(returned.result.current.failed).toBe(true);
  expect(returned.result.current.data).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
  act(() => returned.result.current.retry());
  await waitFor(() => expect(returned.result.current.data).not.toBeNull());
  expect(returned.result.current.failed).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("rejects malformed scores and keeps an already visible report during a failed refresh", async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ schema_version: "invalid" }) })
    .mockResolvedValueOnce(response())
    .mockResolvedValueOnce({ ok: false });
  vi.stubGlobal("fetch", fetch);
  const reader = renderHook(useBenchmark);
  await waitFor(() => expect(reader.result.current.failed).toBe(true));
  expect(reader.result.current.data).toBeNull();
  act(() => reader.result.current.retry());
  await waitFor(() => expect(reader.result.current.data).not.toBeNull());
  const data = reader.result.current.data;
  act(() => reader.result.current.retry());
  expect(reader.result.current.data).toBe(data);
  await waitFor(() => expect(reader.result.current.failed).toBe(true));
  expect(reader.result.current.data).toBe(data);
});

it("cancels an unfinished read when its final observer leaves", async () => {
  let signal: AbortSignal | undefined;
  vi.stubGlobal("fetch", vi.fn((_url, options) => {
    signal = options.signal;
    return new Promise(() => {});
  }));
  const reader = renderHook(useBenchmark);
  expect(signal?.aborted).toBe(false);
  reader.unmount();
  expect(signal?.aborted).toBe(true);
});
