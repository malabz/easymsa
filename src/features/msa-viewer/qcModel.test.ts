import { describe, expect, it } from "vitest";
import type { ColumnStats, RowQcStats } from "./types";
import {
  DEFAULT_ANNOTATION_FILTERS,
  DEFAULT_ROW_QC_FILTERS,
  createQcAnnotation,
  filterAndSortRowQc,
  filterColumnsForQc,
  filterQcAnnotations,
  isRowQcCandidate
} from "./qcModel";
import { DEFAULT_QC_THRESHOLDS } from "./workspaceSnapshot";

const rows: RowQcStats[] = [
  {
    rowKey: "row-1",
    sequenceId: "alpha",
    originalIndex: 0,
    sequenceLength: 10,
    ungappedLength: 8,
    alignmentLength: 10,
    canonicalCount: 8,
    ambiguityCount: 0,
    unknownCount: 0,
    gapCount: 2,
    gapFraction: 0.2,
    coverage: 0.8,
    informativeCoverage: 0.8,
    ambiguityFraction: 0,
    unknownFraction: 0,
    gcFraction: 0.5,
    identity: 0.95,
    substitutionCount: 1,
    insertionCount: 0,
    deletionCount: 0
  },
  {
    rowKey: "row-2",
    sequenceId: "beta",
    originalIndex: 1,
    sequenceLength: 10,
    ungappedLength: 6,
    alignmentLength: 10,
    canonicalCount: 4,
    ambiguityCount: 2,
    unknownCount: 0,
    gapCount: 4,
    gapFraction: 0.4,
    coverage: 0.6,
    informativeCoverage: 0.4,
    ambiguityFraction: 0.2,
    unknownFraction: 0,
    gcFraction: 0.25,
    identity: 0.7,
    substitutionCount: 3,
    insertionCount: 1,
    deletionCount: 1
  }
];

function column(patch: Partial<ColumnStats>): ColumnStats {
  return {
    position: 1,
    conservation: 1,
    gapFraction: 0,
    coverage: 1,
    entropy: 0,
    variation: 0,
    dominantBase: "A",
    consensusBase: "A",
    ambiguityConsensus: "A",
    ...patch
  };
}

describe("sequence QC model", () => {
  it("combines name, metric filters, and difference sorting", () => {
    const filtered = filterAndSortRowQc(rows, {
      filters: {
        ...DEFAULT_ROW_QC_FILTERS,
        name: "a",
        maxGapFraction: 0.5,
        minGcFraction: 0.2
      },
      sortKey: "differences",
      direction: "desc"
    });
    expect(filtered.map((row) => row.rowKey)).toEqual(["row-2", "row-1"]);
  });

  it("reads worker-v2 comparison metrics from the nested reference object", () => {
    const nested: RowQcStats = {
      ...rows[0],
      identity: undefined,
      substitutionCount: undefined,
      reference: {
        comparisonTarget: "reference",
        comparisonRowKey: "ref",
        isComparisonTarget: false,
        validComparisonCount: 8,
        matchCount: 6,
        compatibleAmbiguityCount: 0,
        substitutionCount: 2,
        unclassifiedSubstitutionCount: 0,
        insertionCount: 1,
        deletionCount: 0,
        transitionCount: 1,
        transversionCount: 1,
        identity: 0.75
      }
    };
    const filtered = filterAndSortRowQc([nested], {
      filters: {
        ...DEFAULT_ROW_QC_FILTERS,
        minReferenceIdentity: 0.7,
        maxDifferenceCount: 3
      }
    });
    expect(filtered).toEqual([nested]);
  });

  it("keeps every row non-candidate by default and only flags enabled rules", () => {
    expect(rows.every((row) => !isRowQcCandidate(row, DEFAULT_QC_THRESHOLDS))).toBe(true);
    const thresholds = {
      ...DEFAULT_QC_THRESHOLDS,
      row: { ...DEFAULT_QC_THRESHOLDS.row, maxGapFraction: 0.3 }
    };
    expect(isRowQcCandidate(rows[0], thresholds)).toBe(false);
    expect(isRowQcCandidate(rows[1], thresholds)).toBe(true);
  });
});

describe("column QC model", () => {
  const columns = [
    column({ position: 1, conservation: 0.9, gapFraction: 0.2 }),
    column({ position: 2, conservation: 0.7, gapFraction: 0.1, variation: 0.3 }),
    column({ position: 3, conservation: 1, gapFraction: 0.6 }),
    column({ position: 4, conservation: 0, hasInformativeBases: false })
  ];

  it("keeps the published conserved and low-gap presets", () => {
    expect(filterColumnsForQc(columns, "conserved", DEFAULT_QC_THRESHOLDS.column)
      .map((item) => item.position)).toEqual([1]);
    expect(filterColumnsForQc(columns, "lowGap", DEFAULT_QC_THRESHOLDS.column)
      .map((item) => item.position)).toEqual([1, 2, 4]);
  });

  it("does not treat an unavailable conservation value as zero", () => {
    const custom = {
      ...DEFAULT_QC_THRESHOLDS.column,
      minConservation: 0
    };
    expect(filterColumnsForQc(columns, "custom", custom)
      .map((item) => item.position)).toEqual([1, 2, 3]);

    expect(filterColumnsForQc(columns, "custom", {
      ...DEFAULT_QC_THRESHOLDS.column,
      maxEntropy: 1
    }).map((item) => item.position)).toEqual([1, 2, 3]);
  });
});

describe("QC annotations", () => {
  it("supports row, category, and interval filtering", () => {
    const first = createQcAnnotation({
      id: "a",
      category: "review",
      target: { rowKey: "row-1", start: 2, end: 4 }
    }, "2026-08-30T00:00:00.000Z");
    const second = createQcAnnotation({
      id: "b",
      category: "note",
      target: { rowKey: "row-2", start: null, end: null }
    }, "2026-08-30T00:00:01.000Z");
    expect(filterQcAnnotations([first, second], {
      ...DEFAULT_ANNOTATION_FILTERS,
      category: "review",
      rowKey: "row-1",
      position: 3
    })).toEqual([first]);
  });

  it("rejects an annotation without a target", () => {
    expect(() => createQcAnnotation({
      category: "note",
      target: { rowKey: null, start: null, end: null }
    })).toThrow(/requires a row or interval/i);
  });
});
