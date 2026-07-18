import { Loader2, MousePointer2, X } from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { EmptyState } from "../../components/common/EmptyState";
import { MSAColorLegend } from "../../components/results/MSAColorLegend";
import { ExportDialog } from "../msa-export/ExportDialog";
import { useMsaExport } from "../msa-export/useMsaExport";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSAResult, MSASequence } from "../../lib/types/msa";
import {
  buildReferenceCoordinateMap,
  calculateRangeStats
} from "./analysis";
import { MsaDomMatrix } from "./MsaDomMatrix";
import { MsaInspector } from "./MsaInspector";
import { MsaOverviewNavigator } from "./MsaOverviewNavigator";
import { MsaViewerToolbar } from "./MsaViewerToolbar";
import type {
  CellSelection,
  ColumnRange,
  MsaViewSettings,
  ViewerState
} from "./types";
import { useMsaAnalysis } from "./useMsaAnalysis";
import { useViewerState } from "./useViewerState";

const DETAIL_ZOOM_THRESHOLD = 0.7;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

export function getMsaViewSettings(
  zoomLevel: number,
  density: ViewerState["density"]
): MsaViewSettings {
  const compact = density === "compact";
  const showCharacters = zoomLevel >= DETAIL_ZOOM_THRESHOLD;
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
    labelWidth: Math.round(
      (compact ? 160 : 192) * Math.min(Math.max(zoomLevel, 0.8), 1.2)
    ),
    markerEvery:
      zoomLevel < 0.35 ? 100 : zoomLevel < 0.7 ? 50 : zoomLevel < 0.95 ? 20 : 10,
    showCharacters,
    cellGap: showCharacters ? 2 : 0
  };
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
  if (!range) {
    return "";
  }
  return range.start === range.end
    ? String(range.start)
    : `${range.start}-${range.end}`;
}

function DifferenceLegend() {
  const { dictionary: d } = useLanguage();
  const t = d.results.viewer.stageTwo.differences;
  const items = [
    [t.match, "bg-slate-100 border-slate-200"],
    [t.mismatch, "bg-rose-200 border-rose-300"],
    [t.insertion, "bg-teal-200 border-teal-300"],
    [t.deletion, "bg-amber-200 border-amber-300"]
  ];
  return (
    <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {items.map(([label, className]) => (
        <span
          className={`inline-flex h-8 items-center rounded border px-3 text-xs font-medium text-slate-800 ${className}`}
          key={label}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function MsaViewerRoot({ alignment }: { alignment: MSAResult }) {
  const { dictionary: d } = useLanguage();
  const { state, dispatch } = useViewerState(alignment.jobId);
  const [jumpPosition, setJumpPosition] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingZoomAnchorRef = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(state.search.trim().toLowerCase());
  const alignmentLength =
    alignment.alignmentLength ??
    Math.max(0, ...alignment.sequences.map((sequence) => sequence.sequence.length));
  const viewSettings = useMemo(
    () => getMsaViewSettings(state.zoomLevel, state.density),
    [state.density, state.zoomLevel]
  );
  const analysis = useMsaAnalysis(
    alignment.sequences,
    alignmentLength,
    state.motifQuery
  );
  const reference = useMemo(
    () =>
      alignment.sequences.find(
        (sequence) => sequence.id === state.referenceSequenceId
      ) ?? null,
    [alignment.sequences, state.referenceSequenceId]
  );
  const referenceMap = useMemo(
    () => (reference ? buildReferenceCoordinateMap(reference.sequence) : null),
    [reference]
  );

  useEffect(() => {
    if (state.referenceSequenceId && !reference) {
      dispatch({
        type: "patch",
        patch: {
          coordinateMode: "alignment",
          differenceMode: false,
          referenceSequenceId: null
        }
      });
    }
  }, [dispatch, reference, state.referenceSequenceId]);

  const consensus = useMemo(
    () =>
      analysis.columns
        .map((column) =>
          state.consensusMode === "iupac"
            ? column.ambiguityConsensus
            : column.consensusBase
        )
        .join(""),
    [analysis.columns, state.consensusMode]
  );
  const viewerAlignment = useMemo(
    () => ({ ...alignment, consensus: consensus || alignment.consensus }),
    [alignment, consensus]
  );

  const displayedSequences = useMemo(() => {
    const referenceId = reference?.id ?? null;
    const filtered = alignment.sequences.filter((sequence) => {
      if (sequence.id === referenceId) {
        return true;
      }
      if (state.hiddenSequenceIds.has(sequence.id)) {
        return false;
      }
      return !deferredSearch || sequence.id.toLowerCase().includes(deferredSearch);
    });
    const order = new Map(
      alignment.sequences.map((sequence, index) => [sequence.id, index])
    );
    const sorted = [...filtered].sort((left, right) => {
      if (state.sortMode === "name") {
        return left.id.localeCompare(right.id);
      }
      if (state.sortMode === "length") {
        return (
          right.sequence.length - left.sequence.length ||
          left.id.localeCompare(right.id)
        );
      }
      return (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0);
    });
    return sorted.sort((left, right) => {
      const rank = (sequence: MSASequence) =>
        sequence.id === referenceId
          ? 0
          : state.pinnedSequenceIds.has(sequence.id)
            ? 1
            : 2;
      return rank(left) - rank(right);
    });
  }, [
    alignment.sequences,
    deferredSearch,
    reference,
    state.hiddenSequenceIds,
    state.pinnedSequenceIds,
    state.sortMode
  ]);

  const visiblePositions = useMemo(
    () =>
      analysis.columns
        .filter((column) => {
          if (state.columnFilter === "variable") {
            return column.variation > 0;
          }
          if (state.columnFilter === "conserved") {
            return column.conservation >= 0.8 && column.gapFraction < 0.5;
          }
          if (state.columnFilter === "lowGap") {
            return column.gapFraction <= 0.5;
          }
          return true;
        })
        .map((column) => column.position),
    [analysis.columns, state.columnFilter]
  );
  const displayedIds = useMemo(
    () => new Set(displayedSequences.map((sequence) => sequence.id)),
    [displayedSequences]
  );
  const motifMatches = useMemo(
    () => analysis.motifMatches.filter((match) => displayedIds.has(match.sequenceId)),
    [analysis.motifMatches, displayedIds]
  );
  const motifPositionMap = useMemo(() => {
    const map = new Map<string, Set<number>>();
    motifMatches.forEach((match) => {
      const positions = map.get(match.sequenceId) ?? new Set<number>();
      match.positions.forEach((position) => positions.add(position));
      map.set(match.sequenceId, positions);
    });
    return map;
  }, [motifMatches]);
  const hasSequenceFilter = Boolean(deferredSearch || state.hiddenSequenceIds.size);
  const motifMatchCount = hasSequenceFilter
    ? motifMatches.length
    : analysis.motifMatchCount;
  const motifMatchesTruncated = !hasSequenceFilter && analysis.motifMatchesTruncated;

  useEffect(() => {
    if (!motifMatches.length && state.activeMotifIndex !== 0) {
      dispatch({ type: "patch", patch: { activeMotifIndex: 0 } });
    } else if (state.activeMotifIndex >= motifMatches.length && motifMatches.length) {
      dispatch({ type: "patch", patch: { activeMotifIndex: motifMatches.length - 1 } });
    }
  }, [dispatch, motifMatches.length, state.activeMotifIndex]);

  const selectedSequence = state.selection
    ? alignment.sequences.find(
        (sequence) => sequence.id === state.selection?.sequenceId
      )
    : null;
  const selectedBase = state.selection
    ? selectedSequence?.sequence[state.selection.position - 1] ??
      (state.selection.sequenceId === d.results.viewer.consensus
        ? consensus[state.selection.position - 1] ?? ""
        : analysis.columns[state.selection.position - 1]?.dominantBase ?? "")
    : "";
  const selectedColumnStats = state.selection
    ? analysis.columns[state.selection.position - 1] ?? null
    : null;
  const selectedReferencePosition = state.selection && referenceMap
    ? referenceMap.alignmentToReference[state.selection.position - 1] ?? null
    : null;
  const columnSummary = useMemo(() => {
    if (!state.selection) {
      return "";
    }
    const counts = new Map<string, number>();
    displayedSequences.forEach((sequence) => {
      const base = sequence.sequence[state.selection!.position - 1] || "-";
      counts.set(base, (counts.get(base) ?? 0) + 1);
    });
    return Array.from(counts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([base, count]) => `${base}:${count}`)
      .join("  ");
  }, [displayedSequences, state.selection]);
  const rangeStats = useMemo(
    () =>
      state.selectedRange
        ? calculateRangeStats({
            sequences: displayedSequences,
            columns: analysis.columns,
            range: state.selectedRange,
            consensus,
            reference
          })
        : null,
    [
      analysis.columns,
      consensus,
      displayedSequences,
      reference,
      state.selectedRange
    ]
  );

  const imageExport = useMsaExport(viewerAlignment, getExportViewerState);

  useLayoutEffect(() => {
    const anchorPosition = pendingZoomAnchorRef.current;
    if (anchorPosition === null) {
      return;
    }
    pendingZoomAnchorRef.current = null;
    scrollToAlignmentPosition(anchorPosition);
  }, [viewSettings.cellWidth, viewSettings.cellGap, visiblePositions]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || analysis.isCalculating) {
      return;
    }
    let timeout = 0;
    const updateViewport = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        dispatch({
          type: "patch",
          patch: {
            viewport: {
              scrollLeft: element.scrollLeft,
              scrollTop: element.scrollTop,
              clientWidth: element.clientWidth,
              clientHeight: element.clientHeight
            }
          }
        });
      }, 120);
    };
    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(element);
    element.addEventListener("scroll", updateViewport, { passive: true });
    updateViewport();
    return () => {
      window.clearTimeout(timeout);
      resizeObserver.disconnect();
      element.removeEventListener("scroll", updateViewport);
    };
  }, [
    analysis.isCalculating,
    dispatch,
    displayedSequences.length,
    visiblePositions.length
  ]);

  function patchState(patch: Partial<ViewerState>) {
    dispatch({ type: "patch", patch });
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
    return {
      sequences: displayedSequences,
      visiblePositions,
      conservationColumns: analysis.columns,
      colorScheme: state.colorScheme,
      selectedRange: state.selectedRange,
      viewSettings,
      viewport,
      alignmentLength,
      activeTracks: state.activeTracks,
      consensusMode: state.consensusMode,
      coordinateMode: state.coordinateMode,
      differenceMode: state.differenceMode,
      referenceSequenceId: reference?.id ?? null
    };
  }

  function scrollToAlignmentPosition(position: number, sequenceId?: string) {
    const element = scrollRef.current;
    if (!element || !visiblePositions.length) {
      return;
    }
    const nextIndex = visiblePositions.findIndex(
      (visiblePosition) => visiblePosition >= position
    );
    const columnIndex = nextIndex >= 0 ? nextIndex : visiblePositions.length - 1;
    const pitch = viewSettings.cellWidth + viewSettings.cellGap;
    element.scrollLeft = Math.max(
      0,
      viewSettings.labelWidth + 24 + columnIndex * pitch - element.clientWidth / 2
    );
    if (sequenceId) {
      const rowIndex = displayedSequences.findIndex(
        (sequence) => sequence.id === sequenceId
      );
      if (rowIndex >= 0) {
        const headerHeight = (1 + state.activeTracks.length) * viewSettings.rowHeight;
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
      selection: next,
      range: {
        start: Math.min(anchor, next.position),
        end: Math.max(anchor, next.position)
      }
    });
  }

  function handleRangeSelect(sequenceId: string, start: number, end: number) {
    dispatch({
      type: "select",
      selection: { sequenceId, position: end },
      range: { start, end }
    });
  }

  function moveSelection(deltaRow: number, deltaColumn: number, extendRange: boolean) {
    if (!visiblePositions.length || !displayedSequences.length) {
      return;
    }
    const navigationRowIds = [
      ...state.activeTracks.map((track) => `track:${track}`),
      ...displayedSequences.map((sequence) => sequence.id),
      d.results.viewer.consensus
    ];
    const currentPosition = state.selection?.position ?? visiblePositions[0];
    const exactColumnIndex = visiblePositions.indexOf(currentPosition);
    const nearestColumnIndex = visiblePositions.findIndex(
      (position) => position >= currentPosition
    );
    const currentColumnIndex = exactColumnIndex >= 0
      ? exactColumnIndex
      : nearestColumnIndex >= 0
        ? nearestColumnIndex
        : visiblePositions.length - 1;
    const fallbackRow = state.activeTracks.length;
    const selectedRowIndex = navigationRowIds.indexOf(
      state.selection?.sequenceId ?? displayedSequences[0].id
    );
    const currentRowIndex = selectedRowIndex >= 0 ? selectedRowIndex : fallbackRow;
    const nextColumnIndex = Math.min(
      visiblePositions.length - 1,
      Math.max(0, currentColumnIndex + deltaColumn)
    );
    const nextRowIndex = Math.min(
      navigationRowIds.length - 1,
      Math.max(0, currentRowIndex + deltaRow)
    );
    const next = {
      sequenceId: navigationRowIds[nextRowIndex],
      position: visiblePositions[nextColumnIndex]
    };
    handleSelect(next, extendRange);
    scrollToAlignmentPosition(next.position, next.sequenceId);
  }

  function navigateMotif(delta: number) {
    if (!motifMatches.length) {
      return;
    }
    const index =
      (state.activeMotifIndex + delta + motifMatches.length) % motifMatches.length;
    selectMotif(index);
  }

  function selectMotif(index: number) {
    const match = motifMatches[index];
    if (!match) {
      return;
    }
    dispatch({
      type: "patch",
      patch: {
        activeMotifIndex: index,
        selection: { sequenceId: match.sequenceId, position: match.start },
        selectedRange: {
          start: Math.min(...match.positions),
          end: Math.max(...match.positions)
        }
      }
    });
    scrollToAlignmentPosition(match.start, match.sequenceId);
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
          Math.round(
            (element.scrollLeft + element.clientWidth / 2 - viewSettings.labelWidth - 24) /
              pitch
          )
        )
      );
      anchorPosition = visiblePositions[centerIndex];
    }
    pendingZoomAnchorRef.current = anchorPosition;
    patchState({ zoomLevel: clampZoom(nextZoom) });
  }

  function jumpToPosition() {
    const parsed = Number.parseInt(jumpPosition, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    let alignmentPosition = Math.max(1, Math.min(alignmentLength, parsed));
    if (state.coordinateMode === "reference" && referenceMap) {
      const referencePosition = Math.max(
        1,
        Math.min(referenceMap.referenceLength, parsed)
      );
      alignmentPosition =
        referenceMap.referenceToAlignment[referencePosition - 1] ?? alignmentPosition;
      setJumpPosition(String(referencePosition));
    } else {
      setJumpPosition(String(alignmentPosition));
    }
    scrollToAlignmentPosition(alignmentPosition);
    const sequenceId = reference?.id ?? displayedSequences[0]?.id;
    if (sequenceId) {
      handleSelect({ sequenceId, position: alignmentPosition });
    }
  }

  function setReference(sequenceId: string) {
    const nextReferenceId = reference?.id === sequenceId ? null : sequenceId;
    patchState({
      coordinateMode: nextReferenceId ? state.coordinateMode : "alignment",
      differenceMode: nextReferenceId ? state.differenceMode : false,
      referenceSequenceId: nextReferenceId
    });
  }

  function hideSequence(sequenceId: string) {
    if (sequenceId === reference?.id) {
      return;
    }
    dispatch({ type: "hideSequence", sequenceId });
  }

  function exportVisibleFasta() {
    if (displayedSequences.length && visiblePositions.length) {
      downloadText(
        "easymsa-visible-alignment.fasta",
        fastaForPositions(displayedSequences, visiblePositions)
      );
    }
  }

  function exportRangeFasta() {
    if (!state.selectedRange || !displayedSequences.length) {
      return;
    }
    const positions = Array.from(
      { length: state.selectedRange.end - state.selectedRange.start + 1 },
      (_, index) => state.selectedRange!.start + index
    );
    downloadText(
      `easymsa-visible-region-${state.selectedRange.start}-${state.selectedRange.end}.fasta`,
      fastaForPositions(displayedSequences, positions)
    );
  }

  function exportConsensusRange() {
    if (!state.selectedRange || !rangeStats) {
      return;
    }
    downloadText(
      `easymsa-consensus-region-${state.selectedRange.start}-${state.selectedRange.end}.fasta`,
      `>${alignment.jobId || "easymsa"}:consensus:${state.selectedRange.start}-${state.selectedRange.end}\n${rangeStats.consensusSegment}\n`
    );
  }

  function exportSelectedRows() {
    const rows = displayedSequences.filter((sequence) =>
      state.selectedSequenceIds.has(sequence.id)
    );
    if (rows.length) {
      downloadText(
        "easymsa-selected-sequences.fasta",
        fastaForPositions(rows, visiblePositions)
      );
    }
  }

  if (alignment.truncated) {
    return (
      <EmptyState
        message={
          alignment.message ??
          "Alignment is too large for preview. Download the result archive instead."
        }
      />
    );
  }

  const canExport = displayedSequences.length > 0 && visiblePositions.length > 0;
  const rangeText = selectedRangeLabel(state.selectedRange);

  return (
    <div className="space-y-4">
      <MsaViewerToolbar
        alignmentLength={alignmentLength}
        canExport={canExport}
        canExportSelectedRows={state.selectedSequenceIds.size > 0 && visiblePositions.length > 0}
        hiddenCount={state.hiddenSequenceIds.size}
        isSearchingMotif={analysis.isSearchingMotif}
        jumpPosition={jumpPosition}
        motifMatchCount={motifMatchCount}
        motifMatches={motifMatches}
        motifMatchesTruncated={motifMatchesTruncated}
        onExportConsensusRange={exportConsensusRange}
        onExportImage={imageExport.openDialog}
        onExportSelectedRange={exportRangeFasta}
        onExportSelectedRows={exportSelectedRows}
        onExportVisible={exportVisibleFasta}
        onJump={jumpToPosition}
        onJumpPositionChange={setJumpPosition}
        onMotifNavigate={navigateMotif}
        onMotifSelect={selectMotif}
        onOpenInspector={() => patchState({ inspectorOpen: true })}
        onPatch={patchState}
        onShowAll={() => dispatch({ type: "showAllSequences" })}
        onToggleTrack={(track) => dispatch({ type: "toggleTrack", track })}
        onZoom={changeZoom}
        selectedRowCount={state.selectedSequenceIds.size}
        state={state}
        totalSequenceCount={alignment.sequences.length}
        visibleColumnCount={visiblePositions.length}
        visibleSequenceCount={displayedSequences.length}
      />

      {analysis.columns.length ? (
        <MsaOverviewNavigator columns={analysis.columns} scrollRef={scrollRef} />
      ) : null}

      {analysis.error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {analysis.error}
        </div>
      ) : null}

      {analysis.isCalculating ? (
        <div className="flex min-h-56 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-600" role="status">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-teal-700" />
          {d.results.viewer.calculating}
        </div>
      ) : displayedSequences.length === 0 ? (
        <EmptyState message={d.results.viewer.noMatches} />
      ) : visiblePositions.length === 0 ? (
        <EmptyState message={d.results.viewer.noColumns} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <MsaDomMatrix
              activeTracks={state.activeTracks}
              alignmentLength={alignmentLength}
              colorScheme={state.colorScheme}
              consensus={consensus || alignment.consensus}
              coordinateMode={state.coordinateMode}
              differenceMode={state.differenceMode}
              motifPositionMap={motifPositionMap}
              onHideSequence={hideSequence}
              onNavigate={moveSelection}
              onPinSequence={(sequenceId) =>
                dispatch({
                  type: "toggleSequenceSet",
                  field: "pinnedSequenceIds",
                  sequenceId
                })
              }
              onRangeSelect={handleRangeSelect}
              onSelect={handleSelect}
              onSelectSequence={(sequenceId) =>
                dispatch({
                  type: "toggleSequenceSet",
                  field: "selectedSequenceIds",
                  sequenceId
                })
              }
              onSetReference={setReference}
              pinnedSequenceIds={state.pinnedSequenceIds}
              reference={reference}
              scrollRef={scrollRef}
              selectedRange={state.selectedRange}
              selectedSequenceIds={state.selectedSequenceIds}
              selection={state.selection}
              sequences={displayedSequences}
              settings={viewSettings}
              stats={analysis.columns}
              visiblePositions={visiblePositions}
            />
            <div
              className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              data-msa-selected-position={state.selection?.position ?? ""}
              data-msa-selected-range={rangeText}
              data-msa-status="true"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {state.selection ? (
                  <span>
                    {d.results.viewer.selectedPosition}: <b>{state.selection.position}</b>
                    {selectedReferencePosition ? ` / ${selectedReferencePosition}` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <MousePointer2 className="h-3.5 w-3.5 text-teal-700" />
                    {d.results.viewer.noSelection}
                  </span>
                )}
                {state.selectedRange ? (
                  <span>
                    {d.results.viewer.selectedRange.replace("{range}", rangeText)}
                  </span>
                ) : null}
                <span>
                  {viewSettings.showCharacters
                    ? d.results.viewer.stageTwo.domDetail
                    : d.results.viewer.stageTwo.canvasOverview}
                </span>
                <span className="hidden md:inline">{d.results.viewer.stageTwo.shortcutHint}</span>
              </div>
              {state.selection ? (
                <button
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-950"
                  onClick={() => dispatch({ type: "clearSelection" })}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                  {d.results.viewer.clearSelection}
                </button>
              ) : null}
            </div>
          </section>

          <MsaInspector
            alignmentPosition={state.selection?.position ?? null}
            base={selectedBase}
            columnStats={selectedColumnStats}
            columnSummary={columnSummary}
            mobileOpen={state.inspectorOpen}
            onClose={() => patchState({ inspectorOpen: false })}
            range={state.selectedRange}
            rangeStats={rangeStats}
            reference={reference}
            referencePosition={selectedReferencePosition}
            selection={state.selection}
          />
        </div>
      )}

      <ExportDialog
        error={imageExport.error}
        hasSelection={imageExport.hasSelection}
        isExporting={imageExport.isExporting}
        isOpen={imageExport.isOpen}
        layout={imageExport.layout}
        onClose={imageExport.closeDialog}
        onExport={imageExport.runExport}
        onUpdate={imageExport.updateOptions}
        options={imageExport.options}
      />

      {state.differenceMode && reference ? (
        <DifferenceLegend />
      ) : (
        <MSAColorLegend scheme={state.colorScheme} />
      )}
    </div>
  );
}
