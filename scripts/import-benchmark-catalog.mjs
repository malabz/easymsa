/** Import only the reviewed dna-rna-v1 metadata; never sequence files or scores. */
import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const [statsPath, manifestPath, outputArg] = process.argv.slice(2);
if (!statsPath || !manifestPath) {
  console.error("Usage: node scripts/import-benchmark-catalog.mjs STATS_JSON MANIFEST_YAML [OUTPUT_JSON]");
  process.exit(2);
}
const provenance = JSON.parse(readFileSync(new URL("./benchmark-catalog-provenance.json", import.meta.url), "utf8"));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const statsBytes = readFileSync(statsPath), manifestBytes = readFileSync(manifestPath);
if (hash(statsBytes) !== provenance.stats_sha256 || hash(manifestBytes) !== provenance.manifest_sha256) {
  throw new Error("Dataset metadata differs from the reviewed source. Review and version the catalog before importing.");
}
const stats = JSON.parse(statsBytes);
const datasets = stats.cases.map(c => {
  const meta = provenance.datasets[c.id];
  if (!meta) throw new Error(`Unreviewed dataset: ${c.id}`);
  return {
    id: c.id, sequence_type: c.sequence_type, source_kind: meta.source_kind, source_id: meta.source_id,
    sequence_count: c.input.sequence_count, min_length: c.input.min_length, max_length: c.input.max_length,
    reference: c.reference !== null, classification: null, validation_status: c.validation_status,
    issues: c.issues.map(issue => {
      if (issue.code !== "non_iupac_colon_preserved") throw new Error(`Unreviewed issue in ${c.id}`);
      return {code: "non_iupac_colon", count: issue.count};
    }),
    sampling: meta.sampling, similarity_label: meta.similarity_label,
  };
});
if (datasets.length !== Object.keys(provenance.datasets).length || new Set(datasets.map(d => d.id)).size !== datasets.length) {
  throw new Error("Dataset catalog coverage differs from reviewed metadata");
}
const snapshot = {
  schema_version: 1,
  catalog: { id: stats.dataset_id, version: provenance.version, status: "draft", created_at: stats.generated_at,
    sources: provenance.sources, datasets },
  methods: [
    {id: "clustalo", name: "Clustal Omega"}, {id: "tcoffee", name: "T-Coffee"},
    {id: "mafft", name: "MAFFT"}, {id: "muscle5", name: "MUSCLE 5"},
    {id: "kalign3", name: "Kalign 3"}, {id: "halign3", name: "HAlign 3"},
    {id: "halign4", name: "HAlign 4"}, {id: "fmalign2", name: "FMAlign2"}, {id: "minipoa", name: "minipoa"},
  ],
  batches: [],
};
const output = outputArg ? resolve(outputArg) : resolve(root, "public/benchmark/snapshot.json");
if (existsSync(output) && JSON.parse(readFileSync(output, "utf8")).batches?.length) {
  throw new Error("Refusing to replace published batches with a catalog-only snapshot. Choose a new output path.");
}
mkdirSync(dirname(output), {recursive: true});
const temporary = `${output}.${process.pid}.tmp`;
try {
  writeFileSync(temporary, JSON.stringify(snapshot, null, 2) + "\n", {flag: "wx"});
  renameSync(temporary, output);
} catch (error) {
  try { unlinkSync(temporary); } catch { /* Preserve the original error. */ }
  throw error;
}
console.log(`Imported ${datasets.length} reviewed datasets, ${snapshot.methods.length} methods, 0 result batches.`);
