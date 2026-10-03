import { useCallback, useMemo, useReducer } from "react";
import type { AlignmentDescriptor, MSASequence } from "../../lib/types/msa";
import {
  canonicalAlignmentSourceKey,
  rowKeyForSequence
} from "./alignmentModel";
import type {
  CellSelection,
  ColumnRange,
  MsaTrackId,
  ViewerPreferences,
  ViewerState
} from "./types";
import {
  DEFAULT_QC_THRESHOLDS,
  loadWorkspaceSnapshot,
  migrateLegacyPreferences,
  migrateLegacyReference,
  type MsaWorkspaceSnapshotV1,
  type QcAnnotation
} from "./workspaceSnapshot";
import {
  resolveBrowserStorage,
  useWorkspacePersistence,
  viewerStateFromSnapshot,
  type WorkspaceSourceIdentity
} from "./useWorkspacePersistence";

export const DEFAULT_VIEWER_PREFERENCES: ViewerPreferences = {
  activeTracks: ["conservation", "gap"],
  colorScheme: "nucleotide",
  consensusMode: "majority",
  coordinateMode: "alignment",
  density: "comfortable",
  differenceMode: false
};

export type ViewerStateOptions = {
  descriptor?: AlignmentDescriptor;
  rows: MSASequence[];
  sourceFingerprint?: string;
  alignmentLength?: number;
  legacyJobId?: string;
  sourceType?: "server-job" | "local-file" | "pasted" | "public-example";
  /** null explicitly disables persistence; omitted uses browser localStorage. */
  storage?: Storage | null;
};

type ResolvedViewerSource = WorkspaceSourceIdentity & {
  signature: string;
  rowKeys: string[];
  rows: Array<{ id: string; rowKey: string }>;
  sourceType: "server-job" | "local-file" | "pasted" | "public-example";
  legacyJobId?: string;
  storage: Storage | null;
  persistenceEnabled: boolean;
};

function cloneDefaultThresholds() {
  return {
    row: { ...DEFAULT_QC_THRESHOLDS.row },
    column: { ...DEFAULT_QC_THRESHOLDS.column }
  };
}

function defaultViewerState(
  preferences: Partial<ViewerPreferences> = {}
): ViewerState {
  return {
    ...DEFAULT_VIEWER_PREFERENCES,
    ...preferences,
    activeTracks: preferences.activeTracks?.length
      ? [...preferences.activeTracks]
      : [...DEFAULT_VIEWER_PREFERENCES.activeTracks],
    activeMotifIndex: 0,
    analysisScope: "all",
    annotations: [],
    columnFilter: "all",
    hiddenRowKeys: new Set(),
    immersive: false,
    inspectorOpen: false,
    inspectorWidth: 320,
    labelWidth: 192,
    lastHiddenRowKeys: [],
    minimapCollapsed: false,
    motifMatchMode: "strict",
    motifQuery: "",
    motifStrandMode: "forward",
    pinnedRowKeys: new Set(),
    qcPanelOpen: false,
    qcSortMode: "original",
    qcThresholds: cloneDefaultThresholds(),
    rangeSelectionMode: false,
    referenceRowKey: null,
    search: "",
    selectedRange: null,
    selectedRowKeys: new Set(),
    selection: null,
    settingsOpen: false,
    sortMode: "original",
    viewport: null,
    viewMode: "detail",
    zoomLevel: 1
  };
}

function sourceKindFromDescriptor(descriptor?: AlignmentDescriptor) {
  if (descriptor?.sourceKind === "example") return "public-example" as const;
  if (descriptor?.sourceKind === "local-file") {
    return "local-file" as const;
  }
  if (descriptor?.sourceKind === "pasted") {
    return "pasted" as const;
  }
  return "server-job" as const;
}

function normalizeFingerprint(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 8 ? trimmed : `source:${trimmed || "unknown"}`;
}

export function resolveViewerSource(
  input: string | ViewerStateOptions
): ResolvedViewerSource {
  if (typeof input === "string") {
    const fingerprint = normalizeFingerprint(`legacy-job:${input}`);
    return {
      fingerprint,
      sequenceCount: 0,
      alignmentLength: 0,
      signature: `${fingerprint}:0:0`,
      rowKeys: [],
      rows: [],
      sourceType: "server-job",
      legacyJobId: input,
      storage: resolveBrowserStorage(),
      // A job id is not a content fingerprint, so it is not persisted as one.
      persistenceEnabled: false
    };
  }

  const rows = input.rows.map((row, index) => ({
    id: row.id,
    rowKey: rowKeyForSequence(row, index)
  }));
  const descriptor = input.descriptor;
  const fingerprint = normalizeFingerprint(
    input.sourceFingerprint ??
      (descriptor?.sourceKind === "example" ? descriptor.sourceKey : descriptor?.alignmentSha256) ??
      descriptor?.sourceKey ??
      canonicalAlignmentSourceKey(input.rows)
  );
  const alignmentLength =
    input.alignmentLength ??
    descriptor?.alignmentLength ??
    input.rows.reduce(
      (maximum, row) => Math.max(maximum, row.sequence.length),
      0
    );
  const sequenceCount = descriptor?.sequenceCount ?? input.rows.length;
  const storage = input.storage === undefined
    ? resolveBrowserStorage()
    : input.storage;

  return {
    fingerprint,
    sequenceCount,
    alignmentLength,
    signature: `${fingerprint}:${sequenceCount}:${alignmentLength}`,
    rowKeys: rows.map((row) => row.rowKey),
    rows,
    sourceType: input.sourceType ?? sourceKindFromDescriptor(descriptor),
    legacyJobId: input.legacyJobId,
    storage,
    persistenceEnabled: true
  };
}

function loadInitialViewerState(source: ResolvedViewerSource): ViewerState {
  const preferences = source.storage
    ? migrateLegacyPreferences(source.storage) ?? {}
    : {};
  let state = defaultViewerState(preferences);
  const snapshot = source.storage
    ? loadWorkspaceSnapshot(source.storage, source.fingerprint)
    : null;

  if (
    snapshot &&
    snapshot.source.sequenceCount === source.sequenceCount &&
    snapshot.source.alignmentLength === source.alignmentLength
  ) {
    return viewerStateFromSnapshot(state, snapshot, source.rowKeys);
  }

  if (source.storage) {
    const migratedReference = migrateLegacyReference(source.storage, {
      sourceType: source.sourceType,
      legacyJobId: source.legacyJobId,
      rows: source.rows
    });
    if (migratedReference) {
      state = { ...state, referenceRowKey: migratedReference };
    }
  }
  return state;
}

export function createInitialViewerState(
  input: string | ViewerStateOptions = ""
): ViewerState {
  return loadInitialViewerState(resolveViewerSource(input));
}

export type AnnotationUpdate = Partial<
  Pick<QcAnnotation, "category" | "text" | "target" | "updatedAt">
>;

export type ViewerAction =
  | { type: "patch"; patch: Partial<ViewerState> }
  | { type: "select"; selection: CellSelection; range: ColumnRange; openInspector?: boolean }
  | { type: "clearSelection" }
  | { type: "toggleTrack"; track: MsaTrackId }
  | {
      type: "toggleRowSet";
      field: "pinnedRowKeys" | "selectedRowKeys";
      rowKey: string;
    }
  | {
      /** @deprecated Callers should dispatch toggleRowSet with a rowKey. */
      type: "toggleSequenceSet";
      field: "pinnedSequenceIds" | "selectedSequenceIds";
      sequenceId: string;
    }
  | { type: "hideRow"; rowKey: string }
  | { type: "hideSequence"; sequenceId: string }
  | { type: "showAllRows" | "showAllSequences" }
  | { type: "selectAllVisible"; rowKeys: Iterable<string> }
  | {
      type: "batchRows";
      operation: "hide" | "pin" | "unpin";
      rowKeys: Iterable<string>;
    }
  | { type: "undoLastHide" }
  | { type: "resetView" }
  | { type: "addAnnotation"; annotation: QcAnnotation }
  | { type: "updateAnnotation"; id: string; patch: AnnotationUpdate }
  | { type: "removeAnnotation"; id: string }
  | {
      type: "restoreSnapshot";
      snapshot: MsaWorkspaceSnapshotV1;
      validRowKeys: Iterable<string>;
    };

function toggleSet(set: Set<string>, value: string) {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

function hideRows(state: ViewerState, values: Iterable<string>): ViewerState {
  const candidates = Array.from(new Set(values)).filter(
    (rowKey) => rowKey !== state.referenceRowKey && !state.hiddenRowKeys.has(rowKey)
  );
  if (!candidates.length) {
    return state;
  }
  const hiddenRowKeys = new Set(state.hiddenRowKeys);
  const selectedRowKeys = new Set(state.selectedRowKeys);
  const pinnedRowKeys = new Set(state.pinnedRowKeys);
  candidates.forEach((rowKey) => {
    hiddenRowKeys.add(rowKey);
    selectedRowKeys.delete(rowKey);
    pinnedRowKeys.delete(rowKey);
  });
  const selectedHidden = state.selection
    ? candidates.includes(state.selection.rowKey)
    : false;
  const next: ViewerState = {
    ...state,
    hiddenRowKeys,
    pinnedRowKeys,
    selectedRowKeys,
    selection: selectedHidden ? null : state.selection,
    selectedRange: selectedHidden ? null : state.selectedRange,
    lastHiddenRowKeys: candidates
  };
  return next.analysisScope === "selected" && next.selectedRowKeys.size === 0
    ? { ...next, analysisScope: "all" }
    : next;
}

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  if (action.type === "patch") {
    const next = { ...state, ...action.patch };
    return next.analysisScope === "selected" && next.selectedRowKeys.size === 0
      ? { ...next, analysisScope: "all" }
      : next;
  }
  if (action.type === "select") {
    return {
      ...state,
      inspectorOpen: action.openInspector ?? true,
      selection: action.selection,
      selectedRange: action.range
    };
  }
  if (action.type === "clearSelection") {
    return { ...state, selection: null, selectedRange: null };
  }
  if (action.type === "toggleTrack") {
    const activeTracks = state.activeTracks.includes(action.track)
      ? state.activeTracks.filter((track) => track !== action.track)
      : [...state.activeTracks, action.track];
    return { ...state, activeTracks };
  }
  if (action.type === "toggleRowSet") {
    const next = {
      ...state,
      [action.field]: toggleSet(state[action.field], action.rowKey)
    };
    return next.analysisScope === "selected" && next.selectedRowKeys.size === 0
      ? { ...next, analysisScope: "all" }
      : next;
  }
  if (action.type === "toggleSequenceSet") {
    const field = action.field === "pinnedSequenceIds"
      ? "pinnedRowKeys"
      : "selectedRowKeys";
    const next = { ...state, [field]: toggleSet(state[field], action.sequenceId) };
    return next.analysisScope === "selected" && next.selectedRowKeys.size === 0
      ? { ...next, analysisScope: "all" }
      : next;
  }
  if (action.type === "hideRow") {
    return hideRows(state, [action.rowKey]);
  }
  if (action.type === "hideSequence") {
    return hideRows(state, [action.sequenceId]);
  }
  if (action.type === "showAllRows" || action.type === "showAllSequences") {
    return { ...state, hiddenRowKeys: new Set(), lastHiddenRowKeys: [] };
  }
  if (action.type === "selectAllVisible") {
    const selectedRowKeys = new Set(action.rowKeys);
    return {
      ...state,
      selectedRowKeys,
      analysisScope:
        state.analysisScope === "selected" && selectedRowKeys.size === 0
          ? "all"
          : state.analysisScope
    };
  }
  if (action.type === "batchRows") {
    if (action.operation === "hide") {
      return hideRows(state, action.rowKeys);
    }
    const pinnedRowKeys = new Set(state.pinnedRowKeys);
    for (const rowKey of action.rowKeys) {
      if (action.operation === "pin") {
        pinnedRowKeys.add(rowKey);
      } else {
        pinnedRowKeys.delete(rowKey);
      }
    }
    return { ...state, pinnedRowKeys };
  }
  if (action.type === "undoLastHide") {
    const hiddenRowKeys = new Set(state.hiddenRowKeys);
    state.lastHiddenRowKeys.forEach((rowKey) => hiddenRowKeys.delete(rowKey));
    return { ...state, hiddenRowKeys, lastHiddenRowKeys: [] };
  }
  if (action.type === "resetView") {
    return {
      ...state,
      activeTracks: [...DEFAULT_VIEWER_PREFERENCES.activeTracks],
      activeMotifIndex: 0,
      analysisScope: "all",
      columnFilter: "all",
      coordinateMode: "alignment",
      differenceMode: false,
      hiddenRowKeys: new Set(),
      lastHiddenRowKeys: [],
      inspectorWidth: 320,
      labelWidth: 192,
      minimapCollapsed: false,
      motifQuery: "",
      pinnedRowKeys: new Set(),
      qcThresholds: cloneDefaultThresholds(),
      rangeSelectionMode: false,
      referenceRowKey: null,
      search: "",
      selectedRange: null,
      selectedRowKeys: new Set(),
      selection: null,
      sortMode: "original",
      viewport: null,
      viewMode: "detail",
      zoomLevel: 1
    };
  }
  if (action.type === "addAnnotation") {
    const annotations = state.annotations.some(
      (annotation) => annotation.id === action.annotation.id
    )
      ? state.annotations.map((annotation) =>
          annotation.id === action.annotation.id ? action.annotation : annotation
        )
      : [...state.annotations, action.annotation];
    return { ...state, annotations };
  }
  if (action.type === "updateAnnotation") {
    return {
      ...state,
      annotations: state.annotations.map((annotation) =>
        annotation.id === action.id
          ? {
              ...annotation,
              ...action.patch,
              updatedAt: action.patch.updatedAt ?? new Date().toISOString()
            }
          : annotation
      )
    };
  }
  if (action.type === "removeAnnotation") {
    return {
      ...state,
      annotations: state.annotations.filter(
        (annotation) => annotation.id !== action.id
      )
    };
  }
  if (action.type === "restoreSnapshot") {
    return viewerStateFromSnapshot(state, action.snapshot, action.validRowKeys);
  }
  return state;
}

type ReducerRecord = {
  signature: string;
  state: ViewerState;
};

type InternalAction =
  | { type: "viewer"; action: ViewerAction }
  | { type: "switchSource"; source: ResolvedViewerSource };

function internalReducer(record: ReducerRecord, action: InternalAction): ReducerRecord {
  if (action.type === "switchSource") {
    return {
      signature: action.source.signature,
      state: loadInitialViewerState(action.source)
    };
  }
  return { ...record, state: viewerReducer(record.state, action.action) };
}

/**
 * The string overload remains for staged integration. New callers should pass
 * descriptor + rows so restoration is bound to alignment content, never a job
 * id or filename.
 */
export function useViewerState(input: string | ViewerStateOptions) {
  const source = resolveViewerSource(input);
  const [record, dispatchInternal] = useReducer(
    internalReducer,
    source,
    (initialSource): ReducerRecord => ({
      signature: initialSource.signature,
      state: loadInitialViewerState(initialSource)
    })
  );

  // React immediately restarts this render with the new source state, so stale
  // selections/references never commit or reach downstream workers.
  if (record.signature !== source.signature) {
    dispatchInternal({ type: "switchSource", source });
  }

  const dispatch = useCallback(
    (action: ViewerAction) => dispatchInternal({ type: "viewer", action }),
    []
  );
  const sourceIdentity = useMemo<WorkspaceSourceIdentity>(
    () => ({
      fingerprint: source.fingerprint,
      sequenceCount: source.sequenceCount,
      alignmentLength: source.alignmentLength
    }),
    [source.alignmentLength, source.fingerprint, source.sequenceCount]
  );
  const validRowKeySignature = source.rowKeys.join("\u0000");
  const validRowKeys = useMemo(
    () => source.rowKeys,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [validRowKeySignature]
  );
  const onRestore = useCallback(
    (snapshot: MsaWorkspaceSnapshotV1) =>
      dispatch({ type: "restoreSnapshot", snapshot, validRowKeys }),
    [dispatch, validRowKeys]
  );
  const workspace = useWorkspacePersistence({
    state: record.state,
    source: sourceIdentity,
    storage: source.storage,
    enabled: source.persistenceEnabled,
    onRestore
  });

  return {
    state: record.state,
    dispatch,
    sourceFingerprint: source.fingerprint,
    workspaceSource: sourceIdentity,
    ...workspace
  };
}
