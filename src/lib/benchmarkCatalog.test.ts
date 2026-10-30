import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseSnapshot } from "../features/benchmark/model";

const raw = readFileSync("public/benchmark/snapshot.json", "utf8");
const snapshot = parseSnapshot(JSON.parse(raw));

describe("reviewed dna-rna-v1 public catalog", () => {
  it("publishes the real 26-case catalog without fabricated performance scores", () => {
    expect(snapshot.catalog.id).toBe("dna-rna-v1");
    expect(snapshot.catalog.status).toBe("frozen");
    expect(snapshot.schema_version).toBe(2);
    expect(snapshot.catalog.version).toBe("frozen-colon-n-20261027");
    expect(snapshot.catalog.datasets).toHaveLength(26);
    expect(snapshot.catalog.datasets.filter(d => d.sequence_type === "dna")).toHaveLength(20);
    expect(snapshot.catalog.datasets.filter(d => d.sequence_type === "rna")).toHaveLength(6);
    expect(snapshot.catalog.datasets.filter(d => d.reference)).toHaveLength(20);
    expect(snapshot.catalog.datasets.every(d => d.classification === null)).toBe(true);
    expect(snapshot.methods.map(m => m.id)).toEqual([
      "clustalo", "tcoffee", "mafft", "muscle5", "kalign3", "halign3", "halign4", "fmalign2", "minipoa",
    ]);
    for (const batch of snapshot.batches) {
      expect(batch.repeats).toBe(1);
      expect(batch.conditions).toMatchObject({cpu_limit:4, memory_limit_gib:batch.id === "memory32-single-20261029" ? 32 : 16, alignment_timeout_seconds:1800, serial:true, shared_host:true});
      expect(batch.results.every(r => r.planned_repeats === 1)).toBe(true);
      expect(batch.methods.every(m => !m.version.includes("test-only"))).toBe(true);
    }
    expect(raw).not.toMatch(/\/opt\/|\/mnt\/|[A-Z]:\\|private_key|password|access_token|raw_output_path/);
  });

  it("preserves both earlier batches byte-for-byte after JSON normalization", () => {
    const original = JSON.parse(raw) as {batches: {id:string}[]};
    const hashes = {
      "baseline-single-20261027": "fc6875ed1c3221308d95871684254ac97c44e0fbc9ba5ccc2153d76828c171fe",
      "repair15-single-20261028": "09871a79cf75ddf516b5419b4cc031d5c1ac9c0a02d096ef41b7f075790f85ca",
    };
    for (const [id, hash] of Object.entries(hashes)) {
      const batch = original.batches.find(batch => batch.id === id);
      expect(batch).toBeDefined();
      expect(createHash("sha256").update(JSON.stringify(batch)).digest("hex")).toBe(hash);
    }
  });

  it("publishes exactly the 41 memory retries with their real outcomes and 28 GiB Java heap", () => {
    expect(snapshot.batches.map(batch => batch.id)).toEqual([
      "memory32-single-20261029", "repair15-single-20261028", "baseline-single-20261027",
    ]);
    const batch = snapshot.batches[0];
    const simulations = [70,75,80,85,90,91,92,93,94,95,96,97,98,99].map(n => `dna_mt_sim_${n}`);
    const samples = ["dna_mt_100", "dna_mt_1k", "dna_mt_10k"];
    const pairs = [
      ...[...simulations, ...samples, "dna_16s_10k", "rna_4095", "rna_8191"].map(id => `tcoffee/${id}`),
      ...[...simulations, ...samples].map(id => `muscle5/${id}`),
      ...simulations.slice(0,4).map(id => `halign3/${id}`),
    ];
    expect(batch.results.map(result => `${result.method_id}/${result.dataset_id}`).sort()).toEqual(pairs.sort());
    expect(new Set(batch.results.map(result => result.dataset_id)).size).toBe(20);
    expect(batch.results.filter(result => result.status === "complete")).toHaveLength(4);
    expect(batch.results.filter(result => result.reason_code === "oom")).toHaveLength(34);
    expect(batch.results.filter(result => result.status === "timeout").map(result => `${result.method_id}/${result.dataset_id}`).sort())
      .toEqual(["muscle5/dna_mt_sim_70", "muscle5/dna_mt_sim_75", "tcoffee/rna_4095"]);
    expect(batch.methods.find(method => method.method_id === "halign3")?.parameters.slice(0,3)).toEqual(["java", "-Xmx28g", "-jar"]);
    for (const result of batch.results) for (const metric of Object.values(result.metrics)) {
      expect(metric.sd).toBeNull();
      if (result.status === "complete") {
        expect(result.method_id).toBe("halign3");
        expect(metric).toMatchObject({status:"complete", valid_count:1, planned_count:1, display:"single"});
      } else {
        expect(metric.valid_count).toBe(0);
        expect([metric.value, metric.mean, metric.min, metric.max]).toEqual([null, null, null, null]);
      }
    }
  });

  it("retains the full baseline and publishes exactly the 15 declared repair pairs", () => {
    const baseline = snapshot.batches.find(batch => batch.id === "baseline-single-20261027")!;
    expect(baseline.results).toHaveLength(234);
    expect(baseline.results.filter(result => result.status === "complete")).toHaveLength(163);
    expect(baseline.results.filter(result => result.status === "timeout")).toHaveLength(19);
    expect(baseline.results.filter(result => result.status === "failed")).toHaveLength(52);
    const repair = snapshot.batches.find(batch => batch.id === "repair15-single-20261028")!;
    const expected = [
      ...["70", "75", "80", "85"].map(label => `halign3/dna_mt_sim_${label}`),
      ...["dna_16s_10k", "dna_mt_100", "dna_mt_1k", "dna_mt_10k", "rna_1023", "rna_2047", "rna_4095", "rna_8191"].map(id => `halign4/${id}`),
      ...["dna_mt_100", "dna_mt_1k", "dna_mt_10k"].map(id => `minipoa/${id}`),
    ];
    expect(repair.results.map(result => `${result.method_id}/${result.dataset_id}`).sort()).toEqual(expected.sort());
    expect(repair.results.filter(result => result.status === "complete")).toHaveLength(11);
    expect(repair.results.filter(result => result.status === "failed")).toHaveLength(4);
  });

  it("keeps independently recorded scale, length, reference and source distinctions", () => {
    const cases = snapshot.catalog.datasets;
    expect(cases.filter(d => d.id.startsWith("dna_16s_")).map(d => [d.sequence_count, d.min_length, d.max_length, d.reference]))
      .toEqual([[100, 1282, 1560, false], [1000, 943, 1567, false], [10000, 870, 1598, false]]);
    expect(cases.filter(d => d.sequence_type === "rna").map(d => d.sequence_count)).toEqual([255, 511, 1023, 2047, 4095, 8191]);
    expect(cases.filter(d => d.source_kind === "simulated").map(d => d.similarity_label))
      .toEqual([70, 75, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
    expect(cases.filter(d => d.source_kind === "simulated").every(d => d.reference && d.sequence_count === 100)).toBe(true);
    expect(cases.filter(d => d.sequence_type === "rna").every(d => d.source_kind === "unconfirmed")).toBe(true);
    expect(cases.filter(d => d.sampling?.with_replacement).map(d => d.id)).toEqual(["dna_mt_1k", "dna_mt_10k"]);
  });

  it("reports dataset defects separately from method execution", () => {
    const processed = snapshot.catalog.datasets.filter(d => d.preprocessing);
    expect(processed.map(d => [d.id, d.preprocessing?.count])).toEqual([
      ["dna_mt_100",40], ["dna_mt_1k",411], ["dna_mt_10k",3491],
    ]);
    expect(processed.every(d => d.validation_status === "passed" && d.issues.length === 0)).toBe(true);
    expect(snapshot.catalog.sources).toHaveLength(9);
    expect(snapshot.catalog.datasets.every(d => snapshot.catalog.sources.some(s => s.id === d.source_id))).toBe(true);
  });
});
