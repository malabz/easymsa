import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { EyeOff, Flag, Pin, PinOff, Square, SquareCheckBig } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
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
import { differenceColorClass } from "./differenceColors";
import { MsaCanvasMatrix } from "./MsaCanvasMatrix";
import { MsaStatisticTrack } from "./MsaStatisticTrack";
import type {
  CellSelection,
  ColumnRange,
  ColumnStats,
  MsaTrackId,
  MsaViewSettings
} from "./types";

function SequenceCells({
  colorScheme,
  columns,
  differenceMode,
  dragAnchorRef,
  dragMovedRef,
  motifPositions,
  onRangeSelect,
  onSelect,
  positions,
  reference,
  selectedRange,
  selection,
  sequence,
  settings,
  totalWidth,
  virtualColumns
}: {
  colorScheme: MSAColorScheme;
  columns: ColumnStats[];
  differenceMode: boolean;
  dragAnchorRef: { current: { sequenceId: string; position: number } | null };
  dragMovedRef: { current: boolean };
  motifPositions?: Set<number>;
  onRangeSelect: (sequenceId: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  positions: number[];
  reference: MSASequence | null;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  sequence: MSASequence;
  settings: MsaViewSettings;
  totalWidth: number;
  virtualColumns: VirtualItem[];
}) {
  return (
    <div className="relative shrink-0" style={{ height: settings.cellHeight, width: totalWidth }}>
      {virtualColumns.map((virtualColumn) => {
        const position = positions[virtualColumn.index];
        if (!position) {
          return null;
        }
        const base = sequence.sequence[position - 1] ?? "";
        const referenceBase = reference?.sequence[position - 1] ?? "";
        const selectedRow = selection?.sequenceId === sequence.id;
        const selectedColumn = selection?.position === position;
        const selectedCell = selectedRow && selectedColumn;
        const inSelectedRange = selectedRange
          ? position >= selectedRange.start && position <= selectedRange.end
          : false;
        const motifHit = motifPositions?.has(position) ?? false;
        const colorClass = differenceMode && reference
          ? differenceColorClass(classifyDifference(base, referenceBase))
          : msaCellColorClass(base, colorScheme, columns[position - 1]);

        return (
          <button
            aria-label={`${sequence.id} position ${position} ${base || "empty"}`}
            className={cn(
              "absolute left-0 top-0 inline-flex items-center justify-center font-mono font-semibold outline-none transition",
              settings.showCharacters ? "rounded border" : "border-0",
              colorClass,
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
            data-msa-sequence-cell="true"
            key={`${position}-${base}`}
            onClick={(event) => {
              if (dragMovedRef.current) {
                dragMovedRef.current = false;
                return;
              }
              onSelect({ sequenceId: sequence.id, position }, event.shiftKey);
            }}
            onPointerDown={() => {
              dragMovedRef.current = false;
              dragAnchorRef.current = { sequenceId: sequence.id, position };
            }}
            onPointerEnter={(event: ReactPointerEvent<HTMLButtonElement>) => {
              const anchor = dragAnchorRef.current;
              if (!anchor || event.buttons !== 1) {
                return;
              }
              if (anchor.position !== position) {
                dragMovedRef.current = true;
              }
              onRangeSelect(
                sequence.id,
                Math.min(anchor.position, position),
                Math.max(anchor.position, position)
              );
            }}
            style={{
              fontSize: settings.fontSize,
              height: settings.cellHeight,
              transform: `translateX(${virtualColumn.start}px)`,
              width: settings.cellWidth
            }}
            type="button"
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
  positions,
  reference,
  selectedRange,
  settings,
  totalWidth,
  virtualColumns
}: {
  alignmentLength: number;
  coordinateMode: "alignment" | "reference";
  positions: number[];
  reference: MSASequence | null;
  selectedRange: ColumnRange | null;
  settings: MsaViewSettings;
  totalWidth: number;
  virtualColumns: VirtualItem[];
}) {
  const referenceMap = useMemo(
    () => (reference ? buildReferenceCoordinateMap(reference.sequence) : null),
    [reference]
  );
  return (
    <div className="relative shrink-0" style={{ height: settings.cellHeight, width: totalWidth }}>
      {virtualColumns.map((virtualColumn) => {
        const position = positions[virtualColumn.index];
        if (!position) {
          return null;
        }
        const coordinate = coordinateMode === "reference" && referenceMap
          ? referenceMap.alignmentToReference[position - 1]
          : position;
        const lastCoordinate = coordinateMode === "reference" && referenceMap
          ? referenceMap.referenceLength
          : alignmentLength;
        const showMarker = coordinate !== null && (
          coordinate === 1 ||
          coordinate === lastCoordinate ||
          coordinate % settings.markerEvery === 0
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
            {showMarker ? coordinate : "."}
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
  pinnedSequenceIds,
  reference,
  scrollRef,
  selectedRange,
  selectedSequenceIds,
  selection,
  sequences,
  settings,
  stats,
  visiblePositions
}: {
  activeTracks: MsaTrackId[];
  alignmentLength: number;
  colorScheme: MSAColorScheme;
  consensus: string;
  coordinateMode: "alignment" | "reference";
  differenceMode: boolean;
  motifPositionMap: Map<string, Set<number>>;
  onHideSequence: (sequenceId: string) => void;
  onNavigate: (deltaRow: number, deltaColumn: number, extendRange: boolean) => void;
  onPinSequence: (sequenceId: string) => void;
  onRangeSelect: (sequenceId: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection, extendRange?: boolean) => void;
  onSelectSequence: (sequenceId: string) => void;
  onSetReference: (sequenceId: string) => void;
  pinnedSequenceIds: Set<string>;
  reference: MSASequence | null;
  scrollRef: RefObject<HTMLDivElement>;
  selectedRange: ColumnRange | null;
  selectedSequenceIds: Set<string>;
  selection: CellSelection | null;
  sequences: MSASequence[];
  settings: MsaViewSettings;
  stats: ColumnStats[];
  visiblePositions: number[];
}) {
  const { dictionary: d } = useLanguage();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragAnchorRef = useRef<{ sequenceId: string; position: number } | null>(null);
  const dragMovedRef = useRef(false);
  const pitch = settings.cellWidth + settings.cellGap;
  const columnVirtualizer = useVirtualizer({
    count: visiblePositions.length,
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
  const virtualColumns = columnVirtualizer.getVirtualItems();
  const virtualRows = rowVirtualizer.getVirtualItems();
  const columnContentWidth = columnVirtualizer.getTotalSize();
  const matrixWidth = settings.labelWidth + 24 + columnContentWidth;
  const visibleStats = useMemo(
    () => visiblePositions.map((position) => stats[position - 1]).filter(Boolean),
    [stats, visiblePositions]
  );
  const headerHeight = (1 + activeTracks.length) * settings.rowHeight;

  useEffect(() => {
    const clearDrag = () => {
      dragAnchorRef.current = null;
    };
    window.addEventListener("pointerup", clearDrag);
    return () => window.removeEventListener("pointerup", clearDrag);
  }, []);

  function handleMatrixKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target !== event.currentTarget && target.dataset.msaCell !== "true") {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      onNavigate(0, event.key === "ArrowLeft" ? -1 : 1, event.shiftKey);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onNavigate(event.key === "ArrowUp" ? -1 : 1, 0, event.shiftKey);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onNavigate(
        0,
        event.key === "Home" ? -visiblePositions.length : visiblePositions.length,
        event.shiftKey
      );
    }
  }

  return (
    <div className="relative" ref={viewportRef}>
      <div
        aria-label={d.results.viewer.matrixNavigation}
        className="max-h-[36rem] overflow-auto rounded-lg outline-none focus:ring-2 focus:ring-teal-100"
        data-msa-scroll-viewport="true"
        onKeyDown={handleMatrixKeyDown}
        ref={scrollRef}
        tabIndex={settings.showCharacters ? 0 : -1}
      >
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
                positions={visiblePositions}
                reference={reference}
                selectedRange={selectedRange}
                settings={settings}
                totalWidth={columnContentWidth}
                virtualColumns={virtualColumns}
              />
            </div>
          </div>

          {activeTracks.map((track, trackIndex) => (
            <div
              className="sticky z-20 grid border-b border-slate-200 bg-white"
              key={track}
              style={{
                gridTemplateColumns: `${settings.labelWidth}px 1fr`,
                top: (trackIndex + 1) * settings.rowHeight
              }}
            >
              <div
                className="sticky left-0 z-10 flex items-center border-r border-slate-200 bg-white px-3 text-xs font-medium text-slate-500"
                style={{ height: settings.rowHeight }}
              >
                {d.results.viewer.stageTwo.tracks[track]}
              </div>
              <div className="flex items-center px-3" style={{ height: settings.rowHeight }}>
                <MsaStatisticTrack
                  columns={visibleStats}
                  onSelect={onSelect}
                  selectedRange={selectedRange}
                  selection={selection}
                  settings={settings}
                  totalWidth={columnContentWidth}
                  track={track}
                  virtualColumns={virtualColumns}
                />
              </div>
            </div>
          ))}

          <div className="relative" style={{ height: rowVirtualizer.getTotalSize(), width: matrixWidth }}>
            {virtualRows.map((virtualRow) => {
              const sequence = sequences[virtualRow.index];
              if (!sequence) {
                return null;
              }
              const isReference = reference?.id === sequence.id;
              const isPinned = pinnedSequenceIds.has(sequence.id);
              const isSelected = selectedSequenceIds.has(sequence.id);
              return (
                <div
                  className="absolute left-0 top-0 grid border-b border-slate-100"
                  data-index={virtualRow.index}
                  key={sequence.id}
                  ref={rowVirtualizer.measureElement}
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
                        : selection?.sequenceId === sequence.id
                          ? "bg-teal-50 text-teal-950"
                          : "bg-white"
                    )}
                    style={{ height: settings.rowHeight }}
                  >
                    {settings.showCharacters ? (
                      <button
                        aria-label={`${d.results.viewer.stageTwo.selectSequence} ${sequence.id}`}
                        aria-pressed={isSelected}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => onSelectSequence(sequence.id)}
                        type="button"
                      >
                        {isSelected ? <SquareCheckBig className="h-3.5 w-3.5 text-teal-700" /> : <Square className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate" title={sequence.id}>{sequence.id}</span>
                    {settings.showCharacters ? (
                      <>
                        <button
                          aria-label={`${isPinned ? d.results.viewer.stageTwo.unpinSequence : d.results.viewer.stageTwo.pinSequence} ${sequence.id}`}
                          aria-pressed={isPinned}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                          disabled={isReference}
                          onClick={() => onPinSequence(sequence.id)}
                          type="button"
                        >
                          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          aria-label={`${d.results.viewer.stageTwo.setReference} ${sequence.id}`}
                          aria-pressed={isReference}
                          className={cn(
                            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-amber-100",
                            isReference ? "text-amber-700" : "text-slate-400"
                          )}
                          onClick={() => onSetReference(sequence.id)}
                          type="button"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label={`${d.results.viewer.hideSequence} ${sequence.id}`}
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                          disabled={isReference}
                          onClick={() => onHideSequence(sequence.id)}
                          type="button"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center px-3" style={{ height: settings.rowHeight }}>
                    {settings.showCharacters ? (
                      <SequenceCells
                        colorScheme={colorScheme}
                        columns={stats}
                        differenceMode={differenceMode}
                        dragAnchorRef={dragAnchorRef}
                        dragMovedRef={dragMovedRef}
                        motifPositions={motifPositionMap.get(sequence.id)}
                        onRangeSelect={onRangeSelect}
                        onSelect={onSelect}
                        positions={visiblePositions}
                        reference={reference}
                        selectedRange={selectedRange}
                        selection={selection}
                        sequence={sequence}
                        settings={settings}
                        totalWidth={columnContentWidth}
                        virtualColumns={virtualColumns}
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className="grid border-t border-slate-300 bg-teal-50/70"
            style={{ gridTemplateColumns: `${settings.labelWidth}px 1fr` }}
          >
            <div
              className="sticky left-0 z-20 flex items-center border-r border-slate-200 bg-teal-50 px-3 font-mono text-xs font-semibold text-teal-900"
              style={{ height: settings.rowHeight + 4 }}
            >
              {d.results.viewer.consensus}
            </div>
            <div className="flex items-center px-3" style={{ height: settings.rowHeight + 4 }}>
              {settings.showCharacters ? (
                <SequenceCells
                  colorScheme={colorScheme}
                  columns={stats}
                  differenceMode={false}
                  dragAnchorRef={dragAnchorRef}
                  dragMovedRef={dragMovedRef}
                  onRangeSelect={onRangeSelect}
                  onSelect={onSelect}
                  positions={visiblePositions}
                  reference={null}
                  selectedRange={selectedRange}
                  selection={selection}
                  sequence={{ id: d.results.viewer.consensus, sequence: consensus }}
                  settings={settings}
                  totalWidth={columnContentWidth}
                  virtualColumns={virtualColumns}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {!settings.showCharacters ? (
        <MsaCanvasMatrix
          colorScheme={colorScheme}
          columns={stats}
          differenceMode={differenceMode}
          headerHeight={headerHeight}
          motifPositionMap={motifPositionMap}
          onNavigate={onNavigate}
          onRangeSelect={onRangeSelect}
          onSelect={(next) => onSelect(next)}
          reference={reference}
          scrollRef={scrollRef}
          selectedRange={selectedRange}
          selection={selection}
          sequences={sequences}
          settings={settings}
          viewportRef={viewportRef}
          visiblePositions={visiblePositions}
        />
      ) : null}
    </div>
  );
}
