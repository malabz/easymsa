import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { absentMetric, availableMetric, publishedSnapshot } from "./__tests__/fixtures";
import { metricKeys, parseSnapshot, type BenchmarkMetric } from "./model";
import { formatAxisTick, formatAxisTicks, formatMetricSummary, formatMetricValue, makeMetricAxis, metricSpecs, metricValue, rowHeat, selectMetricRows, selectSnapshot, toDisplayValue } from "./metrics";

const metric = (value: number, fields: Partial<BenchmarkMetric> = {}): BenchmarkMetric => ({ ...availableMetric(value, 1, 1), ...fields });

describe("shared benchmark values and display units", () => {
  it("retains zero, falls back to reported mean, and never turns a missing observation into zero", () => {
    expect(metricValue(metric(0))).toBe(0);
    expect(metricValue(metric(12.5, { value: null }))).toBe(12.5);
    expect(metricValue(metric(1, { status: "partial" }))).toBe(1);
    expect(metricValue(absentMetric("timeout"))).toBeNull();
    expect(metricValue(absentMetric("no_reference"))).toBeNull();
    expect(metricValue(undefined)).toBeNull();
  });

  it("defines every metric's direction without mislabelling SP as a resource", () => {
    expect(Object.keys(metricSpecs).sort()).toEqual([...metricKeys].sort());
    expect(metricSpecs.wall_seconds.direction).toBe("lower");
    expect(metricSpecs.max_rss_kib.direction).toBe("lower");
    for (const key of ["sp_score", "avg_sp", "scaled_sp", "q", "tc"] as const) expect(metricSpecs[key].direction).toBe("higher");
  });

  it("uses binary MiB display while preserving KiB report units", () => {
    expect(toDisplayValue("max_rss_kib", 1536)).toBe(1.5);
    expect(toDisplayValue("sp_score", 1536)).toBe(1536);
    expect(metricSpecs.max_rss_kib).toMatchObject({ rawUnit: "KiB", unit: "MiB" });
    expect(formatMetricValue(1536, "max_rss_kib", "en")).toBe("1.5");
    expect(formatAxisTick(1.5, "max_rss_kib", "en")).toBe("1.5");
  });

  it("keeps full reported precision and uses scientific notation only in compact large-score displays", () => {
    expect(formatMetricValue(0.12345678901234567, "q", "en")).toBe("0.12345678901234566");
    expect(formatMetricValue(824153212309, "sp_score", "en")).toBe("824,153,212,309");
    expect(formatMetricValue(824153212309, "sp_score", "zh", true)).toBe("8.242E11");
    expect(formatMetricValue(0, "q", "en", true)).toBe("0");
    expect(formatMetricValue(0.000000003, "q", "en", true)).not.toBe("0");
  });

  it("shows report statistics, translating all resource values with the same unit conversion", () => {
    expect(formatMetricSummary(metric(1536, { display: "mean_sd", sd: 512 }), "max_rss_kib", "en")).toBe("1.5 ± 0.5");
    expect(formatMetricSummary(metric(0.8, { display: "mean_range", min: 0.75, max: 0.85, status: "partial" }), "q", "en")).toBe("0.8 [0.75–0.85] · Partial");
    expect(formatMetricSummary(metric(1), "wall_seconds", "zh")).toBe("1");
    expect(formatMetricSummary(undefined, "q", "zh")).toBe("待评测");
    expect(formatMetricSummary(absentMetric("no_reference"), "q", "en")).toBe("Not applicable");
  });
});

describe("row-local colour scales", () => {
  it("uses a logarithmic relative resource scale so multiplicative differences remain visible", () => {
    expect(rowHeat("wall_seconds", [metric(1), metric(10), metric(100), absentMetric("timeout")])).toEqual([1, 0.5, 0, null]);
    const memory = rowHeat("max_rss_kib", [metric(1024), metric(10240), metric(102400)]);
    expect(memory[0]).toBe(1); expect(memory[1]).toBeCloseTo(0.5); expect(memory[2]).toBe(0);
  });
  it("makes higher SP scores better, including negative scores", () => {
    expect(rowHeat("sp_score", [metric(-100), metric(-50), metric(0)])).toEqual([0, 0.5, 1]);
    expect(rowHeat("q", [metric(0), metric(0.5), metric(1)])).toEqual([0, 0.5, 1]);
  });
  it("does not create variation from ties, a lone result or all failures", () => {
    expect(rowHeat("q", [metric(0.8), metric(0.8), absentMetric()])).toEqual([null, null, null]);
    expect(rowHeat("wall_seconds", [metric(1), absentMetric()])).toEqual([null, null]);
    expect(rowHeat("tc", [absentMetric("no_reference"), undefined])).toEqual([null, null]);
    expect(rowHeat("sp_score", [])).toEqual([]);
  });
  it("uses a linear resource scale for a legitimate zero without adding an offset", () => {
    expect(rowHeat("wall_seconds", [metric(0), metric(1), metric(2)])).toEqual([1, 0.5, 0]);
  });
  it("does not mix metrics, datasets, or report objects when calculating shades", () => {
    const row = [metric(10), metric(20)];
    const before = JSON.stringify(row);
    expect(rowHeat("sp_score", row)).toEqual(rowHeat("sp_score", [metric(10000), metric(20000)]));
    expect(JSON.stringify(row)).toBe(before);
  });
});

describe("point-chart axes", () => {
  it.each(["en", "zh"] as const)("distinguishes close real SP ticks in %s without changing their scale or values", locale => {
    const observed = [824154130945, 824127788009];
    for (const sign of [1, -1]) {
      const axis = makeMetricAxis("sp_score", observed.map(value => metric(sign * value)));
      const before = JSON.stringify({ min: axis.min, max: axis.max, ticks: axis.ticks });
      const labels = formatAxisTicks(axis.ticks, "sp_score", locale);
      expect(new Set(labels).size).toBe(axis.ticks.length);
      expect(labels.every(label => /E/.test(label))).toBe(true);
      const shown = labels.map(label => Number(label.replace(/,/g, "")));
      expect(shown.every((value, index) => index === 0 || value > shown[index - 1])).toBe(true);
      expect(JSON.stringify({ min: axis.min, max: axis.max, ticks: axis.ticks })).toBe(before);
      expect(axis.scale).toBe("linear");
    }
  });
  it("preserves display-unit memory ticks, fixed quality ticks and genuine ties", () => {
    expect(formatAxisTicks([1, 10, 100], "max_rss_kib", "en")).toEqual(["1", "10", "100"]);
    expect(formatAxisTicks([1.000001, 1.000002], "max_rss_kib", "en")).toEqual(["1.000001", "1.000002"]);
    expect(formatAxisTicks([0, 0.25, 0.5, 0.75, 1], "q", "en")).toEqual(["0", "0.25", "0.5", "0.75", "1"]);
    expect(formatAxisTicks([0, 0, 1], "tc", "zh")).toEqual(["0", "0", "1"]);
  });
  it("spreads the real time range logarithmically with explicit real-value ticks", () => {
    const axis = makeMetricAxis("wall_seconds", [metric(0.12), metric(1588.23)]);
    expect(axis.scale).toBe("log");
    expect(axis.min).toBeLessThanOrEqual(0.12);
    expect(axis.max).toBeGreaterThanOrEqual(1588.23);
    expect(axis.ticks.length).toBeLessThanOrEqual(6);
    expect(axis.ticks.every(value => value > 0 && Number.isInteger(Math.log10(value)))).toBe(true);
    expect(axis.position(10) - axis.position(1)).toBeCloseTo(axis.position(100) - axis.position(10));
    expect(axis.zeroFallback).toBe(false);
  });
  it("computes memory positions from KiB while its ticks and domain are in MiB", () => {
    const axis = makeMetricAxis("max_rss_kib", [metric(1024), metric(102400)]);
    expect(axis.min).toBe(1);
    expect(axis.max).toBe(100);
    expect(axis.ticks).toEqual([1, 10, 100]);
    expect(axis.position(10240)).toBeCloseTo(50);
  });
  it.each(["q", "tc"] as const)("keeps the default %s axis fixed to zero through one", key => {
    const axis = makeMetricAxis(key, [metric(0.968), metric(0.995)]);
    expect(axis.min).toBe(0); expect(axis.max).toBe(1);
    expect(axis.position(0.995)).toBeCloseTo(99.5);
    expect(axis.ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
  it("lets Q/TC zoom explicitly into differences without changing point values", () => {
    const axis = makeMetricAxis("q", [metric(0.968), metric(0.995)], { zoom: true });
    expect(axis.min).toBeGreaterThan(0.9); expect(axis.max).toBeLessThanOrEqual(1);
    expect(axis.position(0.995) - axis.position(0.968)).toBeGreaterThan(80);
    for (const value of [0, 0.8, 1]) {
      const tied = makeMetricAxis("tc", [metric(value), metric(value)], { zoom: true });
      expect(tied.min).toBeLessThan(tied.max);
      expect(tied.min).toBeGreaterThanOrEqual(0); expect(tied.max).toBeLessThanOrEqual(1);
      expect(Number.isFinite(tied.position(value))).toBe(true);
    }
  });
  it("supports negative and zero SP values without a logarithm", () => {
    const axis = makeMetricAxis("sp_score", [metric(-5), metric(0), metric(10)]);
    expect(axis.scale).toBe("linear");
    expect(axis.min).toBeLessThan(-5); expect(axis.max).toBeGreaterThan(10);
    expect(axis.position(-5)).toBeLessThan(axis.position(0));
    expect(axis.position(0)).toBeLessThan(axis.position(10));
  });
  it("switches zero resources to linear and respects an explicit linear choice", () => {
    const axis = makeMetricAxis("wall_seconds", [metric(0), metric(1)]);
    expect(axis.scale).toBe("linear"); expect(axis.zeroFallback).toBe(true);
    expect(axis.min).toBe(0); expect(axis.position(0)).toBe(0);
    const chosen = makeMetricAxis("wall_seconds", [metric(1), metric(100)], { linear: true });
    expect(chosen.scale).toBe("linear"); expect(chosen.zeroFallback).toBe(false);
  });
  it("includes reported standard deviations and ranges without manufacturing single-run error bars", () => {
    const sd = makeMetricAxis("sp_score", [metric(10, { display: "mean_sd", sd: 20 })]);
    expect(sd.min).toBeLessThanOrEqual(-10); expect(sd.max).toBeGreaterThanOrEqual(30);
    const range = makeMetricAxis("max_rss_kib", [metric(2048, { display: "mean_range", min: 1024, max: 5120 })]);
    expect(range.min).toBeLessThanOrEqual(1); expect(range.max).toBeGreaterThanOrEqual(5);
    const single = makeMetricAxis("q", [metric(0.8, { min: 0.8, max: 0.8 })]);
    expect(single.min).toBe(0); expect(single.max).toBe(1);
  });
  it.each(metricKeys)("provides a finite neutral domain for an empty %s chart", key => {
    const axis = makeMetricAxis(key, [absentMetric("timeout"), undefined]);
    expect(axis.min).toBe(0); expect(axis.max).toBe(1);
    expect(axis.ticks.every(Number.isFinite)).toBe(true);
  });
});

describe("shared view and download selection", () => {
  it("preserves method positions, missing states and the selected batch", () => {
    const snapshot = publishedSnapshot();
    const rows = selectMetricRows(snapshot, snapshot.batches[1], "case_ref", "wall_seconds");
    expect(rows.map(row => row.method.id)).toEqual(snapshot.methods.map(method => method.id));
    expect(rows[0].raw).toBe(20); expect(rows[2].raw).toBeNull();
    expect(rows[2].result?.status).toBe("timeout");
    const absent = selectMetricRows(snapshot, undefined, "case_ref", "q");
    expect(absent).toHaveLength(9); expect(absent.every(row => row.raw === null)).toBe(true);
  });
  it("makes an empty filter truly empty while an undefined filter selects the full batch", () => {
    const snapshot = publishedSnapshot();
    const full = selectSnapshot(snapshot, "newer");
    expect(full.catalog.datasets).toHaveLength(3);
    expect(full.batches).toHaveLength(1);
    expect(full.batches[0].results).toHaveLength(9);
    const empty = selectSnapshot(snapshot, "newer", []);
    expect(empty.catalog.datasets).toEqual([]);
    expect(empty.catalog.sources).toEqual([]);
    expect(empty.batches[0].results).toEqual([]);
    expect(parseSnapshot(empty)).toEqual(empty);
  });
  it("uses the identical raw records for current-filter downloads without changing source objects", () => {
    const snapshot = publishedSnapshot();
    const original = JSON.stringify(snapshot);
    const subset = selectSnapshot(snapshot, "newer", ["case_ref"]);
    expect(subset.catalog.datasets.map(dataset => dataset.id)).toEqual(["case_ref"]);
    expect(subset.batches[0].results).toEqual(snapshot.batches[1].results);
    expect(parseSnapshot(subset)).toEqual(subset);
    expect(JSON.stringify(snapshot)).toBe(original);
  });
  it("preserves all 1638 real metric records, status distinctions and raw precision", () => {
    const snapshot = parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")));
    const batch = snapshot.batches.find(entry => entry.id === "baseline-single-20261027")!;
    let checked = 0, numeric = 0;
    for (const dataset of snapshot.catalog.datasets) {
      const subset = selectSnapshot(snapshot, batch.id, [dataset.id]);
      expect(parseSnapshot(subset)).toEqual(subset);
      for (const key of metricKeys) {
        const rows = selectMetricRows(snapshot, batch, dataset.id, key);
        for (const row of rows) {
          const original = batch.results.find(result => result.dataset_id === dataset.id && result.method_id === row.method.id)!.metrics[key];
          const expected = ["complete", "partial"].includes(original.status) ? original.value ?? original.mean : null;
          expect(row.metric).toEqual(original);
          expect(row.raw).toBe(expected);
          expect(row.display).toBe(expected === null ? null : key === "max_rss_kib" ? expected / 1024 : expected);
          expect(subset.batches[0].results.find(result => result.method_id === row.method.id)!.metrics[key]).toEqual(original);
          if (expected !== null) numeric++;
          checked++;
        }
        const axis = makeMetricAxis(key, rows.map(row => row.metric));
        for (const row of rows) if (row.raw !== null) {
          expect(axis.position(row.raw)).toBeGreaterThanOrEqual(-1e-8);
          expect(axis.position(row.raw)).toBeLessThanOrEqual(100 + 1e-8);
        }
      }
    }
    expect(checked).toBe(1638);
    expect(numeric).toBe(1077);
  });
});
