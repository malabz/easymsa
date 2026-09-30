import type { MSASequence, SequenceAlphabet } from "../../lib/types/msa";
import { normalizeAlignmentSequence, rowKeyForSequence } from "./alignmentModel";
import { materializeAllColumnStats } from "./columnStatsStore";
import type {
  AlignmentOverviewBase,
  ColumnRange,
  ColumnStats,
  ConsensusMode,
  DifferenceKind,
  MotifMatch,
  MotifSearchOptions,
  MotifSearchResult,
  MsaAnalysisResult,
  MsaAnalysisStoreResult,
  NucleotideAnalysisOptions,
  RangeStats,
  ReferenceCoordinateMap,
  RowQcStats
} from "./types";
import {
  COLUMN_STATS_FLAGS,
  COLUMN_STATS_STORE_VERSION
} from "./types";

const CANONICAL_DNA_BASES = new Set(["A", "C", "G", "T"]);
const IUPAC_BASES: Record<string, string> = {
  A: "A",
  C: "C",
  G: "G",
  T: "T",
  U: "T",
  R: "AG",
  Y: "CT",
  S: "CG",
  W: "AT",
  K: "GT",
  M: "AC",
  B: "CGT",
  D: "AGT",
  H: "ACT",
  V: "ACG",
  N: "ACGT"
};
const IUPAC_COMPLEMENT: Record<string, string> = {
  A: "T",
  C: "G",
  G: "C",
  T: "A",
  R: "Y",
  Y: "R",
  S: "S",
  W: "W",
  K: "M",
  M: "K",
  B: "V",
  D: "H",
  H: "D",
  V: "B",
  N: "N"
};
const BASES_TO_IUPAC: Record<string, string> = Object.fromEntries(
  Object.entries(IUPAC_BASES)
    .filter(([code]) => code !== "U")
    .map(([code, bases]) => [bases.split("").sort().join(""), code])
);
const OVERVIEW_BASES: AlignmentOverviewBase[] = [
  "A",
  "C",
  "G",
  "T",
  "U",
  "N",
  "other",
  "gap"
];

type ColumnSymbol =
  | { kind: "gap" }
  | { kind: "canonical"; base: string }
  | { kind: "ambiguity"; code: string }
  | { kind: "unknown"; code: string };

function isRnaAlphabet(alphabet?: SequenceAlphabet) {
  return alphabet === "rna";
}

function isGap(base: string) {
  return !base || base === "-" || base === ".";
}

function normalizedNucleotide(base: string) {
  return base.toUpperCase() === "U" ? "T" : base.toUpperCase();
}

function canonicalMetricBase(base: string, alphabet?: SequenceAlphabet) {
  const normalized = base.toUpperCase();
  if (normalized === "A" || normalized === "C" || normalized === "G") {
    return normalized;
  }
  if (normalized === "T" || normalized === "U") {
    return isRnaAlphabet(alphabet) ? "U" : "T";
  }
  return null;
}

function classifyColumnSymbol(base: string, alphabet?: SequenceAlphabet): ColumnSymbol {
  const normalized = base.toUpperCase();
  if (isGap(normalized)) {
    return { kind: "gap" };
  }
  const canonical = canonicalMetricBase(normalized, alphabet);
  if (canonical) {
    return { kind: "canonical", base: canonical };
  }
  if (IUPAC_BASES[normalized]) {
    return { kind: "ambiguity", code: normalized };
  }
  return { kind: "unknown", code: normalized };
}

function iupacForBases(bases: string[], alphabet?: SequenceAlphabet) {
  const normalized = Array.from(
    new Set(
      bases
        .map(normalizedNucleotide)
        .filter((base) => CANONICAL_DNA_BASES.has(base))
    )
  ).sort();
  if (!normalized.length) {
    return "N";
  }
  const code = BASES_TO_IUPAC[normalized.join("")] ?? "N";
  return code === "T" && isRnaAlphabet(alphabet) ? "U" : code;
}

function overviewBase(base: string): AlignmentOverviewBase {
  const normalized = base.toUpperCase();
  if (isGap(normalized)) {
    return "gap";
  }
  if (
    normalized === "A" ||
    normalized === "C" ||
    normalized === "G" ||
    normalized === "T" ||
    normalized === "U" ||
    normalized === "N"
  ) {
    return normalized;
  }
  return "other";
}

export function calculateMsaAnalysisStore(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number,
  options: NucleotideAnalysisOptions = {}
): MsaAnalysisStoreResult {
  const normalizedSequences = sequences.map((sequence) => ({
    ...sequence,
    sequence: normalizeAlignmentSequence(sequence.sequence)
  }));
  const baseCounts = Object.fromEntries(
    OVERVIEW_BASES.map((base) => [base, 0])
  ) as Record<AlignmentOverviewBase, number>;
  let conservationTotal = 0;
  let coverageTotal = 0;
  let entropyTotal = 0;
  let variableColumns = 0;
  let highGapColumns = 0;
  let informativeColumns = 0;
  let informativeResidues = 0;
  let ambiguityResidues = 0;
  let unknownResidues = 0;
  const canonicalCounts = new Uint32Array(alignmentLength);
  const ambiguityCounts = new Uint32Array(alignmentLength);
  const unknownCounts = new Uint32Array(alignmentLength);
  const gapCounts = new Uint32Array(alignmentLength);
  const dominantCounts = new Uint32Array(alignmentLength);
  const gcCounts = new Uint32Array(alignmentLength);
  const entropyBits = new Float64Array(alignmentLength);
  entropyBits.fill(Number.NaN);
  const flags = new Uint8Array(alignmentLength);
  const majorityConsensus = new Array<string>(alignmentLength);
  const iupacConsensus = new Array<string>(alignmentLength);
  const totalRows = normalizedSequences.length;
  const fourthBase = isRnaAlphabet(options.alphabet) ? "U" : "T";

  for (let index = 0; index < alignmentLength; index += 1) {
    let aCount = 0;
    let cCount = 0;
    let gCount = 0;
    let fourthCount = 0;
    let ambiguityCount = 0;
    let unknownCount = 0;
    let gapCount = 0;

    for (const sequence of normalizedSequences) {
      const base = (sequence.sequence[index] ?? "").toUpperCase();
      baseCounts[overviewBase(base)] += 1;
      const symbol = classifyColumnSymbol(base, options.alphabet);
      if (symbol.kind === "gap") {
        gapCount += 1;
      } else if (symbol.kind === "ambiguity") {
        ambiguityCount += 1;
      } else if (symbol.kind === "unknown") {
        unknownCount += 1;
      } else if (symbol.base === "A") {
        aCount += 1;
      } else if (symbol.base === "C") {
        cCount += 1;
      } else if (symbol.base === "G") {
        gCount += 1;
      } else {
        fourthCount += 1;
      }
    }

    const canonicalCount = aCount + cCount + gCount + fourthCount;
    canonicalCounts[index] = canonicalCount;
    ambiguityCounts[index] = ambiguityCount;
    unknownCounts[index] = unknownCount;
    gapCounts[index] = gapCount;
    gcCounts[index] = gCount + cCount;
    informativeResidues += canonicalCount;
    ambiguityResidues += ambiguityCount;
    unknownResidues += unknownCount;
    coverageTotal += totalRows > 0
      ? (canonicalCount + ambiguityCount + unknownCount) / totalRows
      : 0;

    const baseVector: Array<[string, number]> = [
      ["A", aCount],
      ["C", cCount],
      ["G", gCount],
      [fourthBase, fourthCount]
    ];
    let dominantBase = "N";
    let dominantCount = 0;
    let observedCanonicalTypes = 0;
    for (const [base, count] of baseVector) {
      if (count > 0) observedCanonicalTypes += 1;
      if (count > dominantCount) {
        dominantBase = base;
        dominantCount = count;
      }
    }
    dominantCounts[index] = dominantCount;
    majorityConsensus[index] = dominantBase;
    const tiedBases = canonicalCount > 0
      ? baseVector
          .filter(([, count]) => count === dominantCount)
          .map(([base]) => base)
      : [];
    iupacConsensus[index] = tiedBases.length
      ? iupacForBases(tiedBases, options.alphabet)
      : "N";

    if (canonicalCount > 0) {
      flags[index] |= COLUMN_STATS_FLAGS.informative;
      informativeColumns += 1;
      conservationTotal += dominantCount / canonicalCount;
      let columnEntropy = 0;
      for (const [, count] of baseVector) {
        if (count <= 0) continue;
        const probability = count / canonicalCount;
        columnEntropy -= probability * Math.log2(probability);
      }
      entropyBits[index] = columnEntropy;
      entropyTotal += columnEntropy / 2;
    }
    if (observedCanonicalTypes >= 2) {
      flags[index] |= COLUMN_STATS_FLAGS.variable;
      variableColumns += 1;
    }
    if (tiedBases.length > 1) {
      flags[index] |= COLUMN_STATS_FLAGS.majorityTie;
    }
    if (totalRows > 0 && gapCount / totalRows >= 0.5) {
      highGapColumns += 1;
    }
  }

  const canonicalBaseCount =
    baseCounts.A + baseCounts.C + baseCounts.G + baseCounts.T + baseCounts.U;
  const alignmentDivisor = alignmentLength > 0 ? alignmentLength : 1;
  const informativeDivisor = informativeColumns > 0 ? informativeColumns : 1;

  return {
    columnStore: {
      version: COLUMN_STATS_STORE_VERSION,
      length: alignmentLength,
      totalRows,
      canonicalCounts,
      ambiguityCounts,
      unknownCounts,
      gapCounts,
      dominantCounts,
      gcCounts,
      entropyBits,
      flags,
      majorityConsensus: majorityConsensus.join(""),
      iupacConsensus: iupacConsensus.join("")
    },
    overview: {
      baseCounts,
      totalCells: normalizedSequences.length * alignmentLength,
      observedResidues:
        normalizedSequences.length * alignmentLength - baseCounts.gap,
      informativeResidues,
      ambiguityResidues,
      unknownResidues,
      informativeColumns,
      gcFraction:
        canonicalBaseCount > 0
          ? (baseCounts.G + baseCounts.C) / canonicalBaseCount
          : null,
      averageConservation:
        informativeColumns > 0 ? conservationTotal / informativeDivisor : 0,
      averageCoverage: alignmentLength > 0 ? coverageTotal / alignmentDivisor : 0,
      averageEntropy: informativeColumns > 0 ? entropyTotal / informativeDivisor : 0,
      variableColumns,
      highGapColumns
    }
  };
}

export function calculateMsaAnalysis(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number,
  options: NucleotideAnalysisOptions = {}
): MsaAnalysisResult {
  const result = calculateMsaAnalysisStore(sequences, alignmentLength, options);
  return {
    columns: materializeAllColumnStats(result.columnStore),
    overview: result.overview
  };
}

export function calculateColumnStats(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number,
  options: NucleotideAnalysisOptions = {}
): ColumnStats[] {
  return materializeAllColumnStats(
    calculateMsaAnalysisStore(sequences, alignmentLength, options).columnStore
  );
}

export function calculateRowQcStats(
  sequences: MSASequence[],
  alignmentLength?: number,
  options: NucleotideAnalysisOptions = {}
): RowQcStats[] {
  const resolvedAlignmentLength = alignmentLength ?? sequences.reduce(
    (maximum, sequence) => Math.max(maximum, sequence.sequence.length),
    0
  );
  return sequences.map((sequence, index) => {
    let canonicalCount = 0;
    let ambiguityCount = 0;
    let unknownCount = 0;
    let gapCount = 0;
    let nonGapLength = 0;
    let gcCount = 0;
    const normalized = normalizeAlignmentSequence(sequence.sequence);
    for (let position = 0; position < resolvedAlignmentLength; position += 1) {
      const symbol = classifyColumnSymbol(normalized[position] ?? "", options.alphabet);
      if (symbol.kind === "canonical") {
        canonicalCount += 1;
        nonGapLength += 1;
        if (symbol.base === "G" || symbol.base === "C") {
          gcCount += 1;
        }
      } else if (symbol.kind === "ambiguity") {
        ambiguityCount += 1;
        nonGapLength += 1;
      } else if (symbol.kind === "unknown") {
        unknownCount += 1;
        nonGapLength += 1;
      } else {
        gapCount += 1;
      }
    }
    const divisor = resolvedAlignmentLength > 0 ? resolvedAlignmentLength : 1;
    return {
      rowKey: rowKeyForSequence(sequence, index),
      sequenceId: sequence.id,
      originalIndex: sequence.originalIndex ?? index,
      sequenceLength: normalized.length,
      rawLength: sequence.sequence.length,
      ungappedLength: nonGapLength,
      nonGapLength,
      alignmentLength: resolvedAlignmentLength,
      canonicalCount,
      ambiguityCount,
      unknownCount,
      gapCount,
      gapFraction: resolvedAlignmentLength > 0 ? gapCount / divisor : 0,
      coverage: resolvedAlignmentLength > 0
        ? (canonicalCount + ambiguityCount + unknownCount) / divisor
        : 0,
      informativeCoverage: resolvedAlignmentLength > 0 ? canonicalCount / divisor : 0,
      ambiguityFraction: resolvedAlignmentLength > 0 ? ambiguityCount / divisor : 0,
      unknownFraction: resolvedAlignmentLength > 0 ? unknownCount / divisor : 0,
      gcFraction: canonicalCount > 0 ? gcCount / canonicalCount : null
    };
  });
}

export function buildReferenceCoordinateMap(
  referenceSequence: string
): ReferenceCoordinateMap {
  const normalizedReference = normalizeAlignmentSequence(referenceSequence);
  const alignmentToReference: Array<number | null> = [];
  const alignmentToReferenceCoordinate: ReferenceCoordinateMap["alignmentToReferenceCoordinate"] = [];
  const alignmentToReferenceLabel: Array<string | null> = [];
  const referenceToAlignment: number[] = [];
  let referencePosition = 0;
  let insertionOffset = 0;

  for (let index = 0; index < normalizedReference.length; index += 1) {
    const base = normalizedReference[index] ?? "";
    if (!isGap(base)) {
      referencePosition += 1;
      insertionOffset = 0;
      const label = String(referencePosition);
      alignmentToReference.push(referencePosition);
      alignmentToReferenceCoordinate.push({
        kind: "base",
        position: referencePosition,
        label
      });
      alignmentToReferenceLabel.push(label);
      referenceToAlignment[referencePosition - 1] = index + 1;
    } else {
      insertionOffset += 1;
      const label = `${referencePosition}+${insertionOffset}`;
      alignmentToReference.push(null);
      alignmentToReferenceCoordinate.push({
        kind: "insertion",
        after: referencePosition,
        offset: insertionOffset,
        label
      });
      alignmentToReferenceLabel.push(label);
    }
  }

  return {
    alignmentToReference,
    alignmentToReferenceCoordinate,
    alignmentToReferenceLabel,
    referenceToAlignment,
    referenceLength: referencePosition
  };
}

function nucleotidePossibilities(base: string) {
  const normalized = normalizedNucleotide(base);
  const possibilities = IUPAC_BASES[normalized];
  return possibilities ? new Set(possibilities.split("")) : null;
}

function isCanonicalPossibilitySet(value: Set<string> | null): value is Set<string> {
  return value !== null && value.size === 1;
}

export function classifyDifference(base: string, referenceBase: string): DifferenceKind {
  const baseGap = isGap(base);
  const referenceGap = isGap(referenceBase);
  if (baseGap && referenceGap) {
    return "empty";
  }
  if (referenceGap) {
    return "insertion";
  }
  if (baseGap) {
    return "deletion";
  }

  const baseSet = nucleotidePossibilities(base);
  const referenceSet = nucleotidePossibilities(referenceBase);
  if (!baseSet || !referenceSet) {
    return "unknown";
  }
  if (
    isCanonicalPossibilitySet(baseSet) &&
    isCanonicalPossibilitySet(referenceSet) &&
    Array.from(baseSet)[0] === Array.from(referenceSet)[0]
  ) {
    return "match";
  }
  if (Array.from(baseSet).some((value) => referenceSet.has(value))) {
    return "compatibleAmbiguity";
  }
  return "substitution";
}

export function normalizedIupacMotif(value: string) {
  return value.replace(/\s+/g, "").toUpperCase().replace(/U/g, "T");
}

export function validateIupacMotif(value: string) {
  const query = normalizedIupacMotif(value);
  const invalidCharacters = Array.from(
    new Set(query.split("").filter((base) => !IUPAC_BASES[base]))
  );
  return {
    valid: invalidCharacters.length === 0,
    query,
    invalidCharacters,
    error: invalidCharacters.length
      ? `Invalid IUPAC motif character${invalidCharacters.length > 1 ? "s" : ""}: ${invalidCharacters.join(", ")}`
      : null
  };
}

function motifMatchesAt(
  sequence: string,
  query: string,
  start: number,
  matchMode: NonNullable<MotifSearchOptions["matchMode"]>
) {
  for (let offset = 0; offset < query.length; offset += 1) {
    const allowed = nucleotidePossibilities(query[offset] ?? "");
    const observed = nucleotidePossibilities(sequence[start + offset] ?? "");
    if (!allowed || !observed) {
      return false;
    }
    if (matchMode === "strict") {
      if (Array.from(observed).some((base) => !allowed.has(base))) {
        return false;
      }
    } else if (!Array.from(observed).some((base) => allowed.has(base))) {
      return false;
    }
  }
  return true;
}

function reverseComplementIupac(query: string) {
  return query
    .split("")
    .reverse()
    .map((base) => IUPAC_COMPLEMENT[base] ?? "")
    .join("");
}

function resolveMotifOptions(
  maxMatchesOrOptions: number | MotifSearchOptions
): Required<MotifSearchOptions> {
  if (typeof maxMatchesOrOptions === "number") {
    return {
      maxMatches: Math.max(0, maxMatchesOrOptions),
      matchMode: "strict",
      strandMode: "forward"
    };
  }
  return {
    maxMatches: Math.max(0, maxMatchesOrOptions.maxMatches ?? Number.POSITIVE_INFINITY),
    matchMode: maxMatchesOrOptions.matchMode ?? "strict",
    strandMode: maxMatchesOrOptions.strandMode ?? "forward"
  };
}

export function searchIupacMotifMatches(
  sequences: MSASequence[],
  motif: string,
  maxMatchesOrOptions: number | MotifSearchOptions = Number.POSITIVE_INFINITY
): MotifSearchResult {
  const validation = validateIupacMotif(motif);
  if (!validation.valid) {
    throw new Error(validation.error ?? "Invalid IUPAC motif.");
  }
  const query = validation.query;
  if (!query) {
    return { matches: [], totalCount: 0, truncated: false };
  }
  const options = resolveMotifOptions(maxMatchesOrOptions);
  const reverseQuery = reverseComplementIupac(query);
  const strandQueries: Array<{ query: string; strand: "+" | "-" }> = [
    { query, strand: "+" }
  ];
  if (options.strandMode === "both" && reverseQuery !== query) {
    strandQueries.push({ query: reverseQuery, strand: "-" });
  }

  const matches: MotifMatch[] = [];
  let totalCount = 0;
  sequences.forEach((sequence, sequenceIndex) => {
    const ungapped: Array<{
      base: string;
      alignmentPosition: number;
      sequencePosition: number;
    }> = [];
    let sequencePosition = 0;
    normalizeAlignmentSequence(sequence.sequence).split("").forEach((base, index) => {
      if (!isGap(base)) {
        sequencePosition += 1;
        ungapped.push({
          base: normalizedNucleotide(base),
          alignmentPosition: index + 1,
          sequencePosition
        });
      }
    });
    const searchable = ungapped.map((item) => item.base).join("");

    for (const strandQuery of strandQueries) {
      for (let start = 0; start <= searchable.length - strandQuery.query.length; start += 1) {
        if (!motifMatchesAt(searchable, strandQuery.query, start, options.matchMode)) {
          continue;
        }
        totalCount += 1;
        if (matches.length >= options.maxMatches) {
          continue;
        }
        const items = ungapped.slice(start, start + strandQuery.query.length);
        const positions = items.map((item) => item.alignmentPosition);
        matches.push({
          sequenceId: sequence.id,
          rowKey: rowKeyForSequence(sequence, sequenceIndex),
          start: positions[0] ?? 1,
          positions,
          alignmentStart: positions[0] ?? 1,
          alignmentEnd: positions[positions.length - 1] ?? 1,
          sequenceStart: items[0]?.sequencePosition ?? 1,
          sequenceEnd: items[items.length - 1]?.sequencePosition ?? 1,
          strand: strandQuery.strand
        });
      }
    }
  });
  return {
    matches,
    totalCount,
    truncated: totalCount > matches.length
  };
}

export function findIupacMotifMatches(
  sequences: MSASequence[],
  motif: string,
  options: MotifSearchOptions = {}
): MotifMatch[] {
  return searchIupacMotifMatches(sequences, motif, options).matches;
}

function isTransition(left: string, right: string) {
  const pair = [normalizedNucleotide(left), normalizedNucleotide(right)]
    .sort()
    .join("");
  return pair === "AG" || pair === "CT";
}

export function calculateRangeStats({
  sequences,
  columns: _columns,
  range,
  consensus,
  consensusMode,
  reference,
  alphabet
}: {
  sequences: MSASequence[];
  columns: ColumnStats[];
  range: ColumnRange;
  consensus?: string;
  consensusMode?: ConsensusMode;
  reference?: MSASequence | null;
  alphabet?: SequenceAlphabet;
}): RangeStats | null {
  const normalizedSequences = sequences.map((sequence) => ({
    ...sequence,
    sequence: normalizeAlignmentSequence(sequence.sequence)
  }));
  const alignmentLength = normalizedSequences.reduce(
    (maximum, sequence) => Math.max(maximum, sequence.sequence.length),
    0
  );
  if (alignmentLength === 0) {
    return null;
  }
  const start = Math.min(alignmentLength, Math.max(1, Math.trunc(range.start)));
  const end = Math.min(
    alignmentLength,
    Math.max(start, Math.trunc(range.end))
  );
  const rangeLength = end - start + 1;
  const rangeStore = calculateMsaAnalysisStore(
    normalizedSequences.map((sequence) => ({
      sequence: sequence.sequence.slice(start - 1, end)
    })),
    rangeLength,
    { alphabet }
  ).columnStore;
  const rangeColumns = materializeAllColumnStats(rangeStore);
  if (!rangeColumns.length) {
    return null;
  }

  const baseCounts: Record<string, number> = {};
  let canonicalBases = 0;
  let gcBases = 0;
  let substitutionCount = 0;
  let compatibleAmbiguityCount = 0;
  let unknownComparisonCount = 0;
  let unclassifiedSubstitutionCount = 0;
  let comparableCanonicalCount = 0;
  let insertionCount = 0;
  let deletionCount = 0;
  let transitionCount = 0;
  let transversionCount = 0;

  const normalizedReference = reference
    ? normalizeAlignmentSequence(reference.sequence)
    : null;
  const referenceIndex = reference
    ? sequences.findIndex((sequence) =>
        sequence === reference ||
        Boolean(
          sequence.rowKey &&
          reference.rowKey &&
          sequence.rowKey === reference.rowKey
        )
      )
    : -1;
  for (const [sequenceIndex, sequence] of normalizedSequences.entries()) {
    for (let position = start; position <= end; position += 1) {
      const base = (sequence.sequence[position - 1] ?? "").toUpperCase();
      if (!isGap(base)) {
        baseCounts[base] = (baseCounts[base] ?? 0) + 1;
        const canonical = canonicalMetricBase(base, alphabet);
        if (canonical) {
          canonicalBases += 1;
          if (canonical === "G" || canonical === "C") {
            gcBases += 1;
          }
        }
      }

      if (!reference || sequenceIndex === referenceIndex) {
        continue;
      }
      const referenceBase = normalizedReference?.[position - 1] ?? "";
      const difference = classifyDifference(base, referenceBase);
      if (difference === "insertion") {
        insertionCount += 1;
      } else if (difference === "deletion") {
        deletionCount += 1;
      } else if (difference === "compatibleAmbiguity") {
        compatibleAmbiguityCount += 1;
      } else if (difference === "unknown") {
        unknownComparisonCount += 1;
      } else if (difference === "substitution") {
        substitutionCount += 1;
        const baseSet = nucleotidePossibilities(base);
        const referenceSet = nucleotidePossibilities(referenceBase);
        if (isCanonicalPossibilitySet(baseSet) && isCanonicalPossibilitySet(referenceSet)) {
          comparableCanonicalCount += 1;
          if (isTransition(base, referenceBase)) {
            transitionCount += 1;
          } else {
            transversionCount += 1;
          }
        } else {
          unclassifiedSubstitutionCount += 1;
        }
      } else if (difference === "match") {
        comparableCanonicalCount += 1;
      }
    }
  }

  const informativeColumns = rangeColumns.filter((column) =>
    column.hasInformativeBases
  );
  const averageAll = (value: (column: ColumnStats) => number) =>
    rangeColumns.reduce((sum, column) => sum + value(column), 0) /
    rangeColumns.length;
  const averageInformative = (value: (column: ColumnStats) => number) =>
    informativeColumns.length
      ? informativeColumns.reduce((sum, column) => sum + value(column), 0) /
        informativeColumns.length
      : 0;
  const scopedConsensus = consensusMode || consensus === undefined
    ? rangeColumns
        .map((column) =>
          consensusMode === "iupac" ? column.ambiguityConsensus : column.consensusBase
        )
        .join("")
    : consensus.slice(start - 1, end);

  return {
    length: rangeColumns.length,
    sequenceCount: sequences.length,
    informativeColumns: informativeColumns.length,
    averageConservation: averageInformative((column) => column.conservation ?? 0),
    averageGapFraction: averageAll((column) => column.gapFraction),
    averageCoverage: averageAll((column) => column.coverage),
    averageEntropy: averageInformative((column) => column.normalizedEntropy ?? 0),
    variableColumns: rangeColumns.filter((column) => column.variation > 0).length,
    gcFraction: canonicalBases > 0 ? gcBases / canonicalBases : null,
    baseCounts,
    consensusSegment: scopedConsensus,
    substitutionCount,
    mismatchCount: substitutionCount,
    compatibleAmbiguityCount,
    unknownComparisonCount,
    unclassifiedSubstitutionCount,
    comparableCanonicalCount,
    insertionCount,
    deletionCount,
    transitionCount,
    transversionCount
  };
}
