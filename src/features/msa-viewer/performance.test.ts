import { describe, expect, it } from "vitest";
import { calculateColumnStats } from "./analysis";
import { getMsaViewSettings } from "./MsaViewerRoot";

describe("large MSA performance guard", () => {
  it(
    "analyzes a 500 x 10,000 alignment and selects Canvas overview settings",
    () => {
      const sequence = "ACGT".repeat(2_500);
      const sequences = Array.from({ length: 500 }, (_, index) => ({
        sequence:
          index % 20 === 0
            ? `${index % 40 === 0 ? "T" : "C"}${sequence.slice(1)}`
            : sequence
      }));
      const started = performance.now();
      const columns = calculateColumnStats(sequences, 10_000);
      const elapsed = performance.now() - started;
      const overviewSettings = getMsaViewSettings(0.5, "compact");

      expect(columns).toHaveLength(10_000);
      expect(columns[0].variation).toBeGreaterThan(0);
      expect(columns[9_999].coverage).toBe(1);
      expect(elapsed).toBeLessThan(10_000);
      expect(overviewSettings.showCharacters).toBe(false);
      expect(overviewSettings.cellWidth).toBeLessThan(10);
    },
    15_000
  );
});
