import type { MSAResult, MSASequence } from "../../lib/types/msa";
import { rowKeyForSequence } from "../msa-viewer/alignmentModel";
import { buildReferenceCoordinateMap } from "../msa-viewer/analysis";
import { columnStatsAtPosition } from "../msa-viewer/columnStatsStore";
import type {
  MsaExportBlock,
  MsaExportColumn,
  MsaExportLayout,
  ExportPreflightResult,
  SupportedMsaExportOptions,
  MsaExportTrackId,
  MsaExportViewerState,
  MsaExportViewport
} from "./exportTypes";
import { normalizeExportRegion } from "./exportTypes";

const DEFAULT_PADDING = 24;
const DEFAULT_VISIBLE_COLUMN_COUNT = 80;
const DEFAULT_VISIBLE_ROW_COUNT = 35;
const MATRIX_SIDE_PADDING = 24;
const BLOCK_GAP = 18;
const MIN_LABEL_WIDTH = 120;
const MAX_LABEL_WIDTH = 260;
const DEFAULT_AUTO_WRAP_WIDTH = 1_600;
export const MAX_SAFE_CANVAS_PIXELS = 32_000_000;
export const MAX_SAFE_CANVAS_DIMENSION = 16_384;
export const MAX_SAFE_SVG_CELLS = 200_000;
export const MAX_SAFE_SVG_ESTIMATED_BYTES = 25 * 1024 * 1024;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function visibleColumnSlice(
  positions: number[],
  viewport: MsaExportViewport | null,
  cellPitch: number,
  labelWidth: number
) {
  if (!viewport || positions.length <= DEFAULT_VISIBLE_COLUMN_COUNT) {
    return positions.slice(0, DEFAULT_VISIBLE_COLUMN_COUNT);
  }

  const matrixScrollLeft = Math.max(
    0,
    viewport.scrollLeft - labelWidth - MATRIX_SIDE_PADDING
  );
  const viewportWidth = Math.max(1, viewport.clientWidth - labelWidth);
  const startIndex = clamp(Math.floor(matrixScrollLeft / cellPitch), 0, positions.length - 1);
  const columnCount = Math.ceil(viewportWidth / cellPitch) + 2;

  return positions.slice(startIndex, startIndex + columnCount);
}

function visibleRowSlice(
  sequences: MSASequence[],
  viewport: MsaExportViewport | null,
  rowHeight: number,
  trackCount: number
) {
  if (!viewport || sequences.length <= DEFAULT_VISIBLE_ROW_COUNT) {
    return sequences.slice(0, DEFAULT_VISIBLE_ROW_COUNT);
  }

  const headerHeight = rowHeight * (1 + trackCount);
  const matrixScrollTop = Math.max(0, viewport.scrollTop - headerHeight);
  const startIndex = clamp(Math.floor(matrixScrollTop / rowHeight), 0, sequences.length - 1);
  const rowCount = Math.ceil(Math.max(1, viewport.clientHeight - headerHeight) / rowHeight) + 3;

  return sequences.slice(startIndex, startIndex + rowCount);
}

function resolveColumns(
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions,
  labelWidth: number,
  cellPitch: number
) {
  const region = normalizeExportRegion(options.region);
  if (region === "selectedInterval") {
    if (
      !state.selectedRange ||
      state.selectedRange.start === null ||
      state.selectedRange.end === null ||
      state.alignmentLength <= 0
    ) {
      return [];
    }

    const start = clamp(
      Math.min(state.selectedRange.start, state.selectedRange.end),
      1,
      state.alignmentLength
    );
    const end = clamp(
      Math.max(state.selectedRange.start, state.selectedRange.end),
      1,
      state.alignmentLength
    );
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
      start + index
    );
  }

  if (region === "viewport") {
    return visibleColumnSlice(
      state.visiblePositions,
      state.viewport,
      cellPitch,
      labelWidth
    );
  }

  if (region === "fullAlignment") {
    return Array.from(
      { length: Math.max(0, state.alignmentLength) },
      (_, index) => index + 1
    );
  }

  return state.visiblePositions;
}

function resolveRows(
  alignment: MSAResult,
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions,
  rowHeight: number,
  trackCount: number
) {
  const region = normalizeExportRegion(options.region);
  if (region === "viewport") {
    return visibleRowSlice(state.sequences, state.viewport, rowHeight, trackCount);
  }

  if (region === "fullAlignment") {
    return alignment.sequences;
  }

  return state.sequences;
}

function resolveRowCount(
  alignment: MSAResult,
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions,
  rowHeight: number,
  trackCount: number
) {
  return resolveRows(alignment, state, options, rowHeight, trackCount).length;
}

function resolveColumnCount(
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions,
  labelWidth: number,
  cellPitch: number
) {
  const region = normalizeExportRegion(options.region);
  if (region === "selectedInterval") {
    if (
      !state.selectedRange ||
      state.selectedRange.start === null ||
      state.selectedRange.end === null ||
      state.alignmentLength <= 0
    ) {
      return 0;
    }
    const start = clamp(
      Math.min(state.selectedRange.start, state.selectedRange.end),
      1,
      state.alignmentLength
    );
    const end = clamp(
      Math.max(state.selectedRange.start, state.selectedRange.end),
      1,
      state.alignmentLength
    );
    return Math.max(0, end - start + 1);
  }
  if (region === "viewport") {
    return visibleColumnSlice(
      state.visiblePositions,
      state.viewport,
      cellPitch,
      labelWidth
    ).length;
  }
  if (region === "fullAlignment") {
    return Math.max(0, state.alignmentLength);
  }
  return state.visiblePositions.length;
}

function resolveActiveTracks(state: MsaExportViewerState) {
  const validTracks = new Set<MsaExportTrackId>([
    "conservation",
    "gap",
    "coverage",
    "entropy"
  ]);
  return Array.from(
    new Set(
      (state.activeTracks ?? ["conservation"]).filter(
        (track): track is MsaExportTrackId => validTracks.has(track)
      )
    )
  );
}

function columnsPerExportBlock(
  options: SupportedMsaExportOptions,
  columnCount: number,
  labelWidth: number,
  cellPitch: number
) {
  const wrapMode = options.wrapMode ?? (
    options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line"
  );
  if (wrapMode === "single-line") {
    return Math.max(1, columnCount);
  }
  if (wrapMode === "auto-wrap") {
    const targetWidth = clamp(
      Math.floor(options.targetContentWidth ?? DEFAULT_AUTO_WRAP_WIDTH),
      480,
      4_096
    );
    const available = Math.max(cellPitch, targetWidth - DEFAULT_PADDING * 2 - labelWidth);
    return clamp(
      Math.floor(available / cellPitch),
      1,
      Math.max(1, columnCount)
    );
  }
  return clamp(
    Math.floor(options.wrapColumnCount || 120),
    1,
    Math.max(1, columnCount)
  );
}

function toColumns(
  positions: number[],
  state: MsaExportViewerState,
  referenceSequence: MSASequence | null
): MsaExportColumn[] {
  const referenceCoordinates = referenceSequence
    ? buildReferenceCoordinateMap(referenceSequence.sequence)
        .alignmentToReferenceLabel
    : [];
  return positions.map((position) => ({
    position,
    referencePosition: referenceCoordinates[position - 1] ?? null,
    conservation: state.columnStore
      ? columnStatsAtPosition(state.columnStore, position) ?? undefined
      : state.conservationColumns?.[position - 1]
  }));
}

function blockHeight(
  rows: MSASequence[],
  options: SupportedMsaExportOptions,
  rowHeight: number,
  trackCount: number
) {
  return (
    (options.includeCoordinates ? rowHeight : 0) +
    (options.includeConservation ? rowHeight * trackCount : 0) +
    rows.length * rowHeight +
    (options.includeConsensus ? rowHeight + 4 : 0)
  );
}

function blockWidth(
  columnCount: number,
  labelWidth: number,
  cellWidth: number,
  cellGap: number
) {
  const matrixWidth =
    columnCount > 0
      ? columnCount * cellWidth + Math.max(0, columnCount - 1) * cellGap
      : cellWidth;

  return labelWidth + matrixWidth;
}

function legendHeightForWidth(width: number, enabled: boolean) {
  if (!enabled) return 0;
  const usableWidth = Math.max(170, width - DEFAULT_PADDING * 2);
  const rows = Math.max(1, Math.ceil((7 * 170) / usableWidth));
  return 30 + rows * 30;
}

export function estimateSvgExportBytes({
  blockCount,
  columnCount,
  renderedCellCount,
  rowCount,
  showCharacters
}: {
  blockCount: number;
  columnCount: number;
  renderedCellCount: number;
  rowCount: number;
  showCharacters: boolean;
}) {
  const bytesPerCell = showCharacters ? 210 : 112;
  const labelAndGroupBytes = blockCount * 96 + rowCount * Math.max(1, blockCount) * 180;
  const coordinateBytes = columnCount * 12;
  return Math.ceil(
    768 + renderedCellCount * bytesPerCell + labelAndGroupBytes + coordinateBytes
  );
}

function boundedPositiveLimit(value: number | undefined, hardLimit: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return hardLimit;
  }
  return Math.max(1, Math.min(Math.floor(value), hardLimit));
}

export function calculateExportPreflight(
  alignment: MSAResult,
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions
): ExportPreflightResult {
  const cellWidth = Math.max(1, state.viewSettings.cellWidth);
  const cellHeight = Math.max(1, state.viewSettings.cellHeight);
  const cellGap = Math.max(0, state.viewSettings.cellGap);
  const cellPitch = cellWidth + cellGap;
  const rowHeight = Math.max(cellHeight, state.viewSettings.rowHeight);
  const labelWidth = options.includeSequenceNames
    ? clamp(state.viewSettings.labelWidth, MIN_LABEL_WIDTH, MAX_LABEL_WIDTH)
    : 0;
  const activeTracks = resolveActiveTracks(state);
  const rowCount = resolveRowCount(
    alignment,
    state,
    options,
    rowHeight,
    activeTracks.length
  );
  const columnCount = resolveColumnCount(state, options, labelWidth, cellPitch);
  const canonicalRegion = normalizeExportRegion(options.region);
  const columnsPerBlock = columnsPerExportBlock(
    options,
    columnCount,
    labelWidth,
    cellPitch
  );
  const blockCount = Math.max(1, Math.ceil(columnCount / columnsPerBlock));
  const widestBlockColumnCount = Math.max(1, Math.min(columnCount, columnsPerBlock));
  const blockRowHeight = blockHeight(
    Array.from({ length: rowCount }) as MSASequence[],
    options,
    rowHeight,
    activeTracks.length
  );
  const blockPixelWidth = blockWidth(
    widestBlockColumnCount,
    labelWidth,
    cellWidth,
    cellGap
  );
  const width = DEFAULT_PADDING * 2 + blockPixelWidth;
  const legendHeight = legendHeightForWidth(width, options.includeLegend);
  const height =
    DEFAULT_PADDING * 2 +
    blockCount * blockRowHeight +
    Math.max(0, blockCount - 1) * BLOCK_GAP +
    legendHeight;
  const requestedScale = options.format === "png" ? Math.max(0.1, options.scale) : 1;
  const renderedRowCount =
    rowCount +
    (options.includeCoordinates ? 1 : 0) +
    (options.includeConservation ? activeTracks.length : 0) +
    (options.includeConsensus ? 1 : 0);
  const renderedCellCount = renderedRowCount * columnCount;
  const estimatedSvgBytes = estimateSvgExportBytes({
    blockCount,
    columnCount,
    renderedCellCount,
    rowCount: renderedRowCount,
    showCharacters: state.viewSettings.showCharacters
  });
  const effectiveCanvasPixelLimit = boundedPositiveLimit(
    options.maxCanvasPixels,
    MAX_SAFE_CANVAS_PIXELS
  );
  const effectiveCanvasDimensionLimit = boundedPositiveLimit(
    options.maxCanvasDimension,
    MAX_SAFE_CANVAS_DIMENSION
  );
  const effectiveSvgCellLimit = boundedPositiveLimit(
    options.maxSvgCells,
    MAX_SAFE_SVG_CELLS
  );
  const effectiveSvgEstimatedByteLimit = boundedPositiveLimit(
    options.maxSvgEstimatedBytes,
    MAX_SAFE_SVG_ESTIMATED_BYTES
  );
  const wrapMode = options.wrapMode ?? (
    options.layoutMode === "wrapped" ? "fixed-wrap" : "single-line"
  );
  const paginationEligible =
    options.format === "png" &&
    (options.bundleMode ?? "qc-bundle") === "qc-bundle" &&
    wrapMode !== "single-line" &&
    blockCount > 1;
  const oneBlockHeight = DEFAULT_PADDING * 2 + blockRowHeight + legendHeight;
  const scaleSafetyHeight = paginationEligible ? oneBlockHeight : height;
  const safePixelScale = Math.sqrt(
    effectiveCanvasPixelLimit / Math.max(1, width * scaleSafetyHeight)
  );
  const safeDimensionScale = Math.min(
    effectiveCanvasDimensionLimit / Math.max(1, width),
    effectiveCanvasDimensionLimit / Math.max(1, scaleSafetyHeight)
  );
  const maximumSafeScale = Math.min(safePixelScale, safeDimensionScale);
  const presetSafeScale = Math.floor(maximumSafeScale * 2) / 2;
  const resolvedScale =
    options.format === "png" &&
    options.preset === "presentation-png" &&
    presetSafeScale >= 0.5
      ? Math.min(requestedScale, presetSafeScale)
      : requestedScale;
  const maximumPageLogicalHeight = Math.min(
    effectiveCanvasDimensionLimit / resolvedScale,
    effectiveCanvasPixelLimit / Math.max(1, width * resolvedScale * resolvedScale)
  );
  const availablePageBlockHeight =
    maximumPageLogicalHeight - DEFAULT_PADDING * 2 - legendHeight;
  const pageBlockCapacity = Math.max(
    0,
    Math.floor((availablePageBlockHeight + BLOCK_GAP) / (blockRowHeight + BLOCK_GAP))
  );
  const blocksPerPage =
    paginationEligible && pageBlockCapacity >= 1
      ? Math.min(blockCount, pageBlockCapacity)
      : blockCount;
  const pageCount = Math.max(1, Math.ceil(blockCount / Math.max(1, blocksPerPage)));
  const requiresPagination = pageCount > 1;
  const pageHeight =
    DEFAULT_PADDING * 2 +
    Math.min(blockCount, blocksPerPage) * blockRowHeight +
    Math.max(0, Math.min(blockCount, blocksPerPage) - 1) * BLOCK_GAP +
    legendHeight;
  const canvasWidth = Math.ceil(width * resolvedScale);
  const canvasHeight = Math.ceil(pageHeight * resolvedScale);
  const canvasPixels = canvasWidth * canvasHeight;
  const canvasMegapixels = canvasPixels / 1_000_000;
  let exportLimitKind: ExportPreflightResult["exportLimitKind"] = null;
  let limitReason: string | null = null;
  if (
    options.format === "png" &&
    (canvasWidth > effectiveCanvasDimensionLimit ||
      canvasHeight > effectiveCanvasDimensionLimit)
  ) {
    exportLimitKind = "png-dimension";
    limitReason = `PNG export would create a ${canvasWidth.toLocaleString()} × ${canvasHeight.toLocaleString()} canvas, above the ${effectiveCanvasDimensionLimit.toLocaleString()} px single-dimension limit.`;
  } else if (options.format === "png" && canvasPixels > effectiveCanvasPixelLimit) {
    exportLimitKind = "png-pixels";
    limitReason = `PNG export would create ${canvasMegapixels.toFixed(1)} MP, above the ${(effectiveCanvasPixelLimit / 1_000_000).toFixed(0)} MP limit.`;
  } else if (options.format === "svg" && renderedCellCount > effectiveSvgCellLimit) {
    exportLimitKind = "svg-cells";
    limitReason = `SVG export would render ${renderedCellCount.toLocaleString()} cells, above the ${effectiveSvgCellLimit.toLocaleString()} cell limit.`;
  } else if (
    options.format === "svg" &&
    estimatedSvgBytes > effectiveSvgEstimatedByteLimit
  ) {
    exportLimitKind = "svg-estimated-bytes";
    limitReason = `SVG export is estimated at ${(estimatedSvgBytes / (1024 * 1024)).toFixed(1)} MB, above the ${(effectiveSvgEstimatedByteLimit / (1024 * 1024)).toFixed(0)} MB limit.`;
  }
  return {
    canonicalRegion,
    rowCount,
    columnCount,
    blockCount,
    blocksPerPage,
    pageCount,
    requiresPagination,
    pageHeight,
    totalHeight: height,
    width,
    height,
    canvasWidth,
    canvasHeight,
    canvasPixels,
    canvasMegapixels,
    requestedScale,
    resolvedScale,
    scaleAdjusted: resolvedScale !== requestedScale,
    renderedCellCount,
    estimatedSvgBytes,
    effectiveCanvasPixelLimit,
    effectiveCanvasDimensionLimit,
    effectiveSvgCellLimit,
    effectiveSvgEstimatedByteLimit,
    exportLimitExceeded: exportLimitKind !== null,
    exportLimitKind,
    limitReason
  };
}

export function calculateExportLayout(
  alignment: MSAResult,
  state: MsaExportViewerState,
  options: SupportedMsaExportOptions
): MsaExportLayout {
  const preflight = calculateExportPreflight(alignment, state, options);
  const cellWidth = Math.max(1, state.viewSettings.cellWidth);
  const cellHeight = Math.max(1, state.viewSettings.cellHeight);
  const cellGap = Math.max(0, state.viewSettings.cellGap);
  const cellPitch = cellWidth + cellGap;
  const rowHeight = Math.max(cellHeight, state.viewSettings.rowHeight);
  const labelWidth = options.includeSequenceNames
    ? clamp(state.viewSettings.labelWidth, MIN_LABEL_WIDTH, MAX_LABEL_WIDTH)
    : 0;
  const activeTracks = resolveActiveTracks(state);
  const referenceSequence = alignment.sequences.find((sequence, index) => {
    const rowKey = rowKeyForSequence(sequence, index);
    return state.referenceRowKey
      ? rowKey === state.referenceRowKey
      : sequence.id === state.referenceSequenceId;
  }) ?? null;
  const coordinateMode =
    state.coordinateMode === "reference" && referenceSequence
      ? "reference"
      : "alignment";
  const canonicalRegion = normalizeExportRegion(options.region);
  const rows = resolveRows(
    alignment,
    state,
    options,
    rowHeight,
    activeTracks.length
  );
  const columns = toColumns(
    resolveColumns(state, options, labelWidth, cellPitch),
    state,
    referenceSequence
  );
  const columnsPerBlock = columnsPerExportBlock(
    options,
    columns.length,
    labelWidth,
    cellPitch
  );
  const blocks: MsaExportBlock[] = [];
  const blockRowHeight = blockHeight(
    rows,
    options,
    rowHeight,
    activeTracks.length
  );
  let y = DEFAULT_PADDING;
  let width = DEFAULT_PADDING * 2 + labelWidth + cellWidth;

  for (let start = 0; start < Math.max(1, columns.length); start += columnsPerBlock) {
    const blockColumns = columns.slice(start, start + columnsPerBlock);
    const resolvedColumns = blockColumns.length ? blockColumns : [];
    const resolvedWidth = blockWidth(
      Math.max(1, resolvedColumns.length),
      labelWidth,
      cellWidth,
      cellGap
    );

    blocks.push({
      columns: resolvedColumns,
      x: DEFAULT_PADDING,
      y,
      width: resolvedWidth,
      height: blockRowHeight,
      cellAreaX: DEFAULT_PADDING + labelWidth
    });

    width = Math.max(width, DEFAULT_PADDING * 2 + resolvedWidth);
    y += blockRowHeight + BLOCK_GAP;

    if (columns.length === 0) {
      break;
    }
  }

  const legendHeight = legendHeightForWidth(width, options.includeLegend);
  const height =
    DEFAULT_PADDING +
    blocks.reduce((sum, block) => sum + block.height, 0) +
    Math.max(0, blocks.length - 1) * BLOCK_GAP +
    legendHeight +
    DEFAULT_PADDING;
  const canvasWidth = preflight.canvasWidth;
  const canvasHeight = preflight.canvasHeight;
  const canvasPixels = preflight.canvasPixels;
  const canvasMegapixels = preflight.canvasMegapixels;
  const renderedCellCount = preflight.renderedCellCount;
  const estimatedSvgBytes = preflight.estimatedSvgBytes;

  return {
    alignment,
    options,
    canonicalRegion,
    rows,
    columns,
    blocks,
    width,
    height,
    padding: DEFAULT_PADDING,
    labelWidth,
    cellWidth,
    cellHeight,
    cellGap,
    cellPitch,
    rowHeight,
    fontSize: state.viewSettings.fontSize,
    colorScheme: state.colorScheme,
    showCharacters: state.viewSettings.showCharacters,
    markerEvery: state.viewSettings.markerEvery,
    legendHeight,
    canvasWidth,
    canvasHeight,
    canvasPixels,
    canvasMegapixels,
    renderScale: preflight.resolvedScale,
    requestedScale: preflight.requestedScale,
    resolvedScale: preflight.resolvedScale,
    scaleAdjusted: preflight.scaleAdjusted,
    renderedCellCount,
    estimatedSvgBytes,
    effectiveCanvasPixelLimit: preflight.effectiveCanvasPixelLimit,
    effectiveCanvasDimensionLimit: preflight.effectiveCanvasDimensionLimit,
    effectiveSvgCellLimit: preflight.effectiveSvgCellLimit,
    effectiveSvgEstimatedByteLimit: preflight.effectiveSvgEstimatedByteLimit,
    exportLimitExceeded: preflight.exportLimitExceeded,
    exportLimitKind: preflight.exportLimitKind,
    exceedsCanvasLimit: preflight.exportLimitExceeded,
    limitReason: preflight.limitReason,
    activeTracks,
    coordinateMode,
    differenceMode: Boolean(state.differenceMode && referenceSequence),
    referenceSequence,
    consensusSequence: state.consensusSequence ?? alignment.consensus ?? "",
    annotations: options.includeAnnotations ? state.annotations ?? [] : [],
    pageIndex: 0,
    pageCount: preflight.pageCount
  };
}

export function paginateMsaExportLayout(
  layout: MsaExportLayout,
  preflight: ExportPreflightResult
): MsaExportLayout[] {
  if (!preflight.requiresPagination || preflight.pageCount <= 1) {
    return [{ ...layout, pageIndex: 0, pageCount: 1 }];
  }
  const pages: MsaExportLayout[] = [];
  for (
    let blockStart = 0, pageIndex = 0;
    blockStart < layout.blocks.length;
    blockStart += preflight.blocksPerPage, pageIndex += 1
  ) {
    const sourceBlocks = layout.blocks.slice(
      blockStart,
      blockStart + preflight.blocksPerPage
    );
    const blocks = sourceBlocks.map((block, index) => ({
      ...block,
      y: DEFAULT_PADDING + index * (block.height + BLOCK_GAP)
    }));
    const pageColumns = blocks.flatMap((block) => block.columns);
    const height =
      DEFAULT_PADDING * 2 +
      blocks.reduce((sum, block) => sum + block.height, 0) +
      Math.max(0, blocks.length - 1) * BLOCK_GAP +
      layout.legendHeight;
    const canvasHeight = Math.ceil(height * layout.renderScale);
    const canvasPixels = layout.canvasWidth * canvasHeight;
    const renderedRowCount =
      layout.rows.length +
      (layout.options.includeCoordinates ? 1 : 0) +
      (layout.options.includeConservation ? layout.activeTracks.length : 0) +
      (layout.options.includeConsensus ? 1 : 0);
    pages.push({
      ...layout,
      blocks,
      columns: pageColumns,
      height,
      canvasHeight,
      canvasPixels,
      canvasMegapixels: canvasPixels / 1_000_000,
      renderedCellCount: renderedRowCount * pageColumns.length,
      estimatedSvgBytes: estimateSvgExportBytes({
        blockCount: blocks.length,
        columnCount: pageColumns.length,
        renderedCellCount: renderedRowCount * pageColumns.length,
        rowCount: renderedRowCount,
        showCharacters: layout.showCharacters
      }),
      pageIndex,
      pageCount: preflight.pageCount
    });
  }
  return pages;
}
