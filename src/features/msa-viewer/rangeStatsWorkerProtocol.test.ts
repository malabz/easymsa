import { describe, expect, it } from "vitest";
import type { MSASequence } from "../../lib/types/msa";
import {
  MSA_RANGE_STATS_PROTOCOL_VERSION,
  MsaRangeStatsError,
  calculateMsaRangeStatsTask
} from "./rangeStatsWorkerProtocol";

const ROWS: MSASequence[] = [
  { id: "reference", rowKey: "reference", sequence: "A-CG" },
  { id: "sample", rowKey: "sample", sequence: "AGTG" }
];

function request(overrides: Partial<Parameters<typeof calculateMsaRangeStatsTask>[0]> = {}) {
  return {
    protocolVersion: MSA_RANGE_STATS_PROTOCOL_VERSION,
    type: "calculate" as const,
    requestId: 1,
    sourceFingerprint: "sha256:range",
    scopeRowKeys: ["reference", "sample"],
    sequences: ROWS,
    range: { start: 1, end: 4 },
    consensusMode: "majority" as const,
    reference: ROWS[0],
    alphabet: "dna" as const,
    ...overrides
  };
}

describe("range statistics worker task", () => {
  it("calculates range composition and reference differences off-thread", () => {
    const result = calculateMsaRangeStatsTask(request());

    expect(result).toEqual(expect.objectContaining({
      length: 4,
      sequenceCount: 2,
      consensusSegment: "AGCG",
      insertionCount: 1,
      substitutionCount: 1,
      transitionCount: 1,
      transversionCount: 0
    }));
  });

  it("returns a stable invalid-range code", () => {
    try {
      calculateMsaRangeStatsTask(request({ range: { start: 5, end: 2 } }));
      throw new Error("Expected invalid range");
    } catch (error) {
      expect(error).toBeInstanceOf(MsaRangeStatsError);
      expect((error as MsaRangeStatsError).code).toBe(
        "RANGE_STATS_INVALID_RANGE"
      );
    }
  });
});
