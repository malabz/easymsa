import type { BenchmarkBatch, BenchmarkDataset, BenchmarkSnapshot } from "./model";
import { sourceLabel, words, type Locale } from "./presentation";
import { datasetName } from "./names";
import { ResourceLimits } from "./ResourceLimits";
import { isCipresRna, rnaEvidence } from "./provenance";

export function ExperimentDetails({snapshot, batches, dataset, locale}: {
  snapshot: BenchmarkSnapshot; batches: BenchmarkBatch[]; dataset?: BenchmarkDataset; locale: Locale; datasetIds?:string[];methodIds?:string[];
}) {
  const source = snapshot.catalog.sources.find(item => item.id === dataset?.source_id);
  const versions = [...new Map(batches.flatMap(batch=>batch.methods).filter(spec=>snapshot.methods.some(method=>method.id===spec.method_id)).map(spec=>[JSON.stringify(spec),spec])).values()];
  return <details className="benchmark-supporting benchmark-experiment-details" data-testid="experiment-details">
    <summary>{words(locale, "Experiment details", "实验详情")}</summary>
    <section><h3>{words(locale, "Dataset", "数据集")}</h3>
      <p>{snapshot.catalog.id} · {snapshot.catalog.version}</p>
      {dataset && <>
        <p>{datasetName(dataset, locale)} · <code>{dataset.id}</code></p>
        <p>{sourceLabel(dataset.source_kind, locale)}</p>
        {isCipresRna(dataset) && <p>{words(locale,"Dataset: CIPRES simulated RNA · ","数据集：CIPRES 模拟 RNA · ")}<a href={rnaEvidence.paper} target="_blank" rel="noreferrer">{words(locale,"Dataset description","数据说明")}</a></p>}
        {source && <p><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}
        {dataset.similarity_label !== null && <p>{words(locale, "Simulation similarity (source parameter): ", "模拟相似度（来源参数）：")}{dataset.similarity_label}%</p>}
        {dataset.sampling && <p>{words(locale, "Sampling: ", "抽样方式：")}{words(locale, dataset.sampling.with_replacement ? "With replacement" : "Without replacement", dataset.sampling.with_replacement ? "有放回" : "无放回")} · {words(locale, "Seed: ", "种子：")}{dataset.sampling.seed}</p>}
        {dataset.validation_status === "requires_review" && <div className="benchmark-data-issue"><h4>{words(locale,"Input needs review","输入待处理")}</h4>{dataset.issues.map(issue => <p key={issue.code}>{words(locale,"Invalid colon characters: ","异常冒号：")}{issue.count}</p>)}</div>}
        {dataset.preprocessing && <p>{words(locale, "Preparation: ", "数据处理：")}{words(locale, `${dataset.preprocessing.count} colons replaced with N`, `${dataset.preprocessing.count} 个冒号替换为 N`)}</p>}
      </>}
    </section>
    <section><h3>{words(locale,"Run conditions","运行条件")}</h3>
      <ResourceLimits locale={locale} limits={snapshot.batches.flatMap(batch=>batch.conditions?[{cpu:batch.conditions.cpu_limit,memory:batch.conditions.memory_limit_gib,seconds:batch.conditions.alignment_timeout_seconds}]:[])}/>
      <p>{batches.length>0&&batches.every(batch=>batch.repeats===1)&&words(locale,"Single measurement","单次测量")}</p>
      <p>{[...new Set(batches.map(batch=>batch.environment.cpu+" · "+batch.environment.os))].join("; ")}</p>
      <p>{[...new Set(batches.map(batch=>batch.scoring.label))].join("; ")}</p>
    </section>
    <section><h3>{words(locale,"Methods and parameters","方法版本与参数")}</h3>
      <div className="benchmark-table-scroll" tabIndex={0} role="region" aria-label={versions.length?words(locale,"Method versions","方法版本"):words(locale,"Method catalog","方法目录")}><table className="benchmark-table"><thead><tr><th>{words(locale,"Method","方法")}</th><th>{words(locale,"Version","版本")}</th><th>{words(locale,"Parameters","参数")}</th></tr></thead><tbody>{versions.map(spec=><tr key={JSON.stringify(spec)}><th scope="row">{snapshot.methods.find(method=>method.id===spec.method_id)?.name}</th><td>{spec.version}{spec.commit&&<small className="benchmark-cell-note">{spec.commit}</small>}</td><td className="benchmark-parameters">{spec.parameters.join(" ")}</td></tr>)}{!versions.length&&snapshot.methods.map(method=><tr key={method.id}><th>{method.name}</th><td>{words(locale,"Pending confirmation","待确认")}</td><td>—</td></tr>)}</tbody></table></div>
    </section>
  </details>;
}
