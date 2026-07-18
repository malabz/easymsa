import { describe, expect, it } from "vitest";
import {
  buildReferenceCoordinateMap,
  calculateColumnStats,
  calculateMsaAnalysis,
  calculateRangeStats,
  classifyDifference,
  findIupacMotifMatches,
  searchIupacMotifMatches
} from "./analysis";

describe("MSA viewer analysis", () => {
  it("aggregates DNA/RNA composition and overview quality in one pass", () => {
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
    expect(analysis.overview.variableColumns).toBe(2);
    expect(analysis.overview.highGapColumns).toBe(3);
  });

  it("keeps GC unavailable for an all-gap alignment", () => {
    const overview = calculateMsaAnalysis(
      [{ sequence: "--" }, { sequence: "--" }],
      2
    ).overview;

    expect(overview.gcFraction).toBeNull();
    expect(overview.averageCoverage).toBe(0);
    expect(overview.variableColumns).toBe(0);
    expect(overview.highGapColumns).toBe(2);
  });

  it("uses deterministic and IUPAC consensus for ties", () => {
    const columns = calculateColumnStats(
      [{ sequence: "A" }, { sequence: "G" }, { sequence: "-" }],
      1
    );
    expect(columns[0].consensusBase).toBe("A");
    expect(columns[0].ambiguityConsensus).toBe("R");
    expect(columns[0].coverage).toBeCloseTo(2 / 3);
    expect(columns[0].entropy).toBeCloseTo(0.5);
  });

  it("maps alignment coordinates to ungapped reference coordinates", () => {
    const map = buildReferenceCoordinateMap("A-CG-");
    expect(map.alignmentToReference).toEqual([1, null, 2, 3, null]);
    expect(map.referenceToAlignment).toEqual([1, 3, 4]);
    expect(map.referenceLength).toBe(3);
  });

  it("classifies substitutions, insertions, and deletions", () => {
    expect(classifyDifference("A", "A")).toBe("match");
    expect(classifyDifference("G", "A")).toBe("mismatch");
    expect(classifyDifference("G", "-")).toBe("insertion");
    expect(classifyDifference("-", "A")).toBe("deletion");
  });

  it("supports overlapping IUPAC motif matches", () => {
    const matches = findIupacMotifMatches(
      [{ id: "seq", sequence: "A-AGG" }],
      "AR"
    );
    expect(matches.map((match) => match.positions)).toEqual([
      [1, 3],
      [3, 4]
    ]);
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

  it("calculates DNA range and reference difference statistics", () => {
    const sequences = [
      { id: "ref", sequence: "ACGT" },
      { id: "alt", sequence: "AG-T" }
    ];
    const columns = calculateColumnStats(sequences, 4);
    const stats = calculateRangeStats({
      sequences,
      columns,
      range: { start: 1, end: 4 },
      consensus: "ACGT",
      reference: sequences[0]
    });
    expect(stats?.gcFraction).toBeCloseTo(3 / 7);
    expect(stats?.mismatchCount).toBe(1);
    expect(stats?.transitionCount).toBe(0);
    expect(stats?.transversionCount).toBe(1);
    expect(stats?.deletionCount).toBe(1);
  });
});
