import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, writeFileSync, openSync, writeSync, closeSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { chromium } from "@playwright/test";
import { sampleViewerMemory } from "./viewer-memory.mjs";
import { zipSync } from "fflate";
import { gzipSync } from "node:zlib";

// Run against a frozen production build. Fixtures are written before any timing.
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const dist = path.resolve(option("--dist", "dist"));
const output = path.resolve(option("--output", "test-results/viewer-performance.json"));
const repetitions = Number(option("--runs", "3"));
const cpuThrottle = Number(option("--cpu-throttle", "1"));
const [viewportWidth, viewportHeight] = option("--viewport", "1440x900").split("x").map(Number);
const shapes = args.includes("--quick") ? [[5000, 10000]] : [[500,10000],[5000,10000],[50000,1000],[500,100000]];
const fixtureDir = path.join(os.tmpdir(), "easymsa-viewer-performance-v1");
mkdirSync(fixtureDir, {recursive:true});
const fixtures = shapes.map(([rows, columns]) => {
  const preparationStart=performance.now();
  const file = path.join(fixtureDir, `${rows}-${columns}.fasta`), json = file + ".json";
  const generated = !existsSync(file) || !existsSync(json);
  if (generated) {
    const fastaFd = openSync(file,"w"), jsonFd = openSync(json,"w");
    writeSync(jsonFd, JSON.stringify({jobId:"perf",truncated:false,sequenceCount:rows,alignmentLength:columns}).slice(0,-1)+',"sequences":[');
    let seed = 17; const symbols = Buffer.from("ACGTACGTACGTN-");
    for(let row=0;row<rows;row++) {
      const b=Buffer.allocUnsafe(columns);
      for(let col=0;col<columns;col++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;b[col]=symbols[seed%symbols.length];}
      writeSync(fastaFd, `>seq_${row}\n`);writeSync(fastaFd,b);writeSync(fastaFd,"\n");
      writeSync(jsonFd,(row?",":"")+JSON.stringify({id:`seq_${row}`,sequence:b.toString()}));
    }
    writeSync(jsonFd,"]}");closeSync(fastaFd);closeSync(jsonFd);
  }
  return {rows, columns, file, json, generated, preparationMs:performance.now()-preparationStart};
});
let fixture = fixtures[0];
const server = createServer(async(req,res)=>{
  if(req.method!=="GET") {res.writeHead(405,{Allow:"GET"}).end();return;}
  const pathname = new URL(req.url,"http://localhost").pathname.replace(/^\/easymsa(?=\/)/, "");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  if (pathname.startsWith("/api/jobs/perf")) {
    if (pathname.endsWith("/download")) {
      const archive=zipSync({"alignment.fasta":new Uint8Array(await readFile(fixture.file))},{level:0});
      res.setHeader("Content-Type","application/zip");res.setHeader("Content-Disposition",'attachment; filename="synthetic-alignment.zip"');res.end(archive);return;
    }
    if (pathname.endsWith("/download/alignment/gz")) {
      res.setHeader("Content-Type","application/gzip");res.end(gzipSync(await readFile(fixture.file)));return;
    }
    if (pathname.includes("/download/")) {res.writeHead(501).end("This format is not provided by the local synthetic-data preview.");return;}
    if(pathname.endsWith("/results/alignment/fasta") || pathname.endsWith("/results/alignment")) {
      const file=pathname.endsWith("/fasta")?fixture.file:fixture.json;
      res.setHeader("Content-Length",(await stat(file)).size);
      res.setHeader("Content-Type", pathname.endsWith("/fasta")?"text/plain":"application/json");
      createReadStream(file).pipe(res);return;
    }
    res.setHeader("Content-Type","application/json");
    res.end(JSON.stringify(pathname.endsWith("/results/summary") ? {
      jobId:"perf",algorithm:{name:"mafft"},summary:{alignment:{sequenceCount:fixture.rows,alignmentLength:fixture.columns},preprocess:{},outputFiles:[]}
    } : {jobId:"perf",jobName:args.includes("--serve")?"本机合成数据 · Viewer 性能体验":"Performance fixture",status:"completed",progress:100,algorithm:"mafft",createdAt:"2026-11-10T00:00:00Z",updatedAt:"2026-11-10T00:00:00Z",preprocess:{mode:"audit",strictness:"normal"}}));return;
  }
  const file=path.resolve(dist,"."+(pathname==="/"?"/index.html":pathname));
  try {
    if(!file.startsWith(dist+path.sep)) throw Error("path");
    res.setHeader("Content-Type", ({".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".woff2":"font/woff2",".json":"application/json"})[path.extname(file)]||"application/octet-stream");
    res.end(await readFile(file));
  } catch {res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(Number(option("--port", "0")),"127.0.0.1",resolve));
const base = `http://127.0.0.1:${server.address().port}`;
if (args.includes("--serve")) {
  console.log(`Read-only synthetic ${fixture.rows} x ${fixture.columns} result: ${base}/#/results/perf?token=performance-test&tab=alignment`);
  await new Promise(() => {});
}
const browser = await chromium.launch({executablePath:option("--chromium",process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE),headless:true});
const results=[];
try {
  for(fixture of fixtures) for(const entry of (args.includes("--entry") ? [option("--entry")] : ["file","result"])) for(let run=0;run<=repetitions;run++) {
    const context=await browser.newContext({viewport:{width:viewportWidth,height:viewportHeight},isMobile:viewportWidth<768,hasTouch:viewportWidth<768});
    await context.route(/\/api\/jobs\//, route=>{const u=new URL(route.request().url());return route.continue({url:base+u.pathname+u.search});});
    const page=await context.newPage(),errors=[];
    if(cpuThrottle!==1) { const emulation=await context.newCDPSession(page);await emulation.send("Emulation.setCPUThrottlingRate",{rate:cpuThrottle}); }
    page.on("pageerror",error=>errors.push(error.message));
    await page.addInitScript(()=>{
      localStorage.setItem("easymsa.locale","en");
      window.__perf={longTasks:[],workers:0,starts:0};
      const NativeWorker=window.Worker;
      window.Worker=class extends NativeWorker {
        constructor(...args){super(...args);window.__perf.workers++;window.__perf.starts++;this.live=true;}
        terminate(){if(this.live){this.live=false;window.__perf.workers--;}return super.terminate();}
      };
      new PerformanceObserver(list=>window.__perf.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:"longtask",buffered:true});
    });
    await page.goto(base+(entry==="file"?"/#/viewer":"/#/results/perf?token=performance-test&tab=overview"));
    const stopMemory = args.includes("--memory") ? await sampleViewerMemory(browser, context, page) : null;
    const automationStart=performance.now();
    if(entry==="file") {
      await page.locator('input[type=file]').first().waitFor({state:"attached"});
      await page.evaluate(()=>performance.mark("perf:start"));
      await page.locator('input[type=file]').first().setInputFiles(fixture.file);
    } else {
      await page.getByRole("tab",{name:"Alignment",exact:true}).waitFor();
      await page.evaluate(()=>performance.mark("perf:start"));
      await page.getByRole("tab",{name:"Alignment",exact:true}).click();
    }
    const automationMs=performance.now()-automationStart;
    await page.locator('[data-msa-scroll-viewport]').waitFor({timeout:90000});
    await page.locator('[data-msa-scroll-viewport]').focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(()=>Boolean(document.querySelector('[data-msa-scroll-viewport]')?.getAttribute("aria-activedescendant")));
    const interactive=await page.evaluate(()=>performance.now()-performance.getEntriesByName("perf:start")[0].startTime);
    const profiler = args.includes("--profile") ? await context.newCDPSession(page) : null;
    if (profiler) { await profiler.send("Profiler.enable"); await profiler.send("Profiler.start"); }
    const scroll = await page.locator('[data-msa-scroll-viewport]').evaluate(async el=>{
      const samples=[];let last=performance.now();
      for(let i=0;i<180;i++) {el.scrollTop=(i*57)%Math.max(1,el.scrollHeight-el.clientHeight);el.scrollLeft=(i*71)%Math.max(1,el.scrollWidth-el.clientWidth);await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-last);last=now;}
      samples.sort((a,b)=>a-b);return {p50:samples[90],p95:samples[171],max:samples[179]};
    });
    if (profiler) { const {profile} = await profiler.send("Profiler.stop"); mkdirSync(path.dirname(output),{recursive:true}); writeFileSync(output+".cpuprofile",JSON.stringify(profile)); await profiler.detach(); }
    await page.waitForFunction(()=>document.querySelector('[data-msa-status]')?.getAttribute('data-msa-analysis-status')==='ready',null,{timeout:90000});
    const settledScroll = await page.locator('[data-msa-scroll-viewport]').evaluate(async el=>{
      const samples=[];let last=performance.now();
      for(let i=0;i<180;i++) {el.scrollTop=(i*57)%Math.max(1,el.scrollHeight-el.clientHeight);el.scrollLeft=(i*71)%Math.max(1,el.scrollWidth-el.clientWidth);await new Promise(requestAnimationFrame);const now=performance.now();samples.push(now-last);last=now;}
      samples.sort((a,b)=>a-b);return {p50:samples[90],p95:samples[171],max:samples[179]};
    });
    const data=await page.evaluate(()=>({marks:performance.getEntriesByType("mark").filter(m=>m.name.startsWith("easymsa:")||m.name==="perf:start").map(m=>({name:m.name,time:m.startTime})),...window.__perf}));
    const memory = stopMemory ? await stopMemory() : undefined;
    const record={rows:fixture.rows,columns:fixture.columns,entry,run,warmup:run===0,fixturePreparationMs:fixture.preparationMs,fixtureGenerated:fixture.generated,automationMs,interactive,scroll,settledScroll,...data,errors,memory};
    results.push(record);
    console.log(JSON.stringify({...record,memory:memory?`${memory.length} snapshots`:undefined}));
    mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({dist,cpu:os.cpus()[0].model,memory:os.totalmem(),cpuThrottle,viewport:{width:viewportWidth,height:viewportHeight},browser:browser.version(),results},null,2));
    if(errors.length) throw Error(errors.join("\n"));
    await context.close();
  }
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
