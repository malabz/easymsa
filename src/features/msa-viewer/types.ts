import type { MSASequence, SequenceAlphabet } from "../../lib/types/msa";
import type { QcAnnotation, QcThresholds } from "./workspaceSnapshot";

export type MsaTrackId = "conservation" | "gap" | "coverage" | "entropy";
export type ConsensusMode = "majority" | "iupac";
export type DifferenceKind =
  | "match"
  | "compatibleAmbiguity"
  | "substitution"
  | "insertion"
  | "deletion"
  | "empty"
  | "unknown";

export type AnalysisScope = "all" | "visible" | "selected";
export type MotifMatchMode = "strict" | "possible";
export type MotifStrandMode = "forward" | "both";

export type CellSelection = {
  /** Stable internal row identity. Display headers must never be used here. */
  rowKey: string;
  /** @deprecated Transitional display-only hint for older inspector call sites. */
  sequenceId?: string;
  position: number;
};

export type ColumnRange = {
  start: number;
  end: number;
};

export type MotifMatch = {
  sequenceId: string;
  rowKey: string;
  start: number;
  positions: number[];
  alignmentStart: number;
  alignmentEnd: number;
  sequenceStart: number;
  sequenceEnd: number;
  strand: "+" | "-";
};

export type MotifSearchResult = {
  matches: MotifMatch[];
  totalCount: number;
  truncated: boolean;
};

export type ColumnStats = {
  position: number;
  totalRows?: number;
  canonicalCount?: number;
  ambiguityCount?: number;
  unknownCount?: number;
  gapCount?: number;
  informativeCoverage?: number;
  ambiguityFraction?: number;
  unknownFraction?: number;
  gcFraction?: number | null;
  entropyBits?: number | null;
  normalizedEntropy?: number | null;
  hasInformativeBases?: boolean;
  conservation: number | null;
  gapFraction: number;
  coverage: number;
  entropy: number | null;
  variation: number;
  dominantBase: string;
  consensusBase: string;
  ambiguityConsensus: string;
  majorityTie?: boolean;
};

export const COLUMN_STATS_STORE_VERSION = 1 as const;

export const COLUMN_STATS_FLAGS = {
  informative: 1 << 0,
  variable: 1 << 1,
  majorityTie: 1 << 2
} as const;

/**
 * Compact, alignment-indexed sufficient statistics for nucleotide-v2.
 *
 * Arrays are immutable by convention after construction. IEEE NaN is used
 * only inside `entropyBits` for scientifically unavailable columns; public
 * accessors restore that value to `null`.
 */
export type ColumnStatsStoreV1 = {
  readonly version: typeof COLUMN_STATS_STORE_VERSION;
  readonly length: number;
  readonly totalRows: number;
  readonly canonicalCounts: Uint32Array;
  readonly ambiguityCounts: Uint32Array;
  readonly unknownCounts: Uint32Array;
  readonly gapCounts: Uint32Array;
  readonly dominantCounts: Uint32Array;
  readonly gcCounts: Uint32Array;
  readonly entropyBits: Float64Array;
  readonly flags: Uint8Array;
  readonly majorityConsensus: string;
  readonly iupacConsensus: string;
};

export type ColumnPositionView =
  | {
      readonly kind: "identity";
      readonly length: number;
    }
  | {
      readonly kind: "filtered";
      readonly positions: Uint32Array;
      readonly length: number;
    };

export type RowQcStats = {
  rowKey: string;
  sequenceId: string;
  originalIndex: number;
  /** Number of characters in the parsed source row before alignment padding. */
  sequenceLength: number;
  rawLength?: number;
  /** Number of non-gap residues in the alignment row. */
  ungappedLength?: number;
  nonGapLength?: number;
  alignmentLength: number;
  canonicalCount: number;
  ambiguityCount: number;
  unknownCount: number;
  gapCount: number;
  gapFraction?: number;
  coverage: number;
  informativeCoverage: number;
  ambiguityFraction: number;
  unknownFraction: number;
  gcFraction?: number | null;
  comparisonTarget?: "reference" | "scope-consensus" | null;
  validComparisonCount?: number;
  compatibleAmbiguityCount?: number;
  substitutionCount?: number;
  insertionCount?: number;
  deletionCount?: number;
  identity?: number | null;
  transitionCount?: number;
  transversionCount?: number;
  unclassifiedSubstitutionCount?: number;
  /** Worker v2 groups comparison-specific metrics under this object. */
  reference?: {
    comparisonTarget: "reference" | "scope-consensus";
    comparisonRowKey: string | null;
    isComparisonTarget: boolean;
    validComparisonCount: number;
    matchCount: number;
    compatibleAmbiguityCount: number;
    substitutionCount: number;
    unclassifiedSubstitutionCount: number;
    insertionCount: number;
    deletionCount: number;
    transitionCount: number;
    transversionCount: number;
    identity: number | null;
  };
};

export type AlignmentOverviewBase =
  | "A"
  | "C"
  | "G"
  | "T"
  | "U"
  | "N"
  | "other"
  | "gap";

export type AlignmentOverviewStats = {
  baseCounts: Record<AlignmentOverviewBase, number>;
  totalCells: number;
  observedResidues: number;
  informativeResidues?: number;
  ambiguityResidues?: number;
  unknownResidues?: number;
  informativeColumns?: number;
  gcFraction: number | null;
  averageConservation: number;
  averageCoverage: number;
  averageEntropy: number;
  variableColumns: number;
  highGapColumns: number;
};

export type MsaAnalysisResult = {
  columns: ColumnStats[];
  overview: AlignmentOverviewStats;
};

export type MsaAnalysisStoreResult = {
  columnStore: ColumnStatsStoreV1;
  overview: AlignmentOverviewStats;
};

export type ReferenceCoordinateMap = {
  alignmentToReference: Array<number | null>;
  alignmentToReferenceCoordinate: Array<ReferenceCoordinate | null>;
  alignmentToReferenceLabel: Array<string | null>;
  referenceToAlignment: number[];
  referenceLength: number;
};

export type ReferenceCoordinate =
  | {
      kind: "base";
      position: number;
      label: string;
    }
  | {
      kind: "insertion";
      after: number;
      offset: number;
      label: string;
    };

export type RangeStats = {
  length: number;
  sequenceCount?: number;
  informativeColumns?: number;
  averageConservation: number;
  averageGapFraction: number;
  averageCoverage: number;
  averageEntropy: number;
  variableColumns: number;
  gcFraction: number | null;
  baseCounts: Record<string, number>;
  consensusSegment: string;
  substitutionCount?: number;
  mismatchCount: number;
  compatibleAmbiguityCount?: number;
  unknownComparisonCount?: number;
  unclassifiedSubstitutionCount?: number;
  comparableCanonicalCount?: number;
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

export type ColumnFilterMode =
  | "all"
  | "variable"
  | "conserved"
  | "lowGap"
  | "custom";

export type RowSortMode =
  | "original"
  | "name"
  | "length"
  | "gap"
  | "ambiguity"
  | "gc"
  | "identity";

export type ViewerViewMode = "overview" | "detail";

/** State represented in MsaWorkspaceSnapshotV1 (plus forward-compatible UI choices). */
export type ViewerPersistableState = ViewerPreferences & {
  analysisScope: AnalysisScope;
  annotations: QcAnnotation[];
  columnFilter: ColumnFilterMode;
  hiddenRowKeys: Set<string>;
  inspectorOpen: boolean;
  inspectorWidth: number;
  labelWidth: number;
  minimapCollapsed: boolean;
  motifMatchMode: MotifMatchMode;
  motifQuery: string;
  motifStrandMode: MotifStrandMode;
  pinnedRowKeys: Set<string>;
  qcPanelOpen: boolean;
  qcThresholds: QcThresholds;
  referenceRowKey: string | null;
  search: string;
  selectedRange: ColumnRange | null;
  selection: CellSelection | null;
  selectedRowKeys: Set<string>;
  settingsOpen: boolean;
  sortMode: RowSortMode;
  viewport: {
    scrollLeft: number;
    scrollTop: number;
    clientWidth: number;
    clientHeight: number;
  } | null;
  viewMode: ViewerViewMode;
  zoomLevel: number;
};

/** Ephemeral interaction state that must not leak between alignment fingerprints. */
export type ViewerTransientState = {
  activeMotifIndex: number;
  immersive: boolean;
  lastHiddenRowKeys: string[];
  qcSortMode: RowSortMode | "differences";
  rangeSelectionMode: boolean;
};

export type ViewerState = ViewerPersistableState & ViewerTransientState;

export type AnalysisInput = {
  sequences: MSASequence[];
  alignmentLength: number;
  alphabet?: SequenceAlphabet;
};

export type NucleotideAnalysisOptions = {
  alphabet?: SequenceAlphabet;
};

export type MotifSearchOptions = {
  maxMatches?: number;
  matchMode?: MotifMatchMode;
  strandMode?: MotifStrandMode;
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
