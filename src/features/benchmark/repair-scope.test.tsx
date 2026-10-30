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
  it("defaults to latest whole records while retaining each original source", async () => {
    mount(); await screen.findByTestId("benchmark-matrix");
    expect(screen.queryByLabelText("Evaluation batch")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(72);
    expect(screen.getByLabelText("Evaluation coverage")).toHaveTextContent("Complete 72 / 72");
    expect(cell("mt100", "halign4")).toHaveAttribute("data-batch-id", "test-repair15");
    expect(cell("mt100", "halign4")).toHaveAttribute("data-raw-value", "20");
    expect(cell("mt100", "mafft")).toHaveAttribute("data-batch-id", "test-baseline");
    expect(cell("mt100", "mafft")).toHaveAttribute("data-raw-value", "10");
    expect(screen.getAllByTestId("matrix-cell").some(item => item.dataset.heat !== "")).toBe(true);
  });

  it("historical overview links now open the complete current view", async () => {
    mount("/benchmark?batch=test-repair15"); await screen.findByTestId("benchmark-matrix");
    expect(screen.getAllByTestId("matrix-cell")).toHaveLength(72);
    expect(cell("mt100","mafft")).toHaveAttribute("data-raw-value","10");
    expect(cell("mt100","halign4")).toHaveAttribute("data-raw-value","20");
    expect(screen.queryByLabelText("Show all")).not.toBeInTheDocument();
  });

  it("validates sparse v2 and selects only 15 pairs without filling from the baseline", () => {
    const snapshot = parseSnapshot(repairSnapshot());
    const batch = snapshot.batches[1];
    expect(batchCoverage(batch)).toEqual({pairs:15,datasets:12,methods:3});
    const rows = selectMetricRows(snapshot,batch,"mt100","wall_seconds");
    expect(rows.find(row=>row.method.id==="halign4")?.raw).toBe(20);
    expect(rows.find(row=>row.method.id==="mafft")).toMatchObject({raw:null,result:undefined,outsideBatch:true});
    expect(snapshot.batches[0].results.find(result=>result.method_id==="mafft"&&result.dataset_id==="mt100")?.metrics.wall_seconds.value).toBe(10);
  });
  it.each(["en","zh"] as const)("presents one current result set in %s", async locale => {
    mount("/benchmark?batch=test-repair15&all=1",locale);await screen.findByTestId("benchmark-matrix");
    expect(screen.getByLabelText(locale==="en"?"Evaluation coverage":"评测覆盖")).toHaveTextContent("72 / 72");
    expect(screen.queryByLabelText(locale==="en"?"Evaluation batch":"评测批次")).not.toBeInTheDocument();
    const result=cell("mt100","mafft"); expect(result).toHaveAttribute("data-raw-value","10");
    fireEvent.focus(result);expect(screen.getByRole("tooltip")).not.toHaveTextContent("test-baseline");
  });
  it("historical detail links show the current dataset results", async () => {
    mount("/benchmark/datasets/sim70?batch=test-repair15");
    await screen.findByTestId("dataset-title");
    expect(screen.queryByLabelText("Evaluation batch")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("tradeoff-method")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button",{name:"Values"}));
    const cells=screen.getByTestId("precise-results").querySelectorAll("td[data-metric]");
    expect(cells).toHaveLength(30);
    expect([...cells].some(cell=>cell.getAttribute("data-raw-value")!=="")).toBe(true);
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
