import { useEffect, useRef, type RefObject } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import type { ColumnStats } from "./types";

export function overviewViewport({
  clientWidth,
  scrollLeft,
  scrollWidth,
  width
}: {
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
  width: number;
}) {
  const total = Math.max(1, scrollWidth);
  return {
    x: (scrollLeft / total) * width,
    width: Math.min(width, Math.max(8, (clientWidth / total) * width))
  };
}

export function MsaOverviewNavigator({
  columns,
  scrollRef
}: {
  columns: ColumnStats[];
  scrollRef: RefObject<HTMLDivElement>;
}) {
  const { dictionary: d } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    if (!canvas || !scrollElement) {
      return;
    }

    const draw = () => {
      frameRef.current = null;
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(width * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, width, height);

      const bucketCount = Math.min(width, columns.length);
      for (let bucket = 0; bucket < bucketCount; bucket += 1) {
        const start = Math.floor((bucket / bucketCount) * columns.length);
        const end = Math.max(start + 1, Math.floor(((bucket + 1) / bucketCount) * columns.length));
        const slice = columns.slice(start, end);
        const variation = slice.reduce((sum, column) => sum + column.variation, 0) / slice.length;
        const gaps = slice.reduce((sum, column) => sum + column.gapFraction, 0) / slice.length;
        const x = (bucket / bucketCount) * width;
        const nextX = ((bucket + 1) / bucketCount) * width;
        context.fillStyle = `rgba(13, 148, 136, ${0.14 + variation * 0.8})`;
        context.fillRect(x, 4, Math.max(1, nextX - x), (height - 8) * 0.56);
        context.fillStyle = `rgba(244, 63, 94, ${0.08 + gaps * 0.72})`;
        context.fillRect(x, height * 0.62, Math.max(1, nextX - x), (height - 8) * 0.3);
      }

      const viewport = overviewViewport({
        clientWidth: scrollElement.clientWidth,
        scrollLeft: scrollElement.scrollLeft,
        scrollWidth: scrollElement.scrollWidth,
        width
      });
      context.fillStyle = "rgba(15, 118, 110, 0.08)";
      context.fillRect(viewport.x, 1, viewport.width, height - 2);
      context.strokeStyle = "#0f766e";
      context.lineWidth = 2;
      context.strokeRect(viewport.x + 1, 2, Math.max(2, viewport.width - 2), height - 4);
    };

    const scheduleDraw = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(draw);
      }
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
      }
    };
  }, [columns, scrollRef]);

  function jumpToPointer(clientX: number) {
    const canvas = canvasRef.current;
    const scrollElement = scrollRef.current;
    if (!canvas || !scrollElement) {
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
    scrollElement.scrollLeft = Math.max(
      0,
      fraction * scrollElement.scrollWidth - scrollElement.clientWidth / 2
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide">
          {d.results.viewer.stageTwo.overviewNavigator}
        </span>
        <span>
          {d.results.viewer.visibleColumns
            .replace("{shown}", columns.length.toLocaleString())
            .replace("{total}", columns.length.toLocaleString())}
        </span>
      </div>
      <canvas
        aria-label={d.results.viewer.stageTwo.overviewNavigator}
        className="h-16 w-full cursor-ew-resize rounded-md border border-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        onKeyDown={(event) => {
          const scrollElement = scrollRef.current;
          if (!scrollElement) {
            return;
          }
          const step = Math.max(40, scrollElement.clientWidth * 0.5);
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            scrollElement.scrollLeft += event.key === "ArrowLeft" ? -step : step;
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            scrollElement.scrollLeft = event.key === "Home" ? 0 : scrollElement.scrollWidth;
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          jumpToPointer(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            jumpToPointer(event.clientX);
          }
        }}
        ref={canvasRef}
        role="application"
        tabIndex={0}
      />
    </div>
  );
}
