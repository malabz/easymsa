import { describe, expect, it } from "vitest";
import {
  buildReferenceCoordinateMap,
  calculateColumnStats,
  calculateRangeStats,
  classifyDifference,
  findIupacMotifMatches,
  searchIupacMotifMatches
} from "./analysis";

describe("MSA viewer analysis", () => {
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
