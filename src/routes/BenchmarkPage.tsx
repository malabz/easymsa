import { useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { compatibleBatches, emptyFilters, filterDatasets, metricKeys, type DatasetFilters, type MetricKey } from "../features/benchmark/model";
import { useBenchmark } from "../features/benchmark/useBenchmark";
import { batchCoverage, metricSpecs } from "../features/benchmark/metrics";
import { BenchmarkMatrix } from "../features/benchmark/BenchmarkMatrix";
import { BatchContext, BatchSelector, DownloadButtons, LoadState, sourceLabel, stateLabel, words } from "../features/benchmark/presentation";
import "../features/benchmark/benchmark.css";
import "../features/benchmark/matrix.css";

const mainMetrics: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc"];
export function BenchmarkPage() {
  const { locale } = useLanguage();
  const { data, failed, retry } = useBenchmark();
  const [query, setQuery] = useSearchParams();
  // Router search-param setters do not queue functional updates. Preserve edits
  // made before the preceding navigation has committed (e.g. Clear then Type).
  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);
  const commitQuery = (next: URLSearchParams) => {
    queryRef.current = next;
    setQuery(next, { replace: true });
  };
  const filters = Object.fromEntries(Object.entries(emptyFilters).map(([key, fallback]) => [key, query.get(key) ?? fallback])) as DatasetFilters;
  if (!["all", "dna", "rna"].includes(filters.type)) filters.type = "all";
  if (!["all", "sampled", "simulated", "unconfirmed"].includes(filters.source)) filters.source = "all";
  if (!["all", "yes", "no"].includes(filters.reference)) filters.reference = "all";
  const requestedMetric = query.get("metric");
  const metricKey: MetricKey = metricKeys.includes(requestedMetric as MetricKey) ? requestedMetric as MetricKey : "wall_seconds";
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(queryRef.current);
    if (value) next.set(name, value); else next.delete(name);
    commitQuery(next);
  };
  const field = (name: keyof DatasetFilters, value: string) => update(name, value === emptyFilters[name] ? "" : value);
  const clearFilters = () => {
    const next = new URLSearchParams(queryRef.current);
    Object.keys(emptyFilters).forEach(key => next.delete(key));
    commitQuery(next);
  };
  if (!data) return <PageContainer className="benchmark-page benchmark-explorer"><LoadState failed={failed} retry={retry} locale={locale} /></PageContainer>;
  const batches = compatibleBatches(data);
  const batch = batches.find(b => b.id === query.get("batch")) ?? batches[0];
  const datasets = filterDatasets(data.catalog.datasets, filters);
  const invalidRange = filters.min !== "" && filters.max !== "" && Number(filters.min) > Number(filters.max);
  const activeQuery = new URLSearchParams(query);
  activeQuery.set("metric", metricKey);
  if (batch) activeQuery.set("batch", batch.id);
  const returnTo = "/benchmark?" + activeQuery.toString();
  const results = batch?.results ?? [];
  const complete = results.filter(result => result.status === "complete").length;
  const partial = results.filter(result => result.status === "partial").length;
  const timedOut = results.filter(result => result.status === "timeout").length;
  const failedCount = results.filter(result => result.status === "failed").length;
  const remaining = results.filter(result => ["unsupported", "not_run"].includes(result.status)).length;
  const repeatCount = batch?.repeats ?? results[0]?.planned_repeats;
  const coverage = batch ? batchCoverage(batch) : undefined;

  return <PageContainer className="benchmark-page benchmark-explorer">
    <Link to="/about" className="benchmark-back"><ArrowLeft size={15} aria-hidden="true" />{words(locale, "About EasyMSA", "关于 EasyMSA")}</Link>
    <header className="benchmark-overview-header">
      <div><p className="benchmark-eyebrow">{words(locale, "Alignment · Quality · Performance", "序列比对 · 质量 · 性能")}</p><h1>Benchmark</h1><p className="benchmark-overview-deck">{data.catalog.datasets.length} {words(locale, "datasets", "个数据集")}<span aria-hidden="true"> / </span>{data.methods.length} {words(locale, "methods", "种方法")}<span aria-hidden="true"> / </span><span>{repeatCount === 1 ? words(locale, "Single measurement", "单次测量") : repeatCount ? words(locale, `${repeatCount} planned repeats`, `计划重复 ${repeatCount} 次`) : words(locale, "Awaiting evaluation", "待评测")}</span></p></div>
      <div className="benchmark-overview-actions"><BatchSelector batches={batches} value={batch?.id ?? ""} onChange={value => update("batch", value)} locale={locale} /><DownloadButtons snapshot={data} batchId={batch?.id} datasetIds={datasets.map(dataset => dataset.id)} locale={locale} /></div>
    </header>
    <div className="benchmark-run-summary" aria-label={words(locale, "Evaluation coverage", "评测覆盖")}>
      <p><span className="benchmark-run-complete">{words(locale, "Complete", "完成")} <strong>{complete}</strong> / {results.length}</span><span>{words(locale, "Timed out", "超时")} <strong>{timedOut}</strong></span><span>{words(locale, "Other failures", "其他失败")} <strong>{failedCount}</strong></span>{partial > 0 && <span>{words(locale, "Partial", "部分完成")} <strong>{partial}</strong></span>}{remaining > 0 && <span>{words(locale, "Unsupported / not evaluated", "不支持 / 待评测")} <strong>{remaining}</strong></span>}</p>
      {batch?.conditions && <p className="benchmark-run-limits">{batch.conditions.cpu_limit} CPU · {batch.conditions.memory_limit_gib} GiB · {batch.conditions.alignment_timeout_seconds / 60} {words(locale, "min limit", "分钟限时")}</p>}
    </div>
    {coverage && <p className="benchmark-caption" data-testid="batch-scope">{words(locale, `This batch includes ${coverage.pairs} method–dataset pairs across ${coverage.datasets} datasets and ${coverage.methods} methods. Unlisted pairs are outside this batch; earlier results are kept separately.`, `本批次纳入 ${coverage.pairs} 个方法与数据集组合，涉及 ${coverage.datasets} 个数据集、${coverage.methods} 种方法。未列入的组合不参与本批次，原批次成绩单独保留。`)}</p>}
    <details className="benchmark-conditions"><summary>{words(locale, "Evaluation conditions and data version", "评测条件与数据版本")}<span className="benchmark-mono">{data.catalog.version}</span></summary>{batch ? <BatchContext batch={batch} locale={locale} /> : <p className="benchmark-caption">{words(locale, "No evaluation results have been published yet. The catalog contains real dataset metadata; missing scores are never filled with examples.", "尚未发布评测结果。目录为真实数据集信息，不用示例分数填充缺失成绩。")}</p>}<p className="benchmark-caption">{words(locale, data.catalog.status === "draft" ? "Draft dataset · size classes and flagged inputs are under review." : "Frozen dataset · results use this data version only.", data.catalog.status === "draft" ? "数据草稿 · 规模分类和问题输入尚待处理。" : "已冻结数据 · 成绩仅来自此数据版本。")}</p></details>
    {!batch && <p role="status" className="benchmark-pending">{words(locale, "No evaluation results have been published yet. CSV contains column headings only.", "尚未发布评测结果，CSV 当前仅包含列标题。")}</p>}

    <section aria-labelledby="benchmark-matrix-heading" className="benchmark-explorer-main">
      <h2 id="benchmark-matrix-heading" className="sr-only">{words(locale, "Compare all datasets", "比较所有数据集")}</h2>
      <div className="benchmark-metric-navigation" role="group" aria-label={words(locale, "Comparison metric", "比较指标")}>
        <div className="benchmark-main-metrics">{mainMetrics.map(key => <button type="button" key={key} data-testid={`metric-${key}`} aria-pressed={metricKey === key} className={metricKey === key ? "is-active" : ""} onClick={() => update("metric", key)}>{metricSpecs[key][locale]} <span aria-hidden="true">{metricSpecs[key].direction === "lower" ? "↓" : "↑"}</span></button>)}</div>
        <label className="benchmark-more-metrics">{words(locale, "More metrics", "更多指标")}<select aria-label={words(locale, "More metrics", "更多指标")} value={metricKey === "avg_sp" || metricKey === "scaled_sp" ? metricKey : ""} onChange={event => { if (event.target.value) update("metric", event.target.value); }}><option value="" disabled>{words(locale, "Avg / Scaled SP", "Avg / Scaled SP")}</option><option value="avg_sp">Avg SP ↑</option><option value="scaled_sp">Scaled SP ↑</option></select></label>
      </div>
      <div className="benchmark-filters">
        <label className="benchmark-field benchmark-search">{words(locale, "Search datasets", "搜索数据集")}<span className="benchmark-search-control"><Search size={16} aria-hidden="true" /><input type="search" value={filters.search} onChange={event => field("search", event.target.value)} placeholder={words(locale, "Name, e.g. dna_16s", "名称，例如 dna_16s")} /></span></label>
        <label className="benchmark-field">{words(locale, "Sequence type", "序列类型")}<select value={filters.type} onChange={event => field("type", event.target.value)}><option value="all">{words(locale, "All types", "全部类型")}</option><option value="dna">DNA</option><option value="rna">RNA</option></select></label>
        <label className="benchmark-field">{words(locale, "Data origin", "数据来源类型")}<select value={filters.source} onChange={event => field("source", event.target.value)}><option value="all">{words(locale, "All origins", "全部来源")}</option>{(["sampled", "simulated", "unconfirmed"] as const).map(kind => <option value={kind} key={kind}>{sourceLabel(kind, locale)}</option>)}</select></label>
        <label className="benchmark-field">{words(locale, "Reference alignment", "参考比对")}<select value={filters.reference} onChange={event => field("reference", event.target.value)}><option value="all">{words(locale, "With or without reference", "有参考或无参考")}</option><option value="yes">{words(locale, "With reference", "有参考")}</option><option value="no">{words(locale, "Without reference", "无参考")}</option></select></label>
      </div>
      <div className="benchmark-filter-bottom"><details className="benchmark-advanced-filters" open={filters.min !== "" || filters.max !== "" || undefined}><summary><SlidersHorizontal size={14} aria-hidden="true" />{words(locale, "More filters", "更多筛选")}</summary><div className="benchmark-filter-range"><label className="benchmark-field">{words(locale, "Minimum sequences", "最少序列数")}<input type="number" min="0" step="1" value={filters.min} onChange={event => field("min", event.target.value)} placeholder="0" /></label><span aria-hidden="true" className="benchmark-range-dash">–</span><label className="benchmark-field">{words(locale, "Maximum sequences", "最多序列数")}<input type="number" min="0" step="1" value={filters.max} onChange={event => field("max", event.target.value)} /></label></div></details><button type="button" className="benchmark-clear" onClick={clearFilters}>{words(locale, "Clear filters", "清除筛选")}</button><p aria-live="polite" className="benchmark-caption">{words(locale, `${datasets.length} of ${data.catalog.datasets.length} datasets`, `${data.catalog.datasets.length} 个数据集中显示 ${datasets.length} 个`)}</p></div>
      {invalidRange && <p className="benchmark-warning" role="status">{words(locale, "Minimum sequence count exceeds the maximum.", "最少序列数不能大于最多序列数。")}</p>}
      <BenchmarkMatrix snapshot={data} batch={batch} datasets={datasets} metricKey={metricKey} locale={locale} returnTo={returnTo} />
    </section>

    <details className="benchmark-supporting"><summary>{words(locale, "Methods, versions and parameters", "方法、版本与参数")}<span>{data.methods.length} {words(locale, "methods", "种方法")}</span></summary><p className="benchmark-caption">{words(locale, "Versions and parameters belong to the selected evaluation batch. The interactive alignment service has a separate deployment configuration.", "版本和参数以所选评测批次为准；网站交互式比对服务的部署配置分别记录。")}</p><div className="benchmark-table-scroll" tabIndex={0} role="region" aria-label={words(locale, "Scrollable method catalog", "可横向滚动的方法目录")}><table className="benchmark-table"><caption className="sr-only">{words(locale, "Benchmark methods and versions", "Benchmark 方法与版本")}</caption><thead><tr><th scope="col">{words(locale, "Method", "方法")}</th><th scope="col">{words(locale, "Version", "版本")}</th><th scope="col">{words(locale, "Parameters", "参数")}</th></tr></thead><tbody>{data.methods.map(method => {const specification = batch?.methods.find(m => m.method_id === method.id); return <tr key={method.id}><th scope="row">{method.name}</th><td>{specification?.version ?? (batch ? stateLabel("outside_batch", locale) : words(locale, "Pending confirmation", "待确认"))}</td><td className="benchmark-parameters">{specification ? specification.parameters.join(" ") || words(locale, "No additional parameters", "无附加参数") : batch ? stateLabel("outside_batch", locale) : words(locale, "Pending confirmation", "待确认")}</td></tr>;})}</tbody></table></div></details>
    <details className="benchmark-supporting"><summary>{words(locale, "How to read these results", "如何阅读成绩")}</summary><ul className="benchmark-reading-notes"><li>{words(locale, "Compare methods within one dataset and batch. Color is row-relative; no combined score or cross-dataset ranking is calculated.", "在同一数据集和批次内比较方法。色阶仅用于行内比较，不计算综合分数或跨数据集排名。")}</li><li>{words(locale, "Time is measured in seconds; memory is GNU time maximum RSS, displayed in MiB (1 MiB = 1,024 KiB). Downloads retain the original KiB values.", "时间单位为秒；内存为 GNU time 最大 RSS，显示为 MiB（1 MiB = 1024 KiB）。下载保留原始 KiB 数值。")}</li><li>{words(locale, "SP is a pairwise score, not accuracy. Q and TC require a valid reference. Failures and missing observations are states, never zero scores.", "SP 是配对评分，不是准确率；Q 和 TC 需要有效参考比对。失败和缺失观察值分别显示状态，不计作零分。")}</li><li>{words(locale, "Single measurements have no standard deviation. Multiple runs retain the report’s valid/planned coverage and aggregate statistics.", "单次测量没有标准差；多次运行保留报告中的有效 / 计划次数和统计值。")}</li><li>{words(locale, "Simulation similarity values are source labels, not newly measured identities. Sampling, preprocessing and provenance are recorded in each dataset’s details.", "模拟数据相似度为来源标签，并非重新测量的一致性；抽样、预处理和来源记录于数据集详情。")}</li></ul></details>
  </PageContainer>;
}
