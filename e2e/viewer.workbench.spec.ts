import { expect, test } from "@playwright/test";
import { loadNamedFixture, openExport, prepareViewerPage, settleBrowser, viewerFixture } from "./helpers/viewer-fixtures";

test.beforeEach(async ({ page }) => { await prepareViewerPage(page); });

test("horizontal overview drags without jumping and supports click, wheel and keyboard panning", async ({page}) => {
  await loadNamedFixture(page, 'overview-touch');
  await page.getByRole('button', {name:'Full screen',exact:true}).click();
  const slider=page.getByRole('slider',{name:'Horizontal overview',exact:true});
  const matrix=page.locator('[data-msa-scroll-viewport]');
  await expect(slider.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  const thumb=page.locator('[data-msa-horizontal-thumb]');
  const box=(await thumb.boundingBox())!;
  const x=box.x+box.width/2,y=box.y+box.height/2;
  const initial=await matrix.evaluate(el=>({x:el.scrollLeft,y:el.scrollTop}));
  await page.mouse.move(x,y);await page.mouse.down();
  expect(await matrix.evaluate(el=>el.scrollLeft)).toBe(initial.x);
  await page.mouse.move(x+180,y,{steps:8});await page.mouse.up();
  await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBeGreaterThan(1000);
  expect(await matrix.evaluate(el=>el.scrollTop)).toBe(initial.y);
  await expect(page.locator('[data-msa-workspace-dock]')).toHaveCount(0);
  const panned=await matrix.evaluate(el=>el.scrollLeft);
  const track=(await slider.boundingBox())!;
  await slider.click({position:{x:track.width*.9,y:track.height/2}});
  await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBeGreaterThan(panned);
  await slider.press('End');
  await expect.poll(()=>matrix.evaluate(el=>Math.abs(el.scrollLeft-(el.scrollWidth-el.clientWidth)))).toBeLessThan(1);
  await expect(slider).toHaveAttribute('aria-valuetext',/1,024$/);
  await slider.press('Home');await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBe(0);
  await slider.press('ArrowRight');await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBe(140);
  await slider.press('Home');
  await page.mouse.move(track.x+track.width/2,track.y+track.height/2);await page.mouse.wheel(0,480);
  await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBeGreaterThan(300);
  expect(await matrix.evaluate(el=>el.scrollTop)).toBe(initial.y);
});

test("horizontal overview follows zoom, column filtering and workspace viewport changes", async ({page}) => {
  await page.goto('./#/examples/alignment-small?tab=alignment');
  const slider=page.getByRole('slider',{name:'Horizontal overview',exact:true});
  const matrix=page.locator('[data-msa-scroll-viewport]');
  await expect(slider.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  const width=(await page.locator('[data-msa-horizontal-thumb]').boundingBox())!.width;
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();await settleBrowser(page);
  await expect.poll(async()=>(await page.locator('[data-msa-horizontal-thumb]').boundingBox())!.width).toBeLessThan(width);
  await page.getByRole('button',{name:'Workspace settings'}).click();
  await page.locator('[data-msa-settings-dock] summary').filter({hasText:'Quality analysis'}).click();
  await page.getByLabel('Column filter',{exact:true}).selectOption('variable');
  await page.getByRole('button',{name:'Close panel'}).click();
  await expect(slider.locator('canvas')).toBeVisible();
  await slider.press('End');
  await expect.poll(()=>matrix.evaluate(el=>Math.abs(el.scrollLeft-(el.scrollWidth-el.clientWidth)))).toBeLessThan(1);
  const finalColumn=await page.locator('[data-msa-sequence-cell]').evaluateAll(cells=>Math.max(...cells.map(el=>Number(el.getAttribute('data-msa-position')))));
  await expect(slider).toHaveAttribute('aria-valuetext',new RegExp(`–${finalColumn}$`));
  await page.setViewportSize({width:1440,height:900});await settleBrowser(page);
  await slider.press('End');
  await expect.poll(()=>matrix.evaluate(el=>Math.abs(el.scrollLeft-(el.scrollWidth-el.clientWidth)))).toBeLessThan(1);
  await page.getByRole('button',{name:'Clear filters'}).click();await expect(slider.locator('canvas')).toBeVisible();
  await slider.press('Home');await expect.poll(()=>matrix.evaluate(el=>el.scrollLeft)).toBe(0);
  await expect(slider).toHaveAttribute('aria-valuemin','1');
});

test("result Alignment opens immersive directly; history and immediate return preserve selection", async ({ page }) => {
  await page.goto("./#/examples/alignment-small");
  await page.getByRole("tab", { name:"Alignment", exact:true }).click();
  const shell = page.locator("[data-msa-workspace-shell]");
  const status = page.locator("[data-msa-status]");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(page.getByRole("button",{name:"Back to results"})).toBeVisible();
  await expect(page.getByLabel("Result version")).toHaveCount(0);
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await page.locator("[data-msa-sequence-cell]").nth(4).click();
  const position = await status.getAttribute("data-msa-selected-position");
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await page.getByRole("button",{name:"Back to results"}).click();
  await expect(page.getByRole("tab",{name:"Overview",exact:true})).toHaveAttribute("aria-selected","true");
  await page.goForward();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(status).toHaveAttribute("data-msa-selected-position",position!);
  await expect(status).toHaveAttribute("data-msa-zoom","1.10");
  await page.goBack();
  await expect(shell).toHaveCount(0);
  await page.getByRole("tab",{name:"Alignment",exact:true}).click();
  await page.getByRole("button",{name:"Workspace settings"}).click();
  await expect(page.locator("[data-msa-settings-dock]")).toBeVisible();
  await page.reload();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await expect(page.locator("[data-msa-workspace-dock]")).toHaveCount(0);
  await expect(status).toHaveAttribute("data-msa-selected-position",position!);
});

test("desktop matrix occupies at least 75 percent with continuous compact cells", async ({ page }) => {
  await page.goto("./#/examples/alignment-small?tab=alignment");
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  for (const [width,height] of [[1280,720],[1280,800],[1440,900]]) {
    await page.setViewportSize({width,height});
    await expect(page.locator("[data-msa-workspace-matrix]")).toBeVisible();
    await settleBrowser(page);
    await expect.poll(()=>page.locator("[data-msa-workspace-matrix]").evaluate(el=>el.getBoundingClientRect().height/innerHeight)).toBeGreaterThanOrEqual(.75);
    await expect.poll(()=>page.locator("[data-msa-sequence-cell]:not([data-msa-row-key='easymsa:consensus'])").first().evaluate(el=>{
      const box=el.getBoundingClientRect();return [box.width,box.height];
    })).toEqual([14,20]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test("file upload stays embedded, full screen preserves the mounted matrix, position and zoom", async ({ page }) => {
  await page.goto("./#/viewer");
  await page.getByLabel("Upload FASTA", {exact:true}).setInputFiles({name:"viewer-validation.fasta",mimeType:"text/plain",buffer:Buffer.from(viewerFixture("layout-visual"))});
  const shell=page.locator("[data-msa-workspace-shell]");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","embedded");
  await expect(page.getByRole("button",{name:"Full screen",exact:true})).toBeVisible();
  const matrix=page.locator("[data-msa-scroll-viewport]");
  await matrix.focus(); await page.keyboard.press("ArrowRight");
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  const handle = await matrix.elementHandle();
  await page.getByRole("button",{name:"Full screen",exact:true}).click();
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  expect(await handle!.evaluate(el => el === document.querySelector("[data-msa-scroll-viewport]"))).toBe(true);
  await page.getByRole("button",{name:"Exit full screen",exact:true}).click();
  await expect(page.locator("[data-msa-status]")).toHaveAttribute("data-msa-selected-position","2");
  await expect(page.locator("[data-msa-status]")).toHaveAttribute("data-msa-zoom","1.10");
  await expect(page.locator(".msa-source-name")).toContainText("viewer-validation.fasta");
});

test("Escape closes export, popovers and panels before leaving immersive mode", async ({ page }) => {
  await loadNamedFixture(page,"layout-visual");
  await page.getByRole("button",{name:"Full screen",exact:true}).click();
  const shell=page.locator("[data-msa-workspace-shell]");
  await openExport(page);
  await expect(page.getByRole("dialog",{name:"Export MSA and QC bundle"})).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.locator(".msa-export-menu > summary").click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".msa-export-menu")).not.toHaveAttribute("open","");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.getByRole("button",{name:"Workspace settings"}).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-msa-settings-dock]")).toHaveCount(0);
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","immersive");
  await page.keyboard.press("Escape");
  await expect(shell).toHaveAttribute("data-msa-workspace-mode","embedded");
});

test("stages keep independent viewing state and Back to results preserves the chosen stage", async ({page}) => {
  await page.goto("./#/examples/realignment-small?tab=alignment&stage=initial");
  const status=page.locator("[data-msa-status]");
  await expect(status).toBeVisible();
  await page.getByRole("button",{name:"Zoom in",exact:true}).click();
  await page.getByLabel("Result version").selectOption("refined");
  await expect(status).toHaveAttribute("data-msa-zoom","1.00");
  await page.getByLabel("Result version").selectOption("initial");
  await expect(status).toHaveAttribute("data-msa-zoom","1.10");
  await page.getByRole("button",{name:"Back to results"}).click();
  await expect(page).toHaveURL(/stage=initial/);
  await expect(page.getByRole("tab",{name:"Overview",exact:true})).toHaveAttribute("aria-selected","true");
});

test("frozen tracks and two-dimensional overview stay aligned and avoid rebuilding on scroll", async ({page},testInfo)=>{
  await page.addInitScript(()=>{
    const NativeWorker=window.Worker;
    (window as any).__msaMapBuilds=0;
    window.Worker=class extends NativeWorker {
      constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(String(url).includes('minimap'))(window as any).__msaMapBuilds++;}
    };
  });
  const start=Date.now();await loadNamedFixture(page,'overview-touch');
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  await expect(page.locator('.msa-map-area canvas')).toBeVisible();
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  const loaded=Date.now()-start;
  const initialHeap=await page.evaluate(()=>(performance as any).memory?.usedJSHeapSize??null);
  const before=await page.evaluate(()=>(window as any).__msaMapBuilds);
  const tracks=page.locator('[data-msa-frozen-tracks]');const top=(await tracks.boundingBox())!.y;
  await page.getByLabel('Go to row',{exact:true}).fill('75');await page.getByLabel('Go to column',{exact:true}).fill('300');
  await page.locator('.msa-map-jump button').click();await settleBrowser(page);
  expect((await tracks.boundingBox())!.y).toBe(top);
  await expect.poll(()=>page.locator('[data-msa-scroll-viewport]').evaluate(el=>el.scrollTop)).toBeGreaterThan(1000);
  const cells=page.locator('[data-msa-sequence-cell][data-msa-position="300"]');
  const cell=await cells.last().boundingBox();const track=await page.locator('[data-msa-track-position="300"]').first().boundingBox();
  expect(Math.abs(cell!.x-track!.x)).toBeLessThan(1);
  const scrollStart=Date.now();
  for(let index=0;index<12;index++){
    await page.locator('[data-msa-scroll-viewport]').evaluate((el,n)=>{el.scrollLeft=400+n*110;el.scrollTop=500+n*60;},index);
    await settleBrowser(page);
  }
  const scrollMs=Date.now()-scrollStart;
  expect(await page.evaluate(()=>(window as any).__msaMapBuilds)).toBe(before);
  const rowKey=await page.locator('[data-msa-scroll-viewport]').evaluate(el=>{
    const i=Math.floor(el.scrollTop/20);return document.querySelector(`[data-index="${i}"][data-msa-row-key]`)?.getAttribute('data-msa-row-key');
  });
  await page.waitForTimeout(750);
  await page.getByRole('button',{name:'Workspace settings'}).click();
  await page.getByRole('button',{name:'Compact',exact:true}).click();
  await page.getByRole('button',{name:'Close panel'}).click();await settleBrowser(page);
  const restored=await page.locator('[data-msa-scroll-viewport]').evaluate(el=>{
    const i=Math.floor(el.scrollTop/32);return document.querySelector(`[data-index="${i}"][data-msa-row-key]`)?.getAttribute('data-msa-row-key');
  });
  expect(restored).toBe(rowKey);
  expect(await page.evaluate(()=>(window as any).__msaMapBuilds)).toBe(before);
  await testInfo.attach('viewer-performance.json',{body:JSON.stringify({fixture:'overview-touch',rows:128,columns:1024,loadedMs:loaded,scrollSteps:12,scrollMs,minimapBuilds:before,initialHeap,heap:await page.evaluate(()=>(performance as any).memory?.usedJSHeapSize??null),marks:await page.evaluate(()=>performance.getEntriesByType('mark').filter(m=>m.name.startsWith('easymsa:')).map(m=>({name:m.name,time:m.startTime})))},null,2),contentType:'application/json'});
});

test("compact workbench fits desktop sizes, English and Chinese, and 125-percent equivalent viewport",async({page})=>{
  await page.goto('./#/examples/alignment-small?tab=alignment');
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  for(const [width,height] of [[1280,720],[1440,900],[1600,1000],[1920,1080],[1024,576]]){
    await page.setViewportSize({width,height});await settleBrowser(page);
    await expect(page.locator('[data-msa-workspace-matrix]')).toBeVisible();
    await expect.poll(()=>page.locator('[data-msa-workspace-matrix]').evaluate(el=>el.getBoundingClientRect().height/innerHeight)).toBeGreaterThanOrEqual(.75);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(height);
  }
  await page.evaluate(()=>localStorage.setItem('easymsa.locale','zh'));await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('button',{name:'返回结果'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});


test("conservation scale magnifies similar columns, keeps exact values and survives refresh", async ({page}) => {
  await page.goto('./#/examples/alignment-small?tab=alignment');
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  const first=page.locator('[data-msa-track="conservation"][data-msa-track-position="1"]');
  const second=page.locator('[data-msa-track="conservation"][data-msa-track-position="2"]');
  await expect(first).toHaveAttribute('title','Conservation Position 1: 95%');
  await expect(first.locator('span')).toHaveCSS('height','17px');
  await expect(second.locator('span')).toHaveCSS('height','22px');
  await page.getByRole('button',{name:'Workspace settings'}).click();
  await page.locator('[data-msa-settings-dock] summary').filter({hasText:'Quality analysis'}).click();
  await expect(page.getByLabel('Conservation display',{exact:true})).toHaveValue('high');
  await page.getByLabel('Conservation display',{exact:true}).selectOption('full');
  await expect(first.locator('span')).toHaveCSS('height','21px');
  await expect(first).toHaveAttribute('title','Conservation Position 1: 95%');
  await page.getByRole('button',{name:'Close panel'}).click();
  await page.reload();
  await expect(first).toHaveAttribute('data-msa-conservation-scale','0–100%');
  await page.getByRole('button',{name:'Workspace settings'}).click();
  await page.locator('[data-msa-settings-dock] summary').filter({hasText:'Quality analysis'}).click();
  await expect(page.getByLabel('Conservation display',{exact:true})).toHaveValue('full');
  await page.getByLabel('Conservation display',{exact:true}).selectOption('high');
  await page.getByRole('button',{name:'Close panel'}).click();
  await expect(first.locator('span')).toHaveCSS('height','17px');
  await first.click();
  await expect(page.locator('[data-msa-workspace-dock]')).toHaveCount(0);
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-selected-position','1');
  const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth-window.innerWidth,y:document.documentElement.scrollHeight-window.innerHeight}));
  expect(overflow.x).toBeLessThanOrEqual(1);expect(overflow.y).toBeLessThanOrEqual(1);
});

test("conservation scale marks low values in amber and leaves uninformed columns empty",async({page})=>{
  const {loadViewerFasta}=await import('./helpers/viewer-fixtures');
  const fasta=Array.from({length:20},(_,i)=>`>scale-${i}\nA${i<19?'A':'C'}${i<18?'A':'C'}${i<16?'A':'C'}${i<15?'A':'C'}-NACGTACGT`).join('\n');
  await loadViewerFasta(page,fasta);
  const track=page.locator('[data-msa-track="conservation"]');
  await expect(track.filter({has:page.locator('[data-msa-below-range]')})).toHaveCount(1);
  await expect(page.locator('[data-msa-track="conservation"][data-msa-track-position="5"]')).toHaveAttribute('title',/75%; below 80%/);
  await expect(page.locator('[data-msa-track="conservation"][data-msa-track-position="6"] span')).toHaveCSS('height','0px');
  await expect(page.locator('[data-msa-track="conservation"][data-msa-track-position="7"] span')).toHaveCSS('height','0px');
  await page.getByRole('button',{name:'Workspace settings'}).click();
  await page.locator('[data-msa-settings-dock] summary').filter({hasText:'Quality analysis'}).click();
  await page.getByLabel('Conservation display',{exact:true}).selectOption('full');
  await expect(page.locator('[data-msa-below-range]')).toHaveCount(0);
  await expect(page.locator('[data-msa-track="conservation"][data-msa-track-position="5"] span')).toHaveCSS('height','17px');
});
