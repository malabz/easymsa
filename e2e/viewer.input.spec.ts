import { expect, test } from "@playwright/test";
import { prepareViewerPage } from "./helpers/viewer-fixtures";

test.beforeEach(async ({page}) => prepareViewerPage(page));

test("file replacement releases the data owner and keeps one Worker per alignment", async ({page}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    (window as any).__viewerWorkers = {live:0, starts:0};
    window.Worker = class extends NativeWorker {
      private live = true;
      constructor(url: string | URL, options?: WorkerOptions) { super(url, options); (window as any).__viewerWorkers.live++; (window as any).__viewerWorkers.starts++; }
      terminate() { if(this.live) {this.live=false;(window as any).__viewerWorkers.live--;} super.terminate(); }
    };
  });
  await page.goto("./#/viewer");
  for (let index=0;index<3;index++) {
    const fasta=Array.from({length:100},(_,row)=>`>duplicate full title\n${"ACGT-N".repeat(400)}${"ACGT"[row%4]}${"ACGT"[index]}`).join("\n");
    await page.locator('input[type=file]').first().setInputFiles({name:`round-${index}.fasta`,mimeType:"text/plain",buffer:Buffer.from(fasta)});
    await expect(page.locator('[data-msa-status]')).toHaveAttribute("data-msa-analysis-status","ready");
    expect(await page.evaluate(()=>(window as any).__viewerWorkers)).toEqual({live:1,starts:index+1});
    await page.getByRole("button",{name:"Change file",exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__viewerWorkers.live)).toBe(0);
  }
});

for (const behavior of ["stream", "legacy", "denied"] as const) {
  test(`website alignment uses ${behavior} transport and preserves errors`, async ({page,context}) => {
    let legacyCalls=0, streamCalls=0;
    await context.route("**/api/jobs/stream-test**", async route => {
      const pathname=new URL(route.request().url()).pathname;
      // These fixtures run on a different origin from the production-built UI,
      // just like the real API. Include its CORS response header for Worker fetch.
      const headers = {"Access-Control-Allow-Origin":"*"};
      if(pathname.endsWith("/results/alignment/fasta")) {
        streamCalls++;
        if(behavior==="denied") return route.fulfill({headers,status:403,json:{error:{code:"INVALID_TOKEN",message:"Invalid or missing access token."}}});
        if(behavior==="legacy") return route.fulfill({headers,status:404,json:{detail:"Not Found"}});
        return route.fulfill({headers,contentType:"text/plain",body:">same title\nAC-G\n>same title\nACUG\n"});
      }
      if(pathname.endsWith("/results/alignment")) {
        legacyCalls++;
        return route.fulfill({headers,json:{jobId:"stream-test",truncated:false,sequenceCount:2,alignmentLength:4,sequences:[{id:"same title",sequence:"AC-G"},{id:"same title",sequence:"ACUG"}]}});
      }
      if(pathname.endsWith("/results/summary")) return route.fulfill({headers,json:{jobId:"stream-test",summary:{alignment:{sequenceCount:2,alignmentLength:4},preprocess:{},outputFiles:[]}}});
      return route.fulfill({headers,json:{jobId:"stream-test",jobName:"Stream test",status:"completed",progress:100,createdAt:"2026-11-10T00:00:00Z",preprocess:{status:"completed",mode:"audit"},algorithm:{name:"mafft",status:"completed"}}});
    });
    await page.goto("./#/results/stream-test?token=local-test&tab=alignment");
    if(behavior==="denied") {
      await expect(page.getByText(/Invalid|invalid|expired/).first()).toBeVisible();
      await expect(page.locator('[data-msa-scroll-viewport]')).toHaveCount(0);
    } else {
      await expect(page.locator('[data-msa-status]')).toHaveAttribute("data-msa-analysis-status","ready");
      await expect(page.locator('[data-msa-row-key] [data-msa-row-name]')).toHaveCount(2);
    }
    expect(streamCalls).toBe(1);
    expect(legacyCalls).toBe(behavior==="legacy"?1:0);
  });
}
