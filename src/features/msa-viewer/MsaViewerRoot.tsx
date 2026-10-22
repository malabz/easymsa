import { viewerText } from "../../lib/i18n/viewerWorkflow";
import { matchesSequenceName, parseViewerPosition, type SequenceExportSnapshot, type ExportRows, type ExportColumns } from "./viewerWorkflowModel";
import { SequenceExportDialog } from "./SequenceExportDialog";
import { MsaComparisonPanel } from "./MsaComparisonPanel";
import { MsaColumnFilterPanel } from "./MsaColumnFilterPanel";
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
import { MSAColorLegend, legendItems } from "../../components/results/MSAColorLegend";
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
  materializePositionArray,
  lowerBoundVisibleIndex,
  positionAt,
  visibleIndexOfPosition
} from "./columnStatsStore";
import { MsaAnnotationPanel } from "./MsaAnnotationPanel";
import { MsaDomMatrix } from "./MsaDomMatrix";
import { MsaInspector } from "./MsaInspector";
import { MsaGlobalOverview } from "./MsaGlobalOverview";
import { MsaHorizontalOverview } from "./MsaHorizontalOverview";
import { frozenHeight } from "./viewerGeometry";
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
  const rowPadding = compact ? 0 : 8;
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
    fontSize: Math.max(9, Math.round((compact ? 12 : 11) * zoomLevel)),
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
    cellGap: showCharacters && !compact ? 2 : 0
  };
}

function useMobileLayout() {
  const [mobile, setMobile] = useState(()=>typeof window!=="undefined" && window.innerWidth<1024);
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

function selectedRangeLabel(range: ColumnRange | null) {
  if (!range) return "";
  return range.start === range.end ? String(range.start) : `${range.start}-${range.end}`;
}

function DifferenceLegend({compact=false}: {compact?:boolean} = {}) {
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
  if(compact) return <span className="msa-inline-legend">{items.map(([label,className])=><span key={label}><i className={className}/>{label}</span>)}</span>;
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
  const w = d.viewerWorkflow;
  const [coarsePointer, setCoarsePointer] = useState(false);
  useEffect(() => { if (!window.matchMedia) return; const query = window.matchMedia("(pointer: coarse)"); const update=()=>setCoarsePointer(query.matches); update(); query.addEventListener?.("change",update); return()=>query.removeEventListener?.("change",update); }, []);
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
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [hiddenJump, setHiddenJump] = useState<number | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [nameQuery, setNameQuery] = useState(state.search);
  const [nameFilterEnabled, setNameFilterEnabled] = useState(Boolean(state.search));
  const [sequenceExport, setSequenceExport] = useState<SequenceExportSnapshot | null>(null);
  const [displayUndo, setDisplayUndo] = useState<{ hiddenRowKeys: Set<string>; search: string } | null>(null);
  const pendingLocate = useRef<{ rowKey: string; position?: number; range?: ColumnRange } | null>(null);
  const annotationRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (state.search) { setNameQuery(state.search); setNameFilterEnabled(true); } else setNameFilterEnabled(false); }, [state.search]);
  useEffect(() => { setSequenceExport(null); setComparisonOpen(false); setJumpError(null); setHiddenJump(null); setDisplayUndo(null); setNameQuery(state.search); }, [sourceFingerprint, workspaceScope]);
  useEffect(() => { if (state.analysisScope === "selected" && state.selectedRowKeys.size === 0) { dispatch({ type: "patch", patch: { analysisScope: "all" } }); setWorkspaceMessage(w.scopeReset); } }, [state.analysisScope, state.selectedRowKeys.size, dispatch, w.scopeReset]);
  const viewportAnchorRef = useRef<{rowKey?:string;position?:number}>({});
  const layoutSourceRef = useRef<string|null>(null);
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
    () => {
      const labels = new Map(rowRecords.map(({ rowKey, sequence, sourceIndex }) => [
      rowKey,
      (headerCounts.get(sequence.id) ?? 0) > 1
        ? `${sequence.id} (#${sourceIndex + 1})`
        : sequence.id
      ]));
      labels.set(CONSENSUS_ROW_KEY, locale === "zh" ? "共识" : "Consensus");
      for (const [track, label] of Object.entries(d.results.viewer.stageTwo.tracks)) {
        labels.set(`track:${track}`, label);
      }
      return labels;
    },
    [headerCounts, rowRecords, d, locale]
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
      return !deferredSearch || matchesSequenceName(sequence, deferredSearch);
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
  const deferredNameQuery = useDeferredValue(nameQuery);
  const nameResults = useMemo(() => deferredNameQuery.trim() ? rowRecords.filter(row => matchesSequenceName(row.sequence, deferredNameQuery)).map(row => ({ key: row.rowKey, label: rowLabels.get(row.rowKey) ?? row.sequence.id, visible: displayedRowKeySet.has(row.rowKey) })) : [], [deferredNameQuery, rowRecords, rowLabels, displayedRowKeySet]);
  const extraReference = Boolean(reference && (state.hiddenRowKeys.has(state.referenceRowKey!) || !matchesSequenceName(reference, state.search)));
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
    const settings = {
      ...getMsaViewSettings(
        state.zoomLevel,
        state.density,
        state.viewMode,
        mobile ? Math.min(120, state.labelWidth) : state.labelWidth
      ),
      conservationScale: state.conservationScale ?? "high"
    };
    return mobile && coarsePointer && settings.showCharacters
      ? {
          ...settings,
          cellWidth: Math.max(44, settings.cellWidth),
          cellHeight: Math.max(44, settings.cellHeight),
          rowHeight: Math.max(48, settings.rowHeight)
        }
      : settings;
  }, [mobile, coarsePointer, state.conservationScale, state.density, state.labelWidth, state.viewMode, state.zoomLevel]);
  const activeTracks = canAnalyze ? state.activeTracks : [];
  const navigationRowKeys = useMemo(
    () => [
      ...activeTracks.map((track) => `track:${track}`),
      ...(canAnalyze && state.showConsensus ? [CONSENSUS_ROW_KEY] : []),
      ...displayedRowKeys
    ],
    [activeTracks, canAnalyze, displayedRowKeys,state.showConsensus]
  );
  const navigationRowIndex = useMemo(
    () => new Map(navigationRowKeys.map((rowKey, index) => [rowKey, index])),
    [navigationRowKeys]
  );
  const referenceMap = useMemo(
    () => canAnalyze && reference ? buildReferenceCoordinateMap(reference.sequence) : null,
    [canAnalyze, reference]
  );
  const displayedMotifMatches = analysis.motifMatches;
  const motifMatchCount = analysis.motifMatchCount;
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

  useLayoutEffect(()=>{
    const el=scrollRef.current;const anchor=viewportAnchorRef.current;
    if(el && layoutSourceRef.current===sourceFingerprint) {
      const row=displayedSequences.findIndex((item,index)=>rowKeyForSequence(item,index)===anchor.rowKey);
      if(row>=0)el.scrollTop=row*viewSettings.rowHeight;
      const col=anchor.position ? lowerBoundVisibleIndex(visiblePositions,anchor.position) : -1;
      if(col>=0)el.scrollLeft=col*(viewSettings.cellWidth+viewSettings.cellGap);
    }
    layoutSourceRef.current=sourceFingerprint;
  },[displayedSequences,visiblePositions,state.density,sourceFingerprint]);

  useLayoutEffect(() => {
    if (
      restoredViewportSourceRef.current === sourceFingerprint ||
      !state.viewport ||
      !scrollRef.current
    ) return;
    restoredViewportSourceRef.current = sourceFingerprint;
    const column = state.viewport.position ? visibleIndexOfPosition(visiblePositions,state.viewport.position) : -1;
    const row = state.viewport.rowKey ? displayedSequences.findIndex((item,index)=>rowKeyForSequence(item,index)===state.viewport!.rowKey) : -1;
    scrollRef.current.scrollLeft = column >= 0 ? column*(viewSettings.cellWidth+viewSettings.cellGap) : state.viewport.scrollLeft;
    scrollRef.current.scrollTop = row >= 0 ? row*viewSettings.rowHeight : state.viewport.scrollTop;
  }, [sourceFingerprint, state.viewport, displayedSequences.length, visiblePositions.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    let timeout = 0;
    const updateViewport = () => {
      viewportAnchorRef.current={
        position:positionAt(visiblePositions,Math.floor(element.scrollLeft/(viewSettings.cellWidth+viewSettings.cellGap))),
        rowKey:displayedSequences[Math.min(displayedSequences.length-1,Math.floor(element.scrollTop/viewSettings.rowHeight))]?.rowKey
      };
      window.clearTimeout(timeout);
      timeout = window.setTimeout(captureViewport, 120);
    };
    const captureViewport = () => dispatch({
        type: "patch",
        patch: {
          viewport: {
            position: positionAt(visiblePositions,Math.floor(element.scrollLeft/(viewSettings.cellWidth+viewSettings.cellGap))),
            rowKey: displayedSequences[Math.min(displayedSequences.length-1,Math.floor(element.scrollTop/viewSettings.rowHeight))]?.rowKey,
            scrollLeft: element.scrollLeft,
            scrollTop: element.scrollTop,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight
          }
        }
      });
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
  }, [dispatch, displayedSequences, visiblePositions, viewSettings.rowHeight, viewSettings.cellWidth, viewSettings.cellGap]);

  function patchState(patch: Partial<ViewerState>) {
    if (patch.settingsOpen || patch.inspectorOpen || patch.qcPanelOpen) setComparisonOpen(false);
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
        const headerHeight = frozenHeight(activeTracks.length, canAnalyze && state.showLogo, canAnalyze && state.showConsensus, Boolean(analysis.motifColumnHitCounts));
        element.scrollTop = Math.max(
          0,
          headerHeight + rowIndex * viewSettings.rowHeight - element.clientHeight / 2
        );
      }
    }
  }

  useLayoutEffect(() => {
    const pending = pendingLocate.current;
    if (!pending || !displayedRowKeySet.has(pending.rowKey) || !visiblePositions.length) return;
    const position = pending.position ?? positionAt(visiblePositions, 0)!;
    if (visibleIndexOfPosition(visiblePositions, position) < 0) return;
    pendingLocate.current = null;
    const frame = requestAnimationFrame(() => { scrollToAlignmentPosition(position, pending.rowKey); dispatch({ type: "select", selection: { rowKey: pending.rowKey, position }, range: pending.range ?? { start: position, end: position } }); });
    return () => cancelAnimationFrame(frame);
  }, [displayedRecords, visiblePositions, state.hiddenRowKeys, state.search]);
  function locateSequence(rowKey: string, position?: number, range?: ColumnRange) {
    pendingLocate.current = { rowKey, position, range };
    const hiddenRowKeys = new Set(state.hiddenRowKeys); hiddenRowKeys.delete(rowKey);
    const blockedByName = state.search && !matchesSequenceName(rowByKey.get(rowKey)!, state.search);
    if (blockedByName) setNameFilterEnabled(false);
    patchState({ hiddenRowKeys, ...(blockedByName ? { search: "" } : {}) });
    if (!displayedRowKeySet.has(rowKey)) setWorkspaceMessage(w.revealed);
  }
  function showCheckedRows(keys: string[]) {
    if (!keys.length) return;
    setDisplayUndo({ hiddenRowKeys: new Set(state.hiddenRowKeys), search: state.search });
    const retained = new Set(keys);
    setNameFilterEnabled(false);
    patchState({ search: "", hiddenRowKeys: new Set(rowRecords.filter(row => !retained.has(row.rowKey)).map(row => row.rowKey)) });
  }
  function undoDisplay() {
    if (displayUndo) {
      setNameFilterEnabled(Boolean(displayUndo.search));
      if (displayUndo.search) setNameQuery(displayUndo.search);
      patchState(displayUndo);
      setDisplayUndo(null);
    }
  }
  function openComparison() { const next=!comparisonOpen; patchState({ settingsOpen:false, inspectorOpen:false, qcPanelOpen:false }); setComparisonOpen(next); }
  function addSelectionNote() {
    patchState({ inspectorOpen: true, qcPanelOpen: false, settingsOpen: false });
    requestAnimationFrame(() => { if (annotationRef.current) { annotationRef.current.open=true; annotationRef.current.scrollIntoView({ block: "nearest" }); annotationRef.current.querySelector<HTMLElement>("textarea, input, select")?.focus(); } });
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
    const currentRowIndex = selectedRowIndex >= 0 ? selectedRowIndex : activeTracks.length+(canAnalyze&&state.showConsensus?1:0);
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
    const range = { start: Number.isFinite(start) ? start : match.start, end: end || match.start };
    locateSequence(match.rowKey, match.start, range);
    if (visibleIndexOfPosition(visiblePositions, match.start) < 0) {
      patchState({ columnFilter: "all" });
      setWorkspaceMessage(w.revealedColumns);
    }
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
    const maximum = state.coordinateMode === "reference" && referenceMap ? referenceMap.referenceLength : alignmentLength;
    const parsed = parseViewerPosition(jumpPosition, maximum);
    setHiddenJump(null);
    if (parsed === null) { setJumpError(viewerText(w.invalidPosition, { max: maximum })); return; }
    const position = state.coordinateMode === "reference" && referenceMap ? referenceMap.referenceToAlignment[parsed - 1] : parsed;
    if (visibleIndexOfPosition(visiblePositions, position) < 0) { setHiddenJump(position); setJumpError(w.hiddenPosition); return; }
    setJumpError(null); scrollToAlignmentPosition(position);
    const rowKey = state.referenceRowKey ?? displayedRowKeys[0]; if(rowKey) handleSelect({ rowKey, position });
  }
  function setReference(rowKey: string) {
    if (!canAnalyze) return;
    patchState(rowKey ? { referenceRowKey: rowKey, differenceMode: true } : { referenceRowKey: null, differenceMode: false, coordinateMode: "alignment" });
  }
  function openSequenceExport(initialRows: ExportRows = "displayed", initialColumns: ExportColumns = "filtered", consensusOnly = false) {
    const consensusRow = { id: "consensus", sequence: consensus ?? "" };
    const all = consensusOnly ? [consensusRow] : alignment.sequences;
    setSequenceExport({ all, displayed: consensusOnly ? all : displayedSequences,
      selected: consensusOnly ? all : rowRecords.filter(row => state.selectedRowKeys.has(row.rowKey)).map(row => row.sequence),
      positions: visiblePositions, length: alignmentLength, range: state.selectedRange ? { ...state.selectedRange } : null,
      source: (sourceName ?? descriptor.sourceName ?? "MSA") + (consensusOnly ? " · " + w.consensus + " · " + d.results.viewer.stageTwo.analysisScopes[state.analysisScope] + " · " + analysis.scopeRowCount : ""),
      stage: context?.source.stage ?? workspaceScope?.match(/:(initial|refined|final)$/)?.[1] as SequenceExportSnapshot["stage"], initialRows, initialColumns });
  }
  function exportVisibleFasta() { openSequenceExport(); }
  function exportRangeFasta() { openSequenceExport("displayed", "interval"); }
  function exportSelectedRows() { openSequenceExport("selected", "filtered"); }
  function exportConsensusRange() { openSequenceExport("all", "interval", true); }

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
      frozenHeaderHeight: frozenHeight(activeTracks.length,canAnalyze&&state.showLogo,canAnalyze&&state.showConsensus,Boolean(analysis.motifColumnHitCounts)),
      rna: descriptor.alphabet === "rna",
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
  useEffect(() => { imageExport.closeDialog(); }, [sourceFingerprint, workspaceScope]);

  function exportWorkspaceFile() {
    setWorkspaceMessage(w.viewHint);
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
      setWorkspaceMessage(locale === "zh" ? "查看记录文件超过 3 MB 上限。" : "The view record file exceeds the 3 MB limit.");
      return;
    }
    try {
      const result = importWorkspace(await file.text());
      setWorkspaceMessage(result.ok
        ? locale === "zh" ? "查看记录已恢复。" : "View restored."
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
    if (!state.selection && !state.selectedRange && state.selectedRowKeys.size !== 1) return null;
    const rowKey = state.selection && rowByKey.has(state.selection.rowKey)
      ? state.selection.rowKey
      : state.selectedRowKeys.size === 1 ? [...state.selectedRowKeys][0] : null;
    return {
      rowKey,
      start: state.selectedRange?.start ?? state.selection?.position ?? null,
      end: state.selectedRange?.end ?? state.selection?.position ?? null
    };
  }, [rowByKey, state.selectedRange, state.selection, state.selectedRowKeys]);

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
    title: "质量检查",
    reviewOnly: "标记待检查序列，不修改原始比对。",
    scope: "分析范围",
    rows: "序列",
    columns: "列",
    candidates: "待检查序列",
    search: "搜索序列名称",
    sort: "排序",
    ascending: "升序",
    descending: "降序",
    name: "名称",
    length: "去除缺口后的长度",
    gap: "缺口",
    ambiguity: "模糊碱基",
    gc: "GC",
    identity: "参考一致性",
    differences: "差异",
    review: "复核"
  } : undefined;
  const annotationLabels = locale === "zh" ? {
    title: "人工标记",
    reviewOnly: "此标记不会从分析中移除序列。",
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
  const annotationContent = <details className="msa-view-group msa-panel-content msa-annotation-details" ref={annotationRef}><summary>{w.addNote}</summary>      <MsaAnnotationPanel
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
      /></details>;
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
    <div>
      <MsaQcPanel
        analysisScope={state.analysisScope}
        filteredColumnCount={visiblePositions.length}
        filters={qcFilters}
        labels={qcLabels}
        rowLabels={rowLabels} status={analysis.status} onRetry={analysis.retry}
        onSelectRows={keys => patchState({ selectedRowKeys: new Set(keys) })}
        onShowRows={showCheckedRows} onUndoDisplay={displayUndo ? undoDisplay : undefined}
        onFiltersChange={setQcFilters}
        onReviewRow={locateSequence}
        onSortChange={(key, direction) => {
          patchState({ qcSortMode: key });
          setQcSortDirection(direction);
        }}
        onThresholdsChange={(qcThresholds) => patchState({ qcThresholds })}
        rows={analysis.rowQc}
        scopeRowCount={analysis.scopeRowCount}
        sortDirection={qcSortDirection}
        sortKey={state.qcSortMode as RowQcSortKey}
        thresholds={state.qcThresholds}
        totalColumnCount={alignmentLength}
        totalRowCount={alignment.sequences.length}
      />

    </div>
  );

  const rangeText = selectedRangeLabel(state.selectedRange);
  const canExport = displayedSequences.length > 0 && visiblePositions.length > 0;
  const qcPanelOpen = canAnalyze && state.qcPanelOpen;
  const immersive = presentation === "immersive" || state.immersive;
  const panelOpen = comparisonOpen || state.settingsOpen || qcPanelOpen || state.inspectorOpen;
  const dockOpen = !mobile && panelOpen;
  const closePanel = () => {
    const label = comparisonOpen ? w.compare : state.settingsOpen ? w.display : w.check;
    setComparisonOpen(false);
    patchState({ settingsOpen: false, inspectorOpen: false, qcPanelOpen: false });
    window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLButtonElement>("[data-msa-command-bar] button").forEach(button => {
        if (button.getAttribute("aria-label") === label) button.focus();
      });
    });
  };
  const exitWorkspace = () => onReturn ? onReturn() : patchState({ immersive: false });
  const minimapStore=renderColorScheme==='conservation'?analysis.columnStore:null;
  const minimapReference=canAnalyze&&state.differenceMode?reference:null;
  const minimapScope=minimapReference?analysis.scopeRowKeys:undefined;
  const overviewInput = useMemo(()=>({rows:displayedSequences,positions:visiblePositions,scheme:renderColorScheme,store:minimapStore,reference:minimapReference,differenceMode:Boolean(minimapReference),scopeRowKeys:minimapScope}),[displayedSequences,visiblePositions,renderColorScheme,minimapStore,minimapReference,minimapScope]);
  const sourceBar = <MsaWorkspaceHeader title={sourceName ?? descriptor.sourceName ?? alignment.jobId ?? "MSA"}
    sequences={alignment.sequenceCount ?? alignment.sequences.length} columns={alignmentLength}
    immersive={immersive} onReturn={onReturn} onToggle={() => patchState({ immersive: !state.immersive })}
    onReplace={onReplaceInput} extra={headerActions} example={example} />;
  const controls: MsaViewerToolbarProps = {
    nameQuery, nameFilterEnabled, nameResults,
    onNameQueryChange: query => {
      setNameQuery(query);
      if (!query.trim()) setNameFilterEnabled(false);
      if (nameFilterEnabled || !query.trim()) patchState({ search: query.trim() ? query : "" });
    },
    onNameFilterChange: enabled => { setNameFilterEnabled(enabled); patchState({ search: enabled ? nameQuery : "" }); },
    onLocateName: locateSequence,
    comparisonOpen, onOpenComparison: openComparison,
    jumpError, positionMaximum: state.coordinateMode === "reference" && referenceMap ? referenceMap.referenceLength : alignmentLength,
    onRevealPosition: hiddenJump === null ? undefined : () => { const rowKey=state.referenceRowKey ?? displayedRowKeys[0]; if (rowKey) pendingLocate.current={rowKey,position:hiddenJump}; patchState({ columnFilter:"all" }); setHiddenJump(null); setJumpError(null); },
    onSaveView: exportWorkspaceFile,
    actualScopeRowCount: analysis.scopeRowCount,
    alignmentLength: alignmentLength,
    analysisDisabled: !canAnalyze,
    canExport: alignment.sequences.length > 0,
    canExportImage: canExport,
    canExportSelectedRows: state.selectedRowKeys.size > 0,
    canUndoHide: Boolean(displayUndo) || state.lastHiddenRowKeys.length > 0,
    hiddenCount: state.hiddenRowKeys.size,
    isSearchingMotif: analysis.isSearchingMotif,
    jumpPosition: jumpPosition,
    motifMatchCount: motifMatchCount,
    motifMatches: displayedMotifMatches,
    motifMatchesTruncated: analysis.motifMatchesTruncated,
    motifValidationError: motifValidationError,
    neutralReason: neutralReason,
    onClearReference: () => setReference(""),
    onExportConsensusRange: exportConsensusRange,
    onExportImage: imageExport.openDialog,
    onExportSelectedRange: exportRangeFasta,
    onExportSelectedRows: exportSelectedRows,
    onExportVisible: exportVisibleFasta,
    onHideSelected: () => dispatch({ type: "batchRows", operation: "hide", rowKeys: state.selectedRowKeys }),
    onJump: jumpToPosition,
    onJumpPositionChange: value => { setJumpPosition(value); setJumpError(null); setHiddenJump(null); },
    onMotifNavigate: navigateMotif,
    onMotifSelect: selectMotif,
    onOpenInspector: () => patchState({ settingsOpen: false, inspectorOpen: true, qcPanelOpen: false }),
    onOpenQc: () => patchState({ qcPanelOpen: !state.qcPanelOpen, inspectorOpen: false }),
    onPatch: patchState,
    onPinSelected: () => dispatch({ type: "batchRows", operation: "pin", rowKeys: state.selectedRowKeys }),
    onResetView: () => dispatch({ type: "resetView" }),
    onSelectAllVisible: () => dispatch({ type: "selectAllVisible", rowKeys: displayedRowKeys }),
    onShowAll: () => dispatch({ type: "showAllRows" }),
    onToggleTrack: (track) => dispatch({ type: "toggleTrack", track }),
    onToggleWorkspace: () => patchState({ immersive: !state.immersive }),
    onUndoHide: displayUndo ? undoDisplay : () => dispatch({ type: "undoLastHide" }),
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
    {canAnalyze && <MsaColumnFilterPanel state={state} store={analysis.columnStore} length={alignmentLength} onPatch={patchState}/>}
    <details className="msa-view-group"><summary>{w.records}</summary><div><p>{w.viewHint}</p>
      <button type="button" onClick={exportWorkspaceFile}>{w.saveView}</button>
      <button type="button" onClick={()=>workspaceFileRef.current?.click()}>{w.restoreView}</button>
      <button type="button" onClick={()=>dispatch({type:"resetView"})}>{d.results.viewer.stageTwo.resetView}</button>
    </div></details>
    {canAnalyze && <details className="msa-view-group"><summary>{d.results.viewer.legend}</summary>{state.differenceMode&&reference?<DifferenceLegend/>:<MSAColorLegend scheme={state.colorScheme}/>}</details>}
  </div>;
  const dockContent = <div id="msa-shared-panel">
    {comparisonOpen ? <MsaComparisonPanel rows={alignment.sequences} state={state} onChoose={setReference} onEnd={()=>setReference("")} onPatch={patchState}/>
      : state.settingsOpen ? <MsaSettingsDock {...controls} isOpen onClose={closePanel} presentation="content" workspaceActions={workspaceActions}/>
      : <><div className="msa-panel-tabs" role="tablist" aria-label={w.check}>
        <button id="msa-selection-tab" role="tab" aria-selected={!qcPanelOpen} aria-controls="msa-analysis-detail" type="button" onClick={()=>patchState({inspectorOpen:true,qcPanelOpen:false})}>{w.selectionDetails}</button>
        <button id="msa-checks-tab" role="tab" aria-selected={qcPanelOpen} aria-controls="msa-analysis-detail" disabled={!canAnalyze} type="button" onClick={()=>patchState({inspectorOpen:false,qcPanelOpen:true})}>{w.checks}</button>
      </div>{canAnalyze && <label className="block msa-panel-content">{w.statisticalScope}<select aria-label={w.statisticalScope} value={state.analysisScope} onChange={e => patchState({analysisScope:e.target.value as ViewerState["analysisScope"]})}>{(["all","visible","selected"] as const).map(scope=><option key={scope} value={scope} disabled={scope==="selected"&&!state.selectedRowKeys.size}>{d.results.viewer.stageTwo.analysisScopes[scope]}</option>)}</select><small className="sr-only">{w.scopeHint}</small></label>}<div id="msa-analysis-detail" role="tabpanel" aria-labelledby={qcPanelOpen?"msa-checks-tab":"msa-selection-tab"}>{qcPanelOpen?qcWorkspace:<>{inspector}{annotationContent}</>}</div></>}
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
        onSetReference={rowKey => setReference(rowKey === state.referenceRowKey ? "" : rowKey)}
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
        showConsensus={canAnalyze && state.showConsensus}
        showLogo={canAnalyze && state.showLogo}
        rna={descriptor.alphabet === "rna"}
        motifColumnHitCounts={analysis.motifColumnHitCounts}
        onMotifColumnSelect={position=>{
          const rowIndex=analysis.motifColumnFirstRows?.[position-1]??-1;
          const row=scopeSequences[rowIndex];if(!row)return;
          const rowKey=rowKeyForSequence(row,rowIndex);handleSelect({rowKey,position});scrollToAlignmentPosition(position,rowKey);
        }}
        stats={analysis.columnStore}
        visiblePositions={visiblePositions}
      />
      {analysis.status === 'error' && <div role="alert" className="absolute right-3 top-3 z-40 flex items-center gap-3 rounded border border-amber-200 bg-white px-3 py-2 text-xs text-amber-900">
        <span>{locale==='zh'?'统计暂不可用，仍可浏览矩阵':'Statistics unavailable. Matrix browsing is available.'}</span>
        <button type="button" className="min-h-9 text-teal-800 underline" onClick={analysis.retry}>{locale==='zh'?'重试':'Retry'}</button>
      </div>}
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
      <div className="flex shrink-0 items-center gap-3" tabIndex={0}>
        <span>{state.selection ? `${d.results.viewer.position} ${state.selection.position}` : locale === "zh" ? "未选择" : "No selection"}</span>
        {rangeText && state.selectedRange && <span>{viewerText(w.selectedInterval,{start:state.selectedRange.start,end:state.selectedRange.end,count:state.selectedRange.end-state.selectedRange.start+1})}{state.columnFilter!=="all" && " · "+viewerText(w.currentlyShown,{count:lowerBoundVisibleIndex(visiblePositions,state.selectedRange.end+1)-lowerBoundVisibleIndex(visiblePositions,state.selectedRange.start)})}</span>}
        {extraReference && <span>{viewerText(w.referenceExtra,{count:displayedSequences.length-1})}</span>}
        <span>{canAnalyze ? `${d.results.viewer.stageTwo.analysisScopes[state.analysisScope]} · ${analysis.scopeRowCount}` : d.results.viewer.scienceV2.neutralTitle}</span>
        {state.viewport ? <span>{locale==='zh'?'行':'Rows'} {Math.min(displayedSequences.length,Math.floor((state.viewport?.scrollTop??0)/viewSettings.rowHeight)+1)}–{Math.min(displayedSequences.length,Math.ceil(((state.viewport?.scrollTop??0)+Math.max(0,(state.viewport?.clientHeight??0)-frozenHeight(activeTracks.length,canAnalyze&&state.showLogo,canAnalyze&&state.showConsensus,Boolean(analysis.motifColumnHitCounts))))/viewSettings.rowHeight))}/{displayedSequences.length} · {locale==='zh'?'列':'Columns'} {positionAt(visiblePositions,Math.floor((state.viewport?.scrollLeft??0)/(viewSettings.cellWidth+viewSettings.cellGap)))??1}–{positionAt(visiblePositions,Math.min(visiblePositions.length-1,Math.floor(((state.viewport?.scrollLeft??0)+Math.max(0,(state.viewport?.clientWidth??0)-viewSettings.labelWidth-24))/(viewSettings.cellWidth+viewSettings.cellGap))))??alignmentLength}/{alignmentLength}</span> : <span>{viewerText(w.retainedRows,{count:displayedSequences.length})} · {viewerText(w.columnsCount,{count:visiblePositions.length})}</span>}
        {(state.search || state.hiddenRowKeys.size > 0 || state.columnFilter !== "all") && <button type="button" className="text-teal-800 underline"
          onClick={() => { setNameFilterEnabled(false); dispatch({ type: "showAllRows" }); patchState({search: "", columnFilter: "all"}); }}>{locale === "zh" ? "清除筛选" : "Clear filters"}</button>}
        {state.selectedRowKeys.size > 0 && <span>{state.selectedRowKeys.size} {locale === "zh" ? "行已选" : "rows selected"}</span>}
        {state.motifQuery && <button type="button" title={state.motifQuery} onClick={() => patchState({ motifQuery: "", activeMotifIndex: 0 })}>
          {locale === "zh" ? "清除片段搜索" : "Clear motif search"}
        </button>}
        {state.hiddenRowKeys.size > 0 && <span>{locale === "zh" ? "隐藏" : "Hidden"}: {state.hiddenRowKeys.size}</span>}
        {state.referenceRowKey && <span className="max-w-36 truncate" title={rowLabels.get(state.referenceRowKey)}>{locale === "zh" ? "对照" : "Reference"}: {rowLabels.get(state.referenceRowKey)}</span>}
        {descriptor.warnings.includes("duplicate_headers") && <span title={locale === "zh" ? "同名序列按独立记录处理" : "Rows with duplicate names remain independently addressable"}>{locale === "zh" ? "存在同名序列" : "Duplicate headers detected"}</span>}
        {workspaceMessage && <span role="status">{workspaceMessage}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {(state.selection||state.selectedRowKeys.size>0) && <><button type="button" onClick={()=>patchState({settingsOpen:false,inspectorOpen:true,qcPanelOpen:false})}>{w.inspectSelection}</button>
          {state.selectedRange && <button type="button" onClick={exportRangeFasta}>{w.exportSelection}</button>}
          {!state.selectedRange && state.selectedRowKeys.size>0 && <button type="button" onClick={exportSelectedRows}>{w.exportSelectedRows}</button>}
          <button type="button" disabled={!activeAnnotationTarget} title={!activeAnnotationTarget ? w.selectOneNote : undefined} onClick={addSelectionNote}>{w.addNote}</button></>}
        {displayUndo && <button type="button" onClick={undoDisplay}>{w.undoDisplay}</button>}
        {canAnalyze && (state.differenceMode && reference ? <DifferenceLegend compact/> : <span className="msa-inline-legend" aria-label={d.results.viewer.legend}>{legendItems(renderColorScheme,d.results.viewer.legendLabels).map(item=><span key={item.label} title={item.title}><i className={item.className}/>{item.label==='T / U' ? (descriptor.alphabet==='rna'?'U':'T') : item.label}</span>)}</span>)}
        {state.lastHiddenRowKeys.length > 0 && <button type="button" onClick={() => dispatch({ type:"undoLastHide" })}>{d.results.viewer.stageTwo.undoHide}</button>}
        {(state.selection || state.selectedRowKeys.size > 0) && <button type="button" onClick={() => { dispatch({ type:"clearSelection" }); patchState({selectedRowKeys:new Set()}); }}>{d.results.viewer.clearSelection}</button>}
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
          {locale === "zh" ? "服务端未提供完整预览" : "The server did not provide a complete preview"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {alignment.message ?? (locale === "zh"
            ? `结果包含 ${count.toLocaleString()} 条序列、${length.toLocaleString()} 列；可下载完整结果。`
            : `The result contains ${count.toLocaleString()} rows and ${length.toLocaleString()} columns. Download the complete result to view locally.`)}
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
        dockLabel={comparisonOpen?w.compare:state.settingsOpen?w.display:w.check}
        dockOpen={dockOpen}
        dockResizeLabel={d.results.viewer.stageTwo.resizeDock}
        dockWidth={state.inspectorWidth}
        matrix={matrix}
        matrixLabel={d.results.viewer.matrixNavigation}
        navigator={displayedSequences.length > 0 && visiblePositions.length > 0 ? <MsaHorizontalOverview
          input={overviewInput} scrollRef={scrollRef} pitch={viewSettings.cellWidth + viewSettings.cellGap}
          labelWidth={viewSettings.labelWidth}/> : undefined}
        overview={state.minimapCollapsed || panelOpen ? undefined : <MsaGlobalOverview input={overviewInput} scrollRef={scrollRef}
          pitch={viewSettings.cellWidth+viewSettings.cellGap} rowHeight={viewSettings.rowHeight}
          headerHeight={frozenHeight(activeTracks.length,canAnalyze&&state.showLogo,canAnalyze&&state.showConsensus,Boolean(analysis.motifColumnHitCounts))} labelWidth={viewSettings.labelWidth}/>}
        onDockClose={closePanel}
        onDockWidthChange={(inspectorWidth) => patchState({ inspectorWidth })}
        statusBar={statusBar}
        workspaceLabel={canAnalyze
          ? (locale === "zh" ? "MSA 查看器" : "MSA viewer")
          : (locale === "zh" ? "MSA 中性矩阵浏览工作区" : "MSA neutral matrix browser")}
        {...(immersive
          ? {
              mode: "immersive" as const,
              exitImmersiveLabel: d.results.viewer.stageTwo.exitWorkspace,
              onExitImmersive: exitWorkspace
            }
          : { mode: "embedded" as const })}
      />

      <input accept=".easymsa-view.json,application/json" aria-label={locale === "zh" ? "恢复查看记录文件" : "Restore view file"}
        className="hidden" onChange={importWorkspaceFile} ref={workspaceFileRef} type="file"/>
      <OverlayDialog closeLabel={locale === "zh" ? "关闭面板" : "Close panel"} isOpen={mobile && panelOpen} onClose={closePanel}
        title={comparisonOpen?w.compare:state.settingsOpen?w.display:w.check} variant="bottom-sheet">
        {dockContent}
      </OverlayDialog>

      {sequenceExport && <SequenceExportDialog key={workspaceScope ?? sourceFingerprint} snapshot={sequenceExport} onClose={()=>setSequenceExport(null)}/>}
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
