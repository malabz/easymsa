import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createJobAccess, deleteJobAccess, saveJobAccess } from "../api/tokens";
import { clearOwnStorage, TASK_STORAGE_KEYS } from "../storage";
import { useJobAccessRecords } from "./useJobAccessRecords";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("live saved job records", () => {
  it("updates after save, deletion and privacy clearing in the same tab", () => {
    const { result } = renderHook(useJobAccessRecords);
    const first = createJobAccess({ jobId: "first", token: "one" });
    const second = createJobAccess({ jobId: "second", token: "two" });
    act(() => { saveJobAccess(first); saveJobAccess(second); });
    expect(result.current).toHaveLength(2);
    act(() => { deleteJobAccess(first.jobId, first.token); });
    expect(result.current.map(record => record.jobId)).toEqual(["second"]);
    act(() => { clearOwnStorage(TASK_STORAGE_KEYS); });
    expect(result.current).toEqual([]);
  });

  it("refreshes relevant cross-tab changes, full clearing, and focus", () => {
    const { result } = renderHook(useJobAccessRecords);
    const access = createJobAccess({ jobId: "other-tab", token: "key" });
    localStorage.setItem(TASK_STORAGE_KEYS[0], JSON.stringify([access]));
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: "other.application" })); });
    expect(result.current).toEqual([]);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: TASK_STORAGE_KEYS[0] })); });
    expect(result.current).toEqual([access]);
    localStorage.removeItem(TASK_STORAGE_KEYS[0]);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: null })); });
    expect(result.current).toEqual([]);
    localStorage.setItem(TASK_STORAGE_KEYS[1], JSON.stringify({ legacy: "legacy-key" }));
    act(() => { window.dispatchEvent(new Event("focus")); });
    expect(result.current).toEqual([expect.objectContaining({ jobId: "legacy", token: "legacy-key" })]);
  });
});
