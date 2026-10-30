import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TradeoffPlot, placeTradeoffLabels, tradeoffPlotHeight, selectTradeoffXTicks, tradeoffYAxisGutter } from "./TradeoffPlot";
import { makeMetricAxis, formatAxisTicks } from "./metrics";
import { MetricPlots } from "./MetricPlots";
import { absentMetric, availableMetric, publishedSnapshot } from "./__tests__/fixtures";
import type { BenchmarkSnapshot } from "./model";

afterEach(cleanup);

describe("scatter axis readability", () => {
  it("shows each logarithmic decade when there is room without changing the domain", () => {
    const axis = makeMetricAxis("wall_seconds",[availableMetric(.32),availableMetric(1463.2)]);
    const originalTicks = [...axis.ticks];
    expect(selectTradeoffXTicks(axis,"wall_seconds","en",712,13)).toEqual([.1,1,10,100,1000,10000]);
    expect(axis.ticks).toEqual(originalTicks);
    expect(axis.min).toBe(.1);
    expect(axis.max).toBe(10000);
  });

  it.each([13,26])("keeps uneven logarithmic ticks disjoint on a narrow axis with %ipx text", fontSize => {
    const width = 259;
    const axis = makeMetricAxis("wall_seconds",[availableMetric(.32),availableMetric(1463.2)]);
    const ticks = selectTradeoffXTicks(axis,"wall_seconds","en",width,fontSize);
    expect(ticks[0]).toBe(axis.min);
    expect(ticks[ticks.length - 1]).toBe(axis.max);
    expect(ticks).not.toContain(1000);
    const labels = formatAxisTicks(ticks,"wall_seconds","en");
    const boxes = ticks.map((tick,index) => {
      const textWidth = labels[index].length * fontSize * .62;
      const x = axis.position(tick) / 100 * width;
      const left = index === 0 ? x : index === ticks.length - 1 ? x - textWidth : x - textWidth / 2;
      return {left,right:left + textWidth};
    });
    for (let index = 1; index < boxes.length; index++) expect(boxes[index - 1].right + 10).toBeLessThanOrEqual(boxes[index].left);
  });

  it("keeps memory labels in MiB while calculating their locations from KiB", () => {
    const axis = makeMetricAxis("max_rss_kib",[availableMetric(512),availableMetric(1024000)]);
    expect(selectTradeoffXTicks(axis,"max_rss_kib","en",712,13)).toEqual([.1,1,10,100,1000]);
    expect(axis.position(1024)).toBe(25);
  });

  it("keeps enlarged zoomed endpoint labels inside the page while retaining plotting room", () => {
    const axis = makeMetricAxis("q",[availableMetric(.968),availableMetric(.995)],{zoom:true});
    const labels = formatAxisTicks(axis.ticks,"q","en");
    const fontSize = 26;
    const gutter = tradeoffYAxisGutter(labels,fontSize);
    expect(labels).toContain("0.96665");
    expect(labels).toContain("0.99635");
    for (const label of labels) expect(gutter - 10 - label.length * fontSize * .62).toBeGreaterThanOrEqual(0);
    // A 375px screen has 343px of content after page gutters; keep 200px for points.
    expect(343 - gutter - 10).toBeGreaterThanOrEqual(200);
  });
});

function mount(snapshot = publishedSnapshot(), initial = "", reference = true) {
  const dataset = {...snapshot.catalog.datasets[0], reference};
  function Harness() {
    const [params, setParams] = useState(new URLSearchParams(initial));
    return <TradeoffPlot snapshot={snapshot} scope={{mode:"latest"}} dataset={dataset} locale="en" params={params} onParamsChange={patch => setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(patch)) { if (value) next.set(key,value); else next.delete(key); }
      return next;
    })} />;
  }
  return render(<Harness />);
}

describe("tradeoff chart", () => {
  it("reserves enlarged label space before the first ResizeObserver callback", () => {
    const width = vi.spyOn(HTMLElement.prototype,"clientWidth","get").mockReturnValue(259);
    const styles = vi.spyOn(window,"getComputedStyle").mockReturnValue({fontSize:"26px"} as CSSStyleDeclaration);
    vi.stubGlobal("ResizeObserver",class { observe() {} disconnect() {} });
    try {
      const view = mount();
      const label = [...view.container.querySelectorAll<HTMLElement>(".tradeoff-direct-label")].find(element => element.textContent === "Clustal Omega")!;
      // Its real 26px text needs far more than the 107px reserved for 13px text.
      expect(parseFloat(label.style.maxWidth)).toBeGreaterThan(180);
      expect(parseFloat(label.style.maxWidth)).toBeLessThanOrEqual(259);
    } finally {
      width.mockRestore();styles.mockRestore();vi.unstubAllGlobals();
    }
  });

  it("plots valid metric pairs only, using the complete latest observation and its source", () => {
    mount();
    const chart = screen.getByTestId("tradeoff-chart");
    expect(chart).toHaveAttribute("data-x-key", "wall_seconds");
    expect(chart).toHaveAttribute("data-y-key", "q");
    expect(chart).toHaveAttribute("data-y-min", "0");
    expect(chart).toHaveAttribute("data-y-max", "1");
    const points = screen.getAllByTestId("tradeoff-point");
    expect(points).toHaveLength(2);
    expect(points[0]).toHaveAttribute("data-x-raw", "20");
    expect(points[0]).toHaveAttribute("data-batch-id", "newer");
    expect(points[0]).toHaveAttribute("data-y-percent", "80");
    const expected = (Math.log10(20) - 1) / (2 - 1) * 100;
    expect(Number(points[0].dataset.xPercent)).toBeCloseTo(expected, 10);
    expect(screen.getAllByTestId("tradeoff-method")).toHaveLength(9);
    expect(screen.getAllByTestId("tradeoff-method").find(row => row.dataset.method === "mafft")).toHaveTextContent("Timed out");
  });

  it("keeps the comparison columns aligned with the current axes and preserves missing results", () => {
    mount();
    const methods = screen.getAllByTestId("tradeoff-method");
    expect(within(methods[0]).getByTestId("tradeoff-method-x")).toHaveTextContent("20");
    expect(within(methods[0]).getByTestId("tradeoff-method-y")).toHaveTextContent("0.8");
    expect(within(methods[2]).getByTestId("tradeoff-method-x")).toHaveTextContent("Timed out");
    expect(within(methods[2]).getByTestId("tradeoff-method-y")).toHaveTextContent("—");
    fireEvent.change(screen.getByLabelText("Horizontal axis"),{target:{value:"max_rss_kib"}});
    const memory = within(methods[0]).getByTestId("tradeoff-method-x");
    expect(memory).toHaveAttribute("data-raw","1024");
    expect(memory).toHaveTextContent(/^1$/);
    expect(methods[0]).toHaveAccessibleName(/Peak memory 1 MiB/);
  });

  it("shows a shared source once, and individual sources only when observations differ", () => {
    const single = mount();
    expect(single.container.querySelectorAll(".tradeoff-row-source")).toHaveLength(0);
    expect(single.container.querySelectorAll(".tradeoff-source-legend > span")).toHaveLength(1);
    single.unmount();
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results = snapshot.batches[1].results.filter(result => result.method_id !== "tcoffee");
    const mixed = mount(snapshot);
    expect(mixed.container.querySelectorAll(".tradeoff-row-source")).toHaveLength(9);
    const row = screen.getAllByTestId("tradeoff-method").find(method => method.dataset.method === "tcoffee")!;
    expect(row).toHaveTextContent("older");
    fireEvent.click(row);
    expect(screen.getByRole("tooltip")).toHaveTextContent("older");
    expect(mixed.container.querySelectorAll(".tradeoff-source-legend > span")).toHaveLength(2);
  });

  it("does not fall back to older valid values when one latest metric is missing", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results[0].metrics.q = absentMetric("execution_failed");
    mount(snapshot);
    expect(screen.getAllByTestId("tradeoff-point")).toHaveLength(1);
    expect(screen.getAllByTestId("tradeoff-point")[0]).toHaveAttribute("data-method", "tcoffee");
  });

  it("defaults to SP without a reference, supports negative values and disables Q/TC", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results[0].metrics.sp_score = availableMetric(-100);
    mount(snapshot, "y=q", false);
    expect(screen.getByLabelText("Vertical axis")).toHaveValue("sp_score");
    expect(screen.getByRole("option", {name:"Q · no reference"})).toBeDisabled();
    expect(screen.getByRole("option", {name:"TC · no reference"})).toBeDisabled();
    expect(Number(screen.getByTestId("tradeoff-chart").dataset.yMin)).toBeLessThan(-100);
    expect(screen.queryByText(/SP is a pairwise score/)).not.toBeInTheDocument();
  });

  it("uses a linear axis for zero resource values without adding offsets", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results[0].metrics.wall_seconds = availableMetric(0);
    mount(snapshot);
    expect(screen.getByTestId("tradeoff-chart")).toHaveAttribute("data-x-scale", "linear");
    const point = screen.getAllByTestId("tradeoff-point")[0];
    expect(point).toHaveAttribute("data-x-raw", "0");
    expect(point).toHaveAttribute("data-x-percent", "0");
    expect(screen.getByText(/Non-positive value or interval/)).toBeVisible();
  });

  it("changes axes and retains the raw KiB while displaying MiB", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Horizontal axis"), {target:{value:"max_rss_kib"}});
    fireEvent.change(screen.getByLabelText("Vertical axis"), {target:{value:"tc"}});
    const point = screen.getAllByTestId("tradeoff-point")[0];
    expect(point).toHaveAttribute("data-x-raw", "1024");
    expect(point).toHaveAccessibleName(/1 MiB/);
    fireEvent.click(point);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Original: 1,024 KiB");
    expect(screen.getByRole("tooltip")).toHaveTextContent("newer");
    fireEvent.keyDown(window, {key:"Escape"});
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps completely overlapping measurements independently selectable without jitter", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results[1].metrics = structuredClone(snapshot.batches[1].results[0].metrics);
    mount(snapshot);
    const [first, second] = screen.getAllByTestId("tradeoff-point");
    expect(first.dataset.xPercent).toBe(second.dataset.xPercent);
    expect(first.dataset.yPercent).toBe(second.dataset.yPercent);
    fireEvent.click(screen.getAllByTestId("tradeoff-method")[1]);
    expect(screen.getByRole("tooltip")).toHaveTextContent("T-Coffee");
    fireEvent.focus(first);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Clustal Omega");
    const labels = placeTradeoffLabels([{id:"a",name:"Clustal Omega",x:100,y:100},{id:"b",name:"T-Coffee",x:100,y:100}], 300);
    expect(labels[0].x + labels[0].width <= labels[1].x || labels[1].x + labels[1].width <= labels[0].x || labels[0].y + 18 <= labels[1].y || labels[1].y + 18 <= labels[0].y).toBe(true);
    expect(labels.every(label => label.x >= 0 && label.x + label.width <= 300 && label.y >= 0 && label.y <= 330)).toBe(true);
  });

  it("keeps focused scatter details stable when scrolling moves another point under a stationary pointer", () => {
    mount();
    const [first, second] = screen.getAllByTestId("tradeoff-point");
    fireEvent.focus(first);
    fireEvent.mouseEnter(second);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Clustal Omega");
    fireEvent.pointerMove(second);
    expect(screen.getByRole("tooltip")).toHaveTextContent("T-Coffee");
  });

  it("offers dismissible precise details from the method list without putting controls inside the tooltip", () => {
    mount();
    const method = screen.getAllByTestId("tradeoff-method")[0];
    fireEvent.focus(method);
    expect(method).toHaveAttribute("aria-describedby","tradeoff-description");
    expect(screen.getByTestId("tradeoff-details")).toBeVisible();
    const close = screen.getByRole("button",{name:"Close result details"});
    expect(screen.getByRole("tooltip")).not.toContainElement(close);
    fireEvent.click(close);
    expect(screen.queryByTestId("tradeoff-details")).not.toBeInTheDocument();
    expect(method).not.toHaveAttribute("aria-describedby");
  });

  it("places labels clear of measurement markers, including enlarged text", () => {
    const points = [{id:"a",name:"Kalign 3",x:130,y:80},{id:"b",name:"FMAlign2",x:175,y:100},{id:"c",name:"MAFFT",x:193,y:101}];
    for (const fontSize of [12,24]) {
      const labels = placeTradeoffLabels(points,260,fontSize);
      labels.forEach(label => {
        expect(points.some(point => label.x < point.x + 8 && label.x + label.width > point.x - 8 && label.y < point.y + 8 && label.y + fontSize * 1.5 > point.y - 8)).toBe(false);
        expect(label.x + label.width).toBeLessThanOrEqual(260);
        expect(label.y + fontSize * 1.5).toBeLessThanOrEqual(350);
      });
    }
  });

  it.each([8,9])("keeps %i tightly clustered method labels disjoint at 200 percent text", count => {
    const allNames = ["Clustal Omega","T-Coffee","MAFFT","MUSCLE 5","Kalign 3","HAlign 3","HAlign 4","FMAlign2","minipoa"];
    const names = count === 8 ? allNames.filter(name => name !== "T-Coffee") : allNames;
    const height = tradeoffPlotHeight(count,24);
    const points = names.map((name,index) => ({id:String(index),name,x:25 + index * 18,y:index % 3 * 3 + 2}));
    const original = structuredClone(points);
    const labels = placeTradeoffLabels(points,259,24,height);
    expect(points).toEqual(original);
    expect(labels).toHaveLength(count);
    for (const [index,label] of labels.entries()) {
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(259);
      expect(label.y).toBeGreaterThanOrEqual(0);
      expect(label.y + 36).toBeLessThanOrEqual(height);
      for (const other of labels.slice(index + 1)) {
        expect(label.x + label.width <= other.x || other.x + other.width <= label.x || label.y + 36 <= other.y || other.y + 36 <= label.y).toBe(true);
      }
      expect(points.some(point => label.x < point.x + 8 && label.x + label.width > point.x - 8 && label.y < point.y + 8 && label.y + 36 > point.y - 8)).toBe(false);
    }
  });

  it("shows an empty chart and method states when all measurements fail", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results.forEach(result => { result.metrics.wall_seconds = absentMetric("timeout"); });
    mount(snapshot);
    expect(screen.queryAllByTestId("tradeoff-point")).toHaveLength(0);
    expect(screen.getAllByTestId("tradeoff-method")).toHaveLength(9);
    expect(screen.getByText(/No results to plot/)).toBeVisible();
  });

  it("supports one valid point and uses only reported SD/range for repeated observations", () => {
    const snapshot = publishedSnapshot();
    snapshot.batches[1].results[1].metrics.q = absentMetric("execution_failed");
    const r = snapshot.batches[1].results[0];
    Object.assign(r.metrics.wall_seconds, {value:null,mean:20,sd:2,min:18,max:22,display:"mean_sd"});
    Object.assign(r.metrics.q, {value:null,mean:.8,sd:null,min:.7,max:.9,display:"mean_range"});
    mount(snapshot);
    expect(screen.getAllByTestId("tradeoff-point")).toHaveLength(1);
    expect(screen.getByTestId("tradeoff-x-range")).toBeInTheDocument();
    expect(screen.getByTestId("tradeoff-y-range")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Zoom Q / TC differences"));
    expect(Number(screen.getByTestId("tradeoff-chart").dataset.yMin)).toBeLessThan(.7);
    expect(Number(screen.getByTestId("tradeoff-chart").dataset.yMin)).toBeGreaterThan(0);
  });

  it("distinguishes partial records without plotting unavailable partners", () => {
    mount();
    expect(screen.getAllByTestId("tradeoff-method")[1]).toHaveAttribute("data-status", "partial");
    fireEvent.click(screen.getAllByTestId("tradeoff-method")[1]);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Partial");
    expect(screen.getByRole("tooltip")).toHaveTextContent("1/3 valid for vertical metric");
  });
});

it("aligned plots use each record's source and write relevant options to the URL", () => {
  const snapshot = publishedSnapshot();
  const onParamsChange = vi.fn();
  render(<MetricPlots snapshot={snapshot} scope={{mode:"latest"}} dataset={snapshot.catalog.datasets[0]} locale="en" selectedMetric="wall_seconds" params={new URLSearchParams()} onParamsChange={onParamsChange} />);
  const point = screen.getAllByTestId("metric-point").find(point => point.dataset.method === "clustalo" && point.dataset.metric === "wall_seconds")!;
  expect(point).toHaveAttribute("data-batch-id", "newer");
  fireEvent.click(point);
  expect(screen.getByRole("tooltip")).toHaveTextContent("newer");
  expect(onParamsChange).toHaveBeenCalledWith({method:"clustalo"});
  fireEvent.change(screen.getByLabelText("SP measure"),{target:{value:"scaled_sp"}});
  expect(onParamsChange).toHaveBeenCalledWith({sp:"scaled_sp",metric:"scaled_sp"});
});

it("aligned plots preserve keyboard details through layout-induced mouse entry", () => {
  const snapshot = publishedSnapshot();
  render(<MetricPlots snapshot={snapshot} scope={{mode:"latest"}} dataset={snapshot.catalog.datasets[0]} locale="en" selectedMetric="wall_seconds" />);
  const first = screen.getAllByTestId("metric-point").find(point => point.dataset.method === "clustalo" && point.dataset.metric === "wall_seconds")!;
  const second = screen.getAllByTestId("metric-point").find(point => point.dataset.method === "tcoffee" && point.dataset.metric === "wall_seconds")!;
  fireEvent.focus(first);
  fireEvent.mouseEnter(second);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Clustal Omega");
  fireEvent.pointerMove(second);
  expect(screen.getByRole("tooltip")).toHaveTextContent("T-Coffee");
});
