import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BenchmarkSidebar, type BenchmarkSidebarProps } from "./BenchmarkSidebar";
import { parseSnapshot } from "./model";

const catalog = parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8"))).catalog.datasets;
let mediaMatches = true;
let mediaListener: (() => void) | undefined;
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output>; }
function mount(props: Partial<BenchmarkSidebarProps> = {}) {
  return render(<MemoryRouter initialEntries={["/benchmark"]}><BenchmarkSidebar datasets={catalog} params={new URLSearchParams()} locale="en" catalogCount={26} methodCount={9} {...props}/><Location/></MemoryRouter>);
}
beforeEach(() => {
  mediaMatches = true; mediaListener = undefined;
  vi.stubGlobal("matchMedia", vi.fn(() => ({get matches() {return mediaMatches;}, media:"(min-width: 1024px)",
    addEventListener: (_event: string, listener: () => void) => {mediaListener = listener;}, removeEventListener: vi.fn()})));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Benchmark dataset sidebar", () => {
  it.each(["en", "zh"] as const)("uses the actual 20 DNA and 6 RNA datasets and original lengths in %s", locale => {
    mount({locale});
    const sidebar = screen.getByTestId("dataset-sidebar");
    expect(sidebar.querySelector(".benchmark-studio-sidebar-menu")).toHaveAttribute("open");
    expect(within(sidebar).getByText(locale === "en" ? "20 datasets" : "20 个数据集")).toBeVisible();
    expect(within(sidebar).getByText(locale === "en" ? "6 datasets" : "6 个数据集")).toBeVisible();
    const links = within(sidebar).getAllByTestId("dataset-nav-link");
    expect(links).toHaveLength(26);
    for (const dataset of catalog) {
      const link = links.find(item => item.dataset.datasetId === dataset.id)!;
      const format = (value: number) => value.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
      expect(link).toHaveTextContent(`${format(dataset.min_length)}–${format(dataset.max_length)} nt`);
      expect(link).toHaveTextContent(locale === "en" ? `${format(dataset.sequence_count)} sequences` : `${format(dataset.sequence_count)} 条序列`);
    }
    expect(sidebar).toHaveTextContent(locale === "en" ? "26 datasets · 9 methods" : "26 个数据集 · 9 种方法");
  });

  it("keeps simulation labels distinct from newly measured identity", () => {
    mount();
    const simulation = catalog.find(dataset => dataset.similarity_label !== null)!;
    const link = screen.getAllByTestId("dataset-nav-link").find(item => item.dataset.datasetId === simulation.id)!;
    expect(link).toHaveTextContent(`Source label ${simulation.similarity_label}`);
    expect(link).toHaveAccessibleName(/Source similarity label, not a newly measured identity/);
    expect(link).toHaveAttribute("title", expect.stringContaining("Scientific simulation"));
    expect(link.textContent).not.toContain(`${simulation.similarity_label}%`);
  });

  it("retains batch, method, filters and chart state on dataset links while cleaning nested return locations", () => {
    const rna = catalog.find(dataset => dataset.sequence_type === "rna")!;
    const params = new URLSearchParams("batch=memory32-single-20261029&type=rna&search=rna&methods=mafft,halign3&reference=yes&metric=q&chart=metrics&x=max_rss_kib&y=tc&scale=linear&zoom=1&method=mafft&returnTo=%2Fbenchmark%3Fsearch%3Dold");
    const original = params.toString();
    mount({params, selectedId:rna.id, datasets:catalog.filter(dataset => dataset.sequence_type === "rna"), methodCount:2});
    const current = screen.getAllByTestId("dataset-nav-link").find(item => item.dataset.datasetId === rna.id)!;
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current).toHaveClass("is-active");
    const next = new URL(current.getAttribute("href")!, "https://example.org");
    for (const [key,value] of params) if (key !== "returnTo") expect(next.searchParams.get(key)).toBe(value);
    expect(next.searchParams.has("returnTo")).toBe(false);
    const overview = new URL(screen.getByRole("link", {name:"All datasets"}).getAttribute("href")!, "https://example.org");
    for (const key of ["batch", "type", "search", "methods", "reference", "metric"]) expect(overview.searchParams.get(key)).toBe(params.get(key));
    for (const key of ["returnTo", "chart", "x", "y", "scale", "zoom", "method"]) expect(overview.searchParams.has(key)).toBe(false);
    expect(screen.getByTestId("dataset-sidebar")).toHaveTextContent("6 of 26 datasets · 2 methods");
    expect(params.toString()).toBe(original);
  });

  it("sends search edits to the shared caller without mutating supplied URL parameters", () => {
    const params = new URLSearchParams("scope=latest&search=old&methods=mafft");
    const search = vi.fn();
    mount({params,onSearch:search});
    const input = screen.getByRole("searchbox", {name:"Search datasets"});
    expect(input).toHaveValue("old");
    fireEvent.change(input,{target:{value:"rna"}});
    expect(search).toHaveBeenLastCalledWith("rna");
    fireEvent.change(input,{target:{value:""}});
    expect(search).toHaveBeenLastCalledWith("");
    expect(params.get("search")).toBe("old");
  });

  it("can update the current search URL when no callback is supplied", () => {
    mount({params:new URLSearchParams("scope=latest&methods=mafft")});
    fireEvent.change(screen.getByRole("searchbox",{name:"Search datasets"}),{target:{value:"rna"}});
    expect(screen.getByTestId("location")).toHaveTextContent("/benchmark?scope=latest&methods=mafft&search=rna");
  });

  it("honors an empty or sparse supplied selection without restoring excluded datasets", () => {
    const {rerender} = mount({datasets:[catalog[0]],methodCount:1});
    expect(screen.getAllByTestId("dataset-nav-link")).toHaveLength(1);
    expect(screen.getByTestId("dataset-sidebar")).toHaveTextContent("1 of 26 datasets · 1 method");
    rerender(<MemoryRouter><BenchmarkSidebar datasets={[]} params={new URLSearchParams("search=missing")} locale="en" catalogCount={26}/></MemoryRouter>);
    expect(screen.queryAllByTestId("dataset-nav-link")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("No datasets match the current filters.");
  });

  it("collapses on mobile, provides a native disclosure, and opens persistently at the desktop breakpoint", () => {
    mediaMatches = false;
    mount();
    const menu = screen.getByTestId("dataset-sidebar").querySelector(".benchmark-studio-sidebar-menu")!;
    expect(menu).not.toHaveAttribute("open");
    const summary = menu.querySelector("summary")!;
    expect(summary).toHaveTextContent("Datasets26");
    fireEvent.click(summary);
    expect(menu).toHaveAttribute("open");
    act(() => {mediaMatches = true; mediaListener?.();});
    expect(menu).toHaveAttribute("open");
    const link = screen.getAllByTestId("dataset-nav-link")[0];
    fireEvent.click(link);
    expect(menu).toHaveAttribute("open");
    expect(screen.getByTestId("location")).toHaveTextContent(`/benchmark/datasets/${link.dataset.datasetId}`);
  });
});
