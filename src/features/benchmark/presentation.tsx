import { Download } from "lucide-react";
import { useState } from "react";
import { metricValue, metricSpecs, formatMetricValue, formatMetricSummary, selectSnapshot } from "./metrics";
export { metricValue } from "./metrics";
import { Button } from "../../components/common/Button";
import { metricKeys, type BenchmarkBatch, type BenchmarkDataset, type BenchmarkMetric, type BenchmarkSnapshot, type MetricKey } from "./model";
import { batchLabel, selectViewSnapshot, type ResultScope } from "./selection";

export type Locale = "en" | "zh";
export const words = (locale: Locale, en: string, zh: string) => locale === "zh" ? zh : en;
/** Export labels retain the public report units; visual units live in metricSpecs. */
export const metricLabels = Object.fromEntries(metricKeys.map(key => [key, {
  en: metricSpecs[key].en, zh: metricSpecs[key].zh, unit: metricSpecs[key].rawUnit,
}])) as Record<MetricKey, {en:string; zh:string; unit:string}>;
export function sourceLabel(kind: BenchmarkDataset["source_kind"], locale: Locale) {
  return { sampled: words(locale, "Sampled sequences", "真实序列抽样"), simulated: words(locale, "Scientific simulation", "科学模拟"), unconfirmed: words(locale, "Origin pending confirmation", "生成方式待确认") }[kind];
}
export function stateLabel(status: string, locale: Locale) {
  return ({ complete: words(locale, "Complete", "完整"), partial: words(locale, "Partial", "部分完成"), failed: words(locale, "Failed", "失败"), timeout: words(locale, "Timed out", "超时"), unsupported: words(locale, "Unsupported", "不支持"), not_run: words(locale, "Not evaluated", "待评测"), outside_batch: words(locale, "Outside this batch", "未纳入本批次"), unavailable: words(locale, "Unavailable", "无可用成绩"), not_applicable: words(locale, "Not applicable", "不适用") } as Record<string, string>)[status] ?? words(locale, "Unavailable", "无可用成绩");
}
export function reasonLabel(reason: string | null, locale: Locale) {
  if (!reason) return "";
  const reasons: Record<string, [string, string]> = {
    no_reference: ["No reference alignment", "无参考比对"], reference_invalid: ["Reference requires review", "参考比对待检查"], invalid_output: ["Invalid alignment output", "比对输出不合法"], timeout: ["Time limit reached", "达到时间限制"], oom: ["Memory limit reached", "达到内存限制"], unsupported: ["Input unsupported by method", "方法不支持该输入"], not_run: ["Not evaluated", "待评测"], execution_failed: ["Method execution failed", "方法执行失败"], scoring_failed: ["Scoring failed", "评分失败"], cancelled: ["Cancelled", "已取消"], incomplete: ["Incomplete repetitions", "重复运行未完成"], platform_error: ["Evaluation unavailable", "评测异常"]
  };
  const pair = reasons[reason] ?? reasons.platform_error;
  return words(locale, pair[0], pair[1]);
}
function numberLabel(value: number, key: MetricKey, locale: Locale) {
  return formatMetricValue(value, key, locale);
}
export function formatMetric(metric: BenchmarkMetric | undefined, key: MetricKey, locale: Locale, noReference = false) {
  if (noReference && (key === "q" || key === "tc")) return words(locale, "N/A · no reference", "不适用 · 无参考");
  if (!metric) return stateLabel("not_run", locale);
  const value = metricValue(metric);
  if (value === null) return stateLabel(metric.status, locale);
  return formatMetricSummary(metric, key, locale);
}
export function MetricCell({ metric, metricKey, locale, noReference = false }: { metric?: BenchmarkMetric; metricKey: MetricKey; locale: Locale; noReference?: boolean }) {
  return <div className="min-w-[6rem] tabular-nums"><span>{formatMetric(metric, metricKey, locale, noReference)}</span>{metric && metricValue(metric) !== null && <span className="mt-1 block text-xs text-slate-500">{metric.valid_count}/{metric.planned_count} {words(locale, "valid", "有效")}{metric.display === "mean_sd" && metric.min !== null && metric.max !== null ? ` · ${words(locale, "range", "范围")} ${numberLabel(metric.min, metricKey, locale)}–${numberLabel(metric.max, metricKey, locale)}` : ""}</span>}{metric && metricValue(metric) === null && metric.reason_codes.length > 0 && !noReference && <span className="mt-1 block text-xs text-slate-500">{[...new Set(metric.reason_codes)].map(code => reasonLabel(code, locale)).join(" · ")}</span>}</div>;
}
export function StatusPill({ status, locale }: { status: string; locale: Locale }) {
  return <span className={"benchmark-status " + status}>{stateLabel(status, locale)}</span>;
}
export function LoadState({ failed, retry, locale }: { failed: boolean; retry: () => void; locale: Locale }) {
  return <div className="benchmark-state" role={failed ? "alert" : "status"}><h1 className="text-xl font-semibold">{words(locale, "Benchmark", "Benchmark 评测")}</h1><p className="my-3 text-sm text-slate-600">{failed ? words(locale, "Benchmark data could not be loaded or validated. Please try again.", "评测数据加载或校验失败，请重试。") : words(locale, "Loading benchmark data…", "正在加载评测数据…")}</p>{failed && <Button variant="outline" onClick={retry}>{words(locale, "Try again", "重试")}</Button>}</div>;
}
export function BatchSelector({ batches, value, onChange, locale, includeLatest = false }: { batches: BenchmarkBatch[]; value: string; onChange: (value: string) => void; locale: Locale; includeLatest?: boolean }) {
  return <label className="benchmark-batch-selector">{words(locale, "Evaluation batch", "评测批次")}<select value={value} onChange={event => onChange(event.target.value)} disabled={!batches.length}>
    {includeLatest && <option value="latest">{words(locale, "Latest records · all batches", "最新记录 · 全部批次")}</option>}
    {batches.map(batch => <option value={batch.id} key={batch.id}>{batchLabel(batch, locale)} · {batch.created_at.slice(0, 10)}</option>)}
    {!batches.length && !includeLatest && <option value="">{words(locale, "No published results", "尚未发布评测结果")}</option>}
  </select></label>;
}
export function BatchContext({ batch, locale }: { batch?: BenchmarkBatch; locale: Locale }) {
  if (!batch) return null;
  const adaptedOutput = batch.methods.some(method => method.version.includes("output-adapter 1"));
  return <div className="benchmark-batch-context"><p><strong>{words(locale, "Environment: ", "运行环境：")}</strong>{batch.environment.label} · {batch.environment.cpu} · {batch.environment.memory_gib.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {maximumFractionDigits:2})} GiB · {batch.environment.os}</p><p><strong>{words(locale, "Threads: ", "线程数：")}</strong>{batch.threads} · <strong>{words(locale, "Scoring: ", "评分规则：")}</strong>{batch.scoring.label}</p><p><strong>{words(locale, "Data version: ", "数据版本：")}</strong>{batch.dataset_version}</p>{batch.conditions && <><p><strong>{words(locale, "Limits: ", "每任务限额：")}</strong>{batch.conditions.cpu_limit} CPU · {batch.conditions.memory_limit_gib} GiB · {batch.conditions.alignment_timeout_seconds / 60} {words(locale, "min alignment / ", "分钟比对 / ")}{batch.conditions.scorer_timeout_seconds / 60} {words(locale, "min per scorer", "分钟每个评分器")}</p><p><strong>{batch.repeats === 1 ? words(locale, "Single measurement", "单次测量") : words(locale, String(batch.repeats) + " planned repeats", "计划重复 " + batch.repeats + " 次")}</strong> · {words(locale, "Serial execution", "串行执行")}{batch.conditions.shared_host && words(locale, " · Shared server; performance is an observation under this load, not a stable ranking.", " · 共享服务器；性能数值反映本次负载条件，不作为稳定排名。")}</p></>}<p>{words(locale, "These conditions apply to records from this source batch.", "这些条件适用于来自该批次的记录。")}</p>{adaptedOutput && <p>{words(locale, "Output adapter v1: reported runtime includes record preparation, validation and output restoration. Original input bases are unchanged; restoring IUPAC symbols does not change internal method scoring.", "输出适配器 v1：时间包含记录准备、校验及输出恢复。原始输入碱基未改变；恢复 IUPAC 字符不改变算法内部的评分方式。")}</p>}</div>;
}
export function selectDownload(snapshot: BenchmarkSnapshot, batchId?: string, datasetId?: string): BenchmarkSnapshot {
  return selectSnapshot(snapshot, batchId, datasetId ? [datasetId] : undefined);
}
export function snapshotCsv(snapshot: BenchmarkSnapshot) {
  const cells = (values: unknown[]) => values.map(value => { let s = value === null || value === undefined ? "" : String(value); if (typeof value === "string" && /^[=+@\-\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; }).join(",");
  const rows = [cells(["batch", "data_version", "dataset", "method", "version", "result_status", "valid_repeats", "planned_repeats", "metric", "unit", "metric_status", "valid_count", "planned_count", "value", "mean", "sd", "min", "max", "reason_codes", "threads", "batch_repeats", "cpu_limit", "memory_limit_gib", "alignment_timeout_seconds"])];
  for (const b of snapshot.batches) for (const r of b.results) for (const key of metricKeys) {
    const m = r.metrics[key];
    rows.push(cells([b.id, b.dataset_version, r.dataset_id, snapshot.methods.find(x => x.id === r.method_id)?.name ?? r.method_id, b.methods.find(x => x.method_id === r.method_id)?.version, r.status, r.valid_repeats, r.planned_repeats, key, metricLabels[key].unit, m.status, m.valid_count, m.planned_count, m.value, m.mean, m.sd, m.min, m.max, m.reason_codes.join(";"), b.threads, b.repeats, b.conditions?.cpu_limit, b.conditions?.memory_limit_gib, b.conditions?.alignment_timeout_seconds]));
  }
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DownloadButtons({ snapshot, locale, batchId, datasetId, datasetIds, resultScope, methodIds }: { snapshot: BenchmarkSnapshot; locale: Locale; batchId?: string; datasetId?: string; datasetIds?: string[]; resultScope?: ResultScope; methodIds?: string[] }) {
  const [scope, setScope] = useState("filtered");
  const ids = datasetId ? [datasetId] : scope === "filtered" ? datasetIds : undefined;
  const subset = resultScope ? selectViewSnapshot(snapshot, resultScope, {datasetIds:ids, methodIds:datasetId || scope === "filtered" ? methodIds : undefined}) : selectSnapshot(snapshot, batchId, ids);
  const latest = resultScope?.mode === "latest";
  const filename = `benchmark-${datasetId ?? (ids ? "filtered" : snapshot.catalog.id)}-${latest ? "latest" : batchId ?? "catalog"}`;
  return <details className="benchmark-download-menu" data-testid="download-controls">
    <summary><Download size={14} aria-hidden="true" />{words(locale, "Download data", "下载数据")}</summary>
    <div className="benchmark-download-panel">
      {!datasetId && <label>{words(locale, "Download scope", "下载范围")}<select value={scope} onChange={event => setScope(event.target.value)}>
        <option value="filtered">{words(locale, "Current filters", "当前筛选结果")}</option>
        <option value="batch">{latest ? words(locale, "All latest records", "全部最新记录") : words(locale, "Full batch", "完整批次")}</option>
      </select></label>}
      <p>{words(locale, `${subset.catalog.datasets.length} datasets · all 7 metrics · original precision`, `${subset.catalog.datasets.length} 个数据集 · 全部 7 项指标 · 原始精度`)}</p>
      <p>{words(locale, `${subset.batches.reduce((count, batch) => count + batch.results.length, 0)} recorded method–dataset pairs. Original batch identities and conditions are preserved; unrecorded pairs are not exported as zeros.`, `${subset.batches.reduce((count, batch) => count + batch.results.length, 0)} 个方法与数据集组合。保留原始批次与条件，未记录的组合不补零。`)}</p>
      <p>{words(locale, "Memory is exported in original KiB; the page displays MiB.", "内存导出保留原始 KiB，页面显示 MiB。")}</p>
      <div className="benchmark-downloads">
        <button type="button" onClick={() => download(JSON.stringify(subset, null, 2) + "\n", filename + ".json", "application/json")}><Download size={14} aria-hidden="true" />{words(locale, "Download JSON", "下载 JSON")}</button>
        <button type="button" onClick={() => download(snapshotCsv(subset), filename + ".csv", "text/csv;charset=utf-8")}><Download size={14} aria-hidden="true" />{words(locale, "Download CSV", "下载 CSV")}</button>
      </div>
    </div>
  </details>;
}
