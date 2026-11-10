import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadNamedFixture, loadViewerFasta, prepareViewerPage, disableVisualNoise, settleBrowser, setViewMode } from "../e2e/helpers/viewer-fixtures.ts";

const require = createRequire(import.meta.url);
const { PNG } = require(path.join(path.dirname(require.resolve("playwright/package.json")), "node_modules/playwright-core/lib/utilsBundle.js"));
const out = "test-results/visual-parity"; mkdirSync(out,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const report=[];
try {
  for (const width of [390,768,1280,1440]) {
    const images=[];
    for (const [version,baseURL] of [["baseline",process.argv[2]],["candidate",process.argv[3]]]) {
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
        snapshots[name]=await page.locator('[data-msa-workspace-shell]').screenshot({animations:"disabled"});writeFileSync(`${out}/${width}-${version}-${name}.png`,snapshots[name]);
      };
      await capture("embedded");
      await page.getByRole("button",{name:"Full screen",exact:true}).click();await settleBrowser(page);await capture("immersive");
      await page.locator('[data-msa-scroll-viewport]').focus();await page.keyboard.press("ArrowRight");await settleBrowser(page);await capture("selection");
      await setViewMode(page,"overview");await refresh();await capture("overview");
      await page.getByRole("button",{name:"Exit full screen",exact:true}).click();
      await page.getByRole("button",{name:"Change file",exact:true}).click();
      await loadViewerFasta(page,Array.from({length:20},(_,i)=>`>duplicate title\n${"ACGT".repeat(i===0?64:4+i)}`).join("\n"));
      await disableVisualNoise(page);await refresh();await capture("unequal");
      images.push(snapshots);await context.close();
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
} finally {await browser.close();writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
if(report.some(item=>item.changed)) process.exitCode=1;
