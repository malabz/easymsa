import type { MSASequence } from "../../lib/types/msa";

export type MsaTrackId = "conservation" | "gap" | "coverage" | "entropy";
export type ConsensusMode = "majority" | "iupac";
export type DifferenceKind =
  | "match"
  | "mismatch"
  | "insertion"
  | "deletion"
  | "empty";

export type CellSelection = {
  sequenceId: string;
  position: number;
};

export type ColumnRange = {
  start: number;
  end: number;
};

export type MotifMatch = {
  sequenceId: string;
  start: number;
  positions: number[];
};

export type MotifSearchResult = {
  matches: MotifMatch[];
  totalCount: number;
  truncated: boolean;
};

export type ColumnStats = {
  position: number;
  conservation: number;
  gapFraction: number;
  coverage: number;
  entropy: number;
  variation: number;
  dominantBase: string;
  consensusBase: string;
  ambiguityConsensus: string;
};

export type ReferenceCoordinateMap = {
  alignmentToReference: Array<number | null>;
  referenceToAlignment: number[];
  referenceLength: number;
};

export type RangeStats = {
  length: number;
  averageConservation: number;
  averageGapFraction: number;
  averageCoverage: number;
  averageEntropy: number;
  variableColumns: number;
  gcFraction: number | null;
  baseCounts: Record<string, number>;
  consensusSegment: string;
  mismatchCount: number;
  insertionCount: number;
  deletionCount: number;
  transitionCount: number;
  transversionCount: number;
};

export type ViewerPreferences = {
  activeTracks: MsaTrackId[];
  colorScheme: "nucleotide" | "purinePyrimidine" | "conservation";
  consensusMode: ConsensusMode;
  coordinateMode: "alignment" | "reference";
  density: "comfortable" | "compact";
  differenceMode: boolean;
};

export type ViewerState = ViewerPreferences & {
  activeMotifIndex: number;
  columnFilter: "all" | "variable" | "conserved" | "lowGap";
  hiddenSequenceIds: Set<string>;
  inspectorOpen: boolean;
  motifQuery: string;
  search: string;
  referenceSequenceId: string | null;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  selectedSequenceIds: Set<string>;
  pinnedSequenceIds: Set<string>;
  sortMode: "original" | "name" | "length";
  viewport: {
    scrollLeft: number;
    scrollTop: number;
    clientWidth: number;
    clientHeight: number;
  } | null;
  zoomLevel: number;
};

export type AnalysisInput = {
  sequences: MSASequence[];
  alignmentLength: number;
};

export type MsaViewSettings = {
  cellWidth: number;
  cellHeight: number;
  rowHeight: number;
  fontSize: number;
  labelWidth: number;
  markerEvery: number;
  showCharacters: boolean;
  cellGap: number;
};
