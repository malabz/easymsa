import {expect,test,type Page,type Route} from "@playwright/test";
import {readFileSync} from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import {privateReport,privateRun} from "../src/features/benchmark/__tests__/privateFixtures";
import {metricKeys,type BenchmarkDataset} from "../src/features/benchmark/model";
import type {PrivateResult,PrivateRun} from "../src/features/benchmark/privateModel";

function report():PrivateResult{
  const seed=privateReport(),catalog=JSON.parse(readFileSync("public/benchmark/snapshot.json","utf8")).catalog;
  return {...seed,catalog,profile:{...seed.profile,dataset_version:catalog.version},results:catalog.datasets.map((dataset:BenchmarkDataset,index:number)=>{
    const base=structuredClone(seed.results[dataset.reference?0:1]);base.dataset_id=dataset.id;
    base.metrics.wall_seconds.value=base.metrics.wall_seconds.mean=base.metrics.wall_seconds.min=base.metrics.wall_seconds.max=index===0?0:index+0.125;
    return base;
  })};
}
const body=report();
const key="browser-test-key-"+"a".repeat(32);
const feature={enabled:true,accepting:true,reason:null,profile_id:"submission-single-v1",email_available:true,quick_available:true};
const finished=privateRun({completed_units:26,successful_units:26});
const csv=(dto:PrivateResult)=>"\uFEFFrun_id,dataset,metric,value\r\n"+dto.results.flatMap(row=>metricKeys.map(key=>[dto.run_id,row.dataset_id,key,row.metrics[key].value??""].join(","))).join("\r\n")+"\r\n";
async function fulfill(route:Route,data:unknown,status=200){await route.fulfill({status,json:data});}
async function settle(page:Page){
  // Measure the committed page rather than a translucent entry/language frame.
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));await Promise.race([new Promise(resolve=>setTimeout(resolve,2000)),Promise.all(document.getAnimations().filter(animation=>animation.playState==="running"&&animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>undefined)))]);});
}
async function prepare(page:Page,handler?:(route:Route,path:string)=>Promise<boolean>){
  await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(await handler?.(route,path))return;
    expect(path).not.toContain("/auth/");
    if(path.includes("/benchmark/runs/")){expect(route.request().headers().authorization).toBe(`Bearer ${key}`);expect(route.request().url()).not.toContain(key);}
    if(path.endsWith("/status"))return fulfill(route,feature);
    if(path.endsWith("/client"))return fulfill(route,{csrf_token:"test-csrf"});
    if(path.endsWith("/precheck"))return fulfill(route,{repository_id:"456",repository_url:finished.repository_url,commit_sha:finished.commit_sha,ref:route.request().postDataJSON().revision??"main",requirements:{build_script:true,run_script:true}});
    if(path.endsWith("/results"))return route.request().url().includes("format=csv")?route.fulfill({status:200,contentType:"text/csv",body:csv(body)}):fulfill(route,body);
    if(path.endsWith("/logs"))return route.fulfill({status:200,contentType:"text/plain",body:"Source pinned\nBuild completed\n26 datasets processed\n"});
    if(path.endsWith("/submissions"))return fulfill(route,{run:finished,access_key:key});
    if(path.endsWith(finished.id))return fulfill(route,finished);
    await route.abort();
  });
}
async function startEvaluation(page:Page){
 const check=page.getByRole("button",{name:"Check repository",exact:true});
 await check.click();await expect(page.getByText("Repository check passed",{exact:true})).toBeVisible();
 await expect(page.locator(".benchmark-precheck-result code")).toHaveText(finished.commit_sha);
 await page.getByRole("button",{name:"Start evaluation",exact:true}).click();
}
test("direct submission has no login and retains advanced defaults",async({page})=>{
 const bodies:unknown[]=[];await prepare(page,async(route,path)=>{if(path.endsWith("/submissions")){bodies.push(route.request().postDataJSON());expect(route.request().headers()["x-csrf-token"]).toBe("test-csrf");expect(route.request().headers()["idempotency-key"]).toBeTruthy();await fulfill(route,{run:finished,access_key:key});return true;}return false;});
 await page.goto("/#/benchmark/submit");await expect(page.getByRole("textbox",{name:"GitHub repository",exact:true})).toBeVisible();await expect(page.getByRole("textbox",{name:"Method name",exact:true})).toBeHidden();await expect(page.getByText("Continue with GitHub")).toHaveCount(0);await page.getByLabel("GitHub repository",{exact:true}).fill(finished.repository_url);await startEvaluation(page);await expect(page.getByTestId("private-results-table")).toBeVisible();expect(bodies).toEqual([{repository_url:finished.repository_url,revision:finished.commit_sha,mode:"quick",language:"en"}]);await expect(page).not.toHaveURL(/key=/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("easymsa.benchmarkAccess.v1")??"[]")[0].key)).toBe(key);
});
test("optional email and pinned advanced revision reach one submission",async({page})=>{
 let submitted:any;await prepare(page,async(route,path)=>{if(path.endsWith("/submissions")){submitted=route.request().postDataJSON();await fulfill(route,{run:finished,access_key:key});return true;}return false;});
 await page.goto("/#/benchmark/submit");await page.getByLabel("GitHub repository",{exact:true}).fill(finished.repository_url);await page.getByLabel("Notification email",{exact:false}).fill("person@example.org");await page.getByText("More settings",{exact:true}).click();await page.getByLabel("Version",{exact:true}).fill("a".repeat(40));await page.getByLabel("Method name",{exact:true}).fill("New alignment method");await page.getByLabel("RNA",{exact:true}).uncheck();await startEvaluation(page);await expect(page.getByTestId("private-results-table")).toBeVisible();expect(submitted).toEqual({repository_url:finished.repository_url,language:"en",mode:"quick",email:"person@example.org",method_name:"New alignment method",revision:"a".repeat(40),supported_types:["dna"]});
});
test("26 dataset values, neutral plots and actual seven-metric downloads agree",async({page},info)=>{
  await prepare(page);await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);const table=page.getByTestId("private-results-table");await expect(table).toBeVisible();await expect(table.locator("tbody tr")).toHaveCount(26);await expect(table.locator("td[data-metric]")).toHaveCount(130);await expect(table.locator("[data-best]" )).toHaveCount(0);
  const observed=await table.locator("tbody tr").evaluateAll(rows=>rows.map(row=>({id:(row as HTMLElement).dataset.datasetId,values:[...row.querySelectorAll<HTMLElement>("td[data-metric]")].map(cell=>({key:cell.dataset.metric,value:cell.dataset.rawValue}))})));
  for(const row of observed){const expected=body.results.find(result=>result.dataset_id===row.id)!;for(const cell of row.values)expect(cell.value).toBe(expected.metrics[cell.key as keyof typeof expected.metrics].value===null?"":String(expected.metrics[cell.key as keyof typeof expected.metrics].value));}
  for(const format of ["json","csv"]as const){const event=page.waitForEvent("download");await page.getByRole("button",{name:format.toUpperCase(),exact:true}).click();const text=readFileSync((await(await event).path())!,"utf8");if(format==="json")expect(JSON.parse(text)).toEqual(body);else expect(text).toBe(csv(body));}
  const noRef=body.catalog.datasets.find(dataset=>!dataset.reference)!;await table.locator(`tr[data-dataset-id="${noRef.id}"] button`).click();await expect(page.getByTestId("private-preferred-quality")).toHaveAttribute("data-metric","scaled_sp");await expect(page.getByTestId("private-metric-plot")).toHaveCount(5);
  const ref=body.catalog.datasets.find(dataset=>dataset.reference)!;await table.locator(`tr[data-dataset-id="${ref.id}"] button`).click();await expect(page.getByTestId("private-preferred-quality")).toHaveAttribute("data-metric","q");
  await page.getByLabel("Search datasets",{exact:true}).fill("rna_255");await expect(table.locator("tbody tr")).toHaveCount(1);await expect(table).toContainText("255");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await settle(page);expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath("private-results-en.png"),fullPage:true});
});
test("email links recover into another browser and survive refresh",async({page})=>{
 await prepare(page);await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);await expect(page.getByTestId("private-results-table")).toBeVisible();await expect(page).not.toHaveURL(/key=/);await page.reload();await expect(page.getByTestId("private-results-table")).toBeVisible();await page.getByRole("link",{name:"Recent evaluations",exact:true}).click();await expect(page.getByRole("link",{name:/Test MSA/})).toBeVisible();await page.getByRole("button",{name:"Remove Test MSA from this browser"}).click();await expect(page.getByRole("heading",{name:"No saved evaluations"})).toBeVisible();
});
test("storage failure leaves a useful link and recovery file",async({page})=>{
 await prepare(page);await page.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name.startsWith("easymsa.benchmark"))throw new DOMException("blocked","QuotaExceededError");return original.call(this,name,value);};});await page.goto("/#/benchmark/submit");await page.getByLabel("GitHub repository",{exact:true}).fill(finished.repository_url);await startEvaluation(page);await expect(page.getByTestId("private-results-table")).toBeVisible();await expect(page).toHaveURL(/key=/);await expect(page.getByText("This browser could not save the task. Save its link or recovery file.")).toBeVisible();const download=page.waitForEvent("download");await page.getByRole("button",{name:"Save recovery file"}).click();const contents=JSON.parse(readFileSync((await(await download).path())!,"utf8"));expect(contents.key).toBe(key);expect(contents.id).toBe(finished.id);
});
test("recovery import validates access and wrong keys do not overwrite saved keys",async({page})=>{
 await prepare(page);await page.goto("/#/benchmark/recent");const file={app:"easymsa-benchmark",version:1,id:finished.id,key,method_name:finished.method_name,repository_url:finished.repository_url,created_at:finished.created_at,expires_at:finished.expires_at};await page.locator('input[type="file"]').setInputFiles({name:"evaluation.recovery.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(file))});await expect(page.getByTestId("private-results-table")).toBeVisible();await page.route(`**/api/benchmark/runs/${finished.id}`,route=>fulfill(route,{error:{code:"BENCHMARK_NOT_FOUND",message:"Unavailable",details:null}},404));await page.goto(`/#/benchmark/runs/${finished.id}?key=bad`);await expect(page.getByRole("alert")).toContainText("Check its result link or recovery file.");await expect(page.getByTestId("private-results-table")).toHaveCount(0);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("easymsa.benchmarkAccess.v1")!)[0].key)).toBe(key);
});
test("retrying a lost response after changing language preserves one submission",async({page})=>{
 const keys:string[]=[],bodies:unknown[]=[];await prepare(page,async(route,path)=>{if(!path.endsWith("/submissions"))return false;keys.push(route.request().headers()["idempotency-key"]);bodies.push(route.request().postDataJSON());if(keys.length===1)await route.abort("failed");else await fulfill(route,{run:finished,access_key:key});return true;});await page.goto("/#/benchmark/submit");await page.getByLabel("GitHub repository",{exact:true}).fill(finished.repository_url);await startEvaluation(page);await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByRole("button",{name:"Retry saved submission"})).toBeVisible();await page.getByRole("button",{name:"Switch language",exact:true}).click();await page.getByRole("button",{name:"开始评测",exact:true}).click();await expect(page.getByTestId("private-results-table")).toBeVisible();expect(keys.length).toBe(2);expect(keys[0]).toBe(keys[1]);expect(new Set(keys).size).toBe(1);expect(bodies).toEqual([{repository_url:finished.repository_url,revision:finished.commit_sha,mode:"quick",language:"en"},{repository_url:finished.repository_url,revision:finished.commit_sha,mode:"quick",language:"en"}]);
});
test("running cancellation uses only the task key",async({page})=>{
 let run:PrivateRun=privateRun({status:"running",stage:"running",has_results:false,completed_units:0,successful_units:0});await prepare(page,async(route,path)=>{if(path.endsWith("/cancel")){expect(route.request().headers().authorization).toBe(`Bearer ${key}`);run={...finished,status:"cancelled",stage:"cancelled",cancel_requested:true};await fulfill(route,run);return true;}if(path.endsWith(finished.id)){await fulfill(route,run);return true;}return false;});await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);await page.getByRole("button",{name:"Cancel evaluation"}).click();await page.getByRole("button",{name:"Confirm cancellation",exact:true}).click();await expect(page.locator(".private-progress [role=status]")).toHaveText("Cancelled");await expect(page.getByTestId("private-results-table")).toBeVisible();
});
test("paused submission and unavailable email remain clear",async({page})=>{
 await prepare(page,async(route,path)=>{if(!path.endsWith("/status"))return false;await fulfill(route,{...feature,accepting:false,email_available:false,reason:"paused"});return true;});await page.goto("/#/benchmark/submit");await expect(page.getByRole("button",{name:"Check repository"})).toBeDisabled();await expect(page.getByRole("textbox",{name:/Notification email/})).toBeDisabled();await expect(page.getByText("Email notifications are currently unavailable.")).toBeVisible();await expect(page.getByRole("link",{name:"Recent evaluations",exact:true})).toBeVisible();
});
test("submission form remains usable in Chinese, on mobile and at enlarged text",async({page},info)=>{
  await prepare(page);await page.goto("/#/benchmark/submit");await expect(page.getByRole("textbox",{name:"GitHub repository"})).toBeVisible();await settle(page);expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);await page.screenshot({path:info.outputPath("private-submit-en.png"),fullPage:true});
  await page.getByRole("button",{name:"Switch language",exact:true}).click();await expect(page.getByRole("heading",{name:"评测我的程序",exact:true})).toBeVisible();await settle(page);await page.evaluate(()=>document.documentElement.style.fontSize="200%");expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.getByLabel("GitHub 仓库",{exact:true}).focus();await expect(page.getByLabel("GitHub 仓库",{exact:true})).toBeFocused();await page.screenshot({path:info.outputPath("private-submit-zh-200.png"),fullPage:true});
  await page.evaluate(()=>document.documentElement.style.fontSize="");await settle(page);await page.screenshot({path:info.outputPath("private-submit-zh.png"),fullPage:true});
});
test("queued evaluation progresses to a completed result",async({page})=>{
  let reads=0;await prepare(page,async(route,path)=>{if(!path.endsWith(finished.id))return false;reads++;await fulfill(route,reads===1?privateRun({status:"queued",stage:"queued",has_results:false,completed_units:0,successful_units:0}):reads===2?privateRun({status:"running",stage:"building",has_results:false,completed_units:0,successful_units:0}):finished);return true;});
  await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);await expect(page.locator(".private-progress [role=status]")).toHaveText("Queued");await expect(page.locator(".private-progress [role=status]")).toHaveText("Building");await expect(page.locator(".private-progress [role=status]")).toHaveText("Completed");await expect(page.getByTestId("private-results-table")).toBeVisible();expect(reads).toBe(3);
});

test("a saved lost-response submission can be recovered while dispatch is paused",async({page})=>{
 const original={repository_url:finished.repository_url,language:"zh",revision:"stable"},idem="saved-request-idempotency";
 await prepare(page,async(route,path)=>{if(path.endsWith("/status")){await fulfill(route,{...feature,accepting:false,reason:"paused"});return true;}if(path.endsWith("/submissions")){expect(route.request().postDataJSON()).toEqual(original);expect(route.request().headers()["idempotency-key"]).toBe(idem);await fulfill(route,{run:finished,access_key:key});return true;}return false;});
 await page.addInitScript(({original,idem})=>localStorage.setItem("easymsa.benchmarkPending.v1",JSON.stringify([{fingerprint:JSON.stringify(original),key:idem}])),{original,idem});await page.goto("/#/benchmark/submit");await expect(page.getByRole("button",{name:"Check repository"})).toBeDisabled();await page.getByRole("button",{name:"Retry saved submission"}).click();await expect(page.getByTestId("private-results-table")).toBeVisible();
});
