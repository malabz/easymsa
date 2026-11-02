import {z} from "zod";
import {metricSchema,metricKeys,parseSnapshot,publicReasons,type BenchmarkMetric,type MetricKey,type BenchmarkSnapshot} from "./model";
import {metricValue} from "./metrics";
import {githubRepository} from "./privateModel";
const id=z.string().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const text=z.string().min(1).max(2000).refine(value=>!/[\x00-\x1f]/.test(value));
const catalog=z.unknown().transform((value,ctx):BenchmarkSnapshot["catalog"]=>{try{return parseSnapshot({schema_version:2,catalog:value,methods:[],batches:[]}).catalog;}catch{ctx.addIssue({code:"custom",message:"Invalid comparison catalog"});return z.NEVER;}});
const metrics=z.object(Object.fromEntries(metricKeys.map(key=>[key,metricSchema])) as Record<MetricKey,typeof metricSchema>).strict();
const source=z.object({id:text,kind:z.enum(["candidate","historical"]),label:text,version:text,commit:z.string().regex(/^[a-f0-9]{40}$/).nullable(),parameters:z.array(z.string()),profile_id:text.nullable(),dataset_version:text,runtime:text,threads:z.number().int().positive(),memory_gib:z.number().positive(),alignment_timeout_seconds:z.number().positive(),scorer_timeout_seconds:z.number().positive(),scoring:z.object({id:text,label:text}).strict()}).strict();
export const comparisonSchema=z.object({schema_version:z.literal(1),snapshot_id:z.string().regex(/^[a-f0-9]{64}$/),created_at:z.string().datetime({offset:true}),candidate:z.object({id,name:text,repository_url:githubRepository,commit_sha:z.string().regex(/^[a-f0-9]{40}$/),supported_types:z.array(z.enum(["dna","rna"])).min(1),version_id:id}).strict(),catalog,methods:z.array(z.object({id,name:text,role:z.enum(["candidate","baseline"])}).strict()).min(1),results:z.array(z.object({method_id:id,dataset_id:id,status:z.enum(["complete","partial","failed","timeout","unsupported","not_run","unmatched"]),reason_code:z.enum(publicReasons).nullable(),planned_repeats:z.number().int().positive(),valid_repeats:z.number().int().nonnegative(),metrics:metrics.nullable(),source:source.nullable()}).strict())}).strict().superRefine((report,ctx)=>{
 const bad=(message:string)=>ctx.addIssue({code:"custom",message});
 const methods=new Map(report.methods.map(method=>[method.id,method])),datasets=new Map(report.catalog.datasets.map(dataset=>[dataset.id,dataset]));
 if(methods.size!==report.methods.length||datasets.size!==report.catalog.datasets.length)bad("Duplicate identities");
 if(report.methods[0].id!==report.candidate.id||report.methods[0].role!=="candidate"||report.methods.filter(method=>method.role==="candidate").length!==1)bad("Candidate must be first and unique");
 const seen=new Set<string>();
 for(const row of report.results){
  const dataset=datasets.get(row.dataset_id),method=methods.get(row.method_id),key=row.dataset_id+"/"+row.method_id;
  if(!dataset||!method||seen.has(key))bad("Invalid comparison identity");seen.add(key);
  if(row.valid_repeats>row.planned_repeats)bad("Invalid repeat coverage");
  if(row.status==="unmatched"){if(row.source!==null||row.metrics!==null||row.valid_repeats!==0||row.reason_code!==null||method?.role!=="baseline")bad("Invalid unmatched observation");continue;}
  if(!row.metrics||!row.source){bad("Matched observation requires metrics and source");continue;}
  if(row.source.dataset_version!==report.catalog.version||row.source.kind!==(method?.role==="candidate"?"candidate":"historical"))bad("Invalid source identity");
  for(const key of metricKeys){const metric=row.metrics[key];if(metric.valid_count>row.valid_repeats||metric.planned_count!==row.planned_repeats)bad("Invalid metric coverage");const values=[metric.value,metric.mean,metric.min,metric.max,metric.sd];if(metric.status==="complete"||metric.status==="partial"){if(metric.valid_count<1||metricValue(metric)===null)bad("Available metric has no measurement");}else if(values.some(value=>value!==null)||metric.valid_count!==0)bad("Missing metric has a measurement");if(["q","tc"].includes(key)&&values.slice(0,4).some(value=>value!==null&&(value<0||value>1)))bad("Reference score out of range");if(["wall_seconds","max_rss_kib"].includes(key)&&values.some(value=>value!==null&&value<0))bad("Negative resource measurement");if(!dataset?.reference&&["q","tc"].includes(key)&&metric.status!=="not_applicable")bad("Score without reference");}
 }
 if(seen.size!==methods.size*datasets.size)bad("Incomplete comparison grid");
});
export type ComparisonReport=z.infer<typeof comparisonSchema>;
export type ComparisonRow=ComparisonReport["results"][number];
export type ComparisonSource=NonNullable<ComparisonRow["source"]>;
export function comparisonMetric(row:ComparisonRow|undefined,key:MetricKey):BenchmarkMetric|undefined{return row?.metrics?.[key];}
export function comparisonQuality(report:ComparisonReport,datasetId:string):MetricKey{return metricValue(report.results.find(row=>row.dataset_id===datasetId&&row.method_id===report.candidate.id)?.metrics?.q)!==null?"q":"scaled_sp";}
export function initialComparisonDataset(report:ComparisonReport):string{
 const candidate=(id:string)=>report.results.find(row=>row.dataset_id===id&&row.method_id===report.candidate.id);
 const paired=(id:string,key:MetricKey)=>metricValue(candidate(id)?.metrics?.[key])!==null&&report.results.some(row=>row.dataset_id===id&&row.method_id!==report.candidate.id&&metricValue(row.metrics?.[key])!==null);
 if(paired("rna_255","q"))return "rna_255";
 return report.catalog.datasets.find(dataset=>paired(dataset.id,"q"))?.id??report.catalog.datasets.find(dataset=>paired(dataset.id,"scaled_sp"))?.id??report.catalog.datasets.find(dataset=>report.candidate.supported_types.includes(dataset.sequence_type))?.id??report.catalog.datasets[0]?.id??"";
}
export function comparisonSubset(report:ComparisonReport,datasetId?:string,methodIds?:string[]):ComparisonReport{const ids=methodIds?new Set([report.candidate.id,...methodIds]):null,datasets=report.catalog.datasets.filter(dataset=>!datasetId||dataset.id===datasetId),sources=new Set(datasets.map(dataset=>dataset.source_id));return {...report,catalog:{...report.catalog,datasets,sources:report.catalog.sources.filter(source=>sources.has(source.id))},methods:report.methods.filter(method=>!ids||ids.has(method.id)),results:report.results.filter(row=>(!datasetId||row.dataset_id===datasetId)&&(!ids||ids.has(row.method_id)))};}
