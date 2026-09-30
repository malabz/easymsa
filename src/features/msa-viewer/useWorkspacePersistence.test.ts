import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialViewerState } from "./useViewerState";
import {
  useWorkspacePersistence,
  viewerStateFromSnapshot,
  viewerStateToSnapshot
} from "./useWorkspacePersistence";

afterEach(() => vi.useRealTimers());

describe("viewer workspace state conversion", () => {
  it("serializes rowKey identity and restores matching rows", () => {
    const base = createInitialViewerState({
      rows: [
        { id: "same", sequence: "AC", rowKey: "row-a" },
        { id: "same", sequence: "AT", rowKey: "row-b" }
      ],
      sourceFingerprint: "fingerprint",
      storage: null
    });
    const state = {
      ...base,
      analysisScope: "selected" as const,
      referenceRowKey: "row-b",
      hiddenRowKeys: new Set(["row-a"]),
      selectedRowKeys: new Set(["row-b"]),
      selection: { rowKey: "row-b", position: 2 },
      selectedRange: { start: 1, end: 2 }
    };
    const snapshot = viewerStateToSnapshot(
      state,
      { fingerprint: "fingerprint", sequenceCount: 2, alignmentLength: 2 },
      "2026-08-30T00:00:00.000Z"
    );
    const restored = viewerStateFromSnapshot(base, snapshot, ["row-a", "row-b"]);

    expect(snapshot.view).toMatchObject({
      referenceRowKey: "row-b",
      hiddenRowKeys: ["row-a"],
      selectedRowKeys: ["row-b"],
      selection: { rowKey: "row-b", position: 2 }
    });
    expect(restored.referenceRowKey).toBe("row-b");
    expect(restored.hiddenRowKeys).toEqual(new Set(["row-a"]));
    expect(restored.analysisScope).toBe("selected");
  });

  it("drops stale row references defensively", () => {
    const base = createInitialViewerState({
      rows: [{ id: "one", sequence: "A", rowKey: "row-a" }],
      sourceFingerprint: "fingerprint",
      storage: null
    });
    const snapshot = viewerStateToSnapshot(
      {
        ...base,
        referenceRowKey: "row-a",
        hiddenRowKeys: new Set(["row-a"]),
        selection: { rowKey: "row-a", position: 1 },
        selectedRange: { start: 1, end: 1 }
      },
      { fingerprint: "fingerprint", sequenceCount: 1, alignmentLength: 1 }
    );
    const restored = viewerStateFromSnapshot(base, snapshot, []);
    expect(restored.referenceRowKey).toBeNull();
    expect(restored.hiddenRowKeys.size).toBe(0);
    expect(restored.selection).toBeNull();
    expect(restored.selectedRange).toBeNull();
  });

  it("debounces storage writes and tolerates a quota failure", () => {
    vi.useFakeTimers();
    const state = createInitialViewerState({
      rows: [{ id: "one", sequence: "A", rowKey: "row-a" }],
      sourceFingerprint: "fingerprint",
      storage: null
    });
    const source = {
      fingerprint: "fingerprint",
      sequenceCount: 1,
      alignmentLength: 1
    };
    const failingStorage = {
      getItem: () => null,
      setItem: vi.fn(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }),
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0
    } as Storage;

    renderHook(() => useWorkspacePersistence({
      state,
      source,
      storage: failingStorage,
      onRestore: () => undefined
    }));
    act(() => vi.advanceTimersByTime(299));
    expect(failingStorage.setItem).not.toHaveBeenCalled();
    expect(() => act(() => vi.advanceTimersByTime(1))).not.toThrow();
    expect(failingStorage.setItem).toHaveBeenCalledTimes(1);
  });
});
