import { describe, expect, it } from "vitest";
import type { MSASequence } from "../../lib/types/msa";
import {
  MSA_ANALYSIS_PROTOCOL_VERSION,
  MsaAnalysisWorkerError,
  calculateMsaAnalysisPayloadV4
} from "./workerProtocol";
import {
  columnStatsAtPosition,
  columnStatsStoreTransferables
} from "./columnStatsStore";

function request(
  sequences: MSASequence[],
  overrides: Partial<Parameters<typeof calculateMsaAnalysisPayloadV4>[0]> = {}
) {
  return {
    protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
    type: "analyze" as const,
    generation: 1,
    requestId: 2,
    sourceFingerprint: "sha256:test",
    scope: "all" as const,
    scopeRowKeys: sequences.map((row) => row.rowKey ?? "missing"),
    sequences,
    alignmentLength: sequences[0]?.sequence.length ?? 0,
    alphabet: "dna" as const,
    ...overrides
  };
}

describe("MSA analysis worker protocol v4", () => {
  it("returns a compact store, both consensus modes, overview bins, and row QC together", () => {
    const sequences: MSASequence[] = [
      { id: "duplicate", rowKey: "row:1", originalIndex: 0, sequence: "ACGT" },
      { id: "duplicate", rowKey: "row:2", originalIndex: 1, sequence: "AGGT" }
    ];
    const result = calculateMsaAnalysisPayloadV4(request(sequences, {
      referenceRowKey: "row:1",
      overviewBinCount: 2
    }));

    expect(result.semanticsVersion).toBe("nucleotide-v2");
    expect(result.sourceFingerprint).toBe("sha256:test");
    expect(result.scopeRowKeys).toEqual(["row:1", "row:2"]);
    expect(result.columnStoreVersion).toBe(2);
    expect(result.columnStore.length).toBe(4);
    expect(result).not.toHaveProperty("columns");
    expect(result.columnStore.canonicalCounts).toBeInstanceOf(Uint32Array);
    expect(result.columnStore.entropyBits).toBeInstanceOf(Float64Array);
    expect(result.columnStore.flags).toBeInstanceOf(Uint8Array);
    expect(result.consensus.majority).toBe("ACGT");
    expect(result.consensus.iupac).toBe("ASGT");
    expect(result.overviewBins).toEqual([
      expect.objectContaining({ start: 1, end: 2 }),
      expect.objectContaining({ start: 3, end: 4 })
    ]);
    expect(result.rowQc[1]).toEqual(expect.objectContaining({
      rowKey: "row:2",
      nonGapLength: 4,
      gapFraction: 0,
      gcFraction: 0.5,
      reference: expect.objectContaining({
        comparisonTarget: "reference",
        comparisonRowKey: "row:1",
        validComparisonCount: 4,
        substitutionCount: 1,
        transitionCount: 0,
        transversionCount: 1,
        identity: 0.75
      })
    }));
  });

  it("keeps ambiguity compatible and outside Ti/Tv", () => {
    const sequences: MSASequence[] = [
      { id: "ref", rowKey: "ref", sequence: "A" },
      { id: "ambiguous", rowKey: "amb", sequence: "R" }
    ];
    const result = calculateMsaAnalysisPayloadV4(request(sequences, {
      referenceRowKey: "ref"
    }));
    expect(result.rowQc[1].reference).toEqual(expect.objectContaining({
      compatibleAmbiguityCount: 1,
      substitutionCount: 0,
      transitionCount: 0,
      transversionCount: 0
    }));
  });

  it("uses a reference supplied outside the current analysis scope", () => {
    const scoped: MSASequence[] = [
      { id: "visible", rowKey: "visible", sequence: "G" }
    ];
    const externalReference: MSASequence = {
      id: "hidden-reference",
      rowKey: "reference",
      sequence: "A"
    };
    const result = calculateMsaAnalysisPayloadV4(request(scoped, {
      scope: "visible",
      scopeRowKeys: ["visible"],
      referenceRowKey: "reference",
      referenceSequence: externalReference
    }));

    expect(result.consensus.majority).toBe("G");
    expect(result.rowQc[0].reference).toEqual(expect.objectContaining({
      comparisonTarget: "reference",
      comparisonRowKey: "reference",
      substitutionCount: 1,
      transitionCount: 1
    }));
  });

  it("excludes all-gap consensus placeholders from descriptive row differences", () => {
    const sequences: MSASequence[] = [
      { id: "one", rowKey: "one", sequence: "A-" },
      { id: "two", rowKey: "two", sequence: "A-" }
    ];
    const result = calculateMsaAnalysisPayloadV4(request(sequences));

    expect(result.consensus.majority).toBe("AN");
    expect(result.rowQc[0].reference).toEqual(expect.objectContaining({
      comparisonTarget: "scope-consensus",
      validComparisonCount: 1,
      matchCount: 1,
      deletionCount: 0,
      identity: 1
    }));
  });

  it.each([
    {
      name: "neutral alphabet",
      sequences: [{ id: "protein", rowKey: "p", sequence: "EF" }],
      overrides: { alphabet: "protein" as const, alignmentLength: 2 },
      code: "ANALYSIS_DISABLED_NEUTRAL"
    },
    {
      name: "unequal rows",
      sequences: [
        { id: "one", rowKey: "1", sequence: "AC" },
        { id: "two", rowKey: "2", sequence: "A" }
      ],
      overrides: { alignmentLength: 2 },
      code: "RAW_UNEQUAL_ALIGNMENT"
    },
    {
      name: "illegal symbol",
      sequences: [{ id: "bad", rowKey: "bad", sequence: "AX" }],
      overrides: { alignmentLength: 2 },
      code: "INVALID_ALIGNMENT_SYMBOL"
    }
  ])("returns a stable code for $name", ({ sequences, overrides, code }) => {
    try {
      calculateMsaAnalysisPayloadV4(request(sequences, overrides));
      throw new Error("Expected analysis to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(MsaAnalysisWorkerError);
      expect((error as MsaAnalysisWorkerError).code).toBe(code);
    }
  });

  it("transfers each store buffer once and detaches the sender buffers", () => {
    const result = calculateMsaAnalysisPayloadV4(request([
      { id: "one", rowKey: "one", sequence: "ACGT" },
      { id: "two", rowKey: "two", sequence: "AGGT" }
    ]));
    const transferables = columnStatsStoreTransferables(result.columnStore);
    expect(new Set(transferables).size).toBe(transferables.length);
    const cloned = structuredClone(result, { transfer: transferables });
    expect(result.columnStore.canonicalCounts.byteLength).toBe(0);
    expect(result.columnStore.entropyBits.byteLength).toBe(0);
    expect(columnStatsAtPosition(cloned.columnStore, 2)).toEqual(
      expect.objectContaining({ position: 2, conservation: 0.5 })
    );
  });
});
