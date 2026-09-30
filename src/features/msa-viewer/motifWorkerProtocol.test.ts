import { describe, expect, it } from "vitest";
import type { MSASequence } from "../../lib/types/msa";
import {
  MOTIF_WORKER_PROTOCOL_VERSION,
  MotifWorkerError,
  calculateMotifSearchPayload
} from "./motifWorkerProtocol";

function request(
  sequences: MSASequence[],
  query: string,
  overrides: Partial<Parameters<typeof calculateMotifSearchPayload>[0]> = {}
) {
  return {
    protocolVersion: MOTIF_WORKER_PROTOCOL_VERSION,
    type: "search" as const,
    requestId: 1,
    sourceFingerprint: "sha256:motif",
    sequences,
    query,
    matchMode: "strict" as const,
    strandMode: "forward" as const,
    maxMatches: 20_000,
    ...overrides
  };
}

describe("motif worker protocol v2", () => {
  it("rejects invalid characters instead of silently deleting them", () => {
    expect(() => calculateMotifSearchPayload(request([], "AXG")))
      .toThrowError(MotifWorkerError);
    try {
      calculateMotifSearchPayload(request([], "A-G"));
    } catch (error) {
      expect((error as MotifWorkerError).code).toBe("MOTIF_INVALID");
      expect((error as MotifWorkerError).invalidCharacters).toEqual(["-"]);
    }
  });

  it("preserves exact global and per-row totals when stored hits are truncated", () => {
    const rows: MSASequence[] = [
      { id: "duplicate", rowKey: "row:a", sequence: "AAAA" },
      { id: "duplicate", rowKey: "row:b", sequence: "AAA" }
    ];
    const result = calculateMotifSearchPayload(request(rows, "AA", {
      maxMatches: 2
    }));

    expect(result.matches).toHaveLength(2);
    expect(result.totalCount).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.rowTotals).toEqual([
      { rowKey: "row:a", totalCount: 3 },
      { rowKey: "row:b", totalCount: 2 }
    ]);
    expect(result.matches.every((match) => match.rowKey === "row:a")).toBe(true);
  });

  it("supports possible IUPAC matching and reverse-complement strand results", () => {
    const result = calculateMotifSearchPayload(request([
      { id: "row", rowKey: "row", sequence: "CT" }
    ], "AR", {
      matchMode: "possible",
      strandMode: "both"
    }));

    expect(result.totalCount).toBe(1);
    expect(result.matches[0]).toEqual(expect.objectContaining({
      rowKey: "row",
      strand: "-",
      alignmentStart: 1,
      alignmentEnd: 2,
      sequenceStart: 1,
      sequenceEnd: 2
    }));
  });
});
