import {test,expect,type Page,type Route} from "@playwright/test";
import {readFileSync} from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import {privateRun,privateReport} from "../src/features/benchmark/__tests__/privateFixtures";
import {privateResultSchema} from "../src/features/benchmark/privateModel";

const comparison=JSON.parse(readFileSync("public/benchmark/examples/msa-kit.json","utf8"));
const candidate=comparison.candidate;
const key="workflow-test-key-"+"x".repeat(40);
const feature={enabled:true,accepting:true,reason:null,profile_id:"anonymous-gvisor32-q64-v4",email_available:true};
const finished=privateRun({method_name:candidate.name,repository_url:candidate.repository_url,commit_sha:candidate.commit_sha,completed_units:26,successful_units:25});
const results=privateResultSchema.parse({schema_version:3,run_id:finished.id,method:candidate,catalog:comparison.catalog,
  profile:{...privateReport().profile,dataset_version:comparison.catalog.version},results:comparison.results.filter((row:any)=>row.method_id===candidate.id).map(({source,...row}:any)=>row)});
async function json(route:Route,data:unknown){await route.fulfill({status:200,json:data});}
async function prepare(page:Page,handler?:(route:Route,path:string)=>Promise<boolean>){
  await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
  const mutations:string[]=[];
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    if(route.request().method()!=="GET")mutations.push(path);
    if(await handler?.(route,path))return;
    if(path.endsWith("/status"))return json(route,feature);
    if(path.endsWith("/comparison"))return json(route,comparison);
    if(path.endsWith("/results"))return json(route,results);
    if(path.endsWith("/client"))return json(route,{csrf_token:"workflow-csrf"});
    if(path.endsWith("/submissions"))return json(route,{run:finished,access_key:key});
    if(path.endsWith(finished.id))return json(route,finished);
    if(path.endsWith("/logs"))return route.fulfill({body:"Interface fixture log",contentType:"text/plain"});
    return route.abort();
  });
  return mutations;
}
async function settle(page:Page){
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));await Promise.all(document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
}

test("a clear entry lets visitors try the example and return to an intact form",async({page},info)=>{
  const mutations=await prepare(page);
  await page.goto("/#/benchmark/submit");
  const navigation=page.getByRole("navigation",{name:"Benchmark navigation",exact:true});
  await expect(navigation.getByRole("link",{name:"Submit program",exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("list",{name:"Evaluation workflow"}).locator("li")).toContainText(["Submit repository","Automatic evaluation","Compare results"]);
  await page.getByLabel("GitHub repository",{exact:true}).fill("https://github.com/example/my-aligner");
  await page.getByText("More settings",{exact:true}).click();
  await page.getByLabel("Method name",{exact:true}).fill("My aligner");
  await page.getByLabel("Version",{exact:true}).fill("stable");
  await page.getByRole("link",{name:"Try MSA-Kit",exact:true}).click();
  await expect(page.getByRole("link",{name:"Try MSA-Kit",exact:true})).toBeFocused();
  await expect(page.getByLabel("GitHub repository",{exact:true})).not.toBeEditable();
  await expect(page.getByLabel(/Notification email/)).toHaveCount(0);
  await page.getByRole("link",{name:"Submit my program",exact:true}).click();
  await expect(page.getByLabel("GitHub repository",{exact:true})).toHaveValue("https://github.com/example/my-aligner");
  await page.getByText("More settings",{exact:true}).click();
  await expect(page.getByLabel("Method name",{exact:true})).toHaveValue("My aligner");
  await expect(page.getByLabel("Version",{exact:true})).toHaveValue("stable");
  await expect(page.locator(".benchmark-submit-help > details")).not.toHaveAttribute("open");
  await page.getByRole("link",{name:"Try MSA-Kit",exact:true}).click();
  await page.getByRole("button",{name:"Try evaluation",exact:true}).click();
  await expect(page.getByTestId("comparison-root")).toHaveAttribute("data-dataset-id","rna_255");
  await page.getByRole("button",{name:"Metrics",exact:true}).click();
  if(info.project.name.includes("mobile")){
    await expect(page.getByLabel("Displayed metric",{exact:true})).toBeVisible();await page.getByLabel("Displayed metric",{exact:true}).selectOption("max_rss_kib");
    await expect(page.locator('[data-testid="comparison-metric-plot"]:visible')).toHaveCount(1);await expect(page.locator('[data-testid="comparison-metric-plot"]:visible')).toHaveAttribute("data-metric","max_rss_kib");
  }
  const memory=page.locator(`[data-testid="comparison-metric-value"][data-method="${candidate.id}"][data-metric="max_rss_kib"]`);
  const reportedMemory=comparison.results.find((row:any)=>row.dataset_id==="rna_255"&&row.method_id===candidate.id).metrics.max_rss_kib;expect(await memory.getAttribute("data-raw-value")).toBe(String(reportedMemory.value??reportedMemory.mean));
  await page.getByRole("button",{name:"Trade-off",exact:true}).click();
  expect(mutations).toEqual([]);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();await settle(page);
  await page.screenshot({path:info.outputPath("guided-example-zh.png"),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test("submission progresses to a real-data comparison with secondary recovery controls",async({page},info)=>{
  let stage="queued";
  const pending=()=>privateRun({...finished,status:"running",stage,has_results:false,completed_units:0,successful_units:0});
  const mutations=await prepare(page,async(route,path)=>{
    if(path.endsWith("/submissions")){await json(route,{run:{...pending(),status:"queued",stage:"queued"},access_key:key});return true;}
    if(path.endsWith(finished.id)){await json(route,stage==="completed"?finished:stage==="queued"?{...pending(),status:"queued"}:pending());return true;}
    return false;
  });
  await page.goto("/#/benchmark/submit");await page.getByLabel("GitHub repository",{exact:true}).fill(candidate.repository_url);
  await page.getByRole("button",{name:"Start evaluation",exact:true}).click();
  await expect(page.locator(".private-progress [role=status]")).toHaveText("Queued");
  await expect(page.getByRole("progressbar",{name:"Datasets processed",exact:true})).toHaveAttribute("max","26");
  stage="building";await expect(page.locator(".private-progress [role=status]")).toHaveText("Building",{timeout:10000});
  await expect(page.getByText("Your evaluation runs in the background. Find it again in Recent evaluations.")).toBeVisible();
  stage="completed";await expect(page.getByTestId("comparison-root")).toBeVisible({timeout:15000});
  await expect(page.getByTestId("comparison-scatter")).toHaveAttribute("data-y-key","q");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Save recovery file",exact:true})).not.toBeVisible();
  await page.locator(".benchmark-save-menu > summary").click();await expect(page.getByRole("button",{name:"Save recovery file",exact:true})).toBeVisible();
  await page.locator(".benchmark-save-menu > summary").press("Escape");await expect(page.locator(".benchmark-save-menu")).not.toHaveAttribute("open");
  await page.getByRole("button",{name:"My results",exact:true}).click();await expect(page.getByTestId("private-results-table")).toBeVisible();
  await page.getByRole("button",{name:"Compare methods",exact:true}).click();await expect(page.getByTestId("comparison-scatter")).toBeVisible();
  expect(mutations).toEqual(["/api/benchmark/client","/api/benchmark/submissions"]);
  await settle(page);await page.screenshot({path:info.outputPath("guided-completed-task-en.png"),fullPage:true});
});

test("inline errors guide focus and the empty recent list offers both next steps",async({page},info)=>{
  const mutations=await prepare(page);await page.goto("/#/benchmark/submit");
  const repository=page.getByLabel("GitHub repository",{exact:true});await repository.fill("https://gitlab.com/example/msa");await repository.press("Tab");
  await expect(repository).toHaveAttribute("aria-invalid","true");await page.getByRole("button",{name:"Start evaluation",exact:true}).click();await expect(repository).toBeFocused();
  await repository.fill(candidate.repository_url);await repository.press("Tab");await expect(repository).toHaveAttribute("aria-invalid","false");
  expect(mutations).toEqual([]);
  await settle(page);expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();await settle(page);await page.screenshot({path:info.outputPath("guided-submit-zh.png"),fullPage:true});
  await page.getByRole("navigation",{name:"Benchmark 导航",exact:true}).getByRole("link",{name:"最近评测",exact:true}).click();
  await expect(page.getByRole("heading",{name:"暂无保存的评测",exact:true})).toBeVisible();await expect(page.getByRole("link",{name:"体验 MSA-Kit",exact:true})).toBeVisible();
  await expect(page.locator('input[type="file"]')).toBeHidden();await expect(page.getByRole("textbox",{name:"结果链接",exact:true})).toBeVisible();
  await settle(page);expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);await page.screenshot({path:info.outputPath("guided-recents-zh.png"),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
