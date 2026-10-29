import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { BenchmarkPage } from "../../routes/BenchmarkPage";
import { BenchmarkDatasetPage } from "../../routes/BenchmarkDatasetPage";
import { repairSnapshot } from "./__tests__/repair-fixture";
import { batchCoverage, selectMetricRows, selectSnapshot } from "./metrics";
import { parseSnapshot } from "./model";
import { snapshotCsv } from "./presentation";

function mount(path = "/benchmark", locale: "en" | "zh" = "en") {
  localStorage.setItem("easymsa.locale", locale);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:()=>Promise.resolve(repairSnapshot())}));
  render(<LanguageProvider><MemoryRouter initialEntries={[path]}><Routes><Route path="/benchmark" element={<BenchmarkPage />} /><Route path="/benchmark/datasets/:caseId" element={<BenchmarkDatasetPage />} /></Routes></MemoryRouter></LanguageProvider>);
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal("requestAnimationFrame", vi.fn(() => 0)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function cell(dataset: string, method: string) {
  return screen.getAllByTestId("matrix-cell").find(element => element.dataset.datasetId === dataset && element.dataset.methodId === method)!;
}

describe("targeted repair batch scope", () => {
  it("validates sparse v2 and selects only 15 pairs without filling from the baseline", () => {
    const snapshot = parseSnapshot(repairSnapshot());
    const batch = snapshot.batches[1];
    expect(batchCoverage(batch)).toEqual({pairs:15,datasets:12,methods:3});
    const rows = selectMetricRows(snapshot,batch,"mt100","wall_seconds");
    expect(rows.find(row=>row.method.id==="halign4")?.raw).toBe(20);
    expect(rows.find(row=>row.method.id==="mafft")).toMatchObject({raw:null,result:undefined,outsideBatch:true});
    expect(snapshot.batches[0].results.find(result=>result.method_id==="mafft"&&result.dataset_id==="mt100")?.metrics.wall_seconds.value).toBe(10);
  });
  it.each(["en","zh"] as const)("shows actual pair coverage and distinguishes outside-batch cells in %s", async locale => {
    mount("/benchmark",locale);await screen.findByTestId("benchmark-matrix");
    expect(screen.getByTestId("batch-scope")).toHaveTextContent(locale==="en"?"15 method–dataset pairs across 12 datasets and 3 methods":"15 个方法与数据集组合，涉及 12 个数据集、3 种方法");
    expect(screen.getByLabelText(locale==="en"?"Evaluation batch":"评测批次")).toHaveValue("test-repair15");
    const outside=cell("mt100","mafft");expect(outside).toHaveTextContent(locale==="en"?"Outside this batch":"未纳入本批次");
    expect(outside).toHaveAttribute("data-raw-value","");expect(outside).toHaveAttribute("data-heat","");
    await act(async () => {});
    fireEvent.focus(outside);expect(screen.getByRole("tooltip")).toHaveTextContent(locale==="en"?"No run planned in this batch":"本批次未计划此项运行");
    expect(screen.getByRole("tooltip")).not.toHaveTextContent("0/1");
    fireEvent.change(screen.getByLabelText(locale==="en"?"Evaluation batch":"评测批次"),{target:{value:"test-baseline"}});
    expect(cell("mt100","mafft")).toHaveAttribute("data-raw-value","10");
  });
  it("keeps the explicitly selected batch on a dataset with no selected pairs", async () => {
    const snapshot = repairSnapshot();snapshot.batches[1].results=snapshot.batches[1].results.filter(result=>result.dataset_id!=="sim70");
    localStorage.setItem("easymsa.locale","en");vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:()=>Promise.resolve(snapshot)}));
    render(<LanguageProvider><MemoryRouter initialEntries={["/benchmark/datasets/sim70?batch=test-repair15"]}><Routes><Route path="/benchmark/datasets/:caseId" element={<BenchmarkDatasetPage/>}/></Routes></MemoryRouter></LanguageProvider>);
    await screen.findByRole("heading",{name:"sim70"});
    expect(screen.getByLabelText("Evaluation batch")).toHaveValue("test-repair15");
    expect(screen.getByTestId("dataset-batch-scope")).toHaveTextContent("0 methods included");
    expect(screen.getAllByTestId("metric-point").every(point=>point.dataset.rawValue==="")).toBe(true);
    expect(screen.getAllByTestId("metric-point").every(point=>point.dataset.status==="outside_batch")).toBe(true);
    fireEvent.click(screen.getByRole("button",{name:"Exact values"}));
    const cells = screen.getByTestId("precise-results").querySelectorAll("td[data-metric]");
    expect(cells).toHaveLength(63);
    expect([...cells].every(cell => cell.textContent === "Outside this batch")).toBe(true);
    expect(screen.getByRole("link",{name:"Next"})).toHaveAttribute("href",expect.stringContaining("batch=test-repair15"));
  });
  it("keeps both formats scoped to selected pairs, including an empty dataset scope", () => {
    const snapshot = repairSnapshot();const before=JSON.stringify(snapshot.batches[0]);
    const full=selectSnapshot(snapshot,"test-repair15");
    expect(full.batches).toHaveLength(1);expect(full.batches[0].results).toHaveLength(15);
    expect(snapshotCsv(full).trim().split("\r\n")).toHaveLength(106);
    const detail=selectSnapshot(snapshot,"test-repair15",["mt100"]);
    expect(detail.batches[0].results.map(result=>result.method_id)).toEqual(["halign4","minipoa"]);
    expect(snapshotCsv(detail).trim().split("\r\n")).toHaveLength(15);
    const empty=selectSnapshot(snapshot,"test-repair15",[]);expect(empty.batches[0].results).toEqual([]);
    expect(snapshotCsv(empty).trim().split("\r\n")).toHaveLength(1);
    expect(JSON.stringify(snapshot.batches[0])).toBe(before);
  });
});
