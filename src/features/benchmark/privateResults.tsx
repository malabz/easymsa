import {isBenchmarkFailure,isMetricFailure} from "./metrics";
import {useMemo,useState} from "react";
import {useSearchParams} from "react-router-dom";
import {Download,X} from "lucide-react";
import {useLanguage} from "../../lib/i18n/useLanguage";
import {datasetName,matchesDatasetName} from "./names";
import {displayMetricKeys,formatMetricSummary,formatMetricValue,formatAxisTicks,makeMetricAxis,metricSpecs,metricValue} from "./metrics";
import type {MetricKey,BenchmarkMetric} from "./model";
import type {PrivateResult,PrivateResultRow} from "./privateModel";
import {privateApi,privateError} from "./privateApi";

export function privateMetricText(metric:BenchmarkMetric,key:MetricKey,locale:"en"|"zh") {
  if(metricValue(metric)!==null)return formatMetricSummary(metric,key,locale);
  const reasons:Record<string,[string,string]>={no_reference:["No reference","无参考"],timeout:["Timed out","超时"],oom:["Memory limit","内存超限"],unsupported:["Unsupported","不支持"],invalid_output:["Invalid output","输出无效"],scoring_failed:["Scoring failed","评分失败"],cancelled:["Cancelled","已取消"],not_run:["Not evaluated","待评测"],execution_failed:["Failed","失败"],platform_error:["Unavailable","暂无结果"]};
  return reasons[metric.reason_codes[0]]?.[locale==="zh"?1:0]??"—";
}
function resultStatus(row:PrivateResultRow,locale:"en"|"zh") {
  const labels:Record<string,[string,string]>={complete:["Complete","完成"],partial:["Partial","部分完成"],timeout:["Timed out","超时"],failed:["Failed","失败"],unsupported:["Unsupported","不支持"],not_run:["Not evaluated","待评测"]};
  if(row.reason_code==="oom")return locale==="zh"?"内存超限":"Memory limit";
  if(row.reason_code==="invalid_output")return locale==="zh"?"输出无效":"Invalid output";
  return labels[row.status]?.[locale==="zh"?1:0]??"—";
}
export function PrivateResults({report,accessKey}:{report:PrivateResult;accessKey:string}){
  const {locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en;
  const [query,setQuery]=useSearchParams(),[download,setDownload]=useState<"json"|"csv"|null>(null),[error,setError]=useState("");
  const selected=query.get("dataset"),search=query.get("search")??"",type=query.get("type")??"all",status=query.get("status")??"all";
  function filter(key:string,value:string){const next=new URLSearchParams(query);if(key!=="dataset")next.delete("dataset");if(!value||value==="all")next.delete(key);else next.set(key,value);setQuery(next,{replace:true});}
  const byId=useMemo(()=>new Map(report.results.map(result=>[result.dataset_id,result])),[report]);
  const datasets=report.catalog.datasets.filter(dataset=>matchesDatasetName(dataset,search)&&(type==="all"||dataset.sequence_type===type)&&(status==="all"||byId.get(dataset.id)?.status===status));
  const dataset=report.catalog.datasets.find(dataset=>dataset.id===selected),row=dataset?byId.get(dataset.id):undefined;
  const qualityKey:MetricKey=row&&metricValue(row.metrics.q)!==null?"q":"scaled_sp";
  async function save(format:"json"|"csv"){
    if(download)return;setDownload(format);setError("");try{await privateApi.download(report.run_id,accessKey,format);}catch(error){setError(privateError(error,locale));}finally{setDownload(null);}
  }
  return <section className="private-results" aria-labelledby="private-results-title">
    <div className="private-section-heading"><h2 id="private-results-title">{w("Dataset results","数据集成绩")}</h2><div className="private-downloads" aria-label={w("Download all results","下载全部成绩")}><span>{report.catalog.datasets.length} {w("datasets","组数据")}</span>{(["csv","json"]as const).map(format=><button className="private-button is-outline" key={format} disabled={download!==null} onClick={()=>save(format)}><Download size={14} aria-hidden="true"/>{download===format?w("Downloading…","正在下载…"):format.toUpperCase()}</button>)}</div></div>
    {error&&<p className="private-error" role="alert">{error}</p>}
    <div className="private-result-filters"><label>{w("Search datasets","搜索数据集")}<input type="search" value={search} onChange={event=>filter("search",event.target.value)} placeholder={w("Name or dataset ID","名称或数据集编号")}/></label><label>{w("Sequence type","序列类型")}<select value={type} onChange={event=>filter("type",event.target.value)}><option value="all">{w("All","全部")}</option><option value="dna">DNA</option><option value="rna">RNA</option></select></label><label>{w("Result status","结果状态")}<select value={status} onChange={event=>filter("status",event.target.value)}><option value="all">{w("All","全部")}</option><option value="complete">{w("Complete","完成")}</option><option value="partial">{w("Partial","部分完成")}</option><option value="timeout">{w("Timed out","超时")}</option><option value="failed">{w("Failed","失败")}</option><option value="unsupported">{w("Unsupported","不支持")}</option><option value="not_run">{w("Not evaluated","待评测")}</option></select></label></div>
    <div className="private-table-scroll" role="region" tabIndex={0} aria-label={w("Dataset results table","数据集成绩表")}><table className="private-result-table" data-testid="private-results-table"><thead><tr><th scope="col">{w("Dataset","数据集")}</th><th scope="col">{w("Status","状态")}</th>{displayMetricKeys.map(key=><th scope="col" key={key}>{metricSpecs[key][locale]}{metricSpecs[key].unit&&<span> ({metricSpecs[key].unit})</span>}</th>)}</tr></thead><tbody>{datasets.map(dataset=>{
      const result=byId.get(dataset.id)!;return <tr key={dataset.id} data-dataset-id={dataset.id} aria-selected={selected===dataset.id}><th scope="row"><button onClick={()=>filter("dataset",dataset.id)}>{datasetName(dataset,locale)}</button></th><td data-failure={isBenchmarkFailure(result.status,result.reason_code?[result.reason_code]:[])}><span className={`private-result-status is-${result.status}`}>{resultStatus(result,locale)}</span></td>{displayMetricKeys.map(key=><td key={key} data-metric={key} data-failure={isMetricFailure(result.metrics[key],result.status,result.reason_code)} data-raw-value={metricValue(result.metrics[key])??""} data-tone="neutral" title={key==="max_rss_kib"&&metricValue(result.metrics[key])!==null?`${metricValue(result.metrics[key])} KiB`:undefined}>{privateMetricText(result.metrics[key],key,locale)}</td>)}</tr>;
    })}</tbody></table></div>
    {!datasets.length&&<p className="private-state" role="status">{w("No datasets match these filters.","没有符合筛选条件的数据集。")}</p>}
    {dataset&&row&&<section className="private-dataset-detail" aria-labelledby="private-selected-title" data-testid="private-dataset-detail"><div className="private-section-heading"><div><h2 id="private-selected-title">{datasetName(dataset,locale)}</h2><p>{dataset.min_length.toLocaleString()}–{dataset.max_length.toLocaleString()} nt · {dataset.reference?w("With reference","有参考"):w("No reference","无参考")}</p></div><button className="private-quiet" onClick={()=>filter("dataset","")} aria-label={w("Close dataset details","关闭数据集详情")}><X size={19}/></button></div>
      <p className="private-quality" data-testid="private-preferred-quality" data-metric={qualityKey}>{metricSpecs[qualityKey][locale]} <strong>{privateMetricText(row.metrics[qualityKey],qualityKey,locale)}</strong></p>
      <div className="private-metric-plots">{displayMetricKeys.map(key=>{
        const metric=row.metrics[key],axis=makeMetricAxis(key,[metric]),value=metricValue(metric),ticks=[axis.ticks[0],axis.ticks[axis.ticks.length-1]],labels=formatAxisTicks(ticks,key,locale);
        return <figure key={key} data-testid="private-metric-plot" data-metric={key} data-failure={isMetricFailure(row.metrics[key],row.status,row.reason_code)} data-raw-value={value??""} data-axis-min={axis.min} data-axis-max={axis.max} data-axis-scale={axis.scale}><figcaption>{metricSpecs[key][locale]}{metricSpecs[key].unit?` (${metricSpecs[key].unit})`:""}</figcaption><strong>{privateMetricText(metric,key,locale)}</strong>{value!==null?<><div className="private-plot-track"><span style={{left:`${Math.max(0,Math.min(100,axis.position(value)))}%`}} title={formatMetricValue(value,key,locale)}/></div><div className="private-plot-ticks"><span>{labels[0]}</span><span>{labels[1]}</span></div></>:<p className="private-plot-missing">{w("No measurement","暂无测量值")}</p>}</figure>;
      })}</div>
    </section>}
    <details className="private-experiment"><summary>{w("Experiment details","实验详情")}</summary><dl><dt>{w("Data version","数据版本")}</dt><dd>{report.profile.dataset_version}</dd><dt>{w("Runtime","运行环境")}</dt><dd>{report.profile.runtime}</dd><dt>{w("Measurement","测量方式")}</dt><dd>{report.profile.measurement}</dd><dt>{w("Method version","方法版本")}</dt><dd>{report.method.version_id}</dd><dt>{w("Limits","资源限制")}</dt><dd>{report.profile.limits.cpu} CPU · {report.profile.limits.memory_gib} GiB · {report.profile.limits.alignment_timeout_seconds/60} {w("min per dataset","分钟 / 数据集")}</dd><dt>{w("Normalized SP","归一化 SP")}</dt><dd>{w("Average SP per sequence pair and alignment column.","每对序列、每个比对列的平均 SP。")}</dd></dl></details>
  </section>;
}
