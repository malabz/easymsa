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
  it("ignores old panel flags while restoring the scientific view", () => {
    const base = createInitialViewerState({rows: [{id:"a",rowKey:"a",sequence:"AC"}],storage:null,sourceFingerprint:"matrix-first"});
    const snapshot = viewerStateToSnapshot({...base, zoomLevel:1.4, selection:{rowKey:"a",position:2}, selectedRange:{start:1,end:2}},
      {fingerprint:"matrix-first",sequenceCount:1,alignmentLength:2});
    snapshot.view.settingsOpen = true; snapshot.view.inspectorOpen = true; snapshot.view.qcPanelOpen = true;
    const restored = viewerStateFromSnapshot(base,snapshot,["a"]);
    expect(restored).toMatchObject({settingsOpen:false,inspectorOpen:false,qcPanelOpen:false,zoomLevel:1.4,selection:{rowKey:"a",position:2}});
  });
  it("flushes the latest selection when the viewer closes before the debounce", () => {
    vi.useFakeTimers();
    const state = createInitialViewerState({rows:[{id:"a",rowKey:"a",sequence:"AC"}],storage:null,sourceFingerprint:"flush-state"});
    localStorage.clear();
    const {unmount}=renderHook(() => useWorkspacePersistence({state:{...state,zoomLevel:1.2},source:{fingerprint:"flush-state",sequenceCount:1,alignmentLength:2},
      storage:localStorage,onRestore:()=>undefined}));
    unmount();
    expect(JSON.parse(localStorage.getItem("easymsa.viewer.workspaces.v1")!).entries["flush-state"].snapshot.view.zoomLevel).toBe(1.2);
  });
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
