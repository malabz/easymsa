import { conservationBar, conservationScaleRange, formatConservation } from "../msa-viewer/conservationDisplay";
import { legendColorStyles, msaCellColorStyle } from "./exportColors";
import { classifyDifference } from "../msa-viewer/analysis";
import { differenceColorStyle } from "../msa-viewer/differenceColors";
import {
  MSA_EXPORT_MANIFEST_SCHEMA,
  sanitizeManifestLabel,
  type MsaExportManifestV1
} from "./exportManifest";
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

  const clipId = `msa-label-${Math.round(x)}-${Math.round(y)}-${Math.round(height)}`;
  return [
    `<g><title>${escapeSvg(value)}</title>`,
    `<defs><clipPath id="${clipId}"><rect x="${x + 6}" y="${y}" width="${Math.max(1, layout.labelWidth - 12)}" height="${height}"/></clipPath></defs>`,
    rect(x, y, layout.labelWidth, height, background, LABEL_BORDER),
    `<g clip-path="url(#${clipId})">`,
    text(value, x + 10, y + height / 2, {
      fill: color,
      size: Math.max(9, layout.fontSize)
    }),
    `</g></g>`
  ].join("");
}

function renderCoordinateBreak(x: number, y: number, height: number) {
  return `<path d="M ${x - 2} ${y + height * 0.25} l 4 ${height * 0.2} M ${x - 2} ${y + height * 0.55} l 4 ${height * 0.2}" fill="none" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/>`;
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
    ? layout.referenceSequence?.sequence.replace(/-/g, "").length ?? 0
    : layout.alignment.alignmentLength ?? layout.columns.reduce(
        (maximum, column) => Math.max(maximum, column.position),
        0
      );
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
    const coordinateBreak =
      index > 0 &&
      column.position !== block.columns[index - 1].position + 1;
    parts.push(rect(x, y, layout.cellWidth, layout.cellHeight, LABEL_BACKGROUND));
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
      parts.push(
        text(String(coordinate), x + layout.cellWidth / 2, y + layout.cellHeight / 2, {
          fill: MUTED_TEXT_COLOR,
          size: Math.max(8, layout.fontSize - 2),
          anchor: "middle"
        })
      );
    }
    if (coordinateBreak) {
      parts.push(renderCoordinateBreak(x, y, layout.cellHeight));
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
  return stats?.conservation ?? null;
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
    renderLabel(layout, track === "conservation" ? "" : labels.tracks[track], block.x, y, layout.rowHeight, "#ffffff"),
    ...(track === "conservation" && layout.labelWidth > 0 ? [
      text(labels.tracks[track], block.x + 10, y + 7, { size: 10, fill: MUTED_TEXT_COLOR }),
      text(conservationScaleRange(layout.conservationScale ?? "full").label,
        block.x + 10, y + layout.rowHeight - 4, { size: 8, fill: MUTED_TEXT_COLOR })
    ] : [])
  ];

  block.columns.forEach((column, index) => {
    const x = block.cellAreaX + index * layout.cellPitch;
    const value = trackValue(column, track);
    const bar = track === "conservation"
      ? conservationBar(value, layout.conservationScale ?? "full", layout.cellHeight)
      : { height: Math.max(2, Math.round(layout.cellHeight * (value ?? 0))), belowRange: false, opacity: 0.18 + (value ?? 0) * 0.72 };
    const barHeight = bar.height;
    const opacity = bar.opacity;
    parts.push(rect(x, y, layout.cellWidth, layout.cellHeight, "#ffffff"));
    const barRect = rect(x, y + layout.cellHeight - barHeight, layout.cellWidth, barHeight,
      bar.belowRange ? "#d97706" : TRACK_COLORS[track], "none", opacity);
    parts.push(track === "conservation"
      ? `<g><title>${escapeSvg(`${labels.tracks[track]} ${column.position}: ${value === null ? "N/A" : formatConservation(value)}${bar.belowRange ? "; below 80%" : ""}`)}</title>${barRect}</g>`
      : barRect);
  });

  return parts.join("");
}

function renderSequenceRow(
  layout: MsaExportLayout,
  block: MsaExportBlock,
  sequenceId: string,
  sequence: string,
  rowKey: string | undefined,
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
      parts.push(`<rect x="${x + 1}" y="${y + 1}" width="${Math.max(1, layout.cellWidth - 2)}" height="${Math.max(1, layout.cellHeight - 2)}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="3 2"/>`);
      if (column.position === Math.min(annotation.start!, annotation.end!)) {
        parts.push(text(String(annotationIndex + 1), x + layout.cellWidth - 2, y + 4, {
          fill: stroke,
          size: Math.max(6, layout.fontSize - 4),
          weight: 700,
          anchor: "end"
        }));
      }
    }
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

  if (layout.options.includeLogo) {
    parts.push(renderLabel(layout, "Logo · 0–100%", block.x, y, 48, "#ffffff"));
    block.columns.forEach((column,index)=>{
      let bottom=y+46;
      for(const letter of column.logo ?? []) {
        const height=44*letter.frequency;bottom-=height;
        parts.push(`<svg x="${block.cellAreaX+index*layout.cellPitch}" y="${bottom}" width="${layout.cellWidth}" height="${height}" viewBox="0 0 20 24" preserveAspectRatio="none"><text x="10" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" fill="${letter.color}">${letter.base}</text></svg>`);
      }
    });
    y+=48;
  }
  for (const row of layout.rows) {
    const isReference = row.rowKey && layout.referenceSequence?.rowKey
      ? row.rowKey === layout.referenceSequence.rowKey
      : row === layout.referenceSequence;
    parts.push(
      renderSequenceRow(
        layout,
        block,
        row.id,
        row.sequence,
        row.rowKey,
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
        layout.consensusSequence,
        undefined,
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
  const parts = [
    `<g>`,
    text(labels.legend, x, y + 10, {
      fill: MUTED_TEXT_COLOR,
      size: 11,
      weight: 700
    })
  ];
  y += 28;

  for (const item of items) {
    const itemWidth = 30 + Math.min(140, Math.max(48, item.label.length * 8)) + 16;
    if (x > layout.padding && x + itemWidth > layout.width - layout.padding) {
      x = layout.padding;
      y += 30;
    }
    parts.push(rect(x, y, 22, 22, item.style.background, item.style.border));
    parts.push(text(item.label, x + 30, y + 11, { size: 11 }));
    x += itemWidth;
  }

  parts.push("</g>");
  return parts.join("");
}

export function renderMsaExportToSvg(
  layout: MsaExportLayout,
  labels: MsaExportLabels,
  manifest?: MsaExportManifestV1
) {
  const background = layout.options.transparentBackground
    ? ""
    : rect(0, 0, layout.width, layout.height, layout.options.backgroundColor || "#ffffff");
  const blocks = layout.blocks
    .map((block) => renderBlock(layout, block, labels))
    .join("");
  const sourceLabel = manifest?.source.label ?? sanitizeManifestLabel(
    layout.alignment.descriptor?.sourceName ?? layout.alignment.jobId,
    "alignment"
  );
  const metadata = manifest ?? {
    schema: MSA_EXPORT_MANIFEST_SCHEMA,
    source: { label: sourceLabel },
    view: { conservationScale: conservationScaleRange(layout.conservationScale ?? "full") },
    scope: {
      region: layout.canonicalRegion,
      rowCount: layout.rows.length,
      columnCount: layout.columns.length
    }
  };

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img">`,
    `<title>${escapeSvg(`EasyMSA MSA export: ${sourceLabel}`)}</title>`,
    `<desc>${escapeSvg(`${layout.rows.length} rows and ${layout.columns.length} alignment columns; ${layout.canonicalRegion} region.`)}</desc>`,
    `<metadata id="easymsa-export-metadata" data-schema="${MSA_EXPORT_MANIFEST_SCHEMA}">${escapeSvg(JSON.stringify(metadata))}</metadata>`,
    `<style>text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-variant-ligatures:none;letter-spacing:0;text-rendering:geometricPrecision}rect,path{shape-rendering:geometricPrecision}</style>`,
    background,
    blocks,
    renderLegend(layout, labels),
    `</svg>`
  ].join("");
}
