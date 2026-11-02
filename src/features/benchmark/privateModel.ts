import { z } from "zod";
import { metricKeys, metricSchema, parseSnapshot, publicReasons, type BenchmarkSnapshot } from "./model";

const id = z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const text = z.string().trim().min(1).max(240).refine(value => !/[\x00-\x1f]/.test(value));
export const githubRepository = z.string().url().refine(value => {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname); } catch { return false; }
});
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const sequenceTypes = z.array(z.enum(["dna", "rna"])).min(1).max(2).refine(values => new Set(values).size === values.length);
const timestamp = z.string().datetime({offset:true});
export const privateFeatureSchema=z.object({enabled:z.boolean(),accepting:z.boolean(),reason:z.string().nullable(),profile_id:z.string(),email_available:z.boolean()}).strict();
export type BenchmarkFeature = z.infer<typeof privateFeatureSchema>;
export const resolvedRepositorySchema = z.object({repository_id:z.union([z.string().regex(/^\d+$/),z.number().int().positive()]),repository_url:githubRepository,commit_sha:commit,ref:text}).strict();
export type ResolvedRepository = z.infer<typeof resolvedRepositorySchema>;
export const privateRunSchema = z.object({
  id,method_name:text,repository_url:githubRepository,commit_sha:commit,supported_types:sequenceTypes,
  status:z.enum(["queued","running","completed","failed","cancelled"]),stage:z.string().max(40),
  completed_units:z.number().int().nonnegative(),total_units:z.number().int().positive(),successful_units:z.number().int().nonnegative(),
  created_at:timestamp,started_at:timestamp.nullable(),completed_at:timestamp.nullable(),
  error:z.object({code:text,message:z.string().max(2000)}).strict().nullable(),cancel_requested:z.boolean(),profile_id:text,has_results:z.boolean(),
  expires_at:timestamp.nullable(),email_status:z.enum(["skipped","pending","sent","failed"])
}).strict().refine(run => run.successful_units <= run.completed_units && run.completed_units <= run.total_units, "Invalid progress counts");
export type PrivateRun = z.infer<typeof privateRunSchema>;
export const privateRunsSchema = z.object({items:z.array(privateRunSchema),next_cursor:z.string().nullable()}).strict();
const catalog = z.unknown().transform((value,context):BenchmarkSnapshot["catalog"] => {
  try { return parseSnapshot({schema_version:2,catalog:value,methods:[],batches:[]}).catalog; }
  catch { context.addIssue({code:z.ZodIssueCode.custom,message:"Invalid dataset catalog"}); return z.NEVER; }
});
const result = z.object({
  method_id:id,dataset_id:id,status:z.enum(["complete","partial","failed","timeout","unsupported","not_run"]),
  reason_code:z.enum(publicReasons).nullable(),planned_repeats:z.number().int().positive(),valid_repeats:z.number().int().nonnegative(),
  metrics:z.object({wall_seconds:metricSchema,max_rss_kib:metricSchema,sp_score:metricSchema,avg_sp:metricSchema,scaled_sp:metricSchema,q:metricSchema,tc:metricSchema}).strict()
}).strict();
export const privateResultSchema = z.object({
  schema_version:z.literal(3),run_id:id,
  method:z.object({id,name:text,repository_url:githubRepository,commit_sha:commit,supported_types:sequenceTypes,version_id:id}).strict(),
  profile:z.object({id:text,dataset_version:text,threads:z.number().int().positive(),repeats:z.literal(1),
    limits:z.object({cpu:z.number().positive(),memory_gib:z.number().positive(),alignment_timeout_seconds:z.number().positive(),scorer_timeout_seconds:z.number().positive()}).strict(),runtime:text,measurement:text}).strict(),
  catalog,results:z.array(result)
}).strict().superRefine((report,ctx)=>{
  const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
  if(report.profile.dataset_version!==report.catalog.version)issue("Dataset version mismatch");
  if(report.catalog.status!=="frozen")issue("Private results require a frozen catalog");
  const datasets=new Map(report.catalog.datasets.map(dataset=>[dataset.id,dataset]));
  const seen=new Set<string>();
  for(const row of report.results){
    const dataset=datasets.get(row.dataset_id);
    if(!dataset || seen.has(row.dataset_id) || row.method_id!==report.method.id)issue("Invalid result identity");
    seen.add(row.dataset_id);
    if(row.planned_repeats!==1 || row.valid_repeats>1)issue("Invalid repeat count");
    if(["complete","partial"].includes(row.status) && row.valid_repeats!==1)issue("Successful result requires a valid alignment");
    if(["failed","timeout","unsupported","not_run"].includes(row.status) && row.valid_repeats!==0)issue("Failed result cannot have valid alignments");
    for(const key of metricKeys){
      const metric=row.metrics[key],available=["complete","partial"].includes(metric.status);
      const values=[metric.value,metric.mean,metric.min,metric.max];
      if(metric.planned_count!==1 || metric.valid_count>row.valid_repeats)issue("Invalid metric coverage");
      if(metric.status==="partial")issue("Single observations cannot have partial repeat coverage");
      if(available && (metric.valid_count!==1 || metric.display!=="single" || metric.sd!==null || metric.mean===null || metric.min!==metric.mean || metric.max!==metric.mean || metric.value!==null && metric.value!==metric.mean))issue("Invalid single measurement");
      if(!available && (metric.valid_count!==0 || [...values,metric.sd,metric.display].some(value=>value!==null)))issue("Unavailable metric has a value");
      if(["wall_seconds","max_rss_kib","q","tc"].includes(key) && values.some(value=>value!==null && value<0))issue("Negative measurement");
      if(["q","tc"].includes(key) && values.some(value=>value!==null && value>1))issue("Invalid reference score");
      if(!dataset?.reference && ["q","tc"].includes(key) && (metric.status!=="not_applicable" || !metric.reason_codes.includes("no_reference")))issue("Reference score without reference");
      if(metric.status==="not_applicable" && (dataset?.reference || !["q","tc"].includes(key)))issue("Invalid not-applicable metric");
      if(row.status==="complete" && !["complete","not_applicable"].includes(metric.status))issue("Complete result contains unavailable metrics");
    }
  }
  if(seen.size!==datasets.size)issue("Result must retain every dataset");
});
export type PrivateResult = z.infer<typeof privateResultSchema>;
export type PrivateResultRow = PrivateResult["results"][number];
export const terminalRun = (run:PrivateRun) => ["completed","failed","cancelled"].includes(run.status);
