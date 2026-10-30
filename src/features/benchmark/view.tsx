import type { BenchmarkBatch, BenchmarkSnapshot } from "./model";
import { emptyFilters, filterDatasets, type DatasetFilters } from "./model";
import { selectRecords, batchLabel, type ResultScope } from "./selection";
import { orderedDatasets } from "./BenchmarkMatrix";
import { words, type Locale } from "./presentation";

/** Presentation scope is derived once, then shared by counts, navigation and exports. */
export function displaySelection(snapshot: BenchmarkSnapshot, scope: ResultScope, params: URLSearchParams, datasetId?: string) {
  const records = selectRecords(snapshot, scope);
  const full = scope.mode === "latest" || params.get("all") === "1";
  const included = new Set(records.filter(row => !datasetId || row.result.dataset_id === datasetId).map(row => row.result.method_id));
  const availableMethods = snapshot.methods.filter(method => full || included.has(method.id));
  const requested = params.has("methods") ? new Set(params.get("methods")!.split(",")) : null;
  const methods = availableMethods.filter(method => !requested || requested.has(method.id));
  const filters = Object.fromEntries(Object.entries(emptyFilters).map(([key, fallback]) => [key, params.get(key) ?? fallback])) as DatasetFilters;
  if (!["all", "dna", "rna"].includes(filters.type)) filters.type = "all";
  if (!["all", "sampled", "simulated", "unconfirmed"].includes(filters.source)) filters.source = "all";
  if (!["all", "yes", "no"].includes(filters.reference)) filters.reference = "all";
  const includedDatasets = new Set(records.map(row => row.result.dataset_id));
  const datasets = orderedDatasets(filterDatasets(snapshot.catalog.datasets, filters).filter(dataset => full || includedDatasets.has(dataset.id)));
  const datasetIds = new Set(datasetId ? [datasetId] : datasets.map(dataset => dataset.id));
  const methodIds = new Set(methods.map(method => method.id));
  const visibleRecords = records.filter(row => datasetIds.has(row.result.dataset_id) && methodIds.has(row.result.method_id));
  return {records, visibleRecords, datasets, methods, availableMethods, filters, full};
}

export function changeScope(params: URLSearchParams, value: string) {
  const next = new URLSearchParams(params);
  if (value === "latest") { next.delete("batch"); next.set("scope", "latest"); }
  else { next.set("batch", value); next.delete("scope"); }
  return next;
}

export function MethodFilter({ methods, selected, onChange, locale, open, onOpenChange }: {
  methods: BenchmarkSnapshot["methods"]; selected: string[]; onChange: (value: string) => void; locale: Locale;
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  return <details className="benchmark-method-filter" open={open} onKeyDown={event => {
    if (event.key === "Escape") { event.preventDefault(); if (onOpenChange) onOpenChange(false); else event.currentTarget.open = false; event.currentTarget.querySelector("summary")?.focus(); }
  }}><summary onClick={onOpenChange ? event => { event.preventDefault(); onOpenChange(!open); } : undefined}>{words(locale, "Methods", "方法")} <span>{selected.length} / {methods.length}</span></summary>
    <div role="group" aria-label={words(locale, "Select methods", "选择方法")}>
      <button type="button" onClick={() => onChange("")}>{words(locale, "Select all methods", "选择全部方法")}</button>
      {methods.map(method => <label key={method.id}><input type="checkbox" checked={selected.includes(method.id)} onChange={event => {
        const ids = event.target.checked ? [...selected, method.id] : selected.filter(id => id !== method.id);
        onChange(ids.length === methods.length ? "" : ids.join(",") || "none");
      }} />{method.name}</label>)}
    </div>
  </details>;
}

export function SourceLegend({ batches, locale }: {batches: BenchmarkBatch[]; locale: Locale; latest: boolean}) {
  return <div className="benchmark-source-legend" data-testid="source-legend">
    {batches.map(batch => <span className="benchmark-source-tag" key={batch.id} title={batch.id}>{batchLabel(batch, locale)}</span>)}
  </div>;
}

export function uniqueSources(records: ReturnType<typeof selectRecords>) {
  return [...new Map(records.map(record => [record.batch.id, record.batch])).values()];
}
