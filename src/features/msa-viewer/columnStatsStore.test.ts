import { describe, expect, it } from "vitest";
import { calculateMsaAnalysis, calculateMsaAnalysisStore } from "./analysis";
import {
  assertColumnStatsStore,
  columnMetricAtIndex,
  columnStatsAtPosition,
  columnStatsStoreByteLength,
  columnStatsStoreTransferables,
  filteredColumnPositionView,
  identityColumnPositionView,
  materializeAllColumnStats,
  materializeColumnStatsForPositions,
  materializePositionArray,
  positionAt,
  visibleIndexOfPosition
} from "./columnStatsStore";

describe("ColumnStatsStoreV1", () => {
  it("materializes nucleotide-v2 sufficient statistics without leaking NaN", () => {
    const result = calculateMsaAnalysisStore([
      { sequence: "AA-ARN" },
      { sequence: "AC-CYN" },
      { sequence: "AG-GRN" },
      { sequence: "AT-TYN" }
    ], 6, { alphabet: "dna" });

    assertColumnStatsStore(result.columnStore);
    const columns = materializeAllColumnStats(result.columnStore);
    expect(columns[0]).toMatchObject({
      conservation: 1,
      entropyBits: 0,
      normalizedEntropy: 0,
      gcFraction: 0,
      majorityTie: false
    });
    expect(columns[1]).toMatchObject({
      conservation: 0.25,
      entropyBits: 2,
      normalizedEntropy: 1,
      gcFraction: 0.5,
      majorityTie: true,
      ambiguityConsensus: "N"
    });
    expect(columns[2]).toMatchObject({
      conservation: null,
      entropyBits: null,
      normalizedEntropy: null,
      gcFraction: null,
      gapFraction: 1,
      consensusBase: "N"
    });
    expect(columns[4]).toMatchObject({
      canonicalCount: 0,
      ambiguityCount: 4,
      variation: 0,
      conservation: null
    });
    expect(JSON.stringify(columns)).not.toContain("NaN");
  });

  it("keeps the legacy object API exactly equal to store materialization", () => {
    let seed = 0x5eed1234;
    const symbols = "ACGTURYSWKMBDHVN-";
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    };
    const sequences = Array.from({ length: 17 }, () => ({
      sequence: Array.from({ length: 73 }, () => symbols[next() % symbols.length]).join("")
    }));
    const legacy = calculateMsaAnalysis(sequences, 73, { alphabet: "nucleotide" });
    const compact = calculateMsaAnalysisStore(sequences, 73, {
      alphabet: "nucleotide"
    });

    expect(materializeAllColumnStats(compact.columnStore)).toEqual(legacy.columns);
    expect(compact.overview).toEqual(legacy.overview);
    expect(materializeColumnStatsForPositions(compact.columnStore, [2, 5, 9]))
      .toEqual([legacy.columns[1], legacy.columns[4], legacy.columns[8]]);
  });

  it("provides scalar hot-path access and a compact transferable payload", () => {
    const { columnStore } = calculateMsaAnalysisStore([
      { sequence: "ACGT" },
      { sequence: "AGGT" }
    ], 4, { alphabet: "dna" });

    expect(columnStatsAtPosition(columnStore, 2)?.dominantBase).toBe("C");
    expect(columnMetricAtIndex(columnStore, 1, "conservation")).toBe(0.5);
    expect(columnMetricAtIndex(columnStore, 1, "coverage")).toBe(1);
    expect(columnMetricAtIndex(columnStore, 99, "gap")).toBeNull();
    expect(columnStatsStoreTransferables(columnStore)).toHaveLength(8);
    expect(columnStatsStoreByteLength(columnStore)).toBeLessThan(256);

    const transferables = columnStatsStoreTransferables(columnStore);
    const clone = structuredClone(columnStore, { transfer: transferables });
    assertColumnStatsStore(clone);
    expect(clone.canonicalCounts[0]).toBe(2);
    expect(columnStore.canonicalCounts.byteLength).toBe(0);
  });

  it("uses implicit identity positions and binary-searches filtered positions", () => {
    const identity = identityColumnPositionView(10_000);
    expect(positionAt(identity, 0)).toBe(1);
    expect(positionAt(identity, 9_999)).toBe(10_000);
    expect(visibleIndexOfPosition(identity, 5_000)).toBe(4_999);

    const filtered = filteredColumnPositionView([9, 2, 5, 5]);
    expect(materializePositionArray(filtered)).toEqual([2, 5, 9]);
    expect(visibleIndexOfPosition(filtered, 5)).toBe(1);
    expect(visibleIndexOfPosition(filtered, 8)).toBe(-1);
    expect(positionAt(filtered, 2)).toBe(9);
  });
});
