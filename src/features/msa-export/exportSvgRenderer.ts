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

function escapeSvg(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke = "none",
  opacity?: number
) {
  const opacityAttr = opacity === undefined ? "" : ` opacity="${opacity.toFixed(3)}"`;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}"${opacityAttr}/>`;
}

function text(
  value: string,
  x: number,
  y: number,
  options: {
    fill?: string;
    size?: number;
    weight?: number;
    anchor?: "start" | "middle" | "end";
  } = {}
) {
  return `<text x="${x}" y="${y}" fill="${options.fill ?? TEXT_COLOR}" font-size="${options.size ?? 12}" font-weight="${options.weight ?? 500}" text-anchor="${options.anchor ?? "start"}" dominant-baseline="middle">${escapeSvg(value)}</text>`;
}

function renderLabel(
  layout: MsaExportLayout,
  value: string,
  x: number,
  y: number,
  height: number,
  background = LABEL_BACKGROUND,
  color = MUTED_TEXT_COLOR
) {
  if (!layout.options.includeSequenceNames || layout.labelWidth <= 0) {
    return "";
  }

  return [
    rect(x, y, layout.labelWidth, height, background, LABEL_BORDER),
    text(value, x + 10, y + height / 2, {
      fill: color,
      size: Math.max(9, layout.fontSize)
    })
  ].join("");
}

function renderCell(
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
  const border = layout.showCharacters ? color.border : "none";
  const cell = [rect(x, y, layout.cellWidth, layout.cellHeight, color.background, border)];

  if (layout.showCharacters && base) {
    cell.push(
      text(base, x + layout.cellWidth / 2, y + layout.cellHeight / 2, {
        fill: color.text,
        size: layout.fontSize,
        weight: 700,
        anchor: "middle"
      })
    );
  }

  return cell.join("");
}

function renderCoordinateRow(
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels,
  y: number
) {
  const coordinateLength = layout.coordinateMode === "reference"
    ? Math.max(0, ...layout.columns.map((column) => column.referencePosition ?? 0))
    : layout.alignment.alignmentLength ??
      Math.max(0, ...layout.columns.map((column) => column.position));
  const parts = [
    renderLabel(
      layout,
      layout.coordinateMode === "reference" ? labels.referencePosition : labels.position,
      block.x,
      y,
      layout.rowHeight
    )
  ];

  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    parts.push(rect(x, y, layout.cellWidth, layout.cellHeight, LABEL_BACKGROUND));
    const coordinate = layout.coordinateMode === "reference"
      ? column.referencePosition ?? null
      : column.position;
    const showMarker = coordinate !== null && (
      coordinate === 1 ||
      coordinate === coordinateLength ||
      coordinate % layout.markerEvery === 0
    );

    if (showMarker) {
      parts.push(
        text(String(coordinate), x + layout.cellWidth / 2, y + layout.cellHeight / 2, {
          fill: MUTED_TEXT_COLOR,
          size: Math.max(8, layout.fontSize - 2),
          anchor: "middle"
        })
      );
    }
  });

  return parts.join("");
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
  return stats?.conservation ?? 0;
}

const TRACK_COLORS: Record<MsaExportTrackId, string> = {
  conservation: "#0f766e",
  gap: "#f43f5e",
  coverage: "#0284c7",
  entropy: "#7c3aed"
};

function renderTrackRow(
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels,
  track: MsaExportTrackId,
  y: number
) {
  const parts = [
    renderLabel(layout, labels.tracks[track], block.x, y, layout.rowHeight, "#ffffff")
  ];

  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    const value = trackValue(column, track);
    const barHeight = Math.max(2, Math.round(layout.cellHeight * value));
    const opacity = 0.18 + value * 0.72;
    parts.push(rect(x, y, layout.cellWidth, layout.cellHeight, "#ffffff"));
    parts.push(
      rect(
        x,
        y + layout.cellHeight - barHeight,
        layout.cellWidth,
        barHeight,
        TRACK_COLORS[track],
        "none",
        opacity
      )
    );
  });

  return parts.join("");
}

function renderSequenceRow(
  layout: MsaExportLayout,
  block: MsaExportBlock,
  sequenceId: string,
  sequence: string,
  y: number,
  labelBackground = "#ffffff",
  labelColor = TEXT_COLOR
) {
  const parts = [
    renderLabel(layout, sequenceId, block.x, y, layout.rowHeight, labelBackground, labelColor)
  ];

  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    parts.push(
      renderCell(
        layout,
        column,
        sequence[column.position - 1] ?? "",
        layout.referenceSequence?.sequence[column.position - 1] ?? "",
        x,
        y
      )
    );
  });

  return parts.join("");
}

function renderBlock(
  layout: MsaExportLayout,
  block: MsaExportBlock,
  labels: MsaExportLabels
) {
  const parts: string[] = [`<g>`];
  let y = block.y;

  if (layout.options.includeCoordinates) {
    parts.push(renderCoordinateRow(layout, block, labels, y));
    y += layout.rowHeight;
  }

  if (layout.options.includeConservation) {
    for (const track of layout.activeTracks) {
      parts.push(renderTrackRow(layout, block, labels, track, y));
      y += layout.rowHeight;
    }
  }

  for (const row of layout.rows) {
    const isReference = row.id === layout.referenceSequence?.id;
    parts.push(
      renderSequenceRow(
        layout,
        block,
        row.id,
        row.sequence,
        y,
        isReference ? "#fffbeb" : "#ffffff",
        isReference ? "#92400e" : TEXT_COLOR
      )
    );
    y += layout.rowHeight;
  }

  if (layout.options.includeConsensus) {
    parts.push(rect(block.x, y, block.width, layout.rowHeight + 4, CONSENSUS_BACKGROUND));
    parts.push(
      renderSequenceRow(
        layout,
        block,
        labels.consensus,
        layout.alignment.consensus,
        y + 2,
        CONSENSUS_LABEL_BACKGROUND,
        "#134e4a"
      )
    );
  }

  parts.push("</g>");
  return parts.join("");
}

function renderLegend(layout: MsaExportLayout, labels: MsaExportLabels) {
  if (!layout.options.includeLegend) {
    return "";
  }

  const items = layout.differenceMode
    ? [
        { label: labels.differences.match, style: differenceColorStyle("match") },
        { label: labels.differences.mismatch, style: differenceColorStyle("mismatch") },
        { label: labels.differences.insertion, style: differenceColorStyle("insertion") },
        { label: labels.differences.deletion, style: differenceColorStyle("deletion") }
      ]
    : legendColorStyles(layout.colorScheme, labels);
  let x = layout.padding;
  const y = layout.height - layout.padding - 30;
  const parts = [
    `<g>`,
    text(labels.legend, x, y + 12, {
      fill: MUTED_TEXT_COLOR,
      size: 11,
      weight: 700
    })
  ];
  x += 95;

  for (const item of items) {
    parts.push(rect(x, y, 22, 22, item.style.background, item.style.border));
    parts.push(text(item.label, x + 30, y + 11, { size: 11 }));
    x += 30 + Math.min(110, Math.max(36, item.label.length * 8)) + 16;
  }

  parts.push("</g>");
  return parts.join("");
}

export function renderMsaExportToSvg(
  layout: MsaExportLayout,
  labels: MsaExportLabels
) {
  const background = layout.options.transparentBackground
    ? ""
    : rect(0, 0, layout.width, layout.height, layout.options.backgroundColor || "#ffffff");
  const blocks = layout.blocks
    .map((block) => renderBlock(layout, block, labels))
    .join("");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img">`,
    `<style>text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:0}</style>`,
    background,
    blocks,
    renderLegend(layout, labels),
    `</svg>`
  ].join("");
}
