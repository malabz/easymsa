// Independent browser assertions: do not import production formatting/export helpers.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { BenchmarkBatch, BenchmarkMetric, BenchmarkSnapshot, MetricKey } from "../../src/features/benchmark/model";

const keys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "avg_sp", "scaled_sp", "q", "tc"];
const chartKeys: MetricKey[] = ["wall_seconds", "max_rss_kib", "scaled_sp", "q", "tc"];
export function expectedEmphasis(values:(number|null)[],key:MetricKey) {
  const valid=values.filter((value):value is number=>value!==null);
  const lower=["wall_seconds","max_rss_kib"].includes(key);
  const logarithmic=lower && valid.every(value=>value>0);
  const transform=(value:number)=>logarithmic ? Math.log10(value) : value;
  const min=Math.min(...valid.map(transform)),max=Math.max(...valid.map(transform));
  const best=lower ? Math.min(...valid) : Math.max(...valid);
  return values.map(value=>{
    if(value===null || valid.length<2 || min===max) return {heat:"",tone:"neutral",best:"false"};
    const strength=lower ? 1-(transform(value)-min)/(max-min) : (transform(value)-min)/(max-min);
    return {heat:String(strength),tone:String(Math.min(4,Math.floor(strength*4))),best:String(value===best)};
  });
}
const states: Record<string, string> = {complete:"Complete", partial:"Partial", failed:"Failed", timeout:"Timed out", unsupported:"Unsupported", not_run:"Not evaluated", unavailable:"Unavailable", not_applicable:"Not applicable"};
const reasons: Record<string, string> = {no_reference:"No reference alignment", reference_invalid:"Reference requires review", invalid_output:"Invalid output", timeout:"Timed out", oom:"Memory limit", unsupported:"Unsupported", not_run:"Not evaluated", execution_failed:"Failed", scoring_failed:"Scoring failed", cancelled:"Cancelled", incomplete:"Incomplete repetitions", platform_error:"Evaluation unavailable"};
const statesZh: Record<string, string> = {complete:"完整", partial:"部分完成", failed:"失败", timeout:"超时", unsupported:"不支持", not_run:"待评测", unavailable:"无可用成绩", not_applicable:"不适用"};
const reasonsZh: Record<string, string> = {no_reference:"无参考比对", reference_invalid:"参考比对待检查", invalid_output:"输出无效", timeout:"超时", oom:"内存超限", unsupported:"不支持", not_run:"待评测", execution_failed:"运行失败", scoring_failed:"评分失败", cancelled:"已取消", incomplete:"重复运行未完成", platform_error:"评测异常"};
type Locale = "en" | "zh";

/** Website expectations, independently stated without the production catalog helper. */
export function expectedWebsiteSnapshot(archive: BenchmarkSnapshot): BenchmarkSnapshot {
  const ids = ["clustalo", "mafft", "muscle5", "halign4", "fmalign2", "minipoa"];
  return {
    ...archive,
    catalog:{...archive.catalog,datasets:archive.catalog.datasets.map(dataset=>
      ["rna_255","rna_511","rna_1023","rna_2047","rna_4095","rna_8191"].includes(dataset.id)
        ? {...dataset,source_kind:"simulated" as const} : dataset)},
    methods: archive.methods.filter(method => ids.includes(method.id))
      .map(method => ({ ...method, name: method.id === "halign4" ? "HAlign" : method.name })),
    batches: archive.batches.map(batch => ({ ...batch,
      methods: batch.methods.filter(method => ids.includes(method.method_id)),
      results: batch.results.filter(result => ids.includes(result.method_id)),
    })).filter(batch => batch.methods.length > 0),
  };
}

function numeric(metric: BenchmarkMetric): number | null {
  return metric.status === "complete" || metric.status === "partial" ? metric.value ?? metric.mean : null;
}
function number(value: number, key: MetricKey, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {maximumSignificantDigits:21}).format(key === "max_rss_kib" ? value / 1024 : value);
}
function display(metric: BenchmarkMetric, key: MetricKey, reference: boolean, locale: Locale) {
  if (!reference && (key === "q" || key === "tc")) return locale === "en" ? "No reference" : "无参考";
  const value = numeric(metric);
  if (value === null) return metric.reason_codes.length ? [...new Set(metric.reason_codes.map(code => (locale === "en" ? reasons : reasonsZh)[code]))].join(" · ") : (locale === "en" ? states : statesZh)[metric.status];
  let result = number(value, key, locale);
  if (metric.display === "mean_sd") result += ` ± ${number(metric.sd!, key, locale)}`;
  if (metric.display === "mean_range") result += ` [${number(metric.min!, key, locale)}–${number(metric.max!, key, locale)}]`;
  if (metric.status === "partial") result += locale === "en" ? " · Partial" : " · 部分完成";
  return result;
}
function coverage(metric: BenchmarkMetric, key: MetricKey, locale: Locale) {
  return `${metric.valid_count}/${metric.planned_count} ${locale === "en" ? "valid" : "有效"}` + (metric.display === "mean_sd" ? ` · ${locale === "en" ? "range" : "范围"} ${number(metric.min!, key, locale)}–${number(metric.max!, key, locale)}` : "");
}

/** Independent source selection: one whole record per pair, never best-score selection. */
export function expectedRecords(snapshot: BenchmarkSnapshot, batchId: string) {
  if (batchId !== "latest") {
    const batch = snapshot.batches.find(b => b.id === batchId);
    return batch?.results.map(result => ({result, batch})) ?? [];
  }
  const found = new Map<string, {result:BenchmarkBatch["results"][number]; batch:BenchmarkBatch}>();
  const batches = [...snapshot.batches].sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at) || b.id.localeCompare(a.id));
  for (const batch of batches) {
    if (batch.dataset_id !== snapshot.catalog.id || batch.dataset_version !== snapshot.catalog.version) continue;
    for (const result of batch.results) {
      const key = `${result.dataset_id}/${result.method_id}`;
      if (!found.has(key)) found.set(key, {result, batch});
    }
  }
  return [...found.values()];
}

export function expectedDownload(snapshot: BenchmarkSnapshot, batchId: string, caseIds?: string[], methodIds?: string[]) {
  const datasets = snapshot.catalog.datasets.filter(d => !caseIds || caseIds.includes(d.id));
  const sources = new Set(datasets.map(d => d.source_id));
  const records = expectedRecords(snapshot,batchId).filter(({result}) =>
    (!caseIds || caseIds.includes(result.dataset_id)) && (!methodIds || methodIds.includes(result.method_id)));
  const batches = snapshot.batches.filter(batch => batchId === "latest" || batch.id === batchId)
    .map(batch => ({...batch,results:batch.results.filter(result => records.some(row => row.batch.id===batch.id && row.result===result))}))
    .filter(batch => batchId !== "latest" || batch.results.length > 0);
  return {...snapshot,catalog:{...snapshot.catalog,datasets,sources:snapshot.catalog.sources.filter(source=>sources.has(source.id))},batches};
}

/** Independently check raw values, user-visible values and the rendered point coordinates. */
export async function assertDatasetConsistency(page: Page, snapshot: BenchmarkSnapshot, batch: BenchmarkBatch | "latest", caseId: string, locale: Locale = "en") {
  const dataset = snapshot.catalog.datasets.find(d => d.id === caseId)!;
  const batchId = batch === "latest" ? "latest" : batch.id;
  const records = expectedRecords(snapshot,batchId);
  const tableToggle = page.getByRole("button", {name:locale === "en" ? "Values" : "数值表", exact:true});
  await tableToggle.click();
  const table = page.getByTestId("precise-results");
  await expect(table).toBeVisible();
  const observed = await table.locator("td[data-metric]").evaluateAll(cells => cells.map(cell => ({
    method:cell.getAttribute("data-method"), key:cell.getAttribute("data-metric"), raw:cell.getAttribute("data-raw-value"),
    batch:cell.getAttribute("data-batch-id"), display:cell.querySelector("div > span")?.textContent, text:cell.textContent,
    heat:cell.getAttribute("data-heat"),tone:cell.getAttribute("data-tone"),best:cell.getAttribute("data-best")
  })));
  expect(observed).toHaveLength(snapshot.methods.length * 5);
  for (const method of snapshot.methods) for (const key of chartKeys) {
    const record = records.find(({result}) => result.dataset_id === caseId && result.method_id === method.id);
    const metric = record?.result.metrics[key];
    const cell = observed.find(c => c.method === method.id && c.key === key)!;
    const context = `${batchId}/${caseId}/${method.id}/${key}`;
    const emphasis=expectedEmphasis(snapshot.methods.map(method=>{
      const metric=records.find(row=>row.result.dataset_id===caseId&&row.result.method_id===method.id)?.result.metrics[key];
      return metric ? numeric(metric) : null;
    }),key)[snapshot.methods.indexOf(method)];
    expect({heat:cell.heat,tone:cell.tone,best:cell.best},context).toEqual(emphasis);
    if (!metric) {
      expect(cell.raw, context).toBe("");
      expect(cell.text, context).toBe(locale === "en" ? "Not tested" : "未测试");
      continue;
    }
    expect(cell.batch, context).toBe(record!.batch.id);
    expect(cell.raw, context).toBe(numeric(metric) === null ? "" : String(numeric(metric)));
    expect(cell.display, context).toBe(display(metric, key, dataset.reference, locale));
    if (numeric(metric) !== null) expect(cell.text, context).not.toContain(" valid");
    else if (metric.reason_codes.length && dataset.reference) for (const reason of metric.reason_codes) {
      expect(cell.text, context).toContain((locale === "en" ? reasons : reasonsZh)[reason]);
    }
  }
  await page.getByRole("button", {name:locale === "en" ? "Metric plots" : "分项指标", exact:true}).click();
  await expect(page.getByTestId("metric-plots")).toBeVisible();
  // Read all responsive chart panels, including mobile's inactive panels. The
  // dedicated interaction test also switches every mobile metric into view.
  const readCharts = () => page.locator("figure[data-metric]").evaluateAll(figures => figures.map(figure => ({
    key:figure.getAttribute("data-metric"), min:Number(figure.getAttribute("data-axis-min")), max:Number(figure.getAttribute("data-axis-max")), scale:figure.getAttribute("data-axis-scale"),
    rows:[...figure.querySelectorAll<HTMLElement>("[data-testid='metric-point']")].map(point => ({
      method:point.dataset.method, raw:point.dataset.rawValue, batch:point.dataset.batchId, label:point.getAttribute("aria-label"),
      position:point.querySelector<HTMLElement>("[data-testid='plot-dot']")?.style.left ?? null,
      ranges:point.querySelectorAll("[data-testid='plot-range']").length,
    }))
  })));
  const charts = await readCharts();
  for (const key of chartKeys) {
    const chart = charts.find(c => c.key === key)!;
    expect(chart, `${caseId}/${key}`).toBeDefined();
    expect(chart.rows.map(r => r.method)).toEqual(snapshot.methods.map(m => m.id));
    if (key === "q" || key === "tc") { expect(chart.min).toBe(0); expect(chart.max).toBe(1); }
    for (const method of snapshot.methods) {
      const record = records.find(({result}) => result.dataset_id === caseId && result.method_id === method.id);
      const metric = record?.result.metrics[key];
      const row = chart.rows.find(r => r.method === method.id)!;
      const context = `${caseId}/${method.id}/${key}`;
      if (!metric) {
        expect(row.raw, context).toBe(""); expect(row.position, context).toBeNull();
        expect(row.label, context).toContain(locale === "en" ? "Not tested" : "未测试");
        continue;
      }
      expect(row.batch, context).toBe(record!.batch.id);
      const value = numeric(metric);
      expect(row.raw, context).toBe(value === null ? "" : String(value));
      if (value === null) { expect(row.position, context).toBeNull(); continue; }
      const converted = key === "max_rss_kib" ? value / 1024 : value;
      const expected = chart.scale === "log" ? (Math.log10(converted) - Math.log10(chart.min)) / (Math.log10(chart.max) - Math.log10(chart.min)) * 100 : (converted - chart.min) / (chart.max - chart.min) * 100;
      // CSSOM rounds percentages and Firefox also stores CSS numbers as floats.
      // 0.001 percentage point is at most 0.01px on a 1000px plot; raw values
      // and table/export values above are still compared exactly.
      expect(Math.abs(parseFloat(row.position!) - Math.max(0, Math.min(100, expected))), context).toBeLessThanOrEqual(0.001);
      expect(row.label, context).toContain(number(value, key, locale));
      if (metric.display === "single") expect(row.ranges, context).toBe(0);
      else expect(row.ranges, context).toBe(1);
    }
  }
}

/** Validate actual scatter coordinates, including unit conversion and provenance. */
export async function assertScatterConsistency(page: Page, snapshot: BenchmarkSnapshot, batchId: string, caseId: string, locale: Locale = "en") {
  await page.getByRole("button", {name:locale === "en" ? "Trade-off" : "速度—质量",exact:true}).click();
  const chart = page.getByTestId("tradeoff-chart");
  await expect(chart).toBeVisible();
  const axes = await chart.evaluate(element => Object.fromEntries(["x", "y"].map(axis => [axis, {
    key:element.getAttribute(`data-${axis}-key`), min:Number(element.getAttribute(`data-${axis}-min`)),
    max:Number(element.getAttribute(`data-${axis}-max`)), scale:element.getAttribute(`data-${axis}-scale`),
  }])));
  const x = axes.x.key as MetricKey, y = axes.y.key as MetricKey;
  const records = expectedRecords(snapshot,batchId).filter(({result}) => result.dataset_id===caseId);
  for(const key of [x,y]) {
    const axis=key===x ? "x" : "y";
    const rows=await page.getByTestId(`tradeoff-method-${axis}`).evaluateAll(nodes=>nodes.map(node=>({
      method:node.closest("button")?.getAttribute("data-method"),heat:node.getAttribute("data-heat"),tone:node.getAttribute("data-tone"),best:node.getAttribute("data-best")
    })));
    const emphasis=expectedEmphasis(snapshot.methods.map(method=>{
      const metric=records.find(row=>row.result.method_id===method.id)?.result.metrics[key];
      return metric ? numeric(metric) : null;
    }),key);
    rows.forEach((row,index)=>expect({heat:row.heat,tone:row.tone,best:row.best},`${caseId}/${row.method}/${key}`).toEqual(emphasis[index]));
  }
  const eligible = records.filter(({result}) => numeric(result.metrics[x])!==null && numeric(result.metrics[y])!==null);
  const points = await page.getByTestId("tradeoff-point").evaluateAll(nodes=>nodes.map(node=>({
    method:node.getAttribute("data-method"), batch:node.getAttribute("data-batch-id"),
    xRaw:node.getAttribute("data-x-raw"), yRaw:node.getAttribute("data-y-raw"), shape:node.getAttribute("data-shape"),
    x:Number(node.getAttribute("data-x-percent")), y:Number(node.getAttribute("data-y-percent")),
    left:parseFloat((node as HTMLElement).style.left), top:parseFloat((node as HTMLElement).style.top),
  })));
  expect(points).toHaveLength(eligible.length);
  for(const {result,batch} of eligible) {
    const point=points.find(point=>point.method===result.method_id)!;
    const values={x:numeric(result.metrics[x])!,y:numeric(result.metrics[y])!};
    expect(point,`${caseId}/${result.method_id}`).toBeDefined();
    expect(point.batch).toBe(batch.id);
    expect(point.xRaw).toBe(String(values.x));expect(point.yRaw).toBe(String(values.y));
    expect(point.shape).toBe("circle");
    for(const axis of ["x","y"] as const) {
      const a=axes[axis]; const converted=a.key==="max_rss_kib" ? values[axis]/1024 : values[axis];
      const percent=a.scale==="log" ? (Math.log10(converted)-Math.log10(a.min))/(Math.log10(a.max)-Math.log10(a.min))*100 : (converted-a.min)/(a.max-a.min)*100;
      const expected=Math.max(0,Math.min(100,percent));
      expect(point[axis]).toBeCloseTo(expected,8);
      expect(Math.abs((axis==="x" ? point.left : 100-point.top)-expected)).toBeLessThanOrEqual(.001);
    }
  }
  if(y==="q" || y==="tc") {
    const zoom=page.getByRole("checkbox",{name:locale==="en"?"Zoom Q / TC differences":"放大 Q / TC 差异",exact:true});
    if(!await zoom.isChecked()){expect(axes.y.min).toBe(0);expect(axes.y.max).toBe(1);}
  }
}

/** Parse RFC 4180 quoting independently of the application serializer. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const content = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (quoted) {
      if (ch === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  expect(quoted, "CSV ended inside a quoted field").toBe(false);
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Download through the actual UI and compare every CSV field and JSON value. */
export async function assertDownloadConsistency(page: Page, snapshot: BenchmarkSnapshot, batchId: string, caseId?: string | string[], locale: Locale = "en", methodIds?: string[]) {
  const expected = expectedDownload(snapshot,batchId,typeof caseId === "string" ? [caseId] : caseId,methodIds);
  const menu = page.getByTestId("download-controls");
  if (await menu.getAttribute("open") === null) await menu.locator("summary").click();
  const jsonEvent = page.waitForEvent("download");
  await page.getByRole("button", {name:locale === "en" ? "Download JSON" : "下载 JSON", exact:true}).click();
  const json = JSON.parse(readFileSync((await (await jsonEvent).path())!, "utf8")) as BenchmarkSnapshot;
  expect(json).toEqual(expected);
  const csvEvent = page.waitForEvent("download");
  await page.getByRole("button", {name:locale === "en" ? "Download CSV" : "下载 CSV", exact:true}).click();
  const csv = parseCsv(readFileSync((await (await csvEvent).path())!, "utf8"));
  const columns = ["batch", "data_version", "dataset", "method", "version", "result_status", "valid_repeats", "planned_repeats", "metric", "unit", "metric_status", "valid_count", "planned_count", "value", "mean", "sd", "min", "max", "reason_codes", "threads", "batch_repeats", "cpu_limit", "memory_limit_gib", "alignment_timeout_seconds"];
  expect(csv[0]).toEqual(columns);
  expect(csv).toHaveLength(1 + expected.batches.reduce((n,b) => n+b.results.length,0) * 7);
  let index = 1;
  // Numeric values retain full report precision; only missing values become empty.
  const cell = (value: unknown) => value == null ? "" : typeof value === "string" && /^[=+@\-\t\r]/.test(value) ? "'" + value : String(value);
  for (const b of json.batches) for (const result of b.results) for (const key of keys) {
    const metric = result.metrics[key];
    const expectedRow = [b.id, b.dataset_version, result.dataset_id, json.methods.find(m => m.id === result.method_id)!.name,
      b.methods.find(m => m.method_id === result.method_id)!.version, result.status, result.valid_repeats, result.planned_repeats,
      key, key === "wall_seconds" ? "s" : key === "max_rss_kib" ? "KiB" : "", metric.status, metric.valid_count, metric.planned_count,
      metric.value, metric.mean, metric.sd, metric.min, metric.max, metric.reason_codes.join(";"),
      b.threads, b.repeats, b.conditions?.cpu_limit, b.conditions?.memory_limit_gib, b.conditions?.alignment_timeout_seconds].map(cell);
    expect(csv[index++], `${b.id}/${result.dataset_id}/${result.method_id}/${key}`).toEqual(expectedRow);
  }
}
