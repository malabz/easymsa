// Independent observations and assertions. Do not import production comparison,
// selection, coordinate, formatting or CSV serialization functions here.
import {expect,type Page} from "@playwright/test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import type {BenchmarkMetric,MetricKey} from "../../src/features/benchmark/model";
import {expectedEmphasis} from "./benchmark-consistency";
// Pure data checks use Node assertions, avoiding tens of thousands of traced
// Playwright expectation steps while retaining exact comparisons.

export const comparisonMetrics:MetricKey[]=["wall_seconds","max_rss_kib","sp_score","avg_sp","scaled_sp","q","tc"];
export const displayedMetrics:MetricKey[]=["wall_seconds","max_rss_kib","scaled_sp","q","tc"];
const controls=["clustalo","mafft","muscle5","halign4","fmalign2","minipoa"];
export type Observation={method_id:string;dataset_id:string;status:string;reason_code:string|null;planned_repeats:number;valid_repeats:number;metrics:Record<MetricKey,BenchmarkMetric>|null;source:any};
export type Comparison={schema_version:1;snapshot_id:string;created_at:string;candidate:any;catalog:any;methods:{id:string;name:string;role:"candidate"|"baseline"}[];results:Observation[]};

export const metricNumber=(metric:BenchmarkMetric|null|undefined)=>metric&&["complete","partial"].includes(metric.status)?metric.value??metric.mean:null;
export const metricString=(metric:BenchmarkMetric|null|undefined)=>metricNumber(metric)===null?"":String(metricNumber(metric));
export function realExample():Comparison{return JSON.parse(readFileSync("public/benchmark/examples/msa-kit.json","utf8"));}
export function independentObservations(){
 const candidate=JSON.parse(readFileSync("e2e/fixtures/msakit-observations.json","utf8"));
 // A public example is a fixed observation, so later baseline publications must
 // not silently move its independent expected values to a different snapshot.
 return {candidate,archive:{catalog:candidate.catalog},rows:[...candidate.results,...candidate.baseline_results.map((row:any)=>({...row,batch:candidate.baseline_batches[row.batch_id]}))] as any[]};
}

export function assertRealContract(report:Comparison){
 const expected=independentObservations();
 assert.equal(report.schema_version,1);assert.match(report.snapshot_id,/^[a-f0-9]{64}$/);
 assert.deepEqual(report.candidate,expected.candidate.candidate);
 assert.equal(report.catalog.version,expected.candidate.dataset_version);assert.deepEqual(report.catalog,expected.archive.catalog);assert.equal(report.catalog.datasets.length,26);
 assert.deepEqual(report.methods.map(x=>x.id),[report.candidate.id,...controls]);
 assert.deepEqual(report.methods.map(x=>x.role),["candidate",...controls.map(()=>"baseline")]);
 assert.equal(report.results.length,182);
 for(const row of report.results){
  const source=expected.rows.find(x=>x.dataset_id===row.dataset_id&&x.method_id===row.method_id);
  const identity=row.dataset_id+"/"+row.method_id;assert.ok(source,identity);
  for(const field of ["status","reason_code","planned_repeats","valid_repeats","metrics"])assert.deepEqual(row[field as keyof Observation],source[field],identity+"/"+field);
  assert.equal(row.source.kind,row.method_id===report.candidate.id?"candidate":"historical",identity);
  assert.equal(row.source.dataset_version,report.catalog.version,identity);
  if(source.batch){const spec=source.batch.methods.find((m:any)=>m.method_id===row.method_id);assert.equal(row.source.threads,source.batch.threads,identity);assert.equal(row.source.memory_gib,source.batch.conditions.memory_limit_gib,identity);assert.equal(row.source.version,spec.version,identity);assert.deepEqual(row.source.parameters,spec.parameters,identity);assert.equal(row.source.commit,spec.commit,identity);assert.deepEqual(row.source.scoring,source.batch.scoring,identity);}
  else {assert.equal(row.source.threads,4,identity);assert.equal(row.source.memory_gib,32,identity);assert.equal(row.source.alignment_timeout_seconds,1800,identity);assert.equal(row.source.commit,report.candidate.commit_sha,identity);}
 }
 assert.equal(report.results.filter(x=>x.method_id===report.candidate.id&&x.status==="complete").length,25);
 assert.equal(report.results.filter(x=>x.method_id===report.candidate.id&&x.status==="timeout").length,1);
 const forbidden=["access_key","ciphertext","owner_id","notification","log-summary","/opt/","/var/lib/","D:\\\\","18ac272e9db74db386955587b5686492"];
 const serialized=JSON.stringify(report);for(const word of forbidden)assert.ok(!serialized.includes(word),"Public example contains "+word);
}

export async function assertTable(page:Page,report:Comparison,dataset:string){
 const table=page.getByTestId("comparison-table");await expect(table).toBeVisible();
 const cells=await table.locator("td[data-metric]").evaluateAll(nodes=>nodes.map(n=>({method:n.getAttribute("data-method"),metric:n.getAttribute("data-metric"),raw:n.getAttribute("data-raw-value"),tone:n.getAttribute("data-tone"),best:n.getAttribute("data-best")})));
 assert.equal(cells.length,35);
 for(const cell of cells){const row=report.results.find(x=>x.dataset_id===dataset&&x.method_id===cell.method)!;assert.equal(cell.raw,metricString(row.metrics?.[cell.metric as MetricKey]),dataset+"/"+cell.method+"/"+cell.metric);}
 const methods=await table.locator("tbody tr").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-method")));
 assert.equal(methods[0],report.candidate.id);assert.equal(new Set(methods).size,7);
 for(const key of displayedMetrics){
  const expected=await expectedEmphasis(page,methods.map(method=>metricNumber(report.results.find(row=>row.dataset_id===dataset&&row.method_id===method)?.metrics?.[key])),key);
  methods.forEach((method,index)=>{const cell=cells.find(cell=>cell.method===method&&cell.metric===key)!;assert.equal(cell.tone,expected[index].tone,dataset+'/'+method+'/'+key+'/tone');assert.equal(cell.best,expected[index].best,dataset+'/'+method+'/'+key+'/best');});
 }
 return cells.length;
}

function axisPercent(value:number,key:string,min:number,max:number,scale:string){
 const raw=key==="max_rss_kib"?value/1024:value;
 const position=scale==="log"?(Math.log10(raw)-Math.log10(min))/(Math.log10(max)-Math.log10(min)):(raw-min)/(max-min);
 return Math.max(0,Math.min(100,position*100));
}
export async function assertScatter(page:Page,report:Comparison,dataset:string){
 const plots=page.getByTestId("comparison-scatter");await expect(plots).toHaveCount(2);
 assert.deepEqual(await plots.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("data-x-key"))),["wall_seconds","max_rss_kib"]);
 let count=0;
 for(const plot of await plots.all()){
 await expect(plot).toBeVisible();
 const meta=await plot.evaluate(n=>({x:n.getAttribute("data-x-key")!,y:n.getAttribute("data-y-key")!,xmin:Number(n.getAttribute("data-x-min")),xmax:Number(n.getAttribute("data-x-max")),ymin:Number(n.getAttribute("data-y-min")),ymax:Number(n.getAttribute("data-y-max")),xscale:n.getAttribute("data-x-scale")!,yscale:n.getAttribute("data-y-scale")!}));
 const points=await plot.getByTestId("comparison-point").evaluateAll(nodes=>nodes.map(n=>({method:n.getAttribute("data-method"),x:n.getAttribute("data-x-raw"),y:n.getAttribute("data-y-raw"),shape:n.getAttribute("data-shape"),xp:Number(n.getAttribute("data-x-percent")),yp:Number(n.getAttribute("data-y-percent"))})));
 const eligible=report.results.filter(row=>row.dataset_id===dataset&&metricNumber(row.metrics?.[meta.x as MetricKey])!==null&&metricNumber(row.metrics?.[meta.y as MetricKey])!==null);
 assert.equal(points.length,eligible.length);
 for(const row of eligible){const point=points.find(p=>p.method===row.method_id)!;assert.ok(point,row.method_id);assert.equal(point.x,metricString(row.metrics?.[meta.x as MetricKey]),row.method_id+"/x");assert.equal(point.y,metricString(row.metrics?.[meta.y as MetricKey]),row.method_id+"/y");assert.equal(point.shape,row.method_id===report.candidate.id?"diamond":"circle",row.method_id);assert.ok(Math.abs(point.xp-axisPercent(metricNumber(row.metrics?.[meta.x as MetricKey])!,meta.x,meta.xmin,meta.xmax,meta.xscale))<.5e-7,row.method_id+"/x-coordinate");assert.ok(Math.abs(point.yp-axisPercent(metricNumber(row.metrics?.[meta.y as MetricKey])!,meta.y,meta.ymin,meta.ymax,meta.yscale))<.5e-7,row.method_id+"/y-coordinate");}
 count+=eligible.length;
 }
 return count;
}

export async function assertMetricPlots(page:Page,report:Comparison,dataset:string){
 await expect(page.getByTestId("comparison-metric-plot")).toHaveCount(5);
 const points=await page.getByTestId("comparison-metric-point").evaluateAll(nodes=>nodes.map(n=>({method:n.getAttribute("data-method"),metric:n.getAttribute("data-metric"),raw:n.getAttribute("data-raw-value"),percent:n.getAttribute("data-percent")})));
 for(const key of displayedMetrics){
  // Query points by their own metric identity; missing values are omitted.
  const eligible=report.results.filter(row=>row.dataset_id===dataset&&metricNumber(row.metrics?.[key])!==null);
  assert.equal(points.filter(p=>p.metric===key).length,eligible.length,dataset+"/"+key);
  for(const row of eligible)assert.equal(points.find(p=>p.method===row.method_id&&p.metric===key)?.raw,metricString(row.metrics?.[key]),dataset+"/"+row.method_id+"/"+key);
 }
}

/** Independent RFC 4180 parser, including quoted parameter arrays. */
function parseCsv(text:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],field="",quoted=false;const content=text.replace(/^\uFEFF/,"");
 for(let i=0;i<content.length;i++){const ch=content[i];if(quoted){if(ch==='"'&&content[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field="";}else if(ch==='\r'||ch==='\n'){if(ch==='\r'&&content[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field="";}else field+=ch;}
 assert.equal(quoted,false,"CSV ended inside a quoted field");if(field||row.length){row.push(field);rows.push(row);}return rows;
}

export async function assertDownloads(page:Page,report:Comparison,dataset?:string){
 const expected=report.results.filter(row=>!dataset||row.dataset_id===dataset);
 const menu=page.getByTestId("comparison-downloads");
 const toggle=menu.locator("summary");
 if(!await page.getByLabel(/^(Download scope|下载范围)$/).isVisible())await toggle.click();
 await page.getByLabel(/^(Download scope|下载范围)$/).selectOption(dataset?"dataset":"all");
 const nextJson=page.waitForEvent("download");await menu.getByRole("button",{name:/^(JSON|Download JSON|下载 JSON)$/}).click();
 const json=JSON.parse(readFileSync((await(await nextJson).path())!,"utf8")) as Comparison;
 assert.equal(json.snapshot_id,report.snapshot_id);assert.deepEqual(json.results,expected);assert.deepEqual(json.catalog.datasets.map((d:any)=>d.id),report.catalog.datasets.filter((d:any)=>!dataset||d.id===dataset).map((d:any)=>d.id));
 const nextCsv=page.waitForEvent("download");await menu.getByRole("button",{name:/^(CSV|Download CSV|下载 CSV)$/}).click();
 const lines=parseCsv(readFileSync((await(await nextCsv).path())!,"utf8")),header=lines.shift()!;
 assert.deepEqual(header,["snapshot_id","dataset","method_id","method","role","repository_url","result_status","metric","unit","status","valid_count","planned_count","value","mean","sd","min","max","reason_codes","source_id","source_kind","source_label","method_version","commit_sha","profile_id","dataset_version","runtime","threads","memory_gib","alignment_timeout_seconds","scorer_timeout_seconds","scoring_id","scoring_label","parameters"]);
 assert.equal(lines.length,expected.length*7);
 const records=new Map<string,Record<string,string>>();
 for(const cells of lines){assert.equal(cells.length,header.length,"CSV column count");const row=Object.fromEntries(header.map((key,index)=>[key,cells[index]])),identity=row.dataset+"/"+row.method_id+"/"+row.metric;assert.ok(!records.has(identity),"Duplicate CSV metric "+identity);records.set(identity,row);}
 for(const row of expected)for(const key of comparisonMetrics){
  const identity=row.dataset_id+"/"+row.method_id+"/"+key,line=records.get(identity)!;assert.ok(line,identity);
  const metric=row.metrics?.[key];assert.equal(line.snapshot_id,report.snapshot_id,identity);
  assert.equal(line.result_status,row.status,identity);
  assert.equal(line.status,metric?.status??"unavailable",identity);assert.equal(Number(line.valid_count),metric?.valid_count??0,identity);assert.equal(Number(line.planned_count),metric?.planned_count??1,identity);
  for(const value of ["value","mean","sd","min","max"] as const){const raw=line[value];if(metric?.[value]==null)assert.equal(raw,"",identity+"/"+value);else assert.equal(Number(raw),metric[value],identity+"/"+value);}
  assert.equal(line.unit,key==="wall_seconds"?"s":key==="max_rss_kib"?"KiB":"",identity);
  const source=row.source;
  for(const [column,value]of Object.entries({source_id:source?.id,source_kind:source?.kind,source_label:source?.label,method_version:source?.version,commit_sha:source?.commit,profile_id:source?.profile_id,dataset_version:source?.dataset_version,runtime:source?.runtime,scoring_id:source?.scoring.id,scoring_label:source?.scoring.label}))assert.equal(line[column],value??"",identity+"/"+column);
  for(const column of ["threads","memory_gib","alignment_timeout_seconds","scorer_timeout_seconds"])if(source?.[column]==null)assert.equal(line[column],"",identity+"/"+column);else assert.equal(Number(line[column]),source[column],identity+"/"+column);
  if(source)assert.deepEqual(JSON.parse(line.parameters),source.parameters,identity+"/parameters");else assert.equal(line.parameters,"",identity+"/parameters");
 }
 return expected.length*7;
}
