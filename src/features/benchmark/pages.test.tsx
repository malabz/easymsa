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
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Values" : "数值表" }));
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
  it("keeps filter panels exclusive without losing active filters and closes them with Escape", async () => {
    mount(publishedSnapshot());
    await screen.findByTestId("benchmark-matrix");
    const extra = document.querySelector<HTMLDetailsElement>(".benchmark-extra-filters")!;
    const methods = document.querySelector<HTMLDetailsElement>(".benchmark-method-filter")!;
    fireEvent.click(extra.querySelector("summary")!);
    fireEvent.change(screen.getByLabelText("Minimum sequences"), {target:{value:"1000"}});
    expect(extra.open).toBe(true);
    fireEvent.click(methods.querySelector("summary")!);
    expect(methods.open).toBe(true);
    expect(extra.open).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", {name:"MAFFT"}));
    fireEvent.keyDown(methods, {key:"Escape"});
    expect(methods.open).toBe(false);
    expect(methods.querySelector("summary")).toHaveFocus();
    fireEvent.click(extra.querySelector("summary")!);
    expect(screen.getByLabelText("Minimum sequences")).toHaveValue(1000);
    expect(methods.open).toBe(false);
    fireEvent.keyDown(extra, {key:"Escape"});
    expect(extra.open).toBe(false);
    expect(extra.querySelector("summary")).toHaveFocus();
    fireEvent.click(methods.querySelector("summary")!);
    fireEvent.pointerDown(screen.getByLabelText("Sequence type"));
    expect(methods.open).toBe(false);
    fireEvent.click(methods.querySelector("summary")!);
    fireEvent.click(screen.getByRole("button", {name:"Clear filters"}));
    expect(methods.open).toBe(false);
  });
  it("shows real latest coverage and updates counts and navigation with RNA and method filters", async () => {
    const snapshot = parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")));
    mount(snapshot);
    await screen.findByTestId("benchmark-matrix");
    expect(screen.queryByLabelText("Evaluation batch")).not.toBeInTheDocument();
    const coverage = screen.getByLabelText("Evaluation coverage");
    expect(coverage).toHaveTextContent(/Complete 127 \/ 156.*Timed out 14.*Memory limit 15/);
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(156);
    expect(screen.getAllByTestId("matrix-cell").every(item => item.dataset.heat === "")).toBe(true);
    fireEvent.change(screen.getByLabelText("Sequence type"), {target:{value:"rna"}});
    expect(coverage).toHaveTextContent(/Complete 30 \/ 36.*Timed out 6/);
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(36);
    fireEvent.click(document.querySelector(".benchmark-method-filter summary")!);
    fireEvent.click(screen.getByRole("checkbox", {name:"MAFFT"}));
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(30);
    expect(coverage).toHaveTextContent(/Complete 24 \/ 30.*Timed out 6/);
    expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(6);
    const link = screen.getAllByTestId("matrix-cell")[0];
    const url = new URL(link.getAttribute("href")!, "https://example.org");
    expect(url.searchParams.get("type")).toBe("rna");
    expect(url.searchParams.get("methods")?.split(",")).not.toContain("mafft");
    fireEvent.click(link);
    expect(await screen.findByTestId("dataset-title")).toHaveAttribute("data-dataset-id",link.dataset.datasetId!);
    expect(screen.getByRole("button", {name:"Trade-off"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByTestId("tradeoff-method")).toHaveLength(5);
    expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(6);
    const next = screen.getByRole("link", {name:"Next"});
    expect(next).toHaveAttribute("href", expect.stringContaining("type=rna"));
    expect(snapshot.catalog.datasets.filter(item => item.sequence_type === "rna").some(item => next.getAttribute("href")!.includes(`/datasets/${item.id}?`))).toBe(true);
    fireEvent.click(document.querySelector(".benchmark-detail-topline .benchmark-back")!);
    await screen.findByTestId("benchmark-matrix");
    expect(screen.getByLabelText("Sequence type")).toHaveValue("rna");
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(30);
    expect(screen.getByLabelText("Evaluation coverage")).toHaveTextContent("Complete 24 / 30");
  });

  it.each(["en", "zh"] as const)("shows v2 single measurements, limits and resolved preprocessing in %s", async locale => {
    const corpus = JSON.parse(readFileSync("contracts/benchmark-public-conformance.json", "utf8"));
    const snapshot = parseSnapshot(corpus.cases.find((entry: {id:string}) => entry.id === "v2-valid-1").snapshot);
    Object.assign(snapshot.batches[0].conditions!, {memory_limit_gib:16, alignment_timeout_seconds:1800, shared_host:true});
    snapshot.catalog.datasets[0].preprocessing = {kind:"colon_to_n", count:40, original_sha256:"a".repeat(64), processed_sha256:"b".repeat(64)};
    mount(snapshot, `/benchmark/datasets/test-case?batch=${snapshot.batches[0].id}`, locale);
    await screen.findByTestId("dataset-title");
    expect(screen.getByTestId("experiment-details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText(locale === "en" ? "Experiment details" : "实验详情"));
    expect(screen.getByText(locale === "en" ? "Single measurement" : "单次测量", {exact:true})).toBeVisible();
    expect(screen.getAllByText(/4 CPU · 16 GiB · 30/).length).toBeGreaterThan(0);
    expect(screen.getByText(locale === "en" ? /40 colons/ : /40 个冒号/)).toBeVisible();
    const table = exactValues(locale);
    expect(within(table).getAllByText("1/1", {exact:true}).length).toBeGreaterThan(0);
    expect(table.textContent).not.toContain("±");
  });

  it.each(["en", "zh"] as const)("renders v1 empty matrices without invented scores in %s", async locale => {
    mount(emptySnapshot(), "/benchmark", locale);
    const matrix = await screen.findByTestId("benchmark-matrix");
    expect(screen.getByRole("heading", { name: "Benchmark", level: 1 })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(locale === "en" ? /No evaluation results have been published for this selection/ : /尚未发布评测结果/);
    expect(within(matrix).getAllByTestId("matrix-cell")).toHaveLength(18);
    expect(within(matrix).getAllByTestId("matrix-cell").every(item => item.dataset.rawValue === "")).toBe(true);
    fireEvent.click(screen.getByText(locale === "en" ? "Experiment details" : "实验详情"));
    const methods = within(screen.getByRole("region", { name: locale === "en" ? "Method catalog" : "方法目录" })).getByRole("table");
    expect(within(methods).getAllByRole("row")).toHaveLength(7);
    expect(within(methods).getAllByText(locale === "en" ? "Pending confirmation" : "待确认")).toHaveLength(6);
  });

  it("combines filters, validates ranges, resets them and navigates to a dataset", async () => {
    mount(emptySnapshot()); await screen.findByTestId("benchmark-matrix");
    fireEvent.click(screen.getByText("More filters", { exact: true }));
    fireEvent.change(screen.getByLabelText("Data origin"), { target: { value: "simulated" } });
    fireEvent.change(screen.getByLabelText("Minimum sequences"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Maximum sequences"), { target: { value: "150" } });
    expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Minimum sequences"), { target: { value: "151" } });
    expect(screen.getByText("Minimum sequence count exceeds the maximum.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Search datasets"), { target: { value: "missing" } });
    expect(screen.getByText("No datasets match these filters.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(3);
    fireEvent.click(document.querySelector<HTMLAnchorElement>('.benchmark-matrix-dataset a[href*="datasets/case_ref"]')!);
    expect(await screen.findByTestId("dataset-title")).toHaveAttribute("data-dataset-id", "case_ref");
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
    expect(href.searchParams.get("batch")).toBeNull(); expect(href.searchParams.get("returnTo")).toContain("source=simulated");
    fireEvent.click(selected); await screen.findByTestId("dataset-title");
    expect(point("clustalo", "max_rss_kib")).toHaveClass("is-active");
    fireEvent.click(document.querySelector(".benchmark-detail-topline .benchmark-back")!); await screen.findByTestId("benchmark-matrix");
    expect(screen.getByTestId("metric-max_rss_kib")).toHaveAttribute("aria-pressed", "true"); expect(screen.getByLabelText("Data origin")).toHaveValue("simulated");
  });

  it("keeps data problems separate from pending software and missing references", async () => {
    mount(emptySnapshot(), "/benchmark/datasets/case_no_ref"); await screen.findByTestId("dataset-title");
    expect(screen.getByTestId("experiment-details")).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("Experiment details"));
    expect(screen.getByRole("heading", { name: "Input needs review" })).toBeVisible();
    expect(screen.getByText(/Invalid colon characters: 411/)).toBeVisible(); expect(screen.getByText(/Sampling: With replacement/)).toBeVisible();
    expect(screen.getAllByText("No reference alignment: this metric is not applicable.")).toHaveLength(2);
    const table = exactValues();
    expect(within(table).getAllByText("No reference")).toHaveLength(12); expect(within(table).queryByText("Failed")).not.toBeInTheDocument();
  });

  it("keeps all methods and current measurements visible across views", async () => {
    const fixture = publishedSnapshot();
    for (const batch of fixture.batches) {
      const partial = batch.results.find(result => result.method_id === "tcoffee")!;
      batch.results = batch.results.map(result => result.method_id === "fmalign2" ? { ...partial, method_id: "fmalign2" } : result);
      const failure = batch.results.find(result => result.method_id === "kalign3")!;
      batch.results = batch.results.map(result => result.method_id === "halign4" ? { ...failure, method_id: "halign4" } : result);
    }
    mount(fixture, "/benchmark/datasets/case_ref"); await screen.findByTestId("dataset-title");
    expect(screen.queryByLabelText("Evaluation batch")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trade-off" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Metric plots" }));
    expect(screen.getAllByTestId("metric-point")).toHaveLength(30);
    expect(point("clustalo", "wall_seconds")).toHaveAttribute("data-raw-value", "20");
    expect(point("mafft", "wall_seconds")).toHaveAttribute("data-raw-value", ""); expect(point("mafft", "wall_seconds")).toHaveAccessibleName(/Timed out/);
    expect(point("fmalign2", "wall_seconds")).toHaveAccessibleName(/21 · Partial/);
    fireEvent.click(point("clustalo", "wall_seconds")); expect(screen.getByRole("tooltip")).toHaveTextContent("20 s");
    fireEvent.click(screen.getByRole("button", { name: "Close result details" }));
    const table = exactValues(), clustal = within(table).getByRole("row", { name: /Clustal Omega/ });
    expect(within(clustal).getAllByText("20").length).toBeGreaterThan(0); expect(within(clustal).getByText("3/3", {exact:true})).toBeVisible();
    for (const state of ["Complete", "Partial", "Timed out", "Unsupported", "Failed"]) expect(within(table).getAllByText(state).length).toBeGreaterThan(0);
  });

  it("renders distinct SP axis labels for the narrow real repair-score range", async () => {
    const snapshot = publishedSnapshot();
    const values = [824154130945, 824127788009];
    const partial = snapshot.batches[1].results.find(result => result.method_id === "tcoffee")!;
    snapshot.batches[1].results = snapshot.batches[1].results.map(result => result.method_id === "fmalign2" ? { ...partial, method_id: "fmalign2" } : result);
    snapshot.batches[1].results.filter(result => ["clustalo", "fmalign2"].includes(result.method_id)).forEach((result, index) => {
      result.metrics.sp_score = availableMetric(values[index], result.valid_repeats);
    });
    mount(snapshot, "/benchmark/datasets/case_ref?chart=metrics");
    await screen.findByTestId("dataset-title");
    const figure = screen.getByRole("figure", { name: "SP score" });
    const labels = [...figure.querySelectorAll(".benchmark-dot-axis span")].map(label => label.textContent);
    expect(labels).toHaveLength(3);
    expect(new Set(labels).size).toBe(3);
    expect(point("clustalo", "sp_score")).toHaveAttribute("data-raw-value", String(values[0]));
    expect(point("fmalign2", "sp_score")).toHaveAttribute("data-raw-value", String(values[1]));
  });

  it("uses current versions and values even through a historical link", async () => {
    const snapshot = publishedSnapshot(); snapshot.batches[1].methods[0].version = "new-version";
    mount(snapshot,"/benchmark?batch=older"); await screen.findByTestId("benchmark-matrix"); fireEvent.click(screen.getByText("Experiment details"));
    expect(screen.getByText("new-version")).toBeVisible(); expect(cell("case_ref", "clustalo")).toHaveAttribute("data-raw-value", "20");
    expect(screen.queryByLabelText("Evaluation batch")).not.toBeInTheDocument();
  });

  it("does not add standard deviation or error bars to a single valid run", async () => {
    const snapshot = publishedSnapshot(); snapshot.catalog.datasets[0].classification = "large"; snapshot.batches = snapshot.batches.slice(0, 1);
    const r = snapshot.batches[0].results[0]; snapshot.batches[0].results = [r]; r.planned_repeats = r.valid_repeats = 1;
    for (const key of metricKeys) r.metrics[key] = availableMetric(key === "q" || key === "tc" ? .8 : 10, 1, 1);
    mount(snapshot, "/benchmark/datasets/case_ref"); await screen.findByTestId("dataset-title");
    expect(screen.getByTestId("metric-plots").querySelector(".benchmark-error-range")).toBeNull();
    const row = within(exactValues()).getByRole("row", { name: /Clustal Omega/ });
    expect(within(row).getByText("1/1", {exact:true})).toBeVisible(); expect(row.textContent).not.toContain("±");
  });

  it("changes Q/TC zoom and SP measure without changing measurements", async () => {
    mount(publishedSnapshot(), "/benchmark/datasets/case_ref?chart=metrics"); await screen.findByTestId("metric-plots");
    const q = screen.getByRole("figure", {name:"Q"}); expect(q).toHaveAttribute("data-domain-min", "0"); expect(q).toHaveAttribute("data-domain-max", "1");
    fireEvent.click(screen.getByRole("checkbox", {name:"Zoom Q / TC differences"})); expect(Number(q.getAttribute("data-domain-min"))).toBeGreaterThan(0);
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
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load results. Try again."); expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
  expect(screen.getByLabelText("Data origin")).toHaveValue("all");
  expect(screen.getByRole("combobox", { name: "Sequence type" })).toHaveValue("rna");
  expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(1);
});
