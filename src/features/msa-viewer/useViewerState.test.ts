import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialViewerState,
  useViewerState,
  viewerReducer
} from "./useViewerState";

const rows = [
  { id: "duplicate", sequence: "ACGT", rowKey: "row-1", originalIndex: 0 },
  { id: "duplicate", sequence: "A-GT", rowKey: "row-2", originalIndex: 1 },
  { id: "third", sequence: "ACNT", rowKey: "row-3", originalIndex: 2 }
];

beforeEach(() => window.localStorage.clear());

describe("viewerReducer", () => {
  it("manages tracks and duplicate-header rows only by rowKey", () => {
    const initial = createInitialViewerState({
      rows,
      sourceFingerprint: "fingerprint-one",
      storage: null
    });
    const pinned = viewerReducer(initial, {
      type: "toggleRowSet",
      field: "pinnedRowKeys",
      rowKey: "row-2"
    });
    const selected = viewerReducer(pinned, {
      type: "select",
      selection: { rowKey: "row-2", position: 4 },
      range: { start: 2, end: 4 }
    });

    expect(initial.pinnedRowKeys.size).toBe(0);
    expect(pinned.pinnedRowKeys.has("row-2")).toBe(true);
    expect(pinned.pinnedRowKeys.has("duplicate")).toBe(false);
    expect(selected.selection?.rowKey).toBe("row-2");
    expect(selected.selectedRange).toEqual({ start: 2, end: 4 });
    expect(selected.inspectorOpen).toBe(false);
  });

  it("preserves range selection without opening an interrupting inspector", () => {
    const initial = createInitialViewerState({ rows, sourceFingerprint: "touch-range", storage: null });
    const selected = viewerReducer(initial, {
      type: "select",
      openInspector: false,
      selection: { rowKey: "row-2", position: 8 },
      range: { start: 3, end: 8 }
    });
    expect(selected.selectedRange).toEqual({ start: 3, end: 8 });
    expect(selected.inspectorOpen).toBe(false);
  });

  it("supports visible-row batches and one-step hide undo", () => {
    const initial = createInitialViewerState({
      rows,
      sourceFingerprint: "fingerprint-one",
      storage: null
    });
    const selected = viewerReducer(initial, {
      type: "selectAllVisible",
      rowKeys: ["row-1", "row-2"]
    });
    const hidden = viewerReducer(selected, {
      type: "batchRows",
      operation: "hide",
      rowKeys: selected.selectedRowKeys
    });
    const restored = viewerReducer(hidden, { type: "undoLastHide" });

    expect(selected.selectedRowKeys).toEqual(new Set(["row-1", "row-2"]));
    expect(hidden.hiddenRowKeys).toEqual(new Set(["row-1", "row-2"]));
    expect(hidden.selectedRowKeys.size).toBe(0);
    expect(restored.hiddenRowKeys.size).toBe(0);
  });

  it("never hides the reference row and resetView restores scientific defaults", () => {
    const initial = {
      ...createInitialViewerState({
        rows,
        sourceFingerprint: "fingerprint-one",
        storage: null
      }),
      referenceRowKey: "row-1",
      analysisScope: "selected" as const,
      zoomLevel: 2,
      hiddenRowKeys: new Set(["row-3"])
    };
    const attempted = viewerReducer(initial, { type: "hideRow", rowKey: "row-1" });
    const reset = viewerReducer(attempted, { type: "resetView" });

    expect(attempted.hiddenRowKeys.has("row-1")).toBe(false);
    expect(reset.analysisScope).toBe("all");
    expect(reset.zoomLevel).toBe(1);
    expect(reset.activeTracks).toEqual(["conservation", "gap"]);
    expect(reset.referenceRowKey).toBeNull();
    expect(reset.hiddenRowKeys.size).toBe(0);
  });
});

describe("useViewerState source isolation", () => {
  it("isolates identical content by job/stage while accepting matching legacy workspace files", () => {
    const first = renderHook(() => useViewerState({rows,sourceFingerprint:"same-content",workspaceScope:"job:first:initial"}));
    act(() => first.result.current.dispatch({type:"patch",patch:{zoomLevel:1.5,settingsOpen:true}}));
    const file = first.result.current.exportWorkspace();
    first.unmount();
    const second = renderHook(() => useViewerState({rows,sourceFingerprint:"same-content",workspaceScope:"job:second:final"}));
    expect(second.result.current.state.zoomLevel).toBe(1);
    act(() => { expect(second.result.current.importWorkspace(file).ok).toBe(true); });
    expect(second.result.current.state.zoomLevel).toBe(1.5);
    expect(second.result.current.state.settingsOpen).toBe(false);
    second.unmount();
    const restored=renderHook(() => useViewerState({rows,sourceFingerprint:"same-content",workspaceScope:"job:first:initial"}));
    expect(restored.result.current.state.zoomLevel).toBe(1.5);
  });
  it("switches fingerprints before exposing stale row state", () => {
    const { result, rerender } = renderHook(
      ({ fingerprint }) => useViewerState({
        rows,
        sourceFingerprint: fingerprint,
        storage: null
      }),
      { initialProps: { fingerprint: "fingerprint-one" } }
    );
    act(() => result.current.dispatch({ type: "hideRow", rowKey: "row-1" }));
    expect(result.current.state.hiddenRowKeys.has("row-1")).toBe(true);

    rerender({ fingerprint: "fingerprint-two" });
    expect(result.current.state.hiddenRowKeys.size).toBe(0);
    expect(result.current.state.referenceRowKey).toBeNull();
    expect(result.current.state.selection).toBeNull();
  });

  it("migrates a legacy reference only for a unique server-job header", () => {
    window.localStorage.setItem(
      "easymsa.viewer.references.v1",
      JSON.stringify({ job: "third" })
    );
    const unique = createInitialViewerState({
      rows,
      sourceFingerprint: "fingerprint-one",
      sourceType: "server-job",
      legacyJobId: "job"
    });
    expect(unique.referenceRowKey).toBe("row-3");

    window.localStorage.setItem(
      "easymsa.viewer.references.v1",
      JSON.stringify({ job: "duplicate" })
    );
    const ambiguous = createInitialViewerState({
      rows,
      sourceFingerprint: "fingerprint-two",
      sourceType: "server-job",
      legacyJobId: "job"
    });
    expect(ambiguous.referenceRowKey).toBeNull();
  });

  it("imports a matching snapshot through the hook and dispatches a restore", () => {
    const { result } = renderHook(() => useViewerState({
      rows,
      sourceFingerprint: "fingerprint-import",
      storage: null
    }));
    act(() => result.current.dispatch({ type: "hideRow", rowKey: "row-2" }));
    const exported = result.current.exportWorkspace();
    act(() => result.current.dispatch({ type: "showAllRows" }));
    expect(result.current.state.hiddenRowKeys.size).toBe(0);

    let importResult: ReturnType<typeof result.current.importWorkspace> | undefined;
    act(() => {
      importResult = result.current.importWorkspace(exported);
    });
    expect(importResult).toMatchObject({ ok: true });
    expect(result.current.state.hiddenRowKeys).toEqual(new Set(["row-2"]));
  });
});
