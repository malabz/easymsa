import type { BenchmarkBatch, BenchmarkMetric, BenchmarkSnapshot, MetricKey } from "./model";

export type MetricLocale = "en" | "zh";
export type MetricSpec = {
  en: string;
  zh: string;
  rawUnit: string;
  unit: string;
  direction: "higher" | "lower";
  scale: "log" | "linear";
};

/** Display choices only: reported values and their public units never change. */
export const metricSpecs: Record<MetricKey, MetricSpec> = {
  wall_seconds: { en: "Time", zh: "时间", rawUnit: "s", unit: "s", direction: "lower", scale: "log" },
  max_rss_kib: { en: "Peak memory", zh: "峰值内存", rawUnit: "KiB", unit: "MiB", direction: "lower", scale: "log" },
  sp_score: { en: "SP score", zh: "SP 分数", rawUnit: "", unit: "", direction: "higher", scale: "linear" },
  avg_sp: { en: "Avg SP", zh: "平均 SP", rawUnit: "", unit: "", direction: "higher", scale: "linear" },
  scaled_sp: { en: "Scaled SP", zh: "缩放 SP", rawUnit: "", unit: "", direction: "higher", scale: "linear" },
  q: { en: "Q", zh: "Q", rawUnit: "", unit: "", direction: "higher", scale: "linear" },
  tc: { en: "TC", zh: "TC", rawUnit: "", unit: "", direction: "higher", scale: "linear" },
};

export function metricValue(metric?: BenchmarkMetric): number | null {
  if (!metric || !["complete", "partial"].includes(metric.status)) return null;
  const value = metric.value ?? metric.mean;
  return value !== null && Number.isFinite(value) ? value : null;
}

export function toDisplayValue(key: MetricKey, raw: number): number {
  return key === "max_rss_kib" ? raw / 1024 : raw;
}

function formatNumber(value: number, locale: MetricLocale, compact: boolean, scientific: boolean) {
  const language = locale === "zh" ? "zh-CN" : "en-US";
  if (!compact) return value.toLocaleString(language, { maximumSignificantDigits: 21 });
  if (scientific || (value !== 0 && Math.abs(value) < 0.0001)) {
    return value.toLocaleString(language, { notation: "scientific", maximumFractionDigits: 3 });
  }
  return value.toLocaleString(language, { maximumSignificantDigits: 5 });
}

/** Accepts the raw reported value; memory is converted exactly once. */
export function formatMetricValue(raw: number, key: MetricKey, locale: MetricLocale, compact = false): string {
  const value = toDisplayValue(key, raw);
  return formatNumber(value, locale, compact, ["sp_score", "avg_sp"].includes(key) && Math.abs(value) >= 1e6);
}

/** Axis ticks already use display units, unlike formatMetricValue's input. */
export function formatAxisTick(displayValue: number, key: MetricKey, locale: MetricLocale): string {
  return formatNumber(displayValue, locale, true, Math.abs(displayValue) >= 1e6);
}

/** Keep distinct visible ticks distinguishable even within a narrow large-score range. */
export function formatAxisTicks(displayValues: number[], key: MetricKey, locale: MetricLocale): string[] {
  let labels = displayValues.map(value => formatAxisTick(value, key, locale));
  const distinctValues = new Set(displayValues).size;
  const language = locale === "zh" ? "zh-CN" : "en-US";
  for (let precision = 5; new Set(labels).size < distinctValues && precision <= 17; precision++) {
    labels = displayValues.map(value => value.toLocaleString(language, {
      notation: Math.abs(value) >= 1e6 || (value !== 0 && Math.abs(value) < 0.0001) ? "scientific" : "standard",
      maximumSignificantDigits: precision,
    }));
  }
  return labels;
}

export function formatMetricSummary(metric: BenchmarkMetric | undefined, key: MetricKey, locale: MetricLocale, compact = false): string {
  const value = metricValue(metric);
  if (!metric) return locale === "zh" ? "待评测" : "Not evaluated";
  if (value === null) return metric.status === "not_applicable"
    ? (locale === "zh" ? "不适用" : "Not applicable")
    : (locale === "zh" ? "无可用成绩" : "Unavailable");
  const format = (raw: number) => formatMetricValue(raw, key, locale, compact);
  let text = format(value);
  if (metric.display === "mean_sd" && metric.sd !== null) text += ` ± ${format(metric.sd)}`;
  else if (metric.display === "mean_range" && metric.min !== null && metric.max !== null) text += ` [${format(metric.min)}–${format(metric.max)}]`;
  if (metric.status === "partial") text += locale === "zh" ? " · 部分完成" : " · Partial";
  return text;
}

/** Relative colour strength within one dataset, never a new scientific score. */
export function rowHeat(key: MetricKey, metrics: (BenchmarkMetric | undefined)[]): (number | null)[] {
  const values = metrics.map(metricValue);
  const valid = values.filter((value): value is number => value !== null);
  if (valid.length < 2) return values.map(() => null);
  const log = metricSpecs[key].scale === "log" && valid.every(value => value > 0);
  const transform = (value: number) => log ? Math.log10(value) : value;
  const transformed = valid.map(transform);
  const min = Math.min(...transformed), max = Math.max(...transformed);
  if (min === max) return values.map(() => null);
  return values.map(value => {
    if (value === null) return null;
    const fraction = (transform(value) - min) / (max - min);
    return metricSpecs[key].direction === "lower" ? 1 - fraction : fraction;
  });
}

export type MetricAxis = {
  /** Domain and ticks are in display units. */
  min: number;
  max: number;
  scale: "log" | "linear";
  ticks: number[];
  zeroFallback: boolean;
  /** Takes a RAW value; returns a percentage. Deliberately not clamped. */
  position: (raw: number) => number;
};

function metricExtent(metric: BenchmarkMetric | undefined): number[] {
  const value = metricValue(metric);
  if (value === null || !metric) return [];
  if (metric.display === "mean_sd" && metric.sd !== null) return [value, value - metric.sd, value + metric.sd];
  if (metric.display === "mean_range" && metric.min !== null && metric.max !== null) return [value, metric.min, metric.max];
  return [value];
}

function tidy(value: number): number { return Number(value.toPrecision(12)); }

function linearTicks(min: number, max: number): number[] {
  const rawStep = (max - min) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const ratio = rawStep / magnitude;
  const step = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * magnitude;
  const ticks = [min];
  for (let tick = Math.ceil(min / step) * step, n = 0; tick < max && n < 12; tick += step, n++) {
    if (tick > min && tick - min > step * 0.1 && max - tick > step * 0.1) ticks.push(tidy(tick));
  }
  ticks.push(max);
  return ticks;
}

export function makeMetricAxis(key: MetricKey, metrics: (BenchmarkMetric | undefined)[], options: { linear?: boolean; zoom?: boolean } = {}): MetricAxis {
  const values = metrics.flatMap(metricExtent).filter(Number.isFinite).map(value => toDisplayValue(key, value));
  const bounded = key === "q" || key === "tc";
  const resource = metricSpecs[key].scale === "log";
  const zeroFallback = resource && values.some(value => value <= 0);
  let scale: MetricAxis["scale"] = resource && !options.linear && !zeroFallback ? "log" : "linear";
  let min = 0, max = 1;
  let ticks: number[];
  if (bounded && !options.zoom) {
    ticks = [0, 0.25, 0.5, 0.75, 1];
  } else if (!values.length) {
    // An empty chart has no inferred measurement domain.
    scale = "linear";
    ticks = [0, 0.25, 0.5, 0.75, 1];
  } else if (scale === "log") {
    const lo = Math.min(...values), hi = Math.max(...values);
    let lowExponent = Math.floor(Math.log10(lo)), highExponent = Math.ceil(Math.log10(hi));
    if (lowExponent === highExponent) { lowExponent--; highExponent++; }
    min = 10 ** lowExponent;
    max = 10 ** highExponent;
    const step = Math.max(1, Math.ceil((highExponent - lowExponent) / 4));
    ticks = [min];
    for (let exponent = lowExponent + step; exponent < highExponent; exponent += step) ticks.push(10 ** exponent);
    ticks.push(max);
  } else {
    const lo = Math.min(...values), hi = Math.max(...values);
    const padding = hi > lo ? (hi - lo) * 0.05 : Math.max(Math.abs(lo) * 0.05, bounded ? 0.01 : 1);
    min = lo - padding;
    max = hi + padding;
    if (resource) { min = lo >= 0 ? 0 : Math.min(0, min); max = Math.max(1, max); }
    if (bounded) { min = Math.max(0, min); max = Math.min(1, max); }
    min = tidy(min); max = tidy(max);
    ticks = linearTicks(min, max);
  }
  const lower = scale === "log" ? Math.log10(min) : min;
  const upper = scale === "log" ? Math.log10(max) : max;
  return {
    min, max, scale, ticks, zeroFallback,
    position(raw) {
      const value = toDisplayValue(key, raw);
      return ((scale === "log" ? Math.log10(value) : value) - lower) / (upper - lower) * 100;
    },
  };
}

export function selectMetricRows(snapshot: BenchmarkSnapshot, batch: BenchmarkBatch | undefined, datasetId: string, key: MetricKey) {
  return snapshot.methods.map(method => {
    const spec = batch?.methods.find(entry => entry.method_id === method.id);
    const result = batch?.results.find(entry => entry.dataset_id === datasetId && entry.method_id === method.id);
    const metric = result?.metrics[key];
    const raw = metricValue(metric);
    return { method, spec, result, metric, raw, outsideBatch: Boolean(batch && !result), display: raw === null ? null : toDisplayValue(key, raw) };
  });
}

/** Only recorded pairs belong to a published batch; never backfill another batch. */
export function batchCoverage(batch: BenchmarkBatch) {
  return { pairs: batch.results.length, datasets: new Set(batch.results.map(result => result.dataset_id)).size,
    methods: new Set(batch.results.map(result => result.method_id)).size };
}

/** The same subset is used for JSON and CSV, preserving all seven raw metrics. */
export function selectSnapshot(snapshot: BenchmarkSnapshot, batchId?: string, datasetIds?: string[]): BenchmarkSnapshot {
  const ids = datasetIds === undefined ? undefined : new Set(datasetIds);
  const datasets = snapshot.catalog.datasets.filter(dataset => !ids || ids.has(dataset.id));
  const sourceIds = new Set(datasets.map(dataset => dataset.source_id));
  return {
    ...snapshot,
    catalog: { ...snapshot.catalog, datasets, sources: snapshot.catalog.sources.filter(source => sourceIds.has(source.id)) },
    batches: snapshot.batches.filter(batch => batch.id === batchId).map(batch => ({
      ...batch, results: batch.results.filter(result => !ids || ids.has(result.dataset_id)),
    })),
  };
}
