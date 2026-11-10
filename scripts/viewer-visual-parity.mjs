import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadNamedFixture, loadViewerFasta, prepareViewerPage, disableVisualNoise, settleBrowser, setViewMode } from "../e2e/helpers/viewer-fixtures.ts";

const require = createRequire(import.meta.url);
const { PNG } = require(path.join(path.dirname(require.resolve("playwright/package.json")), "node_modules/playwright-core/lib/utilsBundle.js"));
const out = process.env.VIEWER_PARITY_OUTPUT ?? "test-results/visual-parity"; mkdirSync(out,{recursive:true});
let browser;
const report=[];
const details=[];
try {
  for (const width of (process.env.VIEWER_PARITY_WIDTHS?.split(",").map(Number) ?? [390,768,1280,1440])) {
    const images=[];
    for (const [version,baseURL] of [["baseline",process.argv[2]],["candidate",process.argv[3]]]) {
      // Isolate the browser's raster caches as well as page storage: the two
      // captures must start from the same renderer state, irrespective of order.
      browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
        args:process.env.VIEWER_PARITY_SOFTWARE === "1" ? ["--disable-gpu"] : []});
      const context=await browser.newContext({baseURL,viewport:{width,height:900}}),page=await context.newPage();
      await prepareViewerPage(page);await loadNamedFixture(page,"layout-visual");await disableVisualNoise(page);
      // The old renderer does not redraw when the test injects fonts. Make both
      // versions paint with the same loaded fonts before comparing pixel values.
      const refresh=async()=>{
        await page.locator('[data-msa-scroll-viewport]').evaluate(el=>{el.scrollLeft=14;});await settleBrowser(page);
        await page.locator('[data-msa-scroll-viewport]').evaluate(el=>{el.scrollLeft=0;});await settleBrowser(page);
      };
      await refresh();
      const snapshots={};
      const capture=async name=>{
        // The existing viewport footer commits scroll/resize dimensions after
        // a 120 ms debounce. Compare settled state, including that footer.
        await page.waitForTimeout(200); await settleBrowser(page);
        details.push({width,version,name,zoom:await page.getByRole("button",{name:"Zoom out",exact:true}).evaluate(button=>{
          const svg=button.querySelector("svg"), box=svg.getBoundingClientRect(), style=getComputedStyle(svg), matrix=svg.getScreenCTM();
          return {rect:box.toJSON(),matrix:matrix&&[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f],color:style.color,stroke:style.stroke,strokeWidth:style.strokeWidth,opacity:style.opacity,html:svg.outerHTML};
        })});
        // Compare a settled raster, not the first compositor snapshot after
        // resizing. Each build must converge independently; never select a
        // capture by whether it matches the other build.
        const shell=page.locator('[data-msa-workspace-shell]');
        let previous, stable, attempts=0;
        const deadline=Date.now()+12_000;
        while(Date.now()<deadline) {
          const current=await shell.screenshot({animations:"disabled"});attempts++;
          if(previous?.equals(current)) {stable=current;break;}
          previous=current;await settleBrowser(page);
        }
        if(!stable) throw Error(`${width} ${version} ${name}: raster did not stabilize within 12 seconds`);
        details.at(-1).captureAttempts=attempts;
        snapshots[name]=stable;writeFileSync(`${out}/${width}-${version}-${name}.png`,stable);
      };
      await capture("embedded");
      await page.getByRole("button",{name:"Full screen",exact:true}).click();await settleBrowser(page);await capture("immersive");
      await page.locator('[data-msa-scroll-viewport]').focus();await page.keyboard.press("ArrowRight");await settleBrowser(page);await capture("selection");
      await setViewMode(page,"overview");await refresh();await capture("overview");
      await page.getByRole("button",{name:"Exit full screen",exact:true}).click();
      await page.getByRole("button",{name:"Change file",exact:true}).click();
      await loadViewerFasta(page,Array.from({length:20},(_,i)=>`>duplicate title\n${"ACGT".repeat(i===0?64:4+i)}`).join("\n"));
      await disableVisualNoise(page);await refresh();await capture("unequal");
      images.push(snapshots);await context.close();await browser.close();browser=undefined;
    }
    for (const name of Object.keys(images[0])) {
      const a=PNG.sync.read(images[0][name]), b=PNG.sync.read(images[1][name]);
      let changed=0,maxDelta=0;
      if(a.width!==b.width||a.height!==b.height) throw Error(`${width} ${name}: dimensions changed`);
      for(let i=0;i<a.data.length;i+=4) {
        let differs=false;for(let c=0;c<4;c++){const delta=Math.abs(a.data[i+c]-b.data[i+c]);maxDelta=Math.max(maxDelta,delta);differs ||= delta!==0;}if(differs)changed++;
      }
      report.push({width,name,pixels: a.width*a.height,changed,maxDelta});
    }
  }
} finally {await browser?.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));writeFileSync(`${out}/geometry.json`,JSON.stringify(details,null,2));console.log(JSON.stringify(report));}
if(report.some(item=>item.changed)) process.exitCode=1;
