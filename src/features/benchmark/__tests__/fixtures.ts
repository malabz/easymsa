// Test-only scores. This module is never imported by a production entrypoint.
import { metricKeys, type BenchmarkBatch, type BenchmarkMetric, type BenchmarkSnapshot, type MetricKey } from "../model";

export function emptySnapshot(): BenchmarkSnapshot {
  return { schema_version: 1, catalog: { id: "test-catalog", version: "test-v1", status: "draft", created_at: "2026-10-27T00:00:00Z", sources: [{ id: "source", title: "Test source", url: "https://example.org/data" }], datasets: [
    { id: "case_ref", sequence_type: "dna", source_kind: "simulated", source_id: "source", sequence_count: 100, min_length: 10, max_length: 20, reference: true, classification: null, validation_status: "passed", issues: [], sampling: null, similarity_label: 90 },
    { id: "case_no_ref", sequence_type: "dna", source_kind: "sampled", source_id: "source", sequence_count: 1000, min_length: 30, max_length: 40, reference: false, classification: null, validation_status: "requires_review", issues: [{ code: "non_iupac_colon", count: 411 }], sampling: { seed: 20262026, with_replacement: true }, similarity_label: null },
    { id: "case_rna", sequence_type: "rna", source_kind: "unconfirmed", source_id: "source", sequence_count: 255, min_length: 15, max_length: 18, reference: true, classification: null, validation_status: "passed", issues: [], sampling: null, similarity_label: null }
  ] }, methods: [{ id: "clustalo", name: "Clustal Omega" }, { id: "tcoffee", name: "T-Coffee" }, { id: "mafft", name: "MAFFT" }, { id: "muscle5", name: "MUSCLE 5" }, { id: "kalign3", name: "Kalign 3" }, { id: "halign3", name: "HAlign 3" }, { id: "halign4", name: "HAlign 4" }, { id: "fmalign2", name: "FMAlign2" }, { id: "minipoa", name: "minipoa" }], batches: [] };
}
export function availableMetric(value: number, count = 3, planned = 3): BenchmarkMetric {
  return { status: count === planned ? "complete" : "partial", valid_count: count, planned_count: planned, value, mean: value, sd: null, min: value, max: value, display: "single", reason_codes: [] };
}
export function absentMetric(reason: "timeout" | "unsupported" | "execution_failed" | "not_run" | "no_reference" = "not_run", planned = 3): BenchmarkMetric {
  return { status: reason === "no_reference" ? "not_applicable" : "unavailable", valid_count: 0, planned_count: planned, value: null, mean: null, sd: null, min: null, max: null, display: null, reason_codes: [reason] };
}
export function publishedSnapshot(): BenchmarkSnapshot {
  const snapshot = emptySnapshot();
  snapshot.catalog.status = "frozen";
  snapshot.catalog.datasets.forEach(d => { d.classification = "ordinary"; });
  const makeBatch = (id: string, date: string, time: number): BenchmarkBatch => ({ id, created_at: date, dataset_id: snapshot.catalog.id, dataset_version: snapshot.catalog.version, environment: { id: "test-environment", label: "Test CPU environment", cpu: "Test CPU", os: "Test Linux", memory_gib: 8 }, threads: 1, scoring: { id: "test-scoring", label: "Test scoring rules" }, methods: snapshot.methods.map(m => ({ method_id: m.id, version: "test-1", commit: null, parameters: ["{input}", "{output}"] })), results: snapshot.methods.map((method, index) => {
    const status = index === 0 ? "complete" : index === 1 ? "partial" : index === 2 ? "timeout" : index === 3 ? "unsupported" : index === 4 ? "failed" : "not_run";
    const valid = index === 0 ? 3 : index === 1 ? 1 : 0;
    const reason = index === 2 ? "timeout" : index === 3 ? "unsupported" : index === 4 ? "execution_failed" : "not_run";
    const metrics = Object.fromEntries(metricKeys.map(key => [key, valid ? availableMetric(key === "q" || key === "tc" ? .8 : key === "max_rss_kib" ? 1024 : time + index, valid) : absentMetric(reason)])) as Record<MetricKey, BenchmarkMetric>;
    return { method_id: method.id, dataset_id: "case_ref", status, reason_code: valid ? null : reason, planned_repeats: 3, valid_repeats: valid, metrics };
  }) });
  snapshot.batches = [makeBatch("older", "2026-10-26T00:00:00Z", 10), makeBatch("newer", "2026-10-27T00:00:00Z", 20)];
  return snapshot;
}
