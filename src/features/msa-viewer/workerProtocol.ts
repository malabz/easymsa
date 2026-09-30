import type {
  MSASequence,
  SequenceAlphabet
} from "../../lib/types/msa";
import {
  calculateMsaAnalysisStore,
  calculateRowQcStats,
  classifyDifference
} from "./analysis";
import { normalizeAlignmentSequence, rowKeyForSequence } from "./alignmentModel";
import {
  assertColumnStatsStore,
  columnStatsStoreByteLength
} from "./columnStatsStore";
import type {
  AlignmentOverviewStats,
  AnalysisScope,
  ColumnStatsStoreV1,
  RowQcStats
} from "./types";
import { COLUMN_STATS_FLAGS, COLUMN_STATS_STORE_VERSION } from "./types";

export const MSA_ANALYSIS_PROTOCOL_VERSION = 3 as const;
export const MSA_ANALYSIS_SEMANTICS_VERSION = "nucleotide-v2" as const;

export type MsaAnalysisWorkerErrorCode =
  | "ANALYSIS_CANCELLED"
  | "ANALYSIS_DISABLED"
  | "ANALYSIS_DISABLED_NEUTRAL"
  | "ANALYSIS_EMPTY_SCOPE"
  | "ANALYSIS_FAILED"
  | "ANALYSIS_WORKER_UNAVAILABLE"
  | "INVALID_ALIGNMENT_LENGTH"
  | "INVALID_ALIGNMENT_SYMBOL"
  | "PROTOCOL_VERSION_MISMATCH"
  | "RAW_UNEQUAL_ALIGNMENT";

export type AnalysisOverviewBin = {
  start: number;
  end: number;
  averageConservation: number;
  averageCoverage: number;
  averageGapFraction: number;
  averageEntropy: number;
  variableColumns: number;
};

export type RowReferenceQc = {
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

export type RowQcStatsV2 = RowQcStats & {
  rawLength: number;
  nonGapLength: number;
  gapFraction: number;
  gcFraction: number | null;
  reference: RowReferenceQc;
};

export type MsaAnalysisPayloadV3 = {
  semanticsVersion: typeof MSA_ANALYSIS_SEMANTICS_VERSION;
  columnStoreVersion: typeof COLUMN_STATS_STORE_VERSION;
  sourceFingerprint: string;
  scope: AnalysisScope;
  scopeRowKeys: string[];
  columnStore: ColumnStatsStoreV1;
  overview: AlignmentOverviewStats;
  overviewBins: AnalysisOverviewBin[];
  rowQc: RowQcStatsV2[];
  consensus: {
    majority: string;
    iupac: string;
  };
};

export type MsaAnalysisWorkerRequest =
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "analyze";
      generation: number;
      requestId: number;
      sourceFingerprint: string;
      scope: AnalysisScope;
      scopeRowKeys: string[];
      sequences: MSASequence[];
      alignmentLength: number;
      alphabet?: SequenceAlphabet;
      referenceRowKey?: string | null;
      /** May be outside the scoped rows; used only for reference comparisons. */
      referenceSequence?: MSASequence | null;
      overviewBinCount?: number;
    }
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "cancel";
      generation: number;
      requestId: number;
    };

export type MsaAnalysisWorkerResponse =
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "analysisProgress";
      generation: number;
      requestId: number;
      progress: number;
    }
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "analysisReady";
      generation: number;
      requestId: number;
      result: MsaAnalysisPayloadV3;
    }
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "analysisCancelled";
      generation: number;
      requestId: number;
    }
  | {
      protocolVersion: typeof MSA_ANALYSIS_PROTOCOL_VERSION;
      type: "analysisError";
      generation: number;
      requestId: number;
      code: MsaAnalysisWorkerErrorCode;
      message: string;
    };

export class MsaAnalysisWorkerError extends Error {
  readonly code: MsaAnalysisWorkerErrorCode;

  constructor(code: MsaAnalysisWorkerErrorCode, message: string) {
    super(message);
    this.name = "MsaAnalysisWorkerError";
    this.code = code;
  }
}

export function assertMsaAnalysisPayloadV3(
  value: unknown
): asserts value is MsaAnalysisPayloadV3 {
  if (!value || typeof value !== "object") {
    throw new MsaAnalysisWorkerError(
      "PROTOCOL_VERSION_MISMATCH",
      "MSA analysis payload must be an object."
    );
  }
  const payload = value as Partial<MsaAnalysisPayloadV3>;
  if (
    payload.semanticsVersion !== MSA_ANALYSIS_SEMANTICS_VERSION ||
    payload.columnStoreVersion !== COLUMN_STATS_STORE_VERSION ||
    typeof payload.sourceFingerprint !== "string" ||
    !["all", "visible", "selected"].includes(payload.scope ?? "") ||
    !Array.isArray(payload.scopeRowKeys) ||
    !payload.scopeRowKeys.every((rowKey) => typeof rowKey === "string") ||
    !Array.isArray(payload.overviewBins) ||
    !Array.isArray(payload.rowQc) ||
    !payload.consensus ||
    typeof payload.consensus.majority !== "string" ||
    typeof payload.consensus.iupac !== "string"
  ) {
    throw new MsaAnalysisWorkerError(
      "PROTOCOL_VERSION_MISMATCH",
      "MSA analysis payload metadata is invalid."
    );
  }
  try {
    assertColumnStatsStore(payload.columnStore);
  } catch (error) {
    throw new MsaAnalysisWorkerError(
      "PROTOCOL_VERSION_MISMATCH",
      error instanceof Error ? error.message : "Column statistics store is invalid."
    );
  }
  if (
    payload.consensus.majority !== payload.columnStore.majorityConsensus ||
    payload.consensus.iupac !== payload.columnStore.iupacConsensus
  ) {
    throw new MsaAnalysisWorkerError(
      "PROTOCOL_VERSION_MISMATCH",
      "MSA analysis consensus vectors are inconsistent."
    );
  }
}

export function analysisWorkerError(
  error: unknown,
  fallbackCode: MsaAnalysisWorkerErrorCode = "ANALYSIS_FAILED"
) {
  if (error instanceof MsaAnalysisWorkerError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: fallbackCode,
    message: error instanceof Error ? error.message : "MSA analysis failed"
  };
}

function assertAnalyzableInput(
  sequences: MSASequence[],
  alignmentLength: number,
  alphabet?: SequenceAlphabet
) {
  if (!Number.isSafeInteger(alignmentLength) || alignmentLength < 0) {
    throw new MsaAnalysisWorkerError(
      "INVALID_ALIGNMENT_LENGTH",
      "The alignment length must be a non-negative integer."
    );
  }
  if (alphabet === "protein" || alphabet === "unknown") {
    throw new MsaAnalysisWorkerError(
      "ANALYSIS_DISABLED_NEUTRAL",
      "Nucleotide analysis is unavailable for this neutral alignment."
    );
  }
  if (sequences.length === 0) {
    return;
  }
  const invalid = new Set<string>();
  for (const sequence of sequences) {
    const normalized = normalizeAlignmentSequence(sequence.sequence);
    if (normalized.length !== alignmentLength) {
      throw new MsaAnalysisWorkerError(
        "RAW_UNEQUAL_ALIGNMENT",
        "Nucleotide analysis requires equal-length aligned sequences."
      );
    }
    for (const symbol of normalized) {
      if (!"ACGTURYSWKMBDHVN-".includes(symbol)) {
        invalid.add(symbol);
      }
    }
  }
  if (invalid.size > 0) {
    throw new MsaAnalysisWorkerError(
      "INVALID_ALIGNMENT_SYMBOL",
      `Unsupported alignment symbol${invalid.size > 1 ? "s" : ""}: ${Array.from(invalid).join(", ")}`
    );
  }
}

function buildOverviewBins(
  store: ColumnStatsStoreV1,
  requestedBinCount = 512
): AnalysisOverviewBin[] {
  if (store.length === 0) {
    return [];
  }
  const binCount = Math.max(
    1,
    Math.min(store.length, Math.trunc(requestedBinCount) || 1)
  );
  const bins: AnalysisOverviewBin[] = [];
  for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
    const startIndex = Math.floor((binIndex * store.length) / binCount);
    const endExclusive = Math.floor(((binIndex + 1) * store.length) / binCount);
    const count = Math.max(1, endExclusive - startIndex);
    let conservation = 0;
    let coverage = 0;
    let gap = 0;
    let entropy = 0;
    let informativeCount = 0;
    let variableColumns = 0;
    for (let index = startIndex; index < endExclusive; index += 1) {
      const canonical = store.canonicalCounts[index];
      if (canonical > 0) {
        informativeCount += 1;
        conservation += store.dominantCounts[index] / canonical;
        entropy += store.entropyBits[index] / 2;
      }
      coverage += store.totalRows > 0
        ? (canonical + store.ambiguityCounts[index] + store.unknownCounts[index]) /
          store.totalRows
        : 0;
      gap += store.totalRows > 0 ? store.gapCounts[index] / store.totalRows : 0;
      if (store.flags[index] & COLUMN_STATS_FLAGS.variable) {
        variableColumns += 1;
      }
    }
    bins.push({
      start: startIndex + 1,
      end: endExclusive,
      averageConservation: informativeCount ? conservation / informativeCount : 0,
      averageCoverage: coverage / count,
      averageGapFraction: gap / count,
      averageEntropy: informativeCount ? entropy / informativeCount : 0,
      variableColumns
    });
  }
  return bins;
}

function normalizedCanonical(base: string) {
  const normalized = base.toUpperCase().replace("U", "T");
  return normalized === "A" || normalized === "C" ||
    normalized === "G" || normalized === "T"
    ? normalized
    : null;
}

function isTransition(left: string, right: string) {
  const pair = [left, right].sort().join("");
  return pair === "AG" || pair === "CT";
}

function addComparisonStats(
  row: MSASequence,
  comparator: string,
  comparisonTarget: RowReferenceQc["comparisonTarget"],
  comparisonRowKey: string | null,
  isComparisonTarget: boolean,
  informativeStore?: ColumnStatsStoreV1
): RowReferenceQc {
  let validComparisonCount = 0;
  let matchCount = 0;
  let compatibleAmbiguityCount = 0;
  let substitutionCount = 0;
  let unclassifiedSubstitutionCount = 0;
  let insertionCount = 0;
  let deletionCount = 0;
  let transitionCount = 0;
  let transversionCount = 0;
  const sequence = normalizeAlignmentSequence(row.sequence);

  if (!isComparisonTarget) {
    for (let index = 0; index < comparator.length; index += 1) {
      if (informativeStore && informativeStore.canonicalCounts[index] === 0) continue;
      const observed = sequence[index] ?? "";
      const expected = comparator[index] ?? "";
      const observedCanonical = normalizedCanonical(observed);
      const expectedCanonical = normalizedCanonical(expected);
      if (observedCanonical && expectedCanonical) {
        validComparisonCount += 1;
        if (observedCanonical === expectedCanonical) {
          matchCount += 1;
        } else {
          substitutionCount += 1;
          if (isTransition(observedCanonical, expectedCanonical)) {
            transitionCount += 1;
          } else {
            transversionCount += 1;
          }
        }
        continue;
      }
      const difference = classifyDifference(observed, expected);
      if (difference === "empty" || difference === "unknown") {
        continue;
      }
      validComparisonCount += 1;
      if (difference === "match") {
        matchCount += 1;
      } else if (difference === "compatibleAmbiguity") {
        compatibleAmbiguityCount += 1;
      } else if (difference === "insertion") {
        insertionCount += 1;
      } else if (difference === "deletion") {
        deletionCount += 1;
      } else {
        substitutionCount += 1;
        unclassifiedSubstitutionCount += 1;
      }
    }
  }

  return {
    comparisonTarget,
    comparisonRowKey,
    isComparisonTarget,
    validComparisonCount,
    matchCount,
    compatibleAmbiguityCount,
    substitutionCount,
    unclassifiedSubstitutionCount,
    insertionCount,
    deletionCount,
    transitionCount,
    transversionCount,
    identity: validComparisonCount > 0 ? matchCount / validComparisonCount : null
  };
}

function buildRowQc(
  sequences: MSASequence[],
  alignmentLength: number,
  alphabet: SequenceAlphabet | undefined,
  majorityConsensus: string,
  columnStore: ColumnStatsStoreV1,
  referenceRowKey?: string | null,
  referenceSequence?: MSASequence | null
): RowQcStatsV2[] {
  const basic = calculateRowQcStats(sequences, alignmentLength, { alphabet });
  const resolvedReferenceIndex = referenceRowKey
    ? sequences.findIndex((sequence, index) =>
        rowKeyForSequence(sequence, index) === referenceRowKey
      )
    : -1;
  const resolvedReference = resolvedReferenceIndex >= 0
    ? sequences[resolvedReferenceIndex]
    : referenceSequence ?? null;
  const comparator = resolvedReference
    ? normalizeAlignmentSequence(resolvedReference.sequence)
    : majorityConsensus;
  const comparisonTarget: RowReferenceQc["comparisonTarget"] =
    resolvedReference ? "reference" : "scope-consensus";
  const resolvedReferenceRowKey = resolvedReference
    ? resolvedReference.rowKey ?? referenceRowKey ??
      rowKeyForSequence(resolvedReference, resolvedReferenceIndex)
    : null;
  const scopeConsensusInformativeStore = resolvedReference
    ? undefined
    : columnStore;

  return basic.map((stats, index) => {
    const source = sequences[index];
    const isComparisonTarget = resolvedReferenceRowKey !== null &&
      stats.rowKey === resolvedReferenceRowKey;
    const reference = addComparisonStats(
      source,
      comparator,
      comparisonTarget,
      resolvedReferenceRowKey,
      isComparisonTarget,
      scopeConsensusInformativeStore
    );
    return {
      ...stats,
      rawLength: source?.sequence.length ?? 0,
      ungappedLength: stats.ungappedLength ?? stats.nonGapLength ?? 0,
      nonGapLength: stats.nonGapLength ?? stats.ungappedLength ?? 0,
      gapFraction: stats.gapFraction ?? 0,
      gcFraction: stats.gcFraction ?? null,
      comparisonTarget: reference.comparisonTarget,
      validComparisonCount: reference.validComparisonCount,
      compatibleAmbiguityCount: reference.compatibleAmbiguityCount,
      substitutionCount: reference.substitutionCount,
      insertionCount: reference.insertionCount,
      deletionCount: reference.deletionCount,
      identity: reference.identity,
      transitionCount: reference.transitionCount,
      transversionCount: reference.transversionCount,
      unclassifiedSubstitutionCount: reference.unclassifiedSubstitutionCount,
      reference
    };
  });
}

export function calculateMsaAnalysisPayloadV3({
  sourceFingerprint,
  scope,
  scopeRowKeys,
  sequences,
  alignmentLength,
  alphabet,
  referenceRowKey,
  referenceSequence,
  overviewBinCount
}: Extract<MsaAnalysisWorkerRequest, { type: "analyze" }>): MsaAnalysisPayloadV3 {
  assertAnalyzableInput(sequences, alignmentLength, alphabet);
  if (scope !== "all" && sequences.length === 0) {
    throw new MsaAnalysisWorkerError(
      "ANALYSIS_EMPTY_SCOPE",
      "The selected analysis scope contains no sequences."
    );
  }
  const analysis = calculateMsaAnalysisStore(sequences, alignmentLength, { alphabet });
  const majority = analysis.columnStore.majorityConsensus;
  const iupac = analysis.columnStore.iupacConsensus;
  const payload: MsaAnalysisPayloadV3 = {
    semanticsVersion: MSA_ANALYSIS_SEMANTICS_VERSION,
    columnStoreVersion: COLUMN_STATS_STORE_VERSION,
    sourceFingerprint,
    scope,
    scopeRowKeys: [...scopeRowKeys],
    columnStore: analysis.columnStore,
    overview: analysis.overview,
    overviewBins: buildOverviewBins(analysis.columnStore, overviewBinCount),
    rowQc: buildRowQc(
      sequences,
      alignmentLength,
      alphabet,
      majority,
      analysis.columnStore,
      referenceRowKey,
      referenceSequence
    ),
    consensus: { majority, iupac }
  };
  assertMsaAnalysisPayloadV3(payload);
  return payload;
}

export function estimateMsaAnalysisPayloadBytes(result: MsaAnalysisPayloadV3) {
  return columnStatsStoreByteLength(result.columnStore) +
    result.rowQc.length * 384 +
    result.overviewBins.length * 96 +
    (result.consensus.majority.length + result.consensus.iupac.length) * 2 +
    result.scopeRowKeys.reduce((sum, key) => sum + key.length * 2, 0);
}
