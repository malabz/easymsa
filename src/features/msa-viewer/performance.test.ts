import { describe, expect, it } from "vitest";
import { getMsaViewSettings } from "./MsaViewerRoot";
import {
  columnMetricAtIndex,
  columnStatsStoreByteLength
} from "./columnStatsStore";
import {
  calculateMsaAnalysisPayloadV4,
  MSA_ANALYSIS_PROTOCOL_VERSION
} from "./workerProtocol";

describe("large MSA structural performance guard", () => {
  it(
    "analyzes a 500 x 10,000 alignment and selects Canvas overview settings",
    () => {
      const bases = "ACGT";
      const sequences = Array.from({ length: 500 }, (_, index) => ({
        id: `sequence-${index + 1}`,
        rowKey: `row-${index + 1}`,
        originalIndex: index,
        // Encode the row index in the prefix and generate the remaining bases
        // per row. This prevents a shared-string fixture from understating the
        // memory and structured-clone cost of a real 500-row alignment.
        sequence: Array.from({ length: 10_000 }, (_unused, position) =>
          position < 5
            ? bases[Math.floor(index / (4 ** position)) % 4]
            : bases[(position + index * ((position % 7) + 1)) % 4]
        ).join("")
      }));
      const analysis = calculateMsaAnalysisPayloadV4({
        protocolVersion: MSA_ANALYSIS_PROTOCOL_VERSION,
        type: "analyze",
        generation: 1,
        requestId: 1,
        sourceFingerprint: "performance-fixture",
        scope: "all",
        scopeRowKeys: sequences.map((row) => row.rowKey),
        sequences,
        alignmentLength: 10_000,
        alphabet: "dna",
        overviewBinCount: 512
      });
      const overviewSettings = getMsaViewSettings(0.5, "compact");

      expect(analysis).not.toHaveProperty("columns");
      expect(analysis.columnStore.length).toBe(10_000);
      expect(analysis.rowQc).toHaveLength(500);
      expect(analysis.overviewBins).toHaveLength(512);
      expect(columnMetricAtIndex(analysis.columnStore, 0, "conservation")).toBeLessThan(1);
      expect(columnMetricAtIndex(analysis.columnStore, 9_999, "coverage")).toBe(1);
      expect(columnStatsStoreByteLength(analysis.columnStore)).toBe(530_000);
      expect(overviewSettings.showCharacters).toBe(false);
      expect(overviewSettings.cellWidth).toBeLessThan(10);
    },
    10_000
  );
});
