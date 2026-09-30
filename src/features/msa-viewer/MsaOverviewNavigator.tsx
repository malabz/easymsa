import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import {
  lowerBoundVisibleIndex,
  positionAt
} from "./columnStatsStore";
import type { ColumnPositionView } from "./types";
import type { AnalysisOverviewBin } from "./workerProtocol";

export function overviewViewport({
  alignmentLength,
  endPosition,
  startPosition,
  width
}: {
  alignmentLength: number;
  endPosition: number;
  startPosition: number;
  width: number;
}) {
  const total = Math.max(1, alignmentLength);
  const start = Math.max(1, Math.min(total, startPosition));
  const end = Math.max(start, Math.min(total, endPosition));
  return {
    x: ((start - 1) / total) * width,
    width: Math.min(width, Math.max(8, ((end - start + 1) / total) * width))
  };
}

export function MsaOverviewNavigator({
  alignmentLength,
  cellPitch,
  labelOffset = 0,
  overviewBins,
  positionView,
  scrollRef,
}: {
  alignmentLength: number;
  cellPitch?: number;
  labelOffset?: number;
  overviewBins: AnalysisOverviewBin[];
  positionView: ColumnPositionView;
  scrollRef: RefObject<HTMLDivElement>;
}) {
  const { dictionary: d } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const [visibleInterval, setVisibleInterval] = useState({
    start: positionAt(positionView, 0) ?? 1,
    end: positionAt(positionView, positionView.length - 1) ?? Math.max(1, alignmentLength)
  });
  const bins = overviewBins;
  const retainedByBin = useMemo(() => {
    const retained = new Uint32Array(bins.length);
    if (!bins.length) return retained;
    if (positionView.kind === "identity" && positionView.length === alignmentLength) {
      bins.forEach((bin, index) => {
        retained[index] = Math.max(1, bin.end - bin.start + 1);
      });
      return retained;
    }
    let binIndex = 0;
    for (let index = 0; index < positionView.length; index += 1) {
      const position = positionAt(positionView, index);
      if (position === undefined) continue;
      while (binIndex < bins.length - 1 && position > (bins[binIndex]?.end ?? 0)) binIndex += 1;
      const bin = bins[binIndex];
      if (bin && position >= bin.start && position <= bin.end) retained[binIndex] += 1;
    }
    return retained;
  }, [alignmentLength, bins, positionView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    if (!canvas || !scrollElement) return;
    const draw = () => {
      frameRef.current = null;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, width, height);
      bins.forEach((bin, index) => {
        const x = ((bin.start - 1) / Math.max(1, alignmentLength)) * width;
        const nextX = (bin.end / Math.max(1, alignmentLength)) * width;
        const binLength = Math.max(1, bin.end - bin.start + 1);
        const variableFraction = Math.min(1, bin.variableColumns / binLength);
        context.fillStyle = `rgba(13, 148, 136, ${0.14 + variableFraction * 0.8})`;
        context.fillRect(x, 4, Math.max(1, nextX - x), (height - 8) * 0.56);
        context.fillStyle = `rgba(244, 63, 94, ${0.08 + bin.averageGapFraction * 0.72})`;
        context.fillRect(x, height * 0.62, Math.max(1, nextX - x), (height - 8) * 0.3);
        if ((retainedByBin[index] ?? 0) < binLength) {
          context.fillStyle = "rgba(15, 23, 42, 0.22)";
          context.fillRect(x, 0, Math.max(1, nextX - x), height);
        }
      });
      const pitch = cellPitch && cellPitch > 0
        ? cellPitch
        : Math.max(1, (scrollElement.scrollWidth - labelOffset) / Math.max(1, positionView.length));
      const firstIndex = Math.min(Math.max(0, positionView.length - 1), Math.max(0, Math.floor((scrollElement.scrollLeft - labelOffset) / pitch)));
      const lastIndex = Math.min(Math.max(0, positionView.length - 1), Math.max(firstIndex, Math.ceil((scrollElement.scrollLeft + scrollElement.clientWidth - labelOffset) / pitch)));
      const interval = {
        start: positionAt(positionView, firstIndex) ?? 1,
        end: positionAt(positionView, lastIndex) ?? Math.max(1, alignmentLength)
      };
      setVisibleInterval((current) => current.start === interval.start && current.end === interval.end ? current : interval);
      const viewport = overviewViewport({ alignmentLength, startPosition: interval.start, endPosition: interval.end, width });
      context.fillStyle = "rgba(15, 118, 110, 0.08)";
      context.fillRect(viewport.x, 1, viewport.width, height - 2);
      context.strokeStyle = "#0f766e";
      context.lineWidth = 2;
      context.strokeRect(viewport.x + 1, 2, Math.max(2, viewport.width - 2), height - 4);
    };
    const scheduleDraw = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(draw);
    };
    const resizeObserver = new ResizeObserver(scheduleDraw);
    resizeObserver.observe(canvas);
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
  }, [alignmentLength, bins, cellPitch, labelOffset, retainedByBin, scrollRef, positionView]);

  function jumpToAlignmentPosition(position: number) {
    const scrollElement = scrollRef.current;
    if (!scrollElement || !positionView.length) return;
    const index = lowerBoundVisibleIndex(positionView, position);
    const pitch = cellPitch && cellPitch > 0
      ? cellPitch
      : Math.max(1, (scrollElement.scrollWidth - labelOffset) / positionView.length);
    scrollElement.scrollLeft = Math.max(0, labelOffset + index * pitch - scrollElement.clientWidth / 2);
  }

  const viewportLabel = `${visibleInterval.start.toLocaleString()}–${visibleInterval.end.toLocaleString()} / ${alignmentLength.toLocaleString()}`;
  return (
    <div className="px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">{d.results.viewer.stageTwo.overviewNavigator}</span>
        <span aria-live="polite">{viewportLabel}</span>
      </div>
      <canvas
        aria-label={`${d.results.viewer.stageTwo.overviewNavigator}: ${viewportLabel}`}
        aria-orientation="horizontal"
        aria-valuemax={Math.max(1, alignmentLength)}
        aria-valuemin={1}
        aria-valuenow={visibleInterval.start}
        aria-valuetext={viewportLabel}
        className="h-12 w-full cursor-ew-resize rounded-md border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        onKeyDown={(event) => {
          const step = Math.max(1, Math.round((visibleInterval.end - visibleInterval.start + 1) / 2));
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            jumpToAlignmentPosition(visibleInterval.start + (event.key === "ArrowLeft" ? -step : step));
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            jumpToAlignmentPosition(event.key === "Home" ? 1 : alignmentLength);
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const bounds = event.currentTarget.getBoundingClientRect();
          jumpToAlignmentPosition(Math.round(((event.clientX - bounds.left) / bounds.width) * alignmentLength));
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          jumpToAlignmentPosition(Math.round(((event.clientX - bounds.left) / bounds.width) * alignmentLength));
        }}
        ref={canvasRef}
        role="slider"
        tabIndex={0}
      />
    </div>
  );
}
