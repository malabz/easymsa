import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { metricKeys, parseSnapshot } from "./model";
import { absentMetric, publishedSnapshot } from "./__tests__/fixtures";
import { batchLabel, batchMarker, scopeFromParams, selectRecords, selectViewSnapshot } from "./selection";

const realSnapshot = () => parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")));
const latest = { mode: "latest" } as const;
const counts = (values: string[]) => values.reduce<Record<string, number>>((all, value) => ({ ...all, [value]: (all[value] ?? 0) + 1 }), {});

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}

describe("latest benchmark observations", () => {
  it("selects all 234 pairs with real outcomes and their source batches", () => {
    const snapshot = realSnapshot();
    const records = selectRecords(snapshot, latest);
    expect(records).toHaveLength(234);
    expect(new Set(records.map(({ result }) => `${result.dataset_id}/${result.method_id}`)).size).toBe(234);
    expect(counts(records.map(({ result }) => result.status))).toEqual({ complete: 178, timeout: 22, failed: 34 });
    expect(counts(records.map(({ batch }) => batch.id))).toEqual({
      "baseline-single-20261027": 182,
      "repair15-single-20261028": 11,
      "memory32-single-20261029": 41,
    });
    for (const record of records) {
      expect(record.batch.results).toContain(record.result);
      expect(record.spec).toBe(record.batch.methods.find(method => method.method_id === record.result.method_id));
    }
  });

  it("counts only the selected RNA data rather than the whole experiment", () => {
    const snapshot = realSnapshot();
    const rna = snapshot.catalog.datasets.filter(dataset => dataset.sequence_type === "rna").map(dataset => dataset.id);
    const output = selectViewSnapshot(snapshot, latest, { datasetIds: rna });
    const results = output.batches.flatMap(batch => batch.results);
    expect(results).toHaveLength(54);
    expect(counts(results.map(result => result.status))).toEqual({ complete: 42, timeout: 11, failed: 1 });
    expect(output.catalog.datasets).toHaveLength(6);
    expect(parseSnapshot(output)).toEqual(output);
  });

  it("selects a newer failure over an older success without recovering old metrics", () => {
    const snapshot = publishedSnapshot();
    const failed = snapshot.batches[1].results[0];
    Object.assign(failed, { status: "failed", reason_code: "oom", valid_repeats: 0 });
    for (const key of metricKeys) failed.metrics[key] = absentMetric("execution_failed");
    const selected = selectRecords(snapshot, latest).find(record => record.result.method_id === failed.method_id)!;
    expect(selected.result).toBe(failed);
    expect(selected.result.metrics).toBe(failed.metrics);
    expect(selected.result.status).toBe("failed");
    for (const metric of Object.values(selected.result.metrics)) {
      expect(metric.valid_count).toBe(0);
      expect([metric.value, metric.mean, metric.min, metric.max]).toEqual([null, null, null, null]);
    }
  });

  it("keeps missing metrics in a newer partial record instead of combining batches", () => {
    const snapshot = publishedSnapshot();
    const partial = snapshot.batches[1].results[1];
    partial.metrics.q = absentMetric("execution_failed");
    const selected = selectRecords(snapshot, latest).find(record => record.result.method_id === partial.method_id)!;
    expect(selected.result).toBe(partial);
    expect(selected.result.metrics.q).toBe(partial.metrics.q);
    expect(selected.result.metrics.q.mean).toBeNull();
    expect(selected.result.metrics.wall_seconds.mean).toBe(21);
  });

  it("orders actual instants across timezones and resolves equal instants by ID", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[0].created_at = "2026-10-27T08:30:00+09:00";
    snapshot.batches[1].created_at = "2026-10-27T00:00:00Z";
    expect(selectRecords(snapshot, latest).every(record => record.batch.id === "newer")).toBe(true);
    snapshot.batches[0].created_at = "2026-10-27T08:00:00+08:00";
    snapshot.batches[0].id = "z-batch";
    snapshot.batches[1].id = "a-batch";
    expect(selectRecords(snapshot, latest).every(record => record.batch.id === "z-batch")).toBe(true);
    snapshot.batches.reverse();
    expect(selectRecords(snapshot, latest).every(record => record.batch.id === "z-batch")).toBe(true);
  });

  it("ignores other dataset versions and never falls back for an unknown batch", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].dataset_version = "future-data";
    expect(selectRecords(snapshot, latest).every(record => record.batch.id === "older")).toBe(true);
    expect(selectRecords(snapshot, { mode: "batch", batchId: "newer" })).toEqual([]);
    expect(selectRecords(snapshot, { mode: "batch", batchId: "missing" })).toEqual([]);
    expect(selectViewSnapshot(snapshot, { mode: "batch", batchId: "missing" }).batches).toEqual([]);
  });
});

describe("traceable filtered exports", () => {
  it("retains all seven values, original batch metadata and schema-valid public identities", () => {
    const snapshot = realSnapshot();
    const output = selectViewSnapshot(snapshot, latest);
    expect(output.batches.map(batch => batch.id)).toEqual(snapshot.batches.map(batch => batch.id));
    expect(output.methods).toBe(snapshot.methods);
    expect(output.batches.flatMap(batch => batch.results)).toHaveLength(234);
    for (const batch of output.batches) {
      const original = snapshot.batches.find(source => source.id === batch.id)!;
      expect({ ...batch, results: [] }).toEqual({ ...original, results: [] });
      for (const result of batch.results) {
        expect(result).toBe(original.results.find(source => source.method_id === result.method_id && source.dataset_id === result.dataset_id));
        expect(Object.keys(result.metrics).sort()).toEqual([...metricKeys].sort());
      }
    }
    expect(parseSnapshot(output)).toEqual(output);
  });

  it("combines dataset and method filters without exporting excluded source observations", () => {
    const snapshot = realSnapshot();
    const output = selectViewSnapshot(snapshot, latest, {
      datasetIds: ["dna_mt_sim_70", "rna_255"], methodIds: ["halign3", "mafft"],
    });
    expect(output.catalog.datasets.map(dataset => dataset.id)).toEqual(["dna_mt_sim_70", "rna_255"]);
    expect(output.catalog.sources.map(source => source.id).sort()).toEqual(
      [...new Set(output.catalog.datasets.map(dataset => dataset.source_id))].sort());
    expect(output.batches.map(batch => batch.id)).toEqual(["memory32-single-20261029", "baseline-single-20261027"]);
    expect(output.batches.flatMap(batch => batch.results)).toHaveLength(4);
    expect(output.batches.flatMap(batch => batch.results).every(result => ["halign3", "mafft"].includes(result.method_id))).toBe(true);
    expect(parseSnapshot(output)).toEqual(output);
  });

  it("keeps an explicit empty batch but omits empty latest-source batches", () => {
    const snapshot = realSnapshot();
    const batchId = "memory32-single-20261029";
    const excluded = selectViewSnapshot(snapshot, { mode: "batch", batchId }, { datasetIds: ["rna_255"] });
    expect(excluded.batches.map(batch => batch.id)).toEqual([batchId]);
    expect(excluded.batches[0].results).toEqual([]);
    expect(parseSnapshot(excluded)).toEqual(excluded);
    for (const filters of [{ datasetIds: [] }, { methodIds: [] }, { datasetIds: ["missing"] }, { methodIds: ["missing"] }]) {
      const output = selectViewSnapshot(snapshot, latest, filters);
      expect(output.batches).toEqual([]);
      expect(parseSnapshot(output)).toEqual(output);
    }
  });

  it("preserves complete historical batches and never mutates the source snapshot", () => {
    const snapshot = freeze(realSnapshot());
    const before = JSON.stringify(snapshot);
    for (const batch of snapshot.batches) {
      const output = selectViewSnapshot(snapshot, { mode: "batch", batchId: batch.id });
      expect(output.batches).toEqual([batch]);
      expect(output.batches[0].results).toEqual(batch.results);
    }
    selectViewSnapshot(snapshot, latest, { datasetIds: ["dna_mt_sim_70"], methodIds: ["halign3"] });
    expect(JSON.stringify(snapshot)).toBe(before);
  });
});

describe("scope links and source names", () => {
  it.each([
    ["", { mode: "latest" }],
    ["metric=q", { mode: "latest" }],
    ["batch=baseline-single-20261027", { mode: "batch", batchId: "baseline-single-20261027" }],
    ["scope=latest&batch=baseline-single-20261027", { mode: "latest" }],
    ["scope=batch&batch=missing", { mode: "batch", batchId: "missing" }],
    ["batch=", { mode: "latest" }],
  ])("resolves %s without silently replacing an explicit batch", (query, expected) => {
    expect(scopeFromParams(new URLSearchParams(query))).toEqual(expected);
  });

  it("uses friendly bilingual names with actual limits and a distinct marker per known source", () => {
    const snapshot = realSnapshot();
    const expected = [
      ["memory32-single-20261029", "内存重测 · 32 GiB", "Memory retry · 32 GiB", "triangle"],
      ["repair15-single-20261028", "适配修复 · 16 GiB", "Adapter repair · 16 GiB", "square"],
      ["baseline-single-20261027", "基线 · 16 GiB", "Baseline · 16 GiB", "circle"],
    ];
    for (const [id, zh, en, marker] of expected) {
      const batch = snapshot.batches.find(batch => batch.id === id)!;
      expect(batchLabel(batch, "zh")).toBe(zh);
      expect(batchLabel(batch, "en")).toBe(en);
      expect(batchMarker(batch)).toBe(marker);
    }
    const future = { ...snapshot.batches[0], id: "future-batch" };
    expect(batchLabel(future, "en")).toBe("future-batch · 32 GiB");
    expect(batchMarker(future)).toBe("diamond");
    const old = publishedSnapshot().batches[0];
    expect(batchLabel(old, "en")).toBe("older");
  });
});
