import { describe, expect, it } from "vitest";
import type { MSAResult } from "../../lib/types/msa";
import { calculateExportLayout } from "./exportLayout";
import {
  buildAnnotationsTsv,
  buildColumnsTsv,
  buildMsaExportManifestV1,
  buildRowsTsv,
  sanitizeManifestLabel
} from "./exportManifest";
import type {
  MsaExportOptions,
  MsaExportViewerState,
  SupportedExportRegion
} from "./exportTypes";

const alignment: MSAResult = {
  jobId: "job-17",
  truncated: false,
  sequences: [
    { id: "seq1", rowKey: "row-1", originalIndex: 0, sequence: "ACGT" },
    { id: "seq2", rowKey: "row-2", originalIndex: 1, sequence: "A-GT" },
    { id: "hidden", rowKey: "row-3", originalIndex: 2, sequence: "TTTT" }
  ],
  consensus: "ACGT",
  alignmentLength: 4,
  sequenceCount: 3,
  descriptor: {
    sourceKey: "unsafe-internal-key",
    sourceKind: "local-file",
    sourceName: "/private/input.fa?token=descriptor-secret",
    alphabet: "dna",
    alphabetConfidence: "high",
    alignmentMode: "aligned",
    sequenceCount: 3,
    alignmentLength: 4,
    observedDimensions: { sequenceCount: 3, alignmentLength: 4 },
    rawSha256: "a".repeat(64),
    alignmentSha256: "B".repeat(64),
    warnings: ["/private/warning"]
  }
};

const options: MsaExportOptions<SupportedExportRegion> = {
  format: "svg",
  region: "filteredView",
  layoutMode: "single-line",
  includeSequenceNames: true,
  includeCoordinates: true,
  includeConsensus: true,
  includeConservation: true,
  includeLegend: false,
  includeAnnotations: true,
  scale: 1,
  backgroundColor: "#ffffff",
  transparentBackground: false,
  filename: "alignment.svg",
  wrapColumnCount: 120,
  maxCanvasPixels: 32_000_000
};

function viewerState(
  overrides: Partial<MsaExportViewerState> = {}
): MsaExportViewerState {
  return {
    sequences: alignment.sequences.slice(0, 2),
    visiblePositions: [1, 3, 4],
    conservationColumns: Array.from({ length: 4 }, (_, index) => ({
      position: index + 1,
      conservation: index === 1 ? 0.5 : 1,
      gapFraction: index === 1 ? 0.5 : 0,
      dominantBase: "A",
      coverage: index === 1 ? 0.5 : 1,
      entropy: index / 10,
      variation: index === 1 ? 0.5 : 0,
      consensusBase: alignment.consensus?.[index],
      ambiguityConsensus: alignment.consensus?.[index]
    })),
    colorScheme: "nucleotide",
    selectedRange: { start: 3, end: 4 },
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
    alignmentLength: 4,
    activeTracks: ["conservation", "coverage"],
    consensusMode: "iupac",
    consensusSequence: "ACGT",
    coordinateMode: "reference",
    differenceMode: true,
    referenceRowKey: "row-1",
    analysisScope: "selected",
    viewerContext: {
      source: { type: "local-file", name: "input.fa" },
      algorithm: { requested: null, resolved: null },
      preprocess: { mode: null, strictness: null }
    },
    frontendVersion: "0.1.0",
    buildSha: "abcdef1234567",
    ...overrides
  };
}

function fixture() {
  const state = viewerState();
  const layout = calculateExportLayout(alignment, state, options);
  return { state, layout };
}

describe("buildMsaExportManifestV1", () => {
  it("builds deterministic v1 provenance without reading the clock", () => {
    const { state, layout } = fixture();
    const input = {
      alignment,
      state,
      layout,
      generatedAt: "2026-08-30T01:02:03+08:00"
    };

    const first = buildMsaExportManifestV1(input);
    const second = buildMsaExportManifestV1(input);

    expect(first).toEqual(second);
    expect(first.schema).toBe("easymsa-msa-export/v1");
    expect(first.generatedAt).toBe("2026-08-29T17:02:03.000Z");
    expect(first.source).toMatchObject({
      label: "input.fa",
      kind: "local-file",
      sequenceCount: 3,
      alignmentLength: 4,
      observedDimensions: { sequenceCount: 3, alignmentLength: 4 },
      truncated: false,
      rawSha256: "a".repeat(64),
      alignmentSha256: "b".repeat(64)
    });
    expect(first.scope).toMatchObject({
      region: "filteredView",
      exportedRowKeys: ["row-1", "row-2"],
      alignmentPositions: [1, 3, 4],
      exportedRowCount: 2,
      exportedColumnCount: 3,
      firstAlignmentPosition: 1,
      lastAlignmentPosition: 4,
      contiguousColumns: false,
      rowFilterApplied: true,
      columnFilterApplied: true
    });
    expect(first.files).toEqual({
      rows: "rows.tsv",
      columns: "columns.tsv",
      annotations: null
    });
    expect(first.output.pages).toEqual([
      expect.objectContaining({
        page: 1,
        filename: "alignment.svg",
        alignmentPositions: [1, 3, 4]
      })
    ]);
    expect(first.analysis).toMatchObject({
      enabled: true,
      semantics: "nucleotide-v2",
      scope: "selected",
      rowKeys: ["row-1", "row-2"],
      reference: { rowKey: "row-1", label: "seq1" },
      coordinateRule: "alignment-1-based;reference-interbase-v2",
      policies: {
        denominator: "canonical-only",
        difference: "iupac-compatible",
        tiTv: "canonical-substitutions-only"
      }
    });
    expect(first.pipeline).toEqual({
      requestedAlgorithm: "unknown",
      resolvedAlgorithm: "unknown",
      preprocessMode: "unknown",
      preprocessStrictness: "unknown"
    });
  });

  it("removes URL queries, credentials and absolute-path components", () => {
    const unsafeAlignment: MSAResult = {
      ...alignment,
      sequences: [
        { id: "C:\\private\\reference.fa?access_token=reference-secret", sequence: "ACGT" }
      ],
      sequenceCount: 1
    };
    const state = viewerState({
      sequences: unsafeAlignment.sequences,
      referenceRowKey: undefined,
      referenceSequenceId: unsafeAlignment.sequences[0].id
    });
    const layout = calculateExportLayout(unsafeAlignment, state, options);
    const manifest = buildMsaExportManifestV1({
      alignment: unsafeAlignment,
      state,
      layout,
      generatedAt: "2026-08-30T00:00:00Z",
      sourceLabel: "https://example.test/private/input.fa?token=source-secret",
      outputFilename: "/home/researcher/output.svg?api_key=output-secret"
    });
    const serialized = JSON.stringify(manifest);

    expect(manifest.source.label).toBe("input.fa");
    expect(manifest.output.filename).toBe("output.svg");
    expect(manifest.view.referenceLabel).toBe("reference.fa");
    expect(serialized).not.toContain("source-secret");
    expect(serialized).not.toContain("output-secret");
    expect(serialized).not.toContain("reference-secret");
    expect(serialized).not.toContain("?");
    expect(serialized).not.toContain("/home/");
    expect(serialized).not.toContain("C:\\private");
  });

  it("redacts sensitive pipeline and annotation text from manifest and TSV", () => {
    const state = viewerState({
      viewerContext: {
        source: {
          type: "server-job",
          name: "job",
          jobId: "token=job-secret"
        },
        algorithm: {
          requested: "api_key=algorithm-secret",
          resolved: "mafft"
        },
        preprocess: { mode: "audit", strictness: "normal" }
      },
      annotations: [
        {
          id: "annotation-1",
          category: "review",
          label: "https://example.test/review?token=url-secret",
          rowKey: "row-1",
          start: 1,
          end: 1,
          note: "/home/researcher/private-note token=note-secret"
        }
      ]
    });
    const layout = calculateExportLayout(alignment, state, options);
    const manifest = buildMsaExportManifestV1({
      alignment,
      state,
      layout,
      generatedAt: "2026-08-30T00:00:00Z"
    });
    const annotations = buildAnnotationsTsv(layout, state.annotations);
    const serialized = `${JSON.stringify(manifest)}\n${annotations}`;

    expect(serialized).not.toContain("job-secret");
    expect(serialized).not.toContain("algorithm-secret");
    expect(serialized).not.toContain("url-secret");
    expect(serialized).not.toContain("note-secret");
    expect(serialized).not.toContain("/home/researcher");
  });

  it("keeps analysis membership separate from export rows and preserves row-only annotations", () => {
    const state = viewerState({
      analysisRowKeys: ["row-3", "row-1"],
      annotations: [
        {
          id: "row-review",
          category: "review",
          label: "Review this sequence",
          rowKey: "row-1",
          start: null,
          end: null
        }
      ]
    });
    const layout = calculateExportLayout(alignment, state, options);
    const manifest = buildMsaExportManifestV1({
      alignment,
      state,
      layout,
      generatedAt: "2026-08-30T00:00:00Z"
    });
    const annotationsTsv = buildAnnotationsTsv(layout, state.annotations);

    expect(manifest.analysis.enabled).toBe(true);
    if (!manifest.analysis.enabled) throw new Error("expected enabled analysis");
    expect(manifest.analysis.rowKeys).toEqual(["row-3", "row-1"]);
    expect(manifest.scope.exportedRowKeys).toEqual(["row-1", "row-2"]);
    expect(manifest.scope.alignmentPositions).toEqual([1, 3, 4]);
    expect(manifest.annotations[0]).toMatchObject({
      id: "row-review",
      rowKey: "row-1",
      start: null,
      end: null
    });
    expect(manifest.files.annotations).toBe("annotations.tsv");
    expect(annotationsTsv).toContain("row-review\treview\tReview this sequence\trow-1\t\t\t\talignment");
  });

  it.each([
    ["protein", "neutral", "protein"],
    ["unknown", "neutral", "unknown-alphabet"],
    ["dna", "rawUnequal", "raw-unequal"]
  ] as const)(
    "does not claim nucleotide analysis for %s/%s input",
    (alphabet, alignmentMode, disabledReason) => {
      const neutralAlignment: MSAResult = {
        ...alignment,
        descriptor: {
          ...alignment.descriptor!,
          alphabet,
          alignmentMode
        }
      };
      const state = viewerState({
        consensusSequence: "",
        activeTracks: []
      });
      const layout = calculateExportLayout(neutralAlignment, state, {
        ...options,
        includeConsensus: false,
        includeConservation: false
      });
      const manifest = buildMsaExportManifestV1({
        alignment: neutralAlignment,
        state,
        layout,
        generatedAt: "2026-08-30T00:00:00Z"
      });

      expect(manifest.analysis).toEqual({
        enabled: false,
        semantics: null,
        disabledReason
      });
      expect(manifest.view).toMatchObject({
        activeTracks: [],
        consensusMode: null,
        coordinateMode: "alignment",
        differenceMode: false,
        referenceLabel: null
      });
    }
  );

  it("rejects invalid generatedAt values", () => {
    const { state, layout } = fixture();
    expect(() =>
      buildMsaExportManifestV1({
        alignment,
        state,
        layout,
        generatedAt: "not-a-date"
      })
    ).toThrow("generatedAt");
  });
});

describe("manifest label and TSV builders", () => {
  it("uses a safe fallback for empty and directory-only labels", () => {
    expect(sanitizeManifestLabel("", "alignment")).toBe("alignment");
    expect(sanitizeManifestLabel("../..", "alignment")).toBe("alignment");
  });

  it("generates row and column audit tables for exactly the exported layout", () => {
    const { layout } = fixture();
    const rows = buildRowsTsv(layout);
    const columns = buildColumnsTsv(layout);

    expect(rows.split("\n")[0]).toBe(
      "export_row\tsource_row\trow_key\toriginal_header\taligned_length\tungapped_length\tis_reference"
    );
    expect(rows).toContain("1\t1\trow-1\tseq1\t4\t4\ttrue");
    expect(rows).toContain("2\t2\trow-2\tseq2\t4\t3\tfalse");
    expect(rows).not.toContain("hidden");
    expect(columns.split("\n")[0]).toContain("alignment_position");
    expect(columns).toContain("1\t1\t1\tA");
    expect(columns).toContain("2\t3\t3\tG");
    expect(columns).not.toMatch(/^\d+\t2\t/m);
  });

  it("filters annotations to the exported scope and neutralizes TSV formulas", () => {
    const { layout } = fixture();
    const annotations = buildAnnotationsTsv(layout, [
      {
        id: "inside",
        type: "feature",
        label: "@SUM(A1:A2)",
        sequenceId: "seq2",
        start: 3,
        end: 4,
        note: "first line\nsecond line"
      },
      {
        id: "hidden-row",
        label: "hidden",
        sequenceId: "hidden",
        start: 3,
        end: 3
      },
      {
        id: "outside-columns",
        label: "outside",
        start: 2,
        end: 2
      }
    ]);

    expect(annotations).toContain("inside\tfeature\t'@SUM(A1:A2)");
    expect(annotations).toContain("first line second line");
    expect(annotations).not.toContain("hidden-row");
    expect(annotations).not.toContain("outside-columns");
  });
});
