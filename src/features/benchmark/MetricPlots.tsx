import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { BenchmarkBatch, BenchmarkDataset, BenchmarkMetric, BenchmarkResult, BenchmarkSnapshot, MetricKey } from "./model";
import { formatAxisTicks, formatMetricSummary, formatMetricValue, makeMetricAxis, metricSpecs, selectMetricRows } from "./metrics";
import { reasonLabel, stateLabel, words, type Locale } from "./presentation";
import "./plots.css";

type Props = { snapshot: BenchmarkSnapshot; batch?: BenchmarkBatch; dataset: BenchmarkDataset; locale: Locale; selectedMetric: MetricKey; selectedMethod?: string };
type Point = { method: string; metric: MetricKey };
const spKeys: MetricKey[] = ["sp_score", "avg_sp", "scaled_sp"];
const primaryKeys: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc"];
const clamp = (n: number) => Math.min(100, Math.max(0, n));

function unavailable(metric: BenchmarkMetric | undefined, locale: Locale, result?: BenchmarkResult, outsideBatch = false) {
  if (outsideBatch) return stateLabel("outside_batch", locale);
  if (metric?.status === "not_applicable") return metric.reason_codes.map(reason => reasonLabel(reason, locale)).join(" · ") || stateLabel("not_applicable", locale);
  if (result?.status === "timeout") return stateLabel("timeout", locale);
  if (result?.reason_code && ["failed", "unsupported", "not_run"].includes(result.status)) return reasonLabel(result.reason_code, locale);
  return metric?.reason_codes.length ? metric.reason_codes.map(reason => reasonLabel(reason, locale)).join(" · ") : stateLabel(metric?.status ?? "not_run", locale);
}

export function MetricPlots({ snapshot, batch, dataset, locale, selectedMetric, selectedMethod }: Props) {
  const [spKey, setSpKey] = useState<MetricKey>(spKeys.includes(selectedMetric) ? selectedMetric : "sp_score");
  const [mobileMetric, setMobileMetric] = useState<MetricKey>(spKeys.includes(selectedMetric) ? "sp_score" : selectedMetric);
  const [linear, setLinear] = useState({ wall_seconds: false, max_rss_kib: false });
  const [zoom, setZoom] = useState(false);
  const [activeMethod, setActiveMethod] = useState(selectedMethod ?? "");
  const [tip, setTip] = useState<Point | null>(null);
  useEffect(() => {
    setSpKey(spKeys.includes(selectedMetric) ? selectedMetric : "sp_score");
    setMobileMetric(spKeys.includes(selectedMetric) ? "sp_score" : selectedMetric);
    setActiveMethod(selectedMethod ?? "");
    setTip(null);
  }, [selectedMetric, selectedMethod, dataset.id, batch?.id]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setTip(null); };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);
  const keys: MetricKey[] = ["wall_seconds", "max_rss_kib", spKey, "q", "tc"];
  const tipRow = tip ? selectMetricRows(snapshot, batch, dataset.id, tip.metric).find(row => row.method.id === tip.method) : undefined;
  const showPoint = (method: string, metric: MetricKey) => { setActiveMethod(method); setTip({ method, metric }); };

  return <div className="benchmark-dot-comparison">
    <div className="benchmark-plot-options">
      <label>{words(locale, "SP measure", "SP 类型")}<select value={spKey} onChange={event => { setSpKey(event.target.value as MetricKey); setTip(null); }}>{spKeys.map(key => <option value={key} key={key}>{metricSpecs[key][locale]}</option>)}</select></label>
      <label className="benchmark-zoom-option"><input type="checkbox" checked={zoom} onChange={event => setZoom(event.target.checked)} />{words(locale, "Zoom Q / TC differences", "放大 Q / TC 差异")}</label>
      <span className="benchmark-plot-note">{words(locale, "Point = reported value; whiskers = reported SD or range, when available.", "点表示报告数值；有统计量时，须线表示报告中的标准差或范围。")}</span>
    </div>
    <div className="benchmark-mobile-metrics" role="group" aria-label={words(locale, "Chart metric", "图表指标")}>{primaryKeys.map(key => <button type="button" key={key} aria-pressed={mobileMetric === key} onClick={() => { setMobileMetric(key); setTip(null); }}>{metricSpecs[key === "sp_score" ? spKey : key][locale]} {metricSpecs[key].direction === "higher" ? "↑" : "↓"}</button>)}</div>
    <div className="benchmark-dot-grid" data-testid="metric-plots" onMouseLeave={() => setActiveMethod(selectedMethod ?? "")}>
      <div className="benchmark-shared-methods" aria-hidden="true">
        <div className="benchmark-plot-heading">{words(locale, "Method", "方法")}<span>{words(locale, "Same row across all metrics", "沿同一行比较各指标")}</span></div>
        <div className="benchmark-axis-spacer" />
        {snapshot.methods.map(method => <div key={method.id} className={"benchmark-shared-method " + (activeMethod === method.id ? "is-active" : "")} onMouseEnter={() => setActiveMethod(method.id)}>{method.name}<span>{batch?.methods.find(spec => spec.method_id === method.id)?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Version pending", "版本待确认"))}</span></div>)}
      </div>
      {keys.map(key => {
        const spec = metricSpecs[key];
        const rows = selectMetricRows(snapshot, batch, dataset.id, key);
        const resource = key === "wall_seconds" || key === "max_rss_kib";
        const quality = key === "q" || key === "tc";
        const axis = makeMetricAxis(key, rows.map(row => row.metric), { linear: resource ? linear[key] : false, zoom: quality && zoom });
        const visibleTicks = axis.ticks.length <= 3 ? axis.ticks : [axis.ticks[0], axis.ticks.slice(1, -1).reduce((best, tick) => {
          const position = (value: number) => axis.position(key === "max_rss_kib" ? value * 1024 : value);
          return Math.abs(position(tick) - 50) < Math.abs(position(best) - 50) ? tick : best;
        }), axis.ticks[axis.ticks.length - 1]];
        const tickLabels = formatAxisTicks(visibleTicks, key, locale);
        const title = `${spec[locale]}${spec.unit ? ` (${spec.unit})` : ""}`;
        const hasValues = rows.some(row => row.raw !== null);
        const mobileShown = mobileMetric === (spKeys.includes(key) ? "sp_score" : key);
        return <figure key={key} data-metric={key} data-scale={axis.scale} data-axis-scale={axis.scale} data-axis-min={axis.min} data-axis-max={axis.max} data-domain-min={axis.min} data-domain-max={axis.max} className={"benchmark-dot-figure " + (mobileShown ? "is-mobile-active " : "") + (selectedMetric === key ? "is-selected-metric" : "")} aria-label={title}>
          <figcaption className="benchmark-plot-heading"><strong>{title} <span aria-hidden="true">{spec.direction === "higher" ? "↑" : "↓"}</span></strong><span>{words(locale, spec.direction === "higher" ? "Higher is better" : "Lower is better", spec.direction === "higher" ? "越高越好" : "越低越好")}</span>
            {resource ? <label className="benchmark-axis-choice"><span className="sr-only">{title} {words(locale, "scale", "坐标")}</span><select aria-label={`${title} ${words(locale, "scale", "坐标")}`} value={linear[key] ? "linear" : "log"} onChange={event => setLinear(current => ({ ...current, [key]: event.target.value === "linear" }))}><option value="log">{words(locale, "Log axis", "对数轴")}</option><option value="linear">{words(locale, "Linear axis", "线性轴")}</option></select></label> : <span className={quality && zoom ? "benchmark-local-range" : ""}>{quality ? words(locale, zoom ? "Zoomed range" : "Fixed 0–1", zoom ? "局部范围" : "固定 0–1") : words(locale, "Dataset range · linear", "本数据集范围 · 线性")}</span>}
          </figcaption>
          <div className="benchmark-dot-axis" aria-label={words(locale, "Axis values", "坐标数值")}>
            {hasValues && visibleTicks.map((tick, index) => <span key={index} style={{ left: `${clamp(axis.position(key === "max_rss_kib" ? tick * 1024 : tick))}%` }} className={index === 0 ? "first" : index === visibleTicks.length - 1 ? "last" : ""}>{tickLabels[index]}</span>)}
          </div>
          <div className="benchmark-dot-rows">{rows.map(row => {
            const value = row.raw;
            const valueLabel = value === null ? unavailable(row.metric, locale, row.result, row.outsideBatch) : formatMetricSummary(row.metric, key, locale);
            const coverage = row.metric ? `${row.metric.valid_count}/${row.metric.planned_count} ${words(locale, "valid", "有效")}` : "";
            let low: number | null = null; let high: number | null = null;
            if (value !== null && row.metric && row.metric.valid_count > 1) {
              if (row.metric.display === "mean_sd" && row.metric.sd !== null) { low = value - row.metric.sd; high = value + row.metric.sd; }
              if (row.metric.display === "mean_range") { low = row.metric.min; high = row.metric.max; }
            }
            const start = low === null ? 0 : clamp(axis.position(low));
            const end = high === null ? 0 : clamp(axis.position(high));
            const selected = activeMethod === row.method.id;
            const tipOpen = tip?.method === row.method.id && tip.metric === key;
            return <button type="button" key={row.method.id} className={"benchmark-dot-row " + (selected ? "is-active " : "") + (row.metric?.status === "partial" ? "is-partial" : "")} data-testid="metric-point" data-method={row.method.id} data-metric={key} data-raw-value={value ?? ""} data-display-value={row.display ?? ""} data-status={row.outsideBatch ? "outside_batch" : row.metric?.status ?? "not_run"} data-valid-count={row.metric?.valid_count ?? 0} data-planned-count={row.metric?.planned_count ?? ""}
              aria-label={`${row.method.name}, ${title}: ${valueLabel}, ${coverage}`} aria-describedby={tipOpen ? "benchmark-point-description" : undefined} onMouseEnter={() => showPoint(row.method.id, key)} onFocus={() => showPoint(row.method.id, key)} onClick={() => showPoint(row.method.id, key)}>
              <span className="benchmark-local-method">{row.method.name}</span>
              <span className="benchmark-dot-track" aria-hidden="true">
                {hasValues && axis.ticks.map((tick, index) => <i className="benchmark-grid-tick" key={index} style={{ left: `${clamp(axis.position(key === "max_rss_kib" ? tick * 1024 : tick))}%` }} />)}
                {value === null ? <span className="benchmark-dot-missing">— {valueLabel}</span> : <>{low !== null && high !== null && <span className="benchmark-error-range" data-testid="plot-range" data-low={low} data-high={high} style={{ left: `${start}%`, width: `${Math.max(0, end - start)}%` }} />}<span className="benchmark-dot" data-testid="plot-dot" style={{ left: `${clamp(axis.position(value))}%` }} />{row.metric?.status === "partial" && <span className="benchmark-partial-mark">{words(locale, "partial", "部分")}</span>}</>}
              </span>
            </button>;
          })}</div>
          {axis.zeroFallback && <p className="benchmark-axis-explanation">{words(locale, "Non-positive value or interval: linear axis used.", "数值或区间含非正值：已采用线性轴。")}</p>}
          {!hasValues && <p className="benchmark-axis-explanation">{!dataset.reference && quality ? words(locale, "No reference alignment: this metric is not applicable.", "没有参考比对，此指标不适用。") : words(locale, "No published values for this metric.", "尚无该指标的公开成绩。")}</p>}
        </figure>;
      })}
    </div>
    <p className="benchmark-plots-caption">{words(locale, "SP is a pairwise alignment score, not accuracy. Compare it within this dataset. Memory is maximum RSS. Hover, focus or tap a row to inspect the exact measurement.", "SP 为配对评分，不是准确率，应在同一数据集内比较。内存为最大 RSS。悬停、聚焦或点击点图可查看精确数值。")}</p>
    {tip && tipRow && <div className="benchmark-point-popup"><div id="benchmark-point-description" role="tooltip"><strong>{tipRow.method.name} · {metricSpecs[tip.metric][locale]}</strong><p className="benchmark-point-value">{tipRow.raw === null ? unavailable(tipRow.metric, locale, tipRow.result, tipRow.outsideBatch) : `${formatMetricSummary(tipRow.metric, tip.metric, locale)} ${metricSpecs[tip.metric].unit}`}</p>{tip.metric === "max_rss_kib" && tipRow.raw !== null && <p>{words(locale, "Original: ", "原始值：")}{tipRow.raw.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 20 })} KiB</p>}
      <p>{tipRow.spec?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Version pending", "版本待确认"))} · {stateLabel(tipRow.outsideBatch ? "outside_batch" : tipRow.result?.status ?? "not_run", locale)}</p><p>{tipRow.metric ? `${tipRow.metric.valid_count}/${tipRow.metric.planned_count} ${words(locale, "valid", "有效")}` : stateLabel(tipRow.outsideBatch ? "outside_batch" : "not_run", locale)}</p>{tipRow.metric?.reason_codes.length ? <p>{tipRow.metric.reason_codes.map(reason => reasonLabel(reason, locale)).join(" · ")}</p> : null}
      {tipRow.metric?.display === "mean_sd" && tipRow.metric.min !== null && tipRow.metric.max !== null && <p>{words(locale, "Observed range: ", "观测范围：")}{formatMetricValue(tipRow.metric.min, tip.metric, locale)}–{formatMetricValue(tipRow.metric.max, tip.metric, locale)}</p>}
    </div><button type="button" className="benchmark-popup-close" aria-label={words(locale, "Close result details", "关闭结果详情")} onClick={() => setTip(null)}><X size={16} aria-hidden="true" /></button></div>}
  </div>;
}
