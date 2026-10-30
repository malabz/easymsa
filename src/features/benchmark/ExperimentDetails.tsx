import type { BenchmarkBatch, BenchmarkDataset, BenchmarkSnapshot } from "./model";
import { BatchContext, sourceLabel, words, type Locale } from "./presentation";
import { datasetName } from "./names";
import { batchLabel } from "./selection";

export function ExperimentDetails({snapshot, batches, dataset, locale}: {
  snapshot: BenchmarkSnapshot; batches: BenchmarkBatch[]; dataset?: BenchmarkDataset; locale: Locale;
}) {
  const source = snapshot.catalog.sources.find(item => item.id === dataset?.source_id);
  return <details className="benchmark-supporting benchmark-experiment-details" data-testid="experiment-details">
    <summary>{words(locale, "Experiment details", "实验详情")}</summary>
    <section><h3>{words(locale, "Dataset", "数据集")}</h3>
      <p>{snapshot.catalog.id} · {snapshot.catalog.version}</p>
      {dataset && <>
        <p>{datasetName(dataset, locale)} · <code>{dataset.id}</code></p>
        <p>{sourceLabel(dataset.source_kind, locale)}</p>
        {source && <p><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>}
        {dataset.similarity_label !== null && <p>{words(locale, "Simulation similarity (source parameter): ", "模拟相似度（来源参数）：")}{dataset.similarity_label}%</p>}
        {dataset.sampling && <p>{words(locale, "Sampling: ", "抽样方式：")}{words(locale, dataset.sampling.with_replacement ? "With replacement" : "Without replacement", dataset.sampling.with_replacement ? "有放回" : "无放回")} · {words(locale, "Seed: ", "种子：")}{dataset.sampling.seed}</p>}
        {dataset.validation_status === "requires_review" && <div className="benchmark-data-issue"><h4>{words(locale,"Input needs review","输入待处理")}</h4>{dataset.issues.map(issue => <p key={issue.code}>{words(locale,"Invalid colon characters: ","异常冒号：")}{issue.count}</p>)}</div>}
        {dataset.preprocessing && <p>{words(locale, "Preparation: ", "数据处理：")}{words(locale, `${dataset.preprocessing.count} colons replaced with N`, `${dataset.preprocessing.count} 个冒号替换为 N`)}</p>}
      </>}
    </section>
    <section><h3>{words(locale,"Run conditions","运行条件")}</h3>{batches.map(batch => <div key={batch.id}><h4>{batchLabel(batch,locale)}</h4><p><code>{batch.id}</code></p><BatchContext batch={batch} locale={locale}/></div>)}</section>
    <section><h3>{words(locale,"Methods and parameters","方法版本与参数")}</h3>
      {batches.map(batch => <div key={batch.id}><h4>{batchLabel(batch,locale)}</h4><div className="benchmark-table-scroll" tabIndex={0} role="region" aria-label={batchLabel(batch,locale)}><table className="benchmark-table"><thead><tr><th>{words(locale,"Method","方法")}</th><th>{words(locale,"Version","版本")}</th><th>{words(locale,"Parameters","参数")}</th></tr></thead><tbody>{batch.methods.map(spec => <tr key={spec.method_id}><th scope="row">{snapshot.methods.find(method => method.id === spec.method_id)?.name}</th><td>{spec.version}{spec.commit && <small className="benchmark-cell-note">{spec.commit}</small>}</td><td className="benchmark-parameters">{spec.parameters.join(" ")}</td></tr>)}</tbody></table></div></div>)}
      {!batches.length && <div className="benchmark-table-scroll" role="region" aria-label={words(locale,"Method catalog","方法目录")} tabIndex={0}><table className="benchmark-table"><thead><tr><th>{words(locale,"Method","方法")}</th><th>{words(locale,"Version","版本")}</th></tr></thead><tbody>{snapshot.methods.map(method => <tr key={method.id}><th>{method.name}</th><td>{words(locale,"Pending confirmation","待确认")}</td></tr>)}</tbody></table></div>}
    </section>
    <section><h3>{words(locale,"Metrics","指标释义")}</h3><dl className="benchmark-metadata">
      <div><dt>{words(locale,"Time","时间")}</dt><dd>{words(locale,"Alignment wall time (s)","比对耗时（秒）")}</dd></div>
      <div><dt>{words(locale,"Memory","内存")}</dt><dd>{words(locale,"Peak RSS (MiB); downloads use KiB","峰值 RSS（MiB）；下载单位为 KiB")}</dd></div>
      <div><dt>SP / Avg SP / Scaled SP</dt><dd>{words(locale,"Pairwise alignment scores","配对比对评分")}</dd></div>
      <div><dt>Q / TC</dt><dd>{words(locale,"Reference pair / column agreement (0–1)","与参考比对的配对／整列一致率（0–1）")}</dd></div>
    </dl></section>
  </details>;
}
