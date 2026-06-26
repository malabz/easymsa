import { describe, expect, it } from "vitest";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import { renderMsaExportToSvg } from "./exportSvgRenderer";
import type { MsaExportLabels, MsaExportOptions, MsaExportViewerState } from "./exportTypes";

const alignment: MSAResult = {
  jobId: "svg",
  truncated: false,
  sequences: [
    { id: "seq<1>", sequence: "ACGT" },
    { id: "seq2", sequence: "A-GT" }
  ],
  consensus: "ACGT",
  alignmentLength: 4
};

const options: MsaExportOptions = {
  format: "svg",
  region: "full",
  layoutMode: "single-line",
  includeSequenceNames: true,
  includeCoordinates: true,
  includeConsensus: true,
  includeConservation: true,
  includeLegend: true,
  includeAnnotations: false,
  scale: 2,
  backgroundColor: "#ffffff",
  transparentBackground: false,
  filename: "svg",
  wrapColumnCount: 120,
  maxCanvasPixels: 80_000_000
};

const state: MsaExportViewerState = {
  sequences: alignment.sequences,
  visiblePositions: [1, 2, 3, 4],
  conservationColumns: [1, 2, 3, 4].map((position) => ({
    position,
    conservation: 1,
    gapFraction: 0,
    dominantBase: "A"
  })),
  colorScheme: "nucleotide",
  selectedRange: null,
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
  viewport: null,
  alignmentLength: 4
};

const labels: MsaExportLabels = {
  position: "Position",
  conservation: "Conservation",
  consensus: "Consensus",
  legend: "Legend",
  dominant: "Dominant",
  variant: "Variant",
  gapEmpty: "Gap"
};

describe("renderMsaExportToSvg", () => {
  it("renders a standalone SVG with cells, text, and escaped labels", () => {
    const layout = calculateExportLayout(alignment, state, options);
    const svg = renderMsaExportToSvg(layout, labels);

    expect(svg).toContain("<svg");
    expect(svg).toContain("viewBox=");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<text");
    expect(svg).toContain("seq&lt;1&gt;");
    expect(svg).toContain("Legend");
  });
});
