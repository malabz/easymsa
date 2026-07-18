import { useEffect, useId, useRef } from "react";
import type { ColumnStats } from "../../features/msa-viewer/types";
import { useLanguage } from "../../lib/i18n/useLanguage";

type Track = {
  color: string;
  label: string;
  value: (column: ColumnStats) => number;
};

function drawTrack(
  context: CanvasRenderingContext2D,
  columns: ColumnStats[],
  track: Track,
  top: number,
  width: number,
  height: number
) {
  context.fillStyle = "#f8fafc";
  context.fillRect(0, top, width, height);
  context.strokeStyle = "#e2e8f0";
  context.beginPath();
  context.moveTo(0, top + height - 0.5);
  context.lineTo(width, top + height - 0.5);
  context.stroke();

  context.fillStyle = track.color;
  for (let x = 0; x < width; x += 1) {
    const start = Math.floor((x / width) * columns.length);
    const end = Math.max(
      start + 1,
      Math.floor(((x + 1) / width) * columns.length)
    );
    let total = 0;
    for (let index = start; index < Math.min(end, columns.length); index += 1) {
      total += track.value(columns[index]);
    }
    const value = Math.max(0, Math.min(1, total / Math.max(1, end - start)));
    const barHeight = Math.max(1, Math.round(value * (height - 5)));
    context.fillRect(x, top + height - barHeight, 1, barHeight);
  }
}

export function AlignmentQualityOverview({ columns }: { columns: ColumnStats[] }) {
  const { dictionary: d } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const descriptionId = useId();
  const t = d.results.overview.science;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || columns.length === 0) {
      return;
    }

    const draw = () => {
      let context: CanvasRenderingContext2D | null = null;
      try {
        context = canvas.getContext("2d");
      } catch {
        return;
      }
      if (!context) {
        return;
      }

      const cssWidth = Math.max(320, Math.round(canvas.clientWidth || 960));
      const cssHeight = 156;
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);

      const tracks: Track[] = [
        {
          color: "#0f766e",
          label: d.results.viewer.stageTwo.tracks.conservation,
          value: (column) => column.conservation
        },
        {
          color: "#e11d48",
          label: d.results.viewer.stageTwo.tracks.gap,
          value: (column) => column.gapFraction
        },
        {
          color: "#7c3aed",
          label: d.results.viewer.stageTwo.tracks.entropy,
          value: (column) => column.entropy
        }
      ];
      const gap = 8;
      const trackHeight = (cssHeight - gap * (tracks.length - 1)) / tracks.length;
      tracks.forEach((track, index) => {
        drawTrack(
          context,
          columns,
          track,
          index * (trackHeight + gap),
          cssWidth,
          trackHeight
        );
      });
    };

    draw();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(draw);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [columns, d.results.viewer.stageTwo.tracks]);

  const summary = t.qualityChartSummary.replace(
    "{columns}",
    columns.length.toLocaleString()
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{t.qualityProfile}</h4>
        <div aria-hidden="true" className="flex flex-wrap gap-3 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-teal-700" />
            {d.results.viewer.stageTwo.tracks.conservation}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-600" />
            {d.results.viewer.stageTwo.tracks.gap}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-700" />
            {d.results.viewer.stageTwo.tracks.entropy}
          </span>
        </div>
      </div>
      <canvas
        aria-describedby={descriptionId}
        aria-label={t.qualityChartLabel}
        className="h-[156px] w-full rounded-lg border border-slate-200 bg-slate-50"
        ref={canvasRef}
        role="img"
      >
        {summary}
      </canvas>
      <p className="sr-only" id={descriptionId}>{summary}</p>
    </div>
  );
}
