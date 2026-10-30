import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { datasetName } from "./names";
import { emptyFilters, filterDatasets, parseSnapshot } from "./model";

const datasets = parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8"))).catalog.datasets;
describe("dataset display names and search", () => {
  it.each([
    ["dna_16s_1k", "16S · 1,000 条", "16S · 1,000 sequences"],
    ["dna_mt_10k", "线粒体 · 10,000 条", "Mitochondrial · 10,000 sequences"],
    ["dna_mt_sim_70", "线粒体模拟 · 70%", "Mitochondrial simulation · 70%"],
    ["rna_1023", "RNA · 1,023 条", "RNA · 1,023 sequences"],
  ])("names %s consistently", (id, zh, en) => {
    const dataset = datasets.find(d => d.id === id)!;
    expect(datasetName(dataset, "zh")).toBe(zh);
    expect(datasetName(dataset, "en")).toBe(en);
    expect(datasetName(dataset,"zh",true)).toBe(zh.split(" · ")[1]);
  });
  it("supports every original ID and both full display names", () => {
    for (const dataset of datasets) for (const search of [dataset.id, datasetName(dataset,"en"), datasetName(dataset,"zh")]) {
      expect(filterDatasets(datasets,{...emptyFilters,search}).map(d=>d.id)).toContain(dataset.id);
    }
    expect(new Set(datasets.map(d=>datasetName(d,"zh"))).size).toBe(26);
  });
  it.each(["线粒体", "Mitochondrial", "10,000", "10000", "dna_mt_10k"])("finds the 10k mitochondrial dataset by %s", search => {
    expect(filterDatasets(datasets,{...emptyFilters,search}).map(d=>d.id)).toContain("dna_mt_10k");
  });
});
