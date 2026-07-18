import { fireEvent, render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaInspector } from "./MsaInspector";

const content = {
  alignmentPosition: 2,
  base: "T",
  columnStats: {
    position: 2,
    conservation: 0.75,
    gapFraction: 0,
    coverage: 1,
    entropy: 0.4,
    variation: 0.25,
    dominantBase: "T",
    consensusBase: "T",
    ambiguityConsensus: "Y"
  },
  columnSummary: "T:3 C:1",
  range: { start: 2, end: 4 },
  rangeStats: {
    length: 3,
    averageConservation: 0.8,
    averageGapFraction: 0,
    averageCoverage: 1,
    averageEntropy: 0.2,
    variableColumns: 1,
    gcFraction: 0.5,
    baseCounts: { A: 2, C: 2, G: 2, T: 2 },
    consensusSegment: "TCG",
    mismatchCount: 1,
    insertionCount: 0,
    deletionCount: 0,
    transitionCount: 1,
    transversionCount: 0
  },
  reference: { id: "reference", sequence: "A-CG" },
  referencePosition: 1,
  selection: { sequenceId: "sample", position: 2 }
};

describe("MsaInspector accessibility", () => {
  it("has no automated accessibility violations in the inspector content", async () => {
    const { container } = render(
      <LanguageProvider>
        <MsaInspector {...content} mobileOpen={false} onClose={() => {}} />
      </LanguageProvider>
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } }
    });
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  it("closes the mobile drawer with Escape", () => {
    const onClose = vi.fn();
    render(
      <LanguageProvider>
        <MsaInspector {...content} mobileOpen onClose={onClose} />
      </LanguageProvider>
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
