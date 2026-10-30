import { ExperimentDetails } from "../features/benchmark/ExperimentDetails";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { compatibleBatches, emptyFilters, metricKeys, type DatasetFilters, type MetricKey } from "../features/benchmark/model";
import { useBenchmark } from "../features/benchmark/useBenchmark";
import { metricSpecs } from "../features/benchmark/metrics";
import { BenchmarkSidebar } from "../features/benchmark/BenchmarkSidebar";
import { BenchmarkMatrix } from "../features/benchmark/BenchmarkMatrix";
import { BatchSelector, DownloadButtons, LoadState, sourceLabel, words } from "../features/benchmark/presentation";
import { scopeFromParams } from "../features/benchmark/selection";
import { displaySelection, changeScope, MethodFilter, SourceLegend, uniqueSources } from "../features/benchmark/view";
import "../features/benchmark/benchmark.css";
import "../features/benchmark/matrix.css";
import "../features/benchmark/reading.css";
import "../features/benchmark/studio.css";

const mainMetrics: MetricKey[] = ["wall_seconds", "max_rss_kib", "sp_score", "q", "tc"];
export function BenchmarkPage() {
  const { locale } = useLanguage();
  const { data, failed, retry } = useBenchmark();
  const [query, setQuery] = useSearchParams();
  const queryRef = useRef(query);
  const [openFilter, setOpenFilter] = useState<"methods" | "filters" | null>(null);
  useEffect(() => { setOpenFilter(null); }, [query.get("batch"), query.get("scope")]);
  useEffect(() => {
    if (!openFilter) return;
    const closeOutside = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest(".benchmark-method-filter, .benchmark-extra-filters")) setOpenFilter(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [openFilter]);
  useEffect(() => { queryRef.current = query; }, [query]);
  const commit = (next: URLSearchParams) => { queryRef.current = next; setQuery(next, {replace:true}); };
  const update = (name: string, value: string) => {
    const next = new URLSearchParams(queryRef.current);
    if (value) next.set(name, value); else next.delete(name);
    commit(next);
  };
  const field = (name: keyof DatasetFilters, value: string) => update(name, value === emptyFilters[name] ? "" : value);
  const clear = () => {
    setOpenFilter(null);
    const next = new URLSearchParams(queryRef.current);
    [...Object.keys(emptyFilters), "methods"].forEach(key => next.delete(key)); commit(next);
  };
  if (!data) return <PageContainer className="benchmark-page benchmark-explorer"><LoadState failed={failed} retry={retry} locale={locale}/></PageContainer>;
  const scope = scopeFromParams(query);
  const batches = compatibleBatches(data);
  const batch = scope.mode === "batch" ? batches.find(b => b.id === scope.batchId) : undefined;
  const selection = displaySelection(data, scope, query);
  const {datasets, methods, availableMethods, filters, visibleRecords, records} = selection;
  const metricKey: MetricKey = metricKeys.includes(query.get("metric") as MetricKey) ? query.get("metric") as MetricKey : "wall_seconds";
  const results = visibleRecords.map(row => row.result);
  const count = (state: string) => results.filter(result => result.status === state).length;
  const memoryFailures = results.filter(result => result.status === "failed" && result.reason_code === "oom").length;
  const sources = uniqueSources(visibleRecords);
  const allSources = uniqueSources(records);
  const active = new URLSearchParams(query); active.set("metric", metricKey);
  const returnTo = "/benchmark?" + active.toString();
  const invalidRange = filters.min !== "" && filters.max !== "" && Number(filters.min) > Number(filters.max);
  const filteredSnapshot = {...data, methods};
  return <PageContainer className="benchmark-page benchmark-explorer benchmark-reading-v3 benchmark-studio">
    <BenchmarkSidebar datasets={datasets} params={query} locale={locale} onSearch={value => field("search",value)} catalogCount={data.catalog.datasets.length} methodCount={methods.length}/>
    <div className="benchmark-studio-content">
    <Link to="/about" className="benchmark-back"><ArrowLeft size={15} aria-hidden="true"/>{words(locale,"About EasyMSA","关于 EasyMSA")}</Link>
    <header className="benchmark-overview-header">
      <div><h1>Benchmark</h1><p className="benchmark-overview-deck">{datasets.length} {words(locale,"datasets","个数据集")} · {methods.length} {words(locale,"methods","种方法")}</p></div>
      <div className="benchmark-overview-actions"><BatchSelector includeLatest batches={batches} value={scope.mode === "latest" ? "latest" : scope.batchId} onChange={value => commit(changeScope(queryRef.current,value))} locale={locale}/><DownloadButtons snapshot={data} batchId={batch?.id} resultScope={scope} datasetIds={datasets.map(d => d.id)} methodIds={methods.map(m => m.id)} locale={locale}/></div>
    </header>
    <div className="benchmark-run-summary" aria-label={words(locale,"Evaluation coverage","评测覆盖")}>
      <p><span className="benchmark-run-complete">{words(locale,"Complete","完成")} <strong>{count("complete")}</strong> / {results.length}</span><span>{words(locale,"Timed out","超时")} <strong>{count("timeout")}</strong></span>{memoryFailures > 0 && <span>{words(locale,"Memory limit","内存超限")} <strong>{memoryFailures}</strong></span>}{count("failed") > memoryFailures && <span>{words(locale,"Other failures","其他失败")} <strong>{count("failed") - memoryFailures}</strong></span>}{count("partial") > 0 && <span>{words(locale,"Partial","部分完成")} <strong>{count("partial")}</strong></span>}{count("unsupported") + count("not_run") > 0 && <span>{words(locale,"Unsupported / not evaluated","不支持 / 待评测")} <strong>{count("unsupported") + count("not_run")}</strong></span>}</p>
    </div>
    {!records.length && <p role="status" className="benchmark-pending">{words(locale,"No evaluation results have been published for this selection.","当前选择尚未发布评测结果。")}</p>}
    <section aria-labelledby="benchmark-matrix-heading" className="benchmark-explorer-main">
      <h2 id="benchmark-matrix-heading" className="sr-only">{words(locale,"Compare all datasets","比较所有数据集")}</h2>
      <div className="benchmark-metric-navigation" role="group" aria-label={words(locale,"Comparison metric","比较指标")}>
        <div className="benchmark-main-metrics">{mainMetrics.map(key => <button type="button" key={key} data-testid={`metric-${key}`} aria-pressed={metricKey === key} className={metricKey === key ? "is-active" : ""} onClick={() => update("metric",key)}>{metricSpecs[key][locale]} <span aria-hidden="true">{metricSpecs[key].direction === "lower" ? "↓" : "↑"}</span></button>)}</div>
        <label className="benchmark-more-metrics">{words(locale,"More metrics","更多指标")}<select aria-label={words(locale,"More metrics","更多指标")} value={["avg_sp","scaled_sp"].includes(metricKey) ? metricKey : ""} onChange={e => update("metric",e.target.value)}><option value="" disabled>Avg / Scaled SP</option><option value="avg_sp">Avg SP ↑</option><option value="scaled_sp">Scaled SP ↑</option></select></label>
      </div>
      <div className="benchmark-compact-filters">
        <label className="benchmark-field">{words(locale,"Sequence type","序列类型")}<select value={filters.type} onChange={e => field("type",e.target.value)}><option value="all">{words(locale,"All types","全部类型")}</option><option value="dna">DNA</option><option value="rna">RNA</option></select></label>
        <MethodFilter methods={availableMethods} selected={methods.map(m => m.id)} onChange={value => update("methods",value)} locale={locale} open={openFilter === "methods"} onOpenChange={open => setOpenFilter(open ? "methods" : null)}/>
        <details className="benchmark-extra-filters" open={openFilter === "filters"} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpenFilter(null); event.currentTarget.querySelector("summary")?.focus(); } }}><summary onClick={event => { event.preventDefault(); setOpenFilter(openFilter === "filters" ? null : "filters"); }}>{words(locale,"More filters","更多筛选")}</summary><div>
          <label className="benchmark-field">{words(locale,"Data origin","数据来源")}<select value={filters.source} onChange={e => field("source",e.target.value)}><option value="all">{words(locale,"All origins","全部来源")}</option>{(["sampled","simulated","unconfirmed"] as const).map(kind => <option key={kind} value={kind}>{sourceLabel(kind,locale)}</option>)}</select></label>
          <label className="benchmark-field">{words(locale,"Reference alignment","参考比对")}<select value={filters.reference} onChange={e => field("reference",e.target.value)}><option value="all">{words(locale,"All","全部")}</option><option value="yes">{words(locale,"With reference","有参考")}</option><option value="no">{words(locale,"Without reference","无参考")}</option></select></label>
          <label className="benchmark-field">{words(locale,"Minimum sequences","最少序列数")}<input type="number" min="0" value={filters.min} onChange={e => field("min",e.target.value)}/></label>
          <label className="benchmark-field">{words(locale,"Maximum sequences","最多序列数")}<input type="number" min="0" value={filters.max} onChange={e => field("max",e.target.value)}/></label>
        </div></details>
        <button type="button" className="benchmark-clear" onClick={clear}>{words(locale,"Clear filters","清除筛选")}</button>
      </div>
      <div className="benchmark-filter-bottom">{scope.mode === "batch" && <label className="benchmark-full-catalog"><input type="checkbox" checked={query.get("all") === "1"} onChange={e => update("all",e.target.checked ? "1" : "")}/>{words(locale,"Show all","显示全部")}</label>}</div>
      {invalidRange && <p className="benchmark-warning" role="status">{words(locale,"Minimum sequence count exceeds the maximum.","最少序列数不能大于最多序列数。")}</p>}
      {methods.length ? <BenchmarkMatrix snapshot={filteredSnapshot} batch={batch} scope={scope} datasets={datasets} metricKey={metricKey} locale={locale} returnTo={returnTo}/> : <p role="status" className="benchmark-empty">{words(locale,"Select a method to compare its records.","选择方法以查看成绩。")}</p>}
    </section>
    <SourceLegend batches={sources} locale={locale} latest={scope.mode === "latest"}/>
    <ExperimentDetails snapshot={data} batches={allSources} locale={locale}/>
    </div>
  </PageContainer>;
}
