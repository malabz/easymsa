import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CircleAlert, Clock3, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import type { BenchmarkBatch, BenchmarkDataset, BenchmarkSnapshot, MetricKey } from "./model";
import { formatMetricSummary, formatMetricValue, metricSpecs, rowHeat, selectMetricRows } from "./metrics";
import { reasonLabel, stateLabel, words, type Locale } from "./presentation";
import "./matrix.css";

export function datasetGroup(dataset: BenchmarkDataset) {
  if (dataset.sequence_type === "rna") return 3;
  if (dataset.source_kind === "simulated") return 2;
  if (dataset.id.startsWith("dna_16s")) return 0;
  return 1;
}
export function orderedDatasets(datasets: BenchmarkDataset[]) {
  return [...datasets].sort((a, b) => datasetGroup(a) - datasetGroup(b) || (a.similarity_label ?? a.sequence_count) - (b.similarity_label ?? b.sequence_count) || a.id.localeCompare(b.id));
}
const groupNames = [
  ["DNA · 16S", "DNA · 16S"], ["DNA · Mitochondrial samples", "DNA · 线粒体抽样"],
  ["DNA · Mitochondrial simulation", "DNA · 线粒体模拟"], ["RNA", "RNA"]
];
function shortReason(reason: string | undefined, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    timeout: ["Timed out", "超时"], oom: ["Memory limit", "内存超限"], invalid_output: ["Invalid output", "输出不合法"],
    scoring_failed: ["Scoring failed", "评分失败"], no_reference: ["No reference", "无参考"], unsupported: ["Unsupported", "不支持"],
    not_run: ["Not evaluated", "待评测"], execution_failed: ["Failed", "运行失败"]
  };
  return reason && labels[reason] ? words(locale, ...labels[reason]) : reason ? reasonLabel(reason, locale) : words(locale, "Unavailable", "无可用值");
}
type Tooltip = { id: string; x: number; y: number; heading: string; value: string; raw: string | null; state: string; coverage: string; version: string };

export function BenchmarkMatrix({ snapshot, batch, datasets, metricKey, locale, returnTo }: {
  snapshot: BenchmarkSnapshot; batch?: BenchmarkBatch; datasets: BenchmarkDataset[]; metricKey: MetricKey; locale: Locale; returnTo: string;
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const region = useRef<HTMLDivElement>(null);
  const tooltipAnchor = useRef<HTMLAnchorElement | null>(null);
  const scrollFrame = useRef<number>();
  const spec = metricSpecs[metricKey];
  const ordered = orderedDatasets(datasets);
  const keepTooltip = () => { if (closeTimer.current) clearTimeout(closeTimer.current); };
  const dismissTooltip = () => { keepTooltip(); closeTimer.current = setTimeout(() => setTooltip(null), 120); };
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") { keepTooltip(); setTooltip(null); } };
    const scroll = () => {
      if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current);
      scrollFrame.current = requestAnimationFrame(() => {
        const rect = tooltipAnchor.current?.getBoundingClientRect();
        if (!rect || rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) { setTooltip(null); return; }
        const width = Math.min(340, window.innerWidth - 24);
        setTooltip(current => current ? {...current,
          x: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)),
          y: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 230))
        } : null);
      });
    };
    document.addEventListener("keydown", dismiss);
    window.addEventListener("scroll", scroll, true);
    return () => { keepTooltip(); if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current); document.removeEventListener("keydown", dismiss); window.removeEventListener("scroll", scroll, true); };
  }, []);
  useEffect(() => { setTooltip(null); }, [metricKey, batch?.id, returnTo]);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("easymsa-benchmark-scroll:" + returnTo);
      if (!stored) return;
      const saved = JSON.parse(stored) as {top: number; left: number; y: number};
      const frame = requestAnimationFrame(() => {
        region.current?.scrollTo({left: saved.left || 0, top: saved.top || 0});
        window.scrollTo({top: saved.y || 0});
        sessionStorage.removeItem("easymsa-benchmark-scroll:" + returnTo);
      });
      return () => cancelAnimationFrame(frame);
    } catch { /* Browsing still works when session storage is unavailable. */ }
  }, [returnTo]);
  const savePosition = () => {
    try { sessionStorage.setItem("easymsa-benchmark-scroll:" + returnTo, JSON.stringify({top: region.current?.scrollTop ?? 0, left: region.current?.scrollLeft ?? 0, y: window.scrollY})); } catch { /* Optional navigation memory. */ }
  };
  const detailHref = (dataset: string, method?: string) => {
    const query = new URLSearchParams({metric: metricKey, returnTo});
    if (batch) query.set("batch", batch.id);
    if (method) query.set("method", method);
    return "/benchmark/datasets/" + dataset + "?" + query.toString();
  };
  return <>
    <div className="benchmark-matrix-key" id="benchmark-matrix-guide">
      <span className="benchmark-heat-swatch" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <span>{words(locale, "Darker means better within this dataset. Colors are not comparable across rows.", "颜色越深，表示本数据集内相对表现更优；颜色不可跨行比较。")}</span>
    </div>
    <div className="benchmark-matrix-scroll" ref={region} role="region" tabIndex={0} aria-label={words(locale, "Scrollable results matrix", "可滚动的成绩矩阵")} aria-describedby="benchmark-matrix-guide">
      <table className="benchmark-matrix" data-testid="benchmark-matrix" data-metric={metricKey}>
        <caption className="sr-only">{words(locale, "Dataset by method results: ", "数据集与方法成绩：")}{spec[locale]}{spec.unit ? ` (${spec.unit})` : ""}</caption>
        <thead><tr><th scope="col" className="benchmark-matrix-dataset">{words(locale, "Dataset", "数据集")}<span>{spec[locale]}{spec.unit ? ` (${spec.unit})` : ""} {spec.direction === "lower" ? "↓" : "↑"}</span></th>{snapshot.methods.map(method => <th scope="col" key={method.id}><span>{method.name}</span></th>)}</tr></thead>
        <tbody>{ordered.map((dataset, index) => {
          const group = datasetGroup(dataset);
          const startGroup = index === 0 || datasetGroup(ordered[index - 1]) !== group;
          const rows = selectMetricRows(snapshot, batch, dataset.id, metricKey);
          const heat = rowHeat(metricKey, rows.map(row => row.metric));
          return <Fragment key={dataset.id}>
            {startGroup && <tr className="benchmark-matrix-group"><th colSpan={snapshot.methods.length + 1} scope="rowgroup"><span>{words(locale, ...groupNames[group] as [string, string])}</span></th></tr>}
            <tr data-dataset-id={dataset.id}>
              <th scope="row" className="benchmark-matrix-dataset"><Link onClick={savePosition} to={detailHref(dataset.id)}><span className="benchmark-matrix-row-name">{dataset.similarity_label !== null ? words(locale, `Source label ${dataset.similarity_label}`, `来源标签 ${dataset.similarity_label}`) : words(locale, `${dataset.sequence_count.toLocaleString()} sequences`, `${dataset.sequence_count.toLocaleString()} 条序列`)}<ArrowUpRight size={12} aria-hidden="true" /></span><span className="benchmark-matrix-row-id">{dataset.id}</span>{dataset.validation_status === "requires_review" && <span className="benchmark-warning">{words(locale, "Input needs review", "输入待处理")}</span>}</Link></th>
              {rows.map((row, mi) => {
                const reason = row.metric?.reason_codes.includes("no_reference") ? "no_reference"
                  : row.result?.status === "timeout" ? "timeout"
                  : row.result?.status === "failed" ? row.result.reason_code ?? row.metric?.reason_codes[0] ?? "execution_failed"
                  : row.metric?.reason_codes[0] ?? row.result?.reason_code ?? (!row.result ? "not_run" : undefined);
                const available = row.raw !== null;
                const value = available ? formatMetricValue(row.raw!, metricKey, locale, true) : row.outsideBatch ? stateLabel("outside_batch", locale) : shortReason(reason, locale);
                const id = `${dataset.id}-${row.method.id}-${metricKey}`;
                const strength = heat[mi];
                const tone = strength === null ? "neutral" : String(Math.min(4, Math.floor(strength * 4)));
                const state = row.outsideBatch ? stateLabel("outside_batch", locale) : stateLabel(row.result?.status ?? "not_run", locale) + (reason ? " · " + reasonLabel(reason, locale) : "");
                const show = (element: HTMLAnchorElement) => {
                  keepTooltip();
                  tooltipAnchor.current = element;
                  const rect = element.getBoundingClientRect();
                  const width = Math.min(340, window.innerWidth - 24);
                  setTooltip({id, x: Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12)), y: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 230)), heading: dataset.id + " · " + row.method.name,
                    value: available ? `${spec[locale]}: ${formatMetricSummary(row.metric, metricKey, locale)}${spec.unit ? " " + spec.unit : ""}` : row.outsideBatch ? stateLabel("outside_batch", locale) : shortReason(reason, locale),
                    raw: available && metricKey === "max_rss_kib" ? words(locale, "Original: ", "原始值：") + row.raw + " KiB" : null,
                    state, coverage: row.outsideBatch ? words(locale, "No run planned in this batch", "本批次未计划此项运行") : `${row.metric?.valid_count ?? 0}/${row.metric?.planned_count ?? row.result?.planned_repeats ?? batch?.repeats ?? "—"} ${words(locale, "valid", "有效")}`,
                    version: row.spec?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Version pending", "版本待确认"))});
                };
                return <td key={row.method.id} className={`benchmark-heat-${tone}`}><Link to={detailHref(dataset.id, row.method.id)} onClick={savePosition} className={available ? "benchmark-matrix-cell" : "benchmark-matrix-cell is-unavailable"}
                  data-testid="matrix-cell" data-dataset-id={dataset.id} data-method-id={row.method.id} data-metric={metricKey} data-raw-value={row.raw ?? ""} data-display-value={row.display ?? ""} data-state={row.outsideBatch ? "outside_batch" : row.metric?.status ?? "not_run"} data-heat={strength ?? ""}
                  aria-label={`${dataset.id} · ${row.method.name} · ${spec[locale]}: ${value}${available && spec.unit ? " " + spec.unit : ""}`}
                  aria-describedby={tooltip?.id === id ? "benchmark-cell-tooltip" : undefined}
                  onMouseEnter={event => show(event.currentTarget)} onMouseLeave={dismissTooltip} onFocus={event => show(event.currentTarget)} onBlur={() => setTooltip(null)}>
                  {!available && (reason === "timeout" ? <Clock3 size={12} aria-hidden="true" /> : reason === "no_reference" || reason === "not_run" ? <Minus size={12} aria-hidden="true" /> : <CircleAlert size={12} aria-hidden="true" />)}
                  <span>{value}</span>{row.metric?.status === "partial" && <span className="benchmark-cell-partial">{words(locale, "Partial", "部分")}</span>}
                </Link></td>;
              })}
            </tr>
          </Fragment>;
        })}</tbody>
      </table>
      {!ordered.length && <p className="benchmark-empty">{words(locale, "No datasets match these filters.", "没有符合筛选条件的数据集。")}</p>}
    </div>
    {metricKey.includes("sp") && <p className="benchmark-matrix-footnote">{words(locale, "SP is a pairwise alignment score, not accuracy. Compare SP metrics within a dataset, not across sequence counts or lengths.", "SP 是配对评分，不是准确率。请在同一数据集内比较，不跨序列数量或长度解释分数高低。")}</p>}
    {tooltip && createPortal(<div id="benchmark-cell-tooltip" role="tooltip" className="benchmark-matrix-tooltip" style={{left:tooltip.x, top:tooltip.y} as CSSProperties} onMouseEnter={keepTooltip} onMouseLeave={dismissTooltip}>
      <strong>{tooltip.heading}</strong><p className="benchmark-tooltip-value">{tooltip.value}</p>{tooltip.raw && <p>{tooltip.raw}</p>}<p>{tooltip.state} · {tooltip.coverage}</p><p>{words(locale, "Version: ", "版本：")}{tooltip.version}</p><small>{words(locale, "Select to compare this dataset · Esc to dismiss", "选择以查看本数据集 · Esc 关闭提示")}</small>
    </div>, document.body)}
  </>;
}
