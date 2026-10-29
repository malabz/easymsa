import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { BenchmarkPage } from "../../routes/BenchmarkPage";
import { BenchmarkDatasetPage } from "../../routes/BenchmarkDatasetPage";
import { availableMetric, emptySnapshot, publishedSnapshot } from "./__tests__/fixtures";
import { metricKeys, parseSnapshot, type BenchmarkSnapshot } from "./model";

function mount(snapshot: BenchmarkSnapshot, path = "/benchmark", locale: "en" | "zh" = "en") {
  localStorage.setItem("easymsa.locale", locale);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(snapshot) }));
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/benchmark" element={<BenchmarkPage />} /><Route path="/benchmark/datasets/:caseId" element={<BenchmarkDatasetPage />} /></Routes></MemoryRouter></LanguageProvider>);
}
function exactValues(locale: "en" | "zh" = "en") {
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Exact values" : "精确数值表" }));
  return screen.getByTestId("precise-results");
}
function point(method: string, key: string) {
  const result = screen.getAllByTestId("metric-point").find(element => element.dataset.method === method && element.dataset.metric === key);
  expect(result).toBeDefined(); return result!;
}
function cell(dataset: string, method: string) {
  const result = screen.getAllByTestId("matrix-cell").find(element => element.dataset.datasetId === dataset && element.dataset.methodId === method);
  expect(result).toBeDefined(); return result!;
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  // Scroll restoration itself is covered in browser tests, not jsdom.
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Benchmark pages", () => {
  it.each(["en", "zh"] as const)("shows v2 single measurements, limits and resolved preprocessing in %s", async locale => {
    const corpus = JSON.parse(readFileSync("contracts/benchmark-public-conformance.json", "utf8"));
    const snapshot = parseSnapshot(corpus.cases.find((entry: {id:string}) => entry.id === "v2-valid-1").snapshot);
    Object.assign(snapshot.batches[0].conditions!, {memory_limit_gib:16, alignment_timeout_seconds:1800, shared_host:true});
    snapshot.catalog.datasets[0].preprocessing = {kind:"colon_to_n", count:40, original_sha256:"a".repeat(64), processed_sha256:"b".repeat(64)};
    mount(snapshot, "/benchmark/datasets/test-case", locale);
    await screen.findByRole("heading", {name:"test-case"});
    expect(screen.getAllByText(locale === "en" ? "Single measurement" : "单次测量", {exact:true}).some(element => element.closest("details") === null)).toBe(true);
    expect(screen.getAllByText(/4 CPU · 16 GiB · 30/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText(locale === "en" ? "Dataset information and provenance" : "数据集信息与来源"));
    expect(screen.getByText(locale === "en" ? /40 sequence colons/ : /40 个冒号/)).toBeVisible();
    const table = exactValues(locale);
    expect(within(table).getAllByText("1/1", {exact:true}).length).toBeGreaterThan(0);
    expect(table.textContent).not.toContain("±");
  });

  it.each(["en", "zh"] as const)("renders v1 empty matrices without invented scores in %s", async locale => {
    mount(emptySnapshot(), "/benchmark", locale);
    const matrix = await screen.findByTestId("benchmark-matrix");
    expect(screen.getByRole("heading", { name: "Benchmark", level: 1 })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(locale === "en" ? /No evaluation results have been published yet/ : /尚未发布评测结果/);
    expect(within(matrix).getAllByTestId("matrix-cell")).toHaveLength(27);
    expect(within(matrix).getAllByTestId("matrix-cell").every(item => item.dataset.rawValue === "")).toBe(true);
    fireEvent.click(screen.getByText(locale === "en" ? "Methods, versions and parameters" : "方法、版本与参数"));
    const methods = screen.getByRole("table", { name: locale === "en" ? "Benchmark methods and versions" : "Benchmark 方法与版本" });
    expect(within(methods).getAllByRole("row")).toHaveLength(10);
    expect(within(methods).getAllByText(locale === "en" ? "Pending confirmation" : "待确认")).toHaveLength(18);
  });

  it("combines filters, validates ranges, resets them and navigates to a dataset", async () => {
    mount(emptySnapshot()); await screen.findByTestId("benchmark-matrix");
    fireEvent.change(screen.getByLabelText("Data origin"), { target: { value: "simulated" } });
    fireEvent.click(screen.getByText("More filters", { exact: true }));
    fireEvent.change(screen.getByLabelText("Minimum sequences"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Maximum sequences"), { target: { value: "150" } });
    expect(screen.getByText("1 of 3 datasets")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Minimum sequences"), { target: { value: "151" } });
    expect(screen.getByText("Minimum sequence count exceeds the maximum.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Search datasets"), { target: { value: "missing" } });
    expect(screen.getByText("No datasets match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("3 of 3 datasets")).toBeVisible();
    fireEvent.click(within(screen.getByTestId("benchmark-matrix")).getByText("case_ref", { exact: true }).closest("a")!);
    expect(await screen.findByRole("heading", { name: "case_ref", level: 1 })).toBeVisible();
  });

  it("switches matrix metrics, exposes keyboard tooltips and deep-links a result with return filters", async () => {
    mount(publishedSnapshot(), "/benchmark?source=simulated"); await screen.findByTestId("benchmark-matrix");
    fireEvent.click(screen.getByTestId("metric-max_rss_kib"));
    const selected = cell("case_ref", "clustalo");
    expect(selected).toHaveAttribute("data-raw-value", "1024"); expect(selected).toHaveAttribute("data-display-value", "1");
    fireEvent.focus(selected);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Peak memory: 1 MiB"); expect(tooltip).toHaveTextContent("Original: 1024 KiB");
    expect(tooltip).toHaveTextContent("3/3 valid"); expect(tooltip).toHaveTextContent("test-1");
    fireEvent.keyDown(document, { key: "Escape" }); expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    const href = new URL(selected.getAttribute("href")!, "https://example.org");
    expect(href.searchParams.get("method")).toBe("clustalo"); expect(href.searchParams.get("metric")).toBe("max_rss_kib");
    expect(href.searchParams.get("batch")).toBe("newer"); expect(href.searchParams.get("returnTo")).toContain("source=simulated");
    fireEvent.click(selected); await screen.findByRole("heading", { name: "case_ref", level: 1 });
    expect(point("clustalo", "max_rss_kib")).toHaveClass("is-active");
    fireEvent.click(screen.getByRole("link", { name: /All benchmark datasets/ })); await screen.findByTestId("benchmark-matrix");
    expect(screen.getByTestId("metric-max_rss_kib")).toHaveAttribute("aria-pressed", "true"); expect(screen.getByLabelText("Data origin")).toHaveValue("simulated");
  });

  it("keeps data problems separate from pending software and missing references", async () => {
    mount(emptySnapshot(), "/benchmark/datasets/case_no_ref"); await screen.findByRole("heading", { name: "case_no_ref" });
    expect(screen.getByRole("heading", { name: "Input data needs review" })).toBeVisible();
    expect(screen.getByText(/411 colon/)).toBeVisible(); expect(screen.getByText(/Sampled with replacement/)).toBeVisible();
    expect(screen.getAllByText("No reference alignment: this metric is not applicable.")).toHaveLength(2);
    const table = exactValues();
    expect(within(table).getAllByText("N/A · no reference")).toHaveLength(18); expect(within(table).queryByText("Failed")).not.toBeInTheDocument();
  });

  it("keeps all methods visible and switches exact values and charts by batch", async () => {
    mount(publishedSnapshot(), "/benchmark/datasets/case_ref"); await screen.findByRole("heading", { name: "case_ref" });
    const selector = screen.getByLabelText("Evaluation batch"); expect(selector).toHaveValue("newer");
    expect(screen.getAllByTestId("metric-point")).toHaveLength(45);
    expect(point("clustalo", "wall_seconds")).toHaveAttribute("data-raw-value", "20");
    expect(point("mafft", "wall_seconds")).toHaveAttribute("data-raw-value", ""); expect(point("mafft", "wall_seconds")).toHaveAccessibleName(/Timed out/);
    expect(point("tcoffee", "wall_seconds")).toHaveAccessibleName(/21 · Partial/);
    fireEvent.click(point("clustalo", "wall_seconds")); expect(screen.getByRole("tooltip")).toHaveTextContent("20 s");
    fireEvent.click(screen.getByRole("button", { name: "Close result details" }));
    const table = exactValues(), clustal = within(table).getByRole("row", { name: /Clustal Omega/ });
    expect(within(clustal).getAllByText("20").length).toBeGreaterThan(0); expect(within(clustal).getByText("3/3", {exact:true})).toBeVisible();
    for (const state of ["Complete", "Partial", "Timed out", "Unsupported", "Failed"]) expect(within(table).getAllByText(state).length).toBeGreaterThan(0);
    fireEvent.change(selector, { target: { value: "older" } }); expect(within(clustal).getAllByText("10").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", {name:"Charts"})); expect(point("clustalo", "wall_seconds")).toHaveAttribute("data-raw-value", "10");
  });

  it("renders distinct SP axis labels for the narrow real repair-score range", async () => {
    const snapshot = publishedSnapshot();
    const values = [824154130945, 824127788009];
    snapshot.batches[1].results.slice(0, 2).forEach((result, index) => {
      result.metrics.sp_score = availableMetric(values[index], result.valid_repeats);
    });
    mount(snapshot, "/benchmark/datasets/case_ref");
    await screen.findByRole("heading", { name: "case_ref" });
    const figure = screen.getByRole("figure", { name: "SP score" });
    const labels = [...figure.querySelectorAll(".benchmark-dot-axis span")].map(label => label.textContent);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
    expect(point("clustalo", "sp_score")).toHaveAttribute("data-raw-value", String(values[0]));
    expect(point("tcoffee", "sp_score")).toHaveAttribute("data-raw-value", String(values[1]));
  });

  it("keeps overview versions and values on the selected batch", async () => {
    const snapshot = publishedSnapshot(); snapshot.batches[1].methods[0].version = "new-version";
    mount(snapshot); await screen.findByTestId("benchmark-matrix"); fireEvent.click(screen.getByText("Methods, versions and parameters"));
    expect(screen.getByText("new-version")).toBeVisible(); expect(cell("case_ref", "clustalo")).toHaveAttribute("data-raw-value", "20");
    fireEvent.change(screen.getByLabelText("Evaluation batch"), { target: { value: "older" } });
    expect(screen.queryByText("new-version")).not.toBeInTheDocument(); expect(cell("case_ref", "clustalo")).toHaveAttribute("data-raw-value", "10");
  });

  it("does not add standard deviation or error bars to a single valid run", async () => {
    const snapshot = publishedSnapshot(); snapshot.catalog.datasets[0].classification = "large"; snapshot.batches = snapshot.batches.slice(0, 1);
    const r = snapshot.batches[0].results[0]; snapshot.batches[0].results = [r]; r.planned_repeats = r.valid_repeats = 1;
    for (const key of metricKeys) r.metrics[key] = availableMetric(key === "q" || key === "tc" ? .8 : 10, 1, 1);
    mount(snapshot, "/benchmark/datasets/case_ref"); await screen.findByRole("heading", { name: "case_ref" });
    expect(screen.getByTestId("metric-plots").querySelector(".benchmark-error-range")).toBeNull();
    const row = within(exactValues()).getByRole("row", { name: /Clustal Omega/ });
    expect(within(row).getByText("1/1", {exact:true})).toBeVisible(); expect(row.textContent).not.toContain("±");
  });

  it("changes Q/TC zoom and SP measure without changing measurements", async () => {
    mount(publishedSnapshot(), "/benchmark/datasets/case_ref"); await screen.findByTestId("metric-plots");
    const q = screen.getByRole("figure", {name:"Q"}); expect(q).toHaveAttribute("data-domain-min", "0"); expect(q).toHaveAttribute("data-domain-max", "1");
    fireEvent.click(screen.getByLabelText("Zoom Q / TC differences")); expect(Number(q.getAttribute("data-domain-min"))).toBeGreaterThan(0);
    expect(point("clustalo", "q")).toHaveAttribute("data-raw-value", "0.8");
    fireEvent.change(screen.getByLabelText("SP measure"), {target:{value:"scaled_sp"}});
    expect(screen.getByRole("figure", {name:"Scaled SP"})).toBeInTheDocument(); expect(point("clustalo", "scaled_sp")).toHaveAttribute("data-raw-value", "20");
  });

  it("shows an accessible not-found state", async () => {
    mount(emptySnapshot(), "/benchmark/datasets/missing"); expect(await screen.findByRole("heading", { name: "Dataset not found" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to Benchmark" })).toHaveAttribute("href", "/benchmark");
  });
  it("rejects invalid snapshots and reloads on retry without exposing details", async () => {
    const invalid = publishedSnapshot(); invalid.batches[0].results[0].metrics.q.mean = 5; mount(invalid);
    expect(await screen.findByRole("alert")).toHaveTextContent("Benchmark data could not be loaded or validated"); expect(screen.queryByRole("table")).not.toBeInTheDocument();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(emptySnapshot()) } as Response);
    fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(await screen.findByTestId("benchmark-matrix")).toBeVisible();
  });
});


it("keeps rapid clear-and-type edits instead of restoring stale search parameters", async () => {
  mount(emptySnapshot(), "/benchmark?search=ref&source=simulated");
  await screen.findByTestId("benchmark-matrix");
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Sequence type" }), { target: { value: "rna" } });
  });
  expect(screen.getByLabelText("Search datasets")).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Data origin" })).toHaveValue("all");
  expect(screen.getByRole("combobox", { name: "Sequence type" })).toHaveValue("rna");
  expect(screen.getByText("1 of 3 datasets")).toBeVisible();
});
