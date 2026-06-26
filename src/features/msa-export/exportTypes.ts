import type { MSAResult, MSASequence } from "../../lib/types/msa";
import type {
  ConservationColorContext,
  MSAColorScheme
} from "./exportColors";

export type ExportFormat = "svg" | "png";
export type ExportRegion = "visible" | "full" | "selection";
export type ExportLayoutMode = "single-line" | "wrapped";

export type MsaExportOptions = {
  format: ExportFormat;
  region: ExportRegion;
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
};

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
  start: number;
  end: number;
};

export type MsaExportConservationColumn = ConservationColorContext & {
  position: number;
  gapFraction: number;
  dominantBase: string;
};

export type MsaExportViewerState = {
  sequences: MSASequence[];
  visiblePositions: number[];
  conservationColumns: MsaExportConservationColumn[];
  colorScheme: MSAColorScheme;
  selectedRange: MsaExportColumnRange | null;
  viewSettings: MsaExportViewSettings;
  viewport: MsaExportViewport | null;
  alignmentLength: number;
};

export type MsaExportColumn = {
  position: number;
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

export type MsaExportLayout = {
  alignment: MSAResult;
  options: MsaExportOptions;
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
  exceedsCanvasLimit: boolean;
  limitReason: string | null;
};

export type MsaExportLabels = {
  position: string;
  conservation: string;
  consensus: string;
  legend: string;
  dominant: string;
  variant: string;
  gapEmpty: string;
};
