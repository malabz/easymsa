import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import {
  EyeOff,
  Flag,
  MoreHorizontal,
  Pin,
  PinOff,
  Square,
  SquareCheckBig
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject
} from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { MSASequence } from "../../lib/types/msa";
import { cn } from "../../lib/utils/cn";
import {
  msaCellColorClass,
  type MSAColorScheme
} from "../../components/results/MSAColorLegend";
import { buildReferenceCoordinateMap, classifyDifference } from "./analysis";
import { rowKeyForSequence } from "./alignmentModel";
import { differenceColorClass } from "./differenceColors";
import { MsaRowMenu } from "./MsaRowMenu";
import { MsaCanvasMatrix } from "./MsaCanvasMatrix";
import { MsaStatisticTrack } from "./MsaStatisticTrack";
import {
  columnStatsAtPosition,
  filteredColumnPositionView,
  positionAt,
  visibleIndexOfPosition
} from "./columnStatsStore";
import type {
  CellSelection,
  ColumnPositionView,
  ColumnRange,
  ColumnStats,
  ColumnStatsStoreV1,
  MsaTrackId,
  MsaViewSettings
} from "./types";
import { markMsaPerformance, MSA_PERFORMANCE_MARKS } from "./performanceMarks";

const CONSENSUS_ROW_KEY = "easymsa:consensus";

/**
 * Resolve a row's internal identity without treating its display header as a
 * unique key. originalIndex keeps the legacy fallback stable after sorting or
 * filtering while adapters migrate to explicit rowKey values.
 */
export function matrixSequenceRowKey(sequence: MSASequence, index: number) {
  return rowKeyForSequence(sequence, sequence.originalIndex ?? index);
}

function selectionRowKey(selection: CellSelection | null) {
  return selection?.rowKey ?? null;
}

function rowSelection(rowKey: string, position: number): CellSelection {
  return { rowKey, position };
}

export function matrixNavigationDelta({
  key,
  pageRows,
  visibleColumnCount
}: {
  key: string;
  pageRows: number;
  visibleColumnCount: number;
}) {
  if (key === "ArrowLeft") return { row: 0, column: -1 };
  if (key === "ArrowRight") return { row: 0, column: 1 };
  if (key === "ArrowUp") return { row: -1, column: 0 };
  if (key === "ArrowDown") return { row: 1, column: 0 };
  if (key === "Home") return { row: 0, column: -visibleColumnCount };
  if (key === "End") return { row: 0, column: visibleColumnCount };
  if (key === "PageUp") return { row: -Math.max(1, pageRows), column: 0 };
  if (key === "PageDown") return { row: Math.max(1, pageRows), column: 0 };
  return null;
}

export function domPointerColumnPosition({
  clientX,
  containerLeft,
  pitch,
  visiblePositions
}: {
  clientX: number;
  containerLeft: number;
  pitch: number;
  visiblePositions: number[];
}) {
  if (!visiblePositions.length || pitch <= 0) {
    return null;
  }
  const index = Math.min(
    visiblePositions.length - 1,
    Math.max(0, Math.floor((clientX - containerLeft) / pitch))
  );
  return visiblePositions[index] ?? null;
}

function pointerColumnPositionFromView({
  clientX,
  containerLeft,
  pitch,
  positionView
}: {
  clientX: number;
  containerLeft: number;
  pitch: number;
  positionView: ColumnPositionView;
}) {
  if (positionView.length === 0 || pitch <= 0) return null;
  const index = Math.min(
    positionView.length - 1,
    Math.max(0, Math.floor((clientX - containerLeft) / pitch))
  );
  return positionAt(positionView, index) ?? null;
}

type RenderColumn = {
  virtualColumn: VirtualItem;
  position: number;
  stats: ColumnStats | null;
};

function useCoarsePointer() {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(any-pointer: coarse)").matches
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(any-pointer: coarse)");
    const update = () => setMatches(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return matches;
}

/** Exact lookup for sorted alignment positions without a linear indexOf scan. */
export function sortedPositionIndex(values: number[], target: number) {
  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = values[middle];
    if (value === target) {
      return middle;
    }
    if (value < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return -1;
}

function SequenceCells({
  colorScheme,
  differenceMode,
  dragAnchorRef,
  dragMovedRef,
  focusGrid,
  motifPositions,
  onRangeSelect,
  onSelect,
  positionView,
  renderColumns,
  rangeSelectionMode,
  reference,
  selectedRange,
  selection,
  sequence,
  sequenceRowKey,
  settings,
  totalWidth
}: {
  colorScheme: MSAColorScheme;
  differenceMode: boolean;
  dragAnchorRef: { current: { rowKey: string; position: number } | null };
  dragMovedRef: { current: boolean };
  focusGrid: () => void;
  motifPositions?: Set<number>;
  onRangeSelect: (rowKey: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  positionView: ColumnPositionView;
  renderColumns: RenderColumn[];
  rangeSelectionMode: boolean;
  reference: MSASequence | null;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  sequence: MSASequence;
  sequenceRowKey: string;
  settings: MsaViewSettings;
  totalWidth: number;
}) {
  const { dictionary: d } = useLanguage();
  return (
    <div className="relative shrink-0" style={{ height: settings.cellHeight, width: totalWidth }}>
      {renderColumns.map(({ virtualColumn, position, stats }) => {
        const missingTail = position > sequence.sequence.length;
        const base = sequence.sequence[position - 1] ?? "";
        const referenceBase = reference?.sequence[position - 1] ?? "";
        const selectedRow = selectionRowKey(selection) === sequenceRowKey;
        const selectedColumn = selection?.position === position;
        const selectedCell = selectedRow && selectedColumn;
        const inSelectedRange = selectedRange
          ? position >= selectedRange.start && position <= selectedRange.end
          : false;
        const motifHit = motifPositions?.has(position) ?? false;
        const consensusTie = sequenceRowKey === CONSENSUS_ROW_KEY &&
          stats?.majorityTie === true;
        const colorClass = differenceMode && reference
          ? differenceColorClass(classifyDifference(base, referenceBase))
          : msaCellColorClass(base, colorScheme, stats ?? undefined);

        return (
          <button
            aria-colindex={virtualColumn.index + 2}
            aria-label={`${sequence.id}; ${d.results.viewer.position} ${position}; ${missingTail ? d.results.viewer.scienceV2.neutralReasons.rawUnequal : base || d.results.viewer.emptyCell}${consensusTie ? `; ${d.results.viewer.stageTwo.consensusTie}` : ""}`}
            aria-selected={selectedCell || inSelectedRange}
            className={cn(
              "absolute left-0 top-0 inline-flex items-center justify-center font-mono font-semibold outline-none transition",
              settings.showCharacters ? "rounded border" : "border-0",
              consensusTie ? "border-dashed border-slate-700" : "",
              missingTail ? "border-slate-200 bg-slate-50 text-transparent" : colorClass,
              settings.showCharacters ? "" : "text-transparent",
              selectedCell
                ? "ring-2 ring-teal-700 ring-offset-1"
                : inSelectedRange
                  ? "ring-1 ring-teal-500"
                  : selectedRow || selectedColumn
                    ? "brightness-95 ring-1 ring-teal-300"
                    : motifHit
                      ? "ring-2 ring-amber-500 ring-offset-1"
                      : "hover:ring-1 hover:ring-slate-400"
            )}
            data-msa-cell="true"
            data-msa-position={position}
            data-msa-row-key={sequenceRowKey}
            data-msa-sequence-cell="true"
            key={`${sequenceRowKey}:${position}`}
            onClick={(event) => {
              if (dragMovedRef.current) {
                dragMovedRef.current = false;
                return;
              }
              focusGrid();
              onSelect(rowSelection(sequenceRowKey, position), event.shiftKey);
            }}
            onPointerDown={(event) => {
              dragMovedRef.current = false;
              if (event.pointerType === "touch" && !rangeSelectionMode) {
                dragAnchorRef.current = null;
                return;
              }
              dragAnchorRef.current = { rowKey: sequenceRowKey, position };
              if (event.pointerType !== "touch") {
                event.preventDefault();
                focusGrid();
              }
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event: ReactPointerEvent<HTMLButtonElement>) => {
              const anchor = dragAnchorRef.current;
              if (
                !anchor ||
                (event.pointerType === "touch" && !rangeSelectionMode) ||
                event.buttons !== 1 ||
                !event.currentTarget.hasPointerCapture(event.pointerId)
              ) {
                return;
              }
              const container = event.currentTarget.parentElement;
              if (!container) {
                return;
              }
              const currentPosition = pointerColumnPositionFromView({
                clientX: event.clientX,
                containerLeft: container.getBoundingClientRect().left,
                pitch: settings.cellWidth + settings.cellGap,
                positionView
              });
              if (currentPosition === null || anchor.position === currentPosition) {
                return;
              }
              if (anchor.position !== currentPosition) {
                dragMovedRef.current = true;
              }
              onRangeSelect(
                anchor.rowKey,
                Math.min(anchor.position, currentPosition),
                Math.max(anchor.position, currentPosition)
              );
            }}
            onPointerUp={(event) => {
              dragAnchorRef.current = null;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
            }}
            onPointerCancel={() => {
              dragAnchorRef.current = null;
              dragMovedRef.current = false;
            }}
            role="gridcell"
            style={{
              backgroundImage: missingTail
                ? "repeating-linear-gradient(135deg, transparent 0 3px, rgba(148,163,184,.22) 3px 4px)"
                : undefined,
              fontSize: settings.fontSize,
              height: settings.cellHeight,
              transform: `translateX(${virtualColumn.start}px)`,
              width: settings.cellWidth
            }}
            type="button"
            tabIndex={-1}
          >
            {settings.showCharacters ? base : ""}
          </button>
        );
      })}
    </div>
  );
}

function CoordinateRuler({
  alignmentLength,
  coordinateMode,
  renderColumns,
  reference,
  selectedRange,
  settings,
  totalWidth,
}: {
  alignmentLength: number;
  coordinateMode: "alignment" | "reference";
  renderColumns: RenderColumn[];
  reference: MSASequence | null;
  selectedRange: ColumnRange | null;
  settings: MsaViewSettings;
  totalWidth: number;
}) {
  const referenceMap = useMemo(
    () => (reference ? buildReferenceCoordinateMap(reference.sequence) : null),
    [reference]
  );
  return (
    <div className="relative shrink-0" style={{ height: settings.cellHeight, width: totalWidth }}>
      {renderColumns.map(({ virtualColumn, position }) => {
        const referenceCoordinate = coordinateMode === "reference" && referenceMap
          ? referenceMap.alignmentToReferenceCoordinate[position - 1] ?? null
          : null;
        const coordinate = referenceCoordinate?.kind === "base"
          ? referenceCoordinate.position
          : coordinateMode === "alignment"
            ? position
            : null;
        const coordinateLabel = referenceCoordinate?.label ?? String(position);
        const lastCoordinate = coordinateMode === "reference" && referenceMap
          ? referenceMap.referenceLength
          : alignmentLength;
        const showMarker = referenceCoordinate?.kind === "insertion" || (
          coordinate !== null && (
            coordinate === 1 ||
            coordinate === lastCoordinate ||
            coordinate % settings.markerEvery === 0
          )
        );
        const inRange = selectedRange
          ? position >= selectedRange.start && position <= selectedRange.end
          : false;
        return (
          <span
            className={cn(
              "absolute left-0 top-0 inline-flex items-center justify-center border-b border-slate-200 font-mono text-[10px]",
              inRange ? "bg-teal-50" : "",
              showMarker ? "text-slate-700" : "text-transparent"
            )}
            key={position}
            style={{
              fontSize: Math.max(9, settings.fontSize - 2),
              height: settings.cellHeight,
              transform: `translateX(${virtualColumn.start}px)`,
              width: settings.cellWidth
            }}
          >
            {showMarker ? coordinateLabel : "."}
          </span>
        );
      })}
    </div>
  );
}

export type MsaDomMatrixMetrics = {
  columnContentWidth: number;
  matrixWidth: number;
};

export function MsaDomMatrix({
  activeTracks,
  alignmentLength,
  analysisRowKeys,
  colorScheme,
  consensus,
  coordinateMode,
  differenceMode,
  motifPositionMap,
  onHideSequence,
  onNavigate,
  onPinSequence,
  onRangeSelect,
  onSelect,
  onSelectSequence,
  onSetReference,
  onZoomGesture,
  pinnedSequenceIds,
  rangeSelectionMode = false,
  reference,
  referenceActionsEnabled = true,
  scrollRef,
  selectedRange,
  selectedSequenceIds,
  selection,
  sequences,
  showConsensus = true,
  settings,
  stats,
  visiblePositions
}: {
  activeTracks: MsaTrackId[];
  alignmentLength: number;
  analysisRowKeys?: ReadonlySet<string>;
  colorScheme: MSAColorScheme;
  consensus: string;
  coordinateMode: "alignment" | "reference";
  differenceMode: boolean;
  motifPositionMap: Map<string, Set<number>>;
  onHideSequence: (rowKey: string) => void;
  onNavigate: (deltaRow: number, deltaColumn: number, extendRange: boolean) => void;
  onPinSequence: (rowKey: string) => void;
  onRangeSelect: (rowKey: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  onSelectSequence: (rowKey: string) => void;
  onSetReference: (rowKey: string) => void;
  onZoomGesture?: (scaleFactor: number) => void;
  pinnedSequenceIds: Set<string>;
  rangeSelectionMode?: boolean;
  reference: MSASequence | null;
  referenceActionsEnabled?: boolean;
  scrollRef: RefObject<HTMLDivElement>;
  selectedRange: ColumnRange | null;
  selectedSequenceIds: Set<string>;
  selection: CellSelection | null;
  sequences: MSASequence[];
  showConsensus?: boolean;
  settings: MsaViewSettings;
  stats: ColumnStatsStoreV1 | ColumnStats[] | null;
  visiblePositions: ColumnPositionView | number[];
}) {
  const { dictionary: d } = useLanguage();
  const coarsePointer = useCoarsePointer();
  const reactGridId = useId();
  const gridId = `msa-grid-${reactGridId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    markMsaPerformance(MSA_PERFORMANCE_MARKS.matrixMounted);
    let firstFrame = 0;
    let secondFrame = 0;
    let cancelled = false;
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          if (!cancelled && scrollRef.current?.tabIndex === 0) {
            markMsaPerformance(MSA_PERFORMANCE_MARKS.viewerInteractive);
          }
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [gridId, scrollRef]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragAnchorRef = useRef<{ rowKey: string; position: number } | null>(null);
  const dragMovedRef = useRef(false);
  const touchPointsRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistanceRef = useRef<number | null>(null);
  const positionView = useMemo(
    () => Array.isArray(visiblePositions)
      ? filteredColumnPositionView(visiblePositions)
      : visiblePositions,
    [visiblePositions]
  );
  const pitch = settings.cellWidth + settings.cellGap;
  const columnVirtualizer = useVirtualizer({
    count: positionView.length,
    estimateSize: () => pitch,
    getScrollElement: () => scrollRef.current,
    horizontal: true,
    overscan: Math.ceil((settings.labelWidth + 24) / pitch) + 8
  });
  const rowVirtualizer = useVirtualizer({
    count: sequences.length,
    estimateSize: () => settings.rowHeight,
    getScrollElement: () => scrollRef.current,
    overscan: settings.showCharacters ? 10 : 4
  });
  useEffect(() => {
    // Coarse-pointer and zoom changes must invalidate cached column sizes.
    columnVirtualizer.measure();
  }, [columnVirtualizer, pitch]);
  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, settings.rowHeight]);
  const virtualColumns = columnVirtualizer.getVirtualItems();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const columnContentWidth = columnVirtualizer.getTotalSize();
  const matrixWidth = settings.labelWidth + 24 + columnContentWidth;
  const renderColumns = useMemo(() => virtualColumns.flatMap((virtualColumn) => {
    const position = positionAt(positionView, virtualColumn.index);
    if (position === undefined) return [];
    const column = Array.isArray(stats)
      ? stats[position - 1] ?? null
      : stats
        ? columnStatsAtPosition(stats, position)
        : null;
    return [{ virtualColumn, position, stats: column }];
  }), [positionView, stats, virtualColumns]);
  const headerHeight = (1 + activeTracks.length) * settings.rowHeight;
  const sequenceRows = useMemo(
    () =>
      sequences.map((sequence, index) => ({
        sequence,
        rowKey: matrixSequenceRowKey(sequence, index)
      })),
    [sequences]
  );
  const sequenceRowIndexByKey = useMemo(
    () => new Map(sequenceRows.map((row, index) => [row.rowKey, index])),
    [sequenceRows]
  );
  const sequenceRowKeyByObject = useMemo(
    () => new Map(sequenceRows.map((row) => [row.sequence, row.rowKey])),
    [sequenceRows]
  );
  const referenceRowKey = reference
    ? sequenceRowKeyByObject.get(reference) ??
      matrixSequenceRowKey(reference, reference.originalIndex ?? 0)
    : null;
  const selectedRowKey = selectionRowKey(selection);
  const activeSequenceRowIndex = selection
    ? sequenceRowIndexByKey.get(selectedRowKey ?? "") ?? -1
    : -1;
  const activeSequenceRow = activeSequenceRowIndex >= 0
    ? sequenceRows[activeSequenceRowIndex]
    : null;
  const activeBase = selection && activeSequenceRow
    ? activeSequenceRow.sequence.sequence[selection.position - 1] ?? ""
    : selection && selectedRowKey === CONSENSUS_ROW_KEY
      ? consensus[selection.position - 1] ?? ""
      : "";
  const activeLabel = selection
    ? activeSequenceRow
      ? `${activeSequenceRow.sequence.id}; ${d.results.viewer.position} ${selection.position}; ${activeBase || d.results.viewer.emptyCell}`
      : `${selectedRowKey ?? "row"}; ${d.results.viewer.position} ${selection.position}`
    : "";
  const activeTrackIndexById = useMemo(
    () => new Map(activeTracks.map((track, index) => [track, index])),
    [activeTracks]
  );
  const activeTrackIndex = selectedRowKey?.startsWith("track:")
    ? activeTrackIndexById.get(
        selectedRowKey.slice("track:".length) as MsaTrackId
      ) ?? -1
    : -1;
  const activeRowIndex = activeSequenceRowIndex >= 0
    ? activeTracks.length + activeSequenceRowIndex + 1
    : activeTrackIndex >= 0
      ? activeTrackIndex + 1
      : selectedRowKey === CONSENSUS_ROW_KEY
        ? sequenceRows.length + activeTracks.length + 1
        : undefined;
  const activeColumnOffset = selection
    ? visibleIndexOfPosition(positionView, selection.position)
    : -1;
  const activeColumnIndex = activeColumnOffset >= 0
    ? activeColumnOffset + 2
    : undefined;
  const activeDescendantId = selection && activeRowIndex !== undefined && activeColumnIndex !== undefined
    ? `${gridId}-active-${selection.position}-${activeSequenceRowIndex}`
    : undefined;

  useEffect(() => {
    const clearDrag = () => {
      dragAnchorRef.current = null;
    };
    window.addEventListener("pointerup", clearDrag);
    return () => window.removeEventListener("pointerup", clearDrag);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    viewport.querySelectorAll<HTMLElement>("[data-msa-cell='true']").forEach((cell) => {
      cell.tabIndex = -1;
    });
  }, [activeTracks, settings.showCharacters, virtualColumns, virtualRows]);

  function focusGrid() {
    scrollRef.current?.focus({ preventScroll: true });
  }

  function handleMatrixKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && target.dataset.msaCell !== "true") {
      return;
    }
    const pageRows = Math.max(
      1,
      Math.floor(
        Math.max(settings.rowHeight, event.currentTarget.clientHeight - headerHeight) /
          settings.rowHeight
      )
    );
    const delta = matrixNavigationDelta({
      key: event.key,
      pageRows,
      visibleColumnCount: positionView.length
    });
    if (delta) {
      event.preventDefault();
      onNavigate(delta.row, delta.column, event.shiftKey);
      return;
    }
    const activeRowKey = activeSequenceRow?.rowKey;
    if (!activeRowKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const shortcut = event.key.toLocaleLowerCase();
    if (shortcut === " ") {
      event.preventDefault();
      onSelectSequence(activeRowKey);
    } else if (shortcut === "p" && activeRowKey !== referenceRowKey) {
      event.preventDefault();
      onPinSequence(activeRowKey);
    } else if (shortcut === "r" && referenceActionsEnabled) {
      event.preventDefault();
      onSetReference(activeRowKey);
    } else if (shortcut === "h" && activeRowKey !== referenceRowKey) {
      event.preventDefault();
      onHideSequence(activeRowKey);
    }
  }

  function updatePinch(pointerId: number, x: number, y: number) {
    touchPointsRef.current.set(pointerId, { x, y });
    const points = Array.from(touchPointsRef.current.values());
    if (points.length !== 2) return;
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const previous = pinchDistanceRef.current;
    if (previous && distance > 0) {
      const factor = distance / previous;
      if (factor >= 1.08 || factor <= 0.92) {
        onZoomGesture?.(factor);
        pinchDistanceRef.current = distance;
      }
    } else {
      pinchDistanceRef.current = distance;
    }
  }

  function releaseTouch(pointerId: number) {
    touchPointsRef.current.delete(pointerId);
    if (touchPointsRef.current.size < 2) pinchDistanceRef.current = null;
  }

  return (
    <div
      className="relative h-full min-h-0"
      ref={viewportRef}
        onPointerCancelCapture={(event) => releaseTouch(event.pointerId)}
        onPointerDownCapture={(event) => {
          if (event.pointerType === "touch") updatePinch(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerMoveCapture={(event) => {
          if (event.pointerType === "touch" && touchPointsRef.current.has(event.pointerId)) {
            updatePinch(event.pointerId, event.clientX, event.clientY);
          }
        }}
        onPointerUpCapture={(event) => releaseTouch(event.pointerId)}
    >
      <p className="sr-only" id={`${gridId}-shortcut-help`}>
        {d.results.viewer.stageTwo.shortcutHint}
      </p>
      <div
        aria-activedescendant={activeDescendantId}
        aria-colcount={positionView.length + 1}
        aria-describedby={`${gridId}-shortcut-help`}
        aria-keyshortcuts="Space P R H"
        aria-label={d.results.viewer.matrixNavigation}
        aria-rowcount={sequenceRows.length + activeTracks.length + (showConsensus ? 1 : 0)}
        className="h-full min-h-0 overflow-auto outline-none focus:ring-2 focus:ring-inset focus:ring-teal-100"
        data-msa-scroll-viewport="true"
        id={gridId}
        onKeyDown={handleMatrixKeyDown}
        ref={scrollRef}
        role="grid"
        style={{ touchAction: rangeSelectionMode ? "none" : "pan-x pan-y" }}
        tabIndex={0}
      >
        {activeDescendantId ? (
          <span
            aria-rowindex={activeRowIndex}
            className="sr-only"
            role="row"
          >
            <span
              aria-colindex={activeColumnIndex}
              id={activeDescendantId}
              role="gridcell"
            >
              {activeLabel}
            </span>
          </span>
        ) : null}
        <div style={{ minWidth: "100%", width: matrixWidth }}>
          <div
            className="sticky top-0 z-30 grid border-b border-slate-200 bg-slate-50/95"
            style={{ gridTemplateColumns: `${settings.labelWidth}px 1fr` }}
          >
            <div
              className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500"
              style={{ height: settings.rowHeight }}
            >
              {coordinateMode === "reference" && reference
                ? d.results.viewer.stageTwo.referencePosition
                : d.results.viewer.position}
            </div>
            <div className="flex items-center px-3">
              <CoordinateRuler
                alignmentLength={alignmentLength}
                coordinateMode={coordinateMode}
                renderColumns={renderColumns}
                reference={reference}
                selectedRange={selectedRange}
                settings={settings}
                totalWidth={columnContentWidth}
              />
            </div>
          </div>

          {activeTracks.map((track, trackIndex) => (
            <div
              aria-rowindex={trackIndex + 1}
              className="sticky z-20 grid border-b border-slate-200 bg-white"
              key={track}
              role="row"
              style={{
                gridTemplateColumns: `${settings.labelWidth}px 1fr`,
                top: (trackIndex + 1) * settings.rowHeight
              }}
            >
              <div
                className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-3 text-xs font-medium text-slate-500"
                role="rowheader"
                style={{ height: settings.rowHeight }}
              >
                {d.results.viewer.stageTwo.tracks[track]}
              </div>
              <div
                aria-colindex={2}
                className="flex items-center px-3"
                role="gridcell"
                style={{ height: settings.rowHeight }}
              >
                <MsaStatisticTrack
                  renderColumns={renderColumns}
                  onSelect={onSelect}
                  selectedRange={selectedRange}
                  selection={selection}
                  settings={settings}
                  totalWidth={columnContentWidth}
                  track={track}
                />
              </div>
            </div>
          ))}

          <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), width: matrixWidth }}>
            {virtualRows.map((virtualRow) => {
              const sequenceRow = sequenceRows[virtualRow.index];
              if (!sequenceRow) {
                return null;
              }
              const { rowKey, sequence } = sequenceRow;
              const isReference = referenceRowKey === rowKey;
              const isPinned = pinnedSequenceIds.has(rowKey);
              const isSelected = selectedSequenceIds.has(rowKey);
              return (
                <div
                  aria-rowindex={activeTracks.length + virtualRow.index + 1}
                  className="absolute left-0 top-0 grid border-b border-slate-100"
                  data-index={virtualRow.index}
                  data-msa-row-key={rowKey}
                  key={rowKey}
                  ref={rowVirtualizer.measureElement}
                  role="row"
                  style={{
                    gridTemplateColumns: `${settings.labelWidth}px 1fr`,
                    height: settings.rowHeight,
                    transform: `translateY(${virtualRow.start}px)`,
                    width: matrixWidth
                  }}
                >
                  <div
                    className={cn(
                      "sticky left-0 z-20 flex items-center gap-1 border-r border-slate-200 px-2 font-mono text-xs font-medium text-slate-700",
                      isReference
                        ? "bg-amber-50 text-amber-950"
                        : selectedRowKey === rowKey
                          ? "bg-teal-50 text-teal-950"
                          : "bg-white"
                    )}
                    role="rowheader"
                    style={{ height: settings.rowHeight }}
                  >
                    {settings.showCharacters && !coarsePointer ? (
                      <button
                        aria-label={`${d.results.viewer.stageTwo.selectSequence} ${sequence.id}`}
                        aria-pressed={isSelected}
                        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900 sm:inline-flex sm:h-8 sm:w-8"
                        onClick={() => onSelectSequence(rowKey)}
                        tabIndex={-1}
                        type="button"
                      >
                        {isSelected ? <SquareCheckBig className="h-3.5 w-3.5 text-teal-700" /> : <Square className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate" title={sequence.id}>{sequence.id}</span>
                    {isPinned && <Pin size={12} className="shrink-0 text-teal-700" aria-label={d.results.viewer.stageTwo.pinSequence}/>}
                    {isReference && <Flag size={12} className="shrink-0 text-amber-700" aria-label={d.results.viewer.stageTwo.setReference}/>}
                    {settings.showCharacters && <MsaRowMenu label={d.results.viewer.stageTwo.rowActions.replace("{name}", sequence.id)}
                      actions={[
                        {label:d.results.viewer.stageTwo.selectSequence,active:isSelected,run:() => onSelectSequence(rowKey)},
                        {label:isPinned ? d.results.viewer.stageTwo.unpinSequence : d.results.viewer.stageTwo.pinSequence,active:isPinned,disabled:isReference,run:() => onPinSequence(rowKey)},
                        ...(referenceActionsEnabled ? [{label:d.results.viewer.stageTwo.setReference,active:isReference,run:() => onSetReference(rowKey)}] : []),
                        {label:d.results.viewer.hideSequence,disabled:isReference,run:() => onHideSequence(rowKey)}
                      ]}/>}
         </div>
                  <div className="flex items-center px-3" style={{ height: settings.rowHeight }}>
                    {settings.showCharacters ? (
                      <SequenceCells
                        colorScheme={colorScheme}
                        differenceMode={differenceMode && (!analysisRowKeys || analysisRowKeys.has(rowKey))}
                        dragAnchorRef={dragAnchorRef}
                        dragMovedRef={dragMovedRef}
                        focusGrid={focusGrid}
                        motifPositions={motifPositionMap.get(rowKey)}
                        onRangeSelect={onRangeSelect}
                        onSelect={onSelect}
                        positionView={positionView}
                        renderColumns={renderColumns}
                        rangeSelectionMode={rangeSelectionMode}
                        reference={reference}
                        selectedRange={selectedRange}
                        selection={selection}
                        sequence={sequence}
                        sequenceRowKey={rowKey}
                        settings={settings}
                        totalWidth={columnContentWidth}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {showConsensus ? <div
            aria-rowindex={sequenceRows.length + activeTracks.length + 1}
            className="grid border-t border-slate-300 bg-teal-50/70"
            role="row"
            style={{ gridTemplateColumns: `${settings.labelWidth}px 1fr` }}
          >
            <div
              className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-teal-50 px-3 font-mono text-xs font-semibold text-teal-900"
              role="rowheader"
              style={{ height: settings.rowHeight + 4 }}
            >
              {d.results.viewer.consensus}
            </div>
            <div className="flex items-center px-3" style={{ height: settings.rowHeight + 4 }}>
              {settings.showCharacters ? (
                <SequenceCells
                  colorScheme={colorScheme}
                  differenceMode={false}
                  dragAnchorRef={dragAnchorRef}
                  dragMovedRef={dragMovedRef}
                  focusGrid={focusGrid}
                  onRangeSelect={onRangeSelect}
                  onSelect={onSelect}
                  positionView={positionView}
                  renderColumns={renderColumns}
                  rangeSelectionMode={rangeSelectionMode}
                  reference={null}
                  selectedRange={selectedRange}
                  selection={selection}
                  sequence={{
                    id: d.results.viewer.consensus,
                    originalIndex: sequenceRows.length,
                    rowKey: CONSENSUS_ROW_KEY,
                    sequence: consensus
                  }}
                  sequenceRowKey={CONSENSUS_ROW_KEY}
                  settings={settings}
                  totalWidth={columnContentWidth}
                />
              ) : null}
            </div>
          </div> : null}
        </div>
      </div>

      {!settings.showCharacters && activeSequenceRow ? (
        <details className="absolute left-2 top-12 z-[55]">
          <summary
            aria-label={d.results.viewer.stageTwo.rowActions.replace("{name}", activeSequenceRow.sequence.id)}
            className="flex h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [&::-webkit-details-marker]:hidden"
          >
            <MoreHorizontal className="h-4 w-4" />
          </summary>
          <div className="mt-1 grid min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
            <button className="min-h-11 rounded px-3 text-left text-xs hover:bg-slate-100" onClick={() => onSelectSequence(activeSequenceRow.rowKey)} type="button">
              {d.results.viewer.stageTwo.selectSequence}
            </button>
            <button className="min-h-11 rounded px-3 text-left text-xs hover:bg-slate-100 disabled:opacity-40" disabled={activeSequenceRow.rowKey === referenceRowKey} onClick={() => onPinSequence(activeSequenceRow.rowKey)} type="button">
              {pinnedSequenceIds.has(activeSequenceRow.rowKey) ? d.results.viewer.stageTwo.unpinSequence : d.results.viewer.stageTwo.pinSequence}
            </button>
            {referenceActionsEnabled ? (
              <button className="min-h-11 rounded px-3 text-left text-xs hover:bg-amber-50" onClick={() => onSetReference(activeSequenceRow.rowKey)} type="button">
                {d.results.viewer.stageTwo.setReference}
              </button>
            ) : null}
            <button className="min-h-11 rounded px-3 text-left text-xs hover:bg-slate-100 disabled:opacity-40" disabled={activeSequenceRow.rowKey === referenceRowKey} onClick={() => onHideSequence(activeSequenceRow.rowKey)} type="button">
              {d.results.viewer.hideSequence}
            </button>
          </div>
        </details>
      ) : null}

      {!settings.showCharacters ? (
        <MsaCanvasMatrix
          colorScheme={colorScheme}
          columns={stats}
          differenceMode={differenceMode}
          differenceRowKeys={analysisRowKeys}
          headerHeight={headerHeight}
          motifPositionMap={motifPositionMap}
          onNavigate={onNavigate}
          onRangeSelect={onRangeSelect}
          onSelect={(next) => onSelect(next)}
          rangeSelectionMode={rangeSelectionMode}
          reference={reference}
          scrollRef={scrollRef}
          selectedRange={selectedRange}
          selection={selection}
          sequences={sequences}
          settings={settings}
          viewportRef={viewportRef}
          visiblePositions={positionView}
        />
      ) : null}
    </div>
  );
}
