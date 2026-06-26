import { describe, expect, it } from "vitest";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import type { MsaExportOptions, MsaExportViewerState } from "./exportTypes";

const alignment: MSAResult = {
  jobId: "test",
  truncated: false,
  sequences: [
    { id: "seq1", sequence: "ACGTACGT" },
    { id: "seq2", sequence: "AC-TACGA" },
    { id: "hidden", sequence: "TTTTTTTT" }
  ],
  consensus: "ACGTACGT",
  alignmentLength: 8
};

const baseOptions: MsaExportOptions = {
  format: "svg",
  region: "full",
  layoutMode: "single-line",
  includeSequenceNames: true,
  includeCoordinates: true,
  includeConsensus: true,
  includeConservation: true,
  includeLegend: false,
  includeAnnotations: false,
  scale: 2,
  backgroundColor: "#ffffff",
  transparentBackground: false,
  filename: "test",
  wrapColumnCount: 4,
  maxCanvasPixels: 80_000_000
};

function state(overrides: Partial<MsaExportViewerState> = {}): MsaExportViewerState {
  return {
    sequences: alignment.sequences.slice(0, 2),
    visiblePositions: [1, 2, 3, 4, 5, 6, 7, 8],
    conservationColumns: Array.from({ length: 8 }, (_, index) => ({
      position: index + 1,
      conservation: index === 2 ? 0.5 : 1,
      gapFraction: index === 2 ? 0.5 : 0,
      dominantBase: "A"
    })),
    colorScheme: "nucleotide",
    selectedRange: { start: 3, end: 5 },
    viewSettings: {
      cellWidth: 20,
      cellHeight: 24,
      rowHeight: 36,
      fontSize: 11,
      labelWidth: 192,
      markerEvery: 10,
      showCharacters: true,
      cellGap: 2
    },
    viewport: {
      scrollLeft: 192 + 24 + 44,
      scrollTop: 72,
      clientWidth: 320,
      clientHeight: 160
    },
    alignmentLength: 8,
    ...overrides
  };
}

describe("calculateExportLayout", () => {
  it("exports current visible rows and columns for the visible viewport", () => {
    const longAlignment: MSAResult = {
      ...alignment,
      sequences: [
        { id: "seq1", sequence: "A".repeat(120) },
        { id: "seq2", sequence: "C".repeat(120) }
      ],
      consensus: "A".repeat(120),
      alignmentLength: 120
    };
    const longState = state({
      sequences: longAlignment.sequences,
      visiblePositions: Array.from({ length: 120 }, (_, index) => index + 1),
      conservationColumns: Array.from({ length: 120 }, (_, index) => ({
        position: index + 1,
        conservation: 1,
        gapFraction: 0,
        dominantBase: "A"
      })),
      alignmentLength: 120
    });
    const layout = calculateExportLayout(longAlignment, longState, {
      ...baseOptions,
      region: "visible"
    });

    expect(layout.rows.map((row) => row.id)).toEqual(["seq1", "seq2"]);
    expect(layout.columns.map((column) => column.position)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("exports filtered state rows and columns for full alignment", () => {
    const layout = calculateExportLayout(
      alignment,
      state({
        sequences: [alignment.sequences[1]],
        visiblePositions: [2, 4, 6, 8]
      }),
      baseOptions
    );

    expect(layout.rows.map((row) => row.id)).toEqual(["seq2"]);
    expect(layout.columns.map((column) => column.position)).toEqual([2, 4, 6, 8]);
  });

  it("exports selected columns plus current visible rows for selection", () => {
    const layout = calculateExportLayout(alignment, state(), {
      ...baseOptions,
      region: "selection"
    });

    expect(layout.rows).toHaveLength(2);
    expect(layout.columns.map((column) => column.position)).toEqual([3, 4, 5]);
  });

  it("wraps long alignments into multiple blocks", () => {
    const layout = calculateExportLayout(alignment, state(), {
      ...baseOptions,
      layoutMode: "wrapped",
      wrapColumnCount: 3
    });

    expect(layout.blocks).toHaveLength(3);
    expect(layout.blocks.map((block) => block.columns.length)).toEqual([3, 3, 2]);
  });

  it("applies PNG scale and reports pixel-limit violations", () => {
    const layout = calculateExportLayout(alignment, state(), {
      ...baseOptions,
      format: "png",
      scale: 3,
      maxCanvasPixels: 1000
    });

    expect(layout.canvasWidth).toBe(layout.width * 3);
    expect(layout.canvasHeight).toBe(layout.height * 3);
    expect(layout.exceedsCanvasLimit).toBe(true);
    expect(layout.limitReason).toContain("above");
  });
});
