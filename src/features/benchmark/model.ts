import { matchesDatasetName } from "./names";
import { z } from "zod";

export const metricKeys = ["wall_seconds", "max_rss_kib", "sp_score", "avg_sp", "scaled_sp", "q", "tc"] as const;
export type MetricKey = (typeof metricKeys)[number];
export const publicReasons = ["no_reference", "reference_invalid", "invalid_output", "timeout", "oom", "unsupported", "not_run", "execution_failed", "scoring_failed", "cancelled", "incomplete", "platform_error"] as const;
const id = z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const text = z.string().min(1).max(2000).refine(v => v.trim().length > 0 && !/[\x00-\x1f]/.test(v), "Expected nonempty public text without control characters");
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.string().datetime({ offset: true }).refine(v => Number.isFinite(Date.parse(v)), "Invalid date");
const number = z.number().finite().nullable();
const reason = z.enum(publicReasons);
const methodId = z.enum(["clustalo", "tcoffee", "mafft", "muscle5", "kalign3", "halign3", "halign4", "fmalign2", "minipoa"]);
const parameter = text.refine(v => !/[\\/]/.test(v) && !/[A-Za-z]:/.test(v) && (!/[{}]/.test(v) || ["{input}", "{output}", "{alignment}", "{reference}", "{adapter}", "{executable}"].includes(v)), "Only public arguments and approved path placeholders are allowed");

export const metricSchema = z.object({
  status: z.enum(["complete", "partial", "unavailable", "not_applicable"]),
  valid_count: count, planned_count: positive,
  value: number, mean: number, sd: number, min: number, max: number,
  display: z.enum(["single", "mean_sd", "mean_range"]).nullable(), reason_codes: z.array(reason)
}).strict();
export type BenchmarkMetric = z.infer<typeof metricSchema>;

const datasetSchema = z.object({
  id, sequence_type: z.enum(["dna", "rna"]), source_kind: z.enum(["sampled", "simulated", "unconfirmed"]), source_id: id,
  sequence_count: positive, min_length: positive, max_length: positive, reference: z.boolean(),
  classification: z.enum(["ordinary", "large"]).nullable(), validation_status: z.enum(["passed", "requires_review"]),
  issues: z.array(z.object({ code: z.literal("non_iupac_colon"), count: positive }).strict()).max(1),
  sampling: z.object({ with_replacement: z.boolean(), seed: count }).strict().nullable(),
  similarity_label: z.number().int().min(0).max(100).nullable(),
  preprocessing: z.object({ kind: z.literal("colon_to_n"), count: positive, original_sha256: z.string().regex(/^[a-f0-9]{64}$/), processed_sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict().nullable().optional()
}).strict();
export type BenchmarkDataset = z.infer<typeof datasetSchema>;

const resultSchema = z.object({
  method_id: methodId, dataset_id: id,
  status: z.enum(["complete", "partial", "failed", "timeout", "unsupported", "not_run"]), reason_code: reason.nullable(),
  planned_repeats: positive, valid_repeats: count,
  metrics: z.object({ wall_seconds: metricSchema, max_rss_kib: metricSchema, sp_score: metricSchema, avg_sp: metricSchema, scaled_sp: metricSchema, q: metricSchema, tc: metricSchema }).strict()
}).strict();
export type BenchmarkResult = z.infer<typeof resultSchema>;

const batchSchema = z.object({
  id, created_at: timestamp, dataset_id: id, dataset_version: id,
  environment: z.object({ id, label: text, cpu: text, os: text, memory_gib: z.number().finite().positive() }).strict(),
  threads: positive, scoring: z.object({ id, label: text }).strict(),
  methods: z.array(z.object({ method_id: methodId, version: text, commit: z.string().regex(/^[a-f0-9]{40}$/).nullable(), parameters: z.array(parameter) }).strict()).min(1),
  results: z.array(resultSchema),
  repeats: positive.max(100).optional(),
  conditions: z.object({
    cpu_limit: z.number().finite().positive(), memory_limit_gib: z.number().finite().positive(),
    alignment_timeout_seconds: z.number().finite().positive(), scorer_timeout_seconds: z.number().finite().positive(),
    workspace_limit_gib: z.number().finite().positive(), output_limit_gib: z.number().finite().positive(),
    log_limit_mib: z.number().finite().positive(), pids_limit: positive,
    workspace_mode: z.enum(["bounded_tmpfs", "writable_layer"]), serial: z.boolean(), shared_host: z.boolean()
  }).strict().optional()
}).strict();
export type BenchmarkBatch = z.infer<typeof batchSchema>;

export const snapshotSchema = z.object({
  schema_version: z.union([z.literal(1), z.literal(2)]),
  catalog: z.object({
    id, version: id, status: z.enum(["draft", "frozen"]), created_at: timestamp,
    sources: z.array(z.object({ id, title: text, url: z.string().url().refine(v => { try { const url = new URL(v); return /^https?:$/.test(url.protocol) && !url.username && !url.password; } catch { return false; } }, "Only public HTTP(S) sources without credentials are allowed") }).strict()),
    datasets: z.array(datasetSchema)
  }).strict(),
  methods: z.array(z.object({ id: methodId, name: text }).strict()), batches: z.array(batchSchema)
}).strict().superRefine((snapshot, ctx) => {
  const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
  const unique = (values: string[], label: string) => { if (new Set(values).size !== values.length) issue(`Duplicate ${label}`); };
  unique(snapshot.catalog.sources.map(s => s.id), "source");
  unique(snapshot.catalog.datasets.map(d => d.id), "dataset");
  unique(snapshot.methods.map(m => m.id), "method");
  unique(snapshot.batches.map(b => b.id), "batch");
  if (snapshot.batches.length && snapshot.catalog.status !== "frozen") issue("Published results require a frozen catalog");
  const sources = new Set(snapshot.catalog.sources.map(s => s.id));
  const datasets = new Map(snapshot.catalog.datasets.map(d => [d.id, d]));
  const methods = new Set(snapshot.methods.map(m => m.id));
  for (const d of snapshot.catalog.datasets) {
    if (snapshot.schema_version === 1 && d.preprocessing !== undefined || snapshot.schema_version === 2 && d.preprocessing === undefined) issue("Dataset fields disagree with schema version");
    if (!sources.has(d.source_id)) issue("Unknown data source");
    if (d.min_length > d.max_length) issue("Invalid length range");
    if (d.validation_status === "passed" && d.issues.length) issue("Passed dataset cannot have unresolved issues");
    if (d.validation_status === "requires_review" && !d.issues.length) issue("Dataset review reason required");
    if (d.similarity_label !== null && d.source_kind !== "simulated") issue("Similarity label requires simulated source");
  }
  for (const [bi, batch] of snapshot.batches.entries()) {
    if (snapshot.schema_version === 1 && (batch.repeats !== undefined || batch.conditions !== undefined) || snapshot.schema_version === 2 && (batch.repeats === undefined || batch.conditions === undefined)) issue("Batch fields disagree with schema version");
    if (batch.conditions && (batch.conditions.output_limit_gib > batch.conditions.workspace_limit_gib || batch.conditions.cpu_limit < batch.threads)) issue("Inconsistent resource conditions");
    if (batch.dataset_id !== snapshot.catalog.id || batch.dataset_version !== snapshot.catalog.version) issue("Batch data version differs from catalog", ["batches", bi]);
    unique(batch.methods.map(m => m.method_id), "batch method");
    unique(batch.results.map(r => `${r.method_id}/${r.dataset_id}`), "result");
    const batchMethods = new Set(batch.methods.map(m => m.method_id));
    for (const method of batch.methods) if (!methods.has(method.method_id)) issue("Unknown batch method");
    for (const [ri, result] of batch.results.entries()) {
      const d = datasets.get(result.dataset_id);
      const path = ["batches", bi, "results", ri];
      if (!d || !batchMethods.has(result.method_id)) issue("Unknown result dataset or method", path);
      if (snapshot.schema_version === 2) {
        if (result.planned_repeats !== batch.repeats) issue("Evaluation repeats must match the batch", path);
      } else if (d && (d.classification === null || result.planned_repeats !== (d.classification === "ordinary" ? 3 : 1))) issue("Evaluation repeats must match dataset classification", path);
      if (result.valid_repeats > result.planned_repeats) issue("Invalid repeat coverage", path);
      if (result.status === "complete" && (result.valid_repeats !== result.planned_repeats || result.reason_code !== null)) issue("Complete result requires all repetitions and no failure reason", path);
      if (result.status === "partial" && (result.valid_repeats === 0 || result.valid_repeats === result.planned_repeats && metricKeys.every(key => ["complete", "not_applicable"].includes(result.metrics[key].status)))) issue("Partial result must have valid but incomplete results", path);
      if (["failed", "timeout", "unsupported", "not_run"].includes(result.status) && result.valid_repeats !== 0) issue("Failed result cannot have valid alignments", path);
      for (const key of metricKeys) {
        const m = result.metrics[key];
        const mp = [...path, "metrics", key];
        if (new Set(m.reason_codes).size !== m.reason_codes.length) issue("Duplicate metric reason", mp);
        if (m.planned_count !== result.planned_repeats || m.valid_count > result.valid_repeats) issue("Invalid metric coverage", mp);
        const available = m.status === "complete" || m.status === "partial";
        if (m.status === "complete" && m.valid_count !== m.planned_count) issue("Incomplete metric marked complete", mp);
        if (m.status === "partial" && (m.valid_count < 1 || m.valid_count >= m.planned_count)) issue("Invalid partial metric coverage", mp);
        if (available && (m.valid_count === 0 || m.mean === null || m.min === null || m.max === null || m.display === null)) issue("Available metric lacks numeric values", mp);
        if (!available && (m.valid_count !== 0 || [m.value, m.mean, m.sd, m.min, m.max, m.display].some(v => v !== null))) issue("Unavailable metric must contain null values", mp);
        if (m.min !== null && m.max !== null && (m.min > m.max || m.mean !== null && (m.mean < m.min || m.mean > m.max))) issue("Invalid metric range", mp);
        if (m.value !== null && m.min !== null && m.max !== null && (m.value < m.min || m.value > m.max)) issue("Metric value outside range", mp);
        if (m.sd !== null && (m.sd < 0 || m.valid_count < 2)) issue("Invalid standard deviation", mp);
        if (available && m.display === "single" && (m.min !== m.mean || m.max !== m.mean || m.value !== null && m.value !== m.mean)) issue("Single metric has contradictory values", mp);
        if (available && m.display === "mean_range" && m.value !== null) issue("Mean/range metric cannot have a separate value", mp);
        if (available && m.display === "mean_sd" && (m.value !== null || m.valid_count < 2 || m.sd === null)) issue("Invalid mean/standard deviation metric", mp);
        if (m.valid_count === 1 && (m.display !== "single" || m.sd !== null)) issue("Single observation requires single display", mp);
        if (m.status === "not_applicable" && !["q", "tc"].includes(key)) issue("Only reference metrics can be not applicable", mp);
        if (["wall_seconds", "max_rss_kib", "q", "tc"].includes(key) && [m.value, m.mean, m.min, m.max].some(v => v !== null && v < 0)) issue("Negative metric", mp);
        if (["q", "tc"].includes(key) && [m.value, m.mean, m.min, m.max].some(v => v !== null && v > 1)) issue("Q/TC must lie in [0, 1]", mp);
        if (d && !d.reference && ["q", "tc"].includes(key) && (m.status !== "not_applicable" || !m.reason_codes.includes("no_reference"))) issue("Q/TC requires a reference", mp);
        if (d?.reference && ["q", "tc"].includes(key) && m.status === "not_applicable") issue("Reference-present Q/TC cannot be not applicable", mp);
        if (result.status === "complete" && !["complete", "not_applicable"].includes(m.status)) issue("Complete result contains incomplete metrics", mp);
      }
    }
  }
});
export type BenchmarkSnapshot = z.infer<typeof snapshotSchema>;
export function parseSnapshot(value: unknown): BenchmarkSnapshot { return snapshotSchema.parse(value); }

export function compatibleBatches(snapshot: BenchmarkSnapshot, datasetId?: string) {
  return snapshot.batches.filter(b => b.dataset_id === snapshot.catalog.id && b.dataset_version === snapshot.catalog.version && (!datasetId || b.results.some(r => r.dataset_id === datasetId)))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id.localeCompare(a.id));
}

export type DatasetFilters = { search: string; type: string; source: string; reference: string; min: string; max: string };
export const emptyFilters: DatasetFilters = { search: "", type: "all", source: "all", reference: "all", min: "", max: "" };
export function filterDatasets(datasets: BenchmarkDataset[], filters: DatasetFilters) {
  return datasets.filter(d => matchesDatasetName(d, filters.search) && (filters.type === "all" || d.sequence_type === filters.type) && (filters.source === "all" || d.source_kind === filters.source) && (filters.reference === "all" || d.reference === (filters.reference === "yes")) && (filters.min === "" || d.sequence_count >= Number(filters.min)) && (filters.max === "" || d.sequence_count <= Number(filters.max)));
}
