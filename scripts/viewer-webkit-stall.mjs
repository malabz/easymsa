import { webkit, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { prepareViewerPage } from "../e2e/helpers/viewer-fixtures.ts";

// Diagnostic only. Keep the same visibility deadline, trace and video as E2E.
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const baseURL = option("--url", "http://127.0.0.1:5290/");
const out = option("--output", "test-results/round2/webkit-stall.json");
const parallel = Number(option("--parallel", "2")), runs = Number(option("--runs", "2"));
mkdirSync(path.dirname(out), { recursive: true });
const records = [];
await Promise.all(Array.from({ length: parallel }, async (_, lane) => {
  for (let run = 0; run < runs; run++) {
    const browser = await webkit.launch();
    const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 }, recordVideo: { dir: out + ".videos" } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage(), events = [], start = performance.now();
    page.on("requestfinished", request => events.push({ ms: performance.now() - start, url: request.url(), timing: request.timing() }));
    await prepareViewerPage(page);
    if (args.includes("--minimal")) await context.route("**/*", route => {
      if (new URL(route.request().url()).pathname.endsWith("probe-worker.js")) return route.fulfill({
        contentType: "text/javascript", body: "self.onmessage = () => self.postMessage('ready');"
      });
      return route.fulfill({ contentType: "text/html", body: `<!doctype html><html><body><p>Worker probe</p><script type="module">
        const worker = new Worker('./probe-worker.js', {type: 'module'});
        worker.onmessage = () => document.body.setAttribute('data-msa-status', 'true');
        worker.postMessage('start');
      </script></body></html>` });
    });
    await page.addInitScript(() => {
      const probe = window.__webkitProbe = { events: [], frames: 0, ticks: 0 };
      const record = (type, detail) => probe.events.push({ ms: performance.now(), type, ...detail });
      let lastTick = performance.now(), lastFrame = lastTick;
      const channel = new MessageChannel();
      channel.port1.onmessage = event => {
        const gap = performance.now() - event.data;
        if (gap > 250) record("message-delay", { gap });
      };
      setInterval(() => {
        const now = performance.now();
        if (now - lastTick > 250) record("timer-delay", { gap: now - lastTick });
        lastTick = now; probe.ticks++; channel.port2.postMessage(now);
      }, 100);
      const frame = () => {
        const now = performance.now();
        if (now - lastFrame > 250) record("frame-delay", { gap: now - lastFrame });
        lastFrame = now; probe.frames++; requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url, options) {
          record("worker-start", { url: String(url) });
          super(url, options);
          record("worker-end", { url: String(url) });
        }
      };
    });
    let failure = null, state;
    try {
      await page.goto("./#/examples/realignment-small?tab=alignment&stage=initial");
      await expect(page.locator("[data-msa-status]")).toBeVisible({ timeout: 12_000 });
    } catch (error) { failure = String(error); }
    try {
      state = await page.evaluate(() => ({ ...window.__webkitProbe, marks: performance.getEntriesByType("mark").map(m => ({ name: m.name, time: m.startTime })) }));
      records.push({ lane, run, elapsedMs: performance.now() - start, failure, state, events });
      writeFileSync(out, JSON.stringify(records, null, 2));
      console.log(JSON.stringify({ lane, run, failure: Boolean(failure), elapsedMs: performance.now() - start, delays: state.events }));
      await context.tracing.stop({ path: `${out}.${lane}-${run}.zip` });
    } finally { await context.close(); await browser.close(); }
  }
}));
if (records.some(record => record.failure)) process.exitCode = 1;
