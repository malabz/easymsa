import { useCallback, useEffect, useRef } from "react";
import type { ViewerState } from "./types";
import {
  ANALYSIS_SEMANTICS,
  DEFAULT_QC_THRESHOLDS,
  WORKSPACE_SCHEMA,
  exportWorkspaceSnapshot,
  importWorkspaceSnapshot,
  saveWorkspaceSnapshot,
  type MsaWorkspaceSnapshotV1,
  type WorkspaceImportResult
} from "./workspaceSnapshot";

export type WorkspaceSourceIdentity = {
  fingerprint: string;
  storageKey?: string;
  sequenceCount: number;
  alignmentLength: number;
};

export function resolveBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function viewerStateToSnapshot(
  state: ViewerState,
  source: WorkspaceSourceIdentity,
  updatedAt = new Date().toISOString()
): MsaWorkspaceSnapshotV1 {
  return {
    schema: WORKSPACE_SCHEMA,
    analysisSemantics: ANALYSIS_SEMANTICS,
    source: { fingerprint: source.fingerprint, sequenceCount: source.sequenceCount, alignmentLength: source.alignmentLength },
    view: {
      activeTracks: [...state.activeTracks],
      analysisScope: state.analysisScope,
      colorScheme: state.colorScheme,
      consensusMode: state.consensusMode,
      coordinateMode: state.coordinateMode,
      density: state.density,
      differenceMode: state.differenceMode,
      columnFilter: state.columnFilter,
      sortMode: state.sortMode,
      zoomLevel: state.zoomLevel,
      search: state.search,
      motifQuery: state.motifQuery,
      motifMatchMode: state.motifMatchMode,
      motifStrandMode: state.motifStrandMode,
      viewMode: state.viewMode,
      referenceRowKey: state.referenceRowKey,
      hiddenRowKeys: [...state.hiddenRowKeys],
      pinnedRowKeys: [...state.pinnedRowKeys],
      selectedRowKeys: [...state.selectedRowKeys],
      selection: state.selection
        ? { rowKey: state.selection.rowKey, position: state.selection.position }
        : null,
      selectedRange: state.selectedRange,
      viewport: state.viewport,
      inspectorOpen: false,
      inspectorWidth: state.inspectorWidth,
      minimapCollapsed: state.minimapCollapsed,
      settingsOpen: false,
      qcPanelOpen: false,
      labelWidth: state.labelWidth
    },
    thresholds: state.qcThresholds,
    annotations: state.annotations,
    updatedAt
  };
}

function isRestorableSelectionKey(rowKey: string, validRowKeys: Set<string>) {
  return (
    validRowKeys.has(rowKey) ||
    rowKey === "consensus" ||
    rowKey === "easymsa:consensus" ||
    rowKey.startsWith("track:")
  );
}

/**
 * Applies an already schema-validated snapshot while defensively removing row
 * references that are no longer present. Fingerprint and dimensions are
 * checked before this function is called.
 */
export function viewerStateFromSnapshot(
  base: ViewerState,
  snapshot: MsaWorkspaceSnapshotV1,
  validRowKeys: Iterable<string>
): ViewerState {
  const valid = new Set(validRowKeys);
  const include = (rowKey: string) => valid.has(rowKey);
  const selection =
    snapshot.view.selection &&
    isRestorableSelectionKey(snapshot.view.selection.rowKey, valid)
      ? snapshot.view.selection
      : null;
  const selectedRange = selection ? snapshot.view.selectedRange : null;
  const selectedRowKeys = new Set(snapshot.view.selectedRowKeys.filter(include));
  const referenceRowKey =
    snapshot.view.referenceRowKey && include(snapshot.view.referenceRowKey)
      ? snapshot.view.referenceRowKey
      : null;
  const hiddenRowKeys = new Set(snapshot.view.hiddenRowKeys.filter(include));
  if (referenceRowKey) {
    hiddenRowKeys.delete(referenceRowKey);
  }

  return {
    ...base,
    activeTracks: [...snapshot.view.activeTracks],
    analysisScope:
      snapshot.view.analysisScope === "selected" && selectedRowKeys.size === 0
        ? "all"
        : snapshot.view.analysisScope,
    annotations: snapshot.annotations.filter(
      (annotation) =>
        annotation.target.rowKey === null || include(annotation.target.rowKey)
    ),
    colorScheme: snapshot.view.colorScheme,
    columnFilter: snapshot.view.columnFilter,
    consensusMode: snapshot.view.consensusMode,
    coordinateMode: snapshot.view.coordinateMode,
    density: snapshot.view.density,
    differenceMode: snapshot.view.differenceMode,
    hiddenRowKeys,
    inspectorOpen: false,
    inspectorWidth: snapshot.view.inspectorWidth,
    labelWidth: snapshot.view.labelWidth,
    minimapCollapsed: snapshot.view.minimapCollapsed,
    motifMatchMode: snapshot.view.motifMatchMode,
    motifQuery: snapshot.view.motifQuery,
    motifStrandMode: snapshot.view.motifStrandMode,
    pinnedRowKeys: new Set(snapshot.view.pinnedRowKeys.filter(include)),
    qcPanelOpen: false,
    qcThresholds: snapshot.thresholds ?? DEFAULT_QC_THRESHOLDS,
    referenceRowKey,
    search: snapshot.view.search,
    selectedRange,
    selectedRowKeys,
    selection,
    settingsOpen: false,
    sortMode: snapshot.view.sortMode,
    viewport: snapshot.view.viewport,
    viewMode: snapshot.view.viewMode,
    zoomLevel: snapshot.view.zoomLevel,
    // Transient interaction state always starts clean after a restore.
    activeMotifIndex: 0,
    immersive: false,
    lastHiddenRowKeys: [],
    rangeSelectionMode: false
  };
}

export type UseWorkspacePersistenceOptions = {
  state: ViewerState;
  source: WorkspaceSourceIdentity;
  storage: Storage | null;
  enabled?: boolean;
  debounceMs?: number;
  onRestore: (snapshot: MsaWorkspaceSnapshotV1) => void;
};

/** Debounced, failure-tolerant workspace persistence scoped by fingerprint. */
export function useWorkspacePersistence({
  state,
  source,
  storage,
  enabled = true,
  debounceMs = 300,
  onRestore
}: UseWorkspacePersistenceOptions) {
  const latest = useRef({ state, source, storage, enabled });
  latest.current = { state, source, storage, enabled };
  useEffect(() => {
    const flush = () => {
      const current = latest.current;
      if (!current.enabled || !current.storage) return;
      try { saveWorkspaceSnapshot(current.storage, viewerStateToSnapshot(current.state, current.source), current.source.storageKey); } catch { /* Optional browser storage. */ }
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);
  useEffect(() => {
    if (!enabled || !storage) {
      return;
    }
    const timeout = window.setTimeout(() => {
      try {
        saveWorkspaceSnapshot(storage, viewerStateToSnapshot(state, source), source.storageKey);
      } catch {
        // Storage/schema failures must never make the alignment unreadable.
      }
    }, debounceMs);
    return () => window.clearTimeout(timeout);
  }, [debounceMs, enabled, source, state, storage]);

  const exportWorkspace = useCallback(
    () => exportWorkspaceSnapshot(viewerStateToSnapshot(state, source)),
    [source, state]
  );

  const importWorkspace = useCallback(
    (text: string): WorkspaceImportResult => {
      const result = importWorkspaceSnapshot(text, source);
      if (result.ok) {
        onRestore(result.snapshot);
      }
      return result;
    },
    [onRestore, source]
  );

  return { exportWorkspace, importWorkspace };
}
