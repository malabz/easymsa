import { describe, expect, it } from "vitest";
import type { MSAResult } from "../../lib/types/msa";
import {
  calculateExportLayout,
  calculateExportPreflight,
  paginateMsaExportLayout,
  MAX_SAFE_CANVAS_DIMENSION,
  MAX_SAFE_CANVAS_PIXELS,
  MAX_SAFE_SVG_CELLS,
  MAX_SAFE_SVG_ESTIMATED_BYTES
} from "./exportLayout";
import type {
  MsaExportOptions,
  MsaExportViewerState,
  SupportedExportRegion
} from "./exportTypes";

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

const baseOptions: MsaExportOptions<SupportedExportRegion> = {
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
  it("clips even a small alignment to the scrolled viewport", () => {
    const layout=calculateExportLayout(alignment,state({
      viewport:{scrollLeft:44,scrollTop:36,clientWidth:250,clientHeight:180},
      frozenHeaderHeight:152
    }),{...baseOptions,region:"viewport"});
    expect(layout.blocks[0].columns[0].position).toBe(3);
    expect(layout.rows.map(row=>row.id)).toEqual(['seq2']);
    const withoutNames=calculateExportLayout(alignment,state({
      viewport:{scrollLeft:44,scrollTop:36,clientWidth:250,clientHeight:180},
      frozenHeaderHeight:152
    }),{...baseOptions,region:"viewport",includeSequenceNames:false});
    expect(withoutNames.columns).toEqual(layout.columns);
  });
  it("rejects oversized geometry without reading scientific column data", () => {
    const guardedState = state({
      alignmentLength: 10_000,
      visiblePositions: Array.from({ length: 10_000 }, (_, index) => index + 1)
    });
    Object.defineProperty(guardedState, "columnStore", {
      configurable: true,
      get() {
        throw new Error("column statistics must not be read during preflight");
      }
    });

    const preflight = calculateExportPreflight(alignment, guardedState, {
      ...baseOptions,
      format: "svg",
      region: "fullAlignment",
      maxSvgCells: 10
    });

    expect(preflight.exportLimitExceeded).toBe(true);
    expect(preflight.exportLimitKind).toBe("svg-cells");
    expect(preflight.columnCount).toBe(10_000);
  });
  it("automatically wraps to the target content width", () => {
    const longState = state({
      alignmentLength: 100,
      visiblePositions: Array.from({ length: 100 }, (_, index) => index + 1)
    });
    const preflight = calculateExportPreflight(alignment, longState, {
      ...baseOptions,
      region: "fullAlignment",
      layoutMode: "wrapped",
      wrapMode: "auto-wrap",
      targetContentWidth: 640
    });

    expect(preflight.columnCount).toBe(100);
    expect(preflight.blockCount).toBeGreaterThan(1);
    expect(preflight.width).toBeLessThanOrEqual(640);
  });

  it("reduces the presentation preset to the largest safe half-step scale", () => {
    const preflight = calculateExportPreflight(alignment, state(), {
      ...baseOptions,
      format: "png",
      preset: "presentation-png",
      scale: 3,
      maxCanvasPixels: 200_000
    });

    expect(preflight.requestedScale).toBe(3);
    expect(preflight.resolvedScale).toBeLessThan(3);
    expect(preflight.resolvedScale * 2).toBe(Math.floor(preflight.resolvedScale * 2));
    expect(preflight.scaleAdjusted).toBe(true);
    expect(preflight.exportLimitExceeded).toBe(false);
  });

  it("paginates wrapped PNG bundles without losing or repeating columns", () => {
    const pageAlignment: MSAResult = {
      ...alignment,
      sequences: alignment.sequences.map((row) => ({
        ...row,
        sequence: row.sequence.repeat(13).slice(0, 100)
      })),
      alignmentLength: 100
    };
    const pageState = state({
      sequences: pageAlignment.sequences,
      alignmentLength: 100,
      visiblePositions: Array.from({ length: 100 }, (_, index) => index + 1)
    });
    const pageOptions = {
      ...baseOptions,
      format: "png" as const,
      region: "fullAlignment" as const,
      layoutMode: "wrapped" as const,
      wrapMode: "fixed-wrap" as const,
      wrapColumnCount: 10,
      bundleMode: "qc-bundle" as const,
      maxCanvasDimension: 1_000,
      maxCanvasPixels: 1_000_000
    };
    const preflight = calculateExportPreflight(pageAlignment, pageState, pageOptions);
    const layout = calculateExportLayout(pageAlignment, pageState, pageOptions);
    const pages = paginateMsaExportLayout(layout, preflight);

    expect(preflight.requiresPagination).toBe(true);
    expect(preflight.exportLimitExceeded).toBe(false);
    expect(pages).toHaveLength(preflight.pageCount);
    expect(pages.flatMap((page) => page.columns.map((column) => column.position)))
      .toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(pages.every((page) => page.canvasHeight <= 1_000)).toBe(true);
  });
  it("exports current visible rows and columns for the canonical viewport", () => {
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
      region: "viewport"
    });

    expect(layout.canonicalRegion).toBe("viewport");
    expect(layout.rows.map((row) => row.id)).toEqual(["seq2"]);
    expect(layout.columns.map((column) => column.position)).toEqual([12, 13, 14, 15, 16, 17]);
  });

  it("exports filtered rows and columns for filteredView", () => {
    const layout = calculateExportLayout(
      alignment,
      state({
        sequences: [alignment.sequences[1]],
        visiblePositions: [2, 4, 6, 8]
      }),
      { ...baseOptions, region: "filteredView" }
    );

    expect(layout.canonicalRegion).toBe("filteredView");
    expect(layout.rows.map((row) => row.id)).toEqual(["seq2"]);
    expect(layout.columns.map((column) => column.position)).toEqual([2, 4, 6, 8]);
  });

  it("exports every column in selectedInterval plus current filtered rows", () => {
    const layout = calculateExportLayout(alignment, state({
      visiblePositions: [1, 3, 5, 7]
    }), {
      ...baseOptions,
      region: "selectedInterval"
    });

    expect(layout.canonicalRegion).toBe("selectedInterval");
    expect(layout.rows).toHaveLength(2);
    expect(layout.columns.map((column) => column.position)).toEqual([3, 4, 5]);
  });

  it("exports all source rows and positions for fullAlignment", () => {
    const layout = calculateExportLayout(
      alignment,
      state({
        sequences: [alignment.sequences[1]],
        visiblePositions: [2, 4, 6, 8]
      }),
      { ...baseOptions, region: "fullAlignment" }
    );

    expect(layout.canonicalRegion).toBe("fullAlignment");
    expect(layout.rows.map((row) => row.id)).toEqual(["seq1", "seq2", "hidden"]);
    expect(layout.columns.map((column) => column.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8
    ]);
  });

  it("keeps legacy region values compatible with their original behavior", () => {
    const filteredState = state({
      sequences: [alignment.sequences[1]],
      visiblePositions: [2, 4, 6, 8]
    });
    const visible = calculateExportLayout(alignment, filteredState, {
      ...baseOptions,
      region: "visible"
    });
    const full = calculateExportLayout(alignment, filteredState, baseOptions);
    const selection = calculateExportLayout(alignment, filteredState, {
      ...baseOptions,
      region: "selection"
    });

    expect(visible.canonicalRegion).toBe("viewport");
    expect(full.canonicalRegion).toBe("filteredView");
    expect(full.rows.map((row) => row.id)).toEqual(["seq2"]);
    expect(full.columns.map((column) => column.position)).toEqual([2, 4, 6, 8]);
    expect(selection.canonicalRegion).toBe("selectedInterval");
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
    expect(layout.exportLimitKind).toBe("png-pixels");
    expect(layout.limitReason).toContain("above");
  });

  it("hard-caps PNG exports at 32 MP even when callers request more", () => {
    const sequences = Array.from({ length: 120 }, (_, index) => ({
      id: `seq-${index + 1}`,
      sequence: "A".repeat(400)
    }));
    const largeAlignment: MSAResult = {
      ...alignment,
      sequences,
      consensus: "A".repeat(400),
      alignmentLength: 400
    };
    const layout = calculateExportLayout(
      largeAlignment,
      state({
        sequences,
        visiblePositions: Array.from({ length: 400 }, (_, index) => index + 1),
        conservationColumns: [],
        alignmentLength: 400
      }),
      {
        ...baseOptions,
        format: "png",
        region: "fullAlignment",
        scale: 1,
        maxCanvasPixels: 999_000_000,
        maxCanvasDimension: 999_000
      }
    );

    expect(layout.canvasPixels).toBeGreaterThan(MAX_SAFE_CANVAS_PIXELS);
    expect(layout.canvasWidth).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(layout.canvasHeight).toBeLessThanOrEqual(MAX_SAFE_CANVAS_DIMENSION);
    expect(layout.effectiveCanvasPixelLimit).toBe(MAX_SAFE_CANVAS_PIXELS);
    expect(layout.effectiveCanvasDimensionLimit).toBe(MAX_SAFE_CANVAS_DIMENSION);
    expect(layout.exportLimitKind).toBe("png-pixels");
  });

  it("hard-caps each PNG canvas dimension at 16,384 px", () => {
    const layout = calculateExportLayout(
      alignment,
      state({
        viewSettings: {
          ...state().viewSettings,
          cellWidth: 20_000
        }
      }),
      {
        ...baseOptions,
        format: "png",
        scale: 1,
        maxCanvasPixels: 999_000_000,
        maxCanvasDimension: 999_000
      }
    );

    expect(layout.canvasWidth).toBeGreaterThan(MAX_SAFE_CANVAS_DIMENSION);
    expect(layout.exportLimitKind).toBe("png-dimension");
  });

  it("hard-caps SVG exports at 200,000 rendered cells", () => {
    const sequences = Array.from({ length: 450 }, (_, index) => ({
      id: `seq-${index + 1}`,
      sequence: "A".repeat(450)
    }));
    const largeAlignment: MSAResult = {
      ...alignment,
      sequences,
      consensus: "A".repeat(450),
      alignmentLength: 450
    };
    const layout = calculateExportLayout(
      largeAlignment,
      state({
        sequences,
        visiblePositions: Array.from({ length: 450 }, (_, index) => index + 1),
        conservationColumns: [],
        alignmentLength: 450
      }),
      {
        ...baseOptions,
        region: "fullAlignment",
        maxSvgCells: 999_000,
        maxSvgEstimatedBytes: 999_000_000
      }
    );

    expect(layout.renderedCellCount).toBeGreaterThan(MAX_SAFE_SVG_CELLS);
    expect(layout.effectiveSvgCellLimit).toBe(MAX_SAFE_SVG_CELLS);
    expect(layout.effectiveSvgEstimatedByteLimit).toBe(
      MAX_SAFE_SVG_ESTIMATED_BYTES
    );
    expect(layout.exportLimitKind).toBe("svg-cells");
    expect(layout.exceedsCanvasLimit).toBe(true);
  });

  it("blocks SVG output that exceeds the estimated-byte budget", () => {
    const layout = calculateExportLayout(alignment, state(), {
      ...baseOptions,
      maxSvgCells: 1_000,
      maxSvgEstimatedBytes: 1_000
    });

    expect(layout.renderedCellCount).toBeLessThanOrEqual(1_000);
    expect(layout.estimatedSvgBytes).toBeGreaterThan(1_000);
    expect(layout.exportLimitKind).toBe("svg-estimated-bytes");
  });
});
