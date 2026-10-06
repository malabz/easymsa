import { Download, Loader2, MousePointer2, RotateCcw, X } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ChangeEvent
} from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { OverlayDialog } from "../../components/common/OverlayDialog";
import { MSAColorLegend } from "../../components/results/MSAColorLegend";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type {
  AlignmentDescriptor,
  MSAResult,
  MSASequence
} from "../../lib/types/msa";
import { ExportDialog } from "../msa-export/ExportDialog";
import type { MsaExportAnnotation } from "../msa-export/exportTypes";
import { useMsaExport } from "../msa-export/useMsaExport";
import {
  buildAlignmentDescriptor,
  canonicalAlignmentSourceKey,
  resolveAnalysisScopeSequences,
  rowKeyForSequence,
  stableRowKey
} from "./alignmentModel";
import { buildReferenceCoordinateMap } from "./analysis";
import {
  identityColumnPositionView,
  lowerBoundVisibleIndex,
  materializePositionArray,
  positionAt,
  visibleIndexOfPosition
} from "./columnStatsStore";
import { MsaAnnotationPanel } from "./MsaAnnotationPanel";
import { MsaDomMatrix } from "./MsaDomMatrix";
import { MsaInspector } from "./MsaInspector";
import { MsaOverviewNavigator } from "./MsaOverviewNavigator";
import { MsaQcPanel } from "./MsaQcPanel";
import { MsaWorkspaceHeader } from "./MsaWorkspaceHeader";
import { MsaSettingsDock } from "./MsaSettingsDock";
import { MsaViewerToolbar, type MsaViewerToolbarProps } from "./MsaViewerToolbar";
import { MsaWorkspaceShell } from "./MsaWorkspaceShell";
import {
  DEFAULT_ROW_QC_FILTERS,
  createQcAnnotation,
  filterColumnPositionViewForQc,
  type RowQcFilters,
  type RowQcSortKey
} from "./qcModel";
import type {
  CellSelection,
  ColumnRange,
  MsaViewSettings,
  ViewerState
} from "./types";
import { useMsaAnalysis } from "./useMsaAnalysis";
import { useMsaRangeStats } from "./useMsaRangeStats";
import { useViewerState } from "./useViewerState";
import {
  serializableViewerContext,
  type MsaViewerContext
} from "./viewerContext";
import type { QcAnnotation } from "./workspaceSnapshot";

const DETAIL_ZOOM_THRESHOLD = 0.7;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const CONSENSUS_ROW_KEY = "easymsa:consensus";

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export function getMsaViewSettings(
  zoomLevel: number,
  density: ViewerState["density"],
  viewMode?: ViewerState["viewMode"],
  labelWidth?: number
): MsaViewSettings {
  const compact = density === "compact";
  const showCharacters = viewMode
    ? viewMode === "detail"
    : zoomLevel >= DETAIL_ZOOM_THRESHOLD;
  const baseCellWidth = compact ? 14 : 20;
  const baseCellHeight = compact ? 20 : 24;
  const rowPadding = compact ? 10 : 14;
  const overviewCellSize = Math.max(3, Math.round(12 * zoomLevel));
  return {
    cellWidth: showCharacters
      ? Math.round(baseCellWidth * zoomLevel)
      : overviewCellSize,
    cellHeight: showCharacters
      ? Math.round(baseCellHeight * zoomLevel)
      : overviewCellSize,
    rowHeight: showCharacters
      ? Math.round(baseCellHeight * zoomLevel + rowPadding)
      : Math.max(6, overviewCellSize + 2),
    fontSize: Math.max(9, Math.round((compact ? 10 : 11) * zoomLevel)),
    labelWidth: Math.max(
      96,
      Math.min(
        360,
        labelWidth ?? Math.round(
          (compact ? 160 : 192) * Math.min(Math.max(zoomLevel, 0.8), 1.2)
        )
      )
    ),
    markerEvery:
      zoomLevel < 0.35 ? 100 : zoomLevel < 0.7 ? 50 : zoomLevel < 0.95 ? 20 : 10,
    showCharacters,
    cellGap: showCharacters ? 2 : 0
  };
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return mobile;
}

function prepareAlignment(alignment: MSAResult) {
  const sourceKey = alignment.descriptor?.sourceKey ??
    canonicalAlignmentSourceKey(alignment.sequences);
  const sequences = alignment.sequences.map((sequence, index) => ({
    ...sequence,
    originalIndex: sequence.originalIndex ?? index,
    rowKey: sequence.rowKey ?? stableRowKey(sourceKey, sequence.originalIndex ?? index)
  }));
  const descriptor: AlignmentDescriptor = alignment.descriptor ??
    buildAlignmentDescriptor(sequences, {
      sourceKind: "job",
      sourceName: alignment.jobId || "alignment",
      sourceKey
    });
  return {
    ...alignment,
    sequences,
    sequenceCount: alignment.sequenceCount ?? sequences.length,
    alignmentLength: alignment.alignmentLength ?? descriptor.alignmentLength,
    descriptor
  } satisfies MSAResult;
}

function downloadText(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function fastaForPositions(sequences: MSASequence[], positions: number[]) {
  return `${sequences
    .map((sequence) =>
      `>${sequence.id}\n${positions
        .map((position) => sequence.sequence[position - 1] ?? "")
        .join("")}`
    )
    .join("\n")}\n`;
}

function selectedRangeLabel(range: ColumnRange | null) {
  if (!range) return "";
  return range.start === range.end ? String(range.start) : `${range.start}-${range.end}`;
}

function DifferenceLegend() {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo.differences;
  const items = [
    [t.match, "bg-slate-100 border-slate-300"],
    [t.compatibleAmbiguity, "bg-violet-100 border-violet-400 border-dashed"],
    [t.substitution, "bg-rose-200 border-rose-500"],
    [t.insertion, "bg-teal-200 border-teal-500 border-dashed"],
    [t.deletion, "bg-amber-200 border-amber-500 border-dotted"],
    [t.unknown, "bg-slate-200 border-slate-500 border-dashed"]
  ];
  return (
    <div className="flex flex-wrap gap-2 p-3">
      {items.map(([label, className]) => (
        <span className={`inline-flex min-h-8 items-center rounded border px-3 text-xs font-medium text-slate-800 ${className}`} key={label}>
          {label}
        </span>
      ))}
    </div>
  );
}

function rowMetric(row: ReturnType<typeof useMsaAnalysis>["rowQc"][number] | undefined, key: ViewerState["sortMode"]) {
  if (!row) return Number.POSITIVE_INFINITY;
  if (key === "gap") return row.gapFraction ?? 0;
  if (key === "ambiguity") return row.ambiguityFraction;
  if (key === "gc") return row.gcFraction ?? Number.POSITIVE_INFINITY;
  if (key === "identity") return row.identity ?? row.reference?.identity ?? Number.POSITIVE_INFINITY;
  return row.originalIndex;
}

export function MsaViewerRoot({
  alignment: sourceAlignment,
  context, sourceName, workspaceScope, presentation = "embedded", onReturn, onReplaceInput, headerActions, example = false
}: {
  alignment: MSAResult;
  context?: MsaViewerContext;
  sourceName?: string;
  workspaceScope?: string;
  presentation?: "embedded" | "immersive";
  onReturn?: () => void;
  onReplaceInput?: () => void;
  headerActions?: ReactNode;
  example?: boolean;
}) {
  const { dictionary: d, locale } = useLanguage();
  const mobile = useMobileLayout();
  const alignment = useMemo(() => prepareAlignment(sourceAlignment), [sourceAlignment]);
  const descriptor = alignment.descriptor!;
  const alignmentLength = alignment.alignmentLength ?? descriptor.alignmentLength;
  const {
    state,
    dispatch,
    sourceFingerprint,
    exportWorkspace,
    importWorkspace
  } = useViewerState({
    workspaceScope,
    descriptor,
    rows: alignment.sequences,
    alignmentLength,
    legacyJobId: alignment.jobId
  });
  const [jumpPosition, setJumpPosition] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [qcFilters, setQcFilters] = useState<RowQcFilters>(DEFAULT_ROW_QC_FILTERS);
  const [qcSortDirection, setQcSortDirection] = useState<"asc" | "desc">("asc");
  const scrollRef = useRef<HTMLDivElement>(null);
  const workspaceFileRef = useRef<HTMLInputElement>(null);
  const pendingZoomAnchorRef = useRef<number | null>(null);
  const restoredViewportSourceRef = useRef<string | null>(null);
  const deferredSearch = useDeferredValue(state.search.trim().toLocaleLowerCase());
  const canAnalyze = !alignment.truncated &&
    descriptor.alignmentMode === "aligned" &&
    descriptor.alphabet !== "protein" &&
    descriptor.alphabet !== "unknown";
  const renderColorScheme = canAnalyze ? state.colorScheme : "neutral" as const;
  const rowRecords = useMemo(
    () => alignment.sequences.map((sequence, index) => ({
      sequence,
      rowKey: rowKeyForSequence(sequence, sequence.originalIndex ?? index),
      sourceIndex: sequence.originalIndex ?? index
    })),
    [alignment.sequences]
  );
  const rowByKey = useMemo(
    () => new Map(rowRecords.map((row) => [row.rowKey, row.sequence])),
    [rowRecords]
  );
  const headerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    rowRecords.forEach(({ sequence }) => counts.set(sequence.id, (counts.get(sequence.id) ?? 0) + 1));
    return counts;
  }, [rowRecords]);
  const rowLabels = useMemo(
    () => new Map(rowRecords.map(({ rowKey, sequence, sourceIndex }) => [
      rowKey,
      (headerCounts.get(sequence.id) ?? 0) > 1
        ? `${sequence.id} (#${sourceIndex + 1})`
        : sequence.id
    ])),
    [headerCounts, rowRecords]
  );
  const reference = state.referenceRowKey
    ? rowByKey.get(state.referenceRowKey) ?? null
    : null;

  useEffect(() => {
    setQcFilters(DEFAULT_ROW_QC_FILTERS);
    setQcSortDirection("asc");
    setWorkspaceMessage(null);
  }, [sourceFingerprint]);

  useEffect(() => {
    if (state.referenceRowKey && !reference) {
      dispatch({
        type: "patch",
        patch: {
          coordinateMode: "alignment",
          differenceMode: false,
          referenceRowKey: null
        }
      });
    }
  }, [dispatch, reference, state.referenceRowKey]);

  useEffect(() => {
    if (!canAnalyze && (
      state.activeTracks.length ||
      state.analysisScope !== "all" ||
      state.columnFilter !== "all" ||
      state.differenceMode ||
      state.coordinateMode === "reference" ||
      state.referenceRowKey ||
      state.motifQuery ||
      state.qcPanelOpen
    )) {
      dispatch({
        type: "patch",
        patch: {
          activeTracks: [],
          activeMotifIndex: 0,
          analysisScope: "all",
          columnFilter: "all",
          coordinateMode: "alignment",
          differenceMode: false,
          motifQuery: "",
          qcPanelOpen: false,
          referenceRowKey: null
        }
      });
    }
  }, [canAnalyze, dispatch, state.activeTracks.length, state.analysisScope, state.columnFilter, state.coordinateMode, state.differenceMode, state.motifQuery, state.qcPanelOpen, state.referenceRowKey]);

  const baseVisibleRecords = useMemo(
    () => rowRecords.filter(({ rowKey, sequence }) => {
      if (rowKey === state.referenceRowKey) return true;
      if (state.hiddenRowKeys.has(rowKey)) return false;
      return !deferredSearch || sequence.id.toLocaleLowerCase().includes(deferredSearch);
    }),
    [deferredSearch, rowRecords, state.hiddenRowKeys, state.referenceRowKey]
  );
  const baseVisibleRowKeys = useMemo(
    () => baseVisibleRecords.map((row) => row.rowKey),
    [baseVisibleRecords]
  );
  const analysis = useMsaAnalysis(alignment.sequences, alignmentLength, {
    sourceFingerprint,
    alphabet: descriptor.alphabet,
    alignmentMode: descriptor.alignmentMode,
    analysisScope: state.analysisScope,
    visibleRowKeys: baseVisibleRowKeys,
    selectedRowKeys: state.selectedRowKeys,
    referenceRowKey: state.referenceRowKey,
    enabled: canAnalyze,
    motifQuery: state.motifQuery,
    motifMatchMode: state.motifMatchMode,
    motifStrandMode: state.motifStrandMode
  });
  const rowQcByKey = useMemo(
    () => new Map(analysis.rowQc.map((row) => [row.rowKey, row])),
    [analysis.rowQc]
  );
  const displayedRecords = useMemo(() => {
    const sorted = [...baseVisibleRecords].sort((left, right) => {
      if (left.rowKey === state.referenceRowKey) return -1;
      if (right.rowKey === state.referenceRowKey) return 1;
      const leftPinned = state.pinnedRowKeys.has(left.rowKey);
      const rightPinned = state.pinnedRowKeys.has(right.rowKey);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
      if (state.sortMode === "name") {
        return left.sequence.id.localeCompare(right.sequence.id) || left.sourceIndex - right.sourceIndex;
      }
      if (state.sortMode === "length") {
        return right.sequence.sequence.length - left.sequence.sequence.length || left.sourceIndex - right.sourceIndex;
      }
      if (state.sortMode !== "original") {
        const compared = rowMetric(rowQcByKey.get(left.rowKey), state.sortMode) -
          rowMetric(rowQcByKey.get(right.rowKey), state.sortMode);
        if (Number.isFinite(compared) && compared !== 0) return compared;
      }
      return left.sourceIndex - right.sourceIndex;
    });
    return sorted;
  }, [baseVisibleRecords, rowQcByKey, state.pinnedRowKeys, state.referenceRowKey, state.sortMode]);
  const displayedSequences = useMemo(
    () => displayedRecords.map((row) => row.sequence),
    [displayedRecords]
  );
  const displayedRowKeys = useMemo(
    () => displayedRecords.map((row) => row.rowKey),
    [displayedRecords]
  );
  const displayedRowIndex = useMemo(
    () => new Map(displayedRowKeys.map((rowKey, index) => [rowKey, index])),
    [displayedRowKeys]
  );
  const displayedRowKeySet = useMemo(() => new Set(displayedRowKeys), [displayedRowKeys]);
  const scopeSequences = useMemo(
    () => resolveAnalysisScopeSequences(alignment.sequences, state.analysisScope, {
      visibleRowKeys: baseVisibleRowKeys,
      selectedRowKeys: state.selectedRowKeys
    }),
    [alignment.sequences, baseVisibleRowKeys, state.analysisScope, state.selectedRowKeys]
  );
  const analysisRowKeySet = useMemo(
    () => new Set(analysis.scopeRowKeys),
    [analysis.scopeRowKeys]
  );
  const consensus = state.consensusMode === "iupac"
    ? analysis.consensus.iupac
    : analysis.consensus.majority;
  const viewerAlignment = useMemo(
    () => ({ ...alignment, consensus: canAnalyze ? consensus : undefined }),
    [alignment, canAnalyze, consensus]
  );
  const identityPositions = useMemo(
    () => identityColumnPositionView(alignmentLength),
    [alignmentLength]
  );
  const visiblePositions = useMemo(() => {
    if (!canAnalyze || !analysis.columnStore) return identityPositions;
    return filterColumnPositionViewForQc(
      analysis.columnStore,
      state.columnFilter,
      state.qcThresholds.column
    );
  }, [analysis.columnStore, canAnalyze, identityPositions, state.columnFilter, state.qcThresholds.column]);
  const viewSettings = useMemo(() => {
    const settings = getMsaViewSettings(
      state.zoomLevel,
      state.density,
      state.viewMode,
      mobile ? Math.min(120, state.labelWidth) : state.labelWidth
    );
    return mobile && settings.showCharacters
      ? {
          ...settings,
          cellWidth: Math.max(44, settings.cellWidth),
          cellHeight: Math.max(44, settings.cellHeight),
          rowHeight: Math.max(48, settings.rowHeight)
        }
      : settings;
  }, [mobile, state.density, state.labelWidth, state.viewMode, state.zoomLevel]);
  const activeTracks = canAnalyze ? state.activeTracks : [];
  const navigationRowKeys = useMemo(
    () => [
      ...activeTracks.map((track) => `track:${track}`),
      ...displayedRowKeys,
      ...(canAnalyze ? [CONSENSUS_ROW_KEY] : [])
    ],
    [activeTracks, canAnalyze, displayedRowKeys]
  );
  const navigationRowIndex = useMemo(
    () => new Map(navigationRowKeys.map((rowKey, index) => [rowKey, index])),
    [navigationRowKeys]
  );
  const referenceMap = useMemo(
    () => canAnalyze && reference ? buildReferenceCoordinateMap(reference.sequence) : null,
    [canAnalyze, reference]
  );
  const displayedMotifMatches = useMemo(
    () => analysis.motifMatches.filter((match) => displayedRowKeySet.has(match.rowKey)),
    [analysis.motifMatches, displayedRowKeySet]
  );
  const motifMatchCount = useMemo(
    () => displayedRowKeys.reduce(
      (total, rowKey) => total + (analysis.motifRowTotals[rowKey] ?? 0),
      0
    ),
    [analysis.motifRowTotals, displayedRowKeys]
  );
  const motifPositionMap = useMemo(() => {
    const map = new Map<string, Set<number>>();
    displayedMotifMatches.forEach((match) => {
      const positions = map.get(match.rowKey) ?? new Set<number>();
      match.positions.forEach((position) => positions.add(position));
      map.set(match.rowKey, positions);
    });
    return map;
  }, [displayedMotifMatches]);

  useEffect(() => {
    if (!displayedMotifMatches.length && state.activeMotifIndex !== 0) {
      dispatch({ type: "patch", patch: { activeMotifIndex: 0 } });
    } else if (state.activeMotifIndex >= displayedMotifMatches.length && displayedMotifMatches.length) {
      dispatch({ type: "patch", patch: { activeMotifIndex: displayedMotifMatches.length - 1 } });
    }
  }, [dispatch, displayedMotifMatches.length, state.activeMotifIndex]);

  const selectedSequence = state.selection
    ? rowByKey.get(state.selection.rowKey) ?? null
    : null;
  const selectedBase = state.selection
    ? selectedSequence?.sequence[state.selection.position - 1] ??
      (state.selection.rowKey === CONSENSUS_ROW_KEY
        ? consensus[state.selection.position - 1] ?? ""
        : analysis.getColumnStats(state.selection.position)?.dominantBase ?? "")
    : "";
  const selectedColumnStats = canAnalyze && state.selection
    ? analysis.getColumnStats(state.selection.position)
    : null;
  const selectedReferencePosition = state.selection && referenceMap
    ? referenceMap.alignmentToReferenceLabel[state.selection.position - 1] ?? null
    : null;
  const columnSummary = useMemo(() => {
    if (!state.selection || !canAnalyze) return "";
    const counts = new Map<string, number>();
    scopeSequences.forEach((sequence) => {
      const base = sequence.sequence[state.selection!.position - 1];
      if (base === undefined) return;
      const label = base || "-";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([base, count]) => `${base}:${count}`)
      .join("  ");
  }, [canAnalyze, scopeSequences, state.selection]);
  const rangeAnalysis = useMsaRangeStats({
    sourceFingerprint,
    scopeRowKeys: analysis.scopeRowKeys,
    sequences: scopeSequences,
    range: state.selectedRange,
    consensusMode: state.consensusMode,
    reference,
    alphabet: descriptor.alphabet,
    enabled: canAnalyze && scopeSequences.length > 0
  });
  const rangeStats = rangeAnalysis.rangeStats;

  useLayoutEffect(() => {
    const anchorPosition = pendingZoomAnchorRef.current;
    if (anchorPosition === null) return;
    pendingZoomAnchorRef.current = null;
    scrollToAlignmentPosition(anchorPosition);
  }, [viewSettings.cellGap, viewSettings.cellWidth, visiblePositions]);

  useLayoutEffect(() => {
    if (
      restoredViewportSourceRef.current === sourceFingerprint ||
      !state.viewport ||
      !scrollRef.current
    ) return;
    restoredViewportSourceRef.current = sourceFingerprint;
    scrollRef.current.scrollLeft = state.viewport.scrollLeft;
    scrollRef.current.scrollTop = state.viewport.scrollTop;
  }, [sourceFingerprint, state.viewport, displayedSequences.length, visiblePositions.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let timeout = 0;
    const updateViewport = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => dispatch({
        type: "patch",
        patch: {
          viewport: {
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight
          }
        }
      }), 120);
    };
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateViewport);
    resizeObserver?.observe(element);
    element.addEventListener("scroll", updateViewport, { passive: true });
    updateViewport();
    return () => {
      window.clearTimeout(timeout);
      resizeObserver?.disconnect();
      element.removeEventListener("scroll", updateViewport);
    };
  }, [dispatch, displayedSequences.length, visiblePositions.length]);

  function patchState(patch: Partial<ViewerState>) {
    dispatch({ type: "patch", patch });
  }

  function scrollToAlignmentPosition(position: number, rowKey?: string) {
    const element = scrollRef.current;
    if (!element || !visiblePositions.length) return;
    const exactIndex = visibleIndexOfPosition(visiblePositions, position);
    const columnIndex = exactIndex >= 0
      ? exactIndex
      : lowerBoundVisibleIndex(visiblePositions, position);
    const pitch = viewSettings.cellWidth + viewSettings.cellGap;
    element.scrollLeft = Math.max(
      0,
      viewSettings.labelWidth + 24 + columnIndex * pitch - element.clientWidth / 2
    );
    if (rowKey) {
      const rowIndex = displayedRowIndex.get(rowKey) ?? -1;
      if (rowIndex >= 0) {
        const headerHeight = (1 + activeTracks.length) * viewSettings.rowHeight;
        element.scrollTop = Math.max(
          0,
          headerHeight + rowIndex * viewSettings.rowHeight - element.clientHeight / 2
        );
      }
    }
  }

  function handleSelect(next: CellSelection, extendRange = false) {
    const anchor = extendRange
      ? state.selectedRange?.start ?? state.selection?.position ?? next.position
      : next.position;
    dispatch({
      type: "select",
      openInspector: state.inspectorOpen,
      selection: next,
      range: { start: Math.min(anchor, next.position), end: Math.max(anchor, next.position) }
    });
  }

  function handleRangeSelect(rowKey: string, start: number, end: number) {
    dispatch({
      type: "select",
      openInspector: state.inspectorOpen,
      selection: { rowKey, position: end },
      range: { start, end }
    });
  }

  function moveSelection(deltaRow: number, deltaColumn: number, extendRange: boolean) {
    if (!visiblePositions.length || !displayedSequences.length) return;
    const currentPosition = state.selection?.position ?? positionAt(visiblePositions, 0) ?? 1;
    const exactIndex = visibleIndexOfPosition(visiblePositions, currentPosition);
    const currentColumnIndex = exactIndex >= 0
      ? exactIndex
      : lowerBoundVisibleIndex(visiblePositions, currentPosition);
    const selectedRowIndex = state.selection
      ? navigationRowIndex.get(state.selection.rowKey) ?? -1
      : -1;
    const currentRowIndex = selectedRowIndex >= 0 ? selectedRowIndex : activeTracks.length;
    const nextColumnIndex = Math.min(
      visiblePositions.length - 1,
      Math.max(0, currentColumnIndex + deltaColumn)
    );
    const nextRowIndex = Math.min(
      navigationRowKeys.length - 1,
      Math.max(0, currentRowIndex + deltaRow)
    );
    const next = {
      rowKey: navigationRowKeys[nextRowIndex],
      position: positionAt(visiblePositions, nextColumnIndex) ?? currentPosition
    };
    handleSelect(next, extendRange);
    scrollToAlignmentPosition(next.position, next.rowKey);
  }

  function selectMotif(index: number) {
    const match = displayedMotifMatches[index];
    if (!match) return;
    let start = Number.POSITIVE_INFINITY;
    let end = 0;
    match.positions.forEach((position) => {
      start = Math.min(start, position);
      end = Math.max(end, position);
    });
    dispatch({
      type: "patch",
      patch: {
        activeMotifIndex: index,
        inspectorOpen: state.inspectorOpen,
        selection: { rowKey: match.rowKey, position: match.start },
        selectedRange: { start: Number.isFinite(start) ? start : match.start, end: end || match.start }
      }
    });
    scrollToAlignmentPosition(match.start, match.rowKey);
  }

  function navigateMotif(delta: number) {
    if (!displayedMotifMatches.length) return;
    selectMotif(
      (state.activeMotifIndex + delta + displayedMotifMatches.length) % displayedMotifMatches.length
    );
  }

  function changeZoom(nextZoom: number) {
    const element = scrollRef.current;
    let anchorPosition = state.selection?.position ?? null;
    if (anchorPosition === null && element && visiblePositions.length) {
      const pitch = viewSettings.cellWidth + viewSettings.cellGap;
      const centerIndex = Math.max(
        0,
        Math.min(
          visiblePositions.length - 1,
          Math.round((element.scrollLeft + element.clientWidth / 2 - viewSettings.labelWidth - 24) / pitch)
        )
      );
      anchorPosition = positionAt(visiblePositions, centerIndex) ?? null;
    }
    pendingZoomAnchorRef.current = anchorPosition;
    patchState({ zoomLevel: clampZoom(nextZoom) });
  }

  function jumpToPosition() {
    const parsed = Number.parseInt(jumpPosition, 10);
    if (Number.isNaN(parsed)) return;
    let alignmentPosition = Math.max(1, Math.min(alignmentLength, parsed));
    if (state.coordinateMode === "reference" && referenceMap) {
      const referencePosition = Math.max(1, Math.min(referenceMap.referenceLength, parsed));
      alignmentPosition = referenceMap.referenceToAlignment[referencePosition - 1] ?? alignmentPosition;
      setJumpPosition(String(referencePosition));
    } else {
      setJumpPosition(String(alignmentPosition));
    }
    scrollToAlignmentPosition(alignmentPosition);
    const rowKey = state.referenceRowKey ?? displayedRowKeys[0];
    if (rowKey) handleSelect({ rowKey, position: alignmentPosition });
  }

  function setReference(rowKey: string) {
    if (!canAnalyze) return;
    const nextReferenceRowKey = state.referenceRowKey === rowKey ? null : rowKey;
    patchState({
      coordinateMode: nextReferenceRowKey ? state.coordinateMode : "alignment",
      differenceMode: nextReferenceRowKey ? state.differenceMode : false,
      referenceRowKey: nextReferenceRowKey
    });
  }

  function exportVisibleFasta() {
    if (displayedSequences.length && visiblePositions.length) {
      downloadText(
        "easymsa-filtered-view.fasta",
        fastaForPositions(displayedSequences, materializePositionArray(visiblePositions))
      );
    }
  }

  function exportRangeFasta() {
    if (!state.selectedRange || !displayedSequences.length) return;
    const positions = Array.from(
      { length: state.selectedRange.end - state.selectedRange.start + 1 },
      (_, index) => state.selectedRange!.start + index
    );
    downloadText(
      `easymsa-selected-interval-${state.selectedRange.start}-${state.selectedRange.end}.fasta`,
      fastaForPositions(displayedSequences, positions)
    );
  }

  function exportConsensusRange() {
    if (!canAnalyze || !state.selectedRange || !rangeStats) return;
    downloadText(
      `easymsa-consensus-${state.selectedRange.start}-${state.selectedRange.end}.fasta`,
      `>${alignment.jobId || "easymsa"}:consensus:${state.selectedRange.start}-${state.selectedRange.end}\n${rangeStats.consensusSegment}\n`
    );
  }

  function exportSelectedRows() {
    const rows = displayedRecords
      .filter((row) => state.selectedRowKeys.has(row.rowKey))
      .map((row) => row.sequence);
    if (rows.length) {
      downloadText(
        "easymsa-selected-rows.fasta",
        fastaForPositions(rows, materializePositionArray(visiblePositions))
      );
    }
  }

  function getExportViewerState() {
    const viewport = scrollRef.current
      ? {
          scrollLeft: scrollRef.current.scrollLeft,
          scrollTop: scrollRef.current.scrollTop,
          clientWidth: scrollRef.current.clientWidth,
          clientHeight: scrollRef.current.clientHeight
        }
      : null;
    const exportAnnotations: MsaExportAnnotation[] = state.annotations.map((annotation) => ({
      id: annotation.id,
      category: annotation.category,
      label: annotation.category,
      rowKey: annotation.target.rowKey,
      sequenceId: annotation.target.rowKey
        ? rowByKey.get(annotation.target.rowKey)?.id ?? null
        : null,
      start: annotation.target.start,
      end: annotation.target.end,
      note: annotation.text
    }));
    return {
      sequences: displayedSequences,
      visiblePositions: materializePositionArray(visiblePositions),
      columnStore: analysis.columnStore,
      colorScheme: renderColorScheme,
      selectedRange: state.selectedRange,
      viewSettings,
      viewport,
      alignmentLength,
      activeTracks,
      consensusMode: state.consensusMode,
      consensusSequence:
        state.consensusMode === "iupac"
          ? analysis.consensus.iupac
          : analysis.consensus.majority,
      coordinateMode: state.coordinateMode,
      differenceMode: state.differenceMode,
      referenceRowKey: state.referenceRowKey,
      analysisScope: state.analysisScope,
      analysisRowKeys: analysis.scopeRowKeys,
      viewerContext: context ? serializableViewerContext(context) : undefined,
      thresholds: state.qcThresholds,
      frontendVersion: import.meta.env.VITE_APP_VERSION ?? null,
      buildSha: import.meta.env.VITE_GIT_SHA ?? null,
      annotations: exportAnnotations
    };
  }

  const imageExport = useMsaExport(viewerAlignment, getExportViewerState, canAnalyze);

  function exportWorkspaceFile() {
    downloadText(
      `easymsa-workspace-${sourceFingerprint.replace(/[^a-z0-9_-]+/gi, "-").slice(-32)}.easymsa-view.json`,
      exportWorkspace(),
      "application/json;charset=utf-8"
    );
  }

  async function importWorkspaceFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 3_000_000) {
      setWorkspaceMessage(locale === "zh" ? "工作区文件超过 3 MB 上限。" : "The workspace file exceeds the 3 MB limit.");
      return;
    }
    try {
      const result = importWorkspace(await file.text());
      setWorkspaceMessage(result.ok
        ? locale === "zh" ? "工作区状态已恢复。" : "Workspace state restored."
        : result.message);
    } catch {
      setWorkspaceMessage(locale === "zh" ? "无法读取工作区文件。" : "The workspace file could not be read.");
    }
  }

  const neutralReason = !canAnalyze && !alignment.truncated
    ? descriptor.alignmentMode === "rawUnequal"
      ? d.results.viewer.scienceV2.neutralReasons.rawUnequal
      : descriptor.warnings.includes("invalid_alignment_symbol")
        ? d.results.viewer.scienceV2.neutralReasons.invalidSymbols
      : descriptor.alphabet === "protein"
        ? d.results.viewer.scienceV2.neutralReasons.protein
        : descriptor.alphabet === "unknown"
          ? d.results.viewer.scienceV2.neutralReasons.unknown
          : d.results.viewer.scienceV2.neutralDescription
    : null;
  const motifValidationError = analysis.motifErrorCode === "MOTIF_INVALID"
    ? d.results.viewer.stageTwo.motifErrors.invalid.replace(
        "{characters}",
        analysis.motifInvalidCharacters.join(", ") || "—"
      )
    : analysis.motifErrorCode
      ? d.results.viewer.stageTwo.motifErrors.failed
      : null;
  const activeAnnotationTarget = useMemo<QcAnnotation["target"] | null>(() => {
    if (!state.selection && !state.selectedRange) return null;
    const rowKey = state.selection && rowByKey.has(state.selection.rowKey)
      ? state.selection.rowKey
      : null;
    return {
      rowKey,
      start: state.selectedRange?.start ?? state.selection?.position ?? null,
      end: state.selectedRange?.end ?? state.selection?.position ?? null
    };
  }, [rowByKey, state.selectedRange, state.selection]);

  function jumpToAnnotation(annotation: QcAnnotation) {
    const rowKey = annotation.target.rowKey ?? displayedRowKeys[0];
    const position = annotation.target.start ?? 1;
    if (!rowKey) return;
    const end = annotation.target.end ?? position;
    dispatch({
      type: "select",
      selection: { rowKey, position },
      range: { start: position, end }
    });
    scrollToAlignmentPosition(position, rowKey);
  }

  const qcLabels = locale === "zh" ? {
    title: "序列 QC",
    reviewOnly: "自动结果仅作为 QC 候选供复核；不会自动删除或改变源比对。",
    scope: "分析范围",
    rows: "序列",
    columns: "列",
    candidates: "QC 候选",
    search: "搜索序列名称",
    sort: "排序",
    ascending: "升序",
    descending: "降序",
    name: "名称",
    length: "非 gap 长度",
    gap: "缺口",
    ambiguity: "模糊碱基",
    gc: "GC",
    identity: "参考一致性",
    differences: "差异",
    review: "复核"
  } : undefined;
  const annotationLabels = locale === "zh" ? {
    title: "QC 人工标记",
    reviewOnly: "“排除候选”只是复核标记，不会改变分析范围或源比对。",
    category: "类别",
    sequenceRow: "序列行",
    all: "全部",
    allRows: "全部序列",
    containsPosition: "包含比对位置",
    previous: "上一条",
    next: "下一条",
    noMatches: "没有匹配标记",
    newAnnotation: "新建标记",
    selectTarget: "请先选择序列、列或区间",
    optionalNote: "可选备注",
    add: "添加",
    delete: "删除",
    updated: "更新于",
    note: "备注",
    review: "复核",
    excludeCandidate: "排除候选"
  } : undefined;
  const inspector = (
    <MsaInspector
      alignmentPosition={state.selection?.position ?? null}
      analysisScope={state.analysisScope}
      base={selectedBase}
      columnStats={selectedColumnStats}
      columnSummary={columnSummary}
      docked
      mobileOpen={false}
      onClose={() => patchState({ inspectorOpen: false })}
      range={state.selectedRange}
      rangeError={rangeAnalysis.error ? d.results.viewer.stageTwo.rangeStatsFailed : null}
      rangeStats={rangeStats}
      reference={canAnalyze ? reference : null}
      referencePosition={selectedReferencePosition}
      scopeRowCount={analysis.scopeRowCount}
      selection={state.selection}
      selectionLabel={state.selection ? rowLabels.get(state.selection.rowKey) : undefined}
      showReferenceContext={canAnalyze}
    />
  );
  const qcWorkspace = (
    <div className="grid gap-4 p-3">
      <MsaQcPanel
        analysisScope={state.analysisScope}
        filteredColumnCount={visiblePositions.length}
        filters={qcFilters}
        labels={qcLabels}
        onFiltersChange={setQcFilters}
        onReviewRow={(rowKey) => {
          const position = state.selection?.position ?? positionAt(visiblePositions, 0) ?? 1;
          handleSelect({ rowKey, position });
          patchState({ inspectorOpen: false, qcPanelOpen: true });
        }}
        onSortChange={(key, direction) => {
          patchState({ qcSortMode: key });
          setQcSortDirection(direction);
        }}
        onColumnThresholdsChange={(column) => patchState({
          columnFilter: "custom",
          qcThresholds: { ...state.qcThresholds, column }
        })}
        onThresholdsChange={(qcThresholds) => patchState({ qcThresholds })}
        rows={analysis.rowQc}
        scopeRowCount={analysis.scopeRowCount}
        sortDirection={qcSortDirection}
        sortKey={state.qcSortMode as RowQcSortKey}
        thresholds={state.qcThresholds}
        totalColumnCount={alignmentLength}
        totalRowCount={alignment.sequences.length}
      />
      <MsaAnnotationPanel
        activeTarget={activeAnnotationTarget}
        annotations={state.annotations}
        labels={annotationLabels}
        onCreate={(category, text, target) => dispatch({
          type: "addAnnotation",
          annotation: createQcAnnotation({ category, text, target })
        })}
        onDelete={(id) => dispatch({ type: "removeAnnotation", id })}
        onJump={jumpToAnnotation}
        onUpdate={(id, patch) => dispatch({ type: "updateAnnotation", id, patch })}
        rowLabels={rowLabels}
      />
    </div>
  );

  const rangeText = selectedRangeLabel(state.selectedRange);
  const canExport = displayedSequences.length > 0 && visiblePositions.length > 0;
  const qcPanelOpen = canAnalyze && state.qcPanelOpen;
  const immersive = presentation === "immersive" || state.immersive;
  const panelOpen = state.settingsOpen || qcPanelOpen || state.inspectorOpen;
  const dockOpen = !mobile && panelOpen;
  const closePanel = () => {
    const label = state.settingsOpen ? d.results.viewer.stageTwo.settings : d.results.viewer.stageTwo.inspector;
    patchState({ settingsOpen: false, inspectorOpen: false, qcPanelOpen: false });
    window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLButtonElement>("[data-msa-command-bar] button").forEach(button => {
        if (button.getAttribute("aria-label") === label) button.focus();
      });
    });
  };
  const exitWorkspace = () => onReturn ? onReturn() : patchState({ immersive: false });
  const sourceBar = <MsaWorkspaceHeader title={sourceName ?? descriptor.sourceName ?? alignment.jobId ?? "MSA"}
    sequences={alignment.sequenceCount ?? alignment.sequences.length} columns={alignmentLength}
    immersive={immersive} onReturn={onReturn} onToggle={() => patchState({ immersive: !state.immersive })}
    onReplace={onReplaceInput} extra={headerActions} example={example} />;
  const controls: MsaViewerToolbarProps = {
    actualScopeRowCount: analysis.scopeRowCount,
    alignmentLength: alignmentLength,
    analysisDisabled: !canAnalyze,
    canExport: canExport,
    canExportSelectedRows: state.selectedRowKeys.size > 0 && visiblePositions.length > 0,
    canUndoHide: state.lastHiddenRowKeys.length > 0,
    hiddenCount: state.hiddenRowKeys.size,
    isSearchingMotif: analysis.isSearchingMotif,
    jumpPosition: jumpPosition,
    motifMatchCount: motifMatchCount,
    motifMatches: displayedMotifMatches,
    motifMatchesTruncated: analysis.motifMatchesTruncated,
    motifValidationError: motifValidationError,
    neutralReason: neutralReason,
    onClearReference: () => setReference(state.referenceRowKey ?? ""),
    onExportConsensusRange: exportConsensusRange,
    onExportImage: imageExport.openDialog,
    onExportSelectedRange: exportRangeFasta,
    onExportSelectedRows: exportSelectedRows,
    onExportVisible: exportVisibleFasta,
    onHideSelected: () => dispatch({ type: "batchRows", operation: "hide", rowKeys: state.selectedRowKeys }),
    onJump: jumpToPosition,
    onJumpPositionChange: setJumpPosition,
    onMotifNavigate: navigateMotif,
    onMotifSelect: selectMotif,
    onOpenInspector: () => patchState({ inspectorOpen: true, qcPanelOpen: false }),
    onOpenQc: () => patchState({ qcPanelOpen: !state.qcPanelOpen, inspectorOpen: false }),
    onPatch: patchState,
    onPinSelected: () => dispatch({ type: "batchRows", operation: "pin", rowKeys: state.selectedRowKeys }),
    onResetView: () => dispatch({ type: "resetView" }),
    onSelectAllVisible: () => dispatch({ type: "selectAllVisible", rowKeys: displayedRowKeys }),
    onShowAll: () => dispatch({ type: "showAllRows" }),
    onToggleTrack: (track) => dispatch({ type: "toggleTrack", track }),
    onToggleWorkspace: () => patchState({ immersive: !state.immersive }),
    onUndoHide: () => dispatch({ type: "undoLastHide" }),
    onUnpinSelected: () => dispatch({ type: "batchRows", operation: "unpin", rowKeys: state.selectedRowKeys }),
    onZoom: changeZoom,
    referenceLabel: state.referenceRowKey ? rowLabels.get(state.referenceRowKey) : null,
    selectedRowCount: state.selectedRowKeys.size,
    state: state,
    totalSequenceCount: alignment.sequences.length,
    visibleColumnCount: visiblePositions.length,
    visibleSequenceCount: displayedSequences.length,
    fullResultHref: context?.downloads?.fullResultHref,
  };
  const workspaceActions = <div className="msa-view-settings">
    <details className="msa-view-group"><summary>{locale === "zh" ? "分析范围与工作区" : "Analysis scope and workspace"}</summary><div>
      {canAnalyze && <label className="block text-sm">{d.results.viewer.stageTwo.analysisScope}
        <select className="h-11 w-full rounded border px-2" aria-label={d.results.viewer.stageTwo.analysisScope} value={state.analysisScope}
          onChange={e => patchState({ analysisScope: e.target.value as ViewerState["analysisScope"] })}>
          {(["all", "visible", "selected"] as const).map(scope => <option key={scope} value={scope}
            disabled={scope === "selected" && !state.selectedRowKeys.size}>{d.results.viewer.stageTwo.analysisScopes[scope]}</option>)}
        </select>
      </label>}
      <button type="button" className="min-h-11 text-left text-teal-800" onClick={exportWorkspaceFile}>{locale === "zh" ? "导出工作区状态" : "Export workspace state"}</button>
      <button type="button" className="min-h-11 text-left text-teal-800" onClick={() => workspaceFileRef.current?.click()}>{locale === "zh" ? "导入状态" : "Import state"}</button>
      <button type="button" className="min-h-11 text-left text-teal-800" onClick={() => dispatch({ type: "resetView" })}>{d.results.viewer.stageTwo.resetView}</button>
    </div></details>
    {canAnalyze && <details className="msa-view-group"><summary>{d.results.viewer.legend}</summary><div>
      {state.differenceMode && reference ? <DifferenceLegend /> : <MSAColorLegend scheme={state.colorScheme}/>}
    </div></details>}
  </div>;
  const dockContent = <div id="msa-shared-panel">
    {state.settingsOpen ? <>
      <h2 className="px-3 py-2 font-semibold">{locale === "zh" ? "视图" : "View"}</h2>
      <MsaSettingsDock {...controls} isOpen onClose={closePanel} presentation="content" workspaceActions={workspaceActions}/>
    </> : <>
      <div className="msa-panel-tabs" role="tablist" aria-label={locale === "zh" ? "分析工具" : "Analysis tools"}>
        <button role="tab" aria-selected={!qcPanelOpen} aria-controls="msa-analysis-detail" type="button"
          onClick={() => patchState({ inspectorOpen: true, qcPanelOpen: false })}>{locale === "zh" ? "选区详情" : "Selection"}</button>
        <button role="tab" aria-selected={qcPanelOpen} aria-controls="msa-analysis-detail" type="button" disabled={!canAnalyze}
          onClick={() => patchState({ inspectorOpen: false, qcPanelOpen: true })}>{locale === "zh" ? "质量检查" : "Quality checks"}</button>
      </div>
      <div id="msa-analysis-detail" role="tabpanel">{qcPanelOpen ? qcWorkspace : inspector}</div>
    </>}
  </div>;
  const liveStatus = state.selection
    ? `${rowLabels.get(state.selection.rowKey) ?? state.selection.rowKey}; ${d.results.viewer.position} ${state.selection.position}; ${selectedReferencePosition ?? ""}; ${selectedBase || d.results.viewer.emptyCell}; ${canAnalyze ? d.results.viewer.stageTwo.analysisScopes[state.analysisScope] : d.results.viewer.scienceV2.neutralTitle}; ${rangeText}`
    : `${d.results.viewer.noSelection}; ${canAnalyze ? `${d.results.viewer.stageTwo.analysisScopes[state.analysisScope]}; ${analysis.scopeRowCount}` : d.results.viewer.scienceV2.neutralTitle}`;
  const matrix = displayedSequences.length === 0 ? (
    <EmptyState message={d.results.viewer.noMatches} />
  ) : visiblePositions.length === 0 ? (
    <EmptyState message={d.results.viewer.noColumns} />
  ) : (
    <div className="relative h-full min-h-0">
      <MsaDomMatrix
        activeTracks={activeTracks}
        alignmentLength={alignmentLength}
        analysisRowKeys={analysisRowKeySet}
        colorScheme={renderColorScheme}
        consensus={consensus}
        coordinateMode={canAnalyze ? state.coordinateMode : "alignment"}
        differenceMode={canAnalyze && state.differenceMode}
        motifPositionMap={motifPositionMap}
        onHideSequence={(rowKey) => dispatch({ type: "hideRow", rowKey })}
        onNavigate={moveSelection}
        onPinSequence={(rowKey) => dispatch({ type: "toggleRowSet", field: "pinnedRowKeys", rowKey })}
        onRangeSelect={handleRangeSelect}
        onSelect={handleSelect}
        onSelectSequence={(rowKey) => dispatch({ type: "toggleRowSet", field: "selectedRowKeys", rowKey })}
        onSetReference={setReference}
        onZoomGesture={(factor) => changeZoom(state.zoomLevel * factor)}
        pinnedSequenceIds={state.pinnedRowKeys}
        rangeSelectionMode={state.rangeSelectionMode}
        reference={canAnalyze ? reference : null}
        referenceActionsEnabled={canAnalyze}
        scrollRef={scrollRef}
        selectedRange={state.selectedRange}
        selectedSequenceIds={state.selectedRowKeys}
        selection={state.selection}
        sequences={displayedSequences}
        settings={viewSettings}
        showConsensus={canAnalyze}
        stats={analysis.columnStore}
        visiblePositions={visiblePositions}
      />
      {analysis.isCalculating ? (
        <div aria-live="polite" className="pointer-events-none absolute right-3 top-3 z-40 inline-flex items-center rounded-full border border-teal-200 bg-white/95 px-3 py-1.5 text-xs text-teal-800 shadow" role="status">
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          {d.results.viewer.calculating}
        </div>
      ) : null}
    </div>
  );
  const statusBar = (
    <div
      className="msa-status"
      tabIndex={0}
      aria-label={locale === "zh" ? "当前查看与分析状态" : "Current viewer and analysis state"}
      data-msa-analysis-status={analysis.status}
      data-msa-range-mode={state.rangeSelectionMode ? "range" : "pan"}
      data-msa-selected-row-key={state.selection?.rowKey ?? ""}
      data-msa-selected-position={state.selection?.position ?? ""}
      data-msa-selected-range={state.selectedRange ? `${state.selectedRange.start}-${state.selectedRange.end}` : ""}
      data-msa-status="true"
      data-msa-view-mode={state.viewMode}
      data-msa-zoom={state.zoomLevel.toFixed(2)}
    >
      <div className="flex shrink-0 items-center gap-3">
        <span>{state.selection ? `${d.results.viewer.position} ${state.selection.position}` : locale === "zh" ? "未选择" : "No selection"}</span>
        {rangeText && <span>{locale === "zh" ? "选区" : "Range"}: {rangeText}</span>}
        <span>{canAnalyze ? `${d.results.viewer.stageTwo.analysisScopes[state.analysisScope]} · ${analysis.scopeRowCount}` : d.results.viewer.scienceV2.neutralTitle}</span>
        <span>{displayedSequences.length}/{alignment.sequences.length} {locale === "zh" ? "行" : "rows"} · {visiblePositions.length}/{alignmentLength} {locale === "zh" ? "列" : "columns"}</span>
        {(state.search || state.hiddenRowKeys.size > 0 || state.columnFilter !== "all") && <button type="button" className="text-teal-800 underline"
          onClick={() => { dispatch({ type: "showAllRows" }); patchState({search: "", columnFilter: "all"}); }}>{locale === "zh" ? "清除筛选" : "Clear filters"}</button>}
        {state.selectedRowKeys.size > 0 && <span>{state.selectedRowKeys.size} {locale === "zh" ? "行已选" : "rows selected"}</span>}
        {state.motifQuery && <button type="button" title={state.motifQuery} onClick={() => patchState({ motifQuery: "", activeMotifIndex: 0 })}>
          {locale === "zh" ? "清除片段搜索" : "Clear motif search"}
        </button>}
        {state.hiddenRowKeys.size > 0 && <span>{locale === "zh" ? "隐藏" : "Hidden"}: {state.hiddenRowKeys.size}</span>}
        {state.referenceRowKey && <span className="max-w-36 truncate" title={rowLabels.get(state.referenceRowKey)}>{locale === "zh" ? "参考" : "Reference"}: {rowLabels.get(state.referenceRowKey)}</span>}
        {descriptor.warnings.includes("duplicate_headers") && <span title={locale === "zh" ? "同名序列按独立记录处理" : "Rows with duplicate names remain independently addressable"}>{locale === "zh" ? "存在同名序列" : "Duplicate headers detected"}</span>}
        {workspaceMessage && <span role="status">{workspaceMessage}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {state.lastHiddenRowKeys.length > 0 && <button type="button" onClick={() => dispatch({ type:"undoLastHide" })}>{d.results.viewer.stageTwo.undoHide}</button>}
        {state.selection && <button type="button" onClick={() => dispatch({ type:"clearSelection" })}>{d.results.viewer.clearSelection}</button>}
      </div>
      <span aria-live="polite" className="sr-only" role="status">{liveStatus}</span>
    </div>
  );

  if (alignment.truncated) {
    const count = alignment.sequenceCount ?? descriptor.sequenceCount;
    const length = alignmentLength;
    return <MsaWorkspaceShell sourceBar={sourceBar} commandBar={null} matrixLabel={d.results.viewer.matrixNavigation}
      workspaceLabel="MSA" matrix={      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
        <h2 className="font-semibold text-amber-950">
          {locale === "zh" ? "该结果超过浏览器预览上限" : "This result exceeds the browser preview limits"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {alignment.message ?? (locale === "zh"
            ? `结果包含 ${count.toLocaleString()} 条序列、${length.toLocaleString()} 列；当前上限保持为 1 MB、500 条序列和 10,000 列。`
            : `The result contains ${count.toLocaleString()} rows and ${length.toLocaleString()} columns. Current limits remain 1 MB, 500 rows, and 10,000 columns.`)}
        </p>
        {context?.downloads?.fullResultHref ? (
          <a className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-900 px-4 text-sm font-semibold text-white" href={context.downloads.fullResultHref}>
            <Download className="h-4 w-4" />
            {locale === "zh" ? "下载完整结果" : "Download full result"}
          </a>
        ) : null}
      </section>}
      {...(immersive ? {mode: "immersive" as const, exitImmersiveLabel: d.results.viewer.stageTwo.exitWorkspace, onExitImmersive: exitWorkspace} : {mode: "embedded" as const})}/>;
  }

  return (
    <>
      <MsaWorkspaceShell
        sourceBar={sourceBar}
        onCloseTransient={() => { if (panelOpen) { closePanel(); return true; } return false; }}
        commandBar={(
<MsaViewerToolbar {...controls} />
        )}
        dock={dockContent}
        dockCloseLabel={locale === "zh" ? "关闭面板" : "Close panel"}
        dockLabel={state.settingsOpen ? d.results.viewer.stageTwo.settings : d.results.viewer.stageTwo.inspector}
        dockOpen={dockOpen}
        dockResizeLabel={d.results.viewer.stageTwo.resizeDock}
        dockWidth={state.inspectorWidth}
        matrix={matrix}
        matrixLabel={d.results.viewer.matrixNavigation}
        navigator={state.minimapCollapsed ? undefined : (
          <MsaOverviewNavigator
            alignmentLength={alignmentLength}
            cellPitch={viewSettings.cellWidth + viewSettings.cellGap}
            labelOffset={viewSettings.labelWidth + 24}
            overviewBins={analysis.overviewBins}
            positionView={visiblePositions}
            scrollRef={scrollRef}
          />
        )}
        onDockClose={closePanel}
        onDockWidthChange={(inspectorWidth) => patchState({ inspectorWidth })}
        statusBar={statusBar}
        workspaceLabel={canAnalyze
          ? (locale === "zh" ? "MSA 科研 QC 工作区" : "MSA scientific QC workspace")
          : (locale === "zh" ? "MSA 中性矩阵浏览工作区" : "MSA neutral matrix browser")}
        {...(immersive
          ? {
              mode: "immersive" as const,
              exitImmersiveLabel: d.results.viewer.stageTwo.exitWorkspace,
              onExitImmersive: exitWorkspace
            }
          : { mode: "embedded" as const })}
      />

      <input accept=".easymsa-view.json,application/json" aria-label={locale === "zh" ? "导入工作区状态文件" : "Import workspace state file"}
        className="hidden" onChange={importWorkspaceFile} ref={workspaceFileRef} type="file"/>
      <OverlayDialog closeLabel={locale === "zh" ? "关闭面板" : "Close panel"} isOpen={mobile && panelOpen} onClose={closePanel}
        title={state.settingsOpen ? (locale === "zh" ? "视图" : "View") : (locale === "zh" ? "分析" : "Analyze")} variant="bottom-sheet">
        {dockContent}
      </OverlayDialog>

      {analysis.status === "error" ? (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {analysis.errorCode === "RAW_UNEQUAL_ALIGNMENT"
            ? d.results.viewer.scienceV2.neutralReasons.rawUnequal
            : analysis.errorCode === "ANALYSIS_DISABLED_NEUTRAL"
              ? d.results.viewer.scienceV2.neutralDescription
              : d.results.viewer.stageTwo.analysisFailed}
        </div>
      ) : null}

      <ExportDialog
        error={imageExport.error}
        hasSelection={imageExport.hasSelection}
        isExporting={imageExport.isExporting}
        isOpen={imageExport.isOpen}
        layout={imageExport.layout}
        preflight={imageExport.preflight}
        onCancelExport={imageExport.cancelExport}
        onClose={imageExport.closeDialog}
        onExport={imageExport.runExport}
        onUpdate={imageExport.updateOptions}
        options={imageExport.options}
        progress={imageExport.progress}
        scientificLayersEnabled={canAnalyze}
      />
    </>
  );
}
