import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { publicBenchmarkFixture } from "./helpers/benchmark-fixtures";
import { assertDatasetConsistency, assertDownloadConsistency, parseCsv } from "./helpers/benchmark-consistency";
import type { BenchmarkSnapshot, MetricKey } from "../src/features/benchmark/model";

const rawSnapshot = JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")) as BenchmarkSnapshot;
const originalBatch = rawSnapshot.batches.find(batch => batch.id === "baseline-single-20261027")!;
const keys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc", "avg_sp", "scaled_sp"];
async function openBenchmark(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator(".benchmark-page h1")).toBeVisible();
  // Hash navigation can return before React commits the next route. The h1 is
  // unchanged between metrics, so wait for the requested view before reading cells.
  const route = new URL(new URL(url, "http://localhost").hash.slice(1), "http://localhost");
  const batch = route.searchParams.get("batch");
  if (batch) await expect(page.getByRole("combobox", {name:/^(Evaluation batch|评测批次)$/})).toHaveValue(batch);
  if (route.pathname === "/benchmark") {
    await expect(page.getByTestId("benchmark-matrix")).toHaveAttribute("data-metric", route.searchParams.get("metric") ?? "wall_seconds");
  }
}
async function expectDocumentFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function capturePageFromTop(page: Page, path: string) {
  await page.evaluate(() => scrollTo({top:0, behavior:"instant"}));
  await page.screenshot({path, fullPage:true});
}
async function expand(page: Page, selector: string) {
  const d = page.locator(selector);
  if (await d.getAttribute("open") === null) await d.locator("summary").click();
}
test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("easymsa.locale", "en"));
  await page.route("**/api/**", route => route.abort());
});

test("real matrix preserves every result and all seven metrics", async ({page}, info) => {
  test.setTimeout(120_000);
  const batch = originalBatch;
  for (const key of keys) {
    await openBenchmark(page, `/#/benchmark?batch=${batch.id}&metric=${key}`);
    await expect(page.getByTestId("matrix-cell")).toHaveCount(234);
    const cells = await page.getByTestId("matrix-cell").evaluateAll(nodes => nodes.map(n => ({
      dataset:n.getAttribute("data-dataset-id"), method:n.getAttribute("data-method-id"), key:n.getAttribute("data-metric"),
      raw:n.getAttribute("data-raw-value"), shown:n.getAttribute("data-display-value"), heat:n.getAttribute("data-heat"),
      text:n.textContent, color:getComputedStyle(n).backgroundColor
    })));
    for (const dataset of rawSnapshot.catalog.datasets) {
      const results = rawSnapshot.methods.map(m => batch.results.find(r => r.dataset_id === dataset.id && r.method_id === m.id)!);
      const values = results.map(r => ["complete", "partial"].includes(r.metrics[key].status) ? r.metrics[key].value ?? r.metrics[key].mean : null);
      const valid = values.filter((v): v is number => v !== null);
      const logarithmic = ["wall_seconds", "max_rss_kib"].includes(key) && valid.every(v => v > 0);
      const f = (v:number) => logarithmic ? Math.log10(v) : v;
      const min = Math.min(...valid.map(f)), max = Math.max(...valid.map(f));
      for (const [i, method] of rawSnapshot.methods.entries()) {
        const c = cells.find(c => c.dataset === dataset.id && c.method === method.id)!;
        expect(c.key).toBe(key);
        expect(c.raw).toBe(values[i] === null ? "" : String(values[i]));
        expect(c.shown).toBe(values[i] === null ? "" : String(key === "max_rss_kib" ? values[i]! / 1024 : values[i]));
        if (values[i] === null || valid.length < 2 || min === max) expect(c.heat).toBe("");
        else {
          let strength = (f(values[i]!) - min) / (max - min);
          if (["wall_seconds", "max_rss_kib"].includes(key)) strength = 1 - strength;
          expect(Number(c.heat)).toBeCloseTo(strength, 8);
          expect(c.color).not.toBe("rgba(0, 0, 0, 0)");
        }
        expect(c.text?.trim().length).toBeGreaterThan(0);
      }
    }
  }
  await info.attach("matrix-verification.json", {contentType:"application/json", body:JSON.stringify({metrics:7,cells:1638,status:"passed"})});
});

test("filters, selected-cell deep links and download scope stay together", async ({page}) => {
  await openBenchmark(page, `/#/benchmark?batch=${originalBatch.id}`);
  await expect(page.getByText("26 of 26 datasets", {exact:true})).toBeVisible();
  await page.getByRole("combobox", {name:"Data origin",exact:true}).selectOption("simulated");
  await expect(page.getByText("14 of 26 datasets", {exact:true})).toBeVisible();
  await page.getByLabel("Search datasets", {exact:true}).fill("sim_70");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(9);
  await expand(page, '[data-testid="download-controls"]');
  const e=page.waitForEvent("download"); await page.getByRole("button",{name:"Download JSON",exact:true}).click();
  const filtered = JSON.parse(readFileSync((await (await e).path())!, "utf8"));
  expect(filtered.catalog.datasets.map((d:{id:string})=>d.id)).toEqual(["dna_mt_sim_70"]);
  expect(filtered.batches[0].results).toHaveLength(9);
  const ce=page.waitForEvent("download"); await page.getByRole("button",{name:"Download CSV",exact:true}).click();
  expect(parseCsv(readFileSync((await (await ce).path())!,"utf8"))).toHaveLength(64);
  await page.getByRole("combobox",{name:"Download scope",exact:true}).selectOption("batch");
  await assertDownloadConsistency(page,rawSnapshot,originalBatch.id);
  await page.getByTestId("download-controls").locator("summary").click();
  const cell=page.locator('[data-testid="matrix-cell"][data-method-id="mafft"]');
  await cell.focus(); await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/datasets\/dna_mt_sim_70.*method=mafft/);
  await expect(page.locator('[data-testid="metric-point"][data-method="mafft"][data-metric="wall_seconds"]')).toBeVisible();
  await page.getByRole("link",{name:/All benchmark datasets/}).click();
  await expect(page.getByLabel("Search datasets",{exact:true})).toHaveValue("sim_70");
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  await page.getByRole("combobox",{name:"Sequence type",exact:true}).selectOption("rna");
  await page.getByText("More filters",{exact:true}).click();
  await page.getByLabel("Minimum sequences",{exact:true}).fill("1000");
  await page.getByLabel("Maximum sequences",{exact:true}).fill("4095");
  await expect(page.getByText("3 of 26 datasets",{exact:true})).toBeVisible();
  await page.getByRole("combobox",{name:"Reference alignment",exact:true}).selectOption("no");
  await expect(page.getByText("No datasets match these filters.",{exact:true})).toBeVisible();
});

test("every real detail, point position, exact table and download matches the report", async ({page}, info) => {
  test.setTimeout(300_000);
  const batch = originalBatch;
  await openBenchmark(page,`/#/benchmark?batch=${batch.id}`);
  await assertDownloadConsistency(page,rawSnapshot,batch.id);
  for (const dataset of rawSnapshot.catalog.datasets) {
    await test.step(dataset.id, async () => {
      await openBenchmark(page,`/#/benchmark/datasets/${dataset.id}?batch=${batch.id}`);
      await assertDatasetConsistency(page,rawSnapshot,batch,dataset.id);
      await assertDownloadConsistency(page,rawSnapshot,batch.id,dataset.id);
      await expectDocumentFits(page);
    });
  }
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?batch=${originalBatch.id}`);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await assertDatasetConsistency(page,rawSnapshot,batch,"rna_255","zh");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_255","zh");
  await page.getByTestId("download-controls").locator("summary").click();
  await capturePageFromTop(page,info.outputPath("real-results-detail.png"));
  await info.attach("real-results-consistency.json",{contentType:"application/json",body:JSON.stringify({batch:batch.id,datasets:26,tableMetrics:1638,chartPanels:182,methodChartPositions:1638,jsonDownloads:28,csvDownloads:28,chineseDataset:"rna_255",status:"passed"})});
});

test("future repeats, negative SP, zero, partial and failed metrics remain distinct",async ({page})=>{
  test.setTimeout(120_000);
  const snapshot=publicBenchmarkFixture();
  const result=snapshot.batches[1].results.find(r=>r.dataset_id==="rna_255"&&r.method_id==="minipoa")!;
  Object.assign(result.metrics.q,{value:0,mean:0,min:0,max:0});
  Object.assign(result.metrics.tc,{value:null,mean:.8,min:.75,max:.85,display:"mean_range"});
  await page.route("**/benchmark/snapshot.json",r=>r.fulfill({json:snapshot}));
  for(const batch of snapshot.batches) for(const dataset of snapshot.catalog.datasets){
    await openBenchmark(page,"/#/benchmark/datasets/"+dataset.id);
    await assertDatasetConsistency(page,snapshot,batch,dataset.id);
    await assertDownloadConsistency(page,snapshot,batch.id,dataset.id);
  }
});

test("empty and invalid data never create measurements", async ({page})=>{
  const empty=JSON.parse(readFileSync("contracts/benchmark-empty-catalog-v1.json","utf8"));
  let invalid=true;
  await page.route("**/benchmark/snapshot.json",r=>r.fulfill({json:invalid?{schema_version:99}:empty}));
  await page.goto("/#/benchmark");
  await expect(page.getByRole("alert")).toContainText("could not be loaded or validated");
  invalid=false; await page.getByRole("button",{name:"Try again",exact:true}).click();
  await expect(page.getByTestId("matrix-cell")).toHaveCount(234);
  expect(await page.locator('[data-testid="matrix-cell"][data-raw-value=""]').count()).toBe(234);
  await expand(page,'[data-testid="download-controls"]');
  const e=page.waitForEvent("download");await page.getByRole("button",{name:"Download CSV",exact:true}).click();
  expect(parseCsv(readFileSync((await(await e).path())!,"utf8"))).toHaveLength(1);
  await openBenchmark(page,"/#/benchmark/datasets/dna_mt_1k");
  await expect(page.getByRole("heading",{name:"Input data needs review"})).toBeVisible();
  expect(await page.getByTestId("plot-dot").count()).toBe(0);
  await openBenchmark(page,"/#/benchmark/datasets/missing");
  await expect(page.getByRole("heading",{name:"Dataset not found"})).toBeVisible();
});

test("responsive charts, tooltips, zoom and keyboard access in both languages",async({page},info)=>{
  // Multiple axe scans create temporary pages; Windows WebKit needs a larger
  // whole-journey budget. Individual expectations keep their existing limits.
  test.setTimeout(180_000);
  await openBenchmark(page,"/#/benchmark?search=rna_255");
  expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await expectDocumentFits(page);
  await capturePageFromTop(page,info.outputPath("matrix.png"));
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?batch=${originalBatch.id}`);
  expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  const mobile=page.viewportSize()!.width < 768;
  if(mobile) for(const name of ["Time ↓","Peak memory ↓","SP score ↑","Q ↑","TC ↑"]) {
    await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name,exact:true}).click();
    await expect(page.locator("figure[data-metric]:visible")).toHaveCount(1);
    await expect(page.locator("figure[data-metric]:visible").getByTestId("metric-point")).toHaveCount(9);
  }
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"Time ↓",exact:true}).click();
  const point=page.locator('[data-testid="metric-point"][data-method="mafft"][data-metric="wall_seconds"]');
  await point.focus(); await expect(page.getByRole("tooltip")).toContainText("1.01");
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("combobox",{name:"Time (s) scale",exact:true}).selectOption("linear");
  await expect(page.locator('figure[data-metric="wall_seconds"]')).toHaveAttribute("data-axis-scale","linear");
  await page.getByRole("combobox",{name:"SP measure",exact:true}).selectOption("scaled_sp");
  await expect(page.locator('figure[data-metric="scaled_sp"]')).toHaveCount(1);
  await page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true}).check();
  expect(Number(await page.locator('figure[data-metric="q"]').getAttribute("data-axis-min"))).toBeGreaterThan(.9);
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"Q ↑",exact:true}).click();
  await expect(page.getByText("Zoomed range",{exact:true}).first()).toBeVisible();
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await expectDocumentFits(page);
  expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await capturePageFromTop(page,info.outputPath("charts-zh.png"));
});

test("Benchmark is reached from About rather than the primary navigation in both languages", async ({page}, testInfo) => {
  test.setTimeout(180_000); // Both locales include an axe scan and route traversal.
  await page.goto("/#/about");
  for (const locale of ["en", "zh"] as const) {
    if (locale === "zh") {
      await page.getByRole("button", {name:"Switch language", exact:true}).click();
      const menu = page.getByRole("button", {name:"打开导航", exact:true});
      if (await menu.isVisible()) await menu.click();
      await page.getByRole("navigation", {name:"主要导航", exact:true}).getByRole("link", {name:"关于", exact:true}).click();
    }
    await expect(page.getByRole("heading", {level:1, name:locale === "en" ? "About EasyMSA" : "关于 EasyMSA", exact:true})).toBeVisible();

    const menu = page.getByRole("button", {name:locale === "en" ? "Open navigation" : "打开导航", exact:true});
    if (await menu.isVisible()) await menu.click();
    const navigation = page.getByRole("navigation", {name:locale === "en" ? "Primary navigation" : "主要导航", exact:true});
    await expect(navigation).toBeVisible();
    await expect(page.locator(".app-header").getByRole("link", {name:/Benchmark/i, includeHidden:true})).toHaveCount(0);
    const closeMenu = page.getByRole("button", {name:locale === "en" ? "Close navigation" : "关闭导航", exact:true});
    if (await closeMenu.isVisible()) {
      await page.keyboard.press("Escape");
      await expect(menu).toBeFocused();
    }

    const entry = page.locator("#main-content").getByRole("link", {name:/Benchmark/i});
    await expect(entry).toHaveCount(1);
    await expect(entry).toHaveAttribute("href", "#/benchmark");
    await expect(entry).toBeVisible();
    expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await capturePageFromTop(page, testInfo.outputPath(`about-${locale}.png`));
    await entry.focus();
    const loaded = page.waitForResponse(response => new URL(response.url()).pathname === "/benchmark/snapshot.json");
    await page.keyboard.press("Enter");
    await (await loaded).finished();
    await expect(page).toHaveURL(/#\/benchmark$/);
    await expect(page.getByRole("heading", {level:1, name:"Benchmark", exact:true})).toBeVisible();
  }
});



test("small screens and 200 percent text keep controls, plots and tables usable",async({page},info)=>{
  test.setTimeout(120_000);
  await page.emulateMedia({reducedMotion:"reduce"});
  for(const viewport of [{width:375,height:812},{width:812,height:375}]) {
    await page.setViewportSize(viewport);
    await openBenchmark(page,"/#/benchmark?search=rna_255");
    await page.addStyleTag({content:"html {font-size:200% !important;}"});
    await expectDocumentFits(page);
    await openBenchmark(page,`/#/benchmark/datasets/rna_255?batch=${originalBatch.id}`);
    await expectDocumentFits(page);
    await page.getByRole("button",{name:"Exact values",exact:true}).click();
    const region=page.getByRole("region",{name:"Scrollable method comparison",exact:true});
    await region.focus();await page.keyboard.press("ArrowRight");
    await expect.poll(()=>region.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
    await expectDocumentFits(page);
    await capturePageFromTop(page,info.outputPath(`text-200-${viewport.width}.png`));
  }
});

test("targeted repair batch keeps 15 real pairs separate from the original results", async ({page},info)=>{
  test.setTimeout(240_000);
  const repair=rawSnapshot.batches.find(batch=>batch.id!==originalBatch.id && batch.results.length===15);
  test.skip(!repair,"No targeted repair report has been published in this snapshot yet");
  const batch=repair!;
  const expectedPairs=[
    ...["70","75","80","85"].map(label=>`halign3/dna_mt_sim_${label}`),
    ...["dna_16s_10k","dna_mt_100","dna_mt_1k","dna_mt_10k","rna_1023","rna_2047","rna_4095","rna_8191"].map(id=>`halign4/${id}`),
    ...["dna_mt_100","dna_mt_1k","dna_mt_10k"].map(id=>`minipoa/${id}`),
  ].sort();
  expect(batch.results.map(result=>`${result.method_id}/${result.dataset_id}`).sort()).toEqual(expectedPairs);
  expect(originalBatch.results).toHaveLength(234);
  expect(originalBatch.results.filter(result=>result.status==="complete")).toHaveLength(163);
  const datasets=[...new Set(batch.results.map(result=>result.dataset_id))];
  expect(datasets).toHaveLength(12);
  await openBenchmark(page,"/#/benchmark");
  await expect(page.getByRole("combobox",{name:"Evaluation batch",exact:true})).toHaveValue(batch.id);
  await expect(page.getByTestId("batch-scope")).toContainText("15 method–dataset pairs across 12 datasets and 3 methods");
  for(const key of keys) {
    await openBenchmark(page,`/#/benchmark?batch=${batch.id}&metric=${key}`);
    const cells=await page.getByTestId("matrix-cell").evaluateAll(nodes=>nodes.map(node=>({dataset:node.getAttribute("data-dataset-id"),method:node.getAttribute("data-method-id"),raw:node.getAttribute("data-raw-value"),state:node.getAttribute("data-state"),text:node.textContent})));
    expect(cells).toHaveLength(234);
    for(const cell of cells) {
      const result=batch.results.find(result=>result.dataset_id===cell.dataset && result.method_id===cell.method);
      const metric=result?.metrics[key];
      const value=metric&&["complete","partial"].includes(metric.status)?metric.value??metric.mean:null;
      expect(cell.raw).toBe(value===null?"":String(value));
      if(!result){expect(cell.state).toBe("outside_batch");expect(cell.text).toContain("Outside this batch");}
    }
  }
  await assertDownloadConsistency(page,rawSnapshot,batch.id);
  for(const datasetId of datasets) {
    await openBenchmark(page,`/#/benchmark/datasets/${datasetId}?batch=${batch.id}`);
    await assertDatasetConsistency(page,rawSnapshot,batch,datasetId);
    await assertDownloadConsistency(page,rawSnapshot,batch.id,datasetId);
    await expectDocumentFits(page);
  }
  // A dataset not selected for repair still has old results, but they must not
  // appear while the repair batch is selected or in its detail download.
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?batch=${batch.id}`);
  await expect(page.getByRole("combobox",{name:"Evaluation batch",exact:true})).toHaveValue(batch.id);
  expect(await page.getByTestId("plot-dot").count()).toBe(0);
  await expect(page.getByTestId("dataset-batch-scope")).toContainText("0 methods included");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_255");
  await page.getByRole("combobox",{name:"Evaluation batch",exact:true}).selectOption(originalBatch.id);
  expect(await page.getByTestId("plot-dot").count()).toBeGreaterThan(0);
  await openBenchmark(page,`/#/benchmark/datasets/rna_1023?batch=${batch.id}`);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await assertDatasetConsistency(page,rawSnapshot,batch,"rna_1023","zh");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_1023","zh");
  await info.attach("repair-results-consistency.json",{contentType:"application/json",body:JSON.stringify({batch:batch.id,pairs:15,datasets:12,metricRecords:105,matrixSlots:1638,jsonDownloads:15,csvDownloads:15,originalPairs:234,status:"passed"})});
});
