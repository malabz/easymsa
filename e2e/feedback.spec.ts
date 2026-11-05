import {test,expect,type Page,type Route} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {readFileSync} from "node:fs";
import {privateReport,privateRun} from "../src/features/benchmark/__tests__/privateFixtures";
import type {PrivateRun} from "../src/features/benchmark/privateModel";

const key="feedback-test-key-"+"a".repeat(40),sha="a".repeat(40);
const catalog=JSON.parse(readFileSync("public/benchmark/snapshot.json","utf8")).catalog;
function quickReport(){
  const report=privateReport(),ids=["dna_mt_sim_90","rna_255"];
  report.catalog={...catalog,id:catalog.id+"-quick",datasets:catalog.datasets.filter((dataset:{id:string})=>ids.includes(dataset.id))};
  report.profile={...report.profile,id:"feedback-quick-v1",dataset_version:catalog.version,limits:{...report.profile.limits,alignment_timeout_seconds:60,scorer_timeout_seconds:60}};
  report.results=report.catalog.datasets.map(dataset=>({...structuredClone(privateReport().results[0]),dataset_id:dataset.id}));
  return report;
}
const report=quickReport(),finished=privateRun({mode:"quick",profile_id:"feedback-quick-v1",total_units:2,completed_units:2,successful_units:2});
const feature={enabled:true,accepting:true,reason:null,profile_id:"feedback-full-v1",email_available:true,quick_available:true};
async function fulfill(route:Route,data:unknown,status=200){await route.fulfill({status,json:data});}
async function prepare(page:Page,handler?:(route:Route,path:string)=>Promise<boolean>){
  await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(await handler?.(route,path))return;
    if(path.endsWith("/benchmark/status"))return fulfill(route,feature);
    if(path.endsWith("/benchmark/client"))return fulfill(route,{csrf_token:"feedback-csrf"});
    if(path.endsWith("/benchmark/precheck"))return fulfill(route,{repository_id:"123",repository_url:finished.repository_url,commit_sha:sha,ref:route.request().postDataJSON().revision??"main",requirements:{build_script:true,run_script:true}});
    if(path.endsWith("/benchmark/submissions"))return fulfill(route,{run:finished,access_key:key});
    if(path.endsWith("/results"))return fulfill(route,report);
    if(path.endsWith("/logs"))return route.fulfill({status:200,body:"Fixture build and interface check passed."});
    if(path.includes("/benchmark/runs/"))return fulfill(route,finished);
    if(path.endsWith("/health/tools"))return fulfill(route,{easymsaPrep:{available:true},algorithms:{auto:true,minipoa:true,mafft:true,halign3:true},realignment:{enabled:false}});
    if(path.endsWith("/health/queue"))return fulfill(route,{queueName:"fixture",queueLength:0});
    if(path.endsWith("/health/resources"))return fulfill(route,{maxThreadPerJob:4});
    if(path.endsWith("/health"))return fulfill(route,{status:"ok"});
    await route.abort();
  });
}
async function settle(page:Page){await page.evaluate(async()=>{window.scrollTo({top:0,behavior:"instant"});await document.fonts.ready;await Promise.race([new Promise(resolve=>setTimeout(resolve,2000)),Promise.all(document.getAnimations().filter(animation=>animation.playState==="running"&&animation.effect?.getComputedTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>undefined)))]);});}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}

test("DNA/RNA submission refuses pasted and uploaded protein letters before queueing",async({page},info)=>{
  let submissions=0;await prepare(page,async(_route,path)=>{if(path.endsWith("/jobs"))submissions++;return false;});
  await page.goto("/#/submit");
  const input=page.getByLabel("FASTA sequences",{exact:true});
  await input.fill(">one\nACGT\n>two\nMELF\n");
  await expect(input).toHaveAttribute("aria-invalid","true");await expect(page.getByText(/Sequence 2 contains unsupported characters/)).toContainText('"E", "L", "F"');
  await expect(page.getByText("Format check passed",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Submit Job",exact:true})).toBeDisabled();
  await page.getByRole("tab",{name:"Upload File",exact:true}).click();
  await page.locator('#inputFile').setInputFiles({name:"protein.fa",mimeType:"text/plain",buffer:Buffer.from(">one\nACGT\n>two\nMELF\n")});
  await expect(page.getByText(/Sequence 2 contains unsupported characters/).last()).toBeVisible();
  await expect(page.getByRole("button",{name:"Submit Job",exact:true})).toBeDisabled();expect(submissions).toBe(0);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();await settle(page);await noOverflow(page);
  await page.screenshot({path:info.outputPath("nucleotide-rejection-zh.png"),fullPage:true});
});

test("repository precheck pins the quick run and full follow-up to the same commit",async({page},info)=>{
  const submitted:Record<string,unknown>[]=[],checks:Record<string,unknown>[]=[],comparisons:string[]=[];
  await prepare(page,async(route,path)=>{
    if(path.endsWith("/precheck")){checks.push(route.request().postDataJSON());return false;}
    if(path.endsWith("/submissions")){submitted.push(route.request().postDataJSON());return false;}
    if(path.endsWith("/comparison")){comparisons.push(path);return false;}
    return false;
  });
  await page.goto("/#/benchmark/submit");await expect(page.getByRole("radio",{name:/Quick evaluation/})).toBeChecked();for(const radio of await page.getByRole("radio").all()){const bounds=await radio.boundingBox();expect(bounds).not.toBeNull();expect(bounds!.width).toBeLessThanOrEqual(24);expect(bounds!.height).toBeLessThanOrEqual(24);}
  await page.getByLabel("GitHub repository",{exact:true}).fill(finished.repository_url);
  await page.getByRole("button",{name:"Check repository",exact:true}).click();
  await expect(page.getByText("Repository check passed",{exact:true})).toBeVisible();expect(submitted).toHaveLength(0);await expect(page.locator(".benchmark-precheck-result code")).toHaveText(sha);
  await page.getByRole("button",{name:"Start evaluation",exact:true}).click();
  await expect(page.getByTestId("private-results-table")).toBeVisible();expect(submitted).toEqual([{repository_url:finished.repository_url,revision:sha,mode:"quick",language:"en"}]);
  await expect(page.locator(".private-progress")).toContainText("2 / 2");expect(comparisons).toHaveLength(0);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();await settle(page);await noOverflow(page);
  await page.screenshot({path:info.outputPath("quick-result-zh.png"),fullPage:true});
  await page.getByRole("link",{name:"使用相同 commit 提交完整评测"}).click();
  await expect(page.getByRole("radio",{name:/完整评测/})).toBeChecked();await expect(page.getByLabel("版本",{exact:true})).toHaveValue(sha);
  await page.getByRole("button",{name:"检查仓库",exact:true}).click();await expect(page.locator(".benchmark-precheck-result code")).toHaveText(sha);
  expect(checks).toHaveLength(2);expect(checks[1].revision).toBe(sha);expect(submitted).toHaveLength(1);
  await settle(page);await noOverflow(page);expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath("submit-full-pinned-zh.png"),fullPage:true});
});

test("public results expose CSV, scenario guidance and keyboard-accessible metric documentation",async({page},info)=>{
  await prepare(page);await page.goto("/#/benchmark?view=matrix");await expect(page.getByTestId("matrix-cell").first()).toBeVisible();
  const introduction=page.locator(".benchmark-first-use");await introduction.locator("summary").click();await expect(introduction).toContainText("26 specific test sets");await expect(introduction.locator("tbody tr")).toHaveCount(4);
  const visibleMethods=await page.getByTestId("benchmark-matrix").locator("thead th:not(:first-child) span").allTextContents();
  expect(visibleMethods).toHaveLength(6);
  await expect(introduction.locator(".benchmark-method-guide strong")).toHaveText(visibleMethods);
  await expect(introduction.getByRole("link",{name:"Source",exact:true})).toHaveCount(visibleMethods.length);
  const menu=page.getByTestId("download-controls");await expect(menu).toBeVisible();await menu.locator("summary").click();
  await expect(menu.getByRole("button").first()).toHaveText("Download CSV");
  const downloadEvent=page.waitForEvent("download");await menu.getByRole("button",{name:"Download CSV",exact:true}).click();
  const download=await downloadEvent;const csv=readFileSync((await download.path())!,"utf8");expect(csv).toContain('"unit"');expect(csv).toContain('"KiB"');expect(csv).toContain('"result_reason"');expect(csv).toContain('"scoring_id"');expect(csv).toContain('"timeout"');
  await menu.locator("summary").click();await page.getByRole("button",{name:"Switch language",exact:true}).click();await settle(page);await noOverflow(page);
  await expect(introduction.getByRole("link",{name:"来源",exact:true})).toHaveCount(visibleMethods.length);
  await page.screenshot({path:info.outputPath("benchmark-guidance-zh.png"),fullPage:true});
  const guide=page.locator('a.benchmark-metric-help-link').first();await guide.focus();await expect(guide).toBeFocused();await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/article=benchmark-metrics/);await expect(page.getByRole("heading",{name:"Benchmark 指标：SP、Q 与 TC",exact:true})).toBeVisible();await expect(page.locator("#main-content")).toContainText("不是对当前方法做最大最小缩放");await expect(page.getByRole("link",{name:"实验室评价指标说明",exact:true})).toHaveAttribute("href","https://lab.malab.cn/MSA/basics/metrics.html");
  await noOverflow(page);
});

test("slow status loading times out, retries, and stops polling permanently invalid links",async({page})=>{
  let reads=0,invalidReads=0;
  await prepare(page,async(route,path)=>{
    if(!path.endsWith(finished.id))return false;
    if(route.request().headers().authorization!==`Bearer ${key}`){invalidReads++;await fulfill(route,{error:{code:"BENCHMARK_EXPIRED",message:"Expired",details:null}},410);return true;}
    reads++;if(reads===1)return true;
    await fulfill(route,finished);return true;
  });
  await page.clock.install();await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);
  await expect(page.getByText("Loading evaluation…",{exact:true})).toBeVisible();await page.clock.fastForward(8_000);await expect(page.getByText("Reading task status and checking your result link…",{exact:true})).toBeVisible();
  await page.clock.fastForward(12_001);await expect(page.getByRole("alert")).toContainText("Loading timed out");
  await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByTestId("private-results-table")).toBeVisible();
  await page.goto(`/#/benchmark/runs/${finished.id}?key=invalid-key`);await expect(page.getByRole("alert")).toContainText("expired");await page.clock.fastForward(120_000);expect(invalidReads).toBe(1);await expect(page.getByTestId("private-results-table")).toHaveCount(0);
});

test("removing a running record and cancelling the server job remain separate choices",async({page})=>{
  let cancellations=0;const running:PrivateRun={...finished,status:"running",stage:"building",has_results:false,completed_units:0,successful_units:0,completed_at:null,stage_started_at:new Date().toISOString(),last_progress_at:new Date().toISOString(),heartbeat_at:new Date().toISOString()};
  await prepare(page,async(route,path)=>{
    if(path.endsWith("/cancel")){cancellations++;await fulfill(route,{...running,cancel_requested:true});return true;}
    if(path.endsWith(finished.id)){await fulfill(route,running);return true;}
    return false;
  });
  await page.goto(`/#/benchmark/runs/${finished.id}?key=${key}`);await expect(page.getByText(/0\/2 means no dataset has finished yet/)).toBeVisible();
  await page.getByRole("link",{name:"Recent evaluations",exact:true}).click();await page.getByRole("button",{name:`Remove ${finished.method_name} from this browser`,exact:true}).click();
  await expect(page.getByRole("button",{name:"Keep running and remove record",exact:true})).toBeVisible();await expect(page.getByRole("button",{name:"Cancel server evaluation",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Keep running and remove record",exact:true}).click();await expect(page.getByRole("heading",{name:"No saved evaluations",exact:true})).toBeVisible();expect(cancellations).toBe(0);
});
