import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { compatibleBatches, metricKeys, type MetricKey } from "../features/benchmark/model";
import { useBenchmark } from "../features/benchmark/useBenchmark";
import { metricSpecs, metricValue, selectMetricRows } from "../features/benchmark/metrics";
import { MetricPlots } from "../features/benchmark/MetricPlots";
import { datasetGroup } from "../features/benchmark/BenchmarkMatrix";
import { BenchmarkSidebar } from "../features/benchmark/BenchmarkSidebar";
import { TradeoffPlot } from "../features/benchmark/TradeoffPlot";
import { BatchContext, BatchSelector, DownloadButtons, LoadState, MetricCell, StatusPill, reasonLabel, sourceLabel, stateLabel, words } from "../features/benchmark/presentation";
import { scopeFromParams, batchLabel } from "../features/benchmark/selection";
import { displaySelection, changeScope, MethodFilter, SourceLegend, uniqueSources } from "../features/benchmark/view";
import "../features/benchmark/benchmark.css";
import "../features/benchmark/plots.css";
import "../features/benchmark/reading.css";
import "../features/benchmark/studio.css";

export function BenchmarkDatasetPage() {
  const { locale } = useLanguage();
  const { caseId } = useParams<{caseId:string}>();
  const [params, setParams] = useSearchParams();
  const paramsRef = useRef(params);
  useEffect(() => {paramsRef.current = params;}, [params]);
  const commit = (next: URLSearchParams) => {paramsRef.current = next; setParams(next,{replace:true});};
  const patch = (values: Record<string,string>) => {
    const next = new URLSearchParams(paramsRef.current);
    for (const [key,value] of Object.entries(values)) { if (value) next.set(key,value); else next.delete(key); }
    commit(next);
  };
  const { data, failed, retry } = useBenchmark();
  if (!data) return <PageContainer className="benchmark-page"><LoadState failed={failed} retry={retry} locale={locale}/></PageContainer>;
  const dataset = data.catalog.datasets.find(d => d.id === caseId);
  if (!dataset) return <PageContainer className="benchmark-page"><h1>{words(locale,"Dataset not found","未找到数据集")}</h1><Link to="/benchmark">{words(locale,"Back to Benchmark","返回 Benchmark")}</Link></PageContainer>;
  const scope = scopeFromParams(params);
  const batches = compatibleBatches(data);
  const batch = scope.mode === "batch" ? batches.find(b => b.id === scope.batchId) : undefined;
  const selection = displaySelection(data,scope,params,dataset.id);
  const filteredSnapshot = {...data,methods:selection.methods};
  const rows = selectMetricRows(filteredSnapshot,batch,dataset.id,"wall_seconds",scope);
  const sources = uniqueSources(selection.visibleRecords);
  const single = selection.visibleRecords.length > 0 && selection.visibleRecords.every(row => row.result.planned_repeats === 1);
  const navigation = displaySelection(data,scope,params).datasets;
  const index = navigation.findIndex(d => d.id === dataset.id);
  const previous = index > 0 ? navigation[index-1] : undefined;
  const next = index >= 0 ? navigation[index+1] : undefined;
  const backQuery = new URLSearchParams(params);
  ["returnTo","chart","x","y","scale","zoom","method","sp","timeScale","memoryScale","plotZoom"].forEach(key => backQuery.delete(key));
  const returnTo = "/benchmark" + (backQuery.size ? "?" + backQuery.toString() : "");
  const destination = (id: string) => `/benchmark/datasets/${encodeURIComponent(id)}?${params.toString()}`;
  const chart = ["tradeoff","metrics","table"].includes(params.get("chart") ?? "") ? params.get("chart")! : "tradeoff";
  const metricKey = metricKeys.includes(params.get("metric") as MetricKey) ? params.get("metric") as MetricKey : "wall_seconds";
  const source = data.catalog.sources.find(s => s.id === dataset.source_id);
  const group = datasetGroup(dataset);
  const family = dataset.sequence_type === "rna" ? "RNA" : words(locale, group === 0 ? "DNA · 16S" : group === 1 ? "DNA · Mitochondrial samples" : "DNA · Mitochondrial simulation", group === 0 ? "DNA · 16S 抽样" : group === 1 ? "DNA · 线粒体抽样" : "DNA · 线粒体模拟");
  const metadata = [
    [words(locale,"Dataset ID","数据集编号"),dataset.id],
    [words(locale,"Type","类型"),dataset.sequence_type.toUpperCase()],
    [words(locale,"Sequences","序列数"),dataset.sequence_count.toLocaleString()],
    [words(locale,"Length range","长度范围"),`${dataset.min_length.toLocaleString()}–${dataset.max_length.toLocaleString()}`],
    [words(locale,"Reference alignment","参考比对"),words(locale,dataset.reference ? "Full reference" : "No reference",dataset.reference ? "完整参考比对" : "无参考比对")],
    [words(locale,"Data origin","数据来源类型"),sourceLabel(dataset.source_kind,locale)],
    [words(locale,"Size class","规模分类"),words(locale,dataset.classification === "ordinary" ? "Ordinary" : dataset.classification === "large" ? "Large" : "Unclassified",dataset.classification === "ordinary" ? "普通" : dataset.classification === "large" ? "大型" : "未分类")],
  ];
  return <PageContainer className="benchmark-page benchmark-detail-v2 benchmark-reading-v3 benchmark-studio">
    <BenchmarkSidebar datasets={navigation} params={params} selectedId={dataset.id} locale={locale} onSearch={value => patch({search:value})} catalogCount={data.catalog.datasets.length} methodCount={selection.methods.length}/>
    <div className="benchmark-studio-content">
    <header className="benchmark-detail-header">
      <div className="benchmark-detail-topline"><Link className="benchmark-back" to={returnTo}><ArrowLeft size={15} aria-hidden="true"/>{words(locale,"All benchmark datasets","全部评测数据集")}</Link><nav className="benchmark-neighbours" aria-label={words(locale,"Adjacent datasets","相邻数据集")}>{previous && <Link to={destination(previous.id)}><ArrowLeft size={14} aria-hidden="true"/>{words(locale,"Previous","上一组")}</Link>}{next && <Link to={destination(next.id)}>{words(locale,"Next","下一组")}<ArrowRight size={14} aria-hidden="true"/></Link>}</nav></div>
      <div className="benchmark-detail-titleline"><div><h1 data-testid="dataset-title" data-dataset-id={dataset.id}>{words(locale,chart === "tradeoff" ? "Speed & quality" : chart === "metrics" ? "Individual metrics" : "Alignment results",chart === "tradeoff" ? "速度与质量" : chart === "metrics" ? "各项指标" : "比对结果")}</h1><p>{family} · {words(locale,`${dataset.sequence_count.toLocaleString()} sequences`,`${dataset.sequence_count.toLocaleString()} 条序列`)}{dataset.similarity_label !== null && <span> · {words(locale,`Source label ${dataset.similarity_label}`,`来源标签 ${dataset.similarity_label}`)}</span>} / {words(locale,dataset.reference ? "With reference" : "No reference",dataset.reference ? "有参考比对" : "无参考比对")}</p></div>
        <div className="benchmark-detail-toolbar"><BatchSelector includeLatest batches={batches} value={scope.mode === "latest" ? "latest" : scope.batchId} onChange={value => commit(changeScope(paramsRef.current,value))} locale={locale}/><DownloadButtons snapshot={data} batchId={batch?.id} resultScope={scope} datasetId={dataset.id} methodIds={selection.methods.map(m => m.id)} locale={locale}/></div>
      </div>
    </header>
    <section aria-labelledby="dataset-comparison-heading">
      <div className="benchmark-view-controls"><h2 id="dataset-comparison-heading" className="sr-only">{words(locale,"Method comparison","方法对比")}</h2><div className="benchmark-view-tabs" role="group" aria-label={words(locale,"Result view","结果视图")}>{[["tradeoff","Trade-off","速度—质量"],["metrics","Metric plots","分项指标"],["table","Exact values","精确数值表"]].map(([id,en,zh]) => <button type="button" key={id} aria-pressed={chart === id} onClick={() => patch({chart:id})}>{words(locale,en,zh)}</button>)}</div><div className="benchmark-detail-controls"><MethodFilter methods={selection.availableMethods} selected={selection.methods.map(m => m.id)} onChange={value => patch({methods:value})} locale={locale}/>{scope.mode === "batch" && <label className="benchmark-full-catalog"><input type="checkbox" checked={params.get("all") === "1"} onChange={e => patch({all:e.target.checked ? "1" : ""})}/>{words(locale,"Show full catalog","显示全部目录")}</label>}<p className="benchmark-caption" data-testid="dataset-batch-scope">{words(locale,`${selection.visibleRecords.length} methods included for this dataset in the current selection.`, `当前选择在本数据集纳入 ${selection.visibleRecords.length} 种方法。`)}</p></div></div>
      {!selection.methods.length && <p role="status" className="benchmark-empty">{words(locale,"No methods selected. Choose methods or show the full catalog.","当前没有选中方法。可选择方法或显示全部目录。")}</p>}
      <div hidden={chart !== "tradeoff"}><TradeoffPlot snapshot={filteredSnapshot} batch={batch} scope={scope} dataset={dataset} locale={locale} params={params} onParamsChange={patch}/></div>
      <div hidden={chart !== "metrics"}><MetricPlots snapshot={filteredSnapshot} batch={batch} scope={scope} dataset={dataset} locale={locale} selectedMetric={metricKey} selectedMethod={params.get("method") ?? undefined} params={params} onParamsChange={patch}/></div>
      <div hidden={chart !== "table"} className="benchmark-detail-precise" data-testid="precise-results"><p className="benchmark-plots-caption">{words(locale,"All seven metrics. Memory is MiB; downloads retain KiB. Each row keeps its original source.","全部七项指标。内存显示 MiB，下载保留 KiB；每行保留原始来源。")}</p><div tabIndex={0} role="region" aria-label={words(locale,"Scrollable method comparison","可横向滚动的方法对比")} className="benchmark-table-scroll"><table className="benchmark-table"><caption className="sr-only">{words(locale,"Method results for ","方法成绩：")}{dataset.id}</caption><thead><tr><th scope="col">{words(locale,"Method / version","方法 / 版本")}</th><th scope="col">{words(locale,"Source","来源")}</th><th scope="col">{words(locale,"State","状态")}</th><th scope="col">{words(locale,"Valid repeats","有效重复")}</th>{metricKeys.map(key => <th key={key} scope="col">{metricSpecs[key][locale]}{metricSpecs[key].unit ? ` (${metricSpecs[key].unit})` : ""}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.method.id} data-method={row.method.id}><th scope="row">{row.method.name}<span className="benchmark-cell-note">{row.spec?.version ?? "—"}</span></th><td>{row.batch ? <><span>{batchLabel(row.batch,locale)}</span><span className="benchmark-cell-note benchmark-mono">{row.batch.id}</span></> : "—"}</td><td><StatusPill status={row.outsideBatch ? "outside_batch" : row.result?.status ?? "not_run"} locale={locale}/>{row.result?.reason_code && <span className="benchmark-cell-note">{reasonLabel(row.result.reason_code,locale)}</span>}</td><td>{row.result ? `${row.result.valid_repeats}/${row.result.planned_repeats}` : "—"}</td>{metricKeys.map(key => <td key={key} data-method={row.method.id} data-metric={key} data-batch-id={row.batch?.id ?? ""} data-raw-value={metricValue(row.result?.metrics[key]) ?? ""}>{row.outsideBatch ? stateLabel("outside_batch",locale) : <MetricCell metric={row.result?.metrics[key]} metricKey={key} locale={locale} noReference={!dataset.reference && ["q","tc"].includes(key)}/>}</td>)}</tr>)}</tbody></table></div></div>
    </section>
    {batch?.conditions && <p className="benchmark-detail-conditions">{batch.conditions.cpu_limit} CPU · {batch.conditions.memory_limit_gib} GiB · {batch.conditions.alignment_timeout_seconds / 60} {words(locale,"min limit","分钟限时")} · <strong>{batch.repeats === 1 ? words(locale,"Single measurement","单次测量") : words(locale,`${batch.repeats} planned repeats`,`计划重复 ${batch.repeats} 次`)}</strong></p>}
    <div className="benchmark-studio-source-footer">{chart !== "tradeoff" && <SourceLegend batches={sources} locale={locale} latest={scope.mode === "latest"}/>}{single && <span className="benchmark-caption">{words(locale,"Single measurement","单次测量")}</span>}</div>
    <details className="benchmark-condition-details"><summary>{words(locale,"Evaluation conditions and scoring","评测条件与评分说明")}</summary>{(sources.length ? sources : batch ? [batch] : []).map(source => <section key={source.id}><h3>{batchLabel(source,locale)}</h3><p className="benchmark-mono">{source.id}</p><BatchContext batch={source} locale={locale}/></section>)}<p className="benchmark-caption">{data.catalog.id} · {data.catalog.version}</p></details>
    <details className="benchmark-source-details" open={dataset.validation_status === "requires_review"}>
      <summary>{words(locale, "Dataset information and provenance", "数据集信息与来源")}</summary>
      <dl className="benchmark-metadata">{metadata.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <div className="benchmark-provenance">{source && <p>{words(locale, "Source: ", "来源：")}<a className="break-words text-teal-800 underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}{dataset.similarity_label !== null && <p>{words(locale, `Source similarity label: ${dataset.similarity_label}. This is not a newly measured sequence identity.`, `来源相似度标签：${dataset.similarity_label}。该数值不是重新测量的序列一致性。`)}</p>}{dataset.sampling && <p>{words(locale, dataset.sampling.with_replacement ? "Sampled with replacement: repeated sequences test scale, not additional biological diversity." : "Sampled without replacement from the source sequences.", dataset.sampling.with_replacement ? "采用有放回抽样：重复序列用于规模测试，不代表新增生物学多样性。" : "从来源序列中无放回抽样。")} {words(locale, "Sampling seed: ", "抽样种子：")}{dataset.sampling.seed}</p>}{dataset.source_kind === "unconfirmed" && <p>{words(locale, "The source’s generation method has not been confirmed. Having a reference alignment does not establish that this is simulated data.", "来源数据的生成方式尚未确认，存在参考比对不代表已确认其为模拟数据。")}</p>}</div>
      {dataset.validation_status === "requires_review" && <aside className="benchmark-data-issue" aria-labelledby="dataset-review-heading"><h2 id="dataset-review-heading">{words(locale, "Input data needs review", "输入数据待处理")}</h2>{dataset.issues.map(issue => <p key={issue.code}>{words(locale, `The input contains ${issue.count.toLocaleString()} colon (:) characters outside the nucleotide alphabet. The original data has been preserved pending a processing decision.`, `输入含有 ${issue.count.toLocaleString()} 个不属于核酸字母的冒号（:）。当前保留原始内容，等待确定处理方式。`)}</p>)}<p>{words(locale, "This is a dataset issue, not a method execution failure. Reported lengths include these characters.", "这是数据集问题，不是算法执行失败。长度统计包含这些字符。")}</p></aside>}
      {dataset.preprocessing && <p className="benchmark-provenance"><strong>{words(locale, "Data preparation: ", "数据处理：")}</strong>{words(locale, `${dataset.preprocessing.count} sequence colons were replaced with N in this frozen version. Original files and all titles were preserved; T/U and other IUPAC symbols were not converted.`, `本冻结版本将序列中的 ${dataset.preprocessing.count} 个冒号替换为 N。原始文件与全部标题保留，未转换 T/U 或其他 IUPAC 字符。`)}</p>}
    </details>
    <details className="benchmark-source-details"><summary>{words(locale,"Method versions and parameters","方法版本与参数")}</summary><div tabIndex={0} role="region" aria-label={words(locale,"Scrollable method parameters","可横向滚动的方法参数")} className="benchmark-table-scroll"><table className="benchmark-table"><thead><tr><th>{words(locale,"Method","方法")}</th><th>{words(locale,"Source / version","来源 / 版本")}</th><th>{words(locale,"Parameters / commit","参数 / 提交版本")}</th></tr></thead><tbody>{rows.map(row => <tr key={row.method.id}><th scope="row">{row.method.name}</th><td>{row.batch ? batchLabel(row.batch,locale) : "—"}<span className="benchmark-cell-note">{row.spec?.version ?? "—"}</span></td><td className="benchmark-parameters">{row.spec?.parameters.join(" ") ?? "—"}{row.spec?.commit && <span className="benchmark-cell-note">{row.spec.commit}</span>}</td></tr>)}</tbody></table></div></details>
    </div>
  </PageContainer>;
}
