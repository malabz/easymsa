import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishedSnapshot } from "./__tests__/fixtures";
import { DownloadButtons } from "./presentation";
import { metricKeys, parseSnapshot, type BenchmarkSnapshot } from "./model";

let blobs: Blob[] = [];
function text(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsText(blob);
  });
}
// Independent CSV reader, including quoted commas and escaped double quotes.
function parseCsv(input: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = input.charCodeAt(0) === 0xfeff ? 1 : 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') { if (quoted && input[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if (char === "\n" && !quoted) { row.push(cell.endsWith("\r") ? cell.slice(0, -1) : cell); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function compareCsvToJson(csv: string, json: BenchmarkSnapshot) {
  const [headers, ...rows] = parseCsv(csv);
  const col = (name: string) => headers.indexOf(name);
  expect(headers).toHaveLength(24);
  expect(rows).toHaveLength(json.batches.reduce((count, batch) => count + batch.results.length * 7, 0));
  for (const batch of json.batches) for (const result of batch.results) for (const key of metricKeys) {
    const name = json.methods.find(method => method.id === result.method_id)!.name;
    const row = rows.find(item => item[col("batch")] === batch.id && item[col("dataset")] === result.dataset_id && item[col("method")] === name && item[col("metric")] === key)!;
    expect(row).toBeDefined(); expect(row[col("result_status")]).toBe(result.status);
    expect(row[col("unit")]).toBe(key === "wall_seconds" ? "s" : key === "max_rss_kib" ? "KiB" : "");
    const metric = result.metrics[key];
    for (const field of ["value", "mean", "sd", "min", "max"] as const) expect(row[col(field)]).toBe(metric[field] === null ? "" : String(metric[field]));
    expect(row[col("metric_status")]).toBe(metric.status); expect(row[col("reason_codes")]).toBe(metric.reason_codes.join(";"));
    expect(row[col("valid_count")]).toBe(String(metric.valid_count)); expect(row[col("planned_count")]).toBe(String(metric.planned_count));
  }
}
beforeEach(() => {
  blobs = []; vi.useFakeTimers({toFake:["setTimeout", "clearTimeout"]});
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(blob: Blob) { blobs.push(blob); return "blob:test"; }
    static revokeObjectURL() { /* No external resource is created. */ }
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
});
afterEach(() => { cleanup(); vi.runOnlyPendingTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("download controls", () => {
  it("exports the selected filter and batch with identical JSON/CSV metrics and raw memory units", async () => {
    const snapshot = publishedSnapshot(); snapshot.methods[0].name = 'Clustal, "quoted"';
    render(<DownloadButtons snapshot={snapshot} batchId="newer" datasetIds={["case_ref"]} locale="en" />);
    fireEvent.click(screen.getByText("Download data"));
    expect(screen.getByLabelText("Download scope")).toHaveValue("filtered");
    expect(screen.getByText("1 datasets · all 7 metrics · original precision")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const json = parseSnapshot(JSON.parse(await text(blobs[0])));
    expect(json.catalog.datasets.map(dataset => dataset.id)).toEqual(["case_ref"]);
    expect(json.batches.map(batch => batch.id)).toEqual(["newer"]);
    expect(json.batches[0].results[0].metrics.max_rss_kib.value).toBe(1024);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"}));
    compareCsvToJson(await text(blobs[1]), json);
  });
  it("switches to a full batch explicitly and retains a truly empty current filter", async () => {
    const snapshot = publishedSnapshot();
    render(<DownloadButtons snapshot={snapshot} batchId="older" datasetIds={[]} locale="en" />);
    fireEvent.click(screen.getByText("Download data"));
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const empty = parseSnapshot(JSON.parse(await text(blobs[0])));
    expect(empty.catalog.datasets).toEqual([]); expect(empty.batches[0].results).toEqual([]);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"})); expect(parseCsv(await text(blobs[1]))).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Download scope"), {target:{value:"batch"}});
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const full = parseSnapshot(JSON.parse(await text(blobs[2])));
    expect(full.catalog.datasets).toHaveLength(3); expect(full.batches.map(batch => batch.id)).toEqual(["older"]);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"})); compareCsvToJson(await text(blobs[3]), full);
  });
  it("limits detail downloads to the selected dataset and keeps localized controls usable", async () => {
    render(<DownloadButtons snapshot={publishedSnapshot()} batchId="newer" datasetId="case_ref" locale="zh" />);
    fireEvent.click(screen.getByText("下载数据"));
    expect(screen.queryByLabelText("下载范围")).not.toBeInTheDocument();
    expect(screen.getByText("1 个数据集 · 全部 7 项指标 · 原始精度")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name:"下载 JSON"}));
    const json = parseSnapshot(JSON.parse(await text(blobs[0]))); expect(json.catalog.datasets.map(dataset => dataset.id)).toEqual(["case_ref"]);
    fireEvent.click(screen.getByRole("button", {name:"下载 CSV"})); compareCsvToJson(await text(blobs[1]), json);
  });
});
