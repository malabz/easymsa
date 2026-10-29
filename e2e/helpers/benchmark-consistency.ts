// Independent browser assertions: do not import production formatting/export helpers.
import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { BenchmarkBatch, BenchmarkMetric, BenchmarkSnapshot, MetricKey } from "../../src/features/benchmark/model";

const keys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "avg_sp", "scaled_sp", "q", "tc"];
const chartKeys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc", "avg_sp", "scaled_sp"];
const states: Record<string, string> = {complete:"Complete", partial:"Partial", failed:"Failed", timeout:"Timed out", unsupported:"Unsupported", not_run:"Not evaluated", unavailable:"Unavailable", not_applicable:"Not applicable"};
const reasons: Record<string, string> = {no_reference:"No reference alignment", reference_invalid:"Reference requires review", invalid_output:"Invalid alignment output", timeout:"Time limit reached", oom:"Memory limit reached", unsupported:"Input unsupported by method", not_run:"Not evaluated", execution_failed:"Method execution failed", scoring_failed:"Scoring failed", cancelled:"Cancelled", incomplete:"Incomplete repetitions", platform_error:"Evaluation unavailable"};
const statesZh: Record<string, string> = {complete:"完整", partial:"部分完成", failed:"失败", timeout:"超时", unsupported:"不支持", not_run:"待评测", unavailable:"无可用成绩", not_applicable:"不适用"};
const reasonsZh: Record<string, string> = {no_reference:"无参考比对", reference_invalid:"参考比对待检查", invalid_output:"比对输出不合法", timeout:"达到时间限制", oom:"达到内存限制", unsupported:"方法不支持该输入", not_run:"待评测", execution_failed:"方法执行失败", scoring_failed:"评分失败", cancelled:"已取消", incomplete:"重复运行未完成", platform_error:"评测异常"};
type Locale = "en" | "zh";

function numeric(metric: BenchmarkMetric): number | null {
  return metric.status === "complete" || metric.status === "partial" ? metric.value ?? metric.mean : null;
}
function number(value: number, key: MetricKey, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {maximumSignificantDigits:21}).format(key === "max_rss_kib" ? value / 1024 : value);
}
function display(metric: BenchmarkMetric, key: MetricKey, reference: boolean, locale: Locale) {
  if (!reference && (key === "q" || key === "tc")) return locale === "en" ? "N/A · no reference" : "不适用 · 无参考";
  const value = numeric(metric);
  if (value === null) return (locale === "en" ? states : statesZh)[metric.status];
  let result = number(value, key, locale);
  if (metric.display === "mean_sd") result += ` ± ${number(metric.sd!, key, locale)}`;
  if (metric.display === "mean_range") result += ` [${number(metric.min!, key, locale)}–${number(metric.max!, key, locale)}]`;
  if (metric.status === "partial") result += locale === "en" ? " · Partial" : " · 部分完成";
  return result;
}
function coverage(metric: BenchmarkMetric, key: MetricKey, locale: Locale) {
  return `${metric.valid_count}/${metric.planned_count} ${locale === "en" ? "valid" : "有效"}` + (metric.display === "mean_sd" ? ` · ${locale === "en" ? "range" : "范围"} ${number(metric.min!, key, locale)}–${number(metric.max!, key, locale)}` : "");
}

/** Independently check raw values, user-visible values and the rendered point coordinates. */
export async function assertDatasetConsistency(page: Page, snapshot: BenchmarkSnapshot, batch: BenchmarkBatch, caseId: string, locale: Locale = "en") {
  const dataset = snapshot.catalog.datasets.find(d => d.id === caseId)!;
  await page.getByRole("combobox", {name:locale === "en" ? "Evaluation batch" : "评测批次", exact:true}).selectOption(batch.id);
  const tableToggle = page.getByRole("button", {name:locale === "en" ? "Exact values" : "精确数值表", exact:true});
  await tableToggle.click();
  const table = page.getByTestId("precise-results");
  await expect(table).toBeVisible();
  const observed = await table.locator("td[data-metric]").evaluateAll(cells => cells.map(cell => ({
    method:cell.getAttribute("data-method"), key:cell.getAttribute("data-metric"), raw:cell.getAttribute("data-raw-value"),
    display:cell.querySelector("div > span")?.textContent, text:cell.textContent
  })));
  expect(observed).toHaveLength(snapshot.methods.length * 7);
  for (const method of snapshot.methods) for (const key of keys) {
    const metric = batch.results.find(r => r.dataset_id === caseId && r.method_id === method.id)?.metrics[key];
    const cell = observed.find(c => c.method === method.id && c.key === key)!;
    const context = `${batch.id}/${caseId}/${method.id}/${key}`;
    if (!metric) {
      expect(cell.raw, context).toBe("");
      expect(cell.text, context).toBe(locale === "en" ? "Outside this batch" : "未纳入本批次");
      continue;
    }
    expect(cell.raw, context).toBe(numeric(metric) === null ? "" : String(numeric(metric)));
    expect(cell.display, context).toBe(display(metric, key, dataset.reference, locale));
    if (numeric(metric) !== null) expect(cell.text, context).toContain(`${metric.valid_count}/${metric.planned_count}`);
    else if (metric.reason_codes.length && dataset.reference) for (const reason of metric.reason_codes) {
      expect(cell.text, context).toContain((locale === "en" ? reasons : reasonsZh)[reason]);
    }
  }
  await page.getByRole("button", {name:locale === "en" ? "Charts" : "图表", exact:true}).click();
  // Read all responsive chart panels, including mobile's inactive panels. The
  // dedicated interaction test also switches every mobile metric into view.
  const readCharts = () => page.locator("figure[data-metric]").evaluateAll(figures => figures.map(figure => ({
    key:figure.getAttribute("data-metric"), min:Number(figure.getAttribute("data-axis-min")), max:Number(figure.getAttribute("data-axis-max")), scale:figure.getAttribute("data-axis-scale"),
    rows:[...figure.querySelectorAll<HTMLElement>("[data-testid='metric-point']")].map(point => ({
      method:point.dataset.method, raw:point.dataset.rawValue, label:point.getAttribute("aria-label"),
      position:point.querySelector<HTMLElement>("[data-testid='plot-dot']")?.style.left ?? null,
      ranges:point.querySelectorAll("[data-testid='plot-range']").length,
    }))
  })));
  const charts = await readCharts();
  for (const key of ["avg_sp", "scaled_sp"] as const) {
    await page.getByRole("combobox", {name:locale === "en" ? "SP measure" : "SP 类型", exact:true}).selectOption(key);
    charts.push((await readCharts()).find(chart => chart.key === key)!);
  }
  await page.getByRole("combobox", {name:locale === "en" ? "SP measure" : "SP 类型", exact:true}).selectOption("sp_score");
  for (const key of chartKeys) {
    const chart = charts.find(c => c.key === key)!;
    expect(chart, `${caseId}/${key}`).toBeDefined();
    expect(chart.rows.map(r => r.method)).toEqual(snapshot.methods.map(m => m.id));
    if (key === "q" || key === "tc") { expect(chart.min).toBe(0); expect(chart.max).toBe(1); }
    for (const method of snapshot.methods) {
      const metric = batch.results.find(r => r.dataset_id === caseId && r.method_id === method.id)?.metrics[key];
      const row = chart.rows.find(r => r.method === method.id)!;
      const context = `${caseId}/${method.id}/${key}`;
      if (!metric) {
        expect(row.raw, context).toBe(""); expect(row.position, context).toBeNull();
        expect(row.label, context).toContain(locale === "en" ? "Outside this batch" : "未纳入本批次");
        continue;
      }
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
export async function assertDownloadConsistency(page: Page, snapshot: BenchmarkSnapshot, batchId: string, caseId?: string, locale: Locale = "en") {
  const datasets = snapshot.catalog.datasets.filter(d => !caseId || d.id === caseId);
  const sourceIds = new Set(datasets.map(d => d.source_id));
  const batch = snapshot.batches.find(b => b.id === batchId)!;
  const expected = {...snapshot, catalog:{...snapshot.catalog, datasets, sources:snapshot.catalog.sources.filter(s => sourceIds.has(s.id))},
    batches:[{...batch, results:batch.results.filter(r => !caseId || r.dataset_id === caseId)}]};
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
  expect(csv).toHaveLength(1 + expected.batches[0].results.length * 7);
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
