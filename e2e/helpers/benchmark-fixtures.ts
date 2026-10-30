// Test-only scores. This file is never imported by application code or copied into public/.
import { readFileSync } from "node:fs";
import { metricKeys, parseSnapshot, type BenchmarkMetric, type BenchmarkResult, type BenchmarkSnapshot } from "../../src/features/benchmark/model";

export function publicBenchmarkFixture(): BenchmarkSnapshot {
  const snapshot = JSON.parse(readFileSync("contracts/benchmark-empty-catalog-v1.json", "utf8")) as BenchmarkSnapshot;
  snapshot.catalog.status = "frozen";
  snapshot.catalog.version = "test-only";
  snapshot.catalog.datasets = snapshot.catalog.datasets.filter(d => ["rna_255", "dna_16s_100"].includes(d.id));
  snapshot.catalog.datasets.forEach(d => { d.classification = "ordinary"; });
  const sourceIds = new Set(snapshot.catalog.datasets.map(d => d.source_id));
  snapshot.catalog.sources = snapshot.catalog.sources.filter(s => sourceIds.has(s.id));
  const states: Record<string, BenchmarkResult["status"]> = {
    clustalo: "partial", tcoffee: "timeout", mafft: "complete", muscle5: "failed", kalign3: "unsupported",
    halign3: "not_run", halign4: "complete", fmalign2: "partial", minipoa: "complete",
  };
  snapshot.batches = ["old", "new"].map((name, batchIndex) => ({
    id: `test-${name}`, created_at: `2026-10-${25 + batchIndex}T00:00:00Z`, dataset_id: snapshot.catalog.id,
    dataset_version: snapshot.catalog.version,
    environment: {id: `test-env-${name}`, label: `Test-only ${name} environment`, cpu: "Test CPU", os: "Test Linux", memory_gib: 8},
    threads: batchIndex ? 4 : 2, scoring: {id: "test-scoring", label: "Test-only scoring"},
    methods: snapshot.methods.map(m => ({method_id: m.id, version: "test-only", commit: null, parameters: ["{input}", "{output}"]})),
    results: snapshot.catalog.datasets.flatMap(d => snapshot.methods.map((method, index): BenchmarkResult => {
      const status = states[method.id];
      const valid = status === "complete" || method.id === "fmalign2" ? 3 : status === "partial" ? 2 : 0;
      const reason = method.id === "fmalign2" ? "scoring_failed" : status === "timeout" ? "timeout" : status === "failed" ? "execution_failed" : status === "unsupported" ? "unsupported" : status === "not_run" ? "not_run" : status === "partial" ? "incomplete" : null;
      const metrics = Object.fromEntries(metricKeys.map(key => {
        const na = !d.reference && (key === "q" || key === "tc");
        const scorerFailed = method.id === "fmalign2" && ["sp_score","avg_sp","scaled_sp"].includes(key);
        let metric: BenchmarkMetric;
        if (na || !valid || scorerFailed) metric = {
          status: na ? "not_applicable" : "unavailable", valid_count: 0, planned_count: 3,
          value: null, mean: null, sd: null, min: null, max: null, display: null,
          reason_codes: [na ? "no_reference" : scorerFailed ? "scoring_failed" : reason ?? "platform_error"],
        };
        else {
          const value = key === "wall_seconds" ? (batchIndex ? 3.25 : 12.5) + index : key === "max_rss_kib" ? 1024 * (index + 2) : key === "q" || key === "tc" ? 0.75 + index / 100 : -12 - index;
          const spread = key === "wall_seconds" || key === "max_rss_kib";
          metric = {
            status: valid === 3 ? "complete" : "partial", valid_count: valid, planned_count: 3,
            value: spread ? null : value, mean: value, sd: spread ? 0.25 : null,
            min: spread ? value - 0.25 : value, max: spread ? value + 0.25 : value,
            display: spread ? "mean_sd" : "single", reason_codes: valid === 3 ? [] : ["incomplete"],
          };
        }
        return [key, metric];
      })) as BenchmarkResult["metrics"];
      return {method_id: method.id, dataset_id: d.id, status, reason_code: reason, planned_repeats: 3, valid_repeats: valid, metrics};
    })),
  }));
  return parseSnapshot(snapshot);
}
