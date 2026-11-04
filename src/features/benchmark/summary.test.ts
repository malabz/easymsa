import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { datasetGroup } from "./BenchmarkMatrix";
import { familyDatasets, summaryFamilies, tallyMethods } from "./MethodSummary";
import { displayMetricKeys, metricEmphasis, selectMetricRows } from "./metrics";
import { parseSnapshot } from "./model";
import { currentResultScope } from "./selection";
import { websiteSnapshot } from "./website";

const snapshot = websiteSnapshot(parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8"))));
const datasets = snapshot.catalog.datasets;

describe("method summary", () => {
  it("splits datasets into families that cover the catalogue exactly once", () => {
    expect(familyDatasets(datasets, null)).toEqual(datasets);
    expect(familyDatasets(datasets, "unknown")).toEqual(datasets);
    const parts = summaryFamilies.filter(family => family.group >= 0).map(family => familyDatasets(datasets, family.id));
    expect(parts.flat().map(dataset => dataset.id).sort()).toEqual(datasets.map(dataset => dataset.id).sort());
    for (const [index, part] of parts.entries()) expect(part.every(dataset => datasetGroup(dataset) === index)).toBe(true);
    expect(familyDatasets(datasets, "rna").every(dataset => dataset.sequence_type === "rna")).toBe(true);
  });

  it("counts run outcomes that match the published coverage", () => {
    const {rows} = tallyMethods(snapshot, currentResultScope, datasets);
    const sum = (key: "total" | "complete" | "timeout" | "oom" | "otherFailures") => rows.reduce((total, row) => total + row[key], 0);
    expect(rows.map(row => row.id)).toEqual(snapshot.methods.map(method => method.id));
    expect(rows.every(row => row.total === datasets.length)).toBe(true);
    expect([sum("total"), sum("complete"), sum("timeout"), sum("oom"), sum("otherFailures")]).toEqual([156, 127, 14, 15, 0]);
  });

  it("counts within-dataset bests exactly as the matrix marks them, ties included", () => {
    for (const family of summaryFamilies) {
      const included = familyDatasets(datasets, family.id);
      const {rows, eligible} = tallyMethods(snapshot, currentResultScope, included);
      for (const key of displayMetricKeys) {
        const expected = snapshot.methods.map(() => 0);
        let withValues = 0;
        for (const dataset of included) {
          const metricRows = selectMetricRows(snapshot, undefined, dataset.id, key, currentResultScope);
          if (metricRows.some(row => row.raw !== null)) withValues++;
          metricEmphasis(key, metricRows.map(row => row.metric)).forEach((emphasis, index) => { if (emphasis.best) expected[index]++; });
        }
        expect(rows.map(row => row.wins[key]), `${family.id || "all"}/${key}`).toEqual(expected);
        expect(eligible[key]).toBe(withValues);
        expect(Math.max(...rows.map(row => row.wins[key]))).toBeLessThanOrEqual(eligible[key]);
      }
    }
  });
});
