import {
  useEffect,
  useMemo,
  useRef,
  type RefObject
} from "react";
import { msaCellColorStyle, type MSAColorScheme } from "../msa-export/exportColors";
import type { MSASequence } from "../../lib/types/msa";
import { classifyDifference } from "./analysis";
import { rowKeyForSequence } from "./alignmentModel";
import { differenceColorStyle } from "./differenceColors";
import {
  columnColorContextAtPosition,
  filteredColumnPositionView,
  positionAt
} from "./columnStatsStore";
import type {
  CellSelection,
  ColumnPositionView,
  ColumnRange,
  ColumnStats,
  ColumnStatsStoreV1,
  MsaViewSettings
} from "./types";

type CellLocation = {
  rowIndex: number;
  columnIndex: number;
  position: number;
};

type PointerGesture = {
  location: CellLocation;
  moved: boolean;
  pointerId: number;
  startScrollLeft: number;
  startScrollTop: number;
  startX: number;
  startY: number;
  touchPan: boolean;
};

function canvasSequenceRowKey(sequence: MSASequence, index: number) {
  return rowKeyForSequence(sequence, sequence.originalIndex ?? index);
}

function selectionRowKey(selection: CellSelection | null) {
  return selection?.rowKey ?? null;
}

function rowSelection(rowKey: string, position: number): CellSelection {
  return { rowKey, position };
}

export function canvasCellLocation({
  clientX,
  clientY,
  canvasLeft,
  canvasTop,
  scrollLeft,
  scrollTop,
  settings,
  visiblePositions,
  sequenceCount
}: {
  clientX: number;
  clientY: number;
  canvasLeft: number;
  canvasTop: number;
  scrollLeft: number;
  scrollTop: number;
  settings: MsaViewSettings;
  visiblePositions: number[];
  sequenceCount: number;
}): CellLocation | null {
  const pitch = settings.cellWidth + settings.cellGap;
  const columnIndex = Math.floor(
    (scrollLeft + clientX - canvasLeft - 12) / pitch
  );
  const rowIndex = Math.floor(
    (scrollTop + clientY - canvasTop) / settings.rowHeight
  );
  const position = visiblePositions[columnIndex];
  if (
    !position ||
    columnIndex < 0 ||
    rowIndex < 0 ||
    rowIndex >= sequenceCount
  ) {
    return null;
  }
  return { rowIndex, columnIndex, position };
}

export function MsaCanvasMatrix({
  colorScheme,
  columns,
  differenceMode,
  differenceRowKeys,
  headerHeight,
  motifPositionMap,
  onRangeSelect,
  onSelect,
  rangeSelectionMode = false,
  reference,
  scrollRef,
  selectedRange,
  selection,
  sequences,
  settings,
  viewportRef,
  visiblePositions
}: {
  colorScheme: MSAColorScheme;
  columns: ColumnStatsStoreV1 | ColumnStats[] | null;
  differenceMode: boolean;
  differenceRowKeys?: ReadonlySet<string>;
  headerHeight: number;
  motifPositionMap: Map<string, Set<number>>;
  onNavigate: (deltaRow: number, deltaColumn: number, extendRange: boolean) => void;
  onRangeSelect: (rowKey: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection) => void;
  rangeSelectionMode?: boolean;
  reference: MSASequence | null;
  scrollRef: RefObject<HTMLDivElement>;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  sequences: MSASequence[];
  settings: MsaViewSettings;
  viewportRef: RefObject<HTMLDivElement>;
  visiblePositions: ColumnPositionView | number[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const gestureRef = useRef<PointerGesture | null>(null);
  const positionView = useMemo(
    () => Array.isArray(visiblePositions)
      ? filteredColumnPositionView(visiblePositions)
      : visiblePositions,
    [visiblePositions]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !scrollElement || !viewport) {
      return;
    }

    const draw = () => {
      frameRef.current = null;
      const bounds = viewport.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width - settings.labelWidth - 16));
      const height = Math.max(1, Math.round(bounds.height - headerHeight - 16));
      // Keep CSS dimensions independent of the high-DPI backing buffer.
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);

      const pitch = settings.cellWidth + settings.cellGap;
      const matrixScrollTop = Math.max(0, scrollElement.scrollTop - headerHeight);
      const firstColumn = Math.max(0, Math.floor((scrollElement.scrollLeft - 12) / pitch));
      const lastColumn = Math.min(
        positionView.length - 1,
        Math.ceil((scrollElement.scrollLeft + width) / pitch) + 1
      );
      const firstRow = Math.max(0, Math.floor(matrixScrollTop / settings.rowHeight));
      const lastRow = Math.min(
        sequences.length - 1,
        Math.ceil((matrixScrollTop + height) / settings.rowHeight) + 1
      );

      const renderColumns = [] as Array<{
        columnIndex: number;
        position: number;
        colorContext: ColumnStats | ReturnType<typeof columnColorContextAtPosition>;
      }>;
      for (let columnIndex = firstColumn; columnIndex <= lastColumn; columnIndex += 1) {
        const position = positionAt(positionView, columnIndex);
        if (position === undefined) continue;
        renderColumns.push({
          columnIndex,
          position,
          colorContext: Array.isArray(columns)
            ? columns[position - 1] ?? null
            : columns
              ? columnColorContextAtPosition(columns, position)
              : null
        });
      }

      for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
        const sequence = sequences[rowIndex];
        if (!sequence) {
          continue;
        }
        const y = rowIndex * settings.rowHeight - matrixScrollTop +
          Math.max(0, (settings.rowHeight - settings.cellHeight) / 2);
        for (const { columnIndex, position, colorContext } of renderColumns) {
          const missingTail = position > sequence.sequence.length;
          const base = sequence.sequence[position - 1] ?? "";
          const referenceBase = reference?.sequence[position - 1] ?? "";
          const rowKey = canvasSequenceRowKey(sequence, rowIndex);
          const style = differenceMode && reference &&
              (!differenceRowKeys || differenceRowKeys.has(rowKey))
            ? differenceColorStyle(classifyDifference(base, referenceBase))
            : msaCellColorStyle(base, colorScheme, colorContext ?? undefined);
          const x = 12 + columnIndex * pitch - scrollElement.scrollLeft;
          context.fillStyle = missingTail ? "#f8fafc" : style.background;
          context.fillRect(x, y, settings.cellWidth, settings.cellHeight);
          if (missingTail) {
            context.strokeStyle = "rgba(148, 163, 184, 0.45)";
            context.lineWidth = 1;
            for (let offset = -settings.cellHeight; offset < settings.cellWidth; offset += 5) {
              context.beginPath();
              context.moveTo(x + offset, y + settings.cellHeight);
              context.lineTo(x + offset + settings.cellHeight, y);
              context.stroke();
            }
          }

          const selectedCell =
            selection !== null &&
            selectionRowKey(selection) === canvasSequenceRowKey(sequence, rowIndex) &&
            selection.position === position;
          const inRange = selectedRange
            ? position >= selectedRange.start && position <= selectedRange.end
            : false;
          const motifHit = motifPositionMap
            .get(canvasSequenceRowKey(sequence, rowIndex))
            ?.has(position) ?? false;
          if (selectedCell || inRange || motifHit) {
            context.strokeStyle = selectedCell
              ? "#0f766e"
              : motifHit
                ? "#f59e0b"
                : "#14b8a6";
            context.lineWidth = selectedCell ? 2 : 1;
            context.strokeRect(
              x + 0.5,
              y + 0.5,
              Math.max(1, settings.cellWidth - 1),
              Math.max(1, settings.cellHeight - 1)
            );
          }
        }
      }
    };

    const scheduleDraw = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(draw);
      }
    };
    const resizeObserver = new ResizeObserver(scheduleDraw);
    resizeObserver.observe(viewport);
    resizeObserver.observe(scrollElement);
    scrollElement.addEventListener("scroll", scheduleDraw, { passive: true });
    scheduleDraw();
    return () => {
      resizeObserver.disconnect();
      scrollElement.removeEventListener("scroll", scheduleDraw);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [
    colorScheme,
    columns,
    differenceMode,
    differenceRowKeys,
    headerHeight,
    motifPositionMap,
    reference,
    scrollRef,
    selectedRange,
    selection,
    sequences,
    settings,
    viewportRef,
    positionView
  ]);

  function locationForEvent(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    if (!canvas || !scrollElement) {
      return null;
    }
    const bounds = canvas.getBoundingClientRect();
    const pitch = settings.cellWidth + settings.cellGap;
    const columnIndex = Math.floor(
      (scrollElement.scrollLeft + clientX - bounds.left - 12) / pitch
    );
    const rowIndex = Math.floor(
      (Math.max(0, scrollElement.scrollTop - headerHeight) + clientY - bounds.top) /
      settings.rowHeight
    );
    const position = positionAt(positionView, columnIndex);
    if (
      position === undefined ||
      columnIndex < 0 ||
      rowIndex < 0 ||
      rowIndex >= sequences.length
    ) return null;
    return { rowIndex, columnIndex, position };
  }

  return (
    <canvas
      aria-hidden="true"
      className="absolute z-10 cursor-crosshair bg-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
      data-msa-canvas="true"
      data-msa-cell-pitch={settings.cellWidth + settings.cellGap}
      data-msa-row-height={settings.rowHeight}
      onPointerDown={(event) => {
        if (
          event.pointerType === "touch" &&
          gestureRef.current &&
          gestureRef.current.pointerId !== event.pointerId
        ) {
          // The matrix root owns two-finger pinch. Stop the pending tap/pan so
          // the first pointer cannot scroll the matrix while pinch is active.
          gestureRef.current = null;
          return;
        }
        const location = locationForEvent(event.clientX, event.clientY);
        if (!location) {
          return;
        }
        const touchPan = event.pointerType === "touch" && !rangeSelectionMode;
        gestureRef.current = {
          location,
          moved: false,
          pointerId: event.pointerId,
          startScrollLeft: scrollRef.current?.scrollLeft ?? 0,
          startScrollTop: scrollRef.current?.scrollTop ?? 0,
          startX: event.clientX,
          startY: event.clientY,
          touchPan
        };
        if (touchPan) {
          event.preventDefault();
          scrollRef.current?.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        event.preventDefault();
        scrollRef.current?.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        const sequence = sequences[location.rowIndex];
        onSelect(
          rowSelection(
            canvasSequenceRowKey(sequence, location.rowIndex),
            location.position
          )
        );
      }}
      onPointerMove={(event) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) {
          return;
        }
        if (
          Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 8
        ) {
          gesture.moved = true;
        }
        if (
          gesture.touchPan
        ) {
          event.preventDefault();
          const scrollElement = scrollRef.current;
          if (scrollElement) {
            scrollElement.scrollLeft = Math.max(
              0,
              gesture.startScrollLeft + gesture.startX - event.clientX
            );
            scrollElement.scrollTop = Math.max(
              0,
              gesture.startScrollTop + gesture.startY - event.clientY
            );
          }
          return;
        }
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }
        const current = locationForEvent(event.clientX, event.clientY);
        if (!current) {
          return;
        }
        const sequence = sequences[gesture.location.rowIndex];
        onRangeSelect(
          canvasSequenceRowKey(sequence, gesture.location.rowIndex),
          Math.min(gesture.location.position, current.position),
          Math.max(gesture.location.position, current.position)
        );
      }}
      onPointerUp={(event) => {
        const gesture = gestureRef.current;
        if (
          gesture?.pointerId === event.pointerId &&
          gesture.touchPan &&
          !gesture.moved
        ) {
          const sequence = sequences[gesture.location.rowIndex];
          scrollRef.current?.focus({ preventScroll: true });
          onSelect(
            rowSelection(
              canvasSequenceRowKey(sequence, gesture.location.rowIndex),
              gesture.location.position
            )
          );
        }
        gestureRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={() => {
        gestureRef.current = null;
      }}
      onWheel={(event) => {
        const scrollElement = scrollRef.current;
        if (!scrollElement) {
          return;
        }
        event.preventDefault();
        scrollElement.scrollLeft += event.shiftKey ? event.deltaY : event.deltaX;
        scrollElement.scrollTop += event.shiftKey ? 0 : event.deltaY;
      }}
      ref={canvasRef}
      role="presentation"
      style={{
        bottom: 16,
        left: settings.labelWidth,
        right: 16,
        top: headerHeight,
        touchAction: "none"
      }}
      tabIndex={-1}
    />
  );
}
