import { describe, expect, it } from "vitest";
import {
  buildReferenceCoordinateMap,
  calculateColumnStats,
  calculateMsaAnalysis,
  calculateRangeStats,
  calculateRowQcStats,
  classifyDifference,
  findIupacMotifMatches,
  searchIupacMotifMatches,
  validateIupacMotif
} from "./analysis";

describe("MSA viewer nucleotide-v2 analysis", () => {
  it("separates canonical, ambiguity, unknown, and gap observations", () => {
    const analysis = calculateMsaAnalysis(
      [{ sequence: "ACGU-NR" }, { sequence: "AC-T--?" }],
      7
    );

    expect(analysis.columns).toHaveLength(7);
    expect(analysis.overview.baseCounts).toEqual({
      A: 2,
      C: 2,
      G: 1,
      T: 1,
      U: 1,
      N: 1,
      other: 2,
      gap: 4
    });
    expect(analysis.overview.gcFraction).toBeCloseTo(3 / 7);
    expect(analysis.overview.observedResidues).toBe(10);
    expect(analysis.overview.informativeResidues).toBe(7);
    expect(analysis.overview.ambiguityResidues).toBe(2);
    expect(analysis.overview.unknownResidues).toBe(1);
    expect(analysis.overview.variableColumns).toBe(0);
    expect(analysis.overview.highGapColumns).toBe(3);
  });

  it("keeps no-information metrics explicit for an all-gap alignment", () => {
    const result = calculateMsaAnalysis(
      [{ sequence: "--" }, { sequence: ".." }],
      2
    );

    expect(result.overview.gcFraction).toBeNull();
    expect(result.overview.averageCoverage).toBe(0);
    expect(result.overview.informativeColumns).toBe(0);
    expect(result.columns[0]).toMatchObject({
      hasInformativeBases: false,
      conservation: null,
      entropy: null,
      gcFraction: null,
      entropyBits: null,
      normalizedEntropy: null,
      consensusBase: "N",
      ambiguityConsensus: "N"
    });
  });

  it("uses deterministic majority and IUPAC consensus for canonical ties", () => {
    const columns = calculateColumnStats(
      [{ sequence: "A" }, { sequence: "G" }, { sequence: "-" }],
      1
    );
    expect(columns[0]).toMatchObject({
      consensusBase: "A",
      ambiguityConsensus: "R",
      majorityTie: true,
      canonicalCount: 2,
      gapCount: 1
    });
    expect(columns[0].coverage).toBeCloseTo(2 / 3);
    expect(columns[0].entropyBits).toBeCloseTo(1);
    expect(columns[0].normalizedEntropy).toBeCloseTo(0.5);
    expect(columns[0].gcFraction).toBeCloseTo(0.5);
  });

  it("does not turn ambiguity and unknown symbols into canonical variation", () => {
    const column = calculateColumnStats(
      [{ sequence: "A" }, { sequence: "N" }, { sequence: "R" }, { sequence: "?" }],
      1
    )[0];

    expect(column).toMatchObject({
      canonicalCount: 1,
      ambiguityCount: 2,
      unknownCount: 1,
      conservation: 1,
      variation: 0,
      informativeCoverage: 0.25,
      ambiguityFraction: 0.5,
      unknownFraction: 0.25
    });
    expect(column.entropyBits).toBe(0);
  });

  it("uses the canonical denominator for column GC", () => {
    const column = calculateColumnStats(
      ["A", "C", "G", "T", "N", "-"].map((sequence) => ({ sequence })),
      1
    )[0];
    expect(column.gcFraction).toBeCloseTo(2 / 4);
    expect(column.canonicalCount).toBe(4);
    expect(column.ambiguityCount).toBe(1);
  });

  it("normalizes T and U consistently for DNA/RNA metrics", () => {
    const dna = calculateColumnStats(
      [{ sequence: "T" }, { sequence: "U" }],
      1,
      { alphabet: "dna" }
    )[0];
    const rna = calculateColumnStats(
      [{ sequence: "T" }, { sequence: "U" }],
      1,
      { alphabet: "rna" }
    )[0];

    expect(dna).toMatchObject({ dominantBase: "T", conservation: 1, variation: 0 });
    expect(rna).toMatchObject({ dominantBase: "U", conservation: 1, variation: 0 });
  });

  it("calculates row-level QC with stable identities", () => {
    const rows = calculateRowQcStats(
      [
        { id: "duplicate", rowKey: "source:1", sequence: "ACN-" },
        { id: "duplicate", rowKey: "source:2", sequence: "R?.-" }
      ],
      4
    );

    expect(rows[0]).toMatchObject({
      rowKey: "source:1",
      canonicalCount: 2,
      ambiguityCount: 1,
      unknownCount: 0,
      gapCount: 1,
      informativeCoverage: 0.5
    });
    expect(rows[1]).toMatchObject({
      rowKey: "source:2",
      ambiguityCount: 1,
      unknownCount: 1,
      gapCount: 2
    });
  });

  it("maps reference bases and interbase insertion coordinates", () => {
    const map = buildReferenceCoordinateMap("--A--C-");
    expect(map.alignmentToReference).toEqual([null, null, 1, null, null, 2, null]);
    expect(map.alignmentToReferenceLabel).toEqual([
      "0+1",
      "0+2",
      "1",
      "1+1",
      "1+2",
      "2",
      "2+1"
    ]);
    expect(map.referenceToAlignment).toEqual([3, 6]);
    expect(map.alignmentToReferenceCoordinate[3]).toEqual({
      kind: "insertion",
      after: 1,
      offset: 1,
      label: "1+1"
    });
  });

  it("classifies canonical, ambiguous, gap, and unknown differences", () => {
    expect(classifyDifference("A", "A")).toBe("match");
    expect(classifyDifference("U", "T")).toBe("match");
    expect(classifyDifference("R", "A")).toBe("compatibleAmbiguity");
    expect(classifyDifference("R", "Y")).toBe("substitution");
    expect(classifyDifference("?", "A")).toBe("unknown");
    expect(classifyDifference("G", "-")).toBe("insertion");
    expect(classifyDifference("-", "A")).toBe("deletion");
    expect(classifyDifference("-", ".")).toBe("empty");
  });

  it("validates motif input instead of silently deleting invalid symbols", () => {
    expect(validateIupacMotif(" A U G ")).toMatchObject({
      valid: true,
      query: "ATG"
    });
    expect(validateIupacMotif("AX-G")).toMatchObject({
      valid: false,
      query: "AX-G",
      invalidCharacters: ["X", "-"]
    });
    expect(() =>
      searchIupacMotifMatches([{ id: "seq", sequence: "AAG" }], "AXG")
    ).toThrow(/Invalid IUPAC motif character/);
  });

  it("supports overlapping strict IUPAC motif matches with both coordinate systems", () => {
    const matches = findIupacMotifMatches(
      [{ id: "seq", rowKey: "source:1", sequence: "A-AGG" }],
      "AR"
    );
    expect(matches.map((match) => match.positions)).toEqual([
      [1, 3],
      [3, 4]
    ]);
    expect(matches[0]).toMatchObject({
      rowKey: "source:1",
      alignmentStart: 1,
      alignmentEnd: 3,
      sequenceStart: 1,
      sequenceEnd: 2,
      strand: "+"
    });
  });

  it("distinguishes strict and possible matching against target ambiguity", () => {
    const sequences = [{ id: "ambiguous", sequence: "R" }];
    expect(
      searchIupacMotifMatches(sequences, "A", { matchMode: "strict" }).totalCount
    ).toBe(0);
    expect(
      searchIupacMotifMatches(sequences, "A", { matchMode: "possible" }).totalCount
    ).toBe(1);
    expect(
      searchIupacMotifMatches(sequences, "R", { matchMode: "strict" }).totalCount
    ).toBe(1);
  });

  it("optionally searches the reverse-complement strand without duplicating palindromes", () => {
    const reverse = searchIupacMotifMatches(
      [{ id: "reverse", sequence: "A-GTC" }],
      "GAC",
      { strandMode: "both" }
    );
    expect(reverse.totalCount).toBe(1);
    expect(reverse.matches[0]).toMatchObject({
      positions: [3, 4, 5],
      sequenceStart: 2,
      sequenceEnd: 4,
      strand: "-"
    });

    const palindrome = searchIupacMotifMatches(
      [{ id: "palindrome", sequence: "ATAT" }],
      "AT",
      { strandMode: "both" }
    );
    expect(palindrome.totalCount).toBe(2);
  });

  it("counts all motif hits while bounding the stored navigation list", () => {
    const result = searchIupacMotifMatches(
      [{ id: "many", sequence: "AAAAAA" }],
      "A",
      3
    );

    expect(result.totalCount).toBe(6);
    expect(result.matches).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });

  it("uses one sequence scope and one canonical GC denominator for range statistics", () => {
    const allSequences = [
      { id: "ref", rowKey: "ref", sequence: "ACGTN" },
      { id: "alt", rowKey: "alt", sequence: "AG-TR" }
    ];
    const fullColumns = calculateColumnStats(allSequences, 5);
    const stats = calculateRangeStats({
      sequences: allSequences,
      columns: fullColumns,
      range: { start: 1, end: 5 },
      consensus: "ACGTN",
      reference: allSequences[0]
    });

    expect(stats?.gcFraction).toBeCloseTo(3 / 7);
    expect(stats).toMatchObject({
      sequenceCount: 2,
      mismatchCount: 1,
      substitutionCount: 1,
      compatibleAmbiguityCount: 1,
      transitionCount: 0,
      transversionCount: 1,
      deletionCount: 1,
      comparableCanonicalCount: 3
    });

    const visibleOnly = calculateRangeStats({
      sequences: [allSequences[0]],
      columns: fullColumns,
      range: { start: 1, end: 5 },
      consensus: "ACGTN"
    });
    expect(visibleOnly?.averageConservation).toBe(1);
    expect(visibleOnly?.sequenceCount).toBe(1);
  });

  it("recomputes range consensus when adapters do not provide one", () => {
    const sequences = [
      { id: "duplicate", rowKey: "reference", sequence: "A C" },
      { id: "duplicate", rowKey: "alternate", sequence: "a g" }
    ];
    const stats = calculateRangeStats({
      sequences,
      columns: [],
      range: { start: 1, end: 2 },
      consensusMode: "iupac",
      reference: sequences[0]
    });

    expect(stats).toMatchObject({
      consensusSegment: "AS",
      substitutionCount: 1,
      deletionCount: 0,
      comparableCanonicalCount: 2
    });
  });

  it("does not force ambiguous substitutions into transition/transversion", () => {
    const sequences = [
      { id: "ref", rowKey: "ref", sequence: "Y" },
      { id: "alt", rowKey: "alt", sequence: "R" }
    ];
    const stats = calculateRangeStats({
      sequences,
      columns: calculateColumnStats(sequences, 1),
      range: { start: 1, end: 1 },
      consensus: "N",
      reference: sequences[0]
    });

    expect(stats).toMatchObject({
      substitutionCount: 1,
      unclassifiedSubstitutionCount: 1,
      transitionCount: 0,
      transversionCount: 0,
      comparableCanonicalCount: 0
    });
  });
});
