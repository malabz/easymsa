import { useEffect, useId, useRef } from "react";
import {
  columnMetricAtIndex,
  type ColumnMetric
} from "../../features/msa-viewer/columnStatsStore";
import type { ColumnStatsStoreV2 } from "../../features/msa-viewer/types";
import { useLanguage } from "../../lib/i18n/useLanguage";

type Track = {
  color: string;
  label: string;
  metric: ColumnMetric;
};

function drawTrack(
  context: CanvasRenderingContext2D,
  columnStore: ColumnStatsStoreV2,
  track: Track,
  top: number,
  width: number,
  height: number
) {
  context.strokeStyle = track.color;
  context.lineWidth = 1.4;
  context.beginPath();
  let started = false;
  for (let x = 0; x < width; x += 1) {
    const start = Math.floor((x / width) * columnStore.length);
    const end = Math.max(start + 1, Math.floor(((x + 1) / width) * columnStore.length));
    let total = 0, observed = 0;
    for (let index = start; index < Math.min(end, columnStore.length); index += 1) {
      const value = columnMetricAtIndex(columnStore, index, track.metric);
      if (value !== null) { total += value; observed += 1; }
    }
    if (!observed) { started = false; continue; }
    const y = top + height * (1 - Math.max(0, Math.min(1, total / observed)));
    if (started) context.lineTo(x + 28, y); else context.moveTo(x + 28, y);
    started = true;
  }
  context.stroke();
}

export function AlignmentQualityOverview({ columnStore }: { columnStore: ColumnStatsStoreV2 }) {
  const { dictionary: d } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const descriptionId = useId();
  const t = d.results.overview.science;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || columnStore.length === 0) {
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

      const cssWidth = Math.max(1, Math.round(canvas.clientWidth || 960));
      const cssHeight = Math.max(80, Math.round(canvas.clientHeight || 124));
      const pixelRatio = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssWidth * pixelRatio);
      canvas.height = Math.round(cssHeight * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, cssWidth, cssHeight);

      const tracks: Track[] = [
        {
          color: "#0f766e",
          label: d.results.viewer.stageTwo.tracks.conservation,
          metric: "conservation"
        },
        {
          color: "#e11d48",
          label: d.results.viewer.stageTwo.tracks.gap,
          metric: "gap"
        },
        {
          color: "#7c3aed",
          label: d.results.viewer.stageTwo.tracks.entropy,
          metric: "entropy"
        }
      ];
      const plotHeight = cssHeight - 10;
      context.font = "10px sans-serif";
      [1, 0.5, 0].forEach(value => {
        const y = 5 + (1 - value) * plotHeight;
        context.fillStyle = "#64748b";
        context.fillText(value.toFixed(1), 0, Math.min(cssHeight - 1, y + 3));
        context.strokeStyle = "#e2e8f0";
        context.beginPath(); context.moveTo(28, y); context.lineTo(cssWidth - 5, y); context.stroke();
      });
      tracks.forEach(track => drawTrack(context!, columnStore, track, 5, cssWidth - 33, plotHeight));
    };

    draw();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(draw);
      observer.observe(canvas);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [columnStore, d.results.viewer.stageTwo.tracks]);

  const summary = t.qualityChartSummary.replace("{columns}", columnStore.length.toLocaleString());
  return <section className="overview-quality">
    <div className="overview-section-line">
      <h3>{t.qualityProfile}</h3>
      <div className="quality-legend" aria-hidden="true">
        <span><i className="bg-teal-700" />{d.results.viewer.stageTwo.tracks.conservation}</span>
        <span><i className="bg-rose-600" />{d.results.viewer.stageTwo.tracks.gap}</span>
        <span><i className="bg-violet-700" />{d.results.viewer.stageTwo.tracks.entropy}</span>
      </div>
    </div>
    <canvas ref={canvasRef} role="img" aria-label={t.qualityChartLabel} aria-describedby={descriptionId}>{summary}</canvas>
    <div className="quality-axis" aria-hidden="true"><span>1</span><span>{Math.round(columnStore.length / 2).toLocaleString()}</span><span>{columnStore.length.toLocaleString()}</span></div>
    <p className="sr-only" id={descriptionId}>{summary}</p>
  </section>;
}
