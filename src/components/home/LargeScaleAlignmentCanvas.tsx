import { useEffect, useRef } from "react";
import { HOME_BASE_COLORS, type HomeDemoData } from "./homeDemoData";

type Props = { data: HomeDemoData; progress: number; reduced: boolean; label: string };

export function LargeScaleAlignmentCanvas({ data, progress, reduced, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ data, progress, reduced });
  const redraw = useRef<() => void>(() => {});
  state.current = { data, progress, reduced };
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => {
      const { data: current, progress: phase, reduced: quiet } = state.current;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
      if (element.width !== pixelWidth || element.height !== pixelHeight) {
        element.width = pixelWidth; element.height = pixelHeight;
      }
      const ctx = element.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      const mobile = width < 600;
      const middle = width * .5, gutter = mobile ? 22 : 48;
      const inputEnd = middle - gutter, outputStart = middle + gutter;
      const rows = Math.min(current.aligned.length, mobile ? 14 : 20);
      const rowHeight = Math.min(mobile ? 19 : 21, (height - 20) / rows);
      const inputCell = mobile ? 6.5 : 10, outputCell = mobile ? 11 : 16;
      const columns = Math.min(65, Math.floor((width - outputStart - 4) / outputCell));
      const offset = Math.min(214, Math.max(0, current.length - columns));
      const reveal = Math.min(1, Math.max(0, (phase - .1) / .66));
      const front = outputStart + columns * outputCell * reveal;
      const resetFade = phase > .96 ? (1 - phase) / .04 : 1;
      for (let row = 0; row < rows; row++) {
        const aligned = current.aligned[row].sequence;
        const inputOffset = aligned.slice(0, offset).replace(/[-.]/g, "").length;
        const y = 10 + row * rowHeight;
        const edgeFade = row < 2 ? .65 + row * .1 : row > rows - 3 ? .55 + (rows - row) * .12 : 1;
        // Uneven row offsets and spacing show ungapped input, preserving base order.
        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, inputEnd, height); ctx.clip();
        const indent = ((row * 37 + 13) % 97) * (mobile ? .32 : .78);
        const pitch = inputCell * (.88 + ((row * 17) % 7) * .052);
        const drift = quiet ? 0 : Math.sin(phase * Math.PI * 2 + row) * 3;
        const sequence = current.input[row].sequence.slice(inputOffset, inputOffset + Math.ceil(inputEnd / pitch));
        ctx.font = `${mobile ? 8 : 10}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        ctx.globalAlpha = edgeFade * .86;
        for (let column = 0; column < sequence.length; column++) {
          const x = indent + column * pitch + Math.sin(column * .8 + row) * (mobile ? .8 : 1.8) + drift;
          ctx.fillStyle = HOME_BASE_COLORS[sequence[column]]?.[1] ?? "#64748b";
          ctx.fillText(sequence[column], x, y + rowHeight / 2 + Math.sin(row * 1.4) * 2);
        }
        ctx.restore();
        ctx.font = `${mobile ? 9 : 11}px ui-monospace, SFMono-Regular, Consolas, monospace`;
        for (let column = 0; column < columns; column++) {
          const base = aligned[offset + column];
          const x = outputStart + column * outputCell;
          const colors = HOME_BASE_COLORS[base] ?? ["#f1f5f9", "#64748b"];
          const passed = Math.min(1, Math.max(0, (front - x) / outputCell)) * resetFade;
          // The matrix starts faintly tinted; columns passed by the scanner receive full color.
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fff"; ctx.fillRect(x, y, outputCell - 1, rowHeight - 2);
          ctx.strokeStyle = "#e8efed"; ctx.lineWidth = .5;
          ctx.strokeRect(x + .25, y + .25, outputCell - 1.5, rowHeight - 2.5);
          ctx.globalAlpha = (.3 + passed * .7) * edgeFade;
          ctx.fillStyle = colors[0]; ctx.fillRect(x, y, outputCell - 1, rowHeight - 2);
          ctx.globalAlpha = edgeFade * (.36 + passed * .64);
          ctx.fillStyle = passed > .5 ? colors[1] : "#a3afad";
          ctx.fillText(base, x + (outputCell - 1) / 2, y + (rowHeight - 2) / 2);
        }
      }
      ctx.globalAlpha = .32;
      ctx.fillStyle = "#74beb0"; ctx.fillRect(middle, 0, 1, height - 10);
      if (phase >= .1 && phase < .76) {
        ctx.globalAlpha = .08; ctx.fillStyle = "#0f766e";
        ctx.fillRect(front - 6, 6, 12, rows * rowHeight + 3);
        ctx.globalAlpha = .9; ctx.fillRect(front - 1, 6, 2, rows * rowHeight + 3);
      }
      ctx.globalAlpha = 1;
    };
    redraw.current = draw;
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(element);
    return () => { observer.disconnect(); redraw.current = () => {}; };
  }, []);
  useEffect(() => redraw.current(), [data, progress, reduced]);
  return <canvas ref={canvas} className="home-scale-canvas" role="img" aria-label={label}
    data-reveal={Math.min(1, Math.max(0, (progress - .1) / .66)).toFixed(2)} />;
}
