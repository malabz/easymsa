import { datasetName } from "../features/benchmark/names";
import { isCipresRna, rnaEvidence } from "../features/benchmark/provenance";
import { ExperimentDetails } from "../features/benchmark/ExperimentDetails";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { metricKeys, type MetricKey } from "../features/benchmark/model";
import { useBenchmark } from "../features/benchmark/useBenchmark";
import { displayMetricKey, displayMetricKeys, metricSpecs, metricValue, metricEmphasis, selectMetricRows } from "../features/benchmark/metrics";
import { MetricPlots } from "../features/benchmark/MetricPlots";
import { BenchmarkSidebar } from "../features/benchmark/BenchmarkSidebar";
import { TradeoffPlot } from "../features/benchmark/TradeoffPlot";
import { ComparisonLegend, DownloadButtons, LoadState, MetricCell, reasonLabel, stateLabel, words } from "../features/benchmark/presentation";
import { currentResultScope } from "../features/benchmark/selection";
import { displaySelection, MethodFilter, uniqueSources } from "../features/benchmark/view";
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
  const source = data.catalog.sources.find(item => item.id === dataset.source_id);
  const scope = currentResultScope;
  const selection = displaySelection(data,scope,params,dataset.id);
  const filteredSnapshot = {...data,methods:selection.methods};
  const rows = selectMetricRows(filteredSnapshot,undefined,dataset.id,"wall_seconds",scope);
  const emphasis = new Map(displayMetricKeys.map(key => [key,metricEmphasis(key,rows.map(row => row.result?.metrics[key]))]));
  const sources = uniqueSources(selection.visibleRecords);
  const navigation = displaySelection(data,scope,params).datasets;
  const index = navigation.findIndex(d => d.id === dataset.id);
  const previous = index > 0 ? navigation[index-1] : undefined;
  const next = index >= 0 ? navigation[index+1] : undefined;
  const backQuery = new URLSearchParams(params);
  ["returnTo","chart","x","y","scale","zoom","method","sp","timeScale","memoryScale","plotZoom"].forEach(key => backQuery.delete(key));
  const returnTo = "/benchmark" + (backQuery.size ? "?" + backQuery.toString() : "");
  const destination = (id: string) => {
    const next = new URLSearchParams(params); next.delete("y");
    return `/benchmark/datasets/${encodeURIComponent(id)}?${next.toString()}`;
  };
  const chart = ["tradeoff","metrics","table"].includes(params.get("chart") ?? "") ? params.get("chart")! : "tradeoff";
  const metricKey = metricKeys.includes(params.get("metric") as MetricKey) ? displayMetricKey(params.get("metric") as MetricKey) : "wall_seconds";
  return <PageContainer className="benchmark-page benchmark-detail-v2 benchmark-reading-v3 benchmark-studio">
    <BenchmarkSidebar datasets={navigation} params={params} selectedId={dataset.id} locale={locale} onSearch={value => patch({search:value})} catalogCount={data.catalog.datasets.length} methodCount={selection.methods.length}/>
    <div className="benchmark-studio-content">
    <header className="benchmark-detail-header">
      <div className="benchmark-detail-topline"><Link className="benchmark-back" to={returnTo}><ArrowLeft size={15} aria-hidden="true"/>{words(locale,"All datasets","全部数据集")}</Link><nav className="benchmark-neighbours" aria-label={words(locale,"Adjacent datasets","相邻数据集")}>{previous && <Link to={destination(previous.id)}><ArrowLeft size={14} aria-hidden="true"/>{words(locale,"Previous","上一组")}</Link>}{next && <Link to={destination(next.id)}>{words(locale,"Next","下一组")}<ArrowRight size={14} aria-hidden="true"/></Link>}</nav></div>
      <div className="benchmark-detail-titleline"><div><h1 data-testid="dataset-title" data-dataset-id={dataset.id}>{datasetName(dataset,locale)}</h1><p>{dataset.min_length.toLocaleString()}–{dataset.max_length.toLocaleString()} nt · {words(locale,dataset.reference ? "With reference" : "No reference",dataset.reference ? "有参考" : "无参考")}{dataset.source_kind === "simulated" && dataset.sequence_type !== "rna" && <> · {dataset.sequence_count.toLocaleString()} {words(locale,"sequences","条")}</>}{dataset.validation_status === "requires_review" && <> · {words(locale,"Input needs review","输入待处理")}</>}</p>{isCipresRna(dataset) ? <p className="benchmark-dataset-source">{words(locale,"Dataset: ","数据集：")}<a href={rnaEvidence.paper} target="_blank" rel="noreferrer">{words(locale,"CIPRES simulated RNA","CIPRES 模拟 RNA")}</a></p> : dataset.sequence_type === "rna" && source && <p className="benchmark-dataset-source">{words(locale,"Source: ","来源：")}<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}</div>
        <div className="benchmark-detail-toolbar"><DownloadButtons snapshot={data} resultScope={scope} datasetId={dataset.id} methodIds={selection.methods.map(m => m.id)} locale={locale}/></div>
      </div>
    </header>
    <section aria-labelledby="dataset-comparison-heading">
      <div className="benchmark-view-controls"><h2 id="dataset-comparison-heading" className="sr-only">{words(locale,"Method comparison","方法对比")}</h2><div className="benchmark-view-tabs" role="group" aria-label={words(locale,"Result view","结果视图")}>{[["tradeoff","Trade-off","速度—质量"],["metrics","Metric plots","分项指标"],["table","Values","数值表"]].map(([id,en,zh]) => <button type="button" key={id} aria-pressed={chart === id} onClick={() => patch({chart:id})}>{words(locale,en,zh)}</button>)}</div><div className="benchmark-detail-controls"><MethodFilter methods={selection.availableMethods} selected={selection.methods.map(m => m.id)} onChange={value => patch({methods:value})} locale={locale}/></div></div>
      {!selection.methods.length && <p role="status" className="benchmark-empty">{words(locale,"Choose a method to view results.","选择方法以查看成绩。")}</p>}
      <div hidden={chart !== "tradeoff"}><TradeoffPlot snapshot={filteredSnapshot} scope={scope} dataset={dataset} locale={locale} params={params} onParamsChange={patch}/></div>
      <div hidden={chart !== "metrics"}><MetricPlots snapshot={filteredSnapshot} scope={scope} dataset={dataset} locale={locale} selectedMetric={metricKey} selectedMethod={params.get("method") ?? undefined} params={params} onParamsChange={patch}/></div>
      {chart === "table" && <ComparisonLegend locale={locale}/>}
      <div hidden={chart !== "table"} className="benchmark-detail-precise" data-testid="precise-results"><div tabIndex={0} role="region" aria-label={words(locale,"Scrollable method comparison","可横向滚动的方法对比")} className="benchmark-table-scroll"><table className="benchmark-table"><caption className="sr-only">{words(locale,"Method results for ","方法成绩：")}{datasetName(dataset,locale)}</caption><thead><tr><th scope="col">{words(locale,"Method","方法")}</th><th scope="col">{words(locale,"State","状态")}</th><th scope="col">{words(locale,"Valid repeats","有效重复")}</th>{displayMetricKeys.map(key => <th key={key} scope="col">{metricSpecs[key][locale]}{metricSpecs[key].unit ? ` (${metricSpecs[key].unit})` : ""}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={row.method.id} data-method={row.method.id}><th scope="row">{row.method.name}</th><td>{row.outsideBatch ? stateLabel("outside_batch",locale) : row.result?.reason_code ? reasonLabel(row.result.reason_code,locale) : stateLabel(row.result?.status ?? "not_run",locale)}</td><td>{row.result ? `${row.result.valid_repeats}/${row.result.planned_repeats}` : "—"}</td>{displayMetricKeys.map(key => <td key={key} className="benchmark-emphasis" data-tone={emphasis.get(key)![index].tone} data-best={emphasis.get(key)![index].best} data-heat={emphasis.get(key)![index].strength ?? ""} data-method={row.method.id} data-metric={key} data-batch-id={row.batch?.id ?? ""} data-raw-value={metricValue(row.result?.metrics[key]) ?? ""}>{row.outsideBatch ? stateLabel("outside_batch",locale) : <MetricCell metric={row.result?.metrics[key]} metricKey={key} locale={locale} noReference={!dataset.reference && ["q","tc"].includes(key)}/>}</td>)}</tr>)}</tbody></table></div></div>
    </section>

    <ExperimentDetails snapshot={data} batches={sources} dataset={dataset} locale={locale}/>
    </div>
  </PageContainer>;
}
