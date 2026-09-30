import type {
  AlignmentDescriptor,
  AlignmentSourceKind,
  MSASequence,
  SequenceAlphabet
} from "../../lib/types/msa";
import type { AnalysisScope } from "./types";

const NUCLEOTIDE_SYMBOLS = new Set("ACGTURYSWKMBDHVN".split(""));
const PROTEIN_SYMBOLS = new Set("ABCDEFGHIKLMNPQRSTVWXYZJUO*".split(""));
const PROTEIN_EXCLUSIVE_SYMBOLS = new Set("EFILPQZJOX*".split(""));
const GAP_SYMBOLS = new Set(["-", "."]);

export type AlphabetInference = {
  alphabet: SequenceAlphabet;
  confidence: "high" | "ambiguous";
  nucleotideCompatibleFraction: number;
  proteinCompatibleFraction: number;
  unknownFraction: number;
  hasT: boolean;
  hasU: boolean;
};

export type AlignmentDescriptorOptions = {
  sourceKind: AlignmentSourceKind;
  sourceName: string;
  sourceKey?: string;
  declaredAlphabet?: SequenceAlphabet;
  rawSha256?: string;
  alignmentSha256?: string;
  declaredDimensions?: {
    sequenceCount: number | null;
    alignmentLength: number | null;
  };
};

export type AnalysisScopeRows = {
  visibleRowKeys?: Iterable<string>;
  selectedRowKeys?: Iterable<string>;
};

export function normalizeAlignmentSequence(sequence: string) {
  if (!/[\s.a-z]/.test(sequence)) {
    return sequence;
  }
  return sequence.replace(/\s/g, "").toUpperCase().replace(/\./g, "-");
}

/**
 * Stable, serialization-safe representation of the scientific alignment
 * content. Viewer-only row keys are intentionally excluded.
 */
export function canonicalAlignmentSource(sequences: Array<{ id: string; sequence: string }>) {
  return JSON.stringify({
    schema: "easymsa-canonical-alignment-v1",
    rows: sequences.map((sequence) => [
      sequence.id,
      normalizeAlignmentSequence(sequence.sequence)
    ])
  });
}

function fnv1a64(value: string) {
  let hash = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(value);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

/**
 * Synchronous, compact key for immediate viewer state. Use the SHA-256 helper
 * below for provenance and persisted cross-system identity.
 */
export function canonicalAlignmentSourceKey(
  sequences: Array<{ id: string; sequence: string }>
) {
  return `canonical-v1:${fnv1a64(canonicalAlignmentSource(sequences))}`;
}

export async function sha256Hex(value: string | Uint8Array) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto SHA-256 is unavailable in this environment.");
  }
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : Uint8Array.from(value);
  const digest = await subtle.digest("SHA-256", bytes.buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function hashedAlignmentSourceKey(
  sequences: Array<{ id: string; sequence: string }>
) {
  return `sha256:${await sha256Hex(canonicalAlignmentSource(sequences))}`;
}

export function stableRowKey(sourceKey: string, originalIndex: number) {
  return `${sourceKey}:row:${String(originalIndex + 1).padStart(8, "0")}`;
}

export function withStableRowKeys(sequences: MSASequence[], sourceKey: string) {
  return sequences.map((sequence, index) => ({
    ...sequence,
    sequence: normalizeAlignmentSequence(sequence.sequence),
    rowKey: stableRowKey(sourceKey, index),
    originalIndex: index
  }));
}

export function inferSequenceAlphabet(
  sequences: Array<{ sequence: string }>
): AlphabetInference {
  let total = 0;
  let nucleotideCompatible = 0;
  let proteinCompatible = 0;
  let proteinExclusive = 0;
  let unknown = 0;
  let hasT = false;
  let hasU = false;

  for (const sequence of sequences) {
    for (const symbol of normalizeAlignmentSequence(sequence.sequence)) {
      if (GAP_SYMBOLS.has(symbol)) {
        continue;
      }
      total += 1;
      if (symbol === "T") {
        hasT = true;
      } else if (symbol === "U") {
        hasU = true;
      }
      if (NUCLEOTIDE_SYMBOLS.has(symbol)) {
        nucleotideCompatible += 1;
      }
      if (PROTEIN_SYMBOLS.has(symbol)) {
        proteinCompatible += 1;
      }
      if (PROTEIN_EXCLUSIVE_SYMBOLS.has(symbol)) {
        proteinExclusive += 1;
      }
      if (!NUCLEOTIDE_SYMBOLS.has(symbol) && !PROTEIN_SYMBOLS.has(symbol)) {
        unknown += 1;
      }
    }
  }

  if (total === 0) {
    return {
      alphabet: "unknown",
      confidence: "ambiguous",
      nucleotideCompatibleFraction: 0,
      proteinCompatibleFraction: 0,
      unknownFraction: 0,
      hasT,
      hasU
    };
  }

  const nucleotideCompatibleFraction = nucleotideCompatible / total;
  const proteinCompatibleFraction = proteinCompatible / total;
  const unknownFraction = unknown / total;
  const confidence = Math.max(nucleotideCompatibleFraction, proteinCompatibleFraction) >= 0.98
    ? "high"
    : "ambiguous";
  let alphabet: SequenceAlphabet = "unknown";

  if (proteinExclusive > 0 && proteinCompatibleFraction >= 0.9) {
    alphabet = "protein";
  } else if (nucleotideCompatibleFraction >= 0.95) {
    alphabet = hasT && hasU
      ? "nucleotide"
      : hasU
        ? "rna"
        : hasT
          ? "dna"
          : "nucleotide";
  } else if (proteinCompatibleFraction >= 0.95) {
    alphabet = "protein";
  }

  return {
    alphabet,
    confidence: alphabet === "nucleotide" ? "ambiguous" : confidence,
    nucleotideCompatibleFraction,
    proteinCompatibleFraction,
    unknownFraction,
    hasT,
    hasU
  };
}

function alphabetFamily(alphabet: SequenceAlphabet) {
  if (
    alphabet === "dna" ||
    alphabet === "rna" ||
    alphabet === "nucleotide"
  ) {
    return "nucleotide";
  }
  return alphabet;
}

export function buildAlignmentDescriptor(
  sequences: MSASequence[],
  options: AlignmentDescriptorOptions
): AlignmentDescriptor {
  const normalized = sequences.map((sequence) => ({
    ...sequence,
    sequence: normalizeAlignmentSequence(sequence.sequence)
  }));
  const lengths = normalized.map((sequence) => sequence.sequence.length);
  const alignmentLength = lengths.reduce((maximum, length) =>
    Math.max(maximum, length), 0
  );
  const equalLength = new Set(lengths).size <= 1;
  const inference = inferSequenceAlphabet(normalized);
  const alphabet = options.declaredAlphabet ?? inference.alphabet;
  const warnings: string[] = [];
  const invalidForDeclaredNucleotide = (
    alphabet === "dna" || alphabet === "rna" || alphabet === "nucleotide"
  ) && normalized.some((sequence) =>
    Array.from(sequence.sequence).some((symbol) =>
      !GAP_SYMBOLS.has(symbol) && !NUCLEOTIDE_SYMBOLS.has(symbol)
    )
  );

  const alignmentMode = !equalLength
    ? "rawUnequal"
    : alphabet === "protein" || alphabet === "unknown" || invalidForDeclaredNucleotide
      ? "neutral"
      : "aligned";

  if (alignmentMode === "rawUnequal") {
    warnings.push("unequal_sequence_lengths");
  }
  if (inference.hasT && inference.hasU && inference.alphabet === "nucleotide") {
    warnings.push("mixed_t_u_alphabet");
  }
  if (inference.alphabet === "unknown") {
    warnings.push("alphabet_unknown");
  }
  if (invalidForDeclaredNucleotide) {
    warnings.push("invalid_alignment_symbol");
  }
  if (
    options.declaredAlphabet &&
    inference.alphabet !== "unknown" &&
    alphabetFamily(options.declaredAlphabet) !== alphabetFamily(inference.alphabet)
  ) {
    warnings.push("declared_alphabet_mismatch");
  }
  if (sequences.some((sequence) => sequence.sequence.includes("."))) {
    warnings.push("dot_gap_normalized");
  }
  if (new Set(sequences.map((sequence) => sequence.id)).size !== sequences.length) {
    warnings.push("duplicate_headers");
  }

  return {
    sourceKey: options.sourceKey ?? canonicalAlignmentSourceKey(normalized),
    sourceKind: options.sourceKind,
    sourceName: options.sourceName,
    alphabet,
    alphabetConfidence: options.declaredAlphabet ? "declared" : inference.confidence,
    alignmentMode,
    sequenceCount: normalized.length,
    alignmentLength,
    declaredDimensions: options.declaredDimensions,
    observedDimensions: {
      sequenceCount: normalized.length,
      alignmentLength
    },
    rawSha256: options.rawSha256,
    alignmentSha256: options.alignmentSha256,
    normalization: {
      rowOrderIncluded: true,
      headersIncluded: true,
      uppercaseSequences: true,
      dotAsGap: true,
      whitespaceRemoved: true
    },
    warnings
  };
}

export function rowKeyForSequence(sequence: MSASequence, index: number) {
  return sequence.rowKey ?? `legacy-row:${String(index + 1).padStart(8, "0")}:${sequence.id}`;
}

export function resolveAnalysisScopeSequences(
  sequences: MSASequence[],
  scope: AnalysisScope,
  rows: AnalysisScopeRows = {}
) {
  if (scope === "all") {
    return sequences;
  }
  const included = new Set(
    scope === "visible" ? rows.visibleRowKeys ?? [] : rows.selectedRowKeys ?? []
  );
  return sequences.filter((sequence, index) =>
    included.has(rowKeyForSequence(sequence, index))
  );
}
