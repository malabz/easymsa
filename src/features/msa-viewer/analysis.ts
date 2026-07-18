import type { MSASequence } from "../../lib/types/msa";
import type {
  AlignmentOverviewBase,
  ColumnRange,
  ColumnStats,
  DifferenceKind,
  MotifMatch,
  MotifSearchResult,
  MsaAnalysisResult,
  RangeStats,
  ReferenceCoordinateMap
} from "./types";

const BASE_ORDER = ["A", "C", "G", "T", "U", "N"];
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
const BASES_TO_IUPAC: Record<string, string> = Object.fromEntries(
  Object.entries(IUPAC_BASES)
    .filter(([code]) => code !== "U")
    .map(([code, bases]) => [bases.split("").sort().join(""), code])
);

function baseOrder(base: string) {
  const index = BASE_ORDER.indexOf(base);
  return index >= 0 ? index : BASE_ORDER.length;
}

function normalizedNucleotide(base: string) {
  return base.toUpperCase() === "U" ? "T" : base.toUpperCase();
}

function iupacForBases(bases: string[]) {
  const normalized = Array.from(
    new Set(bases.map(normalizedNucleotide).filter((base) => "ACGT".includes(base)))
  ).sort();
  if (!normalized.length) {
    return bases[0] ?? "";
  }
  const code = BASES_TO_IUPAC[normalized.join("")] ?? "N";
  if (code === "T" && bases.includes("U") && !bases.includes("T")) {
    return "U";
  }
  return code;
}

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

function overviewBase(base: string): AlignmentOverviewBase {
  const normalized = base.toUpperCase();
  if (!normalized || normalized === "-") {
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

export function calculateMsaAnalysis(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
): MsaAnalysisResult {
  const baseCounts = Object.fromEntries(
    OVERVIEW_BASES.map((base) => [base, 0])
  ) as Record<AlignmentOverviewBase, number>;
  let conservationTotal = 0;
  let coverageTotal = 0;
  let entropyTotal = 0;
  let variableColumns = 0;
  let highGapColumns = 0;

  const columns = Array.from({ length: alignmentLength }, (_, index) => {
    const counts = new Map<string, number>();
    let observed = 0;

    for (const sequence of sequences) {
      const base = (sequence.sequence[index] ?? "").toUpperCase();
      baseCounts[overviewBase(base)] += 1;
      if (!base || base === "-") {
        continue;
      }
      observed += 1;
      counts.set(base, (counts.get(base) ?? 0) + 1);
    }

    const ranked = Array.from(counts.entries()).sort(
      ([leftBase, leftCount], [rightBase, rightCount]) =>
        rightCount - leftCount ||
        baseOrder(leftBase) - baseOrder(rightBase) ||
        leftBase.localeCompare(rightBase)
    );
    const dominantCount = ranked[0]?.[1] ?? 0;
    const tiedBases = ranked
      .filter(([, count]) => count === dominantCount)
      .map(([base]) => base);
    const entropyBits = ranked.reduce((sum, [, count]) => {
      const probability = observed > 0 ? count / observed : 0;
      return probability > 0 ? sum - probability * Math.log2(probability) : sum;
    }, 0);
    const coverage = sequences.length > 0 ? observed / sequences.length : 0;
    const conservation = observed > 0 ? dominantCount / observed : 0;
    const gapFraction = 1 - coverage;
    const entropy = Math.min(1, entropyBits / 2);
    const variation = observed > 0 ? 1 - conservation : 0;

    conservationTotal += conservation;
    coverageTotal += coverage;
    entropyTotal += entropy;
    if (variation > 0) {
      variableColumns += 1;
    }
    if (gapFraction >= 0.5) {
      highGapColumns += 1;
    }

    return {
      position: index + 1,
      conservation,
      gapFraction,
      coverage,
      entropy,
      variation,
      dominantBase: ranked[0]?.[0] ?? "",
      consensusBase: ranked[0]?.[0] ?? "",
      ambiguityConsensus: iupacForBases(tiedBases)
    };
  });

  const canonicalBaseCount =
    baseCounts.A + baseCounts.C + baseCounts.G + baseCounts.T + baseCounts.U;
  const divisor = alignmentLength > 0 ? alignmentLength : 1;

  return {
    columns,
    overview: {
      baseCounts,
      totalCells: sequences.length * alignmentLength,
      observedResidues: sequences.length * alignmentLength - baseCounts.gap,
      gcFraction:
        canonicalBaseCount > 0
          ? (baseCounts.G + baseCounts.C) / canonicalBaseCount
          : null,
      averageConservation:
        alignmentLength > 0 ? conservationTotal / divisor : 0,
      averageCoverage: alignmentLength > 0 ? coverageTotal / divisor : 0,
      averageEntropy: alignmentLength > 0 ? entropyTotal / divisor : 0,
      variableColumns,
      highGapColumns
    }
  };
}

export function calculateColumnStats(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
): ColumnStats[] {
  return calculateMsaAnalysis(sequences, alignmentLength).columns;
}

export function buildReferenceCoordinateMap(
  referenceSequence: string
): ReferenceCoordinateMap {
  const alignmentToReference: Array<number | null> = [];
  const referenceToAlignment: number[] = [];
  let referencePosition = 0;

  for (let index = 0; index < referenceSequence.length; index += 1) {
    const base = referenceSequence[index] ?? "";
    if (base && base !== "-") {
      referencePosition += 1;
      alignmentToReference.push(referencePosition);
      referenceToAlignment[referencePosition - 1] = index + 1;
    } else {
      alignmentToReference.push(null);
    }
  }

  return {
    alignmentToReference,
    referenceToAlignment,
    referenceLength: referencePosition
  };
}

export function classifyDifference(base: string, referenceBase: string): DifferenceKind {
  const normalizedBase = normalizedNucleotide(base);
  const normalizedReference = normalizedNucleotide(referenceBase);
  if (!base && !referenceBase) {
    return "empty";
  }
  if (normalizedBase === normalizedReference) {
    return "match";
  }
  if ((!referenceBase || referenceBase === "-") && base && base !== "-") {
    return "insertion";
  }
  if ((!base || base === "-") && referenceBase && referenceBase !== "-") {
    return "deletion";
  }
  return "mismatch";
}

export function normalizedIupacMotif(value: string) {
  return value
    .replace(/[\s-]+/g, "")
    .toUpperCase()
    .replace(/U/g, "T")
    .split("")
    .filter((base) => Boolean(IUPAC_BASES[base]))
    .join("");
}

function motifMatchesAt(sequence: string, query: string, start: number) {
  for (let offset = 0; offset < query.length; offset += 1) {
    const allowed = IUPAC_BASES[query[offset]] ?? "";
    if (!allowed.includes(sequence[start + offset] ?? "")) {
      return false;
    }
  }
  return true;
}

export function searchIupacMotifMatches(
  sequences: MSASequence[],
  motif: string,
  maxMatches = Number.POSITIVE_INFINITY
): MotifSearchResult {
  const query = normalizedIupacMotif(motif);
  if (!query) {
    return { matches: [], totalCount: 0, truncated: false };
  }

  const matches: MotifMatch[] = [];
  let totalCount = 0;
  sequences.forEach((sequence) => {
    const ungapped: Array<{ base: string; position: number }> = [];
    sequence.sequence.split("").forEach((base, index) => {
      if (base && base !== "-") {
        ungapped.push({
          base: normalizedNucleotide(base),
          position: index + 1
        });
      }
    });
    const searchable = ungapped.map((item) => item.base).join("");
    for (let start = 0; start <= searchable.length - query.length; start += 1) {
      if (motifMatchesAt(searchable, query, start)) {
        totalCount += 1;
        if (matches.length < maxMatches) {
          matches.push({
            sequenceId: sequence.id,
            start: ungapped[start]?.position ?? 1,
            positions: ungapped
              .slice(start, start + query.length)
              .map((item) => item.position)
          });
        }
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
  motif: string
): MotifMatch[] {
  return searchIupacMotifMatches(sequences, motif).matches;
}

function isTransition(left: string, right: string) {
  const pair = [normalizedNucleotide(left), normalizedNucleotide(right)]
    .sort()
    .join("");
  return pair === "AG" || pair === "CT";
}

export function calculateRangeStats({
  sequences,
  columns,
  range,
  consensus,
  reference
}: {
  sequences: MSASequence[];
  columns: ColumnStats[];
  range: ColumnRange;
  consensus: string;
  reference?: MSASequence | null;
}): RangeStats | null {
  const rangeColumns = columns.slice(range.start - 1, range.end);
  if (!rangeColumns.length) {
    return null;
  }

  const baseCounts: Record<string, number> = {};
  let observedBases = 0;
  let gcBases = 0;
  let mismatchCount = 0;
  let insertionCount = 0;
  let deletionCount = 0;
  let transitionCount = 0;
  let transversionCount = 0;

  for (const sequence of sequences) {
    for (let position = range.start; position <= range.end; position += 1) {
      const base = (sequence.sequence[position - 1] ?? "").toUpperCase();
      if (base && base !== "-") {
        baseCounts[base] = (baseCounts[base] ?? 0) + 1;
        observedBases += 1;
        if (base === "G" || base === "C") {
          gcBases += 1;
        }
      }

      if (!reference || sequence.id === reference.id) {
        continue;
      }
      const referenceBase = reference.sequence[position - 1] ?? "";
      const difference = classifyDifference(base, referenceBase);
      if (difference === "insertion") {
        insertionCount += 1;
      } else if (difference === "deletion") {
        deletionCount += 1;
      } else if (difference === "mismatch") {
        mismatchCount += 1;
        if (isTransition(base, referenceBase)) {
          transitionCount += 1;
        } else {
          transversionCount += 1;
        }
      }
    }
  }

  const average = (value: (column: ColumnStats) => number) =>
    rangeColumns.reduce((sum, column) => sum + value(column), 0) /
    rangeColumns.length;

  return {
    length: rangeColumns.length,
    averageConservation: average((column) => column.conservation),
    averageGapFraction: average((column) => column.gapFraction),
    averageCoverage: average((column) => column.coverage),
    averageEntropy: average((column) => column.entropy),
    variableColumns: rangeColumns.filter((column) => column.variation > 0).length,
    gcFraction: observedBases > 0 ? gcBases / observedBases : null,
    baseCounts,
    consensusSegment: consensus.slice(range.start - 1, range.end),
    mismatchCount,
    insertionCount,
    deletionCount,
    transitionCount,
    transversionCount
  };
}
