// Deliberately synthetic test fixture. Never imported by production code.
import { availableMetric, absentMetric, emptySnapshot } from "./fixtures";
import { metricKeys, type BenchmarkBatch, type BenchmarkResult, type BenchmarkSnapshot } from "../model";

export function repairSnapshot(): BenchmarkSnapshot {
  const snapshot = emptySnapshot();
  snapshot.schema_version = 2;
  snapshot.catalog.status = "frozen";
  const targets = [
    ...["sim70", "sim75", "sim80", "sim85"].map(id => ["halign3", id]),
    ...["16s10k", "mt100", "mt1k", "mt10k", "rna1023", "rna2047", "rna4095", "rna8191"].map(id => ["halign4", id]),
    ...["mt100", "mt1k", "mt10k"].map(id => ["minipoa", id]),
  ];
  snapshot.catalog.datasets = [...new Set(targets.map(pair => pair[1]))].map(id => ({
    ...snapshot.catalog.datasets[0], id, preprocessing: null, reference: !id.startsWith("mt"),
  }));
  function result(method: BenchmarkResult["method_id"], dataset: string, value: number): BenchmarkResult {
    const reference = snapshot.catalog.datasets.find(entry => entry.id === dataset)!.reference;
    return { method_id: method, dataset_id: dataset, status: "complete", reason_code: null, valid_repeats: 1, planned_repeats: 1,
      metrics: Object.fromEntries(metricKeys.map(key => [key, ["q", "tc"].includes(key)
        ? reference ? availableMetric(.9, 1, 1) : absentMetric("no_reference", 1)
        : availableMetric(key === "max_rss_kib" ? 2048 : value, 1, 1)])) as BenchmarkResult["metrics"] };
  }
  const conditions: NonNullable<BenchmarkBatch["conditions"]> = { cpu_limit:4, memory_limit_gib:16, alignment_timeout_seconds:1800,
    scorer_timeout_seconds:1800, workspace_limit_gib:8, output_limit_gib:1, log_limit_mib:8, pids_limit:512,
    workspace_mode:"bounded_tmpfs", serial:true, shared_host:true };
  const baseline: BenchmarkBatch = { id:"test-baseline", created_at:"2026-10-27T00:00:00Z", dataset_id:snapshot.catalog.id,
    dataset_version:snapshot.catalog.version, environment:{id:"test-env", label:"Test environment", cpu:"Test CPU", os:"Test OS", memory_gib:64},
    threads:4, repeats:1, conditions, scoring:{id:"test-scoring", label:"Test scoring"},
    methods:snapshot.methods.map(method => ({method_id:method.id, version:"test-original", commit:null, parameters:[]})),
    results:snapshot.catalog.datasets.flatMap(dataset => snapshot.methods.map(method => result(method.id, dataset.id, 10))) };
  const repair: BenchmarkBatch = {...structuredClone(baseline), id:"test-repair15", created_at:"2026-10-28T00:00:00Z",
    methods:baseline.methods.filter(method => ["halign3", "halign4", "minipoa"].includes(method.method_id)).map(method => ({...method,version:"test-repaired"})),
    results:targets.map(([method, dataset]) => result(method as BenchmarkResult["method_id"], dataset, 20)) };
  // Store baseline first to check date-based selection rather than array order.
  snapshot.batches = [baseline, repair];
  return snapshot;
}
