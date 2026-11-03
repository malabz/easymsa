import {expect,test,type Page,type Route} from "@playwright/test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import {privateRun} from "../src/features/benchmark/__tests__/privateFixtures";
import {assertDownloads,assertRealContract,assertScatter,assertTable,comparisonMetrics,displayedMetrics,metricString,realExample,type Comparison} from "./helpers/comparison-expectations";

const examplePath="/#/benchmark/examples/msa-kit";
const asset="**/benchmark/examples/msa-kit.json";
const key="comparison-browser-test-"+"x".repeat(40);
const feature={enabled:true,accepting:true,reason:null,profile_id:"anonymous-gvisor32-q64-v4",email_available:true};
async function json(route:Route,value:unknown,status=200){await route.fulfill({status,json:value});}
async function prepare(page:Page,handler?:(route:Route,path:string)=>Promise<boolean>){
 await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
 const mutation:string[]=[];
 await page.route("**/api/**",async route=>{
  if(route.request().method()!=="GET")mutation.push(new URL(route.request().url()).pathname);
  const path=new URL(route.request().url()).pathname;
  if(await handler?.(route,path))return;
  if(path.endsWith("/status"))return json(route,feature);
  await route.abort();
 });
 return mutation;
}
async function openExample(page:Page,dataset?:string,chart="tradeoff"){
 await page.goto(examplePath+(dataset?`?dataset=${dataset}&chart=${chart}`:""));
 await expect(page.getByTestId("comparison-root")).toBeVisible();
 await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id",dataset??"rna_255");
}
async function settle(page:Page){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(x=>x.effect?.getComputedTiming().iterations!==Infinity).map(x=>x.finished.catch(()=>{})));});}
async function assertFit(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
function mockCsv(report:Comparison){
 const columns=["snapshot_id","dataset","method_id","method","role","repository_url","result_status","metric","unit","status","valid_count","planned_count","value","mean","sd","min","max","reason_codes","source_id","source_kind","source_label","method_version","commit_sha","profile_id","dataset_version","runtime","threads","memory_gib","alignment_timeout_seconds","scorer_timeout_seconds","scoring_id","scoring_label","parameters"];
 const rows=report.results.flatMap(row=>comparisonMetrics.map(key=>{const method=report.methods.find(x=>x.id===row.method_id)!,m=row.metrics?.[key],s=row.source;return[report.snapshot_id,row.dataset_id,row.method_id,method.name,method.role,method.role==="candidate"?report.candidate.repository_url:"",row.status,key,key==="wall_seconds"?"s":key==="max_rss_kib"?"KiB":"",m?.status??"unavailable",m?.valid_count??0,m?.planned_count??1,m?.value,m?.mean,m?.sd,m?.min,m?.max,m?.reason_codes.join(";")??"",s?.id,s?.kind,s?.label,s?.version,s?.commit,s?.profile_id,s?.dataset_version,s?.runtime,s?.threads,s?.memory_gib,s?.alignment_timeout_seconds,s?.scorer_timeout_seconds,s?.scoring.id,s?.scoring.label,s?JSON.stringify(s.parameters):""];}));
 return "\uFEFF"+[columns,...rows].map(row=>row.map(value=>{const raw=value==null?"":String(value);return/[",\r\n]/.test(raw)?`"${raw.replace(/"/g,'""')}"`:raw;}).join(",")).join("\r\n")+"\r\n";
}

test("public example is a sanitized fixed copy of 1274 original metric observations",()=>{
 assertRealContract(realExample());
});

test("MSA-Kit example reuses all 1274 real metric positions across matrix, figures and downloads",async({page},info)=>{
 test.setTimeout(360_000);const report=realExample();assertRealContract(report);const mutations=await prepare(page);
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await openExample(page);const root=page.getByTestId("comparison-root");await expect(root).toHaveAttribute("data-snapshot-id",report.snapshot_id);await expect(root).toHaveAttribute("data-candidate-id",report.candidate.id);
 await expect(page.getByTestId("comparison-scatter").first()).toHaveAttribute("data-y-key","q");
 let displayed=0,plotted=0,downloaded=0;
 for(const dataset of report.catalog.datasets){
  await openExample(page,dataset.id);plotted+=await assertScatter(page,report,dataset.id);
  displayed+=await assertTable(page,report,dataset.id);
  downloaded+=await assertDownloads(page,report,dataset.id);await assertFit(page);
 }
 await openExample(page);downloaded+=await assertDownloads(page,report);
 for(const metric of displayedMetrics){
  await page.goto(examplePath+`?view=matrix&metric=${metric}`);await expect(page.getByTestId("comparison-matrix")).toBeVisible();
  const cells=await page.getByTestId("comparison-matrix-cell").evaluateAll(nodes=>nodes.map(n=>({dataset:n.getAttribute("data-dataset-id"),method:n.getAttribute("data-method"),raw:n.getAttribute("data-raw-value")})));
  assert.equal(cells.length,182);
  for(const cell of cells){const row=report.results.find(x=>x.method_id===cell.method&&x.dataset_id===cell.dataset)!;assert.equal(cell.raw,metricString(row.metrics?.[metric]),cell.dataset+"/"+cell.method+"/"+metric);}
  const firstMethods=await page.getByTestId("comparison-matrix-cell").evaluateAll(nodes=>nodes.filter(n=>n.getAttribute("data-dataset-id")==="rna_255").map(n=>n.getAttribute("data-method")));
  assert.equal(firstMethods[0],report.candidate.id);assert.equal(await page.locator("[data-best=true]").count(),0);
 }
 await openExample(page,"rna_8191");await settle(page);await page.screenshot({path:info.outputPath("comparison-rna8191-en.png"),fullPage:true});
 await page.getByRole("button",{name:"Switch language",exact:true}).click();await expect(page.locator("html")).toHaveAttribute("lang","zh-CN");await assertScatter(page,report,"rna_8191");await assertFit(page);await settle(page);
 expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
 await page.screenshot({path:info.outputPath("comparison-rna8191-zh.png"),fullPage:true});
 expect(mutations).toEqual([]);expect(errors).toEqual([]);
 await info.attach("real-comparison-consistency.json",{contentType:"application/json",body:JSON.stringify({pairs:182,rawMetricPositions:1274,displayedTablePositions:displayed,scatterPoints:plotted,downloadMetricPositions:downloaded,actualJsonDownloads:27,actualCsvDownloads:27,mutatingApiRequests:0,status:"passed"})});
});

test("example submission works while dispatch is paused or offline without creating a task",async({page})=>{
 const mutations=await prepare(page,async(route,path)=>{if(path.endsWith("/status")){await json(route,{...feature,accepting:false,email_available:false,reason:"paused"});return true;}return false;});
 await page.goto("/#/benchmark/submit?example=msa-kit");
 const repo=page.getByLabel("GitHub repository",{exact:true});await expect(repo).toHaveValue("https://github.com/malabz/MSA-Kit");await expect(repo).not.toBeEditable();
 await expect(page.getByLabel(/Notification email/)).toHaveCount(0);
 await page.getByRole("button",{name:/^(Try evaluation|Try example|体验评测)$/}).click();await expect(page.getByTestId("comparison-root")).toBeVisible();
 expect(mutations).toEqual([]);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("easymsa.benchmarkAccess.v1")??"[]"))).toEqual([]);
 await page.route("**/api/**",route=>route.abort());await page.goto("/#/benchmark/submit?example=msa-kit");await page.getByRole("button",{name:/^(Try evaluation|Try example|体验评测)$/}).click();await expect(page.getByTestId("comparison-root")).toBeVisible();expect(mutations).toEqual([]);
});

test("typing MSA-Kit in the normal form still sends a real submission request",async({page})=>{
 const report=realExample(),submitted:any[]=[];const run=privateRun({method_name:"MSA-Kit",repository_url:report.candidate.repository_url,commit_sha:report.candidate.commit_sha,completed_units:26,successful_units:25});
 const raw=JSON.parse(readFileSync("e2e/fixtures/msakit-observations.json","utf8"));
 const original={schema_version:3,run_id:run.id,method:raw.candidate,profile:{id:run.profile_id,dataset_version:report.catalog.version,threads:4,repeats:1,limits:{cpu:4,memory_gib:32,alignment_timeout_seconds:1800,scorer_timeout_seconds:1800},runtime:"test-only-runtime",measurement:"test-only"},catalog:report.catalog,results:raw.results};
 await prepare(page,async(route,path)=>{
  if(path.endsWith("/client")){await json(route,{csrf_token:"test-csrf"});return true;}
  if(path.endsWith("/submissions")){submitted.push(route.request().postDataJSON());await json(route,{run,access_key:key},202);return true;}
  if(path.endsWith("/comparison")){await json(route,report);return true;}
  if(path.endsWith("/results")){await json(route,original);return true;}
  if(path.endsWith(run.id)){await json(route,run);return true;}
  return false;
 });
 await page.goto("/#/benchmark/submit");await page.getByLabel("GitHub repository",{exact:true}).fill("https://github.com/malabz/MSA-Kit");await page.getByRole("button",{name:"Start evaluation",exact:true}).click();
 await expect(page.getByTestId("comparison-root")).toBeVisible();expect(submitted).toEqual([{repository_url:"https://github.com/malabz/MSA-Kit",language:"en"}]);await expect(page).toHaveURL(/\/benchmark\/runs\//);
});

test("private comparison downloads keep the opened snapshot after baselines change",async({page})=>{
 const original=realExample();let latest=original;const requested:string[]=[];
 const run=privateRun({method_name:"MSA-Kit",repository_url:original.candidate.repository_url,commit_sha:original.candidate.commit_sha,completed_units:26,successful_units:25});
 const raw=JSON.parse(readFileSync("e2e/fixtures/msakit-observations.json","utf8"));
 const privateResult={schema_version:3,run_id:run.id,method:raw.candidate,profile:{id:run.profile_id,dataset_version:original.catalog.version,threads:4,repeats:1,limits:{cpu:4,memory_gib:32,alignment_timeout_seconds:1800,scorer_timeout_seconds:1800},runtime:"test-only-runtime",measurement:"test-only"},catalog:original.catalog,results:raw.results};
 await prepare(page,async(route,path)=>{
  if(path.includes("/benchmark/runs/"))expect(route.request().headers().authorization).toBe(`Bearer ${key}`);
  if(path.endsWith("/comparison")){
   const query=new URL(route.request().url()).searchParams,snapshot=query.get("snapshot");if(snapshot){requested.push(snapshot);expect(snapshot).toBe(original.snapshot_id);}
   const body=structuredClone(snapshot?original:latest),dataset=query.get("dataset"),methods=query.get("methods")?.split(",");
   body.catalog.datasets=body.catalog.datasets.filter((d:any)=>!dataset||d.id===dataset);body.methods=body.methods.filter(m=>!methods||m.id===body.candidate.id||methods.includes(m.id));body.results=body.results.filter(row=>(!dataset||row.dataset_id===dataset)&&body.methods.some(m=>m.id===row.method_id));
   if(query.get("format")==="csv")await route.fulfill({status:200,contentType:"text/csv",body:mockCsv(body)});else await json(route,body);return true;
  }
  if(path.endsWith("/results")){await json(route,privateResult);return true;}
  if(path.endsWith(run.id)){await json(route,run);return true;}
  return false;
 });
 await page.goto(`/#/benchmark/runs/${run.id}?key=${key}`);await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-snapshot-id",original.snapshot_id);await expect(page).not.toHaveURL(/key=/);
 latest=structuredClone(original);latest.snapshot_id="a".repeat(64);const altered=latest.results.find(x=>x.method_id==="mafft"&&x.dataset_id==="rna_255")!.metrics!.wall_seconds;altered.value=altered.mean=altered.min=altered.max=999;
 await assertDownloads(page,original,"rna_255");await assertDownloads(page,original);expect(requested).toEqual(Array(4).fill(original.snapshot_id));
});

test("candidate identity survives same method name, overlap, zero values and missing Q",async({page})=>{
 const report=structuredClone(realExample());const candidate=report.candidate.id;
 report.candidate.name="MAFFT";report.methods[0].name="MAFFT";
 const row=report.results.find(x=>x.method_id===candidate&&x.dataset_id==="rna_255")!,mafft=report.results.find(x=>x.method_id==="mafft"&&x.dataset_id==="rna_255")!;
 row.metrics=structuredClone(mafft.metrics);report.snapshot_id="d".repeat(64);
 await prepare(page);await page.route(asset,route=>json(route,report));await openExample(page);
 let points=await page.getByTestId("comparison-point").evaluateAll(nodes=>nodes.map(n=>({id:n.getAttribute("data-method"),shape:n.getAttribute("data-shape"),x:n.getAttribute("data-x-percent"),y:n.getAttribute("data-y-percent")})));
 const mine=points.find(x=>x.id===candidate)!,base=points.find(x=>x.id==="mafft")!;expect(mine.shape).toBe("diamond");expect(base.shape).toBe("circle");expect(mine.x).toBe(base.x);expect(mine.y).toBe(base.y);
 for(const key of ["wall_seconds","max_rss_kib"]as const){const m=row.metrics![key];m.value=m.mean=m.min=m.max=0;}
 row.metrics!.q={status:"unavailable",valid_count:0,planned_count:1,value:null,mean:null,sd:null,min:null,max:null,display:null,reason_codes:["scoring_failed"]};row.status="partial";row.reason_code="scoring_failed";
 const sp=row.metrics!.scaled_sp;sp.value=sp.mean=sp.min=sp.max=-.2;
 await page.reload();await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","rna_255");await expect(page.getByTestId("comparison-scatter").first()).toHaveAttribute("data-y-key","scaled_sp");await expect(page.getByTestId("comparison-scatter").first()).toHaveAttribute("data-x-scale","linear");await assertScatter(page,report,"rna_255");
 await assertTable(page,report,"rna_255");
});

test("unmatched and failed results remain visible without zero points",async({page})=>{
 const report=structuredClone(realExample());report.snapshot_id="e".repeat(64);
 for(const row of report.results){if(row.method_id!==report.candidate.id){row.status="unmatched";row.reason_code=null;row.metrics=null;row.source=null;row.valid_repeats=0;}else if(row.dataset_id==="rna_255"){row.status="unsupported";row.reason_code="unsupported";row.valid_repeats=0;for(const metric of Object.values(row.metrics!))Object.assign(metric,{status:"unavailable",valid_count:0,value:null,mean:null,sd:null,min:null,max:null,display:null,reason_codes:["unsupported"]});}}
 await prepare(page);await page.route(asset,route=>json(route,report));await openExample(page,"rna_255");
 await expect(page.getByTestId("comparison-point")).toHaveCount(0);await expect(page.getByTestId("comparison-table").locator("tbody tr")).toHaveCount(7);
 await expect(page.getByText(/No matching baseline|暂无匹配对照/).first()).toBeVisible();
 await assertTable(page,report,"rna_255");
});

test("dataset selection preserves sidebar position, URL, keyboard focus and the candidate filter",async({page},info)=>{
 const report=realExample();await prepare(page);await openExample(page,"rna_8191");
 const sidebar=page.getByTestId("comparison-sidebar-scroll");
 const menu=page.locator(".comparison-sidebar > details");
 if(await menu.getAttribute("open")===null)await menu.locator("summary").click();
 await sidebar.evaluate(node=>node.scrollTop=node.scrollHeight);

 const exact=page.locator('[data-testid="comparison-dataset"][data-dataset-id="rna_4095"]');
 await exact.focus();const focusedScroll=await sidebar.evaluate(node=>node.scrollTop);await exact.press("Enter");await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","rna_4095");
 if(await menu.getAttribute("open")===null)await menu.locator("summary").click();
 await expect(exact).toHaveAttribute("aria-current","page");expect(await sidebar.evaluate(node=>node.scrollTop)).toBeGreaterThanOrEqual(Math.max(0,focusedScroll-80));
 await expect(page).toHaveURL(/dataset=rna_4095/);await page.reload();await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","rna_4095");
 await page.getByText(/^Methods \d/).click();const own=page.getByRole("checkbox",{name:/MSA-Kit/});await expect(own).toBeChecked();await expect(own).toBeDisabled();
 await page.getByRole("checkbox",{name:"MAFFT",exact:true}).click();await expect(page.getByRole("checkbox",{name:"MAFFT",exact:true})).not.toBeChecked();await expect(page.getByTestId("comparison-table").locator("tbody tr")).toHaveCount(6);await expect(page.getByTestId("comparison-table").locator("tbody tr").first()).toHaveAttribute("data-method",report.candidate.id);await expect(page).toHaveURL(/methods=/);
 await page.getByRole("checkbox",{name:"MAFFT",exact:true}).click();await expect(page.getByRole("checkbox",{name:"MAFFT",exact:true})).toBeChecked();await page.getByText(/^Methods \d/).click();
 if(await menu.getAttribute("open")===null)await menu.locator("summary").click();
 const search=page.getByRole("searchbox",{name:"Search comparison datasets",exact:true});
 await search.fill("no-such-dataset-for-download-check");await expect(page.getByText("No matching datasets",{exact:true})).toBeVisible();await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","");
 const downloads=page.getByTestId("comparison-downloads");if(await downloads.getAttribute("open")===null)await downloads.locator("summary").click();
 await expect(downloads.getByRole("button",{name:"CSV",exact:true})).toBeDisabled();await expect(downloads.getByRole("button",{name:"JSON",exact:true})).toBeDisabled();await expect(downloads.locator("p").first()).toContainText("0 datasets");
 await expect(page.getByLabel("Download scope",{exact:true}).locator('option[value="dataset"]')).toHaveJSProperty('disabled',true);await page.getByLabel("Download scope",{exact:true}).selectOption("all");await expect(downloads.getByRole("button",{name:"JSON",exact:true})).toBeEnabled();await expect(page.getByLabel("Download scope",{exact:true}).locator('option[value="dataset"]')).toHaveJSProperty('disabled',true);
 if(await downloads.getAttribute("open")!==null)await downloads.locator("summary").click();
 await search.fill("");await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","rna_255");await expect(page.getByTestId("comparison-table").locator("tbody tr")).toHaveCount(7);await expect(page.getByTestId("comparison-table").locator("tbody tr").first()).toHaveAttribute("data-method",report.candidate.id);
 const mine=page.getByTestId("comparison-scatter").first().locator(`[data-testid="comparison-point"][data-method="${report.candidate.id}"]`);await mine.focus();await mine.press("Enter");await expect(page).toHaveURL(new RegExp("method="+report.candidate.id));await expect(mine).toBeFocused();
 await page.getByRole("button",{name:"Switch language",exact:true}).click();await expect(page.locator("html")).toHaveAttribute("lang","zh-CN");await page.evaluate(()=>document.documentElement.style.fontSize="200%");await assertFit(page);await settle(page);await page.screenshot({path:info.outputPath("comparison-keyboard-zh-200.png"),fullPage:true});
});
