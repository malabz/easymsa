import type { MSAResult, MSASequence } from "../../lib/types/msa";
import type { SerializableMsaViewerContext } from "../msa-viewer/viewerContext";
import type { AnalysisScope } from "../msa-viewer/types";
import type { ColumnStatsStoreV1 } from "../msa-viewer/types";
import type {
  ConservationColorContext,
  MSAColorScheme
} from "./exportColors";

export type ExportFormat = "svg" | "png" | "fasta";
export type CanonicalExportRegion =
  | "viewport"
  | "selectedInterval"
  | "filteredView"
  | "fullAlignment";
export type LegacyExportRegion = "visible" | "full" | "selection";
/** @deprecated Existing dialog vocabulary; prefer CanonicalExportRegion. */
export type ExportRegion = LegacyExportRegion;
export type SupportedExportRegion = CanonicalExportRegion | LegacyExportRegion;
export type ExportRegionV2 = CanonicalExportRegion;
export type ExportLayoutMode = "single-line" | "wrapped";
export type ExportBundleMode = "qc-bundle" | "bare";
export type MsaExportPreset = "paper-svg" | "presentation-png" | "custom";
export type MsaExportWrapMode = "auto-wrap" | "fixed-wrap" | "single-line";
export type MsaExportRenderTheme = "publication-light" | "viewer";
export type MsaExportTrackId = "conservation" | "gap" | "coverage" | "entropy";

/**
 * Keeps the pre-v1 dialog values working while giving manifests and future UI
 * a single, unambiguous region vocabulary.  Legacy `full` intentionally maps
 * to `filteredView`, because that is what the original exporter produced.
 */
export function normalizeExportRegion(
  region: SupportedExportRegion
): CanonicalExportRegion {
  if (region === "visible") {
    return "viewport";
  }
  if (region === "selection") {
    return "selectedInterval";
  }
  if (region === "full") {
    return "filteredView";
  }
  return region;
}

export type MsaExportOptions<
  TRegion extends SupportedExportRegion = ExportRegion
> = {
  format: ExportFormat;
  region: TRegion;
  layoutMode: ExportLayoutMode;
  includeSequenceNames: boolean;
  includeCoordinates: boolean;
  includeConsensus: boolean;
  includeConservation: boolean;
  includeLegend: boolean;
  includeAnnotations: boolean;
  scale: number;
  backgroundColor: string;
  transparentBackground: boolean;
  filename: string;
  wrapColumnCount: number;
  maxCanvasPixels: number;
  maxCanvasDimension?: number;
  maxSvgCells?: number;
  maxSvgEstimatedBytes?: number;
  bundleMode?: ExportBundleMode;
  preset?: MsaExportPreset;
  wrapMode?: MsaExportWrapMode;
  renderTheme?: MsaExportRenderTheme;
  targetContentWidth?: number;
};

export type CanonicalMsaExportOptions =
  MsaExportOptions<CanonicalExportRegion>;
export type SupportedMsaExportOptions =
  MsaExportOptions<SupportedExportRegion>;

export type MsaExportViewport = {
  scrollLeft: number;
  scrollTop: number;
  clientWidth: number;
  clientHeight: number;
};

export type MsaExportViewSettings = {
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  fontSize: number;
  labelWidth: number;
  markerEvery: number;
  showCharacters: boolean;
  cellGap: number;
};

export type MsaExportColumnRange = {
  start: number | null;
  end: number | null;
};

export type MsaExportAnnotation = {
  id: string;
  type?: string;
  category?: "note" | "review" | "exclude-candidate";
  label: string;
  rowKey?: string | null;
  sequenceId?: string | null;
  start: number | null;
  end: number | null;
  note?: string;
};

export type MsaExportConservationColumn = ConservationColorContext & {
  position: number;
  gapFraction: number;
  dominantBase: string;
  coverage?: number;
  entropy?: number | null;
  variation?: number;
  consensusBase?: string;
  ambiguityConsensus?: string;
};

export type MsaExportViewerState = {
  sequences: MSASequence[];
  visiblePositions: number[];
  /** Compact production model. Only resolved export positions are materialized. */
  columnStore?: ColumnStatsStoreV1 | null;
  /** @deprecated Explicit compatibility input used by legacy callers/tests. */
  conservationColumns?: MsaExportConservationColumn[];
  colorScheme: MSAColorScheme;
  selectedRange: MsaExportColumnRange | null;
  viewSettings: MsaExportViewSettings;
  viewport: MsaExportViewport | null;
  alignmentLength: number;
  activeTracks?: MsaExportTrackId[];
  consensusMode?: "majority" | "iupac";
  /** Consensus produced by the active Worker analysis and current scope. */
  consensusSequence?: string;
  coordinateMode?: "alignment" | "reference";
  differenceMode?: boolean;
  referenceSequenceId?: string | null;
  referenceRowKey?: string | null;
  analysisScope?: AnalysisScope;
  analysisRowKeys?: string[];
  viewerContext?: SerializableMsaViewerContext;
  thresholds?: {
    row?: Record<string, number | null>;
    column?: Record<string, number | null>;
  };
  frontendVersion?: string | null;
  buildSha?: string | null;
  annotations?: MsaExportAnnotation[];
};

export type MsaExportColumn = {
  position: number;
  referencePosition?: string | number | null;
  conservation?: MsaExportConservationColumn;
};

export type MsaExportBlock = {
  columns: MsaExportColumn[];
  x: number;
  y: number;
  width: number;
  height: number;
  cellAreaX: number;
};

export type ExportLimitKind =
  | "png-pixels"
  | "png-dimension"
  | "svg-cells"
  | "svg-estimated-bytes"
  | null;

/** Geometry-only result. It must be computable without reading column statistics. */
export type ExportPreflightResult = {
  canonicalRegion: CanonicalExportRegion;
  rowCount: number;
  columnCount: number;
  blockCount: number;
  blocksPerPage: number;
  pageCount: number;
  requiresPagination: boolean;
  pageHeight: number;
  totalHeight: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasPixels: number;
  canvasMegapixels: number;
  requestedScale: number;
  resolvedScale: number;
  scaleAdjusted: boolean;
  renderedCellCount: number;
  estimatedSvgBytes: number;
  effectiveCanvasPixelLimit: number;
  effectiveCanvasDimensionLimit: number;
  effectiveSvgCellLimit: number;
  effectiveSvgEstimatedByteLimit: number;
  exportLimitExceeded: boolean;
  exportLimitKind: ExportLimitKind;
  limitReason: string | null;
};

export type MsaExportLayout = {
  alignment: MSAResult;
  options: SupportedMsaExportOptions;
  canonicalRegion: CanonicalExportRegion;
  rows: MSASequence[];
  columns: MsaExportColumn[];
  blocks: MsaExportBlock[];
  width: number;
  height: number;
  padding: number;
  labelWidth: number;
  cellWidth: number;
  cellHeight: number;
  cellGap: number;
  cellPitch: number;
  rowHeight: number;
  fontSize: number;
  colorScheme: MSAColorScheme;
  showCharacters: boolean;
  markerEvery: number;
  legendHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasPixels: number;
  canvasMegapixels: number;
  renderScale: number;
  requestedScale: number;
  resolvedScale: number;
  scaleAdjusted: boolean;
  renderedCellCount: number;
  estimatedSvgBytes: number;
  effectiveCanvasPixelLimit: number;
  effectiveCanvasDimensionLimit: number;
  effectiveSvgCellLimit: number;
  effectiveSvgEstimatedByteLimit: number;
  exportLimitExceeded: boolean;
  exportLimitKind: ExportLimitKind;
  /** @deprecated Compatibility alias for the existing dialog and renderer. */
  exceedsCanvasLimit: boolean;
  limitReason: string | null;
  activeTracks: MsaExportTrackId[];
  coordinateMode: "alignment" | "reference";
  differenceMode: boolean;
  referenceSequence: MSASequence | null;
  consensusSequence: string;
  annotations: MsaExportAnnotation[];
  pageIndex: number;
  pageCount: number;
};

export type MsaExportLabels = {
  position: string;
  conservation: string;
  consensus: string;
  legend: string;
  dominant: string;
  variant: string;
  gapEmpty: string;
  referencePosition: string;
  tracks: Record<MsaExportTrackId, string>;
  differences: {
    match: string;
    mismatch: string;
    substitution: string;
    compatibleAmbiguity: string;
    insertion: string;
    deletion: string;
    unknown: string;
  };
};
