import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { datasetGroup } from "./BenchmarkMatrix";
import { familyDatasets, summaryFamilies, tallyMethods } from "./MethodSummary";
import { displayMetricKeys } from "./metrics";
import { parseSnapshot, type MetricKey } from "./model";
import { currentResultScope, selectRecords } from "./selection";
import { websiteSnapshot } from "./website";
import { absentMetric, availableMetric, publishedSnapshot } from "./__tests__/fixtures";

const snapshot = websiteSnapshot(parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8"))));
const datasets = snapshot.catalog.datasets;

function scores(values: (number | null)[], key: MetricKey = "q") {
  const sample = publishedSnapshot();
  sample.methods = sample.methods.slice(0, values.length);
  sample.catalog.datasets = sample.catalog.datasets.slice(0, 1);
  sample.batches = [sample.batches[1]];
  sample.batches[0].results = sample.batches[0].results.slice(0, values.length).map((row, index) => ({
    ...row, status: values[index] === null ? "timeout" : "complete", reason_code: values[index] === null ? "timeout" : null,
    metrics: {...row.metrics, [key]: values[index] === null ? absentMetric("timeout") : availableMetric(values[index]!)},
  }));
  return sample;
}

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

  it("counts raw best values independently of the matrix colour helpers", () => {
    const records = selectRecords(snapshot, currentResultScope);
    for (const family of summaryFamilies) {
      const included = familyDatasets(datasets, family.id);
      const {rows, eligible} = tallyMethods(snapshot, currentResultScope, included);
      for (const key of displayMetricKeys) {
        const expected = snapshot.methods.map(() => 0);
        let withValues = 0;
        for (const dataset of included) {
          const observations = snapshot.methods.map(method => {
            const metric = records.find(row => row.result.dataset_id === dataset.id && row.result.method_id === method.id)?.result.metrics[key];
            return metric && ["complete", "partial"].includes(metric.status) ? metric.value ?? metric.mean : null;
          });
          const valid = observations.filter((value): value is number => value !== null);
          if (!valid.length) continue;
          withValues++;
          const sorted = [...valid].sort((a,b) => a-b);
          const best = key === "wall_seconds" || key === "max_rss_kib" ? sorted[0] : sorted[sorted.length-1];
          observations.forEach((value,index) => { if (value === best) expected[index]++; });
        }
        expect(rows.map(row => row.wins[key]), `${family.id || "all"}/${key}`).toEqual(expected);
        expect(eligible[key]).toBe(withValues);
        expect(Math.max(...rows.map(row => row.wins[key]))).toBeLessThanOrEqual(eligible[key]);
      }
    }
  });

  it.each(["dna_mt_sim_97", "dna_mt_sim_99"])("counts every valid tied Q in real dataset %s", id => {
    const dataset = datasets.find(dataset => dataset.id === id)!;
    const {rows, eligible} = tallyMethods(snapshot, currentResultScope, [dataset]);
    expect(eligible.q).toBe(1);
    expect(rows.map(row => [row.id, row.wins.q])).toEqual([
      ["clustalo",1],["mafft",1],["muscle5",0],["halign4",1],["fmalign2",1],["minipoa",1],
    ]);
  });

  it.each([
    {values:[1,1,1], key:"q", expected:[1,1,1]},
    {values:[.8,.8,.7], key:"q", expected:[1,1,0]},
    {values:[0,0,4], key:"wall_seconds", expected:[1,1,0]},
    {values:[1024,2048,1024], key:"max_rss_kib", expected:[1,0,1]},
    {values:[-2,-1,-1], key:"scaled_sp", expected:[0,1,1]},
    {values:[.5,.500000001,null], key:"q", expected:[0,1,0]},
    {values:[null,.9,null], key:"q", expected:[0,1,0]},
    {values:[.9], key:"q", expected:[1]},
    {values:[null,null,null], key:"q", expected:[0,0,0]},
  ])("counts $key bests for $values without rounding or inventing missing scores", ({values,key,expected}) => {
    const sample = scores(values, key as MetricKey);
    const {rows,eligible} = tallyMethods(sample,currentResultScope,sample.catalog.datasets);
    expect(rows.map(row => row.wins[key as typeof displayMetricKeys[number]])).toEqual(expected);
    expect(eligible[key as typeof displayMetricKeys[number]]).toBe(values.some(value => value !== null) ? 1 : 0);
  });

  it("includes partial metrics with usable values and leaves missing reference scores uncounted", () => {
    const sample = scores([.8,.8,null]);
    sample.batches[0].results[1].metrics.q = availableMetric(.8,1,3);
    sample.batches[0].results[2].metrics.q = absentMetric("no_reference");
    expect(tallyMethods(sample,currentResultScope,sample.catalog.datasets).rows.map(row => row.wins.q)).toEqual([1,1,0]);
  });
});
