import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { publicBenchmarkFixture } from "./helpers/benchmark-fixtures";
import { assertDatasetConsistency, assertDownloadConsistency, assertScatterConsistency, expectedRecords, expectedWebsiteSnapshot, parseCsv } from "./helpers/benchmark-consistency";
import type { BenchmarkSnapshot, MetricKey } from "../src/features/benchmark/model";

const archiveSnapshot = JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")) as BenchmarkSnapshot;
const rawSnapshot = expectedWebsiteSnapshot(archiveSnapshot);
const originalBatch = rawSnapshot.batches.find(batch => batch.id === "baseline-single-20261027")!;
const keys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc", "avg_sp", "scaled_sp"];
async function openBenchmark(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator(".benchmark-page h1")).toBeVisible();
  // Hash navigation can return before React commits the next route. The h1 is
  // unchanged between metrics, so wait for the requested view before reading cells.
  const route = new URL(new URL(url, "http://localhost").hash.slice(1), "http://localhost");
  const batch = route.searchParams.get("batch");
  const caseId=route.pathname.startsWith("/benchmark/datasets/") ? decodeURIComponent(route.pathname.split("/").pop()!) : null;
  if(caseId && caseId!=="missing") {
    await expect(page.getByTestId("dataset-title")).toBeVisible();
    await expect(page.getByTestId("dataset-title")).toHaveAttribute("data-dataset-id",caseId);
  }
  if(caseId!=="missing") await expect(page.getByRole("combobox", {name:/^(Evaluation batch|评测批次)$/})).toHaveValue(batch ?? "latest");
  if (route.pathname === "/benchmark") {
    await expect(page.getByTestId("benchmark-matrix")).toHaveAttribute("data-metric", route.searchParams.get("metric") ?? "wall_seconds");
  }
  // The shared page now fades in. Read final contrast and geometry after its
  // finite entry animation; keep the normal-motion UI and every axe rule enabled.
  await page.locator(".benchmark-page").evaluate(async element => {
    await Promise.all(element.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
  });
}
async function expectDocumentFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function capturePageFromTop(page: Page, path: string) {
  // Language switching uses a document view transition. Capture the settled
  // page rather than a blend of the old English and new Chinese render.
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(animation =>
      animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
  });
  await page.evaluate(() => scrollTo({top:0, behavior:"instant"}));
  await page.screenshot({path, fullPage:true});
}
async function expand(page: Page, selector: string) {
  const d = page.locator(selector);
  if (await d.getAttribute("open") === null) await d.locator(":scope > summary").click();
}
async function assertSidebarScope(page: Page, datasetIds: string[], selectedId?: string) {
  const sidebar=page.getByTestId("dataset-sidebar");
  await expect(sidebar).toBeVisible();
  const links=await sidebar.getByTestId("dataset-nav-link").evaluateAll(elements=>elements.map(element=>({
    id:element.getAttribute("data-dataset-id"),href:element.getAttribute("href"),current:element.getAttribute("aria-current"),
  })));
  expect(links.map(link=>link.id).sort()).toEqual([...datasetIds].sort());
  expect(links.filter(link=>link.current==="page").map(link=>link.id)).toEqual(selectedId?[selectedId]:[]);
  const route=new URL(new URL(page.url()).hash.slice(1),"http://localhost");
  for(const link of links) {
    const target=new URL(link.href!.replace(/^#/,""),"http://localhost");
    expect(target.pathname).toBe(`/benchmark/datasets/${link.id}`);
    for(const key of ["scope","batch","metric","type","source","reference","min","max","search","methods","all","chart","x","y","scale","zoom","method","sp","timeScale","memoryScale","plotZoom"]){
      if(route.searchParams.has(key)) expect(target.searchParams.get(key),`${link.id}/${key}`).toBe(route.searchParams.get(key));
    }
  }
}
test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("easymsa.locale", "en"));
  await page.route("**/api/**", route => route.abort());
});

test("real matrix preserves every result and all seven metrics", async ({page}, info) => {
  test.setTimeout(120_000);
  const batch = originalBatch;
  for (const key of keys) {
    await openBenchmark(page, `/#/benchmark?all=1&batch=${batch.id}&metric=${key}`);
    await expect(page.getByTestId("matrix-cell")).toHaveCount(182);
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
  await info.attach("matrix-verification.json", {contentType:"application/json", body:JSON.stringify({metrics:7,cells:1274,status:"passed"})});
});

test("filters, selected-cell deep links and download scope stay together", async ({page}) => {
  await openBenchmark(page, `/#/benchmark?all=1&batch=${originalBatch.id}`);
  await expect(page.locator(".benchmark-filter-bottom").getByText("26 of 26 datasets", {exact:true})).toBeVisible();
  await expand(page,".benchmark-extra-filters");
  await page.getByRole("combobox", {name:"Data origin",exact:true}).selectOption("simulated");
  await expect(page.locator(".benchmark-filter-bottom").getByText("14 of 26 datasets", {exact:true})).toBeVisible();
  await expand(page,".benchmark-studio-sidebar-menu");
  await page.getByLabel("Search datasets", {exact:true}).fill("sim_70");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(7);
  await expand(page, '[data-testid="download-controls"]');
  const e=page.waitForEvent("download"); await page.getByRole("button",{name:"Download JSON",exact:true}).click();
  const filtered = JSON.parse(readFileSync((await (await e).path())!, "utf8"));
  expect(filtered.catalog.datasets.map((d:{id:string})=>d.id)).toEqual(["dna_mt_sim_70"]);
  expect(filtered.batches[0].results).toHaveLength(7);
  const ce=page.waitForEvent("download"); await page.getByRole("button",{name:"Download CSV",exact:true}).click();
  expect(parseCsv(readFileSync((await (await ce).path())!,"utf8"))).toHaveLength(50);
  await page.getByRole("combobox",{name:"Download scope",exact:true}).selectOption("batch");
  await assertDownloadConsistency(page,rawSnapshot,originalBatch.id);
  await page.getByTestId("download-controls").locator("summary").click();
  const cell=page.locator('[data-testid="matrix-cell"][data-method-id="mafft"]');
  await cell.focus(); await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/datasets\/dna_mt_sim_70.*method=mafft/);
  await page.getByRole("button",{name:"Metric plots",exact:true}).click();
  await expect(page.locator('[data-testid="metric-point"][data-method="mafft"][data-metric="wall_seconds"]')).toBeVisible();
  await page.getByRole("link",{name:/All benchmark datasets/}).click();
  await expect(page.getByLabel("Search datasets",{exact:true})).toHaveValue("sim_70");
  await page.getByRole("button",{name:"Clear filters",exact:true}).click();
  await page.getByRole("combobox",{name:"Sequence type",exact:true}).selectOption("rna");
  await expand(page,".benchmark-extra-filters");
  await page.getByLabel("Minimum sequences",{exact:true}).fill("1000");
  await page.getByLabel("Maximum sequences",{exact:true}).fill("4095");
  await expect(page.locator(".benchmark-filter-bottom").getByText("3 of 26 datasets",{exact:true})).toBeVisible();
  await page.getByRole("combobox",{name:"Reference alignment",exact:true}).selectOption("no");
  await expect(page.getByText("No datasets match these filters.",{exact:true})).toBeVisible();
});

test("every real detail, point position, exact table and download matches the report", async ({page}, info) => {
  test.setTimeout(300_000);
  const batch = originalBatch;
  await openBenchmark(page,`/#/benchmark?all=1&batch=${batch.id}`);
  await assertDownloadConsistency(page,rawSnapshot,batch.id);
  for (const dataset of rawSnapshot.catalog.datasets) {
    await test.step(dataset.id, async () => {
      await openBenchmark(page,`/#/benchmark/datasets/${dataset.id}?all=1&batch=${batch.id}`);
      await assertDatasetConsistency(page,rawSnapshot,batch,dataset.id);
      await assertDownloadConsistency(page,rawSnapshot,batch.id,dataset.id);
      await expectDocumentFits(page);
    });
  }
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?all=1&batch=${originalBatch.id}`);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await assertDatasetConsistency(page,rawSnapshot,batch,"rna_255","zh");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_255","zh");
  await page.getByTestId("download-controls").locator("summary").click();
  await capturePageFromTop(page,info.outputPath("real-results-detail.png"));
  await info.attach("real-results-consistency.json",{contentType:"application/json",body:JSON.stringify({batch:batch.id,datasets:26,tableMetrics:1274,chartPanels:182,methodChartPositions:1274,jsonDownloads:28,csvDownloads:28,chineseDataset:"rna_255",status:"passed"})});
});

test("future repeats, negative SP, zero, partial and failed metrics remain distinct",async ({page})=>{
  test.setTimeout(120_000);
  const snapshot=expectedWebsiteSnapshot(publicBenchmarkFixture());
  const result=snapshot.batches[1].results.find(r=>r.dataset_id==="rna_255"&&r.method_id==="minipoa")!;
  Object.assign(result.metrics.q,{value:0,mean:0,min:0,max:0});
  Object.assign(result.metrics.tc,{value:null,mean:.8,min:.75,max:.85,display:"mean_range"});
  await page.route("**/benchmark/snapshot.json",r=>r.fulfill({json:snapshot}));
  for(const batch of snapshot.batches) for(const dataset of snapshot.catalog.datasets){
    await openBenchmark(page,"/#/benchmark/datasets/"+dataset.id);
    await assertDatasetConsistency(page,snapshot,batch,dataset.id);
    await assertScatterConsistency(page,snapshot,batch.id,dataset.id);
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
  await expect(page.getByTestId("matrix-cell")).toHaveCount(182);
  expect(await page.locator('[data-testid="matrix-cell"][data-raw-value=""]').count()).toBe(182);
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
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?all=1&batch=${originalBatch.id}`);
  if(page.viewportSize()!.width >= 1024) {
    await page.evaluate(()=>{
      const aside=document.querySelector(".benchmark-studio-sidebar")!;
      const header=document.querySelector(".app-header")!.getBoundingClientRect();
      const lastPinnedScroll=aside.parentElement!.getBoundingClientRect().bottom+scrollY-aside.getBoundingClientRect().height-header.bottom;
      // A sticky sidebar intentionally leaves with its parent at the footer.
      // Exercise the content-scroll range where it should remain under the header.
      scrollTo({top:Math.max(0,Math.min(300,lastPinnedScroll/2)),behavior:"instant"});
    });
    const geometry=await page.evaluate(()=>({
      headerBottom:document.querySelector(".app-header")!.getBoundingClientRect().bottom,
      sidebarTitleTop:document.querySelector(".benchmark-studio-sidebar-heading")!.getBoundingClientRect().top,
    }));
    expect(geometry.sidebarTitleTop).toBeGreaterThanOrEqual(geometry.headerBottom);
    await page.evaluate(()=>scrollTo({top:0,behavior:"instant"}));
  }
  expect((await new AxeBuilder({page}).include("#main-content").analyze()).violations).toEqual([]);
  await page.getByRole("button",{name:"Metric plots",exact:true}).click();
  const mobile=page.viewportSize()!.width < 768;
  if(mobile) for(const name of ["Time ↓","Peak memory ↓","SP score ↑","Q ↑","TC ↑"]) {
    await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name,exact:true}).click();
    await expect(page.locator("figure[data-metric]:visible")).toHaveCount(1);
    await expect(page.locator("figure[data-metric]:visible").getByTestId("metric-point")).toHaveCount(7);
  }
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"Time ↓",exact:true}).click();
  const point=page.locator('[data-testid="metric-point"][data-method="mafft"][data-metric="wall_seconds"]');
  await point.focus(); await expect(page.getByRole("tooltip")).toContainText("1.01");
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("combobox",{name:"Time (s) scale",exact:true}).selectOption("linear");
  await expect(page.locator('figure[data-metric="wall_seconds"]')).toHaveAttribute("data-axis-scale","linear");
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"SP score ↑",exact:true}).click();
  await page.getByRole("combobox",{name:"SP measure",exact:true}).selectOption("scaled_sp");
  await expect(page.locator('figure[data-metric="scaled_sp"]')).toHaveCount(1);
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"Q ↑",exact:true}).click();
  await page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true}).click();
  await expect(page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true})).toBeChecked();
  expect(Number(await page.locator('figure[data-metric="q"]').getAttribute("data-axis-min"))).toBeGreaterThan(.9);
  if(mobile) await page.getByRole("group",{name:"Chart metric",exact:true}).getByRole("button",{name:"Q ↑",exact:true}).click();
  await expect(page.getByText("Zoomed range",{exact:true}).first()).toBeVisible();
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
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
      // Language changes now commit inside a view transition. Wait for the
      // translated menu before checking its visibility on small screens.
      await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
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
    await openBenchmark(page,`/#/benchmark/datasets/rna_255?all=1&batch=${originalBatch.id}`);
    await expectDocumentFits(page);
    const ticks=await page.getByTestId("tradeoff-chart").locator(".tradeoff-x-tick").evaluateAll(elements=>elements.map(element=>{
      const box=element.getBoundingClientRect();return {left:box.left,right:box.right,text:element.textContent};
    }).sort((a,b)=>a.left-b.left));
    expect(ticks.length).toBeGreaterThan(1);
    for(let i=1;i<ticks.length;i++) expect(ticks[i-1].right,`${viewport.width}px/200%: ${ticks[i-1].text} overlaps ${ticks[i].text}`).toBeLessThanOrEqual(ticks[i].left);
    const labels=await page.getByTestId("tradeoff-chart").locator(".tradeoff-direct-label").evaluateAll(elements=>elements.map(element=>{
      const range=document.createRange();range.selectNodeContents(element);
      const box=range.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,text:element.textContent};
    }));
    for(let a=0;a<labels.length;a++) for(let b=a+1;b<labels.length;b++) {
      const first=labels[a],second=labels[b];
      const overlap=Math.min(first.right,second.right)-Math.max(first.left,second.left)>0.5
        && Math.min(first.bottom,second.bottom)-Math.max(first.top,second.top)>0.5;
      expect(overlap,`${viewport.width}px/200%: ${first.text} overlaps ${second.text}`).toBe(false);
    }
    await capturePageFromTop(page,info.outputPath(`text-200-scatter-${viewport.width}.png`));
    const zoom=page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true});
    await zoom.click();await expect(zoom).toBeChecked();
    expect(Number(await page.getByTestId("tradeoff-chart").getAttribute("data-y-min"))).toBeGreaterThan(0);
    const yTicks=await page.getByTestId("tradeoff-chart").locator(".tradeoff-y-tick").evaluateAll(elements=>elements.map(element=>{
      const box=element.getBoundingClientRect(),plane=element.closest(".tradeoff-plane")!,area=element.closest(".tradeoff-plot-area")!;
      return {left:box.left,right:box.right,text:element.textContent,fontSize:getComputedStyle(element).fontSize,
        planeLeft:plane.getBoundingClientRect().left,paddingLeft:getComputedStyle(area).paddingLeft,scrollX,
        viewportOffset:visualViewport?.offsetLeft,rootFont:getComputedStyle(document.documentElement).fontSize};
    }));
    for(const tick of yTicks) {
      expect(tick.left,`${viewport.width}px/200% zoom: ${tick.text} clipped left; ${JSON.stringify(tick)}`).toBeGreaterThanOrEqual(0);
      expect(tick.right,`${viewport.width}px/200% zoom: ${tick.text} clipped right`).toBeLessThanOrEqual(viewport.width+1);
    }
    await capturePageFromTop(page,info.outputPath(`text-200-zoom-${viewport.width}.png`));
    await page.locator('[data-testid="tradeoff-method"][data-method="mafft"]').click();
    const popup=page.getByTestId("tradeoff-details");
    await expect(popup).toBeVisible();
    await expect(page.getByRole("tooltip")).toContainText("MAFFT");
    await expect(page.getByRole("tooltip")).toContainText("1.01");
    const box=(await popup.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(viewport.width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(viewport.height+1);
    await page.screenshot({path:info.outputPath(`text-200-popup-${viewport.width}.png`)});
    await page.keyboard.press("Escape");await expect(popup).toHaveCount(0);
    await page.getByRole("button",{name:"Exact values",exact:true}).click();
    const region=page.getByRole("region",{name:"Scrollable method comparison",exact:true});
    await region.focus();await page.keyboard.press("ArrowRight");
    await expect.poll(()=>region.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
    await expectDocumentFits(page);
    await capturePageFromTop(page,info.outputPath(`text-200-${viewport.width}.png`));
  }
});

test("targeted repair batch keeps 11 website pairs separate from the original results", async ({page},info)=>{
  test.setTimeout(240_000);
  const repair=rawSnapshot.batches.find(batch=>batch.id === "repair15-single-20261028");
  test.skip(!repair,"No targeted repair report has been published in this snapshot yet");
  const batch=repair!;
  const expectedPairs=[
    ...["dna_16s_10k","dna_mt_100","dna_mt_1k","dna_mt_10k","rna_1023","rna_2047","rna_4095","rna_8191"].map(id=>`halign4/${id}`),
    ...["dna_mt_100","dna_mt_1k","dna_mt_10k"].map(id=>`minipoa/${id}`),
  ].sort();
  expect(batch.results.map(result=>`${result.method_id}/${result.dataset_id}`).sort()).toEqual(expectedPairs);
  expect(originalBatch.results).toHaveLength(182);
  expect(archiveSnapshot.batches.find(item => item.id === originalBatch.id)!.results).toHaveLength(234);
  expect(originalBatch.results.filter(result=>result.status==="complete")).toHaveLength(116);
  const datasets=[...new Set(batch.results.map(result=>result.dataset_id))];
  expect(datasets).toHaveLength(8);
  await openBenchmark(page,`/#/benchmark?all=1&batch=${batch.id}`);
  await expect(page.getByRole("combobox",{name:"Evaluation batch",exact:true})).toHaveValue(batch.id);
  await expect(page.getByTestId("batch-scope")).toContainText("11 method–dataset pairs across 8 datasets and 2 methods");
  for(const key of keys) {
    await openBenchmark(page,`/#/benchmark?all=1&batch=${batch.id}&metric=${key}`);
    const cells=await page.getByTestId("matrix-cell").evaluateAll(nodes=>nodes.map(node=>({dataset:node.getAttribute("data-dataset-id"),method:node.getAttribute("data-method-id"),raw:node.getAttribute("data-raw-value"),state:node.getAttribute("data-state"),text:node.textContent})));
    expect(cells).toHaveLength(182);
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
    await openBenchmark(page,`/#/benchmark/datasets/${datasetId}?all=1&batch=${batch.id}`);
    await assertDatasetConsistency(page,rawSnapshot,batch,datasetId);
    await assertDownloadConsistency(page,rawSnapshot,batch.id,datasetId);
    await expectDocumentFits(page);
  }
  // A dataset not selected for repair still has old results, but they must not
  // appear while the repair batch is selected or in its detail download.
  await openBenchmark(page,`/#/benchmark/datasets/rna_255?all=1&batch=${batch.id}`);
  await expect(page.getByRole("combobox",{name:"Evaluation batch",exact:true})).toHaveValue(batch.id);
  expect(await page.getByTestId("plot-dot").count()).toBe(0);
  await expect(page.getByTestId("dataset-batch-scope")).toContainText("0 methods included");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_255");
  await page.getByRole("combobox",{name:"Evaluation batch",exact:true}).selectOption(originalBatch.id);
  await expect(page.getByTestId("tradeoff-point").first()).toBeAttached();
  await openBenchmark(page,`/#/benchmark/datasets/rna_1023?all=1&batch=${batch.id}`);
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await assertDatasetConsistency(page,rawSnapshot,batch,"rna_1023","zh");
  await assertDownloadConsistency(page,rawSnapshot,batch.id,"rna_1023","zh");
  await info.attach("repair-results-consistency.json",{contentType:"application/json",body:JSON.stringify({batch:batch.id,pairs:11,datasets:8,metricRecords:77,matrixSlots:1274,jsonDownloads:11,csvDownloads:11,originalPairs:182,archivedOriginalPairs:234,status:"passed"})});
});

test("32 GiB batch keeps all 37 website outcomes, plots, tooltips and downloads isolated", async ({page}, info) => {
  test.setTimeout(300_000);
  const batch = rawSnapshot.batches.find(batch => batch.id === "memory32-single-20261029")!;
  expect(batch).toBeDefined();
  expect(batch.results).toHaveLength(37);
  expect(archiveSnapshot.batches.find(item => item.id === batch.id)!.results).toHaveLength(41);
  const datasets = [...new Set(batch.results.map(result => result.dataset_id))];
  expect(datasets).toHaveLength(20);
  await openBenchmark(page, `/#/benchmark?all=1&batch=${batch.id}`);
  const selector = page.getByRole("combobox", {name:"Evaluation batch", exact:true});
  await expect(selector).toHaveValue(batch.id);
  expect(await selector.locator("option").evaluateAll(options => options.map(option => (option as HTMLOptionElement).value)))
    .toEqual(["latest", batch.id, "repair15-single-20261028", originalBatch.id]);
  await expect(page.getByTestId("batch-scope")).toContainText("37 method–dataset pairs across 20 datasets and 2 methods");
  await expect(page.locator(".benchmark-run-summary")).toContainText("Complete 0 / 37");
  await expect(page.locator(".benchmark-run-summary")).toContainText("Timed out 3");
  await expect(page.locator(".benchmark-run-summary")).toContainText("Memory limit 34");
  await expect(page.locator(".benchmark-run-limits")).toHaveText("4 CPU · 32 GiB · 30 min limit");

  for (const key of keys) {
    await openBenchmark(page, `/#/benchmark?all=1&batch=${batch.id}&metric=${key}`);
    const cells = await page.getByTestId("matrix-cell").evaluateAll(nodes => nodes.map(node => ({
      dataset:node.getAttribute("data-dataset-id"), method:node.getAttribute("data-method-id"),
      raw:node.getAttribute("data-raw-value"), shown:node.getAttribute("data-display-value"),
      state:node.getAttribute("data-state"), heat:node.getAttribute("data-heat"), text:node.textContent,
    })));
    expect(cells).toHaveLength(182);
    for (const cell of cells) {
      const result = batch.results.find(result => result.dataset_id === cell.dataset && result.method_id === cell.method);
      const metric = result?.metrics[key];
      const value = metric && ["complete", "partial"].includes(metric.status) ? metric.value ?? metric.mean : null;
      const context = `${cell.dataset}/${cell.method}/${key}`;
      expect(cell.raw, context).toBe(value === null ? "" : String(value));
      expect(cell.shown, context).toBe(value === null ? "" : String(key === "max_rss_kib" ? value / 1024 : value));
      // The remaining memory-retry methods all failed; no numeric heat can be inferred.
      expect(cell.heat, context).toBe("");
      if (!result) {
        expect(cell.state, context).toBe("outside_batch");
        expect(cell.text, context).toContain("Outside this batch");
      } else if (value === null) {
        expect(cell.text, context).toContain(metric!.reason_codes.includes("no_reference") ? "No reference" : result.reason_code === "oom" ? "Memory limit" : "Timed out");
      }
    }

  }
  await assertDownloadConsistency(page, rawSnapshot, batch.id);
  for (const dataset of datasets) {
    await test.step(dataset, async () => {
      await openBenchmark(page, `/#/benchmark/datasets/${dataset}?all=1&batch=${batch.id}`);
      await assertDatasetConsistency(page, rawSnapshot, batch, dataset);
      await assertDownloadConsistency(page, rawSnapshot, batch.id, dataset);
      await expectDocumentFits(page);
    });
  }
  // Exercise filtered and full downloads through the menu, without including
  // either historical batch or unselected method/dataset pairs.
  await openBenchmark(page, `/#/benchmark?all=1&batch=${batch.id}&search=sim_70`);
  await assertDownloadConsistency(page, rawSnapshot, batch.id, "dna_mt_sim_70");
  await page.getByRole("combobox", {name:"Download scope", exact:true}).selectOption("batch");
  await assertDownloadConsistency(page, rawSnapshot, batch.id);

  await openBenchmark(page, `/#/benchmark/datasets/rna_255?all=1&batch=${batch.id}`);
  await expect(page.getByTestId("plot-dot")).toHaveCount(0);
  await assertDownloadConsistency(page, rawSnapshot, batch.id, "rna_255");
  await selector.selectOption(originalBatch.id);
  await expect(page.getByTestId("tradeoff-point").first()).toBeAttached();

  await openBenchmark(page, `/#/benchmark/datasets/dna_mt_sim_70?all=1&batch=${batch.id}&metric=max_rss_kib&method=tcoffee`);
  await page.getByRole("button", {name:"Switch language", exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await assertDatasetConsistency(page, rawSnapshot, batch, "dna_mt_sim_70", "zh");
  await assertDownloadConsistency(page, rawSnapshot, batch.id, "dna_mt_sim_70", "zh");
  await page.getByTestId("download-controls").locator("summary").click();
  if(page.viewportSize()!.width < 768) await page.getByRole("group",{name:"图表指标",exact:true}).getByRole("button",{name:"峰值内存 ↓",exact:true}).click();
  const point = page.locator('[data-testid="metric-point"][data-method="tcoffee"][data-metric="max_rss_kib"]');
  await point.click();
  await expect(point).toHaveAttribute("data-raw-value", "");
  await expect(page.getByRole("tooltip")).toContainText("达到内存限制");
  await expect(page.getByRole("tooltip")).toContainText("0/1 有效");
  await capturePageFromTop(page, info.outputPath("memory32-detail-zh.png"));
  await openBenchmark(page, `/#/benchmark?all=1&batch=${batch.id}&metric=max_rss_kib`);
  await expect(page.locator(".benchmark-run-limits")).toHaveText("4 CPU · 32 GiB · 30 分钟限时");
  await expectDocumentFits(page);
  await capturePageFromTop(page, info.outputPath("memory32-overview-zh.png"));
  await info.attach("memory32-consistency.json", {contentType:"application/json", body:JSON.stringify({
    batch:batch.id, pairs:37, archivedPairs:41, datasets:20, metricRecords:259, matrixSlots:1274,
    jsonDownloads:25, csvDownloads:25, historicalBatches:2, status:"passed",
  })});
});

test("latest whole records match all 1274 matrix, plot, table and download metrics", async ({page}, info) => {
  test.setTimeout(360_000);
  const records=expectedRecords(rawSnapshot,"latest");
  expect(records).toHaveLength(182);
  expect(records.filter(r=>r.result.status==="complete")).toHaveLength(127);
  expect(records.filter(r=>r.result.status==="timeout")).toHaveLength(21);
  expect(records.filter(r=>r.result.reason_code==="oom")).toHaveLength(34);
  expect(rawSnapshot.batches.map(b=>records.filter(r=>r.batch.id===b.id).length)).toEqual([37,11,134]);
  await openBenchmark(page,"/#/benchmark");
  await expect(page.getByRole("combobox",{name:"Evaluation batch",exact:true})).toHaveValue("latest");
  await expect(page.locator(".benchmark-run-summary")).toContainText("127");
  await assertSidebarScope(page,rawSnapshot.catalog.datasets.map(dataset=>dataset.id));
  await capturePageFromTop(page,info.outputPath("latest-matrix-en.png"));
  for(const key of keys) {
    await openBenchmark(page,`/#/benchmark?metric=${key}`);
    const cells=await page.getByTestId("matrix-cell").evaluateAll(nodes=>nodes.map(n=>({
      dataset:n.getAttribute("data-dataset-id"),method:n.getAttribute("data-method-id"),batch:n.getAttribute("data-batch-id"),
      raw:n.getAttribute("data-raw-value"),shown:n.getAttribute("data-display-value"),heat:n.getAttribute("data-heat"),text:n.textContent,
    })));
    expect(cells).toHaveLength(182);
    for(const cell of cells) {
      const {result,batch}=records.find(r=>r.result.dataset_id===cell.dataset&&r.result.method_id===cell.method)!;
      const metric=result.metrics[key];
      const value=["complete","partial"].includes(metric.status)?metric.value??metric.mean:null;
      const context=`latest/${cell.dataset}/${cell.method}/${key}`;
      expect(cell.batch,context).toBe(batch.id);
      expect(cell.raw,context).toBe(value===null?"":String(value));
      expect(cell.shown,context).toBe(value===null?"":String(key==="max_rss_kib"?value/1024:value));
      expect(cell.heat,context).toBe("");
      expect(cell.text?.trim().length,context).toBeGreaterThan(0);
    }
  }
  await assertDownloadConsistency(page,rawSnapshot,"latest");
  for(const dataset of rawSnapshot.catalog.datasets) {
    await test.step(dataset.id,async()=>{
      await openBenchmark(page,`/#/benchmark/datasets/${dataset.id}`);
      await assertScatterConsistency(page,rawSnapshot,"latest",dataset.id);
      await assertDatasetConsistency(page,rawSnapshot,"latest",dataset.id);
      await assertDownloadConsistency(page,rawSnapshot,"latest",dataset.id);
      await expectDocumentFits(page);
    });
  }
  await openBenchmark(page,"/#/benchmark/datasets/dna_mt_sim_70");
  await capturePageFromTop(page,info.outputPath("latest-tradeoff-en.png"));
  for(const x of ["wall_seconds","max_rss_kib"] as const) for(const y of ["q","tc","sp_score","avg_sp","scaled_sp"] as const) {
    await page.getByRole("combobox",{name:"Horizontal axis",exact:true}).selectOption(x);
    await page.getByRole("combobox",{name:"Vertical axis",exact:true}).selectOption(y);
    await expect(page.getByTestId("tradeoff-chart")).toHaveAttribute("data-x-key",x);
    await expect(page.getByTestId("tradeoff-chart")).toHaveAttribute("data-y-key",y);
    await assertScatterConsistency(page,rawSnapshot,"latest","dna_mt_sim_70");
  }
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("lang","zh-CN");
  await assertScatterConsistency(page,rawSnapshot,"latest","dna_mt_sim_70","zh");
  await assertDownloadConsistency(page,rawSnapshot,"latest","dna_mt_sim_70","zh");
  await page.getByTestId("download-controls").locator("summary").click();
  await capturePageFromTop(page,info.outputPath("latest-tradeoff-zh.png"));
  await openBenchmark(page,"/#/benchmark?metric=q");
  await capturePageFromTop(page,info.outputPath("latest-matrix-zh.png"));
  await info.attach("latest-consistency.json",{contentType:"application/json",body:JSON.stringify({
    pairs:182,metrics:1274,complete:127,timeout:21,oom:34,sourceCounts:[37,11,134],
    datasets:26,scatterAxesChecked:10,jsonDownloads:28,csvDownloads:28,status:"passed",
  })});
});

test("latest filters, sparse batch defaults, navigation and export scopes agree",async({page})=>{
  test.setTimeout(120_000);
  await openBenchmark(page,"/#/benchmark?type=rna");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(42);
  await assertSidebarScope(page,rawSnapshot.catalog.datasets.filter(dataset=>dataset.sequence_type==="rna").map(dataset=>dataset.id));
  const summary=page.locator(".benchmark-run-summary");
  await expect(summary).toContainText("30");await expect(summary).toContainText("42");
  await expect(summary).toContainText("Timed out 11");await expect(summary).toContainText("Memory limit 1");
  await assertDownloadConsistency(page,rawSnapshot,"latest",rawSnapshot.catalog.datasets.filter(d=>d.sequence_type==="rna").map(d=>d.id));
  await page.getByRole("combobox",{name:"Download scope",exact:true}).selectOption("batch");
  await assertDownloadConsistency(page,rawSnapshot,"latest");

  await openBenchmark(page,"/#/benchmark?type=rna&min=1000&max=4095&methods=mafft,halign4&metric=q");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(6);
  await assertSidebarScope(page,["rna_1023","rna_2047","rna_4095"]);
  await page.locator('.benchmark-matrix-dataset a[href*="datasets/rna_1023"]').click();
  await expect(page.getByRole("button",{name:"Trade-off",exact:true})).toHaveAttribute("aria-pressed","true");
  await assertSidebarScope(page,["rna_1023","rna_2047","rna_4095"],"rna_1023");
  await expect(page.getByRole("link",{name:"Previous",exact:true})).toHaveCount(0);
  await expand(page,".benchmark-studio-sidebar-menu");
  await page.locator('[data-testid="dataset-nav-link"][data-dataset-id="rna_2047"]').click();
  await expect(page.getByTestId("dataset-title")).toHaveAttribute("data-dataset-id","rna_2047");
  await assertSidebarScope(page,["rna_1023","rna_2047","rna_4095"],"rna_2047");
  await page.getByRole("link",{name:"Previous",exact:true}).click();
  await expect(page.getByTestId("dataset-title")).toHaveAttribute("data-dataset-id","rna_1023");
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page).toHaveURL(/datasets\/rna_2047/);
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page).toHaveURL(/datasets\/rna_4095/);
  await expect(page.getByRole("link",{name:"Next",exact:true})).toHaveCount(0);
  await page.getByRole("link",{name:/All benchmark datasets/}).click();
  await expect(page.getByTestId("matrix-cell")).toHaveCount(6);
  await expect(page.getByTestId("benchmark-matrix")).toHaveAttribute("data-metric","q");
  await expand(page,".benchmark-method-filter");
  const method=page.getByRole("checkbox",{name:"MAFFT",exact:true});
  await method.click();
  await expect(method).not.toBeChecked();
  await expect(page.getByTestId("matrix-cell")).toHaveCount(3);
  await assertDownloadConsistency(page,rawSnapshot,"latest",["rna_1023","rna_2047","rna_4095"],"en",["halign4"]);

  await openBenchmark(page,"/#/benchmark?batch=memory32-single-20261029");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(40);
  await assertSidebarScope(page,[...new Set(rawSnapshot.batches.find(batch=>batch.id==="memory32-single-20261029")!.results.map(result=>result.dataset_id))]);
  await expect(page.locator(".benchmark-run-summary")).toContainText("0 / 37");
  await page.getByRole("checkbox",{name:"Show full catalog",exact:true}).click();
  await expect(page.getByRole("checkbox",{name:"Show full catalog",exact:true})).toBeChecked();
  await expect(page.getByTestId("matrix-cell")).toHaveCount(182);
  await assertSidebarScope(page,rawSnapshot.catalog.datasets.map(dataset=>dataset.id));
  await page.getByRole("combobox",{name:"Evaluation batch",exact:true}).selectOption("latest");
  await expect(page.locator(".benchmark-run-summary")).toContainText("127");
  await openBenchmark(page,"/#/benchmark/datasets/dna_mt_sim_70?scope=latest&type=dna&source=simulated");
  await expect(page.locator(".benchmark-detail-titleline")).toContainText("Source label 70");
  await page.getByRole("link",{name:"Next",exact:true}).click();
  await expect(page.getByTestId("dataset-title")).toHaveAttribute("data-dataset-id","dna_mt_sim_75");
  await expect(page.locator(".benchmark-detail-titleline")).toContainText("Source label 75");
});

test("latest failures never fall back to older valid numbers",async({page})=>{
  const snapshot=expectedWebsiteSnapshot(publicBenchmarkFixture());
  const old=snapshot.batches[1];
  const record=structuredClone(old.results.find(r=>r.method_id==="mafft"&&r.dataset_id==="rna_255")!);
  record.status="failed";record.reason_code="oom";record.valid_repeats=0;
  for(const metric of Object.values(record.metrics)) Object.assign(metric,{status:"unavailable",valid_count:0,value:null,mean:null,sd:null,min:null,max:null,display:null,reason_codes:["oom"]});
  snapshot.batches.push({...structuredClone(old),id:"test-latest-failed",created_at:"2026-11-01T00:00:00Z",results:[record]});
  await page.route("**/benchmark/snapshot.json",route=>route.fulfill({json:snapshot}));
  await openBenchmark(page,"/#/benchmark?search=rna_255");
  const cell=page.locator('[data-testid="matrix-cell"][data-method-id="mafft"]');
  await expect(cell).toHaveAttribute("data-batch-id","test-latest-failed");
  await expect(cell).toHaveAttribute("data-raw-value","");
  await expect(cell).toContainText("Memory limit");
  await assertDownloadConsistency(page,snapshot,"latest","rna_255");
  await openBenchmark(page,"/#/benchmark/datasets/rna_255");
  await assertScatterConsistency(page,snapshot,"latest","rna_255");
  await expect(page.locator('[data-testid="tradeoff-point"][data-method="mafft"]')).toHaveCount(0);
  await assertDatasetConsistency(page,snapshot,"latest","rna_255");
  await page.getByRole("combobox",{name:"Evaluation batch",exact:true}).selectOption(old.id);
  await assertScatterConsistency(page,snapshot,old.id,"rna_255");
  await expect(page.locator('[data-testid="tradeoff-point"][data-method="mafft"]')).toHaveCount(1);
});

test("scatter keeps zero, overlapping, single and failed methods readable",async({page})=>{
  test.setTimeout(120_000);
  const snapshot=expectedWebsiteSnapshot(publicBenchmarkFixture());
  const batch=snapshot.batches[1];
  const rows=batch.results.filter(result=>result.dataset_id==="rna_255");
  const zero=rows.find(result=>result.method_id==="clustalo")!;
  Object.assign(zero.metrics.wall_seconds,{value:0,mean:0,sd:null,min:0,max:0,display:"single"});
  const first=rows.find(result=>result.method_id==="mafft")!;
  const overlap=rows.find(result=>result.method_id==="halign4")!;
  overlap.metrics.wall_seconds=structuredClone(first.metrics.wall_seconds);
  overlap.metrics.q=structuredClone(first.metrics.q);
  await page.route("**/benchmark/snapshot.json",route=>route.fulfill({json:snapshot}));
  await openBenchmark(page,"/#/benchmark/datasets/rna_255");
  await assertScatterConsistency(page,snapshot,"latest","rna_255");
  await expect(page.getByTestId("tradeoff-chart")).toHaveAttribute("data-x-scale","linear");
  await expect(page.getByTestId("tradeoff-chart").getByText("Non-positive value or interval: linear axis used.",{exact:true})).toBeVisible();
  for(const axis of ["x","y"]) {
    const a=page.locator('[data-testid="tradeoff-point"][data-method="mafft"]');
    const b=page.locator('[data-testid="tradeoff-point"][data-method="halign4"]');
    expect(await a.getAttribute(`data-${axis}-percent`)).toBe(await b.getAttribute(`data-${axis}-percent`));
  }
  // Coincident measurements retain their real coordinates. The accessible
  // method list lets keyboard and touch users inspect either method separately.
  for(const method of ["mafft","halign4"]) {
    const item=page.locator(`[data-testid="tradeoff-method"][data-method="${method}"]`);
    await item.focus();await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("aria-pressed","true");
    await expect(page.getByRole("tooltip")).toContainText(snapshot.methods.find(m=>m.id===method)!.name);
    await page.keyboard.press("Escape");await expect(page.getByRole("tooltip")).toHaveCount(0);
  }
  await page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true}).click();
  await expect(page.getByRole("checkbox",{name:"Zoom Q / TC differences",exact:true})).toBeChecked();
  await expect(page.getByTestId("tradeoff-chart").getByText(/^Zoomed range [0-9.]+–[0-9.]+$/)).toBeVisible();
  await assertScatterConsistency(page,snapshot,"latest","rna_255");
  expect(Number(await page.getByTestId("tradeoff-chart").getAttribute("data-y-min"))).toBeGreaterThan(0);
  await page.getByRole("combobox",{name:"Vertical axis",exact:true}).selectOption("sp_score");
  await assertScatterConsistency(page,snapshot,"latest","rna_255");
  expect(Number(await page.getByTestId("tradeoff-chart").getAttribute("data-y-max"))).toBeLessThan(0);
  await expect(page.locator('[data-testid="tradeoff-point"][data-method="fmalign2"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="tradeoff-method"][data-method="fmalign2"]')).toContainText("Scoring failed");
  await openBenchmark(page,"/#/benchmark/datasets/dna_16s_100");
  await expect(page.getByRole("combobox",{name:"Vertical axis",exact:true})).toHaveValue("sp_score");
  await expect(page.getByRole("combobox",{name:"Vertical axis",exact:true}).locator('option[value="q"]')).toHaveJSProperty("disabled",true);
  await assertScatterConsistency(page,snapshot,"latest","dna_16s_100");
  await openBenchmark(page,"/#/benchmark/datasets/rna_255?methods=mafft");
  await expect(page.getByTestId("tradeoff-point")).toHaveCount(1);
  await expect(page.getByTestId("tradeoff-method")).toHaveCount(1);
  await openBenchmark(page,"/#/benchmark/datasets/rna_255?methods=tcoffee,muscle5,kalign3,halign3");
  await expect(page.getByTestId("tradeoff-point")).toHaveCount(0);
  await expect(page.getByTestId("tradeoff-method")).toHaveCount(2);
  await expect(page.getByText("No methods have both selected measurements. See their states in the method list.",{exact:true})).toBeVisible();
  await expectDocumentFits(page);
});


test("website uses HAlign, seven methods and the shared green theme", async ({page}, info) => {
  const names = ["Clustal Omega", "T-Coffee", "MAFFT", "MUSCLE 5", "HAlign", "FMAlign2", "minipoa"];
  const removed = /HAlign 3|HAlign 4|Kalign 3/;
  await openBenchmark(page, "/#/benchmark");
  await expand(page, ".benchmark-method-filter");
  const labels = await page.getByRole("group", {name:"Select methods"}).locator("label").allTextContents();
  expect(labels).toEqual(names);
  await page.keyboard.press("Escape");
  const colors = await page.locator(".benchmark-page").evaluate(element => ({
    site:getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim(),
    accent:getComputedStyle(element).getPropertyValue("--bench-accent").trim(),
    button:getComputedStyle(element.querySelector(".benchmark-download-menu > summary")!).backgroundColor,
  }));
  expect(colors.site).toBe("#0f766e");
  expect(colors.accent).toBe(colors.site);
  expect(colors.button).toBe("rgb(15, 118, 110)");
  expect(await page.locator("#main-content").innerText()).not.toMatch(removed);
  await assertDownloadConsistency(page,rawSnapshot,"latest");
  await openBenchmark(page,"/#/benchmark/datasets/rna_255?scope=latest&zoom=1&method=halign4");
  await expect(page.getByTestId("tradeoff-method")).toHaveCount(7);
  await expect(page.locator('[data-testid="tradeoff-method"][data-method="halign4"]')).toContainText("HAlign");
  await expect(page.locator('[data-testid="tradeoff-method"][data-method="halign4"]')).not.toContainText("HAlign 4");
  expect(await page.locator("#main-content").innerText()).not.toMatch(removed);
  await expect(page.locator('[data-testid="tradeoff-point"][data-method="halign4"] .tradeoff-marker')).toHaveCSS("background-color","rgb(15, 118, 110)");
  await page.getByRole("button",{name:"Switch language",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("lang","zh-CN");
  expect(await page.locator("#main-content").innerText()).not.toMatch(removed);
  await capturePageFromTop(page,info.outputPath("green-halign-detail-zh.png"));
  await openBenchmark(page,"/#/benchmark?scope=latest&metric=wall_seconds");
  await capturePageFromTop(page,info.outputPath("green-overview-zh.png"));
  await openBenchmark(page,"/#/benchmark?all=1&methods=halign3,kalign3,mafft");
  await expect(page.getByTestId("matrix-cell")).toHaveCount(26);
  expect(await page.getByTestId("matrix-cell").evaluateAll(elements=>elements.every(element=>element.getAttribute("data-method-id")==="mafft"))).toBe(true);
  await expectDocumentFits(page);
});
