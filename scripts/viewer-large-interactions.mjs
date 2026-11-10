import { chromium, expect } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const baseURL=process.argv[2]??"http://127.0.0.1:5290/";
const output=process.argv[3]??"test-results/large-interactions.json";
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
const records=[];
try {
  for (const [rows,columns] of [[50000,1000],[500,100000]]) {
    const context=await browser.newContext({baseURL,viewport:{width:1440,height:900}}),page=await context.newPage();
    await page.addInitScript(()=>localStorage.setItem("easymsa.locale","en"));
    await page.goto("./#/viewer");
    const file=path.join(os.tmpdir(),`easymsa-viewer-performance-v1/${rows}-${columns}.fasta`);
    await page.locator('input[type=file]').first().setInputFiles(file);
    const status=page.locator('[data-msa-status]');
    await status.waitFor({timeout:90000});
    const record={rows,columns,initialAnalysis:await status.getAttribute("data-msa-analysis-status"),operations:[]};
    const measure=async(name,run)=>{const started=performance.now();await run();record.operations.push({name,milliseconds:performance.now()-started});};
    if(rows===50000) {
      const search=page.getByRole("searchbox",{name:"Search sequence name"});
      await measure("name search during initial analysis",async()=>{
        await search.fill("seq_49999");
        await expect(page.locator(".msa-name-results")).toContainText("1 matching sequences");
      });
      await measure("filter names",async()=>{
        await page.getByLabel("Show only matching sequences",{exact:true}).check();
        await expect(page.locator('[data-msa-row-name]')).toHaveCount(1);
        await expect(page.locator('[data-msa-row-name]')).toContainText("seq_49999");
      });
      await search.fill("");
      await expect(status).toHaveAttribute("data-msa-analysis-status","ready",{timeout:90000});
      await measure("jump to row 50000",async()=>{
        await page.getByRole("spinbutton",{name:"Go to row",exact:true}).fill("50000");
        await page.getByRole("button",{name:"Go",exact:true}).click();
        await expect(page.locator('[data-msa-row-name]').filter({hasText:"seq_49999"})).toBeVisible();
      });
      await page.getByRole("button",{name:"Display",exact:true}).click();
      await page.locator("summary").filter({hasText:"Sequence order and actions"}).click();
      await measure("sort 50000 rows by name",async()=>{
        await page.getByLabel("Sort by",{exact:true}).selectOption("name");
        await expect(page.getByLabel("Sort by",{exact:true})).toHaveValue("name");
        await page.getByRole("button",{name:"Close panel",exact:true}).click();
        const viewport=page.locator('[data-msa-scroll-viewport]');
        await viewport.evaluate(el=>el.scrollTop=0);
        await expect(page.locator('[data-msa-row-name]').first()).toContainText("seq_0");
        await expect(page.locator('[data-msa-row-name]').nth(2)).toContainText("seq_10");
      });
    } else {
      await measure("jump to column 99999 during initial analysis",async()=>{
        await page.getByLabel("Search and navigation type").selectOption("position");
        const query=page.getByRole("searchbox",{name:"Go to position"});
        await query.fill("99999");await query.press("Enter");
        await expect(status).toHaveAttribute("data-msa-selected-position","99999");
      });
      await page.locator('[data-msa-scroll-viewport]').focus();await page.keyboard.press("Shift+ArrowRight");
      await expect(status).toHaveAttribute("data-msa-selected-range","99999-100000");
      await measure("export final two columns of all 500 rows",async()=>{
        await page.locator('.msa-export-menu > summary').click();
        await page.getByRole("button",{name:"Download sequences",exact:true}).click();
        const dialog=page.getByRole("dialog",{name:"Download alignment sequences"});
        await dialog.getByLabel("Sequences",{exact:true}).selectOption("all");
        await dialog.getByLabel("Columns",{exact:true}).selectOption("interval");
        const downloaded=page.waitForEvent("download");
        await dialog.getByRole("button",{name:"Download",exact:true}).click();
        const download=await downloaded;
        const actual=await readFile(await download.path(),"utf8");
        const source=(await readFile(file,"utf8")).trim().split("\n");
        const expected=source.map((line,i)=>i%2?line.slice(99998,100000):line).join("\n")+"\n";
        expect(actual).toBe(expected);
      });
    }
    records.push(record);await context.close();
  }
} finally {await browser.close();await mkdir(path.dirname(output),{recursive:true});await writeFile(output,JSON.stringify(records,null,2));console.log(JSON.stringify(records));}
