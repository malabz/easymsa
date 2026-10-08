import { conservationBar, conservationScaleRange } from "../msa-viewer/conservationDisplay";
import { legendColorStyles, msaCellColorStyle } from "./exportColors";
import { classifyDifference } from "../msa-viewer/analysis";
import { differenceColorStyle } from "../msa-viewer/differenceColors";
import type {
  MsaExportBlock,
  MsaExportColumn,
  MsaExportLabels,
  MsaExportLayout,
  MsaExportTrackId
} from "./exportTypes";

const TEXT_COLOR = "#0f172a";
const MUTED_TEXT_COLOR = "#64748b";
const LABEL_BACKGROUND = "#f8fafc";
const LABEL_BORDER = "#e2e8f0";
const EMPTY_CELL_BACKGROUND = "#f8fafc";
const EMPTY_CELL_BORDER = "#eef2f7";
const CONSENSUS_LABEL_BACKGROUND = "#ccfbf1";
const CONSENSUS_BACKGROUND = "#f0fdfa";

export function assertCanvasSizeWithinLimit(layout: MsaExportLayout) {
  if (layout.exceedsCanvasLimit) {
    throw new Error(layout.limitReason ?? "PNG export exceeds the canvas size limit.");
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    color?: string;
    fontSize?: number;
    fontWeight?: string;
    maxWidth?: number;
    align?: CanvasTextAlign;
  } = {}
) {
  ctx.fillStyle = options.color ?? TEXT_COLOR;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.font = `${options.fontWeight ?? "500"} ${options.fontSize ?? 12}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillText(text, x, y, options.maxWidth);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  text: string,
  x: number,
  y: number,
  height: number,
  background = LABEL_BACKGROUND,
  color = MUTED_TEXT_COLOR
) {
  if (!layout.options.includeSequenceNames || layout.labelWidth <= 0) {
    return;
  }

  ctx.fillStyle = background;
  ctx.fillRect(x, y, layout.labelWidth, height);
  ctx.strokeStyle = LABEL_BORDER;
  ctx.strokeRect(x, y, layout.labelWidth, height);
  drawText(ctx, text, x + 10, y + height / 2, {
    color,
    fontSize: Math.max(9, layout.fontSize),
    maxWidth: Math.max(20, layout.labelWidth - 20)
  });
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  column: MsaExportColumn,
  base: string,
  referenceBase: string,
  x: number,
  y: number
) {
  const color = base
    ? layout.differenceMode && layout.referenceSequence
      ? differenceColorStyle(classifyDifference(base, referenceBase))
      : msaCellColorStyle(base, layout.colorScheme, column.conservation)
    : {
        background: EMPTY_CELL_BACKGROUND,
        text: "transparent",
        border: EMPTY_CELL_BORDER
      };

  ctx.fillStyle = color.background;
  ctx.fillRect(x, y, layout.cellWidth, layout.cellHeight);

  if (layout.showCharacters) {
    ctx.strokeStyle = color.border;
    ctx.strokeRect(x + 0.5, y + 0.5, layout.cellWidth - 1, layout.cellHeight - 1);
  }

  if (layout.showCharacters && base) {
    drawText(ctx, base, x + layout.cellWidth / 2, y + layout.cellHeight / 2, {
      color: color.text,
      fontSize: layout.fontSize,
      fontWeight: "700",
      align: "center"
    });
  }
}

function drawCoordinateRow(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels,
  y: number
) {
  const coordinateLength = layout.coordinateMode === "reference"
    ? layout.referenceSequence?.sequence.replace(/-/g, "").length ?? 0
    : layout.alignment.alignmentLength ?? layout.columns.reduce(
        (maximum, column) => Math.max(maximum, column.position),
        0
      );
  drawLabel(
    ctx,
    layout,
    layout.coordinateMode === "reference" ? labels.referencePosition : labels.position,
    block.x,
    y,
    layout.rowHeight
  );
  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    const coordinateBreak =
      index > 0 &&
      column.position !== block.columns[index - 1].position + 1;
    ctx.fillStyle = LABEL_BACKGROUND;
    ctx.fillRect(x, y, layout.cellWidth, layout.cellHeight);
    const coordinate = layout.coordinateMode === "reference"
      ? column.referencePosition ?? null
      : column.position;
    const numericCoordinate = typeof coordinate === "number"
      ? coordinate
      : coordinate && /^\d+$/.test(coordinate)
        ? Number(coordinate)
        : null;
    const showMarker = coordinate !== null && (
      (typeof coordinate === "string" && coordinate.includes("+")) ||
      numericCoordinate === 1 ||
      numericCoordinate === coordinateLength ||
      (numericCoordinate !== null && numericCoordinate % layout.markerEvery === 0)
    );

    if (showMarker) {
      drawText(ctx, String(coordinate), x + layout.cellWidth / 2, y + layout.cellHeight / 2, {
        color: MUTED_TEXT_COLOR,
        fontSize: Math.max(8, layout.fontSize - 2),
        align: "center"
      });
    }
    if (coordinateBreak) {
      ctx.save();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 2, y + layout.cellHeight * 0.25);
      ctx.lineTo(x + 2, y + layout.cellHeight * 0.45);
      ctx.moveTo(x - 2, y + layout.cellHeight * 0.55);
      ctx.lineTo(x + 2, y + layout.cellHeight * 0.75);
      ctx.stroke();
      ctx.restore();
    }
  });
}

function trackValue(column: MsaExportColumn, track: MsaExportTrackId) {
  const stats = column.conservation;
  if (track === "gap") {
    return stats?.gapFraction ?? 0;
  }
  if (track === "coverage") {
    return stats?.coverage ?? 1 - (stats?.gapFraction ?? 0);
  }
  if (track === "entropy") {
    return stats?.entropy ?? 0;
  }
  return stats?.conservation ?? null;
}

const TRACK_COLORS: Record<MsaExportTrackId, string> = {
  conservation: "#0f766e",
  gap: "#f43f5e",
  coverage: "#0284c7",
  entropy: "#7c3aed"
};

function drawTrackRow(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels,
  track: MsaExportTrackId,
  y: number
) {
  drawLabel(ctx, layout, track === "conservation" ? "" : labels.tracks[track], block.x, y, layout.rowHeight, "#ffffff");
  if (track === "conservation" && layout.labelWidth > 0) {
    drawText(ctx, labels.tracks[track], block.x + 10, y + 7,
      { fontSize: 10, color: MUTED_TEXT_COLOR });
    drawText(ctx, conservationScaleRange(layout.conservationScale ?? "full").label,
      block.x + 10, y + layout.rowHeight - 4,
      { fontSize: 8, color: MUTED_TEXT_COLOR });
  }
  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    const value = trackValue(column, track);
    const bar = track === "conservation"
      ? conservationBar(value, layout.conservationScale ?? "full", layout.cellHeight)
      : { height: Math.max(2, Math.round(layout.cellHeight * (value ?? 0))), belowRange: false, opacity: 0.18 + (value ?? 0) * 0.72 };
    const barHeight = bar.height;
    const opacity = bar.opacity;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, layout.cellWidth, layout.cellHeight);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = bar.belowRange ? "#d97706" : TRACK_COLORS[track];
    ctx.fillRect(
      x,
      y + layout.cellHeight - barHeight,
      layout.cellWidth,
      barHeight
    );
    ctx.globalAlpha = 1;
  });
}

function drawSequenceRow(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  block: MsaExportBlock,
  sequenceId: string,
  sequence: string,
  rowKey: string | undefined,
  y: number,
  labelBackground = "#ffffff",
  labelColor = TEXT_COLOR
) {
  drawLabel(ctx, layout, sequenceId, block.x, y, layout.rowHeight, labelBackground, labelColor);
  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    drawCell(
      ctx,
      layout,
      column,
      sequence[column.position - 1] ?? "",
      layout.referenceSequence?.sequence[column.position - 1] ?? "",
      x,
      y
    );
    const annotationIndex = layout.annotations.findIndex((annotation) => {
      const rowMatches = annotation.rowKey
        ? annotation.rowKey === rowKey
        : annotation.sequenceId
          ? annotation.sequenceId === sequenceId
          : true;
      if (!rowMatches || annotation.start === null || annotation.end === null) return false;
      const start = Math.min(annotation.start, annotation.end);
      const end = Math.max(annotation.start, annotation.end);
      return column.position >= start && column.position <= end;
    });
    if (annotationIndex >= 0) {
      const annotation = layout.annotations[annotationIndex];
      const stroke = annotation.category === "exclude-candidate"
        ? "#be123c"
        : annotation.category === "review"
          ? "#b45309"
          : "#0369a1";
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(
        x + 1,
        y + 1,
        Math.max(1, layout.cellWidth - 2),
        Math.max(1, layout.cellHeight - 2)
      );
      ctx.restore();
      if (column.position === Math.min(annotation.start!, annotation.end!)) {
        drawText(ctx, String(annotationIndex + 1), x + layout.cellWidth - 2, y + 4, {
          color: stroke,
          fontSize: Math.max(6, layout.fontSize - 4),
          fontWeight: "700",
          align: "right"
        });
      }
    }
  });
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels
) {
  let y = block.y;

  if (layout.options.includeCoordinates) {
    drawCoordinateRow(ctx, layout, block, labels, y);
    y += layout.rowHeight;
  }

  if (layout.options.includeConservation) {
    for (const track of layout.activeTracks) {
      drawTrackRow(ctx, layout, block, labels, track, y);
      y += layout.rowHeight;
    }
  }

  if (layout.options.includeLogo) {
    drawLabel(ctx, layout, "Logo · 0–100%", block.x, y, 48, "#ffffff");
    block.columns.forEach((column,index)=>{
      let bottom=y+46;
      for(const letter of column.logo ?? []) {
        const height=44*letter.frequency;bottom-=height;
        ctx.save();ctx.translate(block.cellAreaX+index*layout.cellPitch,bottom);ctx.scale(layout.cellWidth/20,height/24);
        ctx.beginPath();ctx.rect(0,0,20,24);ctx.clip();ctx.fillStyle=letter.color;ctx.font="700 30px Arial";ctx.textAlign="center";ctx.textBaseline="alphabetic";ctx.fillText(letter.base,10,23);ctx.restore();
      }
    });
    y+=48;
  }
  for (const row of layout.rows) {
    const isReference = row.rowKey && layout.referenceSequence?.rowKey
      ? row.rowKey === layout.referenceSequence.rowKey
      : row === layout.referenceSequence;
    drawSequenceRow(
      ctx,
      layout,
      block,
      row.id,
      row.sequence,
      row.rowKey,
      y,
      isReference ? "#fffbeb" : "#ffffff",
      isReference ? "#92400e" : TEXT_COLOR
    );
    y += layout.rowHeight;
  }

  if (layout.options.includeConsensus) {
    ctx.fillStyle = CONSENSUS_BACKGROUND;
    ctx.fillRect(block.x, y, block.width, layout.rowHeight + 4);
    drawSequenceRow(
      ctx,
      layout,
      block,
      labels.consensus,
      layout.consensusSequence,
      undefined,
      y + 2,
      CONSENSUS_LABEL_BACKGROUND,
      "#134e4a"
    );
  }
}

function drawLegend(ctx: CanvasRenderingContext2D, layout: MsaExportLayout, labels: MsaExportLabels) {
  if (!layout.options.includeLegend) {
    return;
  }

  const items = layout.differenceMode
    ? [
        { label: labels.differences.match, style: differenceColorStyle("match") },
        {
          label: labels.differences.compatibleAmbiguity,
          style: differenceColorStyle("compatibleAmbiguity")
        },
        {
          label: labels.differences.substitution,
          style: differenceColorStyle("substitution")
        },
        { label: labels.differences.insertion, style: differenceColorStyle("insertion") },
        { label: labels.differences.deletion, style: differenceColorStyle("deletion") },
        {
          label: labels.differences.unknown,
          style: differenceColorStyle("unknown")
        }
      ]
    : legendColorStyles(layout.colorScheme, labels);
  let x = layout.padding;
  let y = layout.height - layout.padding - layout.legendHeight + 12;
  drawText(ctx, labels.legend, x, y + 10, {
    color: MUTED_TEXT_COLOR,
    fontSize: 11,
    fontWeight: "700"
  });
  y += 28;

  for (const item of items) {
    const itemWidth = 30 + Math.min(140, Math.max(48, item.label.length * 8)) + 16;
    if (x > layout.padding && x + itemWidth > layout.width - layout.padding) {
      x = layout.padding;
      y += 30;
    }
    ctx.fillStyle = item.style.background;
    ctx.fillRect(x, y, 22, 22);
    ctx.strokeStyle = item.style.border;
    ctx.strokeRect(x + 0.5, y + 0.5, 21, 21);
    drawText(ctx, item.label, x + 30, y + 11, {
      color: TEXT_COLOR,
      fontSize: 11,
      maxWidth: 110
    });
    x += itemWidth;
  }
}

export function renderMsaExportToCanvas(
  layout: MsaExportLayout,
  labels: MsaExportLabels
) {
  assertCanvasSizeWithinLimit(layout);

  const canvas = document.createElement("canvas");
  canvas.width = layout.canvasWidth;
  canvas.height = layout.canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas rendering is not available in this browser.");
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(layout.renderScale, 0, 0, layout.renderScale, 0, 0);
  if (!layout.options.transparentBackground) {
    ctx.fillStyle = layout.options.backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  for (const block of layout.blocks) {
    drawBlock(ctx, layout, block, labels);
  }
  drawLegend(ctx, layout, labels);
  ctx.restore();

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function renderMsaExportToPngBlob(
  layout: MsaExportLayout,
  labels: MsaExportLabels
) {
  await document.fonts?.ready;
  const canvas = renderMsaExportToCanvas(layout, labels);
  return canvasToBlob(canvas);
}
