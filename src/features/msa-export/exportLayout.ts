import type { MSAResult, MSASequence } from "../../lib/types/msa";
import type {
  MsaExportBlock,
  MsaExportColumn,
  MsaExportLayout,
  MsaExportOptions,
  MsaExportViewerState,
  MsaExportViewport
} from "./exportTypes";

const DEFAULT_PADDING = 24;
const DEFAULT_VISIBLE_COLUMN_COUNT = 80;
const DEFAULT_VISIBLE_ROW_COUNT = 35;
const MATRIX_SIDE_PADDING = 24;
const BLOCK_GAP = 18;
const LEGEND_HEIGHT = 52;
const MIN_LABEL_WIDTH = 120;
const MAX_LABEL_WIDTH = 260;

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
  rowHeight: number
) {
  if (!viewport || sequences.length <= DEFAULT_VISIBLE_ROW_COUNT) {
    return sequences.slice(0, DEFAULT_VISIBLE_ROW_COUNT);
  }

  const headerHeight = rowHeight * 2;
  const matrixScrollTop = Math.max(0, viewport.scrollTop - headerHeight);
  const startIndex = clamp(Math.floor(matrixScrollTop / rowHeight), 0, sequences.length - 1);
  const rowCount = Math.ceil(Math.max(1, viewport.clientHeight - headerHeight) / rowHeight) + 3;

  return sequences.slice(startIndex, startIndex + rowCount);
}

function resolveColumns(
  state: MsaExportViewerState,
  options: MsaExportOptions,
  labelWidth: number,
  cellPitch: number
) {
  if (options.region === "selection") {
    if (!state.selectedRange) {
      return [];
    }

    return state.visiblePositions.filter(
      (position) =>
        position >= state.selectedRange!.start && position <= state.selectedRange!.end
    );
  }

  if (options.region === "visible") {
    return visibleColumnSlice(
      state.visiblePositions,
      state.viewport,
      cellPitch,
      labelWidth
    );
  }

  return state.visiblePositions;
}

function resolveRows(
  state: MsaExportViewerState,
  options: MsaExportOptions,
  rowHeight: number
) {
  if (options.region === "visible") {
    return visibleRowSlice(state.sequences, state.viewport, rowHeight);
  }

  return state.sequences;
}

function toColumns(
  positions: number[],
  state: MsaExportViewerState
): MsaExportColumn[] {
  return positions.map((position) => ({
    position,
    conservation: state.conservationColumns[position - 1]
  }));
}

function blockHeight(rows: MSASequence[], options: MsaExportOptions, rowHeight: number) {
  return (
    (options.includeCoordinates ? rowHeight : 0) +
    (options.includeConservation ? rowHeight : 0) +
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

export function calculateExportLayout(
  alignment: MSAResult,
  state: MsaExportViewerState,
  options: MsaExportOptions
): MsaExportLayout {
  const cellWidth = Math.max(1, state.viewSettings.cellWidth);
  const cellHeight = Math.max(1, state.viewSettings.cellHeight);
  const cellGap = Math.max(0, state.viewSettings.cellGap);
  const cellPitch = cellWidth + cellGap;
  const rowHeight = Math.max(cellHeight, state.viewSettings.rowHeight);
  const labelWidth = options.includeSequenceNames
    ? clamp(state.viewSettings.labelWidth, MIN_LABEL_WIDTH, MAX_LABEL_WIDTH)
    : 0;
  const rows = resolveRows(state, options, rowHeight);
  const columns = toColumns(
    resolveColumns(state, options, labelWidth, cellPitch),
    state
  );
  const columnsPerBlock =
    options.layoutMode === "wrapped"
      ? clamp(Math.floor(options.wrapColumnCount || 120), 1, Math.max(1, columns.length))
      : Math.max(1, columns.length);
  const blocks: MsaExportBlock[] = [];
  const blockRowHeight = blockHeight(rows, options, rowHeight);
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

  const legendHeight = options.includeLegend ? LEGEND_HEIGHT : 0;
  const height =
    DEFAULT_PADDING +
    blocks.reduce((sum, block) => sum + block.height, 0) +
    Math.max(0, blocks.length - 1) * BLOCK_GAP +
    legendHeight +
    DEFAULT_PADDING;
  const scale = options.format === "png" ? Math.max(0.1, options.scale) : 1;
  const canvasWidth = Math.ceil(width * scale);
  const canvasHeight = Math.ceil(height * scale);
  const canvasPixels = canvasWidth * canvasHeight;
  const canvasMegapixels = canvasPixels / 1_000_000;
  const exceedsCanvasLimit =
    options.format === "png" && canvasPixels > options.maxCanvasPixels;
  const limitReason = exceedsCanvasLimit
    ? `PNG export would create ${canvasMegapixels.toFixed(1)} MP, above the ${(
        options.maxCanvasPixels / 1_000_000
      ).toFixed(0)} MP limit.`
    : null;

  return {
    alignment,
    options,
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
    exceedsCanvasLimit,
    limitReason
  };
}
