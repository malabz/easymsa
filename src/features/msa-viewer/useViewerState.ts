import { useEffect, useReducer } from "react";
import type {
  CellSelection,
  ColumnRange,
  MsaTrackId,
  ViewerPreferences,
  ViewerState
} from "./types";

const PREFERENCES_KEY = "easymsa.viewer.preferences.v2";
const REFERENCES_KEY = "easymsa.viewer.references.v1";

const DEFAULT_PREFERENCES: ViewerPreferences = {
  activeTracks: ["conservation", "gap"],
  colorScheme: "nucleotide",
  consensusMode: "majority",
  coordinateMode: "alignment",
  density: "comfortable",
  differenceMode: false
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function readPreferences(): ViewerPreferences {
  const stored = readJson<Partial<ViewerPreferences>>(PREFERENCES_KEY);
  const tracks = stored?.activeTracks?.filter((track): track is MsaTrackId =>
    ["conservation", "gap", "coverage", "entropy"].includes(track)
  );
  return {
    activeTracks: tracks?.length ? tracks : DEFAULT_PREFERENCES.activeTracks,
    colorScheme:
      stored?.colorScheme === "purinePyrimidine" ||
      stored?.colorScheme === "conservation"
        ? stored.colorScheme
        : "nucleotide",
    consensusMode: stored?.consensusMode === "iupac" ? "iupac" : "majority",
    coordinateMode: stored?.coordinateMode === "reference" ? "reference" : "alignment",
    density: stored?.density === "compact" ? "compact" : "comfortable",
    differenceMode: Boolean(stored?.differenceMode)
  };
}

function readReference(jobId: string) {
  const references = readJson<Record<string, string>>(REFERENCES_KEY) ?? {};
  return references[jobId] ?? null;
}

export function createInitialViewerState(jobId: string): ViewerState {
  return {
    ...readPreferences(),
    activeMotifIndex: 0,
    columnFilter: "all",
    hiddenSequenceIds: new Set(),
    inspectorOpen: false,
    motifQuery: "",
    pinnedSequenceIds: new Set(),
    referenceSequenceId: readReference(jobId),
    search: "",
    selectedRange: null,
    selectedSequenceIds: new Set(),
    selection: null,
    sortMode: "original",
    viewport: null,
    zoomLevel: 1
  };
}

export type ViewerAction =
  | { type: "patch"; patch: Partial<ViewerState> }
  | { type: "select"; selection: CellSelection; range: ColumnRange }
  | { type: "clearSelection" }
  | { type: "toggleTrack"; track: MsaTrackId }
  | {
      type: "toggleSequenceSet";
      field: "pinnedSequenceIds" | "selectedSequenceIds";
      sequenceId: string;
    }
  | { type: "hideSequence"; sequenceId: string }
  | { type: "showAllSequences" };

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
  if (action.type === "patch") {
    return { ...state, ...action.patch };
  }
  if (action.type === "select") {
    return {
      ...state,
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
  if (action.type === "toggleSequenceSet") {
    const next = new Set(state[action.field]);
    if (next.has(action.sequenceId)) {
      next.delete(action.sequenceId);
    } else {
      next.add(action.sequenceId);
    }
    return { ...state, [action.field]: next };
  }
  if (action.type === "hideSequence") {
    const hiddenSequenceIds = new Set(state.hiddenSequenceIds);
    hiddenSequenceIds.add(action.sequenceId);
    const selectedSequenceIds = new Set(state.selectedSequenceIds);
    selectedSequenceIds.delete(action.sequenceId);
    return {
      ...state,
      hiddenSequenceIds,
      selectedSequenceIds,
      selection:
        state.selection?.sequenceId === action.sequenceId ? null : state.selection
    };
  }
  return { ...state, hiddenSequenceIds: new Set() };
}

export function useViewerState(jobId: string) {
  const [state, dispatch] = useReducer(
    viewerReducer,
    jobId,
    createInitialViewerState
  );

  useEffect(() => {
    const preferences: ViewerPreferences = {
      activeTracks: state.activeTracks,
      colorScheme: state.colorScheme,
      consensusMode: state.consensusMode,
      coordinateMode: state.coordinateMode,
      density: state.density,
      differenceMode: state.differenceMode
    };
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [
    state.activeTracks,
    state.colorScheme,
    state.consensusMode,
    state.coordinateMode,
    state.density,
    state.differenceMode
  ]);

  useEffect(() => {
    const references = readJson<Record<string, string>>(REFERENCES_KEY) ?? {};
    if (state.referenceSequenceId) {
      references[jobId] = state.referenceSequenceId;
    } else {
      delete references[jobId];
    }
    window.localStorage.setItem(REFERENCES_KEY, JSON.stringify(references));
  }, [jobId, state.referenceSequenceId]);

  return { state, dispatch };
}
