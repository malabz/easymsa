import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const affectedDatasets = new Set(["rna_4095", "rna_8191"]);
const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]{0,159}$/;
const sha256 = /^[a-f0-9]{64}$/;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const exactKeys = (value, keys, label) => requireValue(value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("|") === [...keys].sort().join("|"), `Invalid ${label} fields`);

/** Publish a Q-only scoring revision without changing the original observations. */
export function applyQScoreCorrection(snapshot, manifest) {
  exactKeys(manifest, ["schema_version", "id", "created_at", "scoring", "records"], "correction manifest");
  requireValue(manifest.schema_version === 1 && identifier.test(manifest.id), "Invalid correction identity");
  requireValue(typeof manifest.created_at === "string" && Number.isFinite(Date.parse(manifest.created_at)), "Invalid correction timestamp");
  exactKeys(manifest.scoring, ["id", "label"], "scoring identity");
  requireValue(identifier.test(manifest.scoring.id) && typeof manifest.scoring.label === "string"
    && manifest.scoring.label.trim() && !/[\x00-\x1f]/.test(manifest.scoring.label), "Invalid scoring identity");
  requireValue(snapshot.schema_version === 2 && Array.isArray(snapshot.batches), "Expected a public v2 snapshot");
  requireValue(Array.isArray(manifest.records) && manifest.records.length > 0, "No corrected records");
  const sourceBatches = new Map(snapshot.batches.map(batch => [batch.id, batch]));
  const grouped = new Map(), seen = new Set();
  for (const entry of manifest.records) {
    exactKeys(entry, ["batch_id", "method_id", "dataset_id", "previous_q", "q", "alignment_sha256", "reference_sha256"], "correction record");
    requireValue(affectedDatasets.has(entry.dataset_id), "Correction must target an overflow-affected dataset");
    requireValue(Number.isFinite(entry.q) && entry.q >= 0 && entry.q <= 1, "Corrected Q must lie in [0, 1]");
    requireValue(sha256.test(entry.alignment_sha256) && sha256.test(entry.reference_sha256), "Missing alignment/reference identity");
    const key = `${entry.batch_id}/${entry.dataset_id}/${entry.method_id}`;
    requireValue(!seen.has(key), `Duplicate correction: ${key}`); seen.add(key);
    const source = sourceBatches.get(entry.batch_id);
    requireValue(source && source.dataset_version === snapshot.catalog.version, `Unknown source batch: ${entry.batch_id}`);
    requireValue(Date.parse(manifest.created_at) > Date.parse(source.created_at), "Scoring revision must follow the source observation");
    requireValue(manifest.scoring.id !== source.scoring.id, "A corrected scorer needs its own identity");
    const original = source.results.find(row => row.dataset_id === entry.dataset_id && row.method_id === entry.method_id);
    requireValue(original && ["complete", "partial"].includes(original.status)
      && original.valid_repeats === 1 && original.planned_repeats === 1, `No valid single alignment: ${key}`);
    const previous = original.metrics.q.value ?? original.metrics.q.mean;
    requireValue(previous === entry.previous_q, `Original Q changed: ${key}`);
    requireValue(["complete", "unavailable"].includes(original.metrics.q.status), `Unsupported Q coverage: ${key}`);
    requireValue(original.metrics.q.status !== "unavailable" || original.metrics.q.reason_codes.every(reason => reason === "scoring_failed"), `Q unavailable for a different reason: ${key}`);
    const corrected = structuredClone(original);
    corrected.metrics.q = { status: "complete", valid_count: 1, planned_count: 1,
      value: entry.q, mean: entry.q, sd: null, min: entry.q, max: entry.q, display: "single", reason_codes: [] };
    if (Object.values(corrected.metrics).every(metric => ["complete", "not_applicable"].includes(metric.status))) {
      corrected.status = "complete"; corrected.reason_code = null;
    }
    const rows = grouped.get(source.id) ?? [];
    rows.push(corrected); grouped.set(source.id, rows);
  }
  const revisions = [], parents = [];
  for (const source of snapshot.batches) {
    const rows = grouped.get(source.id);
    if (!rows) continue;
    const id = `${source.id}-${manifest.id}`;
    requireValue(identifier.test(id) && !sourceBatches.has(id), `Scoring revision already exists or ID too long: ${id}`);
    const includedMethods = new Set(rows.map(row => row.method_id));
    revisions.push({ ...structuredClone(source), id, created_at: manifest.created_at,
      scoring: structuredClone(manifest.scoring),
      methods: structuredClone(source.methods.filter(method => includedMethods.has(method.method_id))), results: rows });
    parents.push({ batch_id: id, source_batch_id: source.id, records: rows.length });
  }
  const output = { ...structuredClone(snapshot), batches: [...revisions, ...structuredClone(snapshot.batches)] };
  const provenance = { ...structuredClone(manifest), batches: parents,
    source_snapshot_normalized_sha256: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") };
  return { snapshot: output, provenance };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    requireValue(["--snapshot", "--manifest", "--output", "--provenance"].includes(args[index])
      && args[index + 1] && !values.has(args[index]), "Usage: node scripts/apply-qscore-correction.mjs --snapshot SOURCE --manifest MANIFEST --output NEW_SNAPSHOT --provenance NEW_PROVENANCE");
    values.set(args[index], resolve(args[index + 1]));
  }
  requireValue(values.size === 4 && new Set(values.values()).size === 4, "Use four distinct input/output paths");
  const original = JSON.parse(readFileSync(values.get("--snapshot"), "utf8"));
  const manifest = JSON.parse(readFileSync(values.get("--manifest"), "utf8"));
  const output = applyQScoreCorrection(original, manifest);
  writeFileSync(values.get("--output"), `${JSON.stringify(output.snapshot, null, 2)}\n`, { flag: "wx" });
  writeFileSync(values.get("--provenance"), `${JSON.stringify(output.provenance, null, 2)}\n`, { flag: "wx" });
  console.log(`Added ${output.provenance.batches.length} scoring revisions; corrected ${manifest.records.length} Q values. Original batches retained.`);
}
