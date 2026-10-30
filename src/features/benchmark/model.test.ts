import { describe, expect, it } from "vitest";
import { compatibleBatches, emptyFilters, filterDatasets, parseSnapshot } from "./model";
import { absentMetric, emptySnapshot, publishedSnapshot } from "./__tests__/fixtures";
import { formatMetric, metricValue, selectDownload, snapshotCsv } from "./presentation";

describe("public benchmark snapshot", () => {
  it("accepts a truthful empty draft and populated frozen evaluations", () => {
    expect(parseSnapshot(emptySnapshot()).batches).toHaveLength(0);
    expect(parseSnapshot(publishedSnapshot()).batches).toHaveLength(2);
  });
  it.each([
    ["unknown operational field", (x: ReturnType<typeof publishedSnapshot>) => Object.assign(x, { plan: { path: "/private/data" } })],
    ["duplicate dataset", (x: ReturnType<typeof publishedSnapshot>) => x.catalog.datasets.push(x.catalog.datasets[0])],
    ["duplicate method", (x: ReturnType<typeof publishedSnapshot>) => x.methods.push(x.methods[0])],
    ["mixed data version", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].dataset_version = "other"; }],
    ["draft results", (x: ReturnType<typeof publishedSnapshot>) => { x.catalog.status = "draft"; }],
    ["unclassified evaluation", (x: ReturnType<typeof publishedSnapshot>) => { x.catalog.datasets[0].classification = null; }],
    ["large case with ordinary repeats", (x: ReturnType<typeof publishedSnapshot>) => { x.catalog.datasets[0].classification = "large"; }],
    ["unknown dataset", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].dataset_id = "missing"; }],
    ["nonfinite score", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].metrics.q.value = Infinity; }],
    ["Q outside range", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].metrics.q.mean = 1.2; }],
    ["negative time", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].metrics.wall_seconds.min = -1; }],
    ["impossible repeat coverage", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].valid_repeats = 4; }],
    ["complete result mislabeled partial", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].status = "partial"; }],
    ["no valid results mislabeled partial", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[2].status = "partial"; }],
    ["missing score replaced by zero", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[2].metrics.q.value = 0; }],
    ["value disagrees with aggregate", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].metrics.wall_seconds.value = 999; }],
    ["contradictory single aggregate", (x: ReturnType<typeof publishedSnapshot>) => { const m = x.batches[0].results[0].metrics.wall_seconds; m.min = 1; m.max = 30; }],
    ["single run with standard deviation", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[1].metrics.q.sd = .1; }],
    ["unknown public reason", (x: ReturnType<typeof publishedSnapshot>) => Object.assign(x.batches[0].results[1], { reason_code: "/opt/private.log" })],
    ["private command path", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].methods[0].parameters = ["/opt/private/input.fasta"]; }],
    ["source URL credentials", (x: ReturnType<typeof publishedSnapshot>) => { x.catalog.sources[0].url = "https://name:password@example.org/data"; }],
    ["unapproved placeholder", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].methods[0].parameters = ["{private_path}"]; }],
    ["reference-incompatible Q", (x: ReturnType<typeof publishedSnapshot>) => { x.catalog.datasets[0].reference = false; }],
    ["non-reference metric marked inapplicable", (x: ReturnType<typeof publishedSnapshot>) => { x.batches[0].results[0].metrics.wall_seconds = absentMetric("no_reference"); }]
  ])("rejects %s", (_name, change) => { const x = publishedSnapshot(); change(x); expect(() => parseSnapshot(x)).toThrow(); });
  it("sorts batch timestamps by instant rather than timezone text", () => {
    const x = publishedSnapshot(); x.batches[0].created_at = "2026-10-27T08:30:00+09:00"; x.batches[1].created_at = "2026-10-27T00:00:00Z";
    expect(compatibleBatches(x).map(b => b.id)).toEqual(["newer", "older"]);
  });
  it("combines origin, type, count, reference and text filters", () => {
    const x = emptySnapshot();
    expect(filterDatasets(x.catalog.datasets, { ...emptyFilters, type: "dna", source: "simulated", reference: "yes", min: "50", max: "150", search: "REF" }).map(d => d.id)).toEqual(["case_ref"]);
    expect(filterDatasets(x.catalog.datasets, { ...emptyFilters, min: "1000", max: "100" })).toHaveLength(0);
  });
});

describe("public presentation and downloads", () => {
  it("preserves missing states and real numeric zero separately", () => {
    const zero = publishedSnapshot().batches[0].results[0].metrics.q;
    zero.value = zero.mean = zero.min = zero.max = 0;
    expect(metricValue(zero)).toBe(0); expect(formatMetric(zero, "q", "en")).toBe("0");
    expect(metricValue(absentMetric())).toBeNull(); expect(formatMetric(absentMetric(), "q", "en")).toBe("Not evaluated");
    expect(formatMetric(undefined, "q", "zh", true)).toBe("无参考");
  });
  it("downloads only the selected batch and dataset without recomputing values", () => {
    const snapshot = selectDownload(publishedSnapshot(), "older", "case_ref");
    expect(parseSnapshot(snapshot).catalog.datasets.map(d => d.id)).toEqual(["case_ref"]);
    expect(snapshot.batches.map(b => b.id)).toEqual(["older"]);
    const csv = snapshotCsv(snapshot);
    expect(csv).toContain('"older"'); expect(csv).not.toContain('"newer"');
    expect(csv).toContain('"wall_seconds","s","complete","3","3","10","10"');
    expect(csv).toContain('"q","","unavailable","0","3","","","","",""');
  });
  it("exports a header-only CSV when there are no results", () => {
    expect(snapshotCsv(emptySnapshot()).trim().split("\r\n")).toHaveLength(1);
  });
  it("escapes CSV quotes and spreadsheet formula prefixes", () => {
    const snapshot = selectDownload(publishedSnapshot(), "older"); snapshot.methods[0].name = '=TEST("x")';
    expect(snapshotCsv(snapshot)).toContain('"\'=TEST(""x"")"');
  });
});
