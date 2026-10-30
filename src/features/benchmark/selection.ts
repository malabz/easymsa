import type { BenchmarkBatch, BenchmarkResult, BenchmarkSnapshot } from "./model";

export type ResultScope = { mode: "latest" } | { mode: "batch"; batchId: string };
export type SourcedResult = {
  result: BenchmarkResult;
  batch: BenchmarkBatch;
  spec: BenchmarkBatch["methods"][number] | undefined;
};

/** Old batch links remain explicit; the unqualified entry now shows latest records. */
export function scopeFromParams(params: URLSearchParams): ResultScope {
  const batchId = params.get("batch");
  return params.get("scope") !== "latest" && batchId
    ? { mode: "batch", batchId }
    : { mode: "latest" };
}

function currentBatches(snapshot: BenchmarkSnapshot) {
  return snapshot.batches.filter(batch => batch.dataset_id === snapshot.catalog.id && batch.dataset_version === snapshot.catalog.version);
}

/** Resolve an entire observation, never the best score or a metric-by-metric fallback. */
export function selectRecords(snapshot: BenchmarkSnapshot, scope: ResultScope): SourcedResult[] {
  const batches = currentBatches(snapshot).filter(batch => scope.mode === "latest" || batch.id === scope.batchId);
  batches.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
    || (a.id === b.id ? 0 : a.id > b.id ? -1 : 1));
  const records = new Map<string, SourcedResult>();
  for (const batch of batches) {
    const specs = new Map(batch.methods.map(spec => [spec.method_id, spec]));
    for (const result of batch.results) {
      const key = `${result.dataset_id}/${result.method_id}`;
      if (!records.has(key)) records.set(key, { result, batch, spec: specs.get(result.method_id) });
    }
  }
  return [...records.values()];
}

export type ViewFilters = { datasetIds?: string[]; methodIds?: string[] };

/** Export only selected observations, with the original public batch identities intact. */
export function selectViewSnapshot(snapshot: BenchmarkSnapshot, scope: ResultScope, filters: ViewFilters = {}): BenchmarkSnapshot {
  const datasetIds = filters.datasetIds === undefined ? undefined : new Set(filters.datasetIds);
  const methodIds = filters.methodIds === undefined ? undefined : new Set(filters.methodIds);
  const datasets = snapshot.catalog.datasets.filter(dataset => !datasetIds || datasetIds.has(dataset.id));
  const includedDatasets = new Set(datasets.map(dataset => dataset.id));
  const sources = new Set(datasets.map(dataset => dataset.source_id));
  const selected = new Set(selectRecords(snapshot, scope)
    .filter(({ result }) => includedDatasets.has(result.dataset_id) && (!methodIds || methodIds.has(result.method_id)))
    .map(({ result }) => result));
  // Preserve source ordering and metadata so downloaded rows can be traced back
  // directly to the formal snapshot. A latest view is not a new experiment.
  const batches = currentBatches(snapshot)
    .filter(batch => scope.mode === "latest" || batch.id === scope.batchId)
    .map(batch => ({ ...batch, results: batch.results.filter(result => selected.has(result)) }))
    .filter(batch => scope.mode === "batch" || batch.results.length > 0);
  return {
    ...snapshot,
    catalog: { ...snapshot.catalog, datasets, sources: snapshot.catalog.sources.filter(source => sources.has(source.id)) },
    batches,
  };
}

const batchNames: Record<string, { en: string; zh: string; marker: BatchMarker }> = {
  "baseline-single-20261027": { en: "Baseline", zh: "基线", marker: "circle" },
  "repair15-single-20261028": { en: "Adapter repair", zh: "适配修复", marker: "square" },
  "memory32-single-20261029": { en: "Memory retry", zh: "内存重测", marker: "triangle" },
};
export type BatchMarker = "circle" | "square" | "triangle" | "diamond";

/** Friendly display labels do not replace the stored batch IDs or conditions. */
export function batchLabel(batch: BenchmarkBatch, locale: "en" | "zh"): string {
  const name = batchNames[batch.id]?.[locale] ?? batch.id;
  return batch.conditions ? `${name} · ${batch.conditions.memory_limit_gib} GiB` : name;
}

export function batchMarker(batch: BenchmarkBatch): BatchMarker {
  return batchNames[batch.id]?.marker ?? "diamond";
}
