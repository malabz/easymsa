import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyQScoreCorrection } from "./apply-qscore-correction.mjs";

const archive = () => JSON.parse(readFileSync(new URL("../public/benchmark/snapshot.json", import.meta.url), "utf8"));
function fixture() {
  const snapshot = archive();
  snapshot.batches = snapshot.batches.filter(batch => !batch.id.includes("qscore64"));
  const batch = snapshot.batches.find(batch => batch.id === "baseline-single-20261027");
  const row = batch.results.find(result => result.method_id === "mafft" && result.dataset_id === "rna_8191");
  return { snapshot, row, manifest: { schema_version: 1, id: "qscore64-20261102", created_at: "2026-11-02T00:00:00Z",
    scoring: { id: "qscore21-u64", label: "Qscore 2.1, 64-bit residue-pair counts" },
    records: [{ batch_id: batch.id, method_id: row.method_id, dataset_id: row.dataset_id,
      previous_q: row.metrics.q.value ?? row.metrics.q.mean, q: 0.9,
      alignment_sha256: "a".repeat(64), reference_sha256: "b".repeat(64) }] } };
}

test("adds traceable Q-only revisions and preserves every source object", () => {
  const { snapshot, manifest, row } = fixture(), before = JSON.stringify(snapshot);
  const output = applyQScoreCorrection(snapshot, manifest);
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(output.snapshot.batches.slice(1), snapshot.batches);
  assert.equal(output.snapshot.batches[0].id, "baseline-single-20261027-qscore64-20261102");
  assert.deepEqual(output.provenance.batches, [{ batch_id: output.snapshot.batches[0].id,
    source_batch_id: "baseline-single-20261027", records: 1 }]);
  const corrected = output.snapshot.batches[0].results[0];
  assert.equal(corrected.metrics.q.value, 0.9);
  for (const key of Object.keys(row.metrics).filter(key => key !== "q")) assert.deepEqual(corrected.metrics[key], row.metrics[key]);
  assert.deepEqual(output.snapshot.batches[0].conditions, snapshot.batches.find(batch => batch.id === manifest.records[0].batch_id).conditions);
  assert.equal(output.snapshot.batches[0].methods.length, 1);
});

test("repairs an unavailable Q without changing the other metrics or number of valid alignments", () => {
  const { snapshot, manifest, row } = fixture();
  row.status = "partial"; row.reason_code = "scoring_failed";
  row.metrics.q = { status: "unavailable", valid_count: 0, planned_count: 1, value: null, mean: null,
    sd: null, min: null, max: null, display: null, reason_codes: ["scoring_failed"] };
  manifest.records[0].previous_q = null;
  const result = applyQScoreCorrection(snapshot, manifest).snapshot.batches[0].results[0];
  assert.equal(result.status, "complete"); assert.equal(result.reason_code, null); assert.equal(result.valid_repeats, 1);
});

for (const [name, mutate] of [
  ["stale previous Q", manifest => manifest.records[0].previous_q = -1],
  ["out of range", manifest => manifest.records[0].q = 1.01],
  ["nonfinite Q", manifest => manifest.records[0].q = NaN],
  ["unaffected dataset", manifest => manifest.records[0].dataset_id = "rna_255"],
  ["duplicate record", manifest => manifest.records.push(structuredClone(manifest.records[0]))],
  ["missing identity", manifest => manifest.records[0].alignment_sha256 = ""],
  ["server path in manifest", manifest => manifest.records[0].server_path = "/private/output"],
  ["unknown batch", manifest => manifest.records[0].batch_id = "missing"],
  ["old timestamp", manifest => manifest.created_at = "2026-01-01T00:00:00Z"],
]) test(`rejects ${name}`, () => {
  const { snapshot, manifest } = fixture(); mutate(manifest);
  assert.throws(() => applyQScoreCorrection(snapshot, manifest));
});

test("rejects duplicate revisions and failed alignments", () => {
  const { snapshot, manifest, row } = fixture();
  const once = applyQScoreCorrection(snapshot, manifest).snapshot;
  assert.throws(() => applyQScoreCorrection(once, manifest), /already exists/);
  row.status = "timeout"; row.valid_repeats = 0;
  assert.throws(() => applyQScoreCorrection(snapshot, manifest), /No valid single alignment/);
});
