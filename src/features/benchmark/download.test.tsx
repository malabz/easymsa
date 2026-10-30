import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishedSnapshot } from "./__tests__/fixtures";
import { repairSnapshot } from "./__tests__/repair-fixture";
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
    expect(row[col("version")]).toBe(batch.methods.find(method => method.method_id === result.method_id)?.version);
    expect(row[col("threads")]).toBe(String(batch.threads));
    for (const field of ["cpu_limit", "memory_limit_gib", "alignment_timeout_seconds"] as const) {
      expect(row[col(field)]).toBe(batch.conditions?.[field] === undefined ? "" : String(batch.conditions[field]));
    }
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
  it("exports latest filtered records with original batch provenance, then explicitly downloads all latest records", async () => {
    const snapshot = repairSnapshot();
    const unchanged = JSON.stringify(snapshot);
    render(<DownloadButtons snapshot={snapshot} resultScope={{mode:"latest"}} datasetIds={["mt100"]} methodIds={["halign4", "mafft"]} locale="en" />);
    fireEvent.click(screen.getByText("Download data"));
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const filtered = parseSnapshot(JSON.parse(await text(blobs[0])));
    expect(filtered.catalog.datasets.map(dataset => dataset.id)).toEqual(["mt100"]);
    expect(filtered.batches.map(batch => batch.id)).toEqual(["test-baseline", "test-repair15"]);
    expect(filtered.batches.map(batch => batch.results.map(result => result.method_id))).toEqual([["mafft"], ["halign4"]]);
    expect(filtered.batches[0].results[0].metrics.wall_seconds.value).toBe(10);
    expect(filtered.batches[1].results[0].metrics.wall_seconds.value).toBe(20);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"}));
    compareCsvToJson(await text(blobs[1]), filtered);
    fireEvent.change(screen.getByLabelText("Download scope"), {target:{value:"batch"}});
    expect(screen.getByRole("option", {name:"All latest records"})).toHaveProperty("selected", true);
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const full = parseSnapshot(JSON.parse(await text(blobs[2])));
    expect(full.catalog.datasets).toHaveLength(12);
    expect(full.batches.map(batch => batch.results.length)).toEqual([93, 15]);
    expect(new Set(full.batches.flatMap(batch => batch.results.map(result => `${result.dataset_id}/${result.method_id}`))).size).toBe(108);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"}));
    compareCsvToJson(await text(blobs[3]), full);
    expect(JSON.stringify(snapshot)).toBe(unchanged);
  });

  it("keeps a latest detail download limited to the current dataset and method filter", async () => {
    render(<DownloadButtons snapshot={repairSnapshot()} resultScope={{mode:"latest"}} datasetId="mt100" methodIds={["minipoa"]} locale="en" />);
    fireEvent.click(screen.getByText("Download data"));
    expect(screen.queryByLabelText("Download scope")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name:"Download JSON"}));
    const json = parseSnapshot(JSON.parse(await text(blobs[0])));
    expect(json.catalog.datasets.map(dataset => dataset.id)).toEqual(["mt100"]);
    expect(json.batches.map(batch => batch.id)).toEqual(["test-repair15"]);
    expect(json.batches[0].results.map(result => result.method_id)).toEqual(["minipoa"]);
    fireEvent.click(screen.getByRole("button", {name:"Download CSV"}));
    compareCsvToJson(await text(blobs[1]), json);
  });

  it("exports the selected filter and batch with identical JSON/CSV metrics and raw memory units", async () => {
    const snapshot = publishedSnapshot(); snapshot.methods[0].name = 'Clustal, "quoted"';
    render(<DownloadButtons snapshot={snapshot} batchId="newer" datasetIds={["case_ref"]} locale="en" />);
    fireEvent.click(screen.getByText("Download data"));
    expect(screen.getByLabelText("Download scope")).toHaveValue("filtered");
    expect(screen.getByText("1 datasets · 9 results")).toBeVisible();
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
    expect(screen.getByText("1 个数据集 · 9 项结果")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name:"下载 JSON"}));
    const json = parseSnapshot(JSON.parse(await text(blobs[0]))); expect(json.catalog.datasets.map(dataset => dataset.id)).toEqual(["case_ref"]);
    fireEvent.click(screen.getByRole("button", {name:"下载 CSV"})); compareCsvToJson(await text(blobs[1]), json);
  });
});
