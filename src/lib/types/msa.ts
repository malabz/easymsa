export type SequenceAlphabet =
  | "dna"
  | "rna"
  | "nucleotide"
  | "protein"
  | "unknown";

export type AlignmentMode = "aligned" | "rawUnequal" | "neutral";

export type AlignmentSourceKind = "job" | "local-file" | "pasted";

export type AlignmentDescriptor = {
  sourceKey: string;
  sourceKind: AlignmentSourceKind;
  sourceName: string;
  alphabet: SequenceAlphabet;
  alphabetConfidence: "declared" | "high" | "ambiguous";
  alignmentMode: AlignmentMode;
  sequenceCount: number;
  alignmentLength: number;
  /** Dimensions declared by an upstream source. Never used to pad alignment data. */
  declaredDimensions?: {
    sequenceCount: number | null;
    alignmentLength: number | null;
  };
  /** Dimensions measured from the canonical rows actually available to the browser. */
  observedDimensions: {
    sequenceCount: number;
    alignmentLength: number;
  };
  rawSha256?: string;
  alignmentSha256?: string;
  normalization?: {
    rowOrderIncluded: true;
    headersIncluded: true;
    uppercaseSequences: true;
    dotAsGap: true;
    whitespaceRemoved: true;
  };
  warnings: string[];
};

export type MSASequence = {
  id: string;
  sequence: string;
  /**
   * Stable internal identity for viewer state. FASTA headers are display labels
   * and are not guaranteed to be unique, so new adapters should always provide
   * this field. It remains optional while older API payloads are migrated.
   */
  rowKey?: string;
  originalIndex?: number;
};

/** Canonical Viewer row. Display headers are intentionally not identities. */
export type MsaRow = {
  rowKey: string;
  id: string;
  sequence: string;
  originalIndex: number;
};

export type MSAResult = {
  jobId: string;
  truncated: boolean;
  message?: string;
  sequences: MSASequence[];
  consensus?: string;
  alignmentLength: number | null;
  sequenceCount?: number | null;
  descriptor?: AlignmentDescriptor;
};
