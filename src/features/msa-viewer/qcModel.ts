import type {
  ColumnPositionView,
  ColumnStats,
  ColumnStatsStoreV1,
  RowQcStats
} from "./types";
import { COLUMN_STATS_FLAGS } from "./types";
import {
  filteredColumnPositionView,
  identityColumnPositionView
} from "./columnStatsStore";
import type { QcAnnotation, QcThresholds } from "./workspaceSnapshot";

export type RowQcSortKey =
  | "original"
  | "name"
  | "length"
  | "gap"
  | "ambiguity"
  | "gc"
  | "identity"
  | "differences";

export type RowQcFilters = {
  name: string;
  minUngappedLength: number | null;
  maxUngappedLength: number | null;
  maxGapFraction: number | null;
  maxAmbiguityFraction: number | null;
  minGcFraction: number | null;
  maxGcFraction: number | null;
  minReferenceIdentity: number | null;
  maxDifferenceCount: number | null;
};

export const DEFAULT_ROW_QC_FILTERS: RowQcFilters = {
  name: "",
  minUngappedLength: null,
  maxUngappedLength: null,
  maxGapFraction: null,
  maxAmbiguityFraction: null,
  minGcFraction: null,
  maxGcFraction: null,
  minReferenceIdentity: null,
  maxDifferenceCount: null
};

export const COLUMN_QC_PRESETS = {
  conserved: {
    minConservation: 0.8,
    maxGapFraction: 0.5
  },
  lowGap: {
    maxGapFraction: 0.5
  }
} as const;

export function rowQcUngappedLength(row: RowQcStats) {
  return row.ungappedLength ?? row.nonGapLength ?? Math.max(0, row.alignmentLength - row.gapCount);
}

export function rowQcGapFraction(row: RowQcStats) {
  return row.gapFraction ?? (
    row.alignmentLength > 0 ? row.gapCount / row.alignmentLength : 0
  );
}

export function rowQcIdentity(row: RowQcStats) {
  return row.identity ?? row.reference?.identity ?? null;
}

export function rowDifferenceCount(row: RowQcStats) {
  return (
    (row.substitutionCount ?? row.reference?.substitutionCount ?? 0) +
    (row.insertionCount ?? row.reference?.insertionCount ?? 0) +
    (row.deletionCount ?? row.reference?.deletionCount ?? 0)
  );
}

function meetsMinimum(value: number | null | undefined, threshold: number | null) {
  return threshold === null || (value !== null && value !== undefined && value >= threshold);
}

function meetsMaximum(value: number | null | undefined, threshold: number | null) {
  return threshold === null || (value !== null && value !== undefined && value <= threshold);
}

export function rowMatchesQcFilters(row: RowQcStats, filters: RowQcFilters) {
  const name = filters.name.trim().toLocaleLowerCase();
  return (
    (!name || row.sequenceId.toLocaleLowerCase().includes(name)) &&
    meetsMinimum(rowQcUngappedLength(row), filters.minUngappedLength) &&
    meetsMaximum(rowQcUngappedLength(row), filters.maxUngappedLength) &&
    meetsMaximum(rowQcGapFraction(row), filters.maxGapFraction) &&
    meetsMaximum(row.ambiguityFraction, filters.maxAmbiguityFraction) &&
    meetsMinimum(row.gcFraction, filters.minGcFraction) &&
    meetsMaximum(row.gcFraction, filters.maxGcFraction) &&
    meetsMinimum(rowQcIdentity(row), filters.minReferenceIdentity) &&
    meetsMaximum(rowDifferenceCount(row), filters.maxDifferenceCount)
  );
}

export function isRowQcCandidate(row: RowQcStats, thresholds: QcThresholds) {
  const rule = thresholds.row;
  return !(
    meetsMinimum(rowQcUngappedLength(row), rule.minUngappedLength) &&
    meetsMaximum(rowQcGapFraction(row), rule.maxGapFraction) &&
    meetsMaximum(row.ambiguityFraction, rule.maxAmbiguityFraction) &&
    meetsMinimum(row.gcFraction, rule.minGcFraction) &&
    meetsMaximum(row.gcFraction, rule.maxGcFraction) &&
    meetsMinimum(rowQcIdentity(row), rule.minReferenceIdentity)
  );
}

function nullableNumber(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value)
    ? null
    : value;
}

function compareNullable(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function compareRows(left: RowQcStats, right: RowQcStats, key: RowQcSortKey) {
  if (key === "name") {
    return left.sequenceId.localeCompare(right.sequenceId);
  }
  if (key === "length") {
    return rowQcUngappedLength(left) - rowQcUngappedLength(right);
  }
  if (key === "gap") {
    return rowQcGapFraction(left) - rowQcGapFraction(right);
  }
  if (key === "ambiguity") {
    return left.ambiguityFraction - right.ambiguityFraction;
  }
  if (key === "gc") {
    return compareNullable(
      nullableNumber(left.gcFraction),
      nullableNumber(right.gcFraction)
    );
  }
  if (key === "identity") {
    return compareNullable(
      nullableNumber(rowQcIdentity(left)),
      nullableNumber(rowQcIdentity(right))
    );
  }
  if (key === "differences") {
    return rowDifferenceCount(left) - rowDifferenceCount(right);
  }
  return left.originalIndex - right.originalIndex;
}

export function filterAndSortRowQc(
  rows: RowQcStats[],
  options: {
    filters?: RowQcFilters;
    sortKey?: RowQcSortKey;
    direction?: "asc" | "desc";
  } = {}
) {
  const filters = options.filters ?? DEFAULT_ROW_QC_FILTERS;
  const sortKey = options.sortKey ?? "original";
  const direction = options.direction ?? "asc";
  return rows
    .filter((row) => rowMatchesQcFilters(row, filters))
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const compared = compareRows(left.row, right.row, sortKey);
      return (direction === "asc" ? compared : -compared) || left.index - right.index;
    })
    .map(({ row }) => row);
}

export function columnMatchesQcThresholds(
  column: ColumnStats,
  thresholds: QcThresholds["column"]
) {
  const conservation = column.hasInformativeBases === false
    ? null
    : column.conservation;
  const entropy = column.hasInformativeBases === false
    ? null
    : column.normalizedEntropy ?? column.entropy;
  const ambiguityFraction = column.ambiguityFraction ?? 0;
  return (
    meetsMinimum(conservation, thresholds.minConservation) &&
    meetsMaximum(column.gapFraction, thresholds.maxGapFraction) &&
    meetsMinimum(column.coverage, thresholds.minCoverage) &&
    meetsMaximum(entropy, thresholds.maxEntropy) &&
    meetsMaximum(ambiguityFraction, thresholds.maxAmbiguityFraction)
  );
}

export function filterColumnsForQc(
  columns: ColumnStats[],
  mode: "all" | "variable" | "conserved" | "lowGap" | "custom",
  thresholds: QcThresholds["column"]
) {
  if (mode === "variable") {
    return columns.filter((column) => column.variation > 0);
  }
  if (mode === "conserved") {
    return columns.filter(
      (column) =>
        column.hasInformativeBases !== false &&
        column.conservation !== null &&
        column.conservation >= COLUMN_QC_PRESETS.conserved.minConservation &&
        column.gapFraction <= COLUMN_QC_PRESETS.conserved.maxGapFraction
    );
  }
  if (mode === "lowGap") {
    return columns.filter(
      (column) => column.gapFraction <= COLUMN_QC_PRESETS.lowGap.maxGapFraction
    );
  }
  if (mode === "custom") {
    return columns.filter((column) => columnMatchesQcThresholds(column, thresholds));
  }
  return columns;
}

function columnStoreValue(
  store: ColumnStatsStoreV1,
  index: number,
  key: "conservation" | "gap" | "coverage" | "entropy" | "ambiguity"
) {
  const totalRows = store.totalRows;
  const canonical = store.canonicalCounts[index];
  if (key === "conservation") {
    return canonical > 0 ? store.dominantCounts[index] / canonical : null;
  }
  if (key === "gap") {
    return totalRows > 0 ? store.gapCounts[index] / totalRows : 0;
  }
  if (key === "coverage") {
    return totalRows > 0
      ? (canonical + store.ambiguityCounts[index] + store.unknownCounts[index]) /
        totalRows
      : 0;
  }
  if (key === "ambiguity") {
    return totalRows > 0 ? store.ambiguityCounts[index] / totalRows : 0;
  }
  return canonical > 0 ? store.entropyBits[index] / 2 : null;
}

export function filterColumnPositionViewForQc(
  store: ColumnStatsStoreV1,
  mode: "all" | "variable" | "conserved" | "lowGap" | "custom",
  thresholds: QcThresholds["column"]
): ColumnPositionView {
  if (mode === "all") {
    return identityColumnPositionView(store.length);
  }
  const positions: number[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const conservation = columnStoreValue(store, index, "conservation");
    const gap = columnStoreValue(store, index, "gap") ?? 0;
    let included = false;
    if (mode === "variable") {
      included = Boolean(store.flags[index] & COLUMN_STATS_FLAGS.variable);
    } else if (mode === "conserved") {
      included = conservation !== null &&
        conservation >= COLUMN_QC_PRESETS.conserved.minConservation &&
        gap <= COLUMN_QC_PRESETS.conserved.maxGapFraction;
    } else if (mode === "lowGap") {
      included = gap <= COLUMN_QC_PRESETS.lowGap.maxGapFraction;
    } else {
      included =
        meetsMinimum(conservation, thresholds.minConservation) &&
        meetsMaximum(gap, thresholds.maxGapFraction) &&
        meetsMinimum(
          columnStoreValue(store, index, "coverage"),
          thresholds.minCoverage
        ) &&
        meetsMaximum(
          columnStoreValue(store, index, "entropy"),
          thresholds.maxEntropy
        ) &&
        meetsMaximum(
          columnStoreValue(store, index, "ambiguity"),
          thresholds.maxAmbiguityFraction
        );
    }
    if (included) positions.push(index + 1);
  }
  return filteredColumnPositionView(positions);
}

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function summarizeRowQc(rows: RowQcStats[]) {
  const gcValues = rows
    .map((row) => row.gcFraction)
    .filter((value): value is number => value !== null && value !== undefined);
  const identityValues = rows
    .map(rowQcIdentity)
    .filter((value): value is number => value !== null && value !== undefined);
  return {
    count: rows.length,
    medianUngappedLength: median(rows.map(rowQcUngappedLength)),
    medianGapFraction: median(rows.map(rowQcGapFraction)),
    medianAmbiguityFraction: median(rows.map((row) => row.ambiguityFraction)),
    medianGcFraction: median(gcValues),
    medianIdentity: median(identityValues)
  };
}

export type AnnotationFilters = {
  category: QcAnnotation["category"] | "all";
  rowKey: string;
  position: number | null;
};

export const DEFAULT_ANNOTATION_FILTERS: AnnotationFilters = {
  category: "all",
  rowKey: "",
  position: null
};

export function filterQcAnnotations(
  annotations: QcAnnotation[],
  filters: AnnotationFilters
) {
  return annotations
    .filter((annotation) => {
      if (filters.category !== "all" && annotation.category !== filters.category) {
        return false;
      }
      if (filters.rowKey && annotation.target.rowKey !== filters.rowKey) {
        return false;
      }
      if (filters.position !== null) {
        const { start, end } = annotation.target;
        if (start === null || end === null || filters.position < start || filters.position > end) {
          return false;
        }
      }
      return true;
    })
    .sort((left, right) => {
      const leftStart = left.target.start ?? Number.POSITIVE_INFINITY;
      const rightStart = right.target.start ?? Number.POSITIVE_INFINITY;
      return leftStart - rightStart || left.createdAt.localeCompare(right.createdAt);
    });
}

export function createQcAnnotation(
  input: {
    id?: string;
    category: QcAnnotation["category"];
    text?: string;
    target: QcAnnotation["target"];
  },
  now = new Date().toISOString()
): QcAnnotation {
  if (
    input.target.rowKey === null &&
    (input.target.start === null || input.target.end === null)
  ) {
    throw new Error("QC annotation requires a row or interval target.");
  }
  if (
    input.target.start !== null &&
    input.target.end !== null &&
    input.target.start > input.target.end
  ) {
    throw new Error("QC annotation interval start exceeds end.");
  }
  const generatedId = globalThis.crypto?.randomUUID?.() ??
    `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    id: input.id ?? generatedId,
    category: input.category,
    text: input.text ?? "",
    target: input.target,
    createdAt: now,
    updatedAt: now
  };
}
