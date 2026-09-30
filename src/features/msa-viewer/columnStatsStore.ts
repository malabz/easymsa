import type {
  ColumnPositionView,
  ColumnStats,
  ColumnStatsStoreV1,
  MsaTrackId
} from "./types";
import {
  COLUMN_STATS_FLAGS,
  COLUMN_STATS_STORE_VERSION
} from "./types";

const STORE_ARRAY_KEYS = [
  "canonicalCounts",
  "ambiguityCounts",
  "unknownCounts",
  "gapCounts",
  "dominantCounts",
  "gcCounts",
  "entropyBits",
  "flags"
] as const;

function finiteNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function assertColumnStatsStore(
  value: unknown
): asserts value is ColumnStatsStoreV1 {
  if (!value || typeof value !== "object") {
    throw new TypeError("Column statistics store must be an object.");
  }
  const store = value as Partial<ColumnStatsStoreV1>;
  if (
    store.version !== COLUMN_STATS_STORE_VERSION ||
    !finiteNonNegativeInteger(store.length) ||
    !finiteNonNegativeInteger(store.totalRows)
  ) {
    throw new TypeError("Column statistics store metadata is invalid.");
  }
  const expectedLength = store.length;
  const expectedTags: Record<(typeof STORE_ARRAY_KEYS)[number], string> = {
    canonicalCounts: "[object Uint32Array]",
    ambiguityCounts: "[object Uint32Array]",
    unknownCounts: "[object Uint32Array]",
    gapCounts: "[object Uint32Array]",
    dominantCounts: "[object Uint32Array]",
    gcCounts: "[object Uint32Array]",
    entropyBits: "[object Float64Array]",
    flags: "[object Uint8Array]"
  };
  for (const key of STORE_ARRAY_KEYS) {
    const array = store[key];
    if (
      !ArrayBuffer.isView(array) ||
      Object.prototype.toString.call(array) !== expectedTags[key] ||
      array.length !== expectedLength
    ) {
      throw new TypeError(`Column statistics store field ${key} is invalid.`);
    }
  }
  if (
    typeof store.majorityConsensus !== "string" ||
    typeof store.iupacConsensus !== "string" ||
    store.majorityConsensus.length !== expectedLength ||
    store.iupacConsensus.length !== expectedLength
  ) {
    throw new TypeError("Column statistics consensus vectors are invalid.");
  }
  const validated = store as ColumnStatsStoreV1;
  for (let index = 0; index < expectedLength; index += 1) {
    const canonical = validated.canonicalCounts[index];
    const ambiguity = validated.ambiguityCounts[index];
    const unknown = validated.unknownCounts[index];
    const gap = validated.gapCounts[index];
    if (canonical + ambiguity + unknown + gap !== validated.totalRows) {
      throw new TypeError(`Column ${index + 1} counts do not equal totalRows.`);
    }
    if (
      validated.dominantCounts[index] > canonical ||
      validated.gcCounts[index] > canonical
    ) {
      throw new TypeError(`Column ${index + 1} sufficient counts are invalid.`);
    }
    const informative = Boolean(validated.flags[index] & COLUMN_STATS_FLAGS.informative);
    if (informative !== (canonical > 0)) {
      throw new TypeError(`Column ${index + 1} informative flag is inconsistent.`);
    }
    if (informative === Number.isNaN(validated.entropyBits[index])) {
      throw new TypeError(`Column ${index + 1} entropy availability is inconsistent.`);
    }
  }
}

function fraction(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

export function columnStatsAtIndex(
  store: ColumnStatsStoreV1,
  index: number
): ColumnStats | null {
  if (!Number.isInteger(index) || index < 0 || index >= store.length) {
    return null;
  }
  const canonicalCount = store.canonicalCounts[index];
  const ambiguityCount = store.ambiguityCounts[index];
  const unknownCount = store.unknownCounts[index];
  const gapCount = store.gapCounts[index];
  const informative = Boolean(store.flags[index] & COLUMN_STATS_FLAGS.informative);
  const entropyBits = informative ? store.entropyBits[index] : null;
  const conservation = informative
    ? store.dominantCounts[index] / canonicalCount
    : null;
  const normalizedEntropy = entropyBits === null ? null : entropyBits / 2;
  const consensusBase = store.majorityConsensus[index] ?? "N";
  return {
    position: index + 1,
    totalRows: store.totalRows,
    canonicalCount,
    ambiguityCount,
    unknownCount,
    gapCount,
    informativeCoverage: fraction(canonicalCount, store.totalRows),
    ambiguityFraction: fraction(ambiguityCount, store.totalRows),
    unknownFraction: fraction(unknownCount, store.totalRows),
    gcFraction: informative ? store.gcCounts[index] / canonicalCount : null,
    entropyBits,
    normalizedEntropy,
    hasInformativeBases: informative,
    conservation,
    gapFraction: fraction(gapCount, store.totalRows),
    coverage: fraction(
      canonicalCount + ambiguityCount + unknownCount,
      store.totalRows
    ),
    entropy: normalizedEntropy,
    variation: informative && (store.flags[index] & COLUMN_STATS_FLAGS.variable)
      ? 1 - (conservation ?? 1)
      : 0,
    dominantBase: informative ? consensusBase : "",
    consensusBase,
    ambiguityConsensus: store.iupacConsensus[index] ?? "N",
    majorityTie: Boolean(store.flags[index] & COLUMN_STATS_FLAGS.majorityTie)
  };
}

export function columnStatsAtPosition(
  store: ColumnStatsStoreV1,
  position: number
): ColumnStats | null {
  return columnStatsAtIndex(store, position - 1);
}

export type ColumnMetric =
  | "conservation"
  | "gap"
  | "coverage"
  | "entropy"
  | "ambiguity";

export function columnMetricAtIndex(
  store: ColumnStatsStoreV1,
  index: number,
  metric: ColumnMetric | MsaTrackId
): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= store.length) {
    return null;
  }
  const totalRows = store.totalRows;
  const canonical = store.canonicalCounts[index];
  if (metric === "conservation") {
    return canonical > 0 ? store.dominantCounts[index] / canonical : null;
  }
  if (metric === "gap") {
    return fraction(store.gapCounts[index], totalRows);
  }
  if (metric === "coverage") {
    return fraction(
      canonical + store.ambiguityCounts[index] + store.unknownCounts[index],
      totalRows
    );
  }
  if (metric === "ambiguity") {
    return fraction(store.ambiguityCounts[index], totalRows);
  }
  const entropy = store.entropyBits[index];
  return Number.isNaN(entropy) ? null : entropy / 2;
}

export function columnColorContextAtPosition(
  store: ColumnStatsStoreV1,
  position: number
) {
  const index = position - 1;
  const conservation = columnMetricAtIndex(store, index, "conservation");
  if (index < 0 || index >= store.length) return null;
  return {
    dominantBase: store.canonicalCounts[index] > 0
      ? store.majorityConsensus[index] ?? ""
      : "",
    conservation
  };
}

export function materializeColumnStatsForPositions(
  store: ColumnStatsStoreV1,
  positions: ArrayLike<number>
) {
  const columns: ColumnStats[] = [];
  for (let index = 0; index < positions.length; index += 1) {
    const column = columnStatsAtPosition(store, positions[index]);
    if (column) columns.push(column);
  }
  return columns;
}

export function materializeAllColumnStats(store: ColumnStatsStoreV1) {
  return Array.from({ length: store.length }, (_unused, index) =>
    columnStatsAtIndex(store, index)!
  );
}

export function columnStatsStoreTransferables(store: ColumnStatsStoreV1) {
  const buffers = new Set<ArrayBuffer>();
  for (const key of STORE_ARRAY_KEYS) {
    const buffer = store[key].buffer;
    if (buffer instanceof ArrayBuffer) buffers.add(buffer);
  }
  return Array.from(buffers);
}

export function columnStatsStoreByteLength(store: ColumnStatsStoreV1) {
  const buffers = columnStatsStoreTransferables(store);
  return buffers.reduce((total, buffer) => total + buffer.byteLength, 0) +
    (store.majorityConsensus.length + store.iupacConsensus.length) * 2;
}

export function identityColumnPositionView(length: number): ColumnPositionView {
  return { kind: "identity", length: Math.max(0, Math.trunc(length)) };
}

export function filteredColumnPositionView(
  positions: Iterable<number>
): ColumnPositionView {
  const normalized = Array.from(positions, (position) => Math.trunc(position))
    .filter((position) => position > 0)
    .sort((left, right) => left - right);
  const unique = normalized.filter((position, index) =>
    index === 0 || position !== normalized[index - 1]
  );
  return {
    kind: "filtered",
    positions: Uint32Array.from(unique),
    length: unique.length
  };
}

export function positionAt(
  view: ColumnPositionView,
  visibleIndex: number
) {
  if (!Number.isInteger(visibleIndex) || visibleIndex < 0 || visibleIndex >= view.length) {
    return undefined;
  }
  return view.kind === "identity"
    ? visibleIndex + 1
    : view.positions[visibleIndex];
}

export function visibleIndexOfPosition(
  view: ColumnPositionView,
  alignmentPosition: number
) {
  const target = Math.trunc(alignmentPosition);
  if (view.kind === "identity") {
    return target >= 1 && target <= view.length ? target - 1 : -1;
  }
  let low = 0;
  let high = view.positions.length - 1;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    const value = view.positions[middle];
    if (value === target) return middle;
    if (value < target) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

export function lowerBoundVisibleIndex(
  view: ColumnPositionView,
  alignmentPosition: number
) {
  if (view.length === 0) return -1;
  const target = Math.trunc(alignmentPosition);
  if (view.kind === "identity") {
    return Math.min(view.length - 1, Math.max(0, target - 1));
  }
  let low = 0;
  let high = view.positions.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (view.positions[middle] < target) low = middle + 1;
    else high = middle;
  }
  return Math.min(Math.max(0, low), view.positions.length - 1);
}

export function materializePositionArray(view: ColumnPositionView) {
  return view.kind === "identity"
    ? Array.from({ length: view.length }, (_unused, index) => index + 1)
    : Array.from(view.positions);
}
