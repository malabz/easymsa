import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject
} from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { msaCellColorStyle, type MSAColorScheme } from "../msa-export/exportColors";
import type { MSASequence } from "../../lib/types/msa";
import { classifyDifference } from "./analysis";
import { differenceColorStyle } from "./differenceColors";
import type {
  CellSelection,
  ColumnRange,
  ColumnStats,
  MsaViewSettings
} from "./types";

type CellLocation = {
  rowIndex: number;
  columnIndex: number;
  position: number;
};

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
  headerHeight,
  motifPositionMap,
  onNavigate,
  onRangeSelect,
  onSelect,
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
  columns: ColumnStats[];
  differenceMode: boolean;
  headerHeight: number;
  motifPositionMap: Map<string, Set<number>>;
  onNavigate: (deltaRow: number, deltaColumn: number, extendRange: boolean) => void;
  onRangeSelect: (sequenceId: string, start: number, end: number) => void;
  onSelect: (selection: CellSelection) => void;
  reference: MSASequence | null;
  scrollRef: RefObject<HTMLDivElement>;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  sequences: MSASequence[];
  settings: MsaViewSettings;
  viewportRef: RefObject<HTMLDivElement>;
  visiblePositions: number[];
}) {
  const { dictionary: d } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const dragStartRef = useRef<CellLocation | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !scrollElement || !viewport) {
      return;
    }

    const draw = () => {
      frameRef.current = null;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
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
        visiblePositions.length - 1,
        Math.ceil((scrollElement.scrollLeft + width) / pitch) + 1
      );
      const firstRow = Math.max(0, Math.floor(matrixScrollTop / settings.rowHeight));
      const lastRow = Math.min(
        sequences.length - 1,
        Math.ceil((matrixScrollTop + height) / settings.rowHeight) + 1
      );

      for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
        const sequence = sequences[rowIndex];
        if (!sequence) {
          continue;
        }
        const y = rowIndex * settings.rowHeight - matrixScrollTop +
          Math.max(0, (settings.rowHeight - settings.cellHeight) / 2);
        for (let columnIndex = firstColumn; columnIndex <= lastColumn; columnIndex += 1) {
          const position = visiblePositions[columnIndex];
          if (!position) {
            continue;
          }
          const base = sequence.sequence[position - 1] ?? "";
          const referenceBase = reference?.sequence[position - 1] ?? "";
          const style = differenceMode && reference
            ? differenceColorStyle(classifyDifference(base, referenceBase))
            : msaCellColorStyle(base, colorScheme, columns[position - 1]);
          const x = 12 + columnIndex * pitch - scrollElement.scrollLeft;
          context.fillStyle = style.background;
          context.fillRect(x, y, settings.cellWidth, settings.cellHeight);

          const selectedCell =
            selection?.sequenceId === sequence.id && selection.position === position;
          const inRange = selectedRange
            ? position >= selectedRange.start && position <= selectedRange.end
            : false;
          const motifHit = motifPositionMap.get(sequence.id)?.has(position) ?? false;
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
      }
    };
  }, [
    colorScheme,
    columns,
    differenceMode,
    headerHeight,
    motifPositionMap,
    reference,
    scrollRef,
    selectedRange,
    selection,
    sequences,
    settings,
    viewportRef,
    visiblePositions
  ]);

  function locationForEvent(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    if (!canvas || !scrollElement) {
      return null;
    }
    const bounds = canvas.getBoundingClientRect();
    return canvasCellLocation({
      clientX,
      clientY,
      canvasLeft: bounds.left,
      canvasTop: bounds.top,
      scrollLeft: scrollElement.scrollLeft,
      scrollTop: Math.max(0, scrollElement.scrollTop - headerHeight),
      settings,
      visiblePositions,
      sequenceCount: sequences.length
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      onNavigate(0, event.key === "ArrowLeft" ? -1 : 1, event.shiftKey);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      onNavigate(event.key === "ArrowUp" ? -1 : 1, 0, event.shiftKey);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      onNavigate(0, event.key === "Home" ? -visiblePositions.length : visiblePositions.length, event.shiftKey);
    }
  }

  return (
    <canvas
      aria-label={d.results.viewer.matrixNavigation}
      className="absolute z-10 cursor-crosshair bg-white outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
      data-msa-canvas="true"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        const location = locationForEvent(event.clientX, event.clientY);
        if (!location) {
          return;
        }
        dragStartRef.current = location;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSelect({
          sequenceId: sequences[location.rowIndex].id,
          position: location.position
        });
      }}
      onPointerMove={(event) => {
        const start = dragStartRef.current;
        if (!start || !event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }
        const current = locationForEvent(event.clientX, event.clientY);
        if (!current) {
          return;
        }
        onRangeSelect(
          sequences[current.rowIndex].id,
          Math.min(start.position, current.position),
          Math.max(start.position, current.position)
        );
      }}
      onPointerUp={(event) => {
        dragStartRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
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
      role="application"
      style={{
        bottom: 16,
        left: settings.labelWidth,
        right: 16,
        top: headerHeight
      }}
      tabIndex={0}
    />
  );
}
