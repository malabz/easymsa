import { useEffect, useRef } from "react";
import { HOME_BASE_COLORS, type HomeDemoData } from "./homeDemoData";
import { useLanguage } from "../../lib/i18n/useLanguage";

type Props = {
  data: HomeDemoData;
  kind: "story" | "compact" | "preview" | "overview";
  start?: number;
  visibleColumns?: number;
  selected?: number | null;
  progress?: number;
  scale?: number;
  label: string;
  onColumn?: (column: number) => void;
  onWindow?: (columns: number) => void;
};

// These canvases render the verified public example, rather than a product screenshot.
export function HomeAlignmentCanvas({ data, kind, start = 0, visibleColumns = 60, selected = null,
  progress = 1, scale = 1, label, onColumn, onWindow }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { locale } = useLanguage();
  const geometry = useRef({ left: 0, cell: 1, columns: 0, start });
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const width = rect.width, height = rect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      const ctx = element.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height);
      ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.textBaseline = "middle";
      if (kind === "overview") {
        for (let column = 0; column < data.length; column++) {
          for (let row = 0; row < 5; row++) {
            ctx.fillStyle = (HOME_BASE_COLORS[data.aligned[row].sequence[column]] ?? ["#e2e8f0"])[0];
            ctx.fillRect(column * width / data.length, row * height / 5, Math.ceil(width / data.length), height / 5);
          }
        }
        return;
      }
      if (kind === "story") {
        const middle = width * .46, cell = width < 500 ? 10 : 15;
        ctx.font = `${width < 500 ? 10 : 13}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        const storyOffset = Math.min(214, Math.max(0, data.length - 70));
        const columns = Math.floor((width - middle - 12) / cell);
        const rows = Math.min(data.aligned.length, 4 + scale * 2, Math.max(1, Math.floor((height - 40) / 32)));
        const rowHeight = (height - 40) / rows;
        const alignedProgress = Math.min(1, Math.max(0, (progress - .42) / .34));
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, middle - 20, height); ctx.clip();
        for (let row = 0; row < Math.min(rows, data.input.length); row++) {
          const y = 23 + row * rowHeight;
          ctx.globalAlpha = row > 3 ? .3 + alignedProgress * .55 : 1;
          ctx.fillStyle = "#334155";
          ctx.fillText(`> ${data.input[row].id}`, 9, y);
          ctx.fillStyle = "#64748b";
          const inputOffset = data.aligned[row].sequence.slice(0, storyOffset).replace(/[-.]/g, "").length;
          ctx.fillText(data.input[row].sequence.slice(inputOffset, inputOffset + 38) + "…", 9, y + 17);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#cbd5e1"; ctx.fillRect(middle - 8, 12, 1, height - 24);
        for (let row = 0; row < rows; row++) {
          let gaps = 0;
          for (let column = 0; column < columns; column++) {
            const base = data.aligned[row].sequence[storyOffset + column];
            if (base === "-") gaps++;
            const x = middle + (column - gaps * (1 - alignedProgress)) * cell;
            const y = 20 + row * rowHeight;
            const colors = HOME_BASE_COLORS[base] ?? ["#f1f5f9", "#64748b"];
            ctx.globalAlpha = base === "-" ? alignedProgress : .55 + alignedProgress * .45;
            ctx.fillStyle = colors[0]; ctx.fillRect(x, y, cell - 1, Math.min(rowHeight - 4, 21));
            if (rowHeight > 12) { ctx.fillStyle = colors[1]; ctx.fillText(base, x + 3, y + Math.min(rowHeight - 4, 21) / 2); }
          }
        }
        ctx.globalAlpha = 1;
        return;
      }
      const compact = kind === "compact";
      const nameWidth = compact ? 0 : width < 500 ? 76 : 126;
      const cell = compact ? 11 : width < 500 ? 11 : 14;
      const count = Math.min(data.length, Math.max(1, Math.floor((width - nameWidth - 12) / cell)));
      const offset = Math.min(start, data.length - count);
      geometry.current = { left: nameWidth, cell, columns: count, start: offset };
      if (!compact && count !== visibleColumns) onWindow?.(count);
      const rowHeight = compact ? 20 : 23;
      const matrixTop = compact ? 8 : 128;
      const rowCount = Math.min(compact ? 7 : 10, data.aligned.length);
      if (!compact) {
        ctx.font = `${width < 500 ? 9 : 11}px system-ui, sans-serif`; ctx.fillStyle = "#64748b";
        (locale === "zh" ? ["位置", "保守性", "缺口比例", "碱基频率"] : ["Position", "Conservation", "Gaps", "Base frequency"]).forEach((name, index) => ctx.fillText(name, 8, [12, 37, 64, 103][index]));
        ctx.font = "9px system-ui, sans-serif"; ctx.fillText("80–100%", 8, 49);
        ctx.font = "10px ui-monospace, monospace";
        for (let column = 0; column < count; column++) {
          const index = offset + column, x = nameWidth + column * cell;
          if (column === 0 || (index + 1) % 10 === 0) { ctx.fillStyle = "#64748b"; ctx.fillText(String(index + 1), x, 12); }
          const canonical = data.columns.canonicalCounts[index];
          const conservation = canonical ? data.columns.dominantCounts[index] / canonical : 0;
          const h = canonical ? Math.max(2, Math.min(23, (conservation - .8) / .2 * 23)) : 0;
          ctx.fillStyle = "#27857c"; ctx.fillRect(x, 49 - h, cell, h);
          ctx.fillStyle = "#eaa2b8"; ctx.fillRect(x, 77 - data.columns.gapCounts[index] / data.aligned.length * 19, cell, data.columns.gapCounts[index] / data.aligned.length * 19);
          let bottom = 121;
          const bases = ["A", "C", "G", "T"].map((base, baseIndex) => ({ base, value: data.columns.nucleotideCounts[index * 4 + baseIndex] / data.aligned.length })).sort((a, b) => a.value - b.value);
          for (const { base, value } of bases) {
            if (!value) continue;
            const letterHeight = value * 38;
            ctx.save(); ctx.translate(x, bottom); ctx.scale(cell / 13, letterHeight / 20);
            ctx.font = "bold 22px ui-monospace, monospace"; ctx.textBaseline = "bottom";
            ctx.fillStyle = HOME_BASE_COLORS[base][1]; ctx.fillText(base, 0, 0); ctx.restore();
            bottom -= letterHeight;
          }
        }
        ctx.fillStyle = "#e2e8f0"; ctx.fillRect(0, 125, width, 1);
      }
      ctx.font = "11px ui-monospace, SFMono-Regular, Consolas, monospace";
      for (let row = 0; row < rowCount; row++) {
        const y = matrixTop + row * rowHeight;
        if (!compact) { ctx.fillStyle = "#64748b"; ctx.fillText(data.aligned[row].id, 8, y + rowHeight / 2); }
        for (let column = 0; column < count; column++) {
          const base = data.aligned[row].sequence[offset + column];
          const x = nameWidth + column * cell, colors = HOME_BASE_COLORS[base] ?? ["#f1f5f9", "#64748b"];
          ctx.fillStyle = colors[0]; ctx.fillRect(x, y, cell, rowHeight - 1);
          ctx.fillStyle = colors[1]; ctx.fillText(base, x + (cell - 7) / 2, y + (rowHeight - 1) / 2);
        }
      }
      if (!compact && selected != null && selected >= offset && selected < offset + count) {
        const x = nameWidth + (selected - offset) * cell;
        ctx.fillStyle = "rgba(15,118,110,.09)"; ctx.fillRect(x, 18, cell, height - 18);
        ctx.strokeStyle = "#0f766e"; ctx.lineWidth = 1.5; ctx.strokeRect(x, 18, cell, height - 20);
      }
    };
    draw();
    const observer = new ResizeObserver(draw); observer.observe(element);
    return () => observer.disconnect();
  }, [data, kind, start, visibleColumns, selected, progress, scale, onWindow, locale]);
  return <canvas ref={canvas} className={`home-alignment-canvas home-canvas-${kind}`} role="img" aria-label={label}
    onClick={onColumn ? event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const { left, cell, columns, start: offset } = geometry.current;
      const column = Math.floor((event.clientX - rect.left - left) / cell);
      if (column >= 0 && column < columns) onColumn(offset + column);
    } : undefined} />;
}
