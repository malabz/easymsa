import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { sampleViewerMemory } from "./viewer-memory.mjs";

// Separate from timing runs: GC and the debugger deliberately affect execution.
const baseURL = process.argv[2] ?? "http://127.0.0.1:5290/";
const out = process.argv[3] ?? "test-results/memory-lifecycle.json";
const source = path.join(os.tmpdir(), "easymsa-viewer-performance-v1/5000-10000.fasta");
const text = readFileSync(source, "utf8");
const files = Array.from({length:8}, (_, index) => {
  const file = path.join(os.tmpdir(), `easymsa-viewer-lifecycle-${index}.fasta`);
  writeFileSync(file, text.replace(/^>seq_0/, `>cycle_${index}`)); return file;
});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const context = await browser.newContext({baseURL,viewport:{width:1440,height:900}}), page = await context.newPage();
const phases=[];
try {
  await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
  await page.goto("./#/viewer");
  const main = await context.newCDPSession(page);
  const targets = await browser.newBrowserCDPSession();
  const stop = await sampleViewerMemory(browser,context,page);
  const checkpoint = async (stage,index) => {
    await main.send("HeapProfiler.collectGarbage");
    const sample=await stop.capture();
    phases.push({stage,index,sample});
  };
  await checkpoint("initial",-1);
  for (let index=0;index<files.length;index++) {
    await page.locator('input[type=file]').first().setInputFiles(files[index]);
    await page.locator('[data-msa-scroll-viewport]').waitFor({timeout:90000});
    await page.waitForFunction(()=>document.querySelector('[data-msa-status]')?.getAttribute('data-msa-analysis-status')==='ready',null,{timeout:90000});
    await checkpoint("loaded",index);
    await page.getByRole("button",{name:"Change file",exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('[data-msa-status]'));
    // terminate() has returned, but CDP may still list a target which is in the
    // process of detaching (and whose heap is already inaccessible). Require
    // actual target destruction before taking the closed-state observation.
    await expect.poll(async () => (await targets.send("Target.getTargets")).targetInfos.filter(t=>t.type==="worker").length, {timeout:2000}).toBe(0);
    await checkpoint("closed",index);
  }
  const samples=await stop();
  const observations=phases;
  mkdirSync(path.dirname(out),{recursive:true});
  writeFileSync(out,JSON.stringify({browser:browser.version(),cells:50_000_000,observations,samples},null,2));
  console.log(JSON.stringify(observations.map(p=>({stage:p.stage,index:p.index,main:p.sample?.main,workers:p.sample?.workers.length}))));
  if(observations.some(p=>!p.sample || (p.stage==="closed"&&p.sample.workers.length!==0))) throw Error("A closed alignment retained its Worker, or a memory observation was missed.");
} finally {await browser.close();}
