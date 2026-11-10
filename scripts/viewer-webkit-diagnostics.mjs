import { webkit, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { prepareViewerPage } from "../e2e/helpers/viewer-fixtures.ts";

const baseURL = process.argv[2] ?? "http://127.0.0.1:5290/";
const repeats = Number(process.argv[3] ?? 4);
const out = process.argv[4] ?? "test-results/round2/webkit-diagnostics.json";
const recordTrace = process.argv.includes("--trace");
mkdirSync(out.slice(0, out.lastIndexOf("/")), { recursive: true });
const browser = await webkit.launch();
const records = [];
try {
  for (let run = 0; run < repeats; run++) for (const behavior of ["legacy", "stream"]) {
    const start = performance.now(), events = [];
    const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 }, ...(recordTrace ? { recordVideo: { dir: out + ".videos" } } : {}) });
    if (recordTrace) await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    const event = (type, data) => events.push({ ms: performance.now() - start, type, ...data });
    page.on("request", request => event("request", { url: request.url() }));
    page.on("requestfinished", request => event("finished", { url: request.url(), timing: request.timing() }));
    page.on("requestfailed", request => event("failed", { url: request.url(), failure: request.failure() }));
    page.on("worker", worker => { event("worker", { url: worker.url() }); worker.on("close", () => event("worker-close", { url: worker.url() })); });
    page.on("pageerror", error => event("pageerror", { message: String(error) }));
    await prepareViewerPage(page);
    await page.addInitScript(() => {
      window.__workerEvents = [];
      const record = (type, data) => window.__workerEvents.push({ ms: performance.now(), type, ...data });
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          super(url, options); record("construct", { url: String(url) });
          this.addEventListener("message", event => record("message", { type: event.data.type, id: event.data.id, requestId: event.data.requestId, partial: Boolean(event.data.partial), result: Boolean(event.data.result) }));
          this.addEventListener("error", event => record("error", { message: event.message }));
        }
        postMessage(message, ...args) { record("post", { type: message.type, id: message.id, operation: message.operation }); return super.postMessage(message, ...args); }
        terminate() { record("terminate", {}); return super.terminate(); }
      };
    });
    await context.route("**/api/jobs/stream-test**", async route => {
      const pathname = new URL(route.request().url()).pathname;
      const headers = { "Access-Control-Allow-Origin": "*" };
      event("route", { pathname });
      if (pathname.endsWith("/results/alignment/fasta")) return behavior === "legacy"
        ? route.fulfill({ headers, status: 404, json: { detail: "Not Found" } })
        : route.fulfill({ headers, contentType: "text/plain", body: ">same title\nAC-G\n>same title\nACUG\n" });
      if (pathname.endsWith("/results/alignment")) return route.fulfill({ headers, json: { jobId: "stream-test", truncated: false, sequenceCount: 2, alignmentLength: 4, sequences: [{ id: "same title", sequence: "AC-G" }, { id: "same title", sequence: "ACUG" }] } });
      if (pathname.endsWith("/results/summary")) return route.fulfill({ headers, json: { jobId: "stream-test", summary: { alignment: { sequenceCount: 2, alignmentLength: 4 }, preprocess: {}, outputFiles: [] } } });
      return route.fulfill({ headers, json: { jobId: "stream-test", jobName: "Stream test", status: "completed", progress: 100, createdAt: "2026-11-10T00:00:00Z", preprocess: { status: "completed", mode: "audit" }, algorithm: { name: "mafft", status: "completed" } } });
    });
    let failure = null;
    try {
      await page.goto("./#/results/stream-test?token=local-test&tab=alignment");
      await expect(page.locator("[data-msa-status]")).toHaveAttribute("data-msa-analysis-status", "ready", { timeout: 12_000 });
      await expect(page.locator("[data-msa-row-key] [data-msa-row-name]")).toHaveCount(2);
    } catch (error) { failure = String(error); }
    const state = await page.evaluate(() => ({ workers: window.__workerEvents, status: document.querySelector("[data-msa-status]")?.getAttribute("data-msa-analysis-status"), marks: performance.getEntriesByType("mark").map(m => ({ name: m.name, time: m.startTime })) }));
    records.push({ run, behavior, ms: performance.now() - start, failure, state, events });
    writeFileSync(out, JSON.stringify(records, null, 2));
    console.log(JSON.stringify({ run, behavior, ms: records.at(-1).ms, failure: Boolean(failure), state: state.status }));
    if (recordTrace) await context.tracing.stop(failure ? { path: `${out}.${run}-${behavior}.zip` } : undefined);
    await context.close();
  }
} finally { await browser.close(); }
if (records.some(record => record.failure)) process.exitCode = 1;
